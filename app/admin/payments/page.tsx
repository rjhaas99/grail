"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import Header from "../../components/Header";

const adminEmails = ["ryanjhaas99@gmail.com"];

type PaymentFilter =
  | "All"
  | "Pending payout"
  | "Paid"
  | "Refunded"
  | "Disputed"
  | "Errors";

type PaymentOrder = {
  id: string;
  shortId: string;
  listingId?: string | null;
  cardTitle: string;
  buyerId?: string | null;
  buyerName: string;
  sellerId?: string | null;
  sellerName: string;
  totalAmount: number;
  cardPrice: number;
  sellerPayoutAmount: number;
  platformFee: number;
  stripeSessionId: string;
  stripePaymentIntentId: string;
  stripeChargeId: string;
  stripeRefundId: string;
  stripeTransferId: string;
  refundStatus: string;
  transferStatus: string;
  fulfillmentStatus: string;
  disputeStatus: string;
  autoReleaseError: string;
  createdAt?: string | null;
  completedAt?: string | null;
  payoutReleasedAt?: string | null;
};

type AdminPaymentsResponse = {
  orders?: PaymentOrder[];
  error?: string;
};

const filters: PaymentFilter[] = [
  "All",
  "Pending payout",
  "Paid",
  "Refunded",
  "Disputed",
  "Errors",
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function shortId(value?: string | null) {
  return value ? value.slice(0, 8) : "Unknown";
}

function idValue(value?: string | null) {
  return value || "Not stored";
}

function isRefunded(order: PaymentOrder) {
  return (
    order.refundStatus === "refunded" ||
    order.transferStatus === "refunded" ||
    Boolean(order.stripeRefundId)
  );
}

function isPaid(order: PaymentOrder) {
  return (
    order.transferStatus === "paid" ||
    Boolean(order.completedAt) ||
    Boolean(order.payoutReleasedAt)
  );
}

function isDisputed(order: PaymentOrder) {
  return (
    order.disputeStatus === "opened" ||
    order.disputeStatus === "under_review" ||
    order.transferStatus === "blocked"
  );
}

function hasPayoutError(order: PaymentOrder) {
  return Boolean(order.autoReleaseError) || order.transferStatus === "failed";
}

function isPendingPayout(order: PaymentOrder) {
  return (
    !isPaid(order) &&
    !isRefunded(order) &&
    !isDisputed(order) &&
    (order.transferStatus === "ready" || order.transferStatus === "not_ready")
  );
}

function filterOrders(orders: PaymentOrder[], activeFilter: PaymentFilter) {
  if (activeFilter === "Pending payout") {
    return orders.filter(isPendingPayout);
  }

  if (activeFilter === "Paid") {
    return orders.filter(isPaid);
  }

  if (activeFilter === "Refunded") {
    return orders.filter(isRefunded);
  }

  if (activeFilter === "Disputed") {
    return orders.filter(isDisputed);
  }

  if (activeFilter === "Errors") {
    return orders.filter(hasPayoutError);
  }

  return orders;
}

export default function AdminPaymentsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [status, setStatus] = useState("");
  const [activeFilter, setActiveFilter] = useState<PaymentFilter>("All");

  useEffect(() => {
    let isMounted = true;

    async function loadPayments() {
      setIsLoading(true);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Admin payments auth error:", sessionError);
      }

      const email = session?.user.email?.toLowerCase() || "";

      if (!email || !adminEmails.includes(email)) {
        if (isMounted) {
          setAdminEmail(email);
          setIsAdmin(false);
          setOrders([]);
          setIsLoading(false);
        }
        return;
      }

      if (isMounted) {
        setAdminEmail(email);
        setIsAdmin(true);
      }

      try {
        const response = await fetch("/api/admin/payments", {
          headers: {
            authorization: `Bearer ${session?.access_token || ""}`,
          },
        });
        const payload = (await response.json()) as AdminPaymentsResponse;

        if (!response.ok) {
          throw new Error(payload.error || "Payments could not be loaded.");
        }

        if (!isMounted) {
          return;
        }

        const mappedOrders = payload.orders || [];

        setOrders(mappedOrders);
        setStatus(
          mappedOrders.length
            ? "Payment records loaded."
            : "No payment records found.",
        );
      } catch (error) {
        console.error("Admin payments fetch error:", error);

        if (isMounted) {
          setOrders([]);
          setStatus(
            error instanceof Error
              ? `Payments could not be loaded: ${error.message}`
              : "Payments could not be loaded.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPayments();

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleOrders = useMemo(
    () => filterOrders(orders, activeFilter),
    [orders, activeFilter],
  );

  const stats = useMemo(
    () => [
      { label: "Total orders", value: orders.length.toString() },
      {
        label: "Paid / complete",
        value: orders.filter(isPaid).length.toString(),
      },
      {
        label: "Pending payout",
        value: orders.filter(isPendingPayout).length.toString(),
      },
      {
        label: "Refunded",
        value: orders.filter(isRefunded).length.toString(),
      },
      {
        label: "Blocked / disputed",
        value: orders.filter(isDisputed).length.toString(),
      },
      {
        label: "Payout errors",
        value: orders.filter(hasPayoutError).length.toString(),
      },
    ],
    [orders],
  );

  return (
    <main className="admin-payments-page">
      <style>{pageStyles}</style>
      <div className="admin-payments-shell">
        <Header />

        <section className="page-heading">
          <div>
            <span>Internal Admin</span>
            <h1>Payments Dashboard</h1>
            <p>
              Monitor GRAIL orders, Stripe identifiers, refunds, payouts, disputes,
              and automatic release errors.
            </p>
          </div>
          <Link href="/admin/disputes">Dispute Review</Link>
        </section>

        {!isLoading && !isAdmin ? (
          <section className="panel access-panel">
            <h2>Access denied</h2>
            <p>
              {adminEmail
                ? `${adminEmail} is not allowed to view this internal page.`
                : "Sign in with an authorized admin account."}
            </p>
          </section>
        ) : null}

        {isAdmin ? (
          <>
            {status ? <p className="status-message">{status}</p> : null}

            <section className="stats-grid" aria-label="Payment status summary">
              {stats.map((item) => (
                <article key={item.label} className="stat-card">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </section>

            <section className="panel filters-panel">
              <div>
                <span>Filters</span>
                <p>Review all orders or isolate payout, refund, dispute, and error states.</p>
              </div>
              <div className="filter-actions">
                {filters.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    className={activeFilter === filter ? "active" : ""}
                    onClick={() => setActiveFilter(filter)}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </section>

            <section className="panel payments-panel">
              <div className="panel-heading">
                <div>
                  <span>Recent Orders</span>
                  <h2>{activeFilter} payments</h2>
                </div>
                <p>{visibleOrders.length} shown</p>
              </div>

              {isLoading ? <p className="empty-state">Loading payments...</p> : null}

              {!isLoading && visibleOrders.length === 0 ? (
                <article className="empty-state">
                  <h3>No matching payment records.</h3>
                  <p>Orders that match the current filter will appear here.</p>
                </article>
              ) : null}

              {!isLoading
                ? visibleOrders.map((order) => (
                    <article key={order.id} className="payment-card">
                      <div className="payment-header">
                        <div>
                          <span>Order {order.shortId || shortId(order.id)}</span>
                          <h3>{order.cardTitle}</h3>
                        </div>
                        <div className="payment-links">
                          {order.listingId ? (
                            <Link href={`/cards/${order.listingId}`}>View Card</Link>
                          ) : null}
                          {isDisputed(order) ? (
                            <Link href="/admin/disputes">View Dispute</Link>
                          ) : null}
                        </div>
                      </div>

                      <div className="status-row">
                        <StatusBadge label="Payment" value={order.refundStatus} />
                        <StatusBadge label="Payout" value={order.transferStatus} />
                        <StatusBadge label="Fulfillment" value={order.fulfillmentStatus} />
                        <StatusBadge label="Dispute" value={order.disputeStatus} />
                      </div>

                      <div className="detail-grid">
                        <Info
                          label="Buyer"
                          value={`${order.buyerName} (${shortId(order.buyerId)})`}
                        />
                        <Info
                          label="Seller"
                          value={`${order.sellerName} (${shortId(order.sellerId)})`}
                        />
                        <Info label="Total Amount" value={formatCurrency(order.totalAmount)} />
                        <Info label="Card Price" value={formatCurrency(order.cardPrice)} />
                        <Info
                          label="Seller Payout"
                          value={formatCurrency(order.sellerPayoutAmount)}
                        />
                        <Info label="Platform Fee" value={formatCurrency(order.platformFee)} />
                        <Info label="Created" value={formatDateTime(order.createdAt)} />
                        <Info label="Completed" value={formatDateTime(order.completedAt)} />
                        <Info
                          label="Payout Released"
                          value={formatDateTime(order.payoutReleasedAt)}
                        />
                      </div>

                      <div className="stripe-grid">
                        <Info label="stripe_session_id" value={idValue(order.stripeSessionId)} />
                        <Info
                          label="stripe_payment_intent_id"
                          value={idValue(order.stripePaymentIntentId)}
                        />
                        <Info label="stripe_charge_id" value={idValue(order.stripeChargeId)} />
                        <Info label="stripe_refund_id" value={idValue(order.stripeRefundId)} />
                        <Info label="stripe_transfer_id" value={idValue(order.stripeTransferId)} />
                      </div>

                      <div
                        className={
                          order.autoReleaseError ? "error-block active" : "error-block"
                        }
                      >
                        <strong>Cron / payout release errors</strong>
                        <p>
                          {order.autoReleaseError ||
                            "No payout release errors recorded for this order."}
                        </p>
                      </div>
                    </article>
                  ))
                : null}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusBadge({ label, value }: { label: string; value: string }) {
  return (
    <span className="status-badge">
      {label}: <strong>{value || "none"}</strong>
    </span>
  );
}

const pageStyles = `
  .admin-payments-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at top left, rgba(231, 222, 208, 0.08), transparent 34rem),
      radial-gradient(circle at bottom right, rgba(201, 205, 211, 0.06), transparent 30rem),
      #050505;
    color: #f7f3ec;
  }

  .admin-payments-shell {
    width: min(100%, 1500px);
    margin: 0 auto;
    padding: 0 24px 64px;
  }

  .page-heading {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
    padding: 44px 0 24px;
  }

  .page-heading span,
  .panel-heading span,
  .filters-panel span,
  .stat-card span,
  .info-item span,
  .payment-header span {
    color: #c9cdd3;
    font-size: 0.76rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .page-heading h1 {
    margin: 8px 0 10px;
    color: #e7ded0;
    font-size: clamp(2rem, 4vw, 4rem);
    line-height: 1;
  }

  .page-heading p {
    max-width: 760px;
    margin: 0;
    color: rgba(247, 243, 236, 0.72);
    line-height: 1.7;
  }

  .page-heading a,
  .payment-links a {
    border: 1px solid rgba(231, 222, 208, 0.28);
    border-radius: 999px;
    padding: 10px 14px;
    color: #e7ded0;
    text-decoration: none;
    white-space: nowrap;
    background: rgba(255, 255, 255, 0.04);
  }

  .panel,
  .stat-card,
  .payment-card {
    border: 1px solid rgba(231, 222, 208, 0.16);
    border-radius: 18px;
    background: rgba(12, 12, 12, 0.78);
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.28);
    backdrop-filter: blur(18px);
  }

  .status-message {
    border: 1px solid rgba(201, 205, 211, 0.18);
    border-radius: 14px;
    margin: 0 0 18px;
    padding: 12px 14px;
    color: #e7ded0;
    background: rgba(255, 255, 255, 0.04);
  }

  .access-panel,
  .filters-panel,
  .payments-panel {
    padding: 22px;
  }

  .access-panel h2,
  .empty-state h3,
  .panel-heading h2,
  .payment-header h3 {
    margin: 4px 0 0;
    color: #e7ded0;
  }

  .access-panel p,
  .empty-state p,
  .filters-panel p,
  .panel-heading p,
  .error-block p {
    color: rgba(247, 243, 236, 0.7);
    line-height: 1.6;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 18px;
  }

  .stat-card {
    padding: 18px;
  }

  .stat-card strong {
    display: block;
    margin-top: 8px;
    color: #e7ded0;
    font-size: 1.9rem;
    line-height: 1;
  }

  .filters-panel {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 18px;
  }

  .filters-panel p {
    margin: 4px 0 0;
  }

  .filter-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  }

  .filter-actions button {
    border: 1px solid rgba(231, 222, 208, 0.18);
    border-radius: 999px;
    padding: 10px 13px;
    color: #c9cdd3;
    background: rgba(255, 255, 255, 0.04);
    cursor: pointer;
  }

  .filter-actions button.active {
    border-color: rgba(231, 222, 208, 0.6);
    color: #050505;
    background: #e7ded0;
  }

  .panel-heading,
  .payment-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
  }

  .panel-heading {
    margin-bottom: 16px;
  }

  .payment-card {
    padding: 20px;
  }

  .payment-card + .payment-card {
    margin-top: 14px;
  }

  .payment-links {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  }

  .status-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 16px 0;
  }

  .status-badge {
    border: 1px solid rgba(201, 205, 211, 0.18);
    border-radius: 999px;
    padding: 8px 10px;
    color: rgba(247, 243, 236, 0.72);
    background: rgba(255, 255, 255, 0.035);
    font-size: 0.84rem;
  }

  .status-badge strong {
    color: #e7ded0;
    font-weight: 700;
  }

  .detail-grid,
  .stripe-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .stripe-grid {
    margin-top: 12px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .info-item {
    min-width: 0;
    border: 1px solid rgba(201, 205, 211, 0.12);
    border-radius: 12px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.025);
  }

  .info-item strong {
    display: block;
    overflow-wrap: anywhere;
    margin-top: 6px;
    color: #f7f3ec;
    font-size: 0.94rem;
    line-height: 1.4;
  }

  .error-block {
    border: 1px solid rgba(201, 205, 211, 0.14);
    border-radius: 12px;
    margin-top: 12px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.025);
  }

  .error-block.active {
    border-color: rgba(255, 96, 112, 0.42);
    background: rgba(255, 96, 112, 0.08);
  }

  .error-block strong {
    color: #e7ded0;
  }

  .error-block p {
    margin: 6px 0 0;
  }

  .empty-state {
    border: 1px dashed rgba(231, 222, 208, 0.22);
    border-radius: 16px;
    padding: 22px;
    text-align: center;
  }

  @media (max-width: 1180px) {
    .stats-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .detail-grid,
    .stripe-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 760px) {
    .admin-payments-shell {
      padding: 0 14px 44px;
    }

    .page-heading,
    .filters-panel,
    .panel-heading,
    .payment-header {
      align-items: stretch;
      flex-direction: column;
    }

    .filter-actions,
    .payment-links {
      justify-content: flex-start;
    }

    .stats-grid,
    .detail-grid,
    .stripe-grid {
      grid-template-columns: 1fr;
    }
  }
`;
