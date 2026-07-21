"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import PageShell from "../components/PageShell";

type OfferRole = "buyer" | "seller";
type OfferStatus = "pending" | "accepted" | "declined" | "countered" | "withdrawn" | "expired" | "completed";
type OfferTab = "received" | "sent" | "accepted" | "countered" | "declined" | "expired" | "completed";

type OfferView = {
  id: string;
  listingId: string | null;
  cardTitle: string;
  cardHref: string;
  buyerName: string;
  sellerName: string;
  amount: number;
  askingPrice: number;
  message: string | null;
  status: OfferStatus;
  statusLabel: string;
  role: OfferRole;
  createdAt: string | null;
  timeRemaining: string;
  canAccept: boolean;
  canDecline: boolean;
  canCounter: boolean;
  canWithdraw: boolean;
  canAcceptCounter: boolean;
  canDeclineCounter: boolean;
  canCheckout: boolean;
  shippingProfileId?: string;
  shippingProfileLabel?: string;
  requiresPweAcknowledgement?: boolean;
};

const offerTabs: Array<{ id: OfferTab; label: string }> = [
  { id: "received", label: "Received" },
  { id: "sent", label: "Sent" },
  { id: "accepted", label: "Accepted" },
  { id: "countered", label: "Countered" },
  { id: "declined", label: "Declined" },
  { id: "expired", label: "Expired" },
  { id: "completed", label: "Completed" },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

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

function getTabMatch(offer: OfferView, activeTab: OfferTab) {
  if (activeTab === "received") {
    return offer.role === "seller" && offer.status === "pending";
  }

  if (activeTab === "sent") {
    return offer.role === "buyer" && offer.status === "pending";
  }

  if (activeTab === "declined") {
    return offer.status === "declined" || offer.status === "withdrawn";
  }

  return offer.status === activeTab;
}

function getEmptyCopy(tab: OfferTab) {
  if (tab === "received") {
    return {
      title: "No received offers.",
      body: "Incoming buyer offers will appear here when collectors make real offers on your listings.",
    };
  }

  if (tab === "sent") {
    return {
      title: "No sent offers.",
      body: "Offers you send to sellers will appear here.",
    };
  }

  if (tab === "accepted") {
    return {
      title: "No accepted offers.",
      body: "Accepted offers awaiting payment will appear here.",
    };
  }

  if (tab === "countered") {
    return {
      title: "No counter offers.",
      body: "Counter offers will appear here when a seller negotiates the amount.",
    };
  }

  if (tab === "completed") {
    return {
      title: "No completed offers.",
      body: "Paid accepted offers move here after checkout creates an order.",
    };
  }

  if (tab === "expired") {
    return {
      title: "No expired offers.",
      body: "Expired offer transactions will appear here.",
    };
  }

  return {
    title: "No declined offers.",
    body: "Declined and withdrawn offers will appear here.",
  };
}

export default function OffersPage() {
  const [activeTab, setActiveTab] = useState<OfferTab>("received");
  const [offers, setOffers] = useState<OfferView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [counterOfferId, setCounterOfferId] = useState("");
  const [counterAmount, setCounterAmount] = useState("");
  const [busyOfferId, setBusyOfferId] = useState("");
  const [pweAcknowledgements, setPweAcknowledgements] = useState<Record<string, boolean>>({});

  const loadOffers = useCallback(async () => {
    setIsLoading(true);
    setStatusMessage("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setOffers([]);
      setStatusMessage("Sign in to view your offers.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/offers", {
        headers: {
          authorization: `Bearer ${session.access_token}`,
        },
      });
      const payload = (await response.json()) as {
        offers?: OfferView[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Offers could not be loaded.");
      }

      setOffers(payload.offers || []);
    } catch (error) {
      console.error("Offers load error:", error);
      setOffers([]);
      setStatusMessage(error instanceof Error ? error.message : "Offers could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOffers();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadOffers]);

  const tabCounts = useMemo(() => {
    return offerTabs.reduce<Record<OfferTab, number>>((counts, tab) => {
      counts[tab.id] = offers.filter((offer) => getTabMatch(offer, tab.id)).length;
      return counts;
    }, {
      received: 0,
      sent: 0,
      accepted: 0,
      countered: 0,
      declined: 0,
      expired: 0,
      completed: 0,
    });
  }, [offers]);

  const visibleOffers = useMemo(
    () => offers.filter((offer) => getTabMatch(offer, activeTab)),
    [activeTab, offers],
  );

  async function updateOffer(offerId: string, action: string, amount?: number) {
    setBusyOfferId(offerId);
    setStatusMessage("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setStatusMessage("Sign in to manage offers.");
      setBusyOfferId("");
      return;
    }

    try {
      const response = await fetch("/api/offers", {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${session.access_token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          offerId,
          action,
          counterAmount: amount,
        }),
      });
      const payload = (await response.json()) as {
        offer?: OfferView;
        error?: string;
      };

      if (!response.ok || !payload.offer) {
        throw new Error(payload.error || "Offer could not be updated.");
      }

      setOffers((items) =>
        items.map((offer) => (offer.id === offerId ? payload.offer as OfferView : offer)),
      );
      setCounterOfferId("");
      setCounterAmount("");
      setStatusMessage("Offer updated.");
    } catch (error) {
      console.error("Offer update error:", error);
      setStatusMessage(error instanceof Error ? error.message : "Offer could not be updated.");
    } finally {
      setBusyOfferId("");
    }
  }

  async function startCheckout(offer: OfferView) {
    setBusyOfferId(offer.id);
    setStatusMessage("");

    if (offer.requiresPweAcknowledgement && !pweAcknowledgements[offer.id]) {
      setStatusMessage("Acknowledge Plain White Envelope shipping before checkout.");
      setBusyOfferId("");
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setStatusMessage("Sign in to complete offer payment.");
      setBusyOfferId("");
      return;
    }

    try {
      const response = await fetch(`/api/offers/${offer.id}/checkout`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${session.access_token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          pweAcknowledged: Boolean(pweAcknowledgements[offer.id]),
        }),
      });
      const payload = (await response.json()) as {
        url?: string;
        error?: string;
      };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Offer checkout could not be started.");
      }

      window.location.assign(payload.url);
    } catch (error) {
      console.error("Offer checkout error:", error);
      setStatusMessage(error instanceof Error ? error.message : "Offer checkout could not be started.");
      setBusyOfferId("");
    }
  }

  function submitCounter(offerId: string) {
    const amount = Number(counterAmount);

    if (!amount || amount <= 0) {
      setStatusMessage("Enter a valid counter amount.");
      return;
    }

    void updateOffer(offerId, "counter", amount);
  }

  const emptyCopy = getEmptyCopy(activeTab);

  return (
    <PageShell
      className="offers-page"
      shellClassName="offers-shell"
      shellStyle={{ padding: "8px 0 80px" }}
      styles={pageStyles}
    >
        <section className="offers-hero">
          <div>
            <span>Marketplace Offers</span>
            <h1>Offers</h1>
            <p>Real buyer and seller negotiations connected to GRAIL checkout.</p>
          </div>
          <Link href="/browse">Browse Cards</Link>
        </section>

        <section className="offers-tabs" aria-label="Offer views">
          {offerTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? "active" : ""}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.label}</span>
              <strong>{tabCounts[tab.id]}</strong>
            </button>
          ))}
        </section>

        {statusMessage ? <p className="offers-message">{statusMessage}</p> : null}

        <section className="offers-panel">
          {isLoading ? (
            <article className="empty-offers">
              <h2>Loading offers...</h2>
              <p>Checking your real marketplace offer activity.</p>
            </article>
          ) : null}

          {!isLoading && visibleOffers.length === 0 ? (
            <article className="empty-offers">
              <h2>{emptyCopy.title}</h2>
              <p>{emptyCopy.body}</p>
            </article>
          ) : null}

          {!isLoading
            ? visibleOffers.map((offer) => (
                <article key={offer.id} className="offer-card">
                  <div className="offer-main">
                    <span>{offer.role === "seller" ? "Received Offer" : "Sent Offer"}</span>
                    <h2>{offer.cardTitle}</h2>
                    <p>
                      {offer.role === "seller"
                        ? `Buyer: ${offer.buyerName}`
                        : `Seller: ${offer.sellerName}`}
                    </p>
                    {offer.message ? <p className="offer-message">“{offer.message}”</p> : null}
                  </div>

                  <div className="offer-amount">
                    <span>Offer</span>
                    <strong>{formatCurrency(offer.amount)}</strong>
                    <small>
                      {offer.askingPrice > 0
                        ? `Ask ${formatCurrency(offer.askingPrice)}`
                        : "Ask unavailable"}
                    </small>
                  </div>

                  <div className="offer-status">
                    <strong className={`status status-${offer.status}`}>{offer.statusLabel}</strong>
                    <span>{formatDate(offer.createdAt)}</span>
                    <span>{offer.timeRemaining}</span>
                  </div>

                  <div className="offer-actions">
                    <Link href={offer.cardHref}>View Card</Link>
                    {offer.canCheckout ? (
                      <button
                        type="button"
                        disabled={busyOfferId === offer.id}
                        onClick={() => startCheckout(offer)}
                      >
                        {busyOfferId === offer.id ? "Opening..." : "Complete Payment"}
                      </button>
                    ) : null}
                    {offer.canAccept ? (
                      <button
                        type="button"
                        disabled={busyOfferId === offer.id}
                        onClick={() => updateOffer(offer.id, "accept")}
                      >
                        Accept
                      </button>
                    ) : null}
                    {offer.canCounter ? (
                      <button
                        type="button"
                        disabled={busyOfferId === offer.id}
                        onClick={() => {
                          setCounterOfferId(counterOfferId === offer.id ? "" : offer.id);
                          setCounterAmount(String(offer.amount || ""));
                        }}
                      >
                        Counter Offer
                      </button>
                    ) : null}
                    {offer.canDecline ? (
                      <button
                        type="button"
                        disabled={busyOfferId === offer.id}
                        onClick={() => updateOffer(offer.id, "decline")}
                      >
                        Decline
                      </button>
                    ) : null}
                    {offer.canWithdraw ? (
                      <button
                        type="button"
                        disabled={busyOfferId === offer.id}
                        onClick={() => updateOffer(offer.id, "withdraw")}
                      >
                        Withdraw
                      </button>
                    ) : null}
                    {offer.canAcceptCounter ? (
                      <button
                        type="button"
                        disabled={busyOfferId === offer.id}
                        onClick={() => updateOffer(offer.id, "accept_counter")}
                      >
                        Accept Counter
                      </button>
                    ) : null}
                    {offer.canDeclineCounter ? (
                      <button
                        type="button"
                        disabled={busyOfferId === offer.id}
                        onClick={() => updateOffer(offer.id, "decline_counter")}
                      >
                        Decline Counter
                      </button>
                    ) : null}
                  </div>

                  {offer.shippingProfileLabel ? (
                    <p className="offer-shipping-note">
                      Shipping: {offer.shippingProfileLabel}
                    </p>
                  ) : null}

                  {offer.canCheckout && offer.requiresPweAcknowledgement ? (
                    <label className="pwe-acknowledgement">
                      <input
                        type="checkbox"
                        checked={Boolean(pweAcknowledgements[offer.id])}
                        onChange={(event) =>
                          setPweAcknowledgements((items) => ({
                            ...items,
                            [offer.id]: event.target.checked,
                          }))
                        }
                      />
                      <span>I understand this shipment will not include tracking.</span>
                    </label>
                  ) : null}

                  {counterOfferId === offer.id ? (
                    <div className="counter-box">
                      <label htmlFor={`counter-${offer.id}`}>Counter amount</label>
                      <input
                        id={`counter-${offer.id}`}
                        type="number"
                        min="1"
                        step="0.01"
                        value={counterAmount}
                        onChange={(event) => setCounterAmount(event.target.value)}
                      />
                      <button
                        type="button"
                        disabled={busyOfferId === offer.id}
                        onClick={() => submitCounter(offer.id)}
                      >
                        Send Counter
                      </button>
                    </div>
                  ) : null}
                </article>
              ))
            : null}
        </section>
    </PageShell>
  );
}

