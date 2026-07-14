"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import AdminLayout from "../AdminLayout";
import Header from "../../components/Header";
import { supabase } from "../../../lib/supabase";

const adminEmails = ["ryanjhaas99@gmail.com"];
const riskLevels = ["Low Risk", "Medium Risk", "High Risk", "Critical"] as const;

type TrustBadge = {
  key: string;
  label: string;
  description: string;
};

type TrustRecord = {
  userId: string;
  userName: string;
  username: string;
  email: string;
  internalTrustScore: number;
  trustLevel: string;
  verifiedEmail: boolean;
  verifiedPhone: boolean;
  verifiedIdentity: boolean;
  successfulSales: number;
  successfulPurchases: number;
  successfulAuctions: number;
  successfulDeliveries: number;
  positiveFeedback: number;
  negativeFeedback: number;
  chargebacks: number;
  disputesOpened: number;
  disputesLost: number;
  disputesWon: number;
  sellerCancellations: number;
  buyerCancellations: number;
  auctionDefaults: number;
  fraudFlags: number;
  manualReviewRequired: boolean;
  internalNote: string;
  accountCreatedAt: string | null;
  updatedAt: string | null;
  badges: TrustBadge[];
};

type TrustEvent = {
  id: string;
  userId: string;
  userName: string;
  eventType: string;
  oldScore: number;
  newScore: number;
  reason: string;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string | null;
};

type AdminTrustResponse = {
  records?: TrustRecord[];
  events?: TrustEvent[];
  error?: string;
  message?: string;
};

type TrustAction =
  | "require_manual_review"
  | "clear_manual_review"
  | "add_fraud_flag"
  | "remove_fraud_flag"
  | "adjust_score"
  | "set_risk_level"
  | "set_verification"
  | "save_note";

