import { NextResponse } from "next/server";
import {
  createServiceSupabaseClient,
  getActiveStripeGrailPassSubscription,
  getAppBaseUrl,
  getAuthenticatedUser,
  getOrCreateGrailPassPrice,
  getStoredGrailPassSubscription,
  syncGrailPassSubscriptionFromStripe,
} from "../../../lib/grailPassSubscription";
import {
  grailPassPlans,
  isGrailPassPlanType,
  isGrailPassSubscriptionEntitled,
} from "../../../lib/grailPassPlans";
import {
  createStripeClient,
  findStripeCustomerForUser,
} from "../../../lib/stripeCustomers";

export const runtime = "nodejs";

type CheckoutBody = {
  plan?: string;
};

export async function POST(request: Request) {
  const { user, error } = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json(
      { error: error || "Sign in to subscribe to GRAIL Pass." },
      { status: 401 },
    );
  }

  let body: CheckoutBody;

  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 });
  }

  if (!isGrailPassPlanType(body.plan)) {
    return NextResponse.json(
      { error: "Choose a Monthly or Annual GRAIL Pass plan." },
      { status: 400 },
    );
  }

  try {
    const stripe = createStripeClient();
    const supabase = createServiceSupabaseClient();
    const customer = await findStripeCustomerForUser({
      stripe,
      user,
      createIfMissing: true,
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Stripe customer could not be created for GRAIL Pass." },
        { status: 500 },
      );
    }

    const existingStripeSubscription = await getActiveStripeGrailPassSubscription(
      stripe,
      customer.id,
    );

    if (existingStripeSubscription) {
      const row = await syncGrailPassSubscriptionFromStripe({
        stripe,
        supabase,
        subscription: existingStripeSubscription,
        userId: user.id,
      });

      if (isGrailPassSubscriptionEntitled(row.status)) {
        return NextResponse.json(
          {
            error:
              row.plan === body.plan
                ? "GRAIL Pass is already active on this plan."
                : "Use Upgrade to change your active GRAIL Pass plan.",
          },
          { status: 409 },
        );
      }
    }

    const storedSubscription = await getStoredGrailPassSubscription(supabase, user.id);

    if (
      storedSubscription &&
      isGrailPassSubscriptionEntitled(storedSubscription.status) &&
      !storedSubscription.cancel_at_period_end
    ) {
      return NextResponse.json(
        { error: "GRAIL Pass is already active for this account." },
        { status: 409 },
      );
    }

    const plan = grailPassPlans[body.plan];
    const price = await getOrCreateGrailPassPrice(stripe, body.plan);
    const baseUrl = getAppBaseUrl(request);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customer.id,
      client_reference_id: user.id,
      line_items: [{ price: price.id, quantity: 1 }],
      allow_promotion_codes: true,
      metadata: {
        type: "grail_pass_subscription",
        grailProduct: "grail_pass",
        grailUserId: user.id,
        grailPassPlan: plan.type,
      },
      subscription_data: {
        metadata: {
          type: "grail_pass_subscription",
          grailProduct: "grail_pass",
          grailUserId: user.id,
          grailPassPlan: plan.type,
        },
      },
      success_url: `${baseUrl}/grail-pass?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/grail-pass?checkout=canceled`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe Checkout did not return a subscription URL." },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (checkoutError) {
    console.error("GRAIL Pass checkout error:", checkoutError);

    return NextResponse.json(
      { error: "GRAIL Pass checkout could not be started." },
      { status: 500 },
    );
  }
}
