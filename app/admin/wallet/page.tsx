"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import AdminLayout from "../AdminLayout";
import Header from "../../components/Header";
import {
  getAdminWalletVerb,
  getWalletReasonLabel,
  walletReasonPresets,
  type WalletReasonPreset,
} from "../../lib/walletLabels";
import { supabase } from "../../../lib/supabase";

const adminEmails = ["ryanjhaas99@gmail.com"];

type WalletRecord = {
  userId: string;
  userName: string;
  username: string;
  email: string;
  level: number;
  xp: number;
  rankTitle: string;
  availableCredit: number;
  pendingCredit: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  updatedAt: string | null;
};

type LedgerRecord = {
  id: string;
  userId: string;
  userName: string;
  type: string;
  amount: number;
  balanceAfter: number;
  title: string;
  description: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string | null;
};

type AdminWalletResponse = {
  wallets?: WalletRecord[];
  ledger?: LedgerRecord[];
  error?: string;
  message?: string;
  alreadyApplied?: boolean;
};

type WalletAction = "grant" | "remove" | "adjust";
type HistoryDirectionFilter = "all" | "credit" | "debit";
type HistorySort = "newest" | "oldest";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

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

function shortId(value: string) {
  return value ? value.slice(0, 8) : "Unknown";
}

function getDisplayHandle(wallet?: WalletRecord | null) {
  if (!wallet) {
    return "No user selected";
  }

  return wallet.email || (wallet.username ? `@${wallet.username}` : wallet.userId);
}

