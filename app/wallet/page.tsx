"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import CollectorMomentLayer from "../components/CollectorMomentLayer";
import GrailPassPresenceCard from "../components/GrailPassPresenceCard";
import Header from "../components/Header";
import { buildRewardCollectorMoment } from "../lib/collectorMomentAdapters";
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

type RewardEventSummary = {
  id: string;
  eventType: string;
  referenceType: string | null;
  referenceId: string | null;
  rewardTier: string | null;
  xpAwarded: number;
  walletCreditAwarded: number;
  actualBuyerMultiplier: number;
  actualSellerMultiplier: number;
  walletMultiplierUsed: number;
  seasonalEvent: string | null;
  treasureChestTriggered: boolean;
  challengeTriggered: boolean;
  processedAt: string | null;
  createdAt: string | null;
};

type RewardTier = {
  rankName: string;
  minLevel?: number;
  maxLevel?: number;
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
  rewardEvents?: RewardEventSummary[];
  error?: string;
};

type ProgressionResponse = {
  progression?: ProgressionSummary;
};

type RewardsResponse = {
  tier?: RewardTier | null;
  nextTier?: RewardTier | null;
  marketplace?: RewardsMarketplace | null;
  walletRewardsEnabled?: boolean;
  walletRewardsMessage?: string;
};

const emptyWallet: WalletSummary = {
  userId: "",
  availableCredit: 0,
  pendingCredit: 0,
  lifetimeEarned: 0,
  lifetimeRedeemed: 0,
  updatedAt: null,
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

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Recently";
  }

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatPercent(value?: number | null) {
  if (value === null || value === undefined) {
    return "Pending";
  }

  return `${Number(value).toFixed(2)}%`;
}

function isCredit(entry: WalletLedgerEntry) {
  return Number(entry.amount || 0) > 0;
}

function getEntryLabel(entry: WalletLedgerEntry) {
  return entry.title || getWalletReasonLabel(null, entry.type);
}

function getEntrySource(entry: WalletLedgerEntry) {
  if (entry.referenceType === "order") {
    return "Order reward";
  }

  if (entry.referenceType === "admin_wallet") {
    return "Admin adjustment";
  }

  if (entry.type === "promotion") {
    return "Promotion";
  }

  if (entry.type === "refund") {
    return "Refund";
  }

  return getWalletReasonLabel(null, entry.type);
}

function getEntryStatus(entry: WalletLedgerEntry) {
  if (entry.amount > 0) {
    return "Available";
  }

  if (entry.amount < 0) {
    return "Redeemed";
  }

  return "Recorded";
}

function useCountUp(value: number, duration = 900) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValueRef = useRef(value);

  useEffect(() => {
    const startValue = previousValueRef.current;
    const endValue = Number(value || 0);
    previousValueRef.current = endValue;

    if (typeof window === "undefined") {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || startValue === endValue) {
      const timeout = window.setTimeout(() => setDisplayValue(endValue), 0);
      return () => window.clearTimeout(timeout);
    }

    let animationFrame = 0;
    const startedAt = window.performance.now();

    function animate(now: number) {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(startValue + (endValue - startValue) * eased);

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(animate);
      }
    }

    animationFrame = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(animationFrame);
  }, [duration, value]);

  return displayValue;
}

function AnimatedCurrency({ value, className = "" }: { value: number; className?: string }) {
  const displayValue = useCountUp(value);

  return <strong className={className}>{formatCurrency(displayValue)}</strong>;
}

function WalletMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <article className="premium-metric-card">
      <span>{label}</span>
      <AnimatedCurrency value={value} />
      <p>{detail}</p>
    </article>
  );
}

