import { NextResponse } from "next/server";
import {
  extractProducts,
  getRequiredEnv,
  normalizeProductCandidate,
  requireAuthenticatedUser,
  sportsCardsProBaseUrl,
  waitForSportsCardsProSlot,
} from "../shared";

export const runtime = "nodejs";

type SearchPayload = {
  category?: string;
  year?: string;
  brand?: string;
  set?: string;
  player?: string;
  character?: string;
  cardNumber?: string;
  cardType?: string;
  grader?: string;
  grade?: string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function buildSearchQuery(payload: SearchPayload) {
  const subject = clean(payload.player) || clean(payload.character);
  const brand = clean(payload.brand) || clean(payload.set);
  const cardNumber = clean(payload.cardNumber);
  const parts = [
    clean(payload.year),
    brand,
    subject,
    cardNumber ? `#${cardNumber.replace(/^#/, "")}` : "",
  ]
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser(request);

  if (auth.response) {
    return auth.response;
  }

  let payload: SearchPayload;

  try {
    payload = (await request.json()) as SearchPayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid SportsCardsPro search request." },
      { status: 400 },
    );
  }

  const query = buildSearchQuery(payload);

  if (query.length < 3) {
    return NextResponse.json(
      { error: "Add card details before searching SportsCardsPro." },
      { status: 400 },
    );
  }

  let token: string;

  try {
    token = getRequiredEnv("SPORTSCARDSPRO_API_TOKEN");
  } catch (error) {
    console.error("SportsCardsPro search configuration error:", {
      error,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "SportsCardsPro lookup is not configured yet." },
      { status: 500 },
    );
  }

  try {
    await waitForSportsCardsProSlot();

    const url = new URL("/api/products", sportsCardsProBaseUrl);
    url.searchParams.set("t", token);
    url.searchParams.set("q", query);

    const response = await fetch(url, {
      headers: {
        accept: "application/json",
      },
      cache: "no-store",
    });
    const text = await response.text();
    let upstreamPayload: unknown = null;

    try {
      upstreamPayload = text ? JSON.parse(text) : null;
    } catch {
      upstreamPayload = text;
    }

    if (response.status === 429) {
      console.error("SportsCardsPro search rate limit response:", {
        status: response.status,
        statusText: response.statusText,
        query,
      });
      return NextResponse.json(
        { error: "SportsCardsPro rate limit reached. Please try again in a moment." },
        { status: 200 },
      );
    }

    if (!response.ok) {
      console.error("SportsCardsPro search API error:", {
        status: response.status,
        statusText: response.statusText,
        query,
        body:
          typeof upstreamPayload === "string"
            ? upstreamPayload.slice(0, 400)
            : upstreamPayload,
      });
      return NextResponse.json(
        { error: "SportsCardsPro search is unavailable right now." },
        { status: 200 },
      );
    }

    const candidates = extractProducts(upstreamPayload)
      .map(normalizeProductCandidate)
      .filter((candidate): candidate is NonNullable<typeof candidate> =>
        Boolean(candidate),
      )
      .slice(0, 20);

    return NextResponse.json({
      query,
      candidates,
    });
  } catch (error) {
    console.error("SportsCardsPro search request error:", {
      query,
      error,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "SportsCardsPro search is unavailable right now." },
      { status: 200 },
    );
  }
}

