"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Header from "../components/Header";

const supportTopics = [
  "Order issue",
  "Payment or refund",
  "Seller payout",
  "Listing problem",
  "Dispute help",
  "Account issue",
  "Report a bug",
  "General question",
  "Other",
] as const;

type SupportTopic = (typeof supportTopics)[number];

type ProfileRow = {
  full_name: string | null;
  username: string | null;
};

export default function ContactSupportPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<SupportTopic | "">("");
  const [orderId, setOrderId] = useState("");
  const [listingId, setListingId] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Contact support auth session error:", sessionError);
      }

      if (!session?.user) {
        if (isMounted) {
          setIsSignedIn(false);
          setAccessToken("");
        }
        return;
      }

      let displayName = "";

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, username")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Contact support profile fetch error:", profileError);
      } else {
        const profile = profileData as ProfileRow | null;
        displayName = profile?.full_name || profile?.username || "";
      }

      if (isMounted) {
        setIsSignedIn(true);
        setAccessToken(session.access_token);
        setEmail(session.user.email || "");
        setName(displayName || session.user.email || "");
      }
    }

    loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  async function submitSupportTicket() {
    setStatus("");
    setError("");

    if (!topic) {
      setError("Choose a support topic.");
      return;
    }

    if (!message.trim()) {
      setError("Message is required.");
      return;
    }

    if (!isSignedIn && !name.trim()) {
      setError("Name is required.");
      return;
    }

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const headers: Record<string, string> = {
        "content-type": "application/json",
      };

      if (accessToken) {
        headers.authorization = `Bearer ${accessToken}`;
      }

      const response = await fetch("/api/support", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          topic,
          orderId: orderId.trim(),
          listingId: listingId.trim(),
          message: message.trim(),
        }),
      });
      const payload = (await response.json()) as { error?: string; ticketId?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Support request could not be submitted.");
      }

      setStatus(
        `Support request submitted. Ticket ${payload.ticketId?.slice(0, 8) || "created"}.`,
      );
      setTopic("");
      setOrderId("");
      setListingId("");
      setMessage("");
    } catch (submitError) {
      console.error("Contact support submit error:", submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Support request could not be submitted.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="support-page">
      <style>{pageStyles}</style>
      <div className="support-shell">
        <Header />

        <section className="support-heading">
          <span>GRAIL Support</span>
          <h1>Contact Support</h1>
          <p>
            Send GRAIL Collectibles LLC a support request for orders, payments,
            seller payouts, listings, disputes, account help, or bugs.
          </p>
        </section>

        <section className="support-layout">
          <div className="panel support-form-card">
            <div className="form-intro">
              <span>{isSignedIn ? "Signed-in request" : "Guest support request"}</span>
              <h2>Support form</h2>
              <p>
                Include order or listing IDs when available. Do not include full
                payment card numbers or private Stripe credentials.
              </p>
            </div>

            {status ? <p className="status-message">{status}</p> : null}
            {error ? <p className="error-message">{error}</p> : null}

            <div className="field-grid">
              <label>
                <span>Name</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                />
              </label>

              <label>
                <span>Email</span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  type="email"
                />
              </label>
            </div>

            <label>
              <span>Topic</span>
              <select
                value={topic}
                onChange={(event) => setTopic(event.target.value as SupportTopic | "")}
              >
                <option value="">Choose a topic</option>
                {supportTopics.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <div className="field-grid">
              <label>
                <span>Order ID optional</span>
                <input
                  value={orderId}
                  onChange={(event) => setOrderId(event.target.value)}
                  placeholder="Order UUID if available"
                />
              </label>

              <label>
                <span>Listing ID optional</span>
                <input
                  value={listingId}
                  onChange={(event) => setListingId(event.target.value)}
                  placeholder="Listing UUID if available"
                />
              </label>
            </div>

            <label>
              <span>Message</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Tell us what happened and what you need help with."
              />
            </label>

            <button type="button" disabled={isSubmitting} onClick={submitSupportTicket}>
              {isSubmitting ? "Submitting..." : "Submit Support Request"}
            </button>
          </div>

          <aside className="panel support-sidebar">
            <h2>Before you submit</h2>
            <div className="sidebar-list">
              <article>
                <span>Orders</span>
                <p>For shipping, delivery, refunds, and disputes, include your order ID.</p>
              </article>
              <article>
                <span>Listings</span>
                <p>For seller or listing problems, include the listing ID when possible.</p>
              </article>
              <article>
                <span>Disputes</span>
                <p>
                  If a dispute is active, upload evidence from Orders or Seller Dashboard
                  before contacting support.
                </p>
              </article>
            </div>
            <div className="quick-links">
              <Link href="/orders">Orders</Link>
              <Link href="/seller-dashboard">Seller Dashboard</Link>
              <Link href="/refund-dispute-policy">Refunds & Disputes</Link>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

const pageStyles = `
  .support-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at 50% -120px, rgba(201,205,211,0.08), transparent 32%),
      linear-gradient(180deg, #000 0%, #030304 58%, #000 100%);
    color: #fafafa;
    font-family: Arial, Helvetica, sans-serif;
  }

  .support-shell {
    width: min(100%, 1240px);
    margin: 0 auto;
    padding: 8px 24px 52px;
  }

  .support-heading {
    margin-top: 28px;
  }

  .support-heading span,
  .form-intro span,
  label span,
  .sidebar-list article span {
    color: #C9CDD3;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .support-heading h1 {
    margin: 8px 0 0;
    color: #fff;
    font-size: clamp(2.4rem, 5vw, 4.6rem);
    line-height: 1;
    font-weight: 900;
  }

  .support-heading p,
  .form-intro p,
  .support-sidebar p,
  .sidebar-list article p {
    color: #a1a1aa;
    font-size: 13px;
    line-height: 20px;
    font-weight: 800;
  }

  .support-layout {
    margin-top: 22px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 16px;
    align-items: start;
  }

  .panel {
    border: 1px solid #1d1d22;
    border-radius: 14px;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.006)),
      rgba(5,5,6,0.92);
    box-shadow: 0 18px 44px rgba(0,0,0,0.28);
  }

  .support-form-card,
  .support-sidebar {
    padding: 18px;
  }

  .form-intro h2,
  .support-sidebar h2 {
    margin: 6px 0 0;
    color: #fff;
    font-size: 22px;
    line-height: 27px;
    font-weight: 900;
  }

  .status-message,
  .error-message {
    margin: 16px 0 0;
    border-radius: 10px;
    padding: 10px;
    font-size: 12px;
    line-height: 17px;
    font-weight: 900;
  }

  .status-message {
    border: 1px solid rgba(52,211,153,0.24);
    background: rgba(52,211,153,0.07);
    color: #86efac;
  }

  .error-message {
    border: 1px solid rgba(248,113,113,0.28);
    background: rgba(248,113,113,0.08);
    color: #fca5a5;
  }

  .field-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  label {
    display: grid;
    gap: 7px;
    margin-top: 14px;
  }

  input,
  select,
  textarea {
    width: 100%;
    border: 1px solid #24242a;
    border-radius: 10px;
    background: #08080a;
    color: #fff;
    padding: 12px;
    box-sizing: border-box;
    font: inherit;
    font-size: 13px;
    font-weight: 800;
    outline: none;
  }

  select {
    min-height: 44px;
  }

  textarea {
    min-height: 150px;
    resize: vertical;
    line-height: 1.5;
  }

  .support-form-card > button {
    width: 100%;
    min-height: 46px;
    margin-top: 16px;
    border: 1px solid rgba(231,222,208,0.58);
    border-radius: 10px;
    background: #E7DED0;
    color: #111;
    padding: 0 14px;
    font-size: 13px;
    font-weight: 900;
    cursor: pointer;
  }

  .support-form-card > button:disabled {
    cursor: not-allowed;
    opacity: 0.58;
  }

  .sidebar-list {
    margin-top: 14px;
    display: grid;
    gap: 10px;
  }

  .sidebar-list article {
    border: 1px solid #202026;
    border-radius: 12px;
    background: rgba(8,8,10,0.76);
    padding: 12px;
  }

  .sidebar-list article p {
    margin: 6px 0 0;
  }

  .quick-links {
    margin-top: 14px;
    display: grid;
    gap: 8px;
  }

  .quick-links a {
    min-height: 40px;
    border: 1px solid rgba(231,222,208,0.24);
    border-radius: 10px;
    background: rgba(231,222,208,0.055);
    color: #fff;
    padding: 0 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    text-decoration: none;
    font-size: 12px;
    font-weight: 900;
  }

  .quick-links a:hover {
    border-color: rgba(231,222,208,0.58);
    background: rgba(231,222,208,0.1);
  }

  @media (max-width: 980px) {
    .support-layout,
    .field-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 620px) {
    .support-shell {
      padding: 8px 14px 42px;
    }
  }
`;
