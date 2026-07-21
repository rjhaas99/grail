import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  buildShippoMetadata,
  cleanShippoAddress,
  cleanShippoParcel,
  createShippoShipment,
  ensureShippoTrackingWebhook,
  getShippoRateAmount,
  getShippoServiceLabel,
  getShippoWebhookUrl,
  mapShippoTrackingStatus,
  purchaseShippoLabel,
  selectShippoRateByService,
  type ShippoAddress,
  type ShippoParcel,
} from "../../../lib/shippo";
import { getShippingProfile } from "../../../lib/shippingProfiles";
import { createSystemNotifications } from "../../../lib/serverNotifications";

export const runtime = "nodejs";

type ShippingLabelPayload = {
  orderId?: string;
  from?: Partial<ShippoAddress>;
  to?: Partial<ShippoAddress>;
  parcel?: Partial<ShippoParcel>;
};

type OrderRow = {
  id: string;
  listing_id: string | null;
  buyer_id: string | null;
  seller_id: string | null;
  status: string | null;
  fulfillment_status: string | null;
  transfer_status: string | null;
  refund_status: string | null;
  dispute_status: string | null;
  carrier: string | null;
  tracking_number: string | null;
  seller_payout_amount: number | string | null;
  card_price: number | string | null;
  platform_fee: number | string | null;
  processing_fee: number | string | null;
  label_url?: string | null;
  label_cost?: number | string | null;
  shippo_transaction_id?: string | null;
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
    console.error("Shippo label auth error:", error);
  }

  return { user, error: error?.message || null };
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value || 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function validateAddress(address: ShippoAddress, label: string) {
  const requiredFields: Array<keyof ShippoAddress> = [
    "name",
    "street1",
    "city",
    "state",
    "zip",
    "country",
  ];
  const missing = requiredFields.find((field) => !address[field]);

  if (missing) {
    throw new Error(`${label} ${missing} is required.`);
  }
}

function validateParcel(parcel: ShippoParcel) {
  (["length", "width", "height", "weight"] as const).forEach((field) => {
    const value = Number(parcel[field]);

    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`Package ${field} must be greater than zero.`);
    }
  });
}

