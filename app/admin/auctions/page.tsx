"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../AdminLayout";
import { supabase } from "../../../lib/supabase";
import Header from "../../components/Header";

const adminEmails = ["ryanjhaas99@gmail.com"];

type AdminAuction = {
  id: string;
  shortId: string;
  title: string;
  sellerName: string;
  status: string;
  auctionStatus: string;
  transactionState: string;
  transactionStateLabel: string;
  endsAt?: string | null;
  startingBid: number;
  currentBid: number;
  bidCount: number;
  reserveStatus: string;
  reserveFeeAmount: number;
  reserveFeeStatus: string;
  winnerName: string;
  paymentDueAt?: string | null;
  stripeReserveFeeCheckoutSessionId: string;
  stripeReserveFeePaymentIntentId: string;
  stripeReserveFeeChargeId: string;
  stripeReserveFeeRefundId: string;
  createdAt?: string | null;
};

type AdminAuctionsResponse = {
  auctions?: AdminAuction[];
  error?: string;
};

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

function statusCount(auctions: AdminAuction[], status: string) {
  return auctions.filter((auction) => auction.auctionStatus === status).length;
}

export default function AdminAuctionsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [auctions, setAuctions] = useState<AdminAuction[]>([]);
  const [status, setStatus] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  async function loadAuctions() {
    setIsLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const email = session?.user.email?.toLowerCase() || "";

    if (!session || !adminEmails.includes(email)) {
      setIsAdmin(false);
      setAuctions([]);
      setIsLoading(false);
      return;
    }

    setIsAdmin(true);

    try {
      const response = await fetch("/api/admin/auctions", {
        headers: {
          authorization: `Bearer ${session.access_token}`,
        },
      });
      const payload = (await response.json()) as AdminAuctionsResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Auctions could not be loaded.");
      }

      setAuctions(payload.auctions || []);
      setStatus(
        payload.auctions?.length
          ? "Auction records loaded."
          : "No auction records found.",
      );
    } catch (error) {
      console.error("Admin auctions fetch error:", error);
      setStatus(error instanceof Error ? error.message : "Auctions could not be loaded.");
      setAuctions([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadAuctions();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  const stats = useMemo(
    () => [
      ["Total", auctions.length],
      ["Active", statusCount(auctions, "active")],
      ["Payment Pending", auctions.filter((auction) => auction.transactionState === "payment_pending").length],
      ["Paid", auctions.filter((auction) => auction.transactionState === "paid").length],
      ["Reserve Not Met", statusCount(auctions, "ended_reserve_not_met")],
      ["Cancelled", statusCount(auctions, "cancelled")],
    ],
    [auctions],
  );

  async function adminCancelAuction(listingId: string) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setStatus("Admin session expired.");
      return;
    }

    setUpdatingId(listingId);

    try {
      const response = await fetch("/api/admin/auctions", {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${session.access_token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ listingId, action: "admin_cancel" }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Auction could not be cancelled.");
      }

      setStatus("Auction cancelled. Review Reserve Commitment Fee refund separately if needed.");
      await loadAuctions();
    } catch (error) {
      console.error("Admin auction cancel error:", error);
      setStatus(error instanceof Error ? error.message : "Auction could not be cancelled.");
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <main className="admin-page">
      <style>{pageStyles}</style>
      <AdminLayout />
      <div className="admin-shell">
        <Header />
        <section className="admin-heading">
          <div>
            <span>Internal Admin</span>
            <h1>Auction Monitor</h1>
            <p>Hidden tools for reviewing GRAIL auctions and Reserve Commitment Fee state.</p>
          </div>
          <Link href="/admin/payments">Payments</Link>
        </section>

        {isLoading ? (
          <section className="panel empty-state">Loading auctions...</section>
        ) : !isAdmin ? (
          <section className="panel empty-state">Access denied.</section>
        ) : (
          <>
            <section className="stats-grid">
              {stats.map(([label, value]) => (
                <article key={label} className="panel stat-card">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </article>
              ))}
            </section>

            {status ? <p className="status-message">{status}</p> : null}

            <section className="panel admin-list">
              {auctions.map((auction) => (
                <article key={auction.id} className="auction-row">
                  <div>
                    <span>{auction.shortId}</span>
                    <h2>{auction.title}</h2>
                    <p>Seller {auction.sellerName}</p>
                    <p>Winner {auction.winnerName}</p>
                  </div>
                  <div>
                    <strong>{formatCurrency(auction.currentBid || auction.startingBid)}</strong>
                    <span>{auction.bidCount} bids</span>
                    <span>{auction.reserveStatus}</span>
                    <span>Reserve Commitment Fee {formatCurrency(auction.reserveFeeAmount)}</span>
                  </div>
                  <div>
                    <span>Transaction {auction.transactionStateLabel}</span>
                    <span>Status {auction.status}</span>
                    <span>Auction {auction.auctionStatus}</span>
                    <span>Commitment Fee {auction.reserveFeeStatus}</span>
                    <span>Ends {formatDateTime(auction.endsAt)}</span>
                    <span>Payment due {formatDateTime(auction.paymentDueAt)}</span>
                  </div>
                  <div className="stripe-grid">
                    <span>Commitment checkout {auction.stripeReserveFeeCheckoutSessionId || "None"}</span>
                    <span>Commitment payment {auction.stripeReserveFeePaymentIntentId || "None"}</span>
                    <span>Commitment charge {auction.stripeReserveFeeChargeId || "None"}</span>
                    <span>Commitment refund {auction.stripeReserveFeeRefundId || "None"}</span>
                  </div>
                  <div className="row-actions">
                    <Link href={`/cards/${auction.id}`}>View Auction</Link>
                    {auction.auctionStatus === "active" ? (
                      <button
                        type="button"
                        disabled={updatingId === auction.id}
                        onClick={() => void adminCancelAuction(auction.id)}
                      >
                        Admin Cancel
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

const pageStyles = `
  .admin-page { min-height: 100vh; background: radial-gradient(circle at 50% -120px, rgba(201,205,211,0.08), transparent 32%), linear-gradient(180deg, #000 0%, #030304 58%, #000 100%); color: #fafafa; font-family: Arial, Helvetica, sans-serif; }
  .admin-shell { width: min(1240px, calc(100vw - 32px)); margin: 0 auto; padding: 8px 0 42px; }
  .panel { border: 1px solid #1d1d22; border-radius: 12px; background: linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.006)), rgba(5,5,6,0.92); box-shadow: 0 18px 44px rgba(0,0,0,0.28); }
  .admin-heading { margin-top: 18px; display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; }
  .admin-heading span, .stat-card span, .auction-row span { color: #C9CDD3; font-size: 11px; line-height: 15px; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; }
  .admin-heading h1 { margin: 7px 0 0; color: #fff; font-size: 42px; line-height: 46px; font-weight: 900; }
  .admin-heading p, .auction-row p, .status-message { color: #a1a1aa; font-size: 13px; line-height: 18px; font-weight: 800; }
  .admin-heading a, .row-actions a, .row-actions button { min-height: 38px; border: 1px solid rgba(231,222,208,.28); border-radius: 10px; background: rgba(231,222,208,.055); color: #fff; padding: 0 12px; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; font-size: 12px; font-weight: 900; cursor: pointer; }
  .stats-grid { margin-top: 18px; display: grid; grid-template-columns: repeat(6, minmax(0,1fr)); gap: 10px; }
  .stat-card { padding: 14px; }
  .stat-card strong { display: block; margin-top: 7px; color: #fff; font-size: 24px; line-height: 28px; font-weight: 900; }
  .status-message { margin: 14px 0 0; border: 1px solid rgba(201,205,211,.18); border-radius: 10px; background: rgba(201,205,211,.055); padding: 10px; }
  .empty-state { margin-top: 18px; padding: 18px; color: #C9CDD3; font-weight: 900; }
  .admin-list { margin-top: 16px; padding: 12px; display: grid; gap: 10px; }
  .auction-row { border: 1px solid rgba(201,205,211,.14); border-radius: 10px; background: rgba(8,8,10,.76); padding: 12px; display: grid; grid-template-columns: 1.2fr .7fr .9fr 1.2fr auto; gap: 12px; align-items: start; }
  .auction-row h2 { margin: 5px 0 0; color: #fff; font-size: 17px; line-height: 22px; font-weight: 900; }
  .auction-row strong { display: block; color: #fff; font-size: 22px; line-height: 26px; font-weight: 900; }
  .auction-row div { display: grid; gap: 5px; }
  .stripe-grid span { text-transform: none; letter-spacing: 0; overflow-wrap: anywhere; }
  .row-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
  .row-actions button:disabled { opacity: .5; cursor: not-allowed; }
  @media(max-width: 1100px) { .admin-heading { display: grid; align-items: start; } .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .auction-row { grid-template-columns: 1fr; } .row-actions { justify-content: flex-start; } }
`;
