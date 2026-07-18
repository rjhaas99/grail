export type ProgressionTitle =
  | "SEEKER"
  | "COLLECTOR"
  | "CURATOR"
  | "DEALER"
  | "VETERAN"
  | "ELITE"
  | "ICON"
  | "VAULT"
  | "BLACK LABEL"
  | "GRAIL";

export type XpSource =
  | "buy_card"
  | "sell_card"
  | "list_card"
  | "positive_feedback"
  | "complete_profile"
  | "verify_identity"
  | "refer_user"
  | "win_auction"
  | "quality_listing_photos"
  | "first_sale_bonus"
  | "first_purchase_bonus";

export type AchievementDefinition = {
  key: string;
  title: string;
  description: string;
};

export type ProgressionLevel = {
  level: number;
  title: ProgressionTitle;
  minXp: number;
  tagline: string;
  icon: string;
  border: string;
  accent: string;
  rankStartLevel: number;
  rankEndLevel: number;
  rankLevel: number;
  isRankUnlock: boolean;
};

export type ProgressionRank = {
  title: ProgressionTitle;
  startLevel: number;
  endLevel: number;
  minXp: number;
  tagline: string;
  icon: string;
  border: string;
  accent: string;
};

export type ProgressionSummary = {
  xp: number;
  level: number;
  title: ProgressionTitle;
  tagline: string;
  icon: string;
  border: string;
  accent: string;
  currentLevelXp: number;
  nextLevelXp: number | null;
  progressPercentage: number;
  xpToNext: number;
  rankStartLevel: number;
  rankEndLevel: number;
  rankLevel: number;
  nextRankTitle: ProgressionTitle | null;
  nextRankLevel: number | null;
  nextRankXp: number | null;
  rankProgressPercentage: number;
  xpToNextRank: number;
  achievementsCount: number;
};

export type XpGuideItem = {
  source: XpSource;
  label: string;
  activityLabel: string;
  xp: number;
  status: "live" | "coming_soon";
  rule: string;
};

export type XpActivity = {
  id: string;
  source: string;
  label: string;
  xpAmount: number;
  createdAt: string | null;
  referenceType: string | null;
  referenceId: string | null;
  href: string | null;
};

export const progressionRanks: ProgressionRank[] = [
  {
    title: "SEEKER",
    startLevel: 1,
    endLevel: 5,
    minXp: 0,
    tagline: "Every grail begins with the search.",
    icon: "S",
    border: "rgba(201,205,211,0.34)",
    accent: "#C9CDD3",
  },
  {
    title: "COLLECTOR",
    startLevel: 6,
    endLevel: 10,
    minXp: 250,
    tagline: "The hunt becomes a collection.",
    icon: "C",
    border: "rgba(231,222,208,0.38)",
    accent: "#E7DED0",
  },
  {
    title: "CURATOR",
    startLevel: 11,
    endLevel: 15,
    minXp: 750,
    tagline: "A collection worth showing.",
    icon: "CR",
    border: "rgba(210,214,220,0.42)",
    accent: "#D2D6DC",
  },
  {
    title: "DEALER",
    startLevel: 16,
    endLevel: 20,
    minXp: 1500,
    tagline: "Trusted to move great cards.",
    icon: "D",
    border: "rgba(214,188,117,0.5)",
    accent: "#D6BC75",
  },
  {
    title: "VETERAN",
    startLevel: 21,
    endLevel: 25,
    minXp: 3000,
    tagline: "A respected member of the hobby.",
    icon: "V",
    border: "rgba(235,235,240,0.5)",
    accent: "#EBEBF0",
  },
  {
    title: "ELITE",
    startLevel: 26,
    endLevel: 30,
    minXp: 6000,
    tagline: "Recognized across GRAIL.",
    icon: "E",
    border: "rgba(225,206,156,0.6)",
    accent: "#E1CE9C",
  },
  {
    title: "ICON",
    startLevel: 31,
    endLevel: 35,
    minXp: 10000,
    tagline: "A collector everyone knows.",
    icon: "I",
    border: "rgba(255,255,255,0.62)",
    accent: "#FFFFFF",
  },
  {
    title: "VAULT",
    startLevel: 36,
    endLevel: 40,
    minXp: 17500,
    tagline: "A collection worthy of protection.",
    icon: "VLT",
    border: "rgba(199,202,208,0.72)",
    accent: "#C7CAD0",
  },
  {
    title: "BLACK LABEL",
    startLevel: 41,
    endLevel: 45,
    minXp: 30000,
    tagline: "The highest standard.",
    icon: "BL",
    border: "rgba(244,244,245,0.78)",
    accent: "#F4F4F5",
  },
  {
    title: "GRAIL",
    startLevel: 46,
    endLevel: 50,
    minXp: 50000,
    tagline: "The pinnacle of collecting.",
    icon: "G",
    border: "rgba(231,222,208,0.92)",
    accent: "#E7DED0",
  },
];

