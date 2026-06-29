"use client";

import Image from "next/image";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import Header from "../components/Header";
import {
  type PortfolioCard,
  mockPortfolioCards,
  mockWatchedCards,
} from "../lib/mockData";

type Tab = "Owned" | "Listed" | "Drafts" | "Watched" | "Sold";

type ListingImageRow = {
  image_url: string | null;
  image_type: string | null;
};

type SupabasePortfolioListing = {
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
  estimated_value?: number | null;
  cost_basis?: number | null;
  purchase_price?: number | null;
  is_collection_card?: boolean | null;
  is_public_collection?: boolean | null;
  collection_note?: string | null;
  quantity?: number | null;
  listing_images: ListingImageRow[] | null;
};

type ListingDraft = {
  id: string;
  title: string;
  category: string;
  subject: string;
  year: string;
  brand: string;
  cardNumber: string;
  cardType: "Raw" | "Graded";
  grader: string;
  grade: string;
  condition: string;
  askingPrice: string;
  minimumOffer: string;
  marketValue: string;
  imagePreview: string;
  createdAt: string;
  updatedAt: string;
};

const draftStorageKey = "grail-listing-drafts";
const realListingAccents = ["#334155", "#0f766e", "#1e3a8a", "#7c3aed", "#475569", "#8f1d2c"];

const portfolioListingSelect = `
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
  estimated_value,
  cost_basis,
  purchase_price,
  is_collection_card,
  is_public_collection,
  collection_note,
  quantity,
  listing_images (
    image_url,
    image_type
  )
`;

const basePortfolioListingSelect = `
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
`;

function readDrafts() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedDrafts = window.localStorage.getItem(draftStorageKey);
    return storedDrafts ? (JSON.parse(storedDrafts) as ListingDraft[]) : [];
  } catch (error) {
    console.error("Portfolio draft read error:", error);
    return [];
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatOptionalCurrency(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? formatCurrency(value)
    : "—";
}

function isActiveListing(listing: SupabasePortfolioListing) {
  return listing.status?.toLowerCase() === "active";
}

function getListingImageUrl(listing: SupabasePortfolioListing) {
  return (
    listing.listing_images?.find((image) => image.image_type === "front")
      ?.image_url ||
    listing.listing_images?.[0]?.image_url ||
    null
  );
}

function getListingTitle(listing: SupabasePortfolioListing) {
  return (
    listing.title ||
    [listing.year, listing.brand, listing.player, listing.card_number]
      .filter(Boolean)
      .join(" ") ||
    "Untitled Card"
  );
}

function getListingCategory(listing: SupabasePortfolioListing) {
  const source = `${listing.sport || ""} ${listing.card_type || ""}`.toLowerCase();
  return source.includes("tcg") ? "TCG" : "Sports";
}

function getListingCondition(listing: SupabasePortfolioListing) {
  if (listing.grader && listing.grade) {
    return `${listing.grader} ${listing.grade}`;
  }

  const condition = listing.condition?.trim();

  if (condition) {
    return condition.toLowerCase().includes("raw") ? condition : `Raw ${condition}`;
  }

  return listing.card_type?.toLowerCase() === "graded" ? "Graded" : "Raw";
}

function getListingSubtitle(listing: SupabasePortfolioListing) {
  return `${getListingCategory(listing)}: ${getListingCondition(listing)}`;
}

function getListingValue(listing: SupabasePortfolioListing) {
  return listing.estimated_value ?? listing.price ?? 0;
}

function getListingCostBasis(listing: SupabasePortfolioListing) {
  return listing.cost_basis ?? listing.purchase_price ?? null;
}

function getListingTags(listing: SupabasePortfolioListing) {
  const isGraded =
    Boolean(listing.grader && listing.grade) ||
    listing.card_type?.toLowerCase() === "graded";
  const tags = [isGraded ? "Graded" : "Raw"];

  if (listing.estimated_value && listing.estimated_value >= 1200) {
    tags.push("Grail");
  }

  if (isActiveListing(listing)) {
    tags.push("Listed");
  }

  return tags;
}

function CardArt({ accent }: { accent: string }) {
  return (
    <div className="art-shell">
      <div
        className="card-art"
        style={{
          background: `radial-gradient(circle at 50% 22%, rgba(231,222,208,0.32), transparent 16%), linear-gradient(145deg, ${accent}, #111827 54%, #030304)`,
        }}
      >
        <span />
        <strong />
      </div>
    </div>
  );
}

function ListingArt({
  listing,
  accent,
}: {
  listing: SupabasePortfolioListing;
  accent: string;
}) {
  const imageUrl = getListingImageUrl(listing);

  if (imageUrl) {
    return (
      <div className="art-shell">
        <Image
          className="draft-image"
          src={imageUrl}
          alt={getListingTitle(listing)}
          width={140}
          height={180}
          unoptimized
        />
      </div>
    );
  }

  return <CardArt accent={accent} />;
}

function DraftArt({ draft }: { draft: ListingDraft }) {
  if (draft.imagePreview) {
    return (
      <div className="art-shell">
        <Image
          className="draft-image"
          src={draft.imagePreview}
          alt={draft.title}
          width={140}
          height={180}
          unoptimized
        />
      </div>
    );
  }

  return <CardArt accent={draft.cardType === "Raw" ? "#0f766e" : "#334155"} />;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card panel">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyState({
  title,
  copy,
  actionHref,
  actionLabel,
  secondaryHref,
  secondaryLabel,
}: {
  title: string;
  copy: string;
  actionHref?: string;
  actionLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <section className="list-panel panel">
      <article className="empty-drafts empty-state">
        <h3>{title}</h3>
        <p>{copy}</p>
        <div className="empty-actions">
          {actionHref && actionLabel ? <Link href={actionHref}>{actionLabel}</Link> : null}
          {secondaryHref && secondaryLabel ? (
            <Link href={secondaryHref}>{secondaryLabel}</Link>
          ) : null}
        </div>
      </article>
    </section>
  );
}

