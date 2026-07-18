import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  calculateProgression,
  getXpSourceDisplay,
  isXpSource,
  type XpActivity,
} from "../../lib/progression";
import { processRewardEvent, type RewardEventType } from "../../lib/rewardsEngine";

export const runtime = "nodejs";

type ProgressRow = {
  user_id: string;
  xp: number | null;
  level: number | null;
  title: string | null;
  next_level_xp: number | null;
  progress_percentage: number | null;
};

type XpEventRow = {
  id: string;
  source: string | null;
  xp_amount: number | null;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string | null;
};

type AchievementUnlockRow = {
  id: string;
  achievement_key: string | null;
  title: string | null;
  description: string | null;
  unlocked_at: string | null;
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

async function getRecentAchievementUnlocks(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  userId: string,
) {
  const { data, error } = await supabase
    .from("achievement_unlocks")
    .select("id, achievement_key, title, description, unlocked_at")
    .eq("user_id", userId)
    .order("unlocked_at", { ascending: false })
    .limit(6);

  if (error) {
    console.warn("Recent achievement unlocks unavailable:", {
      message: error.message,
      error,
      userId,
    });
    return [];
  }

  return ((data || []) as AchievementUnlockRow[]).map((achievement) => ({
    id: achievement.id,
    key: achievement.achievement_key || "",
    title: achievement.title || "Achievement Unlocked",
    description: achievement.description || "A GRAIL achievement was unlocked.",
    unlockedAt: achievement.unlocked_at,
  }));
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
    const [recentActivity, recentAchievements] = await Promise.all([
      getRecentXpActivity(serviceSupabase, userId),
      getRecentAchievementUnlocks(serviceSupabase, userId),
    ]);

    return NextResponse.json({
      progression: calculateProgression(row.xp, achievementsCount),
      recentActivity,
      recentAchievements,
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
    const listingId =
      typeof payload.listingId === "string" ? payload.listingId.trim() : "";
    const rewardEventBySource: Record<"list_card" | "quality_listing_photos", RewardEventType> = {
      list_card: "LIST_CARD",
      quality_listing_photos: "UPLOAD_LISTING_PHOTOS",
    };
    const rewardEvent = rewardEventBySource[source as keyof typeof rewardEventBySource];

    if (!rewardEvent) {
      return NextResponse.json(
        { error: "This XP source must be processed by a verified server-side event." },
        { status: 400 },
      );
    }

    const result = await processRewardEvent({
      supabase: serviceSupabase,
      userId,
      event: rewardEvent,
      reference: {
        type: "listing",
        id: listingId,
      },
      metadata: {
        listingId,
        requestedSource: source,
      },
    });
    const firstAward = result.xp.awards[0] || null;

    return NextResponse.json({
      awardedXp: result.xp.totalAwarded,
      source,
      idempotencyKey: firstAward
        ? `${firstAward.source}:${firstAward.referenceType}:${firstAward.referenceId}`
        : null,
      alreadyAwarded: result.xp.awards.length > 0
        ? result.xp.awards.every((award) => award.alreadyAwarded)
        : false,
      progression: result.progression || calculateProgression(0),
      achievementUnlocked: result.achievements.unlocked[0] || null,
      rewardEvent: result.event,
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
