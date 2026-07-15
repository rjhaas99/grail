import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createSystemNotification } from "../../../lib/serverNotifications";
import { releaseSellerPayoutForOrder } from "../../../lib/releaseSellerPayout";

export const runtime = "nodejs";

type ApproveInspectionPayload = {
  orderId?: string;
};

type OrderRow = {
  id: string;
  listing_id: string | null;
  buyer_id: string | null;
  seller_id: string | null;
  fulfillment_status: string | null;
  dispute_status: string | null;
  transfer_status: string | null;
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
    console.error("Approve inspection auth error:", error);
  }

  return { user, error: error?.message || null };
}

export async function POST(request: Request) {
  let serviceSupabase;

  try {
    serviceSupabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Approve inspection configuration error:", error);
    return NextResponse.json(
      { error: "Inspection approval is not configured." },
      { status: 500 },
    );
  }

  const { user, error: authError } = await getCurrentUser(request);

  if (authError || !user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let payload: ApproveInspectionPayload;

  try {
    payload = (await request.json()) as ApproveInspectionPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const orderId = payload.orderId?.trim();

  if (!orderId) {
    return NextResponse.json({ error: "orderId is required." }, { status: 400 });
  }

  const { data, error } = await serviceSupabase
    .from("orders")
    .select(
      "id, listing_id, buyer_id, seller_id, fulfillment_status, dispute_status, transfer_status, refund_status",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    console.error("Approve inspection order fetch error:", {
      error,
      errorMessage: error.message,
      orderId,
    });
    return NextResponse.json({ error: "Order could not be loaded." }, { status: 500 });
  }

  const order = data as OrderRow | null;

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  if (order.buyer_id !== user.id) {
    return NextResponse.json({ error: "Only the buyer can approve this order." }, { status: 403 });
  }

  if (order.fulfillment_status !== "delivered") {
    return NextResponse.json({ error: "Order must be delivered before inspection approval." }, { status: 400 });
  }

  if (!["none", "resolved", null].includes(order.dispute_status)) {
    return NextResponse.json({ error: "Order cannot be approved while a dispute is active." }, { status: 400 });
  }

  if (["paid", "refunded"].includes(order.transfer_status || "")) {
    return NextResponse.json({ error: "This order is already complete." }, { status: 400 });
  }

  if (order.refund_status === "refunded") {
    return NextResponse.json({ error: "This order has been refunded." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { error: updateError } = await serviceSupabase
    .from("orders")
    .update({
      inspection_completed_at: now,
      inspection_ends_at: now,
      transfer_status: "ready",
    })
    .eq("id", order.id)
    .eq("buyer_id", user.id);

  if (updateError) {
    console.error("Approve inspection update error:", {
      error: updateError,
      errorMessage: updateError.message,
      orderId: order.id,
    });
    return NextResponse.json(
      { error: "Inspection approval could not be saved." },
      { status: 500 },
    );
  }

  await createSystemNotification(serviceSupabase, {
    userId: order.seller_id,
    title: "Card passed inspection",
    body: "The buyer approved the order. Payment will be sent automatically.",
    linkUrl: "/seller-dashboard",
    type: "inspection_complete",
  });

  const payoutResult = await releaseSellerPayoutForOrder({
    supabase: serviceSupabase,
    orderId: order.id,
    source: "buyer_approval",
  });

  if (payoutResult.status === "queued") {
    console.info("Inspection approved; seller payout queued for retry:", {
      orderId: order.id,
      detail: payoutResult.detail,
    });
  }

  if (payoutResult.status !== "paid" && payoutResult.status !== "already_paid") {
    await createSystemNotification(serviceSupabase, {
      userId: order.buyer_id,
      title: "Inspection complete",
      body: "Your inspection approval was recorded. The seller payout is queued.",
      linkUrl: "/orders",
      type: "inspection_complete",
    });
  }

  return NextResponse.json({
    order: {
      id: order.id,
      inspection_completed_at: now,
      inspection_ends_at: now,
      transfer_status:
        payoutResult.status === "paid" || payoutResult.status === "already_paid"
          ? "paid"
          : "ready",
      completed_at:
        payoutResult.status === "paid" || payoutResult.status === "already_paid"
          ? new Date().toISOString()
          : null,
    },
    payout: {
      status:
        payoutResult.status === "paid" || payoutResult.status === "already_paid"
          ? "paid"
          : payoutResult.status === "queued"
            ? "queued"
            : "not_ready",
    },
  });
}
