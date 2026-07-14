import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateProgression,
  getAchievementForXpSource,
  getXpForSource,
  type XpSource,
} from "./progression";

type ProgressRow = {
  user_id: string;
  xp: number | null;
};

type AchievementRow = {
  achievement_key: string;
};

export type AwardXpResult = {
  source: XpSource;
  userId: string;
  referenceType: string;
  referenceId: string;
  xpAmount: number;
  alreadyAwarded: boolean;
};

type AwardVerifiedXpEventParams = {
  supabase: SupabaseClient;
  userId?: string | null;
  source: XpSource;
  referenceType: string;
  referenceId: string;
  metadata?: Record<string, string | number | boolean | null>;
  idempotencyKey?: string;
  xpAmountOverride?: number;
};

async function getAchievementCount(supabase: SupabaseClient, userId: string) {
  const { count, error } = await supabase
    .from("achievement_unlocks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    console.warn("Progression achievement count skipped:", {
      message: error.message,
      error,
      userId,
    });
    return 0;
  }

  return count || 0;
}

async function getOrCreateProgressRow(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("user_progress")
    .select("user_id, xp")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return data as ProgressRow;
  }

  const startingProgress = calculateProgression(0);
  const { data: inserted, error: insertError } = await supabase
    .from("user_progress")
    .insert({
      user_id: userId,
      xp: startingProgress.xp,
      level: startingProgress.level,
      title: startingProgress.title,
      next_level_xp: startingProgress.nextLevelXp,
      progress_percentage: startingProgress.progressPercentage,
    })
    .select("user_id, xp")
    .maybeSingle();

  if (insertError) {
    throw insertError;
  }

  return inserted as ProgressRow;
}

async function getXpEventCount(supabase: SupabaseClient, userId: string) {
  const { count, error } = await supabase
    .from("xp_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return count || 0;
}

async function ensureLegacyBaselineEvent(
  supabase: SupabaseClient,
  userId: string,
  currentXp: number,
) {
  if (currentXp <= 0) {
    return;
  }

  const eventCount = await getXpEventCount(supabase, userId);

  if (eventCount > 0) {
    return;
  }

  const { error } = await supabase.from("xp_events").insert({
    user_id: userId,
    source: "legacy_baseline",
    xp_amount: currentXp,
    reference_type: "user",
    reference_id: userId,
    idempotency_key: `legacy_baseline:user:${userId}`,
    metadata: {
      reason: "Existing progression XP before xp_events enforcement.",
    },
  });

  if (error && error.code !== "23505") {
    throw error;
  }
}

async function getXpTotalFromEvents(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("xp_events")
    .select("xp_amount")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return ((data || []) as { xp_amount: number | null }[]).reduce(
    (total, event) => total + Math.max(0, Number(event.xp_amount) || 0),
    0,
  );
}

export async function syncProgressFromEvents(supabase: SupabaseClient, userId: string) {
  const xp = await getXpTotalFromEvents(supabase, userId);
  const achievementsCount = await getAchievementCount(supabase, userId);
  const progression = calculateProgression(xp, achievementsCount);
  const { error } = await supabase
    .from("user_progress")
    .update({
      xp: progression.xp,
      level: progression.level,
      title: progression.title,
      next_level_xp: progression.nextLevelXp,
      progress_percentage: progression.progressPercentage,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return progression;
}

export async function unlockBasicAchievement(
  supabase: SupabaseClient,
  userId: string,
  source: XpSource,
) {
  const achievement = getAchievementForXpSource(source);

  if (!achievement) {
    return null;
  }

  const { data: existing, error: existingError } = await supabase
    .from("achievement_unlocks")
    .select("achievement_key")
    .eq("user_id", userId)
    .eq("achievement_key", achievement.key)
    .maybeSingle();

  if (existingError) {
    console.warn("Progression achievement lookup skipped:", {
      message: existingError.message,
      error: existingError,
      userId,
      source,
    });
    return null;
  }

  if ((existing as AchievementRow | null)?.achievement_key) {
    return null;
  }

  const { error } = await supabase.from("achievement_unlocks").insert({
    user_id: userId,
    achievement_key: achievement.key,
    title: achievement.title,
    description: achievement.description,
  });

  if (error && error.code !== "23505") {
    console.warn("Progression achievement unlock skipped:", {
      message: error.message,
      error,
      userId,
      source,
    });
    return null;
  }

  return achievement;
}

export async function awardVerifiedXpEvent({
  supabase,
  userId,
  source,
  referenceType,
  referenceId,
  metadata = {},
  idempotencyKey,
  xpAmountOverride,
}: AwardVerifiedXpEventParams): Promise<AwardXpResult | null> {
  if (!userId || !referenceId) {
    return null;
  }

  const xpAmount = Math.max(
    0,
    Math.round(Number(xpAmountOverride ?? getXpForSource(source)) || 0),
  );

  if (xpAmount <= 0) {
    return null;
  }

  const progressRow = await getOrCreateProgressRow(supabase, userId);
  await ensureLegacyBaselineEvent(
    supabase,
    userId,
    Math.max(0, Number(progressRow.xp) || 0),
  );

  const finalIdempotencyKey =
    idempotencyKey || `${source}:${referenceType}:${referenceId}`;
  const { error } = await supabase.from("xp_events").insert({
    user_id: userId,
    source,
    xp_amount: xpAmount,
    reference_type: referenceType,
    reference_id: referenceId,
    idempotency_key: finalIdempotencyKey,
    metadata,
  });

  if (error?.code === "23505") {
    await syncProgressFromEvents(supabase, userId);
    console.info("Progression XP already awarded:", {
      userId,
      source,
      referenceType,
      referenceId,
      idempotencyKey: finalIdempotencyKey,
    });

    return {
      userId,
      source,
      referenceType,
      referenceId,
      xpAmount,
      alreadyAwarded: true,
    };
  }

  if (error) {
    throw error;
  }

  await syncProgressFromEvents(supabase, userId);

  console.info("Progression XP awarded:", {
    userId,
    source,
    referenceType,
    referenceId,
    xpAmount,
    idempotencyKey: finalIdempotencyKey,
  });

  return {
    userId,
    source,
    referenceType,
    referenceId,
    xpAmount,
    alreadyAwarded: false,
  };
}
