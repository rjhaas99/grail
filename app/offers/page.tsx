"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "../../lib/supabase";
import PageShell from "../components/PageShell";

type OfferRole = "buyer" | "seller";
type OfferStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "countered"
  | "withdrawn"
  | "expired"
  | "completed";
type OfferTab =
  | "received"
  | "sent"
  | "accepted"
  | "countered"
  | "declined"
  | "expired"
  | "completed";
type OfferViewMode = "grid" | "compact";
type OfferFilter = "raw" | "graded" | "sports" | "tcg" | "hot";
type OfferSort = "recently_updated" | "newest" | "oldest" | "highest_offer" | "lowest_offer";

type OfferView = {
  id: string;
  listingId: string | null;
  cardTitle: string;
  cardHref: string;
  buyerName: string;
  sellerName: string;
  buyerHref?: string;
  sellerHref?: string;
  amount: number;
  askingPrice: number;
  minimumOffer?: number;
  imageUrl?: string | null;
  player?: string;
  year?: string;
  brand?: string;
  cardNumber?: string;
  category?: string;
  cardType?: string;
  grader?: string;
  grade?: string;
  condition?: string;
  watchCount?: number;
  isHot?: boolean;
  isGraded?: boolean;
  isRaw?: boolean;
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
  orderId?: string | null;
  orderHref?: string;
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

const offerFilters: Array<{ id: OfferFilter; label: string }> = [
  { id: "raw", label: "Raw" },
  { id: "graded", label: "Graded" },
  { id: "sports", label: "Sports" },
  { id: "tcg", label: "TCG" },
  { id: "hot", label: "Hot" },
];

const offerSortOptions: Array<{ id: OfferSort; label: string }> = [
  { id: "recently_updated", label: "Recently Updated" },
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "highest_offer", label: "Highest Offer" },
  { id: "lowest_offer", label: "Lowest Offer" },
];

const offerViewPreferenceKey = "grail-offers-view";
const gridPageSize = 18;
const compactPageSize = 36;

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

function getOfferViewPreference(): OfferViewMode {
  if (typeof window === "undefined") {
    return "grid";
  }

  return window.localStorage.getItem(offerViewPreferenceKey) === "compact"
    ? "compact"
    : "grid";
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
      title: "No Received Offers",
      body: "Incoming buyer offers will appear here when collectors negotiate on your listings.",
    };
  }

  if (tab === "sent") {
    return {
      title: "No Sent Offers",
      body: "Offers you send to sellers will appear here while they wait for a response.",
    };
  }

  if (tab === "accepted") {
    return {
      title: "No Accepted Offers",
      body: "Accepted offers awaiting checkout or order creation will appear here.",
    };
  }

  if (tab === "countered") {
    return {
      title: "No Countered Offers",
      body: "Counter offers will appear here when a negotiation changes price.",
    };
  }

  if (tab === "completed") {
    return {
      title: "No Completed Offers",
      body: "Paid accepted offers move here after checkout creates an order.",
    };
  }

  if (tab === "expired") {
    return {
      title: "No Expired Offers",
      body: "Expired negotiation windows will appear here.",
    };
  }

  return {
    title: "No Declined Offers",
    body: "Declined and withdrawn offer negotiations will appear here.",
  };
}

function getDisplayStatus(offer: OfferView) {
  if (offer.status === "pending" && offer.role === "seller") {
    return "Received";
  }

  if (offer.status === "pending" && offer.role === "buyer") {
    return "Sent";
  }

  if (offer.status === "withdrawn") {
    return "Withdrawn";
  }

  return offer.statusLabel;
}

function getStatusClassName(offer: OfferView) {
  if (offer.status === "pending" && offer.role === "seller") {
    return "received";
  }

  if (offer.status === "pending" && offer.role === "buyer") {
    return "sent";
  }

  return offer.status;
}

function getCardMeta(offer: OfferView) {
  return [offer.year, offer.brand, offer.cardNumber].filter(Boolean).join(" · ");
}

