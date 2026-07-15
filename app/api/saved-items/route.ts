import { NextResponse } from "next/server";
import {
  createServiceSupabaseClient,
  getCurrentUser,
} from "../auctions/_shared";
import {
  normalizeSavedListingItem,
  type SavedListingRow,
  type SavedSellerProfile,
  type WatchlistRow,
} from "../../lib/savedItems";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const savedListingSelect = `
  id,
  user_id,
  listing_id,
  created_at,
  listing:listings (
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
    is_collection_card,
    is_public_collection,
    estimated_value,
    sportscardspro_estimated_value,
    sale_format,
    auction_status,
    auction_ends_at,
    auction_starting_bid,
    auction_current_bid,
    auction_bid_count,
    auction_reserve_met_at,
    reserve_fee_status,
    listing_images (
      image_url,
      image_type
    )
  )
`;

type SavedItemsPayload = {
  listingId?: string;
  itemType?: string;
};

function getListingFromWatchRow(row: WatchlistRow) {
  if (Array.isArray(row.listing)) {
    return row.listing[0] || null;
  }

  return row.listing || null;
}

function getUniqueRows(rows: WatchlistRow[]) {
  const seen = new Set<string>();
  const uniqueRows: WatchlistRow[] = [];

  rows.forEach((row) => {
    if (!row.listing_id || seen.has(row.listing_id)) {
      return;
    }

    seen.add(row.listing_id);
    uniqueRows.push(row);
  });

  return uniqueRows;
}

