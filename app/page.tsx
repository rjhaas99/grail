"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import Header from "./components/Header";
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
  center: {
    x: 0,
    y: -58,
    scale: 1,
    opacity: 1,
    zIndex: 5,
    blur: 0,
    shade: 0,
  },
  frontRight: {
    x: 224,
    y: -56,
    scale: 0.5,
    opacity: 0.24,
    zIndex: 4,
    blur: 0.3,
    shade: 0,
  },
  backRight: {
    x: 304,
    y: -62,
    scale: 0.34,
    opacity: 0.12,
    zIndex: 2,
    blur: 1,
    shade: 0,
  },
  backLeft: {
    x: -304,
    y: -62,
    scale: 0.34,
    opacity: 0.12,
    zIndex: 2,
    blur: 1,
    shade: 0,
  },
  frontLeft: {
    x: -224,
    y: -56,
    scale: 0.5,
    opacity: 0.24,
    zIndex: 4,
    blur: 0.3,
    shade: 0,
  },
};

type CarouselVariant = "center" | "side" | "back";

function getCarouselSlot(index: number, activeIndex: number, totalCards: number) {
  const relativeIndex = (index - activeIndex + totalCards) % totalCards;

  if (relativeIndex === 0) return carouselSlots.center;
  if (relativeIndex === 1) return carouselSlots.frontRight;
  if (relativeIndex === 2) return carouselSlots.backRight;
  if (relativeIndex === 3) return carouselSlots.backLeft;

  return carouselSlots.frontLeft;
}

function CuratorArtwork({
  card,
  variant,
}: {
  card: HeroCardData;
  variant: CarouselVariant;
}) {
  const isCenter = variant === "center";
  const isBack = variant === "back";
  const artWidth = isCenter ? "238px" : isBack ? "138px" : "162px";
  const artHeight = isCenter ? "178px" : isBack ? "104px" : "122px";

  if (card.imageUrl) {
    return (
      <div
        style={{
          width: artWidth,
          height: artHeight,
          position: "relative",
        }}
      >
        <Image
          src={card.imageUrl}
          alt={card.title}
          fill
          unoptimized
          sizes={isCenter ? "238px" : "162px"}
          style={{ objectFit: "contain" }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: artWidth,
        height: artHeight,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "rgba(231,222,208,0.62)",
        fontSize: isCenter ? "11px" : "9px",
        lineHeight: isCenter ? "15px" : "12px",
        fontWeight: 900,
        letterSpacing: "0.14em",
        textAlign: "center",
        textTransform: "uppercase",
      }}
    >
      Photo pending
    </div>
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
  const isBack = variant === "back";

  return (
    <div
      style={{
        width: isCenter ? "254px" : isBack ? "148px" : "174px",
        height: isCenter ? "194px" : isBack ? "116px" : "136px",
        position: "relative",
        display: "grid",
        placeItems: "center",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "50%",
          bottom: isCenter ? "7px" : "4px",
          width: isCenter ? "218px" : isBack ? "82px" : "108px",
          height: isCenter ? "22px" : "12px",
          borderRadius: "50%",
          transform: "translateX(-50%)",
          background:
            "radial-gradient(ellipse, rgba(231,222,208,0.13), rgba(201,205,211,0.035) 46%, transparent 74%)",
          filter: isCenter ? "blur(5px)" : "blur(4px)",
          opacity: isCenter ? 0.76 : 0.22,
        }}
      />
      <div style={{ position: "relative", zIndex: 2 }}>
        <CuratorArtwork card={card} variant={variant} />
      </div>
    </div>
  );
}

function CuratorAmbient() {
  return (
    <>
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "50%",
          top: "74px",
          width: "430px",
          height: "190px",
          borderRadius: "50%",
          transform: "translateX(-50%)",
          background:
            "radial-gradient(ellipse, rgba(255,255,255,0.08), rgba(231,222,208,0.028) 42%, transparent 74%)",
          filter: "blur(10px)",
          opacity: 0.68,
        }}
      />
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "50%",
          top: "189px",
          width: "520px",
          height: "36px",
          borderRadius: "50%",
          transform: "translateX(-50%)",
          background:
            "radial-gradient(ellipse, rgba(201,205,211,0.08), rgba(231,222,208,0.025) 46%, transparent 74%)",
          filter: "blur(6px)",
          opacity: 0.7,
        }}
      />
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "108px",
          right: "108px",
          top: "205px",
          height: "1px",
          background:
            "linear-gradient(90deg, transparent, rgba(231,222,208,0.18), transparent)",
          opacity: 0.4,
        }}
      />
    </>
  );
}

