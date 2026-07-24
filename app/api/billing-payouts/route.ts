import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  getGrailPassMonthlyCreditAmount,
  getGrailPassSubscriptionForUser,
  getStoredGrailPassSubscription,
  getSubscriptionManageableState,
  listGrailPassBillingHistory,
} from "../../lib/grailPassSubscription";
import { noGrailPassMembership } from "../../lib/grailPass";
import { getGrailPassRewardBoostConfig } from "../../lib/grailPassRewards";
import { getRewardEngineSnapshot } from "../../lib/rewardsEngine";
import {
  createStripeClient,
  findStripeCustomerForUser,
  getStripeProcessingConfiguration,
} from "../../lib/stripeCustomers";

export const runtime = "nodejs";

type SectionStatus = "empty" | "connected" | "partial" | "error";

type SellerAccountRow = {
  stripe_account_id: string | null;
  onboarding_status: string | null;
  details_submitted: boolean | null;
  charges_enabled: boolean | null;
  payouts_enabled: boolean | null;
  requirements_due?: string[] | null;
  disabled_reason?: string | null;
  updated_at?: string | null;
};

type OrderRow = {
  id: string;
  listing_id: string | null;
  buyer_id: string | null;
  seller_id: string | null;
  total_amount: number | string | null;
  card_price: number | string | null;
  buyer_fee?: number | string | null;
  platform_fee?: number | string | null;
  processing_fee?: number | string | null;
  seller_payout_amount: number | string | null;
  shipping_amount?: number | string | null;
  shipping_profile_id?: string | null;
  shipping_profile_label?: string | null;
  label_cost?: number | string | null;
  label_url?: string | null;
  shippo_transaction_id?: string | null;
  shippo_label_purchased_at?: string | null;
  status: string | null;
  transfer_status: string | null;
  refund_status: string | null;
  dispute_status: string | null;
  stripe_transfer_id: string | null;
  stripe_refund_id?: string | null;
  fulfillment_status?: string | null;
  created_at: string | null;
  completed_at?: string | null;
  payout_released_at?: string | null;
  dispute_opened_at?: string | null;
};

type ListingRow = {
  id: string;
  title: string | null;
};

type WalletLedgerRow = {
  id: string;
  type: string | null;
  amount: number | string | null;
  title: string | null;
  description: string | null;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string | null;
};

type MarketplaceSettingRow = {
  key: string;
  value: boolean | string | number | null;
};

type FeesSection = {
  status: SectionStatus;
  error?: string;
  sellerMarketplaceFee: {
    percent: number | null;
    rewardTier: string | null;
    level: number | null;
  };
  paymentProcessing: ReturnType<typeof getStripeProcessingConfiguration>;
  shippingLabels: {
    label: string;
  };
  buyerProtection: {
    configured: boolean;
    enabled: boolean | string | number | null;
    feePercent: number | null;
    label: string;
    description: string;
  };
};

type ShippingSection = {
  status: SectionStatus;
  error?: string;
  providerConnection: string;
  easyPostStatus: string;
  labelsPurchased: number | null;
  shippingCollected: number | null;
  totalShippingCost: number | null;
  shippingDifference: number | null;
  lastShippingMethod: string | null;
  lastLabelPurchased: string | null;
  note: string;
};

type BillingHistoryItem = {
  id: string;
  date: string | null;
  amount: number | null;
  currency: string;
  status: string;
  invoiceUrl: string | null;
  hostedInvoiceUrl: string | null;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function createAnonSupabaseClient() {
  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { persistSession: false } },
  );
}

function createServiceSupabaseClient() {
  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
  );
}

function getBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") || "";

  return authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
}

async function getCurrentUser(request: Request) {
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
    console.error("Billing payouts auth error:", error);
  }

  return { user, error: error?.message || null };
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function centsToCurrencyValue(cents: number) {
  return roundCurrency(cents / 100);
}

