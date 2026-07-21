import { NextResponse } from "next/server";
import {
  createServiceSupabaseClient,
  getCurrentUser,
} from "../../auctions/_shared";
import {
  getListingPublishDiagnostic,
  toListingPublishClientDiagnostic,
} from "../../../lib/listingPublishDiagnostics";
import { loadShippingRateSettings } from "../../../lib/shippingProfiles.server";
import { validateShippingProfileForListing } from "../../../lib/shippingProfiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ListingPublishRequest = {
  fields?: Record<string, unknown>;
  status?: string;
  isCollectionCard?: boolean;
  isPublicCollection?: boolean;
  frontImagePresent?: boolean;
  backImagePresent?: boolean;
};

const allowedListingFieldKeys = [
  "title",
  "sport",
  "player",
  "year",
  "brand",
  "card_number",
  "card_type",
  "grader",
  "grade",
  "cert_number",
  "condition",
  "price",
  "sale_format",
  "auction_status",
  "auction_duration_days",
  "auction_starts_at",
  "auction_ends_at",
  "auction_starting_bid",
  "auction_reserve_price",
  "auction_reserve_met_at",
  "auction_current_bid",
  "auction_bid_count",
  "auction_winner_id",
  "auction_ended_at",
  "auction_payment_due_at",
  "reserve_fee_amount",
  "reserve_fee_status",
  "estimated_value",
  "collection_note",
  "psa_verified",
  "psa_cert_number",
  "psa_grade",
  "psa_card_name",
  "psa_verified_at",
  "sportscardspro_id",
  "sportscardspro_product_name",
  "sportscardspro_set_name",
  "sportscardspro_estimated_value",
  "sportscardspro_price_field",
  "sportscardspro_source_url",
  "sportscardspro_fetched_at",
  "shipping_profile_id",
] as const;

