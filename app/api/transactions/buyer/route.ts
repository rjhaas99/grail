import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type AuctionBidRow = {
  id: string;
  listing_id: string | null;
  amount: number | null;
  status: string | null;
  created_at: string | null;
};

type AuctionListingRow = {
  id: string;
  title: string | null;
  status: string | null;
  sale_format: string | null;
  auction_status: string | null;
  auction_current_bid: number | null;
  auction_winner_id: string | null;
  auction_payment_due_at: string | null;
  auction_ends_at: string | null;
  auction_bid_count: number | null;
  auction_reserve_met_at: string | null;
  reserve_fee_status: string | null;
};

type OfferRow = {
  id: string;
  listing_id: string | null;
  buyer_id: string | null;
  seller_id: string | null;
  amount: number | null;
  status: string | null;
  created_at: string | null;
};

type PaymentNeededTransaction = {
  id: string;
  transactionType: "auction" | "accepted_offer";
  listingId: string;
  cardTitle: string;
  amountDue: number;
  status: "payment_needed" | "payment_expired";
  statusLabel: "Payment Needed" | "Payment Expired";
  statusDetail: string;
  paymentDueAt: string | null;
  href: string;
  canCompletePayment: boolean;
  collectorMoment?: {
    id: string;
    occurredAt: string | null;
    title: string;
    amountDisplay: string;
  };
};

type MyBidTransaction = {
  id: string;
  listingId: string;
  cardTitle: string;
  amount: number;
  currentBid: number;
  status: string;
  statusDetail: string;
  createdAt: string | null;
  paymentDueAt: string | null;
  href: string;
  canCompletePayment: boolean;
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

async function getCurrentUser(request: Request) {
  const token = getBearerToken(request);

  if (!token) {
    return { user: null, error: "Missing authorization token." };
  }

  const supabase = createAnonSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error) {
    console.error("Buyer transactions auth error:", error);
  }

  return { user, error: error?.message || null };
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "the payment deadline";
  }

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getBidLifecycleStatus({
  bid,
  listing,
  currentUserId,
}: {
  bid: AuctionBidRow;
  listing: AuctionListingRow;
  currentUserId: string;
}) {
  const auctionStatus = listing.auction_status || "unknown";
  const bidAmount = Number(bid.amount || 0);
  const currentBid = Number(listing.auction_current_bid || 0);
  const isWinner = listing.auction_winner_id === currentUserId;

  if (auctionStatus === "active") {
    return bidAmount >= currentBid
      ? { status: "Current Bid", detail: "You currently have the highest bid." }
      : { status: "Outbid", detail: "Another collector currently has the highest bid." };
  }

  if (auctionStatus === "finalizing") {
    return {
      status: "Finalizing Auction",
      detail: "GRAIL is confirming the winning bid.",
    };
  }

  if (auctionStatus === "awaiting_payment") {
    return isWinner
      ? {
          status: "Payment Pending",
          detail: `Complete payment by ${formatDateTime(listing.auction_payment_due_at)}.`,
        }
      : { status: "Lost Auction", detail: "Another bidder won this auction." };
  }

  if (auctionStatus === "paid") {
    return isWinner
      ? { status: "Completed", detail: "Auction payment was completed." }
      : { status: "Lost Auction", detail: "Another bidder won this auction." };
  }

  if (auctionStatus === "payment_expired") {
    return isWinner
      ? {
          status: "Payment Expired",
          detail: "The 24-hour payment window expired.",
        }
      : { status: "Lost Auction", detail: "Another bidder won this auction." };
  }

  if (auctionStatus === "ended_reserve_not_met") {
    return {
      status: "Reserve Not Met",
      detail: "The auction ended below reserve. No sale occurred.",
    };
  }

  return { status: "Lost Auction", detail: "This auction has ended." };
}

