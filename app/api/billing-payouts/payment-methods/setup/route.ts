import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getConfiguredSiteUrl } from "../../../../lib/siteConfig";
import {
  createStripeClient,
  findStripeCustomerForUser,
} from "../../../../lib/stripeCustomers";

export const runtime = "nodejs";

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function createAnonSupabaseClient() {
  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { persistSession: false } },
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

  const supabase = createAnonSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error) {
    console.error("Billing payment method setup auth error:", error);
  }

  return { user, error: error?.message || null };
}

export async function POST(request: Request) {
  const { user, error: authError } = await getCurrentUser(request);

  if (authError || !user) {
    return NextResponse.json(
      { error: "Sign in to add a payment method." },
      { status: 401 },
    );
  }

  try {
    const stripe = createStripeClient();
    const customer = await findStripeCustomerForUser({
      stripe,
      user,
      createIfMissing: true,
    });

    if (!customer) {
      throw new Error("Stripe customer could not be created.");
    }

    const siteUrl = getConfiguredSiteUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      customer: customer.id,
      payment_method_types: ["card"],
      success_url: `${siteUrl}/billing-payouts?payment_method=added`,
      cancel_url: `${siteUrl}/billing-payouts?payment_method=canceled`,
      setup_intent_data: {
        metadata: {
          grailUserId: user.id,
          source: "grail",
        },
      },
      metadata: {
        grailUserId: user.id,
        source: "grail",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Billing payment method setup error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Payment method setup could not be started.",
      },
      { status: 500 },
    );
  }
}
