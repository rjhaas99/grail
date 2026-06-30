"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Header from "../components/Header";
import {
  type MockOffer,
  type OfferStatus,
  mockReceivedOffers,
  mockSentOffers,
} from "../lib/mockData";

type OfferSource = "mock" | "supabase";
type DisplayOffer = MockOffer & {
  source: OfferSource;
  listingId?: string;
  buyerId?: string | null;
  sellerId?: string | null;
  createdAt?: string | null;
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
  status: string;
  createdAt: string;
  cardRoute: string;
};

type SupabaseOfferRow = {
  id: string;
  listing_id: string | null;
  buyer_id: string | null;
  seller_id: string | null;
  offer_amount: number | null;
  amount: number | null;
  message: string | null;
  status: string | null;
  created_at: string | null;
};

type ListingRow = {
  id: string;
  title: string | null;
  price: number | null;
  seller_id: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
};

const initialSentOffers: DisplayOffer[] = mockSentOffers.map((offer) => ({
  ...offer,
  source: "mock",
}));
const initialReceivedOffers: DisplayOffer[] = mockReceivedOffers.map((offer) => ({
  ...offer,
  source: "mock",
}));
const mockOfferStorageKey = "grail-mock-offers";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatOfferStatus(status: string | null): OfferStatus {
  const normalized = (status || "pending").toLowerCase();

  if (normalized === "accepted") return "Accepted";
  if (normalized === "declined") return "Declined";
  if (normalized === "withdrawn") return "Withdrawn";
  if (normalized === "countered") return "Countered";
  return "Pending";
}

function getProfileName(profile: ProfileRow | undefined, fallback: string) {
  return profile?.full_name || profile?.username || fallback;
}

