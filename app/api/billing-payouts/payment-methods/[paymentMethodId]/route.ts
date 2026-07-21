import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
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
    console.error("Billing remove payment method auth error:", error);
  }

  return { user, error: error?.message || null };
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ paymentMethodId: string }> },
) {
  const { paymentMethodId } = await params;
  const cleanPaymentMethodId = paymentMethodId.trim();

  if (!cleanPaymentMethodId) {
    return NextResponse.json(
      { error: "Payment method is required." },
      { status: 400 },
    );
  }

  const { user, error: authError } = await getCurrentUser(request);

  if (authError || !user) {
    return NextResponse.json(
      { error: "Sign in to remove payment methods." },
      { status: 401 },
    );
  }

  try {
    const stripe = createStripeClient();
    const customer = await findStripeCustomerForUser({ stripe, user });

    if (!customer) {
      return NextResponse.json(
        { error: "No Stripe customer found for this user." },
        { status: 404 },
      );
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customer.id,
      type: "card",
    });
    const ownsPaymentMethod = paymentMethods.data.some(
      (method) => method.id === cleanPaymentMethodId,
    );

    if (!ownsPaymentMethod) {
      return NextResponse.json(
        { error: "Payment method was not found for this user." },
        { status: 404 },
      );
    }

    await stripe.paymentMethods.detach(cleanPaymentMethodId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Billing remove payment method error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Payment method could not be removed.",
      },
      { status: 500 },
    );
  }
}
