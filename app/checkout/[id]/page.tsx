"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import Header from "../../components/Header";
import {
  getShippingAmountForProfile,
  getShippingProfile,
  type ShippingProfileId,
} from "../../lib/shippingProfiles";

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
  shipping_profile_id?: string | null;
  listing_images?: Array<{
    image_url: string | null;
    image_type: string | null;
  }> | null;
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
  imageUrl?: string | null;
  status: string | null;
  shippingProfileId: ShippingProfileId;
};

type CheckoutShippingQuote = {
  shippingAmount: number;
  profile: ReturnType<typeof getShippingProfile>;
};

const checkoutLegalLinks = [
  { label: "Buyer Protection", href: "/buyer-protection" },
  { label: "Fees", href: "/fees" },
  { label: "Refunds & Disputes", href: "/refund-dispute-policy" },
  { label: "Terms", href: "/terms" },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
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

function getListingFrontImage(listing: SupabaseCheckoutListing) {
  return (
    listing.listing_images?.find((image) => image.image_type === "front")?.image_url ||
    listing.listing_images?.find((image) => Boolean(image.image_url))?.image_url ||
    null
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
  const [realCard, setRealCard] = useState<CheckoutCard | null>(null);
  const [isCheckoutListingLoading, setIsCheckoutListingLoading] = useState(true);
  const [checkoutListingError, setCheckoutListingError] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const card = realCard;
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
  const [shippingQuote, setShippingQuote] = useState<CheckoutShippingQuote | null>(null);
  const [isShippingQuoteLoading, setIsShippingQuoteLoading] = useState(false);
  const [shippingQuoteError, setShippingQuoteError] = useState("");
  const [pweAcknowledged, setPweAcknowledged] = useState(false);

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
      if (!id) {
        if (isMounted) {
          setCheckoutListingError("Choose a listing before checkout.");
          setIsCheckoutListingLoading(false);
        }
        return;
      }

      setIsCheckoutListingLoading(true);
      setCheckoutListingError("");

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
              shipping_profile_id,
              listing_images (
                image_url,
                image_type
              )
            `,
          )
          .eq("id", id)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data) {
          if (isMounted) {
            setCheckoutListingError("Listing was not found.");
          }
          return;
        }

        const listing = data as SupabaseCheckoutListing;
        let profile: ProfileRow | null = null;
        const shippingProfile = getShippingProfile(listing.shipping_profile_id);

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
            imageUrl: getListingFrontImage(listing),
            status: listing.status,
            shippingProfileId: shippingProfile.id,
          });
        }

        setIsShippingQuoteLoading(true);
        setShippingQuoteError("");
        setShippingQuote(null);
        setPweAcknowledged(false);

        try {
          const quoteResponse = await fetch("/api/shipping/quote", {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({ listingId: listing.id }),
          });
          const quotePayload = (await quoteResponse.json()) as
            | CheckoutShippingQuote
            | { error?: string };

          if (!quoteResponse.ok || "error" in quotePayload) {
            throw new Error(
              "error" in quotePayload && quotePayload.error
                ? quotePayload.error
                : "Shipping quote could not be loaded.",
            );
          }

          if (isMounted) {
            setShippingQuote(quotePayload as CheckoutShippingQuote);
          }
        } catch (quoteError) {
          console.error("Checkout shipping quote error:", quoteError);
          if (isMounted) {
            setShippingQuoteError(
              quoteError instanceof Error
                ? quoteError.message
                : "Shipping quote could not be loaded.",
            );
          }
        } finally {
          if (isMounted) {
            setIsShippingQuoteLoading(false);
          }
        }
      } catch (error) {
        console.error("Checkout listing fetch error:", error);
        if (isMounted) {
          setCheckoutListingError("Checkout details could not be loaded.");
        }
      } finally {
        if (isMounted) {
          setIsCheckoutListingLoading(false);
        }
      }
    }

    loadCheckoutListing();

    return () => {
      isMounted = false;
    };
  }, [id]);

  async function startStripeCheckout() {
    setStripeError("");
    setStripeNotice("");

    if (!card) {
      setStripeError("Checkout details could not be loaded.");
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

    const activeShippingProfile = shippingQuote?.profile || getShippingProfile(card.shippingProfileId);

    if (shippingQuoteError) {
      setStripeError(shippingQuoteError);
      return;
    }

    if (activeShippingProfile.capabilities.buyerAcknowledgementRequired && !pweAcknowledged) {
      setStripeError("Acknowledge Plain White Envelope shipping before checkout.");
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
        body: JSON.stringify({
          listingId: card.id,
          pweAcknowledged,
        }),
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
      setStripeNotice("Please try again in a moment.");
    } finally {
      setIsStartingStripeCheckout(false);
    }
  }

  if (isCheckoutListingLoading || !card) {
    return (
      <main className="checkout-page">
        <style>{pageStyles}</style>
        <div className="checkout-shell">
          <Header />

          <section className="not-found panel">
            <p>Checkout</p>
            <h1>
              {isCheckoutListingLoading
                ? "Loading checkout details."
                : checkoutListingError || "Checkout details are unavailable."}
            </h1>
            <div className="owner-block-actions">
              <Link href="/browse">Browse Cards</Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const activeShippingProfile = shippingQuote?.profile || getShippingProfile(card.shippingProfileId);
  const shipping = shippingQuote?.shippingAmount ??
    getShippingAmountForProfile(activeShippingProfile.id);
  const estimatedTax = 0;
  const total = card.price + shipping + estimatedTax;
  const requiresPweAcknowledgement =
    activeShippingProfile.capabilities.buyerAcknowledgementRequired;
  const isOwnerCheckout = Boolean(currentUserId) && card.sellerId === currentUserId;
  const isCollectionCheckout = card.status === "collection";
  const showStripeCheckoutButton =
    card.status === "active" && card.price > 0;
  const isStripePublicConfigured = Boolean(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  );
  const canAttemptStripeCheckout =
    showStripeCheckoutButton &&
    isStripePublicConfigured &&
    !shippingQuoteError;
  const showUnavailableCheckoutNotice =
    !canAttemptStripeCheckout && showStripeCheckoutButton && !isStripeSuccess;

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
              {card.imageUrl ? (
                <Image
                  className="checkout-listing-image"
                  src={card.imageUrl}
                  alt={card.title}
                  width={112}
                  height={156}
                  unoptimized
                />
              ) : null}
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
                <Link className="text-link" href={`/cards/${card.id}`}>
                  View Card
                </Link>
              </div>
            </section>

            <section className="panel form-panel">
              <h2>Shipping Address</h2>
              <p>Shipping details are collected securely during Stripe checkout.</p>
              <div className="shipping-method-note">
                <strong>{activeShippingProfile.label}</strong>
                <p>{activeShippingProfile.buyerDescription}</p>
                <ul>
                  {activeShippingProfile.checkoutBullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="panel form-panel">
              <h2>Payment</h2>
              <p>
                Payment is completed securely through Stripe. GRAIL never stores
                your card number on this checkout page.
              </p>
            </section>

            <section className="panel protection-panel">
              <h2>GRAIL Buyer Protection</h2>
              <ul>
                <li>Secure payments through Stripe</li>
                <li>Protected by GRAIL Buyer Protection</li>
                <li>
                  {activeShippingProfile.capabilities.trackingSupported
                    ? "Tracked shipping after purchase"
                    : "Plain White Envelope does not include tracking"}
                </li>
                <li>Inspection window after delivery</li>
              </ul>
            </section>
          </div>

          <aside className="summary-panel panel">
            <h2>Order Summary</h2>
            <SummaryRow label="Item price" value={formatCurrency(card.price)} />
            <SummaryRow
              label={`Shipping (${activeShippingProfile.shortLabel})`}
              value={isShippingQuoteLoading ? "Loading..." : formatCurrency(shipping)}
            />
            <SummaryRow label="Estimated tax" value={formatCurrency(estimatedTax)} />
            <div className="summary-total">
              <span>Total</span>
              <strong>{formatCurrency(total)}</strong>
            </div>

            <div className="checkout-trust-strip">
              <span>Secure Stripe checkout</span>
              <span>GRAIL Protected Checkout</span>
              <span>3-day inspection window after delivery</span>
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
                <strong>Secure checkout is temporarily unavailable.</strong>
                <p>Please try again in a moment.</p>
              </div>
            ) : null}

            {stripeNotice ? (
              <p className="stripe-note">{stripeNotice}</p>
            ) : null}
            {shippingQuoteError ? <p className="stripe-error">{shippingQuoteError}</p> : null}
            {stripeError ? <p className="stripe-error">{stripeError}</p> : null}

            {requiresPweAcknowledgement && !isStripeSuccess && !isCollectionCheckout ? (
              <label className="pwe-acknowledgement">
                <input
                  type="checkbox"
                  checked={pweAcknowledged}
                  onChange={(event) => setPweAcknowledged(event.target.checked)}
                />
                <span>I understand this shipment will not include tracking.</span>
              </label>
            ) : null}

            <div className="checkout-legal">
              <p>
                By using GRAIL checkout, you agree to the Terms and understand
                GRAIL Protected Checkout, fees, and dispute policies.
              </p>
              <div>
                {checkoutLegalLinks.map((link) => (
                  <Link key={link.href} href={link.href}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {!isStripeSuccess && !isCollectionCheckout && canAttemptStripeCheckout ? (
              <button
                type="button"
                className="place-order"
                disabled={
                  isStartingStripeCheckout ||
                  isShippingQuoteLoading ||
                  (requiresPweAcknowledgement && !pweAcknowledged)
                }
                onClick={startStripeCheckout}
              >
                {isStartingStripeCheckout
                  ? "Starting Checkout..."
                  : "Continue to Secure Checkout"}
              </button>
            ) : null}

            {!isStripeSuccess && !isCollectionCheckout && showUnavailableCheckoutNotice ? (
              <p className="stripe-note">Secure checkout is handled by Stripe.</p>
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
  .place-order,
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

  .checkout-listing-image {
    width: 112px;
    max-height: 156px;
    object-fit: contain;
    border-radius: 10px;
    background: #030304;
    box-shadow: 0 18px 34px rgba(0,0,0,0.46);
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

  .shipping-method-note {
    margin-top: 12px;
    border: 1px solid rgba(201,205,211,0.16);
    border-radius: 10px;
    background: rgba(201,205,211,0.045);
    padding: 12px;
    display: grid;
    gap: 8px;
  }

  .shipping-method-note strong {
    color: #fff;
    font-size: 14px;
    font-weight: 900;
  }

  .shipping-method-note p {
    margin: 0;
  }

  .shipping-method-note ul {
    margin: 0;
    padding-left: 18px;
    color: #C9CDD3;
    font-size: 12px;
    line-height: 18px;
    font-weight: 800;
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

  .checkout-trust-strip {
    border: 1px solid rgba(231,222,208,0.16);
    border-radius: 10px;
    background: rgba(231,222,208,0.045);
    padding: 10px;
    display: grid;
    gap: 7px;
  }

  .checkout-trust-strip span {
    color: #C9CDD3;
    font-size: 11px;
    line-height: 15px;
    font-weight: 900;
  }

  .checkout-legal {
    border: 1px solid rgba(201,205,211,0.16);
    border-radius: 10px;
    background: rgba(201,205,211,0.045);
    padding: 12px;
    display: grid;
    gap: 10px;
  }

  .checkout-legal p {
    margin: 0;
    color: #a1a1aa;
    font-size: 11px;
    line-height: 16px;
    font-weight: 800;
  }

  .checkout-legal div {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .checkout-legal a {
    min-height: 30px;
    padding: 0 9px;
    border-radius: 8px;
    color: #E7DED0;
    font-size: 11px;
  }

  .place-order {
    min-height: 46px;
    background: #E7DED0;
    color: #111;
  }

  .pwe-acknowledgement {
    border: 1px solid rgba(231,222,208,0.22);
    border-radius: 10px;
    background: rgba(231,222,208,0.055);
    padding: 12px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    color: #E7DED0;
    font-size: 12px;
    line-height: 17px;
    font-weight: 900;
  }

  .pwe-acknowledgement input {
    margin-top: 2px;
  }

  .place-order:disabled {
    opacity: 0.62;
    cursor: wait;
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
