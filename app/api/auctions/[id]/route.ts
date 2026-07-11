import { NextResponse } from "next/server";
import {
  createServiceSupabaseClient,
  getAuctionReserveStatus,
  getMinimumNextBid,
  type AuctionListingRow,
} from "../_shared";

export const runtime = "nodejs";

type BidRow = {
  id: string;
  amount: number | null;
  bidder_id: string | null;
  created_at: string | null;
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

function anonymizeBidder(bidderId?: string | null) {
  return bidderId ? `Bidder ${bidderId.slice(0, 4)}` : "Bidder";
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const listingId = String(id || "").trim();

  let supabase;

  try {
    supabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Auction status configuration error:", error);
    return NextResponse.json(
      { error: "Auction status is not configured." },
      { status: 500 },
    );
  }

  const { data, error } = await supabase
    .from("listings")
    .select(
      "id, title, seller_id, status, sale_format, auction_status, auction_starts_at, auction_ends_at, auction_starting_bid, auction_current_bid, auction_bid_count, auction_reserve_met_at, auction_winner_id, auction_payment_due_at, reserve_fee_status",
    )
    .eq("id", listingId)
    .maybeSingle();

  if (error) {
    console.error("Auction status listing fetch error:", {
      error,
      errorMessage: error.message,
      listingId,
    });
    return NextResponse.json(
      { error: "Auction could not be loaded." },
      { status: 500 },
    );
  }

  const listing = data as AuctionListingRow | null;

  if (!listing || listing.sale_format !== "auction") {
    return NextResponse.json({ error: "Auction not found." }, { status: 404 });
  }

  const { data: bidData, error: bidError } = await supabase
    .from("auction_bids")
    .select("id, amount, bidder_id, created_at")
    .eq("listing_id", listingId)
    .eq("status", "valid")
    .order("amount", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(5);

  if (bidError) {
    console.error("Auction status bid fetch error:", {
      error: bidError,
      errorMessage: bidError.message,
      listingId,
    });
  }

  return NextResponse.json({
    listingId,
    title: listing.title || "GRAIL Auction",
    status: listing.status,
    auctionStatus: listing.auction_status,
    startsAt: listing.auction_starts_at,
    endsAt: listing.auction_ends_at,
    startingBid: Number(listing.auction_starting_bid || 0),
    currentBid: Number(listing.auction_current_bid || 0),
    bidCount: Number(listing.auction_bid_count || 0),
    minimumNextBid: getMinimumNextBid(listing),
    reserveStatus: getAuctionReserveStatus(listing),
    winnerId: listing.auction_winner_id || null,
    paymentDueAt: listing.auction_payment_due_at || null,
    recentBids: ((bidData || []) as BidRow[]).map((bid) => ({
      id: bid.id,
      amount: Number(bid.amount || 0),
      bidder: anonymizeBidder(bid.bidder_id),
      createdAt: bid.created_at,
    })),
  });
}
