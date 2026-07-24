"use client";

import { useEffect, useMemo, useState } from "react";
import PageShell from "../components/PageShell";
import { supabase } from "../../lib/supabase";

type SectionStatus = "empty" | "connected" | "partial" | "error";

type PaymentMethod = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number | null;
  expYear: number | null;
  isDefault: boolean;
};

type MoneyAmount = {
  amount: number | null;
  currency: string;
  arrivalAt: string | null;
  status: string;
};

type PayoutBank = {
  label: string;
  detail: string;
};

type Transaction = {
  id: string;
  date: string | null;
  type: string;
  card: string;
  amount: number | null;
  direction: "credit" | "debit" | "neutral";
  status: string;
};

type GrailPassMembership = {
  type: string;
  status: string;
  displayName: string;
  badgeLabel: string;
  renewsAt?: string | null;
};

type GrailPassSubscription = {
  plan: "monthly" | "annual";
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  latestInvoiceStatus: string | null;
} | null;

type BillingHistoryItem = {
  id: string;
  date: string | null;
  amount: number | null;
  currency: string;
  status: string;
  invoiceUrl: string | null;
  hostedInvoiceUrl: string | null;
};

type MoneyCenterData = {
  paymentMethods: {
    status: SectionStatus;
    error?: string;
    methods: PaymentMethod[];
    defaultPaymentMethodId?: string | null;
  };
  payouts: {
    status: SectionStatus;
    error?: string;
    connected: boolean;
    maskedAccountId?: string;
    accountState: string;
    onboardingStatus: string;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    requirementsCount?: number;
    disabledReason?: string | null;
    availableBalance: number | null;
    pendingBalance: number | null;
    processingBalance: number | null;
    estimatedNextPayout: MoneyAmount | null;
    payoutBank: PayoutBank | null;
    lastPayout: MoneyAmount | null;
  };
  fees: {
    status: SectionStatus;
    error?: string;
    sellerMarketplaceFee: {
      percent: number | null;
      rewardTier: string | null;
      level: number | null;
    };
    paymentProcessing: {
      configured: boolean;
      label: string;
      detail: string;
    };
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
  shipping: {
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
  grailPass: {
    status: SectionStatus;
    error?: string;
    membership: GrailPassMembership | null;
    subscription: GrailPassSubscription;
    billingHistory: BillingHistoryItem[];
    actions: {
      canCancel: boolean;
      canResume: boolean;
      canUpgrade: boolean;
    };
    monthlyCreditAmount: number;
    rewardBoost?: {
      configured: boolean;
      enabled: boolean;
      buyerBonusPercent: number | null;
      sellerBonusPercent: number | null;
    };
  };
  transactions: {
    status: SectionStatus;
    error?: string;
    warning?: string | null;
    transactions: Transaction[];
  };
};

function InfoCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="info-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <p>{detail}</p> : null}
    </div>
  );
}

function formatCurrency(value: number | null | undefined, fallback = "Unavailable") {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return fallback;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDifferenceCurrency(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Unavailable";
  }

  const prefix = value > 0 ? "+" : value < 0 ? "-" : "";

  return `${prefix}${formatCurrency(Math.abs(value), "$0.00")}`;
}

