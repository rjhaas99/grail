"use client";

import Link from "next/link";
import GrailPassBadge from "./GrailPassBadge";
import GrailPassPresenceCard from "./GrailPassPresenceCard";
import {
  hasGrailPassPerk,
  resolveGrailPassPerks,
  type GrailPassMembership,
} from "../lib/grailPass";

export type CollectorIdentityBadge = {
  label: string;
  description?: string;
  tone?: "verified" | "prestige" | "trust" | "neutral";
};

export type CollectorIdentityMetric = {
  label: string;
  value: string;
  detail?: string;
};

type CollectorIdentityCardProps = {
  name: string;
  handle?: string | null;
  initials?: string;
  eyebrow?: string;
  rankTitle?: string | null;
  levelLabel?: string | null;
  collectorSince?: string | null;
  marketplaceEvent?: string | null;
  featuredAchievement?: string | null;
  profileHref?: string | null;
  badges?: CollectorIdentityBadge[];
  metrics?: CollectorIdentityMetric[];
  narrative?: string;
  grailPass?: Partial<GrailPassMembership> | null;
  showGrailPassPreview?: boolean;
};

function getInitials(name: string) {
  const initials = name
    .split(" ")
    .map((part) => part.trim().charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return initials || "G";
}

export default function CollectorIdentityCard({
  name,
  handle,
  initials,
  eyebrow = "Collector Identity",
  rankTitle,
  levelLabel,
  collectorSince,
  marketplaceEvent,
  featuredAchievement,
  profileHref,
  badges = [],
  metrics = [],
  narrative,
  grailPass,
  showGrailPassPreview = false,
}: CollectorIdentityCardProps) {
  const displayInitials = initials || getInitials(name);
  const safeBadges = badges.filter((badge) => badge.label.trim());
  const safeMetrics = metrics.filter((metric) => metric.label.trim() && metric.value.trim());
  const grailPassPerks = resolveGrailPassPerks(grailPass);
  const hasPremiumCollectorCard = hasGrailPassPerk(
    grailPassPerks,
    "premium_collector_card",
  );

  return (
    <section className="collector-identity-card" aria-label="Collector identity">
      <style>{identityStyles}</style>
      <div className="collector-identity-mark" aria-hidden="true">
        {displayInitials}
      </div>

      <div className="collector-identity-main">
        <span className="collector-identity-eyebrow">{eyebrow}</span>
        <div className="collector-identity-title-row">
          <div>
            <h2>{name}</h2>
            {handle ? <p>{handle.startsWith("@") ? handle : `@${handle}`}</p> : null}
          </div>
          {profileHref ? <Link href={profileHref}>View Profile</Link> : null}
        </div>

        <div className="collector-identity-story">
          {rankTitle ? <strong>{rankTitle}</strong> : null}
          {levelLabel ? <span>{levelLabel}</span> : null}
          {collectorSince ? <span>Collector since {collectorSince}</span> : null}
          {marketplaceEvent && marketplaceEvent !== "None" ? (
            <span>{marketplaceEvent}</span>
          ) : null}
        </div>

        <p className="collector-identity-narrative">
          {narrative ||
            "A GRAIL collector building marketplace history, trust, and progression."}
        </p>

        <div className="collector-identity-badges">
          {safeBadges.length > 0 ? (
            safeBadges.slice(0, 4).map((badge) => (
              <span
                key={`${badge.label}-${badge.description || ""}`}
                className={`collector-identity-badge ${badge.tone || "neutral"}`}
                title={badge.description || badge.label}
              >
                <em aria-hidden="true" />
                <span>
                  <strong>{badge.label}</strong>
                  {badge.description ? <small>{badge.description}</small> : null}
                </span>
              </span>
            ))
          ) : (
            <span className="collector-identity-empty">
              Trust and prestige badges appear as this collector builds history.
            </span>
          )}
        </div>
      </div>

      <aside className="collector-identity-side">
        {hasPremiumCollectorCard ? (
          <GrailPassBadge membership={grailPass} variant="identity" hideWhenNone />
        ) : showGrailPassPreview ? (
          <GrailPassPresenceCard
            variant="identity"
            eyebrow="Available with GRAIL Pass"
            title="Premium identity preview."
            description="Future Pass presentation can add premium profile treatments, collection customization, and member-only identity details."
            perkKeys={["premium_collector_card", "premium_profile_theme"]}
          />
        ) : null}

        {featuredAchievement ? (
          <div className="collector-identity-feature">
            <span>Featured Achievement</span>
            <strong>{featuredAchievement}</strong>
          </div>
        ) : null}

        {safeMetrics.length > 0 ? (
          <div className="collector-identity-metrics">
            {safeMetrics.slice(0, 4).map((metric) => (
              <div key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                {metric.detail ? <small>{metric.detail}</small> : null}
              </div>
            ))}
          </div>
        ) : null}
      </aside>
    </section>
  );
}

const identityStyles = `
  .collector-identity-card {
    margin-top: 16px;
    border: 1px solid rgba(231,222,208,0.18);
    border-radius: 18px;
    background:
      radial-gradient(circle at 12% 0%, rgba(231,222,208,0.10), transparent 30%),
      linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.006)),
      rgba(5,5,6,0.95);
    box-shadow: 0 22px 54px rgba(0,0,0,0.32);
    padding: 18px;
    display: grid;
    grid-template-columns: 86px minmax(0, 1fr) minmax(260px, 0.42fr);
    gap: 18px;
    align-items: stretch;
    color: #fafafa;
  }
  .collector-identity-mark {
    width: 78px;
    height: 78px;
    border: 1px solid rgba(231,222,208,0.30);
    border-radius: 22px;
    background:
      radial-gradient(circle at 50% 18%, rgba(255,255,255,0.16), transparent 42%),
      linear-gradient(145deg, rgba(231,222,208,0.14), rgba(8,8,10,0.92));
    color: #E7DED0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    line-height: 28px;
    font-weight: 900;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
  }
  .collector-identity-main {
    min-width: 0;
  }
  .collector-identity-eyebrow,
  .collector-identity-feature span,
  .collector-identity-metrics span {
    color: #C9CDD3;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .collector-identity-title-row {
    margin-top: 8px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
  }
  .collector-identity-title-row h2 {
    margin: 0;
    color: #fff;
    font-size: clamp(28px, 4vw, 42px);
    line-height: 1;
    font-weight: 900;
    letter-spacing: 0;
  }
  .collector-identity-title-row p {
    margin: 7px 0 0;
    color: #85858f;
    font-size: 13px;
    line-height: 17px;
    font-weight: 800;
  }
  .collector-identity-title-row a {
    min-height: 34px;
    border: 1px solid rgba(231,222,208,0.24);
    border-radius: 999px;
    background: rgba(231,222,208,0.055);
    color: #E7DED0;
    padding: 0 12px;
    display: inline-flex;
    align-items: center;
    text-decoration: none;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    white-space: nowrap;
  }
  .collector-identity-story {
    margin-top: 13px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }
  .collector-identity-story strong,
  .collector-identity-story span {
    min-height: 28px;
    border: 1px solid rgba(201,205,211,0.14);
    border-radius: 999px;
    background: rgba(201,205,211,0.045);
    color: #E7DED0;
    padding: 0 10px;
    display: inline-flex;
    align-items: center;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
  }
  .collector-identity-story span {
    color: #C9CDD3;
  }
  .collector-identity-narrative {
    max-width: 720px;
    margin: 13px 0 0;
    color: #a1a1aa;
    font-size: 13px;
    line-height: 19px;
    font-weight: 800;
  }
  .collector-identity-badges {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .collector-identity-badge {
    min-height: 54px;
    border: 1px solid rgba(201,205,211,0.14);
    border-radius: 13px;
    background: rgba(8,8,10,0.76);
    padding: 9px;
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr);
    gap: 8px;
    align-items: center;
  }
  .collector-identity-badge.verified {
    border-color: rgba(231,222,208,0.32);
    background: rgba(231,222,208,0.065);
  }
  .collector-identity-badge.prestige {
    border-color: rgba(231,222,208,0.26);
    background: linear-gradient(135deg, rgba(231,222,208,0.08), rgba(201,205,211,0.025));
  }
  .collector-identity-badge.trust {
    border-color: rgba(201,205,211,0.30);
    background: rgba(201,205,211,0.055);
  }
  .collector-identity-badge em {
    width: 22px;
    height: 22px;
    border: 1px solid rgba(231,222,208,0.24);
    border-radius: 999px;
    background: radial-gradient(circle at 50% 45%, rgba(231,222,208,0.42), transparent 34%), #050506;
  }
  .collector-identity-badge strong {
    display: block;
    color: #fff;
    font-size: 12px;
    line-height: 15px;
    font-weight: 900;
  }
  .collector-identity-badge small {
    display: block;
    margin-top: 3px;
    color: #85858f;
    font-size: 10px;
    line-height: 13px;
    font-weight: 800;
  }
  .collector-identity-empty {
    grid-column: 1 / -1;
    border: 1px solid rgba(201,205,211,0.12);
    border-radius: 12px;
    background: rgba(201,205,211,0.035);
    color: #a1a1aa;
    padding: 11px;
    font-size: 12px;
    line-height: 17px;
    font-weight: 800;
  }
  .collector-identity-side {
    display: grid;
    gap: 10px;
    align-content: stretch;
  }
  .collector-identity-feature,
  .collector-identity-metrics div {
    border: 1px solid rgba(201,205,211,0.13);
    border-radius: 14px;
    background: rgba(0,0,0,0.26);
    padding: 12px;
  }
  .collector-identity-feature strong,
  .collector-identity-metrics strong {
    display: block;
    margin-top: 7px;
    color: #fff;
    font-size: 18px;
    line-height: 22px;
    font-weight: 900;
  }
  .collector-identity-metrics {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .collector-identity-metrics small {
    display: block;
    margin-top: 4px;
    color: #85858f;
    font-size: 10px;
    line-height: 13px;
    font-weight: 800;
  }
  @media (max-width: 980px) {
    .collector-identity-card {
      grid-template-columns: 1fr;
    }
    .collector-identity-mark {
      width: 68px;
      height: 68px;
      border-radius: 18px;
    }
  }
  @media (max-width: 620px) {
    .collector-identity-title-row,
    .collector-identity-badges,
    .collector-identity-metrics {
      grid-template-columns: 1fr;
    }
    .collector-identity-title-row {
      display: grid;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .collector-identity-title-row a {
      transition: none;
    }
  }
`;
