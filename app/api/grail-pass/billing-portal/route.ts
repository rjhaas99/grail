import { NextResponse } from "next/server";
import {
  createServiceSupabaseClient,
  getAppBaseUrl,
  getAuthenticatedUser,
  getGrailPassErrorResponse,
  getStoredGrailPassSubscription,
  logGrailPassDiagnostic,
} from "../../../lib/grailPassSubscription";
import {
  createStripeClient,
  findStripeCustomerForUser,
} from "../../../lib/stripeCustomers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  logGrailPassDiagnostic("billing_portal.route_entered", request);
  const { user, error } = await getAuthenticatedUser(request);

  if (!user) {
    logGrailPassDiagnostic("billing_portal.auth_failed", request, {
      authenticatedUserFound: false,
      failureBranch: "not_authenticated",
    });
    return NextResponse.json(
      { error: error || "Sign in to manage GRAIL Pass billing." },
      { status: 401 },
    );
  }

  try {
    logGrailPassDiagnostic("billing_portal.authenticated", request, {
      authenticatedUserFound: true,
    });
    const stripe = createStripeClient();
    const supabase = createServiceSupabaseClient();
    const row = await getStoredGrailPassSubscription(supabase, user.id);
    const customer = row?.stripe_customer_id
      ? { id: row.stripe_customer_id }
      : await findStripeCustomerForUser({ stripe, user });

    if (!customer?.id) {
      logGrailPassDiagnostic("billing_portal.customer_missing", request, {
        authenticatedUserFound: true,
        failureBranch: "stripe_customer_missing",
      });
      return NextResponse.json(
        { error: "No Stripe customer is connected to this account yet." },
        { status: 404 },
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${getAppBaseUrl(request)}/billing-payouts`,
    });

    return NextResponse.json({ url: session.url });
  } catch (portalError) {
    const mappedError = getGrailPassErrorResponse(portalError);
    const stripeError = portalError as { type?: string; message?: string };

    console.error("GRAIL Pass billing portal error:", {
      error: portalError,
      failureBranch: mappedError.failureBranch,
      stripeErrorType: stripeError.type || null,
      stripeErrorMessage: stripeError.message || null,
    });
    logGrailPassDiagnostic("billing_portal.failed", request, {
      authenticatedUserFound: true,
      failureBranch: mappedError.failureBranch,
      stripeErrorType: stripeError.type || null,
      stripeErrorMessage: stripeError.message || null,
    });

    return NextResponse.json(
      {
        error:
          mappedError.failureBranch === "unknown_failure"
            ? "GRAIL Pass billing portal could not be opened."
            : mappedError.error,
      },
      { status: mappedError.failureBranch === "unknown_failure" ? 500 : mappedError.status },
    );
  }
}
