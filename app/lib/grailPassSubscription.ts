import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import Stripe from "stripe";
import {
  grailPassMembershipCatalog,
  noGrailPassMembership,
  normalizeGrailPassMembership,
  type GrailPassMembership,
} from "./grailPass";
import {
  grailPassPlanList,
  grailPassPlans,
  isGrailPassPlanType,
  isGrailPassSubscriptionEntitled,
  mapStripeSubscriptionStatus,
  type GrailPassPlan,
  type GrailPassPlanType,
} from "./grailPassPlans";
import { getConfiguredSiteUrl, siteConfig, trimTrailingSlash } from "./siteConfig";

export type GrailPassSubscriptionRow = {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  stripe_price_id: string | null;
  plan: string | null;
  status: string | null;
  cancel_at_period_end: boolean | null;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_end: string | null;
  canceled_at: string | null;
  ended_at: string | null;
  latest_invoice_id: string | null;
  latest_invoice_status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type GrailPassBillingHistoryItem = {
  id: string;
  date: string | null;
  amount: number | null;
  currency: string;
  status: string;
  invoiceUrl: string | null;
  hostedInvoiceUrl: string | null;
};

export type GrailPassSubscriptionDTO = {
  membership: GrailPassMembership;
  subscription: {
    id: string;
    stripeSubscriptionId: string;
    stripeCustomerId: string;
    stripePriceId: string | null;
    plan: GrailPassPlanType;
    status: GrailPassMembership["status"];
    cancelAtPeriodEnd: boolean;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    trialEnd: string | null;
    canceledAt: string | null;
    endedAt: string | null;
    latestInvoiceId: string | null;
    latestInvoiceStatus: string | null;
  } | null;
  billingHistory: GrailPassBillingHistoryItem[];
};

type ServiceSupabaseClient = SupabaseClient;

type StripeSubscriptionRecord = Stripe.Subscription & {
  current_period_start?: number | null;
  current_period_end?: number | null;
};

type StripeInvoiceRecord = Stripe.Invoice & {
  subscription?: string | Stripe.Subscription | null;
  invoice_pdf?: string | null;
  hosted_invoice_url?: string | null;
};

export class GrailPassDatabaseSetupError extends Error {
  constructor(message = "GRAIL Pass database setup is incomplete.") {
    super(message);
    this.name = "GrailPassDatabaseSetupError";
  }
}

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

export function createAnonSupabaseClient() {
  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { persistSession: false } },
  );
}

export function createServiceSupabaseClient() {
  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
  );
}

export function getBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") || "";

  return authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
}

export function hasSessionCookie(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";

  return /\bsb-[^=]+-auth-token=/.test(cookieHeader) ||
    cookieHeader.includes("supabase-auth-token");
}

export function getGrailPassAuthDiagnostics(request: Request) {
  return {
    authHeaderPresent: Boolean(getBearerToken(request)),
    sessionCookiePresent: hasSessionCookie(request),
  };
}

export async function getAuthenticatedUser(request: Request) {
  const token = getBearerToken(request);

  if (!token) {
    return { user: null, error: "Missing authorization token." };
  }

  const supabase = createAnonSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error) {
    console.error("GRAIL Pass auth error:", error);
  }

  return { user, error: error?.message || null };
}

function normalizeConfiguredUrl(value: string) {
  return trimTrailingSlash(value.startsWith("http") ? value : `https://${value}`);
}

function canonicalizeProductionUrl(value: string) {
  try {
    const url = new URL(value);

    if (
      process.env.NODE_ENV === "production" &&
      (url.hostname === "grailcollects.com" || url.hostname.endsWith(".vercel.app"))
    ) {
      return siteConfig.productionUrl;
    }
  } catch {
    return siteConfig.productionUrl;
  }

  return trimTrailingSlash(value);
}

export function getAppBaseUrl(request?: Request) {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.VERCEL_URL;

  if (process.env.NODE_ENV === "production") {
    const configuredUrl = configured
      ? normalizeConfiguredUrl(configured)
      : getConfiguredSiteUrl();

    return canonicalizeProductionUrl(configuredUrl);
  }

  if (configured) {
    return normalizeConfiguredUrl(configured);
  }

  if (request) {
    return new URL(request.url).origin;
  }

  return "http://localhost:3000";
}

