import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { releaseSellerPayoutForOrder } from "../../../lib/releaseSellerPayout";

export const runtime = "nodejs";

type OrderRow = {
  id: string;
};

type ReleaseResult = {
  orderId: string;
  status: "paid" | "already_paid" | "queued" | "skipped" | "failed";
  detail?: string;
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

async function releaseEligiblePayouts(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized cron request." }, { status: 401 });
  }

  let supabase;

  try {
    supabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Cron payout configuration error:", error);
    return NextResponse.json(
      { error: "Automatic payout release is temporarily unavailable." },
      { status: 500 },
    );
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("orders")
    .select("id")
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
    const result = await releaseSellerPayoutForOrder({
      supabase,
      orderId: order.id,
      source: "cron",
    });

    results.push({
      orderId: result.orderId,
      status: result.status,
      detail: result.detail || result.transferId,
    });
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
