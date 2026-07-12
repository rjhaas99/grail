import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  calculateProgression,
  getAchievementForXpSource,
  getXpSourceDisplay,
  getXpForSource,
  isXpSource,
  type XpActivity,
  type XpSource,
} from "../../lib/progression";

export const runtime = "nodejs";

type ProgressRow = {
  user_id: string;
  xp: number | null;
  level: number | null;
  title: string | null;
  next_level_xp: number | null;
  progress_percentage: number | null;
};

type AchievementRow = {
  achievement_key: string;
};

type XpEventRow = {
  id: string;
  source: string | null;
  xp_amount: number | null;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string | null;
};

type ListingRow = {
  id: string;
  seller_id: string | null;
  status: string | null;
};

type VerifiedXpEvent = {
  source: XpSource;
  xpAmount: number;
  referenceType: string;
  referenceId: string;
  idempotencyKey: string;
  metadata: Record<string, string | number | boolean | null>;
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
    return { userId: "", error: "Missing authorization token." };
  }

  const supabase = createAnonSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error) {
    console.error("Progression auth error:", {
      message: error.message,
      error,
    });
  }

  return { userId: user?.id || "", error: error?.message || null };
}

async function getAchievementCount(supabase: ReturnType<typeof createServiceSupabaseClient>, userId: string) {
  const { count, error } = await supabase
    .from("achievement_unlocks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    console.warn("Achievement count unavailable:", {
      message: error.message,
      error,
    });
    return 0;
  }

  return count || 0;
}

async function getOrCreateProgressRow(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  userId: string,
) {
  const { data, error } = await supabase
    .from("user_progress")
    .select("user_id, xp, level, title, next_level_xp, progress_percentage")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Progress row fetch error:", {
      message: error.message,
      error,
      userId,
    });
    throw new Error("Progression is not configured yet.");
  }

  if (data) {
    return data as ProgressRow;
  }

  const startingProgress = calculateProgression(0);
  const { data: inserted, error: insertError } = await supabase
    .from("user_progress")
    .insert({
      user_id: userId,
      xp: startingProgress.xp,
      level: startingProgress.level,
      title: startingProgress.title,
      next_level_xp: startingProgress.nextLevelXp,
      progress_percentage: startingProgress.progressPercentage,
    })
    .select("user_id, xp, level, title, next_level_xp, progress_percentage")
    .maybeSingle();

  if (insertError) {
    console.error("Progress row create error:", {
      message: insertError.message,
      error: insertError,
      userId,
    });
    throw new Error("Progression could not be created.");
  }

  return inserted as ProgressRow;
}

async function getXpEventCount(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  userId: string,
) {
  const { count, error } = await supabase
    .from("xp_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    console.error("XP event count error:", {
      message: error.message,
      error,
      userId,
    });
    throw new Error("XP event records are not configured yet.");
  }

  return count || 0;
}

async function ensureLegacyBaselineEvent(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  userId: string,
  currentXp: number,
) {
  if (currentXp <= 0) {
    return;
  }

  const eventCount = await getXpEventCount(supabase, userId);

  if (eventCount > 0) {
    return;
  }

  const { error } = await supabase.from("xp_events").insert({
    user_id: userId,
    source: "legacy_baseline",
    xp_amount: currentXp,
    reference_type: "user",
    reference_id: userId,
    idempotency_key: `legacy_baseline:user:${userId}`,
    metadata: {
      reason: "Existing progression XP before xp_events enforcement.",
    },
  });

  if (error && error.code !== "23505") {
    console.error("Legacy XP baseline event insert error:", {
      message: error.message,
      error,
      userId,
    });
    throw new Error("Existing XP could not be normalized.");
  }
}

async function getXpTotalFromEvents(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  userId: string,
) {
  const { data, error } = await supabase
    .from("xp_events")
    .select("xp_amount")
    .eq("user_id", userId);

  if (error) {
    console.error("XP event total fetch error:", {
      message: error.message,
      error,
      userId,
    });
    throw new Error("XP event records could not be loaded.");
  }

  return ((data || []) as { xp_amount: number | null }[]).reduce(
    (total, event) => total + Math.max(0, Number(event.xp_amount) || 0),
    0,
  );
}

