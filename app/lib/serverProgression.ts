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

type OrderRow = {
  id: string;
  listing_id: string | null;
  buyer_id: string | null;
  seller_id: string | null;
  transfer_status: string | null;
  completed_at: string | null;
  refund_status: string | null;
  dispute_status: string | null;
};

type ListingRow = {
  id: string;
  sale_format: string | null;
  auction_status: string | null;
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
};

type CompletedOrderProgressionResult = {
  orderId: string;
  awarded: AwardXpResult[];
  skipped: string[];
  isAuctionSale: boolean;
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

async function syncProgressFromEvents(supabase: SupabaseClient, userId: string) {
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

async function unlockBasicAchievement(
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
}: AwardVerifiedXpEventParams): Promise<AwardXpResult | null> {
  if (!userId || !referenceId) {
    return null;
  }

  const xpAmount = getXpForSource(source);

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

  await unlockBasicAchievement(supabase, userId, source);
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

function isCompletedNonRefundedOrder(order: OrderRow) {
  return (
    order.transfer_status === "paid" &&
    Boolean(order.completed_at) &&
    !["refunded"].includes(order.refund_status || "") &&
    !["opened", "under_review"].includes(order.dispute_status || "")
  );
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
    throw error;
  }

  return count || 0;
}

export async function awardCompletedOrderProgression(
  supabase: SupabaseClient,
  orderId: string,
): Promise<CompletedOrderProgressionResult> {
  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, listing_id, buyer_id, seller_id, transfer_status, completed_at, refund_status, dispute_status",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    throw orderError;
  }

  const order = orderData as OrderRow | null;

  if (!order) {
    return {
      orderId,
      awarded: [],
      skipped: ["Order not found."],
      isAuctionSale: false,
    };
  }

  if (!isCompletedNonRefundedOrder(order)) {
    return {
      orderId,
      awarded: [],
      skipped: ["Order is not complete or is refunded/disputed."],
      isAuctionSale: false,
    };
  }

  let listing: ListingRow | null = null;

  if (order.listing_id) {
    const { data: listingData, error: listingError } = await supabase
      .from("listings")
      .select("id, sale_format, auction_status")
      .eq("id", order.listing_id)
      .maybeSingle();

    if (listingError) {
      throw listingError;
    }

    listing = listingData as ListingRow | null;
  }

  const isAuctionSale =
    listing?.sale_format === "auction" || listing?.auction_status === "paid";
  const awarded: AwardXpResult[] = [];
  const skipped: string[] = [];

  if (order.buyer_id) {
    const buyerPurchase = await awardVerifiedXpEvent({
      supabase,
      userId: order.buyer_id,
      source: "buy_card",
      referenceType: "order",
      referenceId: order.id,
      idempotencyKey: `buy_card:order:${order.id}`,
      metadata: {
        orderId: order.id,
        listingId: order.listing_id,
      },
    });

    if (buyerPurchase) {
      awarded.push(buyerPurchase);
    }

    if (isAuctionSale) {
      const auctionWin = await awardVerifiedXpEvent({
        supabase,
        userId: order.buyer_id,
        source: "win_auction",
        referenceType: "order",
        referenceId: order.id,
        idempotencyKey: `win_auction:order:${order.id}`,
        metadata: {
          orderId: order.id,
          listingId: order.listing_id,
        },
      });

      if (auctionWin) {
        awarded.push(auctionWin);
      }
    }

    const completedPurchaseCount = await countCompletedOrdersForUser(
      supabase,
      "buyer_id",
      order.buyer_id,
    );

    if (completedPurchaseCount === 1) {
      const firstPurchase = await awardVerifiedXpEvent({
        supabase,
        userId: order.buyer_id,
        source: "first_purchase_bonus",
        referenceType: "user",
        referenceId: order.buyer_id,
        idempotencyKey: `first_purchase_bonus:user:${order.buyer_id}`,
        metadata: {
          orderId: order.id,
          listingId: order.listing_id,
        },
      });

      if (firstPurchase) {
        awarded.push(firstPurchase);
      }
    }
  } else {
    skipped.push("Missing buyer_id.");
  }

  if (order.seller_id) {
    const sellerSale = await awardVerifiedXpEvent({
      supabase,
      userId: order.seller_id,
      source: "sell_card",
      referenceType: "order",
      referenceId: order.id,
      idempotencyKey: `sell_card:order:${order.id}`,
      metadata: {
        orderId: order.id,
        listingId: order.listing_id,
      },
    });

    if (sellerSale) {
      awarded.push(sellerSale);
    }

    const completedSaleCount = await countCompletedOrdersForUser(
      supabase,
      "seller_id",
      order.seller_id,
    );

    if (completedSaleCount === 1) {
      const firstSale = await awardVerifiedXpEvent({
        supabase,
        userId: order.seller_id,
        source: "first_sale_bonus",
        referenceType: "user",
        referenceId: order.seller_id,
        idempotencyKey: `first_sale_bonus:user:${order.seller_id}`,
        metadata: {
          orderId: order.id,
          listingId: order.listing_id,
        },
      });

      if (firstSale) {
        awarded.push(firstSale);
      }
    }
  } else {
    skipped.push("Missing seller_id.");
  }

  return {
    orderId,
    awarded,
    skipped,
    isAuctionSale,
  };
}
