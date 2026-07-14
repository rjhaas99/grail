import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSystemNotifications } from "../../../lib/serverNotifications";
import { getTransactionTypeFromStripeCheckoutType } from "../../../lib/transactionCheckout";

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
  title?: string | null;
  price: number | null;
  status: string | null;
  sale_format?: string | null;
  auction_status?: string | null;
  auction_reserve_price?: number | null;
  auction_current_bid?: number | null;
  auction_winner_id?: string | null;
  auction_duration_days?: number | null;
  auction_reserve_met_at?: string | null;
  reserve_fee_amount?: number | null;
  reserve_fee_status?: string | null;
  stripe_reserve_fee_checkout_session_id?: string | null;
  stripe_reserve_fee_payment_intent_id?: string | null;
  stripe_reserve_fee_charge_id?: string | null;
  stripe_reserve_fee_refund_id?: string | null;
};

type ExistingOrderRow = {
  id: string;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  refund_status: string | null;
};

type CheckoutMetadata = Record<string, string>;

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

function calculateReserveFee(reservePrice: number) {
  return roundCurrency(Math.min(100, Math.max(1, reservePrice * 0.05)));
}

function addDays(value: Date, days: number) {
  return new Date(value.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function normalizeAuctionDurationDays(value: number | null | undefined) {
  const duration = Number(value || 7);
  const oneMinuteDuration = 1 / (24 * 60);
  const validDurations = [oneMinuteDuration, 1, 3, 5, 7];
  const matchedDuration = validDurations.find(
    (validDuration) => Math.abs(duration - validDuration) < 0.000001,
  );

  return matchedDuration || 7;
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

async function resolveCheckoutMetadata(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
) {
  const sessionMetadata = session.metadata || {};
  let paymentIntentMetadata: CheckoutMetadata = {};

  try {
    const resolvedSession = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["payment_intent"],
    });

    if (
      resolvedSession.payment_intent &&
      typeof resolvedSession.payment_intent !== "string"
    ) {
      paymentIntentMetadata = resolvedSession.payment_intent.metadata || {};
    }
  } catch (error) {
    console.error("Stripe webhook metadata resolution error:", {
      error,
      stripeSessionId: session.id,
      sessionMetadataType: sessionMetadata.type || null,
    });
  }

  return {
    ...paymentIntentMetadata,
    ...sessionMetadata,
  };
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

async function refundReserveFeeIfNeeded(
  stripe: Stripe,
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  listingId: string,
) {
  const { data, error } = await supabase
    .from("listings")
    .select(
      "id, seller_id, title, sale_format, auction_reserve_met_at, reserve_fee_status, stripe_reserve_fee_payment_intent_id, stripe_reserve_fee_charge_id, stripe_reserve_fee_refund_id",
    )
    .eq("id", listingId)
    .maybeSingle();

  if (error) {
    console.error("Auction Reserve Commitment Fee refund listing fetch error:", {
      error,
      errorMessage: error.message,
      listingId,
    });
    return;
  }

  const listing = data as ListingRow | null;

  if (!listing || listing.sale_format !== "auction") {
    return;
  }

  if (
    listing.reserve_fee_status === "refunded" ||
    listing.stripe_reserve_fee_refund_id ||
    !listing.auction_reserve_met_at
  ) {
    return;
  }

  if (listing.reserve_fee_status !== "paid" && listing.reserve_fee_status !== "refund_pending") {
    return;
  }

  if (!listing.stripe_reserve_fee_payment_intent_id && !listing.stripe_reserve_fee_charge_id) {
    console.warn("Auction Reserve Commitment Fee refund skipped; missing Stripe payment data.", {
      listingId,
      reserveFeeStatus: listing.reserve_fee_status,
    });
    await supabase
      .from("listings")
      .update({ reserve_fee_status: "refund_pending" })
      .eq("id", listingId);
    return;
  }

  try {
    const refund = await stripe.refunds.create({
      ...(listing.stripe_reserve_fee_payment_intent_id
        ? { payment_intent: listing.stripe_reserve_fee_payment_intent_id }
        : { charge: listing.stripe_reserve_fee_charge_id || undefined }),
      metadata: {
        type: "auction_reserve_fee_refund",
        listingId,
        source: "grail",
      },
    });
    const refundedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("listings")
      .update({
        stripe_reserve_fee_refund_id: refund.id,
        reserve_fee_status: "refunded",
        reserve_fee_refunded_at: refundedAt,
      })
      .eq("id", listingId)
      .is("stripe_reserve_fee_refund_id", null);

    if (updateError) {
      console.error("Auction Reserve Commitment Fee refund save error:", {
        error: updateError,
        errorMessage: updateError.message,
        listingId,
        refundId: refund.id,
      });
    } else {
      await createSystemNotifications(supabase, [
        {
          userId: listing.seller_id,
          title: "Reserve Commitment Fee refunded",
          body: "Your reserve was met and the auction sold, so the Reserve Commitment Fee was refunded.",
          linkUrl: `/cards/${listingId}`,
        },
      ]);
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Reserve Commitment Fee refund failed.";
    console.error("Auction Reserve Commitment Fee Stripe refund error:", {
      error,
      errorMessage: detail,
      listingId,
      paymentIntentId: listing.stripe_reserve_fee_payment_intent_id,
      chargeId: listing.stripe_reserve_fee_charge_id,
    });
    await supabase
      .from("listings")
      .update({ reserve_fee_status: "refund_pending" })
      .eq("id", listingId);
  }
}

async function handleAuctionReserveFeeCompleted(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  metadata: CheckoutMetadata,
) {
  const listingId = metadata.listingId || "";
  const sellerId = metadata.sellerId || "";
  const reservePrice = Number(metadata.reservePrice || 0);
  const { paymentIntentId, latestChargeId } = await resolveStripePaymentData(
    stripe,
    session,
  );

  if (!listingId || !sellerId || reservePrice <= 0) {
    throw new Error("Reserve Commitment Fee checkout is missing metadata.");
  }

  console.info("Stripe webhook recognized Reserve Commitment Fee checkout:", {
    stripeSessionId: session.id,
    listingId,
    sellerId,
  });

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("listings")
    .select(
      "id, seller_id, title, sale_format, status, auction_status, auction_duration_days, auction_reserve_price, reserve_fee_status, stripe_reserve_fee_checkout_session_id",
    )
    .eq("id", listingId)
    .eq("seller_id", sellerId)
    .maybeSingle();

  if (error) {
    console.error("Reserve Commitment Fee webhook listing fetch error:", {
      error,
      errorMessage: error.message,
      listingId,
      sellerId,
      stripeSessionId: session.id,
    });
    throw error;
  }

  const listing = data as ListingRow | null;

  if (!listing || listing.sale_format !== "auction") {
    throw new Error("Reserve Commitment Fee webhook could not find the auction listing.");
  }

  if (
    listing.reserve_fee_status === "paid" &&
    (listing.stripe_reserve_fee_checkout_session_id === session.id ||
      (listing.status === "active" && listing.auction_status === "active"))
  ) {
    console.info("Reserve Commitment Fee webhook duplicate handled:", {
      stripeSessionId: session.id,
      listingId,
      listingStatus: listing.status,
      auctionStatus: listing.auction_status,
    });
    return;
  }

  const durationDays = normalizeAuctionDurationDays(listing.auction_duration_days);
  const startsAt = new Date();
  const endsAt = addDays(startsAt, durationDays);
  const feeAmount = calculateReserveFee(Number(listing.auction_reserve_price || reservePrice));

  const { error: updateError } = await supabase
    .from("listings")
    .update({
      status: "active",
      auction_status: "active",
      auction_starts_at: startsAt.toISOString(),
      auction_ends_at: endsAt,
      auction_current_bid: null,
      auction_bid_count: 0,
      auction_winner_id: null,
      auction_ended_at: null,
      auction_payment_due_at: null,
      reserve_fee_amount: feeAmount,
      reserve_fee_status: "paid",
      stripe_reserve_fee_checkout_session_id: session.id,
      stripe_reserve_fee_payment_intent_id: paymentIntentId,
      stripe_reserve_fee_charge_id: latestChargeId || null,
      reserve_fee_paid_at: startsAt.toISOString(),
    })
    .eq("id", listingId)
    .eq("seller_id", sellerId);

  if (updateError) {
    console.error("Reserve Commitment Fee webhook auction activation error:", {
      error: updateError,
      errorMessage: updateError.message,
      listingId,
      sellerId,
      stripeSessionId: session.id,
      paymentIntentId,
      latestChargeId,
    });
    throw updateError;
  }

  console.info("Reserve auction activated after Reserve Commitment Fee payment:", {
    stripeSessionId: session.id,
    listingId,
    sellerId,
    reserveFeeAmount: feeAmount,
    auctionStartsAt: startsAt.toISOString(),
    auctionEndsAt: endsAt,
  });

  await createSystemNotifications(supabase, [
    {
      userId: sellerId,
      title: "Auction is live",
      body: "Your reserve auction is live on GRAIL.",
      linkUrl: `/cards/${listingId}`,
    },
  ]);
}

async function handleCheckoutSessionCompleted(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  metadata: CheckoutMetadata,
) {
  const sessionType = metadata.type || "";
  const transactionType = getTransactionTypeFromStripeCheckoutType(sessionType);
  const isAuctionSale = transactionType === "auction";
  const isFixedPriceSale = transactionType === "buy_now";
  const isOfferSale = transactionType === "accepted_offer";
  const listingId = metadata.listingId || "";
  const sellerId = metadata.sellerId || "";
  const buyerId = metadata.buyerId || session.client_reference_id || null;
  const totalAmount = Number(session.amount_total || 0) / 100;
  const subtotalAmount = Number(session.amount_subtotal || 0) / 100;
  const { paymentIntentId, latestChargeId } = await resolveStripePaymentData(
    stripe,
    session,
  );

  if (sessionType === "auction_reserve_fee") {
    throw new Error("Reserve Commitment Fee sessions cannot enter sale handling.");
  }

  if (!transactionType || (!isAuctionSale && !isFixedPriceSale && !isOfferSale)) {
    throw new Error("Checkout session type is missing or unsupported for sale handling.");
  }

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
    .select(
      "id, seller_id, price, status, sale_format, auction_status, auction_current_bid, auction_winner_id, auction_duration_days, auction_reserve_met_at, reserve_fee_amount, reserve_fee_status, stripe_reserve_fee_payment_intent_id, stripe_reserve_fee_charge_id, stripe_reserve_fee_refund_id",
    )
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

  const listing = listingData as ListingRow;

  if (listing.sale_format === "auction" && !isAuctionSale) {
    console.error("Stripe webhook refused auction listing in normal sale branch:", {
      stripeSessionId: session.id,
      listingId,
      sellerId,
      sessionType: sessionType || null,
      listingStatus: listing.status,
      auctionStatus: listing.auction_status,
    });
    throw new Error("Auction listings require auction_sale checkout metadata.");
  }

  if (listing.sale_format !== "auction" && isAuctionSale) {
    throw new Error("Auction sale webhook metadata does not match an auction listing.");
  }

  if (isAuctionSale) {
    if (listing.auction_winner_id && buyerId && listing.auction_winner_id !== buyerId) {
      throw new Error("Auction sale buyer does not match the recorded winner.");
    }

    if (listing.auction_status !== "awaiting_payment" && listing.status !== "sold") {
      throw new Error("Auction sale is not awaiting winner payment.");
    }
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
      .update(
        isAuctionSale
          ? { status: "sold", auction_status: "paid" }
          : { status: "sold" },
      )
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

    if (isAuctionSale) {
      await refundReserveFeeIfNeeded(stripe, supabase, listingId);
    }

    return;
  }

  const listingPrice = Number(listing.price || 0);
  const auctionPrice = Number(listing.auction_current_bid || 0);
  const cardPrice = isAuctionSale && auctionPrice > 0
    ? auctionPrice
    : listingPrice > 0
      ? listingPrice
      : subtotalAmount || totalAmount;
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
    .update(
      isAuctionSale
        ? { status: "sold", auction_status: "paid" }
        : { status: "sold" },
    )
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
    transactionType,
    paymentIntentId,
    latestChargeId: latestChargeId || null,
    orderId: insertedOrder?.id,
  });

  await createSystemNotifications(supabase, [
    {
      userId: sellerId,
      title: isAuctionSale ? "Winner payment received" : "Your item sold",
      body: isAuctionSale
        ? "The winning bidder paid. Add tracking from your Seller Dashboard."
        : "Your card sold. Add tracking from your Seller Dashboard.",
      linkUrl: "/seller-dashboard",
    },
    {
      userId: buyerId,
      title: isAuctionSale ? "Auction payment confirmed" : "Order confirmed",
      body: isAuctionSale
        ? "Your winning auction payment was placed successfully."
        : "Your GRAIL order was placed successfully.",
      linkUrl: "/orders",
    },
  ]);

  if (isAuctionSale) {
    await refundReserveFeeIfNeeded(stripe, supabase, listingId);
  }
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
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = await resolveCheckoutMetadata(stripe, session);
    const sessionType = metadata.type || "";
    const transactionType = getTransactionTypeFromStripeCheckoutType(sessionType);

    console.info("Stripe checkout.session.completed received:", {
      stripeSessionId: session.id,
      metadataType: sessionType || null,
      transactionType,
    });

    if (sessionType === "auction_reserve_fee") {
      console.info("Stripe webhook selected Reserve Commitment Fee branch:", {
        stripeSessionId: session.id,
      });
      await handleAuctionReserveFeeCompleted(stripe, session, metadata);
      console.info("Stripe webhook skipped normal sale handling for Reserve Commitment Fee:", {
        stripeSessionId: session.id,
      });
      return NextResponse.json({ received: true });
    }

    if (transactionType) {
      console.info("Stripe webhook selected unified transaction sale branch:", {
        stripeSessionId: session.id,
        transactionType,
        sessionType,
      });
      await handleCheckoutSessionCompleted(stripe, session, metadata);
      return NextResponse.json({ received: true });
    }

    if (sessionType) {
      console.info("Stripe webhook ignored unsupported checkout session type:", {
        stripeSessionId: session.id,
        sessionType,
      });
      return NextResponse.json({ received: true });
    }

    console.info("Stripe webhook ignored checkout.session.completed with missing metadata type:", {
      stripeSessionId: session.id,
    });
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook handling error:", error);
    return NextResponse.json(
      { error: "Stripe webhook could not record the order." },
      { status: 500 },
    );
  }
}
