import { createClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const sportsCardsProBaseUrl = "https://www.sportscardspro.com";
export const publicSportsCardsProUnavailableMessage = "Market value unavailable.";
export const sportsCardsProRequestHeaders = {
  accept: "application/json",
  "user-agent": "GRAIL/1.0 (+https://www.grailcollects.com)",
} satisfies Record<string, string>;

type ApiRecord = Record<string, unknown>;

let nextAllowedRequestAt = 0;
let requestQueue = Promise.resolve();

export type SportsCardsProCandidate = {
  sportsCardsProId: string;
  productName: string;
  setName: string;
};

export type SportsCardsProValue = {
  sportsCardsProId: string;
  productName: string;
  setName: string;
  estimatedValue: number | null;
  priceFieldUsed: string;
  sourceUrl: string;
  fetchedAt: string;
};

export function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

export function getSportsCardsProToken() {
  return (
    process.env.SPORTSCARDPRO_API_TOKEN?.trim() ||
    process.env.SPORTSCARDPRO_API_KEY?.trim() ||
    process.env.SPORTSCARDSPRO_API_TOKEN?.trim() ||
    process.env.SPORTSCARDSPRO_API_KEY?.trim() ||
    process.env.PRICECHARTING_API_TOKEN?.trim() ||
    ""
  );
}

export function getSportsCardsProRuntime() {
  const edgeRuntime = (globalThis as { EdgeRuntime?: unknown }).EdgeRuntime;

  if (typeof edgeRuntime === "string" && edgeRuntime.trim()) {
    return `edge:${edgeRuntime}`;
  }

  return `node:${process.version}`;
}

export function redactSportsCardsProUrl(input: URL | string) {
  try {
    const url = new URL(input.toString());

    if (url.searchParams.has("t")) {
      url.searchParams.set("t", "[redacted]");
    }

    return url.toString();
  } catch {
    return input.toString().replace(/([?&]t=)[^&]+/i, "$1[redacted]");
  }
}

export function summarizeSportsCardsProResponse(payload: unknown) {
  if (payload === null || payload === undefined || payload === "") {
    return { kind: "empty" };
  }

  if (typeof payload === "string") {
    return {
      kind: "text",
      preview: payload.slice(0, 600),
      length: payload.length,
    };
  }

  if (Array.isArray(payload)) {
    return {
      kind: "array",
      itemCount: payload.length,
      firstItem: payload.find(isRecord) || null,
    };
  }

  if (isRecord(payload)) {
    const products = extractProducts(payload);

    return {
      kind: "object",
      keys: Object.keys(payload).slice(0, 20),
      productCount: products.length,
      firstProduct: products[0] || null,
      error:
        getString(payload, ["error", "message", "status", "detail", "details"]) ||
        null,
    };
  }

  return {
    kind: typeof payload,
    preview: String(payload).slice(0, 600),
  };
}

export function logSportsCardsProDiagnostic(
  event: string,
  details: Record<string, unknown>,
) {
  console.info("SportsCardsPro diagnostic:", {
    event,
    ...details,
  });
}

function createAnonSupabaseClient() {
  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      auth: {
        persistSession: false,
      },
    },
  );
}

function getBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") || "";

  return authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
}

export async function requireAuthenticatedUser(request: Request): Promise<
  | { user: User; response?: never }
  | { user?: never; response: NextResponse }
> {
  const token = getBearerToken(request);

  if (!token) {
    return {
      response: NextResponse.json(
        { error: "Sign in to use SportsCardsPro market values." },
        { status: 401 },
      ),
    };
  }

  let supabase;

  try {
    supabase = createAnonSupabaseClient();
  } catch (error) {
    console.error("SportsCardsPro auth configuration error:", {
      error,
      message: error instanceof Error ? error.message : String(error),
    });
    return {
      response: NextResponse.json(
        { error: publicSportsCardsProUnavailableMessage },
        { status: 500 },
      ),
    };
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    console.error("SportsCardsPro auth error:", {
      error,
      errorMessage: error?.message,
    });
    return {
      response: NextResponse.json(
        { error: "Sign in to use SportsCardsPro market values." },
        { status: 401 },
      ),
    };
  }

  return { user };
}

export async function waitForSportsCardsProSlot() {
  const queuedRequest = requestQueue.then(async () => {
    const now = Date.now();
    const waitMs = Math.max(0, nextAllowedRequestAt - now);

    if (waitMs > 0) {
      await new Promise((resolve) => {
        setTimeout(resolve, waitMs);
      });
    }

    nextAllowedRequestAt = Date.now() + 1100;
  });

  requestQueue = queuedRequest.catch(() => undefined);
  await queuedRequest;
}

export function isRecord(value: unknown): value is ApiRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function getString(record: ApiRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return "";
}

export function getNumber(record: ApiRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim()) {
      const number = Number(value);

      if (Number.isFinite(number)) {
        return number;
      }
    }
  }

  return null;
}

export function extractProducts(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }

  if (!isRecord(payload)) {
    return [];
  }

  for (const key of ["products", "items", "results", "data"]) {
    const value = payload[key];

    if (Array.isArray(value)) {
      return value.filter(isRecord);
    }
  }

  return [];
}

export function normalizeProductCandidate(
  product: ApiRecord,
): SportsCardsProCandidate | null {
  const sportsCardsProId = getString(product, [
    "id",
    "product-id",
    "productId",
    "product_id",
  ]);
  const productName = getString(product, [
    "product-name",
    "productName",
    "product_name",
    "name",
    "title",
  ]);
  const setName = getString(product, [
    "set-name",
    "setName",
    "set_name",
    "console-name",
    "consoleName",
    "console_name",
    "series",
  ]);

  if (!sportsCardsProId || !productName) {
    return null;
  }

  return {
    sportsCardsProId,
    productName,
    setName,
  };
}

export function normalizeProductPageUrl(product: ApiRecord) {
  const rawUrl = getString(product, [
    "url",
    "product-url",
    "productUrl",
    "product_url",
    "link",
  ]);

  if (!rawUrl) {
    return sportsCardsProBaseUrl;
  }

  try {
    const url = new URL(rawUrl, sportsCardsProBaseUrl);

    if (url.origin !== sportsCardsProBaseUrl) {
      return sportsCardsProBaseUrl;
    }

    url.search = "";
    url.hash = "";

    return url.toString();
  } catch {
    return sportsCardsProBaseUrl;
  }
}

export function getProductName(product: ApiRecord) {
  return getString(product, [
    "product-name",
    "productName",
    "product_name",
    "name",
    "title",
  ]);
}

export function getSetName(product: ApiRecord) {
  return getString(product, [
    "set-name",
    "setName",
    "set_name",
    "console-name",
    "consoleName",
    "console_name",
    "series",
  ]);
}
