import Image from "next/image";
import type { CSSProperties } from "react";
import {
  getCollectorLevelBadge,
  getCollectorLevelBadgeAlt,
  getCollectorLevelBadgeAssets,
  getCollectorLevelBadgeTooltip,
  resolveCollectorLevelBadge,
  type CollectorLevelBadgeKey,
} from "../lib/collectorLevelBadges";

type CollectorLevelBadgeProps = {
  badgeKey?: CollectorLevelBadgeKey | string | null;
  level?: number | string | null;
  rank?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  showLabel?: boolean;
  hideWhenUnavailable?: boolean;
  label?: string;
  className?: string;
};

const sizeMap = {
  xs: 22,
  sm: 34,
  md: 52,
  lg: 88,
  xl: 132,
};

function resolveSize(size: CollectorLevelBadgeProps["size"]) {
  if (typeof size === "number") {
    return Math.max(20, Math.min(200, size));
  }

  return sizeMap[size || "md"];
}

export default function CollectorLevelBadge({
  badgeKey,
  level,
  rank,
  size = "md",
  showLabel = false,
  hideWhenUnavailable = false,
  label,
  className,
}: CollectorLevelBadgeProps) {
  const badge = hideWhenUnavailable
    ? resolveCollectorLevelBadge({ key: badgeKey, level, rank })
    : getCollectorLevelBadge({ key: badgeKey, level, rank });

  if (!badge) {
    return null;
  }

  const assets = getCollectorLevelBadgeAssets(badge);
  const tooltip = getCollectorLevelBadgeTooltip(badge);
  const resolvedSize = resolveSize(size);
  const style = {
    "--collector-level-badge-size": `${resolvedSize}px`,
    "--collector-level-badge-accent": badge.accent,
  } as CSSProperties;

  return (
    <span
      className={[
        "collector-level-badge",
        `collector-level-badge-${badge.key}`,
        badge.animated ? "collector-level-badge-animated" : "",
        showLabel ? "collector-level-badge-with-label" : "",
        className || "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
      role="img"
      aria-label={getCollectorLevelBadgeAlt(badge)}
      data-tooltip={tooltip}
      title={tooltip}
      tabIndex={0}
    >
      <style>{collectorLevelBadgeStyles}</style>
      <span className="collector-level-badge-art" aria-hidden="true">
        <Image
          src={assets.svg}
          alt=""
          width={200}
          height={200}
          sizes={`${resolvedSize}px`}
          unoptimized
        />
      </span>
      {showLabel ? (
        <span className="collector-level-badge-label" aria-hidden="true">
          <strong>{label || badge.rank}</strong>
          <small>Levels {badge.levelRange}</small>
        </span>
      ) : null}
    </span>
  );
}

const collectorLevelBadgeStyles = `
  .collector-level-badge {
    position: relative;
    width: var(--collector-level-badge-size);
    min-width: var(--collector-level-badge-size);
    min-height: var(--collector-level-badge-size);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    vertical-align: middle;
    outline: none;
    isolation: isolate;
  }

  .collector-level-badge-with-label {
    width: auto;
    justify-content: flex-start;
    gap: 10px;
  }

  .collector-level-badge-art {
    position: relative;
    width: var(--collector-level-badge-size);
    height: var(--collector-level-badge-size);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    flex: 0 0 auto;
    filter: drop-shadow(0 8px 12px rgba(0,0,0,0.45));
    overflow: hidden;
  }

  .collector-level-badge-art img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: contain;
  }

  .collector-level-badge-label {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  .collector-level-badge-label strong {
    color: #fff;
    font-size: 12px;
    line-height: 15px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .collector-level-badge-label small {
    color: #C9CDD3;
    font-size: 10px;
    line-height: 13px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .collector-level-badge::after {
    content: attr(data-tooltip);
    position: absolute;
    left: 50%;
    bottom: calc(100% + 10px);
    width: max-content;
    max-width: 210px;
    transform: translateX(-50%) translateY(4px);
    border: 1px solid rgba(231,222,208,0.24);
    border-radius: 12px;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.018)),
      rgba(5,5,6,0.96);
    box-shadow: 0 18px 42px rgba(0,0,0,0.48);
    color: #f5f5f5;
    padding: 9px 11px;
    font-size: 11px;
    line-height: 16px;
    font-weight: 800;
    letter-spacing: 0.02em;
    white-space: pre-line;
    text-align: center;
    pointer-events: none;
    opacity: 0;
    z-index: 30;
    transition:
      opacity 160ms ease,
      transform 160ms ease;
  }

  .collector-level-badge:hover::after,
  .collector-level-badge:focus-visible::after {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }

  .collector-level-badge-animated .collector-level-badge-art::before {
    content: "";
    position: absolute;
    inset: -18%;
    border-radius: inherit;
    background:
      linear-gradient(112deg, transparent 30%, rgba(255,255,255,0.32) 45%, transparent 58%);
    transform: translateX(-76%) rotate(12deg);
    mix-blend-mode: screen;
    opacity: 0.56;
    animation: collectorBadgeSweep 6.5s ease-in-out infinite;
    z-index: 2;
  }

  .collector-level-badge-grail .collector-level-badge-art {
    filter:
      drop-shadow(0 8px 12px rgba(0,0,0,0.45))
      drop-shadow(0 0 14px rgba(243,201,79,0.18));
  }

  .collector-level-badge-black-label .collector-level-badge-art {
    filter:
      drop-shadow(0 8px 12px rgba(0,0,0,0.45))
      drop-shadow(0 0 12px rgba(244,244,245,0.12));
  }

  @keyframes collectorBadgeSweep {
    0%, 58%, 100% {
      transform: translateX(-78%) rotate(12deg);
      opacity: 0;
    }
    66% {
      opacity: 0.52;
    }
    78% {
      transform: translateX(78%) rotate(12deg);
      opacity: 0;
    }
  }

  @media (max-width: 680px) {
    .collector-level-badge::after {
      max-width: 176px;
      font-size: 10px;
      line-height: 14px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .collector-level-badge-animated .collector-level-badge-art::before {
      animation: none;
      opacity: 0;
    }
    .collector-level-badge::after {
      transition: none;
    }
  }
`;
