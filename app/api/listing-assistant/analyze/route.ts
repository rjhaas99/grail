import { createClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  createVisionProvider,
  type ListingVisionFieldKey,
  type ListingVisionImage,
  type ListingVisionResult,
} from "../../../lib/visionProvider";
import { getConfiguredSiteUrl } from "../../../lib/siteConfig";

export const runtime = "nodejs";

type AuthResult =
  | { user: User; response?: never }
  | { user?: never; response: NextResponse };

type SportsCardsProCandidate = {
  sportsCardsProId: string;
  productName: string;
  setName: string;
};

type SportsCardsProValue = {
  sportsCardsProId: string;
  productName: string;
  setName: string;
  estimatedValue: number | null;
  priceFieldUsed: string;
  sourceUrl: string;
  fetchedAt: string;
};

type SportsCardsProSearchResponse = {
  candidates?: SportsCardsProCandidate[];
  error?: string;
};

type SportsCardsProValueResponse = Partial<SportsCardsProValue> & {
  error?: string;
};

type PsaVerificationResponse = {
  verified?: boolean;
  certNumber?: string;
  grade?: string;
  cardName?: string;
  verifiedAt?: string;
  error?: string;
};

type ListingAssistantAutofill = {
  title: string;
  category: string;
  sport: string;
  player: string;
  year: string;
  brand: string;
  set: string;
  cardNumber: string;
  team: string;
  manufacturer: string;
  parallel: string;
  rookieStatus: string;
  cardType: "Raw" | "Graded" | "";
  grader: string;
  grade: string;
  certificationNumber: string;
  suggestedAskingPrice: number | null;
  estimatedMarketValue: number | null;
  productName: string;
  setName: string;
  description: string;
};

const maxImageBytes = 8 * 1024 * 1024;

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
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

async function requireAuthenticatedUser(request: Request): Promise<AuthResult> {
  const token = getBearerToken(request);

  if (!token) {
    return {
      response: NextResponse.json(
        { error: "Sign in to use Listing Assistant." },
        { status: 401 },
      ),
    };
  }

  let supabase;

  try {
    supabase = createAnonSupabaseClient();
  } catch (error) {
    console.error("Listing Assistant auth configuration error:", {
      error,
      message: error instanceof Error ? error.message : String(error),
    });
    return {
      response: NextResponse.json(
        { error: "Listing Assistant is temporarily unavailable." },
        { status: 500 },
      ),
    };
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    console.error("Listing Assistant auth error:", {
      error,
      errorMessage: error?.message,
    });
    return {
      response: NextResponse.json(
        { error: "Sign in to use Listing Assistant." },
        { status: 401 },
      ),
    };
  }

  return { user };
}

function hasConfidentValue(
  analysis: ListingVisionResult,
  key: ListingVisionFieldKey,
  minimumConfidence = 0.55,
) {
  const field = analysis.fields[key];

  return field.value && field.confidence >= minimumConfidence;
}

function getFieldValue(
  analysis: ListingVisionResult,
  key: ListingVisionFieldKey,
  minimumConfidence = 0.55,
) {
  return hasConfidentValue(analysis, key, minimumConfidence)
    ? analysis.fields[key].value.trim()
    : "";
}

function normalizeRookieStatus(value: string) {
  const normalized = value.toLowerCase();

  if (!normalized) {
    return "";
  }

  if (normalized === "rc" || normalized.includes("rookie")) {
    return "RC";
  }

  if (normalized.includes("not")) {
    return "";
  }

  return value.trim();
}