export function getGrailPassCanonicalHost(request?: Request) {
  try {
    return new URL(getAppBaseUrl(request)).host;
  } catch {
    return "unknown";
  }
}

export function logGrailPassDiagnostic(
  event: string,
  request: Request,
  details: Record<string, unknown> = {},
) {
  console.info("GRAIL Pass diagnostic:", {
    event,
    ...getGrailPassAuthDiagnostics(request),
    canonicalHost: getGrailPassCanonicalHost(request),
    ...details,
  });
}

export function isMissingGrailPassSchemaError(error: unknown) {
  const record = error as {
    code?: string;
    message?: string;
    details?: string | null;
    hint?: string | null;
  };
  const combined = [
    record?.code || "",
    record?.message || "",
    record?.details || "",
    record?.hint || "",
  ].join(" ");

  return (
    record?.code === "PGRST205" ||
    combined.includes("grail_pass_subscriptions") ||
    combined.includes("grail_pass_webhook_events")
  ) && (
    combined.includes("Could not find the table") ||
    combined.includes("schema cache") ||
    combined.includes("relation") ||
    record?.code === "PGRST205"
  );
}

export function getGrailPassErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");

  if (error instanceof GrailPassDatabaseSetupError || isMissingGrailPassSchemaError(error)) {
    return {
      error: "GRAIL Pass database setup is incomplete.",
      status: 503,
      failureBranch: "database_setup_missing",
    };
  }

  if (message.includes("STRIPE_SECRET_KEY")) {
    return {
      error: "GRAIL Pass billing is not configured.",
      status: 503,
      failureBranch: "stripe_configuration_missing",
    };
  }

  if (
    message.includes("STRIPE_GRAIL_PASS") ||
    message.includes("lookup key") ||
    message.includes("configured GRAIL Pass plan")
  ) {
    return {
      error: "GRAIL Pass plan configuration is incomplete.",
      status: 503,
      failureBranch: "plan_configuration_missing",
    };
  }

  if (error instanceof Stripe.errors.StripeError) {
    return {
      error: "Stripe could not complete the GRAIL Pass request.",
      status: 502,
      failureBranch: "stripe_api_failure",
    };
  }

  return {
    error: "GRAIL Pass request could not be completed.",
    status: 500,
    failureBranch: "unknown_failure",
  };
}

