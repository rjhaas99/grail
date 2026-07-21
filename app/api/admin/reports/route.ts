import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const adminEmails = ["ryanjhaas99@gmail.com"];
const reportStatuses = ["open", "reviewed", "dismissed", "action_taken"] as const;

type ReportStatus = (typeof reportStatuses)[number];

type ListingReportRow = {
  id: string;
  listing_id: string;
  reporter_id: string | null;
  seller_id: string | null;
  reason: string;
  details: string | null;
  status: string;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ListingRow = {
  id: string;
  title: string | null;
  status: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
};

type UpdatePayload = {
  reportId?: string;
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
    console.error("Admin reports auth error:", error);
  }

  return { user, error: error?.message || null };
}

function shortId(value?: string | null) {
  return value ? value.slice(0, 8) : "Unknown";
}

function getProfileName(profile?: ProfileRow, fallbackId?: string | null) {
  return profile?.full_name || profile?.username || shortId(fallbackId);
}

function isReportStatus(value: string): value is ReportStatus {
  return reportStatuses.includes(value as ReportStatus);
}

async function requireAdmin(request: Request) {
  const { user, error: authError } = await getCurrentUser(request);
  const email = user?.email?.toLowerCase() || "";

  if (authError || !user || !adminEmails.includes(email)) {
    return { user: null, response: NextResponse.json({ error: "Access denied." }, { status: 403 }) };
  }

  return { user, response: null };
}

export async function GET(request: Request) {
  let serviceSupabase;

  try {
    serviceSupabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Admin reports configuration error:", error);
    return NextResponse.json(
      { error: "Admin reports are temporarily unavailable." },
      { status: 500 },
    );
  }

  const { user, response } = await requireAdmin(request);

  if (response || !user) {
    return response;
  }

  const { data: reportData, error: reportError } = await serviceSupabase
    .from("listing_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (reportError) {
    console.error("Admin reports fetch error:", {
      error: reportError,
      errorMessage: reportError.message,
      adminId: user.id,
    });
    return NextResponse.json(
      { error: "Listing reports could not be loaded." },
      { status: 500 },
    );
  }

  const reports = (reportData || []) as ListingReportRow[];
  const listingIds = Array.from(new Set(reports.map((report) => report.listing_id)));
  const profileIds = Array.from(
    new Set(
      reports
        .flatMap((report) => [report.reporter_id, report.seller_id, report.reviewed_by])
        .filter((profileId): profileId is string => Boolean(profileId)),
    ),
  );
  const listingsById = new Map<string, ListingRow>();
  const profilesById = new Map<string, ProfileRow>();

  if (listingIds.length > 0) {
    const { data: listingData, error: listingError } = await serviceSupabase
      .from("listings")
      .select("id, title, status")
      .in("id", listingIds);

    if (listingError) {
      console.error("Admin reports listing fetch error:", {
        error: listingError,
        errorMessage: listingError.message,
      });
    } else {
      ((listingData || []) as ListingRow[]).forEach((listing) => {
        listingsById.set(listing.id, listing);
      });
    }
  }

  if (profileIds.length > 0) {
    const { data: profileData, error: profileError } = await serviceSupabase
      .from("profiles")
      .select("id, full_name, username")
      .in("id", profileIds);

    if (profileError) {
      console.error("Admin reports profile fetch error:", {
        error: profileError,
        errorMessage: profileError.message,
      });
    } else {
      ((profileData || []) as ProfileRow[]).forEach((profile) => {
        profilesById.set(profile.id, profile);
      });
    }
  }

  return NextResponse.json({
    reports: reports.map((report) => {
      const listing = listingsById.get(report.listing_id);
      const reporterProfile = report.reporter_id
        ? profilesById.get(report.reporter_id)
        : undefined;
      const sellerProfile = report.seller_id
        ? profilesById.get(report.seller_id)
        : undefined;
      const reviewerProfile = report.reviewed_by
        ? profilesById.get(report.reviewed_by)
        : undefined;

      return {
        id: report.id,
        shortId: shortId(report.id),
        listingId: report.listing_id,
        listingTitle: listing?.title || "GRAIL Listing",
        listingStatus: listing?.status || "unknown",
        reporterId: report.reporter_id,
        reporterName: report.reporter_id
          ? getProfileName(reporterProfile, report.reporter_id)
          : "Anonymous reporter",
        sellerId: report.seller_id,
        sellerName: getProfileName(sellerProfile, report.seller_id),
        reason: report.reason,
        details: report.details || "",
        status: report.status,
        adminNote: report.admin_note || "",
        reviewedBy: report.reviewed_by,
        reviewedByName: report.reviewed_by
          ? getProfileName(reviewerProfile, report.reviewed_by)
          : "",
        reviewedAt: report.reviewed_at,
        createdAt: report.created_at,
        updatedAt: report.updated_at,
      };
    }),
  });
}

export async function PATCH(request: Request) {
  let serviceSupabase;

  try {
    serviceSupabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Admin report update configuration error:", error);
    return NextResponse.json(
      { error: "Admin reports are temporarily unavailable." },
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

  const reportId = payload.reportId?.trim();
  const status = payload.status?.trim() || "";
  const adminNote = payload.adminNote?.trim() || null;

  if (!reportId || !status) {
    return NextResponse.json(
      { error: "Report id and status are required." },
      { status: 400 },
    );
  }

  if (!isReportStatus(status)) {
    return NextResponse.json(
      { error: "Choose a valid report status." },
      { status: 400 },
    );
  }

  const reviewedAt = new Date().toISOString();
  const { data: updateData, error: updateError } = await serviceSupabase
    .from("listing_reports")
    .update({
      status,
      admin_note: adminNote,
      reviewed_by: user.id,
      reviewed_at: reviewedAt,
      updated_at: reviewedAt,
    })
    .eq("id", reportId)
    .select("*")
    .single();

  if (updateError) {
    console.error("Admin report update error:", {
      error: updateError,
      errorMessage: updateError.message,
      reportId,
      status,
      adminId: user.id,
    });
    return NextResponse.json(
      { error: "Report could not be updated." },
      { status: 500 },
    );
  }

  const report = updateData as ListingReportRow;

  return NextResponse.json({
    report: {
      id: report.id,
      status: report.status,
      adminNote: report.admin_note || "",
      reviewedBy: report.reviewed_by,
      reviewedAt: report.reviewed_at,
      updatedAt: report.updated_at,
    },
  });
}