function buildPremiumTitle(
  analysis: ListingVisionResult,
  sportsCardsProValue: SportsCardsProValue | null,
  psaVerification: PsaVerificationResponse | null,
) {
  const year = getFieldValue(analysis, "year");
  const setName =
    sportsCardsProValue?.setName ||
    getFieldValue(analysis, "set") ||
    getFieldValue(analysis, "brand");
  const player = getFieldValue(analysis, "player");
  const rookieStatus = normalizeRookieStatus(getFieldValue(analysis, "rookieStatus"));
  const parallel = getFieldValue(analysis, "parallel", 0.72);
  const grader =
    psaVerification?.verified && psaVerification.certNumber
      ? "PSA"
      : getFieldValue(analysis, "grader", 0.72).toUpperCase();
  const grade = psaVerification?.grade || getFieldValue(analysis, "grade", 0.72);
  const suggestedTitle = getFieldValue(analysis, "suggestedTitle", 0.78);
  const fallbackProductName = sportsCardsProValue?.productName || "";
  const parts = [
    year,
    setName,
    player,
    rookieStatus,
    parallel,
    grader && grade ? `${grader} ${grade}` : "",
  ].filter(Boolean);
  const title = parts.join(" ").replace(/\s+/g, " ").trim();

  return title || suggestedTitle || fallbackProductName;
}

function buildSuggestedDescription(
  analysis: ListingVisionResult,
  sportsCardsProValue: SportsCardsProValue | null,
  psaVerification: PsaVerificationResponse | null,
) {
  const aiDescription = getFieldValue(analysis, "suggestedDescription", 0.72);
  const lines = [
    aiDescription || "Officially identified card.",
    psaVerification?.verified ? "PSA certification verified." : "",
    sportsCardsProValue ? "SportsCardsPro market value matched." : "",
    "Real front and back photos included.",
    "Protected checkout through GRAIL.",
  ].filter(Boolean);

  return Array.from(new Set(lines)).join("\n");
}

