import { getConfiguredSiteUrl, trimTrailingSlash } from "./siteConfig";

const SHIPPO_API_BASE_URL = "https://api.goshippo.com";
const SHIPPO_API_VERSION = "2018-02-08";
const USPS_GROUND_ADVANTAGE_TOKEN = "usps_ground_advantage";

export type ShippoAddress = {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
};

export type ShippoParcel = {
  length: string;
  width: string;
  height: string;
  distance_unit: "in";
  weight: string;
  mass_unit: "oz";
};

export type ShippoRate = {
  object_id: string;
  provider?: string | null;
  amount?: string | null;
  currency?: string | null;
  duration_terms?: string | null;
  estimated_days?: number | null;
  servicelevel?: {
    name?: string | null;
    token?: string | null;
    terms?: string | null;
  } | null;
};

export type ShippoShipment = {
  object_id: string;
  status?: string | null;
  rates?: ShippoRate[];
  messages?: Array<{ text?: string | null; message?: string | null; code?: string | null }>;
};

export type ShippoTransaction = {
  object_id: string;
  status?: string | null;
  tracking_number?: string | null;
  tracking_status?: string | null;
  tracking_url_provider?: string | null;
  label_url?: string | null;
  rate?: ShippoRate | null;
  messages?: Array<{ text?: string | null; message?: string | null; code?: string | null }>;
  eta?: string | null;
};

export type ShippoTrackingObject = {
  carrier?: string | null;
  tracking_number?: string | null;
  tracking_status?: {
    status?: string | null;
    status_details?: string | null;
    substatus?: {
      code?: string | null;
      text?: string | null;
    } | null;
    datetime?: string | null;
  } | null;
  eta?: string | null;
  metadata?: string | null;
  transaction?: string | null;
};

export type ShippoWebhook = {
  object_id?: string | null;
  url?: string | null;
  event?: string | null;
  active?: boolean | null;
};

export type ShippoWebhookPayload = {
  event?: string | null;
  data?: ShippoTrackingObject & ShippoTransaction & { metadata?: string | null };
};

export type OrderTrackingStatus = {
  shippingStatus: string;
  fulfillmentStatus: "pending" | "shipped" | "delivered";
};

function getShippoApiKey() {
  const apiKey = process.env.SHIPPO_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("SHIPPO_API_KEY is required.");
  }

  return apiKey;
}

function shippoHeaders() {
  return {
    Authorization: `ShippoToken ${getShippoApiKey()}`,
    "Content-Type": "application/json",
    "SHIPPO-API-VERSION": SHIPPO_API_VERSION,
  };
}

function describeShippoMessages(
  messages?: Array<{ text?: string | null; message?: string | null; code?: string | null }>,
) {
  return messages
    ?.map((item) => item.text || item.message || item.code)
    .filter((item): item is string => Boolean(item))
    .join("; ");
}

