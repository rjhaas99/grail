export type GrailPassMembershipType =
  | "none"
  | "monthly"
  | "annual"
  | "founder"
  | "future";

export type GrailPassMembershipStatus =
  | "none"
  | "active"
  | "trialing"
  | "paused"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "expired";

export type GrailPassBenefitCategory =
  | "rewards"
  | "xp"
  | "events"
  | "identity"
  | "convenience"
  | "support"
  | "access";

export type GrailPassBenefit = {
  key: string;
  label: string;
  description: string;
  category: GrailPassBenefitCategory;
  configured: boolean;
};

export type GrailPassPerkKey =
  | "reward_boost"
  | "enhanced_events"
  | "premium_collector_card"
  | "premium_profile_theme"
  | "animated_profile_frame"
  | "seasonal_cosmetics"
  | "collection_themes"
  | "member_layouts"
  | "priority_support"
  | "xp_multiplier"
  | "early_access"
  | "saved_listing_templates"
  | "watchlist_organization";

export type GrailPassPerkAvailability = "preview" | "coming_soon" | "available";

export type GrailPassPerk = {
  key: GrailPassPerkKey;
  label: string;
  description: string;
  category: GrailPassBenefitCategory;
  availability: GrailPassPerkAvailability;
  configured: boolean;
};

export type ResolvedGrailPassPerk = GrailPassPerk & {
  granted: boolean;
  sourceMembershipType: GrailPassMembershipType;
  reason: string;
};

export type GrailPassPerkResolution = {
  membership: GrailPassMembership;
  hasActiveMembership: boolean;
  grantedPerkKeys: GrailPassPerkKey[];
  perks: ResolvedGrailPassPerk[];
};

export type GrailPassMembership = {
  type: GrailPassMembershipType;
  status: GrailPassMembershipStatus;
  displayName: string;
  badgeLabel: string;
  description: string;
  startedAt?: string | null;
  renewsAt?: string | null;
  benefits: GrailPassBenefit[];
};

export type GrailPassCollectorMomentKind =
  | "pass_activated"
  | "membership_anniversary"
  | "season_rewards";

export const grailPassFutureBenefits: GrailPassBenefit[] = [
  {
    key: "reward_boost",
    label: "Reward Boost",
    description: "Additional buyer and seller reward percentages when configured.",
    category: "rewards",
    configured: true,
  },
  {
    key: "xp_multipliers",
    label: "Event XP Multipliers",
    description: "Enhanced XP during selected marketplace events when enabled.",
    category: "xp",
    configured: false,
  },
  {
    key: "enhanced_events",
    label: "Enhanced Events",
    description: "Member event access through the existing Rewards and Collector Moments systems.",
    category: "events",
    configured: false,
  },
  {
    key: "premium_themes",
    label: "Premium Themes",
    description: "Future premium profile theme support.",
    category: "identity",
    configured: false,
  },
  {
    key: "animated_frames",
    label: "Animated Frames",
    description: "Future collector identity frame support.",
    category: "identity",
    configured: false,
  },
  {
    key: "seasonal_cosmetics",
    label: "Seasonal Cosmetics",
    description: "Future seasonal identity cosmetics.",
    category: "identity",
    configured: false,
  },
  {
    key: "member_layouts",
    label: "Member Collection Layouts",
    description: "Future collection presentation options for member identity.",
    category: "identity",
    configured: false,
  },
  {
    key: "priority_support",
    label: "Priority Support",
    description: "Future support queue presentation.",
    category: "support",
    configured: false,
  },
  {
    key: "early_feature_access",
    label: "Early Feature Access",
    description: "Future early-access feature flags.",
    category: "access",
    configured: false,
  },
];

