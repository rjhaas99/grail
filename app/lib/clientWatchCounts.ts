type WatchCountsResponse = {
  counts?: Record<string, number>;
  error?: string;
};

function normalizeListingIds(listingIds: string[]) {
  return Array.from(
    new Set(
      listingIds
        .map((listingId) => String(listingId || "").trim())
        .filter(Boolean),
    ),
  );
}

export async function fetchListingWatchCounts(listingIds: string[]) {
  const normalizedListingIds = normalizeListingIds(listingIds);

  if (normalizedListingIds.length === 0) {
    return new Map<string, number>();
  }

  const response = await fetch("/api/listings/watch-counts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ listingIds: normalizedListingIds }),
  });
  const payload = (await response.json().catch(() => null)) as
    | WatchCountsResponse
    | null;

  if (!response.ok) {
    throw new Error(payload?.error || "Watch counts could not be loaded.");
  }

  return new Map(
    Object.entries(payload?.counts || {}).map(([listingId, count]) => [
      listingId,
      Number(count || 0),
    ]),
  );
}
