import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  mapShippoTrackingStatus,
  parseShippoMetadata,
  type ShippoWebhookPayload,
} from "../../../lib/shippo";
import { createSystemNotifications } from "../../../lib/serverNotifications";

export const runtime = "nodejs";

type OrderRow = {
  id: string;
  buyer_id: string | null;
  seller_id: string | null;
  carrier: string | null;
  tracking_number: string | null;
  fulfillment_status: string | null;
  shipping_status?: string | null;
  delivered_at?: string | null;
  inspection_ends_at?: string | null;
  dispute_status?: string | null;
  refund_status?: string | null;
  transfer_status?: string | null;
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
    { auth: { persistSession: false } },
  );
}

function getInspectionEnd(deliveredAt: Date) {
  return new Date(deliveredAt.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
}

async function findOrderForWebhook(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  payload: ShippoWebhookPayload,
) {
  const data = payload.data;
  const metadata = parseShippoMetadata(data?.metadata);

  if (metadata?.orderId) {
    const { data: order, error } = await supabase
      .from("orders")
      .select(
        "id, buyer_id, seller_id, carrier, tracking_number, fulfillment_status, shipping_status, delivered_at, inspection_ends_at, dispute_status, refund_status, transfer_status",
      )
      .eq("id", metadata.orderId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (order) {
      return order as OrderRow;
    }
  }

  if (data?.transaction) {
    const { data: order, error } = await supabase
      .from("orders")
      .select(
        "id, buyer_id, seller_id, carrier, tracking_number, fulfillment_status, shipping_status, delivered_at, inspection_ends_at, dispute_status, refund_status, transfer_status",
      )
      .eq("shippo_transaction_id", data.transaction)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (order) {
      return order as OrderRow;
    }
  }

  if (data?.tracking_number) {
    const { data: order, error } = await supabase
      .from("orders")
      .select(
        "id, buyer_id, seller_id, carrier, tracking_number, fulfillment_status, shipping_status, delivered_at, inspection_ends_at, dispute_status, refund_status, transfer_status",
      )
      .eq("tracking_number", data.tracking_number)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return order as OrderRow | null;
  }

  return null;
}

export async function POST(request: Request) {
  let payload: ShippoWebhookPayload;

  try {
    payload = (await request.json()) as ShippoWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid webhook body." }, { status: 400 });
  }

  if (payload.event && payload.event !== "track_updated") {
    return NextResponse.json({ received: true, ignored: payload.event });
  }

  const trackingStatus = payload.data?.tracking_status;
  const mappedStatus = mapShippoTrackingStatus(
    trackingStatus?.status || null,
    trackingStatus?.substatus?.code || null,
  );

  let supabase;

  try {
    supabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Shippo webhook configuration error:", error);
    return NextResponse.json({ error: "Webhook handling is not configured." }, { status: 500 });
  }

  try {
    const order = await findOrderForWebhook(supabase, payload);

    if (!order) {
      console.warn("Shippo webhook could not match an order.", {
        event: payload.event,
        carrier: payload.data?.carrier,
        trackingNumber: payload.data?.tracking_number,
        transaction: payload.data?.transaction,
      });
      return NextResponse.json({ received: true, matched: false });
    }

    const now = new Date();
    const deliveredAt =
      mappedStatus.shippingStatus === "delivered"
        ? trackingStatus?.datetime || now.toISOString()
        : null;
    const updateFields: Record<string, unknown> = {
      carrier: payload.data?.carrier || order.carrier,
      tracking_number: payload.data?.tracking_number || order.tracking_number,
      fulfillment_status: mappedStatus.fulfillmentStatus,
      shipping_status: mappedStatus.shippingStatus,
      shippo_tracking_status: trackingStatus?.status || null,
      shippo_tracking_status_details:
        trackingStatus?.status_details ||
        trackingStatus?.substatus?.text ||
        null,
      shippo_eta: payload.data?.eta || null,
      shipping_status_updated_at: now.toISOString(),
      transfer_status:
        order.transfer_status === "paid" || order.transfer_status === "refunded"
          ? order.transfer_status
          : "not_ready",
    };

    if (deliveredAt) {
      updateFields.delivered_at = order.delivered_at || deliveredAt;
      updateFields.inspection_ends_at =
        order.inspection_ends_at || getInspectionEnd(new Date(deliveredAt));
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update(updateFields)
      .eq("id", order.id);

    if (updateError) {
      console.error("Shippo webhook order update error:", {
        error: updateError,
        errorMessage: updateError.message,
        orderId: order.id,
      });
      return NextResponse.json({ error: "Order tracking update failed." }, { status: 500 });
    }

    if (order.shipping_status !== mappedStatus.shippingStatus) {
      if (mappedStatus.shippingStatus === "out_for_delivery") {
        await createSystemNotifications(supabase, [
          {
            userId: order.buyer_id,
            title: "Out for delivery",
            body: "Your GRAIL order is out for delivery.",
            linkUrl: "/orders",
            type: "order_out_for_delivery",
          },
        ]);
      } else if (mappedStatus.shippingStatus === "delivered") {
        await createSystemNotifications(supabase, [
          {
            userId: order.buyer_id,
            title: "Order delivered",
            body: "Your card was delivered. The inspection window is now open.",
            linkUrl: "/orders",
            type: "order_delivered",
          },
        ]);
      } else if (
        mappedStatus.shippingStatus === "delivery_exception" ||
        mappedStatus.shippingStatus === "returned"
      ) {
        await createSystemNotifications(supabase, [
          {
            userId: order.seller_id,
            title: "Delivery exception",
            body: "Shippo reported a delivery issue for this order. Review the tracking details.",
            linkUrl: "/seller-dashboard",
            type: "delivery_exception",
          },
        ]);
      }
    }

    return NextResponse.json({
      received: true,
      matched: true,
      orderId: order.id,
      shippingStatus: mappedStatus.shippingStatus,
    });
  } catch (error) {
    console.error("Shippo webhook handling error:", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Webhook could not be processed." }, { status: 500 });
  }
}
