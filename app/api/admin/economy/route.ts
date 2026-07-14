import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getRewardTiers } from "../../../lib/rewards";
import {
  defaultMarketplaceSwitches,
  getCurrentMarketplaceEvent,
  getEventStatus,
  getMarketplaceSwitches,
  switchKeyMap,
  type MarketplaceEvent,
  type MarketplaceSwitches,
} from "../../../lib/marketplaceEconomy";

export const runtime = "nodejs";

const adminEmails = ["ryanjhaas99@gmail.com"];

type EconomyPatchPayload =
  | {
      action?: "update_switches";
      switches?: Partial<MarketplaceSwitches>;
    }
  | {
      action?: "save_event";
      event?: Partial<MarketplaceEvent>;
    };

type MetricOrderRow = {
  total_amount: number | string | null;
  platform_fee: number | string | null;
  refund_status: string | null;
};

type WalletRow = {
  available_credit: number | string | null;
  pending_credit: number | string | null;
};

type RewardEventMetricRow = {
  reward_tier: string | null;
  wallet_credit_awarded: number | string | null;
  processed_at: string | null;
  created_at: string | null;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function createAnonSupabaseClient() {
  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      auth: {
        persistSession: false,
      },
    },
  );
}

function createServiceSupabaseClient() {
  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false,
      },
    },
  );
}

function getBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") || "";

  return authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
}

async function getCurrentUser(request: Request) {
  const token = getBearerToken(request);

  if (!token) {
    return { user: null, error: "Missing authorization token." };
  }

  const supabase = createAnonSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error) {
    console.error("Admin economy auth error:", {
      error,
      errorMessage: error.message,
    });
  }

  return { user, error: error?.message || null };
}

async function requireAdmin(request: Request) {
  const { user, error } = await getCurrentUser(request);
  const email = user?.email?.toLowerCase() || "";

  if (error || !user || !adminEmails.includes(email)) {
    return {
      user: null,
      response: NextResponse.json({ error: "Access denied." }, { status: 403 }),
    };
  }

  return { user, response: null };
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanMultiplier(value: unknown, label: string) {
  const parsed = Number(value ?? 1);

  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100) {
    throw new Error(`${label} must be greater than 0.`);
  }

  return Math.round(parsed * 100) / 100;
}

function cleanPriority(value: unknown) {
  const parsed = Number(value ?? 0);

  if (!Number.isFinite(parsed)) {
    throw new Error("Priority must be a number.");
  }

  return Math.round(parsed);
}

function cleanText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function cleanNullableDate(value: unknown) {
  if (!value || typeof value !== "string") {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Event date is invalid.");
  }

  return date.toISOString();
}

async function getUserCount(supabase: ReturnType<typeof createServiceSupabaseClient>) {
  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  if (error) {
    console.warn("Admin economy user count unavailable:", {
      error,
      errorMessage: error.message,
    });
    return 0;
  }

  return count || 0;
}

async function getWalletLiability(supabase: ReturnType<typeof createServiceSupabaseClient>) {
  const { data, error } = await supabase
    .from("wallets")
    .select("available_credit, pending_credit");

  if (error) {
    console.warn("Admin economy wallet liability unavailable:", {
      error,
      errorMessage: error.message,
    });
    return 0;
  }

  return ((data || []) as WalletRow[]).reduce(
    (total, wallet) =>
      total + toNumber(wallet.available_credit) + toNumber(wallet.pending_credit),
    0,
  );
}

async function getOrderMetrics(supabase: ReturnType<typeof createServiceSupabaseClient>) {
  const { data, error } = await supabase
    .from("orders")
    .select("total_amount, platform_fee, refund_status");

  if (error) {
    console.warn("Admin economy order metrics unavailable:", {
      error,
      errorMessage: error.message,
    });
    return {
      gmv: 0,
      platformRevenue: 0,
    };
  }

  return ((data || []) as MetricOrderRow[]).reduce(
    (totals, order) => {
      if (order.refund_status === "refunded") {
        return totals;
      }

      return {
        gmv: totals.gmv + toNumber(order.total_amount),
        platformRevenue: totals.platformRevenue + toNumber(order.platform_fee),
      };
    },
    { gmv: 0, platformRevenue: 0 },
  );
}

