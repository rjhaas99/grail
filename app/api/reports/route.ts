import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const reportReasons = [
  "Counterfeit / authenticity concern",
  "Wrong photos",
  "Wrong card details",
  "Wrong grade or condition",
  "Suspicious seller",
  "Scam or unsafe listing",
  "Other",
] as const;

type ReportReason = (typeof reportReasons)[number];

type ReportPayload = {
  listingId?: string;
  reason?: string;
  details?: string;
};

type ListingRow = {
  id: string;
  seller_id: string | null;
  title: string | null;
  status: string | null;
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

function isReportReason(value: string): value is ReportReason {
  return reportReasons.includes(value as ReportReason);
}

async function getReporterId(request: Request) {
  const token = getBearerToken(request);

  if (!token) {
    return null;
  }

  const supabase = createAnonSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error) {
    console.error("Listing report reporter auth error:", {
      error,
      errorMessage: error.message,
    });
    return null;
  }

  return user?.id || null;
}

export async function POST(request: Request) {
  let serviceSupabase;

  try {
    serviceSupabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Listing report configuration error:", error);
    return NextResponse.json(
      { error: "Reports are temporarily unavailable." },
      { status: 500 },
    );
  }

  let payload: ReportPayload;

  try {
    payload = (await request.json()) as ReportPayload;
  } catch {
    return NextResponse.json({ error: "Invalid report request." }, { status: 400 });
  }

  const listingId = payload.listingId?.trim();
  const reason = payload.reason?.trim() || "";
  const details = payload.details?.trim() || null;

  if (!listingId) {
    return NextResponse.json({ error: "Listing id is required." }, { status: 400 });
  }

  if (!reason || !isReportReason(reason)) {
    return NextResponse.json({ error: "Choose a valid report reason." }, { status: 400 });
  }

  const { data: listingData, error: listingError } = await serviceSupabase
    .from("listings")
    .select("id, seller_id, title, status")
    .eq("id", listingId)
    .maybeSingle();

  if (listingError) {
    console.error("Listing report listing fetch error:", {
      error: listingError,
      errorMessage: listingError.message,
      listingId,
    });
    return NextResponse.json(
      { error: "Listing could not be verified." },
      { status: 500 },
    );
  }

  const listing = listingData as ListingRow | null;

  if (!listing) {
    return NextResponse.json({ error: "Listing was not found." }, { status: 404 });
  }

  const listingStatus = listing.status?.toLowerCase() || "";

  if (listingStatus === "deleted" || listingStatus === "inactive") {
    return NextResponse.json(
      { error: "This listing is not available to report." },
      { status: 400 },
    );
  }

  const reporterId = await getReporterId(request);

  const { data: reportData, error: reportError } = await serviceSupabase
    .from("listing_reports")
    .insert({
      listing_id: listing.id,
      reporter_id: reporterId,
      seller_id: listing.seller_id,
      reason,
      details,
      status: "open",
    })
    .select("id")
    .single();

  if (reportError) {
    console.error("Listing report insert error:", {
      error: reportError,
      errorMessage: reportError.message,
      listingId,
      reporterId,
      sellerId: listing.seller_id,
      reason,
    });
    return NextResponse.json(
      { error: "Report could not be submitted." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    reportId: (reportData as { id: string }).id,
    message: "Report submitted.",
  });
}
