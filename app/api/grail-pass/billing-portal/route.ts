import { NextResponse } from "next/server";
import {
  createServiceSupabaseClient,
  getAppBaseUrl,
  getAuthenticatedUser,
  getStoredGrailPassSubscription,
} from "../../../lib/grailPassSubscription";
import {
  createStripeClient,
  findStripeCustomerForUser,
} from "../../../lib/stripeCustomers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { user, error } = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json(
      { error: error || "Sign in to manage GRAIL Pass billing." },
      { status: 401 },
    );
  }

  try {
    const stripe = createStripeClient();
    const supabase = createServiceSupabaseClient();
    const row = await getStoredGrailPassSubscription(supabase, user.id);
    const customer = row?.stripe_customer_id
      ? { id: row.stripe_customer_id }
      : await findStripeCustomerForUser({ stripe, user });

    if (!customer?.id) {
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
    console.error("GRAIL Pass billing portal error:", portalError);

    return NextResponse.json(
      { error: "GRAIL Pass billing portal could not be opened." },
      { status: 500 },
    );
  }
}
