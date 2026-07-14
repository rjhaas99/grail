"use client";

import Link from "next/link";
import GrailPassBadge from "./GrailPassBadge";
import {
  getGrailPassPerksForMembershipType,
  grailPassMembershipCatalog,
  normalizeGrailPassMembership,
  type GrailPassPerkKey,
} from "../lib/grailPass";

type GrailPassPresenceCardProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  items?: string[];
  href?: string;
  ctaLabel?: string;
  variant?: "compact" | "identity" | "panel";
  perkKeys?: GrailPassPerkKey[];
};

const previewMembership = normalizeGrailPassMembership({
  ...grailPassMembershipCatalog.future,
  status: "paused",
  displayName: "GRAIL Pass Preview",
  description: "Available with GRAIL Pass. Coming soon.",
});

const defaultItems = [
  "Available with GRAIL Pass",
  "Coming Soon",
  "Preview only",
];

export default function GrailPassPresenceCard({
  eyebrow = "GRAIL Pass",
  title = "Premium collector experience.",
  description = "GRAIL Pass will bring future membership benefits into identity, wallet, events, and marketplace presentation.",
  items,
  href = "/grail-pass",
  ctaLabel = "View GRAIL Pass",
  variant = "panel",
  perkKeys,
}: GrailPassPresenceCardProps) {
  const badgeVariant = variant === "identity" ? "identity" : "compact";
  const previewPerks = perkKeys?.length
    ? getGrailPassPerksForMembershipType("future").filter((perk) =>
        perkKeys.includes(perk.key),
      )
    : [];
  const displayItems = items?.length
    ? items
    : previewPerks.length
      ? previewPerks.map((perk) => perk.label)
      : defaultItems;

  return (
    <article className={`grail-pass-presence-card ${variant}`} aria-label="GRAIL Pass preview">
      <style>{presenceStyles}</style>
      <div className="grail-pass-presence-top">
        <span>{eyebrow}</span>
        <GrailPassBadge membership={previewMembership} variant={badgeVariant} />
      </div>

      <h3>{title}</h3>
      <p>{description}</p>

      <div className="grail-pass-presence-items" aria-label="GRAIL Pass preview states">
        {displayItems.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>

      <Link href={href}>{ctaLabel}</Link>
    </article>
  );
}

const presenceStyles = `
  .grail-pass-presence-card {
    border: 1px solid rgba(231,222,208,0.16);
    border-radius: 16px;
    background:
      radial-gradient(circle at 18% 0%, rgba(185,146,74,0.12), transparent 30%),
      linear-gradient(135deg, rgba(231,222,208,0.07), rgba(255,255,255,0.018)),
      rgba(5,5,6,0.88);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.045);
    color: #F5F1E8;
    padding: 14px;
  }
  .grail-pass-presence-card.identity {
    padding: 12px;
  }
  .grail-pass-presence-card.compact {
    border-radius: 14px;
    padding: 12px;
  }
  .grail-pass-presence-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }
  .grail-pass-presence-top > span {
    color: #B9924A;
    font-size: 10px;
    line-height: 13px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .grail-pass-presence-card h3 {
    margin: 13px 0 0;
    color: #FFFFFF;
    font-size: 18px;
    line-height: 22px;
    font-weight: 900;
    letter-spacing: 0;
  }
  .grail-pass-presence-card.identity h3,
  .grail-pass-presence-card.compact h3 {
    font-size: 15px;
    line-height: 19px;
  }
  .grail-pass-presence-card p {
    margin: 8px 0 0;
    color: #A1A1AA;
    font-size: 12px;
    line-height: 17px;
    font-weight: 750;
  }
  .grail-pass-presence-items {
    margin-top: 12px;
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }
  .grail-pass-presence-items span {
    border: 1px solid rgba(231,222,208,0.12);
    border-radius: 999px;
    background: rgba(231,222,208,0.045);
    color: #D8D2C8;
    padding: 6px 8px;
    font-size: 10px;
    line-height: 12px;
    font-weight: 900;
  }
  .grail-pass-presence-card a {
    min-height: 34px;
    margin-top: 13px;
    border: 1px solid rgba(231,222,208,0.24);
    border-radius: 999px;
    color: #E7DED0;
    display: inline-flex;
    align-items: center;
    padding: 0 12px;
    text-decoration: none;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    transition:
      transform 160ms ease,
      border-color 160ms ease,
      background 160ms ease;
  }
  .grail-pass-presence-card a:hover {
    transform: translateY(-1px);
    border-color: rgba(231,222,208,0.42);
    background: rgba(231,222,208,0.055);
  }
  @media (max-width: 620px) {
    .grail-pass-presence-top {
      display: grid;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .grail-pass-presence-card a {
      transition: none;
    }
    .grail-pass-presence-card a:hover {
      transform: none;
    }
  }
`;
