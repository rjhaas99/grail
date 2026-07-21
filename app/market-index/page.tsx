"use client";

import { useState } from "react";
import Header from "../components/Header";
import { mockMarketIndexData } from "../lib/mockData";

const ranges = ["1D", "7D", "30D", "90D", "1Y"];

export default function MarketIndexPage() {
  const [activeRange, setActiveRange] = useState("30D");

  return (
    <main className="market-page">
      <style>{pageStyles}</style>
      <div className="market-shell">
        <Header />

        <section className="page-heading">
          <span>Market Data</span>
          <h1>GRAIL Market Index</h1>
          <p>Track sports card and TCG market movement, card values, and category trends.</p>
        </section>

        <section className="hero-stats">
          <div className="panel index-card">
            <span>GRAIL Index</span>
            <strong>{mockMarketIndexData.hero.value}</strong>
            <p>{mockMarketIndexData.hero.dailyChange}</p>
          </div>
          <div className="panel stat-card"><span>7D Change</span><strong>{mockMarketIndexData.hero.sevenDayChange}</strong></div>
          <div className="panel stat-card"><span>30D Change</span><strong>{mockMarketIndexData.hero.thirtyDayChange}</strong></div>
          <div className="panel stat-card"><span>Total Listings</span><strong>{mockMarketIndexData.hero.totalListings}</strong></div>
          <div className="panel stat-card"><span>Avg Sale Price</span><strong>${mockMarketIndexData.hero.avgSalePrice}</strong></div>
        </section>

        <section className="chart-panel panel">
          <div className="chart-header">
            <div>
              <h2>Sports + TCG Market</h2>
              <p>{activeRange} trend view</p>
            </div>
            <div className="range-buttons">
              {ranges.map((range) => (
                <button
                  key={range}
                  type="button"
                  className={activeRange === range ? "active" : ""}
                  onClick={() => setActiveRange(range)}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          <svg className="market-chart" viewBox="0 0 900 260" role="img" aria-label="GRAIL Market Index chart">
            <path className="chart-fill" d="M18 218 C92 184 128 122 202 143 C276 164 314 82 392 96 C470 110 514 188 592 148 C672 107 704 58 784 78 C838 92 866 56 884 42 L884 238 L18 238 Z" />
            <path className="chart-line" d="M18 218 C92 184 128 122 202 143 C276 164 314 82 392 96 C470 110 514 188 592 148 C672 107 704 58 784 78 C838 92 866 56 884 42" />
          </svg>
        </section>

        <section className="index-grid">
          {mockMarketIndexData.categoryIndexes.map((item) => (
            <article key={item.name} className="panel mini-index">
              <span>{item.name}</span>
              <strong>{item.value}</strong>
              <p>{item.change}</p>
            </article>
          ))}
        </section>

        <section className="market-layout">
          <div className="panel table-panel">
            <h2>Trending Categories</h2>
            {mockMarketIndexData.trendingCategories.map((row) => (
              <article key={row.category} className="table-row">
                <strong>{row.category}</strong>
                <span>{row.index}</span>
                <span>{row.sevenDay}</span>
                <span>{row.thirtyDay}</span>
                <span>{row.volume}</span>
                <span>{row.topMover}</span>
              </article>
            ))}
          </div>

          <aside className="side-stack">
            <section className="panel side-card">
              <h2>Biggest Gainers</h2>
              {mockMarketIndexData.topMovers.gainers.map((item) => <p key={item}>{item}</p>)}
            </section>
            <section className="panel side-card">
              <h2>Biggest Losers</h2>
              {mockMarketIndexData.topMovers.losers.map((item) => <p key={item}>{item}</p>)}
            </section>
            <section className="panel side-card">
              <h2>Most Watched</h2>
              {mockMarketIndexData.topMovers.watched.map((item) => <p key={item}>{item}</p>)}
            </section>
          </aside>
        </section>

        <p className="data-note">Market data integration planned: Card Ladder / Sports Card Investor style price tracking.</p>
      </div>
    </main>
  );
}

const pageStyles = `
  .market-page { min-height: 100vh; background: radial-gradient(circle at 50% -120px, rgba(201,205,211,0.08), transparent 32%), linear-gradient(180deg, #000 0%, #030304 58%, #000 100%); color: #fafafa; font-family: Arial, Helvetica, sans-serif; }
  .market-shell { width: 1240px; margin: 0 auto; padding: 8px 0 38px; }
  .panel { border: 1px solid #1d1d22; border-radius: 12px; background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.006)), rgba(5,5,6,0.92); box-shadow: 0 18px 44px rgba(0,0,0,0.28); }
  .page-heading { margin-top: 18px; }
  .page-heading span, .stat-card span, .index-card span, .mini-index span { color: #C9CDD3; font-size: 11px; line-height: 14px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
  .page-heading h1 { margin: 8px 0 0; color: #fff; font-size: 42px; line-height: 46px; font-weight: 900; }
  .page-heading p, .chart-header p, .index-card p, .mini-index p, .side-card p, .data-note { color: #a1a1aa; font-size: 13px; line-height: 18px; font-weight: 800; }
  .hero-stats { margin-top: 18px; display: grid; grid-template-columns: 1.4fr repeat(4, 1fr); gap: 12px; }
  .index-card, .stat-card, .mini-index, .side-card, .table-panel, .chart-panel { padding: 16px; }
  .index-card strong { display: block; margin-top: 8px; color: #fff; font-size: 42px; line-height: 46px; font-weight: 900; }
  .stat-card strong, .mini-index strong { display: block; margin-top: 8px; color: #fff; font-size: 24px; line-height: 28px; font-weight: 900; }
  .chart-panel, .index-grid, .market-layout { margin-top: 16px; }
  .chart-header { display: flex; justify-content: space-between; gap: 16px; align-items: start; }
  h2 { margin: 0; color: #fff; font-size: 22px; line-height: 26px; font-weight: 900; }
  .range-buttons { display: flex; gap: 8px; }
  .range-buttons button { min-height: 34px; border: 1px solid rgba(231,222,208,0.24); border-radius: 9px; background: #08080a; color: #fff; padding: 0 10px; font-weight: 900; cursor: pointer; }
  .range-buttons button.active, .range-buttons button:hover { border-color: rgba(231,222,208,0.62); background: rgba(231,222,208,0.11); }
  .market-chart { width: 100%; height: 260px; margin-top: 18px; }
  .chart-fill { fill: rgba(52,211,153,0.08); }
  .chart-line { fill: none; stroke: #C9CDD3; stroke-width: 5; stroke-linecap: round; filter: drop-shadow(0 0 10px rgba(201,205,211,0.22)); }
  .index-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
  .market-layout { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 16px; align-items: start; }
  .table-panel { display: grid; gap: 10px; }
  .table-row { border: 1px solid #202026; border-radius: 10px; background: rgba(8,8,10,0.76); padding: 12px; display: grid; grid-template-columns: 1.2fr .7fr .7fr .7fr .8fr 1.2fr; gap: 10px; align-items: center; }
  .table-row strong { color: #fff; }
  .table-row span { color: #C9CDD3; font-size: 12px; font-weight: 900; }
  .side-stack { display: grid; gap: 12px; }
  .data-note { margin: 16px 0 0; border: 1px solid rgba(201,205,211,0.18); border-radius: 10px; padding: 12px; background: rgba(8,8,10,0.76); }
  @media (max-width: 1100px) { .market-shell { width: calc(100vw - 32px); } .hero-stats, .index-grid, .market-layout, .table-row { grid-template-columns: 1fr; } .chart-header { display: grid; } }
`;
