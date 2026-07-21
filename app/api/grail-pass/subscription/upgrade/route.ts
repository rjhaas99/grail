import { NextResponse } from "next/server";
import {
  createServiceSupabaseClient,
  getAuthenticatedUser,
  getOrCreateGrailPassPrice,
  getStoredGrailPassSubscription,
  syncGrailPassSubscriptionFromStripe,
} from "../../../../lib/grailPassSubscription";
import {
  isGrailPassPlanType,
  isGrailPassSubscriptionEntitled,
} from "../../../../lib/grailPassPlans";
import { createStripeClient } from "../../../../lib/stripeCustomers";

export const runtime = "nodejs";

type UpgradeBody = {
  plan?: string;
};

export async function POST(request: Request) {
  const { user, error } = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json(
      { error: error || "Sign in to upgrade GRAIL Pass." },
      { status: 401 },
    );
  }

  let body: UpgradeBody;

  try {
    body = (await request.json()) as UpgradeBody;
  } catch {
    return NextResponse.json({ error: "Invalid upgrade request." }, { status: 400 });
  }

  if (!isGrailPassPlanType(body.plan) || body.plan !== "annual") {
    return NextResponse.json(
      { error: "GRAIL Pass can currently be upgraded to the Annual plan." },
      { status: 400 },
    );
  }

  try {
    const supabase = createServiceSupabaseClient();
    const row = await getStoredGrailPassSubscription(supabase, user.id);

    if (!row || !isGrailPassSubscriptionEntitled(row.status)) {
      return NextResponse.json(
        { error: "No active GRAIL Pass subscription is available to upgrade." },
        { status: 404 },
      );
    }

    if (row.plan === "annual") {
      return NextResponse.json(
        { error: "GRAIL Pass is already on the Annual plan." },
        { status: 409 },
      );
    }

    const stripe = createStripeClient();
    const subscription = await stripe.subscriptions.retrieve(
      row.stripe_subscription_id,
    );

    if (typeof subscription.customer === "string") {
      if (subscription.customer !== row.stripe_customer_id) {
        return NextResponse.json(
          { error: "Subscription ownership could not be verified." },
          { status: 403 },
        );
      }
    }

    const itemId = subscription.items.data[0]?.id;

    if (!itemId) {
      return NextResponse.json(
        { error: "Stripe subscription item could not be found." },
        { status: 409 },
      );
    }

    const price = await getOrCreateGrailPassPrice(stripe, "annual");
    const updated = await stripe.subscriptions.update(row.stripe_subscription_id, {
      cancel_at_period_end: false,
      proration_behavior: "create_prorations",
      items: [{ id: itemId, price: price.id }],
      metadata: {
        ...subscription.metadata,
        type: "grail_pass_subscription",
        grailProduct: "grail_pass",
        grailUserId: user.id,
        grailPassPlan: "annual",
      },
      expand: ["latest_invoice"],
    });
    const synced = await syncGrailPassSubscriptionFromStripe({
      stripe,
      supabase,
      subscription: updated,
      userId: user.id,
    });

    return NextResponse.json({
      status: synced.status,
      plan: synced.plan,
      currentPeriodEnd: synced.current_period_end,
    });
  } catch (upgradeError) {
    console.error("GRAIL Pass upgrade error:", upgradeError);

    return NextResponse.json(
      { error: "GRAIL Pass could not be upgraded." },
      { status: 500 },
    );
  }
}
