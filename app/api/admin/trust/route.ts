import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  buildTrustBadges,
  normalizeTrustLevel,
  trustLevels,
  type UserTrustRow,
} from "../../../lib/trustEngine";

export const runtime = "nodejs";

const adminEmails = ["ryanjhaas99@gmail.com"];

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
};

type TrustEventRow = {
  id: string;
  user_id: string;
  event_type: string;
  old_score: number | string | null;
  new_score: number | string | null;
  reason: string | null;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string | null;
};

type AdminTrustPayload = {
  userId?: string;
  action?: string;
  scoreAdjustment?: number;
  trustLevel?: string;
  internalNote?: string;
  verifiedEmail?: boolean;
  verifiedPhone?: boolean;
  verifiedIdentity?: boolean;
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
    console.error("Admin trust auth error:", {
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

function shortId(value?: string | null) {
  return value ? value.slice(0, 8) : "Unknown";
}

function getProfileName(profile?: ProfileRow, fallbackId?: string | null) {
  return profile?.full_name || profile?.username || shortId(fallbackId);
}

function sanitizeSearch(value: string) {
  return value.replace(/[,%()]/g, "").trim().toLowerCase();
}

function normalizeTrustRecord(
  row: UserTrustRow,
  profile?: ProfileRow,
  email = "",
  accountCreatedAt?: string | null,
) {
  return {
    userId: row.user_id,
    userName: getProfileName(profile, row.user_id),
    username: profile?.username || "",
    email,
    internalTrustScore: toNumber(row.internal_trust_score),
    trustLevel: normalizeTrustLevel(row.trust_level),
    verifiedEmail: Boolean(row.verified_email),
    verifiedPhone: Boolean(row.verified_phone),
    verifiedIdentity: Boolean(row.verified_identity),
    successfulSales: toNumber(row.successful_sales),
    successfulPurchases: toNumber(row.successful_purchases),
    successfulAuctions: toNumber(row.successful_auctions),
    successfulDeliveries: toNumber(row.successful_deliveries),
    positiveFeedback: toNumber(row.positive_feedback),
    negativeFeedback: toNumber(row.negative_feedback),
    chargebacks: toNumber(row.chargebacks),
    disputesOpened: toNumber(row.disputes_opened),
    disputesLost: toNumber(row.disputes_lost),
    disputesWon: toNumber(row.disputes_won),
    sellerCancellations: toNumber(row.seller_cancellations),
    buyerCancellations: toNumber(row.buyer_cancellations),
    auctionDefaults: toNumber(row.auction_defaults),
    fraudFlags: toNumber(row.fraud_flags),
    manualReviewRequired: Boolean(row.manual_review_required),
    internalNote: row.internal_note || "",
    accountCreatedAt: row.account_created_at || accountCreatedAt || null,
    updatedAt: row.updated_at,
    badges: buildTrustBadges(row),
  };
}

function getDefaultTrustRow(userId: string, accountCreatedAt?: string | null): UserTrustRow {
  const now = new Date().toISOString();

  return {
    user_id: userId,
    internal_trust_score: 0,
    trust_level: "Low Risk",
    verified_email: false,
    verified_phone: false,
    verified_identity: false,
    successful_sales: 0,
    successful_purchases: 0,
    successful_auctions: 0,
    successful_deliveries: 0,
    positive_feedback: 0,
    negative_feedback: 0,
    chargebacks: 0,
    disputes_opened: 0,
    disputes_lost: 0,
    disputes_won: 0,
    seller_cancellations: 0,
    buyer_cancellations: 0,
    auction_defaults: 0,
    fraud_flags: 0,
    manual_review_required: false,
    internal_note: "",
    account_created_at: accountCreatedAt || now,
    updated_at: now,
  };
}

export async function GET(request: Request) {
  let serviceSupabase;

  try {
    serviceSupabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Admin trust configuration error:", error);
    return NextResponse.json(
      { error: "Admin trust is not configured." },
      { status: 500 },
    );
  }

  const { user, response } = await requireAdmin(request);

  if (response || !user) {
    return response;
  }

  const { searchParams } = new URL(request.url);
  const search = sanitizeSearch(searchParams.get("search") || "");

  const { data: trustData, error: trustError } = await serviceSupabase
    .from("user_trust")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(200);

  if (trustError) {
    console.error("Admin trust fetch error:", {
      error: trustError,
      errorMessage: trustError.message,
      adminId: user.id,
    });
    return NextResponse.json(
      { error: "Trust records could not be loaded. Run the Trust SQL first." },
      { status: 500 },
    );
  }

  const trustRows = (trustData || []) as UserTrustRow[];
  const trustUserIds = trustRows.map((row) => row.user_id);
  const profilesById = new Map<string, ProfileRow>();
  const emailsById = new Map<string, string>();
  const createdAtById = new Map<string, string>();
  let searchedProfileIds: string[] = [];
  let searchedAuthUserIds: string[] = [];

  const { data: authUsersData, error: authUsersError } =
    await serviceSupabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

  if (authUsersError) {
    console.error("Admin trust auth users fetch error:", {
      error: authUsersError,
      errorMessage: authUsersError.message,
    });
  } else {
    (authUsersData.users || []).forEach((authUser) => {
      emailsById.set(authUser.id, authUser.email || "");
      createdAtById.set(authUser.id, authUser.created_at || "");
    });

    if (search) {
      searchedAuthUserIds = (authUsersData.users || [])
        .filter((authUser) => {
          const haystack = [authUser.id, authUser.email || ""]
            .join(" ")
            .toLowerCase();
          return haystack.includes(search);
        })
        .map((authUser) => authUser.id);
    }
  }

  if (search) {
    const { data: matchingProfiles, error: profileSearchError } = await serviceSupabase
      .from("profiles")
      .select("id, full_name, username")
      .or(`full_name.ilike.%${search}%,username.ilike.%${search}%`)
      .limit(50);

    if (profileSearchError) {
      console.error("Admin trust profile search error:", {
        error: profileSearchError,
        errorMessage: profileSearchError.message,
      });
    } else {
      searchedProfileIds = ((matchingProfiles || []) as ProfileRow[]).map(
        (profile) => profile.id,
      );
      ((matchingProfiles || []) as ProfileRow[]).forEach((profile) => {
        profilesById.set(profile.id, profile);
      });
    }
  }

  const allUserIds = Array.from(
    new Set([...trustUserIds, ...searchedProfileIds, ...searchedAuthUserIds]),
  );

  if (allUserIds.length > 0) {
    const missingProfileIds = allUserIds.filter((profileId) => !profilesById.has(profileId));

    if (missingProfileIds.length > 0) {
      const { data: profileData, error: profileError } = await serviceSupabase
        .from("profiles")
        .select("id, full_name, username")
        .in("id", missingProfileIds);

      if (profileError) {
        console.error("Admin trust profile fetch error:", {
          error: profileError,
          errorMessage: profileError.message,
        });
      } else {
        ((profileData || []) as ProfileRow[]).forEach((profile) => {
          profilesById.set(profile.id, profile);
        });
      }
    }
  }

  const trustById = new Map(trustRows.map((row) => [row.user_id, row]));
  const records = allUserIds
    .map((userId) =>
      normalizeTrustRecord(
        trustById.get(userId) || getDefaultTrustRow(userId, createdAtById.get(userId)),
        profilesById.get(userId),
        emailsById.get(userId) || "",
        createdAtById.get(userId),
      ),
    )
    .filter((record) => {
      if (!search) {
        return true;
      }

      return [
        record.userId,
        record.userName,
        record.username,
        record.email,
        record.trustLevel,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search);
    });

  const eventQuery = serviceSupabase
    .from("trust_events")
    .select("id, user_id, event_type, old_score, new_score, reason, reference_type, reference_id, created_at")
    .order("created_at", { ascending: false })
    .limit(150);
  const { data: eventData, error: eventError } = await eventQuery;

  if (eventError) {
    console.error("Admin trust events fetch error:", {
      error: eventError,
      errorMessage: eventError.message,
    });
  }

  const events = ((eventData || []) as TrustEventRow[]).map((event) => ({
    id: event.id,
    userId: event.user_id,
    userName: getProfileName(profilesById.get(event.user_id), event.user_id),
    eventType: event.event_type,
    oldScore: toNumber(event.old_score),
    newScore: toNumber(event.new_score),
    reason: event.reason || "",
    referenceType: event.reference_type,
    referenceId: event.reference_id,
    createdAt: event.created_at,
  }));

  return NextResponse.json({
    records,
    events,
    riskLevels: trustLevels,
  });
}

export async function PATCH(request: Request) {
  let serviceSupabase;

  try {
    serviceSupabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Admin trust configuration error:", error);
    return NextResponse.json(
      { error: "Admin trust is not configured." },
      { status: 500 },
    );
  }

  const { user, response } = await requireAdmin(request);

  if (response || !user) {
    return response;
  }

  const payload = (await request.json().catch(() => ({}))) as AdminTrustPayload;
  const userId = payload.userId?.trim();
  const action = payload.action?.trim() || "";
  const internalNote = payload.internalNote?.trim() || "";

  if (!userId) {
    return NextResponse.json({ error: "User ID is required." }, { status: 400 });
  }

  const { data: currentData, error: currentError } = await serviceSupabase
    .from("user_trust")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (currentError) {
    console.error("Admin trust current fetch error:", {
      error: currentError,
      errorMessage: currentError.message,
      userId,
    });
    return NextResponse.json(
      { error: "Trust record could not be loaded." },
      { status: 500 },
    );
  }

  let current = currentData as UserTrustRow | null;

  if (!current) {
    const { data: inserted, error: insertError } = await serviceSupabase
      .from("user_trust")
      .insert({
        user_id: userId,
        trust_level: "Low Risk",
        internal_trust_score: 0,
      })
      .select("*")
      .maybeSingle();

    if (insertError) {
      console.error("Admin trust insert error:", {
        error: insertError,
        errorMessage: insertError.message,
        userId,
      });
      return NextResponse.json(
        { error: "Trust record could not be created." },
        { status: 500 },
      );
    }

    current = inserted as UserTrustRow;
  }

  const oldScore = Math.round(toNumber(current.internal_trust_score));
  const updatePayload: Record<string, string | number | boolean | null> = {
    updated_at: new Date().toISOString(),
  };
  let eventType = "";
  let reason = internalNote;

  if (action === "require_manual_review") {
    updatePayload.manual_review_required = true;
    eventType = "ADMIN_REQUIRE_MANUAL_REVIEW";
    reason ||= "Manual review required by admin.";
  } else if (action === "clear_manual_review") {
    updatePayload.manual_review_required = false;
    eventType = "ADMIN_CLEAR_MANUAL_REVIEW";
    reason ||= "Manual review cleared by admin.";
  } else if (action === "add_fraud_flag") {
    updatePayload.fraud_flags = toNumber(current.fraud_flags) + 1;
    updatePayload.manual_review_required = true;
    eventType = "ADMIN_ADD_FRAUD_FLAG";
    reason ||= "Fraud flag added by admin.";
  } else if (action === "remove_fraud_flag") {
    updatePayload.fraud_flags = Math.max(0, toNumber(current.fraud_flags) - 1);
    eventType = "ADMIN_REMOVE_FRAUD_FLAG";
    reason ||= "Fraud flag removed by admin.";
  } else if (action === "adjust_score") {
    const adjustment = Math.round(Number(payload.scoreAdjustment) || 0);
    updatePayload.internal_trust_score = oldScore + adjustment;
    eventType = "ADMIN_ADJUST_TRUST_SCORE";
    reason ||= `Trust score adjusted by ${adjustment}.`;
  } else if (action === "set_risk_level") {
    updatePayload.trust_level = normalizeTrustLevel(payload.trustLevel);
    eventType = "ADMIN_SET_RISK_LEVEL";
    reason ||= `Risk level set to ${updatePayload.trust_level}.`;
  } else if (action === "set_verification") {
    updatePayload.verified_email = Boolean(payload.verifiedEmail);
    updatePayload.verified_phone = Boolean(payload.verifiedPhone);
    updatePayload.verified_identity = Boolean(payload.verifiedIdentity);
    eventType = "ADMIN_SET_VERIFICATION";
    reason ||= "Verification flags updated by admin.";
  } else if (action === "save_note") {
    updatePayload.internal_note = internalNote;
    eventType = "ADMIN_SAVE_INTERNAL_NOTE";
    reason ||= "Internal trust note updated by admin.";
  } else {
    return NextResponse.json({ error: "Unsupported trust action." }, { status: 400 });
  }

  const { data: updatedData, error: updateError } = await serviceSupabase
    .from("user_trust")
    .update(updatePayload)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();

  if (updateError) {
    console.error("Admin trust update error:", {
      error: updateError,
      errorMessage: updateError.message,
      userId,
      action,
    });
    return NextResponse.json(
      { error: "Trust record could not be updated." },
      { status: 500 },
    );
  }

  const updated = updatedData as UserTrustRow;
  const newScore = Math.round(toNumber(updated.internal_trust_score));
  const { error: eventError } = await serviceSupabase.from("trust_events").insert({
    user_id: userId,
    event_type: eventType,
    old_score: oldScore,
    new_score: newScore,
    reason,
    reference_type: "admin",
    reference_id: user.id,
  });

  if (eventError) {
    console.error("Admin trust event insert error:", {
      error: eventError,
      errorMessage: eventError.message,
      userId,
      action,
    });
    return NextResponse.json(
      { error: "Trust event could not be logged." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    record: normalizeTrustRecord(updated),
    message: "Trust record updated.",
  });
}