export async function POST(request: Request) {
  let serviceSupabase;

  try {
    serviceSupabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Shippo label configuration error:", error);
    return NextResponse.json(
      { error: "Shipping labels are temporarily unavailable." },
      { status: 500 },
    );
  }

  const { user, error: authError } = await getCurrentUser(request);

  if (authError || !user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let payload: ShippingLabelPayload;

  try {
    payload = (await request.json()) as ShippingLabelPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const orderId = payload.orderId?.trim();

  if (!orderId) {
    return NextResponse.json({ error: "orderId is required." }, { status: 400 });
  }

  const addressFrom = cleanShippoAddress(payload.from || {});
  const addressTo = cleanShippoAddress(payload.to || {});
  const parcel = cleanShippoParcel(payload.parcel || {});

  try {
    validateAddress(addressFrom, "Sender");
    validateAddress(addressTo, "Recipient");
    validateParcel(parcel);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Shipping address is invalid." },
      { status: 400 },
    );
  }

  const { data, error } = await serviceSupabase
    .from("orders")
    .select(
      "id, listing_id, buyer_id, seller_id, status, fulfillment_status, transfer_status, refund_status, dispute_status, carrier, tracking_number, seller_payout_amount, card_price, platform_fee, processing_fee, label_url, label_cost, shippo_transaction_id, shipping_profile_id",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    console.error("Shippo label order fetch error:", {
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

  if (order.seller_id !== user.id) {
    return NextResponse.json({ error: "Seller access denied." }, { status: 403 });
  }

  if ((order.status || "").toLowerCase() !== "paid") {
    return NextResponse.json({ error: "Only paid orders are eligible for labels." }, { status: 400 });
  }

  if (order.refund_status === "refunded" || order.transfer_status === "refunded") {
    return NextResponse.json({ error: "Refunded orders are not eligible for labels." }, { status: 400 });
  }

  if (order.transfer_status === "paid") {
    return NextResponse.json({ error: "Completed payouts cannot be adjusted for labels." }, { status: 400 });
  }

  if (order.shippo_transaction_id || order.label_url) {
    return NextResponse.json({ error: "A shipping label already exists for this order." }, { status: 400 });
  }

  const shippingProfile = getShippingProfile(order.shipping_profile_id);

  if (!shippingProfile.capabilities.labelGenerationSupported) {
    return NextResponse.json(
      { error: "This order uses Plain White Envelope. Mark it mailed instead." },
      { status: 400 },
    );
  }

  if (!shippingProfile.shippoServiceToken) {
    return NextResponse.json(
      { error: "This shipping method is not configured for label purchase." },
      { status: 400 },
    );
  }

  const metadata = buildShippoMetadata(order.id);

  try {
    const webhookUrl = getShippoWebhookUrl(request);
    const webhook = await ensureShippoTrackingWebhook(webhookUrl).catch((webhookError) => {
      console.warn("Shippo tracking webhook registration skipped:", {
        orderId: order.id,
        error: webhookError,
        message: webhookError instanceof Error ? webhookError.message : "Unknown error",
      });

      return null;
    });
    const shipment = await createShippoShipment({
      addressFrom,
      addressTo,
      parcel,
      metadata,
    });
    const selectedRate = selectShippoRateByService(
      shipment.rates,
      shippingProfile.shippoServiceToken,
    );
    const transaction = await purchaseShippoLabel({
      rateObjectId: selectedRate.object_id,
      metadata,
    });
    const carrier = transaction.rate?.provider || selectedRate.provider || "USPS";
    const service = getShippoServiceLabel(transaction.rate || selectedRate);
    const labelCost = roundCurrency(
      getShippoRateAmount(transaction.rate) || getShippoRateAmount(selectedRate),
    );
    const trackingNumber = transaction.tracking_number || "";
    const trackingStatus = mapShippoTrackingStatus(
      transaction.tracking_status || "PRE_TRANSIT",
      null,
    );
    const now = new Date().toISOString();
    const sellerPayoutBeforeLabel = roundCurrency(toNumber(order.seller_payout_amount));
    const sellerPayoutAfterLabel = roundCurrency(
      Math.max(sellerPayoutBeforeLabel - labelCost, 0),
    );

    const { data: updatedOrder, error: updateError } = await serviceSupabase
      .from("orders")
      .update({
        carrier,
        shipping_service: service,
        shipping_profile_label: shippingProfile.label,
        tracking_number: trackingNumber,
        label_url: transaction.label_url,
        label_cost: labelCost,
        fulfillment_status: trackingStatus.fulfillmentStatus,
        shipping_status: trackingStatus.shippingStatus,
        shippo_shipment_id: shipment.object_id,
        shippo_rate_id: selectedRate.object_id,
        shippo_transaction_id: transaction.object_id,
        shippo_tracking_status: transaction.tracking_status || "PRE_TRANSIT",
        shippo_tracking_status_details: null,
        shippo_tracking_url: transaction.tracking_url_provider,
        shippo_eta: transaction.eta || null,
        shippo_label_purchased_at: now,
        shippo_webhook_id: webhook?.object_id || null,
        shippo_webhook_registered_at: webhook?.object_id ? now : null,
        shipping_from_address: addressFrom,
        shipping_to_address: addressTo,
        shipping_parcel: parcel,
        shipping_status_updated_at: now,
        shipped_at: now,
        transfer_status: "not_ready",
        seller_payout_amount: sellerPayoutAfterLabel,
      })
      .eq("id", order.id)
      .eq("seller_id", user.id)
      .select(
        "id, carrier, shipping_service, shipping_profile_label, tracking_number, label_url, label_cost, shipping_status, fulfillment_status, shippo_tracking_url, shippo_eta, seller_payout_amount",
      )
      .maybeSingle();

    if (updateError) {
      console.error("Shippo label order update error:", {
        error: updateError,
        errorMessage: updateError.message,
        orderId: order.id,
      });
      return NextResponse.json({ error: "Shipping label could not be saved." }, { status: 500 });
    }

    await createSystemNotifications(serviceSupabase, [
      {
        userId: order.seller_id,
        title: "Shipping label purchased",
        body: `USPS ${service} label created. ${trackingNumber} is ready to print.`,
        linkUrl: "/seller-dashboard",
        type: "shipping_label_purchased",
      },
      {
        userId: order.buyer_id,
        title: "Your order shipped",
        body: `Tracking is live with ${carrier}: ${trackingNumber}.`,
        linkUrl: "/orders",
        type: "order_shipped",
      },
    ]);

    return NextResponse.json({
      order: updatedOrder,
      shipping: {
        carrier,
        service,
        shippingProfile: shippingProfile.label,
        trackingNumber,
        labelUrl: transaction.label_url,
        labelCost,
        shippingStatus: trackingStatus.shippingStatus,
        estimatedDelivery: transaction.eta || null,
      },
      payout: {
        salePrice: roundCurrency(toNumber(order.card_price)),
        sellerFee: roundCurrency(toNumber(order.platform_fee)),
        paymentProcessing: roundCurrency(toNumber(order.processing_fee)),
        shippingLabel: labelCost,
        netPayout: sellerPayoutAfterLabel,
      },
    });
  } catch (error) {
    console.error("Shippo label purchase error:", {
      error,
      message: error instanceof Error ? error.message : "Unknown Shippo error",
      orderId,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Shipping label could not be purchased." },
      { status: 502 },
    );
  }
}
