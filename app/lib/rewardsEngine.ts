import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateProgression,
  getXpForSource,
  type AchievementDefinition,
  type ProgressionSummary,
  type XpSource,
} from "./progression";
import { getRewardTiers, getUserRewardTier, type RewardTier } from "./rewards";
import {
  awardVerifiedXpEvent,
  syncProgressFromEvents,
  unlockBasicAchievement,
  type AwardXpResult,
} from "./serverProgression";
import {
  getCurrentMarketplaceEvent,
  getEventBanner,
  getEventCountdown,
  getMarketplaceSwitches,
  type MarketplaceEvent,
  type MarketplaceSwitches,
} from "./marketplaceEconomy";
import { createSystemNotification } from "./serverNotifications";
import { addCredit, type WalletLedgerEntry } from "./wallet";
import {
  getGrailPassRewardBoostConfig,
  resolveGrailPassRewardBoostForUser,
  type GrailPassRewardBoostResolution,
} from "./grailPassRewards";

export const rewardEventTypes = [
  "LIST_CARD",
  "UPLOAD_LISTING_PHOTOS",
  "BUY_COMPLETED",
  "SELL_COMPLETED",
  "AUCTION_WIN",
  "PROFILE_COMPLETED",
  "IDENTITY_VERIFIED",
  "REFERRAL_COMPLETED",
  "LEVEL_UP",
  "ADMIN_BONUS",
  "PROMOTION",
] as const;

export type RewardEventType = (typeof rewardEventTypes)[number];

export type RewardReference = {
  type: "listing" | "order" | "user" | "admin" | "promotion";
  id: string;
};

export type ProcessRewardEventParams = {
  supabase: SupabaseClient;
  userId?: string | null;
  event: RewardEventType;
  reference: RewardReference;
  metadata?: Record<string, string | number | boolean | null>;
};

export type ProcessRewardEventResult = {
  userId: string;
  event: RewardEventType;
  reference: RewardReference;
  level: number;
  economy: {
    currentRank: string | null;
    currentTier: RewardTier | null;
    sellerFeePercent: number | null;
    buyerBasePercent: number | null;
    sellerBasePercent: number | null;
    buyerMultiplier: number;
    sellerMultiplier: number;
    walletMultiplier: number;
    xpMultiplier: number;
    buyerRewardPercent: number | null;
    sellerRewardPercent: number | null;
    grailPassRewardBoost: GrailPassRewardBoostResolution;
  };
  marketplace: {
    switches: MarketplaceSwitches;
    currentEvent: MarketplaceEvent | null;
    upcomingEvent: MarketplaceEvent | null;
    currentBanner: ReturnType<typeof getEventBanner>;
    currentCountdown: ReturnType<typeof getEventCountdown>;
    marketplaceStatus: "Live" | "Paused";
    currentMarketplaceState: "Normal" | "Event Live" | "Event Upcoming" | "Paused";
    currentMultipliers: {
      buyerMultiplier: number;
      sellerMultiplier: number;
      xpMultiplier: number;
      walletMultiplier: number;
      treasureMultiplier: number;
      challengeMultiplier: number;
    };
    eventNotification: {
      title: string | null;
      body: string | null;
      broadcastReady: false;
    } | null;
    eventNotifications: Array<{
      type: string;
      eventId: string;
      title: string;
      body: string;
      broadcastReady: false;
    }>;
  };
  rewardTier: RewardTier | null;
  rewardTierConfigured: boolean;
  xp: {
    totalAwarded: number;
    awards: AwardXpResult[];
  };
  wallet: {
    amount: number;
    pendingAmount: number;
    enabled: boolean;
    reason: string;
    ledgerEntries: WalletLedgerEntry[];
  };
  achievements: {
    unlocked: AchievementDefinition[];
  };
  notifications: {
    sent: number;
    planned: string[];
  };
  future: {
    grailPassBonusApplied: boolean;
    seasonalBonusApplied: false;
    treasureChestChance: number;
    challengeProgressApplied: false;
  };
  progression: ProgressionSummary | null;
  skipped: string[];
};

type ListingRow = {
  id: string;
  seller_id: string | null;
  status: string | null;
  sale_format: string | null;
  auction_status: string | null;
};

type OrderRow = {
  id: string;
  listing_id: string | null;
  buyer_id: string | null;
  seller_id: string | null;
  card_price: number | string | null;
  total_amount: number | string | null;
  transfer_status: string | null;
  completed_at: string | null;
  refund_status: string | null;
  dispute_status: string | null;
};

