"use client";

import { useEffect, useState } from "react";

type TrustBadge = {
  key: string;
  label: string;
  description: string;
};

type TrustSummary = {
  completedSales: number;
  completedPurchases: number;
  yearsOnGrail: number;
  verificationStatus: string;
  memberSince: string | null;
};

type TrustBadgeResponse = {
  badges?: TrustBadge[];
  summary?: Partial<TrustSummary>;
};

const emptySummary: TrustSummary = {
  completedSales: 0,
  completedPurchases: 0,
  yearsOnGrail: 0,
  verificationStatus: "Not verified yet",
  memberSince: null,
};

function getBadgeIcon(key: string) {
  if (key.includes("verified")) {
    return "✓";
  }

  if (key.includes("trusted")) {
    return "★";
  }

  return "🏆";
}

function getBadgeTone(key: string) {
  if (key.includes("verified")) {
    return "verified";
  }

  if (key.includes("trusted")) {
    return "trusted";
  }

  return "achievement";
}

function formatMemberSince(value?: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function formatYearsOnGrail(value: number) {
  if (value <= 0) {
    return "<1";
  }

  return String(value);
}

export default function PublicTrustSection({ userId }: { userId?: string | null }) {
  const [badges, setBadges] = useState<TrustBadge[]>([]);
  const [summary, setSummary] = useState<TrustSummary>(emptySummary);

  useEffect(() => {
    let isMounted = true;

    const timeout = window.setTimeout(() => {
      async function loadTrust() {
        if (!userId) {
          if (isMounted) {
            setBadges([]);
            setSummary(emptySummary);
          }
          return;
        }

        try {
          const response = await fetch(
            `/api/trust/badges?userId=${encodeURIComponent(userId)}`,
          );
          const payload = (await response.json()) as TrustBadgeResponse;

          if (!isMounted) {
            return;
          }

          setBadges(payload.badges || []);
          setSummary({
            ...emptySummary,
            ...(payload.summary || {}),
          });
        } catch (error) {
          console.warn("Public trust load skipped:", error);

          if (isMounted) {
            setBadges([]);
            setSummary(emptySummary);
          }
        }
      }

      void loadTrust();
    }, 0);

    return () => {
      isMounted = false;
      window.clearTimeout(timeout);
    };
  }, [userId]);

  return (
    <section className="public-trust-card" aria-label="GRAIL Trust and Verification">
      <style>{trustStyles}</style>
      <div className="public-trust-heading">
        <div>
          <span>GRAIL Trust &amp; Verification</span>
          <h2>Public trust profile</h2>
        </div>
      </div>

      {badges.length > 0 ? (
        <div className="public-trust-badge-grid">
          {badges.map((badge) => {
            const tone = getBadgeTone(badge.key);
            return (
              <span
                key={badge.key}
                className={`public-trust-badge ${tone}`}
                title={badge.description}
              >
                <em aria-hidden="true">{getBadgeIcon(badge.key)}</em>
                <span>
                  <strong>{badge.label}</strong>
                  <small>{badge.description}</small>
                </span>
              </span>
            );
          })}
        </div>
      ) : (
        <p className="public-trust-empty">
          Trust badges will appear as this collector completes successful transactions
          and verifies their account.
        </p>
      )}

      <div className="public-trust-summary">
        <div>
          <span>Completed Sales</span>
          <strong>{summary.completedSales.toLocaleString()}</strong>
        </div>
        <div>
          <span>Completed Purchases</span>
          <strong>{summary.completedPurchases.toLocaleString()}</strong>
        </div>
        <div>
          <span>Years on GRAIL</span>
          <strong>{formatYearsOnGrail(summary.yearsOnGrail)}</strong>
        </div>
        <div>
          <span>Verification Status</span>
          <strong>{summary.verificationStatus}</strong>
        </div>
        <div>
          <span>Member Since</span>
          <strong>{formatMemberSince(summary.memberSince)}</strong>
        </div>
      </div>
    </section>
  );
}

const trustStyles = `
  .public-trust-card {
    margin-top: 16px;
    border: 1px solid #1d1d22;
    border-radius: 14px;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.008)),
      rgba(5,5,6,0.94);
    box-shadow: 0 18px 44px rgba(0,0,0,0.24);
    padding: 16px;
  }
  .public-trust-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  .public-trust-heading span {
    display: block;
    color: #C9CDD3;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .public-trust-heading h2 {
    margin: 7px 0 0;
    color: #fff;
    font-size: 22px;
    line-height: 26px;
    font-weight: 900;
  }
  .public-trust-badge-grid {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .public-trust-badge {
    min-height: 58px;
    border: 1px solid rgba(201,205,211,0.16);
    border-radius: 12px;
    background: rgba(8,8,10,0.78);
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr);
    gap: 9px;
    align-items: center;
    padding: 10px;
    color: #fff;
  }
  .public-trust-badge.verified {
    border-color: rgba(201,205,211,0.34);
    background: rgba(201,205,211,0.055);
  }
  .public-trust-badge.trusted {
    border-color: rgba(231,222,208,0.34);
    background: rgba(231,222,208,0.065);
  }
  .public-trust-badge.achievement {
    border-color: rgba(255,255,255,0.28);
    background: linear-gradient(135deg, rgba(231,222,208,0.085), rgba(201,205,211,0.025));
  }
  .public-trust-badge > em {
    width: 30px;
    height: 30px;
    border: 1px solid rgba(231,222,208,0.22);
    border-radius: 999px;
    background: #050506;
    color: #E7DED0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    line-height: 16px;
    font-style: normal;
    font-weight: 900;
  }
  .public-trust-badge strong {
    display: block;
    color: #fff;
    font-size: 12px;
    line-height: 15px;
    font-weight: 900;
  }
  .public-trust-badge small {
    display: block;
    margin-top: 3px;
    color: #85858f;
    font-size: 10px;
    line-height: 14px;
    font-weight: 800;
  }
  .public-trust-empty {
    margin: 13px 0 0;
    border: 1px solid rgba(201,205,211,0.12);
    border-radius: 12px;
    background: rgba(201,205,211,0.035);
    color: #a1a1aa;
    padding: 12px;
    font-size: 13px;
    line-height: 19px;
    font-weight: 800;
  }
  .public-trust-summary {
    margin-top: 12px;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 8px;
  }
  .public-trust-summary div {
    border: 1px solid rgba(201,205,211,0.12);
    border-radius: 10px;
    background: rgba(201,205,211,0.035);
    padding: 10px;
  }
  .public-trust-summary span {
    display: block;
    color: #85858f;
    font-size: 10px;
    line-height: 13px;
    font-weight: 900;
    text-transform: uppercase;
  }
  .public-trust-summary strong {
    display: block;
    margin-top: 6px;
    color: #fff;
    font-size: 13px;
    line-height: 17px;
    font-weight: 900;
  }
  @media (max-width: 900px) {
    .public-trust-badge-grid,
    .public-trust-summary {
      grid-template-columns: 1fr;
    }
  }
`;
