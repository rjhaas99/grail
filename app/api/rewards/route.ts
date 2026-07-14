import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getRewardEngineSnapshot } from "../../lib/rewardsEngine";

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
    console.error("Rewards auth error:", {
      error,
      errorMessage: error.message,
    });
  }

  return { userId: user?.id || "", error: error?.message || null };
}

export async function GET(request: Request) {
  let serviceSupabase;

  try {
    serviceSupabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Rewards configuration error:", error);
    return NextResponse.json(
      { error: "GRAIL Economy is not configured." },
      { status: 500 },
    );
  }

  const { userId, error: authError } = await getCurrentUser(request);

  if (authError || !userId) {
    return NextResponse.json({ error: "Sign in to view rewards." }, { status: 401 });
  }

  try {
    const reward = await getRewardEngineSnapshot(serviceSupabase, userId);
    return NextResponse.json(reward);
  } catch (error) {
    console.error("Rewards load error:", {
      error,
      userId,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Rewards could not be loaded." },
      { status: 500 },
    );
  }
}
