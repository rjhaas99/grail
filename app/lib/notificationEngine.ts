import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationCategory =
  | "Auctions"
  | "Offers"
  | "Messages"
  | "Orders"
  | "Rewards"
  | "Market"
  | "Trust"
  | "Seller"
  | "System";

export type MarketplaceNotificationType =
  | "auction_won"
  | "auction_lost"
  | "auction_ended"
  | "auction_finished"
  | "new_bid_received"
  | "bid_placed"
  | "outbid"
  | "reserve_met"
  | "payment_needed"
  | "payment_received"
  | "payment_expired"
  | "shipping_label_purchased"
  | "order_tracking_added"
  | "order_shipped"
  | "order_out_for_delivery"
  | "order_delivered"
  | "delivery_exception"
  | "inspection_complete"
  | "seller_payout_released"
  | "offer_received"
  | "offer_accepted"
  | "offer_declined"
  | "offer_countered"
  | "offer_withdrawn"
  | "counter_accepted"
  | "card_sold"
  | "card_purchased"
  | "double_xp_event"
  | "double_grail_credit_event"
  | "marketplace_event"
  | "collection_milestone"
  | "achievement_unlocked"
  | "level_up"
  | "trust_update"
  | "listing_live"
  | "dispute_opened"
  | "message"
  | "dispute"
  | "listing"
  | "reward"
  | "system";

export type NotificationInput = {
  userId?: string | null;
  title: string;
  body: string;
  linkUrl?: string | null;
  type?: MarketplaceNotificationType | string;
};

export type NotificationRow = {
  id: string;
  title: string;
  body: string;
  type: string | null;
  link_url: string | null;
  read?: boolean | null;
  created_at: string | null;
};

export type NotificationInboxItem = {
  id: string;
  type: string;
  category: NotificationCategory;
  title: string;
  description: string;
  createdAt: string | null;
  readAt: string | null;
  href: string;
  action: string;
  unread: boolean;
};

const notificationConfig: Record<
  MarketplaceNotificationType,
  { category: NotificationCategory; action: string }
> = {
  auction_won: { category: "Auctions", action: "Complete Payment" },
  auction_lost: { category: "Auctions", action: "View Auction" },
  auction_ended: { category: "Auctions", action: "View Auction" },
  auction_finished: { category: "Auctions", action: "View Dashboard" },
  new_bid_received: { category: "Auctions", action: "View Auction" },
  bid_placed: { category: "Auctions", action: "View Auction" },
  outbid: { category: "Auctions", action: "View Auction" },
  reserve_met: { category: "Auctions", action: "View Auction" },
  payment_needed: { category: "Orders", action: "Complete Payment" },
  payment_received: { category: "Orders", action: "View Order" },
  payment_expired: { category: "Orders", action: "View Orders" },
  shipping_label_purchased: { category: "Seller", action: "Print Label" },
  order_tracking_added: { category: "Orders", action: "Track Order" },
  order_shipped: { category: "Orders", action: "Track Order" },
  order_out_for_delivery: { category: "Orders", action: "Track Order" },
  order_delivered: { category: "Orders", action: "Inspect Order" },
  delivery_exception: { category: "Orders", action: "Track Order" },
  inspection_complete: { category: "Orders", action: "View Order" },
  seller_payout_released: { category: "Seller", action: "View Dashboard" },
  offer_received: { category: "Offers", action: "View Offer" },
  offer_accepted: { category: "Offers", action: "View Offer" },
  offer_declined: { category: "Offers", action: "View Offer" },
  offer_countered: { category: "Offers", action: "View Offer" },
  offer_withdrawn: { category: "Offers", action: "View Offer" },
  counter_accepted: { category: "Offers", action: "View Offer" },
  card_sold: { category: "Seller", action: "View Sale" },
  card_purchased: { category: "Orders", action: "View Order" },
  double_xp_event: { category: "Rewards", action: "View Event" },
  double_grail_credit_event: { category: "Rewards", action: "View Event" },
  marketplace_event: { category: "Market", action: "View Marketplace" },
  collection_milestone: { category: "Rewards", action: "View Collection" },
  achievement_unlocked: { category: "Rewards", action: "View Profile" },
  level_up: { category: "Rewards", action: "View Profile" },
  trust_update: { category: "Trust", action: "View Profile" },
  listing_live: { category: "Seller", action: "View Listing" },
  dispute_opened: { category: "Orders", action: "View Dispute" },
  message: { category: "Messages", action: "Open Message" },
  dispute: { category: "Orders", action: "View Dispute" },
  listing: { category: "Seller", action: "View Listing" },
  reward: { category: "Rewards", action: "View Wallet" },
  system: { category: "System", action: "Open" },
};

function normalizeType(type?: string | null): MarketplaceNotificationType {
  const normalized = (type || "system")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (normalized in notificationConfig) {
    return normalized as MarketplaceNotificationType;
  }

  return "system";
}

function inferType(row: NotificationRow): MarketplaceNotificationType {
  const explicitType = normalizeType(row.type);

  if (explicitType !== "system" || row.type?.toLowerCase() === "system") {
    return explicitType;
  }

  const text = `${row.title} ${row.body}`.toLowerCase();

  if (text.includes("auction") && text.includes("won")) return "auction_won";
  if (text.includes("auction") && text.includes("did not win")) return "auction_lost";
  if (text.includes("auction") && text.includes("ended")) return "auction_ended";
  if (text.includes("payment") && text.includes("expired")) return "payment_expired";
  if (text.includes("payment") && text.includes("received")) return "payment_received";
  if (text.includes("tracking") || text.includes("shipped")) return "order_shipped";
  if (text.includes("delivered") || text.includes("inspection")) return "order_delivered";
  if (text.includes("payout")) return "seller_payout_released";
  if (text.includes("offer")) return "offer_received";
  if (text.includes("message")) return "message";
  if (text.includes("reward") || text.includes("credit") || text.includes("xp")) return "reward";
  if (text.includes("dispute")) return "dispute";
  if (text.includes("listing")) return "listing";

  return "system";
}

export function normalizeNotificationRow(row: NotificationRow): NotificationInboxItem {
  const type = inferType(row);
  const config = notificationConfig[type];
  const unread = !row.read;

  return {
    id: row.id,
    type,
    category: config.category,
    title: row.title,
    description: row.body,
    createdAt: row.created_at,
    readAt: unread ? null : row.created_at,
    href: row.link_url || "/notifications",
    action: config.action,
    unread,
  };
}

export async function createNotification(
  supabase: SupabaseClient,
  notification: NotificationInput,
) {
  if (!notification.userId) {
    return { inserted: false, skipped: "missing_user" as const };
  }

  const type = normalizeType(notification.type);
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: notification.userId,
      title: notification.title,
      body: notification.body,
      type,
      link_url: notification.linkUrl || null,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.warn("GRAIL notification insert skipped:", {
      error,
      errorMessage: error.message,
      userId: notification.userId,
      title: notification.title,
      type,
    });
    return { inserted: false, error };
  }

  return { inserted: true, id: data?.id as string | undefined, type };
}

export async function createNotifications(
  supabase: SupabaseClient,
  notifications: NotificationInput[],
) {
  return Promise.all(
    notifications.map((notification) => createNotification(supabase, notification)),
  );
}
