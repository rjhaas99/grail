"use client";

import Image from "next/image";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import CollectorIdentityCard, {
  type CollectorIdentityBadge,
} from "../components/CollectorIdentityCard";
import Header from "../components/Header";
import PublicTrustSection from "../components/PublicTrustSection";
import { supabase } from "../../lib/supabase";
import {
  calculateProgression,
  type ProgressionSummary,
} from "../lib/progression";

type WalletSummary = {
  availableCredit: number;
  pendingCredit: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
};

type RewardTier = {
  rankName: string;
  sellerFeePercent: number;
  buyerBasePercent: number;
  sellerBasePercent: number;
  buyerMultiplier: number;
  sellerMultiplier: number;
  buyerRewardPercent: number;
  sellerRewardPercent: number;
  xpMultiplier: number;
  walletMultiplier: number;
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card panel">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatProfileDate(value: string | null) {
  if (!value) {
    return "Recently";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatPercent(value?: number | null) {
  if (value === null || value === undefined) {
    return "Pending";
  }

  return `${Number(value).toFixed(2)}%`;
}

const emptyWallet: WalletSummary = {
  availableCredit: 0,
  pendingCredit: 0,
  lifetimeEarned: 0,
  lifetimeRedeemed: 0,
};

export default function ProfilePage() {
  const [status, setStatus] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ full_name: string | null; username: string | null } | null>(null);
  const [progression, setProgression] = useState<ProgressionSummary>(calculateProgression(0));
  const [wallet, setWallet] = useState<WalletSummary>(emptyWallet);
  const [rewardTier, setRewardTier] = useState<RewardTier | null>(null);
  const [nextRewardTier, setNextRewardTier] = useState<RewardTier | null>(null);
  const [marketplaceRewards, setMarketplaceRewards] = useState<RewardsMarketplace | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const displayName = String(
    profile?.full_name ||
      profile?.username ||
      user?.user_metadata?.full_name ||
      user?.email?.split("@")[0] ||
      "GRAIL Collector",
  );
  const username = profile?.username || user?.email?.split("@")[0] || "collector";
  const publicCollectionHref = `/collections/${profile?.username || user?.id || "vault-runner"}`;
  const accountInitials = displayName
    .split(" ")
    .map((part) => part.trim().charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase() || "G";
  const currentMarketplaceEvent =
    marketplaceRewards?.currentEvent?.eventName ||
    marketplaceRewards?.upcomingEvent?.eventName ||
    "None";
  const collectorIdentityBadges: CollectorIdentityBadge[] = [
    user?.email_confirmed_at
      ? {
          label: "Verified Email",
          description: "Email confirmed through GRAIL.",
          tone: "verified",
        }
      : null,
    rewardTier?.rankName
      ? {
          label: rewardTier.rankName,
          description: "Current GRAIL economy rank.",
          tone: "prestige",
        }
      : null,
    progression.achievementsCount > 0
      ? {
          label: "Achievement Recorded",
          description: `${progression.achievementsCount} achievement${
            progression.achievementsCount === 1 ? "" : "s"
          } unlocked.`,
          tone: "trust",
        }
      : null,
  ].filter(Boolean) as CollectorIdentityBadge[];

  useEffect(() => {
    let isMounted = true;

    async function loadProfileProgression() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const nextUser = session?.user ?? null;

      if (!nextUser || !session?.access_token) {
        if (isMounted) {
          setUser(null);
          setProfile(null);
          setProgression(calculateProgression(0));
          setWallet(emptyWallet);
          setRewardTier(null);
          setNextRewardTier(null);
          setMarketplaceRewards(null);
        }
        return;
      }

      const accessToken = session.access_token;
      const [
        { data: profileData },
        progressionResult,
        walletResult,
        rewardsResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, username")
          .eq("id", nextUser.id)
          .maybeSingle(),
        fetch("/api/progression", {
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        })
          .then((response) => response.json())
          .catch((error) => {
            console.warn("Profile progression load skipped:", error);
            return {};
          }),
        fetch("/api/wallet", {
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        })
          .then((response) => response.json())
          .catch((error) => {
            console.warn("Profile wallet load skipped:", error);
            return {};
          }),
        fetch("/api/rewards", {
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        })
          .then((response) => response.json())
          .catch((error) => {
            console.warn("Profile rewards load skipped:", error);
            return {};
          }),
      ]);

      if (!isMounted) {
        return;
      }

      setUser(nextUser);
      setProfile(profileData ?? null);
      setProgression(
        (progressionResult as { progression?: ProgressionSummary }).progression ||
          calculateProgression(0),
      );
      setWallet((walletResult as { wallet?: WalletSummary }).wallet || emptyWallet);
      setRewardTier((rewardsResult as { tier?: RewardTier | null }).tier || null);
      setNextRewardTier((rewardsResult as { nextTier?: RewardTier | null }).nextTier || null);
      setMarketplaceRewards(
        (rewardsResult as { marketplace?: RewardsMarketplace | null }).marketplace || null,
      );
    }

    loadProfileProgression();

    return () => {
      isMounted = false;
    };
  }, []);

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(String(reader.result || ""));
      setStatus("Profile photo preview updated. Save profile to persist later.");
    };
    reader.readAsDataURL(file);
  }

  return (
    <main className="account-page">
      <style>{pageStyles}</style>
      <div className="account-shell">
        <Header />

        <section className="page-heading">
          <span>Account</span>
          <h1>Profile</h1>
          <p>Manage your public collector profile and account identity.</p>
        </section>

        <section className="profile-hero panel">
          <button
            type="button"
            className="avatar"
            onClick={() => fileInputRef.current?.click()}
            title="Change Photo"
          >
            {avatarPreview ? (
              <Image
                src={avatarPreview}
                alt="Profile photo preview"
                width={76}
                height={76}
                unoptimized
              />
            ) : (
              <span>{accountInitials}</span>
            )}
            <em>Change Photo</em>
          </button>
          <input
            ref={fileInputRef}
            className="avatar-input"
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
          />
          <div>
            <h2>{displayName}</h2>
            <p>@{username}</p>
            <div className="pill-row">
              <span>Level {progression.level} {progression.title}</span>
              <span>Joined June 2026</span>
              <span>United States</span>
              <Link href={publicCollectionHref}>Public Collection</Link>
            </div>
          </div>
        </section>

        <CollectorIdentityCard
          name={displayName}
          handle={username}
          initials={accountInitials}
          rankTitle={progression.title}
          levelLabel={`Level ${progression.level}`}
          collectorSince={formatProfileDate(user?.created_at || null)}
          marketplaceEvent={currentMarketplaceEvent}
          featuredAchievement={
            progression.achievementsCount > 0
              ? `${progression.achievementsCount} achievement${
                  progression.achievementsCount === 1 ? "" : "s"
                } unlocked`
              : progression.title
          }
          profileHref={publicCollectionHref}
          badges={collectorIdentityBadges}
          metrics={[
            {
              label: "Lifetime XP",
              value: progression.xp.toLocaleString(),
              detail: progression.nextRankTitle
                ? `${progression.rankProgressPercentage}% to ${progression.nextRankTitle}`
                : "Highest rank reached",
            },
            {
              label: "Achievements",
              value: progression.achievementsCount.toLocaleString(),
            },
            {
              label: "GRAIL Credit",
              value: formatCurrency(wallet.availableCredit),
              detail: "Available",
            },
            {
              label: "Reward Tier",
              value: rewardTier?.rankName || "Pending",
            },
          ]}
          narrative="Your collector identity brings together progression, trust, rewards, and public collection history."
          showGrailPassPreview
        />

        <PublicTrustSection userId={user?.id} />

        <section className="progression-panel panel">
          <div
            className="progression-badge-large"
            style={{
              borderColor: progression.border,
              color: progression.accent,
            }}
          >
            {progression.icon}
          </div>
          <div className="progression-copy">
            <span>Level {progression.level}</span>
            <h2>{progression.title}</h2>
            <p>{progression.tagline}</p>
            <p>
              Rewards now has the full XP guide, level ladder, perk previews, and
              recent progression activity.
            </p>
            <div className="progression-track-label">
              <strong>{progression.xp.toLocaleString()} lifetime XP</strong>
              <span>
                {progression.nextRankTitle
                  ? `${progression.xpToNextRank.toLocaleString()} XP to ${progression.nextRankTitle}`
                  : "Highest rank reached"}
              </span>
            </div>
            <div className="profile-progress-track">
              <span style={{ width: `${progression.rankProgressPercentage}%` }} />
            </div>
            <Link href="/rewards#xp-guide" className="xp-guide-toggle">
              View Rewards
            </Link>
          </div>
          <div className="progression-stats">
            <span>Current Level</span>
            <strong>{progression.level}</strong>
            <span>Progress</span>
            <strong>{progression.rankProgressPercentage}%</strong>
            <span>Achievements</span>
            <strong>{progression.achievementsCount}</strong>
          </div>
        </section>

        <section className="stats-grid">
          <StatCard label="Collection Value" value="$18,420" />
          <StatCard label="Watched Cards" value="37" />
          <StatCard label="Offers Sent" value="12" />
          <StatCard label="Completed Purchases" value="5" />
          <StatCard label="GRAIL Rank" value={`${progression.title} · L${progression.level}`} />
        </section>

        <section className="panel wallet-summary-panel">
          <div>
            <span>GRAIL Wallet</span>
            <h2>{formatCurrency(wallet.availableCredit)}</h2>
            <p>Available GRAIL Credit for future checkout features.</p>
          </div>
          <div className="wallet-summary-stats">
            <span>Pending {formatCurrency(wallet.pendingCredit)}</span>
            <span>Lifetime GRAIL Credit Earned {formatCurrency(wallet.lifetimeEarned)}</span>
            <span>Redeemed {formatCurrency(wallet.lifetimeRedeemed)}</span>
          </div>
          <Link href="/wallet">View Wallet</Link>
        </section>

        <section className="panel rewards-summary-panel">
          <div>
            <span>GRAIL Economy</span>
            <h2>{rewardTier?.rankName || "Configuration Pending"}</h2>
            <p>Rewards increase as you level up.</p>
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
          <div className="rewards-summary-grid">
            <div>
              <span>Seller Fee</span>
              <strong>{formatPercent(rewardTier?.sellerFeePercent)}</strong>
            </div>
            <div>
              <span>Current Buyer Reward</span>
              <strong>{formatPercent(rewardTier?.buyerRewardPercent)}</strong>
            </div>
            <div>
              <span>Current Reward %</span>
              <strong>{formatPercent(rewardTier?.buyerRewardPercent)}</strong>
            </div>
            <div>
              <span>Current Seller Reward</span>
              <strong>{formatPercent(rewardTier?.sellerRewardPercent)}</strong>
            </div>
            <div>
              <span>Next Reward Tier</span>
              <strong>{nextRewardTier?.rankName || "Max tier"}</strong>
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

        <section className="content-grid">
          <div className="panel form-panel">
            <h2>Profile Details</h2>
            <label>
              <span>Display name</span>
              <input value={displayName} readOnly />
            </label>
            <label>
              <span>Username</span>
              <input value={`@${username}`} readOnly />
              <small>Username changes are managed in Settings.</small>
            </label>
            <label>
              <span>Bio</span>
              <textarea defaultValue="Collector focused on sports cards, TCG cards, and long-term grails." />
            </label>
          </div>

          <aside className="panel side-panel">
            <h2>Preferences</h2>
            <div className="category-list">
              <span>Sports Cards</span>
              <span>TCG Cards</span>
              <span>Grails</span>
            </div>
            <div className="action-stack">
              <button type="button" onClick={() => setStatus("Profile changes saved.")}>
                Save Changes
              </button>
              <Link href={publicCollectionHref}>View Public Profile</Link>
            </div>
            {status ? <p className="status-message">{status}</p> : null}
          </aside>
        </section>
      </div>
    </main>
  );
}

