export type SavedItemType = "listing";

export type ListingImageRow = {
  image_url: string | null;
  image_type: string | null;
};

export type SavedListingRow = {
  id: string;
  seller_id: string | null;
  title: string | null;
  sport: string | null;
  player: string | null;
  player_name?: string | null;
  year: string | null;
  brand: string | null;
  card_number: string | null;
  card_type: string | null;
  grader: string | null;
  grade: string | null;
  condition: string | null;
  price: number | null;
  status: string | null;
  created_at: string | null;
  is_collection_card?: boolean | null;
  is_public_collection?: boolean | null;
  estimated_value?: number | null;
  sportscardspro_estimated_value?: number | null;
  sale_format?: string | null;
  auction_status?: string | null;
  auction_ends_at?: string | null;
  auction_starting_bid?: number | null;
  auction_current_bid?: number | null;
  auction_bid_count?: number | null;
  auction_reserve_met_at?: string | null;
  reserve_fee_status?: string | null;
  listing_images?: ListingImageRow[] | null;
};

export type WatchlistRow = {
  id: string;
  user_id: string;
  listing_id: string;
  created_at: string | null;
  listing?: SavedListingRow | SavedListingRow[] | null;
};

export type SavedSellerProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
};

export type SavedListingItem = {
  id: string;
  itemType: SavedItemType;
  savedAt: string | null;
  listingId: string;
  title: string;
  subtitle: string;
  sellerId: string | null;
  sellerName: string;
  sellerHref: string;
  price: number;
  priceDisplay: string;
  marketValue: number;
  status: string;
  statusTone: "active" | "auction" | "sold" | "pending" | "unavailable";
  route: string;
  imageUrl: string | null;
  watchCount: number;
  isAuction: boolean;
  isBuyable: boolean;
  isBiddable: boolean;
  isOwner: boolean;
  auctionEndsAt: string | null;
  auctionBidCount: number;
};

export function formatSavedCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatSavedCurrencyWithCents(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function getListingFromWatchRow(row: WatchlistRow) {
  if (Array.isArray(row.listing)) {
    return row.listing[0] || null;
  }

  return row.listing || null;
}

function getSellerHref(profile: SavedSellerProfile | undefined, sellerId: string | null) {
  const username = profile?.username?.replace(/^@/, "").trim();

  if (username) {
    return `/collections/${encodeURIComponent(username)}`;
  }

  return `/collections/${sellerId || ""}`;
}

function getSellerName(profile: SavedSellerProfile | undefined) {
  return profile?.full_name || profile?.username || "GRAIL Seller";
}

function getConditionDisplay(listing: SavedListingRow) {
  if (listing.grader && listing.grade) {
    return `${listing.grader} ${listing.grade}`;
  }

  if (listing.condition) {
    return listing.condition.toLowerCase().includes("raw")
      ? listing.condition
      : `Raw ${listing.condition}`;
  }

  return listing.card_type?.toLowerCase() === "graded" ? "Graded" : "Raw";
}

function getSavedListingTitle(listing: SavedListingRow) {
  return (
    listing.title ||
    [listing.year, listing.brand, listing.player || listing.player_name, listing.card_number]
      .filter(Boolean)
      .join(" ") ||
    "Untitled GRAIL listing"
  );
}

function getSavedListingImage(listing: SavedListingRow) {
  const images = listing.listing_images || [];
  const frontImage = images.find((image) =>
    (image.image_type || "").toLowerCase().includes("front"),
  );

  return frontImage?.image_url || images[0]?.image_url || null;
}

function getStatus(listing: SavedListingRow, nowMs: number) {
  const listingStatus = listing.status?.toLowerCase() || "";
  const auctionStatus = listing.auction_status?.toLowerCase() || "";
  const isAuction = listing.sale_format === "auction";

  if (listingStatus === "sold" || auctionStatus === "paid") {
    return { label: "Sold", tone: "sold" as const };
  }

  if (isAuction) {
    if (auctionStatus === "active" && listing.auction_ends_at) {
      const remaining = new Date(listing.auction_ends_at).getTime() - nowMs;

      if (remaining > 0 && remaining <= 60 * 60 * 1000) {
        return { label: "Auction Ending Soon", tone: "auction" as const };
      }

      if (remaining > 0) {
        return { label: "Auction Live", tone: "auction" as const };
      }
    }

    if (auctionStatus === "awaiting_payment") {
      return { label: "Payment Pending", tone: "pending" as const };
    }

    if (auctionStatus === "finalizing") {
      return { label: "Finalizing Auction", tone: "pending" as const };
    }

    if (auctionStatus === "payment_expired") {
      return { label: "Payment Expired", tone: "unavailable" as const };
    }

    return { label: "Auction Ended", tone: "unavailable" as const };
  }

  if (listingStatus === "active") {
    return { label: "Active", tone: "active" as const };
  }

  if (
    listingStatus === "collection" ||
    listing.is_collection_card ||
    listing.is_public_collection
  ) {
    return { label: "Collection", tone: "pending" as const };
  }

  return { label: "Unavailable", tone: "unavailable" as const };
}

export function normalizeSavedListingItem({
  row,
  profile,
  watchCount,
  currentUserId,
  nowMs = Date.now(),
}: {
  row: WatchlistRow;
  profile?: SavedSellerProfile;
  watchCount: number;
  currentUserId: string;
  nowMs?: number;
}): SavedListingItem | null {
  const listing = getListingFromWatchRow(row);

  if (!listing) {
    return null;
  }

  const isAuction = listing.sale_format === "auction";
  const isOwner = Boolean(currentUserId && listing.seller_id === currentUserId);
  const title = getSavedListingTitle(listing);
  const condition = getConditionDisplay(listing);
  const status = getStatus(listing, nowMs);
  const currentBid = Number(listing.auction_current_bid || 0);
  const startingBid = Number(listing.auction_starting_bid || 0);
  const fixedPrice = Number(listing.price || 0);
  const displayPrice = isAuction ? currentBid || startingBid : fixedPrice;
  const marketValue =
    Number(listing.sportscardspro_estimated_value || 0) ||
    Number(listing.estimated_value || 0);
  const auctionEndsAt = listing.auction_ends_at || null;
  const isAuctionLive =
    isAuction &&
    listing.status === "active" &&
    listing.auction_status === "active" &&
    Boolean(auctionEndsAt) &&
    new Date(auctionEndsAt || 0).getTime() > nowMs;

  return {
    id: row.id,
    itemType: "listing",
    savedAt: row.created_at,
    listingId: listing.id,
    title,
    subtitle: [listing.year, listing.brand, listing.player || listing.player_name, condition]
      .filter(Boolean)
      .join(" · "),
    sellerId: listing.seller_id,
    sellerName: getSellerName(profile),
    sellerHref: getSellerHref(profile, listing.seller_id),
    price: displayPrice,
    priceDisplay: isAuction
      ? currentBid
        ? `Current Bid ${formatSavedCurrencyWithCents(currentBid)}`
        : `Starting Bid ${formatSavedCurrencyWithCents(startingBid)}`
      : fixedPrice
        ? formatSavedCurrency(fixedPrice)
        : "Price not listed",
    marketValue,
    status: status.label,
    statusTone: status.tone,
    route: `/cards/${listing.id}`,
    imageUrl: getSavedListingImage(listing),
    watchCount,
    isAuction,
    isBuyable:
      !isOwner &&
      !isAuction &&
      listing.status === "active" &&
      fixedPrice > 0,
    isBiddable: !isOwner && isAuctionLive,
    isOwner,
    auctionEndsAt,
    auctionBidCount: Number(listing.auction_bid_count || 0),
  };
}