type XpAwardPlan = {
  source: XpSource;
  userId: string;
  referenceType: string;
  referenceId: string;
  idempotencyKey: string;
  metadata: Record<string, string | number | boolean | null>;
};

type WalletAwardPlan = {
  userId: string;
  title: string;
  description: string;
  amount: number;
  referenceType: string;
  referenceId: string;
  idempotencyKey: string;
  notificationTitle: string;
  notificationBody: string;
  notificationLinkUrl: string;
  actualBuyerPercent: number | null;
  actualSellerPercent: number | null;
  actualBuyerMultiplier: number | null;
  actualSellerMultiplier: number | null;
  walletMultiplierUsed: number;
  grailPassActive: boolean;
  grailPassBuyerBonusPercent: number | null;
  grailPassSellerBonusPercent: number | null;
};

function isCompletedNonRefundedOrder(order: OrderRow) {
  return (
    order.transfer_status === "paid" &&
    Boolean(order.completed_at) &&
    !["refunded"].includes(order.refund_status || "") &&
    !["opened", "under_review"].includes(order.dispute_status || "")
  );
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

async function getProgressionLevel(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("user_progress")
    .select("level")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("Rewards Engine progression level lookup skipped:", {
      error,
      errorMessage: error.message,
      userId,
    });
    return 1;
  }

  return Math.max(1, Number((data as { level?: number | null } | null)?.level || 1));
}

async function getCurrentProgressionSummary(supabase: SupabaseClient, userId: string) {
  const { data: progressData, error: progressError } = await supabase
    .from("user_progress")
    .select("xp")
    .eq("user_id", userId)
    .maybeSingle();

  if (progressError) {
    console.warn("Rewards Engine progression summary lookup skipped:", {
      error: progressError,
      errorMessage: progressError.message,
      userId,
    });
    return null;
  }

  const { count, error: achievementError } = await supabase
    .from("achievement_unlocks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (achievementError) {
    console.warn("Rewards Engine achievement summary lookup skipped:", {
      error: achievementError,
      errorMessage: achievementError.message,
      userId,
    });
  }

  return calculateProgression(
    Number((progressData as { xp?: number | null } | null)?.xp || 0),
    count || 0,
  );
}

async function getRewardContext(supabase: SupabaseClient, userId: string) {
  const level = await getProgressionLevel(supabase, userId);

  try {
    const reward = await getUserRewardTier(supabase, userId);
    return {
      level: reward.level || level,
      tier: reward.tier,
      configured: reward.configured,
    };
  } catch (error) {
    console.warn("Rewards Engine tier lookup skipped:", {
      error,
      userId,
    });
    return {
      level,
      tier: null,
      configured: false,
    };
  }
}

async function getMarketplaceContext(supabase: SupabaseClient) {
  const [switches, eventState] = await Promise.all([
    getMarketplaceSwitches(supabase),
    getCurrentMarketplaceEvent(supabase),
  ]);
  const event = eventState.currentEvent;
  const bannerEvent = event || eventState.upcomingEvent;
  const currentCountdown = eventState.currentCountdown || getEventCountdown(bannerEvent);
  const currentBanner = eventState.currentBanner || getEventBanner(bannerEvent);
  const marketplaceStatus: "Live" | "Paused" = switches.marketplaceEnabled
    ? "Live"
    : "Paused";
  const currentMarketplaceState: "Normal" | "Event Live" | "Event Upcoming" | "Paused" =
    !switches.marketplaceEnabled
      ? "Paused"
      : event
        ? "Event Live"
        : eventState.upcomingEvent
          ? "Event Upcoming"
          : "Normal";

  return {
    switches,
    currentEvent: event,
    upcomingEvent: eventState.upcomingEvent,
    currentBanner,
    currentCountdown,
    marketplaceStatus,
    currentMarketplaceState,
    currentMultipliers: {
      buyerMultiplier: event?.buyerMultiplier ?? 1,
      sellerMultiplier: event?.sellerMultiplier ?? 1,
      xpMultiplier: event?.xpMultiplier ?? 1,
      walletMultiplier: event?.walletMultiplier ?? 1,
      treasureMultiplier: event?.treasureMultiplier ?? 1,
      challengeMultiplier: event?.challengeMultiplier ?? 1,
    },
    eventNotification: event
      ? {
          title: event.notificationTitle,
          body: event.notificationBody,
          broadcastReady: false as const,
        }
      : null,
    eventNotifications: eventState.notificationFramework,
  };
}

