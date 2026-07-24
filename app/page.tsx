"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import Header from "./components/Header";
import HeroShowcaseSlab from "./components/HeroShowcaseSlab";
import { getPublicCollectorSlug } from "./lib/publicCollectorLinks";
import { supabase } from "../lib/supabase";

type HeroCardData = {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  condition: string;
  price: string;
  type: "slab" | "raw";
  accent: string;
  secondary: string;
  imageUrl: string | null;
  featuredLabel: string;
};

type ListingImageRow = {
  image_url: string | null;
  image_type: string | null;
};

type HomeListingRow = {
  id: string;
  seller_id: string | null;
  title: string | null;
  sport: string | null;
  player?: string | null;
  player_name?: string | null;
  year?: string | null;
  brand?: string | null;
  card_number?: string | null;
  card_type?: string | null;
  grader?: string | null;
  grade?: string | null;
  condition?: string | null;
  price: number | null;
  status: string | null;
  is_collection_card?: boolean | null;
  is_public_collection?: boolean | null;
  homepage_featured?: boolean | null;
  homepage_featured_order?: number | null;
  homepage_featured_at?: string | null;
  homepage_featured_until?: string | null;
  created_at: string | null;
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

type LiveCollection = {
  sellerId: string;
  name: string;
  initials: string;
  route: string;
  listingCount: number;
  collectionValue: number;
  latestListedAt: string | null;
  imageUrl: string | null;
  categoryLabel: string;
};

type MarketSnapshot = {
  activeListings: number;
  newThisWeek: number;
  averageListPrice: number;
  completedSales: number | null;
  marketplaceVolume: number | null;
};

type HomepageBanner = {
  id: string;
  bannerType: string;
  headline: string;
  supportingText: string;
  imageUrl: string | null;
  primaryButtonLabel: string;
  primaryButtonHref: string;
  isVisible: boolean;
  startAt: string | null;
  endAt: string | null;
};

type HomepageBannerResponse = {
  banner?: HomepageBanner | null;
};

const featuredAccentPairs = [
  { accent: "#E7DED0", secondary: "#ffffff" },
  { accent: "#C9CDD3", secondary: "#f3f4f6" },
  { accent: "#B7A682", secondary: "#E7DED0" },
  { accent: "#f5f5f5", secondary: "#C9CDD3" },
  { accent: "#8D949D", secondary: "#E7DED0" },
];

const featuredCardLimit = 5;

const marketCategories = [
  {
    title: "Sports Cards",
    href: "/browse",
    subtitle: "Rare slabs, rookies, and vault-grade singles.",
    accent: "#C9CDD3",
  },
  {
    title: "TCG Cards",
    href: "/browse",
    subtitle: "Premium character cards and chase singles.",
    accent: "#9EA4AE",
  },
  {
    title: "GRAIL Market Snapshot",
    href: "#grail-market-snapshot",
    subtitle: "Live activity from cards listed and sold on GRAIL.",
    accent: "#E7DED0",
  },
  {
    title: "Seller Collections",
    href: "/collections",
    subtitle: "Browse curated collections from trusted sellers.",
    accent: "#8D949D",
  },
];

const trustCards = [
  {
    title: "Protected Checkout",
    href: "/buyer-protection",
    body: "Payments are held until delivery and the inspection window clears.",
    badge: "Stripe checkout",
  },
  {
    title: "Real Photos Required",
    href: "/seller-rules",
    body: "Listings are built around actual front and back card photos.",
    badge: "Listing rules",
  },
  {
    title: "Dispute Support",
    href: "/refund-dispute-policy",
    body: "If something is wrong, buyers and sellers can submit evidence for review.",
    badge: "Evidence review",
  },
];

const carouselSlots = {
  left: {
    x: -252,
    translateX: -48,
    translateY: 98,
    scale: 0.84,
    opacity: 0.92,
    zIndex: 20,
    rotateY: 8,
    width: 235,
    height: 280,
  },
  center: {
    x: 0,
    translateX: 0,
    translateY: -20,
    scale: 1,
    opacity: 1,
    zIndex: 30,
    rotateY: 0,
    width: 295,
    height: 353,
  },
  right: {
    x: 252,
    translateX: 48,
    translateY: 98,
    scale: 0.84,
    opacity: 0.92,
    zIndex: 20,
    rotateY: -8,
    width: 235,
    height: 280,
  },
};

type CarouselVariant = "center" | "side" | "back";

type HeroVisibleCard = {
  card: HeroCardData;
  slot: (typeof carouselSlots)[keyof typeof carouselSlots];
  slotName: keyof typeof carouselSlots;
  variant: CarouselVariant;
};

function getVisibleHeroCards(cards: HeroCardData[], activeIndex: number): HeroVisibleCard[] {
  if (cards.length === 0) return [];

  const activeCard = cards[activeIndex] || cards[0];

  return [
    {
      card: cards[(activeIndex - 1 + cards.length) % cards.length],
      slot: carouselSlots.left,
      slotName: "left",
      variant: "side",
    },
    {
      card: activeCard,
      slot: carouselSlots.center,
      slotName: "center",
      variant: "center",
    },
    {
      card: cards[(activeIndex + 1) % cards.length],
      slot: carouselSlots.right,
      slotName: "right",
      variant: "side",
    },
  ];
}

function CuratorArtwork({
  card,
  variant,
}: {
  card: HeroCardData;
  variant: CarouselVariant;
}) {
  const isCenter = variant === "center";
  const artWidth = isCenter ? "295px" : "235px";
  const artHeight = isCenter ? "353px" : "280px";

  return (
    <HeroShowcaseSlab
      imageUrl={card.imageUrl}
      title={card.title}
      width={artWidth}
      height={artHeight}
      prominence={isCenter ? "center" : "side"}
    />
  );
}

function CuratorCollectible({
  card,
  variant,
}: {
  card: HeroCardData;
  variant: CarouselVariant;
}) {
  const isCenter = variant === "center";
  const collectibleWidth = isCenter ? "295px" : "235px";
  const collectibleHeight = isCenter ? "353px" : "280px";

  return (
    <div
      className={`hero-v4-collectible hero-v4-collectible-${variant}`}
      style={{
        width: collectibleWidth,
        height: collectibleHeight,
        position: "absolute",
        left: "50%",
        top: 0,
        transform: "translateX(-50%)",
        display: "grid",
        placeItems: "center",
      }}
    >
      <div className="hero-v4-artwork-wrap" style={{ position: "relative", zIndex: 2 }}>
        <CuratorArtwork card={card} variant={variant} />
      </div>
    </div>
  );
}

function HeroCardCaption({ card, variant }: { card: HeroCardData; variant: CarouselVariant }) {
  const isCenter = variant === "center";

  return (
    <div className={`hero-v4-card-caption hero-v4-card-caption-${variant}`}>
      <p
        style={{
          margin: 0,
          color: "#D4AF37",
          fontSize: "14px",
          lineHeight: "17px",
          fontWeight: 900,
          letterSpacing: ".24em",
          textTransform: "uppercase",
        }}
      >
        FEATURED CARD
      </p>
      <h2
        style={{
          maxWidth: isCenter ? "295px" : "235px",
          margin: "0",
          color: "rgba(255,255,255,0.95)",
          fontSize: "18px",
          lineHeight: "22px",
          fontWeight: 600,
          letterSpacing: "-0.01em",
          display: "-webkit-box",
          overflow: "hidden",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: 2,
        }}
      >
        {card.title}
      </h2>
      <p
        style={{
          margin: 0,
          color: "rgba(231,222,208,0.94)",
          fontSize: "22px",
          lineHeight: "26px",
          fontWeight: 700,
        }}
      >
        {card.price}
      </p>
      <span
        className="hero-v4-view-listing"
        aria-hidden="true"
        style={{
          height: "32px",
          minWidth: "116px",
          borderRadius: "999px",
          border: "1px solid rgba(231,222,208,0.50)",
          background: "rgba(231,222,208,0.92)",
          color: "#111",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 15px",
          fontSize: "11px",
          lineHeight: "13px",
          fontWeight: 900,
          letterSpacing: "0.04em",
          boxShadow: "0 16px 28px rgba(0,0,0,0.36), inset 0 1px 0 rgba(255,255,255,0.36)",
        }}
      >
        View Listing
      </span>
    </div>
  );
}

function MiniArtwork({ accent }: { accent: string }) {
  return (
    <div
      style={{
        width: "62px",
        height: "54px",
        borderRadius: "9px",
        background:
          "radial-gradient(circle at 50% 12%, rgba(255,255,255,0.14), transparent 42%), #030304",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "28px",
          height: "39px",
          borderRadius: "5px",
          border: "1px solid rgba(255,255,255,0.42)",
          background: `linear-gradient(145deg, ${accent}, #18181b 62%, #030304)`,
          boxShadow: "0 9px 18px rgba(0,0,0,0.5)",
        }}
      />
    </div>
  );
}

function HomepageBannerAction({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const actionStyle: CSSProperties = {
    width: "max-content",
    minWidth: "132px",
    height: "44px",
    borderRadius: "8px",
    background: "#E7DED0",
    color: "#111",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 18px",
    fontSize: "13px",
    lineHeight: "16px",
    fontWeight: 900,
    boxShadow: "0 16px 34px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.4)",
  };

  if (/^https?:\/\//i.test(href)) {
    return (
      <a href={href} style={actionStyle}>
        {label}
      </a>
    );
  }

  return (
    <Link href={href || "/browse"} style={actionStyle}>
      {label}
    </Link>
  );
}

function HomepageBannerSection({ banner }: { banner: HomepageBanner }) {
  const buttonLabel = banner.primaryButtonLabel?.trim() || "Explore GRAIL";
  const buttonHref = banner.primaryButtonHref?.trim() || "/browse";

  return (
    <section
      aria-label="Homepage announcement"
      style={{
        minHeight: "268px",
        marginTop: "28px",
        border: "1px solid rgba(231,222,208,0.16)",
        borderRadius: "10px",
        background:
          "radial-gradient(circle at 76% 18%, rgba(231,222,208,0.11), transparent 30%), linear-gradient(135deg, rgba(255,255,255,0.044), rgba(255,255,255,0.008)), rgba(3,3,4,0.97)",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 30px 70px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.045)",
      }}
    >
      {banner.imageUrl ? (
        <Image
          src={banner.imageUrl}
          alt=""
          fill
          sizes="1240px"
          loading="lazy"
          unoptimized
          style={{
            objectFit: "cover",
            opacity: 0.24,
            filter: "saturate(0.72) contrast(1.08) brightness(0.78)",
          }}
        />
      ) : null}

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 78% 24%, rgba(231,222,208,0.12), transparent 30%), radial-gradient(circle at 50% 50%, transparent 0, rgba(0,0,0,0.5) 74%), linear-gradient(90deg, rgba(0,0,0,0.96), rgba(0,0,0,0.8) 54%, rgba(0,0,0,0.92)), linear-gradient(180deg, rgba(0,0,0,0.32), rgba(0,0,0,0.68))",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "268px",
          boxSizing: "border-box",
          padding: "42px 46px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div style={{ maxWidth: "760px" }}>
          <p
            style={{
              margin: "0 0 12px",
              color: "#C9CDD3",
              fontSize: "11px",
              lineHeight: "14px",
              fontWeight: 900,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            GRAIL Announcement
          </p>
          <h2
            style={{
              margin: 0,
              color: "#fff",
              fontSize: "48px",
              lineHeight: "52px",
              fontWeight: 900,
              letterSpacing: "0",
            }}
          >
            {banner.headline}
          </h2>
          {banner.supportingText ? (
            <p
              style={{
                maxWidth: "560px",
                margin: "16px 0 0",
                color: "#d4d4d8",
                fontSize: "15px",
                lineHeight: "24px",
                fontWeight: 700,
                display: "-webkit-box",
                overflow: "hidden",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
              }}
            >
              {banner.supportingText}
            </p>
          ) : null}
          <div style={{ marginTop: "24px" }}>
            <HomepageBannerAction href={buttonHref} label={buttonLabel} />
          </div>
        </div>
      </div>
    </section>
  );
}

function SaferCollectingSection() {
  return (
    <section style={{ marginTop: "24px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: "14px",
          gap: "18px",
        }}
      >
        <div>
          <p
            style={{
              margin: "0 0 8px",
              color: "#C9CDD3",
              fontSize: "11px",
              lineHeight: "14px",
              fontWeight: 900,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            GRAIL Protected Checkout
          </p>
          <h2
            style={{
              margin: 0,
              color: "#fff",
              fontSize: "28px",
              lineHeight: "34px",
              fontWeight: 900,
            }}
          >
            Built for safer collecting.
          </h2>
        </div>
        <Link
          href="/buyer-protection"
          style={{
            color: "#E7DED0",
            textDecoration: "none",
            fontSize: "13px",
            fontWeight: 900,
          }}
        >
          Learn about protection
        </Link>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "14px",
        }}
      >
        {trustCards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="market-card"
            style={{
              minHeight: "148px",
              border: "1px solid rgba(231,222,208,0.16)",
              borderRadius: "10px",
              background:
                "linear-gradient(180deg,rgba(255,255,255,0.034),rgba(255,255,255,0.006)), rgba(5,5,6,0.94)",
              padding: "16px",
              color: "#fff",
              textDecoration: "none",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0 18px 40px rgba(0,0,0,0.25)",
            }}
          >
            <div>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  minHeight: "24px",
                  border: "1px solid rgba(231,222,208,0.28)",
                  borderRadius: "999px",
                  color: "#E7DED0",
                  background: "rgba(231,222,208,0.055)",
                  padding: "0 9px",
                  fontSize: "10px",
                  lineHeight: "12px",
                  fontWeight: 900,
                }}
              >
                {card.badge}
              </span>
              <h3
                style={{
                  margin: "13px 0 0",
                  color: "#fff",
                  fontSize: "19px",
                  lineHeight: "23px",
                  fontWeight: 900,
                }}
              >
                {card.title}
              </h3>
              <p
                style={{
                  margin: "9px 0 0",
                  color: "#a1a1aa",
                  fontSize: "12px",
                  lineHeight: "18px",
                  fontWeight: 800,
                }}
              >
                {card.body}
              </p>
            </div>
            <span
              style={{
                color: "#C9CDD3",
                fontSize: "11px",
                lineHeight: "15px",
                fontWeight: 900,
              }}
            >
              View policy
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Recently active";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "GC"
  );
}

function getProfileSlug(profile: ProfileRow | undefined, sellerId: string) {
  return getPublicCollectorSlug(profile, sellerId);
}

function getListingImage(listing: HomeListingRow) {
  return (
    listing.listing_images?.find((image) => image.image_type === "front")?.image_url ||
    listing.listing_images?.find((image) => Boolean(image.image_url))?.image_url ||
    null
  );
}

function isPublicHomeListing(listing: HomeListingRow) {
  const status = listing.status?.toLowerCase();

  return (
    status === "active" ||
    status === "collection" ||
    (Boolean(listing.is_public_collection) &&
      status !== "inactive" &&
      status !== "deleted" &&
      status !== "sold")
  );
}

function isActiveListing(listing: HomeListingRow) {
  return listing.status?.toLowerCase() === "active";
}

function getListingTitle(listing: HomeListingRow) {
  const title = listing.title?.trim();

  if (title) {
    return title;
  }

  const subject = listing.player_name?.trim() || listing.player?.trim();
  const generatedTitle = [
    listing.year,
    listing.brand,
    subject,
    listing.card_number ? `#${listing.card_number}` : "",
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return generatedTitle || "GRAIL Listing";
}

function getConditionDisplay(listing: HomeListingRow) {
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

function isRawListing(listing: HomeListingRow) {
  const cardType = listing.card_type?.toLowerCase() || "";

  return (
    cardType === "raw" ||
    Boolean(listing.condition && !(listing.grader && listing.grade))
  );
}

function isCurrentFeaturedListing(listing: HomeListingRow, now = Date.now()) {
  if (!listing.homepage_featured) {
    return false;
  }

  if (!listing.homepage_featured_until) {
    return true;
  }

  return new Date(listing.homepage_featured_until).getTime() >= now;
}

function sortNewestListing(left: HomeListingRow, right: HomeListingRow) {
  return (
    new Date(right.created_at || 0).getTime() -
    new Date(left.created_at || 0).getTime()
  );
}

function selectFeaturedListings(listings: HomeListingRow[]) {
  const now = Date.now();
  const activeListings = listings.filter(isActiveListing);
  const curatedListings = activeListings
    .filter((listing) => isCurrentFeaturedListing(listing, now))
    .sort((left, right) => {
      const leftOrder = left.homepage_featured_order ?? 9999;
      const rightOrder = right.homepage_featured_order ?? 9999;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return sortNewestListing(left, right);
    });
  const curatedIds = new Set(curatedListings.map((listing) => listing.id));
  const recentFill = activeListings
    .filter((listing) => !curatedIds.has(listing.id))
    .sort(sortNewestListing);

  return [...curatedListings, ...recentFill].slice(0, featuredCardLimit);
}

function mapHeroCard(
  listing: HomeListingRow,
  index: number,
  profilesById: Map<string, ProfileRow>,
): HeroCardData {
  const profile = listing.seller_id ? profilesById.get(listing.seller_id) : undefined;
  const sellerName = profile?.full_name || profile?.username || "GRAIL Seller";
  const accent = featuredAccentPairs[index % featuredAccentPairs.length];

  return {
    id: listing.id,
    href: `/cards/${listing.id}`,
    title: getListingTitle(listing),
    subtitle: `${sellerName} · ${listing.sport || "Card"}`,
    condition: getConditionDisplay(listing),
    price:
      listing.price !== null && Number(listing.price) > 0
        ? formatCurrency(Number(listing.price))
        : "View listing",
    type: isRawListing(listing) ? "raw" : "slab",
    accent: accent.accent,
    secondary: accent.secondary,
    imageUrl: getListingImage(listing),
    featuredLabel: listing.homepage_featured
      ? "Weekly Featured"
      : "Recent Listing",
  };
}

async function fetchHomepageListings(includeCurationColumns: boolean) {
  const selectColumns: string = includeCurationColumns
    ? `
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
        is_collection_card,
        is_public_collection,
        homepage_featured,
        homepage_featured_order,
        homepage_featured_at,
        homepage_featured_until,
        created_at,
        listing_images (
          image_url,
          image_type
        )
      `
    : `
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
        is_collection_card,
        is_public_collection,
        created_at,
        listing_images (
          image_url,
          image_type
        )
      `;

  return supabase
    .from("listings")
    .select(selectColumns)
    .or("status.eq.active,status.eq.collection,is_public_collection.eq.true")
    .order("created_at", { ascending: false })
    .limit(120);
}

export default function Home() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [featuredCards, setFeaturedCards] = useState<HeroCardData[]>([]);
  const [liveCollections, setLiveCollections] = useState<LiveCollection[]>([]);
  const [marketSnapshot, setMarketSnapshot] = useState<MarketSnapshot>({
    activeListings: 0,
    newThisWeek: 0,
    averageListPrice: 0,
    completedSales: null,
    marketplaceVolume: null,
  });
  const [isLoadingHomeData, setIsLoadingHomeData] = useState(true);
  const [homeDataError, setHomeDataError] = useState("");
  const [homepageBanner, setHomepageBanner] = useState<HomepageBanner | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadHomeData() {
      setIsLoadingHomeData(true);
      setHomeDataError("");

      try {
        const homepageBannerResponse = await fetch("/api/homepage/banner")
          .then((response) => response.json())
          .catch((error) => {
            console.warn("Homepage banner unavailable:", error);
            return {};
          }) as HomepageBannerResponse;

        if (isMounted) {
          setHomepageBanner(homepageBannerResponse.banner || null);
        }

        let { data: listingData, error: listingError } =
          await fetchHomepageListings(true);

        if (listingError) {
          console.warn(
            "Homepage featured curation columns unavailable; falling back to recent active listings.",
            listingError,
          );

          const fallbackResult = await fetchHomepageListings(false);
          listingData = fallbackResult.data;
          listingError = fallbackResult.error;

          if (listingError) {
            throw listingError;
          }
        }

        const publicListings = ((listingData || []) as unknown as HomeListingRow[]).filter(
          isPublicHomeListing,
        );
        const sellerIds = Array.from(
          new Set(
            publicListings
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
            console.error("Homepage profile fetch error:", profileError);
          } else {
            ((profileData || []) as ProfileRow[]).forEach((profile) => {
              profilesById.set(profile.id, profile);
            });
          }
        }

        const listingsBySeller = new Map<string, HomeListingRow[]>();

        publicListings.forEach((listing) => {
          if (!listing.seller_id) {
            return;
          }

          listingsBySeller.set(listing.seller_id, [
            ...(listingsBySeller.get(listing.seller_id) || []),
            listing,
          ]);
        });

        const mappedCollections = Array.from(listingsBySeller.entries())
          .map(([sellerId, sellerListings]) => {
            const profile = profilesById.get(sellerId);
            const name = profile?.full_name || profile?.username || "GRAIL Seller";
            const latestListing = sellerListings
              .slice()
              .sort(
                (left, right) =>
                  new Date(right.created_at || 0).getTime() -
                  new Date(left.created_at || 0).getTime(),
              )[0];
            const totalValue = sellerListings.reduce(
              (sum, listing) => sum + Number(listing.price || 0),
              0,
            );
            const sportsCount = sellerListings.filter((listing) =>
              `${listing.sport || ""}`.toLowerCase().includes("sport"),
            ).length;
            const categoryLabel =
              sportsCount === sellerListings.length
                ? "Sports"
                : sportsCount === 0
                  ? "TCG"
                  : "Sports + TCG";

            return {
              sellerId,
              name,
              initials: getInitials(name),
              route: `/collections/${getProfileSlug(profile, sellerId)}`,
              listingCount: sellerListings.length,
              collectionValue: totalValue,
              latestListedAt: latestListing?.created_at || null,
              imageUrl: latestListing ? getListingImage(latestListing) : null,
              categoryLabel,
            } satisfies LiveCollection;
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
        const mappedHeroCards = selectFeaturedListings(publicListings).map(
          (listing, index) => mapHeroCard(listing, index, profilesById),
        );

        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const activeListings = publicListings.filter(
          (listing) => listing.status?.toLowerCase() === "active",
        );
        const pricedActiveListings = activeListings.filter(
          (listing) => listing.price !== null && Number(listing.price) > 0,
        );
        const averageListPrice = pricedActiveListings.length
          ? Math.round(
              pricedActiveListings.reduce(
                (sum, listing) => sum + Number(listing.price || 0),
                0,
              ) / pricedActiveListings.length,
            )
          : 0;
        let completedSales: number | null = null;
        let marketplaceVolume: number | null = null;

        try {
          const { data: orderData, error: orderError } = await supabase
            .from("orders")
            .select("id, total_amount, card_price, status, created_at, completed_at")
            .limit(1000);

          if (orderError) {
            throw orderError;
          }

          const orders = (orderData || []) as OrderRow[];
          if (orders.length > 0) {
            const completedOrders = orders.filter((order) => {
              const status = order.status?.toLowerCase();
              return (
                status === "paid" ||
                status === "complete" ||
                status === "completed" ||
                Boolean(order.completed_at)
              );
            });

            completedSales = completedOrders.length;
            marketplaceVolume = completedOrders.reduce(
              (sum, order) => sum + Number(order.total_amount || order.card_price || 0),
              0,
            );
          }
        } catch (orderError) {
          console.warn("Homepage orders snapshot unavailable:", orderError);
        }

        if (isMounted) {
          setFeaturedCards(mappedHeroCards);
          setLiveCollections(mappedCollections);
          setMarketSnapshot({
            activeListings: activeListings.length,
            newThisWeek: publicListings.filter(
              (listing) =>
                listing.created_at &&
                new Date(listing.created_at).getTime() >= oneWeekAgo,
            ).length,
            averageListPrice,
            completedSales,
            marketplaceVolume,
          });
        }
      } catch (error) {
        console.error("Homepage live data fetch error:", error);

        if (isMounted) {
          setFeaturedCards([]);
          setLiveCollections([]);
          setHomepageBanner(null);
          setMarketSnapshot({
            activeListings: 0,
            newThisWeek: 0,
            averageListPrice: 0,
            completedSales: null,
            marketplaceVolume: null,
          });
          setHomeDataError("Live marketplace data is unavailable right now.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingHomeData(false);
        }
      }
    }

    loadHomeData();

    return () => {
      isMounted = false;
    };
  }, []);

  const snapshotStats = useMemo(
    () => [
      { label: "Active listings", value: String(marketSnapshot.activeListings) },
      { label: "New this week", value: String(marketSnapshot.newThisWeek) },
      {
        label: "Completed sales",
        value:
          marketSnapshot.completedSales === null
            ? "Pending"
            : String(marketSnapshot.completedSales),
      },
      {
        label: "Marketplace volume",
        value:
          marketSnapshot.marketplaceVolume === null
            ? "Pending"
            : formatCurrency(marketSnapshot.marketplaceVolume),
      },
      {
        label: "Average list price",
        value: marketSnapshot.averageListPrice
          ? formatCurrency(marketSnapshot.averageListPrice)
          : "Pending",
      },
    ],
    [marketSnapshot],
  );
  const activeCarouselIndex = featuredCards.length
    ? activeIndex % featuredCards.length
    : 0;
  const visibleHeroCards = useMemo(
    () => getVisibleHeroCards(featuredCards, activeCarouselIndex),
    [activeCarouselIndex, featuredCards],
  );

  const showPreviousCard = () => {
    if (featuredCards.length <= 1) {
      return;
    }

    setActiveIndex((currentIndex) => {
      const normalizedIndex = currentIndex % featuredCards.length;

      return normalizedIndex === 0
        ? featuredCards.length - 1
        : normalizedIndex - 1;
    });
  };

  const showNextCard = () => {
    if (featuredCards.length <= 1) {
      return;
    }

    setActiveIndex((currentIndex) => (currentIndex + 1) % featuredCards.length);
  };

  return (
    <main
      className="homepage-page"
      style={{
        minHeight: "100vh",
        minWidth: 0,
        overflowX: "hidden",
        background:
          "radial-gradient(circle at 59% 120px, rgba(255,255,255,0.06), transparent 28%), linear-gradient(180deg,#000 0%,#030303 58%,#000 100%)",
        color: "#fafafa",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <style>
        {`
          .market-card:hover {
            border-color: rgba(231, 222, 208, 0.52) !important;
            box-shadow: 0 0 28px rgba(201, 205, 211, 0.1);
          }
          .collection-card:hover {
            border-color: rgba(231, 222, 208, 0.42) !important;
            box-shadow: 0 0 28px rgba(201, 205, 211, 0.08);
          }
          .homepage-hero-v4 {
            --hero-v4-composition-shift: 108px;
            isolation: isolate;
            width: min(1500px, calc(100vw - 48px));
            max-width: 1500px;
            margin-left: 50%;
            transform: translateX(-50%);
            background-image: url("/images/homepage-hero-background-v3.jpg");
            background-size: cover;
            background-position: center center;
            background-repeat: no-repeat;
            background-attachment: local;
          }
          .homepage-hero-v4::before {
            content: "";
            position: absolute;
            inset: 0 auto 0 0;
            width: 380px;
            z-index: 1;
            pointer-events: none;
            background: linear-gradient(
              90deg,
              rgba(7,7,7,.92) 0%,
              rgba(7,7,7,.82) 18%,
              rgba(7,7,7,.55) 36%,
              rgba(7,7,7,.12) 52%,
              transparent 65%
            );
          }
          .hero-v4-copy {
            position: absolute;
            left: clamp(46px, 5.2vw, 82px);
            top: 50%;
            width: 380px;
            transform: translateY(-50%);
            z-index: 3;
          }
          .hero-v4-stage {
            position: absolute;
            inset: 0;
            z-index: 2;
            height: 100%;
            min-width: 0;
            overflow: hidden;
            perspective: 1200px;
            transform-style: preserve-3d;
          }
          .hero-v4-card-link {
            position: absolute;
            left: calc(54% + var(--hero-v4-composition-shift) + var(--hero-v4-x));
            top: 58px;
            height: calc(100% - 58px);
            width: var(--hero-v4-width);
            color: inherit;
            text-decoration: none;
            opacity: var(--hero-v4-opacity);
            z-index: var(--hero-v4-z);
            transform:
              translateX(-50%)
              translateX(var(--hero-v4-translate-x))
              translateY(var(--hero-v4-translate-y))
              rotateY(var(--hero-v4-rotate-y))
              scale(var(--hero-v4-scale));
            transform-origin: center top;
            transform-style: preserve-3d;
            transition:
              left 720ms cubic-bezier(0.2, 0.8, 0.2, 1),
              transform 720ms cubic-bezier(0.2, 0.8, 0.2, 1),
              opacity 560ms ease;
          }
          .hero-v4-card-display {
            position: relative;
            display: grid;
            justify-items: center;
            align-items: end;
            gap: 0;
            height: 100%;
            width: var(--hero-v4-width);
            transform-style: preserve-3d;
          }
          .hero-v4-artwork-wrap {
            position: relative;
            transform-style: preserve-3d;
          }
          .hero-v4-card-caption {
            position: absolute;
            left: 50%;
            top: var(--hero-v4-height);
            transform: translateX(-50%);
            z-index: 3;
            width: var(--hero-v4-width);
            text-align: center;
            display: grid;
            gap: 5px;
            justify-items: center;
            text-shadow: 0 2px 18px rgba(0,0,0,0.92);
          }
          .hero-v4-view-listing {
            transition: border-color 180ms ease, background 180ms ease;
          }
          .hero-v4-card-link:focus-visible .hero-v4-view-listing {
            border-color: rgba(231,222,208,0.58);
            outline: 2px solid rgba(231,222,208,0.38);
            outline-offset: 3px;
          }
          @media (max-width: 1600px) and (min-width: 1321px) {
            .hero-v4-card-link {
              left: calc(54% + var(--hero-v4-composition-shift) + var(--hero-v4-wide-x));
              transform:
                translateX(-50%)
                translateX(var(--hero-v4-wide-translate-x))
                translateY(var(--hero-v4-wide-translate-y))
                rotateY(var(--hero-v4-rotate-y))
                scale(var(--hero-v4-wide-scale));
            }
          }
          @media (max-width: 1320px) and (min-width: 981px) {
            .hero-v4-card-link {
              left: calc(56% + var(--hero-v4-composition-shift) + var(--hero-v4-compact-x));
              transform:
                translateX(-50%)
                translateX(var(--hero-v4-compact-translate-x))
                translateY(var(--hero-v4-compact-translate-y))
                rotateY(var(--hero-v4-rotate-y))
                scale(var(--hero-v4-compact-scale));
            }
          }
          @media (max-width: 980px) {
            .homepage-hero-v4 {
              --hero-v4-composition-shift: 44px;
              height: 500px !important;
            }
            .hero-v4-copy {
              left: 34px;
              width: 340px;
            }
            .hero-v4-copy h1 {
              font-size: 48px !important;
              line-height: 52px !important;
            }
            .hero-v4-copy p {
              width: auto !important;
            }
            .hero-v4-card-link {
              left: calc(66% + var(--hero-v4-composition-shift) + var(--hero-v4-tablet-x));
              top: 56px;
              height: calc(100% - 56px);
              transform:
                translateX(-50%)
                translateX(var(--hero-v4-tablet-translate-x))
                translateY(var(--hero-v4-tablet-translate-y))
                rotateY(var(--hero-v4-rotate-y))
                scale(var(--hero-v4-tablet-scale));
            }
          }
          @media (max-width: 680px) {
            .homepage-page {
              overflow-x: hidden;
            }
            .homepage-hero-v4 {
              --hero-v4-composition-shift: 18px;
              height: 520px !important;
              border-radius: 0 !important;
            }
            .hero-v4-copy {
              left: 20px;
              top: 112px;
              width: 172px;
            }
            .hero-v4-copy h1 {
              font-size: 30px !important;
              line-height: 34px !important;
            }
            .hero-v4-copy p {
              font-size: 12px !important;
              line-height: 18px !important;
              width: auto !important;
            }
            .hero-v4-copy > div {
              flex-wrap: wrap;
              gap: 10px !important;
            }
            .hero-v4-copy a {
              min-width: 0 !important;
              width: 100% !important;
              height: 40px !important;
              font-size: 12px !important;
            }
            .hero-v4-card-link {
              left: calc(72% + var(--hero-v4-composition-shift) + var(--hero-v4-mobile-x));
              top: 188px;
              height: calc(100% - 188px);
              transform:
                translateX(-50%)
                translateX(var(--hero-v4-mobile-translate-x))
                translateY(var(--hero-v4-mobile-translate-y))
                rotateY(var(--hero-v4-rotate-y))
                scale(var(--hero-v4-mobile-scale));
            }
          }
          @media (prefers-reduced-motion: reduce) {
            .hero-v4-card-link {
              transition: none !important;
            }
          }
        `}
      </style>

      <div
        className="homepage-shell"
        style={{ width: "min(1240px, calc(100vw - 32px))", margin: "0 auto", padding: "8px 0 34px" }}
      >
        <Header />

        <section
          className="homepage-hero-v4"
          style={{
            height: "520px",
            marginTop: "10px",
            backgroundColor: "#030303",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            aria-label="Previous featured card"
            onClick={showPreviousCard}
            style={{
              position: "absolute",
              left: "17px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "38px",
              height: "38px",
              borderRadius: "999px",
              border: "1px solid rgba(231,222,208,0.30)",
              background: "rgba(5,5,6,0.64)",
              color: "#E7DED0",
              fontSize: "18px",
              lineHeight: "28px",
              zIndex: 8,
              cursor: featuredCards.length > 1 ? "pointer" : "default",
              opacity: featuredCards.length > 1 ? 1 : 0.45,
            }}
          >
            &lt;
          </button>
          <button
            type="button"
            aria-label="Next featured card"
            onClick={showNextCard}
            style={{
              position: "absolute",
              right: "17px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "38px",
              height: "38px",
              borderRadius: "999px",
              border: "1px solid rgba(231,222,208,0.30)",
              background: "rgba(5,5,6,0.64)",
              color: "#E7DED0",
              fontSize: "18px",
              lineHeight: "28px",
              zIndex: 8,
              cursor: featuredCards.length > 1 ? "pointer" : "default",
              opacity: featuredCards.length > 1 ? 1 : 0.45,
            }}
          >
            &gt;
          </button>

          <div
            className="homepage-hero-canvas-layers"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 2,
              boxSizing: "border-box",
            }}
          >
            <div className="hero-v4-copy">
              <p
                style={{
                  margin: "0 0 14px",
                  color: "#a1a1aa",
                  fontSize: "11px",
                  lineHeight: "14px",
                  fontWeight: 900,
                  letterSpacing: "0.34em",
                  textTransform: "uppercase",
                }}
              >
                THE COLLECTOR MARKETPLACE
              </p>

              <h1
                style={{
                  margin: 0,
                  color: "#fff",
                  fontSize: "58px",
                  lineHeight: "62px",
                  fontWeight: 900,
                  letterSpacing: "0",
                }}
              >
                Buy. Sell. Collect.
              </h1>

              <p
                style={{
                  width: "380px",
                  margin: "18px 0 0",
                  color: "#d4d4d8",
                  fontSize: "16px",
                  lineHeight: "25px",
                  fontWeight: 600,
                }}
              >
                Buy, sell, and track sports cards, TCG cards, and collector
                collections in one premium marketplace.
              </p>

              <div style={{ display: "flex", gap: "14px", marginTop: "26px" }}>
                <Link
                  href="/browse"
                  style={{
                    height: "46px",
                    minWidth: "134px",
                    borderRadius: "8px",
                    background: "#E7DED0",
                    color: "#111",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    fontWeight: 900,
                  }}
                >
                  Browse Cards
                </Link>

                <Link
                  href="/list"
                  style={{
                    height: "46px",
                    minWidth: "120px",
                    borderRadius: "8px",
                    border: "1px solid rgba(201,205,211,0.28)",
                    background: "rgba(9,9,11,0.72)",
                    color: "#fff",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    fontWeight: 900,
                  }}
                >
                  List a Card
                </Link>
              </div>
            </div>

            <div
              className="hero-v4-stage"
              style={{
                height: "100%",
                position: "absolute",
                inset: 0,
                overflow: "hidden",
                isolation: "isolate",
              }}
            >
              {isLoadingHomeData && featuredCards.length === 0 ? (
                <article
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "44%",
                    transform: "translate(-50%, -50%)",
                    width: "280px",
                    color: "#C9CDD3",
                    fontSize: "11px",
                    lineHeight: "15px",
                    fontWeight: 900,
                    textAlign: "center",
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    padding: "0",
                    boxSizing: "border-box",
                  }}
                >
                  Loading featured listings...
                </article>
              ) : null}

              {!isLoadingHomeData && featuredCards.length === 0 ? (
                <article
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "47%",
                    transform: "translate(-50%, -50%)",
                    width: "330px",
                    color: "#fff",
                    textAlign: "center",
                    padding: "0",
                    boxSizing: "border-box",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      height: "23px",
                      alignItems: "center",
                      border: "1px solid rgba(231,222,208,0.24)",
                      borderRadius: "999px",
                      color: "#E7DED0",
                      padding: "0 10px",
                      fontSize: "10px",
                      fontWeight: 900,
                    }}
                  >
                    Featured Listings
                  </span>
                  <h2
                    style={{
                      margin: "13px 0 0",
                      color: "#fff",
                      fontSize: "22px",
                      lineHeight: "27px",
                      fontWeight: 900,
                    }}
                  >
                    Active listings will appear here.
                  </h2>
                  <p
                    style={{
                      margin: "8px 0 0",
                      color: "#a1a1aa",
                      fontSize: "12px",
                      lineHeight: "18px",
                      fontWeight: 800,
                    }}
                  >
                    No demo featured card data is shown on the homepage.
                  </p>
                </article>
              ) : null}

              {visibleHeroCards.map(({ card, slot, slotName, variant }) => {
                return (
                  <Link
                    key={`${slotName}-${card.href}`}
                    className={`hero-v4-card-link hero-v4-card-link-${slotName}`}
                    href={card.href}
                    aria-label={`View ${card.title}`}
                    style={
                      {
                        "--hero-v4-x": `${slot.x}px`,
                        "--hero-v4-translate-x": `${slot.translateX}px`,
                        "--hero-v4-translate-y": `${slot.translateY}px`,
                        "--hero-v4-rotate-y": `${slot.rotateY}deg`,
                        "--hero-v4-scale": `${slot.scale}`,
                        "--hero-v4-opacity": `${slot.opacity}`,
                        "--hero-v4-z": `${slot.zIndex}`,
                        "--hero-v4-width": `${slot.width}px`,
                        "--hero-v4-height": `${slot.height}px`,
                        "--hero-v4-wide-x": `${slot.x * 0.78}px`,
                        "--hero-v4-wide-translate-x": `${slot.translateX * 0.78}px`,
                        "--hero-v4-wide-translate-y": `${slot.translateY * 0.78}px`,
                        "--hero-v4-wide-scale": `${slot.scale * 0.78}`,
                        "--hero-v4-compact-x": `${slot.x * 0.72}px`,
                        "--hero-v4-compact-translate-x": `${slot.translateX * 0.72}px`,
                        "--hero-v4-compact-translate-y": `${slot.translateY * 0.72}px`,
                        "--hero-v4-compact-scale": `${slot.scale * 0.72}`,
                        "--hero-v4-tablet-x": `${slot.x * 0.48}px`,
                        "--hero-v4-tablet-translate-x": `${slot.translateX * 0.48}px`,
                        "--hero-v4-tablet-translate-y": `${slot.translateY}px`,
                        "--hero-v4-tablet-scale": `${slot.scale * 0.48}`,
                        "--hero-v4-mobile-x": `${slot.x * 0.28}px`,
                        "--hero-v4-mobile-translate-x": `${slot.translateX * 0.28}px`,
                        "--hero-v4-mobile-translate-y": `${slot.translateY * 0.48}px`,
                        "--hero-v4-mobile-scale": `${slot.scale * 0.28}`,
                      } as CSSProperties
                    }
                  >
                    <div className={`hero-v4-card-display hero-v4-card-display-${variant}`}>
                      <CuratorCollectible card={card} variant={variant} />
                      <HeroCardCaption card={card} variant={variant} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {homepageBanner ? <HomepageBannerSection banner={homepageBanner} /> : null}

        <section style={{ marginTop: "12px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "10px",
            }}
          >
            <h2
              style={{
                margin: 0,
                color: "#fff",
                fontSize: "20px",
                lineHeight: "24px",
                fontWeight: 900,
              }}
            >
              Explore the Market
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "12px",
            }}
          >
            {marketCategories.map((category) => (
              <Link
                key={category.title}
                href={category.href}
                className="market-card"
                style={{
                  height: "108px",
                  border: "1px solid #1d1d22",
                  borderRadius: "10px",
                  background:
                    "linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.006)), rgba(5,5,6,0.92)",
                  padding: "14px",
                  display: "grid",
                  gridTemplateColumns: "1fr 74px",
                  alignItems: "center",
                  gap: "12px",
                  color: "#fff",
                  textDecoration: "none",
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "16px",
                      lineHeight: "20px",
                      fontWeight: 900,
                    }}
                  >
                    {category.title}
                  </h2>
                  <p
                    style={{
                      margin: "8px 0 0",
                      color: "#9ca3af",
                      fontSize: "11px",
                      lineHeight: "15px",
                    }}
                  >
                    {category.subtitle}
                  </p>
                </div>
                <MiniArtwork accent={category.accent} />
              </Link>
            ))}
          </div>
        </section>

        <section id="grail-market-snapshot" style={{ marginTop: "24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              marginBottom: "14px",
              gap: "18px",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  color: "#fff",
                  fontSize: "28px",
                  lineHeight: "34px",
                  fontWeight: 900,
                }}
              >
                GRAIL Market Snapshot
              </h2>
              <p
                style={{
                  margin: "8px 0 0",
                  color: "#a1a1aa",
                  fontSize: "13px",
                  lineHeight: "18px",
                  fontWeight: 800,
                }}
              >
                Live activity from cards listed and sold on GRAIL.
              </p>
            </div>
          </div>

          <div
            style={{
              border: "1px solid rgba(231,222,208,0.16)",
              borderRadius: "10px",
              background:
                "linear-gradient(180deg,rgba(255,255,255,0.034),rgba(255,255,255,0.006)), rgba(5,5,6,0.94)",
              padding: "16px",
              boxShadow: "0 18px 40px rgba(0,0,0,0.25)",
            }}
          >
            {isLoadingHomeData ? (
              <p
                style={{
                  margin: 0,
                  color: "#C9CDD3",
                  fontSize: "13px",
                  lineHeight: "18px",
                  fontWeight: 900,
                }}
              >
                Loading live marketplace data...
              </p>
            ) : homeDataError ? (
              <p
                style={{
                  margin: 0,
                  color: "#a1a1aa",
                  fontSize: "13px",
                  lineHeight: "18px",
                  fontWeight: 800,
                }}
              >
                Live marketplace data will appear here as more collectors list,
                buy, and sell on GRAIL.
              </p>
            ) : (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, 1fr)",
                    gap: "10px",
                  }}
                >
                  {snapshotStats.map((stat) => (
                    <article
                      key={stat.label}
                      style={{
                        border: "1px solid rgba(201,205,211,0.14)",
                        borderRadius: "10px",
                        background: "rgba(8,8,10,0.76)",
                        padding: "12px",
                      }}
                    >
                      <span
                        style={{
                          color: "#C9CDD3",
                          fontSize: "10px",
                          lineHeight: "13px",
                          fontWeight: 900,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                        }}
                      >
                        {stat.label}
                      </span>
                      <strong
                        style={{
                          display: "block",
                          marginTop: "8px",
                          color: "#fff",
                          fontSize: "22px",
                          lineHeight: "26px",
                          fontWeight: 900,
                        }}
                      >
                        {stat.value}
                      </strong>
                    </article>
                  ))}
                </div>
                {marketSnapshot.completedSales === null ||
                marketSnapshot.marketplaceVolume === null ? (
                  <p
                    style={{
                      margin: "12px 0 0",
                      color: "#85858f",
                      fontSize: "11px",
                      lineHeight: "16px",
                      fontWeight: 800,
                    }}
                  >
                    Completed sales and volume appear when public order data is
                    available to the homepage. No external card market index is
                    being shown here.
                  </p>
                ) : null}
              </>
            )}
          </div>
        </section>

        <section style={{ marginTop: "24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              marginBottom: "14px",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  color: "#fff",
                  fontSize: "28px",
                  lineHeight: "34px",
                  fontWeight: 900,
                }}
              >
                Live Collections
              </h2>
              <p
                style={{
                  margin: "8px 0 0",
                  color: "#a1a1aa",
                  fontSize: "13px",
                  lineHeight: "18px",
                  fontWeight: 800,
                }}
              >
                Public seller collections with live GRAIL listings.
              </p>
            </div>

            <Link
              href="/collections"
              style={{
                color: "#d4d4d8",
                textDecoration: "none",
                fontSize: "13px",
                fontWeight: 800,
              }}
            >
              View all collections
            </Link>
          </div>

          {isLoadingHomeData ? (
            <article
              style={{
                minHeight: "120px",
                border: "1px solid #1d1d22",
                borderRadius: "10px",
                background:
                  "linear-gradient(180deg,rgba(255,255,255,0.026),rgba(255,255,255,0.004)), rgba(5,5,6,0.94)",
                padding: "16px",
                color: "#C9CDD3",
                fontSize: "13px",
                lineHeight: "18px",
                fontWeight: 900,
                display: "flex",
                alignItems: "center",
              }}
            >
              Loading live collections...
            </article>
          ) : liveCollections.length === 0 ? (
            <article
              style={{
                minHeight: "132px",
                border: "1px solid #1d1d22",
                borderRadius: "10px",
                background:
                  "linear-gradient(180deg,rgba(255,255,255,0.026),rgba(255,255,255,0.004)), rgba(5,5,6,0.94)",
                padding: "16px",
                boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  color: "#fff",
                  fontSize: "18px",
                  lineHeight: "22px",
                  fontWeight: 900,
                }}
              >
                Collections will appear here as collectors start listing cards.
              </h3>
              <p
                style={{
                  margin: "8px 0 0",
                  color: "#a1a1aa",
                  fontSize: "13px",
                  lineHeight: "18px",
                  fontWeight: 800,
                }}
              >
                No demo collections are shown on this section.
              </p>
            </article>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "14px",
              }}
            >
              {liveCollections.map((collection) => (
                <Link
                  key={collection.sellerId}
                  href={collection.route}
                  className="collection-card"
                  style={{
                    minHeight: "170px",
                    border: "1px solid #1d1d22",
                    borderRadius: "10px",
                    background:
                      "linear-gradient(180deg,rgba(255,255,255,0.026),rgba(255,255,255,0.004)), rgba(5,5,6,0.94)",
                    padding: "15px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
                    color: "#fff",
                    textDecoration: "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "14px",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          color: "#fff",
                          fontSize: "16px",
                          lineHeight: "20px",
                          fontWeight: 900,
                        }}
                      >
                        {collection.name}
                      </h3>
                      <p
                        style={{
                          margin: "8px 0 0",
                          color: "#a1a1aa",
                          fontSize: "12px",
                          lineHeight: "16px",
                        }}
                      >
                        {collection.listingCount} public cards ·{" "}
                        {collection.categoryLabel}
                      </p>
                    </div>

                    <div
                      style={{
                        width: "62px",
                        height: "54px",
                        borderRadius: "9px",
                        border: "1px solid rgba(201,205,211,0.18)",
                        background: collection.imageUrl
                          ? `center / cover no-repeat url("${collection.imageUrl}")`
                          : "linear-gradient(145deg, #1f2937, #050506)",
                        color: "#E7DED0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "15px",
                        fontWeight: 900,
                        overflow: "hidden",
                      }}
                    >
                      {collection.imageUrl ? null : collection.initials}
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: "8px" }}>
                    <strong
                      style={{
                        color: "#fff",
                        fontSize: "20px",
                        lineHeight: "24px",
                        fontWeight: 900,
                      }}
                    >
                      {formatCurrency(collection.collectionValue)} listed value
                    </strong>
                    <span
                      style={{
                        color: "#C9CDD3",
                        fontSize: "11px",
                        lineHeight: "15px",
                        fontWeight: 900,
                      }}
                    >
                      Latest listing: {formatDate(collection.latestListedAt)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <SaferCollectingSection />
      </div>
    </main>
  );
}
