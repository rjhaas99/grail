"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminLayout from "./AdminLayout";
import Header from "../components/Header";
import { supabase } from "../../lib/supabase";
import {
  getAdminDashboardItems,
  type AdminRegistryItem,
} from "../lib/adminRegistry";

const adminEmails = ["ryanjhaas99@gmail.com"];

type AdminOverview = {
  marketplaceStatus: string;
  currentMarketplaceEvent: string;
  upcomingMarketplaceEvent: string;
  currentEconomy: string;
  currentSellerFee: number | null;
  currentBuyerReward: number | null;
  currentSellerReward: number | null;
  users: number;
  activeListings: number;
  gmv: number;
  platformRevenue: number;
  walletLiability: number;
  pendingPayouts: number;
  pendingPayoutAmount: number;
  openDisputes: number;
  activeAuctions: number;
  health: {
    wallet: string;
    payments: string;
    marketplace: string;
    rewards: string;
    notifications: string;
    disputes: number;
    auctions: number;
  };
};

type AdminOverviewResponse = {
  overview?: AdminOverview;
  error?: string;
};

type QuickAction = {
  title: string;
  description: string;
  route: string;
};

const dashboardItems = getAdminDashboardItems();

const quickActions: QuickAction[] = [
  {
    title: "Grant Wallet Credit",
    description: "Open Admin Wallet.",
    route: "/admin/wallet",
  },
  {
    title: "Create Marketplace Event",
    description: "Open GRAIL Control Center.",
    route: "/admin/economy",
  },
  {
    title: "Broadcast Marketplace Message",
    description: "Prepare event notification framework.",
    route: "/admin/economy",
  },
  {
    title: "Feature Homepage Listing",
    description: "Open homepage curation.",
    route: "/admin/homepage",
  },
  {
    title: "Open Pending Disputes",
    description: "Review dispute queue.",
    route: "/admin/disputes",
  },
  {
    title: "Review Pending Payouts",
    description: "Open admin payments.",
    route: "/admin/payments",
  },
  {
    title: "Review Auctions",
    description: "Open auction console.",
    route: "/admin/auctions",
  },
  {
    title: "Open Economy",
    description: "Review reward tiers.",
    route: "/admin/rewards",
  },
];

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatNumber(value?: number | null) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

function formatPercent(value?: number | null) {
  if (value === null || value === undefined) {
    return "Pending";
  }

  return `${Number(value).toFixed(2)}%`;
}

function matchesSearch(item: AdminRegistryItem, query: string) {
  if (!query.trim()) {
    return true;
  }

  const haystack = [
    item.title,
    item.description,
    item.route,
    item.category,
    item.id,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.trim().toLowerCase());
}

