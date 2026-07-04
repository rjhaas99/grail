"use client";

import Link from "next/link";
import { useState } from "react";
import Header from "./components/Header";

type HeroCardData = {
  href: string;
  title: string;
  subtitle: string;
  condition: string;
  price: string;
  type: "slab" | "raw";
  accent: string;
  secondary: string;
};

const heroCards: HeroCardData[] = [
  {
    href: "/cards/featured-1",
    title: "Obsidian Court Ace",
    subtitle: "Premium basketball-style grail",
    condition: "Graded 10",
    price: "$4,500",
    type: "slab",
    accent: "#8f1d2c",
    secondary: "#E7DED0",
  },
  {
    href: "/cards/featured-2",
    title: "Silver Crest Sentinel",
    subtitle: "Blue/silver sports showcase",
    condition: "Slabbed 9",
    price: "$2,850",
    type: "slab",
    accent: "#1e3a8a",
    secondary: "#C9CDD3",
  },
  {
    href: "/cards/featured-3",
    title: "Midnight Archivist",
    subtitle: "Archive TCG-style single",
    condition: "Raw Near Mint",
    price: "$950",
    type: "raw",
    accent: "#0f766e",
    secondary: "#C9CDD3",
  },
  {
    href: "/cards/featured-4",
    title: "Crimson Rookie Vault",
    subtitle: "Rookie category showcase",
    condition: "Graded 9",
    price: "$1,250",
    type: "slab",
    accent: "#7f1d1d",
    secondary: "#E7DED0",
  },
  {
    href: "/cards/featured-5",
    title: "Aurora Strike Holo",
    subtitle: "Holographic chase single",
    condition: "Raw Mint",
    price: "$775",
    type: "raw",
    accent: "#0e7490",
    secondary: "#C9CDD3",
  },
];

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
    title: "Market Index",
    href: "/market-index",
    subtitle: "Track card values, market movement, and weekly percentage changes.",
    accent: "#E7DED0",
  },
  {
    title: "Seller Collections",
    href: "/collections",
    subtitle: "Browse curated collections from trusted sellers.",
    accent: "#8D949D",
  },
];

const collections = [
  {
    name: "Vintage Basketball Vault",
    href: "/collections/vintage-basketball-vault",
    value: "$128,450 value",
    count: "342 cards",
    change: "+12.5%",
    accent: "#E7DED0",
  },
  {
    name: "Modern Rookie Collection",
    href: "/collections/modern-rookie-collection",
    value: "$87,900 value",
    count: "211 cards",
    change: "+8.3%",
    accent: "#C9CDD3",
  },
  {
    name: "TCG Fire Collection",
    href: "/collections/tcg-fire-collection",
    value: "$64,250 value",
    count: "98 cards",
    change: "+6.1%",
    accent: "#AEB4BC",
  },
  {
    name: "Collector Collection Reserve",
    href: "/collections/collector-collection-reserve",
    value: "$42,700 value",
    count: "64 cards",
    change: "+4.8%",
    accent: "#8D949D",
  },
];

const legalLinks = [
  { title: "Terms", href: "/terms", subtitle: "Marketplace account and transaction rules." },
  { title: "Privacy", href: "/privacy", subtitle: "How GRAIL handles marketplace information." },
  {
    title: "Buyer Protection",
    href: "/buyer-protection",
    subtitle: "GRAIL Protected Checkout and inspection basics.",
  },
  { title: "Seller Rules", href: "/seller-rules", subtitle: "Listing, shipping, and dispute expectations." },
  { title: "Fees", href: "/fees", subtitle: "Seller fees, buyer costs, and fee examples." },
  { title: "Shipping Policy", href: "/shipping-policy", subtitle: "Tracking, packaging, and delivery timelines." },
  {
    title: "Refunds & Disputes",
    href: "/refund-dispute-policy",
    subtitle: "How order issues and evidence review work.",
  },
  { title: "Prohibited Items", href: "/prohibited-items", subtitle: "Cards and listing behavior not allowed." },
];

const carouselSlots = {
  center: {
    x: 0,
    y: 4,
    scale: 1.04,
    opacity: 1,
    zIndex: 5,
    blur: 0,
    shade: 0,
  },
  frontRight: {
    x: 190,
    y: 24,
    scale: 0.82,
    opacity: 0.86,
    zIndex: 4,
    blur: 0,
    shade: 0.08,
  },
  backRight: {
    x: 306,
    y: -3,
    scale: 0.58,
    opacity: 0.48,
    zIndex: 2,
    blur: 0.6,
    shade: 0.28,
  },
  backLeft: {
    x: -306,
    y: -3,
    scale: 0.58,
    opacity: 0.48,
    zIndex: 2,
    blur: 0.6,
    shade: 0.28,
  },
  frontLeft: {
    x: -190,
    y: 24,
    scale: 0.82,
    opacity: 0.86,
    zIndex: 4,
    blur: 0,
    shade: 0.08,
  },
};