function getRelationshipLabel(offer: OfferView) {
  return offer.role === "seller"
    ? `Buyer ${offer.buyerName}`
    : `Seller ${offer.sellerName}`;
}

function getCounterpartyName(offer: OfferView) {
  return offer.role === "seller" ? offer.buyerName : offer.sellerName;
}

function getCounterpartyHref(offer: OfferView) {
  return offer.role === "seller" ? offer.buyerHref : offer.sellerHref;
}

function renderCounterpartyLink(offer: OfferView, label = getCounterpartyName(offer)) {
  const href = getCounterpartyHref(offer);

  return href ? (
    <Link className="offer-collector-link" href={href}>
      {label}
    </Link>
  ) : (
    <span>{label}</span>
  );
}

function isSportsOffer(offer: OfferView) {
  const value = `${offer.category || ""} ${offer.cardTitle}`.toLowerCase();

  return ["sport", "baseball", "basketball", "football", "hockey", "soccer"].some((term) =>
    value.includes(term),
  );
}

function isTcgOffer(offer: OfferView) {
  const value = `${offer.category || ""} ${offer.cardTitle}`.toLowerCase();

  return ["tcg", "pokemon", "pokémon", "magic", "yugioh", "yu-gi-oh"].some((term) =>
    value.includes(term),
  );
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
  const [viewMode, setViewMode] = useState<OfferViewMode>(() => getOfferViewPreference());
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState<OfferFilter[]>([]);
  const [sortMode, setSortMode] = useState<OfferSort>("recently_updated");
  const [page, setPage] = useState(1);

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

  useEffect(() => {
    window.localStorage.setItem(offerViewPreferenceKey, viewMode);
  }, [viewMode]);

  const tabCounts = useMemo(() => {
    return offerTabs.reduce<Record<OfferTab, number>>(
      (counts, tab) => {
        counts[tab.id] = offers.filter((offer) => getTabMatch(offer, tab.id)).length;
        return counts;
      },
      {
        received: 0,
        sent: 0,
        accepted: 0,
        countered: 0,
        declined: 0,
        expired: 0,
        completed: 0,
      },
    );
  }, [offers]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const pageSize = viewMode === "compact" ? compactPageSize : gridPageSize;

  const getOfferSearchText = useCallback((offer: OfferView) => {
    return [
      offer.cardTitle,
      offer.player,
      offer.buyerName,
      offer.sellerName,
      offer.amount,
      offer.year,
      offer.brand,
      offer.cardNumber,
      offer.category,
      offer.statusLabel,
    ]
      .join(" ")
      .toLowerCase();
  }, []);

  const matchesFilters = useCallback(
    (offer: OfferView) => {
      if (activeFilters.length === 0) {
        return true;
      }

      return activeFilters.every((filter) => {
        if (filter === "raw") return Boolean(offer.isRaw);
        if (filter === "graded") return Boolean(offer.isGraded);
        if (filter === "sports") return isSportsOffer(offer);
        if (filter === "tcg") return isTcgOffer(offer);
        if (filter === "hot") return Boolean(offer.isHot || Number(offer.watchCount || 0) >= 15);
        return true;
      });
    },
    [activeFilters],
  );

  const sortOffers = useCallback(
    (items: OfferView[]) => {
      return items.slice().sort((first, second) => {
        if (sortMode === "highest_offer") {
          return second.amount - first.amount;
        }

        if (sortMode === "lowest_offer") {
          return first.amount - second.amount;
        }

        const firstTime = new Date(first.createdAt || 0).getTime();
        const secondTime = new Date(second.createdAt || 0).getTime();

        return sortMode === "oldest" ? firstTime - secondTime : secondTime - firstTime;
      });
    },
    [sortMode],
  );

  const visibleOffers = useMemo(() => {
    const matchingOffers = offers.filter((offer) => {
      if (!getTabMatch(offer, activeTab)) {
        return false;
      }

      if (!matchesFilters(offer)) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return getOfferSearchText(offer).includes(normalizedSearch);
    });

    return sortOffers(matchingOffers);
  }, [
    activeTab,
    getOfferSearchText,
    matchesFilters,
    normalizedSearch,
    offers,
    sortOffers,
  ]);

  const totalPages = Math.max(1, Math.ceil(visibleOffers.length / pageSize));
  const paginatedOffers = visibleOffers.slice((page - 1) * pageSize, page * pageSize);
  const emptyCopy = getEmptyCopy(activeTab);

  function resetContentState() {
    setPage(1);
  }

  function selectTab(tab: OfferTab) {
    setActiveTab(tab);
    resetContentState();
  }

  function updateSearch(value: string) {
    setSearchTerm(value);
    resetContentState();
  }

  function updateViewMode(mode: OfferViewMode) {
    setViewMode(mode);
    resetContentState();
  }

  function updateSortMode(value: OfferSort) {
    setSortMode(value);
    resetContentState();
  }

  function toggleFilter(filter: OfferFilter) {
    setActiveFilters((currentFilters) =>
      currentFilters.includes(filter)
        ? currentFilters.filter((currentFilter) => currentFilter !== filter)
        : [...currentFilters, filter],
    );
    resetContentState();
  }

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

  function renderOfferImage(offer: OfferView, variant: "grid" | "compact") {
    const size = variant === "grid" ? { width: 172, height: 230 } : { width: 54, height: 72 };

    return (
      <div className={`offer-image offer-image-${variant}`}>
        {offer.imageUrl ? (
          <Image
            src={offer.imageUrl}
            alt={offer.cardTitle}
            width={size.width}
            height={size.height}
            unoptimized
          />
        ) : (
          <div aria-hidden="true" className="offer-image-fallback">
            <span />
          </div>
        )}
      </div>
    );
  }

  function renderStatusPill(offer: OfferView) {
    return (
      <strong className={`status-pill status-${getStatusClassName(offer)}`}>
        {getDisplayStatus(offer)}
      </strong>
    );
  }

  function renderOfferActions(offer: OfferView) {
    const actions: ReactNode[] = [];

    if (offer.status === "pending" && offer.role === "seller") {
      if (offer.canAccept) {
        actions.push(
          <button
            key="accept"
            type="button"
            disabled={busyOfferId === offer.id}
            onClick={() => updateOffer(offer.id, "accept")}
          >
            Accept
          </button>,
        );
      }
      if (offer.canCounter) {
        actions.push(
          <button
            key="counter"
            type="button"
            disabled={busyOfferId === offer.id}
            onClick={() => {
              setCounterOfferId(counterOfferId === offer.id ? "" : offer.id);
              setCounterAmount(String(offer.amount || ""));
            }}
          >
            Counter
          </button>,
        );
      }
      if (offer.canDecline) {
        actions.push(
          <button
            key="decline"
            type="button"
            disabled={busyOfferId === offer.id}
            onClick={() => updateOffer(offer.id, "decline")}
          >
            Decline
          </button>,
        );
      }
      actions.push(<Link key="message" href="/messages">Message</Link>);
      actions.push(<Link key="view" href={offer.cardHref}>View Card</Link>);
    } else if (offer.status === "pending" && offer.role === "buyer") {
      actions.push(<Link key="view" href={offer.cardHref}>View</Link>);
      if (offer.canWithdraw) {
        actions.push(
          <button
            key="withdraw"
            type="button"
            disabled={busyOfferId === offer.id}
            onClick={() => updateOffer(offer.id, "withdraw")}
          >
            Withdraw
          </button>,
        );
      }
      actions.push(<Link key="message" href="/messages">Message</Link>);
    } else if (offer.status === "countered") {
      if (offer.canAcceptCounter) {
        actions.push(
          <button
            key="accept-counter"
            type="button"
            disabled={busyOfferId === offer.id}
            onClick={() => updateOffer(offer.id, "accept_counter")}
          >
            Accept Counter
          </button>,
        );
      }
      if (offer.canDeclineCounter) {
        actions.push(
          <button
            key="decline-counter"
            type="button"
            disabled={busyOfferId === offer.id}
            onClick={() => updateOffer(offer.id, "decline_counter")}
          >
            Decline Counter
          </button>,
        );
      }
      actions.push(<Link key="message" href="/messages">Message</Link>);
      actions.push(<Link key="view" href={offer.cardHref}>View Card</Link>);
    } else if (offer.status === "accepted") {
      if (offer.canCheckout) {
        actions.push(
          <button
            key="checkout"
            type="button"
            disabled={busyOfferId === offer.id}
            onClick={() => startCheckout(offer)}
          >
            {busyOfferId === offer.id ? "Opening..." : "Checkout"}
          </button>,
        );
      }
      if (offer.orderId) {
        actions.push(<Link key="order" href={offer.orderHref || "/orders"}>View Order</Link>);
      }
      actions.push(<Link key="view" href={offer.cardHref}>View Card</Link>);
    } else if (offer.status === "completed") {
      actions.push(<Link key="order" href={offer.orderHref || "/orders"}>View Order</Link>);
      actions.push(<Link key="view" href={offer.cardHref}>View Card</Link>);
    } else {
      actions.push(<Link key="view" href={offer.cardHref}>View Card</Link>);
    }

    return <div className="offer-actions">{actions}</div>;
  }

  function renderOfferFooter(offer: OfferView) {
    return (
      <>
        {offer.shippingProfileLabel ? (
          <p className="offer-shipping-note">Shipping: {offer.shippingProfileLabel}</p>
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
      </>
    );
  }

  function renderEmptyState() {
    return (
      <article className="empty-offers">
        <div className="empty-offer-mark" aria-hidden="true" />
        <h2>{emptyCopy.title}</h2>
        <p>{emptyCopy.body}</p>
      </article>
    );
  }

  function renderGrid() {
    if (isLoading) {
      return (
        <article className="empty-offers">
          <div className="empty-offer-mark" aria-hidden="true" />
          <h2>Loading offers</h2>
          <p>Checking your real marketplace negotiations.</p>
        </article>
      );
    }

    if (visibleOffers.length === 0) {
      return renderEmptyState();
    }

    return (
      <section className="offers-grid" aria-label="Offer negotiations grid">
        {paginatedOffers.map((offer) => (
          <article key={offer.id} className="offer-negotiation-card">
            <div className="offer-card-top">
              {renderStatusPill(offer)}
              <span>{offer.role === "seller" ? "Received Offer" : "Sent Offer"}</span>
            </div>
            <Link href={offer.cardHref} className="offer-image-link">
              {renderOfferImage(offer, "grid")}
            </Link>
            <div className="offer-card-copy">
              <h2>{offer.cardTitle}</h2>
              {getCardMeta(offer) ? <p>{getCardMeta(offer)}</p> : null}
              {renderCounterpartyLink(offer, getRelationshipLabel(offer))}
            </div>
            <div className="offer-metric-grid">
              <div>
                <span>Offer Amount</span>
                <strong>{formatCurrency(offer.amount)}</strong>
              </div>
              <div>
                <span>Minimum Offer</span>
                <strong>
                  {Number(offer.minimumOffer || 0) > 0
                    ? formatCurrency(Number(offer.minimumOffer))
                    : "Not set"}
                </strong>
              </div>
              <div>
                <span>Asking Price</span>
                <strong>
                  {offer.askingPrice > 0 ? formatCurrency(offer.askingPrice) : "Unavailable"}
                </strong>
              </div>
              <div>
                <span>Time Remaining</span>
                <strong>{offer.timeRemaining || "No expiration set"}</strong>
              </div>
            </div>
            <div className="offer-signal-row">
              <span>{Number(offer.watchCount || 0)} watchers</span>
              <span>{formatDate(offer.createdAt)}</span>
              {offer.message ? <span>Includes message</span> : null}
            </div>
            {offer.message ? <p className="offer-message">“{offer.message}”</p> : null}
            {renderOfferActions(offer)}
            {renderOfferFooter(offer)}
          </article>
        ))}
      </section>
    );
  }

  function renderCompact() {
    if (isLoading) {
      return (
        <article className="empty-offers">
          <div className="empty-offer-mark" aria-hidden="true" />
          <h2>Loading offers</h2>
          <p>Checking your real marketplace negotiations.</p>
        </article>
      );
    }

    if (visibleOffers.length === 0) {
      return renderEmptyState();
    }

    return (
      <section className="offers-compact" aria-label="Offer negotiations compact view">
        <div className="offers-compact-header">
          <span>Card</span>
          <span>With</span>
          <span>Offer</span>
          <span>Minimum</span>
          <span>Status</span>
          <span>Time</span>
          <span>Updated</span>
          <span>Actions</span>
        </div>
        {paginatedOffers.map((offer) => (
          <article key={offer.id} className="offers-compact-row">
            <div className="compact-card-cell">
              {renderOfferImage(offer, "compact")}
              <div>
                <strong>{offer.cardTitle}</strong>
                <span>{getCardMeta(offer) || offer.player || offer.category || "GRAIL card"}</span>
              </div>
            </div>
            <span>{renderCounterpartyLink(offer)}</span>
            <strong>{formatCurrency(offer.amount)}</strong>
            <span>
              {Number(offer.minimumOffer || 0) > 0
                ? formatCurrency(Number(offer.minimumOffer))
                : "Not set"}
            </span>
            {renderStatusPill(offer)}
            <span>{offer.timeRemaining || "No expiration set"}</span>
            <span>{formatDate(offer.createdAt)}</span>
            <div>
              {renderOfferActions(offer)}
              {renderOfferFooter(offer)}
            </div>
          </article>
        ))}
      </section>
    );
  }

  function renderPagination() {
    if (isLoading || totalPages <= 1) {
      return null;
    }

    return (
      <div className="offers-pagination">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
        >
          Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
        >
          Next
        </button>
      </div>
    );
  }

  return (
    <PageShell
      className="offers-page"
      shellClassName="offers-shell"
      shellStyle={{ padding: "8px 0 80px" }}
      styles={pageStyles}
    >
      <section className="offers-hero panel">
        <div>
          <span>Marketplace Offers</span>
          <h1>Offers</h1>
          <p>Real buyer and seller negotiations connected to GRAIL checkout.</p>
        </div>
        <Link href="/browse">Browse Cards</Link>
      </section>

      <section className="offer-summary-row" aria-label="Quick offer summary">
        {offerTabs.map((tab) => (
          <article key={tab.id} className="offer-summary-stat">
            <span>{tab.label}</span>
            <strong>{tabCounts[tab.id]}</strong>
          </article>
        ))}
      </section>

      <section className="offers-nav panel" aria-label="Offer negotiation views">
        {offerTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? "is-active" : ""}
            onClick={() => selectTab(tab.id)}
          >
            {tab.label}
            <span>{tabCounts[tab.id]}</span>
          </button>
        ))}
      </section>

      <section className="offers-workspace panel">
        <div className="offers-toolbar">
          <label className="offers-search">
            <span>Search Offers</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => updateSearch(event.target.value)}
              placeholder="Search player, card, buyer, seller, amount, year, brand..."
            />
          </label>
          <div className="view-toggle" aria-label="Offer view">
            <button
              type="button"
              className={viewMode === "grid" ? "is-active" : ""}
              onClick={() => updateViewMode("grid")}
            >
              Grid
            </button>
            <button
              type="button"
              className={viewMode === "compact" ? "is-active" : ""}
              onClick={() => updateViewMode("compact")}
            >
              Compact
            </button>
          </div>
          <label className="offers-sort">
            <span>Sort</span>
            <select
              value={sortMode}
              onChange={(event) => updateSortMode(event.target.value as OfferSort)}
            >
              {offerSortOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="offers-filter-row" aria-label="Offer filters">
          {offerFilters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={activeFilters.includes(filter.id) ? "is-active" : ""}
              onClick={() => toggleFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {statusMessage ? <p className="offers-message">{statusMessage}</p> : null}

        <div className="offers-content-heading">
          <div>
            <span>{offerTabs.find((tab) => tab.id === activeTab)?.label}</span>
            <h2>{offerTabs.find((tab) => tab.id === activeTab)?.label} Offers</h2>
          </div>
          <p>
            {visibleOffers.length} {visibleOffers.length === 1 ? "negotiation" : "negotiations"}
          </p>
        </div>

        {viewMode === "grid" ? renderGrid() : renderCompact()}
        {renderPagination()}
      </section>
    </PageShell>
  );
}

const pageStyles = `
  .offers-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at 50% -120px, rgba(201,205,211,0.08), transparent 32%),
      linear-gradient(180deg, #000 0%, #030304 58%, #000 100%);
    color: #fafafa;
    font-family: Arial, Helvetica, sans-serif;
  }

  .offers-shell {
    width: 1240px;
    margin: 0 auto;
    padding: 8px 0 80px;
  }

  .panel {
    border: 1px solid #1d1d22;
    border-radius: 12px;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.006)),
      rgba(5,5,6,0.92);
    box-shadow: 0 18px 44px rgba(0,0,0,0.28);
  }

  .offers-hero {
    margin-top: 10px;
    padding: 18px;
    display: flex;
    justify-content: space-between;
    gap: 20px;
    align-items: end;
  }

  .offers-hero span,
  .offer-summary-stat span,
  .offers-search span,
  .offers-sort span,
  .offers-content-heading span,
  .offer-card-top span,
  .offer-metric-grid span {
    color: #C9CDD3;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .offers-hero h1 {
    margin: 8px 0 4px;
    color: #fff;
    font-size: 42px;
    line-height: 46px;
    font-weight: 900;
    letter-spacing: -0.04em;
  }

  .offers-hero p,
  .offers-content-heading p,
  .offer-card-copy p,
  .offer-card-copy span,
  .offer-message,
  .offer-shipping-note,
  .empty-offers p,
  .offer-signal-row span {
    margin: 0;
    color: #a1a1aa;
    font-size: 13px;
    line-height: 18px;
    font-weight: 800;
  }

  .offer-collector-link {
    color: inherit;
    font: inherit;
    text-decoration: none;
  }

  .offer-collector-link:hover {
    color: #fff;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .offers-hero a,
  .offer-actions a,
  .offer-actions button,
  .counter-box button,
  .view-toggle button,
  .offers-filter-row button,
  .offers-nav button,
  .offers-pagination button {
    border: 1px solid rgba(231,222,208,0.28);
    border-radius: 10px;
    background: rgba(231,222,208,0.055);
    color: #fff;
    min-height: 36px;
    padding: 0 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
  }

  .offers-hero a:hover,
  .offer-actions a:hover,
  .offer-actions button:hover:not(:disabled),
  .counter-box button:hover:not(:disabled),
  .view-toggle button:hover,
  .offers-filter-row button:hover,
  .offers-nav button:hover,
  .offers-pagination button:hover:not(:disabled) {
    border-color: rgba(231,222,208,0.62);
    background: rgba(231,222,208,0.11);
    box-shadow: 0 0 18px rgba(201,205,211,0.13);
  }

  .offer-summary-row {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 10px;
  }

  .offer-summary-stat {
    border: 1px solid rgba(201,205,211,0.12);
    border-radius: 12px;
    background: rgba(8,8,10,0.58);
    min-height: 72px;
    padding: 11px;
    display: grid;
    gap: 6px;
  }

  .offer-summary-stat strong {
    color: #fff;
    font-size: 24px;
    line-height: 28px;
    font-weight: 900;
  }

  .offers-nav {
    margin-top: 14px;
    padding: 10px;
    display: flex;
    gap: 8px;
    overflow-x: auto;
  }

  .offers-nav button {
    flex: 0 0 auto;
    border-color: rgba(201,205,211,0.14);
    background: rgba(8,8,10,0.72);
    color: #C9CDD3;
  }

  .offers-nav button.is-active,
  .offers-filter-row button.is-active,
  .view-toggle button.is-active {
    border-color: rgba(231,222,208,0.48);
    background: rgba(231,222,208,0.12);
    color: #fff;
  }

  .offers-nav button span {
    margin-left: 8px;
    border-radius: 999px;
    background: rgba(201,205,211,0.1);
    color: #fff;
    min-width: 22px;
    padding: 3px 7px;
    font-size: 10px;
    line-height: 12px;
  }

  .offers-workspace {
    margin-top: 14px;
    padding: 14px;
    display: grid;
    gap: 14px;
  }

  .offers-toolbar {
    display: grid;
    grid-template-columns: minmax(280px, 1fr) auto minmax(180px, auto);
    gap: 10px;
    align-items: end;
  }

  .offers-search,
  .offers-sort {
    display: grid;
    gap: 7px;
  }

  .offers-search input,
  .offers-sort select,
  .counter-box input {
    border: 1px solid #202026;
    border-radius: 10px;
    background: rgba(8,8,10,0.84);
    color: #fff;
    min-height: 40px;
    padding: 0 11px;
    font-size: 13px;
    font-weight: 800;
    outline: none;
  }

  .view-toggle,
  .offers-filter-row,
  .offer-actions,
  .offer-signal-row {
    display: flex;
    gap: 7px;
    flex-wrap: wrap;
  }

  .offers-filter-row button {
    min-height: 32px;
    color: #C9CDD3;
  }

  .offers-message {
    margin: 0;
    border: 1px solid rgba(201,205,211,0.18);
    border-radius: 10px;
    background: rgba(201,205,211,0.055);
    color: #C9CDD3;
    padding: 10px 12px;
    font-size: 12px;
    line-height: 16px;
    font-weight: 900;
  }

  .offers-content-heading {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: end;
  }

  .offers-content-heading h2,
  .offer-card-copy h2,
  .empty-offers h2 {
    margin: 0;
    color: #fff;
    font-size: 20px;
    line-height: 24px;
    font-weight: 900;
  }

  .offers-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .offer-negotiation-card {
    border: 1px solid #202026;
    border-radius: 12px;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.006)),
      rgba(8,8,10,0.84);
    padding: 12px;
    display: grid;
    gap: 11px;
    align-content: start;
  }

  .offer-card-top {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: center;
  }

  .offer-image-link {
    text-decoration: none;
  }

  .offer-image {
    border: 1px solid rgba(201,205,211,0.12);
    border-radius: 12px;
    background: radial-gradient(circle at 50% 20%, rgba(231,222,208,0.08), transparent 42%), #050506;
    display: grid;
    place-items: center;
    overflow: hidden;
  }

  .offer-image-grid {
    min-height: 226px;
  }

  .offer-image-compact {
    width: 54px;
    height: 72px;
  }

  .offer-image img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .offer-image-fallback {
    width: 42%;
    aspect-ratio: 0.72;
    border: 1px solid rgba(231,222,208,0.22);
    border-radius: 8px;
    background: rgba(231,222,208,0.055);
  }

  .offer-card-copy {
    display: grid;
    gap: 5px;
  }

  .offer-metric-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .offer-metric-grid div {
    border: 1px solid rgba(201,205,211,0.12);
    border-radius: 10px;
    background: rgba(201,205,211,0.035);
    padding: 9px;
    display: grid;
    gap: 4px;
  }

  .offer-metric-grid strong {
    color: #fff;
    font-size: 15px;
    line-height: 19px;
    font-weight: 900;
  }

  .status-pill {
    border: 1px solid rgba(201,205,211,0.28);
    border-radius: 999px;
    background: rgba(201,205,211,0.08);
    color: #C9CDD3;
    width: fit-content;
    padding: 5px 9px;
    font-size: 10px;
    line-height: 12px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .status-received,
  .status-accepted,
  .status-completed {
    color: #86efac;
    background: rgba(52,211,153,0.08);
    border-color: rgba(52,211,153,0.24);
  }

  .status-sent,
  .status-countered {
    color: #E7DED0;
    background: rgba(231,222,208,0.07);
    border-color: rgba(231,222,208,0.24);
  }

  .status-declined,
  .status-withdrawn,
  .status-expired {
    color: #fb7185;
    background: rgba(244,63,94,0.08);
    border-color: rgba(244,63,94,0.24);
  }

  .offer-actions {
    justify-content: flex-start;
  }

  .offer-actions button:disabled,
  .counter-box button:disabled,
  .offers-pagination button:disabled {
    opacity: 0.55;
    cursor: wait;
  }

  .offer-shipping-note,
  .pwe-acknowledgement,
  .counter-box {
    grid-column: 1 / -1;
  }

  .offer-message {
    border-left: 2px solid rgba(231,222,208,0.22);
    padding-left: 10px;
    font-style: italic;
  }

  .pwe-acknowledgement {
    border: 1px solid rgba(231,222,208,0.22);
    border-radius: 10px;
    background: rgba(231,222,208,0.055);
    padding: 10px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    color: #E7DED0;
    font-size: 12px;
    font-weight: 900;
  }

  .pwe-acknowledgement input {
    margin-top: 2px;
  }

  .counter-box {
    border-top: 1px solid rgba(201,205,211,0.1);
    padding-top: 12px;
    display: flex;
    align-items: end;
    gap: 9px;
    flex-wrap: wrap;
  }

  .counter-box label {
    width: 100%;
    color: #C9CDD3;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .counter-box input {
    width: 190px;
  }

  .offers-compact {
    display: grid;
    gap: 8px;
  }

  .offers-compact-header,
  .offers-compact-row {
    display: grid;
    gap: 10px;
    align-items: center;
    grid-template-columns: minmax(260px, 1.35fr) 120px 90px 100px 105px 120px 92px minmax(190px, auto);
  }

  .offers-compact-header {
    border-bottom: 1px solid rgba(201,205,211,0.1);
    padding: 0 10px 8px;
    color: #85858f;
    font-size: 10px;
    line-height: 13px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .offers-compact-row {
    border: 1px solid #202026;
    border-radius: 10px;
    background: rgba(8,8,10,0.76);
    padding: 10px;
  }

  .compact-card-cell {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 10px;
    align-items: center;
  }

  .offers-compact-row strong,
  .compact-card-cell strong {
    color: #fff;
    font-size: 13px;
    line-height: 17px;
    font-weight: 900;
  }

  .offers-compact-row span,
  .compact-card-cell span {
    color: #C9CDD3;
    font-size: 12px;
    line-height: 16px;
    font-weight: 800;
  }

  .empty-offers {
    border: 1px dashed rgba(201,205,211,0.2);
    border-radius: 12px;
    background: rgba(8,8,10,0.45);
    min-height: 220px;
    padding: 26px;
    display: grid;
    place-items: center;
    text-align: center;
    align-content: center;
    gap: 10px;
  }

  .empty-offer-mark {
    width: 48px;
    height: 48px;
    border: 1px solid rgba(231,222,208,0.22);
    border-radius: 50%;
    background:
      linear-gradient(135deg, transparent 47%, rgba(231,222,208,0.2) 48%, rgba(231,222,208,0.2) 52%, transparent 53%),
      rgba(231,222,208,0.055);
  }

  .offers-pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
  }

  .offers-pagination span {
    color: #C9CDD3;
    font-size: 12px;
    font-weight: 900;
  }

  @media (max-width: 1100px) {
    .offers-shell {
      width: calc(100vw - 32px);
    }

    .offer-summary-row,
    .offers-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .offers-toolbar {
      grid-template-columns: 1fr;
    }

    .offers-compact-header {
      display: none;
    }

    .offers-compact-row {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 640px) {
    .offers-hero {
      align-items: flex-start;
      flex-direction: column;
    }

    .offer-summary-row,
    .offers-grid,
    .offer-metric-grid {
      grid-template-columns: 1fr;
    }

    .offers-content-heading {
      align-items: flex-start;
      flex-direction: column;
    }
  }
`;