export async function GET(request: Request) {
  const { user, error: authError } = await getCurrentUser(request);

  if (authError || !user) {
    return NextResponse.json({ error: "Sign in to view transactions." }, { status: 401 });
  }

  let supabase;

  try {
    supabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Buyer transactions configuration error:", error);
    return NextResponse.json(
      { error: "Buyer transactions are temporarily unavailable." },
      { status: 500 },
    );
  }

  const { data: bidData, error: bidError } = await supabase
    .from("auction_bids")
    .select("id, listing_id, amount, status, created_at")
    .eq("bidder_id", user.id)
    .eq("status", "valid")
    .order("created_at", { ascending: false });

  if (bidError) {
    console.error("Buyer transactions bid fetch error:", {
      error: bidError,
      errorMessage: bidError.message,
      buyerId: user.id,
    });
    return NextResponse.json(
      { error: "Auction bid transactions could not be loaded." },
      { status: 500 },
    );
  }

  const bids = (bidData || []) as AuctionBidRow[];
  const { data: acceptedOfferData, error: acceptedOfferError } = await supabase
    .from("offers")
    .select("id, listing_id, buyer_id, seller_id, amount, status, created_at")
    .eq("buyer_id", user.id)
    .eq("status", "accepted")
    .order("created_at", { ascending: false });

  if (acceptedOfferError) {
    console.error("Buyer transactions accepted offer fetch error:", {
      error: acceptedOfferError,
      errorMessage: acceptedOfferError.message,
      buyerId: user.id,
    });
    return NextResponse.json(
      { error: "Accepted offer transactions could not be loaded." },
      { status: 500 },
    );
  }

  const acceptedOffers = (acceptedOfferData || []) as OfferRow[];
  const latestBidByListing = new Map<string, AuctionBidRow>();

  bids.forEach((bid) => {
    if (!bid.listing_id) {
      return;
    }

    const existing = latestBidByListing.get(bid.listing_id);

    if (!existing || new Date(bid.created_at || 0) > new Date(existing.created_at || 0)) {
      latestBidByListing.set(bid.listing_id, bid);
    }
  });

  const bidListingIds = Array.from(latestBidByListing.keys());
  const { data: wonListingData, error: wonListingError } = await supabase
    .from("listings")
    .select(
      "id, title, status, sale_format, auction_status, auction_current_bid, auction_winner_id, auction_payment_due_at, auction_ends_at, auction_bid_count, auction_reserve_met_at, reserve_fee_status",
    )
    .eq("sale_format", "auction")
    .eq("auction_winner_id", user.id)
    .in("auction_status", ["awaiting_payment", "payment_expired"]);

  if (wonListingError) {
    console.error("Buyer transactions won auction fetch error:", {
      error: wonListingError,
      errorMessage: wonListingError.message,
      buyerId: user.id,
    });
    return NextResponse.json(
      { error: "Won auction transactions could not be loaded." },
      { status: 500 },
    );
  }

  const wonListings = (wonListingData || []) as AuctionListingRow[];
  const acceptedOfferListingIds = acceptedOffers
    .map((offer) => offer.listing_id)
    .filter((listingId): listingId is string => Boolean(listingId));
  const listingIds = Array.from(
    new Set([
      ...bidListingIds,
      ...wonListings.map((listing) => listing.id),
      ...acceptedOfferListingIds,
    ]),
  );
  const listingsById = new Map<string, AuctionListingRow>();

  if (listingIds.length > 0) {
    const { data: listingData, error: listingError } = await supabase
      .from("listings")
      .select(
        "id, title, status, sale_format, auction_status, auction_current_bid, auction_winner_id, auction_payment_due_at, auction_ends_at, auction_bid_count, auction_reserve_met_at, reserve_fee_status",
      )
      .in("id", listingIds);

    if (listingError) {
      console.error("Buyer transactions listing fetch error:", {
        error: listingError,
        errorMessage: listingError.message,
        buyerId: user.id,
      });
      return NextResponse.json(
        { error: "Auction transactions could not be loaded." },
        { status: 500 },
      );
    }

    ((listingData || []) as AuctionListingRow[]).forEach((listing) => {
      listingsById.set(listing.id, listing);
    });
  }

  wonListings.forEach((listing) => {
    listingsById.set(listing.id, listing);
  });

  const auctionPaymentNeeded: PaymentNeededTransaction[] = wonListings.map((listing) => {
    const isExpired = listing.auction_status === "payment_expired";
    const amountDue = Number(listing.auction_current_bid || 0);

    return {
      id: `auction:${listing.id}`,
      transactionType: "auction",
      listingId: listing.id,
      cardTitle: listing.title || "GRAIL Auction",
      amountDue,
      status: isExpired ? "payment_expired" : "payment_needed",
      statusLabel: isExpired ? "Payment Expired" : "Payment Needed",
      statusDetail: isExpired
        ? "The 24-hour payment window expired."
        : `Complete payment by ${formatDateTime(listing.auction_payment_due_at)}.`,
      paymentDueAt: listing.auction_payment_due_at,
      href: `/cards/${listing.id}`,
      canCompletePayment: !isExpired,
      collectorMoment: isExpired
        ? undefined
        : {
            id: `auction-won:${listing.id}:${listing.auction_payment_due_at || "pending"}`,
            occurredAt: listing.auction_ends_at,
            title: listing.title || "GRAIL Auction",
            amountDisplay: new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 2,
            }).format(amountDue),
          },
    };
  });
  const offerPaymentNeeded = acceptedOffers
    .map<PaymentNeededTransaction | null>((offer) => {
      if (!offer.listing_id) {
        return null;
      }

      const listing = listingsById.get(offer.listing_id);
      const amountDue = Number(offer.amount || 0);

      if (!listing || amountDue <= 0) {
        return null;
      }

      const isAvailable = listing.status === "active";

      return {
        id: `offer:${offer.id}`,
        transactionType: "accepted_offer",
        listingId: offer.listing_id,
        cardTitle: listing.title || "Accepted Offer",
        amountDue,
        status: isAvailable ? "payment_needed" : "payment_expired",
        statusLabel: isAvailable ? "Payment Needed" : "Payment Expired",
        statusDetail: isAvailable
          ? "Complete payment to start this accepted-offer order."
          : "This accepted offer is no longer available for payment.",
        paymentDueAt: null,
        href: `/cards/${offer.listing_id}`,
        canCompletePayment: isAvailable,
      } satisfies PaymentNeededTransaction;
    })
    .filter((transaction): transaction is PaymentNeededTransaction => Boolean(transaction));
  const paymentNeeded = [...auctionPaymentNeeded, ...offerPaymentNeeded];

  const myBids = Array.from(latestBidByListing.entries())
    .map(([listingId, bid]) => {
      const listing = listingsById.get(listingId);

      if (!listing || listing.sale_format !== "auction") {
        return null;
      }

      const lifecycle = getBidLifecycleStatus({
        bid,
        listing,
        currentUserId: user.id,
      });

      return {
        id: bid.id,
        listingId,
        cardTitle: listing.title || "GRAIL Auction",
        amount: Number(bid.amount || 0),
        currentBid: Number(listing.auction_current_bid || 0),
        status: lifecycle.status,
        statusDetail: lifecycle.detail,
        createdAt: bid.created_at,
        paymentDueAt: listing.auction_payment_due_at,
        href: `/cards/${listingId}`,
        canCompletePayment:
          listing.auction_status === "awaiting_payment" &&
          listing.auction_winner_id === user.id,
      } satisfies MyBidTransaction;
    })
    .filter((view): view is MyBidTransaction => Boolean(view));

  return NextResponse.json({
    paymentNeeded,
    myBids,
  });
}