type CarouselVariant = "center" | "side" | "back";

function getCarouselSlot(index: number, activeIndex: number) {
  const relativeIndex = (index - activeIndex + heroCards.length) % heroCards.length;

  if (relativeIndex === 0) return carouselSlots.center;
  if (relativeIndex === 1) return carouselSlots.frontRight;
  if (relativeIndex === 2) return carouselSlots.backRight;
  if (relativeIndex === 3) return carouselSlots.backLeft;

  return carouselSlots.frontLeft;
}

function CardFace({
  card,
  variant,
}: {
  card: HeroCardData;
  variant: CarouselVariant;
}) {
  const isRaw = card.type === "raw";
  const isCenter = variant === "center";
  const isBack = variant === "back";

  return (
    <div
      style={{
        width: isRaw
          ? isCenter
            ? "112px"
            : isBack
              ? "92px"
              : "102px"
          : isCenter
            ? "120px"
            : isBack
              ? "98px"
              : "108px",
        height: isRaw
          ? isCenter
            ? "150px"
            : isBack
              ? "122px"
              : "136px"
          : isCenter
            ? "160px"
            : isBack
              ? "132px"
              : "146px",
        borderRadius: isRaw ? "10px" : "12px",
        border: isRaw
          ? "1px solid rgba(231,222,208,0.32)"
          : "1px solid rgba(244,244,245,0.5)",
        background: isRaw
          ? `linear-gradient(145deg, ${card.accent}, #111827 56%, #030304)`
          : "linear-gradient(180deg,#eeeeef 0%,#fafafa 15%,#d7d7da 16%,#f8fafc 17%,#1f1f23 100%)",
        boxShadow: isCenter
          ? "0 0 34px rgba(231,222,208,0.18), 0 18px 34px rgba(0,0,0,0.68)"
          : "0 12px 26px rgba(0,0,0,0.58)",
        padding: isRaw ? "8px" : "7px",
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {!isRaw && (
        <div
          style={{
            height: isCenter ? "27px" : isBack ? "20px" : "23px",
            borderRadius: "6px",
            background: "#f8fafc",
            color: "#111827",
            fontSize: isCenter ? "7px" : "6px",
            lineHeight: isCenter ? "9px" : "8px",
            fontWeight: 900,
            padding: isCenter ? "4px 5px" : "3px 4px",
            overflow: "hidden",
            textTransform: "uppercase",
          }}
        >
          {card.condition}
          <br />
          {card.title}
        </div>
      )}

      <div
        style={{
          marginTop: isRaw ? "0" : "7px",
          height: isRaw ? "100%" : isCenter ? "102px" : isBack ? "86px" : "92px",
          borderRadius: isRaw ? "8px" : "7px",
          border: "1px solid rgba(255,255,255,0.26)",
          background: isRaw
            ? `radial-gradient(circle at 48% 24%, rgba(231,222,208,0.2), transparent 15%), linear-gradient(145deg, ${card.accent}, #0f766e 54%, #030304 100%)`
            : `radial-gradient(circle at 48% 24%, rgba(231,222,208,0.22), transparent 15%), linear-gradient(145deg, ${card.accent} 0%, ${card.secondary} 44%, #18181b 100%)`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: isCenter ? "24px" : "20px",
            right: isCenter ? "24px" : "20px",
            bottom: isCenter ? "16px" : "13px",
            height: isCenter ? "18px" : "15px",
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.18)",
            opacity: 0.64,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: isCenter ? "22px" : "18px",
            top: isCenter ? "20px" : "16px",
            width: isCenter ? "25px" : "20px",
            height: isCenter ? "25px" : "20px",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.78)",
            boxShadow: "0 0 18px rgba(231,222,208,0.3)",
            opacity: isRaw ? 0.44 : 0.78,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: isCenter ? "21px" : "18px",
            top: isCenter ? "22px" : "18px",
            width: isCenter ? "72px" : isBack ? "52px" : "62px",
            height: isCenter ? "72px" : isBack ? "52px" : "62px",
            border: "1px solid rgba(255,255,255,0.16)",
            borderRadius: "50%",
            transform: "rotate(-18deg)",
            opacity: 0.46,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: isCenter ? "42px" : isBack ? "32px" : "36px",
            top: isCenter ? "34px" : isBack ? "27px" : "30px",
            width: isCenter ? "34px" : isBack ? "25px" : "28px",
            height: isCenter ? "58px" : isBack ? "42px" : "48px",
            borderRadius: "999px 999px 14px 14px",
            background: "rgba(255,255,255,0.72)",
            opacity: 0.68,
            transform: "skew(-8deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "18px",
            right: "18px",
            bottom: isCenter ? "16px" : "13px",
            height: "1px",
            background:
              "linear-gradient(90deg, transparent, rgba(231,222,208,0.44), transparent)",
          }}
        />
      </div>

      {isRaw && !isBack && (
        <p
          style={{
            position: "absolute",
            top: "11px",
            left: "11px",
            right: "11px",
            margin: 0,
            color: "#f4f4f5",
            fontSize: "7px",
            lineHeight: "10px",
            fontWeight: 900,
            textTransform: "uppercase",
          }}
        >
          {card.title}
        </p>
      )}
    </div>
  );
}

