import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const adminEmails = ["ryanjhaas99@gmail.com"];

type ListingImageRow = {
  image_url: string | null;
  image_type: string | null;
};

type ListingRow = {
  id: string;
  seller_id: string | null;
  title: string | null;
  sport: string | null;
  player: string | null;
  player_name: string | null;
  year: string | null;
  brand: string | null;
  card_number: string | null;
  card_type: string | null;
  grader: string | null;
  grade: string | null;
  condition: string | null;
  price: number | null;
  status: string | null;
  created_at: string | null;
  homepage_featured: boolean | null;
  homepage_featured_order: number | null;
  homepage_featured_at: string | null;
  homepage_featured_until: string | null;
  listing_images: ListingImageRow[] | null;
};

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

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
};

type HomepageUpdatePayload = {
  action?: "save_banner";
  listingId?: string;
  homepageFeatured?: boolean;
  homepageFeaturedOrder?: number | string | null;
  homepageFeaturedUntil?: string | null;
  banner?: {
    id?: string | null;
    bannerType?: string | null;
    imageUrl?: string | null;
    headline?: string | null;
    supportingText?: string | null;
    primaryButtonLabel?: string | null;
    primaryButtonHref?: string | null;
    isVisible?: boolean;
    startAt?: string | null;
    endAt?: string | null;
  };
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
    console.error("Admin homepage auth error:", error);
  }

  return { user, error: error?.message || null };
}

async function requireAdmin(request: Request) {
  const { user, error: authError } = await getCurrentUser(request);
  const email = user?.email?.toLowerCase() || "";

  if (authError || !user || !adminEmails.includes(email)) {
    return {
      user: null,
      response: NextResponse.json({ error: "Access denied." }, { status: 403 }),
    };
  }

  return { user, response: null };
}

function shortId(value?: string | null) {
  return value ? value.slice(0, 8) : "Unknown";
}

function getProfileName(profile?: ProfileRow, fallbackId?: string | null) {
  return profile?.full_name || profile?.username || shortId(fallbackId);
}

function getListingImage(listing: ListingRow) {
  return (
    listing.listing_images?.find((image) => image.image_type === "front")?.image_url ||
    listing.listing_images?.find((image) => Boolean(image.image_url))?.image_url ||
    null
  );
}

function getListingTitle(listing: ListingRow) {
  const title = listing.title?.trim();

  if (title) {
    return title;
  }

  const subject = listing.player_name?.trim() || listing.player?.trim();
  const generated = [
    listing.year,
    listing.brand,
    subject,
    listing.card_number ? `#${listing.card_number}` : "",
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return generated || "GRAIL Listing";
}

function getConditionDisplay(listing: ListingRow) {
  if (listing.grader && listing.grade) {
    return `${listing.grader} ${listing.grade}`;
  }

  const condition = listing.condition?.trim();

  if (condition) {
    return condition.toLowerCase().includes("raw")
      ? condition
      : `Raw ${condition}`;
  }

  return listing.card_type?.toLowerCase() === "graded" ? "Graded" : "Raw";
}

function parseFeaturedOrder(value: HomepageUpdatePayload["homepageFeaturedOrder"]) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.trunc(parsed);
}

function isMissingCurationColumn(errorMessage: string) {
  return (
    errorMessage.includes("homepage_featured") ||
    errorMessage.includes("homepage_featured_order") ||
    errorMessage.includes("homepage_featured_at") ||
    errorMessage.includes("homepage_featured_until")
  );
}

function isMissingBannerTable(errorMessage: string) {
  return (
    errorMessage.includes("homepage_banners") ||
    errorMessage.includes("schema cache")
  );
}

