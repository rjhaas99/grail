import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createSystemNotifications } from "../../../../lib/serverNotifications";

export const runtime = "nodejs";

const adminEmails = ["ryanjhaas99@gmail.com"];

type DisputeMessagePayload = {
  orderId?: string;
  recipientType?: "buyer" | "seller" | "both";
  message?: string;
};

type OrderRow = {
  id: string;
  listing_id: string | null;
  buyer_id: string | null;
  seller_id: string | null;
  dispute_status: string | null;
};

type ListingRow = {
  id: string;
  title: string | null;
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

async function getCurrentUser(request: Request) {
  const token = getBearerToken(request);

  if (!token) {
    return { user: null, error: "Missing authorization token." };
  }

  const supabase = createServiceSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error) {
    console.error("Admin dispute message auth error:", error);
  }

  return { user, error: error?.message || null };
}

export async function POST(request: Request) {
  let supabase;

  try {
    supabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Admin dispute message configuration error:", error);
    return NextResponse.json(
      { error: "Admin dispute messaging is not configured." },
      { status: 500 },
    );
  }

  const { user, error: authError } = await getCurrentUser(request);
  const email = user?.email?.toLowerCase() || "";

  if (authError || !user || !adminEmails.includes(email)) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  let payload: DisputeMessagePayload;

  try {
    payload = (await request.json()) as DisputeMessagePayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const orderId = payload.orderId?.trim();
  const recipientType = payload.recipientType || "both";
  const message = payload.message?.trim();

  if (!orderId || !message) {
    return NextResponse.json(
      { error: "Order id and message are required." },
      { status: 400 },
    );
  }

  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select("id, listing_id, buyer_id, seller_id, dispute_status")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    console.error("Admin dispute message order fetch error:", {
      error: orderError,
      errorMessage: orderError.message,
      orderId,
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
      { error: "Only active disputes can receive admin messages." },
      { status: 400 },
    );
  }

  let cardTitle = "GRAIL Card";

  if (order.listing_id) {
    const { data: listingData, error: listingError } = await supabase
      .from("listings")
      .select("id, title")
      .eq("id", order.listing_id)
      .maybeSingle();

    if (listingError) {
      console.error("Admin dispute message listing fetch error:", {
        error: listingError,
        errorMessage: listingError.message,
        listingId: order.listing_id,
      });
    } else {
      const listing = listingData as ListingRow | null;
      cardTitle = listing?.title || cardTitle;
    }
  }

  const recipientCandidates = [
    recipientType === "buyer" || recipientType === "both"
      ? { id: order.buyer_id, label: "Buyer" }
      : null,
    recipientType === "seller" || recipientType === "both"
      ? { id: order.seller_id, label: "Seller" }
      : null,
  ].filter((recipient): recipient is { id: string; label: string } =>
    Boolean(recipient?.id),
  );
  const recipientsById = new Map<string, { id: string; labels: string[] }>();

  recipientCandidates.forEach((recipient) => {
    const existing = recipientsById.get(recipient.id);

    if (existing) {
      existing.labels.push(recipient.label);
    } else {
      recipientsById.set(recipient.id, { id: recipient.id, labels: [recipient.label] });
    }
  });

  const uniqueRecipients = Array.from(recipientsById.values());
  const insertedRecipients = uniqueRecipients.filter(
    (recipient) => recipient.id !== user.id,
  );
  const skippedSelfRecipients = uniqueRecipients.filter(
    (recipient) => recipient.id === user.id,
  );

  if (uniqueRecipients.length === 0 || !order.listing_id) {
    return NextResponse.json(
      { error: "No valid message recipient or listing found for this dispute." },
      { status: 400 },
    );
  }

  if (insertedRecipients.length === 0) {
    console.info("Admin dispute message skipped self recipients only:", {
      orderId,
      recipientType,
      senderId: user.id,
      skippedSelfRecipients,
    });

    return NextResponse.json({
      sent: true,
      count: 0,
      recipients: [],
      skippedSelfRecipients: skippedSelfRecipients.map((recipient) =>
        recipient.labels.join("/"),
      ),
    });
  }

  const cardLink = `/cards/${order.listing_id}`;
  const body = `GRAIL dispute review for ${cardTitle}: ${message} Card: ${cardLink}. Please reply here with more information or upload evidence on your order/dispute page.`;
  const rows = insertedRecipients.map((recipient) => ({
    sender_id: user.id,
    receiver_id: recipient.id,
    listing_id: order.listing_id,
    body,
  }));

  const { error: insertError } = await supabase.from("messages").insert(rows);

  if (insertError) {
    console.error("Admin dispute message insert error:", {
      error: insertError,
      errorMessage: insertError.message,
      orderId,
      recipientType,
      recipientCount: insertedRecipients.length,
      insertedRecipients,
      skippedSelfRecipients,
    });
    return NextResponse.json(
      { error: "Dispute message could not be sent." },
      { status: 500 },
    );
  }

  console.info("Admin dispute message inserted:", {
    orderId,
    recipientType,
    senderId: user.id,
    insertedRecipients,
    skippedSelfRecipients,
  });

  await createSystemNotifications(
    supabase,
    insertedRecipients.map((recipient) => {
      const isSeller = recipient.labels.includes("Seller");

      return {
        userId: recipient.id,
        title: "GRAIL needs more information",
        body: "GRAIL requested more information for your dispute.",
        linkUrl: isSeller ? "/seller-dashboard" : "/orders",
      };
    }),
  );

  return NextResponse.json({
    sent: true,
    count: rows.length,
    recipients: insertedRecipients.map((recipient) => recipient.labels.join("/")),
    skippedSelfRecipients: skippedSelfRecipients.map((recipient) =>
      recipient.labels.join("/"),
    ),
  });
}