function CarouselCard({
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
        width: isCenter ? "226px" : isBack ? "190px" : "212px",
        height: isCenter ? "348px" : isBack ? "204px" : "266px",
        borderRadius: isCenter ? "17px" : "16px",
        border: isCenter
          ? "1px solid rgba(231,222,208,0.28)"
          : "1px solid rgba(201,205,211,0.14)",
        background: isCenter
          ? "linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.014)), rgba(5,5,6,0.82)"
          : "linear-gradient(180deg, rgba(255,255,255,0.042), rgba(255,255,255,0.008)), rgba(5,5,6,0.74)",
        boxShadow: isCenter
          ? "0 24px 54px rgba(0,0,0,0.56), inset 0 1px 0 rgba(231,222,208,0.08)"
          : "0 16px 34px rgba(0,0,0,0.42), inset 0 1px 0 rgba(231,222,208,0.04)",
        padding: isCenter ? "14px" : isBack ? "10px" : "12px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        color: "#fff",
      }}
    >
      <span
        style={{
          alignSelf: "flex-start",
          display: "inline-flex",
          alignItems: "center",
          height: isBack ? "18px" : "23px",
          border: `1px solid ${card.accent}`,
          borderRadius: "999px",
          color: "#fff",
          background: `linear-gradient(135deg, ${card.accent}, rgba(9,9,11,0.86) 64%)`,
          padding: isBack ? "0 7px" : "0 10px",
          fontSize: isBack ? "8px" : "10px",
          lineHeight: "12px",
          fontWeight: 900,
          boxShadow: `0 0 ${isCenter ? "22px" : "15px"} ${card.accent}88, inset 0 1px 0 rgba(255,255,255,0.18)`,
          whiteSpace: "nowrap",
        }}
      >
        ★ Featured Grail
      </span>

      <div style={{ marginTop: isBack ? "9px" : isCenter ? "12px" : "9px" }}>
        <CardFace card={card} variant={variant} />
      </div>

      {!isBack && (
        <div style={{ width: "100%", marginTop: isCenter ? "12px" : "9px" }}>
          <h2
            style={{
              margin: 0,
              color: "#fff",
              fontSize: isCenter ? "17px" : "13px",
              lineHeight: isCenter ? "20px" : "16px",
              fontWeight: 900,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {card.title}
          </h2>
          {isCenter && (
            <p
              style={{
                margin: "5px 0 0",
                color: "#b9bcc4",
                fontSize: "11px",
                lineHeight: "14px",
                fontWeight: 700,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {card.subtitle}
            </p>
          )}
        </div>
      )}

      {!isBack && (
        <div
          style={{
            width: "100%",
            marginTop: "auto",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "8px",
          }}
        >
          <div style={{ minWidth: 0 }}>
            {isCenter && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  maxWidth: "100%",
                  height: "20px",
                  border: "1px solid rgba(201,205,211,0.18)",
                  borderRadius: "5px",
                  color: "#C9CDD3",
                  background: "rgba(9,9,11,0.62)",
                  padding: "0 7px",
                  fontSize: "9px",
                  fontWeight: 900,
                  whiteSpace: "nowrap",
                }}
              >
                {card.condition}
              </span>
            )}
            <p
              style={{
                margin: isCenter ? "7px 0 0" : "0",
                color: "#fff",
                fontSize: isCenter ? "22px" : "18px",
                lineHeight: isCenter ? "24px" : "20px",
                fontWeight: 900,
                whiteSpace: "nowrap",
              }}
            >
              {card.price}
            </p>
          </div>

          {isCenter && (
            <span
              style={{
                height: "31px",
                minWidth: "82px",
                borderRadius: "8px",
                border: "1px solid rgba(231,222,208,0.28)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(231,222,208,0.055))",
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
                fontWeight: 900,
                boxShadow: "0 0 16px rgba(231,222,208,0.12)",
                flexShrink: 0,
              }}
            >
              View Card
            </span>
          )}
        </div>
      )}

      {isBack && <div style={{ flex: 1 }} />}
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

export default function Home() {
  const [activeIndex, setActiveIndex] = useState(0);

  const showPreviousCard = () => {
    setActiveIndex((currentIndex) =>
      currentIndex === 0 ? heroCards.length - 1 : currentIndex - 1,
    );
  };

  const showNextCard = () => {
    setActiveIndex((currentIndex) => (currentIndex + 1) % heroCards.length);
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
          .legal-card:hover {
            border-color: rgba(231, 222, 208, 0.42) !important;
            background: rgba(231, 222, 208, 0.08) !important;
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
          {[0, 1, 2].map((line) => (
            <span
              key={line}
              style={{
                position: "absolute",
                right: line === 0 ? "54px" : line === 1 ? "146px" : "318px",
                top: line === 0 ? "118px" : line === 1 ? "158px" : "203px",
                width: line === 2 ? "390px" : "330px",
                height: "1px",
                borderRadius: "999px",
                background:
                  "linear-gradient(90deg, transparent, rgba(231,222,208,0.34), transparent)",
                boxShadow: "0 0 13px rgba(231,222,208,0.11)",
                transform: line === 1 ? "rotate(-13deg)" : "rotate(-18deg)",
                opacity: line === 2 ? 0.13 : 0.22,
              }}
            />
          ))}

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
              cursor: "pointer",
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
              cursor: "pointer",
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
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "328px",
                  height: "286px",
                  borderRadius: "50%",
                  background:
                    "radial-gradient(ellipse, rgba(255,255,255,0.27), rgba(231,222,208,0.09) 44%, transparent 72%)",
                  filter: "blur(4px)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  bottom: "8px",
                  transform: "translateX(-50%)",
                  width: "520px",
                  height: "38px",
                  borderRadius: "50%",
                  background:
                    "radial-gradient(ellipse, rgba(201,205,211,0.18), transparent 68%)",
                  filter: "blur(3px)",
                }}
              />

              {heroCards.map((card, index) => {
                const slot = getCarouselSlot(index, activeIndex);
                const isActive = index === activeIndex;
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
                        "left 420ms ease, top 420ms ease, transform 420ms ease, opacity 420ms ease, filter 420ms ease",
                      color: "inherit",
                      textDecoration: "none",
                  }}
                >
                    <CarouselCard card={card} variant={cardVariant} />
                    {slot.shade > 0 && (
                      <span
                        aria-hidden="true"
                        style={{
                          position: "absolute",
                          inset: 0,
                          borderRadius: "16px",
                          background: `rgba(0,0,0,${slot.shade})`,
                          pointerEvents: "none",
                        }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

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

        <section style={{ marginTop: "24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              marginBottom: "14px",
            }}
          >
            <h2
              style={{
                margin: 0,
                color: "#fff",
                fontSize: "28px",
                lineHeight: "34px",
                fontWeight: 900,
              }}
            >
              Trending Collections
            </h2>

            <Link
              href="/browse"
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

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "14px",
            }}
          >
            {collections.map((collection) => (
              <Link
                key={collection.name}
                href={collection.href}
                className="collection-card"
                style={{
                  height: "150px",
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
                      {collection.count}
                    </p>
                  </div>

                  <MiniArtwork accent={collection.accent} />
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <strong
                    style={{
                      color: "#fff",
                      fontSize: "20px",
                      lineHeight: "24px",
                      fontWeight: 900,
                    }}
                  >
                    {collection.value}
                  </strong>
                  <span
                    style={{
                      color: "#4ade80",
                      fontSize: "12px",
                      lineHeight: "16px",
                      fontWeight: 900,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {collection.change} 7D
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

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
              <h2
                style={{
                  margin: 0,
                  color: "#fff",
                  fontSize: "28px",
                  lineHeight: "34px",
                  fontWeight: 900,
                }}
              >
                Legal & Protection
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
                Review GRAIL marketplace policies, protected checkout, fees,
                shipping, and dispute rules.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "12px",
            }}
          >
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="legal-card"
                style={{
                  minHeight: "104px",
                  border: "1px solid #1d1d22",
                  borderRadius: "10px",
                  background:
                    "linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.006)), rgba(5,5,6,0.92)",
                  padding: "14px",
                  color: "#fff",
                  textDecoration: "none",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxSizing: "border-box",
                }}
              >
                <strong
                  style={{
                    color: "#E7DED0",
                    fontSize: "14px",
                    lineHeight: "18px",
                    fontWeight: 900,
                  }}
                >
                  {link.title}
                </strong>
                <span
                  style={{
                    color: "#9ca3af",
                    fontSize: "11px",
                    lineHeight: "15px",
                    fontWeight: 700,
                  }}
                >
                  {link.subtitle}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
