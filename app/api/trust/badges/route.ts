import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { buildTrustBadges, type UserTrustRow } from "../../../lib/trustEngine";

export const runtime = "nodejs";

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
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

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getYearsOnGrail(value?: string | null) {
  if (!value) {
    return 0;
  }

  const joinedAt = new Date(value).getTime();

  if (!Number.isFinite(joinedAt)) {
    return 0;
  }

  const years = (Date.now() - joinedAt) / (1000 * 60 * 60 * 24 * 365.25);
  return Math.max(0, Math.floor(years));
}

function getVerificationStatus(row?: Partial<UserTrustRow> | null) {
  if (row?.verified_identity) {
    return "Identity verified";
  }

  if (row?.verified_phone) {
    return "Phone verified";
  }

  if (row?.verified_email) {
    return "Email verified";
  }

  return "Not verified yet";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId")?.trim();

  if (!userId) {
    return NextResponse.json({ badges: [] });
  }

  let supabase;

  try {
    supabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Trust badge configuration error:", error);
    return NextResponse.json({ badges: [] });
  }

  const [{ data, error }, profileResult] = await Promise.all([
    supabase
    .from("user_trust")
    .select(
      "user_id, verified_email, verified_phone, verified_identity, successful_sales, successful_purchases, successful_auctions, positive_feedback, account_created_at",
    )
    .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("created_at")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  if (error) {
    console.warn("Trust badge lookup skipped:", {
      error,
      errorMessage: error.message,
      userId,
    });
    return NextResponse.json({ badges: [] });
  }

  if (profileResult.error) {
    console.warn("Trust badge profile lookup skipped:", {
      error: profileResult.error,
      errorMessage: profileResult.error.message,
      userId,
    });
  }

  const trust = data as Partial<UserTrustRow> | null;
  const profile = profileResult.data as { created_at?: string | null } | null;
  const memberSince = String(trust?.account_created_at || profile?.created_at || "") || null;

  return NextResponse.json({
    badges: buildTrustBadges(trust),
    summary: {
      completedSales: toNumber(trust?.successful_sales),
      completedPurchases: toNumber(trust?.successful_purchases),
      yearsOnGrail: getYearsOnGrail(memberSince),
      verificationStatus: getVerificationStatus(trust),
      memberSince,
    },
  });
}
