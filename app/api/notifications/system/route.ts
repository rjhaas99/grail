import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createSystemNotification } from "../../../lib/serverNotifications";

export const runtime = "nodejs";

type NotificationKind =
  | "listing_live"
  | "order_tracking_added"
  | "order_shipped"
  | "order_delivered"
  | "dispute_opened";

type NotificationPayload = {
  kind?: NotificationKind;
  orderId?: string;
  listingId?: string;
};

type OrderRow = {
  id: string;
  listing_id: string | null;
  buyer_id: string | null;
  seller_id: string | null;
};

type ListingRow = {
  id: string;
  seller_id: string | null;
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
    console.error("System notification auth error:", error);
  }

  return { user, error: error?.message || null };
}

export async function POST(request: Request) {
  let serviceSupabase;

  try {
    serviceSupabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("System notification configuration error:", error);
    return NextResponse.json(
      { error: "System notifications are not configured." },
      { status: 500 },
    );
  }

  const { user, error: authError } = await getCurrentUser(request);

  if (authError || !user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let payload: NotificationPayload;

  try {
    payload = (await request.json()) as NotificationPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!payload.kind) {
    return NextResponse.json({ error: "Notification kind is required." }, { status: 400 });
  }

  if (payload.kind === "listing_live") {
    const listingId = payload.listingId?.trim();

    if (!listingId) {
      return NextResponse.json({ error: "listingId is required." }, { status: 400 });
    }

    const { data, error } = await serviceSupabase
      .from("listings")
      .select("id, seller_id")
      .eq("id", listingId)
      .maybeSingle();

    if (error) {
      console.error("Listing notification fetch error:", error);
      return NextResponse.json({ error: "Listing could not be loaded." }, { status: 500 });
    }

    const listing = data as ListingRow | null;

    if (!listing || listing.seller_id !== user.id) {
      return NextResponse.json({ error: "Listing access denied." }, { status: 403 });
    }

    await createSystemNotification(serviceSupabase, {
      userId: user.id,
      title: "Listing is live",
      body: "Your card is now listed on GRAIL.",
      linkUrl: `/cards/${listing.id}`,
      type: "listing_live",
    });

    return NextResponse.json({ sent: true });
  }

  const orderId = payload.orderId?.trim();

  if (!orderId) {
    return NextResponse.json({ error: "orderId is required." }, { status: 400 });
  }

  const { data, error } = await serviceSupabase
    .from("orders")
    .select("id, listing_id, buyer_id, seller_id")
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    console.error("Order notification fetch error:", error);
    return NextResponse.json({ error: "Order could not be loaded." }, { status: 500 });
  }

  const order = data as OrderRow | null;

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  if (
    ["order_tracking_added", "order_shipped", "order_delivered"].includes(payload.kind) &&
    order.seller_id !== user.id
  ) {
    return NextResponse.json({ error: "Seller access denied." }, { status: 403 });
  }

  if (payload.kind === "dispute_opened" && order.buyer_id !== user.id) {
    return NextResponse.json({ error: "Buyer access denied." }, { status: 403 });
  }

  if (payload.kind === "order_tracking_added") {
    await createSystemNotification(serviceSupabase, {
      userId: order.buyer_id,
      title: "Tracking added",
      body: "Tracking has been added for your card.",
      linkUrl: "/orders",
      type: "order_tracking_added",
    });
  } else if (payload.kind === "order_shipped") {
    await createSystemNotification(serviceSupabase, {
      userId: order.buyer_id,
      title: "Your order shipped",
      body: "The seller marked your card as shipped.",
      linkUrl: "/orders",
      type: "order_shipped",
    });
  } else if (payload.kind === "order_delivered") {
    await createSystemNotification(serviceSupabase, {
      userId: order.buyer_id,
      title: "Inspection period started",
      body: "Your card was marked delivered. You have 3 days to inspect it or open a dispute.",
      linkUrl: "/orders",
      type: "order_delivered",
    });
  } else if (payload.kind === "dispute_opened") {
    await createSystemNotification(serviceSupabase, {
      userId: order.seller_id,
      title: "Dispute opened",
      body: "A dispute was opened for this order. Please upload evidence or respond if requested.",
      linkUrl: "/seller-dashboard",
      type: "dispute_opened",
    });
  }

  return NextResponse.json({ sent: true });
}
