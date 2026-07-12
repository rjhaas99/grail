import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSystemNotifications } from "../../../../lib/serverNotifications";
import { releaseSellerPayoutForOrder } from "../../../../lib/releaseSellerPayout";

export const runtime = "nodejs";

const adminEmails = ["ryanjhaas99@gmail.com"];

type AdminDisputeAction =
  | "save_admin_note"
  | "mark_under_review"
  | "request_more_info"
  | "resolve_release_seller"
  | "resolve_refund_buyer"
  | "resolve_keep_blocked";

type UpdatePayload = {
  orderId?: string;
  action?: AdminDisputeAction;
  adminNote?: string;
};

type OrderRow = {
  id: string;
  listing_id: string | null;
  buyer_id: string | null;
  seller_id: string | null;
  dispute_status: string | null;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  stripe_refund_id: string | null;
  refund_status: string | null;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function createAnonSupabaseClient() {
  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      auth: {
        persistSession: false,
      },
    },
  );
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

async function getCurrentUser(request: Request) {
  const token = getBearerToken(request);

  if (!token) {
    return { user: null, error: "Missing authorization token." };
  }

  const supabase = createAnonSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error) {
    console.error("Admin dispute update auth error:", error);
  }

  return { user, error: error?.message || null };
}

async function createBuyerRefund(order: OrderRow, adminNote: string) {
  if (!order.stripe_payment_intent_id && !order.stripe_charge_id) {
    throw new Error("This order is missing Stripe payment data for refund.");
  }

  const stripe = new Stripe(getRequiredEnv("STRIPE_SECRET_KEY"));

  return stripe.refunds.create({
    ...(order.stripe_payment_intent_id
      ? { payment_intent: order.stripe_payment_intent_id }
      : { charge: order.stripe_charge_id || undefined }),
    metadata: {
      orderId: order.id,
      listingId: order.listing_id || "",
      reason: "buyer_dispute_won",
      adminNote,
    },
  });
}

