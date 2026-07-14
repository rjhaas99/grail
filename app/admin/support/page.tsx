"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../AdminLayout";
import { supabase } from "../../../lib/supabase";
import Header from "../../components/Header";

const adminEmails = ["ryanjhaas99@gmail.com"];
const supportStatuses = ["open", "in_review", "resolved", "closed"] as const;
const supportTopics = [
  "Order issue",
  "Payment or refund",
  "Seller payout",
  "Listing problem",
  "Dispute help",
  "Account issue",
  "Report a bug",
  "General question",
  "Other",
] as const;

type SupportStatus = (typeof supportStatuses)[number];

type SupportTicket = {
  id: string;
  shortId: string;
  userId?: string | null;
  signedInUserName: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  orderId?: string | null;
  listingId?: string | null;
  listingTitle: string;
  status: string;
  adminNote: string;
  reviewedBy?: string | null;
  reviewedByName: string;
  reviewedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type AdminSupportResponse = {
  tickets?: SupportTicket[];
  error?: string;
};

type AdminSupportUpdateResponse = {
  ticket?: {
    id: string;
    status: string;
    adminNote: string;
    reviewedBy?: string | null;
    reviewedAt?: string | null;
    updatedAt?: string | null;
  };
  error?: string;
};

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

function formatStatus(value: string) {
  return value.replace(/_/g, " ");
}

export default function AdminSupportPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [statusDrafts, setStatusDrafts] = useState<Record<string, SupportStatus>>({});
  const [activeTicketId, setActiveTicketId] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadSupportTickets() {
      setIsLoading(true);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Admin support auth error:", sessionError);
      }

      const email = session?.user.email?.toLowerCase() || "";

      if (!email || !adminEmails.includes(email)) {
        if (isMounted) {
          setAdminEmail(email);
          setIsAdmin(false);
          setTickets([]);
          setIsLoading(false);
        }
        return;
      }

      if (isMounted) {
        setAdminEmail(email);
        setIsAdmin(true);
      }

      try {
        const response = await fetch("/api/admin/support", {
          headers: {
            authorization: `Bearer ${session?.access_token || ""}`,
          },
        });
        const payload = (await response.json()) as AdminSupportResponse;

        if (!response.ok) {
          throw new Error(payload.error || "Support tickets could not be loaded.");
        }

        if (!isMounted) {
          return;
        }

        const loadedTickets = payload.tickets || [];

        setTickets(loadedTickets);
        setNoteDrafts(
          loadedTickets.reduce<Record<string, string>>((accumulator, ticket) => {
            accumulator[ticket.id] = ticket.adminNote;
            return accumulator;
          }, {}),
        );
        setStatusDrafts(
          loadedTickets.reduce<Record<string, SupportStatus>>((accumulator, ticket) => {
            accumulator[ticket.id] = supportStatuses.includes(ticket.status as SupportStatus)
              ? (ticket.status as SupportStatus)
              : "open";
            return accumulator;
          }, {}),
        );
        setStatusMessage(
          loadedTickets.length
            ? "Support tickets loaded."
            : "No support tickets right now.",
        );
      } catch (error) {
        console.error("Admin support fetch error:", error);

        if (isMounted) {
          setTickets([]);
          setStatusMessage(
            error instanceof Error
              ? `Support tickets could not be loaded: ${error.message}`
              : "Support tickets could not be loaded.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSupportTickets();

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleTickets = useMemo(
    () =>
      tickets.filter((ticket) => {
        const statusMatches = statusFilter === "all" || ticket.status === statusFilter;
        const topicMatches = topicFilter === "all" || ticket.topic === topicFilter;

        return statusMatches && topicMatches;
      }),
    [tickets, statusFilter, topicFilter],
  );

  const stats = useMemo(
    () => [
      {
        label: "Open",
        value: tickets.filter((ticket) => ticket.status === "open").length.toString(),
      },
      {
        label: "In Review",
        value: tickets
          .filter((ticket) => ticket.status === "in_review")
          .length.toString(),
      },
      {
        label: "Resolved",
        value: tickets.filter((ticket) => ticket.status === "resolved").length.toString(),
      },
      {
        label: "Closed",
        value: tickets.filter((ticket) => ticket.status === "closed").length.toString(),
      },
      { label: "Total", value: tickets.length.toString() },
    ],
    [tickets],
  );

  async function updateTicket(ticket: SupportTicket, nextStatus?: SupportStatus) {
    const status = nextStatus || statusDrafts[ticket.id] || "open";
    const adminNote = noteDrafts[ticket.id]?.trim() || "";

    setActiveTicketId(ticket.id);
    setStatusMessage("");

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Admin support update session error:", sessionError);
    }

    if (!session?.access_token) {
      setStatusMessage("Sign in as an admin to update support tickets.");
      setActiveTicketId("");
      return;
    }

    try {
      const response = await fetch("/api/admin/support", {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${session.access_token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ticketId: ticket.id,
          status,
          adminNote,
        }),
      });
      const payload = (await response.json()) as AdminSupportUpdateResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Support ticket could not be updated.");
      }

      setTickets((items) =>
        items.map((item) =>
          item.id === ticket.id
            ? {
                ...item,
                status: payload.ticket?.status || status,
                adminNote: payload.ticket?.adminNote || adminNote,
                reviewedAt: payload.ticket?.reviewedAt || item.reviewedAt,
                updatedAt: payload.ticket?.updatedAt || item.updatedAt,
              }
            : item,
        ),
      );
      setStatusDrafts((drafts) => ({ ...drafts, [ticket.id]: status }));
      setStatusMessage(`Ticket ${shortId(ticket.id)} updated.`);
    } catch (error) {
      console.error("Admin support update error:", error);
      setStatusMessage(
        error instanceof Error ? error.message : "Support ticket could not be updated.",
      );
    } finally {
      setActiveTicketId("");
    }
  }

  return (
    <main className="admin-support-page">
      <style>{pageStyles}</style>
      <AdminLayout />
      <div className="admin-support-shell">
        <Header />

        <section className="page-heading">
          <div>
            <span>Internal Admin</span>
            <h1>Support Tickets</h1>
            <p>
              Review GRAIL support requests, filter by topic or status, and save
              internal admin notes.
            </p>
          </div>
          <Link href="/admin/reports">Reports Dashboard</Link>
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
            {statusMessage ? <p className="status-message">{statusMessage}</p> : null}

            <section className="stats-grid" aria-label="Support ticket status summary">
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
                <p>Filter support tickets by current status and topic.</p>
              </div>
              <div className="filter-controls">
                <label>
                  <span>Status</span>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                  >
                    <option value="all">All statuses</option>
                    {supportStatuses.map((status) => (
                      <option key={status} value={status}>
                        {formatStatus(status)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Topic</span>
                  <select
                    value={topicFilter}
                    onChange={(event) => setTopicFilter(event.target.value)}
                  >
                    <option value="all">All topics</option>
                    {supportTopics.map((topic) => (
                      <option key={topic} value={topic}>
                        {topic}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section className="panel tickets-panel">
              <div className="panel-heading">
                <div>
                  <span>Support Queue</span>
                  <h2>{visibleTickets.length} visible tickets</h2>
                </div>
                <p>Support admin is hidden from public navigation.</p>
              </div>

              {isLoading ? <p className="empty-state">Loading support tickets...</p> : null}

              {!isLoading && visibleTickets.length === 0 ? (
                <article className="empty-state">
                  <h3>No matching tickets.</h3>
                  <p>Tickets that match the current filters will appear here.</p>
                </article>
              ) : null}

              {!isLoading
                ? visibleTickets.map((ticket) => (
                    <article key={ticket.id} className="ticket-card">
                      <div className="ticket-header">
                        <div>
                          <span>Ticket {ticket.shortId || shortId(ticket.id)}</span>
                          <h3>{ticket.topic}</h3>
                        </div>
                        <div className="ticket-links">
                          {ticket.orderId ? <Link href="/orders">View Order</Link> : null}
                          {ticket.listingId ? (
                            <Link href={`/cards/${ticket.listingId}`}>View Listing</Link>
                          ) : null}
                        </div>
                      </div>

                      <div className="status-row">
                        <StatusBadge label="Status" value={formatStatus(ticket.status)} />
                        <StatusBadge label="Topic" value={ticket.topic} />
                        <StatusBadge
                          label="Signed-in user"
                          value={ticket.signedInUserName}
                        />
                      </div>

                      <div className="detail-grid">
                        <Info label="Submitter Name" value={ticket.name || "Not provided"} />
                        <Info label="Submitter Email" value={ticket.email || "Not provided"} />
                        <Info
                          label="User ID"
                          value={ticket.userId ? shortId(ticket.userId) : "Guest"}
                        />
                        <Info label="Order ID" value={ticket.orderId || "Not provided"} />
                        <Info
                          label="Listing ID"
                          value={
                            ticket.listingId
                              ? `${ticket.listingTitle || "Listing"} (${shortId(ticket.listingId)})`
                              : "Not provided"
                          }
                        />
                        <Info label="Created" value={formatDateTime(ticket.createdAt)} />
                        <Info label="Reviewed" value={formatDateTime(ticket.reviewedAt)} />
                        <Info
                          label="Reviewed By"
                          value={
                            ticket.reviewedByName
                              ? `${ticket.reviewedByName} (${shortId(ticket.reviewedBy)})`
                              : "Not reviewed"
                          }
                        />
                        <Info label="Updated" value={formatDateTime(ticket.updatedAt)} />
                      </div>

                      <div className="notes-block">
                        <strong>Message</strong>
                        <p>{ticket.message}</p>
                      </div>

                      <div className="review-grid">
                        <label>
                          <span>Status</span>
                          <select
                            value={statusDrafts[ticket.id] || "open"}
                            onChange={(event) =>
                              setStatusDrafts((drafts) => ({
                                ...drafts,
                                [ticket.id]: event.target.value as SupportStatus,
                              }))
                            }
                          >
                            {supportStatuses.map((status) => (
                              <option key={status} value={status}>
                                {formatStatus(status)}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          <span>Admin note</span>
                          <textarea
                            value={noteDrafts[ticket.id] || ""}
                            onChange={(event) =>
                              setNoteDrafts((drafts) => ({
                                ...drafts,
                                [ticket.id]: event.target.value,
                              }))
                            }
                            placeholder="Add internal support notes."
                          />
                        </label>
                      </div>

                      <div className="ticket-actions">
                        <button
                          type="button"
                          disabled={activeTicketId === ticket.id}
                          onClick={() => updateTicket(ticket)}
                        >
                          {activeTicketId === ticket.id ? "Saving..." : "Save Admin Note"}
                        </button>
                        <button
                          type="button"
                          disabled={activeTicketId === ticket.id}
                          onClick={() => updateTicket(ticket, "in_review")}
                        >
                          Mark in review
                        </button>
                        <button
                          type="button"
                          disabled={activeTicketId === ticket.id}
                          onClick={() => updateTicket(ticket, "resolved")}
                        >
                          Mark resolved
                        </button>
                        <button
                          type="button"
                          disabled={activeTicketId === ticket.id}
                          onClick={() => updateTicket(ticket, "closed")}
                        >
                          Close
                        </button>
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
  .admin-support-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at top left, rgba(231, 222, 208, 0.08), transparent 34rem),
      radial-gradient(circle at bottom right, rgba(201, 205, 211, 0.06), transparent 30rem),
      #050505;
    color: #f7f3ec;
  }

  .admin-support-shell {
    width: min(100%, 1460px);
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
  .ticket-header span,
  .info-item span,
  .review-grid label span {
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

  .page-heading p,
  .filters-panel p,
  .panel-heading p,
  .access-panel p,
  .empty-state p,
  .notes-block p {
    color: rgba(247, 243, 236, 0.7);
    line-height: 1.6;
  }

  .page-heading a,
  .ticket-links a {
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
  .ticket-card {
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
  .tickets-panel {
    padding: 22px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
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

  .filters-panel,
  .panel-heading,
  .ticket-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
  }

  .filters-panel {
    margin-bottom: 18px;
  }

  .filter-controls,
  .ticket-links,
  .ticket-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .filter-controls label,
  .review-grid label {
    display: grid;
    gap: 8px;
  }

  select,
  textarea {
    border: 1px solid rgba(231, 222, 208, 0.18);
    border-radius: 12px;
    color: #f7f3ec;
    background: #0b0b0c;
  }

  select {
    min-height: 42px;
    padding: 0 12px;
  }

  textarea {
    min-height: 92px;
    resize: vertical;
    padding: 12px;
    line-height: 1.5;
  }

  .panel-heading {
    margin-bottom: 16px;
  }

  .panel-heading h2,
  .ticket-header h3,
  .access-panel h2,
  .empty-state h3 {
    margin: 4px 0 0;
    color: #e7ded0;
  }

  .ticket-card {
    padding: 20px;
  }

  .ticket-card + .ticket-card {
    margin-top: 14px;
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
  .review-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .review-grid {
    grid-template-columns: 240px 1fr;
    margin-top: 12px;
  }

  .info-item,
  .notes-block {
    min-width: 0;
    border: 1px solid rgba(201, 205, 211, 0.12);
    border-radius: 12px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.025);
  }

  .notes-block {
    margin-top: 12px;
  }

  .info-item strong,
  .notes-block strong {
    display: block;
    overflow-wrap: anywhere;
    margin-top: 6px;
    color: #f7f3ec;
    font-size: 0.94rem;
    line-height: 1.4;
  }

  .notes-block p {
    margin: 6px 0 0;
  }

  .ticket-actions {
    margin-top: 12px;
  }

  .ticket-actions button {
    border: 1px solid rgba(231, 222, 208, 0.24);
    border-radius: 999px;
    min-height: 42px;
    padding: 0 14px;
    color: #e7ded0;
    background: rgba(255, 255, 255, 0.04);
    cursor: pointer;
  }

  .ticket-actions button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .ticket-actions button:first-child {
    color: #050505;
    background: #e7ded0;
  }

  .empty-state {
    border: 1px dashed rgba(231, 222, 208, 0.22);
    border-radius: 16px;
    padding: 22px;
    text-align: center;
  }

  @media (max-width: 1080px) {
    .stats-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .detail-grid,
    .review-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 760px) {
    .admin-support-shell {
      padding: 0 14px 44px;
    }

    .page-heading,
    .filters-panel,
    .panel-heading,
    .ticket-header {
      align-items: stretch;
      flex-direction: column;
    }

    .stats-grid {
      grid-template-columns: 1fr;
    }
  }
`;
