import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSystemNotifications } from "../../../lib/serverNotifications";

export const runtime = "nodejs";

type OrderInsert = {
  listing_id: string;
  seller_id: string;
  buyer_id: string | null;
  stripe_session_id: string;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  total_amount: number;
  card_price: number;
  buyer_fee: number;
  platform_fee: number;
  processing_fee: number;
  seller_payout_amount: number;
  transfer_status: "not_ready";
  refund_status: "none";
  status: "paid";
};

type ListingRow = {
  id: string;
  seller_id: string | null;
  price: number | null;
  status: string | null;
};

type ExistingOrderRow = {
  id: string;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  refund_status: string | null;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function createServiceSupabaseClient() {
  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false,
      },
    },
  );
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function getPaymentIntentId(session: Stripe.Checkout.Session) {
  if (typeof session.payment_intent === "string") {
    return session.payment_intent;
  }

  return session.payment_intent?.id || "";
}

function getChargeIdFromPaymentIntent(paymentIntent: Stripe.PaymentIntent) {
  const latestCharge = paymentIntent.latest_charge;

  if (typeof latestCharge === "string") {
    return latestCharge;
  }

  return latestCharge?.id || "";
}

function describePaymentIntent(
  paymentIntent: string | Stripe.PaymentIntent | null,
) {
  if (!paymentIntent) {
    return null;
  }

  if (typeof paymentIntent === "string") {
    return paymentIntent;
  }

  return paymentIntent.id;
}

async function resolveStripePaymentData(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
) {
  const rawSessionPaymentIntent = describePaymentIntent(session.payment_intent);
  let resolvedSession = session;

  try {
    resolvedSession = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["payment_intent", "payment_intent.latest_charge"],
    });
  } catch (error) {
    console.error("Stripe webhook checkout session retrieve error:", {
      error,
      stripeSessionId: session.id,
      rawSessionPaymentIntent,
    });
  }

  let paymentIntentId = getPaymentIntentId(resolvedSession);
  let latestChargeId = "";

  if (
    resolvedSession.payment_intent &&
    typeof resolvedSession.payment_intent !== "string"
  ) {
    latestChargeId = getChargeIdFromPaymentIntent(resolvedSession.payment_intent);
  }

  if (paymentIntentId && !latestChargeId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ["latest_charge"],
      });

      paymentIntentId = paymentIntent.id;
      latestChargeId = getChargeIdFromPaymentIntent(paymentIntent);
    } catch (error) {
      console.error("Stripe webhook payment intent retrieve error:", {
        error,
        stripeSessionId: session.id,
        rawSessionPaymentIntent,
        resolvedPaymentIntentId: paymentIntentId,
      });
    }
  }

  console.info("Stripe webhook resolved payment data:", {
    stripeSessionId: session.id,
    rawSessionPaymentIntent: session.payment_intent,
    rawSessionPaymentIntentId: rawSessionPaymentIntent,
    resolvedPaymentIntentId: paymentIntentId || null,
    latestChargeId: latestChargeId || null,
  });

  if (!paymentIntentId) {
    console.error("Stripe webhook missing payment_intent after resolution:", {
      stripeSessionId: session.id,
      rawSessionPaymentIntent: session.payment_intent,
      rawSessionPaymentIntentId: rawSessionPaymentIntent,
      retrievedPaymentIntent: describePaymentIntent(resolvedSession.payment_intent),
      paymentStatus: resolvedSession.payment_status,
      mode: resolvedSession.mode,
    });
    throw new Error(
      "Stripe checkout.session.completed is missing payment_intent. Order was not recorded.",
    );
  }

  if (!latestChargeId) {
    console.warn("Stripe webhook latest_charge missing after resolution:", {
      stripeSessionId: session.id,
      paymentIntentId,
    });
  }

  return {
    paymentIntentId,
    latestChargeId,
  };
}

