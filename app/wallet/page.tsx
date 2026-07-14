"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import { calculateProgression, type ProgressionSummary } from "../lib/progression";
import { getWalletReasonLabel } from "../lib/walletLabels";
import { supabase } from "../../lib/supabase";

type WalletSummary = {
  userId: string;
  availableCredit: number;
  pendingCredit: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  updatedAt: string | null;
};

type WalletLedgerEntry = {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  title: string;
  description: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string | null;
};

type RewardTier = {
  rankName: string;
  buyerRewardPercent: number;
  sellerRewardPercent: number;
  buyerBasePercent: number;
  sellerBasePercent: number;
  buyerMultiplier: number;
  sellerMultiplier: number;
  sellerFeePercent: number;
};

type RewardsMarketplace = {
  currentEvent?: { eventName: string } | null;
  upcomingEvent?: { eventName: string } | null;
  marketplaceStatus?: string;
  currentMarketplaceState?: string;
  currentMultipliers?: {
    buyerMultiplier: number;
    sellerMultiplier: number;
    xpMultiplier: number;
    walletMultiplier: number;
    treasureMultiplier: number;
    challengeMultiplier: number;
  };
  currentCountdown?: {
    label: string;
    status: string;
  };
};

type WalletResponse = {
  wallet?: WalletSummary;
  ledger?: WalletLedgerEntry[];
  error?: string;
};

type ProgressionResponse = {
  progression?: ProgressionSummary;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value || 0);
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

function formatPercent(value?: number | null) {
  if (value === null || value === undefined) {
    return "Pending";
  }

  return `${Number(value).toFixed(2)}%`;
}

