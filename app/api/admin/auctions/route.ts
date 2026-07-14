import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { transactionLifecycleLabels } from "../../../lib/transactionCheckout";

export const runtime = "nodejs";

const adminEmails = ["ryanjhaas99@gmail.com"];

type AuctionRow = {
  id: string;
  seller_id: string | null;
  title: string | null;
  status: string | null;
  auction_status: string | null;
  auction_ends_at: string | null;
  auction_starting_bid: number | null;
  auction_current_bid: number | null;
  auction_bid_count: number | null;
  auction_reserve_met_at: string | null;
  auction_winner_id: string | null;
  auction_payment_due_at: string | null;
  reserve_fee_amount: number | null;
  reserve_fee_status: string | null;
  stripe_reserve_fee_checkout_session_id: string | null;
  stripe_reserve_fee_payment_intent_id: string | null;
  stripe_reserve_fee_charge_id: string | null;
  stripe_reserve_fee_refund_id: string | null;
  created_at: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
};

type UpdatePayload = {
  listingId?: string;
  action?: "admin_cancel";
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
    { auth: { persistSession: false } },
  );
}

function createServiceSupabaseClient() {
  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
  );
}

function getBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") || "";

  return authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
}

async function requireAdmin(request: Request) {
  const token = getBearerToken(request);

  if (!token) {
    return { user: null, response: NextResponse.json({ error: "Access denied." }, { status: 403 }) };
  }

  const supabase = createAnonSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  const email = user?.email?.toLowerCase() || "";

  if (error || !user || !adminEmails.includes(email)) {
    return { user: null, response: NextResponse.json({ error: "Access denied." }, { status: 403 }) };
  }

  return { user, response: null };
}

function shortId(value?: string | null) {
  return value ? value.slice(0, 8) : "Unknown";
}

function getProfileName(profile?: ProfileRow, fallbackId?: string | null) {
  return profile?.full_name || profile?.username || shortId(fallbackId);
}

function reserveStatus(auction: AuctionRow) {
  if (!auction.reserve_fee_status || auction.reserve_fee_status === "none") {
    return "No Reserve";
  }

  return auction.auction_reserve_met_at ? "Reserve Met" : "Reserve Not Met";
}

function getAuctionTransactionState(auction: AuctionRow) {
  if (auction.auction_status === "finalizing") {
    return "finalizing";
  }

  if (auction.auction_status === "awaiting_payment") {
    return "payment_pending";
  }

  if (auction.auction_status === "paid" || auction.status === "sold") {
    return "paid";
  }

  if (auction.auction_status === "payment_expired") {
    return "expired";
  }

  if (
    auction.auction_status === "cancelled" ||
    auction.auction_status === "ended_reserve_not_met" ||
    auction.auction_status === "ended_unsold"
  ) {
    return "cancelled";
  }

  return "payment_needed";
}

export async function GET(request: Request) {
  let serviceSupabase;

  try {
    serviceSupabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Admin auctions configuration error:", error);
    return NextResponse.json({ error: "Admin auctions are not configured." }, { status: 500 });
  }

  const { response } = await requireAdmin(request);

  if (response) {
    return response;
  }

  const { data, error } = await serviceSupabase
    .from("listings")
    .select(
      "id, seller_id, title, status, auction_status, auction_ends_at, auction_starting_bid, auction_current_bid, auction_bid_count, auction_reserve_met_at, auction_winner_id, auction_payment_due_at, reserve_fee_amount, reserve_fee_status, stripe_reserve_fee_checkout_session_id, stripe_reserve_fee_payment_intent_id, stripe_reserve_fee_charge_id, stripe_reserve_fee_refund_id, created_at",
    )
    .eq("sale_format", "auction")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Admin auctions fetch error:", {
      error,
      errorMessage: error.message,
    });
    return NextResponse.json({ error: "Auctions could not be loaded." }, { status: 500 });
  }

  const auctions = (data || []) as AuctionRow[];
  const profileIds = Array.from(
    new Set(
      auctions
        .flatMap((auction) => [auction.seller_id, auction.auction_winner_id])
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const profilesById = new Map<string, ProfileRow>();

  if (profileIds.length > 0) {
    const { data: profileData } = await serviceSupabase
      .from("profiles")
      .select("id, full_name, username")
      .in("id", profileIds);

    ((profileData || []) as ProfileRow[]).forEach((profile) => {
      profilesById.set(profile.id, profile);
    });
  }

  return NextResponse.json({
    auctions: auctions.map((auction) => {
      const transactionState = getAuctionTransactionState(auction);

      return {
        id: auction.id,
        shortId: shortId(auction.id),
        title: auction.title || "GRAIL Auction",
        sellerId: auction.seller_id,
        sellerName: getProfileName(
          auction.seller_id ? profilesById.get(auction.seller_id) : undefined,
          auction.seller_id,
        ),
        status: auction.status || "unknown",
        auctionStatus: auction.auction_status || "unknown",
        transactionState,
        transactionStateLabel: transactionLifecycleLabels[transactionState],
        endsAt: auction.auction_ends_at,
        startingBid: Number(auction.auction_starting_bid || 0),
        currentBid: Number(auction.auction_current_bid || 0),
        bidCount: Number(auction.auction_bid_count || 0),
        reserveStatus: reserveStatus(auction),
        reserveFeeAmount: Number(auction.reserve_fee_amount || 0),
        reserveFeeStatus: auction.reserve_fee_status || "none",
        winnerId: auction.auction_winner_id,
        winnerName: getProfileName(
          auction.auction_winner_id
            ? profilesById.get(auction.auction_winner_id)
            : undefined,
          auction.auction_winner_id,
        ),
        paymentDueAt: auction.auction_payment_due_at,
        stripeReserveFeeCheckoutSessionId:
          auction.stripe_reserve_fee_checkout_session_id || "",
        stripeReserveFeePaymentIntentId:
          auction.stripe_reserve_fee_payment_intent_id || "",
        stripeReserveFeeChargeId: auction.stripe_reserve_fee_charge_id || "",
        stripeReserveFeeRefundId: auction.stripe_reserve_fee_refund_id || "",
        createdAt: auction.created_at,
      };
    }),
  });
}

export async function PATCH(request: Request) {
  let serviceSupabase;

  try {
    serviceSupabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Admin auctions update configuration error:", error);
    return NextResponse.json({ error: "Admin auctions are not configured." }, { status: 500 });
  }

  const { response } = await requireAdmin(request);

  if (response) {
    return response;
  }

  let payload: UpdatePayload;

  try {
    payload = (await request.json()) as UpdatePayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!payload.listingId || payload.action !== "admin_cancel") {
    return NextResponse.json({ error: "Unsupported admin auction action." }, { status: 400 });
  }

  const { error } = await serviceSupabase
    .from("listings")
    .update({
      status: "collection",
      auction_status: "cancelled",
      reserve_fee_status: "refund_pending",
    })
    .eq("id", payload.listingId)
    .eq("sale_format", "auction");

  if (error) {
    console.error("Admin auction cancel error:", {
      error,
      errorMessage: error.message,
      listingId: payload.listingId,
    });
    return NextResponse.json({ error: "Auction could not be cancelled." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
