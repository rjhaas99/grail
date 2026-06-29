"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Header from "../components/Header";

const photoTypes = [
  "Front",
  "Back",
  "Top Corners",
  "Bottom Corners",
  "Surface",
  "Edges",
];
const categories = ["Sports", "TCG"];
const rawConditions = ["Mint", "Near Mint", "Excellent", "Very Good", "Good", "Poor"];
const graders = ["PSA", "BGS", "CGC", "SGC", "Other"];
const psaGrades = ["10", "9", "8.5", "8", "7.5", "7", "6.5", "6", "5.5", "5", "4.5", "4", "3.5", "3", "2.5", "2", "1.5", "1", "Authentic"];
const standardGrades = ["10", "9.5", "9", "8.5", "8", "7.5", "7", "6.5", "6", "5.5", "5", "4.5", "4", "3.5", "3", "2.5", "2", "1.5", "1", "Authentic"];

function formatCurrency(value: string) {
  const number = Number(value);
  if (!number) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(number);
}

function ActionCircles() {
  return (
    <div className="action-circles" aria-hidden="true">
      <span>🛒</span>
      <span>✉</span>
      <span>$</span>
    </div>
  );
}

export default function ListCardPage() {
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("Sports");
  const [cardType, setCardType] = useState<"Raw" | "Graded">("Graded");
  const [title, setTitle] = useState("Crimson Court Rookie");
  const [year, setYear] = useState("2026");
  const [setName, setSetName] = useState("Crimson Court Archive");
  const [cardNumber, setCardNumber] = useState("CC-01");
  const [subject, setSubject] = useState("Rookie Guard");
  const [grader, setGrader] = useState("PSA");
  const [grade, setGrade] = useState("10");
  const [condition, setCondition] = useState("Near Mint");
  const [askingPrice, setAskingPrice] = useState("1240");
  const [minimumOffer, setMinimumOffer] = useState("1120");
  const [marketValue, setMarketValue] = useState("1320");

  const gradeOptions = grader === "PSA" ? psaGrades : standardGrades;
  const subtitle =
    cardType === "Graded"
      ? `${category}: ${grader} ${grade}`
      : `${category}: ${condition}`;
  const badges = useMemo(() => {
    const next = [cardType === "Graded" ? "Graded" : "Raw"];
    if (Number(marketValue) >= 1200) next.push("Grail");
    return next;
  }, [cardType, marketValue]);

  return (
    <main className="list-page">
      <style>{pageStyles}</style>
      <div className="page-shell">
        <Header />

        <section className="page-heading">
          <span>Seller Tools</span>
          <h1>List a Card</h1>
          <p>Create a premium GRAIL listing for sports cards, TCG cards, slabs, and raw cards.</p>
        </section>

        {status ? <p className="status-message">{status}</p> : null}

        <section className="list-layout">
          <div className="main-column">
            <section className="panel form-section">
              <h2>Photos</h2>
              <p>Raw cards should include corners, surface, and edge photos so buyers can inspect condition.</p>
              <div className="upload-grid">
                {photoTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    className="upload-box"
                    onClick={() => setStatus("Photo upload mock only.")}
                  >
                    <strong>{type}</strong>
                    <span>Upload</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="panel form-section">
              <h2>Card Info</h2>
              <div className="field-grid">
                <label>
                  <span>Category</span>
                  <select value={category} onChange={(event) => setCategory(event.target.value)}>
                    {categories.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label>
                  <span>Card title</span>
                  <input value={title} onChange={(event) => setTitle(event.target.value)} />
                </label>
                <label>
                  <span>Year</span>
                  <input value={year} onChange={(event) => setYear(event.target.value)} />
                </label>
                <label>
                  <span>Set</span>
                  <input value={setName} onChange={(event) => setSetName(event.target.value)} />
                </label>
                <label>
                  <span>Card number</span>
                  <input value={cardNumber} onChange={(event) => setCardNumber(event.target.value)} />
                </label>
                <label>
                  <span>Player / Character</span>
                  <input value={subject} onChange={(event) => setSubject(event.target.value)} />
                </label>
                <label>
                  <span>Card type</span>
                  <select value={cardType} onChange={(event) => setCardType(event.target.value as "Raw" | "Graded")}>
                    <option>Raw</option>
                    <option>Graded</option>
                  </select>
                </label>
                {cardType === "Raw" ? (
                  <label>
                    <span>Condition</span>
                    <select value={condition} onChange={(event) => setCondition(event.target.value)}>
                      {rawConditions.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                ) : (
                  <>
                    <label>
                      <span>Grader</span>
                      <select value={grader} onChange={(event) => setGrader(event.target.value)}>
                        {graders.map((item) => <option key={item}>{item}</option>)}
                      </select>
                    </label>
                    <label>
                      <span>Grade</span>
                      <select value={grade} onChange={(event) => setGrade(event.target.value)}>
                        {gradeOptions.map((item) => <option key={item}>{item}</option>)}
                      </select>
                    </label>
                  </>
                )}
              </div>
            </section>

            <section className="panel form-section">
              <h2>Pricing</h2>
              <div className="field-grid three">
                <label>
                  <span>Asking price</span>
                  <input value={askingPrice} onChange={(event) => setAskingPrice(event.target.value)} />
                </label>
                <label>
                  <span>Minimum offer</span>
                  <input value={minimumOffer} onChange={(event) => setMinimumOffer(event.target.value)} />
                </label>
                <label>
                  <span>Market value placeholder</span>
                  <input value={marketValue} onChange={(event) => setMarketValue(event.target.value)} />
                </label>
              </div>
              <p>Grail tag is based on market value, not asking price.</p>
              <p>Offers are available on every GRAIL listing. Sellers can set a minimum offer.</p>
            </section>

            <section className="panel form-section">
              <h2>Shipping</h2>
              <div className="field-grid three">
                <label>
                  <span>Shipping speed</span>
                  <select defaultValue="1-2 business days">
                    <option>1-2 business days</option>
                    <option>2-3 business days</option>
                    <option>3-5 business days</option>
                  </select>
                </label>
                <label>
                  <span>Shipping cost</span>
                  <input defaultValue="$14" />
                </label>
                <label className="toggle-field">
                  <span>Local pickup placeholder</span>
                  <button type="button" onClick={() => setStatus("Local pickup toggle mock only.")}>Off</button>
                </label>
              </div>
            </section>
          </div>

          <aside className="preview-column">
            <section className="panel preview-card">
              <h2>Live Listing Preview</h2>
              <div className="art-shell">
                <div className={`mock-card ${cardType === "Raw" ? "raw-card" : ""}`}>
                  {cardType === "Graded" ? (
                    <div className="mock-label"><span>{grader} {grade}</span><span>{category}</span></div>
                  ) : null}
                  <div className="mock-art"><span /><strong /></div>
                </div>
              </div>
              <div className="badge-row">
                {badges.map((badge) => <span key={badge}>{badge}</span>)}
              </div>
              <h3>{title || "Untitled Card"}</h3>
              <p>{subtitle}</p>
              <p>Seller: VaultRunner</p>
              <strong>{formatCurrency(askingPrice)}</strong>
              <ActionCircles />
              <button type="button" className="view-card" onClick={() => setStatus("Preview updated.")}>View Card</button>
            </section>

            <section className="panel action-panel">
              <button type="button" onClick={() => setStatus("Draft saved.")}>Save Draft</button>
              <button type="button" onClick={() => setStatus("Preview updated.")}>Preview Listing</button>
              <button type="button" className="primary" onClick={() => setStatus("Listing published mock-only.")}>Publish Listing</button>
              <Link href="/seller-dashboard">Back to Seller Dashboard</Link>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}

const pageStyles = `
  .list-page { min-height: 100vh; background: radial-gradient(circle at 50% -120px, rgba(201,205,211,0.08), transparent 32%), linear-gradient(180deg, #000 0%, #030304 58%, #000 100%); color: #fafafa; font-family: Arial, Helvetica, sans-serif; }
  .page-shell { width: 1240px; margin: 0 auto; padding: 8px 0 38px; }
  .panel { border: 1px solid #1d1d22; border-radius: 12px; background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.006)), rgba(5,5,6,0.92); box-shadow: 0 18px 44px rgba(0,0,0,0.28); }
  .page-heading { margin-top: 18px; }
  .page-heading span { color: #C9CDD3; font-size: 11px; line-height: 14px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
  .page-heading h1 { margin: 8px 0 0; color: #fff; font-size: 42px; line-height: 46px; font-weight: 900; }
  .page-heading p, .form-section p, .preview-card p, .status-message { color: #a1a1aa; font-size: 13px; line-height: 18px; font-weight: 800; }
  .status-message { margin: 16px 0 0; border: 1px solid rgba(52,211,153,0.24); border-radius: 10px; background: rgba(52,211,153,0.07); color: #86efac; padding: 10px; font-weight: 900; }
  .list-layout { margin-top: 18px; display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 16px; align-items: start; }
  .main-column, .preview-column { display: grid; gap: 14px; }
  .form-section, .preview-card, .action-panel { padding: 16px; }
  h2 { margin: 0; color: #fff; font-size: 20px; line-height: 24px; font-weight: 900; }
  .upload-grid { margin-top: 14px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
  .upload-box { min-height: 104px; border: 1px dashed rgba(201,205,211,0.24); border-radius: 10px; background: rgba(8,8,10,0.76); color: #fff; display: grid; place-items: center; gap: 4px; cursor: pointer; }
  .upload-box span, label span { color: #C9CDD3; font-size: 12px; font-weight: 900; }
  .field-grid { margin-top: 14px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .field-grid.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  label { display: grid; gap: 7px; }
  input, select { border: 1px solid #24242a; border-radius: 10px; background: #08080a; color: #fff; min-height: 42px; padding: 0 12px; box-sizing: border-box; font: inherit; font-size: 13px; font-weight: 800; outline: none; }
  button, .action-panel a, .view-card { min-height: 40px; border: 1px solid rgba(231,222,208,0.28); border-radius: 10px; background: rgba(231,222,208,0.055); color: #fff; padding: 0 12px; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; font-size: 12px; font-weight: 900; cursor: pointer; }
  button:hover, .action-panel a:hover { border-color: rgba(231,222,208,0.62); background: rgba(231,222,208,0.11); }
  .primary { background: #E7DED0; color: #111; }
  .art-shell { margin: 16px auto 12px; width: 190px; height: 240px; border: 1px solid rgba(201,205,211,0.14); border-radius: 12px; background: #030304; display: flex; align-items: center; justify-content: center; }
  .mock-card { width: 132px; height: 196px; border: 1px solid rgba(244,244,245,0.48); border-radius: 9px; background: linear-gradient(180deg, #eeeeef 0%, #fafafa 16%, #d7d7da 17%, #111827 18%, #050506 100%); padding: 7px; box-sizing: border-box; }
  .mock-card.raw-card { background: linear-gradient(180deg, rgba(255,255,255,0.86), #15171b 10%, #050506 100%); }
  .mock-label { height: 26px; border-radius: 5px; background: #f8fafc; color: #111827; font-size: 7px; font-weight: 900; display: flex; align-items: center; justify-content: space-between; padding: 0 5px; }
  .mock-art { height: 124px; margin-top: 7px; border: 1px solid rgba(255,255,255,0.26); border-radius: 6px; position: relative; overflow: hidden; background: radial-gradient(circle at 50% 22%, rgba(231,222,208,0.32), transparent 16%), linear-gradient(145deg, #8f1d2c, #111827 54%, #030304); }
  .raw-card .mock-art { height: 166px; margin-top: 0; background: radial-gradient(circle at 50% 22%, rgba(231,222,208,0.32), transparent 16%), linear-gradient(145deg, #0f766e, #111827 54%, #030304); }
  .mock-art span { position: absolute; left: 28px; top: 30px; width: 70px; height: 70px; border: 1px solid rgba(255,255,255,0.2); border-radius: 50%; }
  .mock-art strong { position: absolute; left: 52px; top: 42px; width: 34px; height: 74px; border-radius: 999px 999px 12px 12px; background: rgba(255,255,255,0.72); }
  .badge-row { display: flex; gap: 8px; flex-wrap: wrap; }
  .badge-row span { border: 1px solid rgba(231,222,208,0.28); border-radius: 999px; color: #E7DED0; padding: 5px 9px; font-size: 10px; font-weight: 900; }
  .preview-card h3 { margin: 12px 0 0; color: #fff; font-size: 22px; line-height: 26px; font-weight: 900; }
  .preview-card > strong { display: block; margin-top: 8px; color: #fff; font-size: 28px; line-height: 32px; }
  .action-circles { margin-top: 14px; display: flex; gap: 10px; }
  .action-circles span { width: 42px; height: 42px; border: 1px solid rgba(231,222,208,0.26); border-radius: 999px; background: rgba(8,8,10,0.82); display: inline-flex; align-items: center; justify-content: center; color: #E7DED0; font-weight: 900; }
  .view-card { margin-top: 14px; width: 100%; }
  .action-panel { display: grid; gap: 10px; }
  @media (max-width: 1100px) { .page-shell { width: calc(100vw - 32px); } .list-layout, .field-grid, .field-grid.three, .upload-grid { grid-template-columns: 1fr; } }
`;
