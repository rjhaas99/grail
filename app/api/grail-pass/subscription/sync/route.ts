import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  createServiceSupabaseClient,
  getAuthenticatedUser,
  grantGrailPassMonthlyCreditForInvoice,
  syncGrailPassSubscriptionFromStripe,
} from "../../../../lib/grailPassSubscription";
import { createStripeClient } from "../../../../lib/stripeCustomers";

export const runtime = "nodejs";

type SyncBody = {
  sessionId?: string;
};

export async function POST(request: Request) {
  const { user, error } = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json(
      { error: error || "Sign in to synchronize GRAIL Pass." },
      { status: 401 },
    );
  }

  let body: SyncBody;

  try {
    body = (await request.json()) as SyncBody;
  } catch {
    return NextResponse.json({ error: "Invalid sync request." }, { status: 400 });
  }

  const sessionId = body.sessionId?.trim();

  if (!sessionId) {
    return NextResponse.json({ error: "Checkout session is required." }, { status: 400 });
  }

  try {
    const stripe = createStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "subscription.latest_invoice"],
    });

    if (
      session.mode !== "subscription" ||
      session.metadata?.type !== "grail_pass_subscription"
    ) {
      return NextResponse.json(
        { error: "Checkout session is not a GRAIL Pass subscription." },
        { status: 400 },
      );
    }

    if (
      session.client_reference_id !== user.id &&
      session.metadata?.grailUserId !== user.id
    ) {
      return NextResponse.json(
        { error: "Checkout session does not belong to this account." },
        { status: 403 },
      );
    }

    if (!session.subscription || typeof session.subscription === "string") {
      return NextResponse.json(
        { error: "Checkout session subscription is not ready yet." },
        { status: 409 },
      );
    }

    const subscription = session.subscription;
    const supabase = createServiceSupabaseClient();
    const row = await syncGrailPassSubscriptionFromStripe({
      stripe,
      supabase,
      subscription,
      userId: user.id,
    });

    const latestInvoice =
      subscription.latest_invoice && typeof subscription.latest_invoice !== "string"
        ? (subscription.latest_invoice as Stripe.Invoice)
        : null;

    await grantGrailPassMonthlyCreditForInvoice({
      supabase,
      subscription,
      invoice: latestInvoice,
    });

    return NextResponse.json({
      subscriptionId: row.stripe_subscription_id,
      status: row.status,
      plan: row.plan,
    });
  } catch (syncError) {
    console.error("GRAIL Pass checkout sync error:", syncError);

    return NextResponse.json(
      { error: "GRAIL Pass checkout could not be synchronized." },
      { status: 500 },
    );
  }
}
