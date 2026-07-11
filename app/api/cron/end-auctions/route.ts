import { NextResponse } from "next/server";
import { createSystemNotifications } from "../../../lib/serverNotifications";
import {
  createServiceSupabaseClient,
  getBearerToken,
  type AuctionListingRow,
} from "../../auctions/_shared";

export const runtime = "nodejs";

type BidRow = {
  id: string;
  bidder_id: string | null;
  amount: number | null;
  created_at: string | null;
};

type AuctionResult = {
  listingId: string;
  status: "awaiting_payment" | "reserve_not_met" | "unsold" | "payment_expired" | "failed";
  detail?: string;
};

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

function paymentDueAt() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

async function endAuctions(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized cron request." }, { status: 401 });
  }

  let supabase;

  try {
    supabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("End auctions cron configuration error:", error);
    return NextResponse.json(
      { error: "Auction ending is not configured." },
      { status: 500 },
    );
  }

  const now = new Date().toISOString();
  const results: AuctionResult[] = [];

  const { data: expiredActiveData, error: activeError } = await supabase
    .from("listings")
    .select(
      "id, seller_id, title, status, sale_format, auction_status, auction_ends_at, auction_starting_bid, auction_reserve_price, auction_reserve_met_at, auction_current_bid, auction_bid_count, reserve_fee_status",
    )
    .eq("sale_format", "auction")
    .eq("status", "active")
    .eq("auction_status", "active")
    .lte("auction_ends_at", now)
    .order("auction_ends_at", { ascending: true })
    .limit(25);

  if (activeError) {
    console.error("End auctions active fetch error:", {
      error: activeError,
      errorMessage: activeError.message,
    });
    return NextResponse.json(
      { error: "Expired auctions could not be loaded." },
      { status: 500 },
    );
  }

  const expiredActive = (expiredActiveData || []) as AuctionListingRow[];

  for (const auction of expiredActive) {
    try {
      const { data: bidData, error: bidError } = await supabase
        .from("auction_bids")
        .select("id, bidder_id, amount, created_at")
        .eq("listing_id", auction.id)
        .eq("status", "valid")
        .order("amount", { ascending: false })
        .order("created_at", { ascending: true });

      if (bidError) {
        throw bidError;
      }

      const bids = (bidData || []) as BidRow[];
      const highBid = bids[0];
      const reservePrice = Number(auction.auction_reserve_price || 0);
      const reserveRequired = reservePrice > 0;
      const reserveMet = !reserveRequired || Number(highBid?.amount || 0) >= reservePrice;
      const endedAt = new Date().toISOString();

      if (!highBid) {
        const { error: updateError } = await supabase
          .from("listings")
          .update({
            status: "collection",
            auction_status: reserveRequired ? "ended_reserve_not_met" : "ended_unsold",
            auction_ended_at: endedAt,
            reserve_fee_status: reserveRequired ? "retained" : "none",
          })
          .eq("id", auction.id)
          .eq("auction_status", "active");

        if (updateError) {
          throw updateError;
        }

        await createSystemNotifications(supabase, [
          {
            userId: auction.seller_id,
            title: reserveRequired ? "Reserve not met" : "Auction ended",
            body: reserveRequired
              ? "Your auction ended without meeting reserve. No sale occurred."
              : "Your auction ended without bids.",
            linkUrl: `/cards/${auction.id}`,
          },
        ]);
        results.push({
          listingId: auction.id,
          status: reserveRequired ? "reserve_not_met" : "unsold",
        });
        continue;
      }

      if (!reserveMet) {
        const losingBidderIds = Array.from(
          new Set(
            bids
              .map((bid) => bid.bidder_id)
              .filter((bidderId): bidderId is string => Boolean(bidderId)),
          ),
        );
        const { error: updateError } = await supabase
          .from("listings")
          .update({
            status: "collection",
            auction_status: "ended_reserve_not_met",
            auction_ended_at: endedAt,
            reserve_fee_status: "retained",
          })
          .eq("id", auction.id)
          .eq("auction_status", "active");

        if (updateError) {
          throw updateError;
        }

        await createSystemNotifications(supabase, [
          {
            userId: auction.seller_id,
            title: "Reserve not met",
            body: "Your auction ended below reserve. No sale occurred.",
            linkUrl: `/cards/${auction.id}`,
          },
          ...losingBidderIds.map((bidderId) => ({
            userId: bidderId,
            title: "Auction ended",
            body: "This auction ended below reserve. No sale occurred.",
            linkUrl: `/cards/${auction.id}`,
          })),
        ]);
        results.push({ listingId: auction.id, status: "reserve_not_met" });
        continue;
      }

      const winnerId = highBid.bidder_id;

      if (!winnerId) {
        results.push({
          listingId: auction.id,
          status: "failed",
          detail: "High bid is missing bidder_id.",
        });
        continue;
      }

      const paymentDeadline = paymentDueAt();
      const { error: updateError } = await supabase
        .from("listings")
        .update({
          auction_status: "awaiting_payment",
          auction_winner_id: winnerId,
          auction_ended_at: endedAt,
          auction_payment_due_at: paymentDeadline,
          auction_reserve_met_at:
            auction.auction_reserve_met_at || (reserveRequired ? endedAt : null),
        })
        .eq("id", auction.id)
        .eq("auction_status", "active");

      if (updateError) {
        throw updateError;
      }

      const losingBidderIds = Array.from(
        new Set(
          bids
            .map((bid) => bid.bidder_id)
            .filter(
              (bidderId): bidderId is string =>
                Boolean(bidderId) && bidderId !== winnerId,
            ),
        ),
      );

      await createSystemNotifications(supabase, [
        {
          userId: winnerId,
          title: "You won the auction",
          body: "Complete payment within 24 hours to finish your GRAIL auction purchase.",
          linkUrl: `/cards/${auction.id}`,
        },
        {
          userId: auction.seller_id,
          title: "Auction sold",
          body: "Your auction ended with a winning bidder. Payment is due within 24 hours.",
          linkUrl: `/cards/${auction.id}`,
        },
        ...losingBidderIds.map((bidderId) => ({
          userId: bidderId,
          title: "Auction ended",
          body: "This auction ended. Another bidder won.",
          linkUrl: `/cards/${auction.id}`,
        })),
      ]);
      results.push({ listingId: auction.id, status: "awaiting_payment" });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Auction ending failed.";
      console.error("End auctions processing error:", {
        error,
        errorMessage: detail,
        listingId: auction.id,
      });
      results.push({ listingId: auction.id, status: "failed", detail });
    }
  }

  const { data: expiredPaymentData, error: paymentError } = await supabase
    .from("listings")
    .select("id, seller_id, title, auction_payment_due_at")
    .eq("sale_format", "auction")
    .eq("auction_status", "awaiting_payment")
    .lte("auction_payment_due_at", now)
    .limit(25);

  if (paymentError) {
    console.error("End auctions payment expiration fetch error:", {
      error: paymentError,
      errorMessage: paymentError.message,
    });
  } else {
    for (const auction of (expiredPaymentData || []) as AuctionListingRow[]) {
      const { error: updateError } = await supabase
        .from("listings")
        .update({
          status: "collection",
          auction_status: "payment_expired",
        })
        .eq("id", auction.id)
        .eq("auction_status", "awaiting_payment");

      if (updateError) {
        console.error("End auctions payment expiration update error:", {
          error: updateError,
          errorMessage: updateError.message,
          listingId: auction.id,
        });
        results.push({
          listingId: auction.id,
          status: "failed",
          detail: updateError.message,
        });
        continue;
      }

      await createSystemNotifications(supabase, [
        {
          userId: auction.seller_id,
          title: "Winner payment expired",
          body: "The winning bidder did not pay within 24 hours. You can relist this card.",
          linkUrl: "/seller-dashboard",
        },
      ]);
      results.push({ listingId: auction.id, status: "payment_expired" });
    }
  }

  return NextResponse.json({
    checked: expiredActive.length,
    results,
  });
}

export async function GET(request: Request) {
  return endAuctions(request);
}

export async function POST(request: Request) {
  return endAuctions(request);
}