function LedgerCard({
  entry,
  index,
  highlight = false,
}: {
  entry: WalletLedgerEntry;
  index: number;
  highlight?: boolean;
}) {
  const credit = isCredit(entry);

  return (
    <article
      className={`ledger-card${highlight ? " is-highlighted" : ""}`}
      style={{ animationDelay: `${index * 45}ms` }}
    >
      <div className={`ledger-icon ${credit ? "credit" : "debit"}`} aria-hidden="true">
        {credit ? "+" : "-"}
      </div>
      <div className="ledger-copy">
        <strong>{getEntryLabel(entry)}</strong>
        <span>{entry.description || getEntrySource(entry)}</span>
        <small>{formatDateTime(entry.createdAt)}</small>
      </div>
      <div className="ledger-meta">
        <strong className={credit ? "credit" : "debit"}>
          {credit ? "+" : "-"}
          {formatCurrency(Math.abs(entry.amount))}
        </strong>
        <span>{getEntryStatus(entry)}</span>
      </div>
    </article>
  );
}

export default function WalletPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [status, setStatus] = useState("");
  const [wallet, setWallet] = useState<WalletSummary>(emptyWallet);
  const [ledger, setLedger] = useState<WalletLedgerEntry[]>([]);
  const [rewardEvents, setRewardEvents] = useState<RewardEventSummary[]>([]);
  const [progression, setProgression] = useState<ProgressionSummary>(calculateProgression(0));
  const [rewardTier, setRewardTier] = useState<RewardTier | null>(null);
  const [nextRewardTier, setNextRewardTier] = useState<RewardTier | null>(null);
  const [marketplaceRewards, setMarketplaceRewards] = useState<RewardsMarketplace | null>(null);
  const [walletRewardsMessage, setWalletRewardsMessage] = useState("");

  const rewardHistory = useMemo(() => ledger.filter((entry) => entry.amount > 0), [ledger]);
  const recentActivity = useMemo(() => ledger.slice(0, 5), [ledger]);
  const collectorMoments = useMemo(
    () =>
      rewardEvents.filter(
        (event) => event.walletCreditAwarded > 0 || event.xpAwarded > 0,
      ).map((event) => buildRewardCollectorMoment(event)),
    [rewardEvents],
  );
  const currentEvent =
    marketplaceRewards?.currentEvent?.eventName ||
    marketplaceRewards?.upcomingEvent?.eventName ||
    "None";
  const rewardStatus = walletRewardsMessage || "Automatic GRAIL Credit rewards are active for completed eligible orders.";
  const nextRankProgress = progression.rankProgressPercentage;

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
          setRewardEvents([]);
          setRewardTier(null);
          setNextRewardTier(null);
          setMarketplaceRewards(null);
          setWalletRewardsMessage("");
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
        const rewardsPayload = (await rewardsResponse.json()) as RewardsResponse;

        if (!walletResponse.ok) {
          throw new Error(walletPayload.error || "GRAIL Wallet could not be loaded.");
        }

        if (!isMounted) {
          return;
        }

        setWallet(walletPayload.wallet || emptyWallet);
        setLedger(walletPayload.ledger || []);
        setRewardEvents(walletPayload.rewardEvents || []);
        setProgression(progressionPayload.progression || calculateProgression(0));
        setRewardTier(rewardsPayload.tier || null);
        setNextRewardTier(rewardsPayload.nextTier || null);
        setMarketplaceRewards(rewardsPayload.marketplace || null);
        setWalletRewardsMessage(rewardsPayload.walletRewardsMessage || "");
        setStatus("");
      } catch (error) {
        console.error("Wallet page load error:", error);

        if (isMounted) {
          setWallet(emptyWallet);
          setLedger([]);
          setRewardEvents([]);
          setRewardTier(null);
          setNextRewardTier(null);
          setMarketplaceRewards(null);
          setWalletRewardsMessage("");
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
  }, []);

  return (
    <main className="wallet-page">
      <style>{pageStyles}</style>
      <div className="wallet-shell">
        <Header />

        <section className="page-heading">
          <span>GRAIL Credit</span>
          <h1>Wallet</h1>
          <p>
            A premium view of your GRAIL Credit, reward tier, and wallet
            activity. GRAIL Credit has no cash value, cannot be withdrawn or
            transferred, and may only be used on eligible GRAIL purchases.
          </p>
        </section>

        {isLoading ? (
          <section className="wallet-loading-panel premium-panel" aria-live="polite">
            <span>Secure Wallet</span>
            <h2>Loading your wallet.</h2>
            <p>Retrieving your current GRAIL Credit balance and reward activity.</p>
            <div className="wallet-loading-lines" aria-hidden="true">
              <em />
              <em />
              <em />
            </div>
          </section>
        ) : !isSignedIn ? (
          <section className="sign-in-panel premium-panel">
            <span>Secure Wallet</span>
            <h2>Sign in to view your wallet.</h2>
            <p>Your GRAIL Wallet is tied to your account, progression, and reward history.</p>
            <Link href="/login">Sign In</Link>
          </section>
        ) : (
          <>
            <section className="wallet-hero-grid">
              <article className="balance-card">
                <div className="balance-card-shine" aria-hidden="true" />
                <div className="balance-card-topline">
                  <span>GRAIL Credit</span>
                  <em>{rewardTier?.rankName || "Tier Pending"}</em>
                </div>
                <div className="balance-main">
                  <span>Current Available</span>
                  <AnimatedCurrency value={wallet.availableCredit} className="balance-amount" />
                </div>
                <div className="balance-secondary-grid">
                  <div>
                    <span>Pending</span>
                    <strong>{formatCurrency(wallet.pendingCredit)}</strong>
                  </div>
                  <div>
                    <span>Current Tier</span>
                    <strong>{rewardTier?.rankName || "Tier Pending"}</strong>
                  </div>
                  <div>
                    <span>Current Event</span>
                    <strong>{currentEvent}</strong>
                  </div>
                  <div>
                    <span>Buyer Reward</span>
                    <strong>{formatPercent(rewardTier?.buyerRewardPercent)}</strong>
                  </div>
                  <div>
                    <span>Seller Reward</span>
                    <strong>{formatPercent(rewardTier?.sellerRewardPercent)}</strong>
                  </div>
                  <div>
                    <span>Lifetime Earned</span>
                    <strong>{formatCurrency(wallet.lifetimeEarned)}</strong>
                  </div>
                </div>
              </article>

              <aside className="premium-panel wallet-status-panel">
                <span>Wallet Rules</span>
                <h2>Premium credit, not cash.</h2>
                <p>
                  GRAIL Credit cannot be withdrawn, transferred, or converted to
                  cash. Checkout redemption will appear when it is enabled.
                </p>
                <div className="wallet-rule-grid">
                  <span>Non-transferable</span>
                  <span>Account bound</span>
                  <span>Eligible purchases only</span>
                </div>
                <GrailPassPresenceCard
                  variant="compact"
                  eyebrow="Wallet Preview"
                  title="GRAIL Pass wallet benefits."
                  description="Future Pass benefits can appear here as wallet multipliers or monthly GRAIL Credit once the membership system is active."
                  perkKeys={["wallet_multiplier", "monthly_credit"]}
                />
              </aside>
            </section>

            <section className="metric-grid">
              <WalletMetric
                label="Current Available Credit"
                value={wallet.availableCredit}
                detail="Ready when eligible checkout redemption launches."
              />
              <WalletMetric
                label="Pending Credit"
                value={wallet.pendingCredit}
                detail="Rewards waiting for future availability rules."
              />
              <WalletMetric
                label="Lifetime Earned"
                value={wallet.lifetimeEarned}
                detail="All GRAIL Credit earned over time."
              />
              <WalletMetric
                label="Lifetime Redeemed"
                value={wallet.lifetimeRedeemed}
                detail="Credit used on eligible GRAIL purchases."
              />
            </section>

            <section className="experience-grid">
              <article className="premium-panel tier-card">
                <div className="section-title-row">
                  <div>
                    <span>Current Tier</span>
                    <h2>{rewardTier?.rankName || "Configuration Pending"}</h2>
                  </div>
                  <div
                    className="progression-badge"
                    style={{ borderColor: progression.border, color: progression.accent }}
                  >
                    {progression.icon}
                  </div>
                </div>
                <p>
                  Level {progression.level} {progression.title} ·{" "}
                  {progression.xp.toLocaleString()} lifetime XP
                </p>
                <div className="tier-reward-grid">
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
                    <span>Marketplace Event</span>
                    <strong>{currentEvent}</strong>
                  </div>
                </div>
                <div className="next-rank-block">
                  <div>
                    <span>Next Rank</span>
                    <strong>{progression.nextRankTitle || nextRewardTier?.rankName || "Max tier"}</strong>
                  </div>
                  <em>
                    {progression.nextRankLevel
                      ? `${progression.xpToNextRank.toLocaleString()} XP to Level ${progression.nextRankLevel}`
                      : "Highest configured tier"}
                  </em>
                </div>
                <div className="premium-progress-track">
                  <span style={{ width: `${nextRankProgress}%` }} />
                </div>
                <Link href="/rewards" className="wallet-rewards-link">
                  View Rewards
                </Link>
              </article>

              <aside className="premium-panel pending-card">
                <div className="section-title-row">
                  <div>
                    <span>Pending Credit</span>
                    <h2>{formatCurrency(wallet.pendingCredit)}</h2>
                  </div>
                </div>
                <div className="pending-timeline">
                  <div className="timeline-step active">
                    <em />
                    <div>
                      <strong>Pending</strong>
                      <span>Reward recorded or waiting for future availability rules.</span>
                    </div>
                  </div>
                  <div className={`timeline-step ${wallet.pendingCredit <= 0 ? "active" : ""}`}>
                    <em />
                    <div>
                      <strong>Available</strong>
                      <span>Credit appears in your available balance once eligible.</span>
                    </div>
                  </div>
                </div>
                {wallet.pendingCredit > 0 ? (
                  <p className="panel-note">Pending rewards are tracked separately from your available balance.</p>
                ) : (
                  <p className="panel-note">No pending rewards. Eligible completed rewards appear as available credit.</p>
                )}
              </aside>
            </section>

            <section className="activity-grid">
              <article className="premium-panel recent-panel">
                <div className="section-title-row">
                  <div>
                    <span>Recent Activity</span>
                    <h2>Wallet Timeline</h2>
                  </div>
                  {wallet.updatedAt ? <em>Updated {formatDate(wallet.updatedAt)}</em> : null}
                </div>
                {isLoading ? (
                  <p className="empty-state">Loading wallet activity...</p>
                ) : recentActivity.length > 0 ? (
                  <div className="ledger-card-list">
                    {recentActivity.map((entry, index) => (
                      <LedgerCard key={entry.id} entry={entry} index={index} highlight={index === 0} />
                    ))}
                  </div>
                ) : (
                  <div className="premium-empty-state">
                    <span aria-hidden="true" />
                    <strong>No wallet history yet.</strong>
                    <p>Earn GRAIL Credit by completing eligible purchases and sales.</p>
                  </div>
                )}
              </article>

              <aside className="premium-panel upcoming-panel">
                <div className="section-title-row">
                  <div>
                    <span>Upcoming Rewards</span>
                    <h2>What is next</h2>
                  </div>
                </div>
                <div className="upcoming-list">
                  <div>
                    <strong>{progression.nextRankTitle || nextRewardTier?.rankName || "Top tier reached"}</strong>
                    <span>
                      {nextRewardTier
                        ? `${formatPercent(nextRewardTier.buyerRewardPercent)} buyer reward · ${formatPercent(nextRewardTier.sellerRewardPercent)} seller reward`
                        : progression.nextRankTitle
                          ? "Reward values will appear when the next rank tier is configured."
                        : "You are at the highest configured reward tier."}
                    </span>
                  </div>
                  <div>
                    <strong>Current Multipliers</strong>
                    <span>
                      XP {marketplaceRewards?.currentMultipliers?.xpMultiplier || 1}x · Wallet{" "}
                      {marketplaceRewards?.currentMultipliers?.walletMultiplier || 1}x
                    </span>
                  </div>
                  <div>
                    <strong>Reward Status</strong>
                    <span>{rewardStatus}</span>
                  </div>
                </div>
              </aside>
            </section>

            <section className="premium-panel reward-history-panel">
              <div className="section-title-row">
                <div>
                  <span>Reward History</span>
                  <h2>GRAIL Credit Rewards</h2>
                </div>
              </div>
              {rewardHistory.length > 0 ? (
                <div className="reward-history-grid">
                  {rewardHistory.map((entry, index) => (
                    <LedgerCard key={entry.id} entry={entry} index={index} highlight={index === 0} />
                  ))}
                </div>
              ) : (
                <div className="premium-empty-state compact">
                  <span aria-hidden="true" />
                  <strong>No reward history yet.</strong>
                  <p>Completed eligible orders will create GRAIL Credit reward cards here.</p>
                </div>
              )}
            </section>
          </>
        )}

        {status ? <p className="status-message">{status}</p> : null}
      </div>

      <CollectorMomentLayer
        moments={collectorMoments}
        isReady={!isLoading && isSignedIn}
        isEnabled={isSignedIn}
      />
    </main>
  );
}