function toIsoFromUnix(value?: number | null) {
  return value ? new Date(value * 1000).toISOString() : null;
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function centsToCurrency(cents?: number | null) {
  if (cents === null || cents === undefined) {
    return null;
  }

  return Math.round(cents) / 100;
}

function getSubscriptionTimestamp(
  subscription: Stripe.Subscription,
  key: "current_period_start" | "current_period_end",
) {
  const record = subscription as StripeSubscriptionRecord;
  const direct = record[key];

  if (typeof direct === "number") {
    return direct;
  }

  const item = subscription.items?.data?.[0] as
    | (Stripe.SubscriptionItem & {
        current_period_start?: number | null;
        current_period_end?: number | null;
      })
    | undefined;
  const itemValue = item?.[key];

  return typeof itemValue === "number" ? itemValue : null;
}

export function getSubscriptionPlanFromStripe(
  subscription: Stripe.Subscription,
): GrailPassPlanType {
  const metadataPlan = subscription.metadata?.grailPassPlan;

  if (isGrailPassPlanType(metadataPlan)) {
    return metadataPlan;
  }

  const price = subscription.items?.data?.[0]?.price;
  const lookupKey = price?.lookup_key || "";
  const matchingLookupPlan = grailPassPlanList.find(
    (plan) => plan.lookupKey === lookupKey,
  );

  if (matchingLookupPlan) {
    return matchingLookupPlan.type;
  }

  const amount = Number(price?.unit_amount || 0);
  const interval = price?.recurring?.interval;
  const matchingAmountPlan = grailPassPlanList.find(
    (plan) => plan.amountCents === amount && plan.interval === interval,
  );

  return matchingAmountPlan?.type || "monthly";
}

export function isStripeGrailPassSubscription(subscription: Stripe.Subscription) {
  return (
    subscription.metadata?.type === "grail_pass_subscription" ||
    subscription.metadata?.grailProduct === "grail_pass" ||
    isGrailPassPlanType(subscription.metadata?.grailPassPlan)
  );
}

function getSubscriptionPriceId(subscription: Stripe.Subscription) {
  return subscription.items?.data?.[0]?.price?.id || null;
}

function getSubscriptionLatestInvoiceId(subscription: Stripe.Subscription) {
  const latestInvoice = subscription.latest_invoice;

  if (!latestInvoice) {
    return null;
  }

  return typeof latestInvoice === "string" ? latestInvoice : latestInvoice.id;
}

function getSubscriptionLatestInvoiceStatus(subscription: Stripe.Subscription) {
  const latestInvoice = subscription.latest_invoice;

  if (!latestInvoice || typeof latestInvoice === "string") {
    return null;
  }

  return latestInvoice.status || null;
}

function getCustomerId(value: string | Stripe.Customer | Stripe.DeletedCustomer | null) {
  if (!value) {
    return "";
  }

  return typeof value === "string" ? value : value.id;
}

export function mapGrailPassSubscriptionRow(
  row: GrailPassSubscriptionRow | null,
): GrailPassSubscriptionDTO {
  if (!row || !isGrailPassPlanType(row.plan)) {
    return {
      membership: normalizeGrailPassMembership(noGrailPassMembership),
      subscription: null,
      billingHistory: [],
    };
  }

  const status = mapStripeSubscriptionStatus(row.status);
  const catalogMembership = grailPassMembershipCatalog[row.plan];
  const membership = normalizeGrailPassMembership({
    ...catalogMembership,
    status,
    startedAt: row.current_period_start || row.created_at,
    renewsAt: row.current_period_end,
  });

  return {
    membership,
    subscription: {
      id: row.id,
      stripeSubscriptionId: row.stripe_subscription_id,
      stripeCustomerId: row.stripe_customer_id,
      stripePriceId: row.stripe_price_id,
      plan: row.plan,
      status,
      cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
      currentPeriodStart: row.current_period_start,
      currentPeriodEnd: row.current_period_end,
      trialEnd: row.trial_end,
      canceledAt: row.canceled_at,
      endedAt: row.ended_at,
      latestInvoiceId: row.latest_invoice_id,
      latestInvoiceStatus: row.latest_invoice_status,
    },
    billingHistory: [],
  };
}

export async function getStoredGrailPassSubscription(
  supabase: ServiceSupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("grail_pass_subscriptions")
    .select(
      "id, user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, plan, status, cancel_at_period_end, current_period_start, current_period_end, trial_end, canceled_at, ended_at, latest_invoice_id, latest_invoice_status, created_at, updated_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("GRAIL Pass subscription fetch error:", {
      error,
      errorMessage: error.message,
      errorCode: error.code || null,
      userId,
    });
    if (isMissingGrailPassSchemaError(error)) {
      throw new GrailPassDatabaseSetupError();
    }

    throw new Error("GRAIL Pass subscription state is temporarily unavailable.");
  }

  return (data || null) as GrailPassSubscriptionRow | null;
}

export async function getGrailPassSubscriptionForUser(
  supabase: ServiceSupabaseClient,
  userId: string,
): Promise<GrailPassSubscriptionDTO> {
  return mapGrailPassSubscriptionRow(
    await getStoredGrailPassSubscription(supabase, userId),
  );
}

export async function markStripeWebhookEventProcessed(
  supabase: ServiceSupabaseClient,
  event: Stripe.Event,
) {
  const stripeObject = event.data.object as { id?: string };
  const { error } = await supabase
    .from("grail_pass_webhook_events")
    .insert({
      event_id: event.id,
      event_type: event.type,
      stripe_object_id: stripeObject.id || null,
    });

  if (!error) {
    return true;
  }

  if (error.code === "23505") {
    return false;
  }

  console.error("GRAIL Pass webhook event idempotency error:", {
    error,
    errorMessage: error.message,
    eventId: event.id,
    eventType: event.type,
  });
  throw error;
}

export async function resolveGrailPassUserIdForStripeSubscription(
  stripe: Stripe,
  subscription: Stripe.Subscription,
) {
  const subscriptionUserId = subscription.metadata?.grailUserId;

  if (subscriptionUserId) {
    return subscriptionUserId;
  }

  const customerId = getCustomerId(subscription.customer);

  if (!customerId) {
    return "";
  }

  const customer = await stripe.customers.retrieve(customerId);

  if (!customer.deleted && customer.metadata?.grailUserId) {
    return customer.metadata.grailUserId;
  }

  return "";
}