export default function AdminDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [status, setStatus] = useState("");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [search, setSearch] = useState("");

  const filteredItems = useMemo(
    () => dashboardItems.filter((item) => matchesSearch(item, search)),
    [search],
  );

  const groupedItems = useMemo(
    () =>
      filteredItems.reduce<Record<string, AdminRegistryItem[]>>((groups, item) => {
        groups[item.category] = groups[item.category] || [];
        groups[item.category].push(item);
        return groups;
      }, {}),
    [filteredItems],
  );

  async function loadAdminOverview() {
    setIsLoading(true);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Admin dashboard session error:", sessionError);
    }

    const email = session?.user.email?.toLowerCase() || "";

    if (!email || !adminEmails.includes(email)) {
      setAdminEmail(email);
      setIsAdmin(false);
      setOverview(null);
      setStatus("Access denied.");
      setIsLoading(false);
      return;
    }

    setAdminEmail(email);
    setIsAdmin(true);

    try {
      const response = await fetch("/api/admin/overview", {
        headers: {
          authorization: `Bearer ${session?.access_token || ""}`,
        },
      });
      const payload = (await response.json()) as AdminOverviewResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Admin overview could not be loaded.");
      }

      setOverview(payload.overview || null);
      setStatus("Admin Control Center loaded.");
    } catch (error) {
      console.error("Admin dashboard overview error:", error);
      setStatus(error instanceof Error ? error.message : "Admin overview could not be loaded.");
      setOverview(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadAdminOverview();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <main className="admin-dashboard-page">
      <style>{pageStyles}</style>
      <AdminLayout />
      <div className="admin-dashboard-shell">
        <Header />

        <section className="page-heading">
          <div>
            <span>GRAIL Control Center</span>
            <h1>Admin Dashboard</h1>
            <p>One operating console for marketplace, economy, payments, support, auctions, and trust workflows.</p>
          </div>
          <button type="button" onClick={loadAdminOverview} disabled={isLoading}>
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </section>

        {!isAdmin && !isLoading ? (
          <section className="panel access-panel">
            <h2>Access denied</h2>
            <p>{adminEmail ? `${adminEmail} is not allowed.` : "Sign in as an admin."}</p>
          </section>
        ) : (
          <>
            <section className="overview-grid">
              <article className="panel overview-card">
                <span>Marketplace Status</span>
                <strong>{overview?.marketplaceStatus || "Loading"}</strong>
              </article>
              <article className="panel overview-card">
                <span>Users</span>
                <strong>{formatNumber(overview?.users)}</strong>
              </article>
              <article className="panel overview-card">
                <span>Active Listings</span>
                <strong>{formatNumber(overview?.activeListings)}</strong>
              </article>
              <article className="panel overview-card">
                <span>GMV</span>
                <strong>{formatCurrency(overview?.gmv)}</strong>
              </article>
              <article className="panel overview-card">
                <span>Platform Revenue</span>
                <strong>{formatCurrency(overview?.platformRevenue)}</strong>
              </article>
              <article className="panel overview-card">
                <span>Wallet Liability</span>
                <strong>{formatCurrency(overview?.walletLiability)}</strong>
              </article>
              <article className="panel overview-card">
                <span>Pending Payouts</span>
                <strong>{formatNumber(overview?.pendingPayouts)}</strong>
                <em>{formatCurrency(overview?.pendingPayoutAmount)}</em>
              </article>
              <article className="panel overview-card">
                <span>Open Disputes</span>
                <strong>{formatNumber(overview?.openDisputes)}</strong>
              </article>
              <article className="panel overview-card">
                <span>Active Auctions</span>
                <strong>{formatNumber(overview?.activeAuctions)}</strong>
              </article>
              <article className="panel overview-card">
                <span>Current Marketplace Event</span>
                <strong>{overview?.currentMarketplaceEvent || "None"}</strong>
              </article>
              <article className="panel overview-card">
                <span>Current Economy</span>
                <strong>{overview?.currentEconomy || "Pending"}</strong>
              </article>
              <article className="panel overview-card">
                <span>Current Seller Fee</span>
                <strong>{formatPercent(overview?.currentSellerFee)}</strong>
              </article>
              <article className="panel overview-card">
                <span>Current Buyer Reward</span>
                <strong>{formatPercent(overview?.currentBuyerReward)}</strong>
              </article>
              <article className="panel overview-card">
                <span>Current Seller Reward</span>
                <strong>{formatPercent(overview?.currentSellerReward)}</strong>
              </article>
            </section>

            <section className="panel search-panel">
              <div>
                <span>Global Search</span>
                <h2>Find Admin Tools</h2>
              </div>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search Wallet, Economy, Reports, /admin/payments..."
              />
            </section>

            <section className="panel health-panel">
              <div className="section-title-row">
                <div>
                  <span>System Health</span>
                  <h2>Live Service Status</h2>
                </div>
              </div>
              <div className="health-grid">
                <div><span>Wallet</span><strong>{overview?.health.wallet || "Loading"}</strong></div>
                <div><span>Payments</span><strong>{overview?.health.payments || "Loading"}</strong></div>
                <div><span>Marketplace</span><strong>{overview?.health.marketplace || "Loading"}</strong></div>
                <div><span>Rewards</span><strong>{overview?.health.rewards || "Loading"}</strong></div>
                <div><span>Notifications</span><strong>{overview?.health.notifications || "Loading"}</strong></div>
                <div><span>Disputes</span><strong>{formatNumber(overview?.health.disputes)}</strong></div>
                <div><span>Auctions</span><strong>{formatNumber(overview?.health.auctions)}</strong></div>
              </div>
            </section>

            <section className="quick-actions-section">
              <div className="section-title-row">
                <div>
                  <span>Quick Actions</span>
                  <h2>Common Admin Workflows</h2>
                </div>
              </div>
              <div className="quick-action-grid">
                {quickActions.map((action) => (
                  <Link key={action.title} className="panel quick-action-card" href={action.route}>
                    <strong>{action.title}</strong>
                    <span>{action.description}</span>
                  </Link>
                ))}
              </div>
            </section>

            <section className="admin-tool-sections">
              <div className="section-title-row">
                <div>
                  <span>Admin Registry</span>
                  <h2>Platform Tools</h2>
                </div>
                <em>{filteredItems.length} tools</em>
              </div>

              {Object.entries(groupedItems).map(([category, items]) => (
                <div key={category} className="tool-category">
                  <h3>{category}</h3>
                  <div className="tool-grid">
                    {items.map((item) => (
                      <article key={item.id} className={`panel tool-card ${item.enabled ? "" : "disabled"}`}>
                        <div className="tool-icon">{item.icon}</div>
                        <div>
                          <span>{item.category}</span>
                          <h4>{item.title}</h4>
                          <p>{item.description}</p>
                          {item.enabled ? (
                            <Link href={item.route}>Open</Link>
                          ) : (
                            <button type="button" disabled>
                              Coming Soon
                            </button>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          </>
        )}

        {status ? <p className="status-message">{status}</p> : null}
      </div>
    </main>
  );
}

const pageStyles = `
  .admin-dashboard-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at 50% -120px, rgba(201,205,211,0.08), transparent 32%),
      linear-gradient(180deg, #000 0%, #030304 58%, #000 100%);
    color: #fafafa;
    font-family: Arial, Helvetica, sans-serif;
  }
  .admin-dashboard-shell {
    width: 1240px;
    margin: 0 auto;
    padding: 8px 0 42px;
  }
  .panel {
    border: 1px solid #1d1d22;
    border-radius: 12px;
    background: linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.008)), rgba(5,5,6,0.92);
    box-shadow: 0 18px 44px rgba(0,0,0,0.28);
  }
  .page-heading {
    margin-top: 18px;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
  }
  .page-heading span,
  .overview-card span,
  .search-panel span,
  .health-grid span,
  .section-title-row span,
  .tool-card span {
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
  .status-message,
  .access-panel p,
  .tool-card p,
  .quick-action-card span,
  .overview-card em {
    color: #a1a1aa;
    font-size: 13px;
    line-height: 18px;
    font-weight: 800;
  }
  .page-heading button,
  .tool-card a,
  .tool-card button {
    min-height: 38px;
    border: 1px solid rgba(231,222,208,0.28);
    border-radius: 10px;
    background: rgba(231,222,208,0.055);
    color: #fff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 13px;
    text-decoration: none;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
  }
  .tool-card button:disabled,
  .page-heading button:disabled {
    cursor: not-allowed;
    opacity: 0.58;
  }
  .overview-grid {
    margin-top: 18px;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }
  .overview-card {
    min-height: 94px;
    padding: 14px;
  }
  .overview-card strong {
    display: block;
    margin-top: 9px;
    color: #fff;
    font-size: 24px;
    line-height: 28px;
    font-weight: 900;
  }
  .overview-card em {
    display: block;
    margin-top: 5px;
    font-style: normal;
  }
  .search-panel,
  .health-panel,
  .access-panel {
    margin-top: 16px;
    padding: 16px;
  }
  .search-panel {
    display: grid;
    grid-template-columns: 280px minmax(0, 1fr);
    gap: 16px;
    align-items: center;
  }
  .search-panel h2,
  .section-title-row h2,
  .access-panel h2 {
    margin: 6px 0 0;
    color: #fff;
    font-size: 22px;
    line-height: 26px;
    font-weight: 900;
  }
  .search-panel input {
    width: 100%;
    border: 1px solid #24242a;
    border-radius: 10px;
    background: #08080a;
    color: #fff;
    min-height: 44px;
    padding: 0 12px;
    box-sizing: border-box;
    font: inherit;
    font-size: 13px;
    font-weight: 800;
    outline: none;
  }
  .section-title-row {
    margin-top: 18px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
  }
  .section-title-row em {
    color: #85858f;
    font-size: 12px;
    line-height: 16px;
    font-style: normal;
    font-weight: 900;
  }
  .health-grid {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 10px;
  }
  .health-grid div {
    border: 1px solid rgba(201,205,211,0.14);
    border-radius: 10px;
    background: rgba(8,8,10,0.72);
    padding: 12px;
  }
  .health-grid strong {
    display: block;
    margin-top: 7px;
    color: #fff;
    font-size: 16px;
    line-height: 20px;
    font-weight: 900;
  }
  .quick-action-grid {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }
  .quick-action-card {
    min-height: 92px;
    padding: 14px;
    text-decoration: none;
  }
  .quick-action-card strong {
    color: #fff;
    display: block;
    font-size: 15px;
    line-height: 19px;
    font-weight: 900;
  }
  .quick-action-card span {
    display: block;
    margin-top: 7px;
  }
  .tool-category {
    margin-top: 18px;
  }
  .tool-category h3 {
    margin: 0 0 10px;
    color: #E7DED0;
    font-size: 14px;
    line-height: 18px;
    font-weight: 900;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .tool-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }
  .tool-card {
    padding: 14px;
    display: grid;
    grid-template-columns: 48px minmax(0, 1fr);
    gap: 13px;
  }
  .tool-card.disabled {
    opacity: 0.62;
  }
  .tool-icon {
    width: 46px;
    height: 46px;
    border: 1px solid rgba(231,222,208,0.24);
    border-radius: 12px;
    background: radial-gradient(circle at 50% 18%, rgba(255,255,255,0.13), transparent 42%), rgba(231,222,208,0.055);
    color: #E7DED0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    line-height: 16px;
    font-weight: 900;
  }
  .tool-card h4 {
    margin: 6px 0 0;
    color: #fff;
    font-size: 18px;
    line-height: 22px;
    font-weight: 900;
  }
  .tool-card p {
    min-height: 54px;
    margin: 7px 0 12px;
  }
  .status-message {
    margin-top: 16px;
    border: 1px solid rgba(231,222,208,0.18);
    border-radius: 10px;
    background: rgba(231,222,208,0.055);
    color: #E7DED0;
    padding: 12px;
  }
  @media (max-width: 1100px) {
    .admin-dashboard-shell {
      width: calc(100vw - 32px);
    }
    .overview-grid,
    .health-grid,
    .quick-action-grid,
    .tool-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 720px) {
    .page-heading,
    .search-panel {
      grid-template-columns: 1fr;
      align-items: flex-start;
      flex-direction: column;
    }
    .overview-grid,
    .health-grid,
    .quick-action-grid,
    .tool-grid {
      grid-template-columns: 1fr;
    }
  }
`;
