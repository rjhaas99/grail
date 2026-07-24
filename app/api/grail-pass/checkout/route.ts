import { NextResponse } from "next/server";
import {
  createServiceSupabaseClient,
  getActiveStripeGrailPassSubscription,
  getAppBaseUrl,
  getAuthenticatedUser,
  getGrailPassErrorResponse,
  getOrCreateGrailPassPrice,
  getStoredGrailPassSubscription,
  logGrailPassDiagnostic,
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
  logGrailPassDiagnostic("checkout.route_entered", request, {
    stripeCheckoutCreationAttempted: false,
  });
  const { user, error } = await getAuthenticatedUser(request);

  if (!user) {
    logGrailPassDiagnostic("checkout.auth_failed", request, {
      authenticatedUserFound: false,
      failureBranch: "not_authenticated",
    });
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
    logGrailPassDiagnostic("checkout.plan_invalid", request, {
      authenticatedUserFound: true,
      selectedPlan: body.plan || null,
      failureBranch: "invalid_plan",
    });
    return NextResponse.json(
      { error: "Choose a Monthly or Annual GRAIL Pass plan." },
      { status: 400 },
    );
  }

  let stripeCheckoutCreationAttempted = false;

  try {
    logGrailPassDiagnostic("checkout.authenticated", request, {
      authenticatedUserFound: true,
      selectedPlan: body.plan,
      stripeCheckoutCreationAttempted,
    });
    const stripe = createStripeClient();
    const supabase = createServiceSupabaseClient();
    const customer = await findStripeCustomerForUser({
      stripe,
      user,
      createIfMissing: true,
    });

    if (!customer) {
      logGrailPassDiagnostic("checkout.customer_missing", request, {
        authenticatedUserFound: true,
        selectedPlan: body.plan,
        failureBranch: "stripe_customer_creation_failure",
        stripeCheckoutCreationAttempted,
      });
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
    stripeCheckoutCreationAttempted = true;
    logGrailPassDiagnostic("checkout.stripe_session_create_attempt", request, {
      authenticatedUserFound: true,
      selectedPlan: body.plan,
      stripeCheckoutCreationAttempted,
    });
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
      logGrailPassDiagnostic("checkout.stripe_session_url_missing", request, {
        authenticatedUserFound: true,
        selectedPlan: body.plan,
        failureBranch: "stripe_checkout_missing_url",
        stripeCheckoutCreationAttempted,
      });
      return NextResponse.json(
        { error: "Stripe Checkout did not return a subscription URL." },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (checkoutError) {
    const mappedError = getGrailPassErrorResponse(checkoutError);
    const stripeError = checkoutError as { type?: string; message?: string };

    console.error("GRAIL Pass checkout error:", {
      error: checkoutError,
      failureBranch: mappedError.failureBranch,
      selectedPlan: body.plan,
      stripeCheckoutCreationAttempted,
      stripeErrorType: stripeError.type || null,
      stripeErrorMessage: stripeError.message || null,
    });
    logGrailPassDiagnostic("checkout.failed", request, {
      authenticatedUserFound: true,
      selectedPlan: body.plan,
      failureBranch: mappedError.failureBranch,
      stripeCheckoutCreationAttempted,
      stripeErrorType: stripeError.type || null,
      stripeErrorMessage: stripeError.message || null,
    });

    return NextResponse.json(
      { error: mappedError.error },
      { status: mappedError.status },
    );
  }
}
