export type ShippingProfileId =
  | "plain_white_envelope"
  | "usps_ground_advantage"
  | "usps_priority_mail";

export type ShippoServiceToken = "usps_ground_advantage" | "usps_priority";

export type ShippingProfileCapabilities = {
  trackingSupported: boolean;
  labelGenerationSupported: boolean;
  insuranceSupported: boolean;
  signatureConfirmationSupported: boolean;
  buyerAcknowledgementRequired: boolean;
};

export type ShippingProfile = {
  id: ShippingProfileId;
  label: string;
  shortLabel: string;
  description: string;
  buyerDescription: string;
  checkoutBullets: readonly string[];
  carrier: string;
  shippoServiceToken?: ShippoServiceToken;
  maxListingValue?: number;
  defaultProfile?: boolean;
  capabilities: ShippingProfileCapabilities;
};

export type ShippingRateSettings = {
  pweFlatRate: number | null;
  pweMaxListingValue: number;
};

export const shippingRateSettingKeys = {
  pweFlatRate: "shipping_pwe_flat_rate",
  pweMaxListingValue: "shipping_pwe_max_listing_value",
} as const satisfies Record<keyof ShippingRateSettings, string>;

export const defaultShippingRateSettings = {
  pweFlatRate: null,
  pweMaxListingValue: 20,
} as const satisfies ShippingRateSettings;

export const defaultShippingProfileId: ShippingProfileId = "usps_ground_advantage";

export const shippingProfiles = [
  {
    id: "plain_white_envelope",
    label: "Plain White Envelope",
    shortLabel: "PWE",
    description: "Lowest shipping cost. Recommended for inexpensive cards.",
    buyerDescription: "No tracking. Lowest shipping cost. Best for inexpensive cards.",
    checkoutBullets: [
      "No tracking",
      "Lowest shipping cost",
      "Best for inexpensive cards",
    ],
    carrier: "USPS",
    maxListingValue: defaultShippingRateSettings.pweMaxListingValue,
    capabilities: {
      trackingSupported: false,
      labelGenerationSupported: false,
      insuranceSupported: false,
      signatureConfirmationSupported: false,
      buyerAcknowledgementRequired: true,
    },
  },
  {
    id: "usps_ground_advantage",
    label: "USPS Ground Advantage",
    shortLabel: "Ground Advantage",
    description: "Tracked. Recommended for most cards.",
    buyerDescription: "Tracked shipping through USPS. Recommended for most cards.",
    checkoutBullets: [
      "Tracking included",
      "Recommended for most cards",
      "Label purchased through Shippo",
    ],
    carrier: "USPS",
    shippoServiceToken: "usps_ground_advantage",
    defaultProfile: true,
    capabilities: {
      trackingSupported: true,
      labelGenerationSupported: true,
      insuranceSupported: false,
      signatureConfirmationSupported: false,
      buyerAcknowledgementRequired: false,
    },
  },
  {
    id: "usps_priority_mail",
    label: "USPS Priority Mail",
    shortLabel: "Priority Mail",
    description: "Tracked. Faster shipping for higher-value cards.",
    buyerDescription: "Tracked, faster USPS shipping for higher-value cards.",
    checkoutBullets: [
      "Tracking included",
      "Faster shipping",
      "Label purchased through Shippo",
    ],
    carrier: "USPS",
    shippoServiceToken: "usps_priority",
    capabilities: {
      trackingSupported: true,
      labelGenerationSupported: true,
      insuranceSupported: false,
      signatureConfirmationSupported: false,
      buyerAcknowledgementRequired: false,
    },
  },
] as const satisfies readonly ShippingProfile[];

const shippingProfilesById = new Map<ShippingProfileId, ShippingProfile>(
  shippingProfiles.map((profile) => [profile.id, profile]),
);

export function getShippingProfile(profileId?: string | null) {
  if (!profileId) {
    return shippingProfilesById.get(defaultShippingProfileId) as ShippingProfile;
  }

  return (
    shippingProfilesById.get(profileId as ShippingProfileId) ||
    (shippingProfilesById.get(defaultShippingProfileId) as ShippingProfile)
  );
}

export function isKnownShippingProfileId(
  profileId?: string | null,
): profileId is ShippingProfileId {
  return Boolean(profileId && shippingProfilesById.has(profileId as ShippingProfileId));
}

export function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export function getListingValueForShipping(value?: number | string | null) {
  const parsed = Number(value || 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

export function isShippingProfileEligibleForValue({
  profileId,
  listingValue,
  settings = defaultShippingRateSettings,
}: {
  profileId?: string | null;
  listingValue: number;
  settings?: ShippingRateSettings;
}) {
  const profile = getShippingProfile(profileId);
  const maxListingValue =
    profile.id === "plain_white_envelope"
      ? settings.pweMaxListingValue
      : profile.maxListingValue;

  return !maxListingValue || listingValue <= maxListingValue;
}

export function validateShippingProfileForListing({
  profileId,
  listingValue,
  settings = defaultShippingRateSettings,
}: {
  profileId?: string | null;
  listingValue: number;
  settings?: ShippingRateSettings;
}) {
  const profile = getShippingProfile(profileId);

  if (!isKnownShippingProfileId(profileId || profile.id)) {
    return {
      valid: false,
      profile,
      error: "Choose a valid shipping method.",
    };
  }

  if (
    !isShippingProfileEligibleForValue({
      profileId: profile.id,
      listingValue,
      settings,
    })
  ) {
    return {
      valid: false,
      profile,
      error: `Plain White Envelope is only available for cards priced at $${settings.pweMaxListingValue.toFixed(0)} or less.`,
    };
  }

  return {
    valid: true,
    profile,
    error: "",
  };
}

export function getEligibleShippingProfiles(
  listingValue: number,
  settings: ShippingRateSettings = defaultShippingRateSettings,
) {
  return shippingProfiles.filter((profile) =>
    isShippingProfileEligibleForValue({
      profileId: profile.id,
      listingValue,
      settings,
    }),
  );
}

export function getShippingProfilePublicPayload(
  profile: ShippingProfile,
  settings: ShippingRateSettings = defaultShippingRateSettings,
) {
  const maxListingValue =
    profile.id === "plain_white_envelope"
      ? settings.pweMaxListingValue
      : profile.maxListingValue || null;

  return {
    id: profile.id,
    label: profile.label,
    shortLabel: profile.shortLabel,
    description: profile.description,
    buyerDescription: profile.buyerDescription,
    checkoutBullets: [...profile.checkoutBullets],
    carrier: profile.carrier,
    maxListingValue,
    capabilities: profile.capabilities,
  };
}
