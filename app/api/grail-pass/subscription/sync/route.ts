import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  createServiceSupabaseClient,
  getAuthenticatedUser,
  getGrailPassErrorResponse,
  grantGrailPassMonthlyCreditForInvoice,
  logGrailPassDiagnostic,
  syncGrailPassSubscriptionFromStripe,
} from "../../../../lib/grailPassSubscription";
import { createStripeClient } from "../../../../lib/stripeCustomers";

export const runtime = "nodejs";

type SyncBody = {
  sessionId?: string;
};

export async function POST(request: Request) {
  logGrailPassDiagnostic("subscription_sync.route_entered", request);
  const { user, error } = await getAuthenticatedUser(request);

  if (!user) {
    logGrailPassDiagnostic("subscription_sync.auth_failed", request, {
      authenticatedUserFound: false,
      failureBranch: "not_authenticated",
    });
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
    logGrailPassDiagnostic("subscription_sync.session_missing", request, {
      authenticatedUserFound: true,
      failureBranch: "missing_checkout_session",
    });
    return NextResponse.json({ error: "Checkout session is required." }, { status: 400 });
  }

  try {
    logGrailPassDiagnostic("subscription_sync.authenticated", request, {
      authenticatedUserFound: true,
    });
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
    const mappedError = getGrailPassErrorResponse(syncError);
    const stripeError = syncError as { type?: string; message?: string };

    console.error("GRAIL Pass checkout sync error:", {
      error: syncError,
      failureBranch: mappedError.failureBranch,
      stripeErrorType: stripeError.type || null,
      stripeErrorMessage: stripeError.message || null,
    });
    logGrailPassDiagnostic("subscription_sync.failed", request, {
      authenticatedUserFound: true,
      failureBranch: mappedError.failureBranch,
      stripeErrorType: stripeError.type || null,
      stripeErrorMessage: stripeError.message || null,
    });

    return NextResponse.json(
      {
        error:
          mappedError.failureBranch === "unknown_failure"
            ? "GRAIL Pass checkout could not be synchronized."
            : mappedError.error,
      },
      { status: mappedError.failureBranch === "unknown_failure" ? 500 : mappedError.status },
    );
  }
}