const pageStyles = `
  .wallet-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at 50% -120px, rgba(231,222,208,0.10), transparent 31%),
      radial-gradient(circle at 100% 10%, rgba(201,205,211,0.06), transparent 22%),
      linear-gradient(180deg, #000 0%, #030304 58%, #000 100%);
    color: #fafafa;
    font-family: Arial, Helvetica, sans-serif;
  }
  .wallet-shell {
    width: min(1240px, calc(100vw - 32px));
    margin: 0 auto;
    padding: 8px 0 44px;
  }
  .premium-panel,
  .premium-metric-card {
    border: 1px solid #1d1d22;
    border-radius: 14px;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01)),
      rgba(5,5,6,0.93);
    box-shadow: 0 18px 44px rgba(0,0,0,0.28);
  }
  .page-heading {
    margin-top: 18px;
    animation: walletFadeUp 520ms ease both;
  }
  .page-heading span,
  .balance-card-topline span,
  .balance-main span,
  .balance-secondary-grid span,
  .premium-metric-card span,
  .section-title-row span,
  .tier-reward-grid span,
  .next-rank-block span,
  .wallet-status-panel span,
  .wallet-loading-panel span,
  .public-label {
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
  .wallet-status-panel p,
  .wallet-loading-panel p,
  .tier-card p,
  .panel-note,
  .empty-state,
  .status-message,
  .sign-in-panel p,
  .premium-empty-state p {
    color: #a1a1aa;
    font-size: 13px;
    line-height: 19px;
    font-weight: 800;
  }
  .wallet-hero-grid {
    margin-top: 18px;
    display: grid;
    grid-template-columns: minmax(0, 1.55fr) minmax(300px, 0.45fr);
    gap: 16px;
    align-items: stretch;
  }
  .balance-card {
    position: relative;
    min-height: 304px;
    border: 1px solid rgba(231,222,208,0.22);
    border-radius: 24px;
    background:
      radial-gradient(circle at 16% 0%, rgba(231,222,208,0.22), transparent 26%),
      radial-gradient(circle at 80% 12%, rgba(201,205,211,0.16), transparent 24%),
      linear-gradient(135deg, #151515 0%, #050506 42%, #111112 100%);
    box-shadow:
      0 24px 60px rgba(0,0,0,0.42),
      inset 0 1px 0 rgba(255,255,255,0.08);
    overflow: hidden;
    padding: 24px;
    animation: walletCardIn 640ms ease both;
  }
  .balance-card-shine {
    position: absolute;
    inset: -40% -20% auto auto;
    width: 340px;
    height: 340px;
    border-radius: 999px;
    background: radial-gradient(circle, rgba(231,222,208,0.22), transparent 62%);
    pointer-events: none;
  }
  .balance-card-topline {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .balance-card-topline em {
    min-height: 30px;
    border: 1px solid rgba(231,222,208,0.26);
    border-radius: 999px;
    background: rgba(231,222,208,0.08);
    color: #E7DED0;
    display: inline-flex;
    align-items: center;
    padding: 0 11px;
    font-size: 11px;
    line-height: 14px;
    font-style: normal;
    font-weight: 900;
  }
  .balance-main {
    position: relative;
    z-index: 1;
    margin-top: 40px;
  }
  .balance-amount {
    display: block;
    margin-top: 10px;
    color: #fff;
    font-size: clamp(48px, 7vw, 84px);
    line-height: 0.95;
    font-weight: 900;
    letter-spacing: 0;
  }
  .balance-secondary-grid {
    position: relative;
    z-index: 1;
    margin-top: 32px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }
  .balance-secondary-grid div,
  .wallet-rule-grid span {
    border: 1px solid rgba(201,205,211,0.12);
    border-radius: 12px;
    background: rgba(0,0,0,0.28);
    padding: 11px;
  }
  .balance-secondary-grid strong {
    display: block;
    margin-top: 7px;
    color: #fff;
    font-size: 14px;
    line-height: 18px;
    font-weight: 900;
  }
  .wallet-status-panel,
  .sign-in-panel,
  .wallet-loading-panel {
    padding: 18px;
    animation: walletFadeUp 620ms ease both;
  }
  .wallet-status-panel h2,
  .sign-in-panel h2,
  .wallet-loading-panel h2,
  .section-title-row h2 {
    margin: 8px 0 0;
    color: #fff;
    font-size: 22px;
    line-height: 27px;
    font-weight: 900;
  }
  .wallet-rule-grid {
    margin-top: 18px;
    display: grid;
    gap: 8px;
  }
  .wallet-status-panel .grail-pass-presence-card {
    margin-top: 14px;
  }
  .wallet-rule-grid span {
    color: #E7DED0;
    font-size: 12px;
    line-height: 16px;
    font-weight: 900;
  }
  .wallet-loading-panel {
    margin-top: 18px;
    min-height: 240px;
    display: grid;
    align-content: center;
    justify-items: start;
  }
  .wallet-loading-lines {
    margin-top: 18px;
    width: min(420px, 100%);
    display: grid;
    gap: 9px;
  }
  .wallet-loading-lines em {
    height: 10px;
    border-radius: 999px;
    background: linear-gradient(90deg, rgba(201,205,211,0.10), rgba(231,222,208,0.20), rgba(201,205,211,0.10));
    animation: loadingShimmer 1100ms ease-in-out infinite;
  }
  .wallet-loading-lines em:nth-child(2) {
    width: 78%;
    animation-delay: 90ms;
  }
  .wallet-loading-lines em:nth-child(3) {
    width: 52%;
    animation-delay: 180ms;
  }
  .metric-grid {
    margin-top: 16px;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }
  .premium-metric-card {
    min-height: 132px;
    padding: 15px;
    animation: walletFadeUp 640ms ease both;
    transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
  }
  .premium-metric-card:hover {
    transform: translateY(-2px);
    border-color: rgba(231,222,208,0.28);
    box-shadow: 0 20px 50px rgba(0,0,0,0.34);
  }
  .premium-metric-card strong {
    display: block;
    margin-top: 11px;
    color: #fff;
    font-size: 28px;
    line-height: 32px;
    font-weight: 900;
  }
  .premium-metric-card p {
    margin: 8px 0 0;
    color: #85858f;
    font-size: 11px;
    line-height: 16px;
    font-weight: 800;
  }
  .experience-grid,
  .activity-grid {
    margin-top: 16px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 16px;
    align-items: start;
  }
  .tier-card,
  .pending-card,
  .recent-panel,
  .upcoming-panel,
  .reward-history-panel {
    padding: 16px;
    animation: walletFadeUp 700ms ease both;
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
  .progression-badge {
    width: 54px;
    height: 54px;
    border: 1px solid rgba(201,205,211,0.34);
    border-radius: 14px;
    background:
      radial-gradient(circle at 50% 15%, rgba(255,255,255,0.16), transparent 42%),
      linear-gradient(145deg, rgba(231,222,208,0.11), rgba(8,8,10,0.92));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    line-height: 22px;
    font-weight: 900;
  }
  .tier-reward-grid {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }
  .tier-reward-grid div,
  .upcoming-list div {
    border: 1px solid rgba(201,205,211,0.14);
    border-radius: 12px;
    background: rgba(8,8,10,0.72);
    padding: 11px;
  }
  .tier-reward-grid strong,
  .next-rank-block strong,
  .upcoming-list strong {
    display: block;
    margin-top: 6px;
    color: #fff;
    font-size: 16px;
    line-height: 20px;
    font-weight: 900;
  }
  .next-rank-block {
    margin-top: 14px;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 14px;
  }
  .next-rank-block em {
    color: #a1a1aa;
    font-size: 12px;
    line-height: 16px;
    font-style: normal;
    font-weight: 800;
  }
  .premium-progress-track {
    margin-top: 9px;
    height: 8px;
    border-radius: 999px;
    background: rgba(201,205,211,0.12);
    overflow: hidden;
  }
  .premium-progress-track span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #C9CDD3, #E7DED0);
    transition: width 420ms ease;
  }
  .wallet-rewards-link {
    margin-top: 13px;
    border: 1px solid rgba(231,222,208,0.24);
    border-radius: 10px;
    background: rgba(231,222,208,0.055);
    color: #E7DED0;
    min-height: 34px;
    padding: 0 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    font-size: 12px;
    line-height: 15px;
    font-weight: 900;
  }
  .wallet-rewards-link:hover {
    border-color: rgba(231,222,208,0.42);
    background: rgba(231,222,208,0.09);
  }
  .pending-timeline {
    margin-top: 16px;
    display: grid;
    gap: 12px;
  }
  .timeline-step {
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr);
    gap: 10px;
    align-items: start;
  }
  .timeline-step em {
    width: 18px;
    height: 18px;
    border: 1px solid rgba(201,205,211,0.22);
    border-radius: 999px;
    background: #050506;
    margin-top: 2px;
  }
  .timeline-step.active em {
    border-color: rgba(231,222,208,0.62);
    background: radial-gradient(circle, #E7DED0 0 32%, #050506 36%);
    box-shadow: 0 0 18px rgba(231,222,208,0.16);
  }
  .timeline-step strong {
    color: #fff;
    font-size: 13px;
    line-height: 17px;
    font-weight: 900;
  }
  .timeline-step span,
  .upcoming-list span {
    display: block;
    margin-top: 4px;
    color: #85858f;
    font-size: 11px;
    line-height: 16px;
    font-weight: 800;
  }
  .panel-note {
    margin: 14px 0 0;
  }
  .ledger-card-list,
  .reward-history-grid,
  .upcoming-list {
    margin-top: 14px;
    display: grid;
    gap: 9px;
  }
  .reward-history-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .ledger-card {
    position: relative;
    border: 1px solid rgba(201,205,211,0.14);
    border-radius: 14px;
    background: rgba(8,8,10,0.72);
    padding: 12px;
    display: grid;
    grid-template-columns: 38px minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
    animation: ledgerIn 420ms ease both;
    overflow: hidden;
    transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
  }
  .ledger-card::before {
    content: "";
    position: absolute;
    inset: 0 auto 0 0;
    width: 2px;
    background: rgba(201,205,211,0.14);
  }
  .ledger-card.is-highlighted {
    border-color: rgba(231,222,208,0.32);
    background:
      linear-gradient(90deg, rgba(231,222,208,0.075), rgba(8,8,10,0.76) 38%),
      rgba(8,8,10,0.76);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 16px 36px rgba(0,0,0,0.22);
  }
  .ledger-card.is-highlighted::before {
    background: linear-gradient(180deg, #E7DED0, rgba(231,222,208,0.16));
  }
  .ledger-card:hover {
    transform: translateY(-1px);
    border-color: rgba(231,222,208,0.24);
  }
  .ledger-icon {
    width: 36px;
    height: 36px;
    border: 1px solid rgba(201,205,211,0.18);
    border-radius: 999px;
    background: #050506;
    color: #C9CDD3;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    line-height: 20px;
    font-weight: 900;
  }
  .ledger-icon.credit {
    border-color: rgba(231,222,208,0.34);
    color: #E7DED0;
  }
  .ledger-copy strong {
    color: #fff;
    font-size: 13px;
    line-height: 16px;
    font-weight: 900;
  }
  .ledger-copy span,
  .ledger-copy small,
  .ledger-meta span {
    display: block;
    margin-top: 4px;
    color: #85858f;
    font-size: 11px;
    line-height: 15px;
    font-weight: 800;
  }
  .ledger-meta {
    text-align: right;
  }
  .ledger-meta strong {
    display: block;
    color: #fff;
    font-size: 15px;
    line-height: 19px;
    font-weight: 900;
  }
  .ledger-meta strong.credit {
    color: #E7DED0;
  }
  .ledger-meta strong.debit {
    color: #C9CDD3;
  }
  .premium-empty-state {
    margin-top: 14px;
    border: 1px solid rgba(201,205,211,0.12);
    border-radius: 14px;
    background: rgba(201,205,211,0.035);
    min-height: 148px;
    padding: 18px;
    display: grid;
    align-content: center;
    justify-items: start;
  }
  .premium-empty-state.compact {
    min-height: 112px;
  }
  .premium-empty-state > span {
    width: 34px;
    height: 34px;
    border: 1px solid rgba(231,222,208,0.22);
    border-radius: 999px;
    background:
      radial-gradient(circle at 50% 45%, rgba(231,222,208,0.34), transparent 38%),
      #050506;
    display: inline-flex;
  }
  .premium-empty-state strong {
    margin-top: 11px;
    color: #fff;
    font-size: 15px;
    line-height: 19px;
    font-weight: 900;
  }
  .reward-history-panel {
    margin-top: 16px;
  }
  .status-message {
    margin: 14px 0 0;
    border: 1px solid rgba(231,222,208,0.2);
    border-radius: 12px;
    background: rgba(231,222,208,0.065);
    color: #E7DED0;
    padding: 11px 12px;
  }
  .sign-in-panel {
    margin-top: 18px;
    min-height: 220px;
    display: grid;
    align-content: center;
    justify-items: start;
  }
  .sign-in-panel a {
    margin-top: 14px;
    min-height: 40px;
    border: 1px solid rgba(231,222,208,0.28);
    border-radius: 10px;
    background: #E7DED0;
    color: #111;
    padding: 0 16px;
    display: inline-flex;
    align-items: center;
    text-decoration: none;
    font-size: 12px;
    line-height: 15px;
    font-weight: 900;
    transition: transform 160ms ease, filter 160ms ease;
  }
  .sign-in-panel a:hover {
    transform: translateY(-1px);
    filter: brightness(1.05);
  }
  @keyframes walletFadeUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @keyframes walletCardIn {
    from {
      opacity: 0;
      transform: translateY(12px) scale(0.99);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  @keyframes ledgerIn {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @keyframes loadingShimmer {
    0%, 100% {
      opacity: 0.58;
    }
    50% {
      opacity: 1;
    }
  }
  @media (max-width: 1100px) {
    .wallet-hero-grid,
    .metric-grid,
    .experience-grid,
    .activity-grid,
    .tier-reward-grid,
    .reward-history-grid,
    .balance-secondary-grid {
      grid-template-columns: 1fr;
    }
    .balance-card {
      min-height: 300px;
    }
    .balance-main {
      margin-top: 34px;
    }
    .ledger-card {
      grid-template-columns: 36px minmax(0, 1fr);
    }
    .ledger-meta {
      grid-column: 2;
      text-align: left;
    }
  }
  @media (max-width: 680px) {
    .page-heading h1 {
      font-size: 34px;
      line-height: 38px;
    }
    .balance-card {
      border-radius: 18px;
      padding: 18px;
    }
    .balance-amount {
      font-size: 46px;
    }
    .balance-card-topline,
    .next-rank-block,
    .section-title-row {
      align-items: flex-start;
      flex-direction: column;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 1ms !important;
      animation-iteration-count: 1 !important;
      scroll-behavior: auto !important;
      transition-duration: 1ms !important;
    }
  }
`;
