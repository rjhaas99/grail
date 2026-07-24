import { NextResponse } from "next/server";
import {
  createServiceSupabaseClient,
  getAuthenticatedUser,
  getGrailPassErrorResponse,
  getOrCreateGrailPassPrice,
  getStoredGrailPassSubscription,
  logGrailPassDiagnostic,
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
  logGrailPassDiagnostic("subscription_upgrade.route_entered", request);
  const { user, error } = await getAuthenticatedUser(request);

  if (!user) {
    logGrailPassDiagnostic("subscription_upgrade.auth_failed", request, {
      authenticatedUserFound: false,
      failureBranch: "not_authenticated",
    });
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
    logGrailPassDiagnostic("subscription_upgrade.plan_invalid", request, {
      authenticatedUserFound: true,
      selectedPlan: body.plan || null,
      failureBranch: "invalid_upgrade_plan",
    });
    return NextResponse.json(
      { error: "GRAIL Pass can currently be upgraded to the Annual plan." },
      { status: 400 },
    );
  }

  try {
    logGrailPassDiagnostic("subscription_upgrade.authenticated", request, {
      authenticatedUserFound: true,
      selectedPlan: body.plan,
    });
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
    const mappedError = getGrailPassErrorResponse(upgradeError);
    const stripeError = upgradeError as { type?: string; message?: string };

    console.error("GRAIL Pass upgrade error:", {
      error: upgradeError,
      failureBranch: mappedError.failureBranch,
      stripeErrorType: stripeError.type || null,
      stripeErrorMessage: stripeError.message || null,
    });
    logGrailPassDiagnostic("subscription_upgrade.failed", request, {
      authenticatedUserFound: true,
      selectedPlan: body.plan,
      failureBranch: mappedError.failureBranch,
      stripeErrorType: stripeError.type || null,
      stripeErrorMessage: stripeError.message || null,
    });

    return NextResponse.json(
      {
        error:
          mappedError.failureBranch === "unknown_failure"
            ? "GRAIL Pass could not be upgraded."
            : mappedError.error,
      },
      { status: mappedError.failureBranch === "unknown_failure" ? 500 : mappedError.status },
    );
  }
}
