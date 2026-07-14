export type CollectorMomentPriority = "minor" | "normal" | "major" | "legendary";

export type CollectorMomentKind =
  | "reward_earned"
  | "level_up"
  | "achievement_unlocked"
  | "auction_won"
  | "first_sale"
  | "first_purchase"
  | "treasure_chest"
  | "marketplace_event"
  | "referral_reward"
  | "collection_milestone"
  | "trust_milestone"
  | "profile_milestone";

export type CollectorMoment = {
  id: string;
  kind: CollectorMomentKind;
  priority: CollectorMomentPriority;
  eyebrow: string;
  title: string;
  primaryText?: string;
  secondaryText?: string;
  storyLines: string[];
  footer: string;
  referenceType?: string | null;
  referenceId?: string | null;
  occurredAt?: string | null;
};

export type CollectorMomentBundle = {
  id: string;
  priority: CollectorMomentPriority;
  eyebrow: string;
  title: string;
  primaryText?: string;
  secondaryText?: string;
  storyLines: string[];
  footer: string;
  moments: CollectorMoment[];
};

export type CollectorMomentConfig = {
  groupingWindowMs: number;
  overlayDurationMs: number;
  defaultRewardPriority: CollectorMomentPriority;
};

export const defaultCollectorMomentConfig: CollectorMomentConfig = {
  groupingWindowMs: 1000,
  overlayDurationMs: 2800,
  defaultRewardPriority: "major",
};

const priorityRank: Record<CollectorMomentPriority, number> = {
  minor: 1,
  normal: 2,
  major: 3,
  legendary: 4,
};

function getMomentTime(moment: CollectorMoment) {
  if (!moment.occurredAt) {
    return 0;
  }

  const parsed = new Date(moment.occurredAt).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function getReferenceKey(moment: CollectorMoment) {
  return moment.referenceType && moment.referenceId
    ? `${moment.referenceType}:${moment.referenceId}`
    : moment.id;
}

function getHighestPriority(moments: CollectorMoment[]) {
  return moments.reduce<CollectorMomentPriority>((highest, moment) => {
    return priorityRank[moment.priority] > priorityRank[highest]
      ? moment.priority
      : highest;
  }, "minor");
}

function uniqueLines(lines: string[]) {
  return Array.from(new Set(lines.filter(Boolean)));
}

export function shouldUseCollectorMomentOverlay(priority: CollectorMomentPriority) {
  return priority === "major" || priority === "legendary";
}

export function bundleCollectorMoments(
  moments: CollectorMoment[],
  config: CollectorMomentConfig = defaultCollectorMomentConfig,
) {
  const groupedByReference = new Map<string, CollectorMoment[]>();

  moments.forEach((moment) => {
    const key = getReferenceKey(moment);
    const group = groupedByReference.get(key) || [];
    group.push(moment);
    groupedByReference.set(key, group);
  });

  const groupedMoments: Array<{ key: string; moments: CollectorMoment[] }> = [];

  groupedByReference.forEach((group, key) => {
    const sorted = [...group].sort((left, right) => getMomentTime(left) - getMomentTime(right));
    let currentGroup: CollectorMoment[] = [];
    let currentGroupStartedAt = 0;

    sorted.forEach((moment) => {
      const occurredAt = getMomentTime(moment);
      const shouldStartNewGroup =
        currentGroup.length > 0 &&
        currentGroupStartedAt > 0 &&
        occurredAt > 0 &&
        occurredAt - currentGroupStartedAt > config.groupingWindowMs;

      if (shouldStartNewGroup) {
        groupedMoments.push({
          key: `${key}:${currentGroupStartedAt || currentGroup[0].id}`,
          moments: currentGroup,
        });
        currentGroup = [];
        currentGroupStartedAt = 0;
      }

      if (currentGroup.length === 0) {
        currentGroupStartedAt = occurredAt;
      }

      currentGroup.push(moment);
    });

    if (currentGroup.length > 0) {
      groupedMoments.push({
        key: `${key}:${currentGroupStartedAt || currentGroup[0].id}`,
        moments: currentGroup,
      });
    }
  });

  return groupedMoments.map<CollectorMomentBundle>(({ key, moments: group }) => {
    const sorted = [...group].sort((left, right) => getMomentTime(left) - getMomentTime(right));
    const primaryMoment = sorted.reduce((best, moment) => {
      return priorityRank[moment.priority] > priorityRank[best.priority] ? moment : best;
    }, sorted[0]);
    const primaryValues = sorted.map((moment) => moment.primaryText).filter(Boolean);
    const secondaryValues = sorted.map((moment) => moment.secondaryText).filter(Boolean);

    return {
      id: `bundle:${key}:${sorted.map((moment) => moment.id).join("|")}`,
      priority: getHighestPriority(sorted),
      eyebrow: sorted.length > 1 ? "Collector Moment" : primaryMoment.eyebrow,
      title: sorted.length > 1 ? primaryMoment.title : sorted[0].title,
      primaryText: primaryValues[0],
      secondaryText: secondaryValues[0],
      storyLines: uniqueLines(sorted.flatMap((moment) => moment.storyLines)),
      footer: sorted.length > 1 ? "Collector Progress Updated" : primaryMoment.footer,
      moments: sorted,
    };
  });
}
