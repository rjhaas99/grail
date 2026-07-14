import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type MarketplaceSwitches = {
  marketplaceEnabled: boolean;
  sellerRewardsEnabled: boolean;
  buyerRewardsEnabled: boolean;
  walletRewardsEnabled: boolean;
  xpEnabled: boolean;
  achievementsEnabled: boolean;
  notificationsEnabled: boolean;
  rewardEventsEnabled: boolean;
};

export type MarketplaceEvent = {
  id: string;
  eventName: string;
  enabled: boolean;
  scheduled: boolean;
  startAt: string | null;
  endAt: string | null;
  timeZone: string;
  buyerMultiplier: number;
  sellerMultiplier: number;
  xpMultiplier: number;
  walletMultiplier: number;
  treasureMultiplier: number;
  challengeMultiplier: number;
  notificationTitle: string | null;
  notificationBody: string | null;
  bannerTitle: string | null;
  bannerSubtitle: string | null;
  bannerButtonLabel: string | null;
  bannerButtonHref: string | null;
  bannerBackground: string | null;
  bannerPriority: number;
  bannerDismissible: boolean;
  bannerCountdownEnabled: boolean;
  priority: number;
  allowStacking: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

type MarketplaceSettingRow = {
  key: string;
  value: boolean | string | number | null;
};

type MarketplaceEventRow = {
  id: string;
  event_name: string | null;
  enabled: boolean | null;
  scheduled: boolean | null;
  start_at: string | null;
  end_at: string | null;
  time_zone?: string | null;
  buyer_multiplier: number | string | null;
  seller_multiplier: number | string | null;
  xp_multiplier: number | string | null;
  wallet_multiplier: number | string | null;
  treasure_multiplier: number | string | null;
  challenge_multiplier: number | string | null;
  notification_title: string | null;
  notification_body: string | null;
  banner_title?: string | null;
  banner_subtitle?: string | null;
  banner_button_label?: string | null;
  banner_button_href?: string | null;
  banner_background?: string | null;
  banner_priority?: number | string | null;
  banner_dismissible?: boolean | null;
  banner_countdown_enabled?: boolean | null;
  priority: number | string | null;
  allow_stacking: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

export const defaultMarketplaceSwitches: MarketplaceSwitches = {
  marketplaceEnabled: true,
  sellerRewardsEnabled: true,
  buyerRewardsEnabled: true,
  walletRewardsEnabled: true,
  xpEnabled: true,
  achievementsEnabled: true,
  notificationsEnabled: true,
  rewardEventsEnabled: true,
};

const switchKeyMap: Record<keyof MarketplaceSwitches, string> = {
  marketplaceEnabled: "marketplace_enabled",
  sellerRewardsEnabled: "seller_rewards_enabled",
  buyerRewardsEnabled: "buyer_rewards_enabled",
  walletRewardsEnabled: "wallet_rewards_enabled",
  xpEnabled: "xp_enabled",
  achievementsEnabled: "achievements_enabled",
  notificationsEnabled: "notifications_enabled",
  rewardEventsEnabled: "reward_events_enabled",
};

function toNumber(value: number | string | null | undefined, fallback = 1) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value: boolean | string | number | null | undefined, fallback: boolean) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    return ["true", "1", "yes", "on"].includes(value.toLowerCase());
  }

  return fallback;
}