function cleanText(value: string | null | undefined, maxLength: number) {
  const cleaned = value?.trim() || "";
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

function cleanOptionalUrl(value: string | null | undefined, fieldName: string) {
  const cleaned = value?.trim() || "";

  if (!cleaned) {
    return null;
  }

  const isInternalPath = cleaned.startsWith("/") && !cleaned.startsWith("//");
  const isHttpUrl = /^https?:\/\//i.test(cleaned);

  if (!isInternalPath && !isHttpUrl) {
    throw new Error(`${fieldName} must start with /, https://, or http://.`);
  }

  return cleaned.slice(0, 1000);
}

function cleanOptionalIsoDate(value: string | null | undefined, fieldName: string) {
  const cleaned = value?.trim() || "";

  if (!cleaned) {
    return null;
  }

  const parsed = new Date(cleaned);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} must be a valid date.`);
  }

  return parsed.toISOString();
}

function mapHomepageBanner(row: HomepageBannerRow) {
  return {
    id: row.id,
    bannerType: row.banner_type || "image_banner",
    headline: row.headline || "",
    supportingText: row.supporting_text || "",
    imageUrl: row.image_url || "",
    primaryButtonLabel: row.primary_button_label || "",
    primaryButtonHref: row.primary_button_href || "",
    isVisible: Boolean(row.is_visible),
    startAt: row.start_at,
    endAt: row.end_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getEditableHomepageBanner(serviceSupabase: ReturnType<typeof createServiceSupabaseClient>) {
  const { data, error } = await serviceSupabase
    .from("homepage_banners")
    .select(
      "id, banner_type, headline, supporting_text, image_url, primary_button_label, primary_button_href, is_visible, start_at, end_at, created_at, updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingBannerTable(error.message)) {
      return { banner: null, setupRequired: true, error: null };
    }

    return { banner: null, setupRequired: false, error };
  }

  return {
    banner: data ? mapHomepageBanner(data as HomepageBannerRow) : null,
    setupRequired: false,
    error: null,
  };
}

async function saveHomepageBanner(
  payload: HomepageUpdatePayload,
  userId: string,
) {
  let serviceSupabase;

  try {
    serviceSupabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Admin homepage banner configuration error:", error);
    return NextResponse.json({ error: "Homepage banner is temporarily unavailable." }, { status: 500 });
  }

  const banner = payload.banner;

  if (!banner) {
    return NextResponse.json({ error: "Homepage banner payload is required." }, { status: 400 });
  }

  let imageUrl: string | null;
  let primaryButtonHref: string | null;
  let startAt: string | null;
  let endAt: string | null;

  try {
    imageUrl = cleanOptionalUrl(banner.imageUrl, "Banner image");
    primaryButtonHref = cleanOptionalUrl(banner.primaryButtonHref, "Button destination");
    startAt = cleanOptionalIsoDate(banner.startAt, "Start date");
    endAt = cleanOptionalIsoDate(banner.endAt, "End date");
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid homepage banner." },
      { status: 400 },
    );
  }

  if (startAt && endAt && new Date(endAt).getTime() <= new Date(startAt).getTime()) {
    return NextResponse.json(
      { error: "End date must be after the start date." },
      { status: 400 },
    );
  }

  const headline = cleanText(banner.headline, 120);
  const isVisible = Boolean(banner.isVisible);

  if (isVisible && !headline) {
    return NextResponse.json(
      { error: "A visible homepage banner requires a headline." },
      { status: 400 },
    );
  }

  const bannerPayload = {
    banner_type: cleanText(banner.bannerType, 40) || "image_banner",
    headline: headline || "",
    supporting_text: cleanText(banner.supportingText, 280),
    image_url: imageUrl,
    primary_button_label: cleanText(banner.primaryButtonLabel, 48),
    primary_button_href: primaryButtonHref,
    is_visible: isVisible,
    start_at: startAt,
    end_at: endAt,
    updated_by: userId,
  };
  const existingId = banner.id?.trim();
  const result = existingId
    ? await serviceSupabase
        .from("homepage_banners")
        .update(bannerPayload)
        .eq("id", existingId)
        .select(
          "id, banner_type, headline, supporting_text, image_url, primary_button_label, primary_button_href, is_visible, start_at, end_at, created_at, updated_at",
        )
        .single()
    : await serviceSupabase
        .from("homepage_banners")
        .insert({ ...bannerPayload, created_by: userId })
        .select(
          "id, banner_type, headline, supporting_text, image_url, primary_button_label, primary_button_href, is_visible, start_at, end_at, created_at, updated_at",
        )
        .single();

  if (result.error) {
    console.error("Admin homepage banner save error:", {
      error: result.error,
      errorMessage: result.error.message,
      adminId: userId,
    });

    return NextResponse.json(
      {
        error: isMissingBannerTable(result.error.message)
          ? "Homepage banner table is missing. Run the SQL provided by Codex."
          : "Homepage banner could not be saved.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ banner: mapHomepageBanner(result.data as HomepageBannerRow) });
}

export async function GET(request: Request) {
  let serviceSupabase;

  try {
    serviceSupabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Admin homepage configuration error:", error);
    return NextResponse.json(
      { error: "Homepage curation is temporarily unavailable." },
      { status: 500 },
    );
  }

  const { user, response } = await requireAdmin(request);

  if (response || !user) {
    return response;
  }

  const bannerResult = await getEditableHomepageBanner(serviceSupabase);

  if (bannerResult.error) {
    console.error("Admin homepage banner fetch error:", {
      error: bannerResult.error,
      errorMessage: bannerResult.error.message,
      adminId: user.id,
    });
  }

  const { data: listingData, error: listingError } = await serviceSupabase
    .from("listings")
    .select(
      `
        id,
        seller_id,
        title,
        sport,
        player,
        player_name,
        year,
        brand,
        card_number,
        card_type,
        grader,
        grade,
        condition,
        price,
        status,
        created_at,
        homepage_featured,
        homepage_featured_order,
        homepage_featured_at,
        homepage_featured_until,
        listing_images (
          image_url,
          image_type
        )
      `,
    )
    .eq("status", "active")
    .order("homepage_featured", { ascending: false })
    .order("homepage_featured_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (listingError) {
    console.error("Admin homepage listing fetch error:", {
      error: listingError,
      errorMessage: listingError.message,
      adminId: user.id,
    });

    return NextResponse.json(
      {
        error: isMissingCurationColumn(listingError.message)
          ? "Homepage curation columns are missing. Run the SQL provided by Codex."
          : "Homepage listings could not be loaded.",
      },
      { status: 500 },
    );
  }

  const listings = (listingData || []) as ListingRow[];
  const sellerIds = Array.from(
    new Set(
      listings
        .map((listing) => listing.seller_id)
        .filter((sellerId): sellerId is string => Boolean(sellerId)),
    ),
  );
  const profilesById = new Map<string, ProfileRow>();

  if (sellerIds.length > 0) {
    const { data: profileData, error: profileError } = await serviceSupabase
      .from("profiles")
      .select("id, full_name, username")
      .in("id", sellerIds);

    if (profileError) {
      console.error("Admin homepage profile fetch error:", {
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
    banner: bannerResult.banner,
    bannerSetupRequired: bannerResult.setupRequired,
    listings: listings.map((listing) => {
      const profile = listing.seller_id
        ? profilesById.get(listing.seller_id)
        : undefined;

      return {
        id: listing.id,
        title: getListingTitle(listing),
        sellerId: listing.seller_id,
        sellerName: getProfileName(profile, listing.seller_id),
        price: Number(listing.price || 0),
        sport: listing.sport || "Card",
        condition: getConditionDisplay(listing),
        status: listing.status || "active",
        imageUrl: getListingImage(listing),
        createdAt: listing.created_at,
        homepageFeatured: Boolean(listing.homepage_featured),
        homepageFeaturedOrder: listing.homepage_featured_order,
        homepageFeaturedAt: listing.homepage_featured_at,
        homepageFeaturedUntil: listing.homepage_featured_until,
      };
    }),
  });
}

export async function PATCH(request: Request) {
  const { user, response } = await requireAdmin(request);

  if (response || !user) {
    return response;
  }

  let payload: HomepageUpdatePayload;

  try {
    payload = (await request.json()) as HomepageUpdatePayload;
  } catch {
    return NextResponse.json({ error: "Invalid homepage curation request." }, { status: 400 });
  }

  if (payload.action === "save_banner") {
    return saveHomepageBanner(payload, user.id);
  }

  let serviceSupabase;

  try {
    serviceSupabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Admin homepage update configuration error:", error);
    return NextResponse.json(
      { error: "Homepage curation is temporarily unavailable." },
      { status: 500 },
    );
  }

  const listingId = payload.listingId?.trim();

  if (!listingId) {
    return NextResponse.json({ error: "Listing ID is required." }, { status: 400 });
  }

  const shouldFeature = Boolean(payload.homepageFeatured);
  const featuredOrder = parseFeaturedOrder(payload.homepageFeaturedOrder);
  const featuredUntil = payload.homepageFeaturedUntil?.trim() || null;
  const now = new Date().toISOString();

  const { data: updatedListing, error: updateError } = await serviceSupabase
    .from("listings")
    .update({
      homepage_featured: shouldFeature,
      homepage_featured_order: shouldFeature ? featuredOrder : null,
      homepage_featured_at: shouldFeature ? now : null,
      homepage_featured_until: shouldFeature ? featuredUntil : null,
    })
    .eq("id", listingId)
    .eq("status", "active")
    .select(
      "id, homepage_featured, homepage_featured_order, homepage_featured_at, homepage_featured_until",
    )
    .single();

  if (updateError) {
    console.error("Admin homepage update error:", {
      error: updateError,
      errorMessage: updateError.message,
      listingId,
      adminId: user.id,
    });

    return NextResponse.json(
      {
        error: isMissingCurationColumn(updateError.message)
          ? "Homepage curation columns are missing. Run the SQL provided by Codex."
          : "Homepage featured listing could not be updated.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    listing: {
      id: updatedListing.id,
      homepageFeatured: Boolean(updatedListing.homepage_featured),
      homepageFeaturedOrder: updatedListing.homepage_featured_order,
      homepageFeaturedAt: updatedListing.homepage_featured_at,
      homepageFeaturedUntil: updatedListing.homepage_featured_until,
    },
  });
}