export async function syncGrailPassSubscriptionFromStripe({
  stripe,
  supabase,
  subscription,
  userId,
}: {
  stripe: Stripe;
  supabase: ServiceSupabaseClient;
  subscription: Stripe.Subscription;
  userId?: string | null;
}) {
  const resolvedUserId =
    userId || (await resolveGrailPassUserIdForStripeSubscription(stripe, subscription));

  if (!resolvedUserId) {
    throw new Error("Stripe subscription is missing GRAIL user metadata.");
  }

  const customerId = getCustomerId(subscription.customer);

  if (!customerId) {
    throw new Error("Stripe subscription is missing a customer.");
  }

  const plan = getSubscriptionPlanFromStripe(subscription);
  const status = mapStripeSubscriptionStatus(subscription.status);
  const currentPeriodStart = getSubscriptionTimestamp(
    subscription,
    "current_period_start",
  );
  const currentPeriodEnd = getSubscriptionTimestamp(subscription, "current_period_end");

  const payload = {
    user_id: resolvedUserId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: getSubscriptionPriceId(subscription),
    plan,
    status,
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    current_period_start: toIsoFromUnix(currentPeriodStart),
    current_period_end: toIsoFromUnix(currentPeriodEnd),
    trial_end: toIsoFromUnix(subscription.trial_end),
    canceled_at: toIsoFromUnix(subscription.canceled_at),
    ended_at: toIsoFromUnix(subscription.ended_at),
    latest_invoice_id: getSubscriptionLatestInvoiceId(subscription),
    latest_invoice_status: getSubscriptionLatestInvoiceStatus(subscription),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("grail_pass_subscriptions")
    .upsert(payload, { onConflict: "user_id" })
    .select(
      "id, user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, plan, status, cancel_at_period_end, current_period_start, current_period_end, trial_end, canceled_at, ended_at, latest_invoice_id, latest_invoice_status, created_at, updated_at",
    )
    .maybeSingle();

  if (error) {
    console.error("GRAIL Pass subscription sync error:", {
      error,
      errorMessage: error.message,
      errorCode: error.code || null,
      userId: resolvedUserId,
      stripeSubscriptionId: subscription.id,
    });
    if (isMissingGrailPassSchemaError(error)) {
      throw new GrailPassDatabaseSetupError();
    }

    throw new Error("GRAIL Pass subscription could not be synchronized.");
  }

  return data as GrailPassSubscriptionRow;
}

export async function getActiveStripeGrailPassSubscription(
  stripe: Stripe,
  customerId: string,
) {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
    expand: ["data.latest_invoice"],
  });

  return subscriptions.data.find((subscription) => {
    const entitled = isGrailPassSubscriptionEntitled(subscription.status);
    const incomplete = mapStripeSubscriptionStatus(subscription.status) === "incomplete";

    return (
      isStripeGrailPassSubscription(subscription) && (entitled || incomplete)
    );
  }) || null;
}

async function getConfiguredPrice(stripe: Stripe, plan: GrailPassPlan) {
  const configuredPriceId = process.env[plan.priceEnvKey];

  if (!configuredPriceId) {
    return null;
  }

  const price = await stripe.prices.retrieve(configuredPriceId);

  if (
    price.unit_amount !== plan.amountCents ||
    price.currency !== plan.currency ||
    price.recurring?.interval !== plan.interval
  ) {
    throw new Error(
      `${plan.priceEnvKey} does not match ${plan.displayName} ${plan.amountCents / 100}/${plan.interval}.`,
    );
  }

  return price;
}

async function getOrCreateGrailPassProduct(stripe: Stripe) {
  const configuredProductId = process.env.STRIPE_GRAIL_PASS_PRODUCT_ID;

  if (configuredProductId) {
    return configuredProductId;
  }

  const products = await stripe.products.list({
    active: true,
    limit: 100,
  });
  const existing = products.data.find(
    (product) =>
      product.metadata?.grailProduct === "grail_pass" ||
      product.name === "GRAIL Pass",
  );

  if (existing) {
    return existing.id;
  }

  const product = await stripe.products.create({
    name: "GRAIL Pass",
    metadata: {
      grailProduct: "grail_pass",
      source: "grail",
    },
  });

  return product.id;
}

