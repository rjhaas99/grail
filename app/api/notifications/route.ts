import { NextResponse } from "next/server";
import {
  normalizeNotificationRow,
  type NotificationRow,
} from "../../lib/notificationEngine";
import {
  createServiceSupabaseClient,
  getCurrentUser,
} from "../auctions/_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

type PatchPayload = {
  notificationId?: string;
  markAllRead?: boolean;
};

export async function GET(request: Request) {
  const { user, error: authError } = await getCurrentUser(request);

  if (authError || !user?.id) {
    return NextResponse.json({ error: "Sign in to view notifications." }, { status: 401 });
  }

  let supabase;

  try {
    supabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Notification inbox configuration error:", error);
    return NextResponse.json(
      { error: "Notifications are not configured." },
      { status: 500 },
    );
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, body, type, link_url, read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Notification inbox fetch error:", {
      error,
      errorMessage: error.message,
      userId: user.id,
    });
    return NextResponse.json(
      { error: "Notifications could not be loaded." },
      { status: 500 },
    );
  }

  const notifications = ((data || []) as NotificationRow[]).map(normalizeNotificationRow);

  return NextResponse.json(
    {
      notifications,
      unreadCount: notifications.filter((notification) => notification.unread).length,
    },
    { headers: noStoreHeaders },
  );
}

export async function PATCH(request: Request) {
  const { user, error: authError } = await getCurrentUser(request);

  if (authError || !user?.id) {
    return NextResponse.json({ error: "Sign in to update notifications." }, { status: 401 });
  }

  let payload: PatchPayload;

  try {
    payload = (await request.json()) as PatchPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  let supabase;

  try {
    supabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Notification update configuration error:", error);
    return NextResponse.json(
      { error: "Notifications are not configured." },
      { status: 500 },
    );
  }

  if (payload.markAllRead) {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id);

    if (error) {
      console.error("Notification mark all read error:", {
        error,
        errorMessage: error.message,
        userId: user.id,
      });
      return NextResponse.json(
        { error: "Notifications could not be updated." },
        { status: 500 },
      );
    }

    return NextResponse.json({ updated: true });
  }

  const notificationId = payload.notificationId?.trim();

  if (!notificationId) {
    return NextResponse.json(
      { error: "notificationId or markAllRead is required." },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Notification mark read error:", {
      error,
      errorMessage: error.message,
      userId: user.id,
      notificationId,
    });
    return NextResponse.json(
      { error: "Notification could not be updated." },
      { status: 500 },
    );
  }

  return NextResponse.json({ updated: true });
}
