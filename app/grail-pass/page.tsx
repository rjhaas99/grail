import GrailPassBadge from "../components/GrailPassBadge";
import PageShell from "../components/PageShell";
import {
  getGrailPassPerksForMembershipType,
  grailPassMembershipCatalog,
  noGrailPassMembership,
  normalizeGrailPassMembership,
  type GrailPassPerk,
  type GrailPassPerkKey,
} from "../lib/grailPass";

const currentMembership = normalizeGrailPassMembership(noGrailPassMembership);
const previewMembership = normalizeGrailPassMembership(grailPassMembershipCatalog.annual);

function perksFor(keys: GrailPassPerkKey[]) {
  return keys
    .map((key) =>
      getGrailPassPerksForMembershipType("future").find((perk) => perk.key === key),
    )
    .filter(Boolean) as GrailPassPerk[];
}

const benefitSections = [
  {
    title: "Wallet",
    eyebrow: "Future credit experience",
    description:
      "GRAIL Pass is structured to support future GRAIL Credit benefits without changing wallet architecture.",
    perks: perksFor(["wallet_multiplier", "monthly_credit"]),
  },
  {
    title: "Collector Identity",
    eyebrow: "Future prestige layer",
    description:
      "Membership presentation is designed to enhance the collector profile, not replace trust or progression.",
    perks: perksFor(["premium_profile_theme", "animated_profile_frame", "seasonal_cosmetics"]),
  },
  {
    title: "Marketplace",
    eyebrow: "Future selling utility",
    description:
      "Marketplace benefits can plug into the existing economy layer when subscriptions are introduced.",
    perks: perksFor(["featured_listing_credit"]),
  },
  {
    title: "Collections",
    eyebrow: "Future collector insight",
    description:
      "Collection and seller insight can become part of the membership surface without moving analytics into the UI.",
    perks: perksFor(["advanced_collection_analytics"]),
  },
  {
    title: "Support",
    eyebrow: "Future service layer",
    description:
      "Support benefits are represented as membership capabilities, ready for later operational tooling.",
    perks: perksFor(["priority_support", "early_access"]),
  },
  {
    title: "Events",
    eyebrow: "Future event layer",
    description:
      "Pass-specific event presentation is framework-ready while reward multipliers remain controlled by the economy system.",
    perks: perksFor(["xp_multiplier"]),
  },
];

const roadmapSections = [
  {
    title: "Available Now",
    items: [
      "GRAIL Pass framework",
      "Reusable membership badge",
      "Collector Identity compatibility",
      "Collector Moments compatibility",
    ],
  },
  {
    title: "Coming Soon",
    items: [
      "Membership management surface",
      "Configurable benefit display",
      "Premium identity previews",
      "GRAIL Economy benefit controls",
    ],
  },
  {
    title: "Future",
    items: [
      "Subscription management",
      "Monthly and annual plans",
      "Family plans",
      "Billing, invoices, and membership history",
    ],
  },
];