export async function getOrCreateGrailPassPrice(
  stripe: Stripe,
  planType: GrailPassPlanType,
) {
  const plan = grailPassPlans[planType];
  const configuredPrice = await getConfiguredPrice(stripe, plan);

  if (configuredPrice) {
    return configuredPrice;
  }

  const lookupResult = await stripe.prices.list({
    active: true,
    lookup_keys: [plan.lookupKey],
    limit: 1,
  });
  const existingPrice = lookupResult.data[0];

  if (existingPrice) {
    if (
      existingPrice.unit_amount !== plan.amountCents ||
      existingPrice.currency !== plan.currency ||
      existingPrice.recurring?.interval !== plan.interval
    ) {
      throw new Error(
        `Stripe lookup key ${plan.lookupKey} does not match the configured GRAIL Pass plan.`,
      );
    }

    return existingPrice;
  }

  const product = await getOrCreateGrailPassProduct(stripe);

  return stripe.prices.create({
    product,
    currency: plan.currency,
    unit_amount: plan.amountCents,
    recurring: {
      interval: plan.interval,
    },
    lookup_key: plan.lookupKey,
    metadata: {
      type: "grail_pass_subscription",
      grailProduct: "grail_pass",
      grailPassPlan: plan.type,
    },
  });
}

export async function listGrailPassBillingHistory({
  stripe,
  customerId,
  subscriptionId,
}: {
  stripe: Stripe;
  customerId: string;
  subscriptionId?: string | null;
}): Promise<GrailPassBillingHistoryItem[]> {
  const invoices = await stripe.invoices.list({
    customer: customerId,
    subscription: subscriptionId || undefined,
    limit: 12,
  });

  return invoices.data.map((invoice) => {
    const record = invoice as StripeInvoiceRecord;

    return {
      id: invoice.id || `invoice:${invoice.created}`,
      date: toIsoFromUnix(invoice.created),
      amount: centsToCurrency(invoice.amount_paid || invoice.amount_due),
      currency: invoice.currency || "usd",
      status: invoice.status || "unknown",
      invoiceUrl: record.invoice_pdf || null,
      hostedInvoiceUrl: record.hosted_invoice_url || null,
    };
  });
}

export function getGrailPassMonthlyCreditAmount() {
  return 0;
}

export async function grantGrailPassMonthlyCreditForInvoice({
  subscription,
}: {
  supabase: ServiceSupabaseClient;
  subscription: Stripe.Subscription;
  invoice?: Stripe.Invoice | null;
}) {
  if (!isGrailPassSubscriptionEntitled(subscription.status)) {
    return { granted: false, reason: "Subscription is not active." };
  }

  return {
    granted: false,
    reason: "Automatic monthly GRAIL Credit is disabled.",
  };
}

export async function syncSubscriptionFromInvoice({
  stripe,
  supabase,
  invoice,
}: {
  stripe: Stripe;
  supabase: ServiceSupabaseClient;
  invoice: Stripe.Invoice;
}) {
  const invoiceRecord = invoice as StripeInvoiceRecord;
  const subscriptionId =
    typeof invoiceRecord.subscription === "string"
      ? invoiceRecord.subscription
      : invoiceRecord.subscription?.id || "";

  if (!subscriptionId) {
    return null;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["latest_invoice"],
  });

  if (!isStripeGrailPassSubscription(subscription)) {
    return null;
  }

  const row = await syncGrailPassSubscriptionFromStripe({
    stripe,
    supabase,
    subscription,
  });

  return { subscription, row };
}

export function getSubscriptionManageableState(row: GrailPassSubscriptionRow | null) {
  if (!row) {
    return {
      canCancel: false,
      canResume: false,
      canUpgrade: false,
    };
  }

  const entitled = isGrailPassSubscriptionEntitled(row.status);
  const plan = isGrailPassPlanType(row.plan) ? row.plan : null;

  return {
    canCancel: entitled && !row.cancel_at_period_end,
    canResume: entitled && Boolean(row.cancel_at_period_end),
    canUpgrade: entitled && plan === "monthly",
  };
}

export function buildGrailPassPlansPayload() {
  return grailPassPlanList.map((plan) => ({
    type: plan.type,
    displayName: plan.displayName,
    badgeLabel: plan.badgeLabel,
    amount: toNumber(plan.amountCents) / 100,
    amountCents: plan.amountCents,
    currency: plan.currency,
    interval: plan.interval,
    intervalLabel: plan.intervalLabel,
  }));
}

export type AuthenticatedGrailPassRequest = {
  user: User;
  supabase: ServiceSupabaseClient;
};
