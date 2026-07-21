import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const supportTopics = [
  "Order issue",
  "Payment or refund",
  "Seller payout",
  "Listing problem",
  "Dispute help",
  "Account issue",
  "Report a bug",
  "General question",
  "Other",
] as const;

type SupportTopic = (typeof supportTopics)[number];

type SupportPayload = {
  name?: string;
  email?: string;
  topic?: string;
  orderId?: string;
  listingId?: string;
  message?: string;
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

function isSupportTopic(value: string): value is SupportTopic {
  return supportTopics.includes(value as SupportTopic);
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function getCurrentUser(request: Request) {
  const token = getBearerToken(request);

  if (!token) {
    return { user: null, error: null };
  }

  const supabase = createAnonSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error) {
    console.error("Support ticket auth error:", {
      error,
      errorMessage: error.message,
    });
  }

  return { user, error: error?.message || null };
}

export async function POST(request: Request) {
  let serviceSupabase;

  try {
    serviceSupabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Support ticket configuration error:", error);
    return NextResponse.json(
      { error: "Support is temporarily unavailable." },
      { status: 500 },
    );
  }

  let payload: SupportPayload;

  try {
    payload = (await request.json()) as SupportPayload;
  } catch {
    return NextResponse.json({ error: "Invalid support request." }, { status: 400 });
  }

  const { user } = await getCurrentUser(request);
  const name = payload.name?.trim() || "";
  const email = payload.email?.trim().toLowerCase() || user?.email?.toLowerCase() || "";
  const topic = payload.topic?.trim() || "";
  const message = payload.message?.trim() || "";
  const orderId = payload.orderId?.trim() || "";
  const listingId = payload.listingId?.trim() || "";

  if (!topic || !isSupportTopic(topic)) {
    return NextResponse.json({ error: "Choose a valid support topic." }, { status: 400 });
  }

  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  if (!user && !name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  if (!email || !isEmail(email)) {
    return NextResponse.json(
      { error: "A valid email is required." },
      { status: 400 },
    );
  }

  if (orderId && !isUuid(orderId)) {
    return NextResponse.json(
      { error: "Order ID must be a valid UUID." },
      { status: 400 },
    );
  }

  if (listingId && !isUuid(listingId)) {
    return NextResponse.json(
      { error: "Listing ID must be a valid UUID." },
      { status: 400 },
    );
  }

  const { data, error } = await serviceSupabase
    .from("support_tickets")
    .insert({
      user_id: user?.id || null,
      name: name || user?.email || "GRAIL User",
      email,
      topic,
      order_id: orderId || null,
      listing_id: listingId || null,
      message,
      status: "open",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Support ticket insert error:", {
      error,
      errorMessage: error.message,
      userId: user?.id || null,
      topic,
      orderId: orderId || null,
      listingId: listingId || null,
    });
    return NextResponse.json(
      { error: "Support request could not be submitted." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ticketId: (data as { id: string }).id,
    message: "Support request submitted.",
  });
}
