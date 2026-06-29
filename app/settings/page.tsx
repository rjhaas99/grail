"use client";

import { useState } from "react";
import Header from "../components/Header";

type ToggleKey =
  | "publicProfile"
  | "showCollectionValue"
  | "showSellerStats"
  | "allowBuyerMessages"
  | "offerAlerts"
  | "messageAlerts"
  | "orderUpdates"
  | "marketAlerts"
  | "sellerRewardUpdates"
  | "autoWatch";

const initialToggles: Record<ToggleKey, boolean> = {
  publicProfile: true,
  showCollectionValue: false,
  showSellerStats: true,
  allowBuyerMessages: true,
  offerAlerts: true,
  messageAlerts: true,
  orderUpdates: true,
  marketAlerts: true,
  sellerRewardUpdates: true,
  autoWatch: true,
};

function ToggleRow({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`toggle-row ${checked ? "active" : ""}`}
      onClick={onClick}
    >
      <span>{label}</span>
      <strong>{checked ? "On" : "Off"}</strong>
    </button>
  );
}

function LockedRow({ label }: { label: string }) {
  return (
    <div className="locked-row">
      <span>{label}</span>
      <strong>Locked On</strong>
    </div>
  );
}

export default function SettingsPage() {
  const [toggles, setToggles] = useState(initialToggles);
  const [status, setStatus] = useState("");
  const [username, setUsername] = useState("ryanjhaas99");
  const [usernameStatus, setUsernameStatus] = useState("");
  const [usernameSaved, setUsernameSaved] = useState(false);

  function toggle(key: ToggleKey) {
    setToggles((current) => ({ ...current, [key]: !current[key] }));
  }

  function checkUsername() {
    const takenNames = ["admin", "grail", "vaultrunner", "ryanhaas"];
    const normalized = username.trim().replace(/^@/, "").toLowerCase();

    if (takenNames.includes(normalized)) {
      setUsernameStatus("Username is already taken.");
      return;
    }

    setUsernameStatus("Username is available.");
  }

  function saveUsername() {
    if (usernameStatus !== "Username is available.") {
      setUsernameStatus("Check availability before saving.");
      return;
    }

    setUsernameSaved(true);
    setUsernameStatus("Username updated. You can change it again tomorrow.");
  }

  return (
    <main className="settings-page">
      <style>{pageStyles}</style>
      <div className="settings-shell">
        <Header />

        <section className="page-heading">
          <span>Preferences</span>
          <h1>Settings</h1>
          <p>Manage account preferences, privacy, security, and marketplace settings.</p>
        </section>

        {status ? <p className="status-message">{status}</p> : null}

        <section className="settings-layout">
          <div className="panel section-card">
            <h2>Account</h2>
            <label>
              <span>Email</span>
              <input defaultValue="ryanjhaas99@example.com" />
            </label>
            <label>
              <span>Password</span>
              <input defaultValue="************" type="password" />
            </label>
            <label>
              <span>Username</span>
              <input
                value={username}
                disabled={usernameSaved}
                onChange={(event) => {
                  setUsername(event.target.value);
                  setUsernameStatus("");
                }}
              />
            </label>
            <div className="username-actions">
              <button type="button" onClick={checkUsername} disabled={usernameSaved}>
                Check Availability
              </button>
              <button type="button" onClick={saveUsername} disabled={usernameSaved}>
                Save Username
              </button>
            </div>
            {usernameStatus ? <p className="field-note">{usernameStatus}</p> : null}
            {usernameSaved ? (
              <p className="field-note">Username can only be changed once per day.</p>
            ) : null}
            <button type="button" onClick={() => setStatus("Password flow coming soon.")}>
              Change password
            </button>
          </div>

          <div className="panel section-card">
            <h2>Privacy</h2>
            <LockedRow label="Public profile" />
            <LockedRow label="Show collection value" />
            <LockedRow label="Show seller stats" />
            <p className="field-note">Required for marketplace trust and collection transparency.</p>
            <ToggleRow label="Allow messages from buyers" checked={toggles.allowBuyerMessages} onClick={() => toggle("allowBuyerMessages")} />
          </div>

          <div className="panel section-card">
            <h2>Notifications</h2>
            <ToggleRow label="Offer alerts" checked={toggles.offerAlerts} onClick={() => toggle("offerAlerts")} />
            <ToggleRow label="Message alerts" checked={toggles.messageAlerts} onClick={() => toggle("messageAlerts")} />
            <ToggleRow label="Order updates" checked={toggles.orderUpdates} onClick={() => toggle("orderUpdates")} />
            <ToggleRow label="Market movement alerts" checked={toggles.marketAlerts} onClick={() => toggle("marketAlerts")} />
            <ToggleRow label="Seller reward updates" checked={toggles.sellerRewardUpdates} onClick={() => toggle("sellerRewardUpdates")} />
          </div>

          <div className="panel section-card">
            <h2>Marketplace Preferences</h2>
            <label>
              <span>Default offer minimum percentage</span>
              <input defaultValue="85%" />
            </label>
            <label>
              <span>Default shipping speed</span>
              <input defaultValue="1-2 business days" />
            </label>
            <ToggleRow label="Auto-watch cards you offer on" checked={toggles.autoWatch} onClick={() => toggle("autoWatch")} />
            <label>
              <span>Preferred currency</span>
              <input defaultValue="USD" />
            </label>
          </div>

          <div className="panel section-card security-card">
            <h2>Security</h2>
            <div className="security-row">
              <span>Two-factor authentication placeholder</span>
              <strong>Not enabled</strong>
            </div>
            <div className="security-row">
              <span>Active sessions placeholder</span>
              <strong>2 sessions</strong>
            </div>
            <button type="button" onClick={() => setStatus("Session management coming soon.")}>
              Sign out of all devices
            </button>
          </div>
        </section>

        <div className="save-row">
          <button type="button" onClick={() => setStatus("Settings saved.")}>
            Save Settings
          </button>
        </div>
      </div>
    </main>
  );
}