async function handleCheckoutSessionCompleted(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
) {
  const listingId = session.metadata?.listingId || "";
  const sellerId = session.metadata?.sellerId || "";
  const buyerId = session.metadata?.buyerId || session.client_reference_id || null;
  const totalAmount = Number(session.amount_total || 0) / 100;
  const subtotalAmount = Number(session.amount_subtotal || 0) / 100;
  const { paymentIntentId, latestChargeId } = await resolveStripePaymentData(
    stripe,
    session,
  );

  if (!listingId || !sellerId) {
    throw new Error("Stripe session is missing listingId or sellerId metadata.");
  }

  if (!totalAmount || totalAmount <= 0) {
    throw new Error("Stripe session is missing a valid amount_total.");
  }

  const supabase = createServiceSupabaseClient();

  const { data: existingOrder, error: existingOrderError } = await supabase
    .from("orders")
    .select("id, stripe_payment_intent_id, stripe_charge_id, refund_status")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  if (existingOrderError) {
    console.error("Stripe webhook existing order lookup error:", {
      error: existingOrderError,
      errorMessage: existingOrderError.message,
      stripeSessionId: session.id,
    });
    throw existingOrderError;
  }

  const { data: listingData, error: listingError } = await supabase
    .from("listings")
    .select("id, seller_id, price, status")
    .eq("id", listingId)
    .eq("seller_id", sellerId)
    .maybeSingle();

  if (listingError) {
    console.error("Stripe webhook listing lookup error:", {
      error: listingError,
      listingId,
      sellerId,
      stripeSessionId: session.id,
    });
    throw listingError;
  }

  if (!listingData) {
    throw new Error("Stripe webhook could not find the paid listing.");
  }

  if (existingOrder) {
    const existing = existingOrder as ExistingOrderRow;
    const orderPaymentPatch: Record<string, string> = {};

    if (!existing.stripe_payment_intent_id) {
      orderPaymentPatch.stripe_payment_intent_id = paymentIntentId;
    }

    if (!existing.stripe_charge_id && latestChargeId) {
      orderPaymentPatch.stripe_charge_id = latestChargeId;
    }

    if (!existing.refund_status) {
      orderPaymentPatch.refund_status = "none";
    }

    if (Object.keys(orderPaymentPatch).length > 0) {
      const { error: orderPaymentUpdateError } = await supabase
        .from("orders")
        .update(orderPaymentPatch)
        .eq("id", existing.id);

      if (orderPaymentUpdateError) {
        console.error("Stripe webhook existing order payment field update error:", {
          error: orderPaymentUpdateError,
          errorMessage: orderPaymentUpdateError.message,
          stripeSessionId: session.id,
          paymentIntentId,
          latestChargeId,
          orderId: existing.id,
          orderPaymentPatch,
        });
        throw orderPaymentUpdateError;
      }
    }

    const { error: listingUpdateError } = await supabase
      .from("listings")
      .update({ status: "sold" })
      .eq("id", listingId)
      .eq("seller_id", sellerId);

    if (listingUpdateError) {
      console.error("Stripe webhook duplicate listing sold update error:", {
        error: listingUpdateError,
        errorMessage: listingUpdateError.message,
        listingId,
        sellerId,
        stripeSessionId: session.id,
      });
      throw listingUpdateError;
    }

    console.info("Stripe checkout.session.completed duplicate handled:", {
      stripeSessionId: session.id,
      paymentIntentId,
      latestChargeId: latestChargeId || null,
      orderId: existing.id,
      updatedPaymentFields: Object.keys(orderPaymentPatch),
    });

    return;
  }

  const listing = listingData as ListingRow;
  const listingPrice = Number(listing.price || 0);
  const cardPrice = listingPrice > 0 ? listingPrice : subtotalAmount || totalAmount;
  const buyerFee = Math.max(totalAmount - cardPrice, 0);
  const platformFee = roundCurrency(cardPrice * 0.075);
  const processingFee = roundCurrency(buyerFee);
  const sellerPayoutAmount = Math.max(
    roundCurrency(cardPrice - platformFee - processingFee),
    0,
  );

  const orderPayload: OrderInsert = {
    listing_id: listingId,
    seller_id: sellerId,
    buyer_id: buyerId || null,
    stripe_session_id: session.id,
    stripe_payment_intent_id: paymentIntentId || null,
    stripe_charge_id: latestChargeId || null,
    total_amount: totalAmount,
    card_price: cardPrice,
    buyer_fee: buyerFee,
    platform_fee: platformFee,
    processing_fee: processingFee,
    seller_payout_amount: sellerPayoutAmount,
    transfer_status: "not_ready",
    refund_status: "none",
    status: "paid",
  };
  const { data: insertedOrder, error: insertError } = await supabase
    .from("orders")
    .insert(orderPayload)
    .select("id")
    .single();

  if (insertError) {
    console.error("Stripe webhook order insert error:", {
      error: insertError,
      errorMessage: insertError.message,
      orderPayload,
      stripeSessionId: session.id,
      paymentIntentId,
      latestChargeId,
      stripeAmountTotal: session.amount_total,
      stripeAmountSubtotal: session.amount_subtotal,
    });
    throw insertError;
  }

  const { error: listingUpdateError } = await supabase
    .from("listings")
    .update({ status: "sold" })
    .eq("id", listingId)
    .eq("seller_id", sellerId);

  if (listingUpdateError) {
    console.error("Stripe webhook listing sold update error:", {
      error: listingUpdateError,
      errorMessage: listingUpdateError.message,
      listingId,
      sellerId,
      stripeSessionId: session.id,
    });
    throw listingUpdateError;
  }

  console.info("Stripe checkout.session.completed order recorded:", {
    stripeSessionId: session.id,
    paymentIntentId,
    latestChargeId: latestChargeId || null,
    orderId: insertedOrder?.id,
  });

  await createSystemNotifications(supabase, [
    {
      userId: sellerId,
      title: "Your item sold",
      body: "Your card sold. Add tracking from your Seller Dashboard.",
      linkUrl: "/seller-dashboard",
    },
    {
      userId: buyerId,
      title: "Order confirmed",
      body: "Your GRAIL order was placed successfully.",
      linkUrl: "/orders",
    },
  ]);
}

export async function POST(request: Request) {
  let stripe: Stripe;
  let webhookSecret: string;

  try {
    stripe = new Stripe(getRequiredEnv("STRIPE_SECRET_KEY"));
    webhookSecret = getRequiredEnv("STRIPE_WEBHOOK_SECRET");
  } catch (error) {
    console.error("Stripe webhook configuration error:", error);
    return NextResponse.json(
      { error: "Stripe webhook is not configured." },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 },
    );
  }

  const rawBody = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature verification error:", error);
    return NextResponse.json(
      { error: "Invalid Stripe signature." },
      { status: 400 },
    );
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  try {
    await handleCheckoutSessionCompleted(
      stripe,
      event.data.object as Stripe.Checkout.Session,
    );

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook handling error:", error);
    return NextResponse.json(
      { error: "Stripe webhook could not record the order." },
      { status: 500 },
    );
  }
}