function CuratorFeaturedLabel() {
  return (
    <p
      style={{
        position: "absolute",
        left: "50%",
        top: "0",
        zIndex: 6,
        transform: "translateX(-50%)",
        margin: 0,
        color: "rgba(231,222,208,0.62)",
        fontSize: "10px",
        lineHeight: "13px",
        fontWeight: 900,
        letterSpacing: "0.28em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      Featured Today
    </p>
  );
}

function CuratorDetails({ card }: { card: HeroCardData }) {
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom: "0",
        zIndex: 6,
        width: "520px",
        transform: "translateX(-50%)",
        textAlign: "center",
        display: "grid",
        justifyItems: "center",
        pointerEvents: "none",
      }}
    >
      <h2
        style={{
          maxWidth: "456px",
          margin: 0,
          color: "#fff",
          fontSize: "25px",
          lineHeight: "30px",
          fontWeight: 900,
          letterSpacing: "0",
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
          maxWidth: "360px",
          margin: "4px 0 0",
          color: "rgba(201,205,211,0.66)",
          fontSize: "11px",
          lineHeight: "14px",
          fontWeight: 800,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {card.subtitle}
      </p>
      <p
        style={{
          margin: "7px 0 0",
          color: "#E7DED0",
          fontSize: "22px",
          lineHeight: "24px",
          fontWeight: 900,
        }}
      >
        {card.price}
      </p>
      <Link
        href={card.href}
        style={{
          height: "35px",
          minWidth: "120px",
          marginTop: "10px",
          borderRadius: "999px",
          border: "1px solid rgba(231,222,208,0.28)",
          background: "rgba(231,222,208,0.96)",
          color: "#111",
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 15px",
          fontSize: "12px",
          lineHeight: "15px",
          fontWeight: 900,
          boxShadow:
            "0 14px 30px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.38)",
          pointerEvents: "auto",
        }}
      >
        View Listing
      </Link>
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
  const username = profile?.username?.replace(/^@/, "").trim();

  return username ? encodeURIComponent(username) : sellerId;
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
  const activeHeroCard = featuredCards[activeCarouselIndex] || null;

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
      style={{
        minHeight: "100vh",
        minWidth: "1280px",
        overflowX: "auto",
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
        `}
      </style>

      <div style={{ width: "1240px", margin: "0 auto", padding: "8px 0 34px" }}>
        <Header />

        <section
          style={{
            height: "386px",
            marginTop: "10px",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "10px",
            background:
              "radial-gradient(circle at 62% 45%, rgba(255,255,255,0.15), transparent 22%), radial-gradient(circle at 76% 50%, rgba(201,205,211,0.06), transparent 28%), linear-gradient(90deg,#020202 0%,#080808 52%,#020202 100%)",
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
              width: "34px",
              height: "34px",
              borderRadius: "999px",
              border: "1px solid #26262d",
              background: "rgba(5,5,6,0.78)",
              color: "#d4d4d8",
              fontSize: "18px",
              lineHeight: "28px",
              zIndex: 6,
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
              width: "34px",
              height: "34px",
              borderRadius: "999px",
              border: "1px solid #26262d",
              background: "rgba(5,5,6,0.78)",
              color: "#d4d4d8",
              fontSize: "18px",
              lineHeight: "28px",
              zIndex: 6,
              cursor: featuredCards.length > 1 ? "pointer" : "default",
              opacity: featuredCards.length > 1 ? 1 : 0.45,
            }}
          >
            &gt;
          </button>

          <div
            style={{
              position: "relative",
              zIndex: 2,
              height: "100%",
              display: "grid",
              gridTemplateColumns: "370px 1fr",
              alignItems: "center",
              gap: "34px",
              padding: "0 72px",
              boxSizing: "border-box",
            }}
          >
            <div>
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
              style={{
                height: "330px",
                position: "relative",
                overflow: "visible",
                isolation: "isolate",
              }}
            >
              <CuratorAmbient />
              {activeHeroCard ? <CuratorFeaturedLabel /> : null}

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

              {featuredCards.map((card, index) => {
                const slot = getCarouselSlot(index, activeCarouselIndex, featuredCards.length);
                const isActive = index === activeCarouselIndex;
                const cardVariant: CarouselVariant = isActive
                  ? "center"
                  : slot.zIndex === 2
                    ? "back"
                    : "side";

                return (
                  <Link
                    key={card.href}
                    href={card.href}
                    aria-label={`View ${card.title}`}
                    style={{
                      position: "absolute",
                      left: `calc(50% + ${slot.x}px)`,
                      top: `calc(50% + ${slot.y}px)`,
                      transform: `translate(-50%, -50%) scale(${slot.scale})`,
                      transformOrigin: "center",
                      opacity: slot.opacity,
                      zIndex: slot.zIndex,
                      filter: slot.blur ? `blur(${slot.blur}px)` : "none",
                      transition:
                        "left 680ms cubic-bezier(0.2, 0.8, 0.2, 1), top 680ms cubic-bezier(0.2, 0.8, 0.2, 1), transform 680ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 560ms ease, filter 680ms ease",
                      color: "inherit",
                      textDecoration: "none",
                    }}
                  >
                    <CuratorCollectible card={card} variant={cardVariant} />
                  </Link>
                );
              })}

              {activeHeroCard ? (
                <CuratorDetails card={activeHeroCard} />
              ) : null}
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