export async function POST(request: Request) {
  let serviceSupabase;

  try {
    serviceSupabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Admin dispute update configuration error:", error);
    return NextResponse.json(
      { error: "Admin dispute updates are not configured." },
      { status: 500 },
    );
  }

  const { user, error: authError } = await getCurrentUser(request);
  const email = user?.email?.toLowerCase() || "";

  if (authError || !user || !adminEmails.includes(email)) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  let payload: UpdatePayload;

  try {
    payload = (await request.json()) as UpdatePayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const orderId = payload.orderId?.trim();
  const action = payload.action;
  const adminNote = payload.adminNote?.trim() || "";

  if (!orderId || !action) {
    return NextResponse.json(
      { error: "Order id and action are required." },
      { status: 400 },
    );
  }

  const { data: orderData, error: orderError } = await serviceSupabase
    .from("orders")
    .select(
      "id, listing_id, buyer_id, seller_id, dispute_status, stripe_payment_intent_id, stripe_charge_id, stripe_refund_id, refund_status",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    console.error("Admin dispute update order fetch error:", {
      error: orderError,
      errorMessage: orderError.message,
      orderId,
      action,
    });
    return NextResponse.json(
      { error: "Dispute order could not be loaded." },
      { status: 500 },
    );
  }

  const order = orderData as OrderRow | null;

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  if (!["opened", "under_review"].includes(order.dispute_status || "")) {
    return NextResponse.json(
      { error: "Only active disputes can be updated." },
      { status: 400 },
    );
  }

  const fields: Record<string, string | null> = {};

  if (action === "save_admin_note") {
    fields.admin_dispute_notes = adminNote;
  } else if (action === "mark_under_review") {
    fields.dispute_status = "under_review";
    fields.transfer_status = "blocked";

    if (adminNote) {
      fields.admin_dispute_notes = adminNote;
    }
  } else if (action === "request_more_info") {
    fields.dispute_status = "under_review";
    fields.transfer_status = "blocked";
    fields.admin_dispute_notes =
      adminNote ||
      "Need more photos, unboxing video, packaging photos, card/slab closeups, tracking proof, or other evidence for GRAIL review.";
  } else if (action === "resolve_release_seller") {
    if (!adminNote) {
      return NextResponse.json(
        { error: "Add an admin decision note before resolving." },
        { status: 400 },
      );
    }

    fields.dispute_status = "resolved";
    fields.transfer_status = "ready";
    fields.admin_dispute_notes = adminNote;
  } else if (action === "resolve_refund_buyer") {
    if (!adminNote) {
      return NextResponse.json(
        { error: "Add an admin decision note before resolving." },
        { status: 400 },
      );
    }

    fields.dispute_status = "resolved";
    fields.transfer_status = "refunded";
    fields.refund_status = "refunded";
    fields.admin_dispute_notes = adminNote;

    if (order.refund_status === "refunded" || order.stripe_refund_id) {
      fields.stripe_refund_id = order.stripe_refund_id;
    } else {
      try {
        const refund = await createBuyerRefund(order, adminNote);

        fields.stripe_refund_id = refund.id;
        fields.refund_reason = adminNote;
        fields.refunded_at = new Date().toISOString();
      } catch (error) {
        const stripeError = error as {
          message?: string;
          code?: string;
          type?: string;
          raw?: unknown;
          requestId?: string;
        };

        console.error("Admin dispute Stripe refund error:", {
          errorMessage: stripeError.message,
          errorCode: stripeError.code,
          errorType: stripeError.type,
          errorRaw: stripeError.raw,
          requestId: stripeError.requestId,
          orderId: order.id,
          paymentIntentId: order.stripe_payment_intent_id,
          chargeId: order.stripe_charge_id,
        });
        return NextResponse.json(
          { error: stripeError.message || "Buyer refund could not be created." },
          { status: 500 },
        );
      }
    }
  } else if (action === "resolve_keep_blocked") {
    if (!adminNote) {
      return NextResponse.json(
        { error: "Add an admin decision note before resolving." },
        { status: 400 },
      );
    }

    fields.dispute_status = "resolved";
    fields.transfer_status = "blocked";
    fields.admin_dispute_notes = adminNote;
  } else {
    return NextResponse.json({ error: "Unsupported dispute action." }, { status: 400 });
  }

  const { data: updatedOrder, error: updateError } = await serviceSupabase
    .from("orders")
    .update(fields)
    .eq("id", orderId)
    .select(
      "id, dispute_status, transfer_status, admin_dispute_notes, refund_status, stripe_refund_id",
    )
    .single();

  if (updateError) {
    console.error("Admin dispute update error:", {
      error: updateError,
      errorMessage: updateError.message,
      orderId,
      action,
      fields,
    });
    return NextResponse.json(
      { error: `Dispute update failed: ${updateError.message}` },
      { status: 500 },
    );
  }

  if (action === "resolve_refund_buyer") {
    await createSystemNotifications(serviceSupabase, [
      {
        userId: order.buyer_id,
        title: "Refund issued",
        body: "GRAIL resolved your dispute and refunded the original payment.",
        linkUrl: "/orders",
      },
      {
        userId: order.seller_id,
        title: "Dispute resolved",
        body: "GRAIL resolved the dispute. Seller payout is not being released for this order.",
        linkUrl: "/seller-dashboard",
      },
    ]);
  } else if (action === "resolve_release_seller") {
    await createSystemNotifications(serviceSupabase, [
      {
        userId: order.seller_id,
        title: "Payout queued",
        body: "GRAIL resolved the dispute and marked the payout ready for automatic release.",
        linkUrl: "/seller-dashboard",
      },
      {
        userId: order.buyer_id,
        title: "Dispute resolved",
        body: "GRAIL resolved the dispute review for your order.",
        linkUrl: "/orders",
      },
    ]);
  }

  let payoutResult = null;

  if (action === "resolve_release_seller") {
    payoutResult = await releaseSellerPayoutForOrder({
      supabase: serviceSupabase,
      orderId: order.id,
      source: "admin_dispute",
    });

    console.info("Admin dispute release seller payout attempt:", {
      orderId: order.id,
      payoutStatus: payoutResult.status,
      detail: payoutResult.detail,
    });
  }

  return NextResponse.json({ order: updatedOrder, payout: payoutResult });
}
