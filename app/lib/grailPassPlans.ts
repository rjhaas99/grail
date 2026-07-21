import type {
  GrailPassMembershipStatus,
  GrailPassMembershipType,
} from "./grailPass";

export type GrailPassPlanType = Extract<GrailPassMembershipType, "monthly" | "annual">;

export type GrailPassPlan = {
  type: GrailPassPlanType;
  displayName: string;
  badgeLabel: string;
  amountCents: number;
  currency: "usd";
  interval: "month" | "year";
  intervalLabel: string;
  priceEnvKey: string;
  lookupKey: string;
};

export const grailPassPlans: Record<GrailPassPlanType, GrailPassPlan> = {
  monthly: {
    type: "monthly",
    displayName: "Monthly GRAIL Pass",
    badgeLabel: "GRAIL Pass",
    amountCents: 999,
    currency: "usd",
    interval: "month",
    intervalLabel: "month",
    priceEnvKey: "STRIPE_GRAIL_PASS_MONTHLY_PRICE_ID",
    lookupKey: "grail_pass_monthly",
  },
  annual: {
    type: "annual",
    displayName: "Annual GRAIL Pass",
    badgeLabel: "GRAIL Pass Annual",
    amountCents: 9900,
    currency: "usd",
    interval: "year",
    intervalLabel: "year",
    priceEnvKey: "STRIPE_GRAIL_PASS_ANNUAL_PRICE_ID",
    lookupKey: "grail_pass_annual",
  },
};

export const grailPassPlanList = [grailPassPlans.monthly, grailPassPlans.annual];

export function isGrailPassPlanType(value: unknown): value is GrailPassPlanType {
  return value === "monthly" || value === "annual";
}

export function formatGrailPassPlanPrice(plan: GrailPassPlan) {
  const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: plan.amountCents % 100 === 0 ? 0 : 2,
  }).format(plan.amountCents / 100);

  return `${amount}/${plan.intervalLabel}`;
}

export function mapStripeSubscriptionStatus(
  status?: string | null,
): GrailPassMembershipStatus {
  if (status === "active" || status === "trialing" || status === "past_due") {
    return status;
  }

  if (status === "canceled") {
    return "canceled";
  }

  if (status === "incomplete") {
    return "incomplete";
  }

  if (status === "incomplete_expired") {
    return "expired";
  }

  if (status === "unpaid") {
    return "past_due";
  }

  return "expired";
}

export function getGrailPassStatusLabel(status?: string | null) {
  const normalized = mapStripeSubscriptionStatus(status);

  if (normalized === "past_due") {
    return "Past Due";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function isGrailPassSubscriptionEntitled(
  status?: string | null,
) {
  const normalized = mapStripeSubscriptionStatus(status);

  return normalized === "active" || normalized === "trialing";
}