function sumStripeBalance(entries: Array<{ amount: number; currency: string }>) {
  const usdCents = entries
    .filter((entry) => entry.currency.toLowerCase() === "usd")
    .reduce((total, entry) => total + entry.amount, 0);

  return centsToCurrencyValue(usdCents);
}

function getStripeDate(timestamp?: number | null) {
  return timestamp ? new Date(timestamp * 1000).toISOString() : null;
}

function getPayoutScheduleLabel(account: Stripe.Account) {
  const schedule = account.settings?.payouts?.schedule;

  if (!schedule?.interval) {
    return null;
  }

  if (schedule.interval === "manual") {
    return "Manual payouts";
  }

  if (schedule.interval === "daily") {
    return "Daily automatic payouts";
  }

  if (schedule.interval === "weekly") {
    return `Weekly automatic payouts${schedule.weekly_anchor ? ` on ${schedule.weekly_anchor}` : ""}`;
  }

  if (schedule.interval === "monthly") {
    return `Monthly automatic payouts${
      schedule.monthly_anchor ? ` on day ${schedule.monthly_anchor}` : ""
    }`;
  }

  return `${schedule.interval} payouts`;
}

function describeExternalAccount(account: Stripe.ExternalAccount | undefined) {
  if (!account) {
    return null;
  }

  if (account.object === "bank_account") {
    return {
      label: account.bank_name || "Connected bank",
      detail: account.last4 ? `Ending ${account.last4}` : "Bank account connected",
    };
  }

  if (account.object === "card") {
    return {
      label: `${account.brand || "Card"} payout card`,
      detail: account.last4 ? `Ending ${account.last4}` : "Payout card connected",
    };
  }

  return {
    label: "Payout account connected",
    detail: "External payout account on file",
  };
}

function mapPaymentMethod(
  method: Stripe.PaymentMethod,
  defaultPaymentMethodId: string | null,
) {
  const card = method.card;

  return {
    id: method.id,
    brand: card?.brand || "card",
    last4: card?.last4 || "",
    expMonth: card?.exp_month || null,
    expYear: card?.exp_year || null,
    isDefault: method.id === defaultPaymentMethodId,
  };
}

async function loadPaymentMethods(stripe: Stripe | null, user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>["user"]>) {
  if (!stripe) {
    return {
      status: "error" as SectionStatus,
      error: "Stripe billing is temporarily unavailable.",
      methods: [],
    };
  }

  const customer = await findStripeCustomerForUser({ stripe, user });

  if (!customer) {
    return {
      status: "empty" as SectionStatus,
      methods: [],
    };
  }

  const [customerRecord, paymentMethods] = await Promise.all([
    stripe.customers.retrieve(customer.id),
    stripe.paymentMethods.list({
      customer: customer.id,
      type: "card",
    }),
  ]);
  const defaultPaymentMethod =
    !customerRecord.deleted &&
    typeof customerRecord.invoice_settings?.default_payment_method === "string"
      ? customerRecord.invoice_settings.default_payment_method
      : null;
  const methods = paymentMethods.data.map((method) =>
    mapPaymentMethod(method, defaultPaymentMethod),
  );

  return {
    status: methods.length > 0 ? ("connected" as SectionStatus) : ("empty" as SectionStatus),
    customerId: customer.id,
    defaultPaymentMethodId: defaultPaymentMethod,
    methods,
  };
}

