import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  cleanShippoAddress,
  cleanShippoParcel,
  createShippoShipment,
  getShippoRateAmount,
  getShippoServiceLabel,
  selectShippoRateByService,
  validateShippoAddress,
  validateShippoParcel,
  type ShippoAddress,
  type ShippoParcel,
} from "./shippo";
import {
  defaultShippingRateSettings,
  getShippingProfile,
  getShippingProfilePublicPayload,
  roundCurrency,
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

const shippoQuoteSettingKeys = {
  fromName: "shipping_quote_from_name",
  fromStreet1: "shipping_quote_from_street1",
  fromStreet2: "shipping_quote_from_street2",
  fromCity: "shipping_quote_from_city",
  fromState: "shipping_quote_from_state",
  fromZip: "shipping_quote_from_zip",
  fromCountry: "shipping_quote_from_country",
  fromPhone: "shipping_quote_from_phone",
  fromEmail: "shipping_quote_from_email",
  toName: "shipping_quote_to_name",
  toStreet1: "shipping_quote_to_street1",
  toStreet2: "shipping_quote_to_street2",
  toCity: "shipping_quote_to_city",
  toState: "shipping_quote_to_state",
  toZip: "shipping_quote_to_zip",
  toCountry: "shipping_quote_to_country",
  toPhone: "shipping_quote_to_phone",
  toEmail: "shipping_quote_to_email",
  parcelLength: "shipping_quote_parcel_length",
  parcelWidth: "shipping_quote_parcel_width",
  parcelHeight: "shipping_quote_parcel_height",
  parcelWeight: "shipping_quote_parcel_weight",
} as const;

const shippoQuoteEnvKeys = {
  fromName: "SHIPPO_QUOTE_FROM_NAME",
  fromStreet1: "SHIPPO_QUOTE_FROM_STREET1",
  fromStreet2: "SHIPPO_QUOTE_FROM_STREET2",
  fromCity: "SHIPPO_QUOTE_FROM_CITY",
  fromState: "SHIPPO_QUOTE_FROM_STATE",
  fromZip: "SHIPPO_QUOTE_FROM_ZIP",
  fromCountry: "SHIPPO_QUOTE_FROM_COUNTRY",
  fromPhone: "SHIPPO_QUOTE_FROM_PHONE",
  fromEmail: "SHIPPO_QUOTE_FROM_EMAIL",
  toName: "SHIPPO_QUOTE_TO_NAME",
  toStreet1: "SHIPPO_QUOTE_TO_STREET1",
  toStreet2: "SHIPPO_QUOTE_TO_STREET2",
  toCity: "SHIPPO_QUOTE_TO_CITY",
  toState: "SHIPPO_QUOTE_TO_STATE",
  toZip: "SHIPPO_QUOTE_TO_ZIP",
  toCountry: "SHIPPO_QUOTE_TO_COUNTRY",
  toPhone: "SHIPPO_QUOTE_TO_PHONE",
  toEmail: "SHIPPO_QUOTE_TO_EMAIL",
  parcelLength: "SHIPPO_QUOTE_PARCEL_LENGTH",
  parcelWidth: "SHIPPO_QUOTE_PARCEL_WIDTH",
  parcelHeight: "SHIPPO_QUOTE_PARCEL_HEIGHT",
  parcelWeight: "SHIPPO_QUOTE_PARCEL_WEIGHT",
} as const satisfies Record<keyof typeof shippoQuoteSettingKeys, string>;

function parseRequiredSettingNumber(
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

function parseSettingString(value: boolean | string | number | null | undefined) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "boolean") {
    return String(value);
  }

  return "";
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
    pweFlatRate: parseRequiredSettingNumber(
      settingsByKey.get(shippingRateSettingKeys.pweFlatRate),
      defaultShippingRateSettings.pweFlatRate,
    ),
    pweMaxListingValue: parseRequiredSettingNumber(
      settingsByKey.get(shippingRateSettingKeys.pweMaxListingValue),
      defaultShippingRateSettings.pweMaxListingValue,
    ),
  } satisfies ShippingRateSettings;
}

