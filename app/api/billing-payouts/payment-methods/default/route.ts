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
    console.error("Billing default payment method auth error:", error);
  }

  return { user, error: error?.message || null };
}

export async function POST(request: Request) {
  const { user, error: authError } = await getCurrentUser(request);

  if (authError || !user) {
    return NextResponse.json(
      { error: "Sign in to update payment methods." },
      { status: 401 },
    );
  }

  let payload: { paymentMethodId?: unknown };

  try {
    payload = (await request.json()) as { paymentMethodId?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const paymentMethodId =
    typeof payload.paymentMethodId === "string"
      ? payload.paymentMethodId.trim()
      : "";

  if (!paymentMethodId) {
    return NextResponse.json(
      { error: "Payment method is required." },
      { status: 400 },
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
      (method) => method.id === paymentMethodId,
    );

    if (!ownsPaymentMethod) {
      return NextResponse.json(
        { error: "Payment method was not found for this user." },
        { status: 404 },
      );
    }

    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Billing default payment method error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Default payment method could not be updated.",
      },
      { status: 500 },
    );
  }
}
