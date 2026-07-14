"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AdminLayout from "../AdminLayout";
import { supabase } from "../../../lib/supabase";
import Header from "../../components/Header";

const adminEmails = ["ryanjhaas99@gmail.com"];

type EvidenceItem = {
  id: string;
  uploadedBy: string;
  uploaderName: string;
  role: string;
  imageUrl: string;
  note: string;
  createdAt?: string | null;
};

type AdminDisputesResponse = {
  orders?: DisputeOrder[];
  error?: string;
};

type AdminUpdateResponse = {
  order?: {
    id: string;
    dispute_status?: string | null;
    transfer_status?: string | null;
    admin_dispute_notes?: string | null;
  };
  error?: string;
};

type DisputeOrder = {
  id: string;
  listingId?: string | null;
  cardTitle: string;
  buyerId?: string | null;
  buyerName: string;
  sellerId?: string | null;
  sellerName: string;
  totalAmount: number;
  cardPrice: number;
  carrier: string;
  trackingNumber: string;
  fulfillmentStatus: string;
  transferStatus: string;
  disputeStatus: string;
  disputeReason: string;
  disputeNotes: string;
  disputeOpenedAt?: string | null;
  adminDisputeNotes: string;
  canRefundAutomatically?: boolean;
  evidence: EvidenceItem[];
  createdAt?: string | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
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

export default function AdminDisputesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [orders, setOrders] = useState<DisputeOrder[]>([]);
  const [status, setStatus] = useState("");
  const [actionOrderId, setActionOrderId] = useState("");
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [messageDrafts, setMessageDrafts] = useState<Record<string, string>>({});
  const [messageRecipients, setMessageRecipients] = useState<
    Record<string, "buyer" | "seller" | "both">
  >({});

  useEffect(() => {
    let isMounted = true;

    async function loadDisputes() {
      setIsLoading(true);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Admin disputes auth error:", sessionError);
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

      const accessToken = session?.access_token || "";

      try {
        const response = await fetch("/api/admin/disputes", {
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        });
        const payload = (await response.json()) as AdminDisputesResponse;

        if (!response.ok) {
          throw new Error(payload.error || "Disputes could not be loaded.");
        }

        if (!isMounted) {
          return;
        }

        const mappedOrders = payload.orders || [];

        setOrders(mappedOrders);
        setNoteDrafts(
          mappedOrders.reduce<Record<string, string>>((accumulator, order) => {
            accumulator[order.id] = order.adminDisputeNotes;
            return accumulator;
          }, {}),
        );
        setMessageRecipients(
          mappedOrders.reduce<Record<string, "buyer" | "seller" | "both">>(
            (accumulator, order) => {
              accumulator[order.id] = "both";
              return accumulator;
            },
            {},
          ),
        );
        setMessageDrafts(
          mappedOrders.reduce<Record<string, string>>((accumulator, order) => {
            accumulator[order.id] = order.adminDisputeNotes;
            return accumulator;
          }, {}),
        );
        setStatus(
          mappedOrders.length
            ? "Open disputes loaded."
            : "No open disputes right now.",
        );
      } catch (error) {
        console.error("Admin disputes fetch error:", error);

        if (isMounted) {
          setOrders([]);
          setStatus(
            error instanceof Error
              ? `Disputes could not be loaded: ${error.message}`
              : "Disputes could not be loaded.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDisputes();

    return () => {
      isMounted = false;
    };
  }, []);

  function updateLocalOrder(orderId: string, patch: Partial<DisputeOrder>) {
    setOrders((items) =>
      items.map((order) => (order.id === orderId ? { ...order, ...patch } : order)),
    );
  }

  async function updateDispute(
    order: DisputeOrder,
    action:
      | "save_admin_note"
      | "mark_under_review"
      | "request_more_info"
      | "resolve_release_seller"
      | "resolve_refund_buyer"
      | "resolve_keep_blocked",
    adminNote: string,
    successMessage: string,
  ) {
    setActionOrderId(order.id);
    setStatus("");

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Admin dispute update session error:", sessionError);
    }

    if (!session?.access_token) {
      setStatus("Sign in as an admin to update disputes.");
      setActionOrderId("");
      return false;
    }

    const response = await fetch("/api/admin/disputes/update", {
      method: "POST",
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        orderId: order.id,
        action,
        adminNote,
      }),
    });
    const payload = (await response.json()) as AdminUpdateResponse;

    if (!response.ok) {
      setStatus(payload.error || "Dispute update failed.");
      setActionOrderId("");
      return false;
    }

    if (payload.order?.dispute_status === "resolved") {
      setOrders((items) => items.filter((item) => item.id !== order.id));
    } else {
      updateLocalOrder(order.id, {
        disputeStatus: payload.order?.dispute_status || order.disputeStatus,
        transferStatus: payload.order?.transfer_status || order.transferStatus,
        adminDisputeNotes: payload.order?.admin_dispute_notes || order.adminDisputeNotes,
      });
    }

    setStatus(successMessage);
    setActionOrderId("");
    return true;
  }

  async function sendDisputeMessage(order: DisputeOrder, messageOverride?: string) {
    const message = (messageOverride || messageDrafts[order.id] || "").trim();

    if (!message) {
      setStatus("Add a dispute message before sending.");
      return false;
    }

    setActionOrderId(order.id);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Admin dispute message session error:", sessionError);
    }

    if (!session?.access_token) {
      setStatus("Sign in as an admin to send dispute messages.");
      setActionOrderId("");
      return false;
    }

    try {
      const response = await fetch("/api/admin/disputes/message", {
        method: "POST",
        headers: {
          authorization: `Bearer ${session.access_token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          orderId: order.id,
          recipientType: messageRecipients[order.id] || "both",
          message,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        count?: number;
        recipients?: string[];
        skippedSelfRecipients?: string[];
      };

      if (!response.ok) {
        throw new Error(payload.error || "Dispute message could not be sent.");
      }

      const recipientLabel = payload.recipients?.length
        ? payload.recipients.join(" and ")
        : "no new recipients";
      const skippedLabel = payload.skippedSelfRecipients?.length
        ? ` ${payload.skippedSelfRecipients.join(" and ")} is the admin sender, so no self-message was inserted.`
        : "";
      setStatus(`Sent to ${recipientLabel}.${skippedLabel}`);
      setActionOrderId("");
      return true;
    } catch (error) {
      console.error("Admin dispute message send error:", error);
      setStatus(
        error instanceof Error ? error.message : "Dispute message could not be sent.",
      );
      setActionOrderId("");
      return false;
    }
  }

  async function saveAdminNote(order: DisputeOrder) {
    const note = noteDrafts[order.id]?.trim() || "";
    const saved = await updateDispute(
      order,
      "save_admin_note",
      note,
      "Internal admin note saved.",
    );

    if (saved && note) {
      await sendDisputeMessage(order, note);
    }
  }

  async function requestMoreInfo(order: DisputeOrder) {
    const note =
      noteDrafts[order.id]?.trim() ||
      "Need more photos, unboxing video, packaging photos, card/slab closeups, tracking proof, or other evidence for GRAIL review.";
    setNoteDrafts((drafts) => ({ ...drafts, [order.id]: note }));
    setMessageDrafts((drafts) => ({ ...drafts, [order.id]: note }));

    const saved = await updateDispute(
      order,
      "request_more_info",
      note,
      "More information requested. Dispute remains under review.",
    );

    if (saved) {
      await sendDisputeMessage(order, note);
    }
  }

  async function resolveDispute(
    order: DisputeOrder,
    outcome: "release_seller" | "refund_buyer" | "keep_blocked",
  ) {
    const note = noteDrafts[order.id]?.trim() || "";

    if (!note) {
      setStatus("Add an admin decision note before resolving.");
      return;
    }

    const action =
      outcome === "release_seller"
        ? "resolve_release_seller"
        : outcome === "refund_buyer"
          ? "resolve_refund_buyer"
          : "resolve_keep_blocked";
    const successMessage =
      outcome === "release_seller"
        ? "Dispute resolved. Seller payout marked ready for automatic release."
        : outcome === "refund_buyer"
          ? "Dispute resolved. Buyer refund created and seller payout blocked."
          : "Dispute resolved. Seller payout remains blocked.";

    const saved = await updateDispute(
      order,
      action,
      note,
      successMessage,
    );

    if (saved) {
      await sendDisputeMessage(order, note);
    }
  }

  return (
    <main className="admin-page">
      <style>{pageStyles}</style>
      <AdminLayout />
      <div className="admin-shell">
        <Header />

        <section className="page-heading">
          <div>
            <span>Internal Admin</span>
            <h1>Dispute Review</h1>
            <p>Review disputed GRAIL orders and choose the next payout state.</p>
          </div>
          <Link href="/seller-dashboard">Seller Dashboard</Link>
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

            <section className="panel disputes-panel">
              {isLoading ? <p className="empty-state">Loading disputes...</p> : null}

              {!isLoading && orders.length === 0 ? (
                <article className="empty-state">
                  <h2>No open disputes.</h2>
                  <p>Orders with dispute_status opened or under_review will appear here.</p>
                </article>
              ) : null}

              {!isLoading
                ? orders.map((order) => {
                    const refundUnavailableMessage =
                      "This order was created before Stripe refund tracking was added, or the webhook did not store payment data. Automatic refund is unavailable for this test order. Create a new checkout order to test refunds.";

                    return (
                    <article key={order.id} className="dispute-card">
                      <div className="dispute-header">
                        <div>
                          <span>Order {order.id}</span>
                          <h2>{order.cardTitle}</h2>
                        </div>
                        {order.listingId ? (
                          <Link href={`/cards/${order.listingId}`}>View Card</Link>
                        ) : null}
                      </div>

                      <div className="detail-grid">
                        <Info label="Buyer" value={`${order.buyerName} (${shortId(order.buyerId)})`} />
                        <Info label="Seller" value={`${order.sellerName} (${shortId(order.sellerId)})`} />
                        <Info label="Total Amount" value={formatCurrency(order.totalAmount)} />
                        <Info label="Card Price" value={formatCurrency(order.cardPrice)} />
                        <Info label="Carrier" value={order.carrier || "Not set"} />
                        <Info label="Tracking" value={order.trackingNumber || "Not set"} />
                        <Info label="Fulfillment" value={order.fulfillmentStatus} />
                        <Info label="Transfer" value={order.transferStatus} />
                        <Info label="Dispute Status" value={order.disputeStatus} />
                        <Info label="Dispute Reason" value={order.disputeReason} />
                        <Info label="Opened" value={formatDateTime(order.disputeOpenedAt)} />
                        <Info label="Created" value={formatDateTime(order.createdAt)} />
                      </div>

                      <div className="notes-block">
                        <strong>Buyer notes</strong>
                        <p>{order.disputeNotes}</p>
                      </div>

                      <div className="notes-block">
                        <strong>Resolution guide</strong>
                        <p>
                          Release Seller Payout marks the order ready for automatic
                          payout. Refund Buyer refunds the original Stripe payment
                          and blocks seller payout.
                        </p>
                      </div>

                      <div className="evidence-block">
                        <strong>Evidence</strong>
                        {order.evidence.length > 0 ? (
                          <div className="evidence-grid">
                            {order.evidence.map((item) => (
                              <article key={item.id} className="evidence-item">
                                {item.imageUrl ? (
                                  <a href={item.imageUrl} target="_blank" rel="noreferrer">
                                    <span
                                      className="evidence-thumb"
                                      style={{ backgroundImage: `url(${item.imageUrl})` }}
                                    />
                                  </a>
                                ) : null}
                                <span>
                                  {item.role} · {item.uploaderName}
                                </span>
                                <p>{item.note || "No note provided."}</p>
                                <span>{formatDateTime(item.createdAt)}</span>
                              </article>
                            ))}
                          </div>
                        ) : (
                          <p>No evidence uploaded yet.</p>
                        )}
                      </div>

                      <label className="admin-note">
                        <span>Admin note / decision reason</span>
                        <textarea
                          value={noteDrafts[order.id] || ""}
                          onChange={(event) =>
                            setNoteDrafts((drafts) => ({
                              ...drafts,
                              [order.id]: event.target.value,
                            }))
                          }
                          placeholder="Add internal notes for this dispute."
                        />
                      </label>

                      <div className="message-block">
                        <div>
                          <span>Send dispute message</span>
                          <select
                            value={messageRecipients[order.id] || "both"}
                            onChange={(event) =>
                              setMessageRecipients((recipients) => ({
                                ...recipients,
                                [order.id]: event.target.value as "buyer" | "seller" | "both",
                              }))
                            }
                          >
                            <option value="buyer">Buyer</option>
                            <option value="seller">Seller</option>
                            <option value="both">Both</option>
                          </select>
                        </div>
                        <textarea
                          value={messageDrafts[order.id] || ""}
                          onChange={(event) =>
                            setMessageDrafts((drafts) => ({
                              ...drafts,
                              [order.id]: event.target.value,
                            }))
                          }
                          placeholder="Write a dispute message for the buyer, seller, or both."
                        />
                        <button
                          type="button"
                          disabled={actionOrderId === order.id}
                          onClick={() => sendDisputeMessage(order)}
                        >
                          Send Message
                        </button>
                      </div>

                      <div className="action-row">
                        <button
                          type="button"
                          disabled={actionOrderId === order.id}
                          onClick={() => saveAdminNote(order)}
                        >
                          Save Admin Note
                        </button>
                        <button
                          type="button"
                          disabled={actionOrderId === order.id}
                          onClick={() => requestMoreInfo(order)}
                        >
                          Request More Info
                        </button>
                        <button
                          type="button"
                          disabled={actionOrderId === order.id}
                          onClick={() =>
                            updateDispute(
                              order,
                              "mark_under_review",
                              noteDrafts[order.id]?.trim() || "",
                              "Dispute marked under review.",
                            )
                          }
                        >
                          Mark Under Review
                        </button>
                        <button
                          type="button"
                          disabled={actionOrderId === order.id}
                          onClick={() => resolveDispute(order, "release_seller")}
                        >
                          Resolve: Release Seller Payout
                        </button>
                        <button
                          type="button"
                          disabled={actionOrderId === order.id || !order.canRefundAutomatically}
                          onClick={() => resolveDispute(order, "refund_buyer")}
                        >
                          Resolve: Refund Buyer
                        </button>
                        {!order.canRefundAutomatically ? (
                          <p className="refund-unavailable-note">
                            {refundUnavailableMessage}
                          </p>
                        ) : null}
                        <button
                          type="button"
                          disabled={actionOrderId === order.id}
                          onClick={() => resolveDispute(order, "keep_blocked")}
                        >
                          Resolve: Keep Payout Blocked
                        </button>
                      </div>
                    </article>
                    );
                  })
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

const pageStyles = `
  .admin-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at 50% -120px, rgba(201,205,211,0.08), transparent 32%),
      linear-gradient(180deg, #000 0%, #030304 58%, #000 100%);
    color: #fafafa;
    font-family: Arial, Helvetica, sans-serif;
  }

  .admin-shell {
    width: min(1240px, calc(100vw - 32px));
    margin: 0 auto;
    padding: 8px 0 38px;
  }

  .panel {
    border: 1px solid #1d1d22;
    border-radius: 12px;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.006)),
      rgba(5,5,6,0.92);
    box-shadow: 0 18px 44px rgba(0,0,0,0.28);
  }

  .page-heading {
    margin-top: 18px;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 20px;
  }

  .page-heading span,
  .dispute-card span,
  .admin-note span,
  .message-block span {
    color: #C9CDD3;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .page-heading h1 {
    margin: 8px 0 0;
    color: #fff;
    font-size: 42px;
    line-height: 46px;
    font-weight: 900;
  }

  .page-heading p,
  .access-panel p,
  .status-message,
  .empty-state p,
  .notes-block p,
  .evidence-block p,
  .evidence-item p {
    color: #a1a1aa;
    font-size: 13px;
    line-height: 18px;
    font-weight: 800;
  }

  .page-heading a,
  .dispute-header a,
  .action-row button {
    border: 1px solid rgba(231,222,208,0.28);
    border-radius: 10px;
    background: rgba(231,222,208,0.055);
    color: #fff;
    min-height: 38px;
    padding: 0 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
  }

  .action-row button:disabled {
    cursor: not-allowed;
    opacity: 0.62;
  }

  .refund-unavailable-note {
    flex-basis: 100%;
    margin: 0;
    border: 1px solid rgba(201,205,211,0.16);
    border-radius: 10px;
    background: rgba(201,205,211,0.045);
    color: #C9CDD3;
    padding: 10px 12px;
    font-size: 12px;
    line-height: 17px;
    font-weight: 800;
  }

  .status-message {
    margin: 14px 0 0;
    border: 1px solid rgba(201,205,211,0.16);
    border-radius: 10px;
    background: rgba(201,205,211,0.045);
    padding: 10px 12px;
  }

  .access-panel,
  .disputes-panel {
    margin-top: 18px;
    padding: 14px;
  }

  .access-panel h2,
  .empty-state h2 {
    margin: 0;
    color: #fff;
    font-size: 20px;
    line-height: 24px;
    font-weight: 900;
  }

  .disputes-panel {
    display: grid;
    gap: 12px;
  }

  .dispute-card {
    border: 1px solid #202026;
    border-radius: 12px;
    background: rgba(8,8,10,0.76);
    padding: 14px;
    display: grid;
    gap: 14px;
  }

  .dispute-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
  }

  .dispute-header h2 {
    margin: 6px 0 0;
    color: #fff;
    font-size: 20px;
    line-height: 24px;
    font-weight: 900;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }

  .info-item,
  .notes-block {
    border: 1px solid rgba(201,205,211,0.12);
    border-radius: 10px;
    background: rgba(201,205,211,0.035);
    padding: 10px;
  }

  .info-item strong {
    display: block;
    margin-top: 5px;
    color: #fff;
    font-size: 13px;
    line-height: 17px;
    font-weight: 900;
    overflow-wrap: anywhere;
  }

  .notes-block strong,
  .evidence-block strong {
    color: #fff;
    font-size: 13px;
    font-weight: 900;
  }

  .evidence-block {
    border: 1px solid rgba(201,205,211,0.12);
    border-radius: 10px;
    background: rgba(201,205,211,0.035);
    padding: 10px;
    display: grid;
    gap: 10px;
  }

  .evidence-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .evidence-item {
    border: 1px solid #202026;
    border-radius: 10px;
    background: rgba(8,8,10,0.76);
    padding: 9px;
    display: grid;
    gap: 7px;
  }

  .evidence-item a {
    display: block;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid rgba(201,205,211,0.14);
  }

  .evidence-thumb {
    display: block;
    width: 100%;
    aspect-ratio: 4 / 3;
    background-size: cover;
    background-position: center;
    background-color: rgba(201,205,211,0.05);
  }

  .admin-note {
    display: grid;
    gap: 7px;
  }

  .message-block {
    border: 1px solid rgba(201,205,211,0.12);
    border-radius: 10px;
    background: rgba(201,205,211,0.035);
    padding: 10px;
    display: grid;
    gap: 9px;
  }

  .message-block > div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .admin-note textarea,
  .message-block textarea,
  .message-block select {
    width: 100%;
    min-height: 90px;
    border: 1px solid #202026;
    border-radius: 10px;
    background: rgba(8,8,10,0.84);
    color: #fff;
    padding: 10px 11px;
    font-size: 13px;
    font-weight: 800;
    resize: vertical;
  }

  .message-block select {
    width: auto;
    min-height: 36px;
    min-width: 120px;
    padding: 0 10px;
    resize: none;
  }

  .message-block button {
    justify-self: start;
    border: 1px solid rgba(231,222,208,0.28);
    border-radius: 10px;
    background: rgba(231,222,208,0.055);
    color: #fff;
    min-height: 38px;
    padding: 0 12px;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
  }

  .action-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .empty-state {
    margin: 0;
    padding: 18px;
  }

  @media (max-width: 900px) {
    .page-heading,
    .dispute-header {
      display: grid;
      align-items: start;
    }

    .detail-grid {
      grid-template-columns: 1fr;
    }
  }
`;