const inactiveGrailPassRewardBoost: GrailPassRewardBoostResolution = {
  active: false,
  configured: getGrailPassRewardBoostConfig().configured,
  buyerBonusPercent: 0,
  sellerBonusPercent: 0,
  membershipStatus: null,
  membershipPlan: null,
};

function buildEconomySnapshot(
  level: number,
  tier: RewardTier | null,
  grailPassRewardBoost: GrailPassRewardBoostResolution = inactiveGrailPassRewardBoost,
) {
  const buyerRewardPercent =
    tier?.buyerRewardPercent !== undefined && tier?.buyerRewardPercent !== null
      ? roundCurrency(tier.buyerRewardPercent + grailPassRewardBoost.buyerBonusPercent)
      : grailPassRewardBoost.buyerBonusPercent || null;
  const sellerRewardPercent =
    tier?.sellerRewardPercent !== undefined && tier?.sellerRewardPercent !== null
      ? roundCurrency(tier.sellerRewardPercent + grailPassRewardBoost.sellerBonusPercent)
      : grailPassRewardBoost.sellerBonusPercent || null;

  return {
    currentRank: tier?.rankName || null,
    currentTier: tier,
    sellerFeePercent: tier?.sellerFeePercent ?? null,
    buyerBasePercent: tier?.buyerBasePercent ?? null,
    sellerBasePercent: tier?.sellerBasePercent ?? null,
    buyerMultiplier: tier?.buyerMultiplier ?? 1,
    sellerMultiplier: tier?.sellerMultiplier ?? 1,
    walletMultiplier: tier?.walletMultiplier ?? 1,
    xpMultiplier: tier?.xpMultiplier ?? 1,
    buyerRewardPercent,
    sellerRewardPercent,
    grailPassRewardBoost,
    level,
  };
}

export async function getRewardEngineSnapshot(supabase: SupabaseClient, userId: string) {
  const [rewardContext, marketplace, tiers, grailPassRewardBoost] = await Promise.all([
    getRewardContext(supabase, userId),
    getMarketplaceContext(supabase),
    getRewardTiers(supabase).catch((error) => {
      console.warn("Rewards Engine tier list lookup skipped:", {
        error,
        userId,
      });
      return [] as RewardTier[];
    }),
    resolveGrailPassRewardBoostForUser(supabase, userId),
  ]);
  const economy = buildEconomySnapshot(
    rewardContext.level,
    rewardContext.tier,
    grailPassRewardBoost,
  );
  const nextTier =
    tiers
      .filter((tier) => tier.enabled && tier.minLevel > rewardContext.level)
      .sort((left, right) => left.minLevel - right.minLevel)[0] || null;

  return {
    level: rewardContext.level,
    economy,
    marketplace,
    tier: rewardContext.tier,
    nextTier,
    configured: rewardContext.configured,
    grailPassRewardBoost,
    walletRewardsEnabled: marketplace.switches.walletRewardsEnabled,
    walletRewardsMessage: marketplace.switches.walletRewardsEnabled
      ? "Automatic GRAIL Credit rewards are active for completed eligible orders."
      : "Automatic GRAIL Credit rewards are disabled in GRAIL Control Center.",
  };
}

async function getListingForReward(
  supabase: SupabaseClient,
  listingId: string,
) {
  const { data, error } = await supabase
    .from("listings")
    .select("id, seller_id, status, sale_format, auction_status")
    .eq("id", listingId)
    .maybeSingle();

  if (error) {
    throw new Error("Listing could not be verified for rewards.");
  }

  return data as ListingRow | null;
}

async function getOrderForReward(supabase: SupabaseClient, orderId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, listing_id, buyer_id, seller_id, card_price, total_amount, transfer_status, completed_at, refund_status, dispute_status",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw new Error("Order could not be verified for rewards.");
  }

  return data as OrderRow | null;
}

async function countCompletedOrdersForUser(
  supabase: SupabaseClient,
  userColumn: "buyer_id" | "seller_id",
  userId: string,
) {
  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq(userColumn, userId)
    .eq("transfer_status", "paid")
    .not("completed_at", "is", null)
    .or("refund_status.is.null,refund_status.eq.none")
    .or("dispute_status.is.null,dispute_status.in.(none,resolved)");

  if (error) {
    throw new Error("Completed orders could not be counted for rewards.");
  }

  return count || 0;
}

function getCompletedOrderSalePrice(order: OrderRow) {
  return roundCurrency(toNumber(order.card_price || order.total_amount));
}

