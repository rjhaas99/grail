import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getShippingProfile } from "../../../lib/shippingProfiles";
import { createSystemNotifications } from "../../../lib/serverNotifications";

export const runtime = "nodejs";

type MarkMailedPayload = {
  orderId?: string;
};

type OrderRow = {
  id: string;
  buyer_id: string | null;
  seller_id: string | null;
  status: string | null;
  fulfillment_status: string | null;
  transfer_status: string | null;
  refund_status: string | null;
  label_url?: string | null;
  tracking_number?: string | null;
  shipping_profile_id?: string | null;
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
    { auth: { persistSession: false } },
  );
}

function createServiceSupabaseClient() {
  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
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
    console.error("Mark mailed auth error:", error);
  }

  return { user, error: error?.message || null };
}

export async function POST(request: Request) {
  const { user, error: authError } = await getCurrentUser(request);

  if (authError || !user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let payload: MarkMailedPayload;

  try {
    payload = (await request.json()) as MarkMailedPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const orderId = payload.orderId?.trim();

  if (!orderId) {
    return NextResponse.json({ error: "orderId is required." }, { status: 400 });
  }

  let supabase;

  try {
    supabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Mark mailed configuration error:", error);
    return NextResponse.json(
      { error: "Shipping updates are temporarily unavailable." },
      { status: 500 },
    );
  }

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, buyer_id, seller_id, status, fulfillment_status, transfer_status, refund_status, label_url, tracking_number, shipping_profile_id",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    console.error("Mark mailed order fetch error:", {
      orderId,
      error: error.message,
    });
    return NextResponse.json({ error: "Order could not be loaded." }, { status: 500 });
  }

  const order = data as OrderRow | null;

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  if (order.seller_id !== user.id) {
    return NextResponse.json({ error: "Seller access denied." }, { status: 403 });
  }

  if ((order.status || "").toLowerCase() !== "paid") {
    return NextResponse.json({ error: "Only paid orders can be marked mailed." }, { status: 400 });
  }

  if (order.refund_status === "refunded" || order.transfer_status === "refunded") {
    return NextResponse.json({ error: "Refunded orders cannot be mailed." }, { status: 400 });
  }

  if (order.label_url || order.tracking_number) {
    return NextResponse.json(
      { error: "This order already has label or tracking information." },
      { status: 400 },
    );
  }

  const shippingProfile = getShippingProfile(order.shipping_profile_id);

  if (shippingProfile.capabilities.labelGenerationSupported) {
    return NextResponse.json(
      { error: "This shipping method requires purchasing a shipping label." },
      { status: 400 },
    );
  }

  if (order.fulfillment_status && order.fulfillment_status !== "pending") {
    return NextResponse.json({ error: "This order has already shipped." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data: updatedOrder, error: updateError } = await supabase
    .from("orders")
    .update({
      carrier: shippingProfile.carrier,
      shipping_service: shippingProfile.label,
      shipping_profile_label: shippingProfile.label,
      shipping_tracking_supported: shippingProfile.capabilities.trackingSupported,
      shipping_label_required: shippingProfile.capabilities.labelGenerationSupported,
      fulfillment_status: "shipped",
      shipping_status: "mailed",
      shipping_status_updated_at: now,
      shipped_at: now,
      transfer_status: "not_ready",
    })
    .eq("id", order.id)
    .eq("seller_id", user.id)
    .select(
      "id, carrier, shipping_service, shipping_profile_label, tracking_number, label_url, label_cost, shipping_status, fulfillment_status, seller_payout_amount",
    )
    .maybeSingle();

  if (updateError) {
    console.error("Mark mailed order update error:", {
      orderId,
      error: updateError.message,
    });
    return NextResponse.json({ error: "Order could not be marked mailed." }, { status: 500 });
  }

  await createSystemNotifications(supabase, [
    {
      userId: order.seller_id,
      title: "Envelope marked mailed",
      body: "Plain White Envelope shipment marked mailed.",
      linkUrl: "/seller-dashboard",
      type: "order_shipped",
    },
    {
      userId: order.buyer_id,
      title: "Your order was mailed",
      body: "This order is shipping by Plain White Envelope and does not include tracking.",
      linkUrl: "/orders",
      type: "order_shipped",
    },
  ]);

  return NextResponse.json({
    order: updatedOrder,
    shipping: {
      carrier: shippingProfile.carrier,
      service: shippingProfile.label,
      shippingStatus: "mailed",
      trackingNumber: "",
      labelUrl: null,
      labelCost: 0,
    },
  });
}