function mapMarketplaceEvent(row: MarketplaceEventRow): MarketplaceEvent {
  return {
    id: row.id,
    eventName: row.event_name || "Untitled Event",
    enabled: Boolean(row.enabled),
    scheduled: Boolean(row.scheduled),
    startAt: row.start_at,
    endAt: row.end_at,
    timeZone: row.time_zone || "America/New_York",
    buyerMultiplier: toNumber(row.buyer_multiplier, 1),
    sellerMultiplier: toNumber(row.seller_multiplier, 1),
    xpMultiplier: toNumber(row.xp_multiplier, 1),
    walletMultiplier: toNumber(row.wallet_multiplier, 1),
    treasureMultiplier: toNumber(row.treasure_multiplier, 1),
    challengeMultiplier: toNumber(row.challenge_multiplier, 1),
    notificationTitle: row.notification_title,
    notificationBody: row.notification_body,
    bannerTitle: row.banner_title || null,
    bannerSubtitle: row.banner_subtitle || null,
    bannerButtonLabel: row.banner_button_label || null,
    bannerButtonHref: row.banner_button_href || null,
    bannerBackground: row.banner_background || null,
    bannerPriority: toNumber(row.banner_priority, 0),
    bannerDismissible: Boolean(row.banner_dismissible),
    bannerCountdownEnabled: Boolean(row.banner_countdown_enabled),
    priority: toNumber(row.priority, 0),
    allowStacking: Boolean(row.allow_stacking),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getMarketplaceSwitches(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("marketplace_settings")
    .select("key, value");

  if (error) {
    console.warn("Marketplace switches unavailable; using defaults:", {
      error,
      errorMessage: error.message,
    });
    return defaultMarketplaceSwitches;
  }

  const rows = ((data || []) as MarketplaceSettingRow[]).reduce<Record<string, MarketplaceSettingRow>>(
    (items, row) => {
      items[row.key] = row;
      return items;
    },
    {},
  );

  return (Object.keys(switchKeyMap) as Array<keyof MarketplaceSwitches>).reduce(
    (switches, appKey) => {
      const databaseKey = switchKeyMap[appKey];
      switches[appKey] = toBoolean(
        rows[databaseKey]?.value,
        defaultMarketplaceSwitches[appKey],
      );
      return switches;
    },
    { ...defaultMarketplaceSwitches },
  );
}

export async function getMarketplaceEvents(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("marketplace_events")
    .select("*")
    .order("priority", { ascending: false })
    .order("start_at", { ascending: true });

  if (error) {
    console.warn("Marketplace events unavailable:", {
      error,
      errorMessage: error.message,
    });
    return [];
  }

  return ((data || []) as MarketplaceEventRow[]).map(mapMarketplaceEvent);
}

export function getEventStatus(event: MarketplaceEvent, now = new Date()) {
  if (!event.enabled) {
    return "Disabled";
  }

  const startTime = event.startAt ? new Date(event.startAt).getTime() : null;
  const endTime = event.endAt ? new Date(event.endAt).getTime() : null;
  const nowTime = now.getTime();

  if (startTime && nowTime < startTime) {
    return "Upcoming";
  }

  if (endTime && nowTime >= endTime) {
    return "Ended";
  }

  return "Active";
}

export function getEventCountdown(event: MarketplaceEvent | null, now = new Date()) {
  if (!event) {
    return {
      status: "None",
      label: "No event scheduled",
      startsIn: null as string | null,
      endsIn: null as string | null,
      targetAt: null as string | null,
    };
  }

  const status = getEventStatus(event, now);
  const startTime = event.startAt ? new Date(event.startAt).getTime() : null;
  const endTime = event.endAt ? new Date(event.endAt).getTime() : null;

  function formatRemaining(targetTime: number | null) {
    if (!targetTime) {
      return null;
    }

    const remaining = targetTime - now.getTime();

    if (remaining <= 0) {
      return "Now";
    }

    const days = Math.floor(remaining / 86400000);
    const hours = Math.floor((remaining % 86400000) / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);

    if (days > 0) {
      return `${days}d ${hours}h`;
    }

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    return `${Math.max(minutes, 1)}m`;
  }

  const startsIn = formatRemaining(startTime);
  const endsIn = formatRemaining(endTime);

  return {
    status,
    label:
      status === "Upcoming"
        ? `Starts in ${startsIn || "soon"}`
        : status === "Active"
          ? `Ends in ${endsIn || "soon"}`
          : status,
    startsIn,
    endsIn,
    targetAt: status === "Upcoming" ? event.startAt : status === "Active" ? event.endAt : null,
  };
}

export function getEventBanner(event: MarketplaceEvent | null, now = new Date()) {
  if (!event) {
    return null;
  }

  const countdown = getEventCountdown(event, now);

  if (!["Upcoming", "Active"].includes(countdown.status)) {
    return null;
  }

  return {
    title: event.bannerTitle || event.eventName,
    subtitle:
      event.bannerSubtitle ||
      (countdown.status === "Active"
        ? `${event.eventName} is live on GRAIL.`
        : `${event.eventName} is scheduled on GRAIL.`),
    buttonLabel: event.bannerButtonLabel || "Browse Cards",
    buttonHref: event.bannerButtonHref || "/browse",
    background: event.bannerBackground || "platinum",
    priority: event.bannerPriority || event.priority,
    dismissible: event.bannerDismissible,
    countdownEnabled: event.bannerCountdownEnabled,
    countdown,
  };
}

export async function getCurrentMarketplaceEvent(supabase: SupabaseClient) {
  const events = await getMarketplaceEvents(supabase);
  const now = new Date();
  const activeEvents = events.filter((event) => getEventStatus(event, now) === "Active");
  const upcomingEvents = events.filter((event) => getEventStatus(event, now) === "Upcoming");
  const endedEvents = events
    .filter((event) => getEventStatus(event, now) === "Ended")
    .sort(
      (left, right) =>
        new Date(right.endAt || 0).getTime() - new Date(left.endAt || 0).getTime(),
    );

  return {
    currentEvent: activeEvents[0] || null,
    upcomingEvent: upcomingEvents[0] || null,
    endedEvent: endedEvents[0] || null,
    events,
    currentBanner: getEventBanner(activeEvents[0] || upcomingEvents[0] || null, now),
    currentCountdown: getEventCountdown(activeEvents[0] || upcomingEvents[0] || null, now),
    notificationFramework: [
      ...(activeEvents[0]
        ? [
            {
              type: "event_started",
              eventId: activeEvents[0].id,
              title: activeEvents[0].notificationTitle || `${activeEvents[0].eventName} is live`,
              body:
                activeEvents[0].notificationBody ||
                `${activeEvents[0].eventName} is now active on GRAIL.`,
              broadcastReady: false as const,
            },
          ]
        : []),
      ...(endedEvents[0]
        ? [
            {
              type: "event_ended",
              eventId: endedEvents[0].id,
              title: `${endedEvents[0].eventName} ended`,
              body: `${endedEvents[0].eventName} has ended and the marketplace is returning to normal.`,
              broadcastReady: false as const,
            },
          ]
        : []),
    ],
  };
}

export { switchKeyMap };
