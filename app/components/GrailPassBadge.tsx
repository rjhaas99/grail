"use client";

import {
  getGrailPassBadgeTone,
  isGrailPassActive,
  normalizeGrailPassMembership,
  type GrailPassMembership,
} from "../lib/grailPass";

type GrailPassBadgeProps = {
  membership?: Partial<GrailPassMembership> | null;
  variant?: "compact" | "identity";
  hideWhenNone?: boolean;
};

export default function GrailPassBadge({
  membership,
  variant = "compact",
  hideWhenNone = false,
}: GrailPassBadgeProps) {
  const normalized = normalizeGrailPassMembership(membership);
  const tone = getGrailPassBadgeTone(normalized);
  const active = isGrailPassActive(normalized);

  if (hideWhenNone && tone === "none") {
    return null;
  }

  return (
    <span
      className={`grail-pass-badge ${variant} ${tone}`}
      title={normalized.description}
      aria-label={`${normalized.displayName}: ${normalized.status}`}
    >
      <style>{passBadgeStyles}</style>
      <em aria-hidden="true">GP</em>
      <span>
        <strong>{normalized.badgeLabel}</strong>
        {variant === "identity" ? (
          <small>{active ? normalized.displayName : "Membership inactive"}</small>
        ) : null}
      </span>
    </span>
  );
}

const passBadgeStyles = `
  .grail-pass-badge {
    border: 1px solid rgba(231,222,208,0.24);
    border-radius: 999px;
    background:
      linear-gradient(135deg, rgba(231,222,208,0.095), rgba(201,205,211,0.025)),
      rgba(5,5,6,0.92);
    color: #E7DED0;
    display: inline-grid;
    grid-template-columns: 24px minmax(0, 1fr);
    gap: 8px;
    align-items: center;
    text-decoration: none;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
  }
  .grail-pass-badge.compact {
    min-height: 30px;
    padding: 3px 10px 3px 4px;
  }
  .grail-pass-badge.identity {
    width: 100%;
    min-height: 54px;
    border-radius: 13px;
    padding: 9px;
  }
  .grail-pass-badge.none {
    border-color: rgba(201,205,211,0.12);
    background: rgba(201,205,211,0.035);
    color: #85858f;
  }
  .grail-pass-badge.inactive {
    border-color: rgba(201,205,211,0.18);
    color: #C9CDD3;
  }
  .grail-pass-badge.active {
    border-color: rgba(231,222,208,0.42);
    box-shadow:
      0 0 22px rgba(231,222,208,0.08),
      inset 0 1px 0 rgba(255,255,255,0.08);
  }
  .grail-pass-badge em {
    width: 24px;
    height: 24px;
    border: 1px solid rgba(231,222,208,0.30);
    border-radius: 999px;
    background:
      radial-gradient(circle at 50% 35%, rgba(255,255,255,0.22), transparent 42%),
      #050506;
    color: #E7DED0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 8px;
    line-height: 10px;
    font-style: normal;
    font-weight: 900;
    letter-spacing: 0.04em;
  }
  .grail-pass-badge.none em {
    border-color: rgba(201,205,211,0.16);
    color: #85858f;
  }
  .grail-pass-badge strong {
    display: block;
    color: inherit;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .grail-pass-badge small {
    display: block;
    margin-top: 3px;
    color: #85858f;
    font-size: 10px;
    line-height: 13px;
    font-weight: 800;
  }
  @media (prefers-reduced-motion: reduce) {
    .grail-pass-badge {
      transition: none;
    }
  }
`;
