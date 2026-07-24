import { NextResponse } from "next/server";
import {
  createServiceSupabaseClient,
  getCurrentUser,
} from "../../auctions/_shared";
import { getWatchCountsByListingId } from "../../../lib/watchCounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ListingRow = {
  id: string;
  created_at: string | null;
};

type ListingReferenceRow = {
  listing_id: string | null;
};

type OrderMetricRow = {
  listing_id: string | null;
  transfer_status: string | null;
  completed_at: string | null;
};

function countByListingId(rows: ListingReferenceRow[]) {
  const counts = new Map<string, number>();

  rows.forEach((row) => {
    if (!row.listing_id) {
      return;
    }

    counts.set(row.listing_id, (counts.get(row.listing_id) || 0) + 1);
  });

  return counts;
}

function getTimeListed(createdAt?: string | null) {
  if (!createdAt) {
    return null;
  }

  return Math.max(
    0,
    Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000),
  );
}

export async function GET(request: Request) {
  const { user, error: authError } = await getCurrentUser(request);

  if (authError || !user?.id) {
    return NextResponse.json(
      { error: "Sign in to view listing analytics." },
      { status: 401 },
    );
  }

  let supabase;

  try {
    supabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Listing analytics configuration error:", error);
    return NextResponse.json(
      { error: "Listing analytics are temporarily unavailable." },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const requestedListingIds = (url.searchParams.get("listingIds") || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 100);

  let listingQuery = supabase
    .from("listings")
    .select("id, created_at")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (requestedListingIds.length > 0) {
    listingQuery = listingQuery.in("id", requestedListingIds);
  }

  const { data: listingData, error: listingError } = await listingQuery;

  if (listingError) {
    console.error("Listing analytics ownership lookup error:", {
      error: listingError,
      errorMessage: listingError.message,
      userId: user.id,
    });
    return NextResponse.json(
      { error: "Listing analytics could not be loaded." },
      { status: 500 },
    );
  }

  const ownedListings = (listingData || []) as ListingRow[];
  const listingIds = ownedListings.map((listing) => listing.id);

  if (listingIds.length === 0) {
    return NextResponse.json({ analytics: [] });
  }

  const [watchCountResult, offerResult, messageResult, orderResult] = await Promise.all([
    getWatchCountsByListingId(supabase, listingIds).catch((error) => {
      console.warn("Listing analytics watch count unavailable:", error);
      return new Map<string, number>();
    }),
    supabase.from("offers").select("listing_id").in("listing_id", listingIds),
    supabase.from("messages").select("listing_id").in("listing_id", listingIds),
    supabase
      .from("orders")
      .select("listing_id, transfer_status, completed_at")
      .in("listing_id", listingIds),
  ]);

  if (offerResult.error) {
    console.warn("Listing analytics offer count unavailable:", offerResult.error);
  }

  if (messageResult.error) {
    console.warn("Listing analytics message count unavailable:", messageResult.error);
  }

  if (orderResult.error) {
    console.warn("Listing analytics order metrics unavailable:", orderResult.error);
  }

  const watchCounts = watchCountResult;
  const offerCounts = countByListingId((offerResult.data || []) as ListingReferenceRow[]);
  const messageCounts = countByListingId((messageResult.data || []) as ListingReferenceRow[]);
  const orderRows = (orderResult.data || []) as OrderMetricRow[];
  const checkoutStarts = countByListingId(orderRows);
  const completedSales = new Map<string, number>();

  orderRows.forEach((order) => {
    if (!order.listing_id) {
      return;
    }

    if (order.transfer_status === "paid" && order.completed_at) {
      completedSales.set(
        order.listing_id,
        (completedSales.get(order.listing_id) || 0) + 1,
      );
    }
  });

  return NextResponse.json({
    analytics: ownedListings.map((listing) => ({
      listingId: listing.id,
      totalViews: null,
      watchCount: watchCounts.get(listing.id) || 0,
      offerCount: offerCounts.get(listing.id) || 0,
      messageActivity: messageCounts.get(listing.id) || 0,
      checkoutStarts: checkoutStarts.get(listing.id) || 0,
      completedSales: completedSales.get(listing.id) || 0,
      timeListedDays: getTimeListed(listing.created_at),
    })),
  });
}
