"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import Header from "../../components/Header";
import {
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

type PhotoView = (typeof photoViews)[number];
type MockCard = MockListing & {
  imageUrls?: Partial<Record<PhotoView, string>>;
  sellerId?: string | null;
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
const mockOfferStorageKey = "grail-mock-offers";

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
): { card: MockCard; seller: DetailSeller } {
  const category = getCategory(listing);
  const condition = getConditionDisplay(listing);
  const price = Number(listing.price || 0);
  const sellerSlug = getSellerSlug(profile, listing.seller_id);
  const sellerName = profile?.full_name || profile?.username || "GRAIL Seller";
  const isGraded = Boolean(listing.grader && listing.grade) ||
    listing.card_type?.toLowerCase() === "graded";
  const tag = isGraded ? "Graded" : "Raw";
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
      price,
      priceDisplay: price ? formatCurrency(price) : "Price not listed",
      askingPrice: price,
      marketValue: 0,
      minimumOffer: price ? Math.round(price * 0.85) : 0,
      minOffer: price ? Math.round(price * 0.85) : 0,
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
  const isRaw = card.tag === "Raw";
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
  const cardId = String(params.id || "");
  const mockCard = getMockListingById(cardId) as MockCard | undefined;
  const [realCard, setRealCard] = useState<MockCard | null>(null);
  const [realSeller, setRealSeller] = useState<DetailSeller | null>(null);
  const [isLoadingRealCard, setIsLoadingRealCard] = useState(!mockCard);
  const [currentUserId, setCurrentUserId] = useState("");
  const [selectedPhoto, setSelectedPhoto] =
    useState<PhotoView>("Front");
  const [isWatching, setIsWatching] = useState(false);
  const [isOfferOpen, setIsOfferOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [offerError, setOfferError] = useState("");
  const [sentOfferAmount, setSentOfferAmount] = useState<number | null>(null);
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const card = mockCard ?? realCard;
  const availablePhotoViews: PhotoView[] = card?.imageUrls
    ? photoViews.filter((view) => Boolean(card.imageUrls?.[view]))
    : [...photoViews];
  const visiblePhotoViews: PhotoView[] =
    availablePhotoViews.length > 0 ? availablePhotoViews : ["Front"];
  const activePhoto = visiblePhotoViews.includes(selectedPhoto)
    ? selectedPhoto
    : visiblePhotoViews[0];

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
          .eq("id", cardId)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data) {
          if (isMounted) {
            setRealCard(null);
            setRealSeller(null);
          }
          return;
        }

        const listing = data as SupabaseListingRow;
        let profile: ProfileRow | null = null;

        if (listing.seller_id) {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("id, full_name, username")
            .eq("id", listing.seller_id)
            .maybeSingle();

          if (profileError) {
            console.error("Card detail profile fetch error:", profileError);
          } else {
            profile = profileData as ProfileRow | null;
          }
        }

        const mapped = mapSupabaseCard(listing, profile);

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
      saveLocalMockOffer({
        id: `mock-offer-${Date.now()}`,
        listing_id: card.id,
        cardTitle: card.title,
        buyerName: "You",
        sellerName: card.seller,
        amount,
        askingPrice: card.askingPrice || card.price || 0,
        message: offerMessage.trim(),
        status: "pending",
        createdAt: new Date().toISOString(),
        cardRoute: card.href,
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

    if (card.sellerId === session.user.id) {
      setOfferError("You cannot make an offer on your own listing.");
      setSentOfferAmount(null);
      return;
    }

    if (!card.sellerId) {
      console.warn("Supabase offers table not available; using mock offer flow.", {
        reason: "Missing seller_id on listing.",
        listingId: card.id,
      });
      setOfferError("");
      setSentOfferAmount(amount);
      return;
    }

    setIsSubmittingOffer(true);
    setOfferError("");

    try {
      const { error } = await supabase.from("offers").insert({
        listing_id: card.id,
        buyer_id: session.user.id,
        seller_id: card.sellerId,
        amount,
        message: offerMessage.trim() || null,
        status: "pending",
      });

      if (error) {
        throw error;
      }

      setSentOfferAmount(amount);
    } catch (error) {
      console.error("Card detail offer insert error:", error);
      console.warn("Supabase offers table not available; using mock offer flow.", error);
      setOfferError("Offer could not be sent.");
      setSentOfferAmount(null);
    } finally {
      setIsSubmittingOffer(false);
    }
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

  return (
    <main className="detail-page">
      <style>{pageStyles}</style>
      <div className="detail-shell">
        <Header />

        <div className="top-link-row">
          <Link href="/browse">← Back to Browse</Link>
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
                  title="Watch card"
                  onClick={() => setIsWatching((current) => !current)}
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
                <DetailRow label="Asking Price" value={formatCurrency(card.askingPrice)} />
                <DetailRow label="Watch Count" value={String(card.watchCount)} />
                <DetailRow label="View Count" value={String(card.viewCount)} />
                <DetailRow label="Listed Date" value={card.listedDate} />
                <DetailRow label="Listing Tag" value={card.tag} />
              </div>
            </section>
          </div>

          <aside className="right-column">
            <section className="purchase-panel panel">
              <span>Asking Price</span>
              <strong>{formatCurrency(card.askingPrice)}</strong>
              <p>
                Market value {formatCurrency(card.marketValue)} ·{" "}
                <em>{marketDifference}</em>
              </p>
              <p className="market-data-note">
                Market data integration planned: Card Ladder / Sports Card
                Investor style price tracking.
              </p>

              {isOwnerListing ? (
                <>
                  <p className="owner-note">This is your listing.</p>
                  <div className="purchase-buttons">
                    <Link className="buy-button" href={`/edit-listing/${card.id}`}>
                      Edit Listing
                    </Link>
                    <Link href="/seller-dashboard">
                      View in Seller Dashboard
                    </Link>
                    <Link href={`/cards/${card.id}`}>
                      View Public Listing
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <div className="purchase-buttons">
                    <Link className="buy-button" href={`/checkout/${card.id}`}>
                      Buy Now
                    </Link>
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
                    <Link href="/messages">
                      Message Seller
                    </Link>
                  </div>

                  <p className="offer-note">
                    Minimum offer: {formatCurrency(card.minOffer)}
                  </p>
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
                <li>Secure checkout</li>
                <li>Offers protected</li>
                <li>Seller verified</li>
                <li>Buyer protection placeholder</li>
              </ul>
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
              <DetailRow label="Asking Price" value={formatCurrency(card.askingPrice)} />
              <DetailRow label="Market Value" value={formatCurrency(card.marketValue)} />
              <DetailRow label="Minimum Offer" value={formatCurrency(card.minOffer)} />
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

  .top-link-row a,
  .not-found a,
  .seller-link {
    color: #E7DED0;
    font-size: 13px;
    font-weight: 900;
    text-decoration: none;
  }

  .top-link-row a:hover,
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

  .purchase-buttons {
    margin-top: 16px;
    display: grid;
    gap: 10px;
  }

  .purchase-buttons button,
  .purchase-buttons a,
  .offer-modal-actions button {
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

  .purchase-buttons button:hover,
  .purchase-buttons a:hover,
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

  .offer-modal-actions .buy-button {
    background: #E7DED0;
    color: #111;
  }

  .offer-note {
    margin: 13px 0 0;
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
