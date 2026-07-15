import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createNotification,
  createNotifications,
  type MarketplaceNotificationType,
} from "./notificationEngine";

type SystemNotification = {
  userId?: string | null;
  title: string;
  body: string;
  linkUrl?: string | null;
  type?: MarketplaceNotificationType | string;
};

export async function createSystemNotification(
  supabase: SupabaseClient,
  notification: SystemNotification,
) {
  return createNotification(supabase, notification);
}

export async function createSystemNotifications(
  supabase: SupabaseClient,
  notifications: SystemNotification[],
) {
  return createNotifications(supabase, notifications);
}