export default function AdminWalletPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [wallets, setWallets] = useState<WalletRecord[]>([]);
  const [ledger, setLedger] = useState<LedgerRecord[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [action, setAction] = useState<WalletAction>("grant");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState<WalletReasonPreset>("Beta Bonus");
  const [internalNote, setInternalNote] = useState("");
  const [correctionDirection, setCorrectionDirection] = useState<"increase" | "decrease">("increase");
  const [historyUserFilter, setHistoryUserFilter] = useState("all");
  const [historyDirectionFilter, setHistoryDirectionFilter] =
    useState<HistoryDirectionFilter>("all");
  const [historyReasonFilter, setHistoryReasonFilter] = useState("all");
  const [historySort, setHistorySort] = useState<HistorySort>("newest");

  const selectedWallet = wallets.find((wallet) => wallet.userId === selectedUserId) || null;
  const totals = useMemo(
    () => ({
      available: wallets.reduce((sum, wallet) => sum + wallet.availableCredit, 0),
      pending: wallets.reduce((sum, wallet) => sum + wallet.pendingCredit, 0),
      earned: wallets.reduce((sum, wallet) => sum + wallet.lifetimeEarned, 0),
      redeemed: wallets.reduce((sum, wallet) => sum + wallet.lifetimeRedeemed, 0),
    }),
    [wallets],
  );
  const filteredLedger = useMemo(() => {
    return [...ledger]
      .filter((entry) => {
        if (historyUserFilter !== "all" && entry.userId !== historyUserFilter) {
          return false;
        }

        if (historyDirectionFilter === "credit" && entry.amount <= 0) {
          return false;
        }

        if (historyDirectionFilter === "debit" && entry.amount >= 0) {
          return false;
        }

        if (historyReasonFilter !== "all" && entry.title !== historyReasonFilter) {
          return false;
        }

        return true;
      })
      .sort((first, second) => {
        const firstTime = first.createdAt ? new Date(first.createdAt).getTime() : 0;
        const secondTime = second.createdAt ? new Date(second.createdAt).getTime() : 0;
        return historySort === "newest" ? secondTime - firstTime : firstTime - secondTime;
      });
  }, [historyDirectionFilter, historyReasonFilter, historySort, historyUserFilter, ledger]);

  async function loadWallets(nextSearch = search) {
    setIsLoading(true);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Admin wallet session error:", sessionError);
    }

    const email = session?.user.email?.toLowerCase() || "";

    if (!email || !adminEmails.includes(email)) {
      setAdminEmail(email);
      setIsAdmin(false);
      setWallets([]);
      setLedger([]);
      setStatus("Access denied.");
      setIsLoading(false);
      return;
    }

    setAdminEmail(email);
    setIsAdmin(true);

    try {
      const query = nextSearch ? `?search=${encodeURIComponent(nextSearch)}` : "";
      const response = await fetch(`/api/admin/wallet${query}`, {
        headers: {
          authorization: `Bearer ${session?.access_token || ""}`,
        },
      });
      const payload = (await response.json()) as AdminWalletResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Wallet records could not be loaded.");
      }

      setWallets(payload.wallets || []);
      setLedger(payload.ledger || []);
      setStatus((payload.wallets || []).length ? "Wallet records loaded." : "No matching users found.");
    } catch (error) {
      console.error("Admin wallet load error:", error);
      setWallets([]);
      setLedger([]);
      setStatus(error instanceof Error ? error.message : "Wallet records could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }

  function getSignedPreviewAmount() {
    const numericAmount = Number(amount || 0);

    if (action === "remove") {
      return -Math.abs(numericAmount);
    }

    if (action === "adjust" && correctionDirection === "decrease") {
      return -Math.abs(numericAmount);
    }

    return Math.abs(numericAmount);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedUserId || !selectedWallet) {
      setStatus("Select a user before saving.");
      return;
    }

    const numericAmount = Number(amount || 0);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setStatus("Amount must be greater than zero.");
      return;
    }

    const signedAmount = getSignedPreviewAmount();

    if (signedAmount < 0 && Math.abs(signedAmount) > selectedWallet.availableCredit) {
      setStatus("Remove Credit cannot exceed available GRAIL Credit.");
      return;
    }

    const confirmation = window.confirm(
      `${action === "grant" ? "Grant" : action === "remove" ? "Remove" : "Apply"} ${formatCurrency(Math.abs(signedAmount))} ${signedAmount >= 0 ? "to" : "from"} ${selectedWallet.userName}?`,
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
      const response = await fetch("/api/admin/wallet", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({
          action,
          userId: selectedUserId,
          amount: numericAmount,
          reason,
          note: internalNote,
          correctionDirection,
          idempotencyKey: `admin-wallet:${crypto.randomUUID()}`,
        }),
      });
      const payload = (await response.json()) as AdminWalletResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Wallet update failed.");
      }

      setStatus(payload.message || "Wallet updated.");
      setAmount("");
      setInternalNote("");
      await loadWallets(search);
    } catch (error) {
      console.error("Admin wallet update error:", error);
      setStatus(error instanceof Error ? error.message : "Wallet update failed.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleActionChange(nextAction: WalletAction) {
    setAction(nextAction);

    if (nextAction === "remove" || nextAction === "adjust") {
      setReason("Manual Correction");
    } else {
      setReason("Beta Bonus");
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadWallets();
    }, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="admin-wallet-page">
      <style>{pageStyles}</style>
      <AdminLayout />
      <div className="admin-wallet-shell">
        <Header />

        <section className="page-heading">
          <span>Admin</span>
          <h1>Wallet</h1>
          <p>Hidden GRAIL Credit controls for manual foundation testing.</p>
        </section>

        {!isLoading && !isAdmin ? (
          <section className="panel access-panel">
            <h2>Access denied</h2>
            <p>{adminEmail ? `${adminEmail} is not allowed.` : "Sign in as an admin."}</p>
          </section>
        ) : (
          <>
            <section className="summary-grid">
              <div className="panel stat-card">
                <span>Wallets</span>
                <strong>{wallets.length}</strong>
              </div>
              <div className="panel stat-card">
                <span>Available</span>
                <strong>{formatCurrency(totals.available)}</strong>
              </div>
              <div className="panel stat-card">
                <span>Pending</span>
                <strong>{formatCurrency(totals.pending)}</strong>
              </div>
              <div className="panel stat-card">
                <span>Lifetime Earned</span>
                <strong>{formatCurrency(totals.earned)}</strong>
              </div>
              <div className="panel stat-card">
                <span>Lifetime Redeemed</span>
                <strong>{formatCurrency(totals.redeemed)}</strong>
              </div>
            </section>

            <section className="admin-grid">
              <section className="panel control-panel">
                <h2>Adjust Wallet</h2>
                <p>
                  Search and select a user, then apply a verified admin wallet
                  transaction. Normal users cannot write wallet entries.
                </p>

                <div className="selected-user">
                  <span>Selected User</span>
                  {selectedWallet ? (
                    <>
                      <strong>{selectedWallet.userName}</strong>
                      <em>{getDisplayHandle(selectedWallet)}</em>
                      <small>
                        Level {selectedWallet.level} {selectedWallet.rankTitle} -{" "}
                        {formatCurrency(selectedWallet.availableCredit)} available
                      </small>
                    </>
                  ) : (
                    <p>Select a user from search results.</p>
                  )}
                </div>

                <form onSubmit={handleSubmit}>
                  <label>
                    <span>Action</span>
                    <select
                      value={action}
                      onChange={(event) => handleActionChange(event.target.value as WalletAction)}
                    >
                      <option value="grant">Grant Credit</option>
                      <option value="remove">Remove Credit</option>
                      <option value="adjust">Balance Correction</option>
                    </select>
                  </label>

                  {action === "adjust" ? (
                    <label>
                      <span>Correction Direction</span>
                      <select
                        value={correctionDirection}
                        onChange={(event) =>
                          setCorrectionDirection(event.target.value as "increase" | "decrease")
                        }
                      >
                        <option value="increase">Increase balance</option>
                        <option value="decrease">Decrease balance</option>
                      </select>
                    </label>
                  ) : null}

                  <label>
                    <span>Amount</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      placeholder="25.00"
                      required
                    />
                  </label>

                  <label>
                    <span>Reason</span>
                    <select
                      value={reason}
                      onChange={(event) => setReason(event.target.value as WalletReasonPreset)}
                    >
                      {walletReasonPresets.map((preset) => (
                        <option key={preset} value={preset}>
                          {preset}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Optional Internal Note</span>
                    <textarea
                      value={internalNote}
                      onChange={(event) => setInternalNote(event.target.value)}
                      placeholder="Admin reason or support context"
                    />
                  </label>

                  <details className="advanced-user-id">
                    <summary>Advanced: use user ID fallback</summary>
                    <input
                      value={selectedUserId}
                      onChange={(event) => setSelectedUserId(event.target.value)}
                      placeholder="auth user id"
                    />
                  </details>

                  <button type="submit" disabled={isSaving || !selectedUserId}>
                    {isSaving ? "Saving..." : "Confirm Wallet Transaction"}
                  </button>
                </form>
                {status ? <p className="status-message">{status}</p> : null}
              </section>

              <section className="panel wallet-list-panel">
                <div className="section-title-row">
                  <div>
                    <span>Search</span>
                    <h2>Find User</h2>
                  </div>
                  <button type="button" onClick={() => loadWallets(search)}>
                    Refresh
                  </button>
                </div>
                <div className="search-row">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search email, username, full name, or user id"
                  />
                  <button type="button" onClick={() => loadWallets(search)}>
                    Search
                  </button>
                </div>
                <div className="wallet-list">
                  {isLoading ? (
                    <p className="empty-state">Loading wallets...</p>
                  ) : wallets.length > 0 ? (
                    wallets.map((wallet) => (
                      <button
                        type="button"
                        key={wallet.userId}
                        className={`wallet-row ${wallet.userId === selectedUserId ? "selected" : ""}`}
                        onClick={() => {
                          setSelectedUserId(wallet.userId);
                          setHistoryUserFilter(wallet.userId);
                        }}
                      >
                        <div>
                          <strong>{wallet.userName}</strong>
                          <span>{getDisplayHandle(wallet)}</span>
                          <small>Level {wallet.level} {wallet.rankTitle}</small>
                        </div>
                        <div>
                          <strong>{formatCurrency(wallet.availableCredit)}</strong>
                          <span>{wallet.xp.toLocaleString()} XP</span>
                          <small>Updated {formatDate(wallet.updatedAt)}</small>
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="empty-state">
                      No matching users found. Search by email, username, full name, or
                      user ID.
                    </p>
                  )}
                </div>
              </section>
            </section>

            <section className="panel history-panel">
              <div className="section-title-row">
                <div>
                  <span>Ledger</span>
                  <h2>Wallet History</h2>
                </div>
              </div>

              <div className="history-filters">
                <select
                  value={historyUserFilter}
                  onChange={(event) => setHistoryUserFilter(event.target.value)}
                >
                  <option value="all">All users</option>
                  {wallets.map((wallet) => (
                    <option key={wallet.userId} value={wallet.userId}>
                      {wallet.userName}
                    </option>
                  ))}
                </select>
                <select
                  value={historyDirectionFilter}
                  onChange={(event) =>
                    setHistoryDirectionFilter(event.target.value as HistoryDirectionFilter)
                  }
                >
                  <option value="all">Credits and debits</option>
                  <option value="credit">Credits only</option>
                  <option value="debit">Debits only</option>
                </select>
                <select
                  value={historyReasonFilter}
                  onChange={(event) => setHistoryReasonFilter(event.target.value)}
                >
                  <option value="all">All reasons</option>
                  {walletReasonPresets.map((preset) => (
                    <option key={preset} value={preset}>
                      {preset}
                    </option>
                  ))}
                </select>
                <select
                  value={historySort}
                  onChange={(event) => setHistorySort(event.target.value as HistorySort)}
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </div>

              <div className="ledger-list">
                {filteredLedger.length > 0 ? (
                  filteredLedger.map((entry) => (
                    <div key={entry.id} className="ledger-row">
                      <div>
                        <strong>{entry.title || getWalletReasonLabel(null, entry.type)}</strong>
                        <span>{getAdminWalletVerb(entry.amount)}</span>
                        <small>
                          {entry.userName} - {shortId(entry.userId)}
                          {entry.description ? ` - ${entry.description}` : ""}
                        </small>
                      </div>
                      <div>
                        <strong>
                          {entry.amount >= 0 ? "+" : "-"}
                          {formatCurrency(Math.abs(entry.amount))}
                        </strong>
                        <span>Balance {formatCurrency(entry.balanceAfter)}</span>
                        <small>{formatDate(entry.createdAt)}</small>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty-state">No wallet ledger entries match these filters.</p>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

const pageStyles = `
  .admin-wallet-page {
    min-height: 100vh;
    background: radial-gradient(circle at 50% -120px, rgba(201,205,211,0.08), transparent 32%), linear-gradient(180deg, #000 0%, #030304 58%, #000 100%);
    color: #fafafa;
    font-family: Arial, Helvetica, sans-serif;
  }
  .admin-wallet-shell {
    width: 1240px;
    margin: 0 auto;
    padding: 8px 0 40px;
  }
  .panel {
    border: 1px solid #1d1d22;
    border-radius: 12px;
    background: linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.008)), rgba(5,5,6,0.92);
    box-shadow: 0 18px 44px rgba(0,0,0,0.28);
  }
  .page-heading { margin-top: 18px; }
  .page-heading span,
  .stat-card span,
  .section-title-row span,
  label span,
  .selected-user span {
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
  .control-panel p,
  .empty-state,
  .status-message,
  .access-panel p,
  .selected-user p {
    color: #a1a1aa;
    font-size: 13px;
    line-height: 18px;
    font-weight: 800;
  }
  .summary-grid {
    margin-top: 18px;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 12px;
  }
  .stat-card { min-height: 86px; padding: 14px; }
  .stat-card strong {
    display: block;
    margin-top: 10px;
    color: #fff;
    font-size: 24px;
    line-height: 28px;
    font-weight: 900;
  }
  .admin-grid {
    margin-top: 16px;
    display: grid;
    grid-template-columns: 390px minmax(0, 1fr);
    gap: 16px;
    align-items: start;
  }
  .control-panel,
  .wallet-list-panel,
  .history-panel,
  .access-panel {
    padding: 16px;
  }
  .control-panel h2,
  .section-title-row h2,
  .access-panel h2 {
    margin: 6px 0 0;
    color: #fff;
    font-size: 22px;
    line-height: 26px;
    font-weight: 900;
  }
  .selected-user {
    margin-top: 14px;
    border: 1px solid rgba(201,205,211,0.14);
    border-radius: 10px;
    background: rgba(8,8,10,0.72);
    padding: 12px;
  }
  .selected-user strong,
  .wallet-row strong,
  .ledger-row strong {
    display: block;
    color: #fff;
    font-size: 13px;
    line-height: 16px;
    font-weight: 900;
  }
  .selected-user em,
  .selected-user small,
  .wallet-row span,
  .wallet-row small,
  .ledger-row span,
  .ledger-row small {
    display: block;
    margin-top: 4px;
    color: #85858f;
    font-size: 11px;
    line-height: 15px;
    font-style: normal;
    font-weight: 800;
  }
  form,
  .wallet-list,
  .ledger-list {
    margin-top: 14px;
    display: grid;
    gap: 10px;
  }
  label {
    display: grid;
    gap: 7px;
  }
  input,
  select,
  textarea {
    width: 100%;
    border: 1px solid #24242a;
    border-radius: 10px;
    background: #08080a;
    color: #fff;
    padding: 11px 12px;
    box-sizing: border-box;
    font: inherit;
    font-size: 13px;
    font-weight: 800;
    outline: none;
  }
  textarea {
    min-height: 82px;
    resize: vertical;
  }
  button {
    border: 1px solid rgba(231,222,208,0.28);
    border-radius: 10px;
    background: rgba(231,222,208,0.055);
    color: #fff;
    min-height: 38px;
    padding: 0 12px;
    font-size: 12px;
    line-height: 15px;
    font-weight: 900;
    cursor: pointer;
  }
  form button {
    background: #E7DED0;
    color: #111;
  }
  button:disabled {
    cursor: not-allowed;
    opacity: 0.62;
  }
  .section-title-row,
  .search-row,
  .history-filters {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .search-row,
  .history-filters {
    margin-top: 13px;
  }
  .search-row input {
    min-width: 0;
  }
  .history-filters select {
    min-width: 0;
  }
  .wallet-row,
  .ledger-row {
    border: 1px solid rgba(201,205,211,0.14);
    border-radius: 10px;
    background: rgba(8,8,10,0.72);
    padding: 12px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
    text-align: left;
  }
  .wallet-row.selected {
    border-color: rgba(231,222,208,0.46);
    background: rgba(231,222,208,0.06);
  }
  .wallet-row > div:last-child,
  .ledger-row > div:last-child {
    text-align: right;
  }
  .history-panel {
    margin-top: 16px;
  }
  .advanced-user-id {
    border: 1px solid rgba(201,205,211,0.14);
    border-radius: 10px;
    background: rgba(8,8,10,0.5);
    padding: 10px;
  }
  .advanced-user-id summary {
    color: #C9CDD3;
    font-size: 11px;
    line-height: 15px;
    font-weight: 900;
    cursor: pointer;
  }
  .advanced-user-id input {
    margin-top: 10px;
  }
  .empty-state {
    margin: 0;
    border: 1px solid rgba(201,205,211,0.14);
    border-radius: 10px;
    background: rgba(8,8,10,0.72);
    padding: 13px;
  }
  .status-message {
    margin: 12px 0 0;
    border: 1px solid rgba(231,222,208,0.18);
    border-radius: 10px;
    background: rgba(231,222,208,0.055);
    color: #E7DED0;
    padding: 12px;
  }
  .access-panel {
    margin-top: 18px;
  }
  @media (max-width: 1100px) {
    .admin-wallet-shell {
      width: calc(100vw - 32px);
    }
    .summary-grid,
    .admin-grid {
      grid-template-columns: 1fr;
    }
    .search-row,
    .history-filters {
      align-items: stretch;
      flex-direction: column;
    }
  }
`;
