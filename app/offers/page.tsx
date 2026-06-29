"use client";

import Link from "next/link";
import { useState } from "react";
import Header from "../components/Header";

type OfferStatus = "Pending" | "Countered" | "Accepted" | "Declined" | "Withdrawn";

type SentOffer = {
  id: string;
  cardTitle: string;
  cardHref: string;
  seller: string;
  amount: number;
  askingPrice: number;
  status: OfferStatus;
  timeLeft: string;
};

type ReceivedOffer = {
  id: string;
  buyer: string;
  cardTitle: string;
  cardHref: string;
  amount: number;
  askingPrice: number;
  status: OfferStatus;
};

const initialSentOffers: SentOffer[] = [
  {
    id: "sent-1",
    cardTitle: "Crimson Court Rookie",
    cardHref: "/cards/browse-1",
    seller: "VaultRunner",
    amount: 1160,
    askingPrice: 1240,
    status: "Pending",
    timeLeft: "18h left",
  },
  {
    id: "sent-2",
    cardTitle: "Emerald Archive Guardian",
    cardHref: "/cards/browse-7",
    seller: "GradeLane",
    amount: 710,
    askingPrice: 760,
    status: "Countered",
    timeLeft: "9h left",
  },
  {
    id: "sent-3",
    cardTitle: "Midnight Arc Holo",
    cardHref: "/cards/browse-3",
    seller: "SlabStreet",
    amount: 380,
    askingPrice: 395,
    status: "Accepted",
    timeLeft: "Complete",
  },
  {
    id: "sent-4",
    cardTitle: "Aurora Strike Prism",
    cardHref: "/cards/browse-5",
    seller: "RookieRoom",
    amount: 150,
    askingPrice: 185,
    status: "Declined",
    timeLeft: "Expired",
  },
];

const initialReceivedOffers: ReceivedOffer[] = [
  {
    id: "received-1",
    buyer: "MasonVault",
    cardTitle: "Obsidian Field Captain",
    cardHref: "/cards/browse-4",
    amount: 485,
    askingPrice: 520,
    status: "Pending",
  },
  {
    id: "received-2",
    buyer: "IndexBuyer",
    cardTitle: "Platinum Rookie Crest",
    cardHref: "/cards/browse-6",
    amount: 860,
    askingPrice: 910,
    status: "Pending",
  },
  {
    id: "received-3",
    buyer: "HoloStack",
    cardTitle: "Sapphire Prospect Vault",
    cardHref: "/cards/browse-8",
    amount: 130,
    askingPrice: 145,
    status: "Countered",
  },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function OffersPage() {
  const [activeTab, setActiveTab] = useState<"sent" | "received">("sent");
  const [sentOffers, setSentOffers] = useState(initialSentOffers);
  const [receivedOffers, setReceivedOffers] = useState(initialReceivedOffers);
  const [counterOfferId, setCounterOfferId] = useState("");
  const [counterAmount, setCounterAmount] = useState("");

  function updateSentStatus(id: string, status: OfferStatus) {
    setSentOffers((offers) =>
      offers.map((offer) => (offer.id === id ? { ...offer, status } : offer)),
    );
  }

  function updateReceivedStatus(id: string, status: OfferStatus) {
    setReceivedOffers((offers) =>
      offers.map((offer) => (offer.id === id ? { ...offer, status } : offer)),
    );
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

        {activeTab === "sent" ? (
          <section className="offer-list">
            {sentOffers.map((offer) => (
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
                      onClick={() => updateSentStatus(offer.id, "Withdrawn")}
                    >
                      Withdraw Offer
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="offer-list">
            {receivedOffers.map((offer) => (
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
                    onClick={() => updateReceivedStatus(offer.id, "Accepted")}
                  >
                    Accept
                  </button>
                  <button type="button" onClick={() => setCounterOfferId(offer.id)}>
                    Counter
                  </button>
                  <button
                    type="button"
                    onClick={() => updateReceivedStatus(offer.id, "Declined")}
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
            ))}
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
    grid-template-columns: 1fr 180px auto;
    gap: 16px;
    align-items: center;
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
