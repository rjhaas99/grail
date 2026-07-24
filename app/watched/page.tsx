"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import Header from "../components/Header";
import {
  formatSavedCurrency,
  type SavedCollectionItem,
  type SavedListingItem,
} from "../lib/savedItems";

type SavedItemsResponse = {
  items?: SavedListingItem[];
  error?: string;
};

type SavedCollectionsResponse = {
  items?: SavedCollectionItem[];
  error?: string;
};

type WatchFilter = "All" | "Active" | "Auctions" | "Sold" | "Below Market";
type WatchSection = "cards" | "collections";

const filters: WatchFilter[] = ["All", "Active", "Auctions", "Sold", "Below Market"];

function formatDate(value?: string | null) {
  if (!value) {
    return "Recently";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeRemaining(value?: string | null) {
  if (!value) {
    return "Ending time pending";
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

function isBelowMarket(item: SavedListingItem) {
  return item.marketValue > 0 && item.price > 0 && item.price < item.marketValue;
}

function getFilterMatch(item: SavedListingItem, filter: WatchFilter) {
  if (filter === "Active") return item.status === "Active";
  if (filter === "Auctions") return item.isAuction;
  if (filter === "Sold") return item.status === "Sold";
  if (filter === "Below Market") return isBelowMarket(item);
  return true;
}

function CardArtwork({ item }: { item: SavedListingItem }) {
  return (
    <div className="art-shell">
      {item.imageUrl ? (
        <Image
          src={item.imageUrl}
          alt={item.title}
          width={140}
          height={196}
          className="card-image"
          sizes="140px"
          unoptimized
        />
      ) : (
        <div className="card-art" aria-hidden="true">
          <span />
          <strong />
        </div>
      )}
    </div>
  );
}

export default function WatchedCardsPage() {
  const [items, setItems] = useState<SavedListingItem[]>([]);
  const [collectionItems, setCollectionItems] = useState<SavedCollectionItem[]>([]);
  const [activeSection, setActiveSection] = useState<WatchSection>("cards");
  const [activeFilter, setActiveFilter] = useState<WatchFilter>("All");
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [removingListingId, setRemovingListingId] = useState("");
  const [removingCollectionOwnerId, setRemovingCollectionOwnerId] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadSavedItems() {
      setIsLoading(true);
      setNotice("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        if (isMounted) {
          setItems([]);
          setCollectionItems([]);
          setNotice("Sign in to view your saved marketplace cards.");
          setIsLoading(false);
        }
        return;
      }

      try {
        const [listingResponse, collectionResponse] = await Promise.all([
          fetch("/api/saved-items?itemType=listing", {
            cache: "no-store",
            headers: {
              authorization: `Bearer ${session.access_token}`,
            },
          }),
          fetch("/api/saved-items?itemType=collection", {
            cache: "no-store",
            headers: {
              authorization: `Bearer ${session.access_token}`,
            },
          }),
        ]);
        const listingPayload = (await listingResponse.json()) as SavedItemsResponse;
        const collectionPayload = (await collectionResponse.json()) as SavedCollectionsResponse;

        if (!listingResponse.ok) {
          throw new Error(listingPayload.error || "Watched cards could not be loaded.");
        }

        if (!collectionResponse.ok) {
          throw new Error(collectionPayload.error || "Followed collections could not be loaded.");
        }

        if (isMounted) {
          setItems(listingPayload.items || []);
          setCollectionItems(collectionPayload.items || []);
          setNotice("");
        }
      } catch (error) {
        console.error("Watched cards load error:", error);

        if (isMounted) {
          setItems([]);
          setCollectionItems([]);
          setNotice(error instanceof Error ? error.message : "Watched cards could not be loaded.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSavedItems();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadSavedItems();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const visibleItems = useMemo(
    () => items.filter((item) => getFilterMatch(item, activeFilter)),
    [activeFilter, items],
  );
  const belowMarketCount = items.filter(isBelowMarket).length;
  const activeAuctionCount = items.filter((item) => item.status === "Auction Live" || item.status === "Auction Ending Soon").length;

  async function removeSavedItem(item: SavedListingItem) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setNotice("Sign in to remove watched cards.");
      return;
    }

    setRemovingListingId(item.listingId);
    setNotice("");

    try {
      const response = await fetch(
        `/api/saved-items?listingId=${encodeURIComponent(item.listingId)}`,
        {
          method: "DELETE",
          headers: {
            authorization: `Bearer ${session.access_token}`,
          },
        },
      );
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Watched card could not be removed.");
      }

      setItems((current) => current.filter((savedItem) => savedItem.listingId !== item.listingId));
    } catch (error) {
      console.error("Watched card remove error:", error);
      setNotice(error instanceof Error ? error.message : "Watched card could not be removed.");
    } finally {
      setRemovingListingId("");
    }
  }

  async function removeFollowedCollection(item: SavedCollectionItem) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setNotice("Sign in to remove followed collections.");
      return;
    }

    setRemovingCollectionOwnerId(item.collectionOwnerId);
    setNotice("");

    try {
      const response = await fetch(
        `/api/saved-items?itemType=collection&collectionOwnerId=${encodeURIComponent(
          item.collectionOwnerId,
        )}`,
        {
          method: "DELETE",
          headers: {
            authorization: `Bearer ${session.access_token}`,
          },
        },
      );
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Collection follow could not be removed.");
      }

      setCollectionItems((current) =>
        current.filter(
          (savedItem) => savedItem.collectionOwnerId !== item.collectionOwnerId,
        ),
      );
    } catch (error) {
      console.error("Followed collection remove error:", error);
      setNotice(
        error instanceof Error
          ? error.message
          : "Collection follow could not be removed.",
      );
    } finally {
      setRemovingCollectionOwnerId("");
    }
  }

  return (
    <main className="watched-page">
      <style>{pageStyles}</style>
      <div className="watched-shell">
        <Header />

        <section className="page-heading">
          <span>Saved Marketplace</span>
          <h1>Watched Cards</h1>
          <p>Track real listings and followed collections from one marketplace watchlist.</p>
        </section>

        <section className="watch-section-tabs panel" aria-label="Watchlist sections">
          <button
            type="button"
            className={activeSection === "cards" ? "active" : ""}
            onClick={() => setActiveSection("cards")}
          >
            Watched Cards
          </button>
          <button
            type="button"
            className={activeSection === "collections" ? "active" : ""}
            onClick={() => setActiveSection("collections")}
          >
            Followed Collections
          </button>
        </section>

        <section className="stats-grid">
          <div className="panel stat-card"><span>Watched Cards</span><strong>{items.length}</strong></div>
          <div className="panel stat-card"><span>Followed Collections</span><strong>{collectionItems.length}</strong></div>
          <div className="panel stat-card"><span>Below Market</span><strong>{belowMarketCount}</strong></div>
          <div className="panel stat-card"><span>Live Auctions</span><strong>{activeAuctionCount}</strong></div>
        </section>

        {activeSection === "cards" ? (
          <section className="toolbar panel" aria-label="Watched card filters">
            {filters.map((filter) => (
              <button
                key={filter}
                type="button"
                className={activeFilter === filter ? "active" : ""}
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </section>
        ) : null}

        {notice ? <p className="notice">{notice}</p> : null}

        {isLoading ? (
          <section className="empty-state panel">
            <h2>Loading watched cards.</h2>
            <p>Checking your saved marketplace cards.</p>
          </section>
        ) : activeSection === "collections" ? (
          collectionItems.length > 0 ? (
            <section className="collection-watch-grid">
              {collectionItems.map((item) => (
                <article key={item.id} className="collection-watch-card panel">
                  <div>
                    <span>Followed Collection</span>
                    <h2>{item.collectionTitle}</h2>
                    <p>{item.collectorName}</p>
                  </div>
                  <div className="metric-grid collection-metrics">
                    <span>Cards <strong>{item.cardCount}</strong></span>
                    <span>Value <strong>{formatSavedCurrency(item.collectionValue)}</strong></span>
                    <span>Latest <strong>{formatDate(item.latestAddedAt)}</strong></span>
                    <span>Followed <strong>{formatDate(item.savedAt)}</strong></span>
                  </div>
                  <div className="card-actions">
                    <Link href={item.route}>View Collection</Link>
                    <button
                      type="button"
                      onClick={() => removeFollowedCollection(item)}
                      disabled={removingCollectionOwnerId === item.collectionOwnerId}
                    >
                      {removingCollectionOwnerId === item.collectionOwnerId
                        ? "Removing..."
                        : "Remove Follow"}
                    </button>
                  </div>
                </article>
              ))}
            </section>
          ) : (
            <section className="empty-state panel">
              <h2>No followed collections yet.</h2>
              <p>Follow public collections to track collector showcases alongside watched cards.</p>
              <Link href="/browse">Browse Cards</Link>
            </section>
          )
        ) : visibleItems.length > 0 ? (
          <section className="watch-grid">
            {visibleItems.map((item) => (
              <article key={item.id} className="watch-card panel">
                <Link href={item.route} className="art-link" aria-label={`View ${item.title}`}>
                  <CardArtwork item={item} />
                </Link>
                <div className="watch-content">
                  <div className="tag-row">
                    <span className={`tag tag-${item.statusTone}`}>{item.status}</span>
                    {isBelowMarket(item) ? <span className="tag tag-value">Below Market</span> : null}
                  </div>
                  <h2>{item.title}</h2>
                  <p>{item.subtitle || "Live GRAIL marketplace listing"}</p>
                  <div className="metric-grid">
                    <span>Price <strong>{item.priceDisplay}</strong></span>
                    <span>Market <strong>{item.marketValue ? formatSavedCurrency(item.marketValue) : "Pending"}</strong></span>
                    <span>Watching <strong>{item.watchCount}</strong></span>
                    <span>Saved <strong>{formatDate(item.savedAt)}</strong></span>
                    <span>
                      Seller{" "}
                      <strong>
                        <Link href={item.sellerHref}>{item.sellerName}</Link>
                      </strong>
                    </span>
                    <span>
                      {item.isAuction ? "Auction" : "Listing"}
                      <strong>{item.isAuction ? formatTimeRemaining(item.auctionEndsAt) : item.status}</strong>
                    </span>
                  </div>
                  <div className="card-actions">
                    <Link href={item.route}>View Card</Link>
                    {item.isBuyable ? <Link href={`/checkout/${item.listingId}`}>Purchase</Link> : null}
                    {item.isBiddable ? <Link href={item.route}>Bid</Link> : null}
                    <button
                      type="button"
                      onClick={() => removeSavedItem(item)}
                      disabled={removingListingId === item.listingId}
                    >
                      {removingListingId === item.listingId ? "Removing..." : "Remove Watch"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="empty-state panel">
            <h2>No watched cards found.</h2>
            <p>
              {items.length > 0
                ? "Try a different filter."
                : "Save cards from their listing pages to build your watched marketplace."}
            </p>
            <Link href="/browse">Browse Cards</Link>
          </section>
        )}
      </div>
    </main>
  );
}

const pageStyles = `
  .watched-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at 50% -120px, rgba(201,205,211,0.08), transparent 32%),
      linear-gradient(180deg, #000 0%, #030304 58%, #000 100%);
    color: #fafafa;
    font-family: Arial, Helvetica, sans-serif;
  }
  .watched-shell { width: 1240px; margin: 0 auto; padding: 8px 0 38px; }
  .panel {
    border: 1px solid #1d1d22;
    border-radius: 12px;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.006)),
      rgba(5,5,6,0.92);
    box-shadow: 0 18px 44px rgba(0,0,0,0.28);
  }
  .page-heading { margin-top: 18px; max-width: 740px; }
  .page-heading span, .stat-card span {
    color: #C9CDD3;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .page-heading h1 { margin: 8px 0 0; color: #fff; font-size: 42px; line-height: 46px; font-weight: 900; }
  .page-heading p, .watch-card p, .empty-state p, .notice {
    color: #a1a1aa;
    font-size: 13px;
    line-height: 18px;
    font-weight: 800;
  }
  .watch-section-tabs {
    margin-top: 18px;
    padding: 10px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .watch-section-tabs button {
    min-height: 38px;
    border: 1px solid rgba(231,222,208,0.28);
    border-radius: 10px;
    background: rgba(231,222,208,0.055);
    color: #fff;
    padding: 0 14px;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
  }
  .watch-section-tabs button.active,
  .watch-section-tabs button:hover {
    border-color: rgba(212,175,55,0.62);
    background: rgba(212,175,55,0.10);
  }
  .stats-grid { margin-top: 12px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
  .stat-card { padding: 14px; }
  .stat-card strong { display: block; margin-top: 8px; color: #fff; font-size: 24px; line-height: 28px; font-weight: 900; }
  .toolbar { margin-top: 16px; padding: 10px; display: flex; gap: 8px; flex-wrap: wrap; }
  .notice {
    margin: 14px 0 0;
    border: 1px solid rgba(201,205,211,0.16);
    border-radius: 10px;
    background: rgba(201,205,211,0.045);
    padding: 10px 12px;
  }
  button, a { font-family: inherit; }
  .toolbar button, .card-actions a, .card-actions button, .empty-state a {
    min-height: 36px;
    border: 1px solid rgba(231,222,208,0.28);
    border-radius: 10px;
    background: rgba(231,222,208,0.055);
    color: #fff;
    padding: 0 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
  }
  .card-actions button:disabled {
    cursor: not-allowed;
    opacity: 0.58;
  }
  .toolbar button.active, .toolbar button:hover, .card-actions a:hover, .card-actions button:not(:disabled):hover, .empty-state a:hover {
    border-color: rgba(231,222,208,0.62);
    background: rgba(231,222,208,0.11);
  }
  .watch-grid { margin-top: 16px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
  .collection-watch-grid { margin-top: 16px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
  .watch-card { padding: 14px; display: grid; grid-template-columns: 150px 1fr; gap: 14px; }
  .collection-watch-card { padding: 16px; display: grid; gap: 14px; }
  .collection-watch-card > div:first-child > span {
    color: #C9CDD3;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .art-link { color: inherit; text-decoration: none; display: block; }
  .art-shell {
    width: 140px;
    height: 184px;
    border: 1px solid rgba(201,205,211,0.14);
    border-radius: 10px;
    background: #030304;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .card-image {
    width: auto;
    height: auto;
    max-width: calc(100% - 16px);
    max-height: calc(100% - 16px);
    object-fit: contain;
    border-radius: 8px;
    box-shadow: 0 16px 28px rgba(0,0,0,0.58);
  }
  .card-art {
    width: 94px;
    height: 132px;
    border: 1px solid rgba(244,244,245,0.48);
    border-radius: 8px;
    position: relative;
    overflow: hidden;
    background:
      radial-gradient(circle at 50% 22%, rgba(231,222,208,0.32), transparent 16%),
      linear-gradient(145deg, #334155, #111827 54%, #030304);
  }
  .card-art span { position: absolute; left: 24px; top: 29px; width: 46px; height: 46px; border: 1px solid rgba(255,255,255,0.22); border-radius: 50%; }
  .card-art strong { position: absolute; left: 40px; top: 40px; width: 24px; height: 56px; border-radius: 999px 999px 9px 9px; background: rgba(255,255,255,0.72); }
  .watch-content { min-width: 0; }
  .tag-row { display: flex; gap: 7px; flex-wrap: wrap; align-items: center; }
  .tag { border: 1px solid rgba(231,222,208,0.28); border-radius: 999px; color: #E7DED0; padding: 4px 8px; font-size: 10px; font-weight: 900; }
  .tag-auction, .tag-value { border-color: rgba(231,222,208,0.52); color: #fff; box-shadow: 0 0 16px rgba(201,205,211,0.12); }
  .tag-active { color: #f4f4f5; }
  .tag-sold, .tag-unavailable { color: #a1a1aa; }
  .tag-pending { color: #E7DED0; }
  h2 { margin: 10px 0 0; color: #fff; font-size: 20px; line-height: 24px; font-weight: 900; }
  .metric-grid { margin: 12px 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  .metric-grid span { color: #85858f; font-size: 11px; line-height: 15px; font-weight: 800; }
  .metric-grid strong { display: block; margin-top: 4px; color: #fff; font-size: 13px; line-height: 16px; overflow-wrap: anywhere; }
  .metric-grid strong a { color: inherit; text-decoration: none; }
  .metric-grid strong a:hover { text-decoration: underline; text-underline-offset: 3px; }
  .card-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .empty-state {
    margin-top: 16px;
    min-height: 220px;
    display: grid;
    place-items: center;
    text-align: center;
    padding: 20px;
  }
  .empty-state h2 { margin: 0; }
  .empty-state a { margin-top: 10px; }
  @media (max-width: 1100px) {
    .watched-shell { width: calc(100vw - 32px); }
    .stats-grid, .watch-grid, .collection-watch-grid, .watch-card, .metric-grid { grid-template-columns: 1fr; }
    .art-shell { width: 100%; height: 220px; }
  }
`;
