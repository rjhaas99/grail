import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type RewardTier = {
  id: string;
  rankName: string;
  minLevel: number;
  maxLevel: number;
  sellerFeePercent: number;
  buyerBasePercent: number;
  sellerBasePercent: number;
  buyerMultiplier: number;
  sellerMultiplier: number;
  buyerRewardPercent: number;
  sellerRewardPercent: number;
  xpMultiplier: number;
  walletMultiplier: number;
  enabled: boolean;
  displayOrder: number;
  createdAt: string | null;
  updatedAt: string | null;
};

type RewardTierRow = {
  id: string;
  rank_name: string | null;
  min_level: number | string | null;
  max_level: number | string | null;
  seller_fee_percent: number | string | null;
  buyer_base_percent?: number | string | null;
  seller_base_percent?: number | string | null;
  buyer_credit_percent?: number | string | null;
  seller_credit_percent?: number | string | null;
  buyer_multiplier?: number | string | null;
  seller_multiplier?: number | string | null;
  xp_multiplier: number | string | null;
  wallet_multiplier: number | string | null;
  enabled: boolean | null;
  display_order: number | string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ProgressRow = {
  user_id: string;
  level: number | null;
};

function toNumber(value: number | string | null | undefined, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapRewardTier(row: RewardTierRow): RewardTier {
  const buyerBasePercent = toNumber(
    row.buyer_base_percent ?? row.buyer_credit_percent,
  );
  const sellerBasePercent = toNumber(
    row.seller_base_percent ?? row.seller_credit_percent,
  );
  const buyerMultiplier = toNumber(row.buyer_multiplier, 1);
  const sellerMultiplier = toNumber(row.seller_multiplier, 1);

  return {
    id: row.id,
    rankName: row.rank_name || "Unconfigured",
    minLevel: toNumber(row.min_level, 1),
    maxLevel: toNumber(row.max_level, 1),
    sellerFeePercent: toNumber(row.seller_fee_percent),
    buyerBasePercent,
    sellerBasePercent,
    buyerMultiplier,
    sellerMultiplier,
    buyerRewardPercent: Math.round(buyerBasePercent * buyerMultiplier * 100) / 100,
    sellerRewardPercent: Math.round(sellerBasePercent * sellerMultiplier * 100) / 100,
    xpMultiplier: toNumber(row.xp_multiplier, 1),
    walletMultiplier: toNumber(row.wallet_multiplier, 1),
    enabled: Boolean(row.enabled),
    displayOrder: toNumber(row.display_order),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getRewardTiers(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("reward_tiers")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Reward tiers fetch error:", {
      error,
      errorMessage: error.message,
    });
    throw new Error("Rewards configuration could not be loaded.");
  }

  return ((data || []) as RewardTierRow[]).map(mapRewardTier);
}

export async function getRewardTierForLevel(
  supabase: SupabaseClient,
  level: number,
) {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  const { data, error } = await supabase
    .from("reward_tiers")
    .select("*")
    .eq("enabled", true)
    .lte("min_level", safeLevel)
    .gte("max_level", safeLevel)
    .order("display_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Reward tier lookup error:", {
      error,
      errorMessage: error.message,
      level: safeLevel,
    });
    throw new Error("Rewards configuration could not be loaded.");
  }

  return data ? mapRewardTier(data as RewardTierRow) : null;
}

export async function getUserRewardTier(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("user_progress")
    .select("user_id, level")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Reward progression lookup error:", {
      error,
      errorMessage: error.message,
      userId,
    });
    throw new Error("Progression could not be loaded for rewards.");
  }

  const level = Number((data as ProgressRow | null)?.level || 1);
  const tier = await getRewardTierForLevel(supabase, level);

  return {
    level,
    tier,
    configured: Boolean(tier),
  };
}
