import { NextResponse } from "next/server";
import {
  createServiceSupabaseClient,
  getCurrentUser,
} from "../auctions/_shared";
import {
  type CollectionFollowRow,
  normalizeSavedListingItem,
  type SavedCollectionItem,
  type SavedListingRow,
  type SavedSellerProfile,
  type WatchlistRow,
} from "../../lib/savedItems";
import { getPublicCollectorHref } from "../../lib/publicCollectorLinks";
import { getWatchCountsByListingId } from "../../lib/watchCounts";

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
  collectionOwnerId?: string;
  itemType?: string;
};

type CollectionListingSummaryRow = {
  seller_id: string | null;
  price: number | null;
  estimated_value?: number | null;
  sportscardspro_estimated_value?: number | null;
  status: string | null;
  created_at: string | null;
  is_collection_card?: boolean | null;
  is_public_collection?: boolean | null;
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

function getCollectionRoute(profile: SavedSellerProfile | undefined, ownerId: string) {
  return getPublicCollectorHref(profile, ownerId);
}

function getCollectionTitle(profile: SavedSellerProfile | undefined) {
  const name = profile?.full_name || profile?.username || "GRAIL Collector";

  return `${name} Collection`;
}

async function getProfilesByOwnerId(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  ownerIds: string[],
) {
  const profilesById = new Map<string, SavedSellerProfile>();

  if (ownerIds.length === 0) {
    return profilesById;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, username")
    .in("id", ownerIds);

  if (error) {
    console.error("Saved collection profile fetch error:", {
      error,
      errorMessage: error.message,
      ownerIds,
    });
    return profilesById;
  }

  ((data || []) as SavedSellerProfile[]).forEach((profile) => {
    profilesById.set(profile.id, profile);
  });

  return profilesById;
}

async function getCollectionListingSummaries(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  ownerIds: string[],
) {
  const summariesByOwnerId = new Map<
    string,
    {
      cardCount: number;
      collectionValue: number;
      latestAddedAt: string | null;
    }
  >();

  if (ownerIds.length === 0) {
    return summariesByOwnerId;
  }

  const { data, error } = await supabase
    .from("listings")
    .select(
      `
        seller_id,
        price,
        estimated_value,
        sportscardspro_estimated_value,
        status,
        created_at,
        is_collection_card,
        is_public_collection
      `,
    )
    .in("seller_id", ownerIds)
    .or("status.eq.active,status.eq.collection,is_collection_card.eq.true,is_public_collection.eq.true");

  if (error) {
    console.error("Saved collection listing summary fetch error:", {
      error,
      errorMessage: error.message,
      ownerIds,
    });
    return summariesByOwnerId;
  }

  ((data || []) as CollectionListingSummaryRow[]).forEach((listing) => {
    const ownerId = listing.seller_id;

    if (!ownerId) {
      return;
    }

    const status = listing.status?.toLowerCase() || "";
    const isUnavailable = ["deleted", "inactive", "sold"].includes(status);

    if (isUnavailable) {
      return;
    }

    const currentSummary = summariesByOwnerId.get(ownerId) || {
      cardCount: 0,
      collectionValue: 0,
      latestAddedAt: null,
    };
    const listingValue =
      Number(listing.sportscardspro_estimated_value || 0) ||
      Number(listing.estimated_value || 0) ||
      Number(listing.price || 0);
    const latestAddedAt =
      listing.created_at &&
      (!currentSummary.latestAddedAt ||
        new Date(listing.created_at).getTime() >
          new Date(currentSummary.latestAddedAt).getTime())
        ? listing.created_at
        : currentSummary.latestAddedAt;

    summariesByOwnerId.set(ownerId, {
      cardCount: currentSummary.cardCount + 1,
      collectionValue: currentSummary.collectionValue + listingValue,
      latestAddedAt,
    });
  });

  return summariesByOwnerId;
}

async function getCollectionRowsForUser(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  userId: string,
  collectionOwnerId?: string,
) {
  let query = supabase
    .from("collection_follows")
    .select("id, user_id, collection_owner_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (collectionOwnerId) {
    query = query.eq("collection_owner_id", collectionOwnerId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data || []) as CollectionFollowRow[];
}

async function normalizeCollectionRows(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  rows: CollectionFollowRow[],
) {
  const ownerIds = Array.from(
    new Set(rows.map((row) => row.collection_owner_id).filter(Boolean)),
  );
  const profilesByOwnerId = await getProfilesByOwnerId(supabase, ownerIds);
  const summariesByOwnerId = await getCollectionListingSummaries(supabase, ownerIds);

  return rows
    .map((row): SavedCollectionItem | null => {
      const profile = profilesByOwnerId.get(row.collection_owner_id);

      if (!profile) {
        return null;
      }

      const summary = summariesByOwnerId.get(row.collection_owner_id) || {
        cardCount: 0,
        collectionValue: 0,
        latestAddedAt: null,
      };

      return {
        id: row.id,
        itemType: "collection",
        savedAt: row.created_at,
        collectionOwnerId: row.collection_owner_id,
        collectorName: profile.full_name || profile.username || "GRAIL Collector",
        collectionTitle: getCollectionTitle(profile),
        route: getCollectionRoute(profile, row.collection_owner_id),
        cardCount: summary.cardCount,
        collectionValue: summary.collectionValue,
        latestAddedAt: summary.latestAddedAt,
      };
    })
    .filter((item): item is SavedCollectionItem => Boolean(item));
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
        watchCount: watchCounts.get(row.listing_id) ?? 1,
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
  const collectionOwnerId = url.searchParams.get("collectionOwnerId")?.trim() || "";
  const itemType = url.searchParams.get("itemType")?.trim() || "listing";

  if (itemType !== "listing" && itemType !== "collection") {
    return NextResponse.json({ error: "Unsupported saved item type." }, { status: 400 });
  }

  try {
    const supabase = createServiceSupabaseClient();

    if (itemType === "collection") {
      const rows = await getCollectionRowsForUser(
        supabase,
        user.id,
        collectionOwnerId || undefined,
      );
      const items = await normalizeCollectionRows(supabase, rows);

      return NextResponse.json({
        itemType: "collection",
        saved: collectionOwnerId ? items.length > 0 : undefined,
        item: collectionOwnerId ? items[0] || null : undefined,
        items,
      });
    }

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
      collectionOwnerId,
      itemType,
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
  const collectionOwnerId = payload.collectionOwnerId?.trim();
  const itemType = payload.itemType?.trim() || "listing";

  if (itemType !== "listing" && itemType !== "collection") {
    return NextResponse.json({ error: "Unsupported saved item type." }, { status: 400 });
  }

  if (itemType === "collection") {
    if (!collectionOwnerId) {
      return NextResponse.json({ error: "collectionOwnerId is required." }, { status: 400 });
    }

    if (collectionOwnerId === user.id) {
      return NextResponse.json({ error: "You cannot follow your own collection." }, { status: 400 });
    }

    try {
      const supabase = createServiceSupabaseClient();
      const { data: ownerProfile, error: ownerError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", collectionOwnerId)
        .maybeSingle();

      if (ownerError) {
        throw ownerError;
      }

      if (!ownerProfile) {
        return NextResponse.json({ error: "Collection was not found." }, { status: 404 });
      }

      const existingRows = await getCollectionRowsForUser(
        supabase,
        user.id,
        collectionOwnerId,
      );

      if (existingRows.length === 0) {
        const { error: insertError } = await supabase
          .from("collection_follows")
          .insert({
            user_id: user.id,
            collection_owner_id: collectionOwnerId,
          });

        if (insertError) {
          throw insertError;
        }
      }

      const rows = await getCollectionRowsForUser(supabase, user.id, collectionOwnerId);
      const items = await normalizeCollectionRows(supabase, rows);

      return NextResponse.json({
        saved: true,
        item: items[0] || null,
      });
    } catch (error) {
      console.error("Saved collection create error:", {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        userId: user.id,
        collectionOwnerId,
      });
      return NextResponse.json({ error: "Collection could not be followed." }, { status: 500 });
    }
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
  let collectionOwnerId = url.searchParams.get("collectionOwnerId")?.trim() || "";
  let itemType = url.searchParams.get("itemType")?.trim() || "listing";

  if (!listingId && !collectionOwnerId) {
    const payload = await request.json().catch(() => null) as SavedItemsPayload | null;
    listingId = payload?.listingId?.trim() || "";
    collectionOwnerId = payload?.collectionOwnerId?.trim() || "";
    itemType = payload?.itemType?.trim() || itemType;
  }

  if (itemType === "collection") {
    if (!collectionOwnerId) {
      return NextResponse.json({ error: "collectionOwnerId is required." }, { status: 400 });
    }

    try {
      const supabase = createServiceSupabaseClient();
      const { data, error } = await supabase
        .from("collection_follows")
        .delete()
        .eq("user_id", user.id)
        .eq("collection_owner_id", collectionOwnerId)
        .select("id");

      if (error) {
        throw error;
      }

      return NextResponse.json({
        saved: false,
        removed: (data || []).length,
      });
    } catch (error) {
      console.error("Saved collection delete error:", {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        userId: user.id,
        collectionOwnerId,
      });
      return NextResponse.json({ error: "Collection follow could not be removed." }, { status: 500 });
    }
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