const pageStyles = `
  .offers-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at 20% 0%, rgba(214, 191, 123, 0.08), transparent 28%),
      linear-gradient(180deg, #050505 0%, #0a0a0a 48%, #030303 100%);
    color: #f7f3e8;
  }

  .offers-shell {
    width: 1240px;
    margin: 0 auto;
    padding: 8px 0 80px;
  }

  .offers-hero {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    align-items: end;
    padding: 10px 0 28px;
  }

  .offers-hero span,
  .offer-main span,
  .offer-amount span,
  .offers-tabs button span {
    color: rgba(247, 243, 232, 0.52);
    font-size: 0.72rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
  }

  .offers-hero h1 {
    margin: 12px 0 10px;
    font-size: clamp(3rem, 7vw, 6.8rem);
    letter-spacing: -0.055em;
    line-height: 0.9;
  }

  .offers-hero p {
    margin: 0;
    color: rgba(247, 243, 232, 0.64);
    font-size: 1rem;
  }

  .offers-hero a,
  .offer-actions a,
  .offer-actions button,
  .counter-box button {
    border: 1px solid rgba(214, 191, 123, 0.38);
    border-radius: 999px;
    background: rgba(214, 191, 123, 0.08);
    color: #f8e8b0;
    padding: 0.78rem 1rem;
    text-decoration: none;
    font-weight: 700;
    cursor: pointer;
  }

  .offers-tabs {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 10px;
    margin: 0 0 18px;
  }

  .offers-tabs button {
    min-height: 72px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.035);
    color: #f7f3e8;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: space-between;
    padding: 14px;
    cursor: pointer;
  }

  .offers-tabs button.active {
    border-color: rgba(214, 191, 123, 0.55);
    background: rgba(214, 191, 123, 0.09);
    box-shadow: 0 18px 60px rgba(0, 0, 0, 0.28);
  }

  .offers-tabs strong {
    font-size: 1.2rem;
  }

  .offers-message {
    border: 1px solid rgba(214, 191, 123, 0.25);
    border-radius: 16px;
    background: rgba(214, 191, 123, 0.07);
    color: rgba(247, 243, 232, 0.82);
    padding: 14px 16px;
  }

  .offers-panel {
    display: grid;
    gap: 14px;
  }

  .offer-card,
  .empty-offers {
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    background: rgba(12, 12, 12, 0.86);
    box-shadow: 0 26px 90px rgba(0, 0, 0, 0.26);
  }

  .offer-card {
    display: grid;
    grid-template-columns: minmax(0, 1.7fr) minmax(150px, 0.6fr) minmax(150px, 0.6fr) minmax(220px, 0.9fr);
    gap: 20px;
    align-items: center;
    padding: 22px;
  }

  .offer-main h2 {
    margin: 8px 0;
    font-size: 1.28rem;
    letter-spacing: -0.02em;
  }

  .offer-main p,
  .offer-status span,
  .offer-amount small,
  .empty-offers p,
  .offer-message {
    color: rgba(247, 243, 232, 0.6);
    margin: 0;
  }

  .offer-message {
    margin-top: 10px;
    font-style: italic;
  }

  .offer-amount strong {
    display: block;
    margin: 8px 0 4px;
    font-size: 1.7rem;
    letter-spacing: -0.04em;
  }

  .offer-status {
    display: grid;
    gap: 6px;
  }

  .status {
    width: fit-content;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 999px;
    padding: 0.38rem 0.7rem;
    color: rgba(247, 243, 232, 0.82);
    background: rgba(255, 255, 255, 0.04);
  }

  .status-accepted,
  .status-completed {
    border-color: rgba(214, 191, 123, 0.42);
    color: #f8e8b0;
    background: rgba(214, 191, 123, 0.08);
  }

  .status-countered {
    border-color: rgba(229, 229, 229, 0.24);
    color: #f4f4f5;
  }

  .offer-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-end;
  }

  .offer-actions button:disabled,
  .counter-box button:disabled {
    opacity: 0.55;
    cursor: wait;
  }

  .offer-shipping-note,
  .pwe-acknowledgement {
    grid-column: 1 / -1;
  }

  .offer-shipping-note {
    margin: -6px 0 0;
    color: rgba(247, 243, 232, 0.62);
    font-size: 0.82rem;
    font-weight: 800;
  }

  .pwe-acknowledgement {
    border: 1px solid rgba(214, 191, 123, 0.22);
    border-radius: 14px;
    background: rgba(214, 191, 123, 0.06);
    padding: 12px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    color: #f8e8b0;
    font-size: 0.82rem;
    font-weight: 900;
  }

  .pwe-acknowledgement input {
    margin-top: 2px;
  }

  .counter-box {
    grid-column: 1 / -1;
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    gap: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding-top: 18px;
  }

  .counter-box label {
    width: 100%;
    color: rgba(247, 243, 232, 0.56);
    font-size: 0.78rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  .counter-box input {
    min-width: 180px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 14px;
    background: rgba(0, 0, 0, 0.5);
    color: #f7f3e8;
    padding: 0.85rem 1rem;
  }

  .empty-offers {
    padding: 42px;
    text-align: center;
  }

  .empty-offers h2 {
    margin: 0 0 10px;
    font-size: 1.8rem;
    letter-spacing: -0.03em;
  }

  @media (max-width: 920px) {
    .offers-hero {
      align-items: flex-start;
      flex-direction: column;
      padding-top: 10px;
    }

    .offers-tabs {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .offer-card {
      grid-template-columns: 1fr;
    }

    .offer-actions {
      justify-content: flex-start;
    }
  }
`;
