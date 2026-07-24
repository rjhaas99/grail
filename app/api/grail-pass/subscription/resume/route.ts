import { NextResponse } from "next/server";
import {
  createServiceSupabaseClient,
  getAuthenticatedUser,
  getGrailPassErrorResponse,
  getStoredGrailPassSubscription,
  logGrailPassDiagnostic,
  syncGrailPassSubscriptionFromStripe,
} from "../../../../lib/grailPassSubscription";
import { isGrailPassSubscriptionEntitled } from "../../../../lib/grailPassPlans";
import { createStripeClient } from "../../../../lib/stripeCustomers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  logGrailPassDiagnostic("subscription_resume.route_entered", request);
  const { user, error } = await getAuthenticatedUser(request);

  if (!user) {
    logGrailPassDiagnostic("subscription_resume.auth_failed", request, {
      authenticatedUserFound: false,
      failureBranch: "not_authenticated",
    });
    return NextResponse.json(
      { error: error || "Sign in to resume GRAIL Pass." },
      { status: 401 },
    );
  }

  try {
    logGrailPassDiagnostic("subscription_resume.authenticated", request, {
      authenticatedUserFound: true,
    });
    const supabase = createServiceSupabaseClient();
    const row = await getStoredGrailPassSubscription(supabase, user.id);

    if (!row || !isGrailPassSubscriptionEntitled(row.status)) {
      return NextResponse.json(
        { error: "No active GRAIL Pass subscription is available to resume." },
        { status: 404 },
      );
    }

    if (!row.cancel_at_period_end) {
      return NextResponse.json(
        { error: "GRAIL Pass auto-renew is already active." },
        { status: 409 },
      );
    }

    const stripe = createStripeClient();
    const subscription = await stripe.subscriptions.update(
      row.stripe_subscription_id,
      {
        cancel_at_period_end: false,
        metadata: {
          grailUserId: user.id,
          grailProduct: "grail_pass",
          type: "grail_pass_subscription",
          grailPassPlan: row.plan || "monthly",
        },
        expand: ["latest_invoice"],
      },
    );
    const synced = await syncGrailPassSubscriptionFromStripe({
      stripe,
      supabase,
      subscription,
      userId: user.id,
    });

    return NextResponse.json({
      status: synced.status,
      cancelAtPeriodEnd: synced.cancel_at_period_end,
      currentPeriodEnd: synced.current_period_end,
    });
  } catch (resumeError) {
    const mappedError = getGrailPassErrorResponse(resumeError);
    const stripeError = resumeError as { type?: string; message?: string };

    console.error("GRAIL Pass resume error:", {
      error: resumeError,
      failureBranch: mappedError.failureBranch,
      stripeErrorType: stripeError.type || null,
      stripeErrorMessage: stripeError.message || null,
    });
    logGrailPassDiagnostic("subscription_resume.failed", request, {
      authenticatedUserFound: true,
      failureBranch: mappedError.failureBranch,
      stripeErrorType: stripeError.type || null,
      stripeErrorMessage: stripeError.message || null,
    });

    return NextResponse.json(
      {
        error:
          mappedError.failureBranch === "unknown_failure"
            ? "GRAIL Pass auto-renew could not be resumed."
            : mappedError.error,
      },
      { status: mappedError.failureBranch === "unknown_failure" ? 500 : mappedError.status },
    );
  }
}
