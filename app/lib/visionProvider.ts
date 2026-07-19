import "server-only";

export type ListingVisionFieldKey =
  | "category"
  | "sport"
  | "player"
  | "year"
  | "brand"
  | "set"
  | "cardNumber"
  | "manufacturer"
  | "team"
  | "parallel"
  | "grader"
  | "grade"
  | "certificationNumber"
  | "rookieStatus"
  | "suggestedTitle"
  | "suggestedDescription";

export type ListingVisionConfidenceLabel = "high" | "medium" | "low";
export type ListingVisionStatus = "completed" | "unconfigured" | "failed";

export type ListingVisionField = {
  value: string;
  confidence: number;
};

export type ListingVisionResult = {
  status: ListingVisionStatus;
  provider: string;
  overallConfidence: number;
  confidenceLabel: ListingVisionConfidenceLabel;
  fields: Record<ListingVisionFieldKey, ListingVisionField>;
  warnings: string[];
  analyzedAt: string;
};

export type ListingVisionImage = {
  imageType: "front" | "back";
  mimeType: string;
  dataUrl: string;
};

export type ListingVisionRequest = {
  front: ListingVisionImage;
  back: ListingVisionImage;
};

export interface VisionProvider {
  name: string;
  analyzeListingImages(input: ListingVisionRequest): Promise<ListingVisionResult>;
}

type RawVisionField = {
  value?: unknown;
  confidence?: unknown;
};

type RawVisionPayload = Partial<Record<ListingVisionFieldKey, RawVisionField>> & {
  overallConfidence?: unknown;
  confidence?: unknown;
  warnings?: unknown;
};

type OpenAiResponsePayload = {
  status?: unknown;
  output_text?: unknown;
  output?: unknown;
  incomplete_details?: unknown;
};

const openAiResponsesUrl = "https://api.openai.com/v1/responses";
const defaultOpenAiVisionModel = "gpt-5.6";

const fieldKeys: ListingVisionFieldKey[] = [
  "category",
  "sport",
  "player",
  "year",
  "brand",
  "set",
  "cardNumber",
  "manufacturer",
  "team",
  "parallel",
  "grader",
  "grade",
  "certificationNumber",
  "rookieStatus",
  "suggestedTitle",
  "suggestedDescription",
];

function emptyField(): ListingVisionField {
  return {
    value: "",
    confidence: 0,
  };
}

function emptyFields() {
  return fieldKeys.reduce<Record<ListingVisionFieldKey, ListingVisionField>>(
    (fields, key) => {
      fields[key] = emptyField();
      return fields;
    },
    {} as Record<ListingVisionFieldKey, ListingVisionField>,
  );
}

function clampConfidence(value: unknown) {
  const number = typeof value === "number"
    ? value
    : typeof value === "string"
      ? Number(value)
      : 0;

  if (!Number.isFinite(number)) {
    return 0;
  }

  if (number > 1) {
    return Math.max(0, Math.min(1, number / 100));
  }

  return Math.max(0, Math.min(1, number));
}

function cleanString(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim();
}

export function classifyVisionConfidence(
  confidence: number,
): ListingVisionConfidenceLabel {
  if (confidence >= 0.78) {
    return "high";
  }

  if (confidence >= 0.55) {
    return "medium";
  }

  return "low";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseJsonText(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);

    if (!match) {
      return null;
    }

    try {
      return JSON.parse(match[0]) as unknown;
    } catch {
      return null;
    }
  }
}

function extractResponseText(payload: unknown): string {
  if (!isRecord(payload)) {
    return "";
  }

  const outputText = payload.output_text;

  if (typeof outputText === "string") {
    return outputText;
  }

  const output = payload.output;

  if (!Array.isArray(output)) {
    return "";
  }

  return output
    .flatMap((item) => {
      if (!isRecord(item) || !Array.isArray(item.content)) {
        return [];
      }

      return item.content
        .map((content) => {
          if (!isRecord(content)) {
            return "";
          }

          return cleanString(content.text);
        })
        .filter(Boolean);
    })
    .join("\n")
    .trim();
}

function buildListingVisionJsonSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      overallConfidence: {
        type: "number",
      },
      warnings: {
        type: "array",
        items: { type: "string" },
      },
      ...fieldKeys.reduce<Record<string, unknown>>((properties, key) => {
        properties[key] = {
          type: "object",
          additionalProperties: false,
          properties: {
            value: {
              type: "string",
            },
            confidence: {
              type: "number",
            },
          },
          required: ["value", "confidence"],
        };
        return properties;
      }, {}),
    },
    required: ["overallConfidence", "warnings", ...fieldKeys],
  };
}

