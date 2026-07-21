import { NextResponse } from "next/server";
import {
  extractProducts,
  getSportsCardsProRuntime,
  getSportsCardsProToken,
  logSportsCardsProDiagnostic,
  normalizeProductCandidate,
  publicSportsCardsProUnavailableMessage,
  redactSportsCardsProUrl,
  requireAuthenticatedUser,
  sportsCardsProBaseUrl,
  sportsCardsProRequestHeaders,
  summarizeSportsCardsProResponse,
  waitForSportsCardsProSlot,
} from "../shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchPayload = {
  title?: string;
  category?: string;
  sport?: string;
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
  const searchParameters = {
    title: clean(payload.title),
    player: clean(payload.player) || clean(payload.character),
    year: clean(payload.year),
    brand: clean(payload.brand),
    set: clean(payload.set),
    cardNumber: clean(payload.cardNumber).replace(/^#/, ""),
    grade: clean(payload.grade),
    grader: clean(payload.grader),
    sport: clean(payload.sport) || clean(payload.category),
    category: clean(payload.category),
    cardType: clean(payload.cardType),
  };

  logSportsCardsProDiagnostic("search.route_entered", {
    runtime: getSportsCardsProRuntime(),
    authenticated: true,
    environmentConfigured: Boolean(getSportsCardsProToken()),
    searchParameters,
    finalOutboundQuery: query,
  });

  if (query.length < 3) {
    return NextResponse.json(
      { error: "Add card details before searching SportsCardsPro." },
      { status: 400 },
    );
  }

  const token = getSportsCardsProToken();

  if (!token) {
    logSportsCardsProDiagnostic("search.unavailable", {
      reason: "missing_sportscardspro_token",
      environmentConfigured: false,
      finalOutboundQuery: query,
    });
    return NextResponse.json(
      { error: publicSportsCardsProUnavailableMessage, candidates: [] },
      { status: 200 },
    );
  }

  try {
    await waitForSportsCardsProSlot();

    const url = new URL("/api/products", sportsCardsProBaseUrl);
    url.searchParams.set("t", token);
    url.searchParams.set("q", query);

    logSportsCardsProDiagnostic("search.outbound_request", {
      finalOutboundQuery: query,
      finalSportsCardsProUrl: redactSportsCardsProUrl(url),
      requestHeaders: sportsCardsProRequestHeaders,
    });

    const response = await fetch(url, {
      headers: sportsCardsProRequestHeaders,
      cache: "no-store",
    });
    const text = await response.text();
    let upstreamPayload: unknown = null;

    try {
      upstreamPayload = text ? JSON.parse(text) : null;
    } catch {
      upstreamPayload = text;
    }

    const products = extractProducts(upstreamPayload);
    const responseSummary = summarizeSportsCardsProResponse(upstreamPayload);

    logSportsCardsProDiagnostic("search.upstream_response", {
      finalOutboundQuery: query,
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get("content-type") || "",
      matchCount: products.length,
      rawResponseSummary: responseSummary,
    });

    if (response.status === 429) {
      logSportsCardsProDiagnostic("search.unavailable", {
        reason: "sportsCardsPro_rate_limited",
        status: response.status,
        statusText: response.statusText,
        finalOutboundQuery: query,
        matchCount: products.length,
        rawResponseSummary: responseSummary,
      });
      return NextResponse.json(
        { error: "SportsCardsPro rate limit reached. Please try again in a moment." },
        { status: 200 },
      );
    }

    if (!response.ok) {
      logSportsCardsProDiagnostic("search.unavailable", {
        reason: "sportsCardsPro_upstream_non_ok",
        status: response.status,
        statusText: response.statusText,
        finalOutboundQuery: query,
        matchCount: products.length,
        rawResponseSummary: responseSummary,
      });
      return NextResponse.json(
        { error: publicSportsCardsProUnavailableMessage, candidates: [] },
        { status: 200 },
      );
    }

    const candidates = products
      .map(normalizeProductCandidate)
      .filter((candidate): candidate is NonNullable<typeof candidate> =>
        Boolean(candidate),
      )
      .slice(0, 20);

    logSportsCardsProDiagnostic("search.completed", {
      reason: candidates.length > 0 ? "matches_returned" : "zero_normalized_matches",
      finalOutboundQuery: query,
      matchCount: products.length,
      candidateCount: candidates.length,
      rawResponseSummary: responseSummary,
    });

    return NextResponse.json({
      query,
      candidates,
    });
  } catch (error) {
    logSportsCardsProDiagnostic("search.unavailable", {
      reason: "sportsCardsPro_fetch_exception",
      finalOutboundQuery: query,
      error,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: publicSportsCardsProUnavailableMessage, candidates: [] },
      { status: 200 },
    );
  }
}
