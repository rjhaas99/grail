export type OrderShippingAddress = {
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

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeOrderShippingAddress(
  value?: Partial<OrderShippingAddress> | Record<string, unknown> | null,
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const address = value as Record<string, unknown>;
  const normalized: OrderShippingAddress = {
    name: readString(address.name),
    street1: readString(address.street1),
    street2: readString(address.street2) || undefined,
    city: readString(address.city),
    state: readString(address.state).toUpperCase(),
    zip: readString(address.zip),
    country: readString(address.country).toUpperCase() || "US",
    phone: readString(address.phone) || undefined,
    email: readString(address.email) || undefined,
  };

  if (
    !normalized.name ||
    !normalized.street1 ||
    !normalized.city ||
    !normalized.state ||
    !normalized.zip ||
    !normalized.country
  ) {
    return null;
  }

  return normalized;
}

export function formatOrderShippingAddress(
  address?: OrderShippingAddress | null,
) {
  if (!address) {
    return [];
  }

  return [
    address.name,
    address.street1,
    address.street2 || "",
    [
      address.city,
      [address.state, address.zip].filter(Boolean).join(" "),
    ].filter(Boolean).join(", "),
    address.country,
    address.phone ? `Phone: ${address.phone}` : "",
  ].filter(Boolean);
}