export default function WalletPage() {
  const emptyWallet = useMemo<WalletSummary>(
    () => ({
      userId: "",
      availableCredit: 0,
      pendingCredit: 0,
      lifetimeEarned: 0,
      lifetimeRedeemed: 0,
      updatedAt: null,
    }),
    [],
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [status, setStatus] = useState("");
  const [wallet, setWallet] = useState<WalletSummary>(emptyWallet);
  const [ledger, setLedger] = useState<WalletLedgerEntry[]>([]);
  const [progression, setProgression] = useState<ProgressionSummary>(calculateProgression(0));
  const [rewardTier, setRewardTier] = useState<RewardTier | null>(null);
  const [marketplaceRewards, setMarketplaceRewards] = useState<RewardsMarketplace | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadWallet() {
      setIsLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        if (isMounted) {
          setIsSignedIn(false);
          setWallet(emptyWallet);
          setLedger([]);
          setRewardTier(null);
          setMarketplaceRewards(null);
          setStatus("Sign in to view your GRAIL Wallet.");
          setIsLoading(false);
        }
        return;
      }

      setIsSignedIn(true);

      try {
        const [walletResponse, progressionResponse, rewardsResponse] = await Promise.all([
          fetch("/api/wallet", {
            headers: {
              authorization: `Bearer ${session.access_token}`,
            },
          }),
          fetch("/api/progression", {
            headers: {
              authorization: `Bearer ${session.access_token}`,
            },
          }),
          fetch("/api/rewards", {
            headers: {
              authorization: `Bearer ${session.access_token}`,
            },
          }),
        ]);

        const walletPayload = (await walletResponse.json()) as WalletResponse;
        const progressionPayload = (await progressionResponse.json()) as ProgressionResponse;
        const rewardsPayload = (await rewardsResponse.json()) as {
          tier?: RewardTier | null;
          marketplace?: RewardsMarketplace | null;
        };

        if (!walletResponse.ok) {
          throw new Error(walletPayload.error || "GRAIL Wallet could not be loaded.");
        }

        if (!isMounted) {
          return;
        }

        setWallet(walletPayload.wallet || emptyWallet);
        setLedger(walletPayload.ledger || []);
        setProgression(progressionPayload.progression || calculateProgression(0));
        setRewardTier(rewardsPayload.tier || null);
        setMarketplaceRewards(rewardsPayload.marketplace || null);
        setStatus("");
      } catch (error) {
        console.error("Wallet page load error:", error);

        if (isMounted) {
          setWallet(emptyWallet);
          setLedger([]);
          setRewardTier(null);
          setMarketplaceRewards(null);
          setStatus(error instanceof Error ? error.message : "GRAIL Wallet could not be loaded.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadWallet();

    return () => {
      isMounted = false;
    };
  }, [emptyWallet]);

  return (
    <main className="wallet-page">
      <style>{pageStyles}</style>
      <div className="wallet-shell">
        <Header />

        <section className="page-heading">
          <span>GRAIL Credit</span>
          <h1>Wallet</h1>
          <p>
            Track GRAIL Credit activity. GRAIL Credit has no cash value, cannot
            be withdrawn or transferred, and may only be used on eligible GRAIL
            purchases.
          </p>
        </section>

        {!isSignedIn && !isLoading ? (
          <section className="panel sign-in-panel">
            <h2>Sign in to view your wallet.</h2>
            <p>Your GRAIL Wallet is tied to your account and progression history.</p>
            <Link href="/login">Sign In</Link>
          </section>
        ) : (
          <>
            <section className="wallet-grid">
              <div className="panel wallet-balance-card">
                <span>Available GRAIL Credit</span>
                <strong>{formatCurrency(wallet.availableCredit)}</strong>
                <p>Available for future GRAIL checkout features.</p>
              </div>
              <div className="panel wallet-stat-card">
                <span>Pending Credit</span>
                <strong>{formatCurrency(wallet.pendingCredit)}</strong>
              </div>
              <div className="panel wallet-stat-card">
                <span>Lifetime Earned</span>
                <strong>{formatCurrency(wallet.lifetimeEarned)}</strong>
              </div>
              <div className="panel wallet-stat-card">
                <span>Lifetime Redeemed</span>
                <strong>{formatCurrency(wallet.lifetimeRedeemed)}</strong>
              </div>
            </section>

            <section className="wallet-content-grid">
              <section className="panel progression-card">
                <div
                  className="progression-badge"
                  style={{ borderColor: progression.border, color: progression.accent }}
                >
                  {progression.icon}
                </div>
                <div>
                  <span>Current Level</span>
                  <h2>Level {progression.level} {progression.title}</h2>
                  <p>{progression.xp.toLocaleString()} lifetime XP</p>
                  <div className="progress-row">
                    <span>{progression.progressPercentage}%</span>
                    <em>
                      {progression.nextLevelXp
                        ? `${progression.xpToNext.toLocaleString()} XP to Level ${progression.level + 1}`
                        : "Max level reached"}
                    </em>
                  </div>
                  <div className="progress-track">
                    <span style={{ width: `${progression.progressPercentage}%` }} />
                  </div>
                </div>
              </section>

              <aside className="panel wallet-rules">
                <span>Wallet Rules</span>
                <h2>GRAIL Credit</h2>
                <ul>
                  <li>GRAIL Credit has no cash value.</li>
                  <li>It cannot be withdrawn or transferred.</li>
                  <li>It may only be used on eligible GRAIL purchases.</li>
                  <li>Checkout redemption is not active yet.</li>
                </ul>
              </aside>
            </section>

            <section className="panel reward-tier-panel">
              <div>
                <span>Current Economy Tier</span>
                <h2>{rewardTier?.rankName || "Configuration Pending"}</h2>
                <p>Automatic GRAIL Credit rewards are active for completed eligible orders.</p>
                <p>
                  Current event:{" "}
                  {marketplaceRewards?.currentEvent?.eventName ||
                    marketplaceRewards?.upcomingEvent?.eventName ||
                    "None"}
                  {marketplaceRewards?.currentCountdown?.label
                    ? ` · ${marketplaceRewards.currentCountdown.label}`
                    : ""}
                </p>
              </div>
              <div className="reward-tier-grid">
                <div>
                  <span>Current Buyer Reward</span>
                  <strong>{formatPercent(rewardTier?.buyerRewardPercent)}</strong>
                </div>
                <div>
                  <span>Current Seller Reward</span>
                  <strong>{formatPercent(rewardTier?.sellerRewardPercent)}</strong>
                </div>
                <div>
                  <span>Seller Fee</span>
                  <strong>{formatPercent(rewardTier?.sellerFeePercent)}</strong>
                </div>
                <div>
                  <span>Current Multipliers</span>
                  <strong>
                    XP {marketplaceRewards?.currentMultipliers?.xpMultiplier || 1}x · Wallet{" "}
                    {marketplaceRewards?.currentMultipliers?.walletMultiplier || 1}x
                  </strong>
                </div>
              </div>
            </section>

            <section className="panel activity-panel">
              <div className="section-title-row">
                <div>
                  <span>Ledger</span>
                  <h2>Recent Wallet Activity</h2>
                </div>
                {wallet.updatedAt ? <em>Updated {formatDate(wallet.updatedAt)}</em> : null}
              </div>

              {isLoading ? (
                <p className="empty-state">Loading wallet activity...</p>
              ) : ledger.length > 0 ? (
                <div className="ledger-list">
                  {ledger.map((entry) => (
                    <div key={entry.id} className="ledger-row">
                      <div>
                        <strong>{entry.title}</strong>
                        <span>{entry.description || getWalletReasonLabel(null, entry.type)}</span>
                        <small>{formatDate(entry.createdAt)}</small>
                      </div>
                      <div className="ledger-amount">
                        <strong className={entry.amount >= 0 ? "credit" : "debit"}>
                          {entry.amount >= 0 ? "+" : "-"}
                          {formatCurrency(Math.abs(entry.amount))}
                        </strong>
                        <span>Balance {formatCurrency(entry.balanceAfter)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state">
                  No GRAIL Credit activity yet. Future rewards, promotions, and
                  adjustments will appear here.
                </p>
              )}
            </section>
          </>
        )}

        {status ? <p className="status-message">{status}</p> : null}
      </div>
    </main>
  );
}

const pageStyles = `
  .wallet-page {
    min-height: 100vh;
    background: radial-gradient(circle at 50% -120px, rgba(201,205,211,0.08), transparent 32%), linear-gradient(180deg, #000 0%, #030304 58%, #000 100%);
    color: #fafafa;
    font-family: Arial, Helvetica, sans-serif;
  }
  .wallet-shell {
    width: 1240px;
    margin: 0 auto;
    padding: 8px 0 40px;
  }
  .panel {
    border: 1px solid #1d1d22;
    border-radius: 12px;
    background: linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.008)), rgba(5,5,6,0.92);
    box-shadow: 0 18px 44px rgba(0,0,0,0.28);
  }
  .page-heading {
    margin-top: 18px;
  }
  .page-heading span,
  .wallet-balance-card span,
  .wallet-stat-card span,
  .progression-card span,
  .wallet-rules span,
  .section-title-row span {
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
  .wallet-balance-card p,
  .progression-card p,
  .wallet-rules li,
  .empty-state,
  .status-message,
  .sign-in-panel p {
    color: #a1a1aa;
    font-size: 13px;
    line-height: 18px;
    font-weight: 800;
  }
  .wallet-grid {
    margin-top: 18px;
    display: grid;
    grid-template-columns: 1.35fr repeat(3, minmax(0, 1fr));
    gap: 12px;
  }
  .wallet-balance-card,
  .wallet-stat-card,
  .sign-in-panel {
    padding: 16px;
  }
  .wallet-balance-card strong {
    display: block;
    margin-top: 12px;
    color: #fff;
    font-size: 42px;
    line-height: 46px;
    font-weight: 900;
  }
  .wallet-stat-card strong {
    display: block;
    margin-top: 11px;
    color: #fff;
    font-size: 26px;
    line-height: 30px;
    font-weight: 900;
  }
  .wallet-content-grid {
    margin-top: 16px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    gap: 16px;
    align-items: stretch;
  }
  .progression-card {
    padding: 18px;
    display: grid;
    grid-template-columns: 92px minmax(0, 1fr);
    gap: 18px;
    align-items: center;
  }
  .progression-badge {
    width: 86px;
    height: 86px;
    border: 1px solid rgba(201,205,211,0.34);
    border-radius: 18px;
    background: radial-gradient(circle at 50% 15%, rgba(255,255,255,0.16), transparent 42%), linear-gradient(145deg, rgba(231,222,208,0.11), rgba(8,8,10,0.92));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 25px;
    line-height: 30px;
    font-weight: 900;
  }
  .progression-card h2,
  .wallet-rules h2,
  .section-title-row h2,
  .sign-in-panel h2 {
    margin: 7px 0 0;
    color: #fff;
    font-size: 22px;
    line-height: 26px;
    font-weight: 900;
  }
  .progress-row {
    margin-top: 13px;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    color: #E7DED0;
    font-size: 12px;
    font-weight: 900;
  }
  .progress-row em {
    color: #a1a1aa;
    font-style: normal;
  }
  .progress-track {
    margin-top: 8px;
    height: 8px;
    border-radius: 999px;
    background: rgba(201,205,211,0.12);
    overflow: hidden;
  }
  .progress-track span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #C9CDD3, #E7DED0);
  }
  .wallet-rules {
    padding: 16px;
  }
  .wallet-rules ul {
    margin: 12px 0 0;
    padding-left: 18px;
  }
  .wallet-rules li + li {
    margin-top: 7px;
  }
  .reward-tier-panel {
    margin-top: 16px;
    padding: 16px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 1.4fr;
    gap: 16px;
    align-items: center;
  }
  .reward-tier-panel span,
  .reward-tier-grid span {
    color: #C9CDD3;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .reward-tier-panel h2 {
    margin: 7px 0 0;
    color: #fff;
    font-size: 22px;
    line-height: 26px;
    font-weight: 900;
  }
  .reward-tier-panel p {
    margin: 7px 0 0;
    color: #a1a1aa;
    font-size: 13px;
    line-height: 18px;
    font-weight: 800;
  }
  .reward-tier-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }
  .reward-tier-grid div {
    border: 1px solid rgba(201,205,211,0.14);
    border-radius: 10px;
    background: rgba(8,8,10,0.72);
    padding: 11px;
  }
  .reward-tier-grid strong {
    display: block;
    margin-top: 6px;
    color: #fff;
    font-size: 18px;
    line-height: 22px;
    font-weight: 900;
  }
  .activity-panel {
    margin-top: 16px;
    padding: 16px;
  }
  .section-title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
  }
  .section-title-row em {
    color: #85858f;
    font-size: 11px;
    line-height: 14px;
    font-style: normal;
    font-weight: 800;
  }
  .ledger-list {
    margin-top: 14px;
    display: grid;
    gap: 9px;
  }
  .ledger-row {
    border: 1px solid rgba(201,205,211,0.14);
    border-radius: 10px;
    background: rgba(8,8,10,0.72);
    padding: 12px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
  }
  .ledger-row strong {
    color: #fff;
    font-size: 13px;
    line-height: 16px;
    font-weight: 900;
  }
  .ledger-row span,
  .ledger-row small,
  .ledger-amount span {
    display: block;
    margin-top: 4px;
    color: #85858f;
    font-size: 11px;
    line-height: 15px;
    font-weight: 800;
  }
  .ledger-amount {
    text-align: right;
  }
  .ledger-amount .credit {
    color: #E7DED0;
  }
  .ledger-amount .debit {
    color: #C9CDD3;
  }
  .empty-state {
    margin: 14px 0 0;
    border: 1px solid rgba(201,205,211,0.14);
    border-radius: 10px;
    background: rgba(8,8,10,0.72);
    padding: 13px;
  }
  .status-message {
    margin: 14px 0 0;
    border: 1px solid rgba(231,222,208,0.18);
    border-radius: 10px;
    background: rgba(231,222,208,0.055);
    color: #E7DED0;
    padding: 12px;
  }
  .sign-in-panel {
    margin-top: 18px;
  }
  .sign-in-panel a {
    margin-top: 14px;
    min-height: 40px;
    border: 1px solid rgba(231,222,208,0.28);
    border-radius: 10px;
    background: #E7DED0;
    color: #111;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 14px;
    text-decoration: none;
    font-size: 12px;
    font-weight: 900;
  }
  @media (max-width: 1100px) {
    .wallet-shell {
      width: calc(100vw - 32px);
    }
    .wallet-grid,
    .wallet-content-grid,
    .progression-card,
    .reward-tier-panel,
    .reward-tier-grid {
      grid-template-columns: 1fr;
    }
    .wallet-balance-card strong {
      font-size: 34px;
      line-height: 38px;
    }
  }
`;
