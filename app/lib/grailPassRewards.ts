import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isGrailPassSubscriptionEntitled } from "./grailPassPlans";

export type GrailPassRewardBoostConfig = {
  configured: boolean;
  enabled: boolean;
  buyerBonusPercent: number | null;
  sellerBonusPercent: number | null;
  source: "environment";
  message: string;
};

export type GrailPassRewardBoostResolution = {
  active: boolean;
  configured: boolean;
  buyerBonusPercent: number;
  sellerBonusPercent: number;
  membershipStatus: string | null;
  membershipPlan: string | null;
};

type GrailPassSubscriptionStateRow = {
  status: string | null;
  plan: string | null;
};

function parsePercent(value: string | undefined) {
  if (value === undefined || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed * 100) / 100;
}

function parseEnabled(value: string | undefined) {
  if (value === undefined || value.trim() === "") {
    return true;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export function getGrailPassRewardBoostConfig(): GrailPassRewardBoostConfig {
  const buyerBonusPercent = parsePercent(
    process.env.GRAIL_PASS_BUYER_REWARD_BONUS_PERCENT,
  );
  const sellerBonusPercent = parsePercent(
    process.env.GRAIL_PASS_SELLER_REWARD_BONUS_PERCENT,
  );
  const configured = buyerBonusPercent !== null && sellerBonusPercent !== null;
  const enabled = configured && parseEnabled(process.env.GRAIL_PASS_REWARD_BONUS_ENABLED);

  return {
    configured,
    enabled,
    buyerBonusPercent,
    sellerBonusPercent,
    source: "environment",
    message: configured
      ? enabled
        ? "GRAIL Pass reward boosts are active."
        : "GRAIL Pass reward boosts are configured but disabled."
      : "GRAIL Pass reward boost percentages are not configured.",
  };
}

export async function resolveGrailPassRewardBoostForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<GrailPassRewardBoostResolution> {
  const config = getGrailPassRewardBoostConfig();

  if (!config.configured || !config.enabled) {
    return {
      active: false,
      configured: config.configured,
      buyerBonusPercent: 0,
      sellerBonusPercent: 0,
      membershipStatus: null,
      membershipPlan: null,
    };
  }

  const { data, error } = await supabase
    .from("grail_pass_subscriptions")
    .select("status, plan")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("GRAIL Pass reward boost lookup skipped:", {
      error,
      errorMessage: error.message,
      errorCode: error.code || null,
      userId,
    });
    return {
      active: false,
      configured: config.configured,
      buyerBonusPercent: 0,
      sellerBonusPercent: 0,
      membershipStatus: null,
      membershipPlan: null,
    };
  }

  const row = data as GrailPassSubscriptionStateRow | null;
  const active = isGrailPassSubscriptionEntitled(row?.status);

  return {
    active,
    configured: config.configured,
    buyerBonusPercent: active ? config.buyerBonusPercent || 0 : 0,
    sellerBonusPercent: active ? config.sellerBonusPercent || 0 : 0,
    membershipStatus: row?.status || null,
    membershipPlan: row?.plan || null,
  };
}
