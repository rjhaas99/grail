import Link from "next/link";
import Header from "../components/Header";

const lastUpdated = "July 2026";
const legalLinks = [["Terms", "/terms"], ["Privacy", "/privacy"], ["Buyer Protection", "/buyer-protection"], ["Seller Rules", "/seller-rules"], ["Fees", "/fees"], ["Shipping", "/shipping-policy"], ["Refunds & Disputes", "/refund-dispute-policy"], ["Prohibited Items", "/prohibited-items"]];
const sections = [
  { title: "Information We May Collect", body: ["GRAIL may collect account information, email, profile details, listings, messages, orders, uploaded images, dispute evidence, device data, and log data.", "Payment-related information is handled through Stripe or other payment processors. GRAIL does not need to store full card numbers in the app."] },
  { title: "How We Use Information", body: ["We use information to operate the marketplace, process orders, support GRAIL Protected Checkout, prevent fraud, review disputes, improve services, and communicate with users.", "Messages, order data, listing data, and uploaded evidence may be reviewed when needed for support, safety, or dispute handling."] },
  { title: "Service Providers", body: ["GRAIL uses vendors for hosting, database, storage, payments, analytics, and support. Supabase or similar services may store account, listing, image, order, and message data.", "Stripe or another payment processor may process payment, payout, fraud, tax, and compliance information."] },
  { title: "Security And Retention", body: ["GRAIL uses reasonable technical and organizational steps to protect marketplace data, but no online service can guarantee perfect security.", "We may retain records as needed for orders, legal compliance, fraud prevention, dispute review, and account safety."] },
  { title: "Contact", body: ["Contact support@grailcollectibles.com with privacy questions or requests about your account information."] },
];

export default function PrivacyPage() { return <PolicyPage eyebrow="Privacy" title="Privacy Policy" sections={sections} />; }

function PolicyPage({ eyebrow, title, sections }: { eyebrow: string; title: string; sections: { title: string; body: string[] }[] }) {
  return (
    <main className="policy-page"><style>{pageStyles}</style><div className="policy-shell"><Header /><section className="policy-heading"><span>{eyebrow}</span><h1>{title}</h1><p>How GRAIL Collectibles LLC handles marketplace information.</p><strong>Last updated: {lastUpdated}</strong></section><section className="policy-card">{sections.map((section) => <article key={section.title}><h2>{section.title}</h2>{section.body.map((item) => <p key={item}>{item}</p>)}</article>)}</section><LegalNav /></div></main>
  );
}
function LegalNav() { return <section className="legal-nav">{legalLinks.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</section>; }
const pageStyles = `
  .policy-page { min-height: 100vh; background: radial-gradient(circle at 50% -120px, rgba(201,205,211,0.08), transparent 32%), linear-gradient(180deg, #000 0%, #030304 58%, #000 100%); color: #fafafa; font-family: Arial, Helvetica, sans-serif; }
  .policy-shell { width: min(980px, calc(100vw - 32px)); margin: 0 auto; padding: 8px 0 42px; }
  .policy-heading { margin-top: 24px; } .policy-heading span { color: #C9CDD3; font-size: 11px; line-height: 14px; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; }
  .policy-heading h1 { margin: 8px 0 0; color: #fff; font-size: 42px; line-height: 46px; font-weight: 900; }
  .policy-heading p, .policy-card p { color: #a1a1aa; font-size: 14px; line-height: 22px; font-weight: 700; } .policy-heading strong { display: inline-flex; margin-top: 10px; color: #E7DED0; font-size: 12px; font-weight: 900; }
  .policy-card { margin-top: 18px; border: 1px solid #1d1d22; border-radius: 12px; background: linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.006)), rgba(5,5,6,0.92); box-shadow: 0 18px 44px rgba(0,0,0,0.28); padding: 18px; display: grid; gap: 18px; }
  .policy-card article { border-bottom: 1px solid rgba(201,205,211,0.1); padding-bottom: 16px; } .policy-card article:last-child { border-bottom: 0; padding-bottom: 0; } .policy-card h2 { margin: 0; color: #fff; font-size: 20px; line-height: 24px; font-weight: 900; }
  .legal-nav { margin-top: 18px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; } .legal-nav a { border: 1px solid rgba(231,222,208,0.22); border-radius: 10px; background: rgba(231,222,208,0.055); color: #fff; min-height: 42px; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; font-size: 12px; font-weight: 900; text-align: center; } .legal-nav a:hover { border-color: rgba(231,222,208,0.58); background: rgba(231,222,208,0.1); }
  @media (max-width: 760px) { .legal-nav { grid-template-columns: repeat(2, minmax(0, 1fr)); } .policy-heading h1 { font-size: 34px; line-height: 38px; } }
`;
