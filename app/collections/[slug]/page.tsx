"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";
import CollectorIdentityCard, {
  type CollectorIdentityBadge,
} from "../../components/CollectorIdentityCard";
import Header from "../../components/Header";
import PublicTrustSection from "../../components/PublicTrustSection";
import {
  type ListingTag,
  type MockConversation,
  type MockListing,
  type MockSeller,
  buildMockSellerListings,
  mockSellers,
} from "../../lib/mockData";

type FilterMode = "All" | ListingTag;
type Listing = MockListing & {
  imageUrl?: string | null;
  source?: "mock" | "supabase";
  sellerId?: string | null;
};

type StudioMode = "showcase" | "featured" | null;

type CollectionCurationPreferences = {
  showcaseCardId: string | null;
  featuredCardIds: string[];
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
  condition: string | null;
  price: number | null;
  status: string | null;
  created_at: string | null;
  is_collection_card?: boolean | null;
  is_public_collection?: boolean | null;
  listing_images: ListingImageRow[] | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
};

const sellers = mockSellers;
const buildSellerListings = buildMockSellerListings;
const mockConversationStorageKey = "grail-mock-conversations";
const collectionCurationStorageKey = "grail-collection-curation";

const filterModes: FilterMode[] = ["All", "Grail", "Hot", "Graded", "Raw"];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function getCollectionCurationStorageKey(collectionId: string) {
  return `${collectionCurationStorageKey}:${collectionId}`;
}

function getDefaultCurationPreferences(): CollectionCurationPreferences {
  return {
    showcaseCardId: null,
    featuredCardIds: [],
  };
}

function readCollectionCurationPreferences(collectionId: string) {
  if (typeof window === "undefined") {
    return getDefaultCurationPreferences();
  }

  try {
    const storedPreferences = window.localStorage.getItem(
      getCollectionCurationStorageKey(collectionId),
    );

    if (!storedPreferences) {
      return getDefaultCurationPreferences();
    }

    const parsedPreferences = JSON.parse(storedPreferences) as Partial<CollectionCurationPreferences>;

    return {
      showcaseCardId:
        typeof parsedPreferences.showcaseCardId === "string"
          ? parsedPreferences.showcaseCardId
          : null,
      featuredCardIds: Array.isArray(parsedPreferences.featuredCardIds)
        ? parsedPreferences.featuredCardIds.filter(
            (item): item is string => typeof item === "string",
          )
        : [],
    };
  } catch (error) {
    console.error("Collection curation preference read error:", error);
    return getDefaultCurationPreferences();
  }
}