export default function PortfolioPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Owned");
  const [status, setStatus] = useState("");
  const [watched, setWatched] = useState(mockWatchedCards);
  const [drafts, setDrafts] = useState<ListingDraft[]>(() => readDrafts());
  const [previewDraft, setPreviewDraft] = useState<ListingDraft | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [realListings, setRealListings] = useState<SupabasePortfolioListing[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(false);
  const [realDataError, setRealDataError] = useState("");

  const ownedCards = mockPortfolioCards.filter((card) => card.status === "Owned");
  const listedCards = mockPortfolioCards.filter((card) => card.status === "Listed");
  const soldCards = mockPortfolioCards.filter((card) => card.status === "Sold");
  const mockCollectionValue = mockPortfolioCards
    .filter((card) => card.status !== "Sold")
    .reduce((sum, card) => sum + card.estimatedValue, 0);
  const mockGrailCount = mockPortfolioCards.filter((card) => card.tags.includes("Grail")).length;
  const isLoggedIn = Boolean(session?.user.id);
  const shouldShowLivePortfolio = isLoggedIn && !realDataError;
  const activeRealListings = realListings.filter(isActiveListing);
  const explicitOwnedRealListings = realListings.filter(
    (listing) => listing.is_collection_card || !isActiveListing(listing),
  );
  const ownedRealListings =
    explicitOwnedRealListings.length > 0 ? explicitOwnedRealListings : realListings;
  const realCollectionValue = realListings.reduce(
    (sum, listing) => sum + getListingValue(listing),
    0,
  );
  const realGrailCount = realListings.filter(
    (listing) => listing.estimated_value && listing.estimated_value >= 1200,
  ).length;
  const collectionValue = shouldShowLivePortfolio ? realCollectionValue : mockCollectionValue;
  const cardsOwnedCount = shouldShowLivePortfolio ? realListings.length : ownedCards.length;
  const listedForSaleCount = shouldShowLivePortfolio
    ? activeRealListings.length
    : listedCards.length;
  const grailCount = shouldShowLivePortfolio ? realGrailCount : mockGrailCount;
  const thirtyDayChange = "+8.4%";

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (isMounted) {
        setSession(currentSession);
        setAuthLoaded(true);
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoaded(true);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!session?.user.id) {
      const clearTimer = window.setTimeout(() => {
        if (isMounted) {
          setRealListings([]);
          setRealDataError("");
          setIsLoadingListings(false);
        }
      }, 0);

      return () => {
        isMounted = false;
        window.clearTimeout(clearTimer);
      };
    }

    async function loadUserListings() {
      await Promise.resolve();

      if (!isMounted || !session?.user.id) {
        return;
      }

      setIsLoadingListings(true);
      setRealDataError("");

      try {
        const primaryResult = await supabase
          .from("listings")
          .select(portfolioListingSelect)
          .eq("seller_id", session.user.id)
          .order("created_at", { ascending: false });
        let data = primaryResult.data as SupabasePortfolioListing[] | null;
        let error = primaryResult.error;

        if (error) {
          console.error("Portfolio extended listing fetch error:", error);

          const fallbackResult = await supabase
            .from("listings")
            .select(basePortfolioListingSelect)
            .eq("seller_id", session.user.id)
            .order("created_at", { ascending: false });

          data = fallbackResult.data as SupabasePortfolioListing[] | null;
          error = fallbackResult.error;
        }

        if (error) {
          throw error;
        }

        if (isMounted) {
          setRealListings(data || []);
        }
      } catch (error) {
        console.error("Portfolio listings error:", error);

        if (isMounted) {
          setRealListings([]);
          setRealDataError("Could not load your live collection. Showing local demo data.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingListings(false);
        }
      }
    }

    loadUserListings();

    return () => {
      isMounted = false;
    };
  }, [session?.user.id]);

  function deleteDraft(draftId: string) {
    const nextDrafts = drafts.filter((draft) => draft.id !== draftId);
    setDrafts(nextDrafts);
    window.localStorage.setItem(draftStorageKey, JSON.stringify(nextDrafts));
    setStatus("Draft deleted.");
  }

  function getDraftSubtitle(draft: ListingDraft) {
    return draft.cardType === "Graded"
      ? `${draft.category}: ${draft.grader} ${draft.grade}`
      : `${draft.category}: ${draft.condition}`;
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const tabCount = useMemo(() => {
    if (activeTab === "Owned") {
      return shouldShowLivePortfolio ? ownedRealListings.length : ownedCards.length;
    }
    if (activeTab === "Listed") {
      return shouldShowLivePortfolio ? activeRealListings.length : listedCards.length;
    }
    if (activeTab === "Drafts") return drafts.length;
    if (activeTab === "Watched") return watched.length;
    return soldCards.length;
  }, [
    activeTab,
    activeRealListings.length,
    drafts.length,
    listedCards.length,
    ownedCards.length,
    ownedRealListings.length,
    shouldShowLivePortfolio,
    soldCards.length,
    watched.length,
  ]);

  function renderOwnedCard(card: PortfolioCard) {
    return (
      <article key={card.id} className="collection-card">
        <CardArt accent={card.accent} />
        <div className="badge-row">
          {card.tags.map((tag) => <span key={tag}>{tag}</span>)}
        </div>
        <h3>{card.title}</h3>
        <p>{card.subtitle}</p>
        <div className="value-grid">
          <span>Market <strong>{formatCurrency(card.estimatedValue)}</strong></span>
          <span>Cost <strong>{formatCurrency(card.costBasis)}</strong></span>
          <span className={card.gainLoss >= 0 ? "positive" : "negative"}>
            Gain/Loss <strong>{card.gainLoss >= 0 ? "+" : ""}{formatCurrency(card.gainLoss)}</strong>
          </span>
        </div>
        <div className="card-actions">
          <Link href={card.route}>View Details</Link>
          <button type="button" onClick={() => setStatus("List for sale flow coming soon.")}>List For Sale</button>
          <button type="button" onClick={() => setStatus("Note added mock-only.")}>Add Note</button>
        </div>
      </article>
    );
  }

  function renderRealOwnedCard(listing: SupabasePortfolioListing, index: number) {
    const title = getListingTitle(listing);
    const value = getListingValue(listing);
    const costBasis = getListingCostBasis(listing);
    const gainLoss = costBasis && value ? value - costBasis : null;

    return (
      <article key={listing.id} className="collection-card">
        <ListingArt
          listing={listing}
          accent={realListingAccents[index % realListingAccents.length]}
        />
        <div className="badge-row">
          {getListingTags(listing).map((tag) => <span key={tag}>{tag}</span>)}
        </div>
        <h3>{title}</h3>
        <p>{getListingSubtitle(listing)}</p>
        <div className="value-grid">
          <span>Market <strong>{formatOptionalCurrency(value)}</strong></span>
          <span>Cost <strong>{formatOptionalCurrency(costBasis)}</strong></span>
          <span className={gainLoss === null || gainLoss >= 0 ? "positive" : "negative"}>
            Gain/Loss <strong>{gainLoss === null ? "—" : `${gainLoss >= 0 ? "+" : ""}${formatCurrency(gainLoss)}`}</strong>
          </span>
          <span>Quantity <strong>{listing.quantity || 1}</strong></span>
        </div>
        <div className="card-actions">
          <Link href={`/cards/${listing.id}`}>View Details</Link>
          <button type="button" onClick={() => setStatus("List for sale flow coming soon.")}>
            List For Sale
          </button>
          <Link href={`/list?edit=${listing.id}`}>Edit Listing</Link>
          <button type="button" onClick={() => setStatus("Note added mock-only.")}>
            Add Note
          </button>
        </div>
      </article>
    );
  }

  function renderRealListedRow(listing: SupabasePortfolioListing, index: number) {
    return (
      <article key={listing.id} className="list-row">
        <ListingArt
          listing={listing}
          accent={realListingAccents[index % realListingAccents.length]}
        />
        <div>
          <h3>{getListingTitle(listing)}</h3>
          <p>{getListingSubtitle(listing)}</p>
        </div>
        <strong>{formatOptionalCurrency(listing.price)}</strong>
        <span>0 watches</span>
        <span>0 views</span>
        <span>Active</span>
        <div className="row-actions">
          <Link href={`/list?edit=${listing.id}`}>Edit Listing</Link>
          <button type="button" onClick={() => setStatus("Unlist mock-only.")}>Unlist</button>
          <Link href={`/cards/${listing.id}`}>View Listing</Link>
        </div>
      </article>
    );
  }

  return (
    <main className="portfolio-page">
      <style>{pageStyles}</style>
      <div className="portfolio-shell">
        <Header />

        <section className="page-heading">
          <span>Collection</span>
          <h1>My Collection</h1>
          <p>Track your owned cards, watched cards, values, and collection performance.</p>
        </section>

        {status ? <p className="status-message">{status}</p> : null}
        {realDataError ? <p className="status-message warning">{realDataError}</p> : null}
        {authLoaded && !isLoggedIn ? (
          <section className="panel auth-panel">
            <div>
              <h2>Sign in to view your collection.</h2>
              <p>Your real GRAIL listings and collection cards appear here after you sign in.</p>
            </div>
            <Link href="/login">Sign In</Link>
          </section>
        ) : null}
        {!authLoaded ? <p className="status-message neutral">Checking account session...</p> : null}

        <section className="stats-grid">
          <StatCard label="Total Collection Value" value={formatCurrency(collectionValue)} />
          <StatCard label="Cards Owned" value={String(cardsOwnedCount)} />
          <StatCard label="30D Change" value={thirtyDayChange} />
          <StatCard label="Grail Cards" value={String(grailCount)} />
          <StatCard label="Watched Cards" value={String(watched.length)} />
          <StatCard label="Listed For Sale" value={String(listedForSaleCount)} />
        </section>

        <section className="portfolio-layout">
          <div className="main-column">
            <section className="panel toolbar">
              <div>
                <h2>{activeTab}</h2>
                <p>{tabCount} cards</p>
              </div>
              <div className="tabs">
                {(["Owned", "Listed", "Drafts", "Watched", "Sold"] as Tab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={activeTab === tab ? "active" : ""}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </section>

            {activeTab === "Owned" ? (
              shouldShowLivePortfolio ? (
                isLoadingListings ? (
                  <EmptyState
                    title="Loading collection..."
                    copy="Fetching your live GRAIL listings."
                  />
                ) : ownedRealListings.length > 0 ? (
                  <section className="card-grid">
                    {ownedRealListings.map(renderRealOwnedCard)}
                  </section>
                ) : (
                  <EmptyState
                    title="No cards in your collection yet."
                    copy="List your first card or browse the marketplace to start building your GRAIL collection."
                    actionHref="/list"
                    actionLabel="List a Card"
                    secondaryHref="/browse"
                    secondaryLabel="Browse Cards"
                  />
                )
              ) : (
                <section className="card-grid">{ownedCards.map(renderOwnedCard)}</section>
              )
            ) : null}

            {activeTab === "Listed" ? (
              shouldShowLivePortfolio ? (
                isLoadingListings ? (
                  <EmptyState
                    title="Loading active listings..."
                    copy="Fetching cards you currently have listed for sale."
                  />
                ) : activeRealListings.length > 0 ? (
                  <section className="list-panel panel">
                    {activeRealListings.map(renderRealListedRow)}
                  </section>
                ) : (
                  <EmptyState
                    title="You have no active listings."
                    copy="Publish a listing from List a Card and it will appear here."
                    actionHref="/list"
                    actionLabel="List a Card"
                  />
                )
              ) : (
                <section className="list-panel panel">
                  {listedCards.map((card) => (
                    <article key={card.id} className="list-row">
                      <CardArt accent={card.accent} />
                      <div>
                        <h3>{card.title}</h3>
                        <p>{card.subtitle}</p>
                      </div>
                      <strong>{formatCurrency(card.price ?? card.estimatedValue)}</strong>
                      <span>{card.watches} watches</span>
                      <span>{card.views} views</span>
                      <div className="row-actions">
                        <button type="button" onClick={() => setStatus("Edit listing mock-only.")}>Edit Listing</button>
                        <Link href={card.route}>View Listing</Link>
                      </div>
                    </article>
                  ))}
                </section>
              )
            ) : null}

            {activeTab === "Drafts" ? (
              drafts.length > 0 ? (
                <section className="card-grid">
                  {drafts.map((draft) => (
                    <article key={draft.id} className="collection-card">
                      <DraftArt draft={draft} />
                      <div className="badge-row">
                        <span>Draft</span>
                        <span>{draft.cardType}</span>
                      </div>
                      <h3>{draft.title || "Untitled Draft"}</h3>
                      <p>{getDraftSubtitle(draft)}</p>
                      <div className="value-grid">
                        <span>Asking <strong>{formatCurrency(Number(draft.askingPrice || 0))}</strong></span>
                        <span>Status <strong>Draft</strong></span>
                        <span>Updated <strong>{formatDate(draft.updatedAt)}</strong></span>
                      </div>
                      <div className="card-actions">
                        <Link href={`/list?draft=${draft.id}`}>Continue Editing</Link>
                        <button type="button" onClick={() => deleteDraft(draft.id)}>Delete Draft</button>
                        <button type="button" onClick={() => setPreviewDraft(draft)}>Preview</button>
                      </div>
                    </article>
                  ))}
                </section>
              ) : (
                <section className="list-panel panel">
                  <article className="empty-drafts">
                    <h3>No drafts saved.</h3>
                    <p>Save a draft from List a Card and it will appear here.</p>
                    <Link href="/list">List a Card</Link>
                  </article>
                </section>
              )
            ) : null}

            {activeTab === "Watched" ? (
              <section className="card-grid">
                {watched.map((card) => (
                  <article key={card.id} className="collection-card">
                    <CardArt accent={card.accent} />
                    <h3>{card.title}</h3>
                    <p>{card.subtitle}</p>
                    <div className="value-grid">
                      <span>Asking <strong>{card.priceDisplay}</strong></span>
                      <span>Market <strong>{formatCurrency(card.marketValue)}</strong></span>
                      <span>{card.watchCount} watching</span>
                    </div>
                    <div className="card-actions">
                      <Link href={card.route}>View Card</Link>
                      <button type="button" onClick={() => setWatched((items) => items.filter((item) => item.id !== card.id))}>Remove Watch</button>
                    </div>
                  </article>
                ))}
              </section>
            ) : null}

            {activeTab === "Sold" ? (
              <section className="list-panel panel">
                {soldCards.map((card) => (
                  <article key={card.id} className="list-row">
                    <CardArt accent={card.accent} />
                    <div>
                      <h3>{card.title}</h3>
                      <p>{card.subtitle}</p>
                    </div>
                    <strong>{formatCurrency(card.salePrice ?? card.estimatedValue)}</strong>
                    <span>{card.soldDate}</span>
                    <span>Buyer: {card.buyer}</span>
                    <Link href={card.route}>View Details</Link>
                  </article>
                ))}
              </section>
            ) : null}
          </div>

          <aside className="sidebar">
            <section className="panel side-card">
              <h2>Collection Allocation</h2>
              {["Sports 62%", "TCG 38%", "Graded 74%", "Raw 26%", "Grails 18%"].map((item) => (
                <div key={item} className="allocation-row"><span>{item}</span><strong /></div>
              ))}
            </section>
            <section className="panel side-card">
              <h2>Collection Value</h2>
              <svg className="mini-chart" viewBox="0 0 260 92" role="img" aria-label="Collection value chart">
                <path d="M8 74 C32 64 42 47 66 53 C92 59 102 32 128 38 C154 44 164 69 188 55 C210 42 222 28 252 20" />
              </svg>
            </section>
            <section className="panel side-card">
              <h2>Recent Activity</h2>
              <p>Watched Emerald Archive Guardian.</p>
              <p>Listed Platinum Rookie Crest.</p>
              <p>Offer sent on Crimson Court Rookie.</p>
            </section>
            <section className="panel side-card quick-actions">
              <h2>Quick Actions</h2>
              <Link href="/list">List a Card</Link>
              <Link href="/browse">Browse Cards</Link>
              <Link href="/collections/vault-runner">View Public Collection</Link>
            </section>
          </aside>
        </section>
      </div>

      {previewDraft ? (
        <div className="draft-modal-backdrop" role="presentation">
          <section
            className="panel draft-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Draft preview"
          >
            <div className="draft-modal-header">
              <div>
                <span>Draft Preview</span>
                <h2>{previewDraft.title || "Untitled Draft"}</h2>
              </div>
              <button
                type="button"
                aria-label="Close draft preview"
                onClick={() => setPreviewDraft(null)}
              >
                x
              </button>
            </div>
            <div className="draft-modal-body">
              <DraftArt draft={previewDraft} />
              <div>
                <div className="badge-row">
                  <span>Draft</span>
                  <span>{previewDraft.cardType}</span>
                </div>
                <h3>{previewDraft.title || "Untitled Draft"}</h3>
                <p>{getDraftSubtitle(previewDraft)}</p>
                <div className="value-grid">
                  <span>Asking <strong>{formatCurrency(Number(previewDraft.askingPrice || 0))}</strong></span>
                  <span>Minimum Offer <strong>{previewDraft.minimumOffer ? formatCurrency(Number(previewDraft.minimumOffer)) : "Not set"}</strong></span>
                  <span>Updated <strong>{formatDate(previewDraft.updatedAt)}</strong></span>
                </div>
                <div className="card-actions modal-actions">
                  <Link href={`/list?draft=${previewDraft.id}`}>Continue Editing</Link>
                  <button type="button" onClick={() => setPreviewDraft(null)}>Close</button>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

const pageStyles = `
  .portfolio-page { min-height: 100vh; background: radial-gradient(circle at 50% -120px, rgba(201,205,211,0.08), transparent 32%), linear-gradient(180deg, #000 0%, #030304 58%, #000 100%); color: #fafafa; font-family: Arial, Helvetica, sans-serif; }
  .portfolio-shell { width: min(1240px, calc(100vw - 32px)); margin: 0 auto; padding: 8px 0 38px; }
  .panel { border: 1px solid #1d1d22; border-radius: 12px; background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.006)), rgba(5,5,6,0.92); box-shadow: 0 18px 44px rgba(0,0,0,0.28); }
  .page-heading { margin-top: 18px; }
  .page-heading span { color: #C9CDD3; font-size: 11px; line-height: 14px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
  .page-heading h1 { margin: 8px 0 0; color: #fff; font-size: 42px; line-height: 46px; font-weight: 900; }
  .page-heading p, .toolbar p, .collection-card p, .list-row p, .side-card p, .status-message { color: #a1a1aa; font-size: 13px; line-height: 18px; font-weight: 800; }
  .status-message { margin: 16px 0 0; border: 1px solid rgba(52,211,153,0.24); border-radius: 10px; background: rgba(52,211,153,0.07); color: #86efac; padding: 10px; font-weight: 900; }
  .status-message.warning { border-color: rgba(251,113,133,0.22); background: rgba(251,113,133,0.07); color: #fda4af; }
  .status-message.neutral { border-color: rgba(201,205,211,0.2); background: rgba(201,205,211,0.055); color: #C9CDD3; }
  .auth-panel { margin-top: 16px; padding: 16px; display: flex; align-items: center; justify-content: space-between; gap: 18px; }
  .auth-panel h2 { margin: 0; color: #fff; font-size: 20px; line-height: 25px; font-weight: 900; }
  .auth-panel p { margin: 6px 0 0; color: #a1a1aa; font-size: 13px; line-height: 18px; font-weight: 800; }
  .auth-panel a, .empty-actions a { min-height: 38px; border: 1px solid rgba(231,222,208,0.36); border-radius: 10px; background: rgba(231,222,208,0.08); color: #fff; padding: 0 13px; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; font-size: 12px; font-weight: 900; white-space: nowrap; }
  .auth-panel a:hover, .empty-actions a:hover { border-color: rgba(231,222,208,0.66); background: rgba(231,222,208,0.14); }
  .stats-grid { margin-top: 16px; display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; }
  .stat-card, .side-card { padding: 14px; }
  .stat-card span, .value-grid span, .list-row span { color: #85858f; font-size: 11px; line-height: 14px; font-weight: 800; }
  .stat-card strong { display: block; margin-top: 8px; color: #fff; font-size: 22px; line-height: 26px; font-weight: 900; }
  .portfolio-layout { margin-top: 18px; display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 16px; align-items: start; }
  .main-column, .sidebar { display: grid; gap: 14px; }
  .toolbar { padding: 14px; display: flex; align-items: center; justify-content: space-between; gap: 14px; }
  h2 { margin: 0; color: #fff; font-size: 20px; line-height: 24px; font-weight: 900; }
  .tabs { display: flex; gap: 8px; flex-wrap: wrap; }
  button, a { font-family: inherit; }
  .tabs button, .card-actions a, .card-actions button, .row-actions a, .row-actions button, .quick-actions a, .list-row > a { min-height: 36px; border: 1px solid rgba(231,222,208,0.28); border-radius: 10px; background: rgba(231,222,208,0.055); color: #fff; padding: 0 10px; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; font-size: 12px; font-weight: 900; cursor: pointer; }
  .tabs button.active, .tabs button:hover, .card-actions a:hover, .card-actions button:hover, .row-actions a:hover, .row-actions button:hover, .quick-actions a:hover { border-color: rgba(231,222,208,0.62); background: rgba(231,222,208,0.11); }
  .card-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
  .collection-card { border: 1px solid #202026; border-radius: 12px; background: #070708; padding: 14px; display: grid; gap: 10px; }
  .art-shell { width: 100%; height: 166px; border: 1px solid rgba(201,205,211,0.14); border-radius: 10px; background: #030304; display: flex; align-items: center; justify-content: center; }
  .draft-image { max-width: 136px; max-height: 148px; width: auto; height: auto; border-radius: 9px; object-fit: contain; box-shadow: 0 18px 34px rgba(0,0,0,0.62); }
  .card-art { width: 92px; height: 128px; border: 1px solid rgba(244,244,245,0.48); border-radius: 8px; position: relative; overflow: hidden; }
  .card-art span { position: absolute; left: 23px; top: 28px; width: 44px; height: 44px; border: 1px solid rgba(255,255,255,0.22); border-radius: 50%; }
  .card-art strong { position: absolute; left: 39px; top: 38px; width: 24px; height: 54px; border-radius: 999px 999px 9px 9px; background: rgba(255,255,255,0.72); }
  .badge-row { display: flex; gap: 7px; flex-wrap: wrap; }
  .badge-row span { border: 1px solid rgba(231,222,208,0.28); border-radius: 999px; color: #E7DED0; padding: 4px 8px; font-size: 10px; font-weight: 900; }
  .collection-card h3, .list-row h3 { margin: 0; color: #fff; font-size: 17px; line-height: 21px; font-weight: 900; }
  .value-grid { display: grid; gap: 6px; }
  .value-grid strong { color: #fff; }
  .positive strong { color: #86efac; }
  .negative strong { color: #fb7185; }
  .card-actions, .row-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .list-panel { padding: 10px; display: grid; gap: 10px; }
  .list-row { border: 1px solid #202026; border-radius: 10px; background: rgba(8,8,10,0.76); padding: 12px; display: grid; grid-template-columns: 86px minmax(160px, 1fr) auto auto auto auto auto; gap: 12px; align-items: center; }
  .list-row .art-shell { width: 74px; height: 96px; }
  .list-row .card-art { width: 54px; height: 76px; }
  .list-row > strong { color: #fff; font-size: 18px; }
  .allocation-row { margin-top: 10px; display: grid; gap: 6px; }
  .allocation-row span { color: #C9CDD3; font-size: 12px; font-weight: 900; }
  .allocation-row strong { height: 8px; border-radius: 999px; background: linear-gradient(90deg, #C9CDD3, #E7DED0); }
  .mini-chart { width: 100%; height: 96px; margin-top: 10px; }
  .mini-chart path { fill: none; stroke: #C9CDD3; stroke-width: 4; stroke-linecap: round; filter: drop-shadow(0 0 8px rgba(201,205,211,0.18)); }
  .quick-actions { display: grid; gap: 10px; }
  .empty-drafts { padding: 18px; }
  .empty-drafts h3 { margin: 0; color: #fff; font-size: 18px; line-height: 22px; font-weight: 900; }
  .empty-drafts p { margin: 8px 0 0; color: #a1a1aa; font-size: 13px; line-height: 18px; font-weight: 800; }
  .empty-actions { margin-top: 12px; display: flex; gap: 10px; flex-wrap: wrap; }
  .empty-drafts a { margin-top: 12px; min-height: 36px; border: 1px solid rgba(231,222,208,0.28); border-radius: 10px; background: rgba(231,222,208,0.055); color: #fff; padding: 0 10px; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; font-size: 12px; font-weight: 900; }
  .empty-actions a { margin-top: 0; }
  .draft-modal-backdrop { position: fixed; inset: 0; z-index: 1200; background: rgba(0,0,0,0.72); display: flex; align-items: center; justify-content: center; padding: 22px; backdrop-filter: blur(12px); }
  .draft-modal { width: min(720px, 100%); padding: 18px; box-sizing: border-box; }
  .draft-modal-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }
  .draft-modal-header span { color: #C9CDD3; font-size: 11px; line-height: 14px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
  .draft-modal-header h2 { margin: 6px 0 0; color: #fff; font-size: 24px; line-height: 29px; font-weight: 900; }
  .draft-modal-header button { width: 34px; height: 34px; border: 1px solid rgba(231,222,208,0.28); border-radius: 999px; background: rgba(231,222,208,0.055); color: #fff; cursor: pointer; font-weight: 900; }
  .draft-modal-body { margin-top: 16px; display: grid; grid-template-columns: 230px 1fr; gap: 18px; align-items: start; }
  .draft-modal-body h3 { margin: 13px 0 0; color: #fff; font-size: 24px; line-height: 29px; font-weight: 900; }
  .modal-actions { margin-top: 14px; }
  @media (max-width: 1100px) { .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .portfolio-layout, .card-grid, .list-row, .draft-modal-body { grid-template-columns: 1fr; } .toolbar { display: grid; } }
  @media (max-width: 640px) { .stats-grid { grid-template-columns: 1fr; } .page-heading h1 { font-size: 34px; line-height: 38px; } }
`;