function calculateWalletRewardAmount({
  salePrice,
  basePercent,
  tierMultiplier,
  eventMultiplier,
  tierWalletMultiplier,
  eventWalletMultiplier,
  grailPassBonusPercent,
}: {
  salePrice: number;
  basePercent: number | null;
  tierMultiplier: number;
  eventMultiplier: number;
  tierWalletMultiplier: number;
  eventWalletMultiplier: number;
  grailPassBonusPercent: number;
}) {
  const percent = Number(basePercent || 0);
  const bonusPercent = Number(grailPassBonusPercent || 0);

  if (!Number.isFinite(salePrice) || salePrice <= 0 || (percent <= 0 && bonusPercent <= 0)) {
    return {
      amount: 0,
      actualPercent: 0,
      actualMultiplier: roundCurrency(tierMultiplier * eventMultiplier),
      walletMultiplierUsed: roundCurrency(tierWalletMultiplier * eventWalletMultiplier),
    };
  }

  const actualMultiplier = roundCurrency(tierMultiplier * eventMultiplier);
  const walletMultiplierUsed = roundCurrency(tierWalletMultiplier * eventWalletMultiplier);
  const rankRewardPercent = roundCurrency(
    Math.max(0, percent) * actualMultiplier * walletMultiplierUsed,
  );
  const actualPercent = roundCurrency(rankRewardPercent + Math.max(0, bonusPercent));

  return {
    amount: roundCurrency(salePrice * (actualPercent / 100)),
    actualPercent,
    actualMultiplier,
    walletMultiplierUsed,
  };
}

async function buildWalletAwardPlan({
  supabase,
  userId,
  event,
  reference,
  economy,
  marketplace,
}: {
  supabase: SupabaseClient;
  userId: string;
  event: RewardEventType;
  reference: RewardReference;
  economy: ReturnType<typeof buildEconomySnapshot>;
  marketplace: Awaited<ReturnType<typeof getMarketplaceContext>>;
}): Promise<WalletAwardPlan | null> {
  if (reference.type !== "order") {
    return null;
  }

  if (event !== "BUY_COMPLETED" && event !== "SELL_COMPLETED") {
    return null;
  }

  if (!marketplace.switches.marketplaceEnabled) {
    return null;
  }

  if (!marketplace.switches.walletRewardsEnabled) {
    return null;
  }

  if (event === "BUY_COMPLETED" && !marketplace.switches.buyerRewardsEnabled) {
    return null;
  }

  if (event === "SELL_COMPLETED" && !marketplace.switches.sellerRewardsEnabled) {
    return null;
  }

  const order = await getOrderForReward(supabase, reference.id);

  if (!order || !isCompletedNonRefundedOrder(order)) {
    return null;
  }

  if (event === "BUY_COMPLETED" && order.buyer_id !== userId) {
    return null;
  }

  if (event === "SELL_COMPLETED" && order.seller_id !== userId) {
    return null;
  }

  const salePrice = getCompletedOrderSalePrice(order);
  const isBuyer = event === "BUY_COMPLETED";
  const reward = calculateWalletRewardAmount({
    salePrice,
    basePercent: isBuyer ? economy.buyerBasePercent : economy.sellerBasePercent,
    tierMultiplier: isBuyer ? economy.buyerMultiplier : economy.sellerMultiplier,
    eventMultiplier: isBuyer
      ? marketplace.currentMultipliers.buyerMultiplier
      : marketplace.currentMultipliers.sellerMultiplier,
    tierWalletMultiplier: economy.walletMultiplier,
    eventWalletMultiplier: marketplace.currentMultipliers.walletMultiplier,
    grailPassBonusPercent: isBuyer
      ? economy.grailPassRewardBoost.buyerBonusPercent
      : economy.grailPassRewardBoost.sellerBonusPercent,
  });

  if (reward.amount <= 0) {
    return null;
  }

  const idempotencyKey = `grail-credit:${event.toLowerCase()}:order:${order.id}:user:${userId}`;
  const title = isBuyer ? "Purchase Complete" : "Sale Complete";
  const description = `+$${reward.amount.toFixed(2)} GRAIL Credit`;

  return {
    userId,
    title,
    description,
    amount: reward.amount,
    referenceType: "order",
    referenceId: order.id,
    idempotencyKey,
    notificationTitle: title,
    notificationBody: description,
    notificationLinkUrl: isBuyer ? "/orders" : "/seller-dashboard",
    actualBuyerPercent: isBuyer ? reward.actualPercent : null,
    actualSellerPercent: isBuyer ? null : reward.actualPercent,
    actualBuyerMultiplier: isBuyer ? reward.actualMultiplier : null,
    actualSellerMultiplier: isBuyer ? null : reward.actualMultiplier,
    walletMultiplierUsed: reward.walletMultiplierUsed,
    grailPassActive: economy.grailPassRewardBoost.active,
    grailPassBuyerBonusPercent: isBuyer
      ? economy.grailPassRewardBoost.buyerBonusPercent
      : null,
    grailPassSellerBonusPercent: isBuyer
      ? null
      : economy.grailPassRewardBoost.sellerBonusPercent,
  };
}

