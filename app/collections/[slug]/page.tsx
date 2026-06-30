"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import Header from "../../components/Header";
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

type ListingImageRow = {
  image_url: string | null;
  image_type: string | null;
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
const mockOfferStorageKey = "grail-mock-offers";

const filterModes: FilterMode[] = ["All", "Grail", "Hot", "Graded", "Raw"];

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

export default function SellerCollectionPage() {
  const params = useParams();
  const slug = String(params.slug || "");
  const decodedSlug = decodeURIComponent(slug);
  const mockSeller = sellers.find((item) => item.slug === slug);
  const [realSeller, setRealSeller] = useState<MockSeller | null>(null);
  const [realListings, setRealListings] = useState<Listing[]>([]);
  const [isLoadingRealSeller, setIsLoadingRealSeller] = useState(!mockSeller);
  const [filterMode, setFilterMode] = useState<FilterMode>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
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
  const seller = mockSeller ?? realSeller;
  const allListings = useMemo(() => {
    if (mockSeller) {
      return buildSellerListings(mockSeller);
    }

    return realListings;
  }, [mockSeller, realListings]);

  useEffect(() => {
    let isMounted = true;

    async function loadRealSeller() {
      if (mockSeller || !decodedSlug) {
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
              status !== "deleted")
          );
        });
        const mappedSeller = buildRealSeller(profile, rows);
        const mappedListings = rows.map((listing, index) =>
          mapSupabaseListing(listing, mappedSeller, index, rows.length),
        );

        if (isMounted) {
          setRealSeller(mappedSeller);
          setRealListings(mappedListings);
        }
      } catch (error) {
        console.error("Collection seller fetch error:", error);

        if (isMounted) {
          setRealSeller(null);
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

  const totalValue = allListings.reduce(
    (sum, listing) => sum + (listing.marketValue || listing.price),
    0,
  );
  const totalPrice = allListings.reduce((sum, listing) => sum + listing.price, 0);
  const averagePrice =
    allListings.length > 0 ? Math.round(totalPrice / allListings.length) : 0;
  const highestValueCard = allListings.length > 0
    ? allListings.reduce((highest, listing) =>
        (listing.marketValue || listing.price) >
        (highest.marketValue || highest.price)
          ? listing
          : highest,
      )
    : null;
  const grailCount = allListings.filter((listing) => listing.tag === "Grail").length;
  const hotCount = allListings.filter((listing) => listing.tag === "Hot").length;

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
      setOfferError("Offer could not be sent.");
      setSentOfferAmount(null);
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
      console.error("Collection offer insert error:", error);
      setOfferError("Offer could not be sent.");
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
            <Metric label="Public Cards" value={String(allListings.length)} />
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
                <p>Browse public cards from this seller.</p>
              </div>
              <div className="collection-stats">
                <Metric label="Public Cards" value={String(allListings.length)} />
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
                <Metric
                  label="Highest Value Card"
                  value={highestValueCard?.title ?? "No public cards"}
                />
                <Metric label="Grail Cards" value={String(grailCount)} />
                <Metric label="Hot Cards" value={String(hotCount)} />
                <Metric label="Avg Card Value" value={formatCurrency(averagePrice)} />
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
  .listing-actions button,
  .listing-actions a {
    border: 1px solid rgba(231,222,208,0.28);
    background: rgba(231,222,208,0.055);
    color: #fff;
    cursor: pointer;
    font-weight: 900;
    text-decoration: none;
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
