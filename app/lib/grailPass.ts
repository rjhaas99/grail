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
  | "canceled";

export type GrailPassBenefitCategory =
  | "wallet"
  | "xp"
  | "marketplace"
  | "identity"
  | "analytics"
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
  | "premium_collector_card"
  | "premium_profile_theme"
  | "animated_profile_frame"
  | "seasonal_cosmetics"
  | "featured_listing_credit"
  | "advanced_collection_analytics"
  | "priority_support"
  | "monthly_credit"
  | "wallet_multiplier"
  | "xp_multiplier"
  | "early_access";

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
  | "monthly_credit_granted"
  | "season_rewards";

export const grailPassFutureBenefits: GrailPassBenefit[] = [
  {
    key: "wallet_multipliers",
    label: "Wallet Multipliers",
    description: "Future configurable GRAIL Credit multiplier support.",
    category: "wallet",
    configured: false,
  },
  {
    key: "xp_multipliers",
    label: "XP Multipliers",
    description: "Future configurable progression multiplier support.",
    category: "xp",
    configured: false,
  },
  {
    key: "monthly_credit",
    label: "Monthly GRAIL Credit",
    description: "Future monthly GRAIL Credit grant support.",
    category: "wallet",
    configured: false,
  },
  {
    key: "featured_listing_credits",
    label: "Featured Listing Credits",
    description: "Future marketplace promotion credits.",
    category: "marketplace",
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
    key: "advanced_analytics",
    label: "Advanced Analytics",
    description: "Future collector and seller analytics.",
    category: "analytics",
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
  featured_listing_credit: {
    key: "featured_listing_credit",
    label: "Featured Listing Credit",
    description: "Future marketplace promotion credit support.",
    category: "marketplace",
    availability: "coming_soon",
    configured: false,
  },
  advanced_collection_analytics: {
    key: "advanced_collection_analytics",
    label: "Advanced Collection Analytics",
    description: "Future collector and seller analytics.",
    category: "analytics",
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
  monthly_credit: {
    key: "monthly_credit",
    label: "Monthly GRAIL Credit",
    description: "Future monthly GRAIL Credit grant support.",
    category: "wallet",
    availability: "coming_soon",
    configured: false,
  },
  wallet_multiplier: {
    key: "wallet_multiplier",
    label: "Wallet Multiplier",
    description: "Future configurable GRAIL Credit multiplier support.",
    category: "wallet",
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
};

export const grailPassMembershipPerkMap: Record<
  GrailPassMembershipType,
  GrailPassPerkKey[]
> = {
  none: [],
  monthly: [
    "premium_collector_card",
    "premium_profile_theme",
    "featured_listing_credit",
    "priority_support",
    "monthly_credit",
    "wallet_multiplier",
    "xp_multiplier",
    "early_access",
  ],
  annual: [
    "premium_collector_card",
    "premium_profile_theme",
    "animated_profile_frame",
    "seasonal_cosmetics",
    "featured_listing_credit",
    "advanced_collection_analytics",
    "priority_support",
    "monthly_credit",
    "wallet_multiplier",
    "xp_multiplier",
    "early_access",
  ],
  founder: [
    "premium_collector_card",
    "premium_profile_theme",
    "animated_profile_frame",
    "seasonal_cosmetics",
    "featured_listing_credit",
    "advanced_collection_analytics",
    "priority_support",
    "monthly_credit",
    "wallet_multiplier",
    "xp_multiplier",
    "early_access",
  ],
  future: [
    "premium_collector_card",
    "premium_profile_theme",
    "animated_profile_frame",
    "seasonal_cosmetics",
    "featured_listing_credit",
    "advanced_collection_analytics",
    "priority_support",
    "monthly_credit",
    "wallet_multiplier",
    "xp_multiplier",
    "early_access",
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
    description: "Monthly membership framework for future premium collector benefits.",
    benefits: grailPassFutureBenefits,
  },
  annual: {
    type: "annual",
    status: "active",
    displayName: "Annual GRAIL Pass",
    badgeLabel: "GRAIL Pass Annual",
    description: "Annual membership framework for future premium collector benefits.",
    benefits: grailPassFutureBenefits,
  },
  founder: {
    type: "founder",
    status: "active",
    displayName: "Founder GRAIL Pass",
    badgeLabel: "Founder Pass",
    description: "Founder membership framework for future premium collector benefits.",
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
  "monthly_credit_granted",
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
  const grantedPerkKeys = active ? mappedPerks : [];

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
          : "This perk is not available for the current membership state.",
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
