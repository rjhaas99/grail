import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

type ReleaseRequestBody = {
  orderId?: string;
};

type OrderRow = {
  id: string;
  listing_id: string | null;
  seller_id: string | null;
  card_price: number | null;
  total_amount: number | null;
  buyer_fee: number | null;
  fulfillment_status: string | null;
  dispute_status: string | null;
  transfer_status: string | null;
  seller_payout_amount: number | null;
};

type SellerAccountRow = {
  stripe_account_id: string | null;
  payouts_enabled: boolean | null;
};

type StripeErrorLike = {
  message?: string;
  code?: string;
  type?: string;
  raw?: unknown;
  requestId?: string;
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

function getBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") || "";

  return authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function calculatePayout(order: OrderRow) {
  const cardPrice = Number(order.card_price || order.total_amount || 0);

  if (!order.card_price && order.total_amount) {
    console.warn("Payout release using total_amount because card_price is missing.", {
      orderId: order.id,
      totalAmount: order.total_amount,
    });
  }

  const platformFee = roundCurrency(cardPrice * 0.075);
  const processingFee = roundCurrency(Number(order.buyer_fee || 0));
  const sellerPayoutAmount = roundCurrency(cardPrice - platformFee - processingFee);

  return {
    cardPrice,
    platformFee,
    processingFee,
    sellerPayoutAmount,
  };
}

function getStripeErrorDetail(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }

  const stripeError = error as StripeErrorLike;

  return {
    message: stripeError.message,
    code: stripeError.code,
    type: stripeError.type,
    raw: stripeError.raw,
    requestId: stripeError.requestId,
  };
}

function errorResponse(error: string, detail: string, status: number) {
  return NextResponse.json({ error, detail }, { status });
}

