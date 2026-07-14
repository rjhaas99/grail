import {
  defaultCollectorMomentConfig,
  type CollectorMoment,
  type CollectorMomentPriority,
} from "./collectorMoments";

export type RewardEventMomentInput = {
  id: string;
  eventType: string;
  referenceType: string | null;
  referenceId: string | null;
  rewardTier: string | null;
  xpAwarded: number;
  walletCreditAwarded: number;
  actualBuyerMultiplier: number;
  actualSellerMultiplier: number;
  walletMultiplierUsed: number;
  seasonalEvent: string | null;
  treasureChestTriggered: boolean;
  challengeTriggered: boolean;
  presentationPriority?: CollectorMomentPriority | null;
  processedAt: string | null;
  createdAt: string | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatMomentName(value?: string | null) {
  if (!value) {
    return "";
  }

  return value
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getRewardEventTitle(eventType: string) {
  const titles: Record<string, string> = {
    LIST_CARD: "Listing Reward",
    UPLOAD_LISTING_PHOTOS: "Photo Upload Reward",
    BUY_COMPLETED: "Purchase Complete",
    SELL_COMPLETED: "Sale Complete",
    AUCTION_WIN: "Auction Won",
    PROFILE_COMPLETED: "Profile Complete",
    IDENTITY_VERIFIED: "Identity Verified",
    REFERRAL_COMPLETED: "Referral Complete",
    LEVEL_UP: "Level Up",
    ADMIN_BONUS: "Admin Bonus",
    PROMOTION: "Promotion",
  };

  return titles[eventType] || "Reward Earned";
}

export function buildRewardCollectorMoment(event: RewardEventMomentInput): CollectorMoment {
  const storyLines = new Set<string>();
  const tierName = formatMomentName(event.rewardTier);
  const seasonalEventName = formatMomentName(event.seasonalEvent);

  if (tierName) {
    storyLines.add(`${tierName} Collector Bonus`);
  }

  if (
    event.walletMultiplierUsed > 1 ||
    event.actualBuyerMultiplier > 1 ||
    event.actualSellerMultiplier > 1
  ) {
    storyLines.add("Marketplace Event Bonus");
  }

  if (seasonalEventName) {
    storyLines.add(`${seasonalEventName} Bonus`);
  }

  if (event.treasureChestTriggered) {
    storyLines.add("Treasure Chest Ready");
  }

  if (event.challengeTriggered) {
    storyLines.add("Challenge Progress");
  }

  return {
    id: `reward:${event.id}`,
    kind: "reward_earned",
    priority: event.presentationPriority || defaultCollectorMomentConfig.defaultRewardPriority,
    eyebrow: "Reward Earned",
    title: getRewardEventTitle(event.eventType),
    primaryText:
      event.walletCreditAwarded > 0
        ? `+${formatCurrency(event.walletCreditAwarded)} GRAIL Credit`
        : undefined,
    secondaryText: event.xpAwarded > 0 ? `+${event.xpAwarded.toLocaleString()} XP` : undefined,
    storyLines: Array.from(storyLines),
    footer: event.walletCreditAwarded > 0 ? "Wallet Updated" : "Reward Updated",
    referenceType: event.referenceType,
    referenceId: event.referenceId,
    occurredAt: event.processedAt || event.createdAt,
  };
}
