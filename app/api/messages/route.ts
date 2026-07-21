import { NextResponse } from "next/server";
import {
  createServiceSupabaseClient,
  getCurrentUser,
} from "../auctions/_shared";
import { createSystemNotification } from "../../lib/serverNotifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MessagePayload = {
  receiverId?: string;
  listingId?: string;
  body?: string;
};

type ListingRow = {
  id: string;
  seller_id: string | null;
  title: string | null;
};

type ProfileRow = {
  full_name: string | null;
  username: string | null;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getProfileDisplayName(profile: ProfileRow | null, fallback: string) {
  return profile?.full_name || profile?.username || fallback;
}

export async function POST(request: Request) {
  const { user, error: authError } = await getCurrentUser(request);

  if (authError || !user?.id) {
    return NextResponse.json({ error: "Sign in to send messages." }, { status: 401 });
  }

  let payload: MessagePayload;

  try {
    payload = (await request.json()) as MessagePayload;
  } catch {
    return NextResponse.json({ error: "Invalid message request." }, { status: 400 });
  }

  const listingId = clean(payload.listingId);
  const body = clean(payload.body);

  if (!body) {
    return NextResponse.json({ error: "Write a message before sending." }, { status: 400 });
  }

  let supabase;

  try {
    supabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Message API configuration error:", error);
    return NextResponse.json({ error: "Message could not be sent." }, { status: 500 });
  }

  let listing: ListingRow | null = null;

  if (listingId) {
    const { data, error } = await supabase
      .from("listings")
      .select("id, seller_id, title")
      .eq("id", listingId)
      .maybeSingle();

    if (error) {
      console.error("Message API listing lookup error:", {
        error,
        errorMessage: error.message,
        listingId,
      });
      return NextResponse.json({ error: "Message could not be sent." }, { status: 500 });
    }

    listing = data as ListingRow | null;
  }

  const receiverId = clean(payload.receiverId) || listing?.seller_id || "";

  if (!receiverId) {
    return NextResponse.json({ error: "Message recipient was not found." }, { status: 400 });
  }

  if (receiverId === user.id) {
    return NextResponse.json({ error: "You cannot message yourself." }, { status: 400 });
  }

  if (listing?.seller_id && listing.seller_id !== receiverId) {
    return NextResponse.json({ error: "Message recipient does not match this listing." }, { status: 400 });
  }

  const { data: insertedMessage, error: insertError } = await supabase
    .from("messages")
    .insert({
      sender_id: user.id,
      receiver_id: receiverId,
      listing_id: listingId || null,
      body,
    })
    .select("id, sender_id, receiver_id, listing_id, body, created_at")
    .single();

  if (insertError) {
    console.error("Message API insert error:", {
      error: insertError,
      errorMessage: insertError.message,
      listingId,
      senderId: user.id,
      receiverId,
    });
    return NextResponse.json({ error: "Message could not be sent." }, { status: 500 });
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("full_name, username")
    .eq("id", user.id)
    .maybeSingle();
  const senderName = getProfileDisplayName(
    profileData as ProfileRow | null,
    user.email?.split("@")[0] || "A collector",
  );

  await createSystemNotification(supabase, {
    userId: receiverId,
    title: "New message",
    body: `${senderName} sent you a new message.`,
    linkUrl: `/messages?user=${encodeURIComponent(user.id)}${
      listingId ? `&listing=${encodeURIComponent(listingId)}` : ""
    }`,
    type: "message",
  });

  return NextResponse.json({
    message: insertedMessage,
    conversationUrl: `/messages?user=${encodeURIComponent(receiverId)}${
      listingId ? `&listing=${encodeURIComponent(listingId)}` : ""
    }`,
    listing: listing
      ? {
          id: listing.id,
          title: listing.title || "GRAIL Card",
        }
      : null,
  });
}
