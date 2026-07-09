"use client";

import Link from "next/link";
import Image from "next/image";
import type { Dispatch, SetStateAction } from "react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Header from "../components/Header";
import {
  type MockConversation,
  type MockListing,
  getListingTag,
} from "../lib/mockData";

type BrowseListing = MockListing & {
  imageUrl?: string | null;
  sellerId?: string | null;
  createdAt?: string | null;
  sportsCardsProEstimatedValue?: number | null;
  sportsCardsProSourceUrl?: string | null;
  valueBadge?: ListingValueBadge | null;
  source: "supabase" | "mock";
};

type BrowseSortMode =
  | "newest"
  | "hot"
  | "best-value"
  | "closest-to-market"
  | "highest-premium"
  | "price-low-high"
  | "price-high-low";

type ListingValueClass = "value" | "fair" | "premium";

type ListingValueBadge = {
  classification: ListingValueClass;
  label: "VALUE" | "FAIR" | "PREMIUM";
  icon: "↓" | "≈" | "↑";
  percentageDifference: number;
  title: string;
};

type LocalMockOffer = {
  id: string;
  listing_id: string;
  cardTitle: string;
  buyerName: string;
  sellerName: string;
  amount: number;
  askingPrice: number;
  message: string;
  status: "pending";
  createdAt: string;
  cardRoute: string;
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
  sportscardspro_source_url?: string | null;
  listing_images: ListingImageRow[] | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
};

type OrderRow = {
  id: string;
  total_amount: number | null;
  card_price: number | null;
  status: string | null;
  created_at: string | null;
  completed_at?: string | null;
};

type BrowseMarketSnapshot = {
  activeListings: number;
  newThisWeek: number;
  averageListPrice: number;
  completedSales: number | null;
  marketplaceVolume: number | null;
};

type FeaturedSeller = {
  sellerId: string;
  name: string;
  initials: string;
  route: string;
  listingCount: number;
  latestListedAt: string | null;
};

const mockOfferStorageKey = "grail-mock-offers";
const mockConversationStorageKey = "grail-mock-conversations";

const realListingAccents = [
  "#E7DED0",
  "#C9CDD3",
  "#B7A682",
  "#f5f5f5",
  "#8D949D",
  "#E7DED0",
  "#C9CDD3",
  "#B7A682",
];

const categoryFilters = [
  "Sports Cards",
  "TCG Cards",
  "Slabs",
  "Raw Cards",
  "Grail Cards",
];

const priceFilters = [
  "Under $25",
  "$25–$50",
  "$50–$100",
  "$100–$250",
  "$250–$500",
  "$500–$1,000",
  "$1,000–$2,500",
  "$2,500–$5,000",
  "$5,000+",
];

const gradeCompanies = ["PSA", "BGS", "CGC", "SGC", "Other"];

const sortOptions: { value: BrowseSortMode; label: string }[] = [
  { value: "newest", label: "Newly Listed" },
  { value: "best-value", label: "Best Value" },
  { value: "closest-to-market", label: "Closest to Market" },
  { value: "highest-premium", label: "Highest Premium" },
  { value: "price-low-high", label: "Price: Low to High" },
  { value: "price-high-low", label: "Price: High to Low" },
];

const psaGradeOptions = [
  "10",
  "9",
  "8.5",
  "8",
  "7.5",
  "7",
  "6.5",
  "6",
  "5.5",
  "5",
  "4.5",
  "4",
  "3.5",
  "3",
  "2.5",
  "2",
  "1.5",
  "1",
  "Authentic",
];

const standardGradeOptions = [
  "10",
  "9.5",
  "9",
  "8.5",
  "8",
  "7.5",
  "7",
  "6.5",
  "6",
  "5.5",
  "5",
  "4.5",
  "4",
  "3.5",
  "3",
  "2.5",
  "2",
  "1.5",
  "1",
  "Authentic",
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function readLocalMockOffers() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedOffers = window.localStorage.getItem(mockOfferStorageKey);
    return storedOffers ? (JSON.parse(storedOffers) as LocalMockOffer[]) : [];
  } catch (error) {
    console.error("Mock offer read error:", error);
    return [];
  }
}