async function getRewardCostMetrics(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
) {
  const { data, error } = await supabase
    .from("reward_events")
    .select("reward_tier, wallet_credit_awarded, processed_at, created_at");

  if (error) {
    console.warn("Admin economy reward cost metrics unavailable:", {
      error,
      errorMessage: error.message,
    });
    return {
      walletIssuedToday: 0,
      walletIssuedThisMonth: 0,
      walletIssuedLifetime: 0,
      averageReward: 0,
      largestReward: 0,
      rewardCost: 0,
      rewardCostByTier: [] as Array<{ tier: string; amount: number }>,
    };
  }

  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const monthKey = now.toISOString().slice(0, 7);
  const rewardCostByTier = new Map<string, number>();
  const amounts: number[] = [];
  let walletIssuedToday = 0;
  let walletIssuedThisMonth = 0;
  let walletIssuedLifetime = 0;

  for (const row of (data || []) as RewardEventMetricRow[]) {
    const amount = toNumber(row.wallet_credit_awarded);

    if (amount <= 0) {
      continue;
    }

    const date = row.processed_at || row.created_at || "";
    const tier = row.reward_tier || "Unconfigured";
    amounts.push(amount);
    walletIssuedLifetime += amount;
    rewardCostByTier.set(tier, (rewardCostByTier.get(tier) || 0) + amount);

    if (date.slice(0, 10) === todayKey) {
      walletIssuedToday += amount;
    }

    if (date.slice(0, 7) === monthKey) {
      walletIssuedThisMonth += amount;
    }
  }

  return {
    walletIssuedToday,
    walletIssuedThisMonth,
    walletIssuedLifetime,
    averageReward:
      amounts.length > 0
        ? amounts.reduce((total, amount) => total + amount, 0) / amounts.length
        : 0,
    largestReward: amounts.length > 0 ? Math.max(...amounts) : 0,
    rewardCost: walletIssuedLifetime,
    rewardCostByTier: Array.from(rewardCostByTier.entries())
      .map(([tier, amount]) => ({ tier, amount }))
      .sort((left, right) => right.amount - left.amount),
  };
}

async function getControlCenterData(supabase: ReturnType<typeof createServiceSupabaseClient>) {
  const [
    switches,
    eventState,
    tiers,
    userCount,
    walletLiability,
    orderMetrics,
    rewardCostMetrics,
  ] =
    await Promise.all([
      getMarketplaceSwitches(supabase),
      getCurrentMarketplaceEvent(supabase),
      getRewardTiers(supabase).catch((error) => {
        console.warn("Admin economy tiers unavailable:", error);
        return [];
      }),
      getUserCount(supabase),
      getWalletLiability(supabase),
      getOrderMetrics(supabase),
      getRewardCostMetrics(supabase),
    ]);
  const currentTier = tiers.find((tier) => tier.enabled) || tiers[0] || null;

  return {
    marketplaceStatus: {
      marketplace: switches.marketplaceEnabled ? "Live" : "Paused",
      currentEconomy: "Normal",
      currentActiveEvent: eventState.currentEvent?.eventName || "None",
      nextScheduledEvent: eventState.upcomingEvent?.eventName || "None",
      currentMarketplaceState: !switches.marketplaceEnabled
        ? "Paused"
        : eventState.currentEvent
          ? "Event Live"
          : eventState.upcomingEvent
            ? "Event Upcoming"
            : "Normal",
      rewardTierCount: tiers.length,
      userCount,
      walletLiability,
      gmv: orderMetrics.gmv,
      platformRevenue: orderMetrics.platformRevenue,
      walletIssuedToday: rewardCostMetrics.walletIssuedToday,
      walletIssuedThisMonth: rewardCostMetrics.walletIssuedThisMonth,
      walletIssuedLifetime: rewardCostMetrics.walletIssuedLifetime,
      averageReward: rewardCostMetrics.averageReward,
      largestReward: rewardCostMetrics.largestReward,
      rewardCost: rewardCostMetrics.rewardCost,
      rewardCostByTier: rewardCostMetrics.rewardCostByTier,
    },
    switches,
    events: eventState.events.map((event) => ({
      ...event,
      status: getEventStatus(event),
    })),
    currentEvent: eventState.currentEvent,
    upcomingEvent: eventState.upcomingEvent,
    endedEvent: eventState.endedEvent,
    currentBanner: eventState.currentBanner,
    currentCountdown: eventState.currentCountdown,
    eventNotifications: eventState.notificationFramework,
    tiers,
    currentEconomy: currentTier
      ? {
          rankName: currentTier.rankName,
          sellerFeePercent: currentTier.sellerFeePercent,
          buyerRewardPercent: currentTier.buyerRewardPercent,
          sellerRewardPercent: currentTier.sellerRewardPercent,
          buyerMultiplier: currentTier.buyerMultiplier,
          sellerMultiplier: currentTier.sellerMultiplier,
          walletMultiplier: currentTier.walletMultiplier,
          xpMultiplier: currentTier.xpMultiplier,
        }
      : null,
  };
}

