import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  defaultShippingRateSettings,
  getMarketplaceShippingRateForProfile,
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

function parseRateSettingNumber(
  value: boolean | string | number | null | undefined,
  fallback: number,
) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function parsePositiveSettingNumber(
  value: boolean | string | number | null | undefined,
  fallback: number,
) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function loadMarketplaceSettings(
  supabase: SupabaseClient,
  keys: string[],
) {
  const { data, error } = await supabase
    .from("marketplace_settings")
    .select("key, value")
    .in("key", keys);

  if (error) {
    console.warn("Shipping settings lookup failed.", {
      error: error.message,
    });
    return {
      settingsByKey: new Map<string, boolean | string | number | null>(),
      error,
    };
  }

  return {
    settingsByKey: new Map(
      ((data || []) as MarketplaceSettingRow[]).map((setting) => [
        setting.key,
        setting.value,
      ]),
    ),
    error: null,
  };
}

export async function loadShippingRateSettings(supabase: SupabaseClient) {
  const { settingsByKey, error } = await loadMarketplaceSettings(
    supabase,
    Object.values(shippingRateSettingKeys),
  );

  if (error) {
    console.warn("Shipping rate settings lookup failed; using policy defaults.", {
      error: error.message,
    });
  }

  return {
    pweFlatRate: parseRateSettingNumber(
      settingsByKey.get(shippingRateSettingKeys.pweFlatRate),
      defaultShippingRateSettings.pweFlatRate,
    ),
    groundAdvantageRate: parseRateSettingNumber(
      settingsByKey.get(shippingRateSettingKeys.groundAdvantageRate),
      defaultShippingRateSettings.groundAdvantageRate,
    ),
    priorityMailRate: parseRateSettingNumber(
      settingsByKey.get(shippingRateSettingKeys.priorityMailRate),
      defaultShippingRateSettings.priorityMailRate,
    ),
    pweMaxListingValue: parsePositiveSettingNumber(
      settingsByKey.get(shippingRateSettingKeys.pweMaxListingValue),
      defaultShippingRateSettings.pweMaxListingValue,
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
  const shippingAmount = getMarketplaceShippingRateForProfile(profile.id, settings);

  return {
    ok: true as const,
    error: "",
    settings,
    profile,
    shippingAmount,
    source: "marketplace_config" as const,
    publicProfile: getShippingProfilePublicPayload(profile, settings),
  };
}