export default function GrailPassPage() {
  return (
    <PageShell
      className="grail-pass-page"
      shellClassName="grail-pass-app-shell"
      shellStyle={{ padding: "8px 0 58px" }}
      styles={pageStyles}
    >
      <section className="pass-hero" aria-labelledby="grail-pass-title">
        <div className="pass-hero-copy">
          <p className="pass-kicker">Premium Membership</p>
          <h1 id="grail-pass-title">GRAIL Pass</h1>
          <p className="pass-value">
            The premium membership foundation built for serious collectors who want a
            more polished GRAIL experience.
          </p>
          <div className="pass-hero-notes" aria-label="GRAIL Pass status">
            <span>Presentation only</span>
            <span>No subscription active</span>
            <span>No checkout changes</span>
          </div>
        </div>

        <aside className="pass-preview-card" aria-label="GRAIL Pass membership preview">
          <div className="pass-preview-topline">
            <span>Membership Preview</span>
            <GrailPassBadge membership={previewMembership} />
          </div>
          <div className="pass-preview-emblem" aria-hidden="true">
            GP
          </div>
          <h2>Built for a better collector experience.</h2>
          <p>
            GRAIL Pass is designed as a central membership layer for identity,
            wallet, marketplace, support, and future event experiences.
          </p>
        </aside>
      </section>

      <section className="pass-shell pass-membership-grid" aria-label="Membership overview">
        <article className="pass-panel">
          <p className="pass-kicker">Current State</p>
          <h2>Membership</h2>
          <dl className="pass-detail-list">
            <div>
              <dt>Membership Type</dt>
              <dd>{currentMembership.displayName}</dd>
            </div>
            <div>
              <dt>Membership Status</dt>
              <dd>Not active</dd>
            </div>
            <div>
              <dt>Current Benefits</dt>
              <dd>Foundation only. No paid benefits are active.</dd>
            </div>
            <div>
              <dt>Future Benefits</dt>
              <dd>Configured through GRAIL Economy when membership launches.</dd>
            </div>
          </dl>
        </article>

        <article className="pass-panel pass-membership-preview">
          <p className="pass-kicker">Collector Preview</p>
          <h2>How it appears</h2>
          <div className="pass-identity-demo">
            <div className="pass-demo-avatar" aria-hidden="true">
              G
            </div>
            <div>
              <strong>Collector Identity</strong>
              <span>Future membership presentation</span>
            </div>
            <GrailPassBadge membership={previewMembership} variant="identity" />
          </div>
          <p>
            Membership can enhance the collector card with a premium badge,
            future themes, animated frames, and seasonal cosmetics. Trust badges
            and progression remain separate systems.
          </p>
        </article>
      </section>

      <section className="pass-shell" aria-labelledby="pass-benefits-title">
        <div className="pass-section-heading">
          <p className="pass-kicker">Benefit Architecture</p>
          <h2 id="pass-benefits-title">Designed to grow without scattered flags.</h2>
          <p>
            The page reads from the centralized GRAIL Pass perk definitions. The
            perks below are framework-ready and labeled as future capabilities.
          </p>
        </div>

        <div className="pass-benefit-grid">
          {benefitSections.map((section) => (
            <article className="pass-benefit-card" key={section.title}>
              <p>{section.eyebrow}</p>
              <h3>{section.title}</h3>
              <span>{section.description}</span>
              <ul>
                {section.perks.map((perk) => (
                  <li key={perk.key}>
                    <strong>{perk.label}</strong>
                    <small>{perk.description}</small>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="pass-shell pass-event-section" aria-labelledby="pass-events-title">
        <div>
          <p className="pass-kicker">Marketplace Events</p>
          <h2 id="pass-events-title">Ready for future event presentation.</h2>
          <p>
            GRAIL Pass can later layer onto marketplace events without changing
            event scheduling, reward math, or checkout. This is only a visual
            preview of how the experience can be explained to collectors.
          </p>
        </div>
        <div className="pass-event-preview" aria-label="Future marketplace event example">
          <div>
            <span>Marketplace Event</span>
            <strong>Double XP Weekend</strong>
          </div>
          <div className="pass-multiplier-row">
            <span>Normal Collector</span>
            <strong>2x</strong>
          </div>
          <div className="pass-multiplier-row premium">
            <span>Pass Collector</span>
            <strong>3x</strong>
          </div>
          <p>Example only. No event multiplier logic is implemented here.</p>
        </div>
      </section>

      <section className="pass-shell" aria-labelledby="pass-roadmap-title">
        <div className="pass-section-heading compact">
          <p className="pass-kicker">Experience Timeline</p>
          <h2 id="pass-roadmap-title">A permanent home for membership.</h2>
          <p>
            This page is structured to later hold plan management, upgrades,
            billing, invoices, and membership history without replacing the
            experience.
          </p>
        </div>

        <div className="pass-roadmap">
          {roadmapSections.map((section) => (
            <article className="pass-roadmap-card" key={section.title}>
              <h3>{section.title}</h3>
              <ul>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

const pageStyles = `
  .grail-pass-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at 18% 8%, rgba(231,222,208,0.11), transparent 30%),
      radial-gradient(circle at 82% 6%, rgba(185,146,74,0.12), transparent 28%),
      linear-gradient(180deg, #050506 0%, #0A0A0C 44%, #050506 100%);
    color: #F5F1E8;
  }

  .pass-hero,
  .pass-shell {
    width: 100%;
    margin: 0 auto;
  }

  .pass-hero {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.65fr);
    gap: 28px;
    align-items: stretch;
    padding: 10px 0 34px;
  }

  .pass-hero-copy,
  .pass-preview-card,
  .pass-panel,
  .pass-benefit-card,
  .pass-event-section,
  .pass-roadmap-card {
    border: 1px solid rgba(231,222,208,0.16);
    background:
      linear-gradient(135deg, rgba(231,222,208,0.09), rgba(255,255,255,0.018)),
      rgba(8,8,10,0.86);
    box-shadow:
      0 24px 70px rgba(0,0,0,0.30),
      inset 0 1px 0 rgba(255,255,255,0.055);
  }

  .pass-hero-copy {
    border-radius: 22px;
    padding: clamp(28px, 5vw, 62px);
    display: flex;
    min-height: 430px;
    flex-direction: column;
    justify-content: flex-end;
    animation: passFadeUp 520ms ease both;
  }

  .pass-kicker {
    margin: 0 0 14px;
    color: #B9924A;
    font-size: 11px;
    line-height: 15px;
    font-weight: 900;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .pass-hero h1 {
    margin: 0;
    color: #FFFFFF;
    font-size: clamp(56px, 9vw, 116px);
    line-height: 0.92;
    font-weight: 900;
  }

  .pass-value {
    max-width: 660px;
    margin: 26px 0 0;
    color: #D8D2C8;
    font-size: clamp(18px, 2vw, 24px);
    line-height: 1.42;
    font-weight: 650;
  }

  .pass-hero-notes {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 34px;
  }

  .pass-hero-notes span,
  .pass-preview-topline span,
  .pass-event-preview p {
    border: 1px solid rgba(231,222,208,0.14);
    border-radius: 999px;
    background: rgba(255,255,255,0.035);
    color: #BDB7AE;
    padding: 8px 11px;
    font-size: 12px;
    line-height: 15px;
    font-weight: 800;
  }

  .pass-preview-card {
    border-radius: 22px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
    position: relative;
    animation: passFadeUp 620ms ease both;
  }

  .pass-preview-card::before {
    content: "";
    position: absolute;
    inset: -40% -18% auto auto;
    width: 260px;
    height: 260px;
    border-radius: 999px;
    background: radial-gradient(circle, rgba(185,146,74,0.20), transparent 68%);
    pointer-events: none;
  }

  .pass-preview-topline {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    position: relative;
    z-index: 1;
  }

  .pass-preview-emblem {
    width: 124px;
    height: 124px;
    border: 1px solid rgba(231,222,208,0.26);
    border-radius: 999px;
    margin: 54px 0 36px;
    display: grid;
    place-items: center;
    color: #E7DED0;
    font-size: 34px;
    line-height: 1;
    font-weight: 950;
    background:
      radial-gradient(circle at 50% 28%, rgba(255,255,255,0.18), transparent 42%),
      linear-gradient(135deg, rgba(231,222,208,0.16), rgba(185,146,74,0.08));
    box-shadow: 0 0 44px rgba(185,146,74,0.12);
    position: relative;
    z-index: 1;
  }

  .pass-preview-card h2,
  .pass-panel h2,
  .pass-section-heading h2,
  .pass-event-section h2 {
    margin: 0;
    color: #FFFFFF;
    font-size: clamp(26px, 3vw, 42px);
    line-height: 1.02;
    font-weight: 900;
  }

  .pass-preview-card p,
  .pass-panel p,
  .pass-section-heading p,
  .pass-event-section p,
  .pass-benefit-card span {
    color: #BDB7AE;
    font-size: 15px;
    line-height: 1.62;
    font-weight: 650;
  }

  .pass-membership-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
    padding: 18px 0 58px;
  }

  .pass-panel {
    border-radius: 18px;
    padding: 24px;
  }

  .pass-detail-list {
    display: grid;
    gap: 12px;
    margin: 24px 0 0;
  }

  .pass-detail-list div {
    border: 1px solid rgba(231,222,208,0.11);
    border-radius: 14px;
    background: rgba(255,255,255,0.028);
    padding: 14px;
  }

  .pass-detail-list dt {
    margin: 0 0 6px;
    color: #85858F;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0;
  }

  .pass-detail-list dd {
    margin: 0;
    color: #F5F1E8;
    font-size: 14px;
    line-height: 20px;
    font-weight: 800;
  }

  .pass-identity-demo {
    display: grid;
    grid-template-columns: 46px minmax(0, 1fr);
    gap: 12px;
    align-items: center;
    margin: 24px 0 18px;
  }

  .pass-identity-demo .grail-pass-badge {
    grid-column: 1 / -1;
  }

  .pass-demo-avatar {
    width: 46px;
    height: 46px;
    border: 1px solid rgba(231,222,208,0.20);
    border-radius: 999px;
    display: grid;
    place-items: center;
    color: #E7DED0;
    font-weight: 950;
    background: rgba(255,255,255,0.035);
  }

  .pass-identity-demo strong,
  .pass-identity-demo span {
    display: block;
  }

  .pass-identity-demo strong {
    color: #FFFFFF;
    font-size: 15px;
    line-height: 19px;
    font-weight: 900;
  }

  .pass-identity-demo span {
    margin-top: 3px;
    color: #85858F;
    font-size: 12px;
    line-height: 16px;
    font-weight: 800;
  }

  .pass-section-heading {
    max-width: 780px;
    margin-bottom: 22px;
  }

  .pass-section-heading.compact {
    max-width: 700px;
  }

  .pass-benefit-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }

  .pass-benefit-card {
    border-radius: 16px;
    padding: 20px;
    min-height: 288px;
  }

  .pass-benefit-card p {
    margin: 0 0 10px;
    color: #B9924A;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .pass-benefit-card h3,
  .pass-roadmap-card h3 {
    margin: 0 0 12px;
    color: #FFFFFF;
    font-size: 22px;
    line-height: 26px;
    font-weight: 900;
  }

  .pass-benefit-card ul,
  .pass-roadmap-card ul {
    list-style: none;
    padding: 0;
    margin: 18px 0 0;
    display: grid;
    gap: 10px;
  }

  .pass-benefit-card li,
  .pass-roadmap-card li {
    border-top: 1px solid rgba(231,222,208,0.10);
    padding-top: 10px;
    color: #F5F1E8;
    font-size: 13px;
    line-height: 18px;
    font-weight: 850;
  }

  .pass-benefit-card li strong,
  .pass-benefit-card li small {
    display: block;
  }

  .pass-benefit-card li small {
    margin-top: 4px;
    color: #85858F;
    font-size: 12px;
    line-height: 17px;
    font-weight: 650;
  }

  .pass-event-section {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(320px, 420px);
    gap: 24px;
    align-items: center;
    border-radius: 20px;
    margin-top: 60px;
    padding: 28px;
  }

  .pass-event-preview {
    border: 1px solid rgba(231,222,208,0.13);
    border-radius: 18px;
    background: rgba(0,0,0,0.24);
    padding: 18px;
    display: grid;
    gap: 12px;
  }

  .pass-event-preview > div:first-child span {
    display: block;
    color: #85858F;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .pass-event-preview > div:first-child strong {
    display: block;
    margin-top: 5px;
    color: #FFFFFF;
    font-size: 20px;
    line-height: 24px;
    font-weight: 900;
  }

  .pass-multiplier-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    border: 1px solid rgba(231,222,208,0.10);
    border-radius: 14px;
    background: rgba(255,255,255,0.025);
    padding: 13px;
  }

  .pass-multiplier-row.premium {
    border-color: rgba(185,146,74,0.34);
    background: rgba(185,146,74,0.075);
  }

  .pass-multiplier-row span {
    color: #BDB7AE;
    font-size: 13px;
    line-height: 17px;
    font-weight: 800;
  }

  .pass-multiplier-row strong {
    color: #F5F1E8;
    font-size: 24px;
    line-height: 28px;
    font-weight: 950;
  }

  .pass-event-preview p {
    margin: 4px 0 0;
    border-radius: 12px;
    padding: 10px 12px;
  }

  .pass-roadmap {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
    padding-bottom: 86px;
  }

  .pass-roadmap-card {
    border-radius: 16px;
    padding: 22px;
  }

  .pass-roadmap-card li {
    color: #BDB7AE;
    font-weight: 750;
  }

  @keyframes passFadeUp {
    from {
      opacity: 0;
      transform: translateY(14px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 920px) {
    .pass-hero,
    .pass-membership-grid,
    .pass-event-section {
      grid-template-columns: 1fr;
    }

    .pass-benefit-grid,
    .pass-roadmap {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 640px) {
    .pass-hero,
    .pass-shell {
      width: 100%;
    }

    .pass-hero {
      padding-top: 10px;
    }

    .pass-hero-copy {
      min-height: 360px;
      border-radius: 18px;
      padding: 26px;
    }

    .pass-preview-topline {
      align-items: flex-start;
      flex-direction: column;
    }

    .pass-benefit-grid,
    .pass-roadmap {
      grid-template-columns: 1fr;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .pass-hero-copy,
    .pass-preview-card {
      animation: none;
    }
  }
`;