function getRankLevelXp(rankIndex: number, rank: ProgressionRank, rankLevel: number) {
  if (rankLevel <= 1) {
    return rank.minXp;
  }

  const nextRank = progressionRanks[rankIndex + 1] || null;
  const previousRank = progressionRanks[rankIndex - 1] || null;
  const rankStep = nextRank
    ? (nextRank.minXp - rank.minXp) / 5
    : previousRank
      ? (rank.minXp - previousRank.minXp) / 5
      : 250;

  return rank.minXp + Math.round(rankStep * (rankLevel - 1));
}

export const progressionLevels: ProgressionLevel[] = progressionRanks.flatMap(
  (rank, rankIndex) =>
    Array.from({ length: rank.endLevel - rank.startLevel + 1 }, (_, index) => ({
      level: rank.startLevel + index,
      title: rank.title,
      minXp: getRankLevelXp(rankIndex, rank, index + 1),
      tagline: rank.tagline,
      icon: rank.icon,
      border: rank.border,
      accent: rank.accent,
      rankStartLevel: rank.startLevel,
      rankEndLevel: rank.endLevel,
      rankLevel: index + 1,
      isRankUnlock: index === 0,
    })),
);

export const xpSources: Record<XpSource, number> = {
  buy_card: 25,
  sell_card: 30,
  list_card: 10,
  positive_feedback: 20,
  complete_profile: 50,
  verify_identity: 75,
  refer_user: 100,
  win_auction: 20,
  quality_listing_photos: 10,
  first_sale_bonus: 100,
  first_purchase_bonus: 100,
};

export const xpGuideItems: XpGuideItem[] = [
  {
    source: "list_card",
    label: "List a card",
    activityLabel: "Listed a card",
    xp: xpSources.list_card,
    status: "live",
    rule: "Awarded once when a new eligible listing or collection card is published.",
  },
  {
    source: "quality_listing_photos",
    label: "Upload listing photos",
    activityLabel: "Uploaded listing photos",
    xp: xpSources.quality_listing_photos,
    status: "live",
    rule: "Awarded once per listing when at least one listing image uploads successfully.",
  },
  {
    source: "buy_card",
    label: "Buy a card",
    activityLabel: "Purchased a card",
    xp: xpSources.buy_card,
    status: "live",
    rule: "Awarded after the order is complete, paid out, not refunded, and not in an active dispute.",
  },
  {
    source: "sell_card",
    label: "Sell a card",
    activityLabel: "Completed a sale",
    xp: xpSources.sell_card,
    status: "live",
    rule: "Awarded after the order is complete, paid out, not refunded, and not in an active dispute.",
  },
  {
    source: "win_auction",
    label: "Win an auction",
    activityLabel: "Won an auction",
    xp: xpSources.win_auction,
    status: "live",
    rule: "Awarded after a winning auction order is complete.",
  },
  {
    source: "positive_feedback",
    label: "Receive positive feedback",
    activityLabel: "Received positive feedback",
    xp: xpSources.positive_feedback,
    status: "coming_soon",
    rule: "Will be awarded after feedback is connected.",
  },
  {
    source: "complete_profile",
    label: "Complete your profile",
    activityLabel: "Completed profile",
    xp: xpSources.complete_profile,
    status: "coming_soon",
    rule: "Will be awarded after profile completion checks are connected.",
  },
  {
    source: "verify_identity",
    label: "Verify your identity",
    activityLabel: "Verified identity",
    xp: xpSources.verify_identity,
    status: "coming_soon",
    rule: "Will be awarded after identity verification is connected.",
  },
  {
    source: "refer_user",
    label: "Refer a new collector",
    activityLabel: "Referred a new collector",
    xp: xpSources.refer_user,
    status: "coming_soon",
    rule: "Will be awarded after referrals are connected.",
  },
  {
    source: "first_purchase_bonus",
    label: "First purchase bonus",
    activityLabel: "First purchase bonus",
    xp: xpSources.first_purchase_bonus,
    status: "live",
    rule: "Awarded once after your first completed, non-refunded purchase.",
  },
  {
    source: "first_sale_bonus",
    label: "First sale bonus",
    activityLabel: "First sale bonus",
    xp: xpSources.first_sale_bonus,
    status: "live",
    rule: "Awarded once after your first completed, non-refunded sale.",
  },
];

