import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

type OrderInsert = {
  listing_id: string;
  seller_id: string;
  buyer_id: string | null;
  stripe_session_id: string;
  total_amount: number;
  card_price: number;
  buyer_fee: number;
  status: "paid";
};

type ListingRow = {
  id: string;
  seller_id: string | null;
  price: number | null;
  status: string | null;
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

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const listingId = session.metadata?.listingId || "";
  const sellerId = session.metadata?.sellerId || "";
  const buyerId = session.metadata?.buyerId || session.client_reference_id || null;
  const totalAmount = Number(session.amount_total || 0) / 100;
  const subtotalAmount = Number(session.amount_subtotal || 0) / 100;

  if (!listingId || !sellerId) {
    throw new Error("Stripe session is missing listingId or sellerId metadata.");
  }

  if (!totalAmount || totalAmount <= 0) {
    throw new Error("Stripe session is missing a valid amount_total.");
  }

  const supabase = createServiceSupabaseClient();

  const { data: existingOrder, error: existingOrderError } = await supabase
    .from("orders")
    .select("id")
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

    return;
  }

  const listing = listingData as ListingRow;
  const listingPrice = Number(listing.price || 0);
  const cardPrice = listingPrice > 0 ? listingPrice : subtotalAmount || totalAmount;
  const buyerFee = Math.max(totalAmount - cardPrice, 0);
  const orderPayload: OrderInsert = {
    listing_id: listingId,
    seller_id: sellerId,
    buyer_id: buyerId || null,
    stripe_session_id: session.id,
    total_amount: totalAmount,
    card_price: cardPrice,
    buyer_fee: buyerFee,
    status: "paid",
  };
  const { error: insertError } = await supabase
    .from("orders")
    .insert(orderPayload);

  if (insertError) {
    console.error("Stripe webhook order insert error:", {
      error: insertError,
      errorMessage: insertError.message,
      orderPayload,
      stripeSessionId: session.id,
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
