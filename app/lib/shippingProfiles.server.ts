import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  defaultShippingRateSettings,
  getShippingAmountForProfile,
  getShippingProfile,
  getShippingProfilePublicPayload,
  shippingRateSettingKeys,
  validateShippingProfileForListing,
  type ShippingRateSettings,
} from "./shippingProfiles";

type MarketplaceSettingRow = {
  key: string;
  value: boolean | string | number | null;
};

type ShippingQuoteParams = {
  supabase: SupabaseClient;
  profileId?: string | null;
  listingValue: number;
};

function parseSettingNumber(
  value: boolean | string | number | null | undefined,
  fallback: number,
) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

export async function loadShippingRateSettings(supabase: SupabaseClient) {
  const keys = Object.values(shippingRateSettingKeys);
  const { data, error } = await supabase
    .from("marketplace_settings")
    .select("key, value")
    .in("key", keys);

  if (error) {
    console.warn("Shipping settings lookup failed; using defaults.", {
      error: error.message,
    });
    return defaultShippingRateSettings;
  }

  const settingsByKey = new Map(
    ((data || []) as MarketplaceSettingRow[]).map((setting) => [
      setting.key,
      setting.value,
    ]),
  );

  return {
    pweFlatRate: parseSettingNumber(
      settingsByKey.get(shippingRateSettingKeys.pweFlatRate),
      defaultShippingRateSettings.pweFlatRate,
    ),
    pweMaxListingValue: parseSettingNumber(
      settingsByKey.get(shippingRateSettingKeys.pweMaxListingValue),
      defaultShippingRateSettings.pweMaxListingValue,
    ),
    uspsGroundAdvantageEstimate: parseSettingNumber(
      settingsByKey.get(shippingRateSettingKeys.uspsGroundAdvantageEstimate),
      defaultShippingRateSettings.uspsGroundAdvantageEstimate,
    ),
    uspsPriorityMailEstimate: parseSettingNumber(
      settingsByKey.get(shippingRateSettingKeys.uspsPriorityMailEstimate),
      defaultShippingRateSettings.uspsPriorityMailEstimate,
    ),
  } satisfies ShippingRateSettings;
}

export async function getCheckoutShippingQuote({
  supabase,
  profileId,
  listingValue,
}: ShippingQuoteParams) {
  const settings = await loadShippingRateSettings(supabase);
  const validation = validateShippingProfileForListing({
    profileId,
    listingValue,
    settings,
  });

  if (!validation.valid) {
    return {
      ok: false as const,
      error: validation.error,
      settings,
      profile: validation.profile,
      shippingAmount: 0,
    };
  }

  const profile = getShippingProfile(profileId);

  return {
    ok: true as const,
    error: "",
    settings,
    profile,
    shippingAmount: getShippingAmountForProfile(profile.id, settings),
    publicProfile: getShippingProfilePublicPayload(profile, settings),
  };
}