async function verifyListingEvent(
  supabase: SupabaseClient,
  userId: string,
  event: RewardEventType,
  reference: RewardReference,
) {
  if (reference.type !== "listing") {
    throw new Error("Listing reward events require a listing reference.");
  }

  const listing = await getListingForReward(supabase, reference.id);

  if (!listing || listing.seller_id !== userId) {
    throw new Error("Listing does not belong to the current user.");
  }

  if (!["active", "collection"].includes(listing.status || "")) {
    throw new Error("Listing is not eligible for rewards yet.");
  }

  if (event === "UPLOAD_LISTING_PHOTOS") {
    const { count, error } = await supabase
      .from("listing_images")
      .select("id", { count: "exact", head: true })
      .eq("listing_id", listing.id);

    if (error) {
      throw new Error("Listing photos could not be verified for rewards.");
    }

    if (!count) {
      throw new Error("Listing needs uploaded photos before photo rewards can be awarded.");
    }
  }

  return listing;
}

async function buildXpAwardPlans({
  supabase,
  userId,
  event,
  reference,
  metadata,
}: {
  supabase: SupabaseClient;
  userId: string;
  event: RewardEventType;
  reference: RewardReference;
  metadata: Record<string, string | number | boolean | null>;
}) {
  const plans: XpAwardPlan[] = [];

  if (event === "LIST_CARD" || event === "UPLOAD_LISTING_PHOTOS") {
    const listing = await verifyListingEvent(supabase, userId, event, reference);
    const source: XpSource =
      event === "LIST_CARD" ? "list_card" : "quality_listing_photos";

    plans.push({
      source,
      userId,
      referenceType: "listing",
      referenceId: listing.id,
      idempotencyKey: `${source}:listing:${listing.id}`,
      metadata: {
        ...metadata,
        listingId: listing.id,
        listingStatus: listing.status,
      },
    });

    return plans;
  }

  if (event === "BUY_COMPLETED" || event === "SELL_COMPLETED" || event === "AUCTION_WIN") {
    if (reference.type !== "order") {
      throw new Error("Completed transaction reward events require an order reference.");
    }

    const order = await getOrderForReward(supabase, reference.id);

    if (!order) {
      throw new Error("Order not found.");
    }

    if (!isCompletedNonRefundedOrder(order)) {
      throw new Error("Order is not complete or is refunded/disputed.");
    }

    const listing = order.listing_id
      ? await getListingForReward(supabase, order.listing_id)
      : null;
    const isAuctionSale =
      listing?.sale_format === "auction" || listing?.auction_status === "paid";

    if (event === "BUY_COMPLETED") {
      if (order.buyer_id !== userId) {
        throw new Error("Buyer reward user does not match the order buyer.");
      }

      plans.push({
        source: "buy_card",
        userId,
        referenceType: "order",
        referenceId: order.id,
        idempotencyKey: `buy_card:order:${order.id}`,
        metadata: {
          ...metadata,
          orderId: order.id,
          listingId: order.listing_id,
        },
      });

      const completedPurchaseCount = await countCompletedOrdersForUser(
        supabase,
        "buyer_id",
        userId,
      );

      if (completedPurchaseCount === 1) {
        plans.push({
          source: "first_purchase_bonus",
          userId,
          referenceType: "user",
          referenceId: userId,
          idempotencyKey: `first_purchase_bonus:user:${userId}`,
          metadata: {
            ...metadata,
            orderId: order.id,
            listingId: order.listing_id,
          },
        });
      }
    }

    if (event === "SELL_COMPLETED") {
      if (order.seller_id !== userId) {
        throw new Error("Seller reward user does not match the order seller.");
      }

      plans.push({
        source: "sell_card",
        userId,
        referenceType: "order",
        referenceId: order.id,
        idempotencyKey: `sell_card:order:${order.id}`,
        metadata: {
          ...metadata,
          orderId: order.id,
          listingId: order.listing_id,
        },
      });

      const completedSaleCount = await countCompletedOrdersForUser(
        supabase,
        "seller_id",
        userId,
      );

      if (completedSaleCount === 1) {
        plans.push({
          source: "first_sale_bonus",
          userId,
          referenceType: "user",
          referenceId: userId,
          idempotencyKey: `first_sale_bonus:user:${userId}`,
          metadata: {
            ...metadata,
            orderId: order.id,
            listingId: order.listing_id,
          },
        });
      }
    }

    if (event === "AUCTION_WIN") {
      if (!isAuctionSale) {
        return plans;
      }

      if (order.buyer_id !== userId) {
        throw new Error("Auction reward user does not match the winning buyer.");
      }

      plans.push({
        source: "win_auction",
        userId,
        referenceType: "order",
        referenceId: order.id,
        idempotencyKey: `win_auction:order:${order.id}`,
        metadata: {
          ...metadata,
          orderId: order.id,
          listingId: order.listing_id,
        },
      });
    }

    return plans;
  }

  const directSourceByEvent: Partial<Record<RewardEventType, XpSource>> = {
    PROFILE_COMPLETED: "complete_profile",
    IDENTITY_VERIFIED: "verify_identity",
    REFERRAL_COMPLETED: "refer_user",
  };
  const directSource = directSourceByEvent[event];

  if (directSource) {
    plans.push({
      source: directSource,
      userId,
      referenceType: reference.type,
      referenceId: reference.id,
      idempotencyKey: `${directSource}:${reference.type}:${reference.id}`,
      metadata,
    });
  }

  return plans;
}

