export const oneMinuteAuctionDurationDays = 1 / (24 * 60);

export const validAuctionDurationDays = [
  oneMinuteAuctionDurationDays,
  1,
  3,
  5,
  7,
] as const;

const durationTolerance = 0.000001;

export function resolveAuctionDurationDays(value: string | number | null | undefined) {
  const duration = Number(value);

  if (!Number.isFinite(duration)) {
    return null;
  }

  return (
    validAuctionDurationDays.find(
      (validDuration) => Math.abs(duration - validDuration) < durationTolerance,
    ) || null
  );
}

export function isValidAuctionDuration(value: string | number | null | undefined) {
  return resolveAuctionDurationDays(value) !== null;
}

export function normalizeAuctionDurationDays(
  value: string | number | null | undefined,
  fallback = 7,
) {
  return resolveAuctionDurationDays(value) || fallback;
}

export function getAuctionDurationMs(value: string | number | null | undefined) {
  return Math.round(normalizeAuctionDurationDays(value) * 24 * 60 * 60 * 1000);
}

export function getAuctionEndsAt(
  startsAt: Date,
  value: string | number | null | undefined,
) {
  return new Date(startsAt.getTime() + getAuctionDurationMs(value));
}
