import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getWallet } from "../../lib/wallet";

export const runtime = "nodejs";

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

type RewardEventRow = {
  id: string;
  event_type: string | null;
  reference_type: string | null;
  reference_id: string | null;
  reward_tier: string | null;
  xp_awarded: number | string | null;
  wallet_credit_awarded: number | string | null;
  actual_buyer_multiplier: number | string | null;
  actual_seller_multiplier: number | string | null;
  wallet_multiplier_used: number | string | null;
  seasonal_event: string | null;
  treasure_chest_triggered: boolean | null;
  challenge_triggered: boolean | null;
  processed_at: string | null;
  created_at: string | null;
};

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
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
    console.error("Wallet auth error:", {
      error,
      errorMessage: error.message,
    });
  }

  return { userId: user?.id || "", error: error?.message || null };
}

async function getRewardEvents(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  userId: string,
) {
  const { data, error } = await supabase
    .from("reward_events")
    .select(
      "id, event_type, reference_type, reference_id, reward_tier, xp_awarded, wallet_credit_awarded, actual_buyer_multiplier, actual_seller_multiplier, wallet_multiplier_used, seasonal_event, treasure_chest_triggered, challenge_triggered, processed_at, created_at",
    )
    .eq("user_id", userId)
    .order("processed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    console.warn("Wallet reward events fetch skipped:", {
      error,
      errorMessage: error.message,
      userId,
    });
    return [];
  }

  return ((data || []) as RewardEventRow[]).map((row) => ({
    id: row.id,
    eventType: row.event_type || "REWARD",
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    rewardTier: row.reward_tier,
    xpAwarded: toNumber(row.xp_awarded),
    walletCreditAwarded: toNumber(row.wallet_credit_awarded),
    actualBuyerMultiplier: toNumber(row.actual_buyer_multiplier),
    actualSellerMultiplier: toNumber(row.actual_seller_multiplier),
    walletMultiplierUsed: toNumber(row.wallet_multiplier_used),
    seasonalEvent: row.seasonal_event,
    treasureChestTriggered: Boolean(row.treasure_chest_triggered),
    challengeTriggered: Boolean(row.challenge_triggered),
    processedAt: row.processed_at,
    createdAt: row.created_at,
  }));
}

export async function GET(request: Request) {
  let serviceSupabase;

  try {
    serviceSupabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Wallet configuration error:", error);
    return NextResponse.json(
      { error: "GRAIL Wallet is temporarily unavailable." },
      { status: 500 },
    );
  }

  const { userId, error: authError } = await getCurrentUser(request);

  if (authError || !userId) {
    return NextResponse.json({ error: "Sign in to view your wallet." }, { status: 401 });
  }

  try {
    const [wallet, rewardEvents] = await Promise.all([
      getWallet(serviceSupabase, userId, 25),
      getRewardEvents(serviceSupabase, userId),
    ]);

    return NextResponse.json({ ...wallet, rewardEvents });
  } catch (error) {
    console.error("Wallet load error:", {
      error,
      userId,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "GRAIL Wallet could not be loaded." },
      { status: 500 },
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { error: "Wallet credits can only be changed by verified server-side events." },
    { status: 403 },
  );
}
