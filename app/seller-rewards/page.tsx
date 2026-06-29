import Header from "../components/Header";
import { mockSellerDashboardData, sellerRewardLevels } from "../lib/mockData";

const levels = sellerRewardLevels;

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function SellerRewardsPage() {
  return (
    <main className="rewards-page">
      <style>{pageStyles}</style>
      <div className="rewards-shell">
        <Header />

        <section className="page-heading">
          <span>Seller Growth</span>
          <h1>Seller Rewards</h1>
          <p>
            Level up by selling well, shipping fast, responding quickly, and
            keeping buyers happy.
          </p>
        </section>

        <section className="hero-card panel">
          <div>
            <span>Current Level</span>
            <h2>{mockSellerDashboardData.rewards.currentLevel}</h2>
            <p>Progress to Level 5</p>
            <div className="progress-track">
              <span
                style={{ width: `${mockSellerDashboardData.rewards.progressToNext}%` }}
              />
            </div>
          </div>
          <div className="hero-metrics">
            <Metric
              label="Completed Sales"
              value={String(mockSellerDashboardData.rewards.completedSales)}
            />
            <Metric
              label="Fast Shipping Streak"
              value={mockSellerDashboardData.rewards.fastShippingStreak}
            />
            <Metric
              label="Response Score"
              value={mockSellerDashboardData.rewards.responseScore}
            />
            <Metric
              label="Buyer Rating"
              value={mockSellerDashboardData.rewards.buyerRating}
            />
            <Metric label="Cancellation Rate" value="0.6%" />
          </div>
        </section>

        <section className="content-layout">
          <div className="panel section-card">
            <h2>Seller Levels</h2>
            <div className="level-grid">
              {levels.map((item) => (
                <article
                  key={item.level}
                  className={item.level === 4 ? "level-card active" : "level-card"}
                >
                  <span>{item.title}</span>
                  <p>{item.requirements}</p>
                  <strong>{item.rewards}</strong>
                </article>
              ))}
            </div>
          </div>

          <aside className="side-stack">
            <section className="panel section-card">
              <h2>How to Earn Browse Placement</h2>
              <ul>
                <li>Complete sales</li>
                <li>Ship fast</li>
                <li>Respond quickly</li>
                <li>Maintain strong reviews</li>
                <li>Price close to market value</li>
                <li>Avoid cancellations</li>
                <li>Keep listings active and accurate</li>
              </ul>
            </section>

            <section className="panel section-card">
              <h2>This Week</h2>
              <Metric label="Your Rank This Week" value="#18" />
              <Metric label="Views from Browse" value="4,820" />
              <Metric label="Click-through Rate" value="8.4%" />
              <Metric label="Sales Conversion" value="3.1%" />
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}

const pageStyles = `
  .rewards-page {
    min-height: 100vh;
    background: radial-gradient(circle at 50% -120px, rgba(201,205,211,0.08), transparent 32%), linear-gradient(180deg, #000 0%, #030304 58%, #000 100%);
    color: #fafafa;
    font-family: Arial, Helvetica, sans-serif;
  }
  .rewards-shell { width: 1240px; margin: 0 auto; padding: 8px 0 38px; }
  .panel {
    border: 1px solid #1d1d22; border-radius: 12px;
    background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.006)), rgba(5,5,6,0.92);
    box-shadow: 0 18px 44px rgba(0,0,0,0.28);
  }
  .page-heading { margin-top: 18px; }
  .page-heading span, .hero-card > div > span {
    color: #C9CDD3; font-size: 11px; line-height: 14px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase;
  }
  .page-heading h1 { margin: 8px 0 0; color: #fff; font-size: 42px; line-height: 46px; font-weight: 900; }
  .page-heading p, .hero-card p, .level-card p, .section-card li {
    color: #a1a1aa; font-size: 13px; line-height: 18px; font-weight: 800;
  }
  .hero-card { margin-top: 18px; padding: 18px; display: grid; grid-template-columns: 330px 1fr; gap: 18px; align-items: center; }
  .hero-card h2 { margin: 8px 0 0; color: #fff; font-size: 34px; line-height: 38px; font-weight: 900; }
  .progress-track { margin-top: 14px; height: 10px; border-radius: 999px; background: rgba(201,205,211,0.12); overflow: hidden; }
  .progress-track span { display: block; width: 76%; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #C9CDD3, #E7DED0); }
  .hero-metrics { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
  .metric {
    min-height: 64px; border: 1px solid #202026; border-radius: 10px; background: rgba(8,8,10,0.76); padding: 10px; box-sizing: border-box;
  }
  .metric span { color: #85858f; font-size: 10px; line-height: 13px; font-weight: 800; }
  .metric strong { display: block; margin-top: 6px; color: #fff; font-size: 14px; line-height: 18px; font-weight: 900; }
  .content-layout { margin-top: 18px; display: grid; grid-template-columns: minmax(0, 1fr) 330px; gap: 16px; align-items: start; }
  .section-card { padding: 16px; }
  .section-card h2 { margin: 0; color: #fff; font-size: 20px; line-height: 24px; font-weight: 900; }
  .level-grid { margin-top: 14px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .level-card {
    border: 1px solid #202026; border-radius: 10px; background: rgba(8,8,10,0.76); padding: 12px;
  }
  .level-card.active { border-color: rgba(231,222,208,0.54); box-shadow: 0 0 20px rgba(201,205,211,0.14); }
  .level-card span { color: #E7DED0; font-size: 12px; font-weight: 900; text-transform: uppercase; }
  .level-card strong { color: #fff; display: block; margin-top: 8px; font-size: 12px; line-height: 17px; }
  .side-stack { display: grid; gap: 16px; }
  .section-card ul { margin: 14px 0 0; padding-left: 18px; }
  .section-card .metric { margin-top: 10px; }
  @media (max-width: 1100px) {
    .rewards-shell { width: calc(100vw - 32px); }
    .hero-card, .hero-metrics, .content-layout, .level-grid { grid-template-columns: 1fr; }
  }
`;