async function updateSwitches(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  switches: Partial<MarketplaceSwitches> | undefined,
) {
  if (!switches) {
    throw new Error("Switches are required.");
  }

  const rows = (Object.keys(defaultMarketplaceSwitches) as Array<keyof MarketplaceSwitches>)
    .filter((key) => typeof switches[key] === "boolean")
    .map((key) => ({
      key: switchKeyMap[key],
      value: Boolean(switches[key]),
      updated_at: new Date().toISOString(),
    }));

  if (rows.length === 0) {
    throw new Error("No valid switches were provided.");
  }

  const { error } = await supabase
    .from("marketplace_settings")
    .upsert(rows, { onConflict: "key" });

  if (error) {
    console.error("Admin economy switch update error:", {
      error,
      errorMessage: error.message,
    });
    throw new Error("Marketplace switches could not be saved.");
  }
}

async function saveEvent(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  event: Partial<MarketplaceEvent> | undefined,
) {
  if (!event) {
    throw new Error("Event is required.");
  }

  const eventName = cleanText(event.eventName);

  if (!eventName) {
    throw new Error("Event name is required.");
  }

  const startAt = cleanNullableDate(event.startAt);
  const endAt = cleanNullableDate(event.endAt);

  if (startAt && endAt && new Date(endAt).getTime() <= new Date(startAt).getTime()) {
    throw new Error("Event end date must be after start date.");
  }

  const payload = {
    event_name: eventName,
    enabled: Boolean(event.enabled),
    scheduled: Boolean(event.scheduled),
    start_at: startAt,
    end_at: endAt,
    time_zone: cleanText(event.timeZone, "America/New_York") || "America/New_York",
    buyer_multiplier: cleanMultiplier(event.buyerMultiplier, "Buyer multiplier"),
    seller_multiplier: cleanMultiplier(event.sellerMultiplier, "Seller multiplier"),
    xp_multiplier: cleanMultiplier(event.xpMultiplier, "XP multiplier"),
    wallet_multiplier: cleanMultiplier(event.walletMultiplier, "Wallet multiplier"),
    treasure_multiplier: cleanMultiplier(event.treasureMultiplier, "Treasure multiplier"),
    challenge_multiplier: cleanMultiplier(event.challengeMultiplier, "Challenge multiplier"),
    notification_title: cleanText(event.notificationTitle) || null,
    notification_body: cleanText(event.notificationBody) || null,
    banner_title: cleanText(event.bannerTitle) || null,
    banner_subtitle: cleanText(event.bannerSubtitle) || null,
    banner_button_label: cleanText(event.bannerButtonLabel) || null,
    banner_button_href: cleanText(event.bannerButtonHref) || null,
    banner_background: cleanText(event.bannerBackground, "platinum") || "platinum",
    banner_priority: cleanPriority(event.bannerPriority),
    banner_dismissible: Boolean(event.bannerDismissible),
    banner_countdown_enabled: Boolean(event.bannerCountdownEnabled),
    priority: cleanPriority(event.priority),
    allow_stacking: Boolean(event.allowStacking),
    updated_at: new Date().toISOString(),
  };

  const query = event.id
    ? supabase.from("marketplace_events").update(payload).eq("id", event.id)
    : supabase.from("marketplace_events").insert(payload);
  const { error } = await query;

  if (error) {
    console.error("Admin economy event save error:", {
      error,
      errorMessage: error.message,
      eventId: event.id,
      eventName,
    });
    throw new Error("Marketplace event could not be saved.");
  }
}

export async function GET(request: Request) {
  let supabase;

  try {
    supabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Admin economy configuration error:", error);
    return NextResponse.json(
      { error: "GRAIL Control Center is not configured." },
      { status: 500 },
    );
  }

  const { response } = await requireAdmin(request);

  if (response) {
    return response;
  }

  try {
    return NextResponse.json(await getControlCenterData(supabase));
  } catch (error) {
    console.error("Admin economy load error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "GRAIL Control Center could not be loaded." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  let supabase;

  try {
    supabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Admin economy configuration error:", error);
    return NextResponse.json(
      { error: "GRAIL Control Center is not configured." },
      { status: 500 },
    );
  }

  const { response } = await requireAdmin(request);

  if (response) {
    return response;
  }

  const payload = (await request.json().catch(() => ({}))) as EconomyPatchPayload;

  try {
    if (payload.action === "update_switches") {
      await updateSwitches(supabase, payload.switches);
    } else if (payload.action === "save_event") {
      await saveEvent(supabase, payload.event);
    } else {
      return NextResponse.json({ error: "Unsupported Control Center action." }, { status: 400 });
    }

    return NextResponse.json({
      message: "GRAIL Control Center saved.",
      ...(await getControlCenterData(supabase)),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "GRAIL Control Center could not be saved." },
      { status: 400 },
    );
  }
}