export const grailPassPerkCatalog: Record<GrailPassPerkKey, GrailPassPerk> = {
  reward_boost: {
    key: "reward_boost",
    label: "Reward Boost",
    description: "Additional buyer and seller reward percentages when configured.",
    category: "rewards",
    availability: "available",
    configured: true,
  },
  enhanced_events: {
    key: "enhanced_events",
    label: "Enhanced Events",
    description: "Pass-aware event benefits through the existing Rewards and Collector Moments systems.",
    category: "events",
    availability: "coming_soon",
    configured: false,
  },
  premium_collector_card: {
    key: "premium_collector_card",
    label: "Premium Collector Card",
    description: "Future premium Collector Identity presentation.",
    category: "identity",
    availability: "preview",
    configured: false,
  },
  premium_profile_theme: {
    key: "premium_profile_theme",
    label: "Premium Profile Theme",
    description: "Future premium profile theme support.",
    category: "identity",
    availability: "coming_soon",
    configured: false,
  },
  animated_profile_frame: {
    key: "animated_profile_frame",
    label: "Animated Profile Frame",
    description: "Future collector identity frame support.",
    category: "identity",
    availability: "coming_soon",
    configured: false,
  },
  seasonal_cosmetics: {
    key: "seasonal_cosmetics",
    label: "Seasonal Cosmetics",
    description: "Future seasonal identity cosmetics.",
    category: "identity",
    availability: "coming_soon",
    configured: false,
  },
  collection_themes: {
    key: "collection_themes",
    label: "Premium Collection Themes",
    description: "Future collection theme options for member identity.",
    category: "identity",
    availability: "coming_soon",
    configured: false,
  },
  member_layouts: {
    key: "member_layouts",
    label: "Member Collection Layouts",
    description: "Future collection layout options for members.",
    category: "identity",
    availability: "coming_soon",
    configured: false,
  },
  priority_support: {
    key: "priority_support",
    label: "Priority Support",
    description: "Future support queue presentation.",
    category: "support",
    availability: "coming_soon",
    configured: false,
  },
  xp_multiplier: {
    key: "xp_multiplier",
    label: "XP Multiplier",
    description: "Future configurable progression multiplier support.",
    category: "xp",
    availability: "coming_soon",
    configured: false,
  },
  early_access: {
    key: "early_access",
    label: "Early Feature Access",
    description: "Future early-access feature flags.",
    category: "access",
    availability: "coming_soon",
    configured: false,
  },
  saved_listing_templates: {
    key: "saved_listing_templates",
    label: "Saved Listing Templates",
    description: "Future listing convenience tools that do not change marketplace placement.",
    category: "convenience",
    availability: "coming_soon",
    configured: false,
  },
  watchlist_organization: {
    key: "watchlist_organization",
    label: "Expanded Watchlist Organization",
    description: "Future watchlist organization tools for collectors.",
    category: "convenience",
    availability: "coming_soon",
    configured: false,
  },
};

export const grailPassMembershipPerkMap: Record<
  GrailPassMembershipType,
  GrailPassPerkKey[]
> = {
  none: [],
  monthly: [
    "reward_boost",
    "premium_collector_card",
    "premium_profile_theme",
    "priority_support",
    "xp_multiplier",
    "early_access",
  ],
  annual: [
    "reward_boost",
    "premium_collector_card",
    "premium_profile_theme",
    "animated_profile_frame",
    "seasonal_cosmetics",
    "collection_themes",
    "member_layouts",
    "priority_support",
    "xp_multiplier",
    "early_access",
    "saved_listing_templates",
    "watchlist_organization",
  ],
  founder: [
    "reward_boost",
    "premium_collector_card",
    "premium_profile_theme",
    "animated_profile_frame",
    "seasonal_cosmetics",
    "collection_themes",
    "member_layouts",
    "priority_support",
    "xp_multiplier",
    "early_access",
    "saved_listing_templates",
    "watchlist_organization",
  ],
  future: [
    "reward_boost",
    "enhanced_events",
    "premium_collector_card",
    "premium_profile_theme",
    "animated_profile_frame",
    "seasonal_cosmetics",
    "collection_themes",
    "member_layouts",
    "priority_support",
    "xp_multiplier",
    "early_access",
    "saved_listing_templates",
    "watchlist_organization",
  ],
};

export const noGrailPassMembership: GrailPassMembership = {
  type: "none",
  status: "none",
  displayName: "No Membership",
  badgeLabel: "No Pass",
  description: "GRAIL Pass membership is not active.",
  startedAt: null,
  renewsAt: null,
  benefits: grailPassFutureBenefits,
};

export const grailPassMembershipCatalog: Record<
  GrailPassMembershipType,
  Omit<GrailPassMembership, "startedAt" | "renewsAt">
