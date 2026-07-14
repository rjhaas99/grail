import { NextResponse } from "next/server";
import { createSystemNotifications } from "../../../lib/serverNotifications";
import { processTrustEvent } from "../../../lib/trustEngine";
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
  status:
    | "finalizing"
    | "awaiting_payment"
    | "reserve_not_met"
    | "unsold"
    | "payment_expired"
    | "failed";
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
    .in("status", ["active", "auction_closed"])
    .in("auction_status", ["active", "finalizing"])
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
      if (auction.auction_status === "active") {
        const { data: finalizingAuction, error: finalizingError } = await supabase
          .from("listings")
          .update({
            status: "auction_closed",
            auction_status: "finalizing",
          })
          .eq("id", auction.id)
          .eq("status", "active")
          .eq("auction_status", "active")
          .select("id")
          .maybeSingle();

        if (finalizingError) {
          throw finalizingError;
        }

        if (!finalizingAuction) {
          results.push({
            listingId: auction.id,
            status: "failed",
            detail: "Auction was already claimed for finalization.",
          });
          continue;
        }

        results.push({ listingId: auction.id, status: "finalizing" });
      }

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
        const { data: closedAuction, error: updateError } = await supabase
          .from("listings")
          .update({
            status: "collection",
            auction_status: reserveRequired ? "ended_reserve_not_met" : "ended_unsold",
            auction_ended_at: endedAt,
            reserve_fee_status: reserveRequired ? "retained" : "none",
          })
          .eq("id", auction.id)
          .eq("auction_status", "finalizing")
          .select("id")
          .maybeSingle();

        if (updateError) {
          throw updateError;
        }

        if (!closedAuction) {
          results.push({
            listingId: auction.id,
            status: "failed",
            detail: "Auction was already finalized.",
          });
          continue;
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
        const { data: closedAuction, error: updateError } = await supabase
          .from("listings")
          .update({
            status: "collection",
            auction_status: "ended_reserve_not_met",
            auction_ended_at: endedAt,
            reserve_fee_status: "retained",
          })
          .eq("id", auction.id)
          .eq("auction_status", "finalizing")
          .select("id")
          .maybeSingle();

        if (updateError) {
          throw updateError;
        }

        if (!closedAuction) {
          results.push({
            listingId: auction.id,
            status: "failed",
            detail: "Auction was already finalized.",
          });
          continue;
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
      const { data: paymentPendingAuction, error: updateError } = await supabase
        .from("listings")
        .update({
          status: "auction_closed",
          auction_status: "awaiting_payment",
          auction_winner_id: winnerId,
          auction_ended_at: endedAt,
          auction_payment_due_at: paymentDeadline,
          auction_reserve_met_at:
            auction.auction_reserve_met_at || (reserveRequired ? endedAt : null),
        })
        .eq("id", auction.id)
        .eq("auction_status", "finalizing")
        .select("id")
        .maybeSingle();

      if (updateError) {
        throw updateError;
      }

      if (!paymentPendingAuction) {
        results.push({
          listingId: auction.id,
          status: "failed",
          detail: "Auction was already finalized.",
        });
        continue;
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
          title: "Congratulations! You won the auction.",
          body: `You won ${auction.title || "this auction"}. Complete payment within 24 hours.`,
          linkUrl: `/orders`,
        },
        {
          userId: auction.seller_id,
          title: "Your auction ended",
          body: "Waiting for buyer payment. No order or payout starts until the winner pays.",
          linkUrl: "/seller-dashboard",
        },
        ...losingBidderIds.map((bidderId) => ({
          userId: bidderId,
          title: "You were outbid",
          body: "This auction ended and another bidder won.",
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
    .select("id, seller_id, title, auction_winner_id, auction_payment_due_at")
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
        {
          userId: auction.auction_winner_id,
          title: "Auction payment expired",
          body: "The 24-hour payment window expired, so this auction purchase was canceled.",
          linkUrl: "/orders",
        },
      ]);

      if (auction.auction_winner_id) {
        try {
          await processTrustEvent({
            supabase,
            userId: auction.auction_winner_id,
            event: "AUCTION_DEFAULT",
            reason: "Auction winner did not complete payment within 24 hours.",
            reference: {
              type: "auction",
              id: auction.id,
            },
          });
        } catch (trustError) {
          console.warn("Auction payment expiration trust event skipped:", {
            listingId: auction.id,
            winnerId: auction.auction_winner_id,
            error: trustError instanceof Error ? trustError.message : trustError,
          });
        }
      }

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
