export type SupabaseErrorLike = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
  name?: string | null;
};

export type ListingPublishDiagnostic = {
  api: string;
  operation: string;
  blockingStep: string;
  failedField: string;
  validationFailure: string;
  userMessage: string;
  code: string | null;
  rawMessage: string;
  details: string | null;
  hint: string | null;
};

export type ListingPublishClientDiagnostic = Pick<
  ListingPublishDiagnostic,
  "api" | "operation" | "blockingStep" | "failedField" | "validationFailure" | "code"
>;

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return String(error);
}

export function getSupabaseError(error: unknown): SupabaseErrorLike {
  if (!error || typeof error !== "object") {
    return {};
  }

  const candidate = error as SupabaseErrorLike;

  return {
    code: candidate.code || null,
    message: candidate.message || null,
    details: candidate.details || null,
    hint: candidate.hint || null,
    name: candidate.name || null,
  };
}

export function getRequiredFieldMessage(field: string) {
  const fieldMessages: Record<string, string> = {
    seller_id: "Seller account is required. Sign out and sign back in.",
    title: "Listing title is required.",
    sport: "Category is required.",
    player: "Player / character or card title is required.",
    card_type: "Card type is required.",
    price: "Price must be greater than $0.",
    sale_format: "Sale format is required.",
    shipping_profile_id: "Shipping method is required.",
  };

  return fieldMessages[field] || `${field.replace(/_/g, " ")} is required.`;
}

export function getListingPublishDiagnostic(error: unknown): ListingPublishDiagnostic {
  const supabaseError = getSupabaseError(error);
  const rawMessage = supabaseError.message || getErrorMessage(error);
  const details = supabaseError.details || null;
  const hint = supabaseError.hint || null;
  const code = supabaseError.code || null;
  const combined = `${rawMessage} ${details || ""} ${hint || ""}`.toLowerCase();
  const missingColumnMatch =
    rawMessage.match(/'([^']+)' column/) ||
    rawMessage.match(/column "([^"]+)"/);
  const notNullColumnMatch =
    rawMessage.match(/null value in column "([^"]+)"/) ||
    details?.match(/column "([^"]+)"/);
  const constraintMatch =
    rawMessage.match(/constraint "([^"]+)"/) ||
    details?.match(/constraint "([^"]+)"/);
  let failedField = "listing";
  let validationFailure = "database_validation";
  let userMessage = rawMessage || "Listing could not be published.";

  if (combined.includes("plain white envelope")) {
    failedField = "shipping_profile_id";
    validationFailure = "shipping_profile_value_limit";
    userMessage =
      rawMessage.match(/Plain White Envelope[^.]+[.]/)?.[0] ||
      "Plain White Envelope is only available for eligible low-value cards.";
  } else if (combined.includes("listings_shipping_profile_id_check")) {
    failedField = "shipping_profile_id";
    validationFailure = "invalid_shipping_profile";
    userMessage = "Shipping method is invalid.";
  } else if (combined.includes("shipping_profile_id")) {
    failedField = "shipping_profile_id";
    validationFailure = missingColumnMatch ? "missing_database_column" : "shipping_profile_validation";
    userMessage = missingColumnMatch
      ? "Shipping method is not available in the database yet. Run the latest shipping profile migration and try again."
      : "Shipping method is required.";
  } else if (combined.includes("row-level security") || code === "42501") {
    failedField = "seller_id";
    validationFailure = "permission_denied";
    userMessage = "You do not have permission to publish this listing. Sign out and sign back in.";
  } else if (code === "23502" || notNullColumnMatch) {
    const field = notNullColumnMatch?.[1] || "listing";
    failedField = field;
    validationFailure = "required_database_field";
    userMessage = getRequiredFieldMessage(field);
  } else if (code === "23514" || constraintMatch) {
    const constraint = constraintMatch?.[1] || "";
    validationFailure = constraint || "check_constraint";

    if (constraint.includes("price")) {
      failedField = "price";
      userMessage = "Price must be greater than $0.";
    } else {
      userMessage = rawMessage || "A listing validation rule failed.";
    }
  } else if (missingColumnMatch) {
    failedField = missingColumnMatch[1];
    validationFailure = "missing_database_column";
    userMessage = `${missingColumnMatch[1].replace(/_/g, " ")} is not available in the database yet. Run the latest migration and try again.`;
  }

  return {
    api: "Supabase PostgREST",
    operation: "listings.insert",
    blockingStep: "app/api/listings/publish/route.ts listings insert",
    failedField,
    validationFailure,
    userMessage,
    code,
    rawMessage,
    details,
    hint,
  };
}

export function toListingPublishClientDiagnostic(
  diagnostic: ListingPublishDiagnostic,
): ListingPublishClientDiagnostic {
  return {
    api: diagnostic.api,
    operation: diagnostic.operation,
    blockingStep: diagnostic.blockingStep,
    failedField: diagnostic.failedField,
    validationFailure: diagnostic.validationFailure,
    code: diagnostic.code,
  };
}
