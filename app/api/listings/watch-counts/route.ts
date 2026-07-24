import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "../../auctions/_shared";
import {
  getWatchCountsByListingId,
  watchCountsToRecord,
} from "../../../lib/watchCounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WatchCountsPayload = {
  listingIds?: unknown;
};

function normalizeListingIds(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((listingId) => String(listingId || "").trim())
      .filter(Boolean)
      .slice(0, 1000);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((listingId) => listingId.trim())
      .filter(Boolean)
      .slice(0, 1000);
  }

  return [];
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const listingIds = normalizeListingIds(url.searchParams.get("listingIds"));

  return getWatchCountsResponse(listingIds);
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as WatchCountsPayload | null;
  const listingIds = normalizeListingIds(payload?.listingIds);

  return getWatchCountsResponse(listingIds);
}

async function getWatchCountsResponse(listingIds: string[]) {
  if (listingIds.length === 0) {
    return NextResponse.json({ counts: {} });
  }

  try {
    const supabase = createServiceSupabaseClient();
    const counts = await getWatchCountsByListingId(supabase, listingIds);

    return NextResponse.json({
      counts: watchCountsToRecord(counts),
    });
  } catch (error) {
    console.error("Listing watch counts fetch error:", {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      listingCount: listingIds.length,
    });

    return NextResponse.json(
      { error: "Watch counts could not be loaded.", counts: {} },
      { status: 500 },
    );
  }
}
