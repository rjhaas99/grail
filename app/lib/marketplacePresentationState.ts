export type MarketplacePresentationState =
  | "for_sale"
  | "active_auction"
  | "collection_offer_only"
  | "sold"
  | "auction_pending_settlement";

export type MarketplacePresentationListing = {
  status?: string | null;
  sale_format?: string | null;
  saleFormat?: string | null;
  auction_status?: string | null;
  auctionStatus?: string | null;
  auction_ends_at?: string | null;
  auctionEndsAt?: string | null;
  is_collection_card?: boolean | null;
  isCollectionCard?: boolean | null;
  is_public_collection?: boolean | null;
  isPublicCollection?: boolean | null;
};

const unsuccessfulAuctionStatuses = new Set([
  "ended_unsold",
  "ended_reserve_not_met",
  "payment_expired",
  "canceled",
  "cancelled",
]);

function normalize(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function getSaleFormat(listing: MarketplacePresentationListing) {
  return normalize(listing.sale_format ?? listing.saleFormat);
}

function getAuctionStatus(listing: MarketplacePresentationListing) {
  return normalize(listing.auction_status ?? listing.auctionStatus);
}

function getAuctionEndsAt(listing: MarketplacePresentationListing) {
  return listing.auction_ends_at ?? listing.auctionEndsAt ?? null;
}

function hasFutureAuctionEndTime(
  listing: MarketplacePresentationListing,
  nowMs: number,
) {
  const auctionEndsAt = getAuctionEndsAt(listing);

  if (!auctionEndsAt) {
    return false;
  }

  const endMs = new Date(auctionEndsAt).getTime();

  return Number.isFinite(endMs) && endMs > nowMs;
}

function hasEndedAuctionTime(
  listing: MarketplacePresentationListing,
  nowMs: number,
) {
  const auctionEndsAt = getAuctionEndsAt(listing);

  if (!auctionEndsAt) {
    return false;
  }

  const endMs = new Date(auctionEndsAt).getTime();

  return Number.isFinite(endMs) && endMs <= nowMs;
}

export function resolveMarketplacePresentationState(
  listing: MarketplacePresentationListing,
  nowMs = Date.now(),
): MarketplacePresentationState {
  const listingStatus = normalize(listing.status);
  const saleFormat = getSaleFormat(listing);
  const auctionStatus = getAuctionStatus(listing);
  const isAuctionListing = saleFormat === "auction";
  const isCollectionFlagged =
    Boolean(listing.is_collection_card ?? listing.isCollectionCard) ||
    Boolean(listing.is_public_collection ?? listing.isPublicCollection);

  if (listingStatus === "sold" || auctionStatus === "paid") {
    return "sold";
  }

  if (
    isAuctionListing &&
    listingStatus === "active" &&
    auctionStatus === "active" &&
    hasFutureAuctionEndTime(listing, nowMs)
  ) {
    return "active_auction";
  }

  if (
    isAuctionListing &&
    (auctionStatus === "awaiting_payment" || auctionStatus === "finalizing")
  ) {
    return "auction_pending_settlement";
  }

  if (
    listingStatus === "collection" ||
    (listingStatus !== "active" && isCollectionFlagged) ||
    (isAuctionListing && unsuccessfulAuctionStatuses.has(auctionStatus)) ||
    (isAuctionListing && hasEndedAuctionTime(listing, nowMs))
  ) {
    return "collection_offer_only";
  }

  if (listingStatus === "active") {
    return "for_sale";
  }

  if (isCollectionFlagged) {
    return "collection_offer_only";
  }

  return "collection_offer_only";
}

export function isActiveAuctionPresentation(
  listing: MarketplacePresentationListing,
  nowMs = Date.now(),
) {
  return resolveMarketplacePresentationState(listing, nowMs) === "active_auction";
}

export function isOfferOnlyPresentation(
  listing: MarketplacePresentationListing,
  nowMs = Date.now(),
) {
  return (
    resolveMarketplacePresentationState(listing, nowMs) === "collection_offer_only"
  );
}

export function isSoldPresentation(
  listing: MarketplacePresentationListing,
  nowMs = Date.now(),
) {
  return resolveMarketplacePresentationState(listing, nowMs) === "sold";
}
