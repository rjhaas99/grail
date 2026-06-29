"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Header from "../components/Header";
import {
  type MockListing,
  getListingTag,
  mockFeaturedSellers as featuredSellers,
  mockListings,
  mockMarketData,
} from "../lib/mockData";

type BrowseListing = MockListing & {
  imageUrl?: string | null;
  sellerId?: string | null;
  source: "supabase" | "mock";
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
  listing_images: ListingImageRow[] | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
};

const fallbackListings: BrowseListing[] = mockListings.map((listing) => ({
  ...listing,
  source: "mock",
}));

const realListingAccents = [
  "#8f1d2c",
  "#334155",
  "#0f766e",
  "#1e3a8a",
  "#7c3aed",
  "#475569",
  "#047857",
  "#1d4ed8",
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

const sellerLevels = [
  "Level 10 Seller",
  "Level 9 Seller",
  "Level 8 Seller",
  "Level 7 Seller",
  "Level 6 Seller",
  "Level 5 Seller",
  "Level 4 Seller",
  "Level 3 Seller",
  "Level 2 Seller",
  "Level 1 Seller",
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
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
    [listing.year, listing.brand, listing.player].filter(Boolean).join(" ") ||
    "Untitled Card";
  const price = Number(listing.price || 0);
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
    price,
    priceDisplay: price ? formatCurrency(price) : "Price not listed",
    askingPrice: price,
    marketValue: 0,
    minimumOffer: price ? Math.round(price * 0.85) : 0,
    minOffer: price ? Math.round(price * 0.85) : 0,
    watchCount: 0,
    views: 0,
    viewCount: 0,
    listedOrder: totalCount - index,
    listedDate: formatListedDate(listing.created_at),
    tags: [isGraded ? "Graded" : "Raw"],
    tag: isGraded ? "Graded" : "Raw",
    isGraded,
    isRaw,
    isHot: false,
    isGrail: false,
    accent,
    artworkTone: "live listing",
    imageUrl: getImageUrl(listing),
    source: "supabase",
    cardDetailRoute: route,
    sellerCollectionRoute: `/collections/${sellerSlug}`,
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
  accent,
  category,
  condition,
  title,
  imageUrl,
}: {
  accent: string;
  category: string;
  condition: string;
  title: string;
  imageUrl?: string | null;
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
}: {
  title: string;
  options: string[];
}) {
  return (
    <section className="filter-group">
      <h3>{title}</h3>
      <div className="filter-options">
        {options.map((option) => (
          <label key={option} className="filter-option">
            <input type="checkbox" />
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
}: {
  openGraders: string[];
  onToggle: (grader: string) => void;
}) {
  return (
    <section className="filter-group grade-filter">
      <h3>Grade</h3>
      <label className="filter-option grade-raw-option">
        <input type="checkbox" />
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
                      <input type="checkbox" />
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
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <section className="filter-group seller-filters">
      <h3>Seller Filters</h3>
      <div className="grader-item">
        <button
          type="button"
          className="grader-toggle"
          aria-expanded={isOpen}
          onClick={onToggle}
        >
          <span>Level Sellers</span>
          <span aria-hidden="true">{isOpen ? "▴" : "▾"}</span>
        </button>

        {isOpen ? (
          <div className="seller-level-panel">
            {sellerLevels.map((level) => (
              <label key={level} className="grade-option seller-level-option">
                <input type="checkbox" />
                <span>{level}</span>
              </label>
            ))}
          </div>
        ) : null}
      </div>

      <div className="filter-options seller-quick-options">
        <label className="filter-option">
          <input type="checkbox" />
          <span>New Listings</span>
        </label>
        <label className="filter-option">
          <input type="checkbox" />
          <span>Featured Sellers</span>
        </label>
      </div>
    </section>
  );
}

function MarketIndexChart() {
  return (
    <svg
      className="market-chart"
      viewBox="0 0 236 86"
      role="img"
      aria-label="Mock GRAIL Market Index chart"
    >
      <path
        className="chart-fill"
        d="M8 70 C28 60 38 42 58 48 C78 54 87 31 109 36 C130 41 138 60 158 50 C179 39 186 24 205 31 C219 36 225 26 232 20 L232 78 L8 78 Z"
      />
      <path
        className="chart-line"
        d="M8 70 C28 60 38 42 58 48 C78 54 87 31 109 36 C130 41 138 60 158 50 C179 39 186 24 205 31 C219 36 225 26 232 20"
      />
      <g className="chart-grid" aria-hidden="true">
        <path d="M8 24 H232" />
        <path d="M8 50 H232" />
        <path d="M8 76 H232" />
      </g>
    </svg>
  );
}

export default function BrowsePage() {
  const searchParams = useSearchParams();
  const urlSearchQuery = searchParams.get("search") || "";
  const [listings, setListings] = useState<BrowseListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fallbackNote, setFallbackNote] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [openGraders, setOpenGraders] = useState<string[]>(["PSA"]);
  const [isSellerLevelsOpen, setIsSellerLevelsOpen] = useState(false);
  const [sortMode, setSortMode] = useState<"newest" | "hot">("newest");
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [hasLocalSearch, setHasLocalSearch] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "compact">("grid");
  const [offerListing, setOfferListing] = useState<BrowseListing | null>(null);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [offerError, setOfferError] = useState("");
  const [sentOfferAmount, setSentOfferAmount] = useState<number | null>(null);
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

        const rows = (data || []) as SupabaseListingRow[];

        if (rows.length === 0) {
          if (!isMounted) {
            return;
          }

          setListings(fallbackListings);
          setFallbackNote("No live listings yet. Showing demo listings.");
          return;
        }

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
        const liveIds = new Set(liveListings.map((listing) => listing.id));
        const demoListings = fallbackListings.filter(
          (listing) => !liveIds.has(listing.id),
        );

        setListings([...liveListings, ...demoListings]);
        setFallbackNote("Showing live + demo listings.");
      } catch (error) {
        console.error("Browse listings error:", error);

        if (!isMounted) {
          return;
        }

        setListings(fallbackListings);
        setFallbackNote("Showing demo listings.");
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
  const visibleListings = listings
    .filter((listing) => {
      const tag = getListingTag(listing);

      if (sortMode === "hot" && tag !== "Hot") {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        listing.title,
        listing.category,
        listing.condition,
        listing.meta,
        listing.seller,
        tag,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    })
    .sort((first, second) => {
      if (sortMode === "hot") {
        return (
          second.watchCount +
          second.views * 0.1 -
          (first.watchCount + first.views * 0.1)
        );
      }

      return second.listedOrder - first.listedOrder;
    });

  const resultLabel = isLoading
    ? "Loading listings..."
    : normalizedQuery
      ? `${visibleListings.length} ${
          visibleListings.length === 1 ? "result" : "results"
        }`
      : sortMode === "hot"
        ? `${visibleListings.length} hot cards`
        : `${listings.length} listings`;

  function toggleGrader(grader: string) {
    setOpenGraders((current) =>
      current.includes(grader)
        ? current.filter((item) => item !== grader)
        : [...current, grader],
    );
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

  function submitOffer() {
    if (!offerListing) {
      return;
    }

    const amount = Number(offerAmount);

    if (!amount || amount < offerListing.minOffer) {
      setOfferError("Offer is below the seller's minimum.");
      setSentOfferAmount(null);
      return;
    }

    setOfferError("");
    setSentOfferAmount(amount);
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
            grid-template-columns: 1fr auto auto auto auto;
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

          .offer-modal-actions button {
            min-height: 40px;
            border: 1px solid rgba(231,222,208,0.28);
            border-radius: 10px;
            background: rgba(231,222,208,0.055);
            color: #fff;
            font: inherit;
            font-size: 12px;
            font-weight: 900;
            cursor: pointer;
          }

          .offer-modal-actions .submit-offer {
            background: #E7DED0;
            color: #111;
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
            border-color: rgba(244,63,94,0.3);
            background: rgba(244,63,94,0.085);
            color: #fb7185;
            box-shadow: 0 0 16px rgba(244,63,94,0.08);
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
            border-color: rgba(45,212,191,0.22);
            background: rgba(45,212,191,0.055);
            color: #99f6e4;
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
              radial-gradient(circle at 78% 8%, rgba(52,211,153,0.12), transparent 34%),
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
            fill: rgba(52, 211, 153, 0.1);
          }

          .chart-line {
            fill: none;
            stroke: #34d399;
            stroke-width: 3;
            stroke-linecap: round;
            stroke-linejoin: round;
            filter: drop-shadow(0 0 8px rgba(52,211,153,0.24));
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
            color: #34d399;
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
            border: 1px solid rgba(74,222,128,0.22);
            border-radius: 999px;
            color: #86efac;
            background: rgba(74,222,128,0.06);
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

        <section className="dashboard">
          <aside className="panel filters" aria-label="Filters">
            <div className="filters-header">
              <h2>FILTERS</h2>
              <button type="button" className="reset-button">
                Reset
              </button>
            </div>

            <FilterGroup title="Category" options={categoryFilters} />
            <FilterGroup title="Price" options={priceFilters} />
            <GradeFilters openGraders={openGraders} onToggle={toggleGrader} />
            <SellerFilters
              isOpen={isSellerLevelsOpen}
              onToggle={() => setIsSellerLevelsOpen((current) => !current)}
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
                {visibleListings.map((listing) => {
                  const tag = getListingTag(listing);
                  const isOwnerListing =
                    Boolean(currentUserId) && listing.sellerId === currentUserId;

                  return (
                    <article key={listing.href} className="listing-card">
                      <div className="listing-badge-row">
                        <span className={`badge badge-${tag.toLowerCase()}`}>
                          {tag}
                        </span>
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
                          ) : (
                            <div className="action-circles">
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
                              <Link
                                href="/messages"
                                className="action-button"
                                aria-label={`Message ${listing.seller}`}
                                title="Message"
                              >
                                <span
                                  className="action-icon message-icon"
                                  aria-hidden="true"
                                />
                              </Link>
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
                          )}

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
                <h2>No cards found.</h2>
                <p>Try a different search or filter.</p>
              </div>
            )}
          </section>

          <aside className="right-stack" aria-label="Market panels">
            <section className="panel side-panel">
              <h2>MARKET SNAPSHOT</h2>

              <div className="snapshot-grid">
                <div className="metric">
                  <span>Total Listings</span>
                  <strong>{mockMarketData.snapshot.totalListings}</strong>
                </div>
                <div className="metric">
                  <span>Avg Sale Price</span>
                  <strong>${mockMarketData.snapshot.avgSalePrice}</strong>
                </div>
                <div className="metric">
                  <span>New Today</span>
                  <strong>{mockMarketData.snapshot.newToday}</strong>
                </div>
                <div className="metric">
                  <span>Trending Category</span>
                  <strong>{mockMarketData.snapshot.trendingCategory}</strong>
                </div>
              </div>

              <div className="market-index">
                <div className="market-index-header">
                  <span>GRAIL Market Index</span>
                  <strong>{mockMarketData.grailMarketIndex.value}</strong>
                </div>
                <MarketIndexChart />
                <p className="market-index-caption">
                  {mockMarketData.grailMarketIndex.label}{" "}
                  <span>{mockMarketData.grailMarketIndex.dailyChange}</span>
                </p>
              </div>
            </section>

            <section className="panel side-panel">
              <h2>FEATURED SELLERS</h2>
              <p className="side-subtitle">
                Earn placement by selling, shipping fast, and leveling up.
              </p>

              <div className="seller-list">
                {featuredSellers.map((seller) => (
                  <div key={seller.name} className="seller-row">
                    <span className="seller-avatar">{seller.name.slice(0, 1)}</span>
                    <div>
                      <strong>{seller.name}</strong>
                      <span>
                        {seller.level} · {seller.sales}
                      </span>
                    </div>
                    <span className="seller-trust">{seller.badge}</span>
                  </div>
                ))}
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
                <span>Asking Price</span>
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
                <strong>{formatCurrency(offerListing.minOffer)}</strong>
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
                <button type="button" className="submit-offer" onClick={submitOffer}>
                  Submit Offer
                </button>
                <button type="button" onClick={closeOfferModal}>
                  Cancel
                </button>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </main>
  );
}
