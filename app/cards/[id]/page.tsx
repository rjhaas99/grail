"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import Header from "../../components/Header";
import {
  type MockConversation,
  type MockListing,
  getMockListingById,
  getMockSellerBySlug,
} from "../../lib/mockData";

const photoViews = [
  "Front",
  "Back",
  "Top Corners",
  "Bottom Corners",
  "Surface",
  "Edges",
] as const;

const reportReasons = [
  "Counterfeit / authenticity concern",
  "Wrong photos",
  "Wrong card details",
  "Wrong grade or condition",
  "Suspicious seller",
  "Scam or unsafe listing",
  "Other",
] as const;

type PhotoView = (typeof photoViews)[number];
type ReportReason = (typeof reportReasons)[number];
type PublishStatus = {
  type: "success" | "error" | "info";
  text: string;
};
type MockCard = MockListing & {
  imageUrls?: Partial<Record<PhotoView, string>>;
  sellerId?: string | null;
  soldPrice?: number;
  psaVerified?: boolean;
  psaCertNumber?: string | null;
  psaGrade?: string | null;
  psaCardName?: string | null;
  psaVerifiedAt?: string | null;
  sportsCardsProId?: string | null;
  sportsCardsProProductName?: string | null;
  sportsCardsProSetName?: string | null;
  sportsCardsProEstimatedValue?: number | null;
  sportsCardsProPriceField?: string | null;
  sportsCardsProSourceUrl?: string | null;
  sportsCardsProFetchedAt?: string | null;
  saleFormat?: "fixed" | "auction";
  auctionStatus?: string | null;
  auctionStartsAt?: string | null;
  auctionEndsAt?: string | null;
  auctionStartingBid?: number | null;
  auctionCurrentBid?: number | null;
  auctionBidCount?: number | null;
  auctionReserveMetAt?: string | null;
  auctionWinnerId?: string | null;
  auctionPaymentDueAt?: string | null;
  reserveFeeStatus?: string | null;
};

type ListingImageRow = {
  image_url: string | null;
  image_type: string | null;
};

type SupabaseListingRow = {
  id: string;
  seller_id: string | null;
  title: string | null;
  sport: string | null;
  player: string | null;
  year: string | null;
  brand: string | null;
  card_number: string | null;
  card_type: string | null;
  grader: string | null;
  grade: string | null;
  cert_number: string | null;
  condition: string | null;
  price: number | null;
  status: string | null;
  is_collection_card?: boolean | null;
  is_public_collection?: boolean | null;
  psa_verified?: boolean | null;
  psa_cert_number?: string | null;
  psa_grade?: string | null;
  psa_card_name?: string | null;
  psa_verified_at?: string | null;
  estimated_value?: number | null;
  sportscardspro_id?: string | null;
  sportscardspro_product_name?: string | null;
  sportscardspro_set_name?: string | null;
  sportscardspro_estimated_value?: number | null;
  sportscardspro_price_field?: string | null;
  sportscardspro_source_url?: string | null;
  sportscardspro_fetched_at?: string | null;
  sale_format?: string | null;
  auction_status?: string | null;
  auction_starts_at?: string | null;
  auction_ends_at?: string | null;
  auction_starting_bid?: number | null;
  auction_current_bid?: number | null;
  auction_bid_count?: number | null;
  auction_reserve_met_at?: string | null;
  auction_winner_id?: string | null;
  auction_payment_due_at?: string | null;
  reserve_fee_status?: string | null;
  created_at: string | null;
  listing_images: ListingImageRow[] | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
};

type SupabaseOrderRow = {
  total_amount?: number | null;
  card_price?: number | null;
};

type CardDetailResponse = {
  listing?: SupabaseListingRow;
  profile?: ProfileRow | null;
  order?: SupabaseOrderRow | null;
  error?: string;
};
type SavedItemStatusResponse = {
  saved?: boolean;
  error?: string;
};

type DetailSeller = {
  name: string;
  level: string;
  completedSales: number;
  responseTime: string;
  shipSpeed: string;
  rating: string;
  rewardsBadge: string;
  route: string;
};

const realListingAccent = "#334155";
const mockConversationStorageKey = "grail-mock-conversations";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrencyWithCents(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTimeRemaining(value?: string | null) {
  if (!value) {
    return "Ending time not set";
  }

  const remaining = new Date(value).getTime() - Date.now();

  if (remaining <= 0) {
    return "Auction ended";
  }

  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

  if (days > 0) {
    return `${days}d ${hours}h remaining`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }

  return `${Math.max(minutes, 1)}m remaining`;
}

function getBidIncrement(currentBid: number) {
  if (currentBid < 100) return 1;
  if (currentBid < 500) return 5;
  if (currentBid < 1000) return 10;
  if (currentBid < 5000) return 25;
  return 50;
}

function getMinimumNextBid(card: MockCard) {
  const currentBid = Number(card.auctionCurrentBid || 0);

  if (currentBid > 0) {
    return currentBid + getBidIncrement(currentBid);
  }

  return Math.max(Number(card.auctionStartingBid || 0), 0.99);
}

function getAuctionReserveStatus(card: MockCard) {
  const hasReserve = card.reserveFeeStatus && card.reserveFeeStatus !== "none";

  if (!hasReserve) {
    return "No Reserve";
  }

  return card.auctionReserveMetAt ? "Reserve Met" : "Reserve Not Met";
}

function readLocalMockConversations() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedConversations = window.localStorage.getItem(
      mockConversationStorageKey,
    );

    return storedConversations
      ? (JSON.parse(storedConversations) as MockConversation[])
      : [];
  } catch (error) {
    console.error("Mock conversation read error:", error);
    return [];
  }
}

function saveLocalMockConversation(conversation: MockConversation) {
  const conversations = readLocalMockConversations();
  window.localStorage.setItem(
    mockConversationStorageKey,
    JSON.stringify([conversation, ...conversations]),
  );
}

function createLocalMockConversation(
  card: MockCard,
  message: string,
): MockConversation {
  const now = Date.now();

  return {
    id: `mock-conversation-${now}`,
    participantName: card.seller,
    participantRole: card.sellerLevel || "Seller",
    person: card.seller,
    badge: card.sellerLevel || "Seller",
    cardId: card.id,
    cardTitle: card.title,
    cardRoute: card.href,
    cardHref: card.href,
    price: card.askingPrice || card.price || 0,
    snippet: message,
    lastSnippet: message,
    timestamp: "now",
    sortRank: now,
    unread: false,
    isActive: true,
    accent: card.accent,
    messages: [
      {
        id: `mock-message-${now}`,
        sender: "buyer",
        body: message,
        time: "Now",
      },
    ],
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message || "");
  }

  return String(error);
}

function logMessageSupabaseError({
  step,
  listingId,
  sellerId,
  buyerId,
  payload,
  error,
}: {
  step: string;
  listingId?: string | null;
  sellerId?: string | null;
  buyerId?: string | null;
  payload?: unknown;
  error: unknown;
}) {
  console.error("GRAIL message Supabase error:", {
    step,
    listingId,
    sellerId,
    buyerId,
    payload,
    error,
    message: getErrorMessage(error),
  });
}

