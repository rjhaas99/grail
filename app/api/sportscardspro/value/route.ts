import { NextResponse } from "next/server";
import {
  getNumber,
  getProductName,
  getSportsCardsProToken,
  getSetName,
  isRecord,
  normalizeProductPageUrl,
  publicSportsCardsProUnavailableMessage,
  requireAuthenticatedUser,
  sportsCardsProBaseUrl,
  waitForSportsCardsProSlot,
} from "../shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ValuePayload = {
  sportsCardsProId?: string;
  cardType?: string;
  grader?: string;
  grade?: string;
};

type PriceSelection = {
  field: string;
  label: string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeGrade(value: string) {
  const number = Number(value.replace(/[^0-9.]/g, ""));

  return Number.isFinite(number) ? number : null;
}

function selectPriceField(payload: ValuePayload): PriceSelection | null {
  const cardType = clean(payload.cardType).toLowerCase();
  const grader = clean(payload.grader).toUpperCase();
  const grade = normalizeGrade(clean(payload.grade));

  if (cardType === "raw") {
    return { field: "loose-price", label: "Raw ungraded" };
  }

  if (grade === null) {
    return null;
  }

  if (grade === 10) {
    if (grader === "PSA") {
      return { field: "manual-only-price", label: "PSA 10" };
    }

    if (grader === "BGS") {
      return { field: "bgs-10-price", label: "BGS 10" };
    }

    if (grader === "CGC") {
      return { field: "condition-17-price", label: "CGC 10" };
    }

    if (grader === "SGC") {
      return { field: "condition-18-price", label: "SGC 10" };
    }
  }

  if (grade === 9.5) {
    return { field: "box-only-price", label: "Graded 9.5" };
  }

  if (grade === 9) {
    return { field: "graded-price", label: "Graded 9" };
  }

  if (grade === 8 || grade === 8.5) {
    return { field: "new-price", label: `Graded ${grade}` };
  }

  if (grade === 7 || grade === 7.5) {
    return { field: "cib-price", label: `Graded ${grade}` };
  }

  return null;
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser(request);

  if (auth.response) {
    return auth.response;
  }

  let payload: ValuePayload;

  try {
    payload = (await request.json()) as ValuePayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid SportsCardsPro value request." },
      { status: 400 },
    );
  }

  const sportsCardsProId = clean(payload.sportsCardsProId);

  if (!sportsCardsProId) {
    return NextResponse.json(
      { error: "SportsCardsPro product id is required." },
      { status: 400 },
    );
  }

  const priceSelection = selectPriceField(payload);

  if (!priceSelection) {
    return NextResponse.json({
      sportsCardsProId,
      estimatedValue: null,
      priceFieldUsed: "",
      sourceUrl: sportsCardsProBaseUrl,
      fetchedAt: new Date().toISOString(),
      error: "No SportsCardsPro price mapping is available for this grade.",
    });
  }

  const token = getSportsCardsProToken();

  if (!token) {
    console.error("SportsCardsPro value configuration error:", {
      configured: false,
    });
    return NextResponse.json(
      {
        sportsCardsProId,
        estimatedValue: null,
        priceFieldUsed: "",
        sourceUrl: sportsCardsProBaseUrl,
        fetchedAt: new Date().toISOString(),
        error: publicSportsCardsProUnavailableMessage,
      },
      { status: 200 },
    );
  }

  try {
    await waitForSportsCardsProSlot();

    const url = new URL("/api/product", sportsCardsProBaseUrl);
    url.searchParams.set("t", token);
    url.searchParams.set("id", sportsCardsProId);

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
      console.error("SportsCardsPro value rate limit response:", {
        status: response.status,
        statusText: response.statusText,
        sportsCardsProId,
      });
      return NextResponse.json(
        { error: "SportsCardsPro rate limit reached. Please try again in a moment." },
        { status: 200 },
      );
    }

    if (!response.ok || !isRecord(upstreamPayload)) {
      console.error("SportsCardsPro product API error:", {
        status: response.status,
        statusText: response.statusText,
        sportsCardsProId,
        body:
          typeof upstreamPayload === "string"
            ? upstreamPayload.slice(0, 400)
            : upstreamPayload,
      });
      return NextResponse.json(
        {
          sportsCardsProId,
          estimatedValue: null,
          priceFieldUsed: priceSelection.field,
          sourceUrl: sportsCardsProBaseUrl,
          fetchedAt: new Date().toISOString(),
          error: publicSportsCardsProUnavailableMessage,
        },
        { status: 200 },
      );
    }

    const productName = getProductName(upstreamPayload);
    const setName = getSetName(upstreamPayload);
    const cents = getNumber(upstreamPayload, [priceSelection.field]);
    const estimatedValue = cents && cents > 0 ? Number((cents / 100).toFixed(2)) : null;
    const sourceUrl = normalizeProductPageUrl(upstreamPayload);
    const fetchedAt = new Date().toISOString();

    if (estimatedValue === null) {
      return NextResponse.json({
        sportsCardsProId,
        productName,
        setName,
        estimatedValue: null,
        priceFieldUsed: priceSelection.field,
        sourceUrl,
        fetchedAt,
        error: `SportsCardsPro does not have a ${priceSelection.label} value for this card.`,
      });
    }

    return NextResponse.json({
      sportsCardsProId,
      productName,
      setName,
      estimatedValue,
      priceFieldUsed: priceSelection.field,
      sourceUrl,
      fetchedAt,
    });
  } catch (error) {
    console.error("SportsCardsPro value request error:", {
      sportsCardsProId,
      error,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        sportsCardsProId,
        estimatedValue: null,
        priceFieldUsed: priceSelection.field,
        sourceUrl: sportsCardsProBaseUrl,
        fetchedAt: new Date().toISOString(),
        error: publicSportsCardsProUnavailableMessage,
      },
      { status: 200 },
    );
  }
}
