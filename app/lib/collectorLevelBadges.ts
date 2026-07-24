import type { ProgressionTitle } from "./progression";

export type CollectorLevelBadgeKey =
  | "seeker"
  | "collector"
  | "curator"
  | "dealer"
  | "veteran"
  | "elite"
  | "icon"
  | "vault"
  | "black-label"
  | "grail";

export type CollectorLevelBadge = {
  key: CollectorLevelBadgeKey;
  rank: ProgressionTitle;
  levelMin: number;
  levelMax: number;
  levelRange: string;
  description: string;
  accent: string;
  assetBase: string;
  animated: boolean;
};

export const collectorLevelBadges: CollectorLevelBadge[] = [
  {
    key: "seeker",
    rank: "SEEKER",
    levelMin: 1,
    levelMax: 5,
    levelRange: "1–5",
    description: "The journey begins.",
    accent: "#C9CDD3",
    assetBase: "/badges/collector-level/seeker",
    animated: false,
  },
  {
    key: "collector",
    rank: "COLLECTOR",
    levelMin: 6,
    levelMax: 10,
    levelRange: "6–10",
    description: "Building the foundation.",
    accent: "#20A65A",
    assetBase: "/badges/collector-level/collector",
    animated: false,
  },
  {
    key: "curator",
    rank: "CURATOR",
    levelMin: 11,
    levelMax: 15,
    levelRange: "11–15",
    description: "A passion takes shape.",
    accent: "#0A79C9",
    assetBase: "/badges/collector-level/curator",
    animated: false,
  },
  {
    key: "dealer",
    rank: "DEALER",
    levelMin: 16,
    levelMax: 20,
    levelRange: "16–20",
    description: "Trusted in the community.",
    accent: "#7D30C7",
    assetBase: "/badges/collector-level/dealer",
    animated: false,
  },
  {
    key: "veteran",
    rank: "VETERAN",
    levelMin: 21,
    levelMax: 25,
    levelRange: "21–25",
    description: "Experience. Integrity. Respect.",
    accent: "#C5202A",
    assetBase: "/badges/collector-level/veteran",
    animated: false,
  },
  {
    key: "elite",
    rank: "ELITE",
    levelMin: 26,
    levelMax: 30,
    levelRange: "26–30",
    description: "Operating at the highest level.",
    accent: "#08A7B8",
    assetBase: "/badges/collector-level/elite",
    animated: false,
  },
  {
    key: "icon",
    rank: "ICON",
    levelMin: 31,
    levelMax: 35,
    levelRange: "31–35",
    description: "A recognized force.",
    accent: "#C76422",
    assetBase: "/badges/collector-level/icon",
    animated: false,
  },
  {
    key: "vault",
    rank: "VAULT",
    levelMin: 36,
    levelMax: 40,
    levelRange: "36–40",
    description: "Guarding legendary pieces.",
    accent: "#C7A75D",
    assetBase: "/badges/collector-level/vault",
    animated: false,
  },
  {
    key: "black-label",
    rank: "BLACK LABEL",
    levelMin: 41,
    levelMax: 45,
    levelRange: "41–45",
    description: "Excellence without compromise.",
    accent: "#F4F4F5",
    assetBase: "/badges/collector-level/black-label",
    animated: true,
  },
  {
    key: "grail",
    rank: "GRAIL",
    levelMin: 46,
    levelMax: 50,
    levelRange: "46–50",
    description: "The pinnacle of collecting.",
    accent: "#F3C94F",
    assetBase: "/badges/collector-level/grail",
    animated: true,
  },
];

const badgesByKey = new Map(collectorLevelBadges.map((badge) => [badge.key, badge]));
const badgesByRank = new Map(collectorLevelBadges.map((badge) => [badge.rank, badge]));

export function getCollectorLevelBadgeByKey(key?: string | null) {
  if (!key) {
    return null;
  }

  return badgesByKey.get(key.toLowerCase() as CollectorLevelBadgeKey) || null;
}

export function getCollectorLevelBadgeByLevel(level?: number | string | null) {
  const parsedLevel = Math.max(1, Math.min(50, Math.floor(Number(level) || 1)));

  return (
    collectorLevelBadges.find(
      (badge) => parsedLevel >= badge.levelMin && parsedLevel <= badge.levelMax,
    ) || collectorLevelBadges[0]
  );
}

export function getCollectorLevelBadgeByRank(rank?: string | null) {
  const normalized = normalizeCollectorRank(rank);

  return normalized ? badgesByRank.get(normalized) || null : null;
}

export function getCollectorLevelBadge(input?: {
  key?: string | null;
  level?: number | string | null;
  rank?: string | null;
}) {
  return resolveCollectorLevelBadge(input) || collectorLevelBadges[0];
}

export function resolveCollectorLevelBadge(input?: {
  key?: string | null;
  level?: number | string | null;
  rank?: string | null;
}) {
  const parsedLevel = input?.level ?? getCollectorLevelFromText(input?.rank);

  return (
    getCollectorLevelBadgeByKey(input?.key) ||
    (parsedLevel === null || parsedLevel === undefined
      ? null
      : getCollectorLevelBadgeByLevel(parsedLevel)) ||
    getCollectorLevelBadgeByRank(input?.rank)
  );
}

export function getCollectorLevelBadgeAssets(badge: CollectorLevelBadge) {
  return {
    svg: `${badge.assetBase}.svg`,
    png: `${badge.assetBase}.png`,
    png2x: `${badge.assetBase}@2x.png`,
    png3x: `${badge.assetBase}@3x.png`,
  };
}

export function getCollectorLevelBadgeAlt(badge: CollectorLevelBadge) {
  return `${badge.rank} collector level badge. Levels ${badge.levelRange}. ${badge.description}`;
}

export function getCollectorLevelBadgeTooltip(badge: CollectorLevelBadge) {
  return `${badge.rank}\nLevels ${badge.levelRange}\n${badge.description}`;
}

export function normalizeCollectorRank(value?: string | null): ProgressionTitle | null {
  if (!value) {
    return null;
  }

  const normalized = value.toUpperCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();

  if (normalized === "BLACK LABEL") {
    return "BLACK LABEL";
  }

  const direct = collectorLevelBadges.find((badge) => normalized === badge.rank);

  if (direct) {
    return direct.rank;
  }

  const explicit = collectorLevelBadges.find((badge) =>
    new RegExp(
      `^${badge.rank.replace(" ", "\\s+")}(\\s+(COLLECTOR|RANK|TIER|BADGE))?$`,
    ).test(normalized),
  );

  return explicit?.rank || null;
}

export function getCollectorLevelFromText(value?: string | null) {
  const match = value?.match(/\bLevel\s+(\d{1,2})\b/i);

  return match ? Number(match[1]) : null;
}

export function hasCollectorLevelBadge(value?: string | null) {
  return Boolean(
    getCollectorLevelFromText(value) ||
      getCollectorLevelBadgeByRank(value) ||
      getCollectorLevelBadgeByKey(value),
  );
}