function formatDate(value?: string | null) {
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

function formatEventType(value: string) {
  return value.replace(/_/g, " ").toLowerCase();
}

function shortId(value?: string | null) {
  return value ? value.slice(0, 8) : "Unknown";
}

export default function AdminTrustPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [records, setRecords] = useState<TrustRecord[]>([]);
  const [events, setEvents] = useState<TrustEvent[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [scoreAdjustment, setScoreAdjustment] = useState("0");
  const [riskLevelDraft, setRiskLevelDraft] = useState("Low Risk");
  const [internalNote, setInternalNote] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState(false);
  const [verifiedIdentity, setVerifiedIdentity] = useState(false);
  const [riskFilter, setRiskFilter] = useState("all");
  const [reviewFilter, setReviewFilter] = useState("all");

  const selectedRecord =
    records.find((record) => record.userId === selectedUserId) || null;

  const filteredRecords = useMemo(
    () =>
      records.filter((record) => {
        if (riskFilter !== "all" && record.trustLevel !== riskFilter) {
          return false;
        }

        if (reviewFilter === "review" && !record.manualReviewRequired) {
          return false;
        }

        if (reviewFilter === "fraud" && record.fraudFlags <= 0) {
          return false;
        }

        return true;
      }),
    [records, reviewFilter, riskFilter],
  );

  const stats = useMemo(
    () => ({
      total: records.length,
      manualReview: records.filter((record) => record.manualReviewRequired).length,
      fraudFlags: records.reduce((sum, record) => sum + record.fraudFlags, 0),
      verifiedIdentity: records.filter((record) => record.verifiedIdentity).length,
      highRisk: records.filter((record) =>
        ["High Risk", "Critical"].includes(record.trustLevel),
      ).length,
    }),
    [records],
  );

  async function loadTrust(nextSearch = search) {
    setIsLoading(true);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Admin trust session error:", sessionError);
    }

    const email = session?.user.email?.toLowerCase() || "";

    if (!email || !adminEmails.includes(email)) {
      setAdminEmail(email);
      setIsAdmin(false);
      setRecords([]);
      setEvents([]);
      setStatus("Access denied.");
      setIsLoading(false);
      return;
    }

    setAdminEmail(email);
    setIsAdmin(true);

    try {
      const query = nextSearch ? `?search=${encodeURIComponent(nextSearch)}` : "";
      const response = await fetch(`/api/admin/trust${query}`, {
        headers: {
          authorization: `Bearer ${session?.access_token || ""}`,
        },
      });
      const payload = (await response.json()) as AdminTrustResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Trust records could not be loaded.");
      }

      setRecords(payload.records || []);
      setEvents(payload.events || []);
      setStatus((payload.records || []).length ? "Trust records loaded." : "No trust records found.");
    } catch (error) {
      console.error("Admin trust load error:", error);
      setRecords([]);
      setEvents([]);
      setStatus(error instanceof Error ? error.message : "Trust records could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }

  function selectRecord(record: TrustRecord) {
    setSelectedUserId(record.userId);
    setRiskLevelDraft(record.trustLevel);
    setInternalNote(record.internalNote || "");
    setVerifiedEmail(record.verifiedEmail);
    setVerifiedPhone(record.verifiedPhone);
    setVerifiedIdentity(record.verifiedIdentity);
    setScoreAdjustment("0");
  }

  async function submitTrustAction(action: TrustAction) {
    if (!selectedRecord) {
      setStatus("Select a user before saving.");
      return;
    }

    const confirmation = window.confirm(
      `Apply ${formatEventType(action).toUpperCase()} to ${selectedRecord.userName}?`,
    );

    if (!confirmation) {
      return;
    }

    setIsSaving(true);
    setStatus("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    try {
      const response = await fetch("/api/admin/trust", {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${session?.access_token || ""}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedRecord.userId,
          action,
          scoreAdjustment: Number(scoreAdjustment || 0),
          trustLevel: riskLevelDraft,
          internalNote,
          verifiedEmail,
          verifiedPhone,
          verifiedIdentity,
        }),
      });
      const payload = (await response.json()) as AdminTrustResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Trust action could not be saved.");
      }

      setStatus(payload.message || "Trust record updated.");
      await loadTrust(search);
    } catch (error) {
      console.error("Admin trust save error:", error);
      setStatus(error instanceof Error ? error.message : "Trust action could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadTrust(search);
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadTrust("");
    }, 0);

    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="admin-trust-page">
      <style>{pageStyles}</style>
      <AdminLayout />
      <div className="admin-trust-shell">
        <Header />

        <section className="page-heading">
          <div>
            <span>Trust System</span>
            <h1>GRAIL Trust</h1>
            <p>Internal trust, verification, risk, and audit framework for marketplace safety.</p>
          </div>
          <button type="button" onClick={() => loadTrust(search)} disabled={isLoading}>
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </section>

        {!isAdmin && !isLoading ? (
          <section className="panel access-panel">
            <h2>Access denied</h2>
            <p>{adminEmail ? `${adminEmail} is not allowed.` : "Sign in as an admin."}</p>
          </section>
        ) : (
          <>
            <section className="stats-grid">
              <article className="panel stat-card">
                <span>Trust Records</span>
                <strong>{stats.total}</strong>
              </article>
              <article className="panel stat-card">
                <span>Manual Review</span>
                <strong>{stats.manualReview}</strong>
              </article>
              <article className="panel stat-card">
                <span>Fraud Flags</span>
                <strong>{stats.fraudFlags}</strong>
              </article>
              <article className="panel stat-card">
                <span>Verified Identity</span>
                <strong>{stats.verifiedIdentity}</strong>
              </article>
              <article className="panel stat-card">
                <span>High / Critical</span>
                <strong>{stats.highRisk}</strong>
              </article>
            </section>

            <section className="trust-layout">
              <div className="panel records-panel">
                <div className="panel-heading">
                  <div>
                    <span>Users</span>
                    <h2>Trust Records</h2>
                  </div>
                </div>
                <form className="filter-row" onSubmit={handleSearchSubmit}>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search name, email, username, or user ID"
                  />
                  <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)}>
                    <option value="all">All risk levels</option>
                    {riskLevels.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                  <select value={reviewFilter} onChange={(event) => setReviewFilter(event.target.value)}>
                    <option value="all">All records</option>
                    <option value="review">Manual review</option>
                    <option value="fraud">Fraud flags</option>
                  </select>
                  <button type="submit" disabled={isLoading}>
                    Search
                  </button>
                </form>

                <div className="record-list">
                  {filteredRecords.map((record) => (
                    <button
                      key={record.userId}
                      type="button"
                      className={`record-row ${record.userId === selectedUserId ? "active" : ""}`}
                      onClick={() => selectRecord(record)}
                    >
                      <div>
                        <strong>{record.userName}</strong>
                        <span>{record.email || record.username || shortId(record.userId)}</span>
                      </div>
                      <div className="record-meta">
                        <em>{record.trustLevel}</em>
                        <small>{record.internalTrustScore}</small>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <aside className="panel detail-panel">
                {selectedRecord ? (
                  <>
                    <div className="panel-heading">
                      <div>
                        <span>Selected User</span>
                        <h2>{selectedRecord.userName}</h2>
                        <p>{selectedRecord.email || selectedRecord.userId}</p>
                      </div>
                    </div>

                    <div className="risk-strip">
                      <div>
                        <span>Internal Trust Score</span>
                        <strong>{selectedRecord.internalTrustScore}</strong>
                      </div>
                      <div>
                        <span>Risk Level</span>
                        <strong>{selectedRecord.trustLevel}</strong>
                      </div>
                      <div>
                        <span>Manual Review</span>
                        <strong>{selectedRecord.manualReviewRequired ? "Required" : "Clear"}</strong>
                      </div>
                    </div>

                    <div className="badge-list">
                      {selectedRecord.badges.length > 0 ? (
                        selectedRecord.badges.map((badge) => (
                          <span key={badge.key} title={badge.description}>
                            {badge.label}
                          </span>
                        ))
                      ) : (
                        <em>No public trust badges yet.</em>
                      )}
                    </div>

                    <div className="metric-grid">
                      <span>Sales <strong>{selectedRecord.successfulSales}</strong></span>
                      <span>Purchases <strong>{selectedRecord.successfulPurchases}</strong></span>
                      <span>Auctions <strong>{selectedRecord.successfulAuctions}</strong></span>
                      <span>Deliveries <strong>{selectedRecord.successfulDeliveries}</strong></span>
                      <span>Positive Feedback <strong>{selectedRecord.positiveFeedback}</strong></span>
                      <span>Negative Feedback <strong>{selectedRecord.negativeFeedback}</strong></span>
                      <span>Disputes Opened <strong>{selectedRecord.disputesOpened}</strong></span>
                      <span>Disputes Won <strong>{selectedRecord.disputesWon}</strong></span>
                      <span>Disputes Lost <strong>{selectedRecord.disputesLost}</strong></span>
                      <span>Chargebacks <strong>{selectedRecord.chargebacks}</strong></span>
                      <span>Seller Cancellations <strong>{selectedRecord.sellerCancellations}</strong></span>
                      <span>Buyer Cancellations <strong>{selectedRecord.buyerCancellations}</strong></span>
                      <span>Auction Defaults <strong>{selectedRecord.auctionDefaults}</strong></span>
                      <span>Fraud Flags <strong>{selectedRecord.fraudFlags}</strong></span>
                    </div>

                    <div className="control-stack">
                      <label>
                        <span>Risk level</span>
                        <select value={riskLevelDraft} onChange={(event) => setRiskLevelDraft(event.target.value)}>
                          {riskLevels.map((level) => (
                            <option key={level} value={level}>
                              {level}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button type="button" onClick={() => submitTrustAction("set_risk_level")} disabled={isSaving}>
                        Save Risk Level
                      </button>

                      <div className="verification-grid">
                        <label>
                          <input
                            type="checkbox"
                            checked={verifiedEmail}
                            onChange={(event) => setVerifiedEmail(event.target.checked)}
                          />
                          Verified Email
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={verifiedPhone}
                            onChange={(event) => setVerifiedPhone(event.target.checked)}
                          />
                          Verified Phone
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={verifiedIdentity}
                            onChange={(event) => setVerifiedIdentity(event.target.checked)}
                          />
                          Verified Identity
                        </label>
                      </div>
                      <button type="button" onClick={() => submitTrustAction("set_verification")} disabled={isSaving}>
                        Save Verification
                      </button>

                      <label>
                        <span>Trust score adjustment</span>
                        <input
                          type="number"
                          value={scoreAdjustment}
                          onChange={(event) => setScoreAdjustment(event.target.value)}
                        />
                      </label>
                      <button type="button" onClick={() => submitTrustAction("adjust_score")} disabled={isSaving}>
                        Adjust Trust Score
                      </button>

                      <label>
                        <span>Internal note</span>
                        <textarea
                          value={internalNote}
                          onChange={(event) => setInternalNote(event.target.value)}
                          placeholder="Internal trust note"
                        />
                      </label>
                      <button type="button" onClick={() => submitTrustAction("save_note")} disabled={isSaving}>
                        Save Internal Note
                      </button>

                      <div className="action-grid">
                        <button type="button" onClick={() => submitTrustAction("require_manual_review")} disabled={isSaving}>
                          Require Manual Review
                        </button>
                        <button type="button" onClick={() => submitTrustAction("clear_manual_review")} disabled={isSaving}>
                          Clear Manual Review
                        </button>
                        <button type="button" onClick={() => submitTrustAction("add_fraud_flag")} disabled={isSaving}>
                          Add Fraud Flag
                        </button>
                        <button type="button" onClick={() => submitTrustAction("remove_fraud_flag")} disabled={isSaving}>
                          Remove Fraud Flag
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="empty-state">
                    <h2>Select a user</h2>
                    <p>Search or choose a trust record to review verification, history, fraud flags, and manual review state.</p>
                  </div>
                )}
              </aside>
            </section>

            <section className="panel events-panel">
              <div className="panel-heading">
                <div>
                  <span>Audit History</span>
                  <h2>Recent Trust Events</h2>
                </div>
              </div>
              <div className="event-list">
                {events.length > 0 ? (
                  events.map((event) => (
                    <div key={event.id} className="event-row">
                      <div>
                        <strong>{formatEventType(event.eventType)}</strong>
                        <span>{event.userName} · {event.reason || "No reason provided"}</span>
                      </div>
                      <div>
                        <em>{event.oldScore} → {event.newScore}</em>
                        <small>{formatDate(event.createdAt)}</small>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No trust events recorded yet.</p>
                )}
              </div>
            </section>

            <section className="panel future-panel">
              <div className="panel-heading">
                <div>
                  <span>Future Ready</span>
                  <h2>Trust Integrations</h2>
                </div>
              </div>
              <div className="future-grid">
                {[
                  "Identity Provider",
                  "Driver License",
                  "Passport",
                  "Selfie Verification",
                  "Device Reputation",
                  "IP Reputation",
                  "Shipping Reputation",
                  "AI Risk",
                  "Manual Review",
                ].map((item) => (
                  <span key={item}>{item} · Framework Ready</span>
                ))}
              </div>
            </section>

            {status ? <p className="status-message">{status}</p> : null}
          </>
        )}
      </div>
    </main>
  );
}

const pageStyles = `
  .admin-trust-page {
    min-height: 100vh;
    background: radial-gradient(circle at 50% -120px, rgba(201,205,211,0.08), transparent 32%), linear-gradient(180deg, #000 0%, #030304 58%, #000 100%);
    color: #fafafa;
    font-family: Arial, Helvetica, sans-serif;
  }
  .admin-trust-shell {
    width: min(1240px, calc(100vw - 32px));
    margin: 0 auto;
    padding: 8px 0 42px;
  }
  .panel {
    border: 1px solid #1d1d22;
    border-radius: 12px;
    background: linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.008)), rgba(5,5,6,0.94);
    box-shadow: 0 18px 44px rgba(0,0,0,0.28);
  }
  .page-heading {
    margin-top: 18px;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 18px;
  }
  .page-heading span,
  .panel-heading span,
  .stat-card span,
  .risk-strip span,
  .control-stack label > span {
    color: #C9CDD3;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .page-heading h1,
  .panel-heading h2 {
    margin: 7px 0 0;
    color: #fff;
    font-size: 36px;
    line-height: 40px;
    font-weight: 900;
  }
  .panel-heading h2 {
    font-size: 22px;
    line-height: 27px;
  }
  .page-heading p,
  .panel-heading p,
  .status-message,
  .empty-state p,
  .event-list p {
    color: #a1a1aa;
    font-size: 13px;
    line-height: 18px;
    font-weight: 800;
  }
  button,
  input,
  select,
  textarea {
    font: inherit;
  }
  button {
    min-height: 36px;
    border: 1px solid rgba(231,222,208,0.28);
    border-radius: 10px;
    background: rgba(231,222,208,0.075);
    color: #fff;
    padding: 0 12px;
    font-size: 12px;
    line-height: 15px;
    font-weight: 900;
    cursor: pointer;
  }
  button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
  input,
  select,
  textarea {
    width: 100%;
    border: 1px solid rgba(201,205,211,0.16);
    border-radius: 10px;
    background: #050506;
    color: #fff;
    padding: 10px 11px;
    font-size: 13px;
    line-height: 17px;
    font-weight: 800;
  }
  textarea {
    min-height: 88px;
    resize: vertical;
  }
  .stats-grid {
    margin-top: 18px;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 12px;
  }
  .stat-card {
    padding: 14px;
  }
  .stat-card strong {
    display: block;
    margin-top: 8px;
    color: #fff;
    font-size: 26px;
    line-height: 30px;
    font-weight: 900;
  }
  .trust-layout {
    margin-top: 14px;
    display: grid;
    grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
    gap: 14px;
    align-items: start;
  }
  .records-panel,
  .detail-panel,
  .events-panel,
  .future-panel,
  .access-panel {
    padding: 16px;
  }
  .filter-row {
    margin-top: 14px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 150px 150px 90px;
    gap: 8px;
  }
  .record-list {
    margin-top: 12px;
    display: grid;
    gap: 8px;
    max-height: 620px;
    overflow: auto;
    padding-right: 4px;
  }
  .record-row {
    min-height: 64px;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    text-align: left;
    border-color: rgba(201,205,211,0.12);
    background: rgba(201,205,211,0.035);
  }
  .record-row.active {
    border-color: rgba(231,222,208,0.42);
    background: rgba(231,222,208,0.09);
  }
  .record-row strong,
  .event-row strong {
    display: block;
    color: #fff;
    font-size: 13px;
    line-height: 17px;
    font-weight: 900;
  }
  .record-row span,
  .event-row span,
  .event-row small {
    display: block;
    margin-top: 3px;
    color: #85858f;
    font-size: 11px;
    line-height: 15px;
    font-weight: 800;
  }
  .record-meta {
    text-align: right;
  }
  .record-meta em,
  .event-row em {
    display: block;
    color: #E7DED0;
    font-size: 12px;
    line-height: 16px;
    font-style: normal;
    font-weight: 900;
    text-transform: capitalize;
  }
  .record-meta small {
    color: #fff;
    font-size: 20px;
    line-height: 24px;
    font-weight: 900;
  }
  .risk-strip {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }
  .risk-strip div,
  .metric-grid span {
    border: 1px solid rgba(201,205,211,0.12);
    border-radius: 10px;
    background: rgba(201,205,211,0.035);
    padding: 12px;
  }
  .risk-strip strong {
    display: block;
    margin-top: 7px;
    color: #fff;
    font-size: 18px;
    line-height: 23px;
    font-weight: 900;
  }
  .badge-list {
    margin-top: 12px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .badge-list span,
  .badge-list em,
  .future-grid span {
    min-height: 30px;
    border: 1px solid rgba(231,222,208,0.22);
    border-radius: 999px;
    background: rgba(231,222,208,0.055);
    color: #E7DED0;
    padding: 0 10px;
    display: inline-flex;
    align-items: center;
    font-size: 11px;
    line-height: 14px;
    font-style: normal;
    font-weight: 900;
  }
  .metric-grid {
    margin-top: 12px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .metric-grid span {
    color: #a1a1aa;
    font-size: 12px;
    line-height: 16px;
    font-weight: 800;
  }
  .metric-grid strong {
    float: right;
    color: #fff;
  }
  .control-stack {
    margin-top: 14px;
    display: grid;
    gap: 10px;
  }
  .verification-grid,
  .action-grid,
  .future-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }
  .verification-grid label {
    min-height: 38px;
    border: 1px solid rgba(201,205,211,0.12);
    border-radius: 10px;
    background: rgba(201,205,211,0.035);
    color: #fff;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 10px;
    font-size: 12px;
    font-weight: 900;
  }
  .verification-grid input {
    width: auto;
  }
  .action-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .events-panel,
  .future-panel {
    margin-top: 14px;
  }
  .event-list {
    margin-top: 12px;
    display: grid;
    gap: 8px;
  }
  .event-row {
    min-height: 58px;
    border: 1px solid rgba(201,205,211,0.12);
    border-radius: 10px;
    background: rgba(201,205,211,0.035);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
  }
  .event-row div:last-child {
    text-align: right;
  }
  .future-grid {
    margin-top: 12px;
  }
  .status-message {
    margin-top: 12px;
  }
  @media (max-width: 980px) {
    .stats-grid,
    .trust-layout,
    .risk-strip,
    .filter-row {
      grid-template-columns: 1fr;
    }
    .verification-grid,
    .action-grid,
    .future-grid,
    .metric-grid {
      grid-template-columns: 1fr;
    }
    .page-heading {
      align-items: flex-start;
      flex-direction: column;
    }
  }
`;
