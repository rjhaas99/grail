import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const adminEmails = ["ryanjhaas99@gmail.com"];
const supportStatuses = ["open", "in_review", "resolved", "closed"] as const;

type SupportStatus = (typeof supportStatuses)[number];

type SupportTicketRow = {
  id: string;
  user_id: string | null;
  name: string | null;
  email: string | null;
  topic: string;
  message: string;
  order_id: string | null;
  listing_id: string | null;
  status: string;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
};

type ListingRow = {
  id: string;
  title: string | null;
};

type UpdatePayload = {
  ticketId?: string;
  status?: string;
  adminNote?: string;
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
    console.error("Admin support auth error:", error);
  }

  return { user, error: error?.message || null };
}

async function requireAdmin(request: Request) {
  const { user, error: authError } = await getCurrentUser(request);
  const email = user?.email?.toLowerCase() || "";

  if (authError || !user || !adminEmails.includes(email)) {
    return {
      user: null,
      response: NextResponse.json({ error: "Access denied." }, { status: 403 }),
    };
  }

  return { user, response: null };
}

function shortId(value?: string | null) {
  return value ? value.slice(0, 8) : "Unknown";
}

function getProfileName(profile?: ProfileRow, fallbackId?: string | null) {
  return profile?.full_name || profile?.username || shortId(fallbackId);
}

function isSupportStatus(value: string): value is SupportStatus {
  return supportStatuses.includes(value as SupportStatus);
}

export async function GET(request: Request) {
  let serviceSupabase;

  try {
    serviceSupabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Admin support configuration error:", error);
    return NextResponse.json(
      { error: "Admin support is temporarily unavailable." },
      { status: 500 },
    );
  }

  const { user, response } = await requireAdmin(request);

  if (response || !user) {
    return response;
  }

  const { data: ticketData, error: ticketError } = await serviceSupabase
    .from("support_tickets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(250);

  if (ticketError) {
    console.error("Admin support ticket fetch error:", {
      error: ticketError,
      errorMessage: ticketError.message,
      adminId: user.id,
    });
    return NextResponse.json(
      { error: "Support tickets could not be loaded." },
      { status: 500 },
    );
  }

  const tickets = (ticketData || []) as SupportTicketRow[];
  const profileIds = Array.from(
    new Set(
      tickets
        .flatMap((ticket) => [ticket.user_id, ticket.reviewed_by])
        .filter((profileId): profileId is string => Boolean(profileId)),
    ),
  );
  const listingIds = Array.from(
    new Set(
      tickets
        .map((ticket) => ticket.listing_id)
        .filter((listingId): listingId is string => Boolean(listingId)),
    ),
  );
  const profilesById = new Map<string, ProfileRow>();
  const listingsById = new Map<string, ListingRow>();

  if (profileIds.length > 0) {
    const { data: profileData, error: profileError } = await serviceSupabase
      .from("profiles")
      .select("id, full_name, username")
      .in("id", profileIds);

    if (profileError) {
      console.error("Admin support profile fetch error:", {
        error: profileError,
        errorMessage: profileError.message,
      });
    } else {
      ((profileData || []) as ProfileRow[]).forEach((profile) => {
        profilesById.set(profile.id, profile);
      });
    }
  }

  if (listingIds.length > 0) {
    const { data: listingData, error: listingError } = await serviceSupabase
      .from("listings")
      .select("id, title")
      .in("id", listingIds);

    if (listingError) {
      console.error("Admin support listing fetch error:", {
        error: listingError,
        errorMessage: listingError.message,
      });
    } else {
      ((listingData || []) as ListingRow[]).forEach((listing) => {
        listingsById.set(listing.id, listing);
      });
    }
  }

  return NextResponse.json({
    tickets: tickets.map((ticket) => {
      const userProfile = ticket.user_id ? profilesById.get(ticket.user_id) : undefined;
      const reviewerProfile = ticket.reviewed_by
        ? profilesById.get(ticket.reviewed_by)
        : undefined;
      const listing = ticket.listing_id ? listingsById.get(ticket.listing_id) : undefined;

      return {
        id: ticket.id,
        shortId: shortId(ticket.id),
        userId: ticket.user_id,
        signedInUserName: ticket.user_id
          ? getProfileName(userProfile, ticket.user_id)
          : "Guest submission",
        name: ticket.name || "",
        email: ticket.email || "",
        topic: ticket.topic,
        message: ticket.message,
        orderId: ticket.order_id,
        listingId: ticket.listing_id,
        listingTitle: listing?.title || "",
        status: ticket.status,
        adminNote: ticket.admin_note || "",
        reviewedBy: ticket.reviewed_by,
        reviewedByName: ticket.reviewed_by
          ? getProfileName(reviewerProfile, ticket.reviewed_by)
          : "",
        reviewedAt: ticket.reviewed_at,
        createdAt: ticket.created_at,
        updatedAt: ticket.updated_at,
      };
    }),
  });
}

export async function PATCH(request: Request) {
  let serviceSupabase;

  try {
    serviceSupabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Admin support update configuration error:", error);
    return NextResponse.json(
      { error: "Admin support is temporarily unavailable." },
      { status: 500 },
    );
  }

  const { user, response } = await requireAdmin(request);

  if (response || !user) {
    return response;
  }

  let payload: UpdatePayload;

  try {
    payload = (await request.json()) as UpdatePayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const ticketId = payload.ticketId?.trim();
  const status = payload.status?.trim() || "";
  const adminNote = payload.adminNote?.trim() || null;

  if (!ticketId || !status) {
    return NextResponse.json(
      { error: "Ticket id and status are required." },
      { status: 400 },
    );
  }

  if (!isSupportStatus(status)) {
    return NextResponse.json(
      { error: "Choose a valid support status." },
      { status: 400 },
    );
  }

  const reviewedAt = new Date().toISOString();
  const { data: updateData, error: updateError } = await serviceSupabase
    .from("support_tickets")
    .update({
      status,
      admin_note: adminNote,
      reviewed_by: user.id,
      reviewed_at: reviewedAt,
      updated_at: reviewedAt,
    })
    .eq("id", ticketId)
    .select("*")
    .single();

  if (updateError) {
    console.error("Admin support ticket update error:", {
      error: updateError,
      errorMessage: updateError.message,
      ticketId,
      status,
      adminId: user.id,
    });
    return NextResponse.json(
      { error: "Support ticket could not be updated." },
      { status: 500 },
    );
  }

  const ticket = updateData as SupportTicketRow;

  return NextResponse.json({
    ticket: {
      id: ticket.id,
      status: ticket.status,
      adminNote: ticket.admin_note || "",
      reviewedBy: ticket.reviewed_by,
      reviewedAt: ticket.reviewed_at,
      updatedAt: ticket.updated_at,
    },
  });
}