> = {
  none: noGrailPassMembership,
  monthly: {
    type: "monthly",
    status: "active",
    displayName: "Monthly GRAIL Pass",
    badgeLabel: "GRAIL Pass",
    description: "Monthly membership for reward boosts, events, and premium collector identity.",
    benefits: grailPassFutureBenefits,
  },
  annual: {
    type: "annual",
    status: "active",
    displayName: "Annual GRAIL Pass",
    badgeLabel: "GRAIL Pass Annual",
    description: "Annual membership for reward boosts, events, and premium collector identity.",
    benefits: grailPassFutureBenefits,
  },
  founder: {
    type: "founder",
    status: "active",
    displayName: "Founder GRAIL Pass",
    badgeLabel: "Founder Pass",
    description: "Founder membership for premium collector identity and future event recognition.",
    benefits: grailPassFutureBenefits,
  },
  future: {
    type: "future",
    status: "active",
    displayName: "Future GRAIL Pass",
    badgeLabel: "GRAIL Pass",
    description: "Future membership type reserved for configurable GRAIL Economy plans.",
    benefits: grailPassFutureBenefits,
  },
};

export const grailPassCollectorMomentCompatibility: GrailPassCollectorMomentKind[] = [
  "pass_activated",
  "membership_anniversary",
  "season_rewards",
];

export function isGrailPassActive(membership?: GrailPassMembership | null) {
  return membership?.status === "active" || membership?.status === "trialing";
}

export function normalizeGrailPassMembership(
  membership?: Partial<GrailPassMembership> | null,
): GrailPassMembership {
  if (!membership?.type || membership.type === "none") {
    return noGrailPassMembership;
  }

  const catalogMembership =
    grailPassMembershipCatalog[membership.type] || grailPassMembershipCatalog.future;

  return {
    ...catalogMembership,
    ...membership,
    benefits: membership.benefits?.length
      ? membership.benefits
      : catalogMembership.benefits,
  };
}

export function getGrailPassBadgeTone(membership?: GrailPassMembership | null) {
  if (!membership || membership.status === "none") {
    return "none";
  }

  if (membership.status === "active" || membership.status === "trialing") {
    return "active";
  }

  return "inactive";
}

export function getGrailPassPerksForMembershipType(
  membershipType: GrailPassMembershipType,
) {
  return grailPassMembershipPerkMap[membershipType].map(
    (perkKey) => grailPassPerkCatalog[perkKey],
  );
}

export function resolveGrailPassPerks(
  membership?: Partial<GrailPassMembership> | null,
): GrailPassPerkResolution {
  const normalizedMembership = normalizeGrailPassMembership(membership);
  const active = isGrailPassActive(normalizedMembership);
  const mappedPerks = grailPassMembershipPerkMap[normalizedMembership.type] || [];
  const grantedPerkKeys = active
    ? mappedPerks.filter((perkKey) => grailPassPerkCatalog[perkKey]?.configured)
    : [];

  return {
    membership: normalizedMembership,
    hasActiveMembership: active,
    grantedPerkKeys,
    perks: Object.values(grailPassPerkCatalog).map((perk) => {
      const granted = grantedPerkKeys.includes(perk.key);

      return {
        ...perk,
        granted,
        sourceMembershipType: normalizedMembership.type,
        reason: granted
          ? `${normalizedMembership.displayName} includes this perk.`
          : perk.configured
            ? "This perk is not available for the current membership state."
            : "This perk remains disabled until it is implemented.",
      };
    }),
  };
}

export function hasGrailPassPerk(
  resolutionOrMembership:
    | GrailPassPerkResolution
    | Partial<GrailPassMembership>
    | null
    | undefined,
  perkKey: GrailPassPerkKey,
) {
  const resolution =
    resolutionOrMembership &&
    typeof resolutionOrMembership === "object" &&
    "grantedPerkKeys" in resolutionOrMembership
      ? resolutionOrMembership
      : resolveGrailPassPerks(resolutionOrMembership as Partial<GrailPassMembership> | null);

  return resolution.grantedPerkKeys.includes(perkKey);
}

export function getGrailPassGrantedPerks(
  membership?: Partial<GrailPassMembership> | null,
) {
  return resolveGrailPassPerks(membership).perks.filter((perk) => perk.granted);
}
