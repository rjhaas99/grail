import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export const trustEventTypes = [
  "SALE_COMPLETED",
  "PURCHASE_COMPLETED",
  "POSITIVE_FEEDBACK",
  "NEGATIVE_FEEDBACK",
  "DISPUTE_OPENED",
  "DISPUTE_RESOLVED_BUYER",
  "DISPUTE_RESOLVED_SELLER",
  "CHARGEBACK",
  "IDENTITY_VERIFIED",
  "PHONE_VERIFIED",
  "EMAIL_VERIFIED",
  "AUCTION_DEFAULT",
  "ACCOUNT_CREATED",
] as const;

export type TrustEventType = (typeof trustEventTypes)[number];

export const trustLevels = ["Low Risk", "Medium Risk", "High Risk", "Critical"] as const;

export type TrustLevel = (typeof trustLevels)[number];

export type TrustBadge = {
  key: string;
  label: string;
  description: string;
};

export type UserTrustRow = {
  user_id: string;
  internal_trust_score: number | string | null;
  trust_level: string | null;
  verified_email: boolean | null;
  verified_phone: boolean | null;
  verified_identity: boolean | null;
  successful_sales: number | string | null;
  successful_purchases: number | string | null;
  successful_auctions: number | string | null;
  successful_deliveries: number | string | null;
  positive_feedback: number | string | null;
  negative_feedback: number | string | null;
  chargebacks: number | string | null;
  disputes_opened: number | string | null;
  disputes_lost: number | string | null;
  disputes_won: number | string | null;
  seller_cancellations: number | string | null;
  buyer_cancellations: number | string | null;
  auction_defaults: number | string | null;
  fraud_flags: number | string | null;
  manual_review_required: boolean | null;
  internal_note?: string | null;
  account_created_at: string | null;
  updated_at: string | null;
};

export type TrustReference = {
  type: "order" | "listing" | "auction" | "dispute" | "user" | "admin";
  id: string;
};

type ProcessTrustEventParams = {
  supabase: SupabaseClient;
  userId: string;
  event: TrustEventType;
  reason?: string;
  reference?: TrustReference;
  scoreDelta?: number;
  updates?: Partial<
    Pick<
      UserTrustRow,
      | "verified_email"
      | "verified_phone"
      | "verified_identity"
      | "manual_review_required"
      | "internal_note"
    >
  >;
};

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeTrustLevel(value?: string | null): TrustLevel {
  return trustLevels.includes(value as TrustLevel) ? (value as TrustLevel) : "Low Risk";
}

export function buildTrustBadges(row?: Partial<UserTrustRow> | null): TrustBadge[] {
  if (!row) {
    return [];
  }

  const badges: TrustBadge[] = [];
  const successfulSales = toNumber(row.successful_sales);
  const successfulPurchases = toNumber(row.successful_purchases);
  const successfulAuctions = toNumber(row.successful_auctions);
  const positiveFeedback = toNumber(row.positive_feedback);

  if (row.verified_email) {
    badges.push({
      key: "verified_email",
      label: "Verified Email",
      description: "Email verification is recorded in the GRAIL Trust system.",
    });
  }

  if (row.verified_phone) {
    badges.push({
      key: "verified_phone",
      label: "Verified Phone",
      description: "Phone verification is recorded in the GRAIL Trust system.",
    });
  }

  if (row.verified_identity) {
    badges.push({
      key: "verified_identity",
      label: "Verified Identity",
      description: "Identity verification is recorded in the GRAIL Trust system.",
    });
  }

  if (successfulPurchases >= 5) {
    badges.push({
      key: "trusted_buyer",
      label: "Trusted Buyer",
      description: "Completed buyer history is recorded in the GRAIL Trust system.",
    });
  }

  if (successfulSales >= 5) {
    badges.push({
      key: "trusted_seller",
      label: "Trusted Seller",
      description: "Completed seller history is recorded in the GRAIL Trust system.",
    });
  }

  if (successfulSales >= 25 && positiveFeedback >= 10) {
    badges.push({
      key: "top_seller",
      label: "Top Seller",
      description: "High seller activity and feedback are recorded in the GRAIL Trust system.",
    });
  }

  if (successfulAuctions >= 5) {
    badges.push({
      key: "auction_veteran",
      label: "Auction Veteran",
      description: "Auction history is recorded in the GRAIL Trust system.",
    });
  }

  if (successfulPurchases >= 25) {
    badges.push({
      key: "power_collector",
      label: "Power Collector",
      description: "Collector activity is recorded in the GRAIL Trust system.",
    });
  }

  return badges;
}

export async function getOrCreateUserTrust(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("user_trust")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return data as UserTrustRow;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("user_trust")
    .insert({
      user_id: userId,
      trust_level: "Low Risk",
      internal_trust_score: 0,
    })
    .select("*")
    .maybeSingle();

  if (insertError) {
    throw insertError;
  }

  return inserted as UserTrustRow;
}

export async function processTrustEvent({
  supabase,
  userId,
  event,
  reason = "",
  reference,
  scoreDelta = 0,
  updates = {},
}: ProcessTrustEventParams) {
  if (!userId || !trustEventTypes.includes(event)) {
    throw new Error("A supported trust event and user ID are required.");
  }

  const current = await getOrCreateUserTrust(supabase, userId);
  const oldScore = Math.round(toNumber(current.internal_trust_score));
  const newScore = oldScore + Math.round(Number(scoreDelta) || 0);

  const { data: updated, error: updateError } = await supabase
    .from("user_trust")
    .update({
      ...updates,
      internal_trust_score: newScore,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();

  if (updateError) {
    throw updateError;
  }

  const { error: eventError } = await supabase.from("trust_events").insert({
    user_id: userId,
    event_type: event,
    old_score: oldScore,
    new_score: newScore,
    reason,
    reference_type: reference?.type || null,
    reference_id: reference?.id || null,
  });

  if (eventError) {
    throw eventError;
  }

  return {
    trust: updated as UserTrustRow,
    badges: buildTrustBadges(updated as UserTrustRow),
  };
}