export const achievementDefinitions: AchievementDefinition[] = [
  {
    key: "first_sale",
    title: "First Sale",
    description: "Completed the first sale on GRAIL.",
  },
  {
    key: "first_purchase",
    title: "First Purchase",
    description: "Completed the first purchase on GRAIL.",
  },
  {
    key: "first_auction_win",
    title: "First Auction Win",
    description: "Won the first GRAIL auction.",
  },
  {
    key: "100_listings",
    title: "100 Listings",
    description: "Listed 100 cards.",
  },
  {
    key: "100_sales",
    title: "100 Sales",
    description: "Completed 100 sales.",
  },
  {
    key: "100_purchases",
    title: "100 Purchases",
    description: "Completed 100 purchases.",
  },
  {
    key: "1000_sales",
    title: "1000 Sales",
    description: "Completed 1000 sales.",
  },
  {
    key: "perfect_feedback",
    title: "Perfect Feedback",
    description: "Maintained perfect marketplace feedback.",
  },
  {
    key: "top_seller",
    title: "Top Seller",
    description: "Recognized as a leading seller.",
  },
  {
    key: "top_buyer",
    title: "Top Buyer",
    description: "Recognized as a leading buyer.",
  },
  {
    key: "verified_collector",
    title: "Verified Collector",
    description: "Completed collector verification.",
  },
  {
    key: "referral_master",
    title: "Referral Master",
    description: "Referred new collectors to GRAIL.",
  },
];

const basicAchievementBySource: Partial<
  Record<XpSource, Pick<AchievementDefinition, "key" | "title" | "description">>
> = {
  first_sale_bonus: achievementDefinitions[0],
  first_purchase_bonus: achievementDefinitions[1],
  win_auction: achievementDefinitions[2],
  verify_identity: achievementDefinitions[10],
};

export function getAchievementForXpSource(source: XpSource) {
  return basicAchievementBySource[source] || null;
}

export function getXpForSource(source: XpSource) {
  return xpSources[source] || 0;
}

export function getXpSourceDisplay(source: string) {
  if (source === "legacy_baseline") {
    return {
      label: "Existing XP balance",
      activityLabel: "Existing XP balance",
    };
  }

  const item = xpGuideItems.find((guideItem) => guideItem.source === source);

  return {
    label: item?.label || "GRAIL XP",
    activityLabel: item?.activityLabel || "GRAIL XP awarded",
  };
}

export function isXpSource(value: unknown): value is XpSource {
  return typeof value === "string" && value in xpSources;
}

export function calculateProgression(
  rawXp: number | null | undefined,
  achievementsCount = 0,
): ProgressionSummary {
  const xp = Math.max(0, Math.floor(Number(rawXp) || 0));
  const currentLevel =
    [...progressionLevels].reverse().find((level) => xp >= level.minXp) ||
    progressionLevels[0];
  const nextLevel =
    progressionLevels.find((level) => level.level === currentLevel.level + 1) || null;
  const levelSpan = nextLevel ? nextLevel.minXp - currentLevel.minXp : 0;
  const progressInLevel = xp - currentLevel.minXp;
  const progressPercentage = nextLevel
    ? Math.min(100, Math.max(0, Math.round((progressInLevel / levelSpan) * 100)))
    : 100;
  const currentRank = getProgressionRankForLevel(currentLevel.level);
  const nextRank = getNextProgressionRank(currentLevel.level);
  const rankProgressSpan = nextRank ? nextRank.minXp - currentRank.minXp : 0;
  const progressInRank = xp - currentRank.minXp;
  const rankProgressPercentage = nextRank
    ? Math.min(100, Math.max(0, Math.round((progressInRank / rankProgressSpan) * 100)))
    : 100;

  return {
    xp,
    level: currentLevel.level,
    title: currentLevel.title,
    tagline: currentLevel.tagline,
    icon: currentLevel.icon,
    border: currentLevel.border,
    accent: currentLevel.accent,
    currentLevelXp: currentLevel.minXp,
    nextLevelXp: nextLevel?.minXp ?? null,
    progressPercentage,
    xpToNext: nextLevel ? Math.max(0, nextLevel.minXp - xp) : 0,
    rankStartLevel: currentLevel.rankStartLevel,
    rankEndLevel: currentLevel.rankEndLevel,
    rankLevel: currentLevel.rankLevel,
    nextRankTitle: nextRank?.title ?? null,
    nextRankLevel: nextRank?.startLevel ?? null,
    nextRankXp: nextRank?.minXp ?? null,
    rankProgressPercentage,
    xpToNextRank: nextRank ? Math.max(0, nextRank.minXp - xp) : 0,
    achievementsCount,
  };
}

export function getNextProgressionLevel(level: number) {
  return progressionLevels.find((item) => item.level === level + 1) || null;
}

export function getProgressionRankForLevel(level: number) {
  const safeLevel = Math.max(1, Math.min(50, Math.floor(Number(level) || 1)));

  return (
    progressionRanks.find(
      (rank) => safeLevel >= rank.startLevel && safeLevel <= rank.endLevel,
    ) || progressionRanks[0]
  );
}

export function getNextProgressionRank(level: number) {
  const currentRank = getProgressionRankForLevel(level);

  return (
    progressionRanks.find((rank) => rank.startLevel > currentRank.startLevel) || null
  );
}