type ValidationFailure = {
  field: string;
  validationFailure: string;
  message: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(value: unknown) {
  const parsed = Number(value || 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

function sanitizeListingFields(fields: Record<string, unknown>) {
  return Object.fromEntries(
    allowedListingFieldKeys
      .filter((key) => Object.prototype.hasOwnProperty.call(fields, key))
      .map((key) => [key, fields[key]]),
  );
}

function buildPayloadSummary({
  fields,
  status,
  isCollectionCard,
  frontImagePresent,
  backImagePresent,
}: {
  fields: Record<string, unknown>;
  status: string;
  isCollectionCard: boolean;
  frontImagePresent: boolean;
  backImagePresent: boolean;
}) {
  return {
    status,
    isCollectionCard,
    saleFormat: getString(fields.sale_format),
    titlePresent: Boolean(getString(fields.title)),
    category: getString(fields.sport),
    subjectPresent: Boolean(getString(fields.player)),
    cardType: getString(fields.card_type),
    price: fields.price ?? null,
    auctionStartingBid: fields.auction_starting_bid ?? null,
    shippingProfileId: fields.shipping_profile_id ?? null,
    psaState: fields.psa_verified ? "verified" : "not_verified",
    frontImagePresent,
    backImagePresent,
  };
}

async function validatePublishPayload({
  fields,
  status,
  isCollectionCard,
  frontImagePresent,
  backImagePresent,
}: {
  fields: Record<string, unknown>;
  status: string;
  isCollectionCard: boolean;
  frontImagePresent: boolean;
  backImagePresent: boolean;
}): Promise<ValidationFailure | null> {
  const saleFormat = getString(fields.sale_format) || "fixed";
  const cardType = getString(fields.card_type);
  const price = getNumber(fields.price);
  const startingBid = getNumber(fields.auction_starting_bid);

  if (!["active", "collection", "pending_reserve_fee"].includes(status)) {
    return {
      field: "status",
      validationFailure: "invalid_status",
      message: "Listing status is invalid.",
    };
  }

  if (!getString(fields.title)) {
    return {
      field: "title",
      validationFailure: "required_field",
      message: "Listing title is required.",
    };
  }

  if (!getString(fields.sport)) {
    return {
      field: "sport",
      validationFailure: "required_field",
      message: "Category is required.",
    };
  }

  if (!cardType) {
    return {
      field: "card_type",
      validationFailure: "required_field",
      message: "Card type is required.",
    };
  }

  if (cardType === "Raw" && !getString(fields.condition)) {
    return {
      field: "condition",
      validationFailure: "required_field",
      message: "Condition is required for raw cards.",
    };
  }

  if (cardType === "Graded" && (!getString(fields.grader) || !getString(fields.grade))) {
    return {
      field: "grader",
      validationFailure: "required_field",
      message: "Grader and grade are required for graded cards.",
    };
  }

  if (!frontImagePresent) {
    return {
      field: "front_image",
      validationFailure: "required_field",
      message: "Front image is required.",
    };
  }

  if (!backImagePresent) {
    return {
      field: "back_image",
      validationFailure: "required_field",
      message: "Back image is required.",
    };
  }

  if (!isCollectionCard && saleFormat !== "auction" && price <= 0) {
    return {
      field: "price",
      validationFailure: "invalid_price",
      message: "Price must be greater than $0.",
    };
  }

  if (saleFormat === "auction" && startingBid < 0.99) {
    return {
      field: "auction_starting_bid",
      validationFailure: "invalid_auction_starting_bid",
      message: "Auction starting bid must be at least $0.99.",
    };
  }

  if (!isCollectionCard) {
    const shippingProfileId = getString(fields.shipping_profile_id);

    if (!shippingProfileId) {
      return {
        field: "shipping_profile_id",
        validationFailure: "required_field",
        message: "Shipping method is required.",
      };
    }

    const supabase = createServiceSupabaseClient();
    const settings = await loadShippingRateSettings(supabase);
    const shippingValidation = validateShippingProfileForListing({
      profileId: shippingProfileId,
      listingValue: saleFormat === "auction" ? startingBid : price,
      settings,
    });

    if (!shippingValidation.valid) {
      return {
        field: "shipping_profile_id",
        validationFailure: "shipping_profile_validation",
        message: shippingValidation.error,
      };
    }
  }

  return null;
}

export async function POST(request: Request) {
  const { user, error: authError } = await getCurrentUser(request);

  if (authError || !user?.id) {
    return NextResponse.json(
      { error: "Sign in to publish listings." },
      { status: 401 },
    );
  }

  let payload: ListingPublishRequest;

  try {
    payload = (await request.json()) as ListingPublishRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid listing publish request." },
      { status: 400 },
    );
  }

  if (!isRecord(payload.fields)) {
    return NextResponse.json(
      { error: "Listing payload is required." },
      { status: 400 },
    );
  }

  const status = getString(payload.status);
  const isCollectionCard = Boolean(payload.isCollectionCard);
  const isPublicCollection = Boolean(payload.isPublicCollection);
  const frontImagePresent = Boolean(payload.frontImagePresent);
  const backImagePresent = Boolean(payload.backImagePresent);
  const sanitizedFields = sanitizeListingFields(payload.fields);
  const payloadSummary = buildPayloadSummary({
    fields: sanitizedFields,
    status,
    isCollectionCard,
    frontImagePresent,
    backImagePresent,
  });

  try {
    const validationFailure = await validatePublishPayload({
      fields: sanitizedFields,
      status,
      isCollectionCard,
      frontImagePresent,
      backImagePresent,
    });

    if (validationFailure) {
      console.error("Listing publish server validation failure:", {
        api: "POST /api/listings/publish",
        operation: "request.validation",
        blockingStep: "app/api/listings/publish/route.ts validatePublishPayload",
        failedField: validationFailure.field,
        validationFailure: validationFailure.validationFailure,
        sellerId: user.id,
        payloadSummary,
      });

      return NextResponse.json(
        {
          error: validationFailure.message,
          diagnostic: {
            api: "POST /api/listings/publish",
            operation: "request.validation",
            blockingStep: "app/api/listings/publish/route.ts validatePublishPayload",
            failedField: validationFailure.field,
            validationFailure: validationFailure.validationFailure,
            code: null,
          },
        },
        { status: 400 },
      );
    }

    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from("listings")
      .insert({
        seller_id: user.id,
        ...sanitizedFields,
        status,
        is_collection_card: isCollectionCard,
        is_public_collection: isPublicCollection,
      })
      .select("id")
      .single();

    if (error) {
      const diagnostic = getListingPublishDiagnostic(error);

      console.error("Listing publish database validation failure:", {
        ...diagnostic,
        sellerId: user.id,
        payloadSummary,
      });

      return NextResponse.json(
        {
          error: diagnostic.userMessage || "Listing could not be published.",
          diagnostic: toListingPublishClientDiagnostic(diagnostic),
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ id: (data as { id: string }).id });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.error("Listing publish route error:", {
      api: "POST /api/listings/publish",
      operation: "publishListing",
      blockingStep: "app/api/listings/publish/route.ts POST",
      sellerId: user.id,
      message,
      payloadSummary,
      error,
    });

    return NextResponse.json(
      { error: message || "Listing could not be published." },
      { status: 500 },
    );
  }
}
