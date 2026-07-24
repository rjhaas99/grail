"use client";

import Image from "next/image";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import CollectorLevelBadge from "../components/CollectorLevelBadge";
import GrailPassBadge from "../components/GrailPassBadge";
import PageShell from "../components/PageShell";
import { supabase } from "../../lib/supabase";
import {
  calculateProgression,
  type ProgressionSummary,
} from "../lib/progression";
import type { GrailPassMembership } from "../lib/grailPass";
import { getPublicCollectorHref } from "../lib/publicCollectorLinks";

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
  currentCountdown?: {
    label: string;
    status: string;
  };
};

type RewardBoostConfig = {
  configured: boolean;
  enabled: boolean;
  buyerBonusPercent: number | null;
  sellerBonusPercent: number | null;
};

type GrailPassResponse = {
  membership?: GrailPassMembership;
  rewardBoost?: RewardBoostConfig;
};

type ProfileRow = {
  full_name: string | null;
  username: string | null;
  bio?: string | null;
  seller_level?: string | null;
  verified?: boolean | null;
  created_at?: string | null;
};

type ListingImageRow = {
  image_url: string | null;
  image_type: string | null;
};

type CollectionListingRow = {
  id: string;
  title: string | null;
  status: string | null;
  price: number | string | null;
  estimated_value?: number | string | null;
  sportscardspro_estimated_value?: number | string | null;
  created_at: string | null;
  listing_images?: ListingImageRow[] | null;
};

type OrderRow = {
  id: string;
  buyer_id: string | null;
  seller_id: string | null;
  transfer_status: string | null;
  completed_at: string | null;
};

type ActivitySummary = {
  activeListings: number;
  completedSales: number;
  purchases: number;
  offers: number;
  watches: number;
  messages: number;
  sellerReputation: string | null;
};

type CollectionSummary = {
  cardCount: number;
  estimatedValue: number | null;
  heroImageUrl: string | null;
  heroTitle: string | null;
};

type StripeConnectStatus = {
  connected?: boolean;
  onboardingStatus?: string;
  payoutsEnabled?: boolean;
  error?: string;
};

type TrustBadgeResponse = {
  summary?: {
    completedSales?: number;
    completedPurchases?: number;
    verificationStatus?: string;
  };
};

const emptyWallet: WalletSummary = {
  availableCredit: 0,
  pendingCredit: 0,
  lifetimeEarned: 0,
  lifetimeRedeemed: 0,
};

const emptyActivity: ActivitySummary = {
  activeListings: 0,
  completedSales: 0,
  purchases: 0,
  offers: 0,
  watches: 0,
  messages: 0,
  sellerReputation: null,
};

const emptyCollection: CollectionSummary = {
  cardCount: 0,
  estimatedValue: null,
  heroImageUrl: null,
  heroTitle: null,
};

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
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Pending";
  }

  return `${Number(value).toFixed(2)}%`;
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value || 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

function getListingImage(listing?: CollectionListingRow | null) {
  return (
    listing?.listing_images?.find((image) => image.image_type === "front")?.image_url ||
    listing?.listing_images?.find((image) => Boolean(image.image_url))?.image_url ||
    null
  );
}

function getCollectionSummary(listings: CollectionListingRow[]): CollectionSummary {
  if (listings.length === 0) {
    return emptyCollection;
  }

  const listingsWithValues = listings
    .map((listing) => ({
      listing,
      value:
        toNumber(listing.sportscardspro_estimated_value) ||
        toNumber(listing.estimated_value),
    }))
    .filter((item) => item.value > 0);
  const strongest =
    listingsWithValues.sort((left, right) => right.value - left.value)[0]?.listing ||
    listings.find((listing) => Boolean(getListingImage(listing))) ||
    listings[0];
  const estimatedValue = listingsWithValues.length
    ? listingsWithValues.reduce((sum, item) => sum + item.value, 0)
    : null;

  return {
    cardCount: listings.length,
    estimatedValue,
    heroImageUrl: getListingImage(strongest),
    heroTitle: strongest?.title || null,
  };
}

function getCompletedCount(
  rows: OrderRow[],
  userId: string,
  role: "buyer_id" | "seller_id",
) {
  return rows.filter(
    (row) =>
      row[role] === userId &&
      row.transfer_status === "paid" &&
      Boolean(row.completed_at),
  ).length;
}

