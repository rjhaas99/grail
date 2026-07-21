import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { loadShippingRateSettings } from "../../../lib/shippingProfiles.server";
import {
  getShippingProfilePublicPayload,
  shippingProfiles,
} from "../../../lib/shippingProfiles";

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
    { auth: { persistSession: false } },
  );
}

export async function GET() {
  let supabase;

  try {
    supabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Shipping profiles configuration error:", error);
    return NextResponse.json(
      { error: "Shipping profiles are temporarily unavailable." },
      { status: 500 },
    );
  }

  const settings = await loadShippingRateSettings(supabase);

  return NextResponse.json({
    settings,
    profiles: shippingProfiles.map((profile) =>
      getShippingProfilePublicPayload(profile, settings),
    ),
  });
}