async function getRecentXpActivity(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  userId: string,
): Promise<XpActivity[]> {
  const { data, error } = await supabase
    .from("xp_events")
    .select("id, source, xp_amount, reference_type, reference_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    console.warn("Recent XP activity unavailable:", {
      message: error.message,
      error,
      userId,
    });
    return [];
  }

  return ((data || []) as XpEventRow[]).map((event) => {
    const source = event.source || "";
    const display = getXpSourceDisplay(source);
    const referenceType = event.reference_type || null;
    const referenceId = event.reference_id || null;
    const orderHref =
      referenceType === "order"
        ? ["sell_card", "first_sale_bonus"].includes(source)
          ? "/seller-dashboard"
          : "/orders"
        : null;

    return {
      id: event.id,
      source,
      label: display.activityLabel,
      xpAmount: Math.max(0, Number(event.xp_amount) || 0),
      createdAt: event.created_at,
      referenceType,
      referenceId,
      href:
        referenceType === "listing" && referenceId
          ? `/cards/${referenceId}`
          : orderHref,
    };
  });
}

async function verifyXpEvent(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  userId: string,
  payload: { source: XpSource; listingId?: unknown },
): Promise<VerifiedXpEvent> {
  const listingId =
    typeof payload.listingId === "string" ? payload.listingId.trim() : "";

  if (!listingId) {
    throw new Error("listingId is required for this XP event.");
  }

  if (!["list_card", "quality_listing_photos"].includes(payload.source)) {
    throw new Error("This XP source must be awarded by a verified server-side event.");
  }

  const { data, error } = await supabase
    .from("listings")
    .select("id, seller_id, status")
    .eq("id", listingId)
    .maybeSingle();

  if (error) {
    console.error("XP listing verification error:", {
      message: error.message,
      error,
      userId,
      listingId,
      source: payload.source,
    });
    throw new Error("Listing could not be verified for XP.");
  }

  const listing = data as ListingRow | null;

  if (!listing || listing.seller_id !== userId) {
    throw new Error("Listing does not belong to the current user.");
  }

  if (!["active", "collection"].includes(listing.status || "")) {
    throw new Error("Listing is not eligible for progression XP yet.");
  }

  if (payload.source === "quality_listing_photos") {
    const { count, error: imageError } = await supabase
      .from("listing_images")
      .select("id", { count: "exact", head: true })
      .eq("listing_id", listingId);

    if (imageError) {
      console.error("XP listing image verification error:", {
        message: imageError.message,
        error: imageError,
        userId,
        listingId,
      });
      throw new Error("Listing photos could not be verified for XP.");
    }

    if (!count) {
      throw new Error("Listing needs uploaded photos before photo XP can be awarded.");
    }
  }

  return {
    source: payload.source,
    xpAmount: getXpForSource(payload.source),
    referenceType: "listing",
    referenceId: listingId,
    idempotencyKey: `${payload.source}:listing:${listingId}`,
    metadata: {
      listingId,
      listingStatus: listing.status,
    },
  };
}

async function unlockBasicAchievement(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  userId: string,
  source: XpSource,
) {
  const achievement = getAchievementForXpSource(source);

  if (!achievement) {
    return null;
  }

  const { data: existing, error: existingError } = await supabase
    .from("achievement_unlocks")
    .select("achievement_key")
    .eq("user_id", userId)
    .eq("achievement_key", achievement.key)
    .maybeSingle();

  if (existingError) {
    console.warn("Achievement lookup skipped:", {
      message: existingError.message,
      error: existingError,
      userId,
      achievement: achievement.key,
    });
    return null;
  }

  if ((existing as AchievementRow | null)?.achievement_key) {
    return null;
  }

  const { error } = await supabase.from("achievement_unlocks").insert({
    user_id: userId,
    achievement_key: achievement.key,
    title: achievement.title,
    description: achievement.description,
  });

  if (error) {
    console.warn("Achievement unlock skipped:", {
      message: error.message,
      error,
      userId,
      achievement: achievement.key,
    });
    return null;
  }

  return achievement;
}

