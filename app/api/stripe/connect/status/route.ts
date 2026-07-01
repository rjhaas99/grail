import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

type SellerAccountRow = {
  stripe_account_id: string;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function createServiceSupabaseClient() {
  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false,
      },
    },
  );
}

function getBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") || "";

  return authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
}

async function getCurrentUser(request: Request) {
  const token = getBearerToken(request);

  if (!token) {
    return { user: null, error: "Missing authorization token." };
  }

  const supabase = createServiceSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error) {
    console.error("Stripe Connect status auth error:", error);
  }

  return { user, error: error?.message || null };
}

function getOnboardingStatus(account: Stripe.Account) {
  if (account.payouts_enabled) {
    return "complete";
  }

  if (account.details_submitted) {
    return "pending";
  }

  return "incomplete";
}

function maskStripeAccountId(accountId: string) {
  return accountId.length > 5
    ? `${accountId.slice(0, 5)}****${accountId.slice(-4)}`
    : "acct_****";
}

export async function GET(request: Request) {
  let stripe: Stripe;
  let supabase;

  try {
    stripe = new Stripe(getRequiredEnv("STRIPE_SECRET_KEY"));
    supabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Stripe Connect status configuration error:", error);
    return NextResponse.json(
      { error: "Stripe Connect status is not configured." },
      { status: 500 },
    );
  }

  const { user, error: authError } = await getCurrentUser(request);

  if (authError || !user) {
    return NextResponse.json(
      { error: "Sign in to view payout setup." },
      { status: 401 },
    );
  }

  try {
    const { data: sellerAccount, error: fetchError } = await supabase
      .from("seller_accounts")
      .select("stripe_account_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError) {
      console.error("Stripe Connect seller account status lookup error:", {
        error: fetchError,
        errorMessage: fetchError.message,
        userId: user.id,
      });
      throw fetchError;
    }

    const stripeAccountId = (sellerAccount as SellerAccountRow | null)
      ?.stripe_account_id;

    if (!stripeAccountId) {
      return NextResponse.json({ connected: false });
    }

    const account = await stripe.accounts.retrieve(stripeAccountId);
    const requirementsDue = account.requirements?.currently_due || [];
    const onboardingStatus = getOnboardingStatus(account);
    const disabledReason = account.requirements?.disabled_reason || null;

    const { error: updateError } = await supabase
      .from("seller_accounts")
      .update({
        onboarding_status: onboardingStatus,
        details_submitted: Boolean(account.details_submitted),
        charges_enabled: Boolean(account.charges_enabled),
        payouts_enabled: Boolean(account.payouts_enabled),
        requirements_due: requirementsDue,
        disabled_reason: disabledReason,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("stripe_account_id", stripeAccountId);

    if (updateError) {
      console.error("Stripe Connect seller account status sync error:", {
        error: updateError,
        errorMessage: updateError.message,
        userId: user.id,
        stripeAccountId,
      });
      throw updateError;
    }

    return NextResponse.json({
      connected: true,
      stripeAccountId,
      maskedAccountId: maskStripeAccountId(stripeAccountId),
      onboardingStatus,
      detailsSubmitted: Boolean(account.details_submitted),
      chargesEnabled: Boolean(account.charges_enabled),
      payoutsEnabled: Boolean(account.payouts_enabled),
      requirementsDue,
      requirementsCount: requirementsDue.length,
      disabledReason,
    });
  } catch (error) {
    console.error("Stripe Connect status error:", error);
    return NextResponse.json(
      { error: "Stripe payout status could not be loaded." },
      { status: 500 },
    );
  }
}
