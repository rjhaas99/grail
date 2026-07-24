import { NextResponse } from "next/server";
import {
  buildGrailPassPlansPayload,
  createServiceSupabaseClient,
  getAuthenticatedUser,
  getGrailPassErrorResponse,
  getGrailPassMonthlyCreditAmount,
  getGrailPassSubscriptionForUser,
  getStoredGrailPassSubscription,
  getSubscriptionManageableState,
  listGrailPassBillingHistory,
  logGrailPassDiagnostic,
} from "../../../lib/grailPassSubscription";
import { createStripeClient } from "../../../lib/stripeCustomers";
import { getGrailPassRewardBoostConfig } from "../../../lib/grailPassRewards";

export const runtime = "nodejs";

export async function GET(request: Request) {
  logGrailPassDiagnostic("subscription.route_entered", request);
  const { user, error } = await getAuthenticatedUser(request);

  if (!user) {
    logGrailPassDiagnostic("subscription.auth_failed", request, {
      authenticatedUserFound: false,
      failureBranch: "not_authenticated",
    });
    return NextResponse.json(
      { error: error || "Sign in to view GRAIL Pass membership." },
      { status: 401 },
    );
  }

  try {
    logGrailPassDiagnostic("subscription.authenticated", request, {
      authenticatedUserFound: true,
    });
    const supabase = createServiceSupabaseClient();
    const subscriptionRow = await getStoredGrailPassSubscription(supabase, user.id);
    const subscription = await getGrailPassSubscriptionForUser(supabase, user.id);
    let billingHistory = subscription.billingHistory;

    if (subscriptionRow?.stripe_customer_id) {
      try {
        const stripe = createStripeClient();
        billingHistory = await listGrailPassBillingHistory({
          stripe,
          customerId: subscriptionRow.stripe_customer_id,
          subscriptionId: subscriptionRow.stripe_subscription_id,
        });
      } catch (stripeError) {
        console.warn("GRAIL Pass billing history load skipped:", stripeError);
      }
    }

    return NextResponse.json({
      plans: buildGrailPassPlansPayload(),
      membership: subscription.membership,
      subscription: subscription.subscription,
      billingHistory,
      actions: getSubscriptionManageableState(subscriptionRow),
      monthlyCreditAmount: getGrailPassMonthlyCreditAmount(),
      rewardBoost: getGrailPassRewardBoostConfig(),
    });
  } catch (loadError) {
    const mappedError = getGrailPassErrorResponse(loadError);

    console.error("GRAIL Pass subscription status error:", {
      error: loadError,
      failureBranch: mappedError.failureBranch,
    });
    logGrailPassDiagnostic("subscription.failed", request, {
      authenticatedUserFound: true,
      failureBranch: mappedError.failureBranch,
    });

    return NextResponse.json(
      {
        error:
          mappedError.failureBranch === "unknown_failure"
            ? "GRAIL Pass subscription status could not be loaded."
            : mappedError.error,
      },
      { status: mappedError.failureBranch === "unknown_failure" ? 500 : mappedError.status },
    );
  }
}
