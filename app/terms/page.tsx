import Link from "next/link";
import Header from "../components/Header";

const lastUpdated = "July 2026";
const legalLinks = [
  ["Terms", "/terms"],
  ["Privacy", "/privacy"],
  ["Buyer Protection", "/buyer-protection"],
  ["Seller Rules", "/seller-rules"],
  ["Fees", "/fees"],
  ["Shipping", "/shipping-policy"],
  ["Refunds & Disputes", "/refund-dispute-policy"],
  ["Prohibited Items", "/prohibited-items"],
];
const sections = [
  {
    title: "Account Rules",
    body: [
      "You are responsible for the accuracy of your account information and for activity that happens through your account.",
      "GRAIL may limit, suspend, or remove accounts that abuse the marketplace, violate policies, create fraud risk, or interfere with other users.",
    ],
  },
  {
    title: "Buying And Selling",
    body: [
      "Buyers and sellers must use GRAIL checkout for marketplace transactions. Off-platform payment attempts may lead to account action.",
      "Listings must be accurate and must describe the card, year, set or brand, player or character, condition, grader, grade, serial number, and cert number when applicable.",
    ],
  },
  {
    title: "Listing Standards",
    body: [
      "Fake, counterfeit, stolen, altered, misrepresented, or illegal items are not allowed. GRAIL may remove listings at its discretion.",
      "High-value cards may require additional review or verification steps later. GRAIL does not guarantee authenticity unless a specific verified service is offered for that transaction.",
    ],
  },
  {
    title: "Payments, Payouts, And Disputes",
    body: [
      "Seller payouts may be held during delivery, inspection, or dispute review. The current inspection window is 3 days after delivery unless GRAIL changes it later.",
      "During disputes, GRAIL may request photos, packaging photos, tracking proof, messages, card or slab closeups, or other evidence.",
      "Admin decisions may include releasing seller payout, keeping payout blocked, requesting more evidence, or other manual resolution.",
    ],
  },
  {
    title: "Limitations",
    body: [
      "GRAIL is a marketplace for sports cards and trading cards/TCG. Users remain responsible for listing accuracy, shipping, compliance with law, and cooperation during disputes.",
      "Contact support@grailcollectibles.com with account, order, or policy questions.",
    ],
  },
];

export default function TermsPage() {
  return <PolicyPage eyebrow="Terms" title="Terms of Service" sections={sections} />;
}

function PolicyPage({
  eyebrow,
  title,
  sections,
}: {
  eyebrow: string;
  title: string;
  sections: { title: string; body: string[] }[];
}) {
  return (
    <main className="policy-page">
      <style>{pageStyles}</style>
      <div className="policy-shell">
        <Header />
        <section className="policy-heading">
          <span>{eyebrow}</span>
          <h1>{title}</h1>
          <p>Starter marketplace policy for GRAIL Collectibles LLC.</p>
          <strong>Last updated: {lastUpdated}</strong>
        </section>
        <section className="policy-card">
          {sections.map((section) => (
            <article key={section.title}>
              <h2>{section.title}</h2>
              {section.body.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </article>
          ))}
        </section>
        <LegalNav />
      </div>
    </main>
  );
}

function LegalNav() {
  return (
    <section className="legal-nav" aria-label="Legal and protection pages">
      {legalLinks.map(([label, href]) => (
        <Link key={href} href={href}>
          {label}
        </Link>
      ))}
    </section>
  );
}

const pageStyles = `
  .policy-page { min-height: 100vh; background: radial-gradient(circle at 50% -120px, rgba(201,205,211,0.08), transparent 32%), linear-gradient(180deg, #000 0%, #030304 58%, #000 100%); color: #fafafa; font-family: Arial, Helvetica, sans-serif; }
  .policy-shell { width: min(980px, calc(100vw - 32px)); margin: 0 auto; padding: 8px 0 42px; }
  .policy-heading { margin-top: 24px; }
  .policy-heading span { color: #C9CDD3; font-size: 11px; line-height: 14px; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; }
  .policy-heading h1 { margin: 8px 0 0; color: #fff; font-size: 42px; line-height: 46px; font-weight: 900; }
  .policy-heading p, .policy-card p { color: #a1a1aa; font-size: 14px; line-height: 22px; font-weight: 700; }
  .policy-heading strong { display: inline-flex; margin-top: 10px; color: #E7DED0; font-size: 12px; font-weight: 900; }
  .policy-card { margin-top: 18px; border: 1px solid #1d1d22; border-radius: 12px; background: linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.006)), rgba(5,5,6,0.92); box-shadow: 0 18px 44px rgba(0,0,0,0.28); padding: 18px; display: grid; gap: 18px; }
  .policy-card article { border-bottom: 1px solid rgba(201,205,211,0.1); padding-bottom: 16px; }
  .policy-card article:last-child { border-bottom: 0; padding-bottom: 0; }
  .policy-card h2 { margin: 0; color: #fff; font-size: 20px; line-height: 24px; font-weight: 900; }
  .legal-nav { margin-top: 18px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
  .legal-nav a { border: 1px solid rgba(231,222,208,0.22); border-radius: 10px; background: rgba(231,222,208,0.055); color: #fff; min-height: 42px; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; font-size: 12px; font-weight: 900; text-align: center; }
  .legal-nav a:hover { border-color: rgba(231,222,208,0.58); background: rgba(231,222,208,0.1); }
  @media (max-width: 760px) { .legal-nav { grid-template-columns: repeat(2, minmax(0, 1fr)); } .policy-heading h1 { font-size: 34px; line-height: 38px; } }
`;