async function recordRewardEvent({
  supabase,
  userId,
  event,
  reference,
  economy,
  xpAwarded,
  walletCreditAwarded,
  idempotencyKey,
  actualBuyerPercent,
  actualSellerPercent,
  actualBuyerMultiplier,
  actualSellerMultiplier,
  walletMultiplierUsed,
  notificationSent,
}: {
  supabase: SupabaseClient;
  userId: string;
  event: RewardEventType;
  reference: RewardReference;
  economy: ReturnType<typeof buildEconomySnapshot>;
  xpAwarded: number;
  walletCreditAwarded: number;
  idempotencyKey: string;
  actualBuyerPercent: number | null;
  actualSellerPercent: number | null;
  actualBuyerMultiplier: number | null;
  actualSellerMultiplier: number | null;
  walletMultiplierUsed: number;
  notificationSent: boolean;
}) {
  const { error } = await supabase.from("reward_events").insert({
    user_id: userId,
    event_type: event,
    reference_type: reference.type,
    reference_id: reference.id,
    idempotency_key: idempotencyKey,
    reward_tier: economy.currentRank,
    buyer_base_percent: economy.buyerBasePercent,
    seller_base_percent: economy.sellerBasePercent,
    buyer_multiplier: economy.buyerMultiplier,
    seller_multiplier: economy.sellerMultiplier,
    wallet_multiplier: economy.walletMultiplier,
    xp_multiplier: economy.xpMultiplier,
    xp_awarded: xpAwarded,
    wallet_credit_awarded: walletCreditAwarded,
    actual_buyer_percent: actualBuyerPercent,
    actual_seller_percent: actualSellerPercent,
    actual_buyer_multiplier: actualBuyerMultiplier,
    actual_seller_multiplier: actualSellerMultiplier,
    wallet_multiplier_used: walletMultiplierUsed,
    grail_pass_active: economy.grailPassRewardBoost.active,
    seasonal_event: null,
    treasure_chest_triggered: false,
    challenge_triggered: false,
    notification_sent: notificationSent,
    processed_at: new Date().toISOString(),
  });

  if (error?.code === "23505") {
    return;
  }

  if (error) {
    console.warn("Rewards Engine history event skipped:", {
      error,
      errorMessage: error.message,
      userId,
      event,
      reference,
    });
  }
}