async function shippoRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${SHIPPO_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...shippoHeaders(),
      ...(init?.headers || {}),
    },
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) as T & { detail?: string; error?: string } : null;

  if (!response.ok) {
    const message =
      payload?.detail ||
      payload?.error ||
      `Shippo request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return payload as T;
}

export function cleanShippoAddress(address: Partial<ShippoAddress>) {
  return {
    name: String(address.name || "").trim(),
    street1: String(address.street1 || "").trim(),
    street2: String(address.street2 || "").trim() || undefined,
    city: String(address.city || "").trim(),
    state: String(address.state || "").trim().toUpperCase(),
    zip: String(address.zip || "").trim(),
    country: String(address.country || "US").trim().toUpperCase(),
    phone: String(address.phone || "").trim() || undefined,
    email: String(address.email || "").trim() || undefined,
  };
}

export function cleanShippoParcel(parcel: Partial<ShippoParcel>) {
  return {
    length: String(parcel.length || "").trim(),
    width: String(parcel.width || "").trim(),
    height: String(parcel.height || "").trim(),
    distance_unit: "in" as const,
    weight: String(parcel.weight || "").trim(),
    mass_unit: "oz" as const,
  };
}

export function validateShippoAddress(address: ShippoAddress, label: string) {
  const requiredFields: Array<keyof ShippoAddress> = [
    "name",
    "street1",
    "city",
    "state",
    "zip",
    "country",
  ];
  const missingField = requiredFields.find((field) => !address[field]);

  if (missingField) {
    throw new Error(`${label} ${missingField} is required.`);
  }
}

export function validateShippoParcel(parcel: ShippoParcel) {
  const fields: Array<keyof Pick<ShippoParcel, "length" | "width" | "height" | "weight">> = [
    "length",
    "width",
    "height",
    "weight",
  ];
  const invalidField = fields.find((field) => {
    const value = Number(parcel[field]);

    return !Number.isFinite(value) || value <= 0;
  });

  if (invalidField) {
    throw new Error(`Package ${invalidField} must be greater than zero.`);
  }
}

export function buildShippoMetadata(orderId: string) {
  return JSON.stringify({
    source: "grail",
    orderId,
  });
}

export function parseShippoMetadata(metadata?: string | null) {
  if (!metadata) {
    return null;
  }

  try {
    const parsed = JSON.parse(metadata) as { source?: string; orderId?: string };

    if (parsed.source === "grail" && parsed.orderId) {
      return parsed;
    }
  } catch {
    const match = metadata.match(/order(?:Id|_id)?[:=]\s*([a-zA-Z0-9_-]+)/);

    if (match?.[1]) {
      return { source: "grail", orderId: match[1] };
    }
  }

  return null;
}

export async function createShippoShipment({
  addressFrom,
  addressTo,
  parcel,
  metadata,
}: {
  addressFrom: ShippoAddress;
  addressTo: ShippoAddress;
  parcel: ShippoParcel;
  metadata: string;
}) {
  const shipment = await shippoRequest<ShippoShipment>("/shipments/", {
    method: "POST",
    body: JSON.stringify({
      address_from: addressFrom,
      address_to: addressTo,
      parcels: [parcel],
      metadata,
      async: false,
    }),
  });

  if (!shipment.object_id) {
    throw new Error("Shippo shipment did not return an object id.");
  }

  return shipment;
}

export function selectUspsGroundAdvantageRate(rates?: ShippoRate[]) {
  const availableRates = rates || [];
  const exactMatch = availableRates.find((rate) =>
    rate.provider?.toLowerCase() === "usps" &&
    rate.servicelevel?.token === USPS_GROUND_ADVANTAGE_TOKEN,
  );

  if (exactMatch) {
    return exactMatch;
  }

  const nameMatch = availableRates.find((rate) =>
    rate.provider?.toLowerCase() === "usps" &&
    (rate.servicelevel?.name || "").toLowerCase().includes("ground advantage"),
  );

  if (nameMatch) {
    return nameMatch;
  }

  throw new Error("USPS Ground Advantage is not available for this shipment.");
}

export async function purchaseShippoLabel({
  rateObjectId,
  metadata,
}: {
  rateObjectId: string;
  metadata: string;
}) {
  const transaction = await shippoRequest<ShippoTransaction>("/transactions", {
    method: "POST",
    body: JSON.stringify({
      rate: rateObjectId,
      label_file_type: "PDF",
      metadata,
      async: false,
    }),
  });
  const status = (transaction.status || "").toUpperCase();

  if (status !== "SUCCESS") {
    const detail = describeShippoMessages(transaction.messages);
    throw new Error(detail || `Shippo label purchase did not complete. Status: ${status || "unknown"}.`);
  }

  if (!transaction.label_url || !transaction.tracking_number) {
    throw new Error("Shippo label purchase did not return a label URL and tracking number.");
  }

  return transaction;
}

export async function registerShippoTracking({
  carrier,
  trackingNumber,
  metadata,
}: {
  carrier: string;
  trackingNumber: string;
  metadata: string;
}) {
  return shippoRequest<ShippoTrackingObject>("/tracks/", {
    method: "POST",
    body: JSON.stringify({
      carrier,
      tracking_number: trackingNumber,
      metadata,
    }),
  });
}

export function getShippoWebhookUrl(request: Request) {
  const configured = trimTrailingSlash(getConfiguredSiteUrl());

  if (configured && !configured.includes("localhost")) {
    return `${configured}/api/shippo/webhook`;
  }

  const requestUrl = new URL(request.url);

  return `${requestUrl.origin}/api/shippo/webhook`;
}

function normalizeWebhookList(payload: unknown): ShippoWebhook[] {
  if (Array.isArray(payload)) {
    return payload as ShippoWebhook[];
  }

  if (payload && typeof payload === "object" && "results" in payload) {
    const results = (payload as { results?: unknown }).results;

    return Array.isArray(results) ? results as ShippoWebhook[] : [];
  }

  return [];
}

export async function ensureShippoTrackingWebhook(url: string) {
  const currentPayload = await shippoRequest<unknown>("/webhooks", {
    method: "GET",
  });
  const current = normalizeWebhookList(currentPayload);
  const existing = current.find((webhook) =>
    webhook.url === url &&
    webhook.event === "track_updated" &&
    webhook.active !== false,
  );

  if (existing) {
    return existing;
  }

  return shippoRequest<ShippoWebhook>("/webhooks", {
    method: "POST",
    body: JSON.stringify({
      url,
      event: "track_updated",
      active: true,
      is_test: process.env.NODE_ENV !== "production",
    }),
  });
}

export function mapShippoTrackingStatus(
  status?: string | null,
  substatusCode?: string | null,
): OrderTrackingStatus {
  const normalized = (status || "").toUpperCase();
  const substatus = (substatusCode || "").toLowerCase();

  if (normalized === "DELIVERED") {
    return { shippingStatus: "delivered", fulfillmentStatus: "delivered" };
  }

  if (normalized === "RETURNED") {
    return { shippingStatus: "returned", fulfillmentStatus: "shipped" };
  }

  if (normalized === "FAILURE") {
    return { shippingStatus: "delivery_exception", fulfillmentStatus: "shipped" };
  }

  if (normalized === "TRANSIT" && substatus === "out_for_delivery") {
    return { shippingStatus: "out_for_delivery", fulfillmentStatus: "shipped" };
  }

  if (normalized === "TRANSIT") {
    return { shippingStatus: "in_transit", fulfillmentStatus: "shipped" };
  }

  if (normalized === "PRE_TRANSIT") {
    return { shippingStatus: "label_created", fulfillmentStatus: "shipped" };
  }

  return { shippingStatus: "label_created", fulfillmentStatus: "shipped" };
}

export function getShippoRateAmount(rate?: ShippoRate | null) {
  const amount = Number(rate?.amount || 0);

  return Number.isFinite(amount) ? amount : 0;
}

export function getShippoServiceLabel(rate?: ShippoRate | null) {
  return rate?.servicelevel?.name || rate?.servicelevel?.token || "USPS Ground Advantage";
}
