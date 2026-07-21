"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PageShell from "../components/PageShell";
import RequireAuth from "../components/RequireAuth";
import {
  getGrailPassPerksForMembershipType,
  type GrailPassPerk,
} from "../lib/grailPass";
import {
  achievementDefinitions,
  calculateProgression,
  getNextProgressionLevel,
  getNextProgressionRank,
  progressionRanks,
  xpGuideItems,
  type ProgressionRank,
  type ProgressionSummary,
  type XpActivity,
} from "../lib/progression";
import { supabase } from "../../lib/supabase";

type RewardTier = {
  id?: string;
  rankName: string;
  minLevel?: number;
  maxLevel?: number;
  sellerFeePercent: number;
  buyerBasePercent: number;
  sellerBasePercent: number;
  buyerMultiplier: number;
  sellerMultiplier: number;
  buyerRewardPercent: number;
  sellerRewardPercent: number;
  xpMultiplier: number;
  walletMultiplier: number;
  enabled?: boolean;
  displayOrder?: number;
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

type RecentAchievement = {
  id: string;
  key: string;
  title: string;
  description: string;
  unlockedAt: string | null;
};

type ProgressionResponse = {
  progression?: ProgressionSummary;
  recentActivity?: XpActivity[];
  recentAchievements?: RecentAchievement[];
  error?: string;
};

type RewardsResponse = {
  tier?: RewardTier | null;
  nextTier?: RewardTier | null;
  tiers?: RewardTier[];
  marketplace?: RewardsMarketplace | null;
  walletRewardsMessage?: string;
  error?: string;
};

function formatDate(value: string | null) {
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

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

function ProgressMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="progress-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function rankStatus(currentLevel: number, rank: ProgressionRank) {
  if (currentLevel > rank.endLevel) {
    return "Unlocked";
  }

  if (currentLevel >= rank.startLevel && currentLevel <= rank.endLevel) {
    return "Current";
  }

  return "Upcoming";
}

function getRewardTierForLevel(tiers: RewardTier[], level: number) {
  return (
    tiers.find((tier) => {
      const minLevel = Number(tier.minLevel || 0);
      const maxLevel = Number(tier.maxLevel || 0);
      return tier.enabled !== false && level >= minLevel && level <= maxLevel;
    }) || null
  );
}

function buildTierBenefits(tier?: RewardTier | null) {
  if (!tier) {
    return [];
  }

  const benefits = [
    {
      label: "Buyer GRAIL Credit",
      value: formatPercent(tier.buyerRewardPercent),
      detail:
        tier.buyerMultiplier && tier.buyerMultiplier !== 1
          ? `${formatPercent(tier.buyerBasePercent)} base x ${tier.buyerMultiplier}`
          : "Completed eligible purchases.",
    },
    {
      label: "Seller GRAIL Credit",
      value: formatPercent(tier.sellerRewardPercent),
      detail:
        tier.sellerMultiplier && tier.sellerMultiplier !== 1
          ? `${formatPercent(tier.sellerBasePercent)} base x ${tier.sellerMultiplier}`
          : "Completed eligible sales.",
    },
    {
      label: "Seller Fee",
      value: formatPercent(tier.sellerFeePercent),
      detail: "Configured marketplace seller fee.",
    },
  ];

  if (tier.xpMultiplier && tier.xpMultiplier !== 1) {
    benefits.push({
      label: "XP Multiplier",
      value: `${tier.xpMultiplier}x`,
      detail: "Configured progression multiplier.",
    });
  }

  if (tier.walletMultiplier && tier.walletMultiplier !== 1) {
    benefits.push({
      label: "Wallet Multiplier",
      value: `${tier.walletMultiplier}x`,
      detail: "Configured GRAIL Credit multiplier.",
    });
  }

  return benefits;
}

function describeNextRankUnlock(nextRank: ProgressionRank | null, nextTier: RewardTier | null) {
  if (!nextRank) {
    return "Highest collector rank unlocked.";
  }

  if (!nextTier) {
    return `${nextRank.title} begins at Level ${nextRank.startLevel}. Reward values are waiting for GRAIL Economy configuration.`;
  }

  return `${nextRank.title}: ${formatPercent(nextTier.buyerRewardPercent)} buyer credit, ${formatPercent(
      nextTier.sellerRewardPercent,
    )} seller credit, ${formatPercent(nextTier.sellerFeePercent)} seller fee.`;
}

export default function RewardsPage() {
  const [progression, setProgression] = useState<ProgressionSummary>(calculateProgression(0));
  const [recentActivity, setRecentActivity] = useState<XpActivity[]>([]);
  const [recentAchievements, setRecentAchievements] = useState<RecentAchievement[]>([]);
  const [rewardTier, setRewardTier] = useState<RewardTier | null>(null);
  const [nextRewardTier, setNextRewardTier] = useState<RewardTier | null>(null);
  const [rewardTiers, setRewardTiers] = useState<RewardTier[]>([]);
  const [marketplaceRewards, setMarketplaceRewards] = useState<RewardsMarketplace | null>(null);
  const [walletRewardsMessage, setWalletRewardsMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState("");

  const upcomingProgressionLevel = getNextProgressionLevel(progression.level);
  const upcomingProgressionRank = getNextProgressionRank(progression.level);
  const currentEvent =
    marketplaceRewards?.currentEvent?.eventName ||
    marketplaceRewards?.upcomingEvent?.eventName ||
    "None";
  const currentMarketplaceState =
    marketplaceRewards?.currentMarketplaceState ||
    (marketplaceRewards?.marketplaceStatus === "Paused" ? "Paused" : "Normal");
  const currentLevelTier = getRewardTierForLevel(rewardTiers, progression.level) || rewardTier;
  const nextRankTier = upcomingProgressionRank
    ? getRewardTierForLevel(rewardTiers, upcomingProgressionRank.startLevel)
    : nextRewardTier;
  const currentTierBenefits = buildTierBenefits(currentLevelTier);
  const nextUnlockDetail = describeNextRankUnlock(upcomingProgressionRank, nextRankTier);
  const futurePerks = useMemo(
    () => getGrailPassPerksForMembershipType("future"),
    [],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadRewards() {
      setIsLoading(true);
      setStatus("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        if (isMounted) {
          setProgression(calculateProgression(0));
          setRecentActivity([]);
          setRecentAchievements([]);
          setRewardTier(null);
          setNextRewardTier(null);
          setRewardTiers([]);
          setMarketplaceRewards(null);
          setWalletRewardsMessage("");
          setIsLoading(false);
        }
        return;
      }

      try {
        const [progressionResult, rewardsResult] = await Promise.all([
          fetch("/api/progression", {
            headers: {
              authorization: `Bearer ${session.access_token}`,
            },
          }).then((response) => response.json() as Promise<ProgressionResponse>),
          fetch("/api/rewards", {
            headers: {
              authorization: `Bearer ${session.access_token}`,
            },
          }).then((response) => response.json() as Promise<RewardsResponse>),
        ]);

        if (!isMounted) {
          return;
        }

        if (progressionResult.error || rewardsResult.error) {
          setStatus(progressionResult.error || rewardsResult.error || "Rewards could not load.");
        }

        setProgression(progressionResult.progression || calculateProgression(0));
        setRecentActivity(progressionResult.recentActivity || []);
        setRecentAchievements(progressionResult.recentAchievements || []);
        setRewardTier(rewardsResult.tier || null);
        setNextRewardTier(rewardsResult.nextTier || null);
        setRewardTiers(rewardsResult.tiers || []);
        setMarketplaceRewards(rewardsResult.marketplace || null);
        setWalletRewardsMessage(rewardsResult.walletRewardsMessage || "");
      } catch (error) {
        console.warn("Rewards page load skipped:", error);

        if (isMounted) {
          setStatus("Rewards could not load. Try again in a moment.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadRewards();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <RequireAuth>
      <PageShell
        className="rewards-page"
        shellClassName="rewards-shell"
        shellStyle={{ padding: "8px 0 52px" }}
        styles={pageStyles}
      >
          <section className="rewards-hero" aria-labelledby="rewards-title">
            <div className="hero-copy">
              <p className="eyebrow">Collector Progression</p>
              <h1 id="rewards-title">Rewards</h1>
              <p>
                Your home for XP, levels, GRAIL Economy status, progression
                milestones, and future collector perks.
              </p>
              <div className="hero-progress-label">
                <strong>{formatNumber(progression.xp)} XP</strong>
                <span>
                  {progression.nextRankTitle
                    ? `${formatNumber(progression.xpToNextRank)} XP to ${progression.nextRankTitle}`
                    : "Highest collector rank reached"}
                </span>
              </div>
              <div className="hero-progress-track" aria-label="Progress to next rank">
                <span style={{ width: `${progression.rankProgressPercentage}%` }} />
              </div>
            </div>

            <aside className="hero-status-card" aria-label="Current rewards status">
              <div
                className="hero-badge"
                style={{ borderColor: progression.border, color: progression.accent }}
                aria-hidden="true"
              >
                {progression.icon}
              </div>
              <span>Level {progression.level}</span>
              <h2>{progression.title}</h2>
              <p>{progression.tagline}</p>
              <div className="status-grid">
                <div>
                  <small>Current Tier</small>
                  <strong>{currentLevelTier?.rankName || "Pending"}</strong>
                </div>
                <div>
                  <small>Status</small>
                  <strong>{currentMarketplaceState}</strong>
                </div>
                <div>
                  <small>Event</small>
                  <strong>{currentEvent}</strong>
                </div>
              </div>
              {currentTierBenefits.length > 0 ? (
                <div className="current-benefit-list" aria-label="Current benefits">
                  {currentTierBenefits.map((benefit) => (
                    <div key={benefit.label}>
                      <small>{benefit.label}</small>
                      <strong>{benefit.value}</strong>
                    </div>
                  ))}
                </div>
              ) : null}
            </aside>
          </section>

          <section className="progress-grid" aria-label="Progress summary">
            <ProgressMetric
              label="Current XP"
              value={formatNumber(progression.xp)}
              detail="Lifetime XP earned through verified GRAIL activity."
            />
            <ProgressMetric
              label="XP Remaining"
              value={
                progression.nextRankTitle ? formatNumber(progression.xpToNextRank) : "Complete"
              }
              detail={
                upcomingProgressionRank
                  ? `Next rank: ${upcomingProgressionRank.title} at Level ${upcomingProgressionRank.startLevel}.`
                  : "You have reached the highest configured rank."
              }
            />
            <ProgressMetric
              label="Next Unlock"
              value={upcomingProgressionRank?.title || "GRAIL"}
              detail={nextUnlockDetail}
            />
            <ProgressMetric
              label="Current Rank Level"
              value={`${progression.rankLevel}/5`}
              detail={
                upcomingProgressionLevel
                  ? `Level ${upcomingProgressionLevel.level} continues your path to ${progression.nextRankTitle || progression.title}.`
                  : "You have reached the highest configured level."
              }
            />
          </section>

          <section className="section-panel levels-panel" aria-labelledby="levels-title">
            <div className="section-heading">
              <p className="eyebrow">Rank Roadmap</p>
              <h2 id="levels-title">Progress through GRAIL collector society.</h2>
              <p>
                Rewards unlock when you enter a new rank. Levels inside that rank
                show your progress toward the next collector identity.
              </p>
            </div>
            <div className="rank-grid">
              {progressionRanks.map((rank) => {
                const statusLabel = rankStatus(progression.level, rank);
                const rankTier = getRewardTierForLevel(rewardTiers, rank.startLevel);
                const rankBenefits = buildTierBenefits(rankTier);
                const isCurrentRank = statusLabel === "Current";

                return (
                  <article
                    key={rank.title}
                    className={`rank-card ${statusLabel.toLowerCase()}`}
                    style={{ borderColor: isCurrentRank ? rank.border : undefined }}
                  >
                    <div
                      className="rank-icon"
                      style={{ borderColor: rank.border, color: rank.accent }}
                      aria-hidden="true"
                    >
                      {rank.icon}
                    </div>
                    <div>
                      <span>Levels {rank.startLevel}-{rank.endLevel}</span>
                      <h3>{rank.title}</h3>
                      <p>{rank.tagline}</p>
                      <small>
                        {rankTier
                          ? `${rankTier.rankName} economy tier`
                          : "No reward tier configured for this rank yet."}
                      </small>
                      {rankBenefits.length > 0 ? (
                        <div className="rank-benefit-list">
                          {rankBenefits.map((benefit) => (
                            <div key={benefit.label} className="rank-benefit">
                              <b>{benefit.value}</b>
                              <span>{benefit.label}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <div className="rank-identity-list">
                        <span>Rank Badge</span>
                        <span>Collector Identity Title</span>
                        <span>Profile Identity</span>
                        <span>Collection Identity</span>
                      </div>
                    </div>
                    <em>{statusLabel}</em>
                    <strong className="rank-xp">
                      {isCurrentRank
                        ? `Level ${progression.level} · ${progression.rankLevel}/5`
                        : `${formatNumber(rank.minXp)} XP`}
                    </strong>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="perks-layout" aria-labelledby="perks-title">
            <article className="section-panel economy-panel">
              <div className="section-heading">
                <p className="eyebrow">Perks</p>
                <h2 id="perks-title">Current reward tier</h2>
                <p>Economy values come from the Rewards Engine and GRAIL Control Center.</p>
              </div>
              <div className="economy-grid">
                <div>
                  <span>Seller Fee</span>
                  <strong>{formatPercent(currentLevelTier?.sellerFeePercent)}</strong>
                </div>
                <div>
                  <span>Buyer Reward</span>
                  <strong>{formatPercent(currentLevelTier?.buyerRewardPercent)}</strong>
                </div>
                <div>
                  <span>Seller Reward</span>
                  <strong>{formatPercent(currentLevelTier?.sellerRewardPercent)}</strong>
                </div>
                <div>
                  <span>XP Multiplier</span>
                  <strong>{currentLevelTier?.xpMultiplier || 1}x</strong>
                </div>
                <div>
                  <span>Wallet Multiplier</span>
                  <strong>{currentLevelTier?.walletMultiplier || 1}x</strong>
                </div>
                <div>
                  <span>Tier Range</span>
                  <strong>
                    {currentLevelTier?.minLevel && currentLevelTier?.maxLevel
                      ? `L${currentLevelTier.minLevel}-L${currentLevelTier.maxLevel}`
                      : "Pending"}
                  </strong>
                </div>
              </div>
              <div className="next-tier-callout">
                <span>Next Reward Tier</span>
                <strong>{nextRewardTier?.rankName || "Highest configured tier"}</strong>
                <p>
                  {nextRewardTier?.minLevel
                    ? `Begins at Level ${nextRewardTier.minLevel}.`
                    : "No higher reward tier is configured right now."}
                </p>
                {nextRewardTier ? (
                  <div className="next-benefit-list">
                    {buildTierBenefits(nextRewardTier).map((benefit) => (
                      <span key={benefit.label}>
                        {benefit.label}: {benefit.value}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </article>

            <aside className="section-panel future-perks-panel">
              <div className="section-heading compact">
                <p className="eyebrow">Future Perks</p>
                <h2>Framework ready</h2>
              </div>
              <div className="perk-list">
                {futurePerks.map((perk: GrailPassPerk) => (
                  <div key={perk.key}>
                    <strong>{perk.label}</strong>
                    <span>{perk.description}</span>
                    <em>{perk.availability === "available" ? "Available" : "Coming Soon"}</em>
                  </div>
                ))}
              </div>
            </aside>
          </section>

          <section id="xp-guide" className="section-panel xp-panel" aria-labelledby="xp-title">
            <div className="section-heading">
              <p className="eyebrow">How XP Works</p>
              <h2 id="xp-title">Earn XP through verified marketplace actions.</h2>
              <p>
                GRAIL awards XP only from server-verified events. Browser actions
                cannot self-award XP.
              </p>
            </div>
            <div className="xp-grid">
              {xpGuideItems.map((item) => (
                <article key={item.source} className="xp-card">
                  <div>
                    <h3>{item.label}</h3>
                    <p>{item.rule}</p>
                  </div>
                  <div>
                    <strong>+{item.xp} XP</strong>
                    <em>{item.status === "live" ? "Live" : "Coming Soon"}</em>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="moments-grid" aria-labelledby="moments-title">
            <article className="section-panel">
              <div className="section-heading compact">
                <p className="eyebrow">Collector Moments</p>
                <h2 id="moments-title">Recent XP activity</h2>
              </div>
              {isLoading ? (
                <p className="empty-copy">Loading recent progression...</p>
              ) : recentActivity.length > 0 ? (
                <div className="moment-list">
                  {recentActivity.slice(0, 6).map((activity) => (
                    <Link
                      key={activity.id}
                      href={activity.href || "/rewards"}
                      className="moment-row"
                    >
                      <div>
                        <strong>{activity.label}</strong>
                        <span>{formatDate(activity.createdAt)}</span>
                      </div>
                      <em>+{activity.xpAmount} XP</em>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="empty-copy">Recent XP will appear here after verified activity.</p>
              )}
            </article>

            <aside className="section-panel">
              <div className="section-heading compact">
                <p className="eyebrow">Achievements</p>
                <h2>Milestones</h2>
              </div>
              {recentAchievements.length > 0 ? (
                <div className="moment-list">
                  {recentAchievements.map((achievement) => (
                    <div key={achievement.id} className="moment-row static">
                      <div>
                        <strong>{achievement.title}</strong>
                        <span>{achievement.description}</span>
                      </div>
                      <em>{formatDate(achievement.unlockedAt)}</em>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="achievement-preview-list">
                  {achievementDefinitions.slice(0, 4).map((achievement) => (
                    <div key={achievement.key}>
                      <strong>{achievement.title}</strong>
                      <span>{achievement.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </aside>
          </section>

          <section className="section-panel future-panel" aria-labelledby="future-title">
            <div className="section-heading">
              <p className="eyebrow">Future Rewards</p>
              <h2 id="future-title">Coming next</h2>
              <p>
                These previews come from the existing GRAIL Pass perk definitions.
                They do not activate unavailable functionality.
              </p>
            </div>
            <div className="future-grid">
              {futurePerks.slice(0, 6).map((perk) => (
                <article key={perk.key}>
                  <span>{perk.availability === "preview" ? "Preview" : "Coming Soon"}</span>
                  <h3>{perk.label}</h3>
                  <p>{perk.description}</p>
                </article>
              ))}
            </div>
          </section>

          {status ? <p className="status-message">{status}</p> : null}
          {walletRewardsMessage ? (
            <p className="status-message subtle">{walletRewardsMessage}</p>
          ) : null}
      </PageShell>
    </RequireAuth>
  );
}

const pageStyles = `
  .rewards-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at 50% -120px, rgba(231,222,208,0.10), transparent 31%),
      linear-gradient(180deg, #000 0%, #030304 58%, #000 100%);
    color: #fafafa;
    font-family: Arial, Helvetica, sans-serif;
  }

  .rewards-shell {
    width: 1240px;
    margin: 0 auto;
    padding: 8px 0 46px;
  }

  .rewards-hero,
  .section-panel,
  .progress-metric {
    border: 1px solid rgba(231,222,208,0.16);
    border-radius: 14px;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.046), rgba(255,255,255,0.008)),
      rgba(5,5,6,0.94);
    box-shadow: 0 24px 60px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.045);
  }

  .rewards-hero {
    margin-top: 10px;
    min-height: 338px;
    padding: 32px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    gap: 28px;
    align-items: stretch;
    background:
      radial-gradient(circle at 82% 8%, rgba(231,222,208,0.12), transparent 30%),
      linear-gradient(145deg, rgba(255,255,255,0.052), rgba(255,255,255,0.01)),
      rgba(5,5,6,0.96);
  }

  .eyebrow {
    margin: 0;
    color: #C9CDD3;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .hero-copy {
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .hero-copy h1 {
    margin: 12px 0 0;
    color: #fff;
    font-size: 72px;
    line-height: 76px;
    font-weight: 900;
    letter-spacing: 0;
  }

  .hero-copy > p:not(.eyebrow) {
    max-width: 660px;
    margin: 16px 0 0;
    color: #b7bbc2;
    font-size: 16px;
    line-height: 25px;
    font-weight: 800;
  }

  .hero-progress-label {
    margin-top: 34px;
    display: flex;
    justify-content: space-between;
    gap: 16px;
    max-width: 690px;
    color: #E7DED0;
    font-size: 13px;
    line-height: 17px;
    font-weight: 900;
  }

  .hero-progress-label span {
    color: #a1a1aa;
  }

  .hero-progress-track {
    margin-top: 10px;
    max-width: 690px;
    height: 12px;
    border-radius: 999px;
    background: rgba(201,205,211,0.12);
    overflow: hidden;
  }

  .hero-progress-track span,
  .mini-progress-track span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #C9CDD3, #E7DED0);
  }

  .hero-status-card {
    border: 1px solid rgba(231,222,208,0.18);
    border-radius: 14px;
    background:
      radial-gradient(circle at 50% 8%, rgba(231,222,208,0.12), transparent 38%),
      rgba(8,8,10,0.82);
    padding: 22px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .hero-badge {
    width: 88px;
    height: 88px;
    border: 1px solid rgba(201,205,211,0.34);
    border-radius: 20px;
    background:
      radial-gradient(circle at 50% 15%, rgba(255,255,255,0.16), transparent 42%),
      linear-gradient(145deg, rgba(231,222,208,0.11), rgba(8,8,10,0.92));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    line-height: 32px;
    font-weight: 900;
  }

  .hero-status-card > span,
  .progress-metric span,
  .economy-grid span,
  .next-tier-callout span,
  .rank-card span {
    margin-top: 16px;
    color: #85858f;
    font-size: 10px;
    line-height: 13px;
    font-weight: 900;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .hero-status-card h2 {
    margin: 8px 0 0;
    color: #fff;
    font-size: 32px;
    line-height: 36px;
    font-weight: 900;
  }

  .hero-status-card p,
  .section-heading p,
  .progress-metric p,
  .xp-card p,
  .future-grid p,
  .empty-copy,
  .status-message {
    color: #a1a1aa;
    font-size: 13px;
    line-height: 20px;
    font-weight: 800;
  }

  .status-grid,
  .economy-grid,
  .current-benefit-list {
    margin-top: 18px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .current-benefit-list {
    grid-template-columns: 1fr;
    margin-top: 12px;
  }

  .status-grid div,
  .economy-grid div,
  .current-benefit-list div,
  .next-tier-callout {
    border: 1px solid rgba(201,205,211,0.14);
    border-radius: 12px;
    background: rgba(3,3,4,0.72);
    padding: 12px;
  }

  .status-grid small,
  .current-benefit-list small {
    color: #85858f;
    font-size: 10px;
    line-height: 13px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .status-grid strong,
  .economy-grid strong,
  .current-benefit-list strong,
  .next-tier-callout strong {
    display: block;
    margin-top: 6px;
    color: #fff;
    font-size: 16px;
    line-height: 20px;
    font-weight: 900;
  }

  .progress-grid {
    margin-top: 16px;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }

  .progress-metric {
    min-height: 148px;
    padding: 16px;
  }

  .progress-metric strong {
    display: block;
    margin-top: 12px;
    color: #fff;
    font-size: 24px;
    line-height: 28px;
    font-weight: 900;
  }

  .progress-metric p {
    margin: 10px 0 0;
  }

  .section-panel {
    margin-top: 16px;
    padding: 22px;
  }

  .section-heading {
    max-width: 720px;
  }

  .section-heading.compact {
    max-width: none;
  }

  .section-heading h2 {
    margin: 8px 0 0;
    color: #fff;
    font-size: 28px;
    line-height: 34px;
    font-weight: 900;
  }

  .section-heading p:not(.eyebrow) {
    margin: 8px 0 0;
  }

  .rank-grid {
    margin-top: 18px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .rank-card {
    position: relative;
    min-height: 252px;
    border: 1px solid rgba(201,205,211,0.14);
    border-radius: 14px;
    background: rgba(8,8,10,0.72);
    padding: 16px 16px 44px;
    display: grid;
    grid-template-columns: 54px minmax(0, 1fr);
    gap: 12px;
    align-items: start;
  }

  .rank-card.current {
    background:
      radial-gradient(circle at 80% 10%, rgba(231,222,208,0.10), transparent 34%),
      rgba(8,8,10,0.88);
    box-shadow: 0 0 30px rgba(201,205,211,0.09);
  }

  .rank-icon {
    width: 48px;
    height: 48px;
    border: 1px solid rgba(201,205,211,0.34);
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(231,222,208,0.05);
    font-size: 14px;
    font-weight: 900;
  }

  .rank-card span {
    margin: 0;
    display: block;
  }

  .rank-card h3 {
    margin: 5px 0 0;
    color: #fff;
    font-size: 18px;
    line-height: 22px;
    font-weight: 900;
  }

  .rank-card p,
  .rank-card small,
  .perk-list span,
  .achievement-preview-list span,
  .moment-row span {
    display: block;
    margin-top: 7px;
    color: #a1a1aa;
    font-size: 12px;
    line-height: 18px;
    font-weight: 800;
  }

  .rank-card em {
    position: absolute;
    right: 16px;
    top: 16px;
    border: 1px solid rgba(231,222,208,0.22);
    border-radius: 999px;
    background: rgba(231,222,208,0.055);
    color: #E7DED0;
    min-height: 24px;
    padding: 0 9px;
    display: inline-flex;
    align-items: center;
    font-size: 10px;
    line-height: 12px;
    font-style: normal;
    font-weight: 900;
  }

  .rank-benefit-list {
    margin-top: 12px;
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }

  .rank-benefit {
    border: 1px solid rgba(231,222,208,0.14);
    border-radius: 999px;
    background: rgba(231,222,208,0.045);
    min-height: 42px;
    padding: 7px 10px;
    display: inline-flex;
    flex-direction: column;
    justify-content: center;
  }

  .rank-benefit b {
    color: #fff;
    font-size: 12px;
    line-height: 14px;
    font-weight: 900;
  }

  .rank-benefit span {
    margin: 2px 0 0;
    color: #85858f;
    font-size: 9px;
    line-height: 11px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .rank-identity-list {
    margin-top: 12px;
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }

  .rank-identity-list span {
    border: 1px solid rgba(201,205,211,0.12);
    border-radius: 999px;
    background: rgba(201,205,211,0.035);
    color: #C9CDD3;
    min-height: 26px;
    padding: 6px 9px;
    display: inline-flex;
    align-items: center;
    font-size: 10px;
    line-height: 12px;
    font-weight: 900;
    letter-spacing: 0;
    text-transform: none;
  }

  .rank-card .rank-xp {
    position: absolute;
    right: 16px;
    bottom: 14px;
    color: #fff;
    font-size: 12px;
    line-height: 15px;
    font-weight: 900;
  }

  .perks-layout,
  .moments-grid {
    margin-top: 16px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 390px;
    gap: 16px;
    align-items: start;
  }

  .perks-layout .section-panel,
  .moments-grid .section-panel {
    margin-top: 0;
  }

  .economy-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .next-tier-callout {
    margin-top: 12px;
  }

  .next-tier-callout p {
    margin: 7px 0 0;
    color: #a1a1aa;
    font-size: 12px;
    line-height: 17px;
    font-weight: 800;
  }

  .next-benefit-list {
    margin-top: 10px;
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }

  .next-benefit-list span {
    margin: 0;
    border: 1px solid rgba(231,222,208,0.14);
    border-radius: 999px;
    background: rgba(231,222,208,0.045);
    color: #E7DED0;
    padding: 7px 9px;
    font-size: 10px;
    line-height: 12px;
    font-weight: 900;
  }

  .perk-list,
  .moment-list,
  .achievement-preview-list {
    margin-top: 15px;
    display: grid;
    gap: 10px;
  }

  .perk-list div,
  .achievement-preview-list div,
  .moment-row {
    border: 1px solid rgba(201,205,211,0.14);
    border-radius: 12px;
    background: rgba(8,8,10,0.72);
    padding: 12px;
  }

  .perk-list strong,
  .achievement-preview-list strong,
  .moment-row strong {
    display: block;
    color: #fff;
    font-size: 13px;
    line-height: 17px;
    font-weight: 900;
  }

  .perk-list em {
    margin-top: 9px;
    color: #E7DED0;
    display: inline-flex;
    font-size: 10px;
    line-height: 13px;
    font-style: normal;
    font-weight: 900;
    text-transform: uppercase;
  }

  .xp-panel {
    scroll-margin-top: 84px;
  }

  .xp-grid {
    margin-top: 18px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .xp-card {
    border: 1px solid rgba(201,205,211,0.14);
    border-radius: 12px;
    background: rgba(8,8,10,0.72);
    min-height: 126px;
    padding: 14px;
    display: flex;
    justify-content: space-between;
    gap: 16px;
  }

  .xp-card h3,
  .future-grid h3 {
    margin: 0;
    color: #fff;
    font-size: 16px;
    line-height: 20px;
    font-weight: 900;
  }

  .xp-card p {
    margin: 7px 0 0;
    max-width: 480px;
  }

  .xp-card strong {
    color: #fff;
    white-space: nowrap;
    font-size: 14px;
    line-height: 18px;
    font-weight: 900;
  }

  .xp-card em {
    margin-top: 7px;
    color: #E7DED0;
    display: block;
    font-size: 10px;
    line-height: 13px;
    font-style: normal;
    font-weight: 900;
    text-transform: uppercase;
    text-align: right;
  }

  .moment-row {
    color: inherit;
    text-decoration: none;
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: center;
  }

  .moment-row:not(.static):hover {
    border-color: rgba(231,222,208,0.28);
    background: rgba(231,222,208,0.055);
  }

  .moment-row em {
    color: #E7DED0;
    font-size: 12px;
    line-height: 16px;
    font-style: normal;
    font-weight: 900;
    white-space: nowrap;
  }

  .future-grid {
    margin-top: 18px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .future-grid article {
    min-height: 146px;
    border: 1px solid rgba(201,205,211,0.14);
    border-radius: 14px;
    background: rgba(8,8,10,0.72);
    padding: 15px;
  }

  .future-grid span {
    color: #C9CDD3;
    font-size: 10px;
    line-height: 13px;
    font-weight: 900;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .future-grid h3 {
    margin-top: 12px;
  }

  .future-grid p {
    margin: 8px 0 0;
  }

  .status-message {
    margin: 16px 0 0;
    color: #E7DED0;
  }

  .status-message.subtle {
    color: #85858f;
  }

  @media (max-width: 1100px) {
    .rewards-shell {
      width: calc(100vw - 32px);
    }

    .rewards-hero,
    .progress-grid,
    .perks-layout,
    .moments-grid,
    .future-grid {
      grid-template-columns: 1fr;
    }

    .economy-grid,
    .xp-grid,
    .rank-grid {
      grid-template-columns: 1fr;
    }

    .hero-copy h1 {
      font-size: 52px;
      line-height: 58px;
    }
  }

  @media (prefers-reduced-motion: no-preference) {
    .hero-progress-track span,
    .mini-progress-track span {
      transition: width 420ms ease;
    }
  }
`;