function buildAutofill(
  analysis: ListingVisionResult,
  sportsCardsProValue: SportsCardsProValue | null,
  psaVerification: PsaVerificationResponse | null,
): ListingAssistantAutofill {
  const grader =
    psaVerification?.verified && psaVerification.certNumber
      ? "PSA"
      : getFieldValue(analysis, "grader", 0.72).toUpperCase();
  const grade = psaVerification?.grade || getFieldValue(analysis, "grade", 0.72);
  const certificationNumber =
    psaVerification?.certNumber ||
    getFieldValue(analysis, "certificationNumber").replace(/[^0-9]/g, "");
  const setName =
    sportsCardsProValue?.setName ||
    getFieldValue(analysis, "set") ||
    getFieldValue(analysis, "brand");
  const estimatedMarketValue = sportsCardsProValue?.estimatedValue ?? null;

  return {
    title: buildPremiumTitle(analysis, sportsCardsProValue, psaVerification),
    category:
      getFieldValue(analysis, "category") ||
      getFieldValue(analysis, "sport") ||
      "Sports",
    sport: getFieldValue(analysis, "sport"),
    player: getFieldValue(analysis, "player"),
    year: getFieldValue(analysis, "year"),
    brand: getFieldValue(analysis, "brand"),
    set: setName,
    cardNumber: getFieldValue(analysis, "cardNumber").replace(/^#/, ""),
    team: getFieldValue(analysis, "team"),
    manufacturer: getFieldValue(analysis, "manufacturer"),
    parallel: getFieldValue(analysis, "parallel", 0.72),
    rookieStatus: normalizeRookieStatus(getFieldValue(analysis, "rookieStatus")),
    cardType: grader || grade || certificationNumber ? "Graded" : "Raw",
    grader,
    grade,
    certificationNumber,
    suggestedAskingPrice: estimatedMarketValue,
    estimatedMarketValue,
    productName: sportsCardsProValue?.productName || "",
    setName: sportsCardsProValue?.setName || "",
    description: buildSuggestedDescription(analysis, sportsCardsProValue, psaVerification),
  };
}

function buildSportsCardsProPayload(analysis: ListingVisionResult) {
  const fields = analysis.fields;
  const grader = fields.grader.value.toUpperCase();
  const grade = fields.grade.value;

  return {
    category: fields.sport.value || "Sports",
    year: fields.year.value,
    brand: fields.set.value || fields.brand.value,
    player: fields.player.value,
    cardNumber: fields.cardNumber.value.replace(/^#/, ""),
    cardType: grader || grade ? "Graded" : "Raw",
    grader,
    grade,
  };
}

function getInternalApiOrigin(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return getConfiguredSiteUrl();
  }

  return new URL(request.url).origin;
}

async function fileToVisionImage(
  formData: FormData,
  key: "front" | "back",
): Promise<ListingVisionImage | { error: string }> {
  const file = formData.get(key);

  if (!(file instanceof File)) {
    return { error: `Upload the ${key} card image.` };
  }

  if (!file.type.startsWith("image/")) {
    return { error: `${key} must be an image file.` };
  }

  if (file.size > maxImageBytes) {
    return { error: `${key} image must be 8 MB or smaller.` };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  return {
    imageType: key,
    mimeType: file.type,
    dataUrl: `data:${file.type};base64,${buffer.toString("base64")}`,
  };
}

async function searchSportsCardsPro(
  request: Request,
  analysis: ListingVisionResult,
) {
  if (
    !hasConfidentValue(analysis, "player") &&
    !hasConfidentValue(analysis, "set") &&
    !hasConfidentValue(analysis, "brand") &&
    !hasConfidentValue(analysis, "cardNumber")
  ) {
    return {
      status: "skipped",
      candidates: [] as SportsCardsProCandidate[],
      selectedValue: null as SportsCardsProValue | null,
      message: "Review card details before searching SportsCardsPro.",
    };
  }

  const origin = getInternalApiOrigin(request);

  try {
    const searchResponse = await fetch(`${origin}/api/sportscardspro/search`, {
      method: "POST",
      headers: {
        authorization: request.headers.get("authorization") || "",
        "content-type": "application/json",
      },
      body: JSON.stringify(buildSportsCardsProPayload(analysis)),
    });
    const searchPayload = (await searchResponse.json()) as SportsCardsProSearchResponse;
    const candidates = searchPayload.candidates || [];

    if (!searchResponse.ok || searchPayload.error) {
      return {
        status: "failed",
        candidates,
        selectedValue: null as SportsCardsProValue | null,
        message: searchPayload.error || "SportsCardsPro search is unavailable right now.",
      };
    }

    if (candidates.length !== 1 || analysis.overallConfidence < 0.78) {
      return {
        status: candidates.length > 1 ? "multiple_matches" : "no_match",
        candidates,
        selectedValue: null as SportsCardsProValue | null,
        message: candidates.length > 1
          ? "Choose the matching SportsCardsPro card."
          : "No confident SportsCardsPro match found.",
      };
    }

    const [candidate] = candidates;
    const valueResponse = await fetch(`${origin}/api/sportscardspro/value`, {
      method: "POST",
      headers: {
        authorization: request.headers.get("authorization") || "",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sportsCardsProId: candidate.sportsCardsProId,
        cardType: analysis.fields.grader.value || analysis.fields.grade.value
          ? "Graded"
          : "Raw",
        grader: analysis.fields.grader.value,
        grade: analysis.fields.grade.value,
      }),
    });
    const valuePayload = (await valueResponse.json()) as SportsCardsProValueResponse;

    if (
      !valueResponse.ok ||
      valuePayload.error ||
      valuePayload.estimatedValue === null ||
      valuePayload.estimatedValue === undefined
    ) {
      return {
        status: "matched_no_value",
        candidates,
        selectedValue: null as SportsCardsProValue | null,
        message: valuePayload.error || "SportsCardsPro found a match but no value.",
      };
    }

    return {
      status: "matched",
      candidates,
      selectedValue: {
        sportsCardsProId: valuePayload.sportsCardsProId || candidate.sportsCardsProId,
        productName: valuePayload.productName || candidate.productName,
        setName: valuePayload.setName || candidate.setName,
        estimatedValue: valuePayload.estimatedValue,
        priceFieldUsed: valuePayload.priceFieldUsed || "",
        sourceUrl: valuePayload.sourceUrl || "https://www.sportscardspro.com",
        fetchedAt: valuePayload.fetchedAt || new Date().toISOString(),
      } satisfies SportsCardsProValue,
      message: "SportsCardsPro value matched.",
    };
  } catch (error) {
    console.error("Listing Assistant SportsCardsPro reuse failed:", {
      error,
      message: error instanceof Error ? error.message : String(error),
    });
    return {
      status: "failed",
      candidates: [] as SportsCardsProCandidate[],
      selectedValue: null as SportsCardsProValue | null,
      message: "SportsCardsPro search is unavailable right now.",
    };
  }
}

async function verifyPsaCert(request: Request, analysis: ListingVisionResult) {
  const certNumber = analysis.fields.certificationNumber.value.replace(/[^0-9]/g, "");

  if (!certNumber || analysis.fields.certificationNumber.confidence < 0.55) {
    return {
      status: "skipped",
      verification: null as PsaVerificationResponse | null,
      message: "No confident PSA certification number detected.",
    };
  }

  const origin = new URL(request.url).origin;

  try {
    const response = await fetch(`${origin}/api/psa/verify-cert`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ certNumber }),
    });
    const payload = (await response.json()) as PsaVerificationResponse;

    if (!response.ok || !payload.verified) {
      return {
        status: "failed",
        verification: payload,
        message: payload.error || "PSA certification could not be verified.",
      };
    }

    return {
      status: "verified",
      verification: payload,
      message: "PSA certification verified.",
    };
  } catch (error) {
    console.error("Listing Assistant PSA reuse failed:", {
      error,
      message: error instanceof Error ? error.message : String(error),
    });
    return {
      status: "failed",
      verification: null as PsaVerificationResponse | null,
      message: "PSA verification is unavailable right now.",
    };
  }
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser(request);

  if (auth.response) {
    return auth.response;
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid Listing Assistant upload." },
      { status: 400 },
    );
  }

  const front = await fileToVisionImage(formData, "front");

  if ("error" in front) {
    return NextResponse.json({ error: front.error }, { status: 400 });
  }

  const back = await fileToVisionImage(formData, "back");

  if ("error" in back) {
    return NextResponse.json({ error: back.error }, { status: 400 });
  }

  const provider = createVisionProvider();
  const analysis = await provider.analyzeListingImages({ front, back });

  if (analysis.status !== "completed") {
    return NextResponse.json({
      assistantStatus: analysis.status,
      analysis,
      sportsCardsPro: {
        status: "skipped",
        candidates: [],
        selectedValue: null,
        message: "SportsCardsPro search waits for card details.",
      },
      psa: {
        status: "skipped",
        verification: null,
        message: "PSA verification waits for a certification number.",
      },
      steps: ["Analyzing card photos"],
    message: analysis.warnings[0] || "Listing Assistant is unavailable right now.",
    });
  }

  const [sportsCardsPro, psa] = await Promise.all([
    searchSportsCardsPro(request, analysis),
    verifyPsaCert(request, analysis),
  ]);
  const selectedSportsCardsProValue = sportsCardsPro.selectedValue || null;
  const psaVerification = psa.status === "verified" ? psa.verification : null;
  const autofill = buildAutofill(
    analysis,
    selectedSportsCardsProValue,
    psaVerification,
  );
  const hasMultipleMatches = sportsCardsPro.status === "multiple_matches";

  return NextResponse.json({
    assistantStatus: "completed",
    analysis,
    autofill,
    sportsCardsPro,
    psa,
    steps: [
      "Analyzed card photos",
      "Searched SportsCardsPro",
      "Checked PSA certification",
      "Prepared listing suggestions",
    ],
    message: hasMultipleMatches
      ? "We found multiple possible matches. Choose the exact SportsCardsPro card."
      : analysis.confidenceLabel === "high"
        ? "Card identified. Listing fields filled for review."
        : "Listing Assistant prepared suggestions. Review before publishing.",
  });
}