const pageStyles = `
  .settings-page {
    min-height: 100vh;
    background: radial-gradient(circle at 50% -120px, rgba(201,205,211,0.08), transparent 32%), linear-gradient(180deg, #000 0%, #030304 58%, #000 100%);
    color: #fafafa;
    font-family: Arial, Helvetica, sans-serif;
  }
  .settings-shell { width: 1240px; margin: 0 auto; padding: 8px 0 38px; }
  .panel {
    border: 1px solid #1d1d22; border-radius: 12px;
    background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.006)), rgba(5,5,6,0.92);
    box-shadow: 0 18px 44px rgba(0,0,0,0.28);
  }
  .page-heading { margin-top: 18px; }
  .page-heading span { color: #C9CDD3; font-size: 11px; line-height: 14px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
  .page-heading h1 { margin: 8px 0 0; color: #fff; font-size: 42px; line-height: 46px; font-weight: 900; }
  .page-heading p, .status-message { color: #a1a1aa; font-size: 13px; line-height: 18px; font-weight: 800; }
  .status-message {
    margin: 16px 0 0; border: 1px solid rgba(52,211,153,0.24); border-radius: 10px; background: rgba(52,211,153,0.07);
    color: #86efac; padding: 10px; font-weight: 900;
  }
  .settings-layout { margin-top: 18px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; align-items: start; }
  .section-card { padding: 16px; }
  .section-card h2 { margin: 0; color: #fff; font-size: 20px; line-height: 24px; font-weight: 900; }
  label { display: grid; gap: 7px; margin-top: 14px; }
  label span, .security-row span { color: #C9CDD3; font-size: 12px; font-weight: 900; }
  input {
    border: 1px solid #24242a; border-radius: 10px; background: #08080a; color: #fff; padding: 12px; box-sizing: border-box; font: inherit; font-size: 13px; font-weight: 800; outline: none;
  }
  input:disabled { color: #85858f; cursor: not-allowed; }
  button {
    min-height: 40px; border: 1px solid rgba(231,222,208,0.28); border-radius: 10px; background: rgba(231,222,208,0.055);
    color: #fff; padding: 0 12px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 900; cursor: pointer;
  }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  button:hover { border-color: rgba(231,222,208,0.62); background: rgba(231,222,208,0.11); box-shadow: 0 0 18px rgba(201,205,211,0.13); }
  .section-card > button { margin-top: 14px; }
  .toggle-row {
    width: 100%; margin-top: 12px; background: #08080a; border-color: #24242a; justify-content: space-between;
  }
  .toggle-row.active { border-color: rgba(231,222,208,0.48); background: rgba(231,222,208,0.08); }
  .locked-row {
    width: 100%; margin-top: 12px; min-height: 42px; border: 1px solid rgba(231,222,208,0.28); border-radius: 10px; background: rgba(231,222,208,0.07);
    color: #fff; display: flex; align-items: center; justify-content: space-between; padding: 0 12px; box-sizing: border-box; font-weight: 900;
  }
  .locked-row span::before { content: "LOCK"; margin-right: 7px; color: #C9CDD3; font-size: 9px; letter-spacing: 0.06em; }
  .locked-row strong { color: #E7DED0; font-size: 12px; }
  .username-actions { margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap; }
  .field-note { margin: 9px 0 0; color: #a1a1aa; font-size: 11px; line-height: 15px; font-weight: 800; }
  .security-row {
    margin-top: 12px; border: 1px solid #202026; border-radius: 10px; background: rgba(8,8,10,0.76); padding: 12px; display: flex; justify-content: space-between; gap: 10px;
  }
  .security-row strong { color: #fff; font-size: 13px; font-weight: 900; }
  .save-row { margin-top: 16px; display: flex; justify-content: flex-end; }
  .save-row button { background: #E7DED0; color: #111; min-width: 150px; }
  @media (max-width: 1100px) {
    .settings-shell { width: calc(100vw - 32px); }
    .settings-layout { grid-template-columns: 1fr; }
  }
`;
