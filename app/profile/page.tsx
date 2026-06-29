"use client";

import Link from "next/link";
import { useState } from "react";
import Header from "../components/Header";

function LockedRow({ label }: { label: string }) {
  return (
    <div className="locked-row">
      <span>{label}</span>
      <strong>Locked On</strong>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card panel">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function ProfilePage() {
  const [status, setStatus] = useState("");

  return (
    <main className="account-page">
      <style>{pageStyles}</style>
      <div className="account-shell">
        <Header />

        <section className="page-heading">
          <span>Account</span>
          <h1>Profile</h1>
          <p>Manage your public collector profile and account identity.</p>
        </section>

        <section className="profile-hero panel">
          <button
            type="button"
            className="avatar"
            onClick={() => setStatus("Profile photo upload mock.")}
            title="Change Photo"
          >
            <span>RH</span>
            <em>Change Photo</em>
          </button>
          <div>
            <h2>Ryan Haas</h2>
            <p>@ryanjhaas99</p>
            <div className="pill-row">
              <span>Level 1 Collector</span>
              <span>Joined June 2026</span>
              <span>United States</span>
              <Link href="/collections/vault-runner">Public Collection</Link>
            </div>
          </div>
        </section>

        <section className="stats-grid">
          <StatCard label="Collection Value" value="$18,420" />
          <StatCard label="Watched Cards" value="37" />
          <StatCard label="Offers Sent" value="12" />
          <StatCard label="Completed Purchases" value="5" />
          <StatCard label="Seller Level" value="Level 1" />
        </section>

        <section className="content-grid">
          <div className="panel form-panel">
            <h2>Profile Details</h2>
            <label>
              <span>Display name</span>
              <input defaultValue="Ryan Haas" />
            </label>
            <label>
              <span>Username</span>
              <input defaultValue="@ryanjhaas99" readOnly />
              <small>Username changes are managed in Settings.</small>
            </label>
            <label>
              <span>Bio</span>
              <textarea defaultValue="Collector focused on sports cards, TCG cards, and long-term grails." />
            </label>
          </div>

          <aside className="panel side-panel">
            <h2>Preferences</h2>
            <div className="category-list">
              <span>Sports Cards</span>
              <span>TCG Cards</span>
              <span>Grails</span>
            </div>
            <LockedRow label="Public profile" />
            <LockedRow label="Show seller stats" />
            <p className="trust-note">Required for marketplace trust.</p>
            <div className="action-stack">
              <button type="button" onClick={() => setStatus("Profile changes saved.")}>
                Save Changes
              </button>
              <Link href="/collections/vault-runner">View Public Profile</Link>
            </div>
            {status ? <p className="status-message">{status}</p> : null}
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
    border: 1px solid #1d1d22;
    border-radius: 12px;
    background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.006)), rgba(5,5,6,0.92);
    box-shadow: 0 18px 44px rgba(0,0,0,0.28);
  }
  .page-heading { margin-top: 18px; }
  .page-heading span {
    color: #C9CDD3; font-size: 11px; line-height: 14px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase;
  }
  .page-heading h1 { margin: 8px 0 0; color: #fff; font-size: 42px; line-height: 46px; font-weight: 900; }
  .page-heading p, .profile-hero p, .status-message { color: #a1a1aa; font-size: 13px; line-height: 18px; font-weight: 800; }
  .profile-hero { margin-top: 18px; padding: 18px; display: grid; grid-template-columns: 82px 1fr; gap: 16px; align-items: center; }
  .avatar {
    width: 76px; height: 76px; border-radius: 999px; border: 1px solid rgba(201,205,211,0.26);
    background: radial-gradient(circle at 50% 18%, rgba(255,255,255,0.14), transparent 42%), linear-gradient(135deg, #1f2937, #050506);
    color: #E7DED0; display: flex; align-items: center; justify-content: center; font-size: 23px; font-weight: 900; cursor: pointer; position: relative; overflow: hidden; padding: 0;
  }
  .avatar em {
    position: absolute; inset: auto 0 0; min-height: 24px; background: rgba(0,0,0,0.72); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 9px; line-height: 10px; font-style: normal; opacity: 0; transition: opacity 160ms ease;
  }
  .avatar:hover {
    border-color: rgba(231,222,208,0.62); box-shadow: 0 0 20px rgba(201,205,211,0.16);
  }
  .avatar:hover em {
    opacity: 1;
  }
  .profile-hero h2, .form-panel h2, .side-panel h2 { margin: 0; color: #fff; font-size: 24px; line-height: 28px; font-weight: 900; }
  .pill-row { margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap; }
  .pill-row span, .pill-row a, .category-list span {
    border: 1px solid rgba(231,222,208,0.22); border-radius: 999px; background: rgba(231,222,208,0.055);
    color: #E7DED0; min-height: 28px; padding: 0 10px; display: inline-flex; align-items: center; text-decoration: none; font-size: 11px; font-weight: 900;
  }
  .stats-grid { margin-top: 16px; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
  .stat-card { min-height: 82px; padding: 14px; }
  .stat-card span { color: #85858f; font-size: 11px; line-height: 14px; font-weight: 800; }
  .stat-card strong { display: block; margin-top: 8px; color: #fff; font-size: 24px; line-height: 28px; font-weight: 900; }
  .content-grid { margin-top: 16px; display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 16px; }
  .form-panel, .side-panel { padding: 16px; }
  label { display: grid; gap: 7px; margin-top: 14px; }
  label span { color: #C9CDD3; font-size: 12px; font-weight: 900; }
  input, textarea {
    border: 1px solid #24242a; border-radius: 10px; background: #08080a; color: #fff; padding: 12px; box-sizing: border-box; font: inherit; font-size: 13px; font-weight: 800; outline: none;
  }
  input[readonly] { color: #a1a1aa; cursor: not-allowed; }
  label small, .trust-note { color: #85858f; font-size: 11px; line-height: 15px; font-weight: 800; }
  textarea { min-height: 112px; resize: vertical; }
  .category-list { margin-top: 14px; display: flex; flex-wrap: wrap; gap: 8px; }
  .toggle-row {
    width: 100%; margin-top: 12px; min-height: 42px; border: 1px solid #24242a; border-radius: 10px; background: #08080a;
    color: #fff; display: flex; align-items: center; justify-content: space-between; padding: 0 12px; cursor: pointer; font-weight: 900;
  }
  .toggle-row.active { border-color: rgba(231,222,208,0.48); background: rgba(231,222,208,0.08); }
  .locked-row {
    width: 100%; margin-top: 12px; min-height: 42px; border: 1px solid rgba(231,222,208,0.28); border-radius: 10px; background: rgba(231,222,208,0.07);
    color: #fff; display: flex; align-items: center; justify-content: space-between; padding: 0 12px; box-sizing: border-box; font-weight: 900;
  }
  .locked-row span::before { content: "LOCK"; margin-right: 7px; color: #C9CDD3; font-size: 9px; letter-spacing: 0.06em; }
  .locked-row strong { color: #E7DED0; font-size: 12px; }
  .action-stack { margin-top: 16px; display: grid; gap: 10px; }
  .action-stack button, .action-stack a {
    min-height: 40px; border: 1px solid rgba(231,222,208,0.28); border-radius: 10px; background: rgba(231,222,208,0.055);
    color: #fff; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; font-size: 12px; font-weight: 900; cursor: pointer;
  }
  .action-stack button { background: #E7DED0; color: #111; }
  .status-message { margin: 12px 0 0; border: 1px solid rgba(52,211,153,0.24); border-radius: 10px; background: rgba(52,211,153,0.07); color: #86efac; padding: 10px; }
  @media (max-width: 1100px) {
    .account-shell { width: calc(100vw - 32px); }
    .profile-hero, .stats-grid, .content-grid { grid-template-columns: 1fr; }
  }
`;
