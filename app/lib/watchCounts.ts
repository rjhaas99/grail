import type { SupabaseClient } from "@supabase/supabase-js";

type WatchlistCountRow = {
  listing_id: string | null;
  user_id: string | null;
};

const watchCountChunkSize = 500;

function normalizeListingIds(listingIds: string[]) {
  return Array.from(
    new Set(
      listingIds
        .map((listingId) => String(listingId || "").trim())
        .filter(Boolean),
    ),
  );
}

export function watchCountsToRecord(counts: Map<string, number>) {
  return Object.fromEntries(counts.entries());
}

export async function getWatchCountsByListingId(
  supabase: SupabaseClient,
  listingIds: string[],
) {
  const normalizedListingIds = normalizeListingIds(listingIds);
  const watchersByListingId = new Map<string, Set<string>>();

  if (normalizedListingIds.length === 0) {
    return new Map<string, number>();
  }

  for (let index = 0; index < normalizedListingIds.length; index += watchCountChunkSize) {
    const listingIdChunk = normalizedListingIds.slice(index, index + watchCountChunkSize);
    const { data, error } = await supabase
      .from("watchlist")
      .select("listing_id, user_id")
      .in("listing_id", listingIdChunk);

    if (error) {
      throw error;
    }

    ((data || []) as WatchlistCountRow[]).forEach((row) => {
      if (!row.listing_id || !row.user_id) {
        return;
      }

      const watchers = watchersByListingId.get(row.listing_id) || new Set<string>();
      watchers.add(row.user_id);
      watchersByListingId.set(row.listing_id, watchers);
    });
  }

  const counts = new Map<string, number>();
  normalizedListingIds.forEach((listingId) => {
    counts.set(listingId, watchersByListingId.get(listingId)?.size || 0);
  });

  return counts;
}

export async function getWatchCountByListingId(
  supabase: SupabaseClient,
  listingId: string,
) {
  const counts = await getWatchCountsByListingId(supabase, [listingId]);

  return counts.get(listingId) || 0;
}
