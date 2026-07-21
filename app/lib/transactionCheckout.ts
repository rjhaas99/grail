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
  title: string;
  imageUrl?: string | null;
  successPath?: string;
  cancelPath?: string;
  extraMetadata?: Record<string, MetadataValue>;
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

function getStripeProductImages(imageUrl?: string | null) {
  const trimmedUrl = imageUrl?.trim();

  if (!trimmedUrl) {
    return undefined;
  }

  if (trimmedUrl.startsWith("https://") || trimmedUrl.startsWith("http://")) {
    return [trimmedUrl];
  }

  if (trimmedUrl.startsWith("/")) {
    return [getAbsoluteCheckoutUrl(trimmedUrl)];
  }

  return undefined;
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

  const stripe = new Stripe(getRequiredEnv("STRIPE_SECRET_KEY"));
  const unitAmount = Math.round(amount * 100);
  const metadata = buildTransactionCheckoutMetadata({
    transactionType,
    listingId,
    sellerId,
    buyerId,
    extraMetadata,
  });
  const resolvedSuccessPath =
    successPath || `/checkout/${listingId}?success=true&session_id={CHECKOUT_SESSION_ID}`;
  const resolvedCancelPath = cancelPath || `/checkout/${listingId}?canceled=true`;
  const productImages = getStripeProductImages(imageUrl);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: buyerId || undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: unitAmount,
          product_data: {
            name: title,
            ...(productImages ? { images: productImages } : {}),
          },
        },
      },
    ],
    success_url: getAbsoluteCheckoutUrl(resolvedSuccessPath),
    cancel_url: getAbsoluteCheckoutUrl(resolvedCancelPath),
    metadata,
    payment_intent_data: {
      metadata,
    },
  });

  console.info("Unified transaction checkout session created:", {
    stripeSessionId: session.id,
    transactionType,
    stripeCheckoutType: metadata.type,
    listingId,
    sellerId,
    buyerId: buyerId || null,
    amount,
  });

  return {
    sessionId: session.id,
    url: session.url,
    metadata,
  };
}