async function loadShippoQuoteConfig(supabase: SupabaseClient) {
  const { settingsByKey } = await loadMarketplaceSettings(
    supabase,
    Object.values(shippoQuoteSettingKeys),
  );

  const configuredValue = (key: keyof typeof shippoQuoteSettingKeys) =>
    parseSettingString(settingsByKey.get(shippoQuoteSettingKeys[key])) ||
    process.env[shippoQuoteEnvKeys[key]]?.trim() ||
    "";

  const addressFrom = cleanShippoAddress({
    name: configuredValue("fromName"),
    street1: configuredValue("fromStreet1"),
    street2: configuredValue("fromStreet2"),
    city: configuredValue("fromCity"),
    state: configuredValue("fromState"),
    zip: configuredValue("fromZip"),
    country: configuredValue("fromCountry"),
    phone: configuredValue("fromPhone"),
    email: configuredValue("fromEmail"),
  });
  const addressTo = cleanShippoAddress({
    name: configuredValue("toName"),
    street1: configuredValue("toStreet1"),
    street2: configuredValue("toStreet2"),
    city: configuredValue("toCity"),
    state: configuredValue("toState"),
    zip: configuredValue("toZip"),
    country: configuredValue("toCountry"),
    phone: configuredValue("toPhone"),
    email: configuredValue("toEmail"),
  });
  const parcel = cleanShippoParcel({
    length: configuredValue("parcelLength"),
    width: configuredValue("parcelWidth"),
    height: configuredValue("parcelHeight"),
    weight: configuredValue("parcelWeight"),
  });

  validateShippoAddress(addressFrom as ShippoAddress, "Shipping quote origin");
  validateShippoAddress(addressTo as ShippoAddress, "Shipping quote destination");
  validateShippoParcel(parcel as ShippoParcel);

  return {
    addressFrom: addressFrom as ShippoAddress,
    addressTo: addressTo as ShippoAddress,
    parcel: parcel as ShippoParcel,
  };
}

function buildShippingQuoteMetadata({
  profileId,
  listingValue,
}: {
  profileId: string;
  listingValue: number;
}) {
  return JSON.stringify({
    source: "grail_shipping_quote",
    profileId,
    listingValue: roundCurrency(listingValue),
  });
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

  if (profile.id === "plain_white_envelope") {
    if (!Number.isFinite(settings.pweFlatRate) || settings.pweFlatRate < 0) {
      return {
        ok: false as const,
        error: "Shipping quote is temporarily unavailable.",
        settings,
        profile,
        shippingAmount: 0,
      };
    }

    return {
      ok: true as const,
      error: "",
      settings,
      profile,
      shippingAmount: roundCurrency(settings.pweFlatRate),
      source: "marketplace_config" as const,
      publicProfile: getShippingProfilePublicPayload(profile, settings),
    };
  }

  if (!profile.shippoServiceToken) {
    return {
      ok: false as const,
      error: "Shipping quote is temporarily unavailable.",
      settings,
      profile,
      shippingAmount: 0,
    };
  }

  try {
    const quoteConfig = await loadShippoQuoteConfig(supabase);
    const shipment = await createShippoShipment({
      ...quoteConfig,
      metadata: buildShippingQuoteMetadata({
        profileId: profile.id,
        listingValue,
      }),
    });
    const rate = selectShippoRateByService(
      shipment.rates,
      profile.shippoServiceToken,
    );
    const shippingAmount = roundCurrency(getShippoRateAmount(rate));

    if (!Number.isFinite(shippingAmount) || shippingAmount <= 0) {
      throw new Error("Shippo returned an invalid shipping amount.");
    }

    return {
      ok: true as const,
      error: "",
      settings,
      profile,
      shippingAmount,
      source: "shippo" as const,
      carrier: rate.provider || profile.carrier,
      service: getShippoServiceLabel(rate),
      rateId: rate.object_id,
      publicProfile: getShippingProfilePublicPayload(profile, settings),
    };
  } catch (error) {
    console.error("Shippo shipping quote failed:", {
      profileId: profile.id,
      listingValue,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      ok: false as const,
      error: "Shipping quote is temporarily unavailable.",
      settings,
      profile,
      shippingAmount: 0,
    };
  }
}
