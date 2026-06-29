"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import Header from "../../components/Header";
import {
  type ListingTag,
  type MockListing,
  buildMockSellerListings,
  mockSellers,
} from "../../lib/mockData";

type FilterMode = "All" | ListingTag;
type Listing = MockListing;

const sellers = mockSellers;
const buildSellerListings = buildMockSellerListings;

const filterModes: FilterMode[] = ["All", "Grail", "Hot", "Graded", "Raw"];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
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

export default function SellerCollectionPage() {
  const params = useParams();
  const slug = String(params.slug || "");
  const seller = sellers.find((item) => item.slug === slug);
  const [filterMode, setFilterMode] = useState<FilterMode>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const listings = useMemo(() => {
    if (!seller) {
      return [];
    }

    const query = searchQuery.trim().toLowerCase();

    return buildSellerListings(seller).filter((listing) => {
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
  }, [filterMode, searchQuery, seller]);

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

  const allListings = buildSellerListings(seller);
  const totalValue = allListings.reduce((sum, listing) => sum + listing.marketValue, 0);
  const totalPrice = allListings.reduce((sum, listing) => sum + listing.price, 0);
  const averagePrice = Math.round(totalPrice / allListings.length);
  const highestValueCard = allListings.reduce((highest, listing) =>
    listing.marketValue > highest.marketValue ? listing : highest,
  );
  const grailCount = allListings.filter((listing) => listing.tag === "Grail").length;
  const hotCount = allListings.filter((listing) => listing.tag === "Hot").length;

  return (
    <main className="collection-page">
      <style>{pageStyles}</style>
      <div className="collection-shell">
        <Header />

        <div className="top-link-row">
          <Link href="/browse">← Back to Browse</Link>
        </div>

        <section className="seller-hero panel">
          <div className="seller-hero-main">
            <span className="seller-avatar">{seller.initials}</span>
            <div>
              <div className="seller-heading-row">
                <h1>{seller.name}</h1>
                <span className="seller-badge">{seller.rewardsBadge}</span>
              </div>
              <p className="seller-level">{seller.level}</p>
              <p className="seller-bio">{seller.bio}</p>
            </div>
          </div>

          <div className="hero-actions">
            <button
              type="button"
              onClick={() => setStatusMessage("Message flow coming soon.")}
            >
              Message Seller
            </button>
            <button
              type="button"
              className={isFollowing ? "active" : ""}
              onClick={() => setIsFollowing((current) => !current)}
            >
              {isFollowing ? "Following" : "Follow Seller"}
            </button>
            <button
              type="button"
              onClick={() => setStatusMessage("Share link copied.")}
            >
              Share Collection
            </button>
          </div>

          {statusMessage ? (
            <p className="hero-status">{statusMessage}</p>
          ) : null}

          <div className="seller-hero-stats">
            <Metric label="Completed Sales" value={String(seller.completedSales)} />
            <Metric label="Active Listings" value={String(allListings.length)} />
            <Metric label="Response Time" value={seller.responseTime} />
            <Metric label="Ship Speed" value={seller.shipSpeed} />
            <Metric label="Rating" value={seller.rating} />
            <Metric label="Joined" value={seller.joinedDate} />
            <Metric label="Location" value={seller.location} />
          </div>
        </section>

        <section className="collection-layout">
          <div className="main-column">
            <section className="collection-header panel">
              <div>
                <h2>Seller Collection</h2>
                <p>Browse active listings from this seller.</p>
              </div>
              <div className="collection-stats">
                <Metric label="Active Listings" value={String(allListings.length)} />
                <Metric label="Total Value" value={formatCurrency(totalValue)} />
                <Metric label="Avg Price" value={formatCurrency(averagePrice)} />
                <Metric label="Seller Level" value={seller.level} />
              </div>
            </section>

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
              <section className="listing-grid" aria-label="Seller listings">
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
                      {listing.category}: {listing.condition}
                    </p>
                    <div className="listing-data">
                      <span>{formatCurrency(listing.price)}</span>
                      <small>Market {formatCurrency(listing.marketValue)}</small>
                      <small>{listing.watchCount} watching</small>
                    </div>
                    <div className="listing-actions">
                      <div className="action-circles">
                        <button type="button" aria-label={`Buy ${listing.title}`} title="Buy">
                          <span className="cart-icon" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Message ${seller.name}`}
                          title="Message"
                        >
                          <span className="message-icon" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Make offer on ${listing.title}`}
                          title="Make Offer"
                        >
                          <span aria-hidden="true">$</span>
                        </button>
                      </div>
                      <Link className="view-card" href={listing.href}>
                        View Card
                      </Link>
                    </div>
                  </article>
                ))}
              </section>
            ) : (
              <section className="empty-state panel">
                <h2>No cards found.</h2>
                <p>Try a different search or filter.</p>
              </section>
            )}
          </div>

          <aside className="sidebar">
            <section className="panel sidebar-panel">
              <h2>Seller Rewards</h2>
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
                Higher seller rewards can increase visibility on Browse.
              </p>
            </section>

            <section className="panel sidebar-panel">
              <h2>Collection Market Snapshot</h2>
              <div className="snapshot-grid">
                <Metric label="Total Market Value" value={formatCurrency(totalValue)} />
                <Metric label="Highest Value Card" value={highestValueCard.title} />
                <Metric label="Grail Cards" value={String(grailCount)} />
                <Metric label="Hot Cards" value={String(hotCount)} />
                <Metric label="Avg Card Value" value={formatCurrency(Math.round(totalValue / allListings.length))} />
              </div>
              <MarketChart />
            </section>

            <section className="panel sidebar-panel trust-panel">
              <h2>Trust & Safety</h2>
              <ul>
                <li>Verified seller placeholder</li>
                <li>Secure checkout</li>
                <li>Offer protection</li>
                <li>Buyer protection placeholder</li>
              </ul>
            </section>
          </aside>
        </section>
      </div>
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
    width: 1240px;
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

  .seller-hero {
    padding: 18px;
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
  .collection-toolbar button,
  .listing-actions button {
    border: 1px solid rgba(231,222,208,0.28);
    background: rgba(231,222,208,0.055);
    color: #fff;
    cursor: pointer;
    font-weight: 900;
  }

  .hero-actions button {
    height: 38px;
    border-radius: 10px;
    padding: 0 14px;
    font-size: 12px;
  }

  .hero-actions button.active,
  .hero-actions button:hover,
  .collection-toolbar button.active,
  .collection-toolbar button:hover {
    border-color: rgba(231,222,208,0.62);
    background: rgba(231,222,208,0.11);
    box-shadow: 0 0 18px rgba(201,205,211,0.13);
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

  .collection-header,
  .collection-toolbar,
  .sidebar-panel {
    padding: 14px;
  }

  .collection-header h2,
  .sidebar-panel h2,
  .empty-state h2 {
    margin: 0;
    color: #fff;
    font-size: 18px;
    line-height: 22px;
    font-weight: 900;
  }

  .collection-header p {
    margin: 6px 0 0;
  }

  .collection-stats {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
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

  .action-circles button {
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

  .action-circles button:hover {
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
    fill: rgba(52,211,153,0.1);
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

  .trust-panel ul {
    margin: 0;
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
    .collection-shell {
      width: calc(100vw - 32px);
    }

    .collection-layout,
    .seller-hero-stats,
    .collection-stats,
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
  }
`;
