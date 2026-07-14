"use client";

import { useEffect, useState } from "react";
import AdminLayout from "../AdminLayout";
import Header from "../../components/Header";
import { supabase } from "../../../lib/supabase";

const adminEmails = ["ryanjhaas99@gmail.com"];

type RewardTier = {
  id: string;
  rankName: string;
  minLevel: number;
  maxLevel: number;
  sellerFeePercent: number;
  buyerBasePercent: number;
  sellerBasePercent: number;
  buyerMultiplier: number;
  sellerMultiplier: number;
  buyerRewardPercent: number;
  sellerRewardPercent: number;
  xpMultiplier: number;
  walletMultiplier: number;
  enabled: boolean;
  displayOrder: number;
  updatedAt: string | null;
};

type RewardsResponse = {
  tiers?: RewardTier[];
  error?: string;
  message?: string;
};

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

export default function AdminRewardsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [tiers, setTiers] = useState<RewardTier[]>([]);
  const [savingTierId, setSavingTierId] = useState("");
  const [status, setStatus] = useState("");
  const [previewSalePrice, setPreviewSalePrice] = useState(100);
  const [previewTierId, setPreviewTierId] = useState("");

  async function loadRewards() {
    setIsLoading(true);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Admin rewards session error:", sessionError);
    }

    const email = session?.user.email?.toLowerCase() || "";

    if (!email || !adminEmails.includes(email)) {
      setAdminEmail(email);
      setIsAdmin(false);
      setTiers([]);
      setStatus("Access denied.");
      setIsLoading(false);
      return;
    }

    setAdminEmail(email);
    setIsAdmin(true);

    try {
      const response = await fetch("/api/admin/rewards", {
        headers: {
          authorization: `Bearer ${session?.access_token || ""}`,
        },
      });
      const payload = (await response.json()) as RewardsResponse;

      if (!response.ok) {
        throw new Error(payload.error || "GRAIL Economy could not be loaded.");
      }

      const loadedTiers = payload.tiers || [];
      setTiers(loadedTiers);
      setPreviewTierId((current) => current || loadedTiers[0]?.id || "");
      setStatus(loadedTiers.length ? "GRAIL Economy loaded." : "No economy tiers found.");
    } catch (error) {
      console.error("Admin rewards load error:", error);
      setTiers([]);
      setStatus(error instanceof Error ? error.message : "GRAIL Economy could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }

  function updateTier(tierId: string, patch: Partial<RewardTier>) {
    setTiers((currentTiers) =>
      currentTiers.map((tier) => (tier.id === tierId ? { ...tier, ...patch } : tier)),
    );
  }

  async function saveTier(tier: RewardTier) {
    setSavingTierId(tier.id);
    setStatus("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    try {
      const response = await fetch("/api/admin/rewards", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({
          id: tier.id,
          rankName: tier.rankName,
          minLevel: tier.minLevel,
          maxLevel: tier.maxLevel,
          sellerFeePercent: tier.sellerFeePercent,
          buyerBasePercent: tier.buyerBasePercent,
          sellerBasePercent: tier.sellerBasePercent,
          buyerMultiplier: tier.buyerMultiplier,
          sellerMultiplier: tier.sellerMultiplier,
          xpMultiplier: tier.xpMultiplier,
          walletMultiplier: tier.walletMultiplier,
          enabled: tier.enabled,
        }),
      });
      const payload = (await response.json()) as RewardsResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Economy tier could not be saved.");
      }

      setStatus(payload.message || "Economy tier saved.");
      await loadRewards();
    } catch (error) {
      console.error("Admin economy save error:", error);
      setStatus(error instanceof Error ? error.message : "Economy tier could not be saved.");
    } finally {
      setSavingTierId("");
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRewards();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const previewTier = tiers.find((tier) => tier.id === previewTierId) || tiers[0] || null;
  const safeSalePrice = Math.max(0, Number(previewSalePrice) || 0);
  const previewSellerFee = previewTier
    ? Math.round(safeSalePrice * (previewTier.sellerFeePercent / 100) * 100) / 100
    : 0;
  const previewBuyerRewardPercent = previewTier
    ? Math.round(previewTier.buyerBasePercent * previewTier.buyerMultiplier * 100) / 100
    : 0;
  const previewSellerRewardPercent = previewTier
    ? Math.round(previewTier.sellerBasePercent * previewTier.sellerMultiplier * 100) / 100
    : 0;
  const previewBuyerReward = Math.round(safeSalePrice * (previewBuyerRewardPercent / 100) * 100) / 100;
  const previewSellerReward = Math.round(safeSalePrice * (previewSellerRewardPercent / 100) * 100) / 100;
  const estimatedStripeCost = Math.round((safeSalePrice * 0.029 + 0.3) * 100) / 100;
  const platformRevenue = Math.max(
    Math.round((previewSellerFee - estimatedStripeCost - previewBuyerReward - previewSellerReward) * 100) / 100,
    0,
  );

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(value || 0);
  }

  function formatPercent(value?: number | null) {
    if (value === null || value === undefined) {
      return "Pending";
    }

    return `${Number(value).toFixed(2)}%`;
  }

  return (
    <main className="admin-rewards-page">
      <style>{pageStyles}</style>
      <AdminLayout />
      <div className="admin-rewards-shell">
        <Header />

        <section className="page-heading">
          <span>Admin</span>
          <h1>GRAIL Economy</h1>
          <p>
            Configure marketplace economy tiers without changing code. This phase
            simulates rewards only and does not award GRAIL Credit.
          </p>
        </section>

        {!isLoading && !isAdmin ? (
          <section className="panel access-panel">
            <h2>Access denied</h2>
            <p>{adminEmail ? `${adminEmail} is not allowed.` : "Sign in as an admin."}</p>
          </section>
        ) : (
          <section className="panel rewards-panel">
            <div className="section-title-row">
              <div>
                <span>Configuration</span>
                <h2>Economy Tiers</h2>
              </div>
              <button type="button" onClick={loadRewards}>
                Refresh
              </button>
            </div>

            <div className="tier-list">
              {isLoading ? (
                <p className="empty-state">Loading GRAIL Economy...</p>
              ) : tiers.length > 0 ? (
                tiers.map((tier) => (
                  <div key={tier.id} className="tier-row">
                    <div className="tier-title">
                      <label>
                        <span>Rank</span>
                        <input
                          value={tier.rankName}
                          onChange={(event) =>
                            updateTier(tier.id, {
                              rankName: event.target.value.toUpperCase(),
                            })
                          }
                        />
                      </label>
                      <div className="level-range-grid">
                        <label>
                          <span>Min Level</span>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={tier.minLevel}
                            onChange={(event) =>
                              updateTier(tier.id, {
                                minLevel: Number(event.target.value),
                              })
                            }
                          />
                        </label>
                        <label>
                          <span>Max Level</span>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={tier.maxLevel}
                            onChange={(event) =>
                              updateTier(tier.id, {
                                maxLevel: Number(event.target.value),
                              })
                            }
                          />
                        </label>
                      </div>
                      <small>Updated {formatDate(tier.updatedAt)}</small>
                    </div>
                    <label>
                      <span>Seller Fee %</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={tier.sellerFeePercent}
                        onChange={(event) =>
                          updateTier(tier.id, {
                            sellerFeePercent: Number(event.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      <span>Buyer Base %</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={tier.buyerBasePercent}
                        onChange={(event) =>
                          updateTier(tier.id, {
                            buyerBasePercent: Number(event.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      <span>Seller Base %</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={tier.sellerBasePercent}
                        onChange={(event) =>
                          updateTier(tier.id, {
                            sellerBasePercent: Number(event.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      <span>Buyer Multiplier</span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={tier.buyerMultiplier}
                        onChange={(event) =>
                          updateTier(tier.id, {
                            buyerMultiplier: Number(event.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      <span>Seller Multiplier</span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={tier.sellerMultiplier}
                        onChange={(event) =>
                          updateTier(tier.id, {
                            sellerMultiplier: Number(event.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      <span>XP Multiplier</span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={tier.xpMultiplier}
                        onChange={(event) =>
                          updateTier(tier.id, {
                            xpMultiplier: Number(event.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      <span>Wallet Multiplier</span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={tier.walletMultiplier}
                        onChange={(event) =>
                          updateTier(tier.id, {
                            walletMultiplier: Number(event.target.value),
                          })
                        }
                      />
                    </label>
                    <label className="toggle-label">
                      <span>Enabled</span>
                      <input
                        type="checkbox"
                        checked={tier.enabled}
                        onChange={(event) =>
                          updateTier(tier.id, {
                            enabled: event.target.checked,
                          })
                        }
                      />
                    </label>
                    <button
                      type="button"
                      disabled={savingTierId === tier.id}
                      onClick={() => saveTier(tier)}
                    >
                      {savingTierId === tier.id ? "Saving..." : "Save"}
                    </button>
                  </div>
                ))
              ) : (
                <p className="empty-state">
                  No economy tiers found. Run the reward_tiers SQL seed first.
                </p>
              )}
            </div>
            {status ? <p className="status-message">{status}</p> : null}
          </section>
        )}

        {isAdmin ? (
          <section className="panel preview-panel">
            <div className="section-title-row">
              <div>
                <span>Simulator</span>
                <h2>Reward Preview</h2>
              </div>
            </div>
            <div className="preview-controls">
              <label>
                <span>Sale Price</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={previewSalePrice}
                  onChange={(event) => setPreviewSalePrice(Number(event.target.value))}
                />
              </label>
              <label>
                <span>Rank</span>
                <select
                  value={previewTier?.id || ""}
                  onChange={(event) => setPreviewTierId(event.target.value)}
                >
                  {tiers.map((tier) => (
                    <option key={tier.id} value={tier.id}>
                      {tier.rankName} · Levels {tier.minLevel}-{tier.maxLevel}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="preview-grid">
              <div>
                <span>Seller Fee</span>
                <strong>{formatCurrency(previewSellerFee)}</strong>
                <em>{formatPercent(previewTier?.sellerFeePercent)}</em>
              </div>
              <div>
                <span>Buyer Reward</span>
                <strong>{formatCurrency(previewBuyerReward)}</strong>
                <em>{formatPercent(previewBuyerRewardPercent)}</em>
              </div>
              <div>
                <span>Seller Reward</span>
                <strong>{formatCurrency(previewSellerReward)}</strong>
                <em>{formatPercent(previewSellerRewardPercent)}</em>
              </div>
              <div>
                <span>Platform Revenue</span>
                <strong>{formatCurrency(platformRevenue)}</strong>
                <em>After estimated Stripe and simulated rewards</em>
              </div>
              <div>
                <span>Estimated Stripe Cost</span>
                <strong>{formatCurrency(estimatedStripeCost)}</strong>
                <em>2.9% + $0.30 estimate</em>
              </div>
              <div>
                <span>Wallet Credit</span>
                <strong>{formatCurrency(previewBuyerReward + previewSellerReward)}</strong>
                <em>Simulation only; not awarded</em>
              </div>
              <div>
                <span>XP Multiplier</span>
                <strong>{previewTier ? `${previewTier.xpMultiplier}x` : "Pending"}</strong>
                <em>Current economy setting</em>
              </div>
              <div>
                <span>Current Multipliers</span>
                <strong>
                  B {previewTier?.buyerMultiplier || 1}x · S {previewTier?.sellerMultiplier || 1}x
                </strong>
                <em>Wallet {previewTier?.walletMultiplier || 1}x</em>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

const pageStyles = `
  .admin-rewards-page {
    min-height: 100vh;
    background: radial-gradient(circle at 50% -120px, rgba(201,205,211,0.08), transparent 32%), linear-gradient(180deg, #000 0%, #030304 58%, #000 100%);
    color: #fafafa;
    font-family: Arial, Helvetica, sans-serif;
  }
  .admin-rewards-shell {
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
  .section-title-row span,
  label span {
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
  .empty-state,
  .status-message,
  .access-panel p {
    color: #a1a1aa;
    font-size: 13px;
    line-height: 18px;
    font-weight: 800;
  }
  .rewards-panel,
  .access-panel,
  .preview-panel {
    margin-top: 18px;
    padding: 16px;
  }
  .section-title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  .section-title-row h2,
  .access-panel h2 {
    margin: 6px 0 0;
    color: #fff;
    font-size: 22px;
    line-height: 26px;
    font-weight: 900;
  }
  .tier-list {
    margin-top: 14px;
    display: grid;
    gap: 10px;
  }
  .tier-row {
    border: 1px solid rgba(201,205,211,0.14);
    border-radius: 10px;
    background: rgba(8,8,10,0.72);
    padding: 12px;
    display: grid;
    grid-template-columns: minmax(160px, 1.25fr) repeat(7, minmax(100px, 1fr)) 72px 80px;
    gap: 10px;
    align-items: end;
  }
  .tier-title strong {
    display: block;
    color: #fff;
    font-size: 13px;
    line-height: 16px;
    font-weight: 900;
  }
  .tier-title span,
  .tier-title small {
    display: block;
    margin-top: 4px;
    color: #85858f;
    font-size: 11px;
    line-height: 15px;
    font-weight: 800;
  }
  .level-range-grid {
    margin-top: 8px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  label {
    display: grid;
    gap: 6px;
  }
  input,
  select {
    width: 100%;
    border: 1px solid #24242a;
    border-radius: 10px;
    background: #08080a;
    color: #fff;
    padding: 10px;
    box-sizing: border-box;
    font: inherit;
    font-size: 13px;
    font-weight: 800;
    outline: none;
  }
  select {
    min-height: 40px;
  }
  .toggle-label {
    justify-items: center;
  }
  .toggle-label input {
    width: 20px;
    height: 20px;
    accent-color: #E7DED0;
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
  .tier-row button {
    background: #E7DED0;
    color: #111;
  }
  button:disabled {
    cursor: not-allowed;
    opacity: 0.62;
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
  .preview-controls {
    margin-top: 14px;
    display: grid;
    grid-template-columns: 180px minmax(220px, 1fr);
    gap: 10px;
  }
  .preview-grid {
    margin-top: 12px;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }
  .preview-grid div {
    border: 1px solid rgba(201,205,211,0.14);
    border-radius: 10px;
    background: rgba(8,8,10,0.72);
    padding: 12px;
    min-height: 84px;
  }
  .preview-grid span {
    display: block;
    color: #C9CDD3;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .preview-grid strong {
    display: block;
    margin-top: 8px;
    color: #fff;
    font-size: 19px;
    line-height: 23px;
    font-weight: 900;
  }
  .preview-grid em {
    display: block;
    margin-top: 6px;
    color: #85858f;
    font-size: 11px;
    line-height: 15px;
    font-style: normal;
    font-weight: 800;
  }
  @media (max-width: 1100px) {
    .admin-rewards-shell {
      width: calc(100vw - 32px);
    }
    .tier-row {
      grid-template-columns: 1fr;
    }
    .preview-controls,
    .preview-grid {
      grid-template-columns: 1fr;
    }
    .toggle-label {
      justify-items: start;
    }
  }
`;
