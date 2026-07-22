import "server-only";

import Stripe from "stripe";
import { getConfiguredSiteUrl } from "./siteConfig";

export type TransactionCheckoutType = "buy_now" | "auction" | "accepted_offer";

export type StripeTransactionCheckoutType =
  | "fixed_price_sale"
  | "auction_sale"
  | "offer_sale";

type MetadataValue = string | number | boolean | null | undefined;

type CreateTransactionCheckoutSessionParams = {
  transactionType: TransactionCheckoutType;
  listingId: string;
  sellerId: string;
  buyerId?: string | null;
  amount: number;
  shippingAmount: number;
  shippingLabel?: string;
  title: string;
  imageUrl?: string | null;
  successPath?: string;
  cancelPath?: string;
  extraMetadata?: Record<string, MetadataValue>;
};

type StripeErrorLike = {
  type?: string;
  code?: string;
  message?: string;
  param?: string;
  stack?: string;
};

export const stripeTransactionCheckoutTypes = {
  buy_now: "fixed_price_sale",
  auction: "auction_sale",
  accepted_offer: "offer_sale",
} as const satisfies Record<TransactionCheckoutType, StripeTransactionCheckoutType>;

export const transactionCheckoutLabels = {
  buy_now: "Buy Now",
  auction: "Won Auction",
  accepted_offer: "Accepted Offer",
} as const satisfies Record<TransactionCheckoutType, string>;

export const transactionLifecycleLabels = {
  payment_needed: "Payment Needed",
  payment_pending: "Payment Pending",
  paid: "Paid",
  preparing_shipment: "Preparing Shipment",
  shipped: "Shipped",
  delivered: "Delivered",
  inspection: "Inspection",
  completed: "Completed",
  finalizing: "Finalizing",
  expired: "Expired",
  cancelled: "Cancelled",
} as const;

const supportedShippingCountries = ["US"] as const;

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function normalizeMetadata(metadata: Record<string, MetadataValue>) {
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([, value]) => value !== null && value !== undefined && value !== "")
      .map(([key, value]) => [key, String(value)]),
  ) as Record<string, string>;
}

function getAbsoluteCheckoutUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${getConfiguredSiteUrl()}${normalizedPath}`;
}

function getCheckoutStackLocation(error: unknown) {
  const stack = error instanceof Error ? error.stack : undefined;

  return stack?.split("\n").map((line) => line.trim()).find((line) => line.startsWith("at ")) || null;
}

function getStripeErrorDiagnostic(error: unknown) {
  const stripeError = error as StripeErrorLike;

  return {
    type: stripeError.type || null,
    code: stripeError.code || null,
    param: stripeError.param || null,
    message:
      stripeError.message ||
      (error instanceof Error ? error.message : "Stripe checkout failed."),
    stackLocation: getCheckoutStackLocation(error),
  };
}

function isLikelyStripeImageError(error: unknown) {
  const diagnostic = getStripeErrorDiagnostic(error);
  const param = diagnostic.param?.toLowerCase() || "";
  const message = diagnostic.message.toLowerCase();

  return param.includes("image") || message.includes("image");
}

function logTransactionCheckoutDiagnostic(
  event: string,
  details: Record<string, unknown>,
) {
  console.info("Transaction checkout diagnostic:", {
    event,
    ...details,
  });
}

function getValidStripeProductImageUrl(imageUrl?: string | null) {
  const trimmedUrl = imageUrl?.trim();

  if (!trimmedUrl) {
    return null;
  }

  try {
    const url = trimmedUrl.startsWith("/")
      ? new URL(trimmedUrl, getConfiguredSiteUrl())
      : new URL(trimmedUrl);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    if (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "::1"
    ) {
      return null;
    }

    url.hash = "";

    return url.toString();
  } catch {
    return null;
  }
}

function getStripeProductImages(imageUrl?: string | null) {
  const validImageUrl = getValidStripeProductImageUrl(imageUrl);

  return validImageUrl ? [validImageUrl] : undefined;
}

export function getStripeCheckoutTypeForTransaction(
  transactionType: TransactionCheckoutType,
) {
  return stripeTransactionCheckoutTypes[transactionType];
}

export function getTransactionTypeFromStripeCheckoutType(
  stripeType?: string | null,
): TransactionCheckoutType | null {
  if (!stripeType) {
    return null;
  }

  const entry = Object.entries(stripeTransactionCheckoutTypes).find(
    ([, value]) => value === stripeType,
  );

  return (entry?.[0] as TransactionCheckoutType | undefined) || null;
}

export function buildTransactionCheckoutMetadata({
  transactionType,
  listingId,
  sellerId,
  buyerId,
  extraMetadata,
}: Pick<
  CreateTransactionCheckoutSessionParams,
  "transactionType" | "listingId" | "sellerId" | "buyerId" | "extraMetadata"
>) {
  const stripeCheckoutType = getStripeCheckoutTypeForTransaction(transactionType);

  return normalizeMetadata({
    ...extraMetadata,
    type: stripeCheckoutType,
    transactionType,
    transactionId: extraMetadata?.transactionId || listingId,
    listingId,
    sellerId,
    buyerId,
    source: "grail",
  });
}

export async function createTransactionCheckoutSession({
  transactionType,
  listingId,
  sellerId,
  buyerId,
  amount,
  shippingAmount,
  shippingLabel = "Shipping",
  title,
  imageUrl,
  successPath,
  cancelPath,
  extraMetadata,
}: CreateTransactionCheckoutSessionParams) {
  if (!listingId) {
    throw new Error("Listing ID is required for transaction checkout.");
  }

  if (!sellerId) {
    throw new Error("Seller ID is required for transaction checkout.");
  }

  if (!title) {
    throw new Error("Title is required for transaction checkout.");
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("A valid transaction amount is required for checkout.");
  }

  if (!Number.isFinite(shippingAmount) || shippingAmount < 0) {
    throw new Error("A valid shipping rate is required for checkout.");
  }

  const stripe = new Stripe(getRequiredEnv("STRIPE_SECRET_KEY"));
  const unitAmount = Math.round(amount * 100);
  const shippingUnitAmount = Math.round(Math.max(shippingAmount, 0) * 100);
  const metadata = buildTransactionCheckoutMetadata({
    transactionType,
    listingId,
    sellerId,
    buyerId,
    extraMetadata: {
      cardAmount: amount,
      shippingAmount,
      shippingLabel,
      ...extraMetadata,
    },
  });
  const resolvedSuccessPath =
    successPath || `/checkout/${listingId}?success=true&session_id={CHECKOUT_SESSION_ID}`;
  const resolvedCancelPath = cancelPath || `/checkout/${listingId}?canceled=true`;
  const productImages = getStripeProductImages(imageUrl);
  const successUrl = getAbsoluteCheckoutUrl(resolvedSuccessPath);
  const cancelUrl = getAbsoluteCheckoutUrl(resolvedCancelPath);
  const cardLineItem = {
    quantity: 1,
    price_data: {
      currency: "usd",
      unit_amount: unitAmount,
      product_data: {
        name: title,
        ...(productImages ? { images: productImages } : {}),
      },
    },
  } satisfies Stripe.Checkout.SessionCreateParams.LineItem;
  const cardLineItemWithoutImage = {
    quantity: 1,
    price_data: {
      currency: "usd",
      unit_amount: unitAmount,
      product_data: {
        name: title,
      },
    },
  } satisfies Stripe.Checkout.SessionCreateParams.LineItem;
  const shippingLineItem = shippingUnitAmount > 0
    ? ({
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: shippingUnitAmount,
          product_data: {
            name: shippingLabel,
          },
        },
      } satisfies Stripe.Checkout.SessionCreateParams.LineItem)
    : null;
  const lineItems = shippingLineItem
    ? [cardLineItem, shippingLineItem]
    : [cardLineItem];
  const lineItemsWithoutImage = shippingLineItem
    ? [cardLineItemWithoutImage, shippingLineItem]
    : [cardLineItemWithoutImage];

  const sessionParams = {
    mode: "payment",
    client_reference_id: buyerId || undefined,
    line_items: lineItems,
    shipping_address_collection: {
      allowed_countries: [...supportedShippingCountries],
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    payment_intent_data: {
      metadata,
    },
  } satisfies Stripe.Checkout.SessionCreateParams;

  logTransactionCheckoutDiagnostic("stripe_checkout.payload", {
    transactionType,
    stripeCheckoutType: metadata.type,
    listingId,
    sellerId,
    buyerId: buyerId || null,
    amount,
    unitAmount,
    shippingAmount,
    shippingUnitAmount,
    shippingLabel,
    shippingAddressCollection: {
      allowedCountries: supportedShippingCountries,
    },
    title,
    successUrl,
    cancelUrl,
    rawImageUrl: imageUrl || null,
    imageUrlSent: productImages?.[0] || null,
    imageOmittedReason: imageUrl && !productImages ? "invalid_or_non_public_url" : null,
  });

  let session: Stripe.Checkout.Session;

  try {
    session = await stripe.checkout.sessions.create(sessionParams);
  } catch (error) {
    const diagnostic = getStripeErrorDiagnostic(error);

    console.error("Stripe checkout session create error:", {
      transactionType,
      stripeCheckoutType: metadata.type,
      listingId,
      sellerId,
      buyerId: buyerId || null,
      amount,
      shippingAmount,
      imageUrlSent: productImages?.[0] || null,
      ...diagnostic,
    });

    if (!productImages || !isLikelyStripeImageError(error)) {
      throw error;
    }

    const retrySessionParams = {
      ...sessionParams,
      line_items: lineItemsWithoutImage,
    } satisfies Stripe.Checkout.SessionCreateParams;

    logTransactionCheckoutDiagnostic("stripe_checkout.retry_without_image", {
      transactionType,
      stripeCheckoutType: metadata.type,
      listingId,
      sellerId,
      buyerId: buyerId || null,
      amount,
      shippingAmount,
      omittedImageUrl: productImages[0],
      stripeErrorType: diagnostic.type,
      stripeErrorCode: diagnostic.code,
      stripeErrorParam: diagnostic.param,
      stripeErrorMessage: diagnostic.message,
    });

    session = await stripe.checkout.sessions.create(retrySessionParams);
  }

  console.info("Unified transaction checkout session created:", {
    stripeSessionId: session.id,
    transactionType,
    stripeCheckoutType: metadata.type,
    listingId,
    sellerId,
    buyerId: buyerId || null,
    amount,
    shippingAmount,
    imageUrlSent: productImages?.[0] || null,
  });

  return {
    sessionId: session.id,
    url: session.url,
    metadata,
  };
}
