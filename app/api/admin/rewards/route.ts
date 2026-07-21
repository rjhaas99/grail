import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getRewardTiers } from "../../../lib/rewards";

export const runtime = "nodejs";

const adminEmails = ["ryanjhaas99@gmail.com"];

type RewardUpdatePayload = {
  id?: string;
  rankName?: string;
  minLevel?: number;
  maxLevel?: number;
  sellerFeePercent?: number;
  buyerBasePercent?: number;
  sellerBasePercent?: number;
  buyerMultiplier?: number;
  sellerMultiplier?: number;
  xpMultiplier?: number;
  walletMultiplier?: number;
  enabled?: boolean;
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
    console.error("Admin rewards auth error:", {
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

function cleanPercent(value: unknown, label: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    throw new Error(`${label} must be between 0 and 100.`);
  }

  return Math.round(parsed * 100) / 100;
}

function cleanMultiplier(value: unknown, label: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100) {
    throw new Error(`${label} must be greater than 0.`);
  }

  return Math.round(parsed * 100) / 100;
}

function cleanLevel(value: unknown, label: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 100) {
    throw new Error(`${label} must be between 1 and 100.`);
  }

  return Math.floor(parsed);
}

function cleanRankName(value: unknown) {
  const rankName = typeof value === "string" ? value.trim().toUpperCase() : "";

  if (!rankName || rankName.length > 40) {
    throw new Error("Rank must be 1-40 characters.");
  }

  return rankName;
}

export async function GET(request: Request) {
  let serviceSupabase;

  try {
    serviceSupabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Admin rewards configuration error:", error);
    return NextResponse.json(
      { error: "Admin rewards are temporarily unavailable." },
      { status: 500 },
    );
  }

  const { response } = await requireAdmin(request);

  if (response) {
    return response;
  }

  try {
    const tiers = await getRewardTiers(serviceSupabase);
    return NextResponse.json({ tiers });
  } catch (error) {
    console.error("Admin rewards load error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "GRAIL Economy could not be loaded." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  let serviceSupabase;

  try {
    serviceSupabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Admin rewards configuration error:", error);
    return NextResponse.json(
      { error: "Admin rewards are temporarily unavailable." },
      { status: 500 },
    );
  }

  const { response } = await requireAdmin(request);

  if (response) {
    return response;
  }

  const payload = (await request.json().catch(() => ({}))) as RewardUpdatePayload;

  if (!payload.id) {
    return NextResponse.json({ error: "Reward tier id is required." }, { status: 400 });
  }

  let updatePayload;

  try {
    const minLevel = cleanLevel(payload.minLevel, "Minimum level");
    const maxLevel = cleanLevel(payload.maxLevel, "Maximum level");

    if (maxLevel < minLevel) {
      throw new Error("Maximum level must be greater than or equal to minimum level.");
    }

    updatePayload = {
      rank_name: cleanRankName(payload.rankName),
      min_level: minLevel,
      max_level: maxLevel,
      seller_fee_percent: cleanPercent(payload.sellerFeePercent, "Seller fee"),
      buyer_base_percent: cleanPercent(payload.buyerBasePercent, "Buyer base reward"),
      seller_base_percent: cleanPercent(payload.sellerBasePercent, "Seller base reward"),
      buyer_multiplier: cleanMultiplier(payload.buyerMultiplier, "Buyer multiplier"),
      seller_multiplier: cleanMultiplier(payload.sellerMultiplier, "Seller multiplier"),
      xp_multiplier: cleanMultiplier(payload.xpMultiplier, "XP multiplier"),
      wallet_multiplier: cleanMultiplier(payload.walletMultiplier, "Wallet multiplier"),
      enabled: Boolean(payload.enabled),
      updated_at: new Date().toISOString(),
    };
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Reward update is invalid." },
      { status: 400 },
    );
  }

  const { data, error } = await serviceSupabase
    .from("reward_tiers")
    .update(updatePayload)
    .eq("id", payload.id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("Admin rewards update error:", {
      error,
      errorMessage: error.message,
      tierId: payload.id,
    });
    return NextResponse.json(
      { error: "Reward tier could not be saved." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    tier: data,
    message: "Economy tier saved.",
  });
}