export async function GET(request: Request) {
  let serviceSupabase;

  try {
    serviceSupabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Progression configuration error:", error);
    return NextResponse.json(
      {
        error: "Progression is not configured yet.",
        progression: calculateProgression(0),
      },
      { status: 500 },
    );
  }

  const { userId, error: authError } = await getCurrentUser(request);

  if (authError || !userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  try {
    const row = await getOrCreateProgressRow(serviceSupabase, userId);
    const achievementsCount = await getAchievementCount(serviceSupabase, userId);
    const recentActivity = await getRecentXpActivity(serviceSupabase, userId);

    return NextResponse.json({
      progression: calculateProgression(row.xp, achievementsCount),
      recentActivity,
    });
  } catch (error) {
    console.error("Progression GET error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Progression could not be loaded.",
        progression: calculateProgression(0),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let serviceSupabase;

  try {
    serviceSupabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Progression configuration error:", error);
    return NextResponse.json(
      { error: "Progression is not configured yet." },
      { status: 500 },
    );
  }

  const { userId, error: authError } = await getCurrentUser(request);

  if (authError || !userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let payload: { source?: unknown; listingId?: unknown };

  try {
    payload = (await request.json()) as { source?: unknown; listingId?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isXpSource(payload.source)) {
    return NextResponse.json({ error: "Unsupported XP source." }, { status: 400 });
  }

  const source = payload.source;

  try {
    const row = await getOrCreateProgressRow(serviceSupabase, userId);
    await ensureLegacyBaselineEvent(
      serviceSupabase,
      userId,
      Math.max(0, Number(row.xp) || 0),
    );

    const event = await verifyXpEvent(serviceSupabase, userId, {
      source,
      listingId: payload.listingId,
    });

    if (event.xpAmount <= 0) {
      return NextResponse.json({ error: "No XP is configured for this source." }, { status: 400 });
    }

    const { error: eventError } = await serviceSupabase.from("xp_events").insert({
      user_id: userId,
      source: event.source,
      xp_amount: event.xpAmount,
      reference_type: event.referenceType,
      reference_id: event.referenceId,
      idempotency_key: event.idempotencyKey,
      metadata: event.metadata,
    });

    if (eventError) {
      if (eventError.code === "23505") {
        const eventTotal = await getXpTotalFromEvents(serviceSupabase, userId);
        const achievementsCount = await getAchievementCount(serviceSupabase, userId);
        const progression = calculateProgression(eventTotal, achievementsCount);

        return NextResponse.json({
          awardedXp: 0,
          source,
          alreadyAwarded: true,
          progression,
        });
      }

      console.error("XP event insert error:", {
        message: eventError.message,
        error: eventError,
        userId,
        source,
        idempotencyKey: event.idempotencyKey,
      });
      return NextResponse.json({ error: "XP event could not be recorded." }, { status: 500 });
    }

    const unlockedAchievement = await unlockBasicAchievement(serviceSupabase, userId, source);
    const nextXp = await getXpTotalFromEvents(serviceSupabase, userId);
    const achievementsCount = await getAchievementCount(serviceSupabase, userId);
    const progression = calculateProgression(nextXp, achievementsCount);
    const { error } = await serviceSupabase
      .from("user_progress")
      .update({
        xp: progression.xp,
        level: progression.level,
        title: progression.title,
        next_level_xp: progression.nextLevelXp,
        progress_percentage: progression.progressPercentage,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      console.error("Progression update error:", {
        message: error.message,
        error,
        userId,
        source,
      });
      return NextResponse.json({ error: "Progression could not be updated." }, { status: 500 });
    }

    return NextResponse.json({
      awardedXp: event.xpAmount,
      source,
      idempotencyKey: event.idempotencyKey,
      progression,
      achievementUnlocked: unlockedAchievement,
    });
  } catch (error) {
    console.error("Progression POST error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Progression could not be updated.",
      },
      { status: 500 },
    );
  }
}
