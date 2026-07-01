import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

type SellerAccountRow = {
  stripe_account_id: string;
};

const connectApiVersion = "2024-06-20";

type StripeErrorLike = {
  message?: string;
  code?: string;
  type?: string;
  raw?: unknown;
};

function getStripeErrorDetail(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }

  const stripeError = error as StripeErrorLike;

  return {
    message: stripeError.message,
    code: stripeError.code,
    type: stripeError.type,
    raw: stripeError.raw,
  };
}

function getSafeErrorDetail(error: unknown) {
  const stripeDetail = getStripeErrorDetail(error);

  if (stripeDetail?.message) {
    return stripeDetail.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown onboarding error.";
}

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "";
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
    console.error("Stripe Connect onboarding auth error:", error);
  }

  return { user, error: error?.message || null };
}

export async function POST(request: Request) {
  let stripe: Stripe;
  let siteUrl: string;
  let supabase;

  try {
    stripe = new Stripe(getRequiredEnv("STRIPE_SECRET_KEY"));
    siteUrl = getSiteUrl();
    supabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Stripe Connect onboarding configuration error:", error);
    return NextResponse.json(
      { error: "Stripe Connect onboarding is not configured." },
      { status: 500 },
    );
  }

  if (!siteUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_SITE_URL is required for Stripe onboarding." },
      { status: 500 },
    );
  }

  const { user, error: authError } = await getCurrentUser(request);

  if (authError || !user) {
    return NextResponse.json(
      { error: "Sign in to set up seller payouts." },
      { status: 401 },
    );
  }

  try {
    const { data: existingAccount, error: fetchError } = await supabase
      .from("seller_accounts")
      .select("stripe_account_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError) {
      console.error("Stripe Connect seller account lookup error:", {
        error: fetchError,
        errorMessage: fetchError.message,
        userId: user.id,
      });
      throw fetchError;
    }

    let stripeAccountId = (existingAccount as SellerAccountRow | null)
      ?.stripe_account_id;

    if (!stripeAccountId) {
      const account = await stripe.accounts.create(
        {
          type: "express",
          country: "US",
          email: user.email ?? undefined,
          capabilities: {
            transfers: { requested: true },
          },
        },
        { apiVersion: connectApiVersion },
      );

      stripeAccountId = account.id;

      const { error: insertError } = await supabase
        .from("seller_accounts")
        .insert({
          user_id: user.id,
          stripe_account_id: stripeAccountId,
          onboarding_status: "incomplete",
          details_submitted: Boolean(account.details_submitted),
          charges_enabled: Boolean(account.charges_enabled),
          payouts_enabled: Boolean(account.payouts_enabled),
          requirements_due: account.requirements?.currently_due || [],
          disabled_reason: account.requirements?.disabled_reason || null,
        });

      if (insertError) {
        console.error("Stripe Connect seller account insert error:", {
          error: insertError,
          errorMessage: insertError.message,
          userId: user.id,
          stripeAccountId,
        });
        throw insertError;
      }
    }

    const accountLink = await stripe.accountLinks.create(
      {
        account: stripeAccountId,
        refresh_url: `${siteUrl}/seller-dashboard?stripe=refresh`,
        return_url: `${siteUrl}/seller-dashboard?stripe=return`,
        type: "account_onboarding",
      },
      { apiVersion: connectApiVersion },
    );

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    const stripeDetail = getStripeErrorDetail(error);

    console.error("Stripe Connect onboarding error:", {
      error,
      errorMessage: stripeDetail?.message || (error instanceof Error ? error.message : undefined),
      errorCode: stripeDetail?.code,
      errorType: stripeDetail?.type,
      errorRaw: stripeDetail?.raw,
    });

    return NextResponse.json(
      {
        error: "Stripe payout onboarding could not be started.",
        detail: getSafeErrorDetail(error),
      },
      { status: 500 },
    );
  }
}