export async function processRewardEvent({
  supabase,
  userId,
  event,
  reference,
  metadata = {},
}: ProcessRewardEventParams): Promise<ProcessRewardEventResult> {
  if (!userId) {
    throw new Error("Reward event requires a user.");
  }

  if (!reference.id) {
    throw new Error("Reward event requires a reference id.");
  }

  const [rewardContext, marketplace, grailPassRewardBoost] = await Promise.all([
    getRewardContext(supabase, userId),
    getMarketplaceContext(supabase),
    resolveGrailPassRewardBoostForUser(supabase, userId),
  ]);
  const economy = buildEconomySnapshot(
    rewardContext.level,
    rewardContext.tier,
    grailPassRewardBoost,
  );
  const xpMultiplier = rewardContext.tier?.xpMultiplier || 1;
  const awardPlans = await buildXpAwardPlans({
    supabase,
    userId,
    event,
    reference,
    metadata,
  });
  const awarded: AwardXpResult[] = [];
  const unlockedAchievements: AchievementDefinition[] = [];
  const skipped: string[] = [];
  const walletLedgerEntries: WalletLedgerEntry[] = [];
  let walletCreditAwarded = 0;
  let walletNotificationSent = false;
  let collectorNotificationCount = 0;
  const collectorNotificationTitles: string[] = [];
  let walletReason = "No wallet reward was available for this event.";
  let actualBuyerPercent: number | null = null;
  let actualSellerPercent: number | null = null;
  let actualBuyerMultiplier: number | null = null;
  let actualSellerMultiplier: number | null = null;
  let walletMultiplierUsed = economy.walletMultiplier * marketplace.currentMultipliers.walletMultiplier;

  for (const plan of awardPlans) {
    if (!marketplace.switches.marketplaceEnabled) {
      skipped.push("Marketplace rewards are disabled in GRAIL Control Center.");
      continue;
    }

    if (!marketplace.switches.xpEnabled) {
      skipped.push("XP is disabled in GRAIL Control Center.");
      continue;
    }

    const baseXp = getXpForSource(plan.source);
    const effectiveXp = Math.max(0, Math.round(baseXp * xpMultiplier));

    if (effectiveXp <= 0) {
      skipped.push(`${plan.source} has no XP configured.`);
      continue;
    }

    const result = await awardVerifiedXpEvent({
      supabase,
      userId: plan.userId,
      source: plan.source,
      referenceType: plan.referenceType,
      referenceId: plan.referenceId,
      idempotencyKey: plan.idempotencyKey,
      xpAmountOverride: effectiveXp,
      metadata: {
        ...plan.metadata,
        rewardEvent: event,
        rewardTier: rewardContext.tier?.rankName || null,
        xpMultiplier,
        baseXp,
        effectiveXp,
      },
    });

    if (result) {
      awarded.push({
        ...result,
        xpAmount: effectiveXp,
      });

      const unlocked = marketplace.switches.achievementsEnabled
        ? await unlockBasicAchievement(supabase, plan.userId, plan.source)
        : null;

      if (unlocked) {
        unlockedAchievements.push(unlocked);
      } else if (!marketplace.switches.achievementsEnabled) {
        skipped.push("Achievements are disabled in GRAIL Control Center.");
      }

      await syncProgressFromEvents(supabase, plan.userId);
    }
  }

  const progression =
    (await getCurrentProgressionSummary(supabase, userId)) || calculateProgression(0);

  const totalAwarded = awarded
    .filter((item) => !item.alreadyAwarded)
    .reduce((total, item) => total + Math.max(0, item.xpAmount), 0);

  if (marketplace.switches.notificationsEnabled && totalAwarded > 0) {
    if (progression.level > rewardContext.level) {
      await createSystemNotification(supabase, {
        userId,
        title: "Level Up",
        body: `You reached Level ${progression.level}: ${progression.title}.`,
        linkUrl: "/profile",
        type: "level_up",
      });
      collectorNotificationCount += 1;
      collectorNotificationTitles.push("Level Up");
    }

    for (const achievement of unlockedAchievements) {
      await createSystemNotification(supabase, {
        userId,
        title: "Achievement Unlocked",
        body: `${achievement.title}: ${achievement.description}`,
        linkUrl: "/profile",
        type: "achievement_unlocked",
      });
      collectorNotificationCount += 1;
      collectorNotificationTitles.push(`Achievement Unlocked: ${achievement.title}`);
    }
  } else if (!marketplace.switches.notificationsEnabled && totalAwarded > 0) {
    skipped.push("Collector progression notifications skipped because notifications are disabled.");
  }

  const walletAwardPlan = await buildWalletAwardPlan({
    supabase,
    userId,
    event,
    reference,
    economy,
    marketplace,
  });

  if (walletAwardPlan) {
    try {
      const walletResult = await addCredit(supabase, {
        userId: walletAwardPlan.userId,
        amount: walletAwardPlan.amount,
        type: "credit",
        title: walletAwardPlan.title,
        description: walletAwardPlan.description,
        referenceType: walletAwardPlan.referenceType,
        referenceId: walletAwardPlan.referenceId,
        idempotencyKey: walletAwardPlan.idempotencyKey,
      });

      walletLedgerEntries.push(walletResult.entry);
      walletCreditAwarded = walletResult.alreadyApplied ? 0 : walletAwardPlan.amount;
      walletReason = walletResult.alreadyApplied
        ? "GRAIL Credit reward was already applied."
        : "GRAIL Credit reward applied.";
      actualBuyerPercent = walletAwardPlan.actualBuyerPercent;
      actualSellerPercent = walletAwardPlan.actualSellerPercent;
      actualBuyerMultiplier = walletAwardPlan.actualBuyerMultiplier;
      actualSellerMultiplier = walletAwardPlan.actualSellerMultiplier;
      walletMultiplierUsed = walletAwardPlan.walletMultiplierUsed;

      if (!walletResult.alreadyApplied && marketplace.switches.notificationsEnabled) {
        await createSystemNotification(supabase, {
          userId: walletAwardPlan.userId,
          title: walletAwardPlan.notificationTitle,
          body: walletAwardPlan.notificationBody,
          linkUrl: walletAwardPlan.notificationLinkUrl,
          type: "reward",
        });
        walletNotificationSent = true;
      } else if (!marketplace.switches.notificationsEnabled) {
        skipped.push("Reward notification skipped because notifications are disabled.");
      }
    } catch (error) {
      console.warn("Rewards Engine wallet reward skipped:", {
        error,
        userId,
        event,
        reference,
      });
      skipped.push(
        error instanceof Error
          ? error.message
          : "GRAIL Credit reward could not be applied.",
      );
      walletReason = "GRAIL Credit reward could not be applied.";
    }
  } else if (!marketplace.switches.walletRewardsEnabled) {
    walletReason = "Wallet rewards are disabled in GRAIL Control Center.";
    skipped.push(walletReason);
  } else if (
    event === "BUY_COMPLETED" &&
    !marketplace.switches.buyerRewardsEnabled
  ) {
    walletReason = "Buyer rewards are disabled in GRAIL Control Center.";
    skipped.push(walletReason);
  } else if (
    event === "SELL_COMPLETED" &&
    !marketplace.switches.sellerRewardsEnabled
  ) {
    walletReason = "Seller rewards are disabled in GRAIL Control Center.";
    skipped.push(walletReason);
  }

  if (marketplace.switches.rewardEventsEnabled) {
    await recordRewardEvent({
      supabase,
      userId,
      event,
      reference,
      economy,
      xpAwarded: totalAwarded,
      walletCreditAwarded,
      idempotencyKey: `reward-event:${event}:${reference.type}:${reference.id}:user:${userId}`,
      actualBuyerPercent,
      actualSellerPercent,
      actualBuyerMultiplier,
      actualSellerMultiplier,
      walletMultiplierUsed,
      notificationSent: walletNotificationSent || collectorNotificationCount > 0,
    });
  } else {
    skipped.push("Reward event history is disabled in GRAIL Control Center.");
  }

  return {
    userId,
    event,
    reference,
    level: rewardContext.level,
    economy,
    marketplace,
    rewardTier: rewardContext.tier,
    rewardTierConfigured: rewardContext.configured,
    xp: {
      totalAwarded,
      awards: awarded,
    },
    wallet: {
      amount: walletCreditAwarded,
      pendingAmount: 0,
      enabled: Boolean(walletAwardPlan),
      reason: walletReason,
      ledgerEntries: walletLedgerEntries,
    },
    achievements: {
      unlocked: unlockedAchievements,
    },
    notifications: {
      sent: (walletNotificationSent ? 1 : 0) + collectorNotificationCount,
      planned: [
        ...collectorNotificationTitles,
        ...(walletAwardPlan ? [walletAwardPlan.notificationTitle] : []),
      ],
    },
    future: {
      grailPassBonusApplied: Boolean(
        walletAwardPlan?.grailPassActive &&
          ((actualBuyerPercent !== null && walletAwardPlan.grailPassBuyerBonusPercent) ||
            (actualSellerPercent !== null && walletAwardPlan.grailPassSellerBonusPercent)),
      ),
      seasonalBonusApplied: false,
      treasureChestChance: 0,
      challengeProgressApplied: false,
    },
    progression,
    skipped,
  };
}
