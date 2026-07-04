import type { SupabaseClient } from "@supabase/supabase-js";

type SystemNotification = {
  userId?: string | null;
  title: string;
  body: string;
  linkUrl?: string | null;
  type?: string;
};

export async function createSystemNotification(
  supabase: SupabaseClient,
  notification: SystemNotification,
) {
  if (!notification.userId) {
    return;
  }

  const { error } = await supabase.from("notifications").insert({
    user_id: notification.userId,
    title: notification.title,
    body: notification.body,
    type: notification.type || "system",
    link_url: notification.linkUrl || null,
  });

  if (error) {
    console.warn("GRAIL Admin notification insert skipped:", {
      error,
      errorMessage: error.message,
      userId: notification.userId,
      title: notification.title,
    });
  }
}

export async function createSystemNotifications(
  supabase: SupabaseClient,
  notifications: SystemNotification[],
) {
  await Promise.all(
    notifications.map((notification) =>
      createSystemNotification(supabase, notification),
    ),
  );
}