function formatSignedAmount(transaction: Transaction) {
  if (transaction.amount === null || transaction.amount === undefined) {
    return "Pending";
  }

  const amount = Math.abs(transaction.amount);
  const prefix =
    transaction.direction === "credit"
      ? "+"
      : transaction.direction === "debit"
        ? "-"
        : "";

  return `${prefix}${formatCurrency(amount, "$0.00")}`;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Recently";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDateWithYear(value?: string | null) {
  if (!value) {
    return "Not scheduled";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCardBrand(brand: string) {
  return brand
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getPaymentMethodLabel(method: PaymentMethod) {
  const brand = formatCardBrand(method.brand || "Card");
  const suffix = method.last4 ? ` ending in ${method.last4}` : "";

  return `${brand}${suffix}`;
}

function getPaymentMethodDetail(method: PaymentMethod) {
  const expiry =
    method.expMonth && method.expYear
      ? `Expires ${String(method.expMonth).padStart(2, "0")}/${method.expYear}`
      : "Expiration unavailable";

  return method.isDefault ? `Default payment method · ${expiry}` : expiry;
}

function getPayoutAmountLabel(value: MoneyAmount | null) {
  if (!value) {
    return "Not available";
  }

  if (value.amount === null) {
    return value.status;
  }

  return formatCurrency(value.amount);
}

function getPayoutDetail(value: MoneyAmount | null) {
  if (!value) {
    return "No payout data available yet.";
  }

  const dateLabel = value.arrivalAt
    ? `Arrival ${formatDateWithYear(value.arrivalAt)}`
    : "Arrival date unavailable";

  return `${dateLabel} · ${value.status}`;
}

function getSellerFeeLabel(data: MoneyCenterData | null) {
  const fee = data?.fees.sellerMarketplaceFee;

  if (!fee || fee.percent === null || fee.percent === undefined) {
    return "Unavailable";
  }

  return `${fee.percent}%`;
}

function getSellerFeeDetail(data: MoneyCenterData | null) {
  const fee = data?.fees.sellerMarketplaceFee;

  if (!fee?.rewardTier) {
    return "Reward tier fee unavailable.";
  }

  return `${fee.rewardTier}${fee.level ? ` · Level ${fee.level}` : ""}`;
}

function getBuyerProtectionLabel(data: MoneyCenterData | null) {
  const buyerProtection = data?.fees.buyerProtection;

  if (!buyerProtection?.configured) {
    return "Unavailable";
  }

  if (buyerProtection.feePercent === null || buyerProtection.feePercent === undefined) {
    return buyerProtection.enabled ? "Enabled" : "Configured";
  }

  return `${buyerProtection.feePercent}%`;
}

function formatSubscriptionStatus(value?: string | null) {
  if (!value || value === "none") {
    return "Not active";
  }

  if (value === "past_due") {
    return "Past due";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getGrailPassPlanLabel(subscription: GrailPassSubscription) {
  if (!subscription) {
    return "No active plan";
  }

  return subscription.plan === "annual" ? "Annual GRAIL Pass" : "Monthly GRAIL Pass";
}

function formatPercent(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Configuration pending";
  }

  return `${Math.round(value * 100) / 100}%`;
}

function SectionState({
  children,
  error,
  loading,
}: {
  children?: string;
  error?: string;
  loading?: boolean;
}) {
  if (loading) {
    return <p className="section-state">Loading live data...</p>;
  }

  if (error) {
    return <p className="section-state error">{error}</p>;
  }

  if (!children) {
    return null;
  }

  return <p className="section-state">{children}</p>;
}

function getInitialStatus() {
  if (typeof window === "undefined") {
    return "";
  }

  const paymentMethodState =
    new URLSearchParams(window.location.search).get("payment_method") || "";

  if (paymentMethodState === "added") {
    return "Payment method added. Loading Stripe billing data...";
  }

  if (paymentMethodState === "canceled") {
    return "Payment method setup canceled.";
  }

  return "";
}

export default function BillingPayoutsPage() {
  const [status, setStatus] = useState(getInitialStatus);
  const [data, setData] = useState<MoneyCenterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [visibleTransactionCount, setVisibleTransactionCount] = useState(8);

  const visibleTransactions = useMemo(
    () => (data?.transactions.transactions || []).slice(0, visibleTransactionCount),
    [data?.transactions.transactions, visibleTransactionCount],
  );
  const hasMoreTransactions =
    (data?.transactions.transactions.length || 0) > visibleTransactionCount;

  async function loadMoneyCenter() {
    setIsLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setData(null);
      setStatus("Sign in to view Billing & Payouts.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/billing-payouts", {
        headers: {
          authorization: `Bearer ${session.access_token}`,
        },
      });
      const payload = (await response.json()) as MoneyCenterData & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Billing & Payouts could not be loaded.");
      }

      setData(payload);
      setStatus((current) => (current.startsWith("Payment method") ? current : ""));
    } catch (error) {
      console.error("Billing & Payouts load error:", error);
      setData(null);
      setStatus(
        error instanceof Error
          ? error.message
          : "Billing & Payouts could not be loaded.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const paymentMethodState =
      typeof window === "undefined"
        ? ""
        : new URLSearchParams(window.location.search).get("payment_method") || "";

    if (paymentMethodState === "added" || paymentMethodState === "canceled") {
      window.history.replaceState({}, "", "/billing-payouts");
    }

    const loadTimer = window.setTimeout(() => {
      void loadMoneyCenter();
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, []);

  async function getAccessToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || "";
  }

  async function startAddPaymentMethod() {
    setIsActionLoading(true);
    setStatus("Opening secure Stripe payment method setup...");

    try {
      const accessToken = await getAccessToken();
      const response = await fetch("/api/billing-payouts/payment-methods/setup", {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });
      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Payment method setup could not be started.");
      }

      window.location.href = payload.url;
    } catch (error) {
      console.error("Payment method setup start error:", error);
      setStatus(
        error instanceof Error
          ? error.message
          : "Payment method setup could not be started.",
      );
      setIsActionLoading(false);
    }
  }

  async function setDefaultPaymentMethod(paymentMethodId: string) {
    setIsActionLoading(true);
    setStatus("Updating default payment method...");

    try {
      const accessToken = await getAccessToken();
      const response = await fetch("/api/billing-payouts/payment-methods/default", {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ paymentMethodId }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Default payment method could not be updated.");
      }

      await loadMoneyCenter();
      setStatus("Default payment method updated.");
    } catch (error) {
      console.error("Default payment method update error:", error);
      setStatus(
        error instanceof Error
          ? error.message
          : "Default payment method could not be updated.",
      );
    } finally {
      setIsActionLoading(false);
    }
  }

  async function removePaymentMethod(paymentMethodId: string) {
    setIsActionLoading(true);
    setStatus("Removing payment method...");

    try {
      const accessToken = await getAccessToken();
      const response = await fetch(
        `/api/billing-payouts/payment-methods/${encodeURIComponent(paymentMethodId)}`,
        {
          method: "DELETE",
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        },
      );
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Payment method could not be removed.");
      }

      await loadMoneyCenter();
      setStatus("Payment method removed.");
    } catch (error) {
      console.error("Payment method removal error:", error);
      setStatus(
        error instanceof Error
          ? error.message
          : "Payment method could not be removed.",
      );
    } finally {
      setIsActionLoading(false);
    }
  }

  async function startPayoutOnboarding() {
    setIsActionLoading(true);
    setStatus("Opening Stripe Express payout setup...");

    try {
      const accessToken = await getAccessToken();
      const response = await fetch("/api/stripe/connect/onboard", {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });
      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Stripe payout setup could not be started.");
      }

      window.location.href = payload.url;
    } catch (error) {
      console.error("Stripe payout onboarding error:", error);
      setStatus(
        error instanceof Error
          ? error.message
          : "Stripe payout setup could not be started.",
      );
      setIsActionLoading(false);
    }
  }

  async function openGrailPassBillingPortal() {
    setIsActionLoading(true);
    setStatus("Opening GRAIL Pass billing management...");

    try {
      const accessToken = await getAccessToken();
      const response = await fetch("/api/grail-pass/billing-portal", {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });
      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "GRAIL Pass billing could not be opened.");
      }

      window.location.href = payload.url;
    } catch (error) {
      console.error("GRAIL Pass billing portal error:", error);
      setStatus(
        error instanceof Error
          ? error.message
          : "GRAIL Pass billing could not be opened.",
      );
      setIsActionLoading(false);
    }
  }

  return (
    <PageShell
      className="account-page"
      shellClassName="account-shell"
      shellStyle={{ padding: "8px 0 38px" }}
      styles={pageStyles}
    >
        <section className="page-heading">
          <span>Money Center</span>
          <h1>Billing & Payouts</h1>
          <p>Manage payment methods, seller payouts, and marketplace fees.</p>
        </section>

        {status ? <p className="status-message">{status}</p> : null}

        <section className="layout">
          <div className="main-column">
            <section className="panel section-card">
              <h2>Payment Methods</h2>
              <SectionState
                loading={isLoading}
                error={data?.paymentMethods.error}
              />
              {!isLoading && data?.paymentMethods.methods.length === 0 ? (
                <article className="empty-state">
                  <strong>No payment methods yet.</strong>
                  <p>Add a card through Stripe to make future checkout faster.</p>
                </article>
              ) : null}
              {!isLoading
                ? data?.paymentMethods.methods.map((method) => (
                    <div key={method.id} className="method-row">
                      <div>
                        <strong>{getPaymentMethodLabel(method)}</strong>
                        <span>{getPaymentMethodDetail(method)}</span>
                      </div>
                      <div className="row-actions">
                        {!method.isDefault ? (
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() => void setDefaultPaymentMethod(method.id)}
                          >
                            Set default
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={isActionLoading}
                          onClick={() => void removePaymentMethod(method.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                : null}
              <button
                type="button"
                className="primary-button"
                disabled={isActionLoading || isLoading}
                onClick={() => void startAddPaymentMethod()}
              >
                Add payment method
              </button>
            </section>

            <section className="panel section-card">
              <h2>Seller Payouts</h2>
              <SectionState loading={isLoading} error={data?.payouts.error} />
              {!isLoading && data?.payouts.status === "empty" ? (
                <article className="empty-state">
                  <strong>No payout account connected.</strong>
                  <p>Connect Stripe Express to receive seller payouts after orders clear.</p>
                </article>
              ) : null}
              <div className="stats-grid">
                <InfoCard
                  label="Stripe Connect Status"
                  value={isLoading ? "Loading..." : data?.payouts.connected ? "Connected" : "Not connected"}
                  detail={data?.payouts.maskedAccountId}
                />
                <InfoCard
                  label="Connected Account State"
                  value={isLoading ? "Loading..." : data?.payouts.accountState || "Unavailable"}
                  detail={data?.payouts.disabledReason || undefined}
                />
                <InfoCard
                  label="Connected Payout Bank"
                  value={isLoading ? "Loading..." : data?.payouts.payoutBank?.label || "Not available"}
                  detail={data?.payouts.payoutBank?.detail || "Bank details appear after Stripe provides them."}
                />
                <InfoCard
                  label="Available Balance"
                  value={isLoading ? "Loading..." : formatCurrency(data?.payouts.availableBalance)}
                />
                <InfoCard
                  label="Pending Balance"
                  value={isLoading ? "Loading..." : formatCurrency(data?.payouts.pendingBalance)}
                />
                <InfoCard
                  label="Processing Balance"
                  value={isLoading ? "Loading..." : formatCurrency(data?.payouts.processingBalance)}
                  detail="GRAIL order payouts not released yet."
                />
                <InfoCard
                  label="Estimated Next Payout"
                  value={isLoading ? "Loading..." : getPayoutAmountLabel(data?.payouts.estimatedNextPayout || null)}
                  detail={getPayoutDetail(data?.payouts.estimatedNextPayout || null)}
                />
                <InfoCard
                  label="Last Payout"
                  value={isLoading ? "Loading..." : getPayoutAmountLabel(data?.payouts.lastPayout || null)}
                  detail={getPayoutDetail(data?.payouts.lastPayout || null)}
                />
              </div>
              <button
                type="button"
                className="primary-button"
                disabled={isActionLoading || isLoading}
                onClick={() => void startPayoutOnboarding()}
              >
                {data?.payouts.connected ? "Continue payout setup" : "Add payout account"}
              </button>
            </section>

            <section className="panel section-card">
              <h2>Recent Transactions</h2>
              <SectionState
                loading={isLoading}
                error={data?.transactions.error}
              >
                {!data?.transactions.error && data?.transactions.warning
                  ? data.transactions.warning
                  : undefined}
              </SectionState>
              {!isLoading && visibleTransactions.length === 0 ? (
                <article className="empty-state">
                  <strong>No financial activity yet.</strong>
                  <p>Purchases, sales, payouts, refunds, labels, disputes, and reward credits will appear here.</p>
                </article>
              ) : null}
              <div className="transaction-list">
                {visibleTransactions.map((transaction) => (
                  <article key={transaction.id} className="transaction-row">
                    <span>{formatDate(transaction.date)}</span>
                    <strong>{transaction.type}</strong>
                    <p>{transaction.card}</p>
                    <strong className={transaction.direction}>{formatSignedAmount(transaction)}</strong>
                    <em>{transaction.status}</em>
                  </article>
                ))}
              </div>
              {hasMoreTransactions ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setVisibleTransactionCount((current) => current + 8)}
                >
                  Load more transactions
                </button>
              ) : null}
            </section>
          </div>

          <aside className="side-column">
            <section className="panel section-card">
              <h2>GRAIL Pass</h2>
              <SectionState loading={isLoading} error={data?.grailPass.error} />
              {!isLoading && data?.grailPass.status === "empty" ? (
                <article className="empty-state">
                  <strong>No active subscription.</strong>
                  <p>GRAIL Pass billing will appear here after subscription checkout.</p>
                </article>
              ) : null}
              <div className="fee-list">
                <InfoCard
                  label="Active Subscription"
                  value={
                    isLoading
                      ? "Loading..."
                      : formatSubscriptionStatus(data?.grailPass.membership?.status)
                  }
                  detail={data?.grailPass.membership?.displayName || "No membership active"}
                />
                <InfoCard
                  label="Current Plan"
                  value={isLoading ? "Loading..." : getGrailPassPlanLabel(data?.grailPass.subscription || null)}
                />
                <InfoCard
                  label="Next Renewal"
                  value={
                    isLoading
                      ? "Loading..."
                      : data?.grailPass.subscription?.currentPeriodEnd
                        ? formatDateWithYear(data.grailPass.subscription.currentPeriodEnd)
                        : "Not scheduled"
                  }
                  detail={
                    data?.grailPass.subscription?.cancelAtPeriodEnd
                      ? "Auto-renew is canceled."
                      : "Managed by Stripe Billing."
                  }
                />
                <InfoCard
                  label="Buyer Reward Bonus"
                  value={
                    isLoading
                      ? "Loading..."
                      : data?.grailPass.rewardBoost?.configured && data.grailPass.rewardBoost.enabled
                        ? formatPercent(data.grailPass.rewardBoost.buyerBonusPercent)
                        : "Configuration pending"
                  }
                  detail="Applied through the existing Rewards Engine when membership is active."
                />
                <InfoCard
                  label="Seller Reward Bonus"
                  value={
                    isLoading
                      ? "Loading..."
                      : data?.grailPass.rewardBoost?.configured && data.grailPass.rewardBoost.enabled
                        ? formatPercent(data.grailPass.rewardBoost.sellerBonusPercent)
                        : "Configuration pending"
                  }
                  detail="Adds reward earnings only. Seller fee progression remains rank-based."
                />
              </div>
              {!isLoading && (data?.grailPass.billingHistory.length || 0) > 0 ? (
                <div className="billing-history-list">
                  {data?.grailPass.billingHistory.slice(0, 4).map((invoice) => (
                    <article key={invoice.id} className="billing-history-row">
                      <span>{formatDate(invoice.date)}</span>
                      <strong>{formatCurrency(invoice.amount)}</strong>
                      <em>{invoice.status}</em>
                    </article>
                  ))}
                </div>
              ) : null}
              <button
                type="button"
                className="primary-button"
                disabled={isActionLoading || isLoading || !data?.grailPass.subscription}
                onClick={() => void openGrailPassBillingPortal()}
              >
                Manage subscription
              </button>
            </section>

            <section className="panel section-card">
              <h2>Marketplace Fees</h2>
              <SectionState loading={isLoading} error={data?.fees.error} />
              <div className="fee-list">
                <InfoCard
                  label="Seller Marketplace Fee"
                  value={isLoading ? "Loading..." : getSellerFeeLabel(data)}
                  detail={getSellerFeeDetail(data)}
                />
                <InfoCard
                  label="Payment Processing"
                  value={isLoading ? "Loading..." : data?.fees.paymentProcessing.label || "Unavailable"}
                  detail={data?.fees.paymentProcessing.detail}
                />
                <InfoCard
                  label="Shipping Labels"
                  value={isLoading ? "Loading..." : data?.fees.shippingLabels.label || "Charged at cost."}
                />
                <InfoCard
                  label="Buyer Protection"
                  value={isLoading ? "Loading..." : getBuyerProtectionLabel(data)}
                  detail={data?.fees.buyerProtection.description}
                />
              </div>
            </section>

            <section className="panel section-card">
              <h2>Shipping</h2>
              <SectionState loading={isLoading} error={data?.shipping.error} />
              <div className="fee-list">
                <InfoCard
                  label="Shipping Provider"
                  value={isLoading ? "Loading..." : data?.shipping.providerConnection || "Not connected"}
                />
                <InfoCard
                  label="Shippo Connection"
                  value={isLoading ? "Loading..." : data?.shipping.easyPostStatus || "Not connected"}
                />
                <InfoCard
                  label="Labels Purchased"
                  value={
                    isLoading
                      ? "Loading..."
                      : data?.shipping.labelsPurchased === null
                        ? "Not implemented"
                        : String(data?.shipping.labelsPurchased)
                  }
                />
                <InfoCard
                  label="Buyer Paid Shipping"
                  value={isLoading ? "Loading..." : formatCurrency(data?.shipping.shippingCollected)}
                />
                <InfoCard
                  label="Actual Shippo Label"
                  value={isLoading ? "Loading..." : formatCurrency(data?.shipping.totalShippingCost)}
                />
                <InfoCard
                  label="Difference"
                  value={isLoading ? "Loading..." : formatDifferenceCurrency(data?.shipping.shippingDifference)}
                  detail="Buyer-paid shipping minus actual Shippo label cost."
                />
                <InfoCard
                  label="Last Shipping Method"
                  value={
                    isLoading
                      ? "Loading..."
                      : data?.shipping.lastShippingMethod || "No shipments yet"
                  }
                />
                <InfoCard
                  label="Last Label Purchased"
                  value={
                    isLoading
                      ? "Loading..."
                      : data?.shipping.lastLabelPurchased
                        ? formatDateWithYear(data.shipping.lastLabelPurchased)
                        : "No labels purchased"
                  }
                  detail={data?.shipping.note}
                />
              </div>
            </section>
          </aside>
        </section>
    </PageShell>
  );
}

const pageStyles = `
  .account-page {
    min-height: 100vh;
    background: radial-gradient(circle at 50% -120px, rgba(201,205,211,0.08), transparent 32%), linear-gradient(180deg, #000 0%, #030304 58%, #000 100%);
    color: #fafafa;
    font-family: Arial, Helvetica, sans-serif;
  }
  .account-shell { width: 1240px; margin: 0 auto; padding: 8px 0 38px; }
  .panel {
    border: 1px solid #1d1d22; border-radius: 12px;
    background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.006)), rgba(5,5,6,0.92);
    box-shadow: 0 18px 44px rgba(0,0,0,0.28);
  }
  .page-heading { margin-top: 10px; }
  .page-heading span { color: #C9CDD3; font-size: 11px; line-height: 14px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
  .page-heading h1 { margin: 8px 0 0; color: #fff; font-size: 42px; line-height: 46px; font-weight: 900; }
  .page-heading p, .method-row span, .transaction-row p, .empty-state p, .section-state, .info-card p {
    color: #a1a1aa; font-size: 13px; line-height: 18px; font-weight: 800;
  }
  .status-message {
    margin: 16px 0 0; border: 1px solid rgba(52,211,153,0.24); border-radius: 10px; background: rgba(52,211,153,0.07);
    color: #86efac; padding: 10px; font-size: 13px; font-weight: 900;
  }
  .section-state {
    margin: 12px 0 0; border: 1px solid rgba(201,205,211,0.16); border-radius: 10px; background: rgba(201,205,211,0.045);
    padding: 10px;
  }
  .section-state.error {
    border-color: rgba(248,113,113,0.28); background: rgba(248,113,113,0.08); color: #fca5a5;
  }
  .layout { margin-top: 18px; display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 16px; align-items: start; }
  .main-column, .side-column { display: grid; gap: 16px; }
  .section-card { padding: 16px; }
  .section-card h2 { margin: 0; color: #fff; font-size: 20px; line-height: 24px; font-weight: 900; }
  .method-row {
    margin-top: 14px; border: 1px solid #202026; border-radius: 10px; background: rgba(8,8,10,0.76);
    padding: 12px; display: flex; justify-content: space-between; gap: 12px; align-items: center;
  }
  .method-row strong, .transaction-row strong { color: #fff; font-size: 14px; font-weight: 900; }
  .row-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
  button, .primary-button, .secondary-button {
    min-height: 38px; border: 1px solid rgba(231,222,208,0.28); border-radius: 10px; background: rgba(231,222,208,0.055);
    color: #fff; padding: 0 12px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 900; cursor: pointer;
  }
  button:hover:not(:disabled) { border-color: rgba(231,222,208,0.62); background: rgba(231,222,208,0.11); box-shadow: 0 0 18px rgba(201,205,211,0.13); }
  button:disabled { cursor: not-allowed; opacity: 0.5; }
  .primary-button { margin-top: 14px; background: #E7DED0; color: #111; }
  .secondary-button { margin-top: 14px; justify-self: start; }
  .stats-grid, .fee-list { margin-top: 14px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .fee-list { grid-template-columns: 1fr; }
  .info-card, .empty-state {
    min-height: 62px; border: 1px solid #202026; border-radius: 10px; background: rgba(8,8,10,0.76); padding: 10px; box-sizing: border-box;
  }
  .empty-state { margin-top: 14px; }
  .empty-state strong { color: #fff; font-size: 14px; line-height: 18px; font-weight: 900; }
  .empty-state p { margin: 6px 0 0; }
  .info-card span { color: #85858f; font-size: 10px; line-height: 13px; font-weight: 800; }
  .info-card strong { display: block; margin-top: 6px; color: #fff; font-size: 14px; line-height: 18px; font-weight: 900; }
  .info-card p { margin: 6px 0 0; font-size: 11px; line-height: 15px; }
  .transaction-list { margin-top: 14px; display: grid; gap: 10px; }
  .transaction-row {
    border: 1px solid #202026; border-radius: 10px; background: rgba(8,8,10,0.76); padding: 12px;
    display: grid; grid-template-columns: 90px 120px 1fr 100px 100px; gap: 12px; align-items: center;
  }
  .transaction-row span, .transaction-row em { color: #C9CDD3; font-size: 12px; font-weight: 900; font-style: normal; }
  .transaction-row .credit { color: #86efac; }
  .transaction-row .debit { color: #fca5a5; }
  .transaction-row .neutral { color: #fff; }
  .billing-history-list { margin-top: 14px; display: grid; gap: 8px; }
  .billing-history-row {
    border: 1px solid #202026; border-radius: 10px; background: rgba(8,8,10,0.76); padding: 10px;
    display: grid; grid-template-columns: 1fr auto auto; gap: 10px; align-items: center;
  }
  .billing-history-row span, .billing-history-row em {
    color: #C9CDD3; font-size: 12px; line-height: 15px; font-weight: 900; font-style: normal;
  }
  .billing-history-row strong { color: #fff; font-size: 13px; line-height: 16px; font-weight: 900; }
  @media (max-width: 1100px) {
    .account-shell { width: calc(100vw - 32px); }
    .layout, .stats-grid, .transaction-row, .billing-history-row { grid-template-columns: 1fr; }
    .method-row { display: grid; }
    .row-actions { justify-content: flex-start; }
  }
`;
