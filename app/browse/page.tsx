"use client";

import Link from "next/link";
import { useState } from "react";
import Header from "../components/Header";

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

const listings = [
  {
    href: "/cards/browse-1",
    title: "Crimson Court Rookie",
    category: "Sports",
    condition: "PSA 10",
    meta: "Sports: PSA 10",
    price: "$1,240",
    seller: "VaultRunner",
    sellerHref: "/collections/vault-runner",
    accent: "#8f1d2c",
    listedOrder: 4,
    marketValue: 1320,
    watchCount: 184,
    views: 1240,
    isGrail: true,
  },
  {
    href: "/cards/browse-2",
    title: "Silver Horizon Striker",
    category: "Sports",
    condition: "PSA 9",
    meta: "Sports: PSA 9",
    price: "$680",
    seller: "CardForge",
    sellerHref: "/collections/card-forge",
    accent: "#334155",
    listedOrder: 8,
    marketValue: 710,
    watchCount: 96,
    views: 680,
    isGrail: false,
  },
  {
    href: "/cards/browse-3",
    title: "Midnight Arc Holo",
    category: "TCG",
    condition: "Mint",
    meta: "TCG: Mint",
    price: "$395",
    seller: "SlabStreet",
    sellerHref: "/collections/slab-street",
    accent: "#0f766e",
    listedOrder: 2,
    marketValue: 380,
    watchCount: 72,
    views: 420,
    isGrail: false,
  },
  {
    href: "/cards/browse-4",
    title: "Obsidian Field Captain",
    category: "Sports",
    condition: "SGC 8",
    meta: "Sports: SGC 8",
    price: "$520",
    seller: "PackPilot",
    sellerHref: "/collections/pack-pilot",
    accent: "#1e3a8a",
    listedOrder: 7,
    marketValue: 560,
    watchCount: 166,
    views: 980,
    isGrail: false,
  },
  {
    href: "/cards/browse-5",
    title: "Aurora Strike Prism",
    category: "TCG",
    condition: "Raw Near Mint",
    meta: "TCG: Raw Near Mint",
    price: "$185",
    seller: "RookieRoom",
    sellerHref: "/collections/rookie-room",
    accent: "#7c3aed",
    listedOrder: 6,
    marketValue: 210,
    watchCount: 148,
    views: 790,
    isGrail: false,
  },
  {
    href: "/cards/browse-6",
    title: "Platinum Rookie Crest",
    category: "Sports",
    condition: "PSA 8",
    meta: "Sports: PSA 8",
    price: "$910",
    seller: "HoloHouse",
    sellerHref: "/collections/holo-house",
    accent: "#475569",
    listedOrder: 3,
    marketValue: 940,
    watchCount: 88,
    views: 610,
    isGrail: false,
  },
  {
    href: "/cards/browse-7",
    title: "Emerald Archive Guardian",
    category: "TCG",
    condition: "BGS 9.5",
    meta: "TCG: BGS 9.5",
    price: "$760",
    seller: "GradeLane",
    sellerHref: "/collections/grade-lane",
    accent: "#047857",
    listedOrder: 5,
    marketValue: 820,
    watchCount: 205,
    views: 1510,
    isGrail: false,
  },
  {
    href: "/cards/browse-8",
    title: "Sapphire Prospect Vault",
    category: "Sports",
    condition: "Raw Mint",
    meta: "Sports: Raw Mint",
    price: "$145",
    seller: "CollectorCorner",
    sellerHref: "/collections/collector-corner",
    accent: "#1d4ed8",
    listedOrder: 1,
    marketValue: 155,
    watchCount: 43,
    views: 280,
    isGrail: false,
  },
];

function getListingTag(listing: (typeof listings)[number]) {
  if (listing.isGrail) {
    return "Grail";
  }

  if (listing.watchCount >= 150 || listing.views >= 900) {
    return "Hot";
  }

  const condition = listing.condition.toLowerCase();

  return condition.includes("raw") ||
    condition.includes("near mint") ||
    condition === "mint"
    ? "Raw"
    : "Graded";
}

const featuredSellers = [
  {
    name: "VaultRunner",
    level: "Level 4 Seller",
    sales: "142 sales",
    badge: "Top Closer",
  },
  {
    name: "CardForge",
    level: "Level 3 Seller",
    sales: "98 sales",
    badge: "Fast Shipper",
  },
  {
    name: "SlabStreet",
    level: "Level 3 Seller",
    sales: "76 sales",
    badge: "Trusted",
  },
  {
    name: "PackPilot",
    level: "Level 2 Seller",
    sales: "41 sales",
    badge: "Rising Seller",
  },
];

function CardArtwork({
  accent,
  category,
  condition,
  title,
}: {
  accent: string;
  category: string;
  condition: string;
  title: string;
}) {
  const isRaw =
    condition.toLowerCase().includes("raw") ||
    condition.toLowerCase().includes("mint");
  const shortTitle = title.split(" ").slice(0, 2).join(" ");

  return (
    <div className="art-shell">
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
  const [openGraders, setOpenGraders] = useState<string[]>(["PSA"]);
  const [isSellerLevelsOpen, setIsSellerLevelsOpen] = useState(false);
  const [sortMode, setSortMode] = useState<"newest" | "hot">("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "compact">("grid");

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

  const resultLabel = normalizedQuery
    ? `${visibleListings.length} ${
        visibleListings.length === 1 ? "result" : "results"
      }`
    : sortMode === "hot"
      ? `${visibleListings.length} hot cards`
    : "248 listings";

  function toggleGrader(grader: string) {
    setOpenGraders((current) =>
      current.includes(grader)
        ? current.filter((item) => item !== grader)
        : [...current, grader],
    );
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
            overflow-x: auto;
          }

          .browse-shell {
            width: 1240px;
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
              onChange={(event) => setSearchQuery(event.target.value)}
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
            {visibleListings.length > 0 ? (
              <div className={`listing-grid ${viewMode}-view`}>
                {visibleListings.map((listing) => {
                  const tag = getListingTag(listing);

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
                        <strong className="listing-price">{listing.price}</strong>
                        <div className="listing-actions">
                          <div className="action-circles">
                            <button
                              type="button"
                              className="action-button"
                              aria-label={`Buy ${listing.title}`}
                              title="Buy"
                            >
                              <span
                                className="action-icon cart-icon"
                                aria-hidden="true"
                              />
                            </button>
                            <button
                              type="button"
                              className="action-button"
                              aria-label={`Message ${listing.seller}`}
                              title="Message"
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
                            >
                              <span className="action-icon" aria-hidden="true">
                                $
                              </span>
                            </button>
                          </div>

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
                  <strong>248</strong>
                </div>
                <div className="metric">
                  <span>Avg Sale Price</span>
                  <strong>$412</strong>
                </div>
                <div className="metric">
                  <span>New Today</span>
                  <strong>31</strong>
                </div>
                <div className="metric">
                  <span>Trending Category</span>
                  <strong>Graded Rookies</strong>
                </div>
              </div>

              <div className="market-index">
                <div className="market-index-header">
                  <span>GRAIL Market Index</span>
                  <strong>1,248.6</strong>
                </div>
                <MarketIndexChart />
                <p className="market-index-caption">
                  Sports + TCG Market <span>+2.4% today</span>
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
    </main>
  );
}
