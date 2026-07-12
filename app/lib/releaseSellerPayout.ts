import type { SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { createSystemNotifications } from "./serverNotifications";
import { awardCompletedOrderProgression } from "./serverProgression";

type OrderRow = {
  id: string;
  listing_id: string | null;
  buyer_id: string | null;
  seller_id: string | null;
  card_price: number | null;
  total_amount: number | null;
  buyer_fee: number | null;
  seller_payout_amount: number | null;
  fulfillment_status: string | null;
  tracking_number: string | null;
  inspection_ends_at: string | null;
  dispute_status: string | null;
  transfer_status: string | null;
  refund_status: string | null;
  stripe_transfer_id: string | null;
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

export type ReleaseSellerPayoutResult = {
  orderId: string;
  status: "paid" | "already_paid" | "queued" | "skipped" | "failed";
  detail?: string;
  transferId?: string;
  sellerPayoutAmount?: number;
};

type ReleaseSellerPayoutParams = {
  supabase: SupabaseClient;
  orderId: string;
  expectedSellerId?: string;
  source?: "cron" | "buyer_approval" | "admin_dispute" | "manual";
};

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function calculatePayout(order: OrderRow) {
  const cardPrice = Number(order.card_price || order.total_amount || 0);
  const platformFee = roundCurrency(cardPrice * 0.075);
  const processingFee = roundCurrency(Number(order.buyer_fee || 0));

  if (!order.card_price && order.total_amount) {
    console.warn("Seller payout using total_amount because card_price is missing.", {
      orderId: order.id,
      totalAmount: order.total_amount,
    });
  }

  return {
    platformFee,
    processingFee,
    sellerPayoutAmount: Math.max(roundCurrency(cardPrice - platformFee - processingFee), 0),
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

async function savePayoutAttemptError(
  supabase: SupabaseClient,
  orderId: string,
  detail: string,
) {
  const attemptedAt = new Date().toISOString();
  await supabase
    .from("orders")
    .update({
      auto_release_attempted_at: attemptedAt,
      auto_release_error: detail,
    })
    .eq("id", orderId);
}

export async function releaseSellerPayoutForOrder({
  supabase,
  orderId,
  expectedSellerId,
  source = "cron",
}: ReleaseSellerPayoutParams): Promise<ReleaseSellerPayoutResult> {
  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, listing_id, buyer_id, seller_id, card_price, total_amount, buyer_fee, seller_payout_amount, fulfillment_status, tracking_number, inspection_ends_at, dispute_status, transfer_status, refund_status, stripe_transfer_id",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    console.error("Seller payout order fetch error:", {
      error: orderError,
      errorMessage: orderError.message,
      orderId,
      source,
    });
    return { orderId, status: "failed", detail: orderError.message };
  }

  const order = orderData as OrderRow | null;

  if (!order) {
    return { orderId, status: "skipped", detail: "Order not found." };
  }

  if (expectedSellerId && order.seller_id !== expectedSellerId) {
    return {
      orderId,
      status: "skipped",
      detail: "Signed-in seller does not own this order.",
    };
  }

  if (order.transfer_status === "paid" || order.stripe_transfer_id) {
    return {
      orderId,
      status: "already_paid",
      detail: "Seller payout already completed.",
      transferId: order.stripe_transfer_id || undefined,
      sellerPayoutAmount: Number(order.seller_payout_amount || 0),
    };
  }

  if (!order.seller_id) {
    return { orderId, status: "skipped", detail: "Missing seller_id." };
  }

  if (order.fulfillment_status !== "delivered") {
    return {
      orderId,
      status: "skipped",
      detail: "Waiting for delivery.",
    };
  }

  if (!order.tracking_number?.trim()) {
    return {
      orderId,
      status: "skipped",
      detail: "Tracking number is required before payout.",
    };
  }

  if (!order.inspection_ends_at || new Date(order.inspection_ends_at).getTime() > Date.now()) {
    return {
      orderId,
      status: "skipped",
      detail: "Inspection window is still active.",
    };
  }

  if (["opened", "under_review"].includes(order.dispute_status || "")) {
    return {
      orderId,
      status: "skipped",
      detail: "Payout blocked by active dispute.",
    };
  }

  if (order.refund_status === "refunded" || order.transfer_status === "refunded") {
    return {
      orderId,
      status: "skipped",
      detail: "Payout blocked because order was refunded.",
    };
  }

  const calculated = calculatePayout(order);
  const sellerPayoutAmount = Number(
    order.seller_payout_amount || calculated.sellerPayoutAmount,
  );

  if (!Number.isFinite(sellerPayoutAmount) || sellerPayoutAmount <= 0) {
    return {
      orderId,
      status: "skipped",
      detail: "Seller payout amount is missing or invalid.",
    };
  }

  const { data: sellerAccountData, error: sellerAccountError } = await supabase
    .from("seller_accounts")
    .select("stripe_account_id, payouts_enabled")
    .eq("user_id", order.seller_id)
    .maybeSingle();

  if (sellerAccountError) {
    console.error("Seller payout account fetch error:", {
      error: sellerAccountError,
      errorMessage: sellerAccountError.message,
      sellerId: order.seller_id,
      orderId,
      source,
    });
    return { orderId, status: "failed", detail: sellerAccountError.message };
  }

  const sellerAccount = sellerAccountData as SellerAccountRow | null;

  if (!sellerAccount?.stripe_account_id || !sellerAccount.payouts_enabled) {
    return {
      orderId,
      status: "queued",
      detail: "Seller payout account is not ready.",
      sellerPayoutAmount,
    };
  }

  const stripe = new Stripe(getRequiredEnv("STRIPE_SECRET_KEY"));
  const transferAmount = Math.round(sellerPayoutAmount * 100);
  const stripeIdempotencyKey = `grail-payout-order-${order.id}`;

  try {
    const transfer = await stripe.transfers.create(
      {
        amount: transferAmount,
        currency: "usd",
        destination: sellerAccount.stripe_account_id,
        metadata: {
          orderId: order.id,
          listingId: order.listing_id || "",
          sellerId: order.seller_id,
          source: "grail",
        },
      },
      {
        idempotencyKey: stripeIdempotencyKey,
      },
    );
    const completedAt = new Date().toISOString();
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({
        seller_payout_amount: sellerPayoutAmount,
        platform_fee: calculated.platformFee,
        processing_fee: calculated.processingFee,
        transfer_status: "paid",
        stripe_transfer_id: transfer.id,
        payout_released_at: completedAt,
        completed_at: completedAt,
        auto_release_attempted_at: completedAt,
        auto_release_error: null,
      })
      .eq("id", order.id)
      .is("stripe_transfer_id", null)
      .select("id")
      .maybeSingle();

    if (updateError) {
      console.error("Seller payout order update error:", {
        error: updateError,
        errorMessage: updateError.message,
        orderId: order.id,
        transferId: transfer.id,
        source,
      });
      return { orderId, status: "failed", detail: updateError.message };
    }

    if (!updatedOrder) {
      return {
        orderId,
        status: "already_paid",
        detail: "Order payout was already updated.",
        transferId: transfer.id,
        sellerPayoutAmount,
      };
    }

    await createSystemNotifications(supabase, [
      {
        userId: order.seller_id,
        title: "Payout sent",
        body: "Payment has been sent. Card passed inspection.",
        linkUrl: "/seller-dashboard",
      },
      {
        userId: order.buyer_id,
        title: "Order complete",
        body: "Your order is complete.",
        linkUrl: "/orders",
      },
    ]);

    try {
      const progressionResult = await awardCompletedOrderProgression(
        supabase,
        order.id,
      );
      console.info("Seller payout progression processed:", {
        orderId: order.id,
        source,
        awarded: progressionResult.awarded.map((event) => ({
          source: event.source,
          userId: event.userId,
          alreadyAwarded: event.alreadyAwarded,
        })),
        skipped: progressionResult.skipped,
        isAuctionSale: progressionResult.isAuctionSale,
      });
    } catch (progressionError) {
      console.warn("Seller payout progression skipped:", {
        orderId: order.id,
        source,
        error:
          progressionError instanceof Error
            ? progressionError.message
            : progressionError,
      });
    }

    return {
      orderId,
      status: "paid",
      detail: transfer.id,
      transferId: transfer.id,
      sellerPayoutAmount,
    };
  } catch (error) {
    const stripeDetail = getStripeErrorDetail(error);
    const detail =
      stripeDetail?.message ||
      (error instanceof Error ? error.message : "Stripe transfer failed.");

    console.error("Seller payout Stripe transfer error:", {
      errorMessage: detail,
      errorCode: stripeDetail?.code,
      errorType: stripeDetail?.type,
      errorRaw: stripeDetail?.raw,
      requestId: stripeDetail?.requestId,
      orderId: order.id,
      sellerId: order.seller_id,
      sellerPayoutAmount,
      destinationAccountId: sellerAccount.stripe_account_id,
      stripeIdempotencyKey,
      source,
    });

    await savePayoutAttemptError(supabase, order.id, detail);

    return {
      orderId,
      status: "queued",
      detail,
      sellerPayoutAmount,
    };
  }
}