function saveCollectionCurationPreferences(
  collectionId: string,
  preferences: CollectionCurationPreferences,
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      getCollectionCurationStorageKey(collectionId),
      JSON.stringify(preferences),
    );
  } catch (error) {
    console.error("Collection curation preference save error:", error);
  }
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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function getProfileSlug(profile: ProfileRow) {
  const username = profile.username?.replace(/^@/, "").trim();

  if (username) {
    return encodeURIComponent(username);
  }

  return profile.id;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "GS";
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
  listing: Listing,
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

function getImageUrl(listing: SupabaseListingRow) {
  return (
    listing.listing_images?.find((image) => image.image_type === "front")
      ?.image_url ||
    listing.listing_images?.[0]?.image_url ||
    null
  );
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

function buildRealSeller(profile: ProfileRow, listings: SupabaseListingRow[]): MockSeller {
  const sellerSlug = getProfileSlug(profile);
  const sellerName = profile.full_name || profile.username || "GRAIL Seller";
  const totalValue = listings.reduce(
    (sum, listing) => sum + Number(listing.price || 0),
    0,
  );
  const averagePrice =
    listings.length > 0 ? Math.round(totalValue / listings.length) : 0;

  return {
    slug: sellerSlug,
    name: sellerName,
    initials: getInitials(sellerName),
    level: "GRAIL Seller",
    rewardsBadge: "Seller",
    completedSales: 0,
    activeListings: listings.length,
    responseTime: "Same day",
    shipSpeed: "2 business days",
    rating: "New seller",
    reviews: 0,
    joinedDate: "GRAIL Seller",
    location: "United States",
    bio: "Live GRAIL seller collection.",
    collectionValue: totalValue,
    avgListingPrice: averagePrice,
    fastShippingStreak: "Not available",
    responseScore: "New",
    cancellationRate: "N/A",
    sellerTags: ["Seller"],
    levelProgress: 0,
    buyerRating: "New",
    priceOffset: 0,
    route: `/collections/${sellerSlug}`,
  };
}

function mapSupabaseListing(
  listing: SupabaseListingRow,
  seller: MockSeller,
  index: number,
  totalCount: number,
): Listing {
  const category = getCategory(listing);
  const condition = getConditionDisplay(listing);
  const price = Number(listing.price || 0);
  const status = listing.status?.toLowerCase() || "";
  const isCollectionOnly =
    status !== "active" &&
    (status === "collection" ||
      Boolean(listing.is_collection_card) ||
      Boolean(listing.is_public_collection));
  const displayPrice = isCollectionOnly ? 0 : price;
  const isGraded = Boolean(listing.grader && listing.grade) ||
    listing.card_type?.toLowerCase() === "graded";
  const tag = isCollectionOnly ? "Collection" : isGraded ? "Graded" : "Raw";
  const title =
    listing.title ||
    [listing.year, listing.brand, listing.player].filter(Boolean).join(" ") ||
    "Untitled Card";
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
    sellerSlug: seller.slug,
    sellerId: listing.seller_id,
    sellerName: seller.name,
    seller: seller.name,
    sellerLevel: seller.level,
    sellerRoute: seller.route,
    sellerHref: seller.route,
    price: displayPrice,
    priceDisplay: isCollectionOnly
      ? "Open to Offers"
      : price
        ? formatCurrency(price)
        : "Price not listed",
    askingPrice: displayPrice,
    marketValue: 0,
    minimumOffer: displayPrice ? Math.round(displayPrice * 0.85) : 0,
    minOffer: displayPrice ? Math.round(displayPrice * 0.85) : 0,
    watchCount: 0,
    views: 0,
    viewCount: 0,
    listedOrder: totalCount - index,
    listedDate: formatListedDate(listing.created_at),
    tags: [tag],
    tag,
    isGraded,
    isRaw: !isGraded,
    isHot: false,
    isGrail: false,
    isCollectionOnly,
    listingStatus: listing.status,
    accent: "#334155",
    artworkTone: "live listing",
    imageUrl: getImageUrl(listing),
    source: "supabase",
    cardDetailRoute: route,
    sellerCollectionRoute: seller.route,
    details: {
      year: listing.year || "Unknown",
      set: listing.brand || "Unknown",
      cardNumber: listing.card_number || "Unknown",
      subject: listing.player || "Unknown",
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

function CardArtwork({
  listing,
}: {
  listing: Listing;
}) {
  const isRaw = listing.tag === "Raw";
  const shortTitle = listing.title.split(" ").slice(0, 2).join(" ");

  return (
    <div className="art-shell">
      {listing.imageUrl ? (
        <Image
          className="uploaded-card-image"
          src={listing.imageUrl}
          alt={listing.title}
          width={156}
          height={210}
          unoptimized
        />
      ) : (
      <div className={`mock-card ${isRaw ? "raw-card" : "slab-card"}`}>
        {!isRaw ? (
          <div className="mock-label">
            <span>{listing.condition}</span>
            <span>{listing.category}</span>
          </div>
        ) : null}
        <div
          className="mock-art"
          style={{
            background: `radial-gradient(circle at 50% 19%, rgba(231,222,208,0.34), transparent 17%), radial-gradient(circle at 24% 72%, ${listing.accent}66, transparent 29%), linear-gradient(145deg, ${listing.accent}, #111827 54%, #030304)`,
          }}
        >
          <span className="mock-card-code">{listing.category}</span>
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

function MarketChart() {
  return (
    <svg
      className="market-chart"
      viewBox="0 0 260 92"
      role="img"
      aria-label="Mock collection value chart"
    >
      <path
        className="chart-fill"
        d="M8 74 C32 64 42 47 66 53 C92 59 102 32 128 38 C154 44 164 69 188 55 C210 42 222 28 252 20 L252 84 L8 84 Z"
      />
      <path
        className="chart-line"
        d="M8 74 C32 64 42 47 66 53 C92 59 102 32 128 38 C154 44 164 69 188 55 C210 42 222 28 252 20"
      />
      <g className="chart-grid" aria-hidden="true">
        <path d="M8 28 H252" />
        <path d="M8 54 H252" />
        <path d="M8 82 H252" />
      </g>
    </svg>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getListingValue(listing: Listing) {
  return Number(listing.marketValue || listing.price || 0);
}

function getListingYear(listing: Listing) {
  const year = Number.parseInt(listing.details?.year || "", 10);
  return Number.isFinite(year) ? year : null;
}

function getGradeValue(listing: Listing) {
  const grade = Number.parseFloat(listing.details?.grade || listing.condition || "");
  return Number.isFinite(grade) ? grade : 0;
}

function getUniqueCategories(listings: Listing[]) {
  return Array.from(new Set(listings.map((listing) => listing.category).filter(Boolean)));
}

function getCollectionPersonality(listings: Listing[]) {
  if (listings.length === 0) {
    return "Curated Collection";
  }

  const categories = getUniqueCategories(listings);
  const gradedCount = listings.filter((listing) => listing.isGraded).length;
  const rookieCount = listings.filter((listing) =>
    `${listing.title} ${listing.overview}`.toLowerCase().includes("rookie"),
  ).length;
  const years = listings
    .map(getListingYear)
    .filter((year): year is number => Boolean(year));
  const newestYear = years.length ? Math.max(...years) : null;
  const oldestYear = years.length ? Math.min(...years) : null;

  if (categories.includes("TCG") && categories.length === 1) {
    return "TCG";
  }

  if (categories.length > 1) {
    return "Multi-Sport";
  }

  if (rookieCount >= Math.max(2, Math.ceil(listings.length * 0.35))) {
    return "Rookie Focus";
  }

  if (oldestYear && oldestYear < 1990) {
    return "Vintage Focus";
  }

  if (newestYear && newestYear >= 2020) {
    return "Modern Collection";
  }

  if (gradedCount >= Math.ceil(listings.length * 0.6)) {
    return "Graded Showcase";
  }

  if (listings.length <= 6) {
    return "Focused Collection";
  }

  return "Curated Collection";
}

function getCollectionReputation(listings: Listing[], totalValue: number) {
  if (listings.length === 0) {
    return null;
  }

  if (totalValue >= 50000) {
    return "Premium Collection";
  }

  if (listings.length >= 25) {
    return "Legacy Collection";
  }

  if (listings.some((listing) => listing.isGrail || listing.tag === "Grail")) {
    return "Curated Collection";
  }

  if (listings.length >= 10) {
    return "Focused Collection";
  }

  return "Growing Collection";
}

function getShowcaseCard(
  listings: Listing[],
  highestValueCard: Listing | null,
): Listing | null {
  return (
    listings.find((listing) => listing.isGrail || listing.tag === "Grail") ||
    listings.find((listing) => listing.isHot || listing.tag === "Hot") ||
    highestValueCard ||
    listings[0] ||
    null
  );
}

function getNewestCard(listings: Listing[]): Listing | null {
  return listings[0] || null;
}

function getOldestCard(listings: Listing[]): Listing | null {
  const cardsWithYears = listings
    .map((listing) => ({ listing, year: getListingYear(listing) }))
    .filter((item): item is { listing: Listing; year: number } => item.year !== null);

  if (cardsWithYears.length === 0) {
    return null;
  }

  return cardsWithYears.reduce((oldest, item) =>
    item.year < oldest.year ? item : oldest,
  ).listing;
}

function getHighestGradeCard(listings: Listing[]) {
  return listings.reduce<Listing | null>((best, listing) => {
    const value = getGradeValue(listing);

    if (value <= 0) {
      return best;
    }

    if (!best || value > getGradeValue(best)) {
      return listing;
    }

    return best;
  }, null);
}

function HighlightCard({
  label,
  listing,
  fallback,
}: {
  label: string;
  listing: Listing | null;
  fallback?: string;
}) {
  return (
    <article className="highlight-card">
      <span>{label}</span>
      {listing ? (
        <>
          <strong>{listing.title}</strong>
          <small>
            {listing.conditionDisplay} · {listing.priceDisplay}
          </small>
        </>
      ) : (
        <strong>{fallback || "Waiting for cards"}</strong>
      )}
    </article>
  );
}

export default function SellerCollectionPage() {
  const params = useParams();
  const slug = String(params.slug || "");
  const decodedSlug = decodeURIComponent(slug);
  const mockSeller = sellers.find((item) => item.slug === slug);
  const [realSeller, setRealSeller] = useState<MockSeller | null>(null);
  const [realSellerUserId, setRealSellerUserId] = useState<string | null>(null);
  const [realListings, setRealListings] = useState<Listing[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoadingRealSeller, setIsLoadingRealSeller] = useState(!mockSeller);
  const [filterMode, setFilterMode] = useState<FilterMode>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [curationPreferences, setCurationPreferences] =
    useState<CollectionCurationPreferences>(() =>
      readCollectionCurationPreferences(decodedSlug || slug),
    );
  const [studioMode, setStudioMode] = useState<StudioMode>(null);
  const [draftShowcaseCardId, setDraftShowcaseCardId] = useState<string | null>(null);
  const [draftFeaturedCardIds, setDraftFeaturedCardIds] = useState<string[]>([]);
  const [messageListing, setMessageListing] = useState<Listing | null>(null);
  const [messageBody, setMessageBody] = useState("");
  const [messageError, setMessageError] = useState("");
  const [messageSuccessHref, setMessageSuccessHref] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [offerListing, setOfferListing] = useState<Listing | null>(null);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [offerError, setOfferError] = useState("");
  const [sentOfferAmount, setSentOfferAmount] = useState<number | null>(null);
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const studioCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const seller = mockSeller ?? realSeller;
  const allListings = useMemo<Listing[]>(() => {
    if (mockSeller) {
      return buildSellerListings(mockSeller);
    }

    return realListings;
  }, [mockSeller, realListings]);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        setCurrentUserId(session?.user.id ?? null);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user.id ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadRealSeller() {
      if (mockSeller || !decodedSlug) {
        setRealSeller(null);
        setRealSellerUserId(null);
        setRealListings([]);
        setIsLoadingRealSeller(false);
        return;
      }

      setIsLoadingRealSeller(true);

      try {
        const { data: usernameProfile, error: usernameError } = await supabase
          .from("profiles")
          .select("id, full_name, username")
          .eq("username", decodedSlug)
          .maybeSingle();

        if (usernameError) {
          console.error("Collection username profile fetch error:", usernameError);
        }

        let profile = usernameProfile as ProfileRow | null;

        if (!profile && isUuid(decodedSlug)) {
          const { data: idProfile, error: idError } = await supabase
            .from("profiles")
            .select("id, full_name, username")
            .eq("id", decodedSlug)
            .maybeSingle();

          if (idError) {
            console.error("Collection id profile fetch error:", idError);
          } else {
            profile = idProfile as ProfileRow | null;
          }
        }

        if (!profile) {
          if (isMounted) {
            setRealSeller(null);
            setRealSellerUserId(null);
            setRealListings([]);
          }
          return;
        }

        const { data: listingData, error: listingError } = await supabase
          .from("listings")
          .select(
            `
              id,
              seller_id,
              title,
              sport,
              player,
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
              listing_images (
                image_url,
                image_type
              )
            `,
          )
          .eq("seller_id", profile.id)
          .or("status.eq.active,status.eq.collection,is_public_collection.eq.true")
          .order("created_at", { ascending: false });

        if (listingError) {
          throw listingError;
        }

        const rows = ((listingData || []) as SupabaseListingRow[]).filter((listing) => {
          const status = listing.status?.toLowerCase();
          return (
            status === "active" ||
            status === "collection" ||
            (Boolean(listing.is_public_collection) &&
              status !== "inactive" &&
              status !== "deleted" &&
              status !== "sold")
          );
        });
        const mappedSeller = buildRealSeller(profile, rows);
        const mappedListings = rows.map((listing, index) =>
          mapSupabaseListing(listing, mappedSeller, index, rows.length),
        );

        if (isMounted) {
          setRealSeller(mappedSeller);
          setRealSellerUserId(profile.id);
          setRealListings(mappedListings);
        }
      } catch (error) {
        console.error("Collection seller fetch error:", error);

        if (isMounted) {
          setRealSeller(null);
          setRealSellerUserId(null);
          setRealListings([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingRealSeller(false);
        }
      }
    }

    loadRealSeller();

    return () => {
      isMounted = false;
    };
  }, [decodedSlug, mockSeller]);

  useEffect(() => {
    if (!studioMode) {
      return;
    }

    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTimer = window.setTimeout(() => {
      studioCloseButtonRef.current?.focus();
    }, 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setStudioMode(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedElement?.focus();
    };
  }, [studioMode]);

  const listings = useMemo(() => {
    if (!seller) {
      return [];
    }

    const query = searchQuery.trim().toLowerCase();

    return allListings.filter((listing) => {
      if (filterMode !== "All" && listing.tag !== filterMode) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        listing.title,
        listing.category,
        listing.condition,
        listing.tag,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [allListings, filterMode, searchQuery, seller]);

  if (isLoadingRealSeller) {
    return (
      <main className="collection-page">
        <style>{pageStyles}</style>
        <div className="collection-shell">
          <Header />
          <section className="not-found panel">
            <p>Loading seller...</p>
            <h1>Loading seller collection.</h1>
          </section>
        </div>
      </main>
    );
  }

  if (!seller) {
    return (
      <main className="collection-page">
        <style>{pageStyles}</style>
        <div className="collection-shell">
          <Header />
          <section className="not-found panel">
            <p>Seller not found</p>
            <h1>This seller collection is not available.</h1>
            <Link href="/browse">Return to Browse</Link>
          </section>
        </div>
      </main>
    );
  }

  const totalValue = allListings.reduce((sum, listing) => sum + getListingValue(listing), 0);
  const averageCardValue =
    allListings.length > 0 ? Math.round(totalValue / allListings.length) : 0;
  const isOwner = Boolean(currentUserId && realSellerUserId && currentUserId === realSellerUserId);
  const highestValueCard = allListings.length > 0
    ? allListings.reduce((highest, listing) =>
        getListingValue(listing) > getListingValue(highest)
          ? listing
          : highest,
      )
    : null;
  const defaultShowcaseCard = getShowcaseCard(allListings, highestValueCard);
  const savedShowcaseCard = isOwner && curationPreferences.showcaseCardId
    ? allListings.find((listing) => listing.id === curationPreferences.showcaseCardId) || null
    : null;
  const showcaseCard = savedShowcaseCard || defaultShowcaseCard;
  const newestCard = getNewestCard(allListings);
  const oldestCard = getOldestCard(allListings);
  const highestGradeCard = getHighestGradeCard(allListings);
  const categoriesRepresented = getUniqueCategories(allListings);
  const sportsRepresented = categoriesRepresented.length
    ? categoriesRepresented.join(" / ")
    : "Pending";
  const collectionPersonality = getCollectionPersonality(allListings);
  const collectionReputation = getCollectionReputation(allListings, totalValue);
  const collectorIdentityBadges: CollectorIdentityBadge[] = [
    {
      label: collectionPersonality,
      description: "Collection personality derived from public card data.",
      tone: "prestige",
    },
    collectionReputation
      ? {
          label: collectionReputation,
          description: "Collection reputation based on visible collection characteristics.",
          tone: "trust",
        }
      : null,
    seller.rewardsBadge
      ? {
          label: seller.rewardsBadge,
          description: "Public seller or collection badge.",
          tone: "verified",
        }
      : null,
  ].filter(Boolean) as CollectorIdentityBadge[];
  const grailCount = allListings.filter((listing) => listing.tag === "Grail").length;
  const hotCount = allListings.filter((listing) => listing.tag === "Hot").length;
  const defaultFeaturedListings = [
    showcaseCard,
    highestValueCard,
    newestCard,
    highestGradeCard,
    oldestCard,
  ].filter(
    (listing, index, items): listing is Listing =>
      Boolean(listing) &&
      items.findIndex((item) => item?.id === listing?.id) === index,
  );
  const savedFeaturedListings = isOwner ? curationPreferences.featuredCardIds
    .map((listingId) => allListings.find((listing) => listing.id === listingId))
    .filter((listing): listing is Listing => Boolean(listing)) : [];
  const featuredListings =
    savedFeaturedListings.length > 0 ? savedFeaturedListings : defaultFeaturedListings;
  const draftShowcaseCard =
    allListings.find((listing) => listing.id === draftShowcaseCardId) || null;
  const draftFeaturedListings = draftFeaturedCardIds
    .map((listingId) => allListings.find((listing) => listing.id === listingId))
    .filter((listing): listing is Listing => Boolean(listing));

  function openMessageModal(listing: Listing) {
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

  function openOfferModal(listing: Listing) {
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
    setIsSubmittingOffer(false);
  }

  function persistCurationPreferences(nextPreferences: CollectionCurationPreferences) {
    setCurationPreferences(nextPreferences);

    const collectionPreferenceId = decodedSlug || realSellerUserId || slug;

    if (collectionPreferenceId) {
      saveCollectionCurationPreferences(collectionPreferenceId, nextPreferences);
    }
  }

  function openShowcaseStudio() {
    if (!isOwner || allListings.length === 0) {
      return;
    }

    setDraftShowcaseCardId(showcaseCard?.id || allListings[0]?.id || null);
    setDraftFeaturedCardIds(featuredListings.map((listing) => listing.id));
    setStatusMessage("");
    setStudioMode("showcase");
  }

  function openFeaturedStudio() {
    if (!isOwner || allListings.length === 0) {
      return;
    }

    setDraftShowcaseCardId(showcaseCard?.id || null);
    setDraftFeaturedCardIds(featuredListings.map((listing) => listing.id));
    setStatusMessage("");
    setStudioMode("featured");
  }

  function closeStudioModal() {
    setStudioMode(null);
  }

  function saveShowcaseCard() {
    if (!draftShowcaseCardId) {
      return;
    }

    persistCurationPreferences({
      ...curationPreferences,
      showcaseCardId: draftShowcaseCardId,
    });
    setStatusMessage("Showcase Card updated.");
    closeStudioModal();
  }

  function toggleDraftFeaturedCard(listingId: string) {
    setDraftFeaturedCardIds((currentIds) => {
      if (currentIds.includes(listingId)) {
        return currentIds.filter((currentId) => currentId !== listingId);
      }

      return [...currentIds, listingId];
    });
  }

  function saveFeaturedCards() {
    persistCurationPreferences({
      ...curationPreferences,
      featuredCardIds: draftFeaturedCardIds,
    });
    setStatusMessage("Featured Cards updated.");
    closeStudioModal();
  }

  function setCardAsShowcase(listing: Listing) {
    persistCurationPreferences({
      ...curationPreferences,
      showcaseCardId: listing.id,
    });
    setStatusMessage(`${listing.title} is now your Showcase Card.`);
  }

  function toggleFeaturedCard(listing: Listing) {
    const isFeatured = featuredListings.some((featuredListing) => featuredListing.id === listing.id);
    const currentFeaturedIds =
      curationPreferences.featuredCardIds.length > 0
        ? curationPreferences.featuredCardIds
        : featuredListings.map((featuredListing) => featuredListing.id);
    const nextFeaturedCardIds = isFeatured
      ? currentFeaturedIds.filter((listingId) => listingId !== listing.id)
      : [...currentFeaturedIds, listing.id];

    persistCurationPreferences({
      ...curationPreferences,
      featuredCardIds: nextFeaturedCardIds,
    });
    setStatusMessage(
      isFeatured
        ? `${listing.title} was removed from Featured Cards.`
        : `${listing.title} was added to Featured Cards.`,
    );
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

    if (offerListing.source !== "supabase") {
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

    if (offerListing.sellerId === session.user.id) {
      setOfferError("You cannot make an offer on your own listing.");
      setSentOfferAmount(null);
      return;
    }

    if (!offerListing.sellerId) {
      setOfferError("Offer could not be sent.");
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
          listingId: offerListing.id,
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
      console.error("Collection offer submit error:", error);
      setOfferError(error instanceof Error ? error.message : "Offer could not be sent.");
      setSentOfferAmount(null);
    } finally {
      setIsSubmittingOffer(false);
    }
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

    if (messageListing.source !== "supabase") {
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
        step: "collection message auth session",
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
      console.error("Collection message setup error:", {
        step: "collection message missing seller id",
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
          step: "collection message insert",
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
        step: "collection message flow catch",
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

  const collectorIdentitySection = (
    <CollectorIdentityCard
      name={seller.name}
      handle={seller.slug}
      initials={seller.initials}
      eyebrow={isOwner ? "Collector Signals" : "Collection Identity"}
      rankTitle={seller.level}
      collectorSince={seller.joinedDate}
      marketplaceEvent="Marketplace Live"
      featuredAchievement={
        showcaseCard ? `${showcaseCard.title} defines this showcase` : collectionPersonality
      }
      profileHref={`/collections/${seller.slug}`}
      badges={collectorIdentityBadges}
      metrics={[
        {
          label: "Collection Value",
          value: formatCurrency(totalValue),
        },
        {
          label: "Cards Owned",
          value: String(allListings.length),
        },
        {
          label: "Highest Card",
          value: highestValueCard?.priceDisplay || "Pending",
          detail: highestValueCard?.title,
        },
        {
          label: "Sports",
          value: sportsRepresented,
        },
      ]}
      narrative={
        isOwner
          ? "These public collector signals stay available, but Curate Mode keeps your collection and showcase decisions first."
          : "This collection combines public card data, collector identity, and trust signals into one showcase."
      }
      showGrailPassPreview
    />
  );
  const trustSection = <PublicTrustSection userId={mockSeller ? null : realSellerUserId} />;
  const highlightsSection = allListings.length > 0 ? (
    <section className="collection-story-grid" aria-label="Collection highlights">
      <HighlightCard label="Most Valuable Card" listing={highestValueCard} />
      <HighlightCard label="Newest Addition" listing={newestCard} />
      <HighlightCard label="Oldest Card" listing={oldestCard} fallback="Year data pending" />
      <HighlightCard
        label="Highest Grade"
        listing={highestGradeCard}
        fallback="Grade data pending"
      />
    </section>
  ) : null;
  const featuredCardsSection = allListings.length > 0 ? (
    <section
      className={`featured-cards-panel panel${isOwner ? " owner-featured-panel" : ""}`}
      aria-labelledby="featured-cards-title"
    >
      <div className="section-heading-row">
        <span>Featured Cards</span>
        <h2 id="featured-cards-title">
          {isOwner ? "Cards chosen to represent your collection." : "Cards that define the collection."}
        </h2>
        <p>
          {isOwner
            ? "These are the cards visitors should remember first."
            : "Showcase cards are selected from existing public cards. Owner-selected showcase cards can plug into this layout later."}
        </p>
      </div>
      <div className="featured-card-grid">
        {featuredListings.map((listing) => (
          <Link
            key={listing.id}
            href={listing.href}
            className="featured-card"
            aria-label={`View featured card ${listing.title}`}
          >
            <CardArtwork listing={listing} />
            <div>
              <span>{listing.tag}</span>
              <strong>{listing.title}</strong>
              <small>{listing.conditionDisplay} · {listing.priceDisplay}</small>
            </div>
          </Link>
        ))}
      </div>
    </section>
  ) : null;
  const activitySection = allListings.length > 0 ? (
    <section className="collection-activity-panel panel" aria-labelledby="activity-title">
      <div className="section-heading-row">
        <span>{isOwner ? "Recent Additions" : "Collection Activity"}</span>
        <h2 id="activity-title">
          {isOwner ? "What changed recently." : "Recently added to the showcase."}
        </h2>
        <p>
          {isOwner
            ? "Use recent public additions as a cue for what to feature, refine, or share next."
            : "Activity uses public card listing data today. A fuller collection activity feed can plug into this section later."}
        </p>
      </div>
      <div className="activity-card-list">
        {allListings.slice(0, 4).map((listing) => (
          <Link key={listing.id} href={listing.href} className="activity-card">
            <span>{listing.listedDate}</span>
            <strong>{listing.title}</strong>
            <small>{listing.conditionDisplay} · {listing.priceDisplay}</small>
          </Link>
        ))}
      </div>
    </section>
  ) : null;
  const collectionStudioSection = isOwner ? (
    <section className="owner-management-panel panel" aria-labelledby="owner-tools-title">
      <div className="studio-heading-row">
        <div>
          <span>Collection Studio</span>
          <h2 id="owner-tools-title">Curate. Customize. Elevate.</h2>
        </div>
        <button
          type="button"
          className="studio-open-button"
          onClick={openShowcaseStudio}
          disabled={allListings.length === 0}
        >
          Open Studio →
        </button>
      </div>
      <div className="owner-management-grid">
        <button type="button" onClick={openShowcaseStudio} disabled={allListings.length === 0}>
          <span>Choose the centerpiece</span>
          <strong>Showcase Card</strong>
          <small>{showcaseCard ? showcaseCard.title : "Add cards to begin"}</small>
        </button>
        <button type="button" onClick={openFeaturedStudio} disabled={allListings.length === 0}>
          <span>Build the gallery</span>
          <strong>Featured Cards</strong>
          <small>
            {featuredListings.length} card{featuredListings.length === 1 ? "" : "s"} selected
          </small>
        </button>
        <button
          type="button"
          onClick={() =>
            setStatusMessage("Banner customization is reserved for Collection Studio.")
          }
        >
          <span>Coming Soon</span>
          <strong>Banner</strong>
          <small>Collection atmosphere</small>
        </button>
        <button
          type="button"
          onClick={() =>
            setStatusMessage("Collection themes are reserved for a future release.")
          }
        >
          <span>Coming Soon</span>
          <strong>Themes</strong>
          <small>Premium presentation</small>
        </button>
        <button
          type="button"
          onClick={() =>
            setStatusMessage("Collection layout controls are reserved for Collection Studio.")
          }
        >
          <span>Coming Soon</span>
          <strong>Layout</strong>
          <small>Showroom structure</small>
        </button>
        <button
          type="button"
          onClick={() =>
            setStatusMessage("Collection insights are reserved for a future release.")
          }
        >
          <span>Coming Soon</span>
          <strong>Insights</strong>
          <small>Collection signals</small>
        </button>
        <button
          type="button"
          onClick={() =>
            setStatusMessage("Share settings are reserved for Collection Studio.")
          }
        >
          <span>Coming Soon</span>
          <strong>Share Settings</strong>
          <small>Public presentation</small>
        </button>
      </div>
    </section>
  ) : null;

  return (
    <main className="collection-page">
      <style>{pageStyles}</style>
      <div className="collection-shell">
        <Header />

        <div className="top-link-row">
          <Link href="/browse">← Back to Browse</Link>
        </div>

        <section className={`collection-showcase-hero panel${isOwner ? " curate-hero" : ""}`}>
          <div
            className={`collection-banner${showcaseCard?.imageUrl ? " has-image" : ""}`}
            style={
              !isOwner && showcaseCard?.imageUrl
                ? {
                    backgroundImage: `linear-gradient(90deg, rgba(5,5,6,0.94), rgba(5,5,6,0.62) 48%, rgba(5,5,6,0.38)), url(${showcaseCard.imageUrl})`,
                  }
                : undefined
            }
          >
            <div className="collection-banner-copy">
              <span>{isOwner ? "Curate Mode" : "Explore Mode"}</span>
              <h1>{isOwner ? "My Collection" : `${seller.name} Collection`}</h1>
              {isOwner ? (
                <div className="owner-hero-summary" aria-label="Collection summary">
                  <div className="owner-hero-numbers">
                    <div>
                      <strong>{formatCurrency(totalValue)}</strong>
                      <span>Collection Value</span>
                    </div>
                    <div>
                      <strong>{allListings.length}</strong>
                      <span>Cards Owned</span>
                    </div>
                  </div>
                  <Link
                    className="owner-latest-addition"
                    href={newestCard?.href || "#"}
                    aria-label={
                      newestCard ? `View latest addition ${newestCard.title}` : "Latest addition"
                    }
                  >
                    {newestCard ? <CardArtwork listing={newestCard} /> : null}
                    <span>
                      <small>Latest Addition</small>
                      <strong>{newestCard?.title || "No public card yet"}</strong>
                      <em>{newestCard?.listedDate || "Add cards to start the collection"}</em>
                    </span>
                  </Link>
                </div>
              ) : (
                <>
                  <p>
                    {collectionPersonality}
                    {collectionReputation ? ` · ${collectionReputation}` : ""} ·{" "}
                    {allListings.length} public card{allListings.length === 1 ? "" : "s"}
                  </p>
                  <div className="collection-hero-tags" aria-label="Collection showcase details">
                    <em>{sportsRepresented}</em>
                    <em>{seller.level}</em>
                    <em>Marketplace Live</em>
                  </div>
                </>
              )}
            </div>

            {showcaseCard ? (
              <div className="showcase-card-panel">
                <span>Showcase Card</span>
                <Link href={showcaseCard.href} aria-label={`View ${showcaseCard.title}`}>
                  <CardArtwork listing={showcaseCard} />
                </Link>
                <strong>{showcaseCard.title}</strong>
                <small>{showcaseCard.conditionDisplay} · {showcaseCard.priceDisplay}</small>
              </div>
            ) : (
              <div className="showcase-card-panel empty-showcase">
                <span>Showcase Card</span>
                <strong>Waiting for a public card.</strong>
                <small>The showcase card will appear here when the collection has cards.</small>
              </div>
            )}

            {isOwner ? (
              <div className="owner-hero-note" aria-label="Collection owner">
                <p>This collection is curated by</p>
                <strong>{seller.name}</strong>
              </div>
            ) : null}
          </div>

          {!isOwner ? (
            <div className="collection-hero-actions">
              <button
                type="button"
                onClick={() => setStatusMessage("Message flow coming soon.")}
              >
                Message Collector
              </button>
              <button
                type="button"
                className={isFollowing ? "active" : ""}
                onClick={() => setIsFollowing((current) => !current)}
              >
                {isFollowing ? "Following" : "Follow Collection"}
              </button>
              <button
                type="button"
                onClick={() =>
                  setStatusMessage("Share Collection preview is reserved for a future release.")
                }
              >
                Share Collection
              </button>
            </div>
          ) : null}

          {statusMessage ? <p className="hero-status">{statusMessage}</p> : null}

          {!isOwner ? (
            <div className="collection-hero-stats">
              <>
                <Metric label="Collection Value" value={formatCurrency(totalValue)} />
                <Metric label="Cards Owned" value={String(allListings.length)} />
                <Metric label="Collector Since" value={seller.joinedDate} />
                <Metric label="Current Rank" value={seller.level} />
                <Metric label="Trust Badge" value={seller.rewardsBadge} />
                <Metric label="Marketplace Status" value="Live" />
              </>
            </div>
          ) : null}
        </section>

        {isOwner ? collectionStudioSection : null}
        {isOwner ? featuredCardsSection : null}
        {!isOwner ? collectorIdentitySection : null}
        {!isOwner ? trustSection : null}
        {!isOwner ? highlightsSection : null}

        <section className={`collection-layout${isOwner ? " owner-card-layout" : ""}`}>
          <div className="main-column">
            {isOwner ? (
              <section className="owner-all-cards-heading" aria-labelledby="all-cards-title">
                <div>
                  <span>All Cards</span>
                  <h2 id="all-cards-title">All Cards</h2>
                  <p>{allListings.length} card{allListings.length === 1 ? "" : "s"}</p>
                </div>
              </section>
            ) : (
              <section className="collection-header panel">
                <div>
                  <h2>Collection Library</h2>
                  <p>
                    Browse the public cards that shape this {collectionPersonality.toLowerCase()}.
                  </p>
                </div>
                <div className="collection-stats">
                  <Metric label="Collection Value" value={formatCurrency(totalValue)} />
                  <Metric label="Cards Owned" value={String(allListings.length)} />
                  <Metric label="Average Card Value" value={formatCurrency(averageCardValue)} />
                  <Metric
                    label="Highest Card"
                    value={highestValueCard?.priceDisplay || "Pending"}
                  />
                  <Metric
                    label="Newest Addition"
                    value={newestCard?.listedDate || "Pending"}
                  />
                  <Metric
                    label="Oldest Card"
                    value={
                      oldestCard ? oldestCard.details.year || oldestCard.title : "Pending"
                    }
                  />
                  <Metric label="Sports Represented" value={sportsRepresented} />
                  <Metric label="Collection Style" value={collectionPersonality} />
                </div>
              </section>
            )}

            {!isOwner ? featuredCardsSection : null}

            <section className="collection-toolbar panel">
              <label className="collection-search">
                <span aria-hidden="true" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search this collection..."
                  aria-label="Search this collection"
                />
              </label>
              <button type="button" className="sort-button">
                Newly Listed
              </button>
              <div className="filter-buttons">
                {filterModes.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={filterMode === mode ? "active" : ""}
                    onClick={() => setFilterMode(mode)}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </section>

            {listings.length > 0 ? (
              <section className="listing-grid" aria-label={isOwner ? "Collection cards" : "Seller listings"}>
                {listings.map((listing) => (
                  <article key={listing.href} className="listing-card">
                    <div className="badge-row">
                      <span className={`listing-tag tag-${listing.tag.toLowerCase()}`}>
                        {listing.tag === "Grail" ? "✦ " : ""}
                        {listing.tag}
                      </span>
                    </div>
                    <Link
                      className="art-link"
                      href={listing.href}
                      aria-label={`View ${listing.title}`}
                    >
                      <CardArtwork listing={listing} />
                    </Link>
                    <h3>
                      <Link href={listing.href}>{listing.title}</Link>
                    </h3>
                    <p className="listing-meta">
                      {isOwner
                        ? `${listing.conditionDisplay} · ${listing.priceDisplay}`
                        : `${listing.category}: ${listing.condition}`}
                    </p>
                    {isOwner ? (
                      <div className="owner-curator-actions">
                        <button
                          type="button"
                          onClick={() => setCardAsShowcase(listing)}
                          disabled={showcaseCard?.id === listing.id}
                        >
                          {showcaseCard?.id === listing.id ? "Showcase Card" : "Set Showcase"}
                        </button>
                        <button type="button" onClick={() => toggleFeaturedCard(listing)}>
                          {featuredListings.some(
                            (featuredListing) => featuredListing.id === listing.id,
                          )
                            ? "Remove Featured"
                            : "Feature Card"}
                        </button>
                        <Link className="view-card owner-view-card" href={listing.href}>
                          View Card
                        </Link>
                      </div>
                    ) : (
                      <>
                        <div className="listing-data">
                          <span>{listing.priceDisplay}</span>
                          <small>Market {formatCurrency(listing.marketValue)}</small>
                          <small>{listing.watchCount} watching</small>
                        </div>
                        <div className="listing-actions">
                          {listing.isCollectionOnly ? (
                            <div className="action-circles">
                              <button
                                type="button"
                                aria-label={`Message ${seller.name}`}
                                title="Message"
                                onClick={() => openMessageModal(listing)}
                              >
                                <span className="message-icon" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                aria-label={`Make offer on ${listing.title}`}
                                title="Make Offer"
                                onClick={() => openOfferModal(listing)}
                              >
                                $
                              </button>
                            </div>
                          ) : (
                            <div className="action-circles">
                              <button type="button" aria-label={`Buy ${listing.title}`} title="Buy">
                                <span className="cart-icon" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                aria-label={`Message ${seller.name}`}
                                title="Message"
                                onClick={() => openMessageModal(listing)}
                              >
                                <span className="message-icon" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                aria-label={`Make offer on ${listing.title}`}
                                title="Make Offer"
                                onClick={() => openOfferModal(listing)}
                              >
                                <span aria-hidden="true">$</span>
                              </button>
                            </div>
                          )}
                          <Link className="view-card" href={listing.href}>
                            View Card
                          </Link>
                        </div>
                      </>
                    )}
                  </article>
                ))}
              </section>
            ) : (
              <section className="empty-state panel">
                <h2>
                  {allListings.length === 0
                    ? "No public cards yet."
                    : "No cards found."}
                </h2>
                <p>
                  {allListings.length === 0
                    ? "This seller collection is live, but there are no public cards right now."
                    : "Try a different search or filter."}
                </p>
              </section>
            )}

            {!isOwner ? activitySection : null}
          </div>

          {!isOwner ? (
          <aside className="sidebar">
            <section className="panel sidebar-panel collection-personality-panel">
              <h2>Collection Personality</h2>
              <div className="personality-token">{collectionPersonality}</div>
              {collectionReputation ? (
                <div className="personality-token secondary">{collectionReputation}</div>
              ) : null}
              <p className="sidebar-note">
                Personality and reputation are derived from visible cards, value,
                categories, and collection depth.
              </p>
            </section>

            <section className="panel sidebar-panel">
              <h2>Collector Rewards</h2>
              <Metric label="Current Level" value={seller.level} />
              <div className="progress-block">
                <div>
                  <span>Progress to next level</span>
                  <strong>{seller.levelProgress}%</strong>
                </div>
                <div className="progress-track">
                  <span style={{ width: `${seller.levelProgress}%` }} />
                </div>
              </div>
              <Metric label="Completed Sales" value={String(seller.completedSales)} />
              <Metric label="Fast Shipping Streak" value={seller.fastShippingStreak} />
              <Metric label="Response Score" value={seller.responseScore} />
              <Metric label="Buyer Rating" value={seller.buyerRating} />
              <p className="sidebar-note">
                Higher rewards can increase visibility across GRAIL.
              </p>
            </section>

            <section className="panel sidebar-panel">
              <h2>Collection Market Snapshot</h2>
              <div className="snapshot-grid">
                <Metric label="Total Market Value" value={formatCurrency(totalValue)} />
                <Metric
                  label="Highest Value Card"
                  value={highestValueCard?.title ?? "No public cards"}
                />
                <Metric label="Grail Cards" value={String(grailCount)} />
                <Metric label="Hot Cards" value={String(hotCount)} />
                <Metric label="Avg Card Value" value={formatCurrency(averageCardValue)} />
              </div>
              <MarketChart />
            </section>

            <section className="panel sidebar-panel collection-framework-panel">
              <h2>Collection Milestones</h2>
              <div className="framework-list">
                <span>First Card</span>
                <span>100 Cards</span>
                <span>$10k Collection</span>
                <span>Collection Featured</span>
              </div>
              <p className="sidebar-note">
                Milestone tracking is reserved for a future collection identity pass.
              </p>
            </section>

            <section className="panel sidebar-panel collection-framework-panel">
              <h2>Collection Timeline</h2>
              <div className="timeline-preview">
                <div>
                  <em />
                  <span>First public card</span>
                </div>
                <div>
                  <em />
                  <span>Latest addition</span>
                </div>
                <div>
                  <em />
                  <span>Future milestone</span>
                </div>
              </div>
            </section>

            <section className="panel sidebar-panel collection-framework-panel">
              <h2>Showcase Mode</h2>
              <p className="sidebar-note">
                Future showcase mode can present this collection without marketplace
                controls, filters, or owner administration.
              </p>
              <div className="framework-list">
                <span>Share Preview Ready</span>
                <span>Open Graph Ready</span>
                <span>Distraction-Free Future</span>
              </div>
            </section>
          </aside>
          ) : null}
        </section>
      </div>

      {studioMode ? (
        <div
          className="studio-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeStudioModal();
            }
          }}
        >
          <section
            className="studio-modal panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="studio-modal-title"
            aria-describedby="studio-modal-description"
          >
            <div className="studio-modal-header">
              <div>
                <span>Collection Studio</span>
                <h2 id="studio-modal-title">
                  {studioMode === "showcase"
                    ? "Choose your Showcase Card"
                    : "Choose your Featured Cards"}
                </h2>
                <p id="studio-modal-description">
                  {studioMode === "showcase"
                    ? "Select the card that should anchor the first impression of your collection."
                    : "Select the cards visitors should remember first when they enter your collection."}
                </p>
              </div>
              <button
                ref={studioCloseButtonRef}
                type="button"
                aria-label="Close Collection Studio"
                onClick={closeStudioModal}
              >
                x
              </button>
            </div>

            {studioMode === "showcase" ? (
              <div className="studio-preview-grid">
                <div className="studio-live-preview" aria-label="Showcase Card preview">
                  <span>Live Preview</span>
                  {draftShowcaseCard ? (
                    <>
                      <CardArtwork listing={draftShowcaseCard} />
                      <strong>{draftShowcaseCard.title}</strong>
                      <small>
                        {draftShowcaseCard.conditionDisplay} · {draftShowcaseCard.priceDisplay}
                      </small>
                    </>
                  ) : (
                    <strong>No card selected.</strong>
                  )}
                </div>
                <div className="studio-selection-grid" aria-label="Collection cards">
                  {allListings.map((listing) => {
                    const isSelected = draftShowcaseCardId === listing.id;
                    const isCurrentShowcase = showcaseCard?.id === listing.id;

                    return (
                      <button
                        key={listing.id}
                        type="button"
                        className={`studio-card-option${isSelected ? " selected" : ""}`}
                        aria-pressed={isSelected}
                        onClick={() => setDraftShowcaseCardId(listing.id)}
                      >
                        <CardArtwork listing={listing} />
                        <span>
                          <strong>{listing.title}</strong>
                          <small>{listing.conditionDisplay} · {listing.priceDisplay}</small>
                        </span>
                        <em>{isCurrentShowcase ? "Current Showcase" : "Select"}</em>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                <div className="studio-featured-preview" aria-label="Selected Featured Cards">
                  <span>Selected Gallery</span>
                  {draftFeaturedListings.length > 0 ? (
                    <div>
                      {draftFeaturedListings.slice(0, 6).map((listing) => (
                        <CardArtwork key={listing.id} listing={listing} />
                      ))}
                    </div>
                  ) : (
                    <strong>No featured cards selected.</strong>
                  )}
                </div>
                <div className="studio-selection-grid featured-selection" aria-label="Collection cards">
                  {allListings.map((listing) => {
                    const isSelected = draftFeaturedCardIds.includes(listing.id);
                    const isShowcase = showcaseCard?.id === listing.id;

                    return (
                      <button
                        key={listing.id}
                        type="button"
                        className={`studio-card-option${isSelected ? " selected" : ""}`}
                        aria-pressed={isSelected}
                        onClick={() => toggleDraftFeaturedCard(listing.id)}
                      >
                        <CardArtwork listing={listing} />
                        <span>
                          <strong>{listing.title}</strong>
                          <small>{listing.conditionDisplay} · {listing.priceDisplay}</small>
                        </span>
                        <em>
                          {isSelected
                            ? "Featured"
                            : isShowcase
                              ? "Showcase Card"
                              : "Select"}
                        </em>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <div className="studio-modal-actions">
              <button
                type="button"
                className="primary"
                onClick={studioMode === "showcase" ? saveShowcaseCard : saveFeaturedCards}
                disabled={studioMode === "showcase" ? !draftShowcaseCardId : false}
              >
                {studioMode === "showcase" ? "Save Showcase Card" : "Save Featured Cards"}
              </button>
              <button type="button" onClick={closeStudioModal}>
                Cancel
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {offerListing ? (
        <div className="message-modal-backdrop" role="presentation">
          <section
            className="message-modal panel"
            role="dialog"
            aria-modal="true"
            aria-label="Make offer"
          >
            <div className="message-modal-header">
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

            <div className="message-modal-preview">
              <CardArtwork listing={offerListing} />
              <div>
                <span>
                  {offerListing.isCollectionOnly ? "Sale Status" : "Asking Price"}
                </span>
                <strong>{offerListing.priceDisplay}</strong>
                <p>Minimum offer: {offerListing.minOffer > 0 ? formatCurrency(offerListing.minOffer) : "Any offer"}</p>
              </div>
            </div>

            {!sentOfferAmount ? (
              <>
                <label className="message-field">
                  <span>Your offer</span>
                  <input
                    type="number"
                    min="0"
                    value={offerAmount}
                    onChange={(event) => setOfferAmount(event.target.value)}
                    placeholder="Enter offer amount"
                  />
                </label>

                <label className="message-field">
                  <span>Add a message to seller</span>
                  <textarea
                    value={offerMessage}
                    onChange={(event) => setOfferMessage(event.target.value)}
                    placeholder="Optional message"
                  />
                </label>
              </>
            ) : null}

            {offerError ? <p className="message-error">{offerError}</p> : null}

            {sentOfferAmount ? (
              <div className="message-confirmation">
                <strong>Offer sent to seller.</strong>
                <p>Offer amount: {formatCurrency(sentOfferAmount)}</p>
                <p>Status: Pending. Seller has 24 hours to respond.</p>
              </div>
            ) : null}

            {!sentOfferAmount ? (
              <div className="message-modal-actions">
                <button
                  type="button"
                  className="primary"
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
        <div className="message-modal-backdrop" role="presentation">
          <section
            className="message-modal panel"
            role="dialog"
            aria-modal="true"
            aria-label="Message seller"
          >
            <div className="message-modal-header">
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
              <CardArtwork listing={messageListing} />
              <div>
                <span>Seller</span>
                <strong>{messageListing.seller}</strong>
                <p>
                  {messageListing.category}: {messageListing.condition}
                </p>
              </div>
            </div>

            {!messageSuccessHref ? (
              <label className="message-field">
                <span>Write a message...</span>
                <textarea
                  value={messageBody}
                  onChange={(event) => setMessageBody(event.target.value)}
                  placeholder="Ask about condition, shipping, or availability."
                />
              </label>
            ) : null}

            {messageError ? <p className="message-error">{messageError}</p> : null}

            {messageSuccessHref ? (
              <div className="message-confirmation">
                <strong>Message sent.</strong>
                <p>Your conversation is ready.</p>
              </div>
            ) : null}

            {messageSuccessHref ? (
              <div className="message-modal-actions single-action">
                <Link className="primary" href={messageSuccessHref}>
                  Open Conversation
                </Link>
              </div>
            ) : (
              <div className="message-modal-actions">
                <button
                  type="button"
                  className="primary"
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

const pageStyles = `
  .collection-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at 50% -120px, rgba(201,205,211,0.08), transparent 32%),
      linear-gradient(180deg, #000 0%, #030304 58%, #000 100%);
    color: #fafafa;
    font-family: Arial, Helvetica, sans-serif;
  }

  .collection-shell {
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

  .top-link-row a,
  .not-found a,
  .listing-card h3 a,
  .view-card {
    color: #E7DED0;
    text-decoration: none;
  }

  .top-link-row a:hover,
  .not-found a:hover,
  .listing-card h3 a:hover,
  .view-card:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .collection-showcase-hero,
  .seller-hero {
    padding: 18px;
  }

  .collection-banner {
    min-height: 420px;
    border: 1px solid rgba(231,222,208,0.16);
    border-radius: 20px;
    background:
      radial-gradient(circle at 18% 12%, rgba(231,222,208,0.16), transparent 28%),
      radial-gradient(circle at 78% 0%, rgba(185,146,74,0.12), transparent 24%),
      linear-gradient(135deg, #111112, #050506 54%, #0c0c0e);
    background-size: cover;
    background-position: center;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 270px;
    gap: 24px;
    align-items: end;
    padding: clamp(22px, 4vw, 42px);
    overflow: hidden;
    position: relative;
    box-sizing: border-box;
  }

  .collection-banner::before {
    content: "";
    position: absolute;
    inset: 0;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.04), transparent 34%),
      radial-gradient(circle at 72% 18%, rgba(231,222,208,0.10), transparent 28%);
    pointer-events: none;
  }

  .collection-banner-copy,
  .showcase-card-panel {
    position: relative;
    z-index: 1;
  }

  .collection-banner-copy span,
  .section-heading-row span,
  .showcase-card-panel span,
  .highlight-card span,
  .featured-card span,
  .activity-card span {
    color: #C9CDD3;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .collection-banner-copy h1 {
    max-width: 760px;
    margin: 12px 0 0;
    color: #fff;
    font-size: clamp(44px, 7vw, 88px);
    line-height: 0.94;
    font-weight: 950;
    letter-spacing: 0;
  }

  .collection-banner-copy p,
  .section-heading-row p,
  .highlight-card small,
  .featured-card small,
  .activity-card small {
    color: #a1a1aa;
    font-size: 13px;
    line-height: 19px;
    font-weight: 800;
  }

  .collection-banner-copy p {
    max-width: 720px;
    margin: 18px 0 0;
    color: #D8D2C8;
    font-size: 16px;
    line-height: 24px;
  }

  .collection-hero-tags {
    margin-top: 20px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .collection-hero-tags em,
  .framework-list span,
  .personality-token {
    min-height: 28px;
    border: 1px solid rgba(231,222,208,0.18);
    border-radius: 999px;
    background: rgba(231,222,208,0.055);
    color: #E7DED0;
    padding: 0 10px;
    display: inline-flex;
    align-items: center;
    font-size: 11px;
    line-height: 14px;
    font-style: normal;
    font-weight: 900;
  }

  .showcase-card-panel {
    border: 1px solid rgba(231,222,208,0.20);
    border-radius: 18px;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.018)),
      rgba(5,5,6,0.74);
    box-shadow: 0 24px 60px rgba(0,0,0,0.38);
    padding: 16px;
    display: grid;
    justify-items: center;
    gap: 10px;
    text-align: center;
    backdrop-filter: blur(12px);
  }

  .showcase-card-panel a {
    color: inherit;
    text-decoration: none;
  }

  .showcase-card-panel .art-shell {
    width: 190px;
    height: 226px;
  }

  .showcase-card-panel .uploaded-card-image {
    max-width: 150px;
    max-height: 198px;
  }

  .showcase-card-panel strong,
  .highlight-card strong,
  .featured-card strong,
  .activity-card strong {
    color: #fff;
    font-size: 14px;
    line-height: 19px;
    font-weight: 900;
  }

  .showcase-card-panel strong {
    display: block;
    font-size: 16px;
    line-height: 21px;
  }

  .showcase-card-panel small {
    color: #85858f;
    font-size: 11px;
    line-height: 15px;
    font-weight: 800;
  }

  .empty-showcase {
    align-content: center;
    min-height: 240px;
  }

  .collection-hero-actions {
    margin-top: 16px;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .collection-hero-stats,
  .collection-story-grid {
    margin-top: 16px;
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 10px;
  }

  .collection-story-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .curate-hero {
    border-color: transparent;
    background:
      radial-gradient(circle at 54% 54%, rgba(231,222,208,0.055), transparent 32%),
      transparent;
    box-shadow: none;
    padding: 10px 0 0;
  }

  .curate-hero .collection-banner {
    min-height: 430px;
    grid-template-columns: minmax(0, 1fr) 340px minmax(180px, 0.62fr);
    border-color: transparent;
    border-radius: 0;
    background:
      radial-gradient(circle at 56% 78%, rgba(231,222,208,0.16), transparent 22%),
      radial-gradient(circle at 18% 48%, rgba(201,205,211,0.05), transparent 28%),
      transparent;
    align-items: center;
    padding: clamp(18px, 4vw, 48px) 0;
  }

  .curate-hero .collection-banner-copy h1 {
    max-width: 620px;
    font-size: clamp(48px, 6.5vw, 90px);
    line-height: 0.92;
  }

  .curate-hero .collection-hero-tags {
    margin-top: 22px;
  }

  .curate-hero .collection-hero-stats {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    margin-top: 12px;
  }

  .curate-hero .metric {
    min-height: 72px;
    background: rgba(8,8,10,0.58);
  }

  .curate-hero .showcase-card-panel {
    border-color: transparent;
    background: transparent;
    box-shadow: none;
    backdrop-filter: none;
    padding: 0;
  }

  .curate-hero .showcase-card-panel .art-shell {
    width: 252px;
    height: 318px;
    border-color: rgba(231,222,208,0.08);
    border-radius: 18px;
    background:
      radial-gradient(circle at 50% 96%, rgba(231,222,208,0.20), transparent 26%),
      rgba(3,3,4,0.92);
  }

  .curate-hero .showcase-card-panel .uploaded-card-image {
    max-width: 206px;
    max-height: 274px;
  }

  .owner-hero-summary {
    margin-top: 34px;
    display: grid;
    gap: 30px;
  }

  .owner-hero-numbers {
    display: flex;
    gap: 34px;
    flex-wrap: wrap;
  }

  .owner-hero-numbers div {
    min-width: 132px;
    border-right: 1px solid rgba(231,222,208,0.12);
    padding-right: 30px;
  }

  .owner-hero-numbers div:last-child {
    border-right: 0;
    padding-right: 0;
  }

  .owner-hero-numbers strong {
    display: block;
    color: #fff;
    font-size: clamp(34px, 4vw, 52px);
    line-height: 0.98;
    font-weight: 950;
  }

  .owner-hero-numbers span {
    display: block;
    margin-top: 8px;
    color: #C9CDD3;
    font-size: 12px;
    line-height: 16px;
    font-weight: 800;
    letter-spacing: 0;
    text-transform: none;
  }

  .owner-latest-addition {
    max-width: 520px;
    color: inherit;
    display: grid;
    grid-template-columns: 62px minmax(0, 1fr);
    gap: 16px;
    align-items: center;
    text-decoration: none;
  }

  .owner-latest-addition .art-shell {
    width: 62px;
    height: 82px;
    border-radius: 8px;
  }

  .owner-latest-addition .uploaded-card-image {
    max-width: 50px;
    max-height: 68px;
  }

  .owner-latest-addition .mock-card {
    width: 42px;
    height: 62px;
    border-radius: 6px;
    padding: 3px;
  }

  .owner-latest-addition small,
  .owner-latest-addition em {
    display: block;
    color: #a1a1aa;
    font-size: 12px;
    line-height: 16px;
    font-style: normal;
    font-weight: 800;
  }

  .owner-latest-addition strong {
    display: block;
    margin: 4px 0;
    color: #fff;
    font-size: 15px;
    line-height: 20px;
    font-weight: 900;
  }

  .owner-hero-note {
    color: #a1a1aa;
    font-size: 18px;
    line-height: 27px;
    font-style: italic;
    font-weight: 500;
  }

  .owner-hero-note p {
    margin: 0;
    color: #a1a1aa;
  }

  .owner-hero-note strong {
    display: block;
    margin-top: 18px;
    color: #E7DED0;
    font-size: 13px;
    line-height: 17px;
    font-style: normal;
    font-weight: 900;
  }

  .owner-management-grid span {
    color: #C9CDD3;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .owner-management-grid button {
    border: 1px solid rgba(231,222,208,0.14);
    border-radius: 14px;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01)),
      rgba(8,8,10,0.82);
    padding: 14px;
    box-sizing: border-box;
  }

  .owner-management-grid strong {
    display: block;
    margin-top: 0;
    color: #fff;
    font-size: 15px;
    line-height: 20px;
    font-weight: 900;
  }

  .owner-management-grid small {
    display: block;
    margin-top: 8px;
    color: #a1a1aa;
    font-size: 11px;
    line-height: 15px;
    font-weight: 800;
  }

  .owner-management-grid button:disabled,
  .studio-open-button:disabled {
    cursor: not-allowed;
    opacity: 0.48;
  }

  .highlight-card {
    min-height: 118px;
    border: 1px solid rgba(231,222,208,0.14);
    border-radius: 14px;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01)),
      rgba(5,5,6,0.92);
    box-shadow: 0 18px 44px rgba(0,0,0,0.22);
    padding: 14px;
    display: grid;
    gap: 8px;
    align-content: start;
  }

  .highlight-card strong,
  .featured-card strong,
  .activity-card strong {
    display: block;
  }

  .seller-hero-main {
    display: grid;
    grid-template-columns: 76px 1fr;
    gap: 16px;
    align-items: center;
  }

  .seller-avatar {
    width: 72px;
    height: 72px;
    border-radius: 999px;
    border: 1px solid rgba(201,205,211,0.26);
    background:
      radial-gradient(circle at 50% 18%, rgba(255,255,255,0.14), transparent 42%),
      linear-gradient(135deg, #1f2937, #050506);
    color: #E7DED0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    font-weight: 900;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
  }

  .seller-heading-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .seller-heading-row h1 {
    margin: 0;
    color: #fff;
    font-size: 38px;
    line-height: 42px;
    font-weight: 900;
  }

  .seller-badge,
  .listing-tag {
    min-height: 24px;
    border: 1px solid rgba(231,222,208,0.42);
    border-radius: 999px;
    background: rgba(231,222,208,0.08);
    color: #E7DED0;
    padding: 0 10px;
    display: inline-flex;
    align-items: center;
    font-size: 10px;
    line-height: 12px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .seller-level,
  .seller-bio,
  .collection-header p,
  .sidebar-note,
  .empty-state p {
    color: #a1a1aa;
    font-size: 13px;
    line-height: 19px;
    font-weight: 800;
  }

  .seller-level {
    margin: 5px 0 0;
    color: #C9CDD3;
  }

  .seller-bio {
    margin: 8px 0 0;
    max-width: 760px;
  }

  .hero-actions {
    margin-top: 16px;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .hero-actions button,
  .collection-hero-actions button,
  .collection-toolbar button,
  .listing-actions button,
  .listing-actions a {
    border: 1px solid rgba(231,222,208,0.28);
    background: rgba(231,222,208,0.055);
    color: #fff;
    cursor: pointer;
    font-weight: 900;
    text-decoration: none;
  }

  .hero-actions button,
  .collection-hero-actions button {
    height: 38px;
    border-radius: 10px;
    padding: 0 14px;
    font-size: 12px;
  }

  .hero-actions button.active,
  .hero-actions button:hover,
  .collection-hero-actions button.active,
  .collection-hero-actions button:hover,
  .collection-toolbar button.active,
  .collection-toolbar button:hover {
    border-color: rgba(231,222,208,0.62);
    background: rgba(231,222,208,0.11);
    box-shadow: 0 0 18px rgba(201,205,211,0.13);
  }

  .collection-hero-actions .primary-action {
    border-color: rgba(231,222,208,0.54);
    background:
      linear-gradient(180deg, rgba(231,222,208,0.18), rgba(231,222,208,0.07)),
      rgba(8,8,10,0.88);
    color: #fff;
    box-shadow: 0 12px 28px rgba(231,222,208,0.08);
  }

  .hero-status {
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

  .seller-hero-stats {
    margin-top: 16px;
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 10px;
  }

  .metric {
    min-height: 58px;
    border: 1px solid #202026;
    border-radius: 10px;
    background: rgba(8,8,10,0.76);
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
    font-size: 13px;
    line-height: 17px;
    font-weight: 900;
  }

  .collection-layout {
    margin-top: 18px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 310px;
    gap: 18px;
    align-items: start;
  }

  .main-column,
  .sidebar {
    display: grid;
    gap: 14px;
  }

  .sidebar {
    position: sticky;
    top: 16px;
  }

  .collection-shell > .featured-cards-panel,
  .collection-shell > .collection-activity-panel {
    margin-top: 16px;
  }

  .collection-shell > .owner-management-panel {
    margin-top: 8px;
  }

  .collection-header,
  .featured-cards-panel,
  .collection-activity-panel,
  .owner-management-panel,
  .collection-toolbar,
  .sidebar-panel {
    padding: 14px;
  }

  .owner-management-panel {
    border-color: rgba(231,222,208,0.10);
    border-radius: 18px;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.026), rgba(255,255,255,0.008)),
      rgba(7,7,8,0.82);
    padding: clamp(20px, 2.6vw, 30px);
  }

  .owner-management-grid {
    margin-top: 18px;
    display: grid;
    grid-template-columns: repeat(7, minmax(124px, 1fr));
    gap: 14px;
  }

  .studio-heading-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 14px;
  }

  .studio-heading-row span {
    color: #C9CDD3;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .studio-heading-row h2 {
    margin: 4px 0 0;
    color: #fff;
    font-size: 17px;
    line-height: 22px;
    font-weight: 900;
  }

  .studio-open-button {
    min-height: 40px;
    border: 1px solid rgba(231,222,208,0.32);
    border-radius: 10px;
    background: rgba(231,222,208,0.07);
    color: #E7DED0;
    padding: 0 14px;
    font: inherit;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
  }

  .owner-management-grid button {
    min-height: 138px;
    text-align: center;
    color: inherit;
    cursor: pointer;
    transition:
      border-color 160ms ease,
      background 160ms ease,
      transform 160ms ease;
  }

  .owner-management-grid button:hover,
  .owner-management-grid button:focus-visible {
    border-color: rgba(231,222,208,0.42);
    background: rgba(231,222,208,0.075);
    transform: translateY(-1px);
    outline: none;
  }

  .owner-featured-panel {
    border-color: transparent;
    background: transparent;
    box-shadow: none;
    padding: 46px 0 8px;
  }

  .owner-featured-panel .section-heading-row {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 18px;
  }

  .owner-featured-panel .featured-card-grid {
    display: flex;
    gap: 30px;
    overflow-x: auto;
    padding: 2px 2px 12px;
    scrollbar-width: thin;
  }

  .owner-featured-panel .featured-card {
    flex: 0 0 214px;
    min-height: 356px;
    border-color: transparent;
    background: transparent;
    box-shadow: none;
    padding: 0;
  }

  .owner-featured-panel .featured-card:hover {
    border-color: transparent;
    box-shadow: none;
  }

  .owner-featured-panel .featured-card .art-shell {
    height: 270px;
    border-radius: 12px;
  }

  .owner-card-layout {
    grid-template-columns: 1fr;
    margin-top: 42px;
  }

  .owner-card-layout .main-column {
    gap: 12px;
  }

  .owner-all-cards-heading {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 18px;
    padding-top: 4px;
  }

  .owner-all-cards-heading span {
    color: #C9CDD3;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .owner-all-cards-heading h2 {
    margin: 4px 0 0;
    color: #fff;
    font-size: 22px;
    line-height: 27px;
    font-weight: 900;
  }

  .owner-all-cards-heading p {
    margin: 2px 0 0;
    color: #a1a1aa;
    font-size: 12px;
    line-height: 16px;
    font-weight: 800;
  }

  .owner-card-layout .collection-toolbar {
    border-color: transparent;
    background: transparent;
    box-shadow: none;
    padding: 0;
    grid-template-columns: minmax(220px, 1fr) auto auto;
  }

  .owner-card-layout .listing-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 16px;
  }

  .owner-card-layout .listing-card {
    min-height: 0;
    border-color: rgba(231,222,208,0.08);
    background: rgba(7,7,8,0.72);
    padding: 12px;
    gap: 8px;
  }

  .owner-card-layout .listing-card .art-shell {
    width: 100%;
    height: 248px;
  }

  .owner-card-layout .listing-card h3 {
    font-size: 13px;
    line-height: 18px;
  }

  .owner-card-layout .listing-meta {
    min-height: 30px;
  }

  .owner-view-card {
    width: 100%;
    margin-top: 2px;
  }

  .owner-curator-actions {
    display: grid;
    gap: 7px;
    margin-top: 2px;
  }

  .owner-curator-actions button,
  .owner-curator-actions a {
    min-height: 34px;
    border: 1px solid rgba(231,222,208,0.20);
    border-radius: 9px;
    background: rgba(231,222,208,0.055);
    color: #fff;
    padding: 0 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font: inherit;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    text-decoration: none;
    cursor: pointer;
  }

  .owner-curator-actions button:hover,
  .owner-curator-actions button:focus-visible,
  .owner-curator-actions a:hover,
  .owner-curator-actions a:focus-visible {
    border-color: rgba(231,222,208,0.48);
    background: rgba(231,222,208,0.10);
    outline: none;
  }

  .owner-curator-actions button:disabled {
    border-color: rgba(231,222,208,0.30);
    background: rgba(231,222,208,0.10);
    color: #E7DED0;
    cursor: default;
  }

  .studio-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1100;
    background: rgba(0,0,0,0.76);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: clamp(18px, 3vw, 36px);
    backdrop-filter: blur(18px);
  }

  .studio-modal {
    width: min(1120px, 100%);
    max-height: min(88vh, 920px);
    overflow: auto;
    border-radius: 24px;
    border-color: rgba(231,222,208,0.16);
    background:
      radial-gradient(circle at 50% 0%, rgba(231,222,208,0.10), transparent 34%),
      linear-gradient(180deg, rgba(255,255,255,0.052), rgba(255,255,255,0.014)),
      rgba(6,6,7,0.96);
    box-shadow: 0 42px 120px rgba(0,0,0,0.56);
    padding: clamp(20px, 3vw, 34px);
  }

  .studio-modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 24px;
  }

  .studio-modal-header span,
  .studio-live-preview > span,
  .studio-featured-preview > span {
    color: #C9CDD3;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .studio-modal-header h2 {
    margin: 6px 0 0;
    color: #fff;
    font-size: clamp(26px, 3.8vw, 44px);
    line-height: 1;
    font-weight: 900;
  }

  .studio-modal-header p {
    max-width: 640px;
    margin: 10px 0 0;
    color: #a1a1aa;
    font-size: 14px;
    line-height: 21px;
    font-weight: 800;
  }

  .studio-modal-header button {
    width: 38px;
    height: 38px;
    border: 1px solid rgba(231,222,208,0.18);
    border-radius: 999px;
    background: rgba(231,222,208,0.06);
    color: #fff;
    font: inherit;
    font-size: 14px;
    font-weight: 900;
    cursor: pointer;
  }

  .studio-modal-header button:hover,
  .studio-modal-header button:focus-visible {
    border-color: rgba(231,222,208,0.44);
    outline: none;
  }

  .studio-preview-grid {
    display: grid;
    grid-template-columns: minmax(220px, 320px) minmax(0, 1fr);
    gap: clamp(20px, 3vw, 32px);
    align-items: start;
  }

  .studio-live-preview,
  .studio-featured-preview {
    border: 1px solid rgba(231,222,208,0.12);
    border-radius: 22px;
    background:
      radial-gradient(circle at 50% 32%, rgba(231,222,208,0.14), transparent 58%),
      rgba(8,8,10,0.78);
    padding: 18px;
    display: grid;
    gap: 12px;
    justify-items: center;
    text-align: center;
  }

  .studio-live-preview .art-shell {
    width: min(220px, 100%);
    height: 290px;
    border-radius: 16px;
  }

  .studio-live-preview strong,
  .studio-featured-preview strong {
    color: #fff;
    font-size: 16px;
    line-height: 21px;
    font-weight: 900;
  }

  .studio-live-preview small {
    color: #a1a1aa;
    font-size: 12px;
    line-height: 16px;
    font-weight: 800;
  }

  .studio-featured-preview {
    margin-bottom: 20px;
    justify-items: stretch;
    text-align: left;
  }

  .studio-featured-preview > div {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding: 2px 2px 8px;
  }

  .studio-featured-preview .art-shell {
    flex: 0 0 92px;
    width: 92px;
    height: 126px;
    border-radius: 10px;
  }

  .studio-selection-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .featured-selection {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .studio-card-option {
    position: relative;
    min-height: 250px;
    border: 1px solid rgba(231,222,208,0.12);
    border-radius: 18px;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.008)),
      rgba(8,8,10,0.82);
    color: inherit;
    padding: 12px;
    display: grid;
    grid-template-rows: 1fr auto auto;
    gap: 10px;
    text-align: left;
    cursor: pointer;
    transition:
      border-color 160ms ease,
      background 160ms ease,
      transform 160ms ease,
      box-shadow 160ms ease;
  }

  .studio-card-option:hover,
  .studio-card-option:focus-visible {
    border-color: rgba(231,222,208,0.36);
    background: rgba(231,222,208,0.055);
    outline: none;
    transform: translateY(-1px);
  }

  .studio-card-option.selected {
    border-color: rgba(231,222,208,0.70);
    background:
      linear-gradient(180deg, rgba(231,222,208,0.13), rgba(231,222,208,0.04)),
      rgba(8,8,10,0.92);
    box-shadow: 0 0 0 1px rgba(231,222,208,0.12), 0 20px 44px rgba(0,0,0,0.28);
  }

  .studio-card-option .art-shell {
    width: 100%;
    height: 178px;
    border-radius: 12px;
  }

  .studio-card-option strong {
    display: block;
    color: #fff;
    font-size: 13px;
    line-height: 17px;
    font-weight: 900;
  }

  .studio-card-option small {
    display: block;
    margin-top: 3px;
    color: #a1a1aa;
    font-size: 11px;
    line-height: 15px;
    font-weight: 800;
  }

  .studio-card-option em {
    justify-self: start;
    border: 1px solid rgba(231,222,208,0.20);
    border-radius: 999px;
    background: rgba(231,222,208,0.08);
    color: #E7DED0;
    padding: 5px 8px;
    font-size: 10px;
    line-height: 12px;
    font-style: normal;
    font-weight: 900;
    text-transform: uppercase;
  }

  .studio-card-option.selected em {
    border-color: rgba(231,222,208,0.52);
    background: rgba(231,222,208,0.15);
    color: #fff;
  }

  .studio-modal-actions {
    margin-top: 24px;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    flex-wrap: wrap;
  }

  .studio-modal-actions button {
    min-height: 42px;
    border: 1px solid rgba(231,222,208,0.22);
    border-radius: 11px;
    background: rgba(231,222,208,0.06);
    color: #fff;
    padding: 0 16px;
    font: inherit;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
  }

  .studio-modal-actions .primary {
    border-color: rgba(231,222,208,0.48);
    background:
      linear-gradient(180deg, rgba(231,222,208,0.18), rgba(231,222,208,0.07)),
      rgba(8,8,10,0.88);
  }

  .studio-modal-actions button:hover,
  .studio-modal-actions button:focus-visible {
    border-color: rgba(231,222,208,0.56);
    outline: none;
  }

  .studio-modal-actions button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .message-modal-backdrop {
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

  .message-modal {
    width: min(520px, 100%);
    padding: 18px;
    border-radius: 14px;
    box-sizing: border-box;
  }

  .message-modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
  }

  .message-modal-header span,
  .message-modal-preview span,
  .message-field span {
    color: #C9CDD3;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .message-modal-header h2 {
    margin: 6px 0 0;
    color: #fff;
    font-size: 22px;
    line-height: 27px;
    font-weight: 900;
  }

  .message-modal-header button {
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

  .message-modal-preview .art-shell {
    width: 74px;
    height: 96px;
  }

  .message-modal-preview .mock-card {
    width: 52px;
    height: 74px;
    border-radius: 8px;
    padding: 4px;
  }

  .message-modal-preview .uploaded-card-image {
    max-width: 58px;
    max-height: 78px;
  }

  .message-modal-preview strong {
    display: block;
    margin-top: 5px;
    color: #fff;
    font-size: 15px;
    line-height: 20px;
    font-weight: 900;
  }

  .message-modal-preview p,
  .message-error,
  .message-confirmation p {
    margin: 4px 0 0;
    color: #a1a1aa;
    font-size: 12px;
    line-height: 16px;
    font-weight: 800;
  }

  .message-field {
    margin-top: 14px;
    display: grid;
    gap: 7px;
  }

  .message-field input,
  .message-field textarea {
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

  .message-field input {
    height: 44px;
  }

  .message-field textarea {
    min-height: 96px;
    resize: vertical;
  }

  .message-error {
    margin-top: 10px;
    color: #fb7185;
  }

  .message-confirmation {
    margin-top: 14px;
    border: 1px solid rgba(52,211,153,0.24);
    border-radius: 10px;
    background: rgba(52,211,153,0.07);
    padding: 12px;
  }

  .message-confirmation strong {
    color: #86efac;
    font-size: 13px;
    line-height: 17px;
    font-weight: 900;
  }

  .message-modal-actions {
    margin-top: 16px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .message-modal-actions.single-action {
    grid-template-columns: 1fr;
  }

  .message-modal-actions button,
  .message-modal-actions a {
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

  .message-modal-actions .primary {
    background: #E7DED0;
    color: #111;
  }

  .section-heading-row h2,
  .collection-header h2,
  .sidebar-panel h2,
  .empty-state h2 {
    margin: 0;
    color: #fff;
    font-size: 18px;
    line-height: 22px;
    font-weight: 900;
  }

  .section-heading-row p,
  .collection-header p {
    margin: 6px 0 0;
  }

  .section-heading-row {
    margin-bottom: 14px;
  }

  .collection-stats {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }

  .featured-card-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .featured-card {
    min-height: 228px;
    border: 1px solid rgba(231,222,208,0.14);
    border-radius: 14px;
    background:
      radial-gradient(circle at 50% 0%, rgba(231,222,208,0.10), transparent 42%),
      rgba(8,8,10,0.78);
    color: inherit;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 10px;
    padding: 12px;
    text-decoration: none;
    transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
  }

  .featured-card:hover {
    transform: translateY(-1px);
    border-color: rgba(231,222,208,0.34);
    box-shadow: 0 18px 42px rgba(0,0,0,0.34);
  }

  .featured-card .art-shell {
    width: 100%;
    height: 166px;
  }

  .featured-card span,
  .activity-card span {
    display: block;
  }

  .featured-card strong,
  .activity-card strong {
    margin-top: 5px;
  }

  .featured-card small,
  .activity-card small {
    display: block;
    margin-top: 4px;
  }

  .collection-toolbar {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 10px;
    align-items: center;
  }

  .collection-search {
    height: 38px;
    border: 1px solid #24242a;
    border-radius: 9px;
    background: #08080a;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 12px;
  }

  .collection-search span {
    width: 12px;
    height: 12px;
    border: 2px solid #777985;
    border-radius: 999px;
    box-sizing: border-box;
    flex: 0 0 auto;
  }

  .collection-search input {
    width: 100%;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: #f4f4f5;
    font: inherit;
    font-size: 13px;
    font-weight: 800;
  }

  .collection-search input::placeholder {
    color: #777985;
  }

  .sort-button,
  .filter-buttons button {
    height: 38px;
    border-radius: 9px;
    padding: 0 12px;
    font-size: 12px;
  }

  .filter-buttons {
    display: flex;
    gap: 6px;
  }

  .listing-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .activity-card-list {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }

  .activity-card {
    border: 1px solid rgba(201,205,211,0.13);
    border-radius: 13px;
    background: rgba(8,8,10,0.72);
    color: inherit;
    padding: 12px;
    text-decoration: none;
    transition: border-color 160ms ease, transform 160ms ease;
  }

  .activity-card:hover {
    border-color: rgba(231,222,208,0.28);
    transform: translateY(-1px);
  }

  .listing-card {
    min-height: 352px;
    border: 1px solid #202026;
    border-radius: 12px;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.006)),
      #070708;
    padding: 13px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    box-sizing: border-box;
    transition: border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;
  }

  .listing-card:hover {
    border-color: rgba(231,222,208,0.34);
    transform: translateY(-1px);
    box-shadow: 0 20px 46px rgba(0,0,0,0.36);
  }

  .badge-row {
    min-height: 24px;
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

  .tag-collection {
    border-color: rgba(201,205,211,0.38);
    background: rgba(201,205,211,0.08);
    color: #C9CDD3;
  }

  .art-link {
    color: inherit;
    text-decoration: none;
    display: flex;
    justify-content: center;
  }

  .art-shell {
    width: 156px;
    height: 182px;
    border: 1px solid rgba(201,205,211,0.12);
    border-radius: 10px;
    background:
      radial-gradient(circle at 50% 18%, rgba(231,222,208,0.16), transparent 45%),
      linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.006)),
      #030304;
    box-shadow: inset 0 0 22px rgba(255,255,255,0.025);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .uploaded-card-image {
    max-width: 122px;
    max-height: 164px;
    width: auto;
    height: auto;
    border-radius: 9px;
    object-fit: contain;
    box-shadow: 0 18px 34px rgba(0,0,0,0.62);
  }

  .mock-card {
    width: 108px;
    height: 158px;
    border: 1px solid rgba(244,244,245,0.48);
    border-radius: 10px;
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

  .mock-label {
    height: 22px;
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

  .mock-art {
    height: 96px;
    margin-top: 6px;
    border: 1px solid rgba(255,255,255,0.26);
    border-radius: 7px;
    position: relative;
    overflow: hidden;
  }

  .raw-card .mock-art {
    height: 124px;
    margin-top: 0;
  }

  .mock-card-code,
  .mock-rank,
  .mock-title {
    position: absolute;
    z-index: 3;
    color: #fff;
    font-weight: 900;
    text-transform: uppercase;
    text-shadow: 0 1px 8px rgba(0,0,0,0.58);
  }

  .mock-card-code {
    left: 7px;
    top: 7px;
    font-size: 7px;
  }

  .mock-rank {
    right: 7px;
    top: 7px;
    font-size: 7px;
  }

  .mock-title {
    left: 8px;
    right: 8px;
    bottom: 20px;
    font-size: 8px;
    line-height: 10px;
  }

  .mock-orbit {
    position: absolute;
    left: 17px;
    top: 23px;
    width: 62px;
    height: 62px;
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 50%;
    transform: rotate(-18deg);
  }

  .mock-figure {
    position: absolute;
    left: 38px;
    top: 34px;
    width: 29px;
    height: 52px;
    border-radius: 999px 999px 12px 12px;
    background: linear-gradient(180deg, rgba(255,255,255,0.88), rgba(201,205,211,0.58));
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
    border-radius: 6px;
    box-shadow: inset 0 0 20px rgba(0,0,0,0.28);
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
    height: 6px;
    margin-top: 6px;
    border-radius: 999px;
    display: flex;
    gap: 4px;
  }

  .mock-strip span {
    flex: 1;
    border-radius: 999px;
    background: linear-gradient(90deg, rgba(201,205,211,0.28), rgba(231,222,208,0.72), rgba(201,205,211,0.28));
  }

  .listing-card h3 {
    margin: 0;
    color: #fff;
    font-size: 16px;
    line-height: 21px;
    font-weight: 900;
  }

  .listing-meta {
    margin: 0;
    color: #a1a1aa;
    font-size: 12px;
    line-height: 16px;
    font-weight: 800;
  }

  .listing-data {
    margin-top: auto;
    display: grid;
    gap: 4px;
  }

  .listing-data span {
    color: #fff;
    font-size: 22px;
    line-height: 25px;
    font-weight: 900;
  }

  .listing-data small {
    color: #a1a1aa;
    font-size: 11px;
    line-height: 14px;
    font-weight: 800;
  }

  .listing-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: nowrap;
  }

  .action-circles {
    display: flex;
    align-items: center;
    gap: 9px;
    flex: 0 0 auto;
  }

  .action-circles button,
  .action-circles a {
    width: 38px;
    height: 38px;
    position: relative;
    overflow: hidden;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    color: #E7DED0;
    background:
      radial-gradient(circle at 48% 20%, rgba(255,255,255,0.22), transparent 38%),
      linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.012)),
      rgba(9,9,11,0.94);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.12),
      inset 0 -10px 18px rgba(0,0,0,0.28),
      0 12px 24px rgba(0,0,0,0.3);
  }

  .action-circles button:hover,
  .action-circles a:hover {
    border-color: rgba(231,222,208,0.68);
    box-shadow: 0 0 22px rgba(201,205,211,0.2);
    transform: translateY(-1px);
  }

  .cart-icon {
    position: relative;
    width: 15px;
    height: 11px;
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
    position: relative;
    width: 16px;
    height: 12px;
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
    min-width: 86px;
    border: 1px solid rgba(231,222,208,0.26);
    border-radius: 8px;
    background: rgba(231,222,208,0.055);
    color: #fff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 900;
  }

  .sidebar-panel {
    display: grid;
    gap: 10px;
  }

  .personality-token {
    justify-self: start;
    border-color: rgba(185,146,74,0.28);
    background: rgba(185,146,74,0.075);
  }

  .personality-token.secondary {
    border-color: rgba(231,222,208,0.22);
    background: rgba(231,222,208,0.055);
  }

  .framework-list {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }

  .framework-list span {
    min-height: 26px;
    border-color: rgba(201,205,211,0.14);
    color: #C9CDD3;
    background: rgba(201,205,211,0.04);
    font-size: 10px;
  }

  .timeline-preview {
    display: grid;
    gap: 10px;
  }

  .timeline-preview div {
    display: grid;
    grid-template-columns: 20px minmax(0, 1fr);
    gap: 9px;
    align-items: center;
  }

  .timeline-preview em {
    width: 14px;
    height: 14px;
    border: 1px solid rgba(231,222,208,0.28);
    border-radius: 999px;
    background: radial-gradient(circle, #E7DED0 0 28%, #050506 34%);
    box-shadow: 0 0 18px rgba(231,222,208,0.10);
  }

  .timeline-preview span {
    color: #a1a1aa;
    font-size: 12px;
    line-height: 16px;
    font-weight: 800;
  }

  .progress-block {
    border: 1px solid #202026;
    border-radius: 10px;
    background: rgba(8,8,10,0.76);
    padding: 10px;
  }

  .progress-block div:first-child {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    color: #C9CDD3;
    font-size: 11px;
    font-weight: 900;
  }

  .progress-track {
    margin-top: 9px;
    height: 8px;
    border-radius: 999px;
    background: rgba(201,205,211,0.12);
    overflow: hidden;
  }

  .progress-track span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #C9CDD3, #E7DED0);
  }

  .snapshot-grid {
    display: grid;
    gap: 10px;
  }

  .market-chart {
    width: 100%;
    height: 92px;
    display: block;
  }

  .chart-fill {
    fill: rgba(231,222,208,0.10);
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

  .empty-state,
  .not-found {
    padding: 42px;
    text-align: center;
  }

  .not-found {
    margin-top: 30px;
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
    .collection-banner,
    .collection-layout,
    .collection-hero-stats,
    .collection-story-grid,
    .seller-hero-stats,
    .collection-stats,
    .featured-card-grid,
    .activity-card-list,
    .owner-management-grid,
    .studio-preview-grid,
    .studio-selection-grid,
    .featured-selection,
    .collection-toolbar,
    .listing-grid {
      grid-template-columns: 1fr;
    }

    .sidebar {
      position: static;
    }

    .filter-buttons {
      flex-wrap: wrap;
    }

    .curate-hero .collection-banner {
      grid-template-columns: 1fr;
    }

    .curate-hero .collection-hero-stats,
    .owner-management-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .studio-selection-grid,
    .featured-selection {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .owner-card-layout .listing-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 680px) {
    .collection-shell {
      width: calc(100vw - 22px);
    }

    .collection-banner {
      min-height: 560px;
      border-radius: 16px;
      padding: 18px;
    }

    .collection-banner-copy h1 {
      font-size: 42px;
      line-height: 0.98;
    }

    .showcase-card-panel .art-shell {
      width: 168px;
      height: 206px;
    }

    .collection-hero-actions {
      display: grid;
    }

    .collection-hero-actions button {
      width: 100%;
    }

    .curate-hero .collection-hero-stats,
    .owner-management-grid,
    .studio-selection-grid,
    .featured-selection,
    .owner-card-layout .collection-toolbar,
    .owner-card-layout .listing-grid {
      grid-template-columns: 1fr;
    }

    .studio-modal {
      max-height: calc(100vh - 28px);
      border-radius: 18px;
    }

    .studio-card-option {
      min-height: 220px;
    }

    .owner-curator-actions {
      grid-template-columns: 1fr;
    }

    .studio-heading-row,
    .owner-all-cards-heading {
      align-items: flex-start;
      flex-direction: column;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .featured-card,
    .activity-card,
    .studio-card-option,
    .owner-management-grid button,
    .listing-card {
      transition: none;
    }

    .featured-card:hover,
    .activity-card:hover,
    .studio-card-option:hover,
    .owner-management-grid button:hover,
    .listing-card:hover {
      transform: none;
    }
  }
`;