async function loadPayouts({
  supabase,
  stripe,
  userId,
}: {
  supabase: ReturnType<typeof createServiceSupabaseClient>;
  stripe: Stripe | null;
  userId: string;
}) {
  const { data, error } = await supabase
    .from("seller_accounts")
    .select(
      "stripe_account_id, onboarding_status, details_submitted, charges_enabled, payouts_enabled, requirements_due, disabled_reason, updated_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const sellerAccount = data as SellerAccountRow | null;
  const stripeAccountId = sellerAccount?.stripe_account_id || "";

  if (!stripeAccountId) {
    return {
      status: "empty" as SectionStatus,
      connected: false,
      accountState: "Not connected",
      onboardingStatus: "not_connected",
      chargesEnabled: false,
      payoutsEnabled: false,
      availableBalance: null,
      pendingBalance: null,
      processingBalance: null,
      estimatedNextPayout: null,
      payoutBank: null,
      lastPayout: null,
    };
  }

  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("seller_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (orderError) {
    throw new Error(orderError.message);
  }

  const orders = (orderData || []) as OrderRow[];
  const processingBalance = roundCurrency(
    orders
      .filter(
        (order) =>
          !["paid", "refunded"].includes(order.transfer_status || "") &&
          !["refunded"].includes(order.refund_status || ""),
      )
      .reduce((total, order) => total + toNumber(order.seller_payout_amount), 0),
  );

  if (!stripe) {
    return {
      status: "partial" as SectionStatus,
      connected: true,
      stripeAccountId,
      maskedAccountId: stripeAccountId.length > 8
        ? `${stripeAccountId.slice(0, 5)}****${stripeAccountId.slice(-4)}`
        : "Connected",
      accountState: sellerAccount?.onboarding_status || "Connected",
      onboardingStatus: sellerAccount?.onboarding_status || "unknown",
      chargesEnabled: Boolean(sellerAccount?.charges_enabled),
      payoutsEnabled: Boolean(sellerAccount?.payouts_enabled),
      availableBalance: null,
      pendingBalance: null,
      processingBalance,
      estimatedNextPayout: null,
      payoutBank: null,
      lastPayout: null,
      error: "Stripe balance data is temporarily unavailable.",
    };
  }

  const [account, balance, payouts] = await Promise.all([
    stripe.accounts.retrieve(stripeAccountId, { expand: ["external_accounts"] }),
    stripe.balance.retrieve({}, { stripeAccount: stripeAccountId }),
    stripe.payouts.list({ limit: 10 }, { stripeAccount: stripeAccountId }),
  ]);
  const requirementsDue = account.requirements?.currently_due || [];
  const externalAccount = account.external_accounts?.data?.[0];
  const payoutBank = describeExternalAccount(externalAccount);
  const upcomingPayout = payouts.data.find((payout) =>
    ["pending", "in_transit"].includes(payout.status),
  );
  const lastPaidPayout =
    payouts.data.find((payout) => payout.status === "paid") || payouts.data[0] || null;
  const scheduleLabel = getPayoutScheduleLabel(account);
  const accountState = account.payouts_enabled
    ? "Payouts enabled"
    : account.details_submitted
      ? "Under review"
      : "Setup incomplete";

  return {
    status: account.payouts_enabled
      ? ("connected" as SectionStatus)
      : ("partial" as SectionStatus),
    connected: true,
    stripeAccountId,
    maskedAccountId: stripeAccountId.length > 8
      ? `${stripeAccountId.slice(0, 5)}****${stripeAccountId.slice(-4)}`
      : "Connected",
    accountState,
    onboardingStatus: account.payouts_enabled
      ? "complete"
      : account.details_submitted
        ? "pending"
        : "incomplete",
    detailsSubmitted: Boolean(account.details_submitted),
    chargesEnabled: Boolean(account.charges_enabled),
    payoutsEnabled: Boolean(account.payouts_enabled),
    requirementsCount: requirementsDue.length,
    requirementsDue,
    disabledReason: account.requirements?.disabled_reason || null,
    availableBalance: sumStripeBalance(balance.available),
    pendingBalance: sumStripeBalance(balance.pending),
    processingBalance,
    estimatedNextPayout: upcomingPayout
      ? {
          amount: centsToCurrencyValue(upcomingPayout.amount),
          currency: upcomingPayout.currency,
          arrivalAt: getStripeDate(upcomingPayout.arrival_date),
          status: upcomingPayout.status,
        }
      : scheduleLabel
        ? {
            amount: null,
            currency: "usd",
            arrivalAt: null,
            status: scheduleLabel,
          }
        : null,
    payoutBank,
    lastPayout: lastPaidPayout
      ? {
          amount: centsToCurrencyValue(lastPaidPayout.amount),
          currency: lastPaidPayout.currency,
          arrivalAt: getStripeDate(lastPaidPayout.arrival_date),
          status: lastPaidPayout.status,
        }
      : null,
  };
}

async function loadFees({
  supabase,
  userId,
}: {
  supabase: ReturnType<typeof createServiceSupabaseClient>;
  userId: string;
}): Promise<FeesSection> {
  const [rewardSnapshot, settingsResult] = await Promise.all([
    getRewardEngineSnapshot(supabase, userId),
    supabase
      .from("marketplace_settings")
      .select("key, value")
      .in("key", [
        "buyer_protection_enabled",
        "buyer_protection_fee_percent",
        "buyer_protection_label",
        "buyer_protection_description",
      ]),
  ]);

  const settings = ((settingsResult.data || []) as MarketplaceSettingRow[]).reduce<
    Record<string, boolean | string | number | null>
  >((items, row) => {
    items[row.key] = row.value;
    return items;
  }, {});
  const sellerFeePercent: number | null =
    rewardSnapshot.economy.sellerFeePercent ?? null;
  const sellerLevel: number | null = rewardSnapshot.level ?? null;

  return {
    status: sellerFeePercent === null ? ("partial" as SectionStatus) : ("connected" as SectionStatus),
    sellerMarketplaceFee: {
      percent: sellerFeePercent,
      rewardTier: rewardSnapshot.economy.currentRank,
      level: sellerLevel,
    },
    paymentProcessing: getStripeProcessingConfiguration(),
    shippingLabels: {
      label: "Charged at cost.",
    },
    buyerProtection: {
      configured: Object.keys(settings).length > 0,
      enabled: settings.buyer_protection_enabled ?? null,
      feePercent:
        settings.buyer_protection_fee_percent === undefined
          ? null
          : Number(settings.buyer_protection_fee_percent),
      label: String(settings.buyer_protection_label || "GRAIL Buyer Protection"),
      description:
        typeof settings.buyer_protection_description === "string"
          ? settings.buyer_protection_description
          : "Buyer protection pricing is unavailable.",
    },
  };
}

async function loadShipping({
  supabase,
  userId,
}: {
  supabase: ReturnType<typeof createServiceSupabaseClient>;
  userId: string;
}): Promise<ShippingSection> {
  const shippoConfigured = Boolean(process.env.SHIPPO_API_KEY);
  const { data, error } = await supabase
    .from("orders")
    .select("id, shipping_amount, shipping_profile_id, shipping_profile_label, label_cost, label_url, shippo_transaction_id, shippo_label_purchased_at, shipped_at, created_at")
    .eq("seller_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(error.message);
  }

  const labelOrders = (data || []) as Array<{
    shipping_amount?: number | string | null;
    shipping_profile_id?: string | null;
    shipping_profile_label?: string | null;
    label_cost?: number | string | null;
    label_url?: string | null;
    shippo_transaction_id?: string | null;
    shippo_label_purchased_at?: string | null;
    shipped_at?: string | null;
    created_at?: string | null;
  }>;
  const labelsPurchased = labelOrders.filter((order) =>
    order.shippo_transaction_id || order.label_url,
  ).length;
  const shippingCollected = roundCurrency(
    labelOrders.reduce((total, order) => total + toNumber(order.shipping_amount), 0),
  );
  const totalShippingCost = roundCurrency(
    labelOrders.reduce((total, order) => total + toNumber(order.label_cost), 0),
  );
  const shippingDifference = roundCurrency(shippingCollected - totalShippingCost);
  const lastLabel = labelOrders.find((order) =>
    order.shippo_label_purchased_at || order.shipped_at,
  );

  return {
    status: shippoConfigured
      ? labelsPurchased > 0
        ? ("connected" as SectionStatus)
        : ("partial" as SectionStatus)
      : ("empty" as SectionStatus),
    providerConnection: shippoConfigured
      ? "Shippo Connected"
      : "No shipping provider connected",
    easyPostStatus: shippoConfigured
      ? "Shippo API key configured"
      : "Shippo not connected",
    labelsPurchased,
    shippingCollected,
    totalShippingCost,
    shippingDifference,
    lastShippingMethod: labelOrders.find((order) => order.shipping_profile_label)
      ?.shipping_profile_label || null,
    lastLabelPurchased: lastLabel?.shippo_label_purchased_at || lastLabel?.shipped_at || null,
    note: "Buyer-paid shipping and actual label costs are tracked separately.",
  };
}

function getOrderDate(order: OrderRow) {
  return (
    order.payout_released_at ||
    order.completed_at ||
    order.dispute_opened_at ||
    order.created_at ||
    new Date(0).toISOString()
  );
}

function getOrderStatus(order: OrderRow) {
  if (order.refund_status === "refunded") {
    return "Refunded";
  }

  if (["opened", "under_review"].includes(order.dispute_status || "")) {
    return "Dispute review";
  }

  if (order.transfer_status === "paid") {
    return "Paid";
  }

  return order.status || "Processing";
}

function buildOrderTransactions(
  orders: OrderRow[],
  listingsById: Map<string, ListingRow>,
  userId: string,
) {
  return orders.flatMap((order) => {
    const listing = order.listing_id ? listingsById.get(order.listing_id) : null;
    const cardTitle = listing?.title || "GRAIL transaction";
    const createdAt = order.created_at || new Date(0).toISOString();
    const transactions: Array<{
      id: string;
      date: string | null;
      type: string;
      card: string;
      amount: number | null;
      direction: "credit" | "debit" | "neutral";
      status: string;
    }> = [];
    const totalAmount = roundCurrency(toNumber(order.total_amount || order.card_price));
    const cardPrice = roundCurrency(toNumber(order.card_price || order.total_amount));
    const sellerPayout = roundCurrency(toNumber(order.seller_payout_amount));
    const isBuyer = order.buyer_id === userId;
    const isSeller = order.seller_id === userId;

    if (isBuyer && totalAmount > 0) {
      transactions.push({
        id: `purchase:${order.id}`,
        date: createdAt,
        type: "Purchase",
        card: cardTitle,
        amount: -totalAmount,
        direction: "debit",
        status: getOrderStatus(order),
      });
    }

    if (isSeller && cardPrice > 0) {
      transactions.push({
        id: `sale:${order.id}`,
        date: createdAt,
        type: "Sale",
        card: cardTitle,
        amount: cardPrice,
        direction: "credit",
        status: getOrderStatus(order),
      });
    }

    if (isSeller && sellerPayout > 0) {
      transactions.push({
        id: `seller-payout:${order.id}`,
        date: order.payout_released_at || createdAt,
        type: "Seller payout",
        card: cardTitle,
        amount: sellerPayout,
        direction: "credit",
        status: order.transfer_status === "paid" ? "Paid" : "Processing",
      });
    }

    if (order.refund_status === "refunded") {
      transactions.push({
        id: `refund:${order.id}`,
        date: order.completed_at || createdAt,
        type: "Refund",
        card: cardTitle,
        amount: isBuyer ? totalAmount : sellerPayout > 0 ? -sellerPayout : null,
        direction: isBuyer ? "credit" : sellerPayout > 0 ? "debit" : "neutral",
        status: "Refunded",
      });
    }

    if (["opened", "under_review", "resolved"].includes(order.dispute_status || "")) {
      transactions.push({
        id: `dispute:${order.id}`,
        date: order.dispute_opened_at || createdAt,
        type: "Dispute adjustment",
        card: cardTitle,
        amount: null,
        direction: "neutral",
        status:
          order.dispute_status === "resolved"
            ? "Resolved"
            : order.dispute_status === "under_review"
              ? "Under review"
              : "Opened",
      });
    }

    const shippingAmount = roundCurrency(toNumber(order.label_cost || order.shipping_amount));
    if ((order.shippo_transaction_id || order.label_url) && shippingAmount > 0) {
      transactions.push({
        id: `shipping-label:${order.id}`,
        date: order.shippo_label_purchased_at || createdAt,
        type: "Shipping label",
        card: cardTitle,
        amount: -shippingAmount,
        direction: "debit",
        status: "Complete",
      });
    }

    return transactions.map((transaction) => ({
      ...transaction,
      sortDate: new Date(transaction.date || getOrderDate(order)).getTime(),
    }));
  });
}

function buildWalletTransactions(ledger: WalletLedgerRow[]) {
  return ledger
    .filter((entry) => toNumber(entry.amount) > 0)
    .map((entry) => ({
      id: `reward-credit:${entry.id}`,
      date: entry.created_at,
      sortDate: new Date(entry.created_at || 0).getTime(),
      type: "Reward credit",
      card: entry.title || "GRAIL Credit",
      amount: roundCurrency(toNumber(entry.amount)),
      direction: "credit" as const,
      status: "Credited",
    }));
}

async function loadTransactions({
  supabase,
  userId,
}: {
  supabase: ReturnType<typeof createServiceSupabaseClient>;
  userId: string;
}) {
  const [ordersResult, ledgerResult] = await Promise.all([
    supabase
      .from("orders")
      .select("*")
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("wallet_ledger")
      .select("id, type, amount, title, description, reference_type, reference_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  if (ordersResult.error) {
    throw new Error(ordersResult.error.message);
  }

  const orders = (ordersResult.data || []) as OrderRow[];
  const listingIds = Array.from(
    new Set(
      orders
        .map((order) => order.listing_id)
        .filter((listingId): listingId is string => Boolean(listingId)),
    ),
  );
  const listingsById = new Map<string, ListingRow>();

  if (listingIds.length > 0) {
    const { data, error } = await supabase
      .from("listings")
      .select("id, title")
      .in("id", listingIds);

    if (error) {
      console.warn("Billing payouts transaction listing lookup skipped:", {
        error,
        errorMessage: error.message,
        userId,
      });
    } else {
      ((data || []) as ListingRow[]).forEach((listing) => {
        listingsById.set(listing.id, listing);
      });
    }
  }

  const orderTransactions = buildOrderTransactions(orders, listingsById, userId);
  const walletTransactions = ledgerResult.error
    ? []
    : buildWalletTransactions((ledgerResult.data || []) as WalletLedgerRow[]);
  const transactions = [...orderTransactions, ...walletTransactions]
    .sort((left, right) => right.sortDate - left.sortDate)
    .slice(0, 100)
    .map((transaction) => ({
      id: transaction.id,
      date: transaction.date,
      type: transaction.type,
      card: transaction.card,
      amount: transaction.amount,
      direction: transaction.direction,
      status: transaction.status,
    }));

  return {
    status: transactions.length > 0 ? ("connected" as SectionStatus) : ("empty" as SectionStatus),
    transactions,
    warning: ledgerResult.error ? "Reward credit activity could not be loaded." : null,
  };
}

async function loadGrailPassBilling({
  stripe,
  supabase,
  userId,
}: {
  stripe: Stripe | null;
  supabase: ReturnType<typeof createServiceSupabaseClient>;
  userId: string;
}) {
  const row = await getStoredGrailPassSubscription(supabase, userId);
  const subscription = await getGrailPassSubscriptionForUser(supabase, userId);
  let billingHistory: BillingHistoryItem[] = [];

  if (stripe && row?.stripe_customer_id) {
    billingHistory = await listGrailPassBillingHistory({
      stripe,
      customerId: row.stripe_customer_id,
      subscriptionId: row.stripe_subscription_id,
    });
  }

  return {
    status: subscription.subscription ? ("connected" as SectionStatus) : ("empty" as SectionStatus),
    membership: subscription.membership,
    subscription: subscription.subscription,
    billingHistory,
    actions: getSubscriptionManageableState(row),
    monthlyCreditAmount: getGrailPassMonthlyCreditAmount(),
    rewardBoost: getGrailPassRewardBoostConfig(),
  };
}

async function resolveSection<T>(
  loader: () => Promise<T>,
  fallback: T & { status: SectionStatus; error?: string },
) {
  try {
    return await loader();
  } catch (error) {
    console.error("Billing payouts section load error:", error);
    return {
      ...fallback,
      status: "error" as SectionStatus,
      error: error instanceof Error ? error.message : "Section could not be loaded.",
    };
  }
}

export async function GET(request: Request) {
  let supabase;

  try {
    supabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Billing payouts configuration error:", error);
    return NextResponse.json(
      { error: "Billing & Payouts is temporarily unavailable." },
      { status: 500 },
    );
  }

  const { user, error: authError } = await getCurrentUser(request);

  if (authError || !user) {
    return NextResponse.json(
      { error: "Sign in to view Billing & Payouts." },
      { status: 401 },
    );
  }

  let stripe: Stripe | null = null;

  try {
    stripe = createStripeClient();
  } catch (error) {
    console.warn("Billing payouts Stripe configuration unavailable:", error);
  }

  const [paymentMethods, payouts, fees, shipping, grailPass, transactions] = await Promise.all([
    resolveSection(
      () => loadPaymentMethods(stripe, user),
      {
        status: "error" as SectionStatus,
        methods: [],
      },
    ),
    resolveSection(
      () => loadPayouts({ supabase, stripe, userId: user.id }),
      {
        status: "error" as SectionStatus,
        connected: false,
        accountState: "Unavailable",
        onboardingStatus: "unknown",
        chargesEnabled: false,
        payoutsEnabled: false,
        availableBalance: null,
        pendingBalance: null,
        processingBalance: null,
        estimatedNextPayout: null,
        payoutBank: null,
        lastPayout: null,
      },
    ),
    resolveSection(
      () => loadFees({ supabase, userId: user.id }),
      {
        status: "error" as SectionStatus,
        sellerMarketplaceFee: {
          percent: null as number | null,
          rewardTier: null,
          level: null as number | null,
        },
        paymentProcessing: getStripeProcessingConfiguration(),
        shippingLabels: {
          label: "Charged at cost.",
        },
        buyerProtection: {
          configured: false,
          enabled: null,
          feePercent: null,
          label: "GRAIL Buyer Protection",
          description: "Buyer protection pricing is unavailable.",
        },
      },
    ),
    resolveSection(() => loadShipping({ supabase, userId: user.id }), {
      status: "empty" as SectionStatus,
      providerConnection: "No shipping provider connected",
      easyPostStatus: "Shippo not connected",
      labelsPurchased: null,
      shippingCollected: null,
      totalShippingCost: null,
      shippingDifference: null,
      lastShippingMethod: null,
      lastLabelPurchased: null,
      note: "No labels purchased yet.",
    }),
    resolveSection(
      () => loadGrailPassBilling({ stripe, supabase, userId: user.id }),
      {
        status: "error" as SectionStatus,
        membership: noGrailPassMembership,
        subscription: null,
        billingHistory: [] as BillingHistoryItem[],
        actions: {
          canCancel: false,
          canResume: false,
          canUpgrade: false,
        },
        monthlyCreditAmount: 0,
        rewardBoost: getGrailPassRewardBoostConfig(),
      },
    ),
    resolveSection(
      () => loadTransactions({ supabase, userId: user.id }),
      {
        status: "error" as SectionStatus,
        transactions: [],
        warning: null,
      },
    ),
  ]);

  return NextResponse.json({
    paymentMethods,
    payouts,
    fees,
    shipping,
    grailPass,
    transactions,
  });
}
