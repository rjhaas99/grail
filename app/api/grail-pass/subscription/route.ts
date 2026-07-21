import { NextResponse } from "next/server";
import {
  buildGrailPassPlansPayload,
  createServiceSupabaseClient,
  getAuthenticatedUser,
  getGrailPassMonthlyCreditAmount,
  getGrailPassSubscriptionForUser,
  getStoredGrailPassSubscription,
  getSubscriptionManageableState,
  listGrailPassBillingHistory,
} from "../../../lib/grailPassSubscription";
import { createStripeClient } from "../../../lib/stripeCustomers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { user, error } = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json(
      { error: error || "Sign in to view GRAIL Pass membership." },
      { status: 401 },
    );
  }

  try {
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
    });
  } catch (loadError) {
    console.error("GRAIL Pass subscription status error:", loadError);

    return NextResponse.json(
      { error: "GRAIL Pass subscription status could not be loaded." },
      { status: 500 },
    );
  }
}
