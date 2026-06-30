"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import Header from "../../components/Header";
import { getMockListingById } from "../../lib/mockData";

type SupabaseCheckoutListing = {
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
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
};

type CheckoutCard = {
  id: string;
  sellerId?: string | null;
  title: string;
  category: string;
  condition: string;
  seller: string;
  sellerHref: string;
  price: number;
  marketValue: number;
  accent: string;
  status: string | null;
  source: "mock" | "supabase" | "fallback";
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function buildListingTitle(listing: SupabaseCheckoutListing) {
  return (
    listing.title ||
    [listing.year, listing.brand, listing.player, listing.card_number]
      .filter(Boolean)
      .join(" ") ||
    `Listing ${listing.id}`
  );
}

function getCategory(listing: SupabaseCheckoutListing) {
  const source = `${listing.sport || ""} ${listing.card_type || ""}`.toLowerCase();

  return source.includes("tcg") ? "TCG" : "Sports";
}

function getCondition(listing: SupabaseCheckoutListing) {
  if (listing.grader && listing.grade) {
    return `${listing.grader} ${listing.grade}`;
  }

  if (listing.condition) {
    return listing.condition.toLowerCase().includes("raw")
      ? listing.condition
      : `Raw ${listing.condition}`;
  }

  return listing.card_type?.toLowerCase() === "graded" ? "Graded" : "Raw";
}

function getSellerHref(profile: ProfileRow | null, sellerId: string | null) {
  const username = profile?.username?.replace(/^@/, "").trim();

  if (username) {
    return `/collections/${encodeURIComponent(username)}`;
  }

  return `/collections/${sellerId || "vault-runner"}`;
}

function CardArtwork({ accent }: { accent: string }) {
  return (
    <div className="art-shell">
      <div
        className="mock-art"
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="summary-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function CheckoutPage() {
  const params = useParams();
  const id = String(params.id || "");
  const mockCard = getMockListingById(id);
  const [realCard, setRealCard] = useState<CheckoutCard | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const mockCheckoutCard: CheckoutCard | null = mockCard
    ? {
        id: mockCard.id,
        sellerId: null,
        title: mockCard.title,
        category: mockCard.category,
        condition: mockCard.condition,
        seller: mockCard.seller,
        sellerHref: mockCard.sellerHref,
        price: mockCard.price,
        marketValue: mockCard.marketValue,
        accent: mockCard.accent,
        status: "active",
        source: "mock",
      }
    : null;
  const fallbackCard: CheckoutCard = {
    id,
    sellerId: null,
    title: `Listing ${id || "live"}`,
    category: "Live Listing",
    condition: "Supabase listing",
    seller: "GRAIL Seller",
    sellerHref: "/collections/vault-runner",
    price: 0,
    marketValue: 0,
    accent: "#334155",
    status: null,
    source: "fallback",
  };
  const card = mockCheckoutCard ?? realCard ?? fallbackCard;
  const [isPlaced, setIsPlaced] = useState(false);
  const [isStripeSuccess] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return new URLSearchParams(window.location.search).get("success") === "true";
  });
  const [isStripeCanceled] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return new URLSearchParams(window.location.search).get("canceled") === "true";
  });
  const [isStartingStripeCheckout, setIsStartingStripeCheckout] = useState(false);
  const [stripeError, setStripeError] = useState("");
  const [stripeNotice, setStripeNotice] = useState("");

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

    async function loadCheckoutListing() {
      if (mockCard || !id) {
        return;
      }

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
              status
            `,
          )
          .eq("id", id)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data) {
          return;
        }

        const listing = data as SupabaseCheckoutListing;
        let profile: ProfileRow | null = null;

        if (listing.seller_id) {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("id, full_name, username")
            .eq("id", listing.seller_id)
            .maybeSingle();

          if (profileError) {
            console.error("Checkout profile fetch error:", profileError);
          } else {
            profile = profileData as ProfileRow | null;
          }
        }

        if (isMounted) {
          setRealCard({
            id: listing.id,
            sellerId: listing.seller_id,
            title: buildListingTitle(listing),
            category: getCategory(listing),
            condition: getCondition(listing),
            seller: profile?.full_name || profile?.username || "GRAIL Seller",
            sellerHref: getSellerHref(profile, listing.seller_id),
            price: Number(listing.price || 0),
            marketValue: 0,
            accent: "#334155",
            status: listing.status,
            source: "supabase",
          });
        }
      } catch (error) {
        console.error("Checkout listing fetch error:", error);
      }
    }

    loadCheckoutListing();

    return () => {
      isMounted = false;
    };
  }, [id, mockCard]);

  async function startStripeCheckout() {
    setStripeError("");
    setStripeNotice("");

    if (card.source !== "supabase") {
      setStripeError("Stripe test checkout is available for live listings only.");
      return;
    }

    if (card.status !== "active") {
      setStripeError("This card is open to offers, not Buy Now.");
      return;
    }

    if (!card.price || card.price <= 0) {
      setStripeError("This listing does not have a valid Buy Now price.");
      return;
    }

    setIsStartingStripeCheckout(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({ listingId: card.id }),
      });
      const payload = (await response.json()) as {
        url?: string;
        error?: string;
      };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Stripe checkout could not be started.");
      }

      window.location.href = payload.url;
    } catch (error) {
      console.error("Start Stripe checkout error:", error);
      setStripeError(
        error instanceof Error
          ? error.message
          : "Stripe checkout could not be started.",
      );
      setStripeNotice("You can still use mock checkout for now.");
    } finally {
      setIsStartingStripeCheckout(false);
    }
  }

  const platformFee = Math.round(card.price * 0.035);
  const shipping = 14;
  const estimatedTax = Math.round(card.price * 0.07);
  const total = card.price + platformFee + shipping + estimatedTax;
  const isOwnerCheckout = Boolean(currentUserId) && card.sellerId === currentUserId;
  const isCollectionCheckout = card.status === "collection";
  const showStripeCheckoutButton =
    card.source === "supabase" && card.status === "active" && card.price > 0;
  const isStripePublicConfigured = Boolean(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  );
  const canAttemptStripeCheckout =
    showStripeCheckoutButton && isStripePublicConfigured;
  const showMockCheckoutButton =
    card.source !== "supabase" ||
    Boolean(stripeError) ||
    (showStripeCheckoutButton && !isStripePublicConfigured);

  if (isOwnerCheckout) {
    return (
      <main className="checkout-page">
        <style>{pageStyles}</style>
        <div className="checkout-shell">
          <Header />

          <section className="not-found panel">
            <p>Owner Checkout Blocked</p>
            <h1>You cannot buy your own listing.</h1>
            <div className="owner-block-actions">
              <Link href={`/cards/${card.id}`}>View Listing</Link>
              <Link href="/seller-dashboard">Seller Dashboard</Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      <style>{pageStyles}</style>
      <div className="checkout-shell">
        <Header />

        <section className="page-heading">
          <div>
            <span>Checkout</span>
            <h1>Checkout for &quot;{card.title}&quot;</h1>
            <p>Review your card purchase before placing your order.</p>
          </div>
          <Link href={`/cards/${card.id}`}>Back to Card</Link>
        </section>

        <section className="checkout-layout">
          <div className="main-column">
            <section className="order-item panel">
              <CardArtwork accent={card.accent} />
              <div>
                <h2>{card.title}</h2>
                <p>
                  {card.category}: {card.condition}
                </p>
                <p>
                  Seller: <Link href={card.sellerHref}>{card.seller}</Link>
                </p>
                <div className="item-stats">
                  <SummaryRow label="Asking Price" value={formatCurrency(card.price)} />
                  <SummaryRow label="Market Value" value={formatCurrency(card.marketValue)} />
                </div>
                {card.source === "fallback" ? (
                  <p className="live-fallback-note">
                    Live listing checkout mock. Full checkout data will be
                    connected later.
                  </p>
                ) : null}
                <Link className="text-link" href={`/cards/${card.id}`}>
                  View Card
                </Link>
              </div>
            </section>

            <section className="panel form-panel">
              <h2>Shipping Address</h2>
              <div className="field-grid">
                <input placeholder="Full name" defaultValue="Ryan Haas" />
                <input placeholder="Address" defaultValue="123 Vault Street" />
                <input placeholder="City" defaultValue="Tampa" />
                <input placeholder="State" defaultValue="FL" />
                <input placeholder="ZIP" defaultValue="33606" />
              </div>
            </section>

            <section className="panel form-panel">
              <h2>Payment Method</h2>
              <div className="payment-row">
                <span>Card ending in 4242</span>
                <button type="button">Add payment method</button>
              </div>
              <p>
                Stripe test checkout is available for active live listings. Mock
                checkout remains available when Stripe is not configured.
              </p>
            </section>

            <section className="panel protection-panel">
              <h2>Buyer Protection</h2>
              <ul>
                <li>Secure checkout</li>
                <li>Seller verified</li>
                <li>Tracked shipping</li>
                <li>Buyer protection placeholder</li>
              </ul>
            </section>
          </div>

          <aside className="summary-panel panel">
            <h2>Order Summary</h2>
            <SummaryRow label="Item price" value={formatCurrency(card.price)} />
            <SummaryRow label="Platform fee placeholder" value={formatCurrency(platformFee)} />
            <SummaryRow label="Shipping" value={formatCurrency(shipping)} />
            <SummaryRow label="Estimated tax" value={formatCurrency(estimatedTax)} />
            <div className="summary-total">
              <span>Total</span>
              <strong>{formatCurrency(total)}</strong>
            </div>

            {isStripeSuccess ? (
              <div className="confirmation-box">
                <strong>Payment successful.</strong>
                <p>Order will appear in Orders once the webhook finishes.</p>
                <Link href="/orders">View Orders</Link>
                <Link href="/browse">Continue Browsing</Link>
              </div>
            ) : null}

            {isStripeCanceled ? (
              <div className="stripe-status-box">
                <strong>Checkout canceled.</strong>
                <p>You can try again when you are ready.</p>
              </div>
            ) : null}

            {isCollectionCheckout ? (
              <div className="stripe-status-box">
                <strong>This card is open to offers, not Buy Now.</strong>
                <p>Return to the card detail page to make an offer or message the seller.</p>
                <Link href={`/cards/${card.id}`}>View Card</Link>
              </div>
            ) : null}

            {!isStripePublicConfigured && showStripeCheckoutButton ? (
              <div className="stripe-status-box">
                <strong>Stripe test checkout is not configured yet.</strong>
                <p>Add the Stripe environment variables to enable hosted checkout.</p>
              </div>
            ) : null}

            {stripeNotice ? (
              <p className="stripe-note">{stripeNotice}</p>
            ) : null}
            {stripeError ? <p className="stripe-error">{stripeError}</p> : null}

            {isPlaced ? (
              <div className="confirmation-box">
                <strong>Order placed.</strong>
                <p>This is a mock checkout. No payment was processed.</p>
                <Link href="/orders">View Orders</Link>
                <Link href="/browse">Continue Browsing</Link>
              </div>
            ) : null}

            {!isStripeSuccess && !isCollectionCheckout && canAttemptStripeCheckout ? (
              <button
                type="button"
                className="place-order"
                disabled={isStartingStripeCheckout}
                onClick={startStripeCheckout}
              >
                {isStartingStripeCheckout
                  ? "Starting Checkout..."
                  : "Continue to Secure Checkout"}
              </button>
            ) : null}

            {!isStripeSuccess && !isCollectionCheckout && showMockCheckoutButton ? (
              <button
                type="button"
                className="mock-order-button"
                onClick={() => setIsPlaced(true)}
              >
                Place Mock Order
              </button>
            ) : null}
          </aside>
        </section>
      </div>
    </main>
  );
}

const pageStyles = `
  .checkout-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at 50% -120px, rgba(201,205,211,0.08), transparent 32%),
      linear-gradient(180deg, #000 0%, #030304 58%, #000 100%);
    color: #fafafa;
    font-family: Arial, Helvetica, sans-serif;
  }

  .checkout-shell {
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

  .page-heading {
    margin-top: 18px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 20px;
  }

  .page-heading span {
    color: #C9CDD3;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .page-heading h1 {
    margin: 8px 0 0;
    color: #fff;
    font-size: 42px;
    line-height: 46px;
    font-weight: 900;
  }

  .page-heading p,
  .order-item p,
  .form-panel p,
  .confirmation-box p {
    color: #a1a1aa;
    font-size: 13px;
    line-height: 18px;
    font-weight: 800;
  }

  .page-heading a,
  .text-link,
  .payment-row button,
  .place-order,
  .mock-order-button,
  .confirmation-box a,
  .stripe-status-box a,
  .owner-block-actions a {
    border: 1px solid rgba(231,222,208,0.28);
    border-radius: 10px;
    background: rgba(231,222,208,0.055);
    color: #fff;
    min-height: 38px;
    padding: 0 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
  }

  .checkout-layout {
    margin-top: 18px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    gap: 18px;
    align-items: start;
  }

  .main-column {
    display: grid;
    gap: 14px;
  }

  .order-item {
    padding: 16px;
    display: grid;
    grid-template-columns: 130px 1fr;
    gap: 16px;
  }

  .art-shell {
    width: 120px;
    height: 158px;
    border: 1px solid rgba(201,205,211,0.14);
    border-radius: 12px;
    background: #030304;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .mock-art {
    width: 82px;
    height: 118px;
    border: 1px solid rgba(244,244,245,0.48);
    border-radius: 9px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 16px 28px rgba(0,0,0,0.58);
  }

  .mock-art span {
    position: absolute;
    left: 19px;
    top: 28px;
    width: 42px;
    height: 42px;
    border: 1px solid rgba(255,255,255,0.22);
    border-radius: 50%;
  }

  .mock-art strong {
    position: absolute;
    left: 35px;
    top: 38px;
    width: 22px;
    height: 48px;
    border-radius: 999px 999px 12px 12px;
    background: rgba(255,255,255,0.72);
  }

  .order-item h2,
  .form-panel h2,
  .protection-panel h2,
  .summary-panel h2 {
    margin: 0;
    color: #fff;
    font-size: 20px;
    line-height: 24px;
    font-weight: 900;
  }

  .order-item a {
    color: #E7DED0;
  }

  .item-stats {
    margin: 12px 0;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .form-panel,
  .protection-panel,
  .summary-panel {
    padding: 16px;
  }

  .field-grid {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .field-grid input,
  .payment-row {
    border: 1px solid #24242a;
    border-radius: 10px;
    background: #08080a;
    color: #fff;
    min-height: 40px;
    padding: 0 12px;
    font: inherit;
    font-size: 13px;
    font-weight: 800;
  }

  .payment-row {
    margin-top: 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .protection-panel ul {
    margin: 14px 0 0;
    padding: 0;
    list-style: none;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .protection-panel li {
    color: #C9CDD3;
    font-size: 12px;
    line-height: 16px;
    font-weight: 800;
  }

  .summary-panel {
    position: sticky;
    top: 16px;
    display: grid;
    gap: 10px;
  }

  .summary-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px solid #1d1d22;
    padding-bottom: 10px;
  }

  .summary-row span,
  .summary-total span {
    color: #a1a1aa;
    font-size: 12px;
    line-height: 16px;
    font-weight: 800;
  }

  .summary-row strong,
  .summary-total strong {
    color: #fff;
    font-size: 13px;
    line-height: 16px;
    font-weight: 900;
  }

  .summary-total {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding-top: 8px;
  }

  .summary-total strong {
    font-size: 26px;
    line-height: 30px;
  }

  .place-order {
    min-height: 46px;
    background: #E7DED0;
    color: #111;
  }

  .place-order:disabled {
    opacity: 0.62;
    cursor: wait;
  }

  .mock-order-button {
    min-height: 42px;
  }

  .confirmation-box {
    border: 1px solid rgba(52,211,153,0.24);
    border-radius: 10px;
    background: rgba(52,211,153,0.07);
    padding: 12px;
    display: grid;
    gap: 10px;
  }

  .confirmation-box strong {
    color: #86efac;
    font-size: 16px;
    font-weight: 900;
  }

  .stripe-status-box {
    border: 1px solid rgba(201,205,211,0.2);
    border-radius: 10px;
    background: rgba(201,205,211,0.055);
    padding: 12px;
    display: grid;
    gap: 9px;
  }

  .stripe-status-box strong {
    color: #E7DED0;
    font-size: 14px;
    font-weight: 900;
  }

  .stripe-status-box p,
  .stripe-note {
    margin: 0;
    color: #a1a1aa;
    font-size: 12px;
    line-height: 17px;
    font-weight: 800;
  }

  .stripe-error {
    margin: 0;
    border: 1px solid rgba(248,113,113,0.22);
    border-radius: 10px;
    background: rgba(248,113,113,0.08);
    color: #fecaca;
    padding: 10px 12px;
    font-size: 12px;
    line-height: 17px;
    font-weight: 900;
  }

  .not-found {
    margin-top: 30px;
    padding: 44px;
    text-align: center;
  }

  .not-found p {
    color: #C9CDD3;
    font-weight: 900;
    text-transform: uppercase;
  }

  .not-found h1 {
    color: #fff;
    font-size: 36px;
  }

  .owner-block-actions {
    margin-top: 18px;
    display: flex;
    justify-content: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  @media (max-width: 1100px) {
    .checkout-shell {
      width: calc(100vw - 32px);
    }

    .page-heading,
    .checkout-layout,
    .order-item,
    .field-grid,
    .protection-panel ul {
      grid-template-columns: 1fr;
    }

    .page-heading {
      display: grid;
      align-items: start;
    }

    .summary-panel {
      position: static;
    }
  }
`;
