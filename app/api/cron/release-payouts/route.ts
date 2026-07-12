import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSystemNotifications } from "../../../lib/serverNotifications";
import { awardCompletedOrderProgression } from "../../../lib/serverProgression";

export const runtime = "nodejs";

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
};

type SellerAccountRow = {
  stripe_account_id: string | null;
  payouts_enabled: boolean | null;
};

type ReleaseResult = {
  orderId: string;
  status: "paid" | "skipped" | "failed";
  detail?: string;
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

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function calculatePayout(order: OrderRow) {
  const cardPrice = Number(order.card_price || order.total_amount || 0);
  const platformFee = roundCurrency(cardPrice * 0.075);
  const processingFee = roundCurrency(Number(order.buyer_fee || 0));

  if (!order.card_price && order.total_amount) {
    console.warn("Cron payout using total_amount because card_price is missing.", {
      orderId: order.id,
      totalAmount: order.total_amount,
    });
  }

  return Math.max(roundCurrency(cardPrice - platformFee - processingFee), 0);
}

function getBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") || "";

  return authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
}

function isAuthorizedCronRequest(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return false;
  }

  const requestUrl = new URL(request.url);
  return (
    getBearerToken(request) === cronSecret ||
    requestUrl.searchParams.get("secret") === cronSecret
  );
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

async function releaseEligiblePayouts(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized cron request." }, { status: 401 });
  }

  let supabase;
  let stripe;

  try {
    supabase = createServiceSupabaseClient();
    stripe = new Stripe(getRequiredEnv("STRIPE_SECRET_KEY"));
  } catch (error) {
    console.error("Cron payout configuration error:", error);
    return NextResponse.json(
      { error: "Automatic payout release is not configured." },
      { status: 500 },
    );
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, listing_id, buyer_id, seller_id, card_price, total_amount, buyer_fee, seller_payout_amount, fulfillment_status, tracking_number, inspection_ends_at, dispute_status, transfer_status, refund_status",
    )
    .in("transfer_status", ["not_ready", "ready"])
    .is("stripe_transfer_id", null)
    .not("tracking_number", "is", null)
    .neq("tracking_number", "")
    .eq("fulfillment_status", "delivered")
    .lte("inspection_ends_at", now)
    .or("dispute_status.is.null,dispute_status.in.(none,resolved)")
    .or("refund_status.is.null,refund_status.eq.none")
    .order("created_at", { ascending: true })
    .limit(25);

  if (error) {
    console.error("Cron payout eligible order fetch error:", {
      error,
      errorMessage: error.message,
    });
    return NextResponse.json(
      { error: "Eligible payout orders could not be loaded." },
      { status: 500 },
    );
  }

  const orders = (data || []) as OrderRow[];
  const results: ReleaseResult[] = [];

  for (const order of orders) {
    if (!order.seller_id) {
      results.push({ orderId: order.id, status: "skipped", detail: "Missing seller_id." });
      continue;
    }

    const sellerPayoutAmount = Number(
      order.seller_payout_amount || calculatePayout(order),
    );

    if (!Number.isFinite(sellerPayoutAmount) || sellerPayoutAmount <= 0) {
      results.push({
        orderId: order.id,
        status: "skipped",
        detail: "Seller payout amount is missing or invalid.",
      });
      continue;
    }

    const { data: sellerAccountData, error: sellerAccountError } = await supabase
      .from("seller_accounts")
      .select("stripe_account_id, payouts_enabled")
      .eq("user_id", order.seller_id)
      .maybeSingle();

    if (sellerAccountError) {
      console.error("Cron payout seller account fetch error:", {
        error: sellerAccountError,
        errorMessage: sellerAccountError.message,
        sellerId: order.seller_id,
        orderId: order.id,
      });
      results.push({
        orderId: order.id,
        status: "failed",
        detail: sellerAccountError.message,
      });
      continue;
    }

    const sellerAccount = sellerAccountData as SellerAccountRow | null;

    if (!sellerAccount?.stripe_account_id || !sellerAccount.payouts_enabled) {
      results.push({
        orderId: order.id,
        status: "skipped",
        detail: "Seller payout account is not ready.",
      });
      continue;
    }

    try {
      const transfer = await stripe.transfers.create({
        amount: Math.round(sellerPayoutAmount * 100),
        currency: "usd",
        destination: sellerAccount.stripe_account_id,
        metadata: {
          orderId: order.id,
          listingId: order.listing_id || "",
          sellerId: order.seller_id,
          source: "grail",
        },
      });
      const completedAt = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          seller_payout_amount: sellerPayoutAmount,
          transfer_status: "paid",
          stripe_transfer_id: transfer.id,
          payout_released_at: completedAt,
          completed_at: completedAt,
          auto_release_attempted_at: completedAt,
          auto_release_error: null,
        })
        .eq("id", order.id)
        .is("stripe_transfer_id", null);

      if (updateError) {
        console.error("Cron payout order update error:", {
          error: updateError,
          errorMessage: updateError.message,
          orderId: order.id,
          transferId: transfer.id,
        });
        results.push({ orderId: order.id, status: "failed", detail: updateError.message });
        continue;
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
        console.info("Cron payout progression processed:", {
          orderId: order.id,
          awarded: progressionResult.awarded.map((event) => ({
            source: event.source,
            userId: event.userId,
            alreadyAwarded: event.alreadyAwarded,
          })),
          skipped: progressionResult.skipped,
          isAuctionSale: progressionResult.isAuctionSale,
        });
      } catch (progressionError) {
        console.warn("Cron payout progression skipped:", {
          orderId: order.id,
          error:
            progressionError instanceof Error
              ? progressionError.message
              : progressionError,
        });
      }

      results.push({ orderId: order.id, status: "paid", detail: transfer.id });
    } catch (error) {
      const stripeDetail = getStripeErrorDetail(error);
      const detail =
        stripeDetail?.message ||
        (error instanceof Error ? error.message : "Stripe transfer failed.");
      const attemptedAt = new Date().toISOString();

      console.error("Cron payout Stripe transfer error:", {
        errorMessage: detail,
        errorCode: stripeDetail?.code,
        errorType: stripeDetail?.type,
        errorRaw: stripeDetail?.raw,
        requestId: stripeDetail?.requestId,
        orderId: order.id,
        sellerId: order.seller_id,
        sellerPayoutAmount,
        destinationAccountId: sellerAccount.stripe_account_id,
      });

      await supabase
        .from("orders")
        .update({
          auto_release_attempted_at: attemptedAt,
          auto_release_error: detail,
        })
        .eq("id", order.id);
      results.push({ orderId: order.id, status: "failed", detail });
    }
  }

  return NextResponse.json({
    checked: orders.length,
    results,
  });
}

export async function GET(request: Request) {
  return releaseEligiblePayouts(request);
}

export async function POST(request: Request) {
  return releaseEligiblePayouts(request);
}
