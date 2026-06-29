"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Header from "../components/Header";
import {
  type PortfolioCard,
  mockPortfolioCards,
  mockWatchedCards,
} from "../lib/mockData";

type Tab = "Owned" | "Listed" | "Watched" | "Sold";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function CardArt({ accent }: { accent: string }) {
  return (
    <div className="art-shell">
      <div
        className="card-art"
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card panel">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function PortfolioPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Owned");
  const [status, setStatus] = useState("");
  const [watched, setWatched] = useState(mockWatchedCards);

  const ownedCards = mockPortfolioCards.filter((card) => card.status === "Owned");
  const listedCards = mockPortfolioCards.filter((card) => card.status === "Listed");
  const soldCards = mockPortfolioCards.filter((card) => card.status === "Sold");
  const collectionValue = mockPortfolioCards
    .filter((card) => card.status !== "Sold")
    .reduce((sum, card) => sum + card.estimatedValue, 0);
  const grailCount = mockPortfolioCards.filter((card) => card.tags.includes("Grail")).length;
  const thirtyDayChange = "+8.4%";

  const tabCount = useMemo(() => {
    if (activeTab === "Owned") return ownedCards.length;
    if (activeTab === "Listed") return listedCards.length;
    if (activeTab === "Watched") return watched.length;
    return soldCards.length;
  }, [activeTab, listedCards.length, ownedCards.length, soldCards.length, watched.length]);

  function renderOwnedCard(card: PortfolioCard) {
    return (
      <article key={card.id} className="collection-card">
        <CardArt accent={card.accent} />
        <div className="badge-row">
          {card.tags.map((tag) => <span key={tag}>{tag}</span>)}
        </div>
        <h3>{card.title}</h3>
        <p>{card.subtitle}</p>
        <div className="value-grid">
          <span>Market <strong>{formatCurrency(card.estimatedValue)}</strong></span>
          <span>Cost <strong>{formatCurrency(card.costBasis)}</strong></span>
          <span className={card.gainLoss >= 0 ? "positive" : "negative"}>
            Gain/Loss <strong>{card.gainLoss >= 0 ? "+" : ""}{formatCurrency(card.gainLoss)}</strong>
          </span>
        </div>
        <div className="card-actions">
          <Link href={card.route}>View Details</Link>
          <button type="button" onClick={() => setStatus("List for sale flow coming soon.")}>List For Sale</button>
          <button type="button" onClick={() => setStatus("Note added mock-only.")}>Add Note</button>
        </div>
      </article>
    );
  }

  return (
    <main className="portfolio-page">
      <style>{pageStyles}</style>
      <div className="portfolio-shell">
        <Header />

        <section className="page-heading">
          <span>Collection</span>
          <h1>My Collection</h1>
          <p>Track your owned cards, watched cards, values, and collection performance.</p>
        </section>

        {status ? <p className="status-message">{status}</p> : null}

        <section className="stats-grid">
          <StatCard label="Total Collection Value" value={formatCurrency(collectionValue)} />
          <StatCard label="Cards Owned" value={String(ownedCards.length)} />
          <StatCard label="30D Change" value={thirtyDayChange} />
          <StatCard label="Grail Cards" value={String(grailCount)} />
          <StatCard label="Watched Cards" value={String(watched.length)} />
          <StatCard label="Listed For Sale" value={String(listedCards.length)} />
        </section>

        <section className="portfolio-layout">
          <div className="main-column">
            <section className="panel toolbar">
              <div>
                <h2>{activeTab}</h2>
                <p>{tabCount} cards</p>
              </div>
              <div className="tabs">
                {(["Owned", "Listed", "Watched", "Sold"] as Tab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={activeTab === tab ? "active" : ""}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </section>

            {activeTab === "Owned" ? (
              <section className="card-grid">{ownedCards.map(renderOwnedCard)}</section>
            ) : null}

            {activeTab === "Listed" ? (
              <section className="list-panel panel">
                {listedCards.map((card) => (
                  <article key={card.id} className="list-row">
                    <CardArt accent={card.accent} />
                    <div>
                      <h3>{card.title}</h3>
                      <p>{card.subtitle}</p>
                    </div>
                    <strong>{formatCurrency(card.price ?? card.estimatedValue)}</strong>
                    <span>{card.watches} watches</span>
                    <span>{card.views} views</span>
                    <div className="row-actions">
                      <button type="button" onClick={() => setStatus("Edit listing mock-only.")}>Edit Listing</button>
                      <Link href={card.route}>View Listing</Link>
                    </div>
                  </article>
                ))}
              </section>
            ) : null}

            {activeTab === "Watched" ? (
              <section className="card-grid">
                {watched.map((card) => (
                  <article key={card.id} className="collection-card">
                    <CardArt accent={card.accent} />
                    <h3>{card.title}</h3>
                    <p>{card.subtitle}</p>
                    <div className="value-grid">
                      <span>Asking <strong>{card.priceDisplay}</strong></span>
                      <span>Market <strong>{formatCurrency(card.marketValue)}</strong></span>
                      <span>{card.watchCount} watching</span>
                    </div>
                    <div className="card-actions">
                      <Link href={card.route}>View Card</Link>
                      <button type="button" onClick={() => setWatched((items) => items.filter((item) => item.id !== card.id))}>Remove Watch</button>
                    </div>
                  </article>
                ))}
              </section>
            ) : null}

            {activeTab === "Sold" ? (
              <section className="list-panel panel">
                {soldCards.map((card) => (
                  <article key={card.id} className="list-row">
                    <CardArt accent={card.accent} />
                    <div>
                      <h3>{card.title}</h3>
                      <p>{card.subtitle}</p>
                    </div>
                    <strong>{formatCurrency(card.salePrice ?? card.estimatedValue)}</strong>
                    <span>{card.soldDate}</span>
                    <span>Buyer: {card.buyer}</span>
                    <Link href={card.route}>View Details</Link>
                  </article>
                ))}
              </section>
            ) : null}
          </div>

          <aside className="sidebar">
            <section className="panel side-card">
              <h2>Collection Allocation</h2>
              {["Sports 62%", "TCG 38%", "Graded 74%", "Raw 26%", "Grails 18%"].map((item) => (
                <div key={item} className="allocation-row"><span>{item}</span><strong /></div>
              ))}
            </section>
            <section className="panel side-card">
              <h2>Collection Value</h2>
              <svg className="mini-chart" viewBox="0 0 260 92" role="img" aria-label="Collection value chart">
                <path d="M8 74 C32 64 42 47 66 53 C92 59 102 32 128 38 C154 44 164 69 188 55 C210 42 222 28 252 20" />
              </svg>
            </section>
            <section className="panel side-card">
              <h2>Recent Activity</h2>
              <p>Watched Emerald Archive Guardian.</p>
              <p>Listed Platinum Rookie Crest.</p>
              <p>Offer sent on Crimson Court Rookie.</p>
            </section>
            <section className="panel side-card quick-actions">
              <h2>Quick Actions</h2>
              <Link href="/list">List a Card</Link>
              <Link href="/browse">Browse Cards</Link>
              <Link href="/collections/vault-runner">View Public Collection</Link>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}

const pageStyles = `
  .portfolio-page { min-height: 100vh; background: radial-gradient(circle at 50% -120px, rgba(201,205,211,0.08), transparent 32%), linear-gradient(180deg, #000 0%, #030304 58%, #000 100%); color: #fafafa; font-family: Arial, Helvetica, sans-serif; }
  .portfolio-shell { width: 1240px; margin: 0 auto; padding: 8px 0 38px; }
  .panel { border: 1px solid #1d1d22; border-radius: 12px; background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.006)), rgba(5,5,6,0.92); box-shadow: 0 18px 44px rgba(0,0,0,0.28); }
  .page-heading { margin-top: 18px; }
  .page-heading span { color: #C9CDD3; font-size: 11px; line-height: 14px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
  .page-heading h1 { margin: 8px 0 0; color: #fff; font-size: 42px; line-height: 46px; font-weight: 900; }
  .page-heading p, .toolbar p, .collection-card p, .list-row p, .side-card p, .status-message { color: #a1a1aa; font-size: 13px; line-height: 18px; font-weight: 800; }
  .status-message { margin: 16px 0 0; border: 1px solid rgba(52,211,153,0.24); border-radius: 10px; background: rgba(52,211,153,0.07); color: #86efac; padding: 10px; font-weight: 900; }
  .stats-grid { margin-top: 16px; display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; }
  .stat-card, .side-card { padding: 14px; }
  .stat-card span, .value-grid span, .list-row span { color: #85858f; font-size: 11px; line-height: 14px; font-weight: 800; }
  .stat-card strong { display: block; margin-top: 8px; color: #fff; font-size: 22px; line-height: 26px; font-weight: 900; }
  .portfolio-layout { margin-top: 18px; display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 16px; align-items: start; }
  .main-column, .sidebar { display: grid; gap: 14px; }
  .toolbar { padding: 14px; display: flex; align-items: center; justify-content: space-between; gap: 14px; }
  h2 { margin: 0; color: #fff; font-size: 20px; line-height: 24px; font-weight: 900; }
  .tabs { display: flex; gap: 8px; flex-wrap: wrap; }
  button, a { font-family: inherit; }
  .tabs button, .card-actions a, .card-actions button, .row-actions a, .row-actions button, .quick-actions a, .list-row > a { min-height: 36px; border: 1px solid rgba(231,222,208,0.28); border-radius: 10px; background: rgba(231,222,208,0.055); color: #fff; padding: 0 10px; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; font-size: 12px; font-weight: 900; cursor: pointer; }
  .tabs button.active, .tabs button:hover, .card-actions a:hover, .card-actions button:hover, .row-actions a:hover, .row-actions button:hover, .quick-actions a:hover { border-color: rgba(231,222,208,0.62); background: rgba(231,222,208,0.11); }
  .card-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
  .collection-card { border: 1px solid #202026; border-radius: 12px; background: #070708; padding: 14px; display: grid; gap: 10px; }
  .art-shell { width: 100%; height: 166px; border: 1px solid rgba(201,205,211,0.14); border-radius: 10px; background: #030304; display: flex; align-items: center; justify-content: center; }
  .card-art { width: 92px; height: 128px; border: 1px solid rgba(244,244,245,0.48); border-radius: 8px; position: relative; overflow: hidden; }
  .card-art span { position: absolute; left: 23px; top: 28px; width: 44px; height: 44px; border: 1px solid rgba(255,255,255,0.22); border-radius: 50%; }
  .card-art strong { position: absolute; left: 39px; top: 38px; width: 24px; height: 54px; border-radius: 999px 999px 9px 9px; background: rgba(255,255,255,0.72); }
  .badge-row { display: flex; gap: 7px; flex-wrap: wrap; }
  .badge-row span { border: 1px solid rgba(231,222,208,0.28); border-radius: 999px; color: #E7DED0; padding: 4px 8px; font-size: 10px; font-weight: 900; }
  .collection-card h3, .list-row h3 { margin: 0; color: #fff; font-size: 17px; line-height: 21px; font-weight: 900; }
  .value-grid { display: grid; gap: 6px; }
  .value-grid strong { color: #fff; }
  .positive strong { color: #86efac; }
  .negative strong { color: #fb7185; }
  .card-actions, .row-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .list-panel { padding: 10px; display: grid; gap: 10px; }
  .list-row { border: 1px solid #202026; border-radius: 10px; background: rgba(8,8,10,0.76); padding: 12px; display: grid; grid-template-columns: 86px 1fr auto auto auto auto; gap: 12px; align-items: center; }
  .list-row .art-shell { width: 74px; height: 96px; }
  .list-row .card-art { width: 54px; height: 76px; }
  .list-row > strong { color: #fff; font-size: 18px; }
  .allocation-row { margin-top: 10px; display: grid; gap: 6px; }
  .allocation-row span { color: #C9CDD3; font-size: 12px; font-weight: 900; }
  .allocation-row strong { height: 8px; border-radius: 999px; background: linear-gradient(90deg, #C9CDD3, #E7DED0); }
  .mini-chart { width: 100%; height: 96px; margin-top: 10px; }
  .mini-chart path { fill: none; stroke: #C9CDD3; stroke-width: 4; stroke-linecap: round; filter: drop-shadow(0 0 8px rgba(201,205,211,0.18)); }
  .quick-actions { display: grid; gap: 10px; }
  @media (max-width: 1100px) { .portfolio-shell { width: calc(100vw - 32px); } .stats-grid, .portfolio-layout, .card-grid, .list-row { grid-template-columns: 1fr; } .toolbar { display: grid; } }
`;
