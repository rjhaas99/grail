import "server-only";

import type { User } from "@supabase/supabase-js";
import Stripe from "stripe";

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

export function createStripeClient() {
  return new Stripe(getRequiredEnv("STRIPE_SECRET_KEY"));
}

export function getStripeProcessingConfiguration() {
  const percent = Number(process.env.STRIPE_PROCESSING_PERCENT);
  const fixedCents = Number(process.env.STRIPE_PROCESSING_FIXED_CENTS);
  const configured =
    Number.isFinite(percent) &&
    percent >= 0 &&
    Number.isFinite(fixedCents) &&
    fixedCents >= 0;

  if (!configured) {
    return {
      configured: false,
      label: "Calculated by Stripe at charge time",
      detail: "Exact processing amounts are stored on completed orders when available.",
    };
  }

  const fixedAmount = fixedCents / 100;
  const fixedLabel = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(fixedAmount);

  return {
    configured: true,
    label: `${percent}% + ${fixedLabel}`,
    detail: "Configured from Stripe processing environment settings.",
  };
}

export function getStripeCustomerUserMetadata(user: User) {
  return {
    grailUserId: user.id,
    source: "grail",
  };
}

export async function findStripeCustomerForUser({
  stripe,
  user,
  createIfMissing = false,
}: {
  stripe: Stripe;
  user: User;
  createIfMissing?: boolean;
}) {
  const userEmail = user.email?.trim().toLowerCase() || "";

  if (userEmail) {
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 100,
    });
    const exactMetadataMatch = customers.data.find(
      (customer) => customer.metadata?.grailUserId === user.id,
    );

    if (exactMetadataMatch) {
      return exactMetadataMatch;
    }

    const unclaimedEmailMatch = customers.data.find(
      (customer) => !customer.metadata?.grailUserId,
    );

    if (unclaimedEmailMatch && createIfMissing) {
      return stripe.customers.update(unclaimedEmailMatch.id, {
        metadata: {
          ...unclaimedEmailMatch.metadata,
          ...getStripeCustomerUserMetadata(user),
        },
      });
    }
  }

  if (!createIfMissing) {
    return null;
  }

  return stripe.customers.create({
    email: userEmail || undefined,
    metadata: getStripeCustomerUserMetadata(user),
  });
}
