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

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
};

type HomepageUpdatePayload = {
  listingId?: string;
  homepageFeatured?: boolean;
  homepageFeaturedOrder?: number | string | null;
  homepageFeaturedUntil?: string | null;
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

export async function GET(request: Request) {
  let serviceSupabase;

  try {
    serviceSupabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Admin homepage configuration error:", error);
    return NextResponse.json(
      { error: "Homepage curation is not configured." },
      { status: 500 },
    );
  }

  const { user, response } = await requireAdmin(request);

  if (response || !user) {
    return response;
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
  let serviceSupabase;

  try {
    serviceSupabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Admin homepage update configuration error:", error);
    return NextResponse.json(
      { error: "Homepage curation is not configured." },
      { status: 500 },
    );
  }

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