function buildListingVisionPrompt() {
  return [
    "You are GRAIL's card listing recognition system.",
    "Extract structured sports card or trading card listing data from the front and back images.",
    "Return only details visible in the images or strongly supported by visible text.",
    "Do not guess. If a field is unknown, return an empty value and 0 confidence.",
    "Use confidence from 0 to 1 for every field.",
    "category must be Sports or TCG.",
    "rookieStatus should be RC, Rookie, Not rookie, or empty when uncertain.",
    "grader should identify grading companies such as PSA, BGS, SGC, CGC, TAG, or empty.",
    "certificationNumber should contain only the certification number visible on the slab.",
    "suggestedTitle should be concise and hobby-standard, for example: 2023 Bowman Chrome Elly De La Cruz RC PSA 10.",
    "suggestedDescription should be factual, concise, and non-marketing.",
  ].join(" ");
}

export function normalizeListingVisionPayload(
  payload: unknown,
  provider: string,
): ListingVisionResult {
  const record = isRecord(payload) ? (payload as RawVisionPayload) : {};
  const fields = emptyFields();

  for (const key of fieldKeys) {
    const field = record[key];

    if (isRecord(field)) {
      fields[key] = {
        value: cleanString(field.value),
        confidence: clampConfidence(field.confidence),
      };
      continue;
    }

    const directValue = record[key];

    if (typeof directValue === "string" || typeof directValue === "number") {
      fields[key] = {
        value: cleanString(directValue),
        confidence: 0.5,
      };
    }
  }

  const fieldConfidences = fieldKeys
    .map((key) => fields[key])
    .filter((field) => field.value)
    .map((field) => field.confidence);
  const inferredConfidence = fieldConfidences.length
    ? fieldConfidences.reduce((sum, confidence) => sum + confidence, 0) /
      fieldConfidences.length
    : 0;
  const overallConfidence =
    clampConfidence(record.overallConfidence ?? record.confidence) ||
    inferredConfidence;
  const warnings = Array.isArray(record.warnings)
    ? record.warnings.map(cleanString).filter(Boolean).slice(0, 6)
    : [];

  return {
    status: "completed",
    provider,
    overallConfidence,
    confidenceLabel: classifyVisionConfidence(overallConfidence),
    fields,
    warnings,
    analyzedAt: new Date().toISOString(),
  };
}

function buildEmptyResult(
  status: ListingVisionStatus,
  provider: string,
  warning: string,
): ListingVisionResult {
  return {
    status,
    provider,
    overallConfidence: 0,
    confidenceLabel: "low",
    fields: emptyFields(),
    warnings: [warning],
    analyzedAt: new Date().toISOString(),
  };
}

class UnavailableVisionProvider implements VisionProvider {
  name = "unconfigured";

  async analyzeListingImages() {
    return buildEmptyResult(
      "unconfigured",
      this.name,
      "Listing Assistant vision is not configured yet.",
    );
  }
}

class OpenAiVisionProvider implements VisionProvider {
  name = "openai";

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async analyzeListingImages(input: ListingVisionRequest) {
    try {
      const response = await fetch(openAiResponsesUrl, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: buildListingVisionPrompt(),
                },
                {
                  type: "input_image",
                  image_url: input.front.dataUrl,
                  detail: "high",
                },
                {
                  type: "input_image",
                  image_url: input.back.dataUrl,
                  detail: "high",
                },
              ],
            },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "grail_listing_card_extraction",
              strict: true,
              schema: buildListingVisionJsonSchema(),
            },
          },
          max_output_tokens: 1400,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Listing vision provider request failed:", {
          provider: this.name,
          status: response.status,
          statusText: response.statusText,
          body: errorText.slice(0, 500),
        });
        return buildEmptyResult(
          "failed",
          this.name,
          "Listing Assistant could not analyze these photos.",
        );
      }

      const payload = (await response.json()) as OpenAiResponsePayload;

      if (payload.status && payload.status !== "completed") {
        console.error("Listing vision provider returned incomplete response.", {
          provider: this.name,
          status: payload.status,
          incompleteDetails: payload.incomplete_details,
        });
        return buildEmptyResult(
          "failed",
          this.name,
          "Listing Assistant could not finish analyzing these photos.",
        );
      }

      const outputText = extractResponseText(payload);
      const parsed = parseJsonText(outputText);

      if (!parsed) {
        console.error("Listing vision provider returned no structured JSON.", {
          provider: this.name,
        });
        return buildEmptyResult(
          "failed",
          this.name,
          "Listing Assistant could not read structured card details.",
        );
      }

      return normalizeListingVisionPayload(parsed, this.name);
    } catch (error) {
      console.error("Listing vision provider error:", {
        provider: this.name,
        error,
        message: error instanceof Error ? error.message : String(error),
      });
      return buildEmptyResult(
        "failed",
        this.name,
        "Listing Assistant is unavailable right now.",
      );
    }
  }
}

export function createVisionProvider(): VisionProvider {
  const provider = process.env.GRAIL_VISION_PROVIDER || "openai";

  if (provider !== "openai") {
    return new UnavailableVisionProvider();
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return new UnavailableVisionProvider();
  }

  return new OpenAiVisionProvider(
    apiKey,
    process.env.GRAIL_VISION_MODEL || defaultOpenAiVisionModel,
  );
}