async function getProfilesBySellerId(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  sellerIds: string[],
) {
  const profilesById = new Map<string, SavedSellerProfile>();

  if (sellerIds.length === 0) {
    return profilesById;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, username")
    .in("id", sellerIds);

  if (error) {
    console.error("Saved items profile fetch error:", {
      error,
      errorMessage: error.message,
      sellerIds,
    });
    return profilesById;
  }

  ((data || []) as SavedSellerProfile[]).forEach((profile) => {
    profilesById.set(profile.id, profile);
  });

  return profilesById;
}

async function getWatchCountsByListingId(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  listingIds: string[],
) {
  const watchCounts = new Map<string, number>();

  if (listingIds.length === 0) {
    return watchCounts;
  }

  const { data, error } = await supabase
    .from("watchlist")
    .select("listing_id")
    .in("listing_id", listingIds);

  if (error) {
    console.error("Saved items watch count fetch error:", {
      error,
      errorMessage: error.message,
      listingIds,
    });
    return watchCounts;
  }

  ((data || []) as Pick<WatchlistRow, "listing_id">[]).forEach((row) => {
    if (!row.listing_id) {
      return;
    }

    watchCounts.set(row.listing_id, (watchCounts.get(row.listing_id) || 0) + 1);
  });

  return watchCounts;
}

async function normalizeRows(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  rows: WatchlistRow[],
  currentUserId: string,
) {
  const uniqueRows = getUniqueRows(rows);
  const listings = uniqueRows
    .map(getListingFromWatchRow)
    .filter((listing): listing is SavedListingRow => Boolean(listing));
  const sellerIds = Array.from(
    new Set(
      listings
        .map((listing) => listing.seller_id)
        .filter((sellerId): sellerId is string => Boolean(sellerId)),
    ),
  );
  const listingIds = listings.map((listing) => listing.id);
  const profilesById = await getProfilesBySellerId(supabase, sellerIds);
  const watchCounts = await getWatchCountsByListingId(supabase, listingIds);
  const nowMs = Date.now();

  return uniqueRows
    .map((row) => {
      const listing = getListingFromWatchRow(row);
      const profile = listing?.seller_id
        ? profilesById.get(listing.seller_id)
        : undefined;

      return normalizeSavedListingItem({
        row,
        profile,
        watchCount: watchCounts.get(row.listing_id) || 1,
        currentUserId,
        nowMs,
      });
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

async function getSavedRowsForUser(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  userId: string,
  listingId?: string,
) {
  let query = supabase
    .from("watchlist")
    .select(savedListingSelect)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (listingId) {
    query = query.eq("listing_id", listingId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data || []) as WatchlistRow[];
}

async function dedupeWatchlistRows(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  userId: string,
  listingId: string,
) {
  const { data, error } = await supabase
    .from("watchlist")
    .select("id, user_id, listing_id, created_at")
    .eq("user_id", userId)
    .eq("listing_id", listingId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  const rows = (data || []) as WatchlistRow[];
  const keeper = rows[0] || null;
  const duplicateIds = rows.slice(1).map((row) => row.id);

  if (duplicateIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("watchlist")
      .delete()
      .in("id", duplicateIds)
      .eq("user_id", userId);

    if (deleteError) {
      throw deleteError;
    }
  }

  return keeper;
}

async function getListingById(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  listingId: string,
) {
  const { data, error } = await supabase
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
        is_collection_card,
        is_public_collection,
        estimated_value,
        sportscardspro_estimated_value,
        sale_format,
        auction_status,
        auction_ends_at,
        auction_starting_bid,
        auction_current_bid,
        auction_bid_count,
        auction_reserve_met_at,
        reserve_fee_status,
        listing_images (
          image_url,
          image_type
        )
      `,
    )
    .eq("id", listingId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as SavedListingRow | null;
}

export async function GET(request: Request) {
  const { user, error: authError } = await getCurrentUser(request);

  if (authError || !user?.id) {
    return NextResponse.json({ error: "Sign in to view saved items." }, { status: 401 });
  }

  const url = new URL(request.url);
  const listingId = url.searchParams.get("listingId")?.trim() || "";
  const itemType = url.searchParams.get("itemType")?.trim() || "listing";

  if (itemType !== "listing") {
    return NextResponse.json({ error: "Only listing saved items are supported." }, { status: 400 });
  }

  try {
    const supabase = createServiceSupabaseClient();
    const rows = await getSavedRowsForUser(supabase, user.id, listingId || undefined);
    const items = await normalizeRows(supabase, rows, user.id);

    return NextResponse.json({
      itemType: "listing",
      saved: listingId ? items.length > 0 : undefined,
      item: listingId ? items[0] || null : undefined,
      items,
    });
  } catch (error) {
    console.error("Saved items fetch error:", {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      userId: user.id,
      listingId,
    });
    return NextResponse.json({ error: "Saved items could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { user, error: authError } = await getCurrentUser(request);

  if (authError || !user?.id) {
    return NextResponse.json({ error: "Sign in to save items." }, { status: 401 });
  }

  let payload: SavedItemsPayload;

  try {
    payload = (await request.json()) as SavedItemsPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const listingId = payload.listingId?.trim();
  const itemType = payload.itemType?.trim() || "listing";

  if (itemType !== "listing") {
    return NextResponse.json({ error: "Only listings can be saved right now." }, { status: 400 });
  }

  if (!listingId) {
    return NextResponse.json({ error: "listingId is required." }, { status: 400 });
  }

  try {
    const supabase = createServiceSupabaseClient();
    const listing = await getListingById(supabase, listingId);
    const listingStatus = listing?.status?.toLowerCase() || "";

    if (!listing || listingStatus === "deleted" || listingStatus === "inactive") {
      return NextResponse.json({ error: "This listing cannot be saved." }, { status: 404 });
    }

    const existingRows = await getSavedRowsForUser(supabase, user.id, listingId);

    if (existingRows.length === 0) {
      const { error: insertError } = await supabase
        .from("watchlist")
        .insert({
          user_id: user.id,
          listing_id: listingId,
        });

      if (insertError) {
        throw insertError;
      }
    }

    await dedupeWatchlistRows(supabase, user.id, listingId);

    const rows = await getSavedRowsForUser(supabase, user.id, listingId);
    const items = await normalizeRows(supabase, rows, user.id);

    return NextResponse.json({
      saved: true,
      item: items[0] || null,
    });
  } catch (error) {
    console.error("Saved item create error:", {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      userId: user.id,
      listingId,
    });
    return NextResponse.json({ error: "Item could not be saved." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { user, error: authError } = await getCurrentUser(request);

  if (authError || !user?.id) {
    return NextResponse.json({ error: "Sign in to remove saved items." }, { status: 401 });
  }

  const url = new URL(request.url);
  let listingId = url.searchParams.get("listingId")?.trim() || "";

  if (!listingId) {
    const payload = await request.json().catch(() => null) as SavedItemsPayload | null;
    listingId = payload?.listingId?.trim() || "";
  }

  if (!listingId) {
    return NextResponse.json({ error: "listingId is required." }, { status: 400 });
  }

  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from("watchlist")
      .delete()
      .eq("user_id", user.id)
      .eq("listing_id", listingId)
      .select("id");

    if (error) {
      throw error;
    }

    return NextResponse.json({
      saved: false,
      removed: (data || []).length,
    });
  } catch (error) {
    console.error("Saved item delete error:", {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      userId: user.id,
      listingId,
    });
    return NextResponse.json({ error: "Saved item could not be removed." }, { status: 500 });
  }
}