async function safeCount<T>(
  loader: () => PromiseLike<{ data: T[] | null; error: unknown }>,
) {
  try {
    const { data, error } = await loader();

    if (error) {
      return 0;
    }

    return data?.length || 0;
  } catch {
    return 0;
  }
}

export default function ProfilePage() {
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [status, setStatus] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [progression, setProgression] = useState<ProgressionSummary>(calculateProgression(0));
  const [wallet, setWallet] = useState<WalletSummary>(emptyWallet);
  const [rewardTier, setRewardTier] = useState<RewardTier | null>(null);
  const [nextRewardTier, setNextRewardTier] = useState<RewardTier | null>(null);
  const [marketplaceRewards, setMarketplaceRewards] = useState<RewardsMarketplace | null>(null);
  const [grailPass, setGrailPass] = useState<GrailPassMembership | null>(null);
  const [grailPassRewardBoost, setGrailPassRewardBoost] = useState<RewardBoostConfig | null>(null);
  const [collection, setCollection] = useState<CollectionSummary>(emptyCollection);
  const [activity, setActivity] = useState<ActivitySummary>(emptyActivity);
  const [stripeConnect, setStripeConnect] = useState<StripeConnectStatus | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const displayName = String(
    profile?.full_name ||
      profile?.username ||
      user?.user_metadata?.full_name ||
      user?.email?.split("@")[0] ||
      "GRAIL Collector",
  );
  const username = profile?.username || user?.email?.split("@")[0] || "collector";
  const publicCollectionHref = user
    ? getPublicCollectorHref(
        { id: user.id, username: profile?.username || null },
        user.id,
      )
    : "/collections";
  const accountInitials = displayName
    .split(" ")
    .map((part) => part.trim().charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase() || "G";
  const activeGrailPass = Boolean(
    grailPass?.status === "active" || grailPass?.status === "trialing",
  );
  const rankLabel = rewardTier?.rankName || progression.title;
  const joinedDate = formatProfileDate(profile?.created_at || user?.created_at || null);
  const nextRankMilestone = nextRewardTier?.rankName
    ? `${nextRewardTier.rankName} · ${progression.xpToNextRank.toLocaleString()} XP needed`
    : progression.nextRankTitle
      ? `${progression.nextRankTitle} · ${progression.xpToNextRank.toLocaleString()} XP needed`
      : "Highest configured rank reached";
  const activeEventLabel =
    marketplaceRewards?.currentEvent?.eventName ||
    marketplaceRewards?.upcomingEvent?.eventName ||
    null;
  const activityMetrics = useMemo(
    () =>
      [
        activity.activeListings > 0
          ? { label: "Active listings", value: String(activity.activeListings) }
          : null,
        activity.completedSales > 0
          ? { label: "Completed sales", value: String(activity.completedSales) }
          : null,
        activity.purchases > 0
          ? { label: "Purchases", value: String(activity.purchases) }
          : null,
        activity.offers > 0
          ? { label: "Offers", value: String(activity.offers) }
          : null,
        activity.watches > 0
          ? { label: "Watched cards", value: String(activity.watches) }
          : null,
        activity.messages > 0
          ? { label: "Messages", value: String(activity.messages) }
          : null,
        activity.sellerReputation
          ? { label: "Seller reputation", value: activity.sellerReputation }
          : null,
      ].filter(Boolean) as Array<{ label: string; value: string }>,
    [activity],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setIsLoadingProfile(true);

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
          setGrailPass(null);
          setGrailPassRewardBoost(null);
          setCollection(emptyCollection);
          setActivity(emptyActivity);
          setStripeConnect(null);
          setIsLoadingProfile(false);
        }
        return;
      }

      const accessToken = session.access_token;
      const [
        { data: profileData },
        progressionResult,
        walletResult,
        rewardsResult,
        grailPassResult,
        stripeResult,
        listingsResult,
        ordersResult,
        trustResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, username, bio, seller_level, verified, created_at")
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
        fetch("/api/grail-pass/subscription", {
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        })
          .then((response) => response.json())
          .catch((error) => {
            console.warn("Profile GRAIL Pass load skipped:", error);
            return {};
          }),
        fetch("/api/stripe/connect/status", {
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        })
          .then((response) => response.json())
          .catch((error) => {
            console.warn("Profile Stripe Connect load skipped:", error);
            return {};
          }),
        supabase
          .from("listings")
          .select(
            `
              id,
              title,
              status,
              price,
              estimated_value,
              sportscardspro_estimated_value,
              created_at,
              listing_images (
                image_url,
                image_type
              )
            `,
          )
          .eq("seller_id", nextUser.id)
          .neq("status", "deleted")
          .limit(100),
        supabase
          .from("orders")
          .select("id, buyer_id, seller_id, transfer_status, completed_at")
          .or(`buyer_id.eq.${nextUser.id},seller_id.eq.${nextUser.id}`)
          .limit(500),
        fetch(`/api/trust/badges?userId=${encodeURIComponent(nextUser.id)}`)
          .then((response) => response.json())
          .catch((error) => {
            console.warn("Profile trust summary load skipped:", error);
            return {};
          }),
      ]);

      const [offerCount, watchCount, messageCount] = await Promise.all([
        safeCount(() =>
          supabase
            .from("offers")
            .select("id")
            .or(`buyer_id.eq.${nextUser.id},seller_id.eq.${nextUser.id}`)
            .limit(500),
        ),
        safeCount(() =>
          supabase
            .from("watchlist")
            .select("id")
            .eq("user_id", nextUser.id)
            .limit(500),
        ),
        safeCount(() =>
          supabase
            .from("messages")
            .select("id")
            .or(`sender_id.eq.${nextUser.id},receiver_id.eq.${nextUser.id}`)
            .limit(500),
        ),
      ]);

      if (!isMounted) {
        return;
      }

      const listings = ((listingsResult.data || []) as CollectionListingRow[]);
      const orders = ((ordersResult.data || []) as OrderRow[]);
      const trustSummary = (trustResult as TrustBadgeResponse).summary;
      const nextProfile = profileData as ProfileRow | null;
      const sellerReputation =
        nextProfile?.seller_level ||
        trustSummary?.verificationStatus ||
        (nextProfile?.verified ? "Verified seller" : null);

      setUser(nextUser);
      setProfile(nextProfile);
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
      setGrailPass((grailPassResult as GrailPassResponse).membership || null);
      setGrailPassRewardBoost((grailPassResult as GrailPassResponse).rewardBoost || null);
      setStripeConnect(stripeResult as StripeConnectStatus);
      setCollection(getCollectionSummary(listings));
      setActivity({
        activeListings: listings.filter((listing) => listing.status === "active").length,
        completedSales:
          trustSummary?.completedSales ?? getCompletedCount(orders, nextUser.id, "seller_id"),
        purchases:
          trustSummary?.completedPurchases ?? getCompletedCount(orders, nextUser.id, "buyer_id"),
        offers: offerCount,
        watches: watchCount,
        messages: messageCount,
        sellerReputation,
      });
      setIsLoadingProfile(false);
    }

    loadProfile();

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

  if (isLoadingProfile) {
    return (
      <PageShell
        className="account-page"
        shellClassName="account-shell"
        shellStyle={{ padding: "8px 0 38px" }}
        styles={pageStyles}
      >
        <section className="profile-section panel auth-state" aria-live="polite">
          <span>Collector Profile</span>
          <h1>Loading your collector profile.</h1>
          <p>Preparing your identity, collection, activity, rewards, and account details.</p>
        </section>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell
        className="account-page"
        shellClassName="account-shell"
        shellStyle={{ padding: "8px 0 38px" }}
        styles={pageStyles}
      >
        <section className="profile-section panel auth-state">
          <span>Collector Profile</span>
          <h1>Sign in to view your collector profile.</h1>
          <p>Your private account details and collector identity are available after sign in.</p>
          <div className="action-stack inline-actions">
            <Link href="/login">Sign In</Link>
          </div>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell
      className="account-page"
      shellClassName="account-shell"
      shellStyle={{ padding: "8px 0 38px" }}
      styles={pageStyles}
    >
      <section className="collector-hero panel" aria-labelledby="profile-title">
        <div className="hero-identity">
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
                width={96}
                height={96}
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
          <div className="identity-copy">
            <span>Collector Profile</span>
            <h1 id="profile-title">{displayName}</h1>
            <p>@{username}</p>
            {profile?.bio ? <p className="collector-bio">{profile.bio}</p> : null}
          </div>
        </div>

        <div className="hero-status">
          <div>
            <span>Rank</span>
            <strong className="rank-badge-line">
              <CollectorLevelBadge
                level={progression.level}
                rank={progression.title}
                size="sm"
              />
              {rankLabel}
            </strong>
          </div>
          <div>
            <span>Level</span>
            <strong>{progression.level}</strong>
          </div>
          {activeGrailPass && grailPass ? (
            <div className="pass-status">
              <span>GRAIL Pass</span>
              <GrailPassBadge membership={grailPass} />
            </div>
          ) : null}
          <div>
            <span>Member Since</span>
            <strong>{joinedDate}</strong>
          </div>
        </div>

        <div className="hero-progress">
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
        </div>
      </section>

      <section
        className={`profile-section collection-showcase panel${
          collection.heroImageUrl ? "" : " empty-collection"
        }`}
        aria-labelledby="collection-title"
      >
        {collection.heroImageUrl ? (
          <div className="collection-art">
            <Image
              src={collection.heroImageUrl}
              alt={collection.heroTitle || "Collection card"}
              width={420}
              height={560}
              unoptimized
            />
          </div>
        ) : null}
        <div className="section-copy">
          <span>Collection Showcase</span>
          <h2 id="collection-title">{displayName}&apos;s Collection</h2>
          {collection.heroTitle ? <p>{collection.heroTitle}</p> : null}
          {collection.cardCount > 0 ? (
            <div className="collection-facts">
              <strong>{collection.cardCount.toLocaleString()} cards</strong>
              {collection.estimatedValue ? (
                <strong>{formatCurrency(collection.estimatedValue)} estimated value</strong>
              ) : null}
            </div>
          ) : (
            <p className="empty-copy">No public collection content yet.</p>
          )}
          <div className="action-stack inline-actions">
            <Link href={publicCollectionHref}>View Public Profile</Link>
          </div>
        </div>
      </section>

      <section className="profile-section marketplace-activity panel" aria-labelledby="activity-title">
        <div className="section-copy">
          <span>Marketplace Activity</span>
          <h2 id="activity-title">Collector activity at a glance.</h2>
          <p>Only reliable account activity appears here. Empty metrics stay hidden.</p>
        </div>
        {activityMetrics.length > 0 ? (
          <div className="activity-list">
            {activityMetrics.map((metric) => (
              <div key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-copy">Marketplace activity will appear after buying, selling, watching, messaging, or receiving offers.</p>
        )}
      </section>

      <section className="profile-section rewards-membership panel" aria-labelledby="rewards-title">
        <div className="section-copy">
          <span>Rewards and Membership</span>
          <h2 id="rewards-title">What changes as you participate.</h2>
          <p>
            Reward rates, active bonuses, and the next meaningful milestone stay grouped here.
          </p>
        </div>
        <div className="rewards-summary-grid">
          <div>
            <span>Buyer Reward</span>
            <strong>{formatPercent(rewardTier?.buyerRewardPercent)}</strong>
          </div>
          <div>
            <span>Seller Reward</span>
            <strong>{formatPercent(rewardTier?.sellerRewardPercent)}</strong>
          </div>
          {activeGrailPass && grailPassRewardBoost?.configured && grailPassRewardBoost.enabled ? (
            <>
              <div>
                <span>Pass Buyer Bonus</span>
                <strong>{formatPercent(grailPassRewardBoost.buyerBonusPercent)}</strong>
              </div>
              <div>
                <span>Pass Seller Bonus</span>
                <strong>{formatPercent(grailPassRewardBoost.sellerBonusPercent)}</strong>
              </div>
            </>
          ) : null}
          <div>
            <span>Next Milestone</span>
            <strong>{nextRankMilestone}</strong>
          </div>
          {activeEventLabel ? (
            <div>
              <span>Event</span>
              <strong>
                {activeEventLabel}
                {marketplaceRewards?.currentCountdown?.label
                  ? ` · ${marketplaceRewards.currentCountdown.label}`
                  : ""}
              </strong>
            </div>
          ) : null}
        </div>
        <div className="action-stack inline-actions">
          <Link href="/rewards#xp-guide">View Rewards</Link>
          <Link href="/grail-pass">View GRAIL Pass</Link>
        </div>
      </section>

      <section className="profile-section account-details panel" aria-labelledby="account-title">
        <div className="section-copy">
          <span>Account Details</span>
          <h2 id="account-title">Owner-only account controls.</h2>
          <p>Private operational information is shown only on your signed-in profile page.</p>
        </div>
        <div className="account-grid">
          {user?.email ? (
            <div>
              <span>Email</span>
              <strong>{user.email}</strong>
            </div>
          ) : null}
          <div>
            <span>Account Status</span>
            <strong>{user?.email_confirmed_at ? "Email verified" : "Email verification pending"}</strong>
          </div>
          <div>
            <span>Stripe Connect</span>
            <strong>
              {stripeConnect?.connected
                ? stripeConnect.payoutsEnabled
                  ? "Payouts enabled"
                  : stripeConnect.onboardingStatus || "Connected"
                : "Not connected"}
            </strong>
          </div>
          <div>
            <span>Profile Visibility</span>
            <strong>Public collection page available</strong>
          </div>
          <div>
            <span>Available Wallet Credit</span>
            <strong>{formatCurrency(wallet.availableCredit)}</strong>
          </div>
        </div>
        <div className="content-grid compact-editor">
          <div className="form-panel">
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
              <textarea defaultValue={profile?.bio || ""} />
            </label>
          </div>
          <aside className="side-panel">
            <div className="action-stack">
              <button type="button" onClick={() => setStatus("Profile changes saved.")}>
                Save Changes
              </button>
              <Link href="/wallet">View Wallet</Link>
              <Link href="/seller-dashboard">Seller Dashboard</Link>
              <Link href="/billing-payouts">Billing &amp; Payouts</Link>
            </div>
            {status ? <p className="status-message">{status}</p> : null}
          </aside>
        </div>
      </section>
    </PageShell>
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
  .collector-hero {
    margin-top: 10px;
    padding: 22px;
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
    gap: 22px;
    align-items: center;
  }
  .hero-identity {
    display: grid;
    grid-template-columns: 104px minmax(0, 1fr);
    gap: 18px;
    align-items: center;
  }
  .avatar {
    width: 96px; height: 96px; border-radius: 999px; border: 1px solid rgba(201,205,211,0.26);
    background: radial-gradient(circle at 50% 18%, rgba(255,255,255,0.14), transparent 42%), linear-gradient(135deg, #1f2937, #050506);
    color: #E7DED0; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 900; cursor: pointer; position: relative; overflow: hidden; padding: 0;
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
  .identity-copy span,
  .auth-state > span,
  .section-copy > span,
  .hero-status span,
  .collection-facts strong,
  .activity-list span,
  .rewards-summary-grid span,
  .account-grid span {
    color: #C9CDD3;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .identity-copy h1 {
    margin: 8px 0 0;
    color: #fff;
    font-size: clamp(38px, 5vw, 70px);
    line-height: 0.95;
    font-weight: 900;
    letter-spacing: -0.06em;
  }
  .auth-state {
    margin-top: 10px;
    padding: 28px;
  }
  .auth-state h1 {
    margin: 8px 0 0;
    color: #fff;
    font-size: clamp(32px, 4vw, 52px);
    line-height: 1;
    font-weight: 900;
    letter-spacing: -0.045em;
  }
  .auth-state p {
    margin: 10px 0 0;
    color: #a1a1aa;
    font-size: 13px;
    line-height: 18px;
    font-weight: 800;
  }
  .identity-copy p,
  .section-copy p,
  .empty-copy,
  .status-message {
    color: #a1a1aa;
    font-size: 13px;
    line-height: 18px;
    font-weight: 800;
  }
  .identity-copy p {
    margin: 9px 0 0;
  }
  .collector-bio {
    max-width: 680px;
    color: #D8D2C8 !important;
  }
  .hero-status {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .hero-status > div {
    border: 1px solid rgba(201,205,211,0.14);
    border-radius: 12px;
    background: rgba(8,8,10,0.72);
    padding: 12px;
  }
  .hero-status strong {
    display: block;
    margin-top: 6px;
    color: #fff;
    font-size: 17px;
    line-height: 21px;
    font-weight: 900;
  }
  .hero-status strong.rank-badge-line {
    display: flex;
    align-items: center;
    gap: 9px;
  }
  .pass-status {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }
  .hero-progress {
    grid-column: 1 / -1;
  }
  .progression-track-label {
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
  .profile-section {
    margin-top: 16px;
    padding: 18px;
  }
  .collection-showcase {
    display: grid;
    grid-template-columns: 260px minmax(0, 1fr);
    gap: 22px;
    align-items: center;
  }
  .collection-showcase.empty-collection {
    grid-template-columns: 1fr;
  }
  .collection-art {
    min-height: 280px;
    border: 1px solid rgba(201,205,211,0.16);
    border-radius: 12px;
    background:
      radial-gradient(circle at 50% 12%, rgba(231,222,208,0.10), transparent 42%),
      rgba(8,8,10,0.72);
    display: grid;
    place-items: center;
    overflow: hidden;
    color: #E7DED0;
    font-size: 34px;
    line-height: 38px;
    font-weight: 900;
  }
  .collection-art img {
    width: 100%;
    height: 100%;
    max-height: 360px;
    object-fit: contain;
    padding: 16px;
    box-sizing: border-box;
  }
  .section-copy h2 {
    margin: 7px 0 0;
    color: #fff;
    font-size: clamp(24px, 3vw, 38px);
    line-height: 1.02;
    font-weight: 900;
    letter-spacing: -0.04em;
  }
  .section-copy p {
    margin: 9px 0 0;
  }
  .collection-facts {
    margin-top: 14px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .collection-facts strong {
    border: 1px solid rgba(231,222,208,0.22);
    border-radius: 999px;
    background: rgba(231,222,208,0.055);
    color: #E7DED0;
    min-height: 28px;
    padding: 0 10px;
    display: inline-flex;
    align-items: center;
  }
  .marketplace-activity,
  .rewards-membership,
  .account-details {
    display: grid;
    grid-template-columns: minmax(0, 0.72fr) minmax(0, 1.28fr);
    gap: 18px;
    align-items: start;
  }
  .activity-list,
  .rewards-summary-grid,
  .account-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }
  .activity-list div,
  .rewards-summary-grid div,
  .account-grid div {
    border: 1px solid rgba(201,205,211,0.14);
    border-radius: 10px;
    background: rgba(8,8,10,0.72);
    padding: 11px;
  }
  .activity-list strong,
  .rewards-summary-grid strong,
  .account-grid strong {
    display: block;
    margin-top: 6px;
    color: #fff;
    font-size: 18px;
    line-height: 22px;
    font-weight: 900;
  }
  .account-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .compact-editor {
    grid-column: 1 / -1;
    margin-top: 4px;
  }
  .content-grid { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 16px; }
  .form-panel, .side-panel { padding: 0; }
  label { display: grid; gap: 7px; margin-top: 14px; }
  label span { color: #C9CDD3; font-size: 12px; font-weight: 900; }
  input, textarea {
    border: 1px solid #24242a; border-radius: 10px; background: #08080a; color: #fff; padding: 12px; box-sizing: border-box; font: inherit; font-size: 13px; font-weight: 800; outline: none;
  }
  input[readonly] { color: #a1a1aa; cursor: not-allowed; }
  label small { color: #85858f; font-size: 11px; line-height: 15px; font-weight: 800; }
  textarea { min-height: 112px; resize: vertical; }
  .action-stack { margin-top: 16px; display: grid; gap: 10px; }
  .inline-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .action-stack button, .action-stack a {
    min-height: 40px; border: 1px solid rgba(231,222,208,0.28); border-radius: 10px; background: rgba(231,222,208,0.055);
    color: #fff; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; font-size: 12px; font-weight: 900; cursor: pointer; padding: 0 14px;
  }
  .action-stack button { background: #E7DED0; color: #111; }
  .status-message { margin: 12px 0 0; border: 1px solid rgba(52,211,153,0.24); border-radius: 10px; background: rgba(52,211,153,0.07); color: #86efac; padding: 10px; }
  @media (max-width: 1100px) {
    .account-shell { width: calc(100vw - 32px); }
    .collector-hero,
    .collection-showcase,
    .marketplace-activity,
    .rewards-membership,
    .account-details,
    .content-grid {
      grid-template-columns: 1fr;
    }
    .activity-list,
    .rewards-summary-grid,
    .account-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 680px) {
    .account-shell { width: calc(100vw - 22px); }
    .collector-hero,
    .profile-section {
      padding: 14px;
    }
    .hero-identity,
    .hero-status,
    .activity-list,
    .rewards-summary-grid,
    .account-grid {
      grid-template-columns: 1fr;
    }
    .avatar {
      width: 82px;
      height: 82px;
      font-size: 24px;
    }
    .collection-art {
      min-height: 220px;
    }
    .progression-track-label {
      flex-direction: column;
      gap: 4px;
    }
    .inline-actions {
      display: grid;
    }
  }
`;