function getOfferDate(value: string | null) {
  if (!value) {
    return "Recently";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

function writeLocalMockOffers(offers: LocalMockOffer[]) {
  window.localStorage.setItem(mockOfferStorageKey, JSON.stringify(offers));
}

function mapLocalMockOffer(offer: LocalMockOffer): DisplayOffer {
  return {
    id: offer.id,
    cardId: offer.listing_id,
    listingId: offer.listing_id,
    cardTitle: offer.cardTitle,
    cardHref: offer.cardRoute,
    cardRoute: offer.cardRoute,
    sellerName: offer.sellerName,
    seller: offer.sellerName,
    buyerName: offer.buyerName || "You",
    buyer: offer.buyerName || "You",
    offerAmount: offer.amount,
    amount: offer.amount,
    askingPrice: offer.askingPrice,
    status: formatOfferStatus(offer.status),
    timeLeft: getOfferDate(offer.createdAt),
    messageRoute: "/messages",
    source: "mock",
    createdAt: offer.createdAt,
  };
}

export default function OffersPage() {
  const [activeTab, setActiveTab] = useState<"sent" | "received">("sent");
  const [sentOffers, setSentOffers] = useState(initialSentOffers);
  const [receivedOffers, setReceivedOffers] = useState(initialReceivedOffers);
  const [counterOfferId, setCounterOfferId] = useState("");
  const [counterAmount, setCounterAmount] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [offerNotice, setOfferNotice] = useState("Demo offers");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadOffers() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      setCurrentUserId(session?.user.id || "");
      const storedMockOffers = readLocalMockOffers().map(mapLocalMockOffer);

      if (!session?.user.id) {
        setSentOffers(storedMockOffers.length > 0 ? storedMockOffers : initialSentOffers);
        setReceivedOffers(initialReceivedOffers);
        setOfferNotice(
          storedMockOffers.length > 0
            ? "Mock offers"
            : "Sign in to view real offers. Showing demo offers.",
        );
        return;
      }

      try {
        const { data, error } = await supabase
          .from("offers")
          .select("id, listing_id, buyer_id, seller_id, offer_amount, amount, message, status, created_at")
          .or(`buyer_id.eq.${session.user.id},seller_id.eq.${session.user.id}`)
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        const rows = (data || []) as SupabaseOfferRow[];

        if (rows.length === 0) {
          setSentOffers(storedMockOffers.length > 0 ? storedMockOffers : initialSentOffers);
          setReceivedOffers(initialReceivedOffers);
          setOfferNotice(
            storedMockOffers.length > 0
              ? "Mock offers"
              : "No real offers yet. Showing demo offers.",
          );
          return;
        }

        const listingIds = Array.from(
          new Set(
            rows
              .map((offer) => offer.listing_id)
              .filter((listingId): listingId is string => Boolean(listingId)),
          ),
        );
        const profileIds = Array.from(
          new Set(
            rows
              .flatMap((offer) => [offer.buyer_id, offer.seller_id])
              .filter((profileId): profileId is string => Boolean(profileId)),
          ),
        );
        const listingsById = new Map<string, ListingRow>();
        const profilesById = new Map<string, ProfileRow>();

        if (listingIds.length > 0) {
          const { data: listingData, error: listingError } = await supabase
            .from("listings")
            .select("id, title, price, seller_id")
            .in("id", listingIds);

          if (listingError) {
            console.error("Offers listing fetch error:", listingError);
          } else {
            ((listingData || []) as ListingRow[]).forEach((listing) => {
              listingsById.set(listing.id, listing);
            });
          }
        }

        if (profileIds.length > 0) {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("id, full_name, username")
            .in("id", profileIds);

          if (profileError) {
            console.error("Offers profile fetch error:", profileError);
          } else {
            ((profileData || []) as ProfileRow[]).forEach((profile) => {
              profilesById.set(profile.id, profile);
            });
          }
        }

        const mappedOffers: DisplayOffer[] = rows.map((offer) => {
          const listing = offer.listing_id
            ? listingsById.get(offer.listing_id)
            : undefined;
          const cardTitle = listing?.title || "GRAIL Listing";
          const cardRoute = `/cards/${offer.listing_id || ""}`;
          const displayAmount = Number(offer.offer_amount ?? offer.amount ?? 0);

          return {
            id: offer.id,
            cardId: offer.listing_id || "",
            listingId: offer.listing_id || "",
            cardTitle,
            cardHref: cardRoute,
            cardRoute,
            sellerName: getProfileName(
              offer.seller_id ? profilesById.get(offer.seller_id) : undefined,
              "GRAIL Seller",
            ),
            seller: getProfileName(
              offer.seller_id ? profilesById.get(offer.seller_id) : undefined,
              "GRAIL Seller",
            ),
            buyerName: getProfileName(
              offer.buyer_id ? profilesById.get(offer.buyer_id) : undefined,
              "GRAIL Buyer",
            ),
            buyer: getProfileName(
              offer.buyer_id ? profilesById.get(offer.buyer_id) : undefined,
              "GRAIL Buyer",
            ),
            offerAmount: displayAmount,
            amount: displayAmount,
            askingPrice: Number(listing?.price || 0),
            status: formatOfferStatus(offer.status),
            timeLeft: getOfferDate(offer.created_at),
            messageRoute: "/messages",
            source: "supabase",
            buyerId: offer.buyer_id,
            sellerId: offer.seller_id,
            createdAt: offer.created_at,
          };
        });

        if (!isMounted) {
          return;
        }

        setSentOffers(
          [
            ...mappedOffers.filter((offer) => offer.buyerId === session.user.id),
            ...storedMockOffers,
          ],
        );
        setReceivedOffers(
          mappedOffers.filter((offer) => offer.sellerId === session.user.id),
        );
        setOfferNotice("Live offers");
      } catch (error) {
        console.warn("Supabase offers table not available; using mock offer flow.", error);

        if (!isMounted) {
          return;
        }

        const storedMockOffers = readLocalMockOffers().map(mapLocalMockOffer);
        setSentOffers(storedMockOffers.length > 0 ? storedMockOffers : initialSentOffers);
        setReceivedOffers(initialReceivedOffers);
        setOfferNotice(storedMockOffers.length > 0 ? "Mock offers" : "Demo offers");
      }
    }

    loadOffers();

    return () => {
      isMounted = false;
    };
  }, []);

  async function updateSentStatus(offer: DisplayOffer, status: OfferStatus) {
    if (offer.source === "supabase") {
      try {
        const { error } = await supabase
          .from("offers")
          .update({ status: status.toLowerCase() })
          .eq("id", offer.id)
          .eq("buyer_id", currentUserId);

        if (error) {
          throw error;
        }
      } catch (error) {
        console.error("Offer withdraw update error:", error);
        setStatusMessage("Offer status could not be updated.");
        return;
      }
    }

    if (offer.source === "mock") {
      const nextStoredOffers = readLocalMockOffers().map((storedOffer) =>
        storedOffer.id === offer.id
          ? { ...storedOffer, status: status.toLowerCase() }
          : storedOffer,
      );
      writeLocalMockOffers(nextStoredOffers);
    }

    setSentOffers((offers) =>
      offers.map((item) => (item.id === offer.id ? { ...item, status } : item)),
    );
    setStatusMessage(status === "Withdrawn" ? "Offer withdrawn." : "Offer updated.");
  }

  async function updateReceivedStatus(offer: DisplayOffer, status: OfferStatus) {
    if (offer.source === "supabase") {
      try {
        const { error } = await supabase
          .from("offers")
          .update({ status: status.toLowerCase() })
          .eq("id", offer.id)
          .eq("seller_id", currentUserId);

        if (error) {
          throw error;
        }
      } catch (error) {
        console.error("Offer received status update error:", error);
        setStatusMessage("Offer status could not be updated.");
        return;
      }
    }

    setReceivedOffers((offers) =>
      offers.map((item) => (item.id === offer.id ? { ...item, status } : item)),
    );
    setStatusMessage(`Offer ${status.toLowerCase()}.`);
  }

  function submitCounter(id: string) {
    if (!counterAmount.trim()) {
      return;
    }

    setReceivedOffers((offers) =>
      offers.map((offer) =>
        offer.id === id
          ? { ...offer, amount: Number(counterAmount), status: "Countered" }
          : offer,
      ),
    );
    setCounterOfferId("");
    setCounterAmount("");
  }

  return (
    <main className="offers-page">
      <style>{pageStyles}</style>
      <div className="offers-shell">
        <Header />

        <section className="page-heading">
          <div>
            <span>Offers</span>
            <h1>Offers</h1>
            <p>Manage sent offers, incoming offers, counters, and seller messages.</p>
          </div>
          <Link href="/browse">Browse Cards</Link>
        </section>

        <section className="tabs panel" aria-label="Offer tabs">
          <button
            type="button"
            className={activeTab === "sent" ? "active" : ""}
            onClick={() => setActiveTab("sent")}
          >
            Sent Offers
          </button>
          <button
            type="button"
            className={activeTab === "received" ? "active" : ""}
            onClick={() => setActiveTab("received")}
          >
            Received Offers
          </button>
        </section>

        {offerNotice ? <p className="offer-notice">{offerNotice}</p> : null}
        {statusMessage ? <p className="status-message">{statusMessage}</p> : null}

        {activeTab === "sent" ? (
          <section className="offer-list">
            {sentOffers.length > 0 ? sentOffers.map((offer) => (
              <article key={offer.id} className="offer-card panel">
                <div>
                  <span className={`status status-${offer.status.toLowerCase()}`}>
                    {offer.status}
                  </span>
                  <h2>{offer.cardTitle}</h2>
                  <p>Seller: {offer.seller}</p>
                </div>

                <div className="offer-values">
                  <strong>{formatCurrency(offer.amount)}</strong>
                  <span>Asking {formatCurrency(offer.askingPrice)}</span>
                  <span>{offer.timeLeft}</span>
                </div>

                <div className="offer-actions">
                  <Link href={offer.cardHref}>View Card</Link>
                  <Link href="/messages">Message Seller</Link>
                  {offer.status === "Pending" || offer.status === "Countered" ? (
                    <button
                      type="button"
                      onClick={() => updateSentStatus(offer, "Withdrawn")}
                    >
                      Withdraw Offer
                    </button>
                  ) : null}
                </div>
              </article>
            )) : (
              <article className="empty-offers panel">
                <h2>No offers yet.</h2>
                <p>Browse cards to make an offer.</p>
                <Link href="/browse">Browse Cards</Link>
              </article>
            )}
          </section>
        ) : (
          <section className="offer-list">
            {receivedOffers.length > 0 ? receivedOffers.map((offer) => (
              <article key={offer.id} className="offer-card panel">
                <div>
                  <span className={`status status-${offer.status.toLowerCase()}`}>
                    {offer.status}
                  </span>
                  <h2>{offer.cardTitle}</h2>
                  <p>Buyer: {offer.buyer}</p>
                </div>

                <div className="offer-values">
                  <strong>{formatCurrency(offer.amount)}</strong>
                  <span>Asking {formatCurrency(offer.askingPrice)}</span>
                </div>

                <div className="offer-actions">
                  <button
                    type="button"
                    onClick={() => updateReceivedStatus(offer, "Accepted")}
                  >
                    Accept
                  </button>
                  <button type="button" onClick={() => setCounterOfferId(offer.id)}>
                    Counter
                  </button>
                  <button
                    type="button"
                    onClick={() => updateReceivedStatus(offer, "Declined")}
                  >
                    Decline
                  </button>
                  <Link href="/messages">Message Buyer</Link>
                </div>

                {counterOfferId === offer.id ? (
                  <div className="counter-box">
                    <input
                      type="number"
                      value={counterAmount}
                      onChange={(event) => setCounterAmount(event.target.value)}
                      placeholder="Counter amount"
                    />
                    <button type="button" onClick={() => submitCounter(offer.id)}>
                      Send Counter
                    </button>
                  </div>
                ) : null}
              </article>
            )) : (
              <article className="empty-offers panel">
                <h2>No received offers yet.</h2>
                <p>Incoming buyer offers will appear here.</p>
              </article>
            )}
          </section>
        )}
      </div>
    </main>
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
    align-items: flex-end;
    justify-content: space-between;
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
  .offer-card p,
  .offer-values span {
    color: #a1a1aa;
    font-size: 13px;
    line-height: 18px;
    font-weight: 800;
  }

  .page-heading a,
  .offer-actions a,
  .offer-actions button,
  .counter-box button,
  .tabs button {
    border: 1px solid rgba(231,222,208,0.28);
    border-radius: 10px;
    background: rgba(231,222,208,0.055);
    color: #fff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
  }

  .page-heading a {
    height: 40px;
    padding: 0 14px;
  }

  .tabs {
    margin-top: 18px;
    padding: 10px;
    display: inline-flex;
    gap: 8px;
  }

  .offer-notice,
  .status-message {
    margin: 12px 0 0;
    border: 1px solid rgba(231,222,208,0.18);
    border-radius: 10px;
    background: rgba(231,222,208,0.055);
    color: #C9CDD3;
    padding: 10px;
    font-size: 12px;
    line-height: 17px;
    font-weight: 900;
  }

  .status-message {
    border-color: rgba(52,211,153,0.24);
    background: rgba(52,211,153,0.07);
    color: #86efac;
  }

  .tabs button {
    height: 38px;
    padding: 0 14px;
  }

  .tabs button.active,
  .page-heading a:hover,
  .offer-actions a:hover,
  .offer-actions button:hover,
  .counter-box button:hover {
    border-color: rgba(231,222,208,0.62);
    background: rgba(231,222,208,0.11);
    box-shadow: 0 0 18px rgba(201,205,211,0.13);
  }

  .offer-list {
    margin-top: 16px;
    display: grid;
    gap: 12px;
  }

  .offer-card {
    padding: 14px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 190px 360px;
    gap: 16px;
    align-items: center;
  }

  .empty-offers {
    padding: 18px;
  }

  .empty-offers h2 {
    margin: 0;
    color: #fff;
    font-size: 20px;
    line-height: 24px;
    font-weight: 900;
  }

  .empty-offers p {
    color: #a1a1aa;
    font-size: 13px;
    line-height: 18px;
    font-weight: 800;
  }

  .empty-offers a {
    min-height: 36px;
    border: 1px solid rgba(231,222,208,0.28);
    border-radius: 10px;
    background: rgba(231,222,208,0.055);
    color: #fff;
    padding: 0 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    font-size: 12px;
    font-weight: 900;
  }

  .offer-card h2 {
    margin: 8px 0 0;
    color: #fff;
    font-size: 20px;
    line-height: 24px;
    font-weight: 900;
  }

  .status {
    min-height: 24px;
    border: 1px solid rgba(201,205,211,0.34);
    border-radius: 999px;
    background: rgba(201,205,211,0.06);
    color: #E7DED0;
    padding: 0 10px;
    display: inline-flex;
    align-items: center;
    font-size: 10px;
    line-height: 12px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .status-accepted {
    border-color: rgba(52,211,153,0.28);
    background: rgba(52,211,153,0.08);
    color: #86efac;
  }

  .status-declined,
  .status-withdrawn {
    border-color: rgba(244,63,94,0.3);
    background: rgba(244,63,94,0.08);
    color: #fb7185;
  }

  .status-countered {
    border-color: rgba(167,139,250,0.3);
    background: rgba(167,139,250,0.08);
    color: #c4b5fd;
  }

  .offer-values {
    display: grid;
    gap: 4px;
    justify-self: start;
    min-width: 190px;
  }

  .offer-values strong {
    color: #fff;
    font-size: 24px;
    line-height: 28px;
    font-weight: 900;
  }

  .offer-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
    width: 100%;
  }

  .offer-actions a,
  .offer-actions button {
    min-height: 34px;
    padding: 0 10px;
  }

  .counter-box {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px;
    border-top: 1px solid #1d1d22;
    padding-top: 12px;
  }

  .counter-box input {
    border: 1px solid #24242a;
    border-radius: 10px;
    background: #08080a;
    color: #fff;
    padding: 0 12px;
    min-height: 38px;
    font: inherit;
    font-weight: 800;
    outline: none;
  }

  .counter-box button {
    min-height: 38px;
    padding: 0 12px;
  }

  @media (max-width: 1100px) {
    .offers-shell {
      width: calc(100vw - 32px);
    }

    .page-heading,
    .offer-card,
    .counter-box {
      grid-template-columns: 1fr;
    }

    .page-heading {
      display: grid;
      align-items: start;
    }

    .offer-actions {
      justify-content: flex-start;
    }
  }
`;
