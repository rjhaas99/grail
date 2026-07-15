export const testingOneMinuteAuctionDuration = "testing_1_minute";

export type AuctionDurationOption =
  | typeof testingOneMinuteAuctionDuration
  | "1"
  | "3"
  | "5"
  | "7";

type ResolvedAuctionDuration = {
  option: AuctionDurationOption;
  label: string;
  durationMs: number;
  storageDays: 1 | 3 | 5 | 7;
  isTestingOnly: boolean;
};

const minuteMs = 60 * 1000;
const dayMs = 24 * 60 * 60 * 1000;

const auctionDurationOptions: Record<AuctionDurationOption, ResolvedAuctionDuration> = {
  [testingOneMinuteAuctionDuration]: {
    option: testingOneMinuteAuctionDuration,
    label: "1 minute (testing only)",
    durationMs: minuteMs,
    storageDays: 1,
    isTestingOnly: true,
  },
  "1": {
    option: "1",
    label: "1 day",
    durationMs: dayMs,
    storageDays: 1,
    isTestingOnly: false,
  },
  "3": {
    option: "3",
    label: "3 days",
    durationMs: 3 * dayMs,
    storageDays: 3,
    isTestingOnly: false,
  },
  "5": {
    option: "5",
    label: "5 days",
    durationMs: 5 * dayMs,
    storageDays: 5,
    isTestingOnly: false,
  },
  "7": {
    option: "7",
    label: "7 days",
    durationMs: 7 * dayMs,
    storageDays: 7,
    isTestingOnly: false,
  },
};

export const auctionDurationSelectOptions = Object.values(auctionDurationOptions);

export function resolveAuctionDurationOption(
  value: string | number | null | undefined,
) {
  if (value === testingOneMinuteAuctionDuration) {
    return auctionDurationOptions[testingOneMinuteAuctionDuration];
  }

  const normalizedValue = String(value ?? "7");

  if (
    normalizedValue === "1" ||
    normalizedValue === "3" ||
    normalizedValue === "5" ||
    normalizedValue === "7"
  ) {
    return auctionDurationOptions[normalizedValue];
  }

  return null;
}

export function isValidAuctionDuration(value: string | number | null | undefined) {
  return resolveAuctionDurationOption(value) !== null;
}

export function normalizeAuctionDurationOption(
  value: string | number | null | undefined,
) {
  return resolveAuctionDurationOption(value) || auctionDurationOptions["7"];
}

export function getAuctionDurationMs(value: string | number | null | undefined) {
  return normalizeAuctionDurationOption(value).durationMs;
}

export function getAuctionStorageDurationDays(
  value: string | number | null | undefined,
) {
  return normalizeAuctionDurationOption(value).storageDays;
}

export function getAuctionEndsAt(
  startsAt: Date,
  value: string | number | null | undefined,
) {
  return new Date(startsAt.getTime() + getAuctionDurationMs(value));
}
