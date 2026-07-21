import { NextResponse } from "next/server";
import {
  createServiceSupabaseClient,
  getAuthenticatedUser,
  getStoredGrailPassSubscription,
  syncGrailPassSubscriptionFromStripe,
} from "../../../../lib/grailPassSubscription";
import { isGrailPassSubscriptionEntitled } from "../../../../lib/grailPassPlans";
import { createStripeClient } from "../../../../lib/stripeCustomers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { user, error } = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json(
      { error: error || "Sign in to resume GRAIL Pass." },
      { status: 401 },
    );
  }

  try {
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
    console.error("GRAIL Pass resume error:", resumeError);

    return NextResponse.json(
      { error: "GRAIL Pass auto-renew could not be resumed." },
      { status: 500 },
    );
  }
}