function formatListedDate(value: string | null) {
  if (!value) {
    return "Recently";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getCategory(listing: SupabaseListingRow) {
  const source = `${listing.sport || ""} ${listing.card_type || ""}`.toLowerCase();

  return source.includes("tcg") ? "TCG" : "Sports";
}

function getConditionDisplay(listing: SupabaseListingRow) {
  if (listing.grader && listing.grade) {
    return `${listing.grader} ${listing.grade}`;
  }

  const condition = listing.condition?.trim();

  if (condition) {
    return condition.toLowerCase().includes("raw")
      ? condition
      : `Raw ${condition}`;
  }

  return listing.card_type?.toLowerCase() === "graded" ? "Graded" : "Raw";
}

function getSellerSlug(profile: ProfileRow | null, sellerId: string | null) {
  const username = profile?.username?.replace(/^@/, "").trim();

  if (username) {
    return encodeURIComponent(username);
  }

  return sellerId || "vault-runner";
}

function getPhotoView(imageType: string | null): PhotoView {
  const normalized = (imageType || "").toLowerCase().replace(/_/g, "-");

  if (normalized.includes("back")) return "Back";
  if (normalized.includes("top")) return "Top Corners";
  if (normalized.includes("bottom")) return "Bottom Corners";
  if (normalized.includes("surface")) return "Surface";
  if (normalized.includes("edge")) return "Edges";

  return "Front";
}

function getImageUrls(images: ListingImageRow[] | null) {
  const imageUrls: Partial<Record<PhotoView, string>> = {};

  (images || []).forEach((image) => {
    if (!image.image_url) {
      return;
    }

    const view = getPhotoView(image.image_type);
    imageUrls[view] = image.image_url;
  });

  if (!imageUrls.Front && images?.[0]?.image_url) {
    imageUrls.Front = images[0].image_url;
  }

  return imageUrls;
}

function mapSupabaseCard(
  listing: SupabaseListingRow,
  profile: ProfileRow | null,
  order: SupabaseOrderRow | null = null,
): { card: MockCard; seller: DetailSeller } {
  const category = getCategory(listing);
  const condition = getConditionDisplay(listing);
  const price = Number(listing.price || 0);
  const status = listing.status?.toLowerCase() || "";
  const isAuction = listing.sale_format === "auction";
  const isSold = isAuction
    ? status === "sold" && listing.auction_status === "paid"
    : status === "sold";
  const soldPrice = isSold
    ? Number(order?.card_price || order?.total_amount || listing.price || 0)
    : 0;
  const isCollectionOnly =
    !isSold &&
    status !== "active" &&
    (status === "collection" ||
      Boolean(listing.is_collection_card) ||
      Boolean(listing.is_public_collection));
  const displayPrice = isCollectionOnly ? 0 : isSold ? soldPrice : price;
  const offerBasis = price;
  const sportsCardsProEstimatedValue = listing.sportscardspro_estimated_value
    ? Number(listing.sportscardspro_estimated_value)
    : 0;
  const estimatedMarketValue = sportsCardsProEstimatedValue ||
    Number(listing.estimated_value || 0);
  const sellerSlug = getSellerSlug(profile, listing.seller_id);
  const sellerName = profile?.full_name || profile?.username || "GRAIL Seller";
  const isGraded = Boolean(listing.grader && listing.grade) ||
    listing.card_type?.toLowerCase() === "graded";
  const auctionCurrentBid = Number(listing.auction_current_bid || 0);
  const auctionStartingBid = Number(listing.auction_starting_bid || 0);
  const tag = isSold
    ? "Sold"
    : isAuction
      ? "Auction"
      : isCollectionOnly
        ? "Collection"
        : isGraded
          ? "Graded"
          : "Raw";
  const route = `/cards/${listing.id}`;
  const title =
    listing.title ||
    [listing.year, listing.brand, listing.player].filter(Boolean).join(" ") ||
    "Untitled Card";

  return {
    seller: {
      name: sellerName,
      level: "GRAIL Seller",
      completedSales: 0,
      responseTime: "Same day",
      shipSpeed: "2 business days",
      rating: "New seller",
      rewardsBadge: "Seller",
      route: `/collections/${sellerSlug}`,
    },
    card: {
      id: listing.id,
      route,
      href: route,
      title,
      category,
      conditionDisplay: condition,
      condition,
      subtitle: `${category}: ${condition}`,
      meta: `${category}: ${condition}`,
      sellerSlug,
      sellerId: listing.seller_id,
      sellerName,
      seller: sellerName,
      sellerLevel: "GRAIL Seller",
      sellerRoute: `/collections/${sellerSlug}`,
      sellerHref: `/collections/${sellerSlug}`,
      price: isAuction ? auctionCurrentBid || auctionStartingBid : displayPrice,
      priceDisplay: isSold
        ? soldPrice
          ? `Sold · ${formatCurrency(soldPrice)}`
          : "Sold"
        : isAuction
        ? auctionCurrentBid
          ? `Current Bid ${formatCurrencyWithCents(auctionCurrentBid)}`
          : `Starting Bid ${formatCurrencyWithCents(auctionStartingBid)}`
        : isCollectionOnly
        ? "Open to Offers"
        : price
          ? formatCurrency(price)
          : "Price not listed",
      askingPrice: isAuction ? auctionCurrentBid || auctionStartingBid : displayPrice,
      marketValue: estimatedMarketValue,
      minimumOffer: offerBasis ? Math.round(offerBasis * 0.85) : 0,
      minOffer: offerBasis ? Math.round(offerBasis * 0.85) : 0,
      watchCount: 0,
      views: 0,
      viewCount: 0,
      listedOrder: 0,
      listedDate: formatListedDate(listing.created_at),
      tags: [tag],
      tag,
      isGraded,
      isRaw: !isGraded,
      isHot: false,
      isGrail: false,
      isCollectionOnly,
      listingStatus: listing.status,
      soldPrice,
      accent: realListingAccent,
      artworkTone: "live listing",
      imageUrls: getImageUrls(listing.listing_images),
      cardDetailRoute: route,
      sellerCollectionRoute: `/collections/${sellerSlug}`,
      details: {
        year: listing.year || "Unknown",
        set: listing.brand || "Unknown",
        cardNumber: listing.card_number || "Unknown",
        subject: listing.player || "Unknown",
        grader: listing.grader || "Raw",
        grade: listing.grade || listing.condition || "Raw",
        certNumber:
          listing.psa_cert_number ||
          listing.cert_number ||
          "Not available",
        notes: "Live Supabase listing.",
      },
      psaVerified: Boolean(listing.psa_verified),
      psaCertNumber: listing.psa_cert_number || listing.cert_number,
      psaGrade: listing.psa_grade || listing.grade,
      psaCardName: listing.psa_card_name,
      psaVerifiedAt: listing.psa_verified_at,
      sportsCardsProId: listing.sportscardspro_id,
      sportsCardsProProductName: listing.sportscardspro_product_name,
      sportsCardsProSetName: listing.sportscardspro_set_name,
      sportsCardsProEstimatedValue: sportsCardsProEstimatedValue || null,
      sportsCardsProPriceField: listing.sportscardspro_price_field,
      sportsCardsProSourceUrl: listing.sportscardspro_source_url,
      sportsCardsProFetchedAt: listing.sportscardspro_fetched_at,
      saleFormat: isAuction ? "auction" : "fixed",
      auctionStatus: listing.auction_status,
      auctionStartsAt: listing.auction_starts_at,
      auctionEndsAt: listing.auction_ends_at,
      auctionStartingBid,
      auctionCurrentBid,
      auctionBidCount: listing.auction_bid_count || 0,
      auctionReserveMetAt: listing.auction_reserve_met_at,
      auctionWinnerId: listing.auction_winner_id,
      auctionPaymentDueAt: listing.auction_payment_due_at,
      reserveFeeStatus: listing.reserve_fee_status,
      priceHistory: {
        thirtyDay: "N/A",
        ninetyDay: "N/A",
        lastSale: 0,
        averageSale: 0,
        chartPoints: [],
      },
      overview: "Live Supabase listing from GRAIL Browse.",
    },
  };
}

function getMarketDifference(card: MockCard) {
  if (card.marketValue <= 0) {
    return "Market data pending";
  }

  const difference = card.askingPrice - card.marketValue;
  const percent = Math.round((Math.abs(difference) / card.marketValue) * 100);

  if (difference === 0) {
    return "At market value";
  }

  return difference > 0
    ? `+${percent}% above market`
    : `${percent}% below market`;
}

function CardArtwork({
  card,
  view,
}: {
  card: MockCard;
  view: (typeof photoViews)[number];
}) {
  const isRaw = card.isRaw || card.tag === "Raw";
  const isBack = view === "Back";
  const isTopCorners = view === "Top Corners";
  const isBottomCorners = view === "Bottom Corners";
  const isSurface = view === "Surface";
  const isEdges = view === "Edges";
  const imageUrl =
    card.imageUrls?.[view] ||
    (view !== "Front" ? card.imageUrls?.Front : undefined);
  const displayRank =
    view === "Front" || view === "Back" ? card.tag : "Inspect";

  return (
    <div className="card-stage">
      {imageUrl ? (
        <Image
          className="real-card-image"
          src={imageUrl}
          alt={`${card.title} ${view}`}
          width={320}
          height={460}
          unoptimized
        />
      ) : (
      <div className={`large-card ${isRaw ? "raw-card" : "slab-card"}`}>
        {!isRaw ? (
          <div className="slab-label">
            <span>{card.condition}</span>
            <span>{card.category}</span>
          </div>
        ) : null}

        <div
          className={`card-face ${isBack ? "card-back" : ""} ${
            isTopCorners ? "card-top-corners" : ""
          } ${isBottomCorners ? "card-bottom-corners" : ""} ${
            isSurface ? "card-surface" : ""
          } ${isEdges ? "card-edges" : ""}`}
          style={{
            background: isBack
              ? `linear-gradient(145deg, #101115, ${card.accent}77 48%, #030304)`
              : `radial-gradient(circle at 50% 22%, rgba(231,222,208,0.32), transparent 16%), radial-gradient(circle at 22% 75%, ${card.accent}77, transparent 30%), linear-gradient(145deg, ${card.accent}, #111827 54%, #030304)`,
          }}
        >
          <span className="card-category">{card.category}</span>
          <span className="card-rank">{displayRank}</span>
          <span className="card-orbit" />
          <span className="card-figure" />
          <span className="card-shine" />
          <span className="card-frame" />
          <span className="corner-marker corner-top-left" />
          <span className="corner-marker corner-top-right" />
          <span className="corner-marker corner-bottom-left" />
          <span className="corner-marker corner-bottom-right" />
          <span className="edge-marker edge-left" />
          <span className="edge-marker edge-right" />
          <span className="surface-marker" />
          <span className="card-title">
            {view === "Front" || view === "Back" ? card.title : view}
          </span>
          <span className="card-footer-line" />
        </div>

        <div className="card-strip">
          <span />
          <span />
          <span />
        </div>
      </div>
      )}
    </div>
  );
}

function PriceHistoryChart() {
  return (
    <svg
      className="price-chart"
      viewBox="0 0 520 160"
      role="img"
      aria-label="Mock price history chart"
    >
      <path
        className="chart-fill"
        d="M14 122 C56 112 70 82 114 92 C154 101 172 58 216 66 C260 74 278 112 318 92 C362 70 384 42 424 54 C466 66 484 38 506 28 L506 142 L14 142 Z"
      />
      <path
        className="chart-line"
        d="M14 122 C56 112 70 82 114 92 C154 101 172 58 216 66 C260 74 278 112 318 92 C362 70 384 42 424 54 C466 66 484 38 506 28"
      />
      <g className="chart-grid" aria-hidden="true">
        <path d="M14 42 H506" />
        <path d="M14 82 H506" />
        <path d="M14 122 H506" />
      </g>
    </svg>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function CardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const cardId = String(params.id || "");
  const mockCard = getMockListingById(cardId) as MockCard | undefined;
  const [realCard, setRealCard] = useState<MockCard | null>(null);
  const [realSeller, setRealSeller] = useState<DetailSeller | null>(null);
  const [isLoadingRealCard, setIsLoadingRealCard] = useState(!mockCard);
  const [currentUserId, setCurrentUserId] = useState("");
  const [selectedPhoto, setSelectedPhoto] =
    useState<PhotoView>("Front");
  const [isWatching, setIsWatching] = useState(false);
  const [isUpdatingWatch, setIsUpdatingWatch] = useState(false);
  const [watchMessage, setWatchMessage] = useState("");
  const [isOfferOpen, setIsOfferOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [offerError, setOfferError] = useState("");
  const [sentOfferAmount, setSentOfferAmount] = useState<number | null>(null);
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [messageBody, setMessageBody] = useState("");
  const [messageError, setMessageError] = useState("");
  const [messageSuccessHref, setMessageSuccessHref] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason | "">("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportError, setReportError] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [bidAmount, setBidAmount] = useState("");
  const [bidStatus, setBidStatus] = useState<PublishStatus | null>(null);
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [isStartingAuctionCheckout, setIsStartingAuctionCheckout] = useState(false);
  const [highestBidState, setHighestBidState] = useState({
    listingId: "",
    isHighest: false,
  });
  const [ownerActionStatus, setOwnerActionStatus] = useState("");
  const [auctionClockMs, setAuctionClockMs] = useState(() => new Date().getTime());
  const card = mockCard ?? realCard;
  const availablePhotoViews: PhotoView[] = card?.imageUrls
    ? photoViews.filter((view) => Boolean(card.imageUrls?.[view]))
    : [...photoViews];
  const visiblePhotoViews: PhotoView[] =
    availablePhotoViews.length > 0 ? availablePhotoViews : ["Front"];
  const activePhoto = visiblePhotoViews.includes(selectedPhoto)
    ? selectedPhoto
    : visiblePhotoViews[0];
  const auctionCardId = card?.saleFormat === "auction" ? card.id : "";
  const isCurrentUserHighestBidder = Boolean(
    auctionCardId &&
      highestBidState.listingId === auctionCardId &&
      highestBidState.isHighest,
  );

  useEffect(() => {
    if (!auctionCardId) {
      return;
    }

    const timer = window.setInterval(() => {
      setAuctionClockMs(new Date().getTime());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [auctionCardId]);

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/browse");
  }

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (isMounted) {
        setCurrentUserId(session?.user.id || "");
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user.id || "");
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadRealCard() {
      if (mockCard || !cardId) {
        setIsLoadingRealCard(false);
        return;
      }

      setIsLoadingRealCard(true);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const response = await fetch(`/api/cards/${encodeURIComponent(cardId)}`, {
          headers: session?.access_token
            ? { authorization: `Bearer ${session.access_token}` }
            : undefined,
        });
        const payload = (await response.json()) as CardDetailResponse;

        if (!response.ok) {
          if (response.status !== 404) {
            throw new Error(payload.error || "Card could not be loaded.");
          }

          if (isMounted) {
            setRealCard(null);
            setRealSeller(null);
          }
          return;
        }

        const listing = payload.listing;

        if (!listing) {
          if (isMounted) {
            setRealCard(null);
            setRealSeller(null);
          }
          return;
        }

        const listingStatus = listing.status?.toLowerCase();

        if (listingStatus === "deleted" || listingStatus === "inactive") {
          if (isMounted) {
            setRealCard(null);
            setRealSeller(null);
          }
          return;
        }

        const mapped = mapSupabaseCard(
          listing,
          payload.profile || null,
          payload.order || null,
        );

        if (isMounted) {
          setRealCard(mapped.card);
          setRealSeller(mapped.seller);
        }
      } catch (error) {
        console.error("Card detail listing fetch error:", error);

        if (isMounted) {
          setRealCard(null);
          setRealSeller(null);
        }
      } finally {
        if (isMounted) {
          setIsLoadingRealCard(false);
        }
      }
    }

    loadRealCard();

    return () => {
      isMounted = false;
    };
  }, [cardId, mockCard]);

  useEffect(() => {
    let isMounted = true;

    async function loadSavedState() {
      if (mockCard || !cardId || !currentUserId) {
        if (isMounted && !currentUserId) {
          setIsWatching(false);
        }
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          if (isMounted) {
            setIsWatching(false);
          }
          return;
        }

        const response = await fetch(
          `/api/saved-items?itemType=listing&listingId=${encodeURIComponent(cardId)}`,
          {
            cache: "no-store",
            headers: {
              authorization: `Bearer ${session.access_token}`,
            },
          },
        );
        const payload = (await response.json()) as SavedItemStatusResponse;

        if (!response.ok) {
          throw new Error(payload.error || "Saved state could not be loaded.");
        }

        if (isMounted) {
          setIsWatching(Boolean(payload.saved));
          setWatchMessage("");
        }
      } catch (error) {
        console.error("Card detail saved state error:", error);

        if (isMounted) {
          setWatchMessage("Saved state could not be loaded.");
        }
      }
    }

    void loadSavedState();

    return () => {
      isMounted = false;
    };
  }, [cardId, currentUserId, mockCard]);

  useEffect(() => {
    if (!auctionCardId) {
      return;
    }

    let isMounted = true;
    let refreshTimer: ReturnType<typeof setInterval> | null = null;

    async function refreshAuctionStatus() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const headers: HeadersInit = session?.access_token
          ? { authorization: `Bearer ${session.access_token}` }
          : {};
        const response = await fetch(`/api/auctions/${auctionCardId}`, {
          headers,
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          auctionStatus?: string | null;
          endsAt?: string | null;
          currentBid?: number;
          bidCount?: number;
          reserveStatus?: string;
          winnerId?: string | null;
          paymentDueAt?: string | null;
          isCurrentUserHighestBidder?: boolean;
        };

        if (!isMounted) {
          return;
        }

        setHighestBidState({
          listingId: auctionCardId,
          isHighest: Boolean(payload.isCurrentUserHighestBidder),
        });
        setRealCard((current) => {
          if (!current || current.id !== auctionCardId) {
            return current;
          }

          const currentBid = Number(payload.currentBid || 0);
          const displayBid = currentBid || Number(current.auctionStartingBid || 0);

          return {
            ...current,
            auctionStatus: payload.auctionStatus ?? current.auctionStatus,
            auctionEndsAt: payload.endsAt ?? current.auctionEndsAt,
            auctionCurrentBid: currentBid,
            auctionBidCount: payload.bidCount ?? current.auctionBidCount,
            auctionReserveMetAt:
              payload.reserveStatus === "Reserve Met"
                ? current.auctionReserveMetAt || new Date().toISOString()
                : null,
            auctionWinnerId: payload.winnerId ?? current.auctionWinnerId,
            auctionPaymentDueAt:
              payload.paymentDueAt ?? current.auctionPaymentDueAt,
            price: displayBid,
            askingPrice: displayBid,
            priceDisplay: currentBid
              ? `Current Bid ${formatCurrencyWithCents(currentBid)}`
              : `Starting Bid ${formatCurrencyWithCents(current.auctionStartingBid || 0)}`,
          };
        });
      } catch (error) {
        console.error("Card detail auction status refresh error:", error);
      }
    }

    refreshAuctionStatus();
    refreshTimer = setInterval(refreshAuctionStatus, 15000);

    return () => {
      isMounted = false;
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
    };
  }, [auctionCardId, currentUserId]);

  function goToPhoto(direction: "previous" | "next") {
    setSelectedPhoto((current) => {
      const currentIndex = Math.max(0, visiblePhotoViews.indexOf(current));
      const nextIndex =
        direction === "next"
          ? (currentIndex + 1) % visiblePhotoViews.length
          : (currentIndex - 1 + visiblePhotoViews.length) %
            visiblePhotoViews.length;

      return visiblePhotoViews[nextIndex];
    });
  }

  async function toggleSavedItem() {
    if (!card) {
      return;
    }

    if (mockCard) {
      setIsWatching((current) => !current);
      setWatchMessage("Demo cards are not saved to your real watchlist.");
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setWatchMessage("Sign in to save this card.");
      return;
    }

    setIsUpdatingWatch(true);
    setWatchMessage("");

    try {
      const response = await fetch(
        isWatching
          ? `/api/saved-items?listingId=${encodeURIComponent(card.id)}`
          : "/api/saved-items",
        {
          method: isWatching ? "DELETE" : "POST",
          headers: {
            authorization: `Bearer ${session.access_token}`,
            ...(isWatching ? {} : { "content-type": "application/json" }),
          },
          body: isWatching
            ? undefined
            : JSON.stringify({
                itemType: "listing",
                listingId: card.id,
              }),
        },
      );
      const payload = (await response.json()) as SavedItemStatusResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Watchlist could not be updated.");
      }

      setIsWatching(!isWatching);
      setWatchMessage(isWatching ? "Removed from watched cards." : "Saved to watched cards.");
    } catch (error) {
      console.error("Card detail watchlist update error:", error);
      setWatchMessage(error instanceof Error ? error.message : "Watchlist could not be updated.");
    } finally {
      setIsUpdatingWatch(false);
    }
  }

  async function submitOffer() {
    if (!card) {
      return;
    }

    const amount = Number(offerAmount);

    if (!amount || amount < card.minOffer) {
      setOfferError("Offer is below the seller's minimum.");
      setSentOfferAmount(null);
      return;
    }

    if (mockCard) {
      setOfferError("Offers can be submitted on live listings only.");
      setSentOfferAmount(null);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user.id) {
      setOfferError("Sign in to make an offer.");
      setSentOfferAmount(null);
      return;
    }

    if (card.sellerId === session.user.id) {
      setOfferError("You cannot make an offer on your own listing.");
      setSentOfferAmount(null);
      return;
    }

    if (!card.sellerId) {
      setOfferError("Seller was not found for this listing.");
      setSentOfferAmount(null);
      return;
    }

    setIsSubmittingOffer(true);
    setOfferError("");

    try {
      const response = await fetch("/api/offers", {
        method: "POST",
        headers: {
          authorization: `Bearer ${session.access_token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          listingId: card.id,
          amount,
          message: offerMessage.trim(),
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Offer could not be sent.");
      }

      setSentOfferAmount(amount);
    } catch (error) {
      console.error("Card detail offer submit error:", error);
      setOfferError(error instanceof Error ? error.message : "Offer could not be sent.");
      setSentOfferAmount(null);
    } finally {
      setIsSubmittingOffer(false);
    }
  }

  function openMessageModal() {
    setIsMessageOpen(true);
    setMessageBody("");
    setMessageError("");
    setMessageSuccessHref("");
  }

  function closeMessageModal() {
    setIsMessageOpen(false);
    setMessageBody("");
    setMessageError("");
    setMessageSuccessHref("");
    setIsSendingMessage(false);
  }

  function openReportModal() {
    setIsReportOpen(true);
    setReportReason("");
    setReportDetails("");
    setReportError("");
    setReportSuccess(false);
  }

  function closeReportModal() {
    setIsReportOpen(false);
    setReportReason("");
    setReportDetails("");
    setReportError("");
    setReportSuccess(false);
    setIsSubmittingReport(false);
  }

  async function submitReport() {
    if (!card) {
      return;
    }

    if (!reportReason) {
      setReportError("Choose a report reason.");
      return;
    }

    if (mockCard) {
      setReportError("Reports can be submitted for live listings only.");
      return;
    }

    setIsSubmittingReport(true);
    setReportError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: HeadersInit = {
        "content-type": "application/json",
      };

      if (session?.access_token) {
        headers.authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch("/api/reports", {
        method: "POST",
        headers,
        body: JSON.stringify({
          listingId: card.id,
          reason: reportReason,
          details: reportDetails.trim(),
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Report could not be submitted.");
      }

      setReportSuccess(true);
      setReportDetails("");
    } catch (error) {
      console.error("Listing report submit error:", error);
      setReportError(
        error instanceof Error ? error.message : "Report could not be submitted.",
      );
      setReportSuccess(false);
    } finally {
      setIsSubmittingReport(false);
    }
  }

  async function placeBid() {
    if (!card || card.saleFormat !== "auction") {
      return;
    }

    const amount = Number(bidAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setBidStatus({ type: "error", text: "Enter a valid bid amount." });
      return;
    }

    const minimumBid = getMinimumNextBid(card);

    if (amount < minimumBid) {
      setBidStatus({
        type: "error",
        text: `Minimum next bid is ${formatCurrencyWithCents(minimumBid)}.`,
      });
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setBidStatus({ type: "error", text: "Sign in to place a bid." });
      return;
    }

    if (card.sellerId === session.user.id) {
      setBidStatus({ type: "error", text: "You cannot bid on your own auction." });
      return;
    }

    if (isCurrentUserHighestBidder) {
      setBidStatus({ type: "info", text: "You currently have the highest bid." });
      return;
    }

    setIsPlacingBid(true);
    setBidStatus(null);

    try {
      const response = await fetch(`/api/auctions/${card.id}/bid`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${session.access_token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ amount }),
      });
      const payload = (await response.json()) as {
        currentBid?: number;
        bidCount?: number;
        reserveStatus?: string;
        isCurrentUserHighestBidder?: boolean;
        currentUserBidState?: string;
        error?: string;
      };

      if (!response.ok) {
        if (payload.isCurrentUserHighestBidder || payload.currentUserBidState === "highest") {
          setHighestBidState({ listingId: card.id, isHighest: true });
        }
        throw new Error(payload.error || "Bid could not be placed.");
      }

      setRealCard((current) =>
        current
          ? {
              ...current,
              auctionCurrentBid: payload.currentBid || amount,
              auctionBidCount: payload.bidCount ?? current.auctionBidCount,
              auctionReserveMetAt:
                payload.reserveStatus === "Reserve Met"
                  ? new Date().toISOString()
                  : current.auctionReserveMetAt,
              price: payload.currentBid || amount,
              askingPrice: payload.currentBid || amount,
              priceDisplay: `Current Bid ${formatCurrencyWithCents(
                payload.currentBid || amount,
              )}`,
            }
          : current,
      );
      setBidAmount("");
      setHighestBidState({
        listingId: card.id,
        isHighest: Boolean(payload.isCurrentUserHighestBidder),
      });
      setBidStatus({ type: "success", text: "Bid placed." });
    } catch (error) {
      console.error("Card detail auction bid error:", error);
      setBidStatus({
        type: "error",
        text: error instanceof Error ? error.message : "Bid could not be placed.",
      });
    } finally {
      setIsPlacingBid(false);
    }
  }

  async function startAuctionCheckout() {
    if (!card || card.saleFormat !== "auction") {
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setBidStatus({ type: "error", text: "Sign in to pay for this auction." });
      return;
    }

    setIsStartingAuctionCheckout(true);
    setBidStatus(null);

    try {
      const response = await fetch(`/api/auctions/${card.id}/checkout`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${session.access_token}`,
        },
      });
      const payload = (await response.json()) as { url?: string; error?: string; detail?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.detail || payload.error || "Auction checkout could not be started.");
      }

      window.location.href = payload.url;
    } catch (error) {
      console.error("Card detail auction checkout error:", error);
      setBidStatus({
        type: "error",
        text: error instanceof Error ? error.message : "Auction checkout could not be started.",
      });
      setIsStartingAuctionCheckout(false);
    }
  }

  async function submitMessage() {
    if (!card) {
      return;
    }

    const body = messageBody.trim();

    if (!body) {
      setMessageError("Write a message before sending.");
      return;
    }

    if (mockCard) {
      const conversation = createLocalMockConversation(card, body);
      saveLocalMockConversation(conversation);
      setMessageError("");
      setMessageSuccessHref(`/messages?mockConversation=${conversation.id}`);
      return;
    }

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      logMessageSupabaseError({
        step: "card detail message auth session",
        listingId: card.id,
        sellerId: card.sellerId,
        buyerId: null,
        error: sessionError,
      });
      setMessageError("Message could not be sent. Check console for Supabase error.");
      return;
    }

    if (!session?.user.id) {
      setMessageError("Sign in to message seller.");
      return;
    }

    if (card.sellerId === session.user.id) {
      setMessageError("You cannot message yourself about your own listing.");
      return;
    }

    if (!card.sellerId) {
      setMessageError("Message could not be sent. Check console for Supabase error.");
      console.error("Card detail message setup error:", {
        step: "card detail message missing seller id",
        reason: "Missing seller_id on listing.",
        listingId: card.id,
        sellerId: card.sellerId,
        buyerId: session.user.id,
      });
      return;
    }

    setIsSendingMessage(true);
    setMessageError("");

    try {
      const messagePayload = {
        sender_id: session.user.id,
        receiver_id: card.sellerId,
        listing_id: card.id,
        body,
      };
      const { error: messageInsertError } = await supabase
        .from("messages")
        .insert(messagePayload);

      if (messageInsertError) {
        logMessageSupabaseError({
          step: "card detail message insert",
          listingId: card.id,
          sellerId: card.sellerId,
          buyerId: session.user.id,
          payload: messagePayload,
          error: messageInsertError,
        });
        throw messageInsertError;
      }

      setMessageSuccessHref(
        `/messages?listing=${encodeURIComponent(card.id)}&seller=${encodeURIComponent(
          card.sellerId,
        )}`,
      );
    } catch (error) {
      logMessageSupabaseError({
        step: "card detail message flow catch",
        listingId: card.id,
        sellerId: card.sellerId,
        buyerId: session.user.id,
        error,
      });
      setMessageError("Message could not be sent. Check console for Supabase error.");
      setMessageSuccessHref("");
    } finally {
      setIsSendingMessage(false);
    }
  }

  async function deleteCardFromCollection() {
    if (!card || mockCard) {
      setOwnerActionStatus("Collection management is mock-only for demo cards.");
      return;
    }

    const shouldDelete = window.confirm(
      "Delete this card from your collection?\nThis removes it from Browse and your public collection.",
    );

    if (!shouldDelete) {
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user.id || card.sellerId !== session.user.id) {
      setOwnerActionStatus("You do not have permission to update this card.");
      return;
    }

    const { error } = await supabase
      .from("listings")
      .update({
        status: "deleted",
        is_public_collection: false,
      })
      .eq("id", card.id)
      .eq("seller_id", session.user.id);

    if (error) {
      console.error("Card detail delete from collection error:", error);
      setOwnerActionStatus("Card could not be deleted from collection.");
      return;
    }

    setOwnerActionStatus("Card deleted from collection.");
  }

  if (isLoadingRealCard) {
    return (
      <main className="detail-page">
        <style>{pageStyles}</style>
        <div className="detail-shell">
          <Header />
          <section className="not-found panel">
            <p>Loading card...</p>
            <h1>Loading listing details.</h1>
          </section>
        </div>
      </main>
    );
  }

  if (!card) {
    return (
      <main className="detail-page">
        <style>{pageStyles}</style>
        <div className="detail-shell">
          <Header />
          <section className="not-found panel">
            <p>Card not found</p>
            <h1>This mock listing is not available.</h1>
            <Link href="/browse">Return to Browse</Link>
          </section>
        </div>
      </main>
    );
  }

  const mockSeller = mockCard ? getMockSellerBySlug(card.sellerSlug) : null;
  const seller = mockSeller
    ? {
        name: mockSeller.name,
        level: mockSeller.level,
        completedSales: mockSeller.completedSales,
        responseTime: mockSeller.responseTime,
        shipSpeed: mockSeller.shipSpeed,
        rating: mockSeller.rating,
        rewardsBadge: mockSeller.rewardsBadge,
        route: mockSeller.route,
      }
    : realSeller;
  const marketDifference = getMarketDifference(card);
  const isOwnerListing = Boolean(currentUserId) && card.sellerId === currentUserId;
  const isCollectionOnly = Boolean(
    card.isCollectionOnly ||
      card.tag === "Collection" ||
      card.listingStatus?.toLowerCase() === "collection",
  );
  const isAuction = card.saleFormat === "auction";
  const auctionCurrentBid = Number(card.auctionCurrentBid || 0);
  const auctionStartingBid = Number(card.auctionStartingBid || 0);
  const auctionDisplayPrice = auctionCurrentBid || auctionStartingBid;
  const minimumNextBid = isAuction ? getMinimumNextBid(card) : 0;
  const auctionReserveStatus = isAuction ? getAuctionReserveStatus(card) : "";
  const isAuctionAwaitingPayment = card.auctionStatus === "awaiting_payment";
  const isAuctionFinalizing =
    isAuction &&
    (card.auctionStatus === "finalizing" ||
      (card.auctionStatus === "active" &&
        Boolean(card.auctionEndsAt) &&
        new Date(card.auctionEndsAt || 0).getTime() <= auctionClockMs));
  const isAuctionOpenForBids =
    isAuction &&
    card.auctionStatus === "active" &&
    Boolean(card.auctionEndsAt) &&
    new Date(card.auctionEndsAt || 0).getTime() > auctionClockMs;
  const isAuctionWinner =
    Boolean(currentUserId) && card.auctionWinnerId === currentUserId;
  const listingStatusLower = card.listingStatus?.toLowerCase() || "";
  const isPaidAuctionSale =
    isAuction && listingStatusLower === "sold" && card.auctionStatus === "paid";
  const isSold = isAuction
    ? isPaidAuctionSale
    : card.tag === "Sold" || listingStatusLower === "sold";
  const soldPrice = card.soldPrice || card.askingPrice || card.price;
  const soldPriceDisplay = soldPrice > 0
    ? `Sold · ${formatCurrency(soldPrice)}`
    : "Sold";
  const auctionPanelStatus = isAuction
    ? isAuctionFinalizing
      ? "Finalizing Auction"
      : card.auctionStatus === "active"
      ? "Auction"
      : card.auctionStatus === "awaiting_payment"
        ? "Payment Pending"
        : card.auctionStatus === "ended_reserve_not_met"
          ? "Reserve Not Met"
          : card.auctionStatus === "payment_expired"
            ? "Payment Expired"
            : card.auctionStatus === "paid"
              ? "Sold"
              : "Auction Ended"
    : "";
  const auctionEndedMessage =
    isAuctionFinalizing
      ? "Finalizing Auction. GRAIL is confirming the winning bid."
      : card.auctionStatus === "awaiting_payment"
      ? isAuctionWinner
        ? "You won this auction. Complete payment to finish the order."
        : "Auction ended. Awaiting winner payment."
      : card.auctionStatus === "ended_reserve_not_met"
        ? "Auction Ended — Reserve Not Met."
        : card.auctionStatus === "payment_expired"
          ? "Auction payment window expired."
          : "Auction Ended.";
  const auctionSummaryText =
    isAuctionOpenForBids
      ? `${formatTimeRemaining(card.auctionEndsAt)} · ${auctionReserveStatus} · ${
          card.auctionBidCount || 0
        } bids`
      : `${auctionEndedMessage} · ${auctionReserveStatus} · ${
          card.auctionBidCount || 0
        } bids`;
  const hasSportsCardsProValue = Boolean(
    card.sportsCardsProEstimatedValue && card.sportsCardsProEstimatedValue > 0,
  );
  const salePriceDisplay = isSold
    ? soldPriceDisplay
    : isAuction
    ? auctionCurrentBid
      ? `Current Bid ${formatCurrencyWithCents(auctionCurrentBid)}`
      : `Starting Bid ${formatCurrencyWithCents(auctionStartingBid)}`
    : isCollectionOnly
    ? "Open to Offers"
    : formatCurrency(card.askingPrice);
  const minimumOfferDisplay = card.minOffer > 0
    ? formatCurrency(card.minOffer)
    : "Any offer";

  return (
    <main className="detail-page">
      <style>{pageStyles}</style>
      <div className="detail-shell">
        <Header />

        <div className="top-link-row">
          <button type="button" onClick={goBack}>← Back</button>
        </div>

        <section className="detail-layout">
          <div className="left-column">
            <section className="photo-panel panel">
              <div className="main-photo-frame">
                <button
                  type="button"
                  className={`watch-button ${isWatching ? "active" : ""}`}
                  aria-pressed={isWatching}
                  aria-label={isWatching ? "Remove from watched cards" : "Watch card"}
                  title={isWatching ? "Remove from watched cards" : "Watch card"}
                  onClick={toggleSavedItem}
                  disabled={isUpdatingWatch}
                >
                  {isWatching ? "♥" : "♡"}
                </button>

                <button
                  type="button"
                  className="viewer-arrow viewer-arrow-left"
                  aria-label="Previous image"
                  onClick={() => goToPhoto("previous")}
                >
                  ‹
                </button>

                <CardArtwork card={card} view={activePhoto} />

                <button
                  type="button"
                  className="viewer-arrow viewer-arrow-right"
                  aria-label="Next image"
                  onClick={() => goToPhoto("next")}
                >
                  ›
                </button>
              </div>

              {watchMessage ? <p className="watch-status">{watchMessage}</p> : null}

              <div className="thumbnail-row" aria-label="Card photos">
                {visiblePhotoViews.map((view) => (
                  <button
                    key={view}
                    type="button"
                    className={activePhoto === view ? "active" : ""}
                    onClick={() => setSelectedPhoto(view)}
                  >
                    <span>{view}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="details-panel panel">
              <div className="title-block">
                <span className={`listing-tag tag-${card.tag.toLowerCase()}`}>
                  {card.tag === "Grail" ? "✦ " : ""}
                  {card.tag}
                </span>
                <h1>{card.title}</h1>
                <p>
                  {card.category}: {card.condition}
                </p>
              </div>

              <div className="stat-grid">
                <DetailRow label="Market Value" value={formatCurrency(card.marketValue)} />
                <DetailRow
                  label={
                    isSold
                      ? "Sale Status"
                      : isAuction
                        ? "Auction"
                        : isCollectionOnly
                          ? "Collection Status"
                          : "Asking Price"
                  }
                  value={
                    isSold
                      ? salePriceDisplay
                      : isAuction
                        ? salePriceDisplay
                        : isCollectionOnly
                          ? "In Collection"
                          : salePriceDisplay
                  }
                />
                <DetailRow label="Watch Count" value={String(card.watchCount)} />
                <DetailRow label="View Count" value={String(card.viewCount)} />
                <DetailRow label="Listed Date" value={card.listedDate} />
                <DetailRow label="Listing Tag" value={card.tag} />
              </div>
            </section>
          </div>

          <aside className="right-column">
            <section className="purchase-panel panel">
              <span>
                {isSold
                  ? "Sold"
                  : isAuction
                    ? auctionPanelStatus
                    : isCollectionOnly
                      ? "In Collection"
                      : "Asking Price"}
              </span>
              <strong>{salePriceDisplay}</strong>
              {isSold ? (
                <p>This card has sold. Card details and images remain available for reference.</p>
              ) : isAuction ? (
                <p>{auctionSummaryText}</p>
              ) : isCollectionOnly ? (
                <p>
                  This card is in the seller&apos;s collection. The seller is
                  open to offers and messages.
                </p>
              ) : (
                <p>
                  Market value {formatCurrency(card.marketValue)} ·{" "}
                  <em>{marketDifference}</em>
                </p>
              )}
              {hasSportsCardsProValue ? (
                <p className="market-data-note">
                  Estimated market value provided by{" "}
                  <Link
                    href={card.sportsCardsProSourceUrl || "https://www.sportscardspro.com"}
                    target="_blank"
                    rel="noreferrer"
                  >
                    SportsCardsPro
                  </Link>
                  .
                </p>
              ) : (
                <p className="market-data-note">
                  Market data integration planned: Card Ladder / Sports Card
                  Investor style price tracking.
                </p>
              )}

              <div className="purchase-trust-panel">
                <span>GRAIL Protected Checkout</span>
                <ul>
                  <li>Protected checkout</li>
                  <li>3-day inspection window after delivery</li>
                  <li>Report suspicious listings</li>
                  <li>Contact support if there is an issue</li>
                </ul>
                <div>
                  <Link href="/buyer-protection">Buyer Protection</Link>
                  <Link href="/refund-dispute-policy">Disputes</Link>
                  <Link href="/contact-support">Support</Link>
                </div>
              </div>

              {isOwnerListing ? (
                <>
                  <p className="owner-note">This is your listing.</p>
                  <div className="purchase-buttons">
                    {isSold ? (
                      <Link href="/seller-dashboard">
                        View in Seller Dashboard
                      </Link>
                    ) : isAuction ? (
                      <>
                        {card.auctionStatus === "payment_expired" ? (
                          <>
                            <Link className="buy-button" href={`/list?edit=${card.id}`}>
                              Relist Auction
                            </Link>
                            <Link href={`/list?edit=${card.id}`}>Sell Fixed Price</Link>
                            <Link href={`/cards/${card.id}`}>Keep in Collection</Link>
                          </>
                        ) : (
                          <>
                            <Link className="buy-button" href="/seller-dashboard">
                              Manage Auction
                            </Link>
                            <Link href={`/cards/${card.id}`}>View Auction</Link>
                          </>
                        )}
                      </>
                    ) : isCollectionOnly ? (
                      <>
                        <Link className="buy-button" href={`/list?edit=${card.id}`}>
                          Edit Card
                        </Link>
                        <Link href={`/list?edit=${card.id}`}>List For Sale</Link>
                        <button type="button" onClick={deleteCardFromCollection}>
                          Delete From Collection
                        </button>
                      </>
                    ) : (
                      <>
                        <Link className="buy-button" href={`/list?edit=${card.id}`}>
                          Edit Listing
                        </Link>
                        <Link href="/seller-dashboard">
                          View in Seller Dashboard
                        </Link>
                        <Link href={`/cards/${card.id}`}>
                          View Public Listing
                        </Link>
                      </>
                    )}
                  </div>
                  {ownerActionStatus ? (
                    <p className="owner-note">{ownerActionStatus}</p>
                  ) : null}
                </>
              ) : (
                <>
                  {isAuction ? (
                    <div className="auction-bid-panel">
                      <div className="auction-detail-grid">
                        <span>
                          Current bid{" "}
                          <strong>{formatCurrencyWithCents(auctionDisplayPrice)}</strong>
                        </span>
                        <span>
                          Minimum next bid{" "}
                          <strong>{formatCurrencyWithCents(minimumNextBid)}</strong>
                        </span>
                        <span>
                          Ends <strong>{formatDateTime(card.auctionEndsAt)}</strong>
                        </span>
                        <span>
                          Reserve <strong>{auctionReserveStatus}</strong>
                        </span>
                      </div>
                      {isAuctionAwaitingPayment && isAuctionWinner ? (
                        <button
                          type="button"
                          className="buy-button"
                          disabled={isStartingAuctionCheckout}
                          onClick={() => void startAuctionCheckout()}
                        >
                          {isStartingAuctionCheckout ? "Opening Checkout..." : "Complete Payment"}
                        </button>
                      ) : isAuctionOpenForBids ? (
                        <>
                          <label className="auction-bid-field">
                            <span>Your bid</span>
                            <input
                              value={bidAmount}
                              inputMode="decimal"
                              placeholder={formatCurrencyWithCents(minimumNextBid)}
                              disabled={isCurrentUserHighestBidder}
                              onChange={(event) => setBidAmount(event.target.value)}
                            />
                          </label>
                          {isCurrentUserHighestBidder ? (
                            <p className="offer-note">
                              You currently have the highest bid.
                            </p>
                          ) : null}
                          <button
                            type="button"
                            className="buy-button"
                            disabled={isPlacingBid || isCurrentUserHighestBidder}
                            onClick={() => void placeBid()}
                          >
                            {isPlacingBid ? "Placing Bid..." : "Place Bid"}
                          </button>
                        </>
                      ) : (
                        <p className="offer-note">{auctionEndedMessage}</p>
                      )}
                      {bidStatus ? (
                        <p className={`bid-status ${bidStatus.type}`}>{bidStatus.text}</p>
                      ) : null}
                      <button type="button" onClick={openMessageModal}>
                        Message Seller
                      </button>
                    </div>
                  ) : (
                    <div className="purchase-buttons">
                      {!isCollectionOnly && !isSold ? (
                        <Link className="buy-button" href={`/checkout/${card.id}`}>
                          Buy Now
                        </Link>
                      ) : null}
                      {!isSold ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIsOfferOpen(true);
                            setOfferAmount("");
                            setOfferMessage("");
                            setOfferError("");
                            setSentOfferAmount(null);
                          }}
                        >
                          Make Offer
                        </button>
                      ) : null}
                      <button type="button" onClick={openMessageModal}>
                        Message Seller
                      </button>
                    </div>
                  )}

                  {!isSold && !isAuction ? (
                    <p className="offer-note">
                      Minimum offer: {minimumOfferDisplay}
                    </p>
                  ) : isSold ? (
                    <p className="offer-note">This card has sold.</p>
                  ) : null}
                </>
              )}
            </section>

            <section className="seller-panel panel">
              <div className="seller-header">
                <span className="seller-avatar">{(seller?.name ?? card.sellerName).slice(0, 1)}</span>
                <div>
                  <h2>{(seller?.name ?? card.sellerName)}</h2>
                  <p>{(seller?.level ?? card.sellerLevel)}</p>
                </div>
              </div>

              <div className="seller-stats">
                <DetailRow label="Completed Sales" value={`${(seller?.completedSales ?? 0)}`} />
                <DetailRow label="Response Time" value={(seller?.responseTime ?? "Same day")} />
                <DetailRow label="Ship Speed" value={(seller?.shipSpeed ?? "2 business days")} />
                <DetailRow label="Rating" value={(seller?.rating ?? "New seller")} />
              </div>

              <span className="seller-badge">{(seller?.rewardsBadge ?? "Seller")}</span>
              <Link className="seller-link" href={(seller?.route ?? card.sellerRoute)}>
                View Seller Collection
              </Link>
            </section>

            <section className="trust-panel panel">
              <h2>Buyer Protection</h2>
              <ul>
                <li>Secure payments through Stripe</li>
                <li>Real card photos expected</li>
                <li>Dispute support if something is wrong</li>
                <li>Seller payout protection after delivery and inspection</li>
              </ul>
              <button type="button" className="report-listing-button" onClick={openReportModal}>
                Report Listing
              </button>
            </section>
          </aside>
        </section>

        <section className="bottom-panels">
          <article className="panel content-panel">
            <h2>Overview</h2>
            <p>{card.overview}</p>
          </article>

          <article className="panel content-panel">
            <h2>Card Details</h2>
            {card.psaCertNumber ? (
              <div className="psa-certified-panel">
                <strong>
                  {card.psaVerified
                    ? "✅ PSA Certified"
                    : "Unable to verify PSA certification."}
                </strong>
                <div className="detail-list">
                  <DetailRow label="PSA Cert" value={card.psaCertNumber} />
                  <DetailRow
                    label="Grade"
                    value={card.psaGrade || card.details.grade}
                  />
                  {card.psaVerified ? (
                    <DetailRow
                      label="Verification"
                      value="Certification verified through PSA."
                    />
                  ) : null}
                </div>
                <Link
                  className="psa-link"
                  href={`https://www.psacard.com/cert/${encodeURIComponent(card.psaCertNumber)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on PSA
                </Link>
              </div>
            ) : null}
            <div className="detail-list">
              <DetailRow label="Year" value={card.details.year} />
              <DetailRow label="Set" value={card.details.set} />
              <DetailRow label="Card Number" value={card.details.cardNumber} />
              <DetailRow label="Player/Character" value={card.details.subject} />
              <DetailRow label="Grader" value={card.details.grader} />
              <DetailRow label="Grade" value={card.details.grade} />
              <DetailRow label="Cert Number" value={card.details.certNumber} />
              <DetailRow label="Condition Notes" value={card.details.notes} />
            </div>
          </article>

          {hasSportsCardsProValue ? (
            <article className="panel content-panel sportspro-panel">
              <h2>Estimated Market Value</h2>
              <strong>{formatCurrency(card.sportsCardsProEstimatedValue || 0)}</strong>
              <p>Estimated market value provided by SportsCardsPro.</p>
              <p>
                Market estimates may vary by parallel, grade, condition, and
                recent sales.
              </p>
              <div className="sportspro-meta">
                <DetailRow
                  label="Source"
                  value={card.sportsCardsProProductName || "SportsCardsPro"}
                />
                <DetailRow
                  label="Last Updated"
                  value={
                    card.sportsCardsProFetchedAt
                      ? new Date(card.sportsCardsProFetchedAt).toLocaleDateString()
                      : "Recently"
                  }
                />
              </div>
              <Link
                className="sportspro-link"
                href={card.sportsCardsProSourceUrl || "https://www.sportscardspro.com"}
                target="_blank"
                rel="noreferrer"
              >
                Source: SportsCardsPro
              </Link>
            </article>
          ) : null}

          <article className="panel content-panel price-history-panel">
            <h2>Price History</h2>
            <PriceHistoryChart />
            <div className="history-grid">
              <DetailRow label="30D" value={card.priceHistory.thirtyDay} />
              <DetailRow label="90D" value={card.priceHistory.ninetyDay} />
              <DetailRow
                label="Last Sale"
                value={formatCurrency(card.priceHistory.lastSale)}
              />
              <DetailRow
                label="Average Sale"
                value={formatCurrency(card.priceHistory.averageSale)}
              />
            </div>
          </article>

          <article className="panel content-panel">
            <h2>Shipping & Returns</h2>
            <div className="detail-list">
              <DetailRow label="Handling" value="Ships in 1-2 business days" />
              <DetailRow label="Shipping" value="Tracked shipping" />
              <DetailRow label="Returns" value="Returns policy placeholder" />
            </div>
          </article>
        </section>
      </div>

      {isOfferOpen ? (
        <div className="offer-modal-backdrop" role="presentation">
          <section
            className="offer-modal panel"
            role="dialog"
            aria-modal="true"
            aria-label="Make offer"
          >
            <div className="offer-modal-header">
              <div>
                <span>Make Offer</span>
                <h2>{card.title}</h2>
              </div>
              <button
                type="button"
                aria-label="Close offer modal"
                onClick={() => setIsOfferOpen(false)}
              >
                x
              </button>
            </div>

            <div className="offer-summary-grid">
              <DetailRow label="Sale Status" value={salePriceDisplay} />
              <DetailRow label="Market Value" value={formatCurrency(card.marketValue)} />
              <DetailRow label="Minimum Offer" value={minimumOfferDisplay} />
            </div>

            <label className="offer-field">
              <span>Your offer</span>
              <input
                type="number"
                min="0"
                value={offerAmount}
                onChange={(event) => setOfferAmount(event.target.value)}
                placeholder="Enter offer amount"
              />
            </label>

            <label className="offer-field">
              <span>Add a message to seller</span>
              <textarea
                value={offerMessage}
                onChange={(event) => setOfferMessage(event.target.value)}
                placeholder="Optional message"
              />
            </label>

            <p className="offer-helper">
              Offers below the seller&apos;s minimum may not be accepted.
            </p>

            {offerError ? <p className="offer-error">{offerError}</p> : null}

            {sentOfferAmount ? (
              <div className="offer-confirmation">
                <strong>Offer sent to seller.</strong>
                <p>Offer amount: {formatCurrency(sentOfferAmount)}</p>
                <p>Status: Pending</p>
                <p>Seller has 24 hours to respond.</p>
              </div>
            ) : null}

            {!sentOfferAmount ? (
              <div className="offer-modal-actions">
                <button
                  type="button"
                  className="buy-button"
                  disabled={isSubmittingOffer}
                  onClick={submitOffer}
                >
                  {isSubmittingOffer ? "Sending..." : "Submit Offer"}
                </button>
                <button type="button" onClick={() => setIsOfferOpen(false)}>
                  Cancel
                </button>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {isMessageOpen ? (
        <div className="offer-modal-backdrop" role="presentation">
          <section
            className="offer-modal panel"
            role="dialog"
            aria-modal="true"
            aria-label="Message seller"
          >
            <div className="offer-modal-header">
              <div>
                <span>Message Seller</span>
                <h2>{card.title}</h2>
              </div>
              <button
                type="button"
                aria-label="Close message modal"
                onClick={closeMessageModal}
              >
                x
              </button>
            </div>

            <div className="message-modal-preview">
              <CardArtwork card={card} view={activePhoto} />
              <div>
                <span>Seller</span>
                <strong>{card.seller}</strong>
                <p>{card.meta}</p>
              </div>
            </div>

            {!messageSuccessHref ? (
              <label className="offer-field">
                <span>Write a message...</span>
                <textarea
                  value={messageBody}
                  onChange={(event) => setMessageBody(event.target.value)}
                  placeholder="Ask about condition, shipping, or availability."
                />
              </label>
            ) : null}

            {messageError ? <p className="offer-error">{messageError}</p> : null}

            {messageSuccessHref ? (
              <div className="offer-confirmation">
                <strong>Message sent.</strong>
                <p>Your conversation is ready.</p>
              </div>
            ) : null}

            {messageSuccessHref ? (
              <div className="offer-modal-actions single-action">
                <Link className="buy-button" href={messageSuccessHref}>
                  Open Conversation
                </Link>
              </div>
            ) : (
              <div className="offer-modal-actions">
                <button
                  type="button"
                  className="buy-button"
                  disabled={isSendingMessage}
                  onClick={submitMessage}
                >
                  {isSendingMessage ? "Sending..." : "Send Message"}
                </button>
                <button type="button" onClick={closeMessageModal}>
                  Cancel
                </button>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {isReportOpen ? (
        <div className="offer-modal-backdrop" role="presentation">
          <section
            className="offer-modal panel"
            role="dialog"
            aria-modal="true"
            aria-label="Report listing"
          >
            <div className="offer-modal-header">
              <div>
                <span>Report Listing</span>
                <h2>{card.title}</h2>
              </div>
              <button
                type="button"
                aria-label="Close report modal"
                onClick={closeReportModal}
              >
                x
              </button>
            </div>

            <p className="offer-helper">
              Reports go to GRAIL admin review. Include specific details if
              something looks counterfeit, unsafe, or inaccurate.
            </p>

            {!reportSuccess ? (
              <>
                <label className="offer-field">
                  <span>Reason</span>
                  <select
                    value={reportReason}
                    onChange={(event) =>
                      setReportReason(event.target.value as ReportReason | "")
                    }
                  >
                    <option value="">Choose a reason</option>
                    {reportReasons.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="offer-field">
                  <span>Optional details</span>
                  <textarea
                    value={reportDetails}
                    onChange={(event) => setReportDetails(event.target.value)}
                    placeholder="Add details for GRAIL admin review."
                  />
                </label>
              </>
            ) : null}

            {reportError ? <p className="offer-error">{reportError}</p> : null}

            {reportSuccess ? (
              <div className="offer-confirmation">
                <strong>Report submitted.</strong>
                <p>GRAIL admin will review this listing.</p>
              </div>
            ) : null}

            {!reportSuccess ? (
              <div className="offer-modal-actions">
                <button
                  type="button"
                  className="buy-button"
                  disabled={isSubmittingReport}
                  onClick={submitReport}
                >
                  {isSubmittingReport ? "Submitting..." : "Submit Report"}
                </button>
                <button type="button" onClick={closeReportModal}>
                  Cancel
                </button>
              </div>
            ) : (
              <div className="offer-modal-actions single-action">
                <button type="button" className="buy-button" onClick={closeReportModal}>
                  Done
                </button>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </main>
  );
}

const pageStyles = `
  .detail-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at 50% -120px, rgba(201,205,211,0.08), transparent 32%),
      linear-gradient(180deg, #000 0%, #030304 58%, #000 100%);
    color: #fafafa;
    font-family: Arial, Helvetica, sans-serif;
  }

  .detail-shell {
    width: min(1240px, calc(100vw - 32px));
    margin: 0 auto;
    padding: 8px 0 38px;
  }

  .panel {
    border: 1px solid #1d1d22;
    border-radius: 12px;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.006)),
      rgba(5,5,6,0.92);
    box-shadow: 0 18px 44px rgba(0,0,0,0.28);
  }

  .top-link-row {
    margin: 18px 0 14px;
  }

  .top-link-row button,
  .not-found a,
  .seller-link {
    border: 0;
    background: transparent;
    color: #E7DED0;
    font-size: 13px;
    font-weight: 900;
    text-decoration: none;
    cursor: pointer;
    padding: 0;
  }

  .top-link-row button:hover,
  .seller-link:hover,
  .not-found a:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .detail-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 344px;
    gap: 18px;
    align-items: start;
  }

  .left-column {
    display: grid;
    gap: 16px;
  }

  .right-column {
    display: grid;
    gap: 14px;
    position: sticky;
    top: 16px;
  }

  .photo-panel,
  .details-panel,
  .purchase-panel,
  .seller-panel,
  .trust-panel,
  .content-panel {
    padding: 16px;
  }

  .main-photo-frame {
    position: relative;
    min-height: 560px;
    border: 1px solid #202026;
    border-radius: 12px;
    background:
      radial-gradient(circle at 50% 18%, rgba(231,222,208,0.12), transparent 44%),
      #030304;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .watch-button {
    position: absolute;
    top: 14px;
    right: 14px;
    z-index: 5;
    width: 40px;
    height: 40px;
    border: 1px solid rgba(231,222,208,0.28);
    border-radius: 999px;
    background:
      radial-gradient(circle at 50% 0%, rgba(255,255,255,0.14), transparent 50%),
      rgba(8,8,10,0.82);
    color: #E7DED0;
    padding: 0;
    font-size: 22px;
    line-height: 1;
    font-weight: 900;
    cursor: pointer;
    backdrop-filter: blur(12px);
    transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease, transform 160ms ease;
  }

  .watch-button:hover,
  .watch-button.active {
    border-color: rgba(231,222,208,0.64);
    background: rgba(231,222,208,0.12);
    color: #fff;
    box-shadow: 0 0 20px rgba(201,205,211,0.18);
  }

  .watch-button.active {
    transform: translateY(-1px);
  }

  .watch-button:disabled {
    cursor: wait;
    opacity: 0.68;
  }

  .watch-status {
    margin: 10px 0 0;
    color: #C9CDD3;
    font-size: 12px;
    line-height: 16px;
    font-weight: 800;
  }

  .viewer-arrow {
    position: absolute;
    top: 50%;
    z-index: 5;
    width: 44px;
    height: 44px;
    border: 1px solid rgba(231,222,208,0.24);
    border-radius: 999px;
    background:
      radial-gradient(circle at 50% 15%, rgba(255,255,255,0.16), transparent 44%),
      rgba(8,8,10,0.82);
    color: #E7DED0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 30px;
    line-height: 1;
    font-weight: 600;
    cursor: pointer;
    transform: translateY(-50%);
    backdrop-filter: blur(12px);
    transition: border-color 160ms ease, box-shadow 160ms ease, color 160ms ease, transform 160ms ease;
  }

  .viewer-arrow:hover {
    border-color: rgba(231,222,208,0.64);
    color: #fff;
    box-shadow: 0 0 20px rgba(201,205,211,0.18);
    transform: translateY(-50%) scale(1.04);
  }

  .viewer-arrow-left {
    left: 14px;
  }

  .viewer-arrow-right {
    right: 14px;
  }

  .card-stage {
    width: 360px;
    height: 500px;
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    background:
      radial-gradient(circle at 50% 40%, rgba(255,255,255,0.08), transparent 44%),
      rgba(255,255,255,0.015);
    box-shadow: inset 0 0 46px rgba(255,255,255,0.035);
  }

  .real-card-image {
    max-width: calc(100% - 34px);
    max-height: calc(100% - 34px);
    width: auto;
    height: auto;
    border-radius: 14px;
    object-fit: contain;
    box-shadow: 0 28px 70px rgba(0,0,0,0.66);
  }

  .large-card {
    width: 270px;
    height: 410px;
    border: 1px solid rgba(244,244,245,0.48);
    border-radius: 18px;
    background: linear-gradient(180deg, #eeeeef 0%, #fafafa 15%, #d7d7da 16%, #f8fafc 17%, #1f1f23 100%);
    box-shadow: 0 28px 70px rgba(0,0,0,0.66);
    padding: 14px;
    box-sizing: border-box;
  }

  .raw-card {
    background:
      linear-gradient(180deg, rgba(255,255,255,0.78), rgba(230,232,235,0.92) 7%, #15171b 8%, #050506 100%);
    border-color: rgba(231,222,208,0.52);
  }

  .slab-label {
    height: 52px;
    border-radius: 9px;
    background: #f8fafc;
    color: #111827;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 0 10px;
    box-sizing: border-box;
    font-size: 12px;
    line-height: 14px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .card-face {
    height: 292px;
    margin-top: 12px;
    border: 1px solid rgba(255,255,255,0.26);
    border-radius: 12px;
    position: relative;
    overflow: hidden;
  }

  .raw-card .card-face {
    height: 348px;
    margin-top: 0;
  }

  .card-category,
  .card-rank,
  .card-title {
    position: absolute;
    z-index: 3;
    color: #fff;
    font-weight: 900;
    text-transform: uppercase;
    text-shadow: 0 2px 10px rgba(0,0,0,0.64);
  }

  .card-category {
    left: 14px;
    top: 14px;
    font-size: 12px;
    letter-spacing: 0.08em;
  }

  .card-rank {
    right: 14px;
    top: 14px;
    font-size: 12px;
  }

  .card-title {
    left: 16px;
    right: 16px;
    bottom: 42px;
    font-size: 18px;
    line-height: 22px;
  }

  .card-orbit {
    position: absolute;
    left: 48px;
    top: 64px;
    width: 150px;
    height: 150px;
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 50%;
    transform: rotate(-18deg);
  }

  .card-figure {
    position: absolute;
    left: 108px;
    top: 94px;
    width: 60px;
    height: 130px;
    border-radius: 999px 999px 22px 22px;
    background: linear-gradient(180deg, rgba(255,255,255,0.88), rgba(201,205,211,0.58));
    transform: skew(-8deg);
    box-shadow: 0 0 26px rgba(255,255,255,0.18);
  }

  .card-shine {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(115deg, transparent 0 30%, rgba(255,255,255,0.2) 36%, transparent 44% 100%),
      radial-gradient(circle at 72% 28%, rgba(255,255,255,0.22), transparent 22%);
    mix-blend-mode: screen;
    opacity: 0.76;
  }

  .card-frame {
    position: absolute;
    inset: 20px;
    border: 1px solid rgba(255,255,255,0.18);
    border-radius: 10px;
    box-shadow: inset 0 0 26px rgba(0,0,0,0.3);
  }

  .card-footer-line {
    position: absolute;
    left: 18px;
    right: 18px;
    bottom: 24px;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(231,222,208,0.54), transparent);
  }

  .card-back .card-figure,
  .card-top-corners .card-figure,
  .card-bottom-corners .card-figure,
  .card-surface .card-figure,
  .card-edges .card-figure {
    display: none;
  }

  .card-back .card-title {
    bottom: auto;
    top: 112px;
    text-align: center;
  }

  .card-top-corners .card-frame,
  .card-bottom-corners .card-frame,
  .card-surface .card-frame,
  .card-edges .card-frame {
    inset: 34px;
    border-width: 2px;
  }

  .corner-marker,
  .edge-marker,
  .surface-marker {
    position: absolute;
    z-index: 4;
    display: none;
    border: 2px solid rgba(231,222,208,0.78);
    box-shadow: 0 0 18px rgba(201,205,211,0.22);
  }

  .corner-marker {
    width: 38px;
    height: 38px;
  }

  .corner-top-left {
    left: 22px;
    top: 22px;
    border-right: 0;
    border-bottom: 0;
    border-radius: 8px 0 0 0;
  }

  .corner-top-right {
    right: 22px;
    top: 22px;
    border-left: 0;
    border-bottom: 0;
    border-radius: 0 8px 0 0;
  }

  .corner-bottom-left {
    left: 22px;
    bottom: 22px;
    border-right: 0;
    border-top: 0;
    border-radius: 0 0 0 8px;
  }

  .corner-bottom-right {
    right: 22px;
    bottom: 22px;
    border-left: 0;
    border-top: 0;
    border-radius: 0 0 8px 0;
  }

  .card-top-corners .corner-top-left,
  .card-top-corners .corner-top-right,
  .card-bottom-corners .corner-bottom-left,
  .card-bottom-corners .corner-bottom-right {
    display: block;
  }

  .edge-marker {
    top: 42px;
    bottom: 42px;
    width: 1px;
    border-width: 0 0 0 2px;
  }

  .edge-left {
    left: 24px;
  }

  .edge-right {
    right: 24px;
  }

  .card-edges .edge-marker {
    display: block;
  }

  .surface-marker {
    left: 42px;
    right: 42px;
    top: 74px;
    height: 90px;
    border-radius: 999px;
    background: radial-gradient(circle at 50% 50%, rgba(231,222,208,0.12), transparent 70%);
  }

  .card-surface .surface-marker {
    display: block;
  }

  .card-top-corners .card-title,
  .card-bottom-corners .card-title,
  .card-surface .card-title,
  .card-edges .card-title {
    bottom: auto;
    top: 120px;
    text-align: center;
  }

  .card-strip {
    height: 10px;
    margin-top: 12px;
    display: flex;
    gap: 6px;
  }

  .card-strip span {
    flex: 1;
    border-radius: 999px;
    background: linear-gradient(90deg, rgba(201,205,211,0.28), rgba(231,222,208,0.72), rgba(201,205,211,0.28));
  }

  .thumbnail-row {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 10px;
  }

  .thumbnail-row button {
    height: 62px;
    border: 1px solid #202026;
    border-radius: 10px;
    background: rgba(8,8,10,0.82);
    color: #C9CDD3;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
  }

  .thumbnail-row button.active,
  .thumbnail-row button:hover {
    border-color: rgba(231,222,208,0.68);
    background: rgba(231,222,208,0.08);
    color: #fff;
    box-shadow: 0 0 20px rgba(201,205,211,0.16);
  }

  .title-block h1 {
    margin: 12px 0 0;
    color: #fff;
    font-size: 36px;
    line-height: 40px;
    font-weight: 900;
    letter-spacing: 0;
  }

  .title-block p {
    margin: 8px 0 0;
    color: #a1a1aa;
    font-size: 14px;
    line-height: 20px;
    font-weight: 800;
  }

  .listing-tag {
    min-height: 24px;
    border: 1px solid rgba(201,205,211,0.34);
    border-radius: 999px;
    background: rgba(201,205,211,0.06);
    color: #E7DED0;
    padding: 0 10px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 10px;
    line-height: 12px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .tag-hot {
    border-color: rgba(244,63,94,0.3);
    background: rgba(244,63,94,0.085);
    color: #fb7185;
  }

  .tag-raw {
    border-color: rgba(45,212,191,0.22);
    background: rgba(45,212,191,0.055);
    color: #99f6e4;
  }

  .tag-grail {
    border-color: rgba(231,222,208,0.66);
    background:
      radial-gradient(circle at 50% 0%, rgba(255,255,255,0.24), transparent 55%),
      linear-gradient(180deg, rgba(231,222,208,0.16), rgba(201,205,211,0.05));
    color: #fff;
    box-shadow: 0 0 22px rgba(201,205,211,0.2);
  }

  .tag-sold {
    border-color: rgba(244,63,94,0.34);
    background: rgba(244,63,94,0.09);
    color: #fecdd3;
    box-shadow: 0 0 18px rgba(244,63,94,0.08);
  }

  .tag-auction {
    border-color: rgba(231,222,208,0.52);
    background: rgba(231,222,208,0.095);
    color: #E7DED0;
    box-shadow: 0 0 18px rgba(201,205,211,0.12);
  }

  .stat-grid,
  .history-grid {
    margin-top: 16px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .detail-row {
    min-height: 58px;
    border: 1px solid #202026;
    border-radius: 10px;
    background: rgba(8,8,10,0.76);
    padding: 10px;
    box-sizing: border-box;
  }

  .detail-row span {
    display: block;
    color: #85858f;
    font-size: 10px;
    line-height: 13px;
    font-weight: 800;
  }

  .detail-row strong {
    display: block;
    margin-top: 6px;
    color: #fff;
    font-size: 13px;
    line-height: 17px;
    font-weight: 900;
  }

  .purchase-panel strong {
    display: block;
    margin-top: 7px;
    color: #fff;
    font-size: 38px;
    line-height: 42px;
    font-weight: 900;
  }

  .purchase-panel > span,
  .purchase-panel p,
  .offer-note {
    color: #a1a1aa;
    font-size: 13px;
    line-height: 18px;
    font-weight: 800;
  }

  .owner-note {
    margin: 13px 0 0;
    border: 1px solid rgba(201,205,211,0.18);
    border-radius: 10px;
    background: rgba(201,205,211,0.06);
    color: #C9CDD3;
    padding: 10px;
    font-size: 12px;
    line-height: 16px;
    font-weight: 900;
  }

  .purchase-panel p em {
    color: #34d399;
    font-style: normal;
    font-weight: 900;
  }

  .market-data-note {
    margin: 10px 0 0;
    border: 1px solid rgba(201,205,211,0.14);
    border-radius: 9px;
    background: rgba(201,205,211,0.045);
    padding: 9px 10px;
    color: #C9CDD3;
    font-size: 11px;
    line-height: 16px;
  }

  .market-data-note a {
    color: #E7DED0;
    font-weight: 900;
    text-decoration: none;
  }

  .market-data-note a:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .purchase-buttons {
    margin-top: 16px;
    display: grid;
    gap: 10px;
  }

  .auction-bid-panel {
    margin-top: 16px;
    display: grid;
    gap: 10px;
  }

  .auction-detail-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .auction-detail-grid span {
    border: 1px solid rgba(201,205,211,0.14);
    border-radius: 9px;
    background: rgba(201,205,211,0.045);
    color: #a1a1aa;
    padding: 9px;
    font-size: 11px;
    line-height: 15px;
    font-weight: 800;
  }

  .auction-detail-grid strong {
    margin-top: 4px;
    color: #fff;
    font-size: 12px;
    line-height: 16px;
  }

  .auction-bid-field {
    display: grid;
    gap: 7px;
  }

  .auction-bid-field span {
    color: #C9CDD3;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .auction-bid-field input {
    border: 1px solid #24242a;
    border-radius: 10px;
    background: #08080a;
    color: #fff;
    min-height: 42px;
    padding: 0 12px;
    font: inherit;
    font-size: 13px;
    font-weight: 800;
    outline: none;
  }

  .bid-status {
    margin: 0;
    border: 1px solid rgba(201,205,211,0.18);
    border-radius: 9px;
    background: rgba(201,205,211,0.055);
    padding: 9px;
  }

  .bid-status.success {
    color: #E7DED0;
  }

  .bid-status.error {
    color: #fca5a5;
  }

  .purchase-buttons button,
  .purchase-buttons a,
  .auction-bid-panel button,
  .offer-modal-actions button,
  .offer-modal-actions a {
    height: 44px;
    border: 1px solid rgba(231,222,208,0.28);
    border-radius: 10px;
    background: rgba(231,222,208,0.055);
    color: #fff;
    font-size: 13px;
    font-weight: 900;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
  }

  .purchase-buttons .buy-button {
    background: #E7DED0;
    color: #111;
  }

  .auction-bid-panel .buy-button {
    background: #E7DED0;
    color: #111;
  }

  .purchase-buttons button:hover,
  .purchase-buttons a:hover,
  .auction-bid-panel button:hover,
  .offer-modal-actions button:hover {
    border-color: rgba(231,222,208,0.62);
    box-shadow: 0 0 20px rgba(201,205,211,0.14);
  }

  .action-status {
    margin: 12px 0 0;
    border: 1px solid rgba(231,222,208,0.18);
    border-radius: 9px;
    background: rgba(231,222,208,0.06);
    color: #E7DED0;
    padding: 9px 10px;
    font-size: 12px;
    line-height: 16px;
    font-weight: 900;
  }

  .offer-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 80;
    background: rgba(0,0,0,0.72);
    backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  .offer-modal {
    width: min(560px, 100%);
    padding: 18px;
  }

  .offer-modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
  }

  .offer-modal-header span {
    color: #C9CDD3;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .offer-modal-header h2 {
    margin: 7px 0 0;
    color: #fff;
    font-size: 26px;
    line-height: 30px;
    font-weight: 900;
  }

  .offer-modal-header button {
    width: 34px;
    height: 34px;
    border: 1px solid rgba(231,222,208,0.22);
    border-radius: 999px;
    background: rgba(231,222,208,0.055);
    color: #E7DED0;
    cursor: pointer;
    font-weight: 900;
  }

  .offer-summary-grid {
    margin-top: 16px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .message-modal-preview {
    margin-top: 16px;
    border: 1px solid #202026;
    border-radius: 12px;
    background: rgba(8,8,10,0.76);
    padding: 12px;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 12px;
    align-items: center;
  }

  .message-modal-preview .card-stage {
    width: 80px;
    height: 112px;
    border-radius: 10px;
  }

  .message-modal-preview .large-card {
    width: 58px;
    height: 88px;
    border-radius: 8px;
    padding: 4px;
  }

  .message-modal-preview .real-card-image {
    max-width: calc(100% - 10px);
    max-height: calc(100% - 10px);
    border-radius: 7px;
  }

  .message-modal-preview span {
    color: #C9CDD3;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .message-modal-preview strong {
    display: block;
    margin-top: 5px;
    color: #fff;
    font-size: 15px;
    line-height: 20px;
    font-weight: 900;
  }

  .message-modal-preview p {
    margin: 4px 0 0;
    color: #a1a1aa;
    font-size: 12px;
    line-height: 16px;
    font-weight: 800;
  }

  .offer-field {
    margin-top: 14px;
    display: grid;
    gap: 7px;
  }

  .offer-field span {
    color: #C9CDD3;
    font-size: 12px;
    line-height: 15px;
    font-weight: 900;
  }

  .offer-field input,
  .offer-field select,
  .offer-field textarea {
    width: 100%;
    border: 1px solid #24242a;
    border-radius: 10px;
    background: #08080a;
    color: #fff;
    padding: 12px;
    box-sizing: border-box;
    font: inherit;
    font-size: 13px;
    font-weight: 800;
    outline: none;
  }

  .offer-field select {
    min-height: 43px;
  }

  .offer-field textarea {
    min-height: 92px;
    resize: vertical;
  }

  .offer-helper,
  .offer-error,
  .offer-confirmation p {
    margin: 10px 0 0;
    color: #a1a1aa;
    font-size: 12px;
    line-height: 17px;
    font-weight: 800;
  }

  .offer-error {
    color: #fb7185;
  }

  .offer-confirmation {
    margin-top: 14px;
    border: 1px solid rgba(52,211,153,0.24);
    border-radius: 10px;
    background: rgba(52,211,153,0.07);
    padding: 12px;
  }

  .offer-confirmation strong {
    color: #86efac;
    font-size: 13px;
    line-height: 17px;
    font-weight: 900;
  }

  .offer-modal-actions {
    margin-top: 16px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .offer-modal-actions.single-action {
    grid-template-columns: 1fr;
  }

  .offer-modal-actions .buy-button {
    background: #E7DED0;
    color: #111;
  }

  .offer-note {
    margin: 13px 0 0;
  }

  .purchase-trust-panel {
    margin-top: 14px;
    border: 1px solid rgba(201,205,211,0.16);
    border-radius: 10px;
    background: rgba(201,205,211,0.045);
    padding: 12px;
  }

  .purchase-trust-panel > span {
    color: #E7DED0;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .purchase-trust-panel ul {
    margin: 10px 0 0;
    padding: 0;
    list-style: none;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 7px;
  }

  .purchase-trust-panel li {
    color: #C9CDD3;
    font-size: 11px;
    line-height: 15px;
    font-weight: 800;
  }

  .purchase-trust-panel div {
    margin-top: 10px;
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }

  .purchase-trust-panel a {
    min-height: 28px;
    border: 1px solid rgba(231,222,208,0.22);
    border-radius: 8px;
    background: rgba(231,222,208,0.055);
    color: #E7DED0;
    padding: 0 9px;
    display: inline-flex;
    align-items: center;
    text-decoration: none;
    font-size: 10px;
    line-height: 12px;
    font-weight: 900;
  }

  .seller-header {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .seller-avatar {
    width: 40px;
    height: 40px;
    border-radius: 999px;
    border: 1px solid rgba(201,205,211,0.24);
    background: linear-gradient(135deg, #1f2937, #050506);
    color: #E7DED0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 900;
  }

  .seller-header h2,
  .trust-panel h2,
  .content-panel h2 {
    margin: 0;
    color: #fff;
    font-size: 14px;
    line-height: 18px;
    font-weight: 900;
  }

  .seller-header p {
    margin: 3px 0 0;
    color: #a1a1aa;
    font-size: 12px;
    line-height: 15px;
    font-weight: 800;
  }

  .seller-stats,
  .detail-list {
    margin-top: 14px;
    display: grid;
    gap: 8px;
  }

  .psa-certified-panel {
    margin-top: 14px;
    border: 1px solid rgba(231,222,208,0.2);
    border-radius: 10px;
    background: rgba(231,222,208,0.055);
    padding: 12px;
  }

  .psa-certified-panel > strong {
    display: block;
    color: #fff;
    font-size: 13px;
    line-height: 17px;
    font-weight: 900;
  }

  .psa-link {
    margin-top: 12px;
    min-height: 34px;
    border: 1px solid rgba(231,222,208,0.28);
    border-radius: 8px;
    background: rgba(8,8,10,0.58);
    color: #E7DED0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 10px;
    text-decoration: none;
    font-size: 12px;
    font-weight: 900;
  }

  .sportspro-panel > strong {
    display: block;
    margin-top: 12px;
    color: #fff;
    font-size: 28px;
    line-height: 32px;
    font-weight: 900;
  }

  .sportspro-panel p {
    margin: 8px 0 0;
    color: #a1a1aa;
    font-size: 12px;
    line-height: 17px;
    font-weight: 800;
  }

  .sportspro-meta {
    margin-top: 12px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .sportspro-link {
    margin-top: 12px;
    min-height: 34px;
    border: 1px solid rgba(231,222,208,0.28);
    border-radius: 8px;
    background: rgba(8,8,10,0.58);
    color: #E7DED0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 10px;
    text-decoration: none;
    font-size: 12px;
    font-weight: 900;
  }

  .seller-badge {
    margin-top: 12px;
    border: 1px solid rgba(74,222,128,0.22);
    border-radius: 999px;
    color: #86efac;
    background: rgba(74,222,128,0.06);
    padding: 6px 9px;
    font-size: 10px;
    font-weight: 900;
    display: inline-flex;
  }

  .seller-link {
    display: block;
    margin-top: 12px;
  }

  .trust-panel ul {
    margin: 12px 0 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 8px;
  }

  .trust-panel li {
    color: #C9CDD3;
    font-size: 12px;
    line-height: 16px;
    font-weight: 800;
  }

  .report-listing-button {
    width: 100%;
    margin-top: 14px;
    border: 1px solid rgba(231,222,208,0.2);
    border-radius: 10px;
    background: rgba(231,222,208,0.045);
    color: #E7DED0;
    padding: 11px 12px;
    font-size: 12px;
    line-height: 16px;
    font-weight: 900;
    cursor: pointer;
  }

  .report-listing-button:hover {
    border-color: rgba(231,222,208,0.46);
    box-shadow: 0 0 18px rgba(201,205,211,0.12);
  }

  .bottom-panels {
    margin-top: 18px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  .content-panel p {
    margin: 12px 0 0;
    color: #C9CDD3;
    font-size: 13px;
    line-height: 20px;
    font-weight: 800;
  }

  .price-chart {
    width: 100%;
    height: 150px;
    margin-top: 12px;
    display: block;
  }

  .chart-fill {
    fill: rgba(52,211,153,0.1);
  }

  .chart-line {
    fill: none;
    stroke: #34d399;
    stroke-width: 4;
    stroke-linecap: round;
    stroke-linejoin: round;
    filter: drop-shadow(0 0 8px rgba(52,211,153,0.24));
  }

  .chart-grid path {
    stroke: rgba(201,205,211,0.08);
    stroke-width: 1;
  }

  .not-found {
    margin-top: 30px;
    padding: 44px;
    text-align: center;
  }

  .not-found p {
    margin: 0;
    color: #C9CDD3;
    font-size: 12px;
    line-height: 16px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .not-found h1 {
    margin: 12px 0 22px;
    color: #fff;
    font-size: 36px;
    line-height: 42px;
    font-weight: 900;
  }

  @media (max-width: 1100px) {
    .detail-shell {
      width: calc(100vw - 32px);
    }

    .detail-layout,
    .bottom-panels,
    .stat-grid,
    .history-grid {
      grid-template-columns: 1fr;
    }

    .right-column {
      position: static;
    }

    .main-photo-frame {
      min-height: 480px;
    }
  }
`;