function saveLocalMockOffer(offer: LocalMockOffer) {
  const offers = readLocalMockOffers();
  window.localStorage.setItem(mockOfferStorageKey, JSON.stringify([offer, ...offers]));
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
  listing: BrowseListing,
  message: string,
): MockConversation {
  const now = Date.now();

  return {
    id: `mock-conversation-${now}`,
    participantName: listing.seller,
    participantRole: listing.sellerLevel || "Seller",
    person: listing.seller,
    badge: listing.sellerLevel || "Seller",
    cardId: listing.id,
    cardTitle: listing.title,
    cardRoute: listing.href,
    cardHref: listing.href,
    price: listing.askingPrice || listing.price || 0,
    snippet: message,
    lastSnippet: message,
    timestamp: "now",
    sortRank: now,
    unread: false,
    isActive: true,
    accent: listing.accent,
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

function getImageUrl(listing: SupabaseListingRow) {
  return (
    listing.listing_images?.find((image) => image.image_type === "front")
      ?.image_url ||
    listing.listing_images?.[0]?.image_url ||
    null
  );
}

function getSellerSlug(profile: ProfileRow | undefined, sellerId: string | null) {
  const username = profile?.username?.replace(/^@/, "").trim();

  if (username) {
    return encodeURIComponent(username);
  }

  return sellerId || "vault-runner";
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

function getSavedMarketValue(listing: SupabaseListingRow) {
  const sportsCardsProValue = Number(listing.sportscardspro_estimated_value || 0);

  return sportsCardsProValue > 0 ? sportsCardsProValue : 0;
}

function getListingValueBadge(
  askingPrice: number,
  estimatedMarketValue: number,
): ListingValueBadge | null {
  if (askingPrice <= 0 || estimatedMarketValue <= 0) {
    return null;
  }

  const percentageDifference =
    ((askingPrice - estimatedMarketValue) / estimatedMarketValue) * 100;

  if (percentageDifference < -10) {
    return {
      classification: "value",
      label: "VALUE",
      icon: "↓",
      percentageDifference,
      title:
        "Asking price is more than 10% below the saved estimated market value.",
    };
  }

  if (percentageDifference <= 10) {
    return {
      classification: "fair",
      label: "FAIR",
      icon: "≈",
      percentageDifference,
      title: "Asking price is within 10% of the saved estimated market value.",
    };
  }

  return {
    classification: "premium",
    label: "PREMIUM",
    icon: "↑",
    percentageDifference,
    title:
      "Asking price is more than 10% above the saved estimated market value.",
  };
}

function getValueDifference(listing: BrowseListing) {
  if (
    listing.price <= 0 ||
    !listing.sportsCardsProEstimatedValue ||
    listing.sportsCardsProEstimatedValue <= 0
  ) {
    return null;
  }

  return (
    ((listing.price - listing.sportsCardsProEstimatedValue) /
      listing.sportsCardsProEstimatedValue) *
    100
  );
}

function mapSupabaseListing(
  listing: SupabaseListingRow,
  index: number,
  totalCount: number,
  profilesById: Map<string, ProfileRow>,
): BrowseListing {
  const profile = listing.seller_id
    ? profilesById.get(listing.seller_id)
    : undefined;
  const category = getCategory(listing);
  const condition = getConditionDisplay(listing);
  const title =
    listing.title ||
    [listing.year, listing.brand, listing.player_name || listing.player]
      .filter(Boolean)
      .join(" ") ||
    "Untitled Card";
  const price = Number(listing.price || 0);
  const status = listing.status?.toLowerCase() || "";
  const isCollectionOnly =
    status !== "active" &&
    (status === "collection" ||
      Boolean(listing.is_collection_card) ||
      Boolean(listing.is_public_collection));
  const displayPrice = isCollectionOnly ? 0 : price;
  const savedMarketValue = getSavedMarketValue(listing);
  const sellerName = profile?.full_name || profile?.username || "GRAIL Seller";
  const sellerSlug = getSellerSlug(profile, listing.seller_id);
  const isGraded = Boolean(listing.grader && listing.grade) ||
    listing.card_type?.toLowerCase() === "graded";
  const isRaw = !isGraded;
  const accent = realListingAccents[index % realListingAccents.length];
  const route = `/cards/${listing.id}`;

  return {
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
    price: displayPrice,
    priceDisplay: isCollectionOnly
      ? "Open to Offers"
      : price
        ? formatCurrency(price)
        : "Price not listed",
    askingPrice: displayPrice,
    marketValue: savedMarketValue,
    sportsCardsProEstimatedValue: listing.sportscardspro_estimated_value || null,
    sportsCardsProSourceUrl: listing.sportscardspro_source_url || null,
    valueBadge: getListingValueBadge(displayPrice, savedMarketValue),
    minimumOffer: displayPrice ? Math.round(displayPrice * 0.85) : 0,
    minOffer: displayPrice ? Math.round(displayPrice * 0.85) : 0,
    watchCount: 0,
    views: 0,
    viewCount: 0,
    listedOrder: totalCount - index,
    listedDate: formatListedDate(listing.created_at),
    tags: [isCollectionOnly ? "Collection" : isGraded ? "Graded" : "Raw"],
    tag: isCollectionOnly ? "Collection" : isGraded ? "Graded" : "Raw",
    isGraded,
    isRaw,
    isHot: false,
    isGrail: false,
    isCollectionOnly,
    listingStatus: listing.status,
    accent,
    artworkTone: "live listing",
    imageUrl: getImageUrl(listing),
    createdAt: listing.created_at,
    source: "supabase",
    cardDetailRoute: route,
    sellerCollectionRoute: `/collections/${sellerSlug}`,
    details: {
      year: listing.year || "Unknown",
      set: listing.brand || "Unknown",
      cardNumber: listing.card_number || "Unknown",
      subject: listing.player_name || listing.player || "Unknown",
      grader: listing.grader || "Raw",
      grade: listing.grade || listing.condition || "Raw",
      certNumber: "Not available",
      notes: "Live Supabase listing.",
    },
    priceHistory: {
      thirtyDay: "N/A",
      ninetyDay: "N/A",
      lastSale: 0,
      averageSale: 0,
      chartPoints: [],
    },
    overview: "Live Supabase listing.",
  };
}

function getProfileName(profile: ProfileRow | undefined, fallbackId: string) {
  return profile?.full_name || profile?.username || fallbackId.slice(0, 8);
}

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "GS"
  );
}

function buildFeaturedSellers(
  rows: SupabaseListingRow[],
  profilesById: Map<string, ProfileRow>,
) {
  const listingsBySeller = new Map<string, SupabaseListingRow[]>();

  rows.forEach((listing) => {
    if (!listing.seller_id) {
      return;
    }

    listingsBySeller.set(listing.seller_id, [
      ...(listingsBySeller.get(listing.seller_id) || []),
      listing,
    ]);
  });

  return Array.from(listingsBySeller.entries())
    .map(([sellerId, sellerListings]) => {
      const profile = profilesById.get(sellerId);
      const name = getProfileName(profile, sellerId);
      const latestListing = sellerListings
        .slice()
        .sort(
          (left, right) =>
            new Date(right.created_at || 0).getTime() -
            new Date(left.created_at || 0).getTime(),
        )[0];

      return {
        sellerId,
        name,
        initials: getInitials(name),
        route: `/collections/${getSellerSlug(profile, sellerId)}`,
        listingCount: sellerListings.length,
        latestListedAt: latestListing?.created_at || null,
      } satisfies FeaturedSeller;
    })
    .sort((left, right) => {
      if (right.listingCount !== left.listingCount) {
        return right.listingCount - left.listingCount;
      }

      return (
        new Date(right.latestListedAt || 0).getTime() -
        new Date(left.latestListedAt || 0).getTime()
      );
    })
    .slice(0, 4);
}

function isWithinLastWeek(value?: string | null) {
  if (!value) {
    return false;
  }

  return new Date(value).getTime() >= Date.now() - 7 * 24 * 60 * 60 * 1000;
}

function isCompletedOrder(order: OrderRow) {
  const status = order.status?.toLowerCase();

  return (
    status === "paid" ||
    status === "complete" ||
    status === "completed" ||
    Boolean(order.completed_at)
  );
}

function matchesPriceFilter(price: number, filter: string) {
  if (filter === "Under $25") return price > 0 && price < 25;
  if (filter === "$25–$50") return price >= 25 && price <= 50;
  if (filter === "$50–$100") return price >= 50 && price <= 100;
  if (filter === "$100–$250") return price >= 100 && price <= 250;
  if (filter === "$250–$500") return price >= 250 && price <= 500;
  if (filter === "$500–$1,000") return price >= 500 && price <= 1000;
  if (filter === "$1,000–$2,500") return price >= 1000 && price <= 2500;
  if (filter === "$2,500–$5,000") return price >= 2500 && price <= 5000;
  if (filter === "$5,000+") return price >= 5000;

  return true;
}

function matchesCategoryFilter(listing: BrowseListing, filter: string) {
  if (filter === "Sports Cards") return listing.category === "Sports";
  if (filter === "TCG Cards") return listing.category === "TCG";
  if (filter === "Slabs") return listing.isGraded;
  if (filter === "Raw Cards") return listing.isRaw;
  if (filter === "Grail Cards") return listing.isGrail;

  return true;
}

function matchesSelectedGrade(listing: BrowseListing, option: string) {
  const [grader, grade] = option.split(":");
  const listingGrader = listing.details.grader?.toLowerCase() || "";
  const listingGrade = listing.details.grade?.toLowerCase() || "";

  if (!listing.isGraded) {
    return false;
  }

  if (grader === "Other") {
    const knownGraders = ["psa", "bgs", "cgc", "sgc"];
    return !knownGraders.includes(listingGrader) && listingGrade === grade.toLowerCase();
  }

  return (
    listingGrader === grader.toLowerCase() &&
    listingGrade === grade.toLowerCase()
  );
}

function getListingSearchText(listing: BrowseListing) {
  return [
    listing.title,
    listing.category,
    listing.condition,
    listing.meta,
    listing.seller,
    listing.details.year,
    listing.details.set,
    listing.details.subject,
    listing.details.cardNumber,
    listing.details.grader,
    listing.details.grade,
    getListingTag(listing),
  ]
    .join(" ")
    .toLowerCase();
}

function CardArtwork({
  accent,
  category,
  condition,
  title,
  imageUrl,
  preload = false,
}: {
  accent: string;
  category: string;
  condition: string;
  title: string;
  imageUrl?: string | null;
  preload?: boolean;
}) {
  const isRaw =
    condition.toLowerCase().includes("raw") ||
    condition.toLowerCase().includes("mint");
  const shortTitle = title.split(" ").slice(0, 2).join(" ");

  return (
    <div className="art-shell">
      {imageUrl ? (
        <Image
          className="uploaded-card-image"
          src={imageUrl}
          alt={title}
          width={160}
          height={210}
          preload={preload}
          loading={preload ? undefined : "lazy"}
          unoptimized
        />
      ) : (
      <div className={`mock-card ${isRaw ? "raw-card" : "slab-card"}`}>
        {!isRaw ? (
          <div className="mock-label">
            <span>{condition}</span>
            <span>{category}</span>
          </div>
        ) : null}
        <div
          className="mock-art"
          style={{
            background: `radial-gradient(circle at 50% 19%, rgba(231,222,208,0.34), transparent 17%), radial-gradient(circle at 24% 72%, ${accent}66, transparent 29%), linear-gradient(145deg, ${accent}, #111827 54%, #030304)`,
          }}
        >
          <span className="mock-card-code">{category}</span>
          <span className="mock-orbit" />
          <span className="mock-figure" />
          <span className="mock-holo" />
          <span className="mock-frame" />
          <span className="mock-rank">{isRaw ? "RAW" : "CERT"}</span>
          <span className="mock-title">{shortTitle}</span>
          <span className="mock-line" />
        </div>
        <div className="mock-strip">
          <span />
          <span />
        </div>
      </div>
      )}
    </div>
  );
}

function FilterGroup({
  title,
  options,
  selectedOptions,
  onToggleOption,
}: {
  title: string;
  options: string[];
  selectedOptions: string[];
  onToggleOption: (option: string) => void;
}) {
  return (
    <section className="filter-group">
      <h3>{title}</h3>
      <div className="filter-options">
        {options.map((option) => (
          <label key={option} className="filter-option">
            <input
              type="checkbox"
              checked={selectedOptions.includes(option)}
              onChange={() => onToggleOption(option)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </section>
  );
}

function GradeFilters({
  openGraders,
  onToggle,
  rawSelected,
  selectedGradeOptions,
  onToggleRaw,
  onToggleGrade,
}: {
  openGraders: string[];
  onToggle: (grader: string) => void;
  rawSelected: boolean;
  selectedGradeOptions: string[];
  onToggleRaw: () => void;
  onToggleGrade: (grader: string, grade: string) => void;
}) {
  return (
    <section className="filter-group grade-filter">
      <h3>Grade</h3>
      <label className="filter-option grade-raw-option">
        <input
          type="checkbox"
          checked={rawSelected}
          onChange={onToggleRaw}
        />
        <span>Raw</span>
      </label>

      <div className="grader-list">
        {gradeCompanies.map((grader) => {
          const isOpen = openGraders.includes(grader);
          const options =
            grader === "PSA" ? psaGradeOptions : standardGradeOptions;

          return (
            <div key={grader} className="grader-item">
              <button
                type="button"
                className="grader-toggle"
                aria-expanded={isOpen}
                onClick={() => onToggle(grader)}
              >
                <span>{grader}</span>
                <span aria-hidden="true">{isOpen ? "▴" : "▾"}</span>
              </button>

              {isOpen ? (
                <div className="grade-panel">
                  {options.map((grade) => (
                    <label key={`${grader}-${grade}`} className="grade-option">
                      <input
                        type="checkbox"
                        checked={selectedGradeOptions.includes(`${grader}:${grade}`)}
                        onChange={() => onToggleGrade(grader, grade)}
                      />
                      <span>{grade}</span>
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SellerFilters({
  multiListingSellersOnly,
  newListingsOnly,
  onToggleMultiListingSellers,
  onToggleNewListings,
}: {
  multiListingSellersOnly: boolean;
  newListingsOnly: boolean;
  onToggleMultiListingSellers: () => void;
  onToggleNewListings: () => void;
}) {
  return (
    <section className="filter-group seller-filters">
      <h3>Seller Filters</h3>
      <div className="filter-options seller-quick-options">
        <label className="filter-option">
          <input
            type="checkbox"
            checked={newListingsOnly}
            onChange={onToggleNewListings}
          />
          <span>New Listings</span>
        </label>
        <label className="filter-option">
          <input
            type="checkbox"
            checked={multiListingSellersOnly}
            onChange={onToggleMultiListingSellers}
          />
          <span>Sellers with multiple active listings</span>
        </label>
      </div>
    </section>
  );
}

function BrowseFallback() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 50% -120px, rgba(201,205,211,0.08), transparent 32%), linear-gradient(180deg, #000 0%, #030304 56%, #000 100%)",
        color: "#fafafa",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          width: "min(1240px, calc(100vw - 32px))",
          margin: "0 auto",
          padding: "8px 0 34px",
        }}
      >
        <Header />
        <section
          style={{
            marginTop: 18,
            border: "1px solid #1d1d22",
            borderRadius: 12,
            background: "rgba(5,5,6,0.92)",
            padding: 18,
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#C9CDD3",
              fontSize: 13,
              fontWeight: 900,
            }}
          >
            Loading cards...
          </p>
        </section>
      </div>
    </main>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={<BrowseFallback />}>
      <BrowseContent />
    </Suspense>
  );
}

function BrowseContent() {
  const searchParams = useSearchParams();
  const urlSearchQuery = searchParams.get("search") || "";
  const [listings, setListings] = useState<BrowseListing[]>([]);
  const [featuredSellers, setFeaturedSellers] = useState<FeaturedSeller[]>([]);
  const [marketSnapshot, setMarketSnapshot] = useState<BrowseMarketSnapshot>({
    activeListings: 0,
    newThisWeek: 0,
    averageListPrice: 0,
    completedSales: null,
    marketplaceVolume: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [fallbackNote, setFallbackNote] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [openGraders, setOpenGraders] = useState<string[]>(["PSA"]);
  const [selectedCategoryFilters, setSelectedCategoryFilters] = useState<string[]>([]);
  const [selectedPriceFilters, setSelectedPriceFilters] = useState<string[]>([]);
  const [selectedGradeOptions, setSelectedGradeOptions] = useState<string[]>([]);
  const [rawSelected, setRawSelected] = useState(false);
  const [newListingsOnly, setNewListingsOnly] = useState(false);
  const [multiListingSellersOnly, setMultiListingSellersOnly] = useState(false);
  const [sortMode, setSortMode] = useState<BrowseSortMode>("newest");
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [hasLocalSearch, setHasLocalSearch] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "compact">("grid");
  const [offerListing, setOfferListing] = useState<BrowseListing | null>(null);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [offerError, setOfferError] = useState("");
  const [sentOfferAmount, setSentOfferAmount] = useState<number | null>(null);
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [messageListing, setMessageListing] = useState<BrowseListing | null>(null);
  const [messageBody, setMessageBody] = useState("");
  const [messageError, setMessageError] = useState("");
  const [messageSuccessHref, setMessageSuccessHref] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const searchQuery = hasLocalSearch ? localSearchQuery : urlSearchQuery;

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

    async function loadListings() {
      setIsLoading(true);
      setFallbackNote("");

      try {
        const { data, error } = await supabase
          .from("listings")
          .select(
            `
              id,
              seller_id,
              title,
              sport,
              player,
              player_name,
              year,
              brand,
              card_number,
              card_type,
              grader,
              grade,
              condition,
              price,
              status,
              created_at,
              is_collection_card,
              is_public_collection,
              estimated_value,
              sportscardspro_estimated_value,
              sportscardspro_source_url,
              listing_images (
                image_url,
                image_type
              )
            `,
          )
          .eq("status", "active")
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        const rows = ((data || []) as SupabaseListingRow[]).filter(
          (listing) => listing.status?.toLowerCase() === "active",
        );

        const sellerIds = Array.from(
          new Set(
            rows
              .map((listing) => listing.seller_id)
              .filter((sellerId): sellerId is string => Boolean(sellerId)),
          ),
        );
        const profilesById = new Map<string, ProfileRow>();

        if (sellerIds.length > 0) {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("id, full_name, username")
            .in("id", sellerIds);

          if (profileError) {
            console.error("Browse profile fetch error:", profileError);
          } else {
            ((profileData || []) as ProfileRow[]).forEach((profile) => {
              profilesById.set(profile.id, profile);
            });
          }
        }

        if (!isMounted) {
          return;
        }

        const liveListings = rows.map((listing, index) =>
          mapSupabaseListing(listing, index, rows.length, profilesById),
        );
        const pricedListings = rows.filter(
          (listing) => listing.price !== null && Number(listing.price) > 0,
        );
        const completedSnapshot = {
          completedSales: null as number | null,
          marketplaceVolume: null as number | null,
        };

        try {
          const { data: orderData, error: orderError } = await supabase
            .from("orders")
            .select("id, total_amount, card_price, status, created_at, completed_at")
            .limit(1000);

          if (orderError) {
            throw orderError;
          }

          const orders = (orderData || []) as OrderRow[];
          const completedOrders = orders.filter(isCompletedOrder);

          completedSnapshot.completedSales = completedOrders.length;
          completedSnapshot.marketplaceVolume = completedOrders.reduce(
            (sum, order) => sum + Number(order.total_amount || order.card_price || 0),
            0,
          );
        } catch (orderError) {
          console.warn("Browse orders snapshot unavailable:", orderError);
        }

        setListings(liveListings);
        setFeaturedSellers(buildFeaturedSellers(rows, profilesById));
        setMarketSnapshot({
          activeListings: rows.length,
          newThisWeek: rows.filter((listing) => isWithinLastWeek(listing.created_at))
            .length,
          averageListPrice: pricedListings.length
            ? Math.round(
                pricedListings.reduce(
                  (sum, listing) => sum + Number(listing.price || 0),
                  0,
                ) / pricedListings.length,
              )
            : 0,
          completedSales: completedSnapshot.completedSales,
          marketplaceVolume: completedSnapshot.marketplaceVolume,
        });
        setFallbackNote("");
      } catch (error) {
        console.error("Browse listings error:", error);

        if (!isMounted) {
          return;
        }

        setListings([]);
        setFeaturedSellers([]);
        setMarketSnapshot({
          activeListings: 0,
          newThisWeek: 0,
          averageListPrice: 0,
          completedSales: null,
          marketplaceVolume: null,
        });
        setFallbackNote("Live listings could not be loaded right now.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadListings();

    return () => {
      isMounted = false;
    };
  }, []);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const sellerListingCounts = useMemo(() => {
    const counts = new Map<string, number>();

    listings.forEach((listing) => {
      if (!listing.sellerId) {
        return;
      }

      counts.set(listing.sellerId, (counts.get(listing.sellerId) || 0) + 1);
    });

    return counts;
  }, [listings]);
  const hasActiveFilters =
    Boolean(normalizedQuery) ||
    selectedCategoryFilters.length > 0 ||
    selectedPriceFilters.length > 0 ||
    selectedGradeOptions.length > 0 ||
    rawSelected ||
    newListingsOnly ||
    multiListingSellersOnly ||
    sortMode !== "newest";
  const visibleListings = useMemo(
    () =>
      listings
        .filter((listing) => {
          const tag = getListingTag(listing);

          if (sortMode === "hot" && tag !== "Hot") {
            return false;
          }

          if (
            normalizedQuery &&
            !getListingSearchText(listing).includes(normalizedQuery)
          ) {
            return false;
          }

          if (
            selectedCategoryFilters.length > 0 &&
            !selectedCategoryFilters.some((filter) =>
              matchesCategoryFilter(listing, filter),
            )
          ) {
            return false;
          }

          if (
            selectedPriceFilters.length > 0 &&
            !selectedPriceFilters.some((filter) =>
              matchesPriceFilter(listing.price, filter),
            )
          ) {
            return false;
          }

          if (
            (rawSelected || selectedGradeOptions.length > 0) &&
            !(
              (rawSelected && listing.isRaw) ||
              selectedGradeOptions.some((option) =>
                matchesSelectedGrade(listing, option),
              )
            )
          ) {
            return false;
          }

          if (newListingsOnly && !isWithinLastWeek(listing.createdAt)) {
            return false;
          }

          if (
            multiListingSellersOnly &&
            (!listing.sellerId ||
              (sellerListingCounts.get(listing.sellerId) || 0) < 2)
          ) {
            return false;
          }

          return true;
        })
        .sort((first, second) => {
          const firstValueDifference = getValueDifference(first);
          const secondValueDifference = getValueDifference(second);
          const firstHasValue = firstValueDifference !== null;
          const secondHasValue = secondValueDifference !== null;

          if (sortMode === "hot") {
            return (
              second.watchCount +
              second.views * 0.1 -
              (first.watchCount + first.views * 0.1)
            );
          }

          if (sortMode === "best-value") {
            if (firstHasValue && !secondHasValue) return -1;
            if (!firstHasValue && secondHasValue) return 1;
            if (firstHasValue && secondHasValue) {
              return (firstValueDifference ?? 0) - (secondValueDifference ?? 0);
            }
          }

          if (sortMode === "closest-to-market") {
            if (firstHasValue && !secondHasValue) return -1;
            if (!firstHasValue && secondHasValue) return 1;
            if (firstHasValue && secondHasValue) {
              return (
                Math.abs(firstValueDifference ?? 0) -
                Math.abs(secondValueDifference ?? 0)
              );
            }
          }

          if (sortMode === "highest-premium") {
            if (firstHasValue && !secondHasValue) return -1;
            if (!firstHasValue && secondHasValue) return 1;
            if (firstHasValue && secondHasValue) {
              return (secondValueDifference ?? 0) - (firstValueDifference ?? 0);
            }
          }

          if (sortMode === "price-low-high") {
            return first.price - second.price;
          }

          if (sortMode === "price-high-low") {
            return second.price - first.price;
          }

          return second.listedOrder - first.listedOrder;
        }),
    [
      listings,
      multiListingSellersOnly,
      newListingsOnly,
      normalizedQuery,
      rawSelected,
      selectedCategoryFilters,
      selectedGradeOptions,
      selectedPriceFilters,
      sellerListingCounts,
      sortMode,
    ],
  );

  const resultLabel = isLoading
    ? "Loading listings..."
    : normalizedQuery
      ? `${visibleListings.length} ${
          visibleListings.length === 1 ? "result" : "results"
        }`
      : sortMode === "hot"
        ? `${visibleListings.length} hot cards`
        : hasActiveFilters
          ? `${visibleListings.length} matching listings`
          : `${listings.length} listings`;

  function toggleStringFilter(
    value: string,
    setter: Dispatch<SetStateAction<string[]>>,
  ) {
    setter((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  function resetFilters() {
    setHasLocalSearch(true);
    setLocalSearchQuery("");
    setSelectedCategoryFilters([]);
    setSelectedPriceFilters([]);
    setSelectedGradeOptions([]);
    setRawSelected(false);
    setNewListingsOnly(false);
    setMultiListingSellersOnly(false);
    setSortMode("newest");
  }

  function toggleGrader(grader: string) {
    setOpenGraders((current) =>
      current.includes(grader)
        ? current.filter((item) => item !== grader)
        : [...current, grader],
    );
  }

  function toggleGradeFilter(grader: string, grade: string) {
    toggleStringFilter(`${grader}:${grade}`, setSelectedGradeOptions);
  }

  function openOfferModal(listing: BrowseListing) {
    setOfferListing(listing);
    setOfferAmount("");
    setOfferMessage("");
    setOfferError("");
    setSentOfferAmount(null);
  }

  function closeOfferModal() {
    setOfferListing(null);
    setOfferAmount("");
    setOfferMessage("");
    setOfferError("");
    setSentOfferAmount(null);
  }

  function openMessageModal(listing: BrowseListing) {
    setMessageListing(listing);
    setMessageBody("");
    setMessageError("");
    setMessageSuccessHref("");
  }

  function closeMessageModal() {
    setMessageListing(null);
    setMessageBody("");
    setMessageError("");
    setMessageSuccessHref("");
    setIsSendingMessage(false);
  }

  async function submitMessage() {
    if (!messageListing) {
      return;
    }

    const body = messageBody.trim();

    if (!body) {
      setMessageError("Write a message before sending.");
      return;
    }

    if (messageListing.source === "mock") {
      const conversation = createLocalMockConversation(messageListing, body);
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
        step: "browse message auth session",
        listingId: messageListing.id,
        sellerId: messageListing.sellerId,
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

    if (messageListing.sellerId === session.user.id) {
      setMessageError("You cannot message yourself about your own listing.");
      return;
    }

    if (!messageListing.sellerId) {
      setMessageError("Message could not be sent. Check console for Supabase error.");
      console.error("Browse message setup error:", {
        step: "browse message missing seller id",
        reason: "Missing seller_id on listing.",
        listingId: messageListing.id,
        sellerId: messageListing.sellerId,
        buyerId: session.user.id,
      });
      return;
    }

    setIsSendingMessage(true);
    setMessageError("");

    try {
      const messagePayload = {
        sender_id: session.user.id,
        receiver_id: messageListing.sellerId,
        listing_id: messageListing.id,
        body,
      };
      const { error: messageInsertError } = await supabase
        .from("messages")
        .insert(messagePayload);

      if (messageInsertError) {
        logMessageSupabaseError({
          step: "browse message insert",
          listingId: messageListing.id,
          sellerId: messageListing.sellerId,
          buyerId: session.user.id,
          payload: messagePayload,
          error: messageInsertError,
        });
        throw messageInsertError;
      }

      setMessageSuccessHref(
        `/messages?listing=${encodeURIComponent(
          messageListing.id,
        )}&seller=${encodeURIComponent(messageListing.sellerId)}`,
      );
    } catch (error) {
      logMessageSupabaseError({
        step: "browse message flow catch",
        listingId: messageListing.id,
        sellerId: messageListing.sellerId,
        buyerId: session.user.id,
        error,
      });
      setMessageError("Message could not be sent. Check console for Supabase error.");
      setMessageSuccessHref("");
    } finally {
      setIsSendingMessage(false);
    }
  }

  async function submitOffer() {
    if (!offerListing) {
      return;
    }

    const amount = Number(offerAmount);

    if (!amount || amount < offerListing.minOffer) {
      setOfferError("Offer is below the seller's minimum.");
      setSentOfferAmount(null);
      return;
    }

    if (offerListing.source === "mock") {
      saveLocalMockOffer({
        id: `mock-offer-${Date.now()}`,
        listing_id: offerListing.id,
        cardTitle: offerListing.title,
        buyerName: "You",
        sellerName: offerListing.seller,
        amount,
        askingPrice: offerListing.askingPrice || offerListing.price || 0,
        message: offerMessage.trim(),
        status: "pending",
        createdAt: new Date().toISOString(),
        cardRoute: offerListing.href,
      });
      setOfferError("");
      setSentOfferAmount(amount);
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

    if (offerListing.sellerId === session.user.id) {
      setOfferError("You cannot make an offer on your own listing.");
      setSentOfferAmount(null);
      return;
    }

    if (!offerListing.sellerId) {
      console.warn("Supabase offers table not available; using mock offer flow.", {
        reason: "Missing seller_id on listing.",
        listingId: offerListing.id,
      });
      setOfferError("");
      setSentOfferAmount(amount);
      return;
    }

    setIsSubmittingOffer(true);
    setOfferError("");

    try {
      const { error } = await supabase.from("offers").insert({
        listing_id: offerListing.id,
        buyer_id: session.user.id,
        seller_id: offerListing.sellerId,
        amount,
        message: offerMessage.trim() || null,
        status: "pending",
      });

      if (error) {
        throw error;
      }

      setSentOfferAmount(amount);
    } catch (error) {
      console.error("Browse offer insert error:", error);
      console.warn("Supabase offers table not available; using mock offer flow.", error);
      setOfferError("Offer could not be sent.");
      setSentOfferAmount(null);
    } finally {
      setIsSubmittingOffer(false);
    }
  }

  return (
    <main className="browse-page">
      <style>
        {`
          .browse-page {
            min-height: 100vh;
            background:
              radial-gradient(circle at 50% -120px, rgba(201, 205, 211, 0.08), transparent 32%),
              linear-gradient(180deg, #000 0%, #030304 56%, #000 100%);
            color: #fafafa;
            font-family: Arial, Helvetica, sans-serif;
            overflow-x: hidden;
          }

          .browse-shell {
            width: min(1240px, calc(100vw - 32px));
            margin: 0 auto;
            padding: 8px 0 34px;
          }

          .title-row {
            margin-top: 18px;
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 24px;
          }

          .title-row h1 {
            margin: 0;
            font-size: 34px;
            line-height: 38px;
            font-weight: 900;
            letter-spacing: 0;
          }

          .title-row p {
            margin: 8px 0 0;
            color: #a1a1aa;
            font-size: 14px;
            line-height: 20px;
            font-weight: 700;
          }

          .primary-action {
            height: 40px;
            min-width: 116px;
            border-radius: 9px;
            background: #E7DED0;
            color: #111;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            font-size: 13px;
            font-weight: 900;
          }

          .toolbar {
            margin-top: 16px;
            min-height: 54px;
            border: 1px solid #1d1d22;
            border-radius: 10px;
            background: rgba(5, 5, 6, 0.86);
            display: grid;
            grid-template-columns: 1fr auto auto auto auto auto;
            align-items: center;
            gap: 12px;
            padding: 10px;
            box-sizing: border-box;
          }

          .search-box {
            height: 36px;
            border: 1px solid #24242a;
            border-radius: 8px;
            background: #08080a;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 0 12px;
            color: #777985;
            font-size: 13px;
            box-sizing: border-box;
            cursor: text;
          }

          .search-box input {
            width: 100%;
            min-width: 0;
            border: 0;
            outline: 0;
            background: transparent;
            color: #f4f4f5;
            font: inherit;
            font-weight: 800;
          }

          .search-box input::placeholder {
            color: #777985;
          }

          .search-icon {
            width: 12px;
            height: 12px;
            border: 2px solid #777985;
            border-radius: 999px;
            box-sizing: border-box;
            display: inline-block;
            flex: 0 0 auto;
          }

          .toolbar-button,
          .view-button {
            height: 36px;
            border: 1px solid #24242a;
            border-radius: 8px;
            background: #08080a;
            color: #e4e4e7;
            font-size: 12px;
            font-weight: 900;
            padding: 0 12px;
            cursor: pointer;
            transition: border-color 160ms ease, background 160ms ease, color 160ms ease;
          }

          .toolbar-button:hover,
          .toolbar-button.active,
          .view-button:hover,
          .view-button.active {
            border-color: rgba(231,222,208,0.34);
            background: rgba(231, 222, 208, 0.1);
            color: #fff;
          }

          .sort-select {
            height: 36px;
            border: 1px solid #24242a;
            border-radius: 8px;
            background: #08080a;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 0 10px;
            box-sizing: border-box;
          }

          .sort-select span {
            color: #85858f;
            font-size: 10px;
            line-height: 12px;
            font-weight: 900;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }

          .sort-select select {
            border: 0;
            outline: 0;
            background: transparent;
            color: #f4f4f5;
            font: inherit;
            font-size: 12px;
            font-weight: 900;
            cursor: pointer;
          }

          .view-toggle {
            display: inline-flex;
            border: 1px solid #24242a;
            border-radius: 9px;
            overflow: hidden;
            height: 36px;
          }

          .view-button {
            border: 0;
            border-radius: 0;
            min-width: 72px;
          }

          .results-count {
            color: #C9CDD3;
            font-size: 12px;
            font-weight: 900;
            white-space: nowrap;
            padding: 0 4px;
          }

          .value-info-note {
            margin-top: 10px;
            border: 1px solid rgba(201,205,211,0.14);
            border-radius: 10px;
            background: rgba(201,205,211,0.04);
            padding: 10px 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
          }

          .value-info-note p {
            margin: 0;
            color: #a1a1aa;
            font-size: 11px;
            line-height: 16px;
            font-weight: 800;
          }

          .value-info-note a {
            color: #E7DED0;
            font-size: 11px;
            line-height: 14px;
            font-weight: 900;
            white-space: nowrap;
            text-decoration: none;
          }

          .value-info-note a:hover {
            text-decoration: underline;
            text-underline-offset: 3px;
          }

          .dashboard {
            margin-top: 16px;
            display: grid;
            grid-template-columns: 230px 1fr 282px;
            gap: 16px;
            align-items: start;
          }

          .panel {
            border: 1px solid #1d1d22;
            border-radius: 10px;
            background:
              linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.004)),
              rgba(5, 5, 6, 0.92);
            box-shadow: 0 18px 44px rgba(0, 0, 0, 0.28);
          }

          .offer-modal-backdrop {
            position: fixed;
            inset: 0;
            z-index: 1000;
            background: rgba(0,0,0,0.72);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 22px;
            backdrop-filter: blur(12px);
          }

          .offer-modal {
            width: min(520px, 100%);
            padding: 18px;
            border-radius: 14px;
            box-sizing: border-box;
          }

          .offer-modal-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 18px;
          }

          .offer-modal-header span,
          .offer-summary-item span,
          .offer-field span {
            color: #C9CDD3;
            font-size: 11px;
            line-height: 14px;
            font-weight: 900;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }

          .offer-modal-header h2 {
            margin: 6px 0 0;
            color: #fff;
            font-size: 22px;
            line-height: 27px;
            font-weight: 900;
          }

          .offer-modal-header button {
            width: 34px;
            height: 34px;
            border: 1px solid rgba(231,222,208,0.24);
            border-radius: 999px;
            background: rgba(8,8,10,0.82);
            color: #E7DED0;
            cursor: pointer;
            font-size: 15px;
            font-weight: 900;
          }

          .offer-summary-grid {
            margin-top: 16px;
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px;
          }

          .offer-summary-item {
            min-height: 68px;
            border: 1px solid #202026;
            border-radius: 10px;
            background: rgba(8,8,10,0.76);
            padding: 10px;
            box-sizing: border-box;
          }

          .offer-summary-item strong {
            display: block;
            margin-top: 8px;
            color: #fff;
            font-size: 13px;
            line-height: 17px;
            font-weight: 900;
          }

          .offer-field {
            margin-top: 14px;
            display: grid;
            gap: 7px;
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

          .offer-field input,
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
            border: 1px solid rgba(231,222,208,0.24);
            border-radius: 10px;
            background: rgba(231,222,208,0.07);
            padding: 12px;
          }

          .offer-confirmation strong {
            color: #E7DED0;
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

          .offer-modal-actions button,
          .offer-modal-actions a {
            min-height: 40px;
            border: 1px solid rgba(231,222,208,0.28);
            border-radius: 10px;
            background: rgba(231,222,208,0.055);
            color: #fff;
            font: inherit;
            font-size: 12px;
            font-weight: 900;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            text-decoration: none;
          }

          .offer-modal-actions .submit-offer {
            background: #E7DED0;
            color: #111;
          }

          .offer-modal-actions.single-action {
            grid-template-columns: 1fr;
          }

          .filters {
            padding: 14px;
          }

          .filters-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 13px;
          }

          .filters h2,
          .side-panel h2 {
            margin: 0;
            color: #fff;
            font-size: 12px;
            line-height: 16px;
            font-weight: 900;
            letter-spacing: 0.08em;
          }

          .reset-button {
            border: 0;
            background: transparent;
            color: #85858f;
            font-size: 11px;
            font-weight: 800;
            padding: 0;
          }

          .filter-group {
            padding: 12px 0;
            border-top: 1px solid #19191f;
          }

          .filter-group:first-of-type {
            border-top: 0;
            padding-top: 0;
          }

          .filter-group h3 {
            margin: 0 0 9px;
            color: #C9CDD3;
            font-size: 12px;
            line-height: 15px;
            font-weight: 900;
          }

          .filter-options {
            display: grid;
            gap: 7px;
          }

          .filter-option {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #d4d4d8;
            font-size: 12px;
            line-height: 15px;
            font-weight: 700;
          }

          .filter-option input,
          .grade-option input {
            width: 13px;
            height: 13px;
            accent-color: #C9CDD3;
          }

          .grade-raw-option {
            margin-bottom: 8px;
          }

          .grader-list {
            display: grid;
            gap: 7px;
          }

          .grader-item {
            border: 1px solid #202026;
            border-radius: 8px;
            background: rgba(8,8,10,0.74);
            overflow: hidden;
          }

          .grader-toggle {
            width: 100%;
            height: 31px;
            border: 0;
            background: transparent;
            color: #e4e4e7;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 9px;
            font-size: 12px;
            font-weight: 900;
            cursor: pointer;
          }

          .grader-toggle:hover {
            background: rgba(231,222,208,0.055);
            color: #fff;
          }

          .grade-panel,
          .seller-level-panel {
            max-height: 178px;
            overflow-y: auto;
            border-top: 1px solid #202026;
            padding: 8px;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 6px 8px;
          }

          .grade-option {
            display: flex;
            align-items: center;
            gap: 6px;
            color: #c9c9cf;
            font-size: 11px;
            line-height: 13px;
            font-weight: 800;
          }

          .seller-level-panel {
            grid-template-columns: 1fr;
            max-height: 170px;
          }

          .seller-quick-options {
            margin-top: 8px;
          }

          .listing-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
          }

          .listing-grid.compact-view {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .listing-card {
            min-height: 410px;
            border: 1px solid #202026;
            border-radius: 10px;
            background:
              linear-gradient(180deg, rgba(255,255,255,0.028), rgba(255,255,255,0.006)),
              #070708;
            color: #fff;
            text-decoration: none;
            padding: 14px;
            display: flex;
            flex-direction: column;
            gap: 11px;
            box-sizing: border-box;
            transition: border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;
          }

          .listing-card:hover {
            border-color: rgba(231, 222, 208, 0.34);
            transform: translateY(-1px);
            box-shadow: 0 20px 46px rgba(0,0,0,0.36);
          }

          .listing-grid.compact-view .listing-card {
            min-height: 156px;
            display: grid;
            grid-template-columns: 96px 1fr;
            grid-template-areas:
              "art badge"
              "art title"
              "art meta"
              "art seller"
              "art footer";
            gap: 6px 14px;
            align-items: start;
            padding: 12px;
          }

          .listing-badge-row {
            grid-area: badge;
            min-height: 22px;
            display: flex;
            align-items: center;
            gap: 7px;
            flex-wrap: wrap;
          }

          .art-link {
            grid-area: art;
            color: inherit;
            text-decoration: none;
            display: flex;
            justify-content: center;
          }

          .art-shell {
            width: 184px;
            height: 214px;
            border-radius: 9px;
            background:
              radial-gradient(circle at 50% 18%, rgba(231,222,208,0.16), transparent 45%),
              linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.006)),
              #030304;
            border: 1px solid rgba(201,205,211,0.12);
            box-shadow: inset 0 0 22px rgba(255,255,255,0.025);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto;
          }

          .listing-grid.compact-view .art-shell {
            width: 92px;
            height: 132px;
          }

          .uploaded-card-image {
            width: auto;
            height: auto;
            max-width: calc(100% - 18px);
            max-height: calc(100% - 18px);
            border-radius: 8px;
            object-fit: contain;
            box-shadow: 0 18px 34px rgba(0,0,0,0.62);
          }

          .mock-card {
            width: 128px;
            height: 188px;
            border: 1px solid rgba(244,244,245,0.48);
            border-radius: 9px;
            background: linear-gradient(180deg, #eeeeef 0%, #fafafa 16%, #d7d7da 17%, #f8fafc 18%, #1f1f23 100%);
            box-shadow: 0 18px 34px rgba(0,0,0,0.62);
            padding: 7px;
            box-sizing: border-box;
          }

          .raw-card {
            background:
              linear-gradient(180deg, rgba(255,255,255,0.78), rgba(230,232,235,0.92) 8%, #15171b 9%, #050506 100%);
            border-color: rgba(231,222,208,0.5);
          }

          .listing-grid.compact-view .mock-card {
            width: 76px;
            height: 110px;
            padding: 5px;
          }

          .mock-label {
            height: 24px;
            border-radius: 5px;
            background: #f8fafc;
            color: #111827;
            font-size: 6px;
            line-height: 8px;
            font-weight: 900;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 4px;
            padding: 0 4px;
            box-sizing: border-box;
            text-transform: uppercase;
          }

          .listing-grid.compact-view .mock-label {
            height: 16px;
            font-size: 5px;
            line-height: 7px;
          }

          .mock-art {
            height: 122px;
            margin-top: 6px;
            border: 1px solid rgba(255,255,255,0.26);
            border-radius: 6px;
            position: relative;
            overflow: hidden;
          }

          .raw-card .mock-art {
            height: 150px;
            margin-top: 0;
            border-color: rgba(255,255,255,0.2);
          }

          .listing-grid.compact-view .mock-art {
            height: 62px;
          }

          .listing-grid.compact-view .raw-card .mock-art {
            height: 82px;
          }

          .mock-card-code {
            position: absolute;
            left: 7px;
            top: 7px;
            z-index: 3;
            color: rgba(255,255,255,0.78);
            font-size: 7px;
            line-height: 9px;
            font-weight: 900;
            letter-spacing: 0.06em;
          }

          .mock-orbit {
            position: absolute;
            left: 19px;
            top: 25px;
            width: 72px;
            height: 72px;
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 50%;
            transform: rotate(-18deg);
          }

          .mock-figure {
            position: absolute;
            left: 45px;
            top: 36px;
            width: 34px;
            height: 59px;
            border-radius: 999px 999px 12px 12px;
            background:
              linear-gradient(180deg, rgba(255,255,255,0.88), rgba(201,205,211,0.58));
            transform: skew(-8deg);
            box-shadow: 0 0 18px rgba(255,255,255,0.16);
          }

          .mock-holo {
            position: absolute;
            inset: 0;
            background:
              linear-gradient(115deg, transparent 0 28%, rgba(255,255,255,0.18) 34%, transparent 42% 100%),
              radial-gradient(circle at 72% 28%, rgba(255,255,255,0.2), transparent 22%);
            mix-blend-mode: screen;
            opacity: 0.72;
          }

          .mock-frame {
            position: absolute;
            inset: 10px;
            border: 1px solid rgba(255,255,255,0.18);
            border-radius: 5px;
            box-shadow: inset 0 0 20px rgba(0,0,0,0.28);
          }

          .mock-rank {
            position: absolute;
            right: 7px;
            top: 7px;
            z-index: 3;
            color: #fff;
            font-size: 7px;
            line-height: 9px;
            font-weight: 900;
          }

          .mock-title {
            position: absolute;
            left: 8px;
            right: 8px;
            bottom: 20px;
            z-index: 3;
            color: #fff;
            font-size: 8px;
            line-height: 10px;
            font-weight: 900;
            text-transform: uppercase;
            text-shadow: 0 1px 8px rgba(0,0,0,0.58);
          }

          .mock-line {
            position: absolute;
            left: 8px;
            right: 8px;
            bottom: 12px;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(231,222,208,0.44), transparent);
          }

          .mock-strip {
            height: 7px;
            margin-top: 6px;
            border-radius: 999px;
            display: flex;
            gap: 4px;
          }

          .listing-grid.compact-view .mock-strip {
            height: 4px;
            margin-top: 4px;
          }

          .mock-strip span {
            flex: 1;
            border-radius: 999px;
            background: linear-gradient(90deg, rgba(201,205,211,0.28), rgba(231,222,208,0.72), rgba(201,205,211,0.28));
          }

          .listing-body {
            min-width: 0;
            display: flex;
            flex-direction: column;
          }

          .badge {
            align-self: flex-start;
            min-height: 22px;
            border: 1px solid rgba(201,205,211,0.34);
            border-radius: 999px;
            background:
              linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.015)),
              rgba(201,205,211,0.06);
            color: #E7DED0;
            padding: 0 9px;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            font-size: 10px;
            line-height: 12px;
            font-weight: 900;
            text-transform: uppercase;
          }

          .badge-hot {
            border-color: rgba(231,222,208,0.34);
            background: rgba(231,222,208,0.085);
            color: #E7DED0;
            box-shadow: 0 0 16px rgba(201,205,211,0.08);
          }

          .badge-grail {
            border-color: rgba(231,222,208,0.66);
            background:
              radial-gradient(circle at 50% 0%, rgba(255,255,255,0.24), transparent 55%),
              linear-gradient(180deg, rgba(231,222,208,0.16), rgba(201,205,211,0.05));
            color: #fff;
            box-shadow:
              0 0 22px rgba(201,205,211,0.2),
              inset 0 1px 0 rgba(255,255,255,0.12);
          }

          .badge-grail::before {
            content: "✦";
            color: #fff;
            font-size: 10px;
            line-height: 1;
          }

          .badge-raw {
            border-color: rgba(201,205,211,0.24);
            background: rgba(201,205,211,0.055);
            color: #C9CDD3;
          }

          .badge-collection {
            border-color: rgba(201,205,211,0.38);
            background: rgba(201,205,211,0.08);
            color: #C9CDD3;
          }

          .value-badge {
            min-height: 22px;
            border: 1px solid rgba(201,205,211,0.26);
            border-radius: 999px;
            background: rgba(8,8,10,0.7);
            color: #C9CDD3;
            padding: 0 8px;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            font-size: 10px;
            line-height: 12px;
            font-weight: 900;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            white-space: nowrap;
          }

          .value-badge-value {
            border-color: rgba(201,205,211,0.48);
            background:
              linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.015)),
              rgba(201,205,211,0.08);
            color: #f4f4f5;
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.1);
          }

          .value-badge-fair {
            border-color: rgba(231,222,208,0.48);
            background: rgba(231,222,208,0.09);
            color: #E7DED0;
          }

          .value-badge-premium {
            border-color: rgba(141,148,157,0.34);
            background: rgba(5,5,6,0.82);
            color: #C9CDD3;
          }

          .listing-title {
            grid-area: title;
            margin: 0;
            font-size: 16px;
            line-height: 21px;
            font-weight: 900;
          }

          .listing-title-link {
            color: #fff;
            text-decoration: none;
            display: -webkit-box;
            overflow: hidden;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }

          .listing-title-link:hover,
          .seller-link:hover,
          .view-card:hover {
            color: #fff;
            text-decoration: underline;
            text-decoration-color: rgba(231,222,208,0.82);
            text-underline-offset: 3px;
          }

          .listing-meta {
            grid-area: meta;
            margin: 0;
            color: #a1a1aa;
            font-size: 12px;
            line-height: 16px;
            font-weight: 700;
          }

          .seller-line {
            grid-area: seller;
            margin: 0;
            color: #C9CDD3;
            font-size: 12px;
            line-height: 15px;
            font-weight: 800;
          }

          .seller-link {
            color: #E7DED0;
            text-decoration: none;
          }

          .listing-footer {
            grid-area: footer;
            margin-top: auto;
            display: grid;
            gap: 12px;
            padding-top: 3px;
          }

          .listing-grid.compact-view .listing-footer {
            margin-top: 0;
            grid-template-columns: auto 1fr;
            align-items: center;
            gap: 14px;
            padding-top: 0;
          }

          .listing-price {
            color: #fff;
            font-size: 24px;
            line-height: 27px;
            font-weight: 900;
          }

          .listing-grid.compact-view .listing-price {
            font-size: 20px;
            line-height: 23px;
          }

          .listing-actions {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
            flex-wrap: nowrap;
          }

          .listing-grid.compact-view .listing-actions {
            justify-content: flex-end;
          }

          .action-circles {
            display: flex;
            align-items: center;
            gap: 12px;
            flex: 0 0 auto;
          }

          .owner-note {
            margin: 0;
            border: 1px solid rgba(201,205,211,0.18);
            border-radius: 999px;
            background: rgba(201,205,211,0.06);
            color: #C9CDD3;
            min-height: 34px;
            padding: 0 11px;
            display: inline-flex;
            align-items: center;
            font-size: 11px;
            line-height: 14px;
            font-weight: 900;
            white-space: nowrap;
          }

          .action-button {
            width: 46px;
            height: 46px;
            position: relative;
            overflow: hidden;
            border: 1px solid rgba(231,222,208,0.26);
            border-radius: 999px;
            background:
              radial-gradient(circle at 48% 20%, rgba(255,255,255,0.22), transparent 38%),
              radial-gradient(circle at 50% 115%, rgba(231,222,208,0.12), transparent 46%),
              linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.012)),
              rgba(9,9,11,0.94);
            color: #E7DED0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            padding: 0;
            font-weight: 900;
            cursor: pointer;
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,0.12),
              inset 0 -10px 18px rgba(0,0,0,0.28),
              0 12px 24px rgba(0,0,0,0.3);
            transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease, color 160ms ease, transform 160ms ease;
          }

          .action-button::before {
            content: "";
            position: absolute;
            left: 9px;
            right: 9px;
            top: 7px;
            height: 13px;
            border-radius: 999px;
            background: linear-gradient(180deg, rgba(255,255,255,0.2), transparent);
            opacity: 0.82;
            pointer-events: none;
          }

          .listing-grid.compact-view .action-button {
            width: 38px;
            height: 38px;
          }

          .action-button:hover {
            border-color: rgba(231,222,208,0.68);
            background:
              radial-gradient(circle at 48% 20%, rgba(255,255,255,0.3), transparent 40%),
              radial-gradient(circle at 50% 115%, rgba(231,222,208,0.18), transparent 48%),
              rgba(231,222,208,0.09);
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,0.16),
              inset 0 -10px 18px rgba(0,0,0,0.22),
              0 0 24px rgba(201,205,211,0.22),
              0 14px 26px rgba(0,0,0,0.36);
            color: #fff;
            transform: translateY(-2px);
          }

          .action-icon {
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: currentColor;
            font-size: 18px;
            line-height: 1;
            z-index: 1;
          }

          .cart-icon {
            width: 17px;
            height: 12px;
            border: 2px solid currentColor;
            border-top: 0;
            border-radius: 3px;
          }

          .cart-icon::before {
            content: "";
            position: absolute;
            left: -4px;
            top: -5px;
            width: 7px;
            height: 2px;
            border-radius: 999px;
            background: currentColor;
            transform: rotate(18deg);
          }

          .cart-icon::after {
            content: "";
            position: absolute;
            left: 1px;
            bottom: -7px;
            width: 3px;
            height: 3px;
            border-radius: 999px;
            background: currentColor;
            box-shadow: 9px 0 0 currentColor;
          }

          .message-icon {
            width: 18px;
            height: 13px;
            border: 2px solid currentColor;
            border-radius: 3px;
          }

          .message-icon::after {
            content: "";
            position: absolute;
            left: 3px;
            top: 2px;
            width: 8px;
            height: 8px;
            border-right: 2px solid currentColor;
            border-bottom: 2px solid currentColor;
            transform: rotate(45deg);
          }

          .view-card {
            height: 34px;
            min-width: 88px;
            flex: 0 0 auto;
            border: 1px solid rgba(231,222,208,0.26);
            border-radius: 8px;
            background: rgba(231,222,208,0.055);
            color: #fff;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 900;
            text-decoration: none;
            transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
          }

          .view-card:hover {
            border-color: rgba(231,222,208,0.62);
            background: rgba(231,222,208,0.1);
            box-shadow: 0 0 18px rgba(201,205,211,0.12);
          }

          .empty-state {
            min-height: 260px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 28px;
            box-sizing: border-box;
          }

          .empty-state h2 {
            margin: 0;
            color: #fff;
            font-size: 22px;
            line-height: 26px;
            font-weight: 900;
          }

          .empty-state p {
            margin: 8px 0 0;
            color: #a1a1aa;
            font-size: 13px;
            line-height: 18px;
            font-weight: 800;
          }

          .fallback-note {
            margin: 0 0 10px;
            border: 1px solid rgba(201,205,211,0.16);
            border-radius: 9px;
            background: rgba(8,8,10,0.72);
            color: #C9CDD3;
            padding: 9px 10px;
            font-size: 11px;
            line-height: 15px;
            font-weight: 800;
          }

          .right-stack {
            display: grid;
            gap: 14px;
          }

          .side-panel {
            padding: 14px;
          }

          .side-subtitle {
            margin: 8px 0 0;
            color: #9ca3af;
            font-size: 11px;
            line-height: 16px;
            font-weight: 800;
          }

          .snapshot-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 13px;
          }

          .metric {
            min-height: 64px;
            border: 1px solid #1d1d22;
            border-radius: 9px;
            background: rgba(8,8,10,0.78);
            padding: 10px;
            box-sizing: border-box;
          }

          .metric span {
            display: block;
            color: #85858f;
            font-size: 10px;
            line-height: 13px;
            font-weight: 800;
          }

          .metric strong {
            display: block;
            margin-top: 6px;
            color: #fff;
            font-size: 18px;
            line-height: 20px;
            font-weight: 900;
          }

          .market-index {
            margin-top: 13px;
            border: 1px solid #1d1d22;
            border-radius: 10px;
            background:
              radial-gradient(circle at 78% 8%, rgba(231,222,208,0.1), transparent 34%),
              rgba(8,8,10,0.78);
            padding: 11px;
          }

          .market-index-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 10px;
          }

          .market-index-header span {
            color: #E7DED0;
            font-size: 11px;
            line-height: 14px;
            font-weight: 900;
            letter-spacing: 0.04em;
            text-transform: uppercase;
          }

          .market-index-header strong {
            color: #fff;
            font-size: 18px;
            line-height: 20px;
            font-weight: 900;
          }

          .market-chart {
            width: 100%;
            height: 86px;
            margin-top: 8px;
            display: block;
          }

          .chart-fill {
            fill: rgba(231, 222, 208, 0.1);
          }

          .chart-line {
            fill: none;
            stroke: #E7DED0;
            stroke-width: 3;
            stroke-linecap: round;
            stroke-linejoin: round;
            filter: drop-shadow(0 0 8px rgba(231,222,208,0.18));
          }

          .chart-grid path {
            stroke: rgba(201,205,211,0.08);
            stroke-width: 1;
          }

          .market-index-caption {
            margin: 6px 0 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            color: #9ca3af;
            font-size: 10px;
            line-height: 13px;
            font-weight: 800;
          }

          .market-index-caption span {
            color: #E7DED0;
            font-weight: 900;
          }

          .seller-list {
            display: grid;
            gap: 10px;
            margin-top: 14px;
          }

          .seller-row {
            display: grid;
            grid-template-columns: 34px 1fr auto;
            gap: 9px;
            align-items: center;
            color: inherit;
            text-decoration: none;
          }

          .seller-avatar {
            width: 32px;
            height: 32px;
            border-radius: 999px;
            border: 1px solid rgba(201,205,211,0.22);
            background: linear-gradient(135deg, #1f2937, #050506);
            color: #E7DED0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 900;
          }

          .seller-row strong {
            display: block;
            color: #fff;
            font-size: 12px;
            line-height: 15px;
            font-weight: 900;
          }

          .seller-row span {
            display: block;
            margin-top: 2px;
            color: #85858f;
            font-size: 10px;
            line-height: 13px;
            font-weight: 800;
          }

          .seller-trust {
            border: 1px solid rgba(231,222,208,0.26);
            border-radius: 999px;
            color: #E7DED0;
            background: rgba(231,222,208,0.06);
            padding: 4px 7px;
            font-size: 9px;
            font-weight: 900;
            white-space: nowrap;
          }

          .seller-rewards-note {
            margin: 13px 0 0;
            border-top: 1px solid #19191f;
            padding-top: 11px;
            color: #C9CDD3;
            font-size: 11px;
            line-height: 16px;
            font-weight: 800;
          }

          @media (max-width: 1100px) {
            .browse-shell {
              width: calc(100vw - 32px);
            }

            .title-row,
            .toolbar,
            .dashboard {
              grid-template-columns: 1fr;
            }

            .title-row {
              display: grid;
              align-items: start;
            }

            .toolbar {
              align-items: stretch;
            }

            .sort-select {
              width: 100%;
              justify-content: space-between;
            }

            .value-info-note {
              align-items: flex-start;
              flex-direction: column;
            }

            .value-info-note a {
              white-space: normal;
            }

            .view-toggle {
              width: 100%;
            }

            .view-button {
              flex: 1;
            }

            .listing-grid {
              grid-template-columns: 1fr;
            }

            .right-stack {
              grid-template-columns: 1fr;
            }
          }
        `}
      </style>

      <div className="browse-shell">
        <Header />

        <section className="title-row">
          <div>
            <h1>Browse Cards</h1>
            <p>
              Discover sports cards, TCG cards, slabs, raw cards, and collector
              listings.
            </p>
          </div>

          <Link className="primary-action" href="/list">
            List a Card
          </Link>
        </section>

        <section className="toolbar" aria-label="Browse controls">
          <label className="search-box">
            <span className="search-icon" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => {
                setHasLocalSearch(true);
                setLocalSearchQuery(event.target.value);
              }}
              placeholder="Search by player, card, set, seller..."
              aria-label="Search listings"
            />
          </label>

          <button
            type="button"
            className={`toolbar-button ${sortMode === "newest" ? "active" : ""}`}
            aria-pressed={sortMode === "newest"}
            onClick={() => setSortMode("newest")}
          >
            Newly Listed
          </button>

          <button
            type="button"
            className={`toolbar-button ${sortMode === "hot" ? "active" : ""}`}
            aria-pressed={sortMode === "hot"}
            onClick={() => setSortMode("hot")}
          >
            Hot Cards
          </button>

          <label className="sort-select">
            <span>Sort</span>
            <select
              value={sortMode === "hot" ? "newest" : sortMode}
              onChange={(event) => setSortMode(event.target.value as BrowseSortMode)}
              aria-label="Sort listings"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="view-toggle" aria-label="View mode">
            <button
              type="button"
              className={`view-button ${viewMode === "grid" ? "active" : ""}`}
              aria-pressed={viewMode === "grid"}
              onClick={() => setViewMode("grid")}
            >
              Grid
            </button>
            <button
              type="button"
              className={`view-button ${
                viewMode === "compact" ? "active" : ""
              }`}
              aria-pressed={viewMode === "compact"}
              onClick={() => setViewMode("compact")}
            >
              Compact
            </button>
          </div>

          <div className="results-count">{resultLabel}</div>
        </section>

        <section className="value-info-note">
          <p>
            Market-value badges compare the asking price with the listing&apos;s
            saved SportsCardsPro estimate. Estimates may vary by grade, parallel,
            condition, and recent market activity.
          </p>
          <Link href="https://www.sportscardspro.com" target="_blank" rel="noreferrer">
            Market estimates powered by SportsCardsPro
          </Link>
        </section>

        <section className="dashboard">
          <aside className="panel filters" aria-label="Filters">
            <div className="filters-header">
              <h2>FILTERS</h2>
              <button type="button" className="reset-button" onClick={resetFilters}>
                Reset
              </button>
            </div>

            <FilterGroup
              title="Category"
              options={categoryFilters}
              selectedOptions={selectedCategoryFilters}
              onToggleOption={(option) =>
                toggleStringFilter(option, setSelectedCategoryFilters)
              }
            />
            <FilterGroup
              title="Price"
              options={priceFilters}
              selectedOptions={selectedPriceFilters}
              onToggleOption={(option) =>
                toggleStringFilter(option, setSelectedPriceFilters)
              }
            />
            <GradeFilters
              openGraders={openGraders}
              onToggle={toggleGrader}
              rawSelected={rawSelected}
              selectedGradeOptions={selectedGradeOptions}
              onToggleRaw={() => setRawSelected((current) => !current)}
              onToggleGrade={toggleGradeFilter}
            />
            <SellerFilters
              multiListingSellersOnly={multiListingSellersOnly}
              newListingsOnly={newListingsOnly}
              onToggleMultiListingSellers={() =>
                setMultiListingSellersOnly((current) => !current)
              }
              onToggleNewListings={() =>
                setNewListingsOnly((current) => !current)
              }
            />
          </aside>

          <section aria-label="Card listings">
            {fallbackNote ? <p className="fallback-note">{fallbackNote}</p> : null}

            {isLoading ? (
              <div className="panel empty-state">
                <h2>Loading listings...</h2>
              </div>
            ) : visibleListings.length > 0 ? (
              <div className={`listing-grid ${viewMode}-view`}>
                {visibleListings.map((listing, listingIndex) => {
                  const tag = getListingTag(listing);
                  const isOwnerListing =
                    Boolean(currentUserId) && listing.sellerId === currentUserId;
                  const isCollectionOnly = tag === "Collection" || listing.isCollectionOnly;
                  const canUseBuyerActions = !isOwnerListing;

                  return (
                    <article key={listing.href} className="listing-card">
                      <div className="listing-badge-row">
                        <span className={`badge badge-${tag.toLowerCase()}`}>
                          {tag}
                        </span>
                        {listing.valueBadge ? (
                          <span
                            className={`value-badge value-badge-${listing.valueBadge.classification}`}
                            title={listing.valueBadge.title}
                          >
                            <span aria-hidden="true">{listing.valueBadge.icon}</span>
                            {listing.valueBadge.label}
                          </span>
                        ) : null}
                      </div>

                      <Link
                      className="art-link"
                      href={listing.href}
                      aria-label={`View ${listing.title}`}
                    >
                        <CardArtwork
                          accent={listing.accent}
                          category={listing.category}
                          condition={listing.condition}
                          imageUrl={listing.imageUrl}
                          preload={listingIndex === 0}
                          title={listing.title}
                        />
                      </Link>

                      <h2 className="listing-title">
                        <Link className="listing-title-link" href={listing.href}>
                          {listing.title}
                        </Link>
                      </h2>
                      <p className="listing-meta">
                        {listing.meta}
                      </p>
                      <p className="seller-line">
                        Seller:{" "}
                        <Link className="seller-link" href={listing.sellerHref}>
                          {listing.seller}
                        </Link>
                      </p>

                      <div className="listing-footer">
                        <strong className="listing-price">
                          {listing.priceDisplay}
                        </strong>
                        <div className="listing-actions">
                          {isOwnerListing ? (
                            <p className="owner-note">This is your listing.</p>
                          ) : canUseBuyerActions ? (
                            <div className="action-circles">
                              {!isCollectionOnly ? (
                                <Link
                                  href={`/checkout/${listing.id}`}
                                  className="action-button"
                                  aria-label={`Buy ${listing.title}`}
                                  title="Buy"
                                >
                                  <span
                                    className="action-icon cart-icon"
                                    aria-hidden="true"
                                  />
                                </Link>
                              ) : null}
                              <button
                                type="button"
                                className="action-button"
                                aria-label={`Message ${listing.seller}`}
                                title="Message"
                                onClick={() => openMessageModal(listing)}
                              >
                                <span
                                  className="action-icon message-icon"
                                  aria-hidden="true"
                                />
                              </button>
                              <button
                                type="button"
                                className="action-button"
                                aria-label={`Make offer on ${listing.title}`}
                                title="Make Offer"
                                onClick={() => openOfferModal(listing)}
                              >
                                <span className="action-icon" aria-hidden="true">
                                  $
                                </span>
                              </button>
                            </div>
                          ) : null}

                          <Link className="view-card" href={listing.href}>
                            View Card
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="panel empty-state">
                <h2>
                  {listings.length === 0
                    ? "No active listings yet."
                    : "No listings match these filters."}
                </h2>
                <p>
                  {listings.length === 0
                    ? "Active marketplace listings will appear here as collectors list cards."
                    : "Try a different search or clear the filters."}
                </p>
              </div>
            )}
          </section>

          <aside className="right-stack" aria-label="Market panels">
            <section className="panel side-panel">
              <h2>GRAIL MARKET SNAPSHOT</h2>
              <p className="side-subtitle">
                Live activity from cards listed and sold on GRAIL.
              </p>

              <div className="snapshot-grid">
                <div className="metric">
                  <span>Active Listings</span>
                  <strong>{marketSnapshot.activeListings}</strong>
                </div>
                <div className="metric">
                  <span>New This Week</span>
                  <strong>{marketSnapshot.newThisWeek}</strong>
                </div>
                <div className="metric">
                  <span>Avg List Price</span>
                  <strong>
                    {marketSnapshot.averageListPrice
                      ? formatCurrency(marketSnapshot.averageListPrice)
                      : "Pending"}
                  </strong>
                </div>
                <div className="metric">
                  <span>Completed Sales</span>
                  <strong>
                    {marketSnapshot.completedSales === null
                      ? "Pending"
                      : marketSnapshot.completedSales}
                  </strong>
                </div>
              </div>

              <div className="market-index">
                <div className="market-index-header">
                  <span>Marketplace Volume</span>
                  <strong>
                    {marketSnapshot.marketplaceVolume === null
                      ? "Pending"
                      : formatCurrency(marketSnapshot.marketplaceVolume)}
                  </strong>
                </div>
                <p className="market-index-caption">
                  Internal GRAIL sales data only. No external card market index
                  is shown here.
                </p>
              </div>
            </section>

            <section className="panel side-panel">
              <h2>FEATURED SELLERS</h2>
              <p className="side-subtitle">
                Earn placement by selling, shipping fast, and leveling up.
              </p>

              <div className="seller-list">
                {featuredSellers.length === 0 ? (
                  <p className="seller-rewards-note">
                    Featured sellers will appear as collectors start listing cards.
                  </p>
                ) : (
                  featuredSellers.map((seller) => (
                  <Link
                    key={seller.sellerId}
                    className="seller-row"
                    href={seller.route}
                  >
                    <span className="seller-avatar">{seller.initials}</span>
                    <div>
                      <strong>{seller.name}</strong>
                      <span>
                        {seller.listingCount} active{" "}
                        {seller.listingCount === 1 ? "listing" : "listings"}
                      </span>
                    </div>
                    <span className="seller-trust">Live</span>
                  </Link>
                  ))
                )}
              </div>

              <p className="seller-rewards-note">
                Seller Rewards can boost your visibility on Browse.
              </p>
            </section>
          </aside>
        </section>
      </div>

      {offerListing ? (
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
                <h2>{offerListing.title}</h2>
              </div>
              <button
                type="button"
                aria-label="Close offer modal"
                onClick={closeOfferModal}
              >
                x
              </button>
            </div>

            <div className="offer-summary-grid">
              <div className="offer-summary-item">
                <span>{offerListing.isCollectionOnly ? "Sale Status" : "Asking Price"}</span>
                <strong>{offerListing.priceDisplay}</strong>
              </div>
              <div className="offer-summary-item">
                <span>Market Value</span>
                <strong>
                  {offerListing.marketValue > 0
                    ? formatCurrency(offerListing.marketValue)
                    : "Market data pending"}
                </strong>
              </div>
              <div className="offer-summary-item">
                <span>Minimum Offer</span>
                <strong>
                  {offerListing.minOffer > 0
                    ? formatCurrency(offerListing.minOffer)
                    : "Any offer"}
                </strong>
              </div>
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
                <p>Status: Pending.</p>
                <p>Seller has 24 hours to respond.</p>
              </div>
            ) : null}

            {!sentOfferAmount ? (
              <div className="offer-modal-actions">
                <button
                  type="button"
                  className="submit-offer"
                  disabled={isSubmittingOffer}
                  onClick={submitOffer}
                >
                  {isSubmittingOffer ? "Sending..." : "Submit Offer"}
                </button>
                <button type="button" onClick={closeOfferModal}>
                  Cancel
                </button>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {messageListing ? (
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
                <h2>{messageListing.title}</h2>
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
              <CardArtwork
                accent={messageListing.accent}
                category={messageListing.category}
                condition={messageListing.condition}
                imageUrl={messageListing.imageUrl}
                title={messageListing.title}
              />
              <div>
                <span>Seller</span>
                <strong>{messageListing.seller}</strong>
                <p>{messageListing.meta}</p>
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
                <Link className="submit-offer" href={messageSuccessHref}>
                  Open Conversation
                </Link>
              </div>
            ) : (
              <div className="offer-modal-actions">
                <button
                  type="button"
                  className="submit-offer"
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
    </main>
  );
}
