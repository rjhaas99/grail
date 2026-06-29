"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Header from "../components/Header";
import { mockWatchedCards } from "../lib/mockData";

const filters = ["All", "Grail", "Hot", "Below Market"];

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

export default function WatchedCardsPage() {
  const [cards, setCards] = useState(mockWatchedCards);
  const [activeFilter, setActiveFilter] = useState("All");

  const visibleCards = useMemo(() => {
    return cards.filter((card) => {
      if (activeFilter === "Grail") return card.tag === "Grail";
      if (activeFilter === "Hot") return card.tag === "Hot";
      if (activeFilter === "Below Market") return card.belowMarket;
      return true;
    });
  }, [activeFilter, cards]);

  const avgMarketValue =
    cards.length === 0
      ? 0
      : Math.round(cards.reduce((sum, card) => sum + card.marketValue, 0) / cards.length);
  const belowMarketCount = cards.filter((card) => card.belowMarket).length;
  const hotCount = cards.filter((card) => card.tag === "Hot").length;

  return (
    <main className="watched-page">
      <style>{pageStyles}</style>
      <div className="watched-shell">
        <Header />

        <section className="page-heading">
          <span>Watchlist</span>
          <h1>Watched Cards</h1>
          <p>Track cards you are watching, price changes, and market movement.</p>
        </section>

        <section className="stats-grid">
          <div className="panel stat-card"><span>Watched Cards</span><strong>{cards.length}</strong></div>
          <div className="panel stat-card"><span>Avg Market Value</span><strong>{formatCurrency(avgMarketValue)}</strong></div>
          <div className="panel stat-card"><span>Below Market</span><strong>{belowMarketCount}</strong></div>
          <div className="panel stat-card"><span>Hot Watched Cards</span><strong>{hotCount}</strong></div>
        </section>

        <section className="toolbar panel">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              className={activeFilter === filter ? "active" : ""}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </section>

        {visibleCards.length > 0 ? (
          <section className="watch-grid">
            {visibleCards.map((card) => (
              <article key={card.id} className="watch-card panel">
                <CardArt accent={card.accent} />
                <div>
                  <span className={`tag tag-${card.tag.toLowerCase()}`}>{card.tag}</span>
                  <h2>{card.title}</h2>
                  <p>{card.subtitle}</p>
                  <div className="metric-grid">
                    <span>Asking <strong>{card.priceDisplay}</strong></span>
                    <span>Market <strong>{formatCurrency(card.marketValue)}</strong></span>
                    <span>Watching <strong>{card.watchCount}</strong></span>
                    <span>Views <strong>{card.views}</strong></span>
                    <span>Price Change <strong>{card.priceChange}</strong></span>
                    <span>Seller <strong>{card.sellerName}</strong></span>
                  </div>
                  <div className="card-actions">
                    <Link href={card.route}>View Card</Link>
                    <button type="button" onClick={() => setCards((items) => items.filter((item) => item.id !== card.id))}>
                      Remove Watch
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="empty-state panel">
            <h2>No watched cards found.</h2>
            <p>Try a different filter or watch cards from Browse.</p>
          </section>
        )}
      </div>
    </main>
  );
}

const pageStyles = `
  .watched-page { min-height: 100vh; background: radial-gradient(circle at 50% -120px, rgba(201,205,211,0.08), transparent 32%), linear-gradient(180deg, #000 0%, #030304 58%, #000 100%); color: #fafafa; font-family: Arial, Helvetica, sans-serif; }
  .watched-shell { width: 1240px; margin: 0 auto; padding: 8px 0 38px; }
  .panel { border: 1px solid #1d1d22; border-radius: 12px; background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.006)), rgba(5,5,6,0.92); box-shadow: 0 18px 44px rgba(0,0,0,0.28); }
  .page-heading { margin-top: 18px; }
  .page-heading span, .stat-card span { color: #C9CDD3; font-size: 11px; line-height: 14px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
  .page-heading h1 { margin: 8px 0 0; color: #fff; font-size: 42px; line-height: 46px; font-weight: 900; }
  .page-heading p, .watch-card p, .empty-state p { color: #a1a1aa; font-size: 13px; line-height: 18px; font-weight: 800; }
  .stats-grid { margin-top: 18px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
  .stat-card { padding: 14px; }
  .stat-card strong { display: block; margin-top: 8px; color: #fff; font-size: 24px; line-height: 28px; font-weight: 900; }
  .toolbar { margin-top: 16px; padding: 10px; display: flex; gap: 8px; flex-wrap: wrap; }
  button, a { font-family: inherit; }
  .toolbar button, .card-actions a, .card-actions button { min-height: 36px; border: 1px solid rgba(231,222,208,0.28); border-radius: 10px; background: rgba(231,222,208,0.055); color: #fff; padding: 0 10px; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; font-size: 12px; font-weight: 900; cursor: pointer; }
  .toolbar button.active, .toolbar button:hover, .card-actions a:hover, .card-actions button:hover { border-color: rgba(231,222,208,0.62); background: rgba(231,222,208,0.11); }
  .watch-grid { margin-top: 16px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
  .watch-card { padding: 14px; display: grid; grid-template-columns: 150px 1fr; gap: 14px; }
  .art-shell { width: 140px; height: 184px; border: 1px solid rgba(201,205,211,0.14); border-radius: 10px; background: #030304; display: flex; align-items: center; justify-content: center; }
  .card-art { width: 94px; height: 132px; border: 1px solid rgba(244,244,245,0.48); border-radius: 8px; position: relative; overflow: hidden; }
  .card-art span { position: absolute; left: 24px; top: 29px; width: 46px; height: 46px; border: 1px solid rgba(255,255,255,0.22); border-radius: 50%; }
  .card-art strong { position: absolute; left: 40px; top: 40px; width: 24px; height: 56px; border-radius: 999px 999px 9px 9px; background: rgba(255,255,255,0.72); }
  .tag { border: 1px solid rgba(231,222,208,0.28); border-radius: 999px; color: #E7DED0; padding: 4px 8px; font-size: 10px; font-weight: 900; }
  .tag-hot { border-color: rgba(244,63,94,0.3); color: #fb7185; }
  .tag-grail { border-color: rgba(231,222,208,0.66); color: #fff; box-shadow: 0 0 16px rgba(201,205,211,0.18); }
  h2 { margin: 10px 0 0; color: #fff; font-size: 20px; line-height: 24px; font-weight: 900; }
  .metric-grid { margin: 12px 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  .metric-grid span { color: #85858f; font-size: 11px; font-weight: 800; }
  .metric-grid strong { display: block; margin-top: 4px; color: #fff; font-size: 13px; }
  .card-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .empty-state { margin-top: 16px; min-height: 220px; display: grid; place-items: center; text-align: center; padding: 20px; }
  @media (max-width: 1100px) { .watched-shell { width: calc(100vw - 32px); } .stats-grid, .watch-grid, .watch-card, .metric-grid { grid-template-columns: 1fr; } }
`;
