"use client";

import Link from "next/link";
import { useState } from "react";
import Header from "../components/Header";
import { mockSellerDashboardData } from "../lib/mockData";

type OfferStatus = "Pending" | "Accepted" | "Countered" | "Declined";
type OrderStatus = "Processing" | "Shipped";

const listings = mockSellerDashboardData.activeListings;
const initialOffers = mockSellerDashboardData.incomingOffers.map((offer) => ({
  ...offer,
  status: offer.status as OfferStatus,
}));
const initialOrders = mockSellerDashboardData.recentOrders.map((order) => ({
  ...order,
  status: order.status as OrderStatus,
}));

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card panel">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function SellerDashboardPage() {
  const [offers, setOffers] = useState(initialOffers);
  const [orders, setOrders] = useState(initialOrders);

  function updateOffer(id: string, status: OfferStatus) {
    setOffers((items) =>
      items.map((offer) => (offer.id === id ? { ...offer, status } : offer)),
    );
  }

  function markShipped(id: string) {
    setOrders((items) =>
      items.map((order) =>
        order.id === id ? { ...order, status: "Shipped" } : order,
      ),
    );
  }

  return (
    <main className="dashboard-page">
      <style>{pageStyles}</style>
      <div className="dashboard-shell">
        <Header />

        <section className="page-heading">
          <div>
            <span>Seller Tools</span>
            <h1>Seller Dashboard</h1>
            <p>Manage your listings, offers, orders, messages, and seller rewards.</p>
          </div>
          <Link href="/list">List New Card</Link>
        </section>

        <section className="stats-grid">
          <StatCard label="Active Listings" value={mockSellerDashboardData.stats.activeListings} />
          <StatCard label="Pending Offers" value={mockSellerDashboardData.stats.pendingOffers} />
          <StatCard label="Orders This Month" value={mockSellerDashboardData.stats.ordersThisMonth} />
          <StatCard label="Total Earnings" value={mockSellerDashboardData.stats.totalEarnings} />
          <StatCard label="Seller Level" value={mockSellerDashboardData.stats.sellerLevel} />
          <StatCard label="Response Rate" value={mockSellerDashboardData.stats.responseRate} />
        </section>

        <section className="dashboard-layout">
          <div className="main-column">
            <section className="panel dashboard-section">
              <div className="section-heading">
                <h2>Active Listings</h2>
                <Link href="/list">Add Listing</Link>
              </div>
              <div className="table-list">
                {listings.map((listing) => (
                  <article key={listing.card} className="table-row listing-row">
                    <div>
                      <strong>{listing.card}</strong>
                      <span>{listing.status}</span>
                    </div>
                    <span>{listing.price}</span>
                    <span>{listing.market}</span>
                    <span>{listing.watches} watches</span>
                    <span>{listing.views} views</span>
                    <div className="row-actions">
                      <button type="button">Edit</button>
                      <button type="button">Promote</button>
                      <Link href={listing.href}>View</Link>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="panel dashboard-section">
              <div className="section-heading">
                <h2>Incoming Offers</h2>
                <Link href="/offers">View Offers</Link>
              </div>
              <div className="table-list">
                {offers.map((offer) => (
                  <article key={offer.id} className="table-row offer-row">
                    <div>
                      <strong>{offer.buyer}</strong>
                      <span>{offer.card}</span>
                    </div>
                    <span>{offer.offer}</span>
                    <span>{offer.asking}</span>
                    <span className={`status status-${offer.status.toLowerCase()}`}>
                      {offer.status}
                    </span>
                    <div className="row-actions">
                      <button type="button" onClick={() => updateOffer(offer.id, "Accepted")}>
                        Accept
                      </button>
                      <button type="button" onClick={() => updateOffer(offer.id, "Countered")}>
                        Counter
                      </button>
                      <button type="button" onClick={() => updateOffer(offer.id, "Declined")}>
                        Decline
                      </button>
                      <Link href="/messages">Message</Link>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="panel dashboard-section">
              <div className="section-heading">
                <h2>Recent Orders</h2>
                <Link href="/orders">View Orders</Link>
              </div>
              <div className="table-list">
                {orders.map((order) => (
                  <article key={order.id} className="table-row order-row">
                    <div>
                      <strong>{order.id}</strong>
                      <span>{order.card}</span>
                    </div>
                    <span>{order.buyer}</span>
                    <span>{order.total}</span>
                    <span className={`status status-${order.status.toLowerCase()}`}>
                      {order.status}
                    </span>
                    <span>Ship by {order.shipBy}</span>
                    <div className="row-actions">
                      <button type="button">Print Label</button>
                      <button type="button" onClick={() => markShipped(order.id)}>
                        Mark Shipped
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <aside className="sidebar">
            <section className="panel sidebar-panel">
              <h2>Seller Rewards</h2>
              <p>Current level: {mockSellerDashboardData.rewards.currentLevel}</p>
              <div className="progress-block">
                <div>
                  <span>Progress to Level 5</span>
                  <strong>{mockSellerDashboardData.rewards.progressToNext}%</strong>
                </div>
                <div className="progress-track">
                  <span style={{ width: `${mockSellerDashboardData.rewards.progressToNext}%` }} />
                </div>
              </div>
              <StatCard label="Completed Sales" value={String(mockSellerDashboardData.rewards.completedSales)} />
              <StatCard label="Fast Shipping Streak" value={mockSellerDashboardData.rewards.fastShippingStreak} />
              <StatCard label="Response Score" value={mockSellerDashboardData.rewards.responseScore} />
              <StatCard label="Buyer Rating" value={mockSellerDashboardData.rewards.buyerRating} />
              <p>Higher seller rewards can boost visibility on Browse.</p>
            </section>

            <section className="panel sidebar-panel">
              <h2>Visibility Boost</h2>
              <ul>
                <li>Complete sales</li>
                <li>Ship fast</li>
                <li>Respond quickly</li>
                <li>Maintain strong reviews</li>
                <li>Avoid cancellations</li>
                <li>Keep market-fair pricing</li>
              </ul>
            </section>

            <section className="panel sidebar-panel quick-actions">
              <h2>Quick Actions</h2>
              <Link href="/list">List New Card</Link>
              <Link href="/collections/vault-runner">View Public Collection</Link>
              <Link href="/messages">View Messages</Link>
              <Link href="/offers">View Offers</Link>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}

const pageStyles = `
  .dashboard-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at 50% -120px, rgba(201,205,211,0.08), transparent 32%),
      linear-gradient(180deg, #000 0%, #030304 58%, #000 100%);
    color: #fafafa;
    font-family: Arial, Helvetica, sans-serif;
  }

  .dashboard-shell {
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
  .sidebar-panel p,
  .sidebar-panel li {
    color: #a1a1aa;
    font-size: 13px;
    line-height: 18px;
    font-weight: 800;
  }

  .page-heading a,
  .section-heading a,
  .row-actions a,
  .row-actions button,
  .quick-actions a {
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

  .page-heading a:hover,
  .section-heading a:hover,
  .row-actions a:hover,
  .row-actions button:hover,
  .quick-actions a:hover {
    border-color: rgba(231,222,208,0.62);
    background: rgba(231,222,208,0.11);
    box-shadow: 0 0 18px rgba(201,205,211,0.13);
  }

  .stats-grid {
    margin-top: 18px;
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 12px;
  }

  .stat-card {
    min-height: 82px;
    padding: 14px;
  }

  .stat-card span {
    color: #85858f;
    font-size: 11px;
    line-height: 14px;
    font-weight: 800;
  }

  .stat-card strong {
    display: block;
    margin-top: 8px;
    color: #fff;
    font-size: 24px;
    line-height: 28px;
    font-weight: 900;
  }

  .dashboard-layout {
    margin-top: 18px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 310px;
    gap: 18px;
    align-items: start;
  }

  .main-column,
  .sidebar {
    display: grid;
    gap: 14px;
  }

  .sidebar {
    position: sticky;
    top: 16px;
  }

  .dashboard-section,
  .sidebar-panel {
    padding: 14px;
  }

  .section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
  }

  .section-heading h2,
  .sidebar-panel h2 {
    margin: 0;
    color: #fff;
    font-size: 18px;
    line-height: 22px;
    font-weight: 900;
  }

  .table-list {
    margin-top: 12px;
    display: grid;
    gap: 10px;
  }

  .table-row {
    border: 1px solid #202026;
    border-radius: 10px;
    background: rgba(8,8,10,0.76);
    padding: 12px;
    display: grid;
    gap: 12px;
    align-items: center;
  }

  .listing-row {
    grid-template-columns: 1.3fr 90px 100px 100px 90px auto;
  }

  .offer-row {
    grid-template-columns: 1.3fr 90px 90px 100px auto;
  }

  .order-row {
    grid-template-columns: 1.2fr 100px 90px 100px 100px auto;
  }

  .table-row strong {
    display: block;
    color: #fff;
    font-size: 13px;
    line-height: 17px;
    font-weight: 900;
  }

  .table-row span {
    color: #C9CDD3;
    font-size: 12px;
    line-height: 16px;
    font-weight: 800;
  }

  .row-actions {
    display: flex;
    gap: 7px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .status {
    border: 1px solid rgba(201,205,211,0.28);
    border-radius: 999px;
    padding: 5px 9px;
    justify-self: start;
    font-size: 10px !important;
    line-height: 12px !important;
    text-transform: uppercase;
  }

  .status-accepted,
  .status-shipped {
    color: #86efac !important;
    background: rgba(52,211,153,0.08);
    border-color: rgba(52,211,153,0.24);
  }

  .status-declined {
    color: #fb7185 !important;
    background: rgba(244,63,94,0.08);
    border-color: rgba(244,63,94,0.24);
  }

  .status-countered {
    color: #c4b5fd !important;
    background: rgba(167,139,250,0.08);
    border-color: rgba(167,139,250,0.24);
  }

  .progress-block {
    border: 1px solid #202026;
    border-radius: 10px;
    background: rgba(8,8,10,0.76);
    padding: 10px;
  }

  .progress-block div:first-child {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    color: #C9CDD3;
    font-size: 11px;
    font-weight: 900;
  }

  .progress-track {
    margin-top: 9px;
    height: 8px;
    border-radius: 999px;
    background: rgba(201,205,211,0.12);
    overflow: hidden;
  }

  .progress-track span {
    display: block;
    width: 76%;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #C9CDD3, #E7DED0);
  }

  .sidebar-panel {
    display: grid;
    gap: 10px;
  }

  .sidebar-panel ul {
    margin: 0;
    padding-left: 18px;
  }

  .quick-actions {
    align-items: start;
  }

  @media (max-width: 1100px) {
    .dashboard-shell {
      width: calc(100vw - 32px);
    }

    .page-heading,
    .dashboard-layout,
    .stats-grid,
    .listing-row,
    .offer-row,
    .order-row {
      grid-template-columns: 1fr;
    }

    .page-heading {
      display: grid;
      align-items: start;
    }

    .sidebar {
      position: static;
    }

    .row-actions {
      justify-content: flex-start;
    }
  }
`;
