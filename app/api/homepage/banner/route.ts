import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type HomepageBannerRow = {
  id: string;
  banner_type: string | null;
  headline: string | null;
  supporting_text: string | null;
  image_url: string | null;
  primary_button_label: string | null;
  primary_button_href: string | null;
  is_visible: boolean | null;
  start_at: string | null;
  end_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

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

function isMissingBannerTable(errorMessage: string) {
  return (
    errorMessage.includes("homepage_banners") ||
    errorMessage.includes("schema cache")
  );
}

function isActiveBanner(row: HomepageBannerRow, now = Date.now()) {
  if (!row.is_visible) {
    return false;
  }

  const startTime = row.start_at ? new Date(row.start_at).getTime() : null;
  const endTime = row.end_at ? new Date(row.end_at).getTime() : null;

  if (startTime && now < startTime) {
    return false;
  }

  if (endTime && now > endTime) {
    return false;
  }

  return Boolean(row.headline?.trim());
}

function mapBanner(row: HomepageBannerRow) {
  return {
    id: row.id,
    bannerType: row.banner_type || "image_banner",
    headline: row.headline || "",
    supportingText: row.supporting_text || "",
    imageUrl: row.image_url || null,
    primaryButtonLabel: row.primary_button_label || "",
    primaryButtonHref: row.primary_button_href || "",
    isVisible: Boolean(row.is_visible),
    startAt: row.start_at,
    endAt: row.end_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET() {
  let supabase;

  try {
    supabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Homepage banner configuration error:", error);
    return NextResponse.json({ banner: null }, { status: 200 });
  }

  const { data, error } = await supabase
    .from("homepage_banners")
    .select(
      "id, banner_type, headline, supporting_text, image_url, primary_button_label, primary_button_href, is_visible, start_at, end_at, created_at, updated_at",
    )
    .eq("is_visible", true)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error) {
    if (isMissingBannerTable(error.message)) {
      return NextResponse.json({ banner: null, setupRequired: true }, { status: 200 });
    }

    console.error("Homepage banner fetch error:", {
      error,
      errorMessage: error.message,
    });
    return NextResponse.json({ banner: null }, { status: 200 });
  }

  const activeBanner = ((data || []) as HomepageBannerRow[]).find((row) =>
    isActiveBanner(row),
  );

  return NextResponse.json({ banner: activeBanner ? mapBanner(activeBanner) : null });
}