export async function POST(request: Request) {
  let body: ReleaseRequestBody;

  try {
    body = (await request.json()) as ReleaseRequestBody;
  } catch (error) {
    console.error("Payout release JSON parse error:", error);
    return errorResponse(
      "Invalid payout release request.",
      "The payout release request body could not be parsed.",
      400,
    );
  }

  const orderId = body.orderId?.trim();

  if (!orderId) {
    return errorResponse("Order ID is required.", "No orderId was provided.", 400);
  }

  try {
    const supabase = createServiceSupabaseClient();
    const token = getBearerToken(request);

    if (!token) {
      return errorResponse(
        "Sign in to release payouts.",
        "Missing authenticated Supabase session token.",
        401,
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError) {
      console.error("Payout release auth error:", userError);
    }

    if (!user?.id) {
      return errorResponse(
        "Sign in to release payouts.",
        "Supabase could not resolve the current user.",
        401,
      );
    }

    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select(
        "id, listing_id, seller_id, card_price, total_amount, buyer_fee, fulfillment_status, dispute_status, transfer_status, seller_payout_amount",
      )
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      console.error("Payout release order fetch error:", {
        error: orderError,
        errorMessage: orderError.message,
        orderId,
      });
      throw orderError;
    }

    if (!orderData) {
      console.error("Payout release order not found:", { orderId, sellerId: user.id });
      return errorResponse(
        "Order was not found.",
        `No order found for ${orderId}.`,
        404,
      );
    }

    const order = orderData as OrderRow;

    if (order.seller_id !== user.id) {
      console.error("Payout release ownership mismatch:", {
        orderId: order.id,
        orderSellerId: order.seller_id,
        currentUserId: user.id,
      });
      return errorResponse(
        "Only the seller can release this payout.",
        "The signed-in user does not own this order.",
        403,
      );
    }

    if (order.fulfillment_status !== "delivered") {
      console.error("Payout release blocked by fulfillment status:", {
        orderId: order.id,
        fulfillmentStatus: order.fulfillment_status,
      });
      return errorResponse(
        "Payout is waiting for delivery confirmation.",
        `fulfillment_status is ${order.fulfillment_status || "missing"}, expected delivered.`,
        400,
      );
    }

    if (order.dispute_status !== "none") {
      console.error("Payout release blocked by dispute status:", {
        orderId: order.id,
        disputeStatus: order.dispute_status,
      });
      return errorResponse(
        "Payout is blocked while a dispute is open.",
        `dispute_status is ${order.dispute_status || "missing"}, expected none.`,
        400,
      );
    }

    if (order.transfer_status !== "ready") {
      console.error("Payout release blocked by transfer status:", {
        orderId: order.id,
        transferStatus: order.transfer_status,
      });
      return errorResponse(
        "Payout is not ready for release yet.",
        `transfer_status is ${order.transfer_status || "missing"}, expected ready.`,
        400,
      );
    }

    const calculated = calculatePayout(order);
    const sellerPayoutAmount = Number(order.seller_payout_amount || calculated.sellerPayoutAmount);

    if (!Number.isFinite(sellerPayoutAmount) || sellerPayoutAmount <= 0) {
      console.error("Payout release invalid seller payout amount:", {
        orderId: order.id,
        sellerPayoutAmount,
        storedSellerPayoutAmount: order.seller_payout_amount,
        calculatedSellerPayoutAmount: calculated.sellerPayoutAmount,
      });
      return errorResponse(
        "Seller payout amount must be greater than zero.",
        `seller_payout_amount is ${sellerPayoutAmount || "missing/invalid"}.`,
        400,
      );
    }

    const { data: sellerAccountData, error: sellerAccountError } = await supabase
      .from("seller_accounts")
      .select("stripe_account_id, payouts_enabled")
      .eq("user_id", user.id)
      .maybeSingle();

    if (sellerAccountError) {
      console.error("Payout release seller account fetch error:", {
        error: sellerAccountError,
        errorMessage: sellerAccountError.message,
        sellerId: user.id,
      });
      throw sellerAccountError;
    }

    const sellerAccount = sellerAccountData as SellerAccountRow | null;

    if (!sellerAccount?.stripe_account_id) {
      console.error("Payout release missing seller account:", {
        sellerId: user.id,
        hasSellerAccountRow: Boolean(sellerAccount),
        stripeAccountId: sellerAccount?.stripe_account_id,
      });
      return errorResponse(
        "Seller payout account is not connected.",
        sellerAccount
          ? "seller_accounts row exists but stripe_account_id is missing."
          : "No seller_accounts row exists for this seller.",
        400,
      );
    }

    if (!sellerAccount.payouts_enabled) {
      console.error("Payout release seller payouts disabled:", {
        sellerId: user.id,
        stripeAccountId: sellerAccount.stripe_account_id,
        payoutsEnabled: sellerAccount.payouts_enabled,
      });
      return errorResponse(
        "Seller payout setup is incomplete.",
        "seller_accounts.payouts_enabled is false.",
        400,
      );
    }

    const stripe = new Stripe(getRequiredEnv("STRIPE_SECRET_KEY"));

    try {
      const transferAmount = Math.round(sellerPayoutAmount * 100);
      const transfer = await stripe.transfers.create({
        amount: transferAmount,
        currency: "usd",
        destination: sellerAccount.stripe_account_id,
        metadata: {
          orderId: order.id,
          listingId: order.listing_id || "",
          source: "grail",
        },
      });

      const { error: updateError } = await supabase
        .from("orders")
        .update({
          seller_payout_amount: sellerPayoutAmount,
          platform_fee: calculated.platformFee,
          processing_fee: calculated.processingFee,
          transfer_status: "paid",
          stripe_transfer_id: transfer.id,
          payout_released_at: new Date().toISOString(),
        })
        .eq("id", order.id)
        .eq("seller_id", user.id);

      if (updateError) {
        console.error("Payout release order update error:", {
          error: updateError,
          errorMessage: updateError.message,
          orderId: order.id,
          transferId: transfer.id,
        });
        throw updateError;
      }

      return NextResponse.json({
        success: true,
        transferId: transfer.id,
        sellerPayoutAmount,
      });
    } catch (error) {
      const stripeDetail = getStripeErrorDetail(error);
      const transferAmount = Math.round(sellerPayoutAmount * 100);

      console.error("Stripe transfer creation error:", {
        errorMessage: stripeDetail?.message || (error instanceof Error ? error.message : undefined),
        errorCode: stripeDetail?.code,
        errorType: stripeDetail?.type,
        errorRaw: stripeDetail?.raw,
        requestId: stripeDetail?.requestId,
        destinationAccountId: sellerAccount.stripe_account_id,
        transferAmount,
        sellerPayoutAmount,
        orderId: order.id,
      });

      return errorResponse(
        "Seller payout transfer could not be created.",
        stripeDetail?.message ||
          (error instanceof Error ? error.message : "Stripe transfer failed."),
        500,
      );
    }
  } catch (error) {
    console.error("Payout release error:", error);
    return NextResponse.json(
      { error: "Payout could not be released." },
      { status: 500 },
    );
  }
}
