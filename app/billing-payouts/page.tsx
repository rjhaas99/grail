"use client";

import { useState } from "react";
import Header from "../components/Header";

const transactions = [
  {
    date: "Jun 28",
    type: "Purchase",
    card: "Crimson Court Rookie",
    amount: "-$1,355",
    status: "Processing",
  },
  {
    date: "Jun 26",
    type: "Payout",
    card: "Seller payout",
    amount: "+$910",
    status: "Paid",
  },
  {
    date: "Jun 22",
    type: "Shipping",
    card: "Tracked label",
    amount: "-$14",
    status: "Complete",
  },
];

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function BillingPayoutsPage() {
  const [status, setStatus] = useState("");

  return (
    <main className="account-page">
      <style>{pageStyles}</style>
      <div className="account-shell">
        <Header />

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
              <div className="method-row">
                <div>
                  <strong>Card ending in 4242</strong>
                  <span>Default payment method</span>
                </div>
                <button type="button" onClick={() => setStatus("Default payment method updated.")}>
                  Set default
                </button>
              </div>
              <button
                type="button"
                className="primary-button"
                onClick={() => setStatus("Payment method flow coming soon.")}
              >
                Add payment method
              </button>
              <p className="mock-note">Mock billing only - no payment information is collected.</p>
            </section>

            <section className="panel section-card">
              <h2>Seller Payouts</h2>
              <div className="stats-grid">
                <InfoCard label="Payout Status" value="Connected / Mock" />
                <InfoCard label="Bank" value="Ending 1188" />
                <InfoCard label="Next Payout" value="Jul 3, 2026" />
                <InfoCard label="Available Balance" value="$4,050" />
                <InfoCard label="Pending Balance" value="$1,240" />
              </div>
              <button
                type="button"
                className="primary-button"
                onClick={() => setStatus("Payout setup coming soon.")}
              >
                Add payout account
              </button>
            </section>

            <section className="panel section-card">
              <h2>Recent Transactions</h2>
              <div className="transaction-list">
                {transactions.map((transaction) => (
                  <article key={`${transaction.date}-${transaction.card}`} className="transaction-row">
                    <span>{transaction.date}</span>
                    <strong>{transaction.type}</strong>
                    <p>{transaction.card}</p>
                    <strong>{transaction.amount}</strong>
                    <em>{transaction.status}</em>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <aside className="panel section-card">
            <h2>Marketplace Fees</h2>
            <div className="fee-list">
              <InfoCard label="Buyer protection fee placeholder" value="3.5%" />
              <InfoCard label="Seller marketplace fee placeholder" value="8.0%" />
              <InfoCard label="Payment processing placeholder" value="2.9% + $0.30" />
              <InfoCard label="Shipping label placeholder" value="At cost" />
            </div>
          </aside>
        </section>
      </div>
    </main>
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
  .page-heading { margin-top: 18px; }
  .page-heading span { color: #C9CDD3; font-size: 11px; line-height: 14px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
  .page-heading h1 { margin: 8px 0 0; color: #fff; font-size: 42px; line-height: 46px; font-weight: 900; }
  .page-heading p, .mock-note, .method-row span, .transaction-row p {
    color: #a1a1aa; font-size: 13px; line-height: 18px; font-weight: 800;
  }
  .status-message {
    margin: 16px 0 0; border: 1px solid rgba(52,211,153,0.24); border-radius: 10px; background: rgba(52,211,153,0.07);
    color: #86efac; padding: 10px; font-size: 13px; font-weight: 900;
  }
  .layout { margin-top: 18px; display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 16px; align-items: start; }
  .main-column { display: grid; gap: 16px; }
  .section-card { padding: 16px; }
  .section-card h2 { margin: 0; color: #fff; font-size: 20px; line-height: 24px; font-weight: 900; }
  .method-row {
    margin-top: 14px; border: 1px solid #202026; border-radius: 10px; background: rgba(8,8,10,0.76);
    padding: 12px; display: flex; justify-content: space-between; gap: 12px; align-items: center;
  }
  .method-row strong, .transaction-row strong { color: #fff; font-size: 14px; font-weight: 900; }
  button, .primary-button {
    min-height: 38px; border: 1px solid rgba(231,222,208,0.28); border-radius: 10px; background: rgba(231,222,208,0.055);
    color: #fff; padding: 0 12px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 900; cursor: pointer;
  }
  button:hover { border-color: rgba(231,222,208,0.62); background: rgba(231,222,208,0.11); box-shadow: 0 0 18px rgba(201,205,211,0.13); }
  .primary-button { margin-top: 14px; background: #E7DED0; color: #111; }
  .stats-grid, .fee-list { margin-top: 14px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .fee-list { grid-template-columns: 1fr; }
  .info-card {
    min-height: 62px; border: 1px solid #202026; border-radius: 10px; background: rgba(8,8,10,0.76); padding: 10px; box-sizing: border-box;
  }
  .info-card span { color: #85858f; font-size: 10px; line-height: 13px; font-weight: 800; }
  .info-card strong { display: block; margin-top: 6px; color: #fff; font-size: 14px; line-height: 18px; font-weight: 900; }
  .transaction-list { margin-top: 14px; display: grid; gap: 10px; }
  .transaction-row {
    border: 1px solid #202026; border-radius: 10px; background: rgba(8,8,10,0.76); padding: 12px;
    display: grid; grid-template-columns: 90px 120px 1fr 100px 100px; gap: 12px; align-items: center;
  }
  .transaction-row span, .transaction-row em { color: #C9CDD3; font-size: 12px; font-weight: 900; font-style: normal; }
  @media (max-width: 1100px) {
    .account-shell { width: calc(100vw - 32px); }
    .layout, .stats-grid, .transaction-row { grid-template-columns: 1fr; }
    .method-row { display: grid; }
  }
`;
