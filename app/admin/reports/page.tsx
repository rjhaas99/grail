"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../AdminLayout";
import { supabase } from "../../../lib/supabase";
import Header from "../../components/Header";

const adminEmails = ["ryanjhaas99@gmail.com"];
const reportStatuses = ["open", "reviewed", "dismissed", "action_taken"] as const;
const reportReasons = [
  "Counterfeit / authenticity concern",
  "Wrong photos",
  "Wrong card details",
  "Wrong grade or condition",
  "Suspicious seller",
  "Scam or unsafe listing",
  "Other",
] as const;

type ReportStatus = (typeof reportStatuses)[number];

type ListingReport = {
  id: string;
  shortId: string;
  listingId: string;
  listingTitle: string;
  listingStatus: string;
  reporterId?: string | null;
  reporterName: string;
  sellerId?: string | null;
  sellerName: string;
  reason: string;
  details: string;
  status: string;
  adminNote: string;
  reviewedBy?: string | null;
  reviewedByName: string;
  reviewedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type AdminReportsResponse = {
  reports?: ListingReport[];
  error?: string;
};

type AdminReportUpdateResponse = {
  report?: {
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

export default function AdminReportsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [reports, setReports] = useState<ListingReport[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reasonFilter, setReasonFilter] = useState("all");
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [statusDrafts, setStatusDrafts] = useState<Record<string, ReportStatus>>({});
  const [activeReportId, setActiveReportId] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadReports() {
      setIsLoading(true);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Admin reports auth error:", sessionError);
      }

      const email = session?.user.email?.toLowerCase() || "";

      if (!email || !adminEmails.includes(email)) {
        if (isMounted) {
          setAdminEmail(email);
          setIsAdmin(false);
          setReports([]);
          setIsLoading(false);
        }
        return;
      }

      if (isMounted) {
        setAdminEmail(email);
        setIsAdmin(true);
      }

      try {
        const response = await fetch("/api/admin/reports", {
          headers: {
            authorization: `Bearer ${session?.access_token || ""}`,
          },
        });
        const payload = (await response.json()) as AdminReportsResponse;

        if (!response.ok) {
          throw new Error(payload.error || "Reports could not be loaded.");
        }

        if (!isMounted) {
          return;
        }

        const loadedReports = payload.reports || [];

        setReports(loadedReports);
        setNoteDrafts(
          loadedReports.reduce<Record<string, string>>((accumulator, report) => {
            accumulator[report.id] = report.adminNote;
            return accumulator;
          }, {}),
        );
        setStatusDrafts(
          loadedReports.reduce<Record<string, ReportStatus>>((accumulator, report) => {
            accumulator[report.id] = reportStatuses.includes(report.status as ReportStatus)
              ? (report.status as ReportStatus)
              : "open";
            return accumulator;
          }, {}),
        );
        setStatusMessage(
          loadedReports.length
            ? "Listing reports loaded."
            : "No listing reports right now.",
        );
      } catch (error) {
        console.error("Admin reports fetch error:", error);

        if (isMounted) {
          setReports([]);
          setStatusMessage(
            error instanceof Error
              ? `Reports could not be loaded: ${error.message}`
              : "Reports could not be loaded.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadReports();

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleReports = useMemo(
    () =>
      reports.filter((report) => {
        const statusMatches = statusFilter === "all" || report.status === statusFilter;
        const reasonMatches = reasonFilter === "all" || report.reason === reasonFilter;

        return statusMatches && reasonMatches;
      }),
    [reports, statusFilter, reasonFilter],
  );

  const stats = useMemo(
    () => [
      { label: "Total reports", value: reports.length.toString() },
      {
        label: "Open",
        value: reports.filter((report) => report.status === "open").length.toString(),
      },
      {
        label: "Reviewed",
        value: reports.filter((report) => report.status === "reviewed").length.toString(),
      },
      {
        label: "Dismissed",
        value: reports.filter((report) => report.status === "dismissed").length.toString(),
      },
      {
        label: "Action taken",
        value: reports
          .filter((report) => report.status === "action_taken")
          .length.toString(),
      },
    ],
    [reports],
  );

  async function updateReport(report: ListingReport, nextStatus?: ReportStatus) {
    const status = nextStatus || statusDrafts[report.id] || "open";
    const adminNote = noteDrafts[report.id]?.trim() || "";

    setActiveReportId(report.id);
    setStatusMessage("");

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Admin report update session error:", sessionError);
    }

    if (!session?.access_token) {
      setStatusMessage("Sign in as an admin to update reports.");
      setActiveReportId("");
      return;
    }

    try {
      const response = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${session.access_token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          reportId: report.id,
          status,
          adminNote,
        }),
      });
      const payload = (await response.json()) as AdminReportUpdateResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Report could not be updated.");
      }

      setReports((items) =>
        items.map((item) =>
          item.id === report.id
            ? {
                ...item,
                status: payload.report?.status || status,
                adminNote: payload.report?.adminNote || adminNote,
                reviewedAt: payload.report?.reviewedAt || item.reviewedAt,
                updatedAt: payload.report?.updatedAt || item.updatedAt,
              }
            : item,
        ),
      );
      setStatusDrafts((drafts) => ({ ...drafts, [report.id]: status }));
      setStatusMessage(`Report ${shortId(report.id)} updated.`);
    } catch (error) {
      console.error("Admin report update error:", error);
      setStatusMessage(
        error instanceof Error ? error.message : "Report could not be updated.",
      );
    } finally {
      setActiveReportId("");
    }
  }

  return (
    <main className="admin-reports-page">
      <style>{pageStyles}</style>
      <AdminLayout />
      <div className="admin-reports-shell">
        <Header />

        <section className="page-heading">
          <div>
            <span>Internal Admin</span>
            <h1>Listing Reports</h1>
            <p>
              Review reported listings, filter by reason or status, and record
              internal admin decisions.
            </p>
          </div>
          <Link href="/admin/payments">Payments Dashboard</Link>
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

            <section className="stats-grid" aria-label="Report status summary">
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
                <p>Filter the hidden report queue by current status and report reason.</p>
              </div>
              <div className="filter-controls">
                <label>
                  <span>Status</span>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                  >
                    <option value="all">All statuses</option>
                    {reportStatuses.map((status) => (
                      <option key={status} value={status}>
                        {formatStatus(status)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Reason</span>
                  <select
                    value={reasonFilter}
                    onChange={(event) => setReasonFilter(event.target.value)}
                  >
                    <option value="all">All reasons</option>
                    {reportReasons.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section className="panel reports-panel">
              <div className="panel-heading">
                <div>
                  <span>Report Queue</span>
                  <h2>{visibleReports.length} visible reports</h2>
                </div>
                <p>Reports are hidden from public navigation.</p>
              </div>

              {isLoading ? <p className="empty-state">Loading reports...</p> : null}

              {!isLoading && visibleReports.length === 0 ? (
                <article className="empty-state">
                  <h3>No matching reports.</h3>
                  <p>Reports that match the current filters will appear here.</p>
                </article>
              ) : null}

              {!isLoading
                ? visibleReports.map((report) => (
                    <article key={report.id} className="report-card">
                      <div className="report-header">
                        <div>
                          <span>Report {report.shortId || shortId(report.id)}</span>
                          <h3>{report.listingTitle}</h3>
                        </div>
                        <div className="report-links">
                          <Link href={`/cards/${report.listingId}`}>View Card</Link>
                          <Link href={`/collections/${report.sellerId || ""}`}>
                            View Seller
                          </Link>
                        </div>
                      </div>

                      <div className="status-row">
                        <StatusBadge label="Report" value={formatStatus(report.status)} />
                        <StatusBadge label="Reason" value={report.reason} />
                        <StatusBadge label="Listing" value={report.listingStatus} />
                      </div>

                      <div className="detail-grid">
                        <Info
                          label="Reporter"
                          value={`${report.reporterName} (${shortId(report.reporterId)})`}
                        />
                        <Info
                          label="Seller"
                          value={`${report.sellerName} (${shortId(report.sellerId)})`}
                        />
                        <Info label="Created" value={formatDateTime(report.createdAt)} />
                        <Info label="Reviewed" value={formatDateTime(report.reviewedAt)} />
                        <Info
                          label="Reviewed By"
                          value={
                            report.reviewedByName
                              ? `${report.reviewedByName} (${shortId(report.reviewedBy)})`
                              : "Not reviewed"
                          }
                        />
                        <Info label="Updated" value={formatDateTime(report.updatedAt)} />
                      </div>

                      <div className="notes-block">
                        <strong>Reporter details</strong>
                        <p>{report.details || "No extra details provided."}</p>
                      </div>

                      <div className="review-grid">
                        <label>
                          <span>Status</span>
                          <select
                            value={statusDrafts[report.id] || "open"}
                            onChange={(event) =>
                              setStatusDrafts((drafts) => ({
                                ...drafts,
                                [report.id]: event.target.value as ReportStatus,
                              }))
                            }
                          >
                            {reportStatuses.map((status) => (
                              <option key={status} value={status}>
                                {formatStatus(status)}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          <span>Admin note</span>
                          <textarea
                            value={noteDrafts[report.id] || ""}
                            onChange={(event) =>
                              setNoteDrafts((drafts) => ({
                                ...drafts,
                                [report.id]: event.target.value,
                              }))
                            }
                            placeholder="Add internal review notes or action taken."
                          />
                        </label>
                      </div>

                      <div className="report-actions">
                        <button
                          type="button"
                          disabled={activeReportId === report.id}
                          onClick={() => updateReport(report)}
                        >
                          {activeReportId === report.id ? "Saving..." : "Save Review"}
                        </button>
                        <button
                          type="button"
                          disabled={activeReportId === report.id}
                          onClick={() => updateReport(report, "reviewed")}
                        >
                          Mark Reviewed
                        </button>
                        <button
                          type="button"
                          disabled={activeReportId === report.id}
                          onClick={() => updateReport(report, "dismissed")}
                        >
                          Dismiss
                        </button>
                        <button
                          type="button"
                          disabled={activeReportId === report.id}
                          onClick={() => updateReport(report, "action_taken")}
                        >
                          Action Taken
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
  .admin-reports-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at top left, rgba(231, 222, 208, 0.08), transparent 34rem),
      radial-gradient(circle at bottom right, rgba(201, 205, 211, 0.06), transparent 30rem),
      #050505;
    color: #f7f3ec;
  }

  .admin-reports-shell {
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
  .report-header span,
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
  .report-links a {
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
  .report-card {
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
  .reports-panel {
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
  .report-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
  }

  .filters-panel {
    margin-bottom: 18px;
  }

  .filter-controls,
  .report-links,
  .report-actions {
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
  .report-header h3,
  .access-panel h2,
  .empty-state h3 {
    margin: 4px 0 0;
    color: #e7ded0;
  }

  .report-card {
    padding: 20px;
  }

  .report-card + .report-card {
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

  .report-actions {
    margin-top: 12px;
  }

  .report-actions button {
    border: 1px solid rgba(231, 222, 208, 0.24);
    border-radius: 999px;
    min-height: 42px;
    padding: 0 14px;
    color: #e7ded0;
    background: rgba(255, 255, 255, 0.04);
    cursor: pointer;
  }

  .report-actions button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .report-actions button:first-child {
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
    .admin-reports-shell {
      padding: 0 14px 44px;
    }

    .page-heading,
    .filters-panel,
    .panel-heading,
    .report-header {
      align-items: stretch;
      flex-direction: column;
    }

    .stats-grid {
      grid-template-columns: 1fr;
    }
  }
`;
