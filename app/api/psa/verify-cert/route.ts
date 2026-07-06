import { NextResponse } from "next/server";

export const runtime = "nodejs";

type VerifyPayload = {
  certNumber?: string;
};

type PsaRecord = Record<string, unknown>;

const psaCertEndpoint = "https://api.psacard.com/publicapi/cert/GetByCertNumber";

function getPsaToken() {
  const token = process.env.PSA_API_TOKEN;

  if (!token) {
    throw new Error("PSA_API_TOKEN is required.");
  }

  return token;
}

function cleanCertNumber(value: string) {
  return value.replace(/[^0-9]/g, "").trim();
}

function isRecord(value: unknown): value is PsaRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getString(record: PsaRecord, keys: string[]) {
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

function findCertificationRecord(payload: unknown): PsaRecord | null {
  if (!isRecord(payload)) {
    return null;
  }

  const possibleDirectKeys = ["PSACert", "Cert", "cert", "data", "result"];

  for (const key of possibleDirectKeys) {
    const value = payload[key];

    if (isRecord(value)) {
      return value;
    }
  }

  const possibleArrayKeys = ["items", "results", "certs", "Certs"];

  for (const key of possibleArrayKeys) {
    const value = payload[key];

    if (Array.isArray(value) && isRecord(value[0])) {
      return value[0];
    }
  }

  return payload;
}

function buildCardName(record: PsaRecord) {
  const explicitName = getString(record, [
    "CardName",
    "cardName",
    "Title",
    "title",
    "Description",
    "description",
  ]);

  if (explicitName) {
    return explicitName;
  }

  return [
    getString(record, ["Year", "year"]),
    getString(record, ["Brand", "brand"]),
    getString(record, ["Subject", "subject", "Player", "player"]),
    getString(record, ["CardNumber", "cardNumber", "CardNo", "cardNo"]),
    getString(record, ["Variety", "variety"]),
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function normalizePsaPayload(payload: unknown, fallbackCertNumber: string) {
  const record = findCertificationRecord(payload);

  if (!record) {
    return {
      verified: false,
      certNumber: fallbackCertNumber,
      grade: "",
      cardName: "",
    };
  }

  const certNumber =
    getString(record, [
      "CertNumber",
      "certNumber",
      "CertificationNumber",
      "certificationNumber",
      "CertNo",
      "certNo",
    ]) || fallbackCertNumber;
  const grade = getString(record, [
    "GradeDescription",
    "gradeDescription",
    "Grade",
    "grade",
  ]);
  const cardName = buildCardName(record);

  return {
    verified: Boolean(certNumber && (grade || cardName)),
    certNumber,
    grade,
    cardName,
  };
}

export async function POST(request: Request) {
  let payload: VerifyPayload;

  try {
    payload = (await request.json()) as VerifyPayload;
  } catch {
    return NextResponse.json({ error: "Invalid PSA verification request." }, { status: 400 });
  }

  const certNumber = cleanCertNumber(payload.certNumber || "");

  if (!certNumber) {
    return NextResponse.json({ error: "PSA cert number is required." }, { status: 400 });
  }

  let token: string;

  try {
    token = getPsaToken();
  } catch (error) {
    console.error("PSA verification configuration error:", error);
    return NextResponse.json(
      { error: "PSA verification is not configured." },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(
      `${psaCertEndpoint}/${encodeURIComponent(certNumber)}`,
      {
        headers: {
          accept: "application/json",
          authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      },
    );

    if (response.status === 404) {
      return NextResponse.json({
        verified: false,
        certNumber,
        error: "Unable to verify PSA certification.",
      });
    }

    const text = await response.text();
    let psaPayload: unknown = null;

    try {
      psaPayload = text ? JSON.parse(text) : null;
    } catch {
      psaPayload = text;
    }

    if (response.status === 429) {
      console.error("PSA verification quota exceeded:", {
        status: response.status,
        statusText: response.statusText,
        certNumber,
        body: typeof psaPayload === "string" ? psaPayload.slice(0, 500) : psaPayload,
      });
      return NextResponse.json(
        {
          verified: false,
          certNumber,
          error: "PSA verification limit reached. Please try again later.",
        },
        { status: 200 },
      );
    }

    if (!response.ok) {
      console.error("PSA verification API error:", {
        status: response.status,
        statusText: response.statusText,
        certNumber,
        body: typeof psaPayload === "string" ? psaPayload.slice(0, 500) : psaPayload,
      });
      return NextResponse.json(
        {
          verified: false,
          certNumber,
          error: "Unable to verify PSA certification.",
        },
        { status: 200 },
      );
    }

    const normalized = normalizePsaPayload(psaPayload, certNumber);

    if (!normalized.verified) {
      return NextResponse.json({
        ...normalized,
        error: "Unable to verify PSA certification.",
      });
    }

    return NextResponse.json({
      ...normalized,
      verifiedAt: new Date().toISOString(),
      psaUrl: `https://www.psacard.com/cert/${encodeURIComponent(certNumber)}`,
    });
  } catch (error) {
    console.error("PSA verification request error:", {
      certNumber,
      error,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        verified: false,
        certNumber,
        error: "Unable to verify PSA certification.",
      },
      { status: 200 },
    );
  }
}
