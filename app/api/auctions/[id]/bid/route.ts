import { NextResponse } from "next/server";
import { createSystemNotifications } from "../../../../lib/serverNotifications";
import {
  createServiceSupabaseClient,
  getCurrentUser,
  getMinimumNextBid,
  isAuctionActive,
  roundCurrency,
  type AuctionListingRow,
} from "../../_shared";

export const runtime = "nodejs";

type BidPayload = {
  amount?: number | string;
};

type BidRow = {
  id: string;
  bidder_id: string | null;
  amount: number | null;
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const listingId = String(id || "").trim();
  const { user, error: authError } = await getCurrentUser(request);

  if (authError || !user) {
    return NextResponse.json({ error: "Sign in to place a bid." }, { status: 401 });
  }

  let payload: BidPayload;

  try {
    payload = (await request.json()) as BidPayload;
  } catch {
    return NextResponse.json({ error: "Invalid bid request." }, { status: 400 });
  }

  const bidAmount = roundCurrency(Number(payload.amount));

  if (!Number.isFinite(bidAmount) || bidAmount <= 0) {
    return NextResponse.json({ error: "Bid amount must be positive." }, { status: 400 });
  }

  let supabase;

  try {
    supabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Auction bid configuration error:", error);
    return NextResponse.json(
      { error: "Auction bidding is not configured." },
      { status: 500 },
    );
  }

  const { data, error } = await supabase
    .from("listings")
    .select(
      "id, seller_id, title, status, sale_format, auction_status, auction_ends_at, auction_starting_bid, auction_reserve_price, auction_reserve_met_at, auction_current_bid, auction_bid_count",
    )
    .eq("id", listingId)
    .maybeSingle();

  if (error) {
    console.error("Auction bid listing fetch error:", {
      error,
      errorMessage: error.message,
      listingId,
      bidderId: user.id,
    });
    return NextResponse.json(
      { error: "Auction could not be loaded." },
      { status: 500 },
    );
  }

  const listing = data as AuctionListingRow | null;

  if (!listing) {
    return NextResponse.json({ error: "Auction not found." }, { status: 404 });
  }

  if (listing.seller_id === user.id) {
    return NextResponse.json(
      { error: "You cannot bid on your own auction." },
      { status: 403 },
    );
  }

  if (!isAuctionActive(listing)) {
    return NextResponse.json(
      { error: "This auction is not accepting bids." },
      { status: 400 },
    );
  }

  const { data: previousBidData } = await supabase
    .from("auction_bids")
    .select("id, bidder_id, amount")
    .eq("listing_id", listingId)
    .eq("status", "valid")
    .order("amount", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const previousBid = previousBidData as BidRow | null;

  if (previousBid?.bidder_id === user.id) {
    return NextResponse.json(
      {
        error: "You already have the highest bid.",
        isCurrentUserHighestBidder: true,
      },
      { status: 409 },
    );
  }

  const minimumNextBid = getMinimumNextBid(listing);

  if (bidAmount < minimumNextBid) {
    return NextResponse.json(
      { error: `Minimum next bid is $${minimumNextBid.toFixed(2)}.` },
      { status: 400 },
    );
  }

  const { data: bidData, error: insertError } = await supabase
    .from("auction_bids")
    .insert({
      listing_id: listingId,
      bidder_id: user.id,
      amount: bidAmount,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Auction bid insert error:", {
      error: insertError,
      errorMessage: insertError.message,
      listingId,
      bidderId: user.id,
      bidAmount,
    });
    return NextResponse.json({ error: "Bid could not be recorded." }, { status: 500 });
  }

  const expectedBidCount = Number(listing.auction_bid_count || 0);
  const reservePrice = Number(listing.auction_reserve_price || 0);
  const reserveWasMet = Boolean(listing.auction_reserve_met_at);
  const reserveNowMet = reservePrice > 0 && bidAmount >= reservePrice;
  const updatePayload: Record<string, number | string | null> = {
    auction_current_bid: bidAmount,
    auction_bid_count: expectedBidCount + 1,
  };

  if (!reserveWasMet && reserveNowMet) {
    updatePayload.auction_reserve_met_at = new Date().toISOString();
  }

  const { data: updatedRows, error: updateError } = await supabase
    .from("listings")
    .update(updatePayload)
    .eq("id", listingId)
    .eq("auction_bid_count", expectedBidCount)
    .select("id, auction_current_bid, auction_bid_count, auction_reserve_met_at")
    .limit(1);

  if (updateError || !updatedRows || updatedRows.length === 0) {
    await supabase
      .from("auction_bids")
      .update({ status: "rejected" })
      .eq("id", bidData.id);

    if (updateError) {
      console.error("Auction bid current price update error:", {
        error: updateError,
        errorMessage: updateError.message,
        listingId,
        bidderId: user.id,
        bidAmount,
      });
    }

    return NextResponse.json(
      { error: "Auction changed while you were bidding. Refresh and try again." },
      { status: 409 },
    );
  }

  const { error: validBidError } = await supabase
    .from("auction_bids")
    .update({ status: "valid" })
    .eq("id", bidData.id);

  if (validBidError) {
    console.error("Auction bid validation update error:", {
      error: validBidError,
      errorMessage: validBidError.message,
      bidId: bidData.id,
      listingId,
    });
  }

  const notifications = [
    {
      userId: listing.seller_id,
      title: "New bid received",
      body: `${listing.title || "Your auction"} received a new bid of $${bidAmount.toFixed(2)}.`,
      linkUrl: `/cards/${listingId}`,
    },
    {
      userId: user.id,
      title: "Bid placed",
      body: `Your bid of $${bidAmount.toFixed(2)} was placed on ${listing.title || "this auction"}.`,
      linkUrl: `/cards/${listingId}`,
    },
  ];

  if (previousBid?.bidder_id && previousBid.bidder_id !== user.id) {
    notifications.push({
      userId: previousBid.bidder_id,
      title: "You were outbid",
      body: `${listing.title || "A GRAIL auction"} has a new higher bid.`,
      linkUrl: `/cards/${listingId}`,
    });
  }

  if (!reserveWasMet && reserveNowMet) {
    notifications.push({
      userId: listing.seller_id,
      title: "Reserve met",
      body: `${listing.title || "Your reserve auction"} has met its reserve.`,
      linkUrl: `/cards/${listingId}`,
    });
  }

  await createSystemNotifications(supabase, notifications);

  const updated = updatedRows[0] as {
    auction_current_bid: number | null;
    auction_bid_count: number | null;
    auction_reserve_met_at: string | null;
  };

  return NextResponse.json({
    currentBid: Number(updated.auction_current_bid || bidAmount),
    bidCount: Number(updated.auction_bid_count || expectedBidCount + 1),
    reserveStatus: updated.auction_reserve_met_at ? "Reserve Met" : "Reserve Not Met",
    isCurrentUserHighestBidder: true,
    currentUserBidState: "highest",
  });
}