const pageStyles = `
  .account-page {
    min-height: 100vh;
    background: radial-gradient(circle at 50% -120px, rgba(201,205,211,0.08), transparent 32%), linear-gradient(180deg, #000 0%, #030304 58%, #000 100%);
    color: #fafafa;
    font-family: Arial, Helvetica, sans-serif;
  }
  .account-shell { width: 1240px; margin: 0 auto; padding: 8px 0 38px; }
  .panel {
    border: 1px solid #1d1d22;
    border-radius: 12px;
    background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.006)), rgba(5,5,6,0.92);
    box-shadow: 0 18px 44px rgba(0,0,0,0.28);
  }
  .page-heading { margin-top: 18px; }
  .page-heading span {
    color: #C9CDD3; font-size: 11px; line-height: 14px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase;
  }
  .page-heading h1 { margin: 8px 0 0; color: #fff; font-size: 42px; line-height: 46px; font-weight: 900; }
  .page-heading p, .profile-hero p, .status-message { color: #a1a1aa; font-size: 13px; line-height: 18px; font-weight: 800; }
  .profile-hero { margin-top: 18px; padding: 18px; display: grid; grid-template-columns: 82px 1fr; gap: 16px; align-items: center; }
  .avatar {
    width: 76px; height: 76px; border-radius: 999px; border: 1px solid rgba(201,205,211,0.26);
    background: radial-gradient(circle at 50% 18%, rgba(255,255,255,0.14), transparent 42%), linear-gradient(135deg, #1f2937, #050506);
    color: #E7DED0; display: flex; align-items: center; justify-content: center; font-size: 23px; font-weight: 900; cursor: pointer; position: relative; overflow: hidden; padding: 0;
  }
  .avatar em {
    position: absolute; inset: auto 0 0; min-height: 24px; background: rgba(0,0,0,0.72); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 9px; line-height: 10px; font-style: normal; opacity: 0; transition: opacity 160ms ease;
  }
  .avatar:hover {
    border-color: rgba(231,222,208,0.62); box-shadow: 0 0 20px rgba(201,205,211,0.16);
  }
  .avatar:hover em {
    opacity: 1;
  }
  .avatar img { width: 100%; height: 100%; object-fit: cover; }
  .avatar-input { display: none; }
  .profile-hero h2, .form-panel h2, .side-panel h2 { margin: 0; color: #fff; font-size: 24px; line-height: 28px; font-weight: 900; }
  .pill-row { margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap; }
  .pill-row span, .pill-row a, .category-list span {
    border: 1px solid rgba(231,222,208,0.22); border-radius: 999px; background: rgba(231,222,208,0.055);
    color: #E7DED0; min-height: 28px; padding: 0 10px; display: inline-flex; align-items: center; text-decoration: none; font-size: 11px; font-weight: 900;
  }
  .progression-panel {
    margin-top: 16px;
    padding: 18px;
    display: grid;
    grid-template-columns: 98px minmax(0, 1fr) 160px;
    gap: 18px;
    align-items: center;
  }
  .progression-badge-large {
    width: 92px;
    height: 92px;
    border: 1px solid rgba(201,205,211,0.34);
    border-radius: 18px;
    background:
      radial-gradient(circle at 50% 15%, rgba(255,255,255,0.16), transparent 42%),
      linear-gradient(145deg, rgba(231,222,208,0.11), rgba(8,8,10,0.92));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    line-height: 32px;
    font-weight: 900;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
  }
  .progression-copy span,
  .progression-stats span {
    color: #C9CDD3;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .progression-copy h2 {
    margin: 7px 0 0;
    color: #fff;
    font-size: 26px;
    line-height: 30px;
    font-weight: 900;
  }
  .progression-copy p {
    margin: 7px 0 0;
    color: #a1a1aa;
    font-size: 13px;
    line-height: 18px;
    font-weight: 800;
  }
  .progression-track-label {
    margin-top: 14px;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    color: #E7DED0;
    font-size: 12px;
    line-height: 16px;
    font-weight: 900;
  }
  .profile-progress-track {
    margin-top: 8px;
    height: 8px;
    border-radius: 999px;
    background: rgba(201,205,211,0.12);
    overflow: hidden;
  }
  .profile-progress-track span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #C9CDD3, #E7DED0);
  }
  .xp-guide-toggle {
    margin-top: 12px;
    min-height: 34px;
    border: 1px solid rgba(231,222,208,0.26);
    border-radius: 10px;
    background: rgba(231,222,208,0.055);
    color: #fff;
    padding: 0 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    line-height: 15px;
    font-weight: 900;
    text-decoration: none;
    cursor: pointer;
  }
  .progression-stats {
    border: 1px solid rgba(201,205,211,0.16);
    border-radius: 12px;
    background: rgba(8,8,10,0.72);
    padding: 12px;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 8px 12px;
    align-items: baseline;
  }
  .progression-stats strong {
    color: #fff;
    font-size: 16px;
    line-height: 18px;
    font-weight: 900;
    text-align: right;
  }
  .xp-info-grid {
    margin-top: 16px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    gap: 16px;
    align-items: start;
  }
  .xp-guide-panel, .xp-activity-panel {
    padding: 16px;
  }
  .section-title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  .section-title-row span {
    color: #C9CDD3;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .section-title-row h2 {
    margin: 6px 0 0;
    color: #fff;
    font-size: 20px;
    line-height: 24px;
    font-weight: 900;
  }
  .section-title-row button {
    min-height: 34px;
    border: 1px solid rgba(231,222,208,0.26);
    border-radius: 10px;
    background: rgba(231,222,208,0.055);
    color: #fff;
    padding: 0 12px;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
  }
  .xp-rule-note {
    margin: 12px 0 0;
    color: #a1a1aa;
    font-size: 12px;
    line-height: 17px;
    font-weight: 800;
  }
  .xp-guide-list, .xp-activity-list {
    margin-top: 12px;
    display: grid;
    gap: 8px;
  }
  .xp-guide-row, .xp-activity-row {
    border: 1px solid rgba(201,205,211,0.14);
    border-radius: 10px;
    background: rgba(8,8,10,0.72);
    padding: 11px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
  }
  .xp-guide-row strong, .xp-activity-row strong {
    color: #fff;
    font-size: 13px;
    line-height: 16px;
    font-weight: 900;
  }
  .xp-guide-row span, .xp-activity-row span {
    display: block;
    margin-top: 4px;
    color: #85858f;
    font-size: 11px;
    line-height: 15px;
    font-weight: 800;
  }
  .xp-guide-value {
    text-align: right;
    display: grid;
    gap: 5px;
    justify-items: end;
  }
  .xp-guide-value em, .xp-activity-row em {
    border: 1px solid rgba(231,222,208,0.2);
    border-radius: 999px;
    background: rgba(231,222,208,0.055);
    color: #E7DED0;
    min-height: 23px;
    padding: 0 8px;
    display: inline-flex;
    align-items: center;
    font-size: 10px;
    line-height: 12px;
    font-style: normal;
    font-weight: 900;
  }
  .xp-activity-row a {
    margin-top: 6px;
    color: #E7DED0;
    display: inline-flex;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    text-decoration: none;
  }
  .stats-grid { margin-top: 16px; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
  .stat-card { min-height: 82px; padding: 14px; }
  .stat-card span { color: #85858f; font-size: 11px; line-height: 14px; font-weight: 800; }
  .stat-card strong { display: block; margin-top: 8px; color: #fff; font-size: 24px; line-height: 28px; font-weight: 900; }
  .wallet-summary-panel {
    margin-top: 16px;
    padding: 16px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 16px;
    align-items: center;
  }
  .wallet-summary-panel span {
    color: #C9CDD3;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .wallet-summary-panel h2 {
    margin: 7px 0 0;
    color: #fff;
    font-size: 28px;
    line-height: 32px;
    font-weight: 900;
  }
  .wallet-summary-panel p {
    margin: 6px 0 0;
    color: #a1a1aa;
    font-size: 12px;
    line-height: 17px;
    font-weight: 800;
  }
  .wallet-summary-stats {
    display: grid;
    gap: 6px;
    text-align: right;
  }
  .wallet-summary-panel a {
    min-height: 40px;
    border: 1px solid rgba(231,222,208,0.28);
    border-radius: 10px;
    background: rgba(231,222,208,0.055);
    color: #fff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 14px;
    text-decoration: none;
    font-size: 12px;
    font-weight: 900;
  }
  .rewards-summary-panel {
    margin-top: 16px;
    padding: 16px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 1.5fr;
    gap: 16px;
    align-items: center;
  }
  .rewards-summary-panel span,
  .rewards-summary-grid span {
    color: #C9CDD3;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .rewards-summary-panel h2 {
    margin: 7px 0 0;
    color: #fff;
    font-size: 24px;
    line-height: 28px;
    font-weight: 900;
  }
  .rewards-summary-panel p {
    margin: 6px 0 0;
    color: #a1a1aa;
    font-size: 12px;
    line-height: 17px;
    font-weight: 800;
  }
  .rewards-summary-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }
  .rewards-summary-grid div {
    border: 1px solid rgba(201,205,211,0.14);
    border-radius: 10px;
    background: rgba(8,8,10,0.72);
    padding: 11px;
  }
  .rewards-summary-grid strong {
    display: block;
    margin-top: 6px;
    color: #fff;
    font-size: 18px;
    line-height: 22px;
    font-weight: 900;
  }
  .content-grid { margin-top: 16px; display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 16px; }
  .form-panel, .side-panel { padding: 16px; }
  label { display: grid; gap: 7px; margin-top: 14px; }
  label span { color: #C9CDD3; font-size: 12px; font-weight: 900; }
  input, textarea {
    border: 1px solid #24242a; border-radius: 10px; background: #08080a; color: #fff; padding: 12px; box-sizing: border-box; font: inherit; font-size: 13px; font-weight: 800; outline: none;
  }
  input[readonly] { color: #a1a1aa; cursor: not-allowed; }
  label small, .trust-note { color: #85858f; font-size: 11px; line-height: 15px; font-weight: 800; }
  textarea { min-height: 112px; resize: vertical; }
  .category-list { margin-top: 14px; display: flex; flex-wrap: wrap; gap: 8px; }
  .action-stack { margin-top: 16px; display: grid; gap: 10px; }
  .action-stack button, .action-stack a {
    min-height: 40px; border: 1px solid rgba(231,222,208,0.28); border-radius: 10px; background: rgba(231,222,208,0.055);
    color: #fff; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; font-size: 12px; font-weight: 900; cursor: pointer;
  }
  .action-stack button { background: #E7DED0; color: #111; }
  .status-message { margin: 12px 0 0; border: 1px solid rgba(52,211,153,0.24); border-radius: 10px; background: rgba(52,211,153,0.07); color: #86efac; padding: 10px; }
  @media (max-width: 1100px) {
    .account-shell { width: calc(100vw - 32px); }
    .profile-hero, .progression-panel, .xp-info-grid, .stats-grid, .wallet-summary-panel, .rewards-summary-panel, .rewards-summary-grid, .content-grid { grid-template-columns: 1fr; }
    .progression-stats { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .progression-stats strong { text-align: left; }
    .wallet-summary-stats { text-align: left; }
  }
`;
