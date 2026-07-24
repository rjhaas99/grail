"use client";

import GrailPassBadge from "../components/GrailPassBadge";
import PageShell from "../components/PageShell";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  grailPassMembershipCatalog,
  noGrailPassMembership,
  normalizeGrailPassMembership,
  type GrailPassMembership,
} from "../lib/grailPass";
import {
  grailPassPlanList,
  type GrailPassPlanType,
} from "../lib/grailPassPlans";

const previewMembership = normalizeGrailPassMembership(grailPassMembershipCatalog.annual);

type PassPlan = {
  type: GrailPassPlanType;
  displayName: string;
  amount: number;
  amountCents: number;
  currency: string;
  interval: "month" | "year";
  intervalLabel: string;
};

type PassSubscription = {
  plan: GrailPassPlanType;
  status: GrailPassMembership["status"];
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  latestInvoiceStatus: string | null;
} | null;

type PassActions = {
  canCancel: boolean;
  canResume: boolean;
  canUpgrade: boolean;
};

type RewardBoostConfig = {
  configured: boolean;
  enabled: boolean;
  buyerBonusPercent: number | null;
  sellerBonusPercent: number | null;
  message: string;
};

type PassStatusResponse = {
  plans: PassPlan[];
  membership: GrailPassMembership;
  subscription: PassSubscription;
  actions: PassActions;
  rewardBoost?: RewardBoostConfig;
  error?: string;
};

const fallbackPlans: PassPlan[] = grailPassPlanList.map((plan) => ({
  type: plan.type,
  displayName: plan.displayName,
  amount: plan.amountCents / 100,
  amountCents: plan.amountCents,
  currency: plan.currency,
  interval: plan.interval,
  intervalLabel: plan.intervalLabel,
}));

function formatCurrency(value: number | null | undefined, options?: Intl.NumberFormatOptions) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Unavailable";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

function formatPercent(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Configuration pending";
  }

  return `${Math.round(value * 100) / 100}%`;
}

function formatPlanPrice(plan: PassPlan) {
  return `${formatCurrency(plan.amount)}/${plan.intervalLabel}`;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Not scheduled";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatStatus(value?: string | null) {
  if (!value || value === "none") {
    return "Not active";
  }

  if (value === "past_due") {
    return "Past due";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getTenureLabel(startedAt?: string | null) {
  if (!startedAt) {
    return "New member";
  }

  const months = Math.max(
    0,
    Math.floor((Date.now() - new Date(startedAt).getTime()) / (1000 * 60 * 60 * 24 * 30.4375)),
  );

  if (months >= 24) return "Multi-year member";
  if (months >= 12) return "1-year member";
  if (months >= 6) return "6-month member";
  if (months >= 3) return "3-month member";
  return "New member";
}

function getAnnualPlanMath(plans: PassPlan[]) {
  const monthly = plans.find((plan) => plan.type === "monthly");
  const annual = plans.find((plan) => plan.type === "annual");

  if (!monthly || !annual) {
    return {
      effectiveMonthly: null,
      annualSavings: null,
    };
  }

  const effectiveMonthly = annual.amount / 12;
  const annualSavings = monthly.amount * 12 - annual.amount;

  return {
    effectiveMonthly,
    annualSavings: Math.max(0, annualSavings),
  };
}

async function getGrailPassAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    return session.access_token;
  }

  const {
    data: { session: refreshedSession },
  } = await supabase.auth.refreshSession();

  return refreshedSession?.access_token || "";
}

export default function GrailPassPage() {
  const [data, setData] = useState<PassStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [actionState, setActionState] = useState("");
  const currentMembership = useMemo(
    () => normalizeGrailPassMembership(data?.membership || noGrailPassMembership),
    [data?.membership],
  );
  const activeMembership =
    currentMembership.status === "active" || currentMembership.status === "trialing";
  const displayedMembership =
    currentMembership.status === "none" ? previewMembership : currentMembership;
  const subscription = data?.subscription || null;
  const plans = data?.plans?.length ? data.plans : fallbackPlans;
  const actions = data?.actions || {
    canCancel: false,
    canResume: false,
    canUpgrade: false,
  };
  const monthlyPlan = plans.find((plan) => plan.type === "monthly");
  const annualPlan = plans.find((plan) => plan.type === "annual");
  const planMath = getAnnualPlanMath(plans);
  const rewardBoost = data?.rewardBoost || null;
  const buyerBonus = rewardBoost?.configured && rewardBoost.enabled
    ? rewardBoost.buyerBonusPercent
    : null;
  const sellerBonus = rewardBoost?.configured && rewardBoost.enabled
    ? rewardBoost.sellerBonusPercent
    : null;
  const renewalLabel = subscription?.cancelAtPeriodEnd
    ? `Access through ${formatDate(subscription.currentPeriodEnd)}`
    : subscription?.currentPeriodEnd
      ? `Renews ${formatDate(subscription.currentPeriodEnd)}`
      : "Renewal date unavailable";
  const tenureLabel = getTenureLabel(
    subscription?.currentPeriodStart || currentMembership.startedAt,
  );

  async function loadPassStatus(accessToken: string, syncSessionId?: string | null) {
    if (syncSessionId) {
      const syncResponse = await fetch("/api/grail-pass/subscription/sync", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ sessionId: syncSessionId }),
      });

      if (!syncResponse.ok) {
        const payload = (await syncResponse.json().catch(() => ({}))) as {
          error?: string;
        };
        setStatusMessage(payload.error || "Checkout is still synchronizing.");
      } else {
        setStatusMessage("GRAIL Pass membership synchronized.");
      }
    }

    const response = await fetch("/api/grail-pass/subscription", {
      credentials: "same-origin",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });
    const payload = (await response.json()) as PassStatusResponse;

    if (!response.ok) {
      throw new Error(payload.error || "GRAIL Pass could not be loaded.");
    }

    setData(payload);
  }

  useEffect(() => {
    let isMounted = true;

    async function initialize() {
      setIsLoading(true);
      const accessToken = await getGrailPassAccessToken();

      if (!accessToken) {
        if (isMounted) {
          setIsSignedIn(false);
          setData(null);
          setStatusMessage("Sign in to subscribe to GRAIL Pass.");
          setIsLoading(false);
        }
        return;
      }

      const params =
        typeof window === "undefined"
          ? new URLSearchParams()
          : new URLSearchParams(window.location.search);
      const checkoutState = params.get("checkout");
      const sessionId = params.get("session_id");

      try {
        if (isMounted) {
          setIsSignedIn(true);
        }

        await loadPassStatus(
          accessToken,
          checkoutState === "success" ? sessionId : null,
        );

        if (!isMounted) {
          return;
        }

        if (checkoutState === "canceled") {
          setStatusMessage("GRAIL Pass checkout was canceled.");
        }
      } catch (error) {
        console.error("GRAIL Pass status load error:", error);

        if (isMounted) {
          setStatusMessage(
            error instanceof Error ? error.message : "GRAIL Pass could not be loaded.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initialize();

    return () => {
      isMounted = false;
    };
  }, []);

  async function runPassAction(
    action: (accessToken: string) => Promise<Response>,
    successMessage: string,
  ) {
    setActionState("Working...");
    const accessToken = await getGrailPassAccessToken();

    if (!accessToken) {
      setIsSignedIn(false);
      setActionState("Sign in to manage GRAIL Pass.");
      return;
    }

    try {
      setIsSignedIn(true);
      const response = await action(accessToken);
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        url?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "GRAIL Pass action failed.");
      }

      if (payload.url) {
        window.location.assign(payload.url);
        return;
      }

      await loadPassStatus(accessToken);
      setActionState(successMessage);
    } catch (error) {
      console.error("GRAIL Pass action error:", error);
      setActionState(
        error instanceof Error ? error.message : "GRAIL Pass action failed.",
      );
    }
  }

  async function subscribe(plan: GrailPassPlanType) {
    await runPassAction(
      async (accessToken) =>
        fetch("/api/grail-pass/checkout", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ plan }),
        }),
      "Redirecting to Stripe Checkout.",
    );
  }

  async function upgradeToAnnual() {
    await runPassAction(
      async (accessToken) =>
        fetch("/api/grail-pass/subscription/upgrade", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ plan: "annual" }),
        }),
      "GRAIL Pass upgraded to Annual.",
    );
  }

  async function cancelAutoRenew() {
    await runPassAction(
      async (accessToken) =>
        fetch("/api/grail-pass/subscription/cancel", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        }),
      "GRAIL Pass auto-renew canceled.",
    );
  }

  async function resumeAutoRenew() {
    await runPassAction(
      async (accessToken) =>
        fetch("/api/grail-pass/subscription/resume", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        }),
      "GRAIL Pass auto-renew resumed.",
    );
  }

  async function openBillingPortal() {
    await runPassAction(
      async (accessToken) =>
        fetch("/api/grail-pass/billing-portal", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        }),
      "Opening billing portal.",
    );
  }

  return (
    <PageShell
      className="grail-pass-page"
      shellClassName="grail-pass-app-shell"
      shellStyle={{ padding: "8px 0 58px" }}
      styles={pageStyles}
    >
      <section className="pass-hero" aria-labelledby="grail-pass-title">
        <div className="pass-hero-copy">
          <p className="pass-kicker">Premium Collector Membership</p>
          <h1 id="grail-pass-title">GRAIL PASS</h1>
          <p className="pass-value">
            More rewards. Better events. A premium collector identity.
          </p>
          <p className="pass-subvalue">
            Earn more when you buy and sell, unlock elevated collector experiences,
            and build a membership identity that grows with you.
          </p>
          <div className="pass-hero-actions">
            {activeMembership ? (
              <button type="button" onClick={openBillingPortal}>
                Manage Membership
              </button>
            ) : isSignedIn ? (
              <button type="button" onClick={() => subscribe("annual")}>
                Join GRAIL Pass
              </button>
            ) : (
              <a href="/login">Join GRAIL Pass</a>
            )}
            <span>
              {annualPlan && monthlyPlan && planMath.annualSavings !== null
                ? `${formatCurrency(annualPlan.amount)}/year · Save ${formatCurrency(planMath.annualSavings)}`
                : "Monthly and Annual plans"}
            </span>
          </div>
        </div>

        <aside className="membership-card" aria-label="GRAIL Pass membership card">
          <div className="membership-card-top">
            <span>{activeMembership ? "Member" : "Preview"}</span>
            <GrailPassBadge membership={displayedMembership} />
          </div>
          <div className="membership-mark" aria-hidden="true">GP</div>
          <dl>
            <div>
              <dt>Status</dt>
              <dd>{isLoading ? "Checking" : formatStatus(currentMembership.status)}</dd>
            </div>
            <div>
              <dt>Plan</dt>
              <dd>{subscription?.plan === "annual" ? "Annual" : subscription?.plan === "monthly" ? "Monthly" : "Monthly or Annual"}</dd>
            </div>
            <div>
              <dt>Tenure</dt>
              <dd>{activeMembership ? tenureLabel : "Starts after joining"}</dd>
            </div>
          </dl>
        </aside>
      </section>

      {(statusMessage || actionState) ? (
        <p className="pass-action-status">{actionState || statusMessage}</p>
      ) : null}

      <section className="pass-section reward-section" aria-labelledby="reward-boost-title">
        <div>
          <p className="pass-kicker">Reward Boost</p>
          <h2 id="reward-boost-title">Your rank reward, plus your Pass bonus.</h2>
          <p>
            GRAIL Pass adds reward earnings on completed marketplace activity.
            Seller fee progression remains rank-based and unchanged.
          </p>
        </div>
        <div className="reward-equation-grid">
          <article>
            <span>Buyer Reward</span>
            <strong>{formatPercent(buyerBonus)}</strong>
            <p>Additional buyer reward percentage when Pass rewards are configured and membership is active.</p>
          </article>
          <article>
            <span>Seller Reward</span>
            <strong>{formatPercent(sellerBonus)}</strong>
            <p>Additional seller reward percentage. This is not a seller-fee discount.</p>
          </article>
          <article className="equation-card">
            <span>Calculation</span>
            <strong>Rank + Pass = Total</strong>
            <p>Processed through the existing Rewards Engine and Wallet ledger with idempotency.</p>
          </article>
        </div>
        <p className="configuration-note">
          {rewardBoost?.message || "Reward boost configuration loads after sign-in."}
        </p>
      </section>

      <section className="pass-section split-section" aria-labelledby="events-title">
        <div>
          <p className="pass-kicker">Better Events</p>
          <h2 id="events-title">Events stay configurable and fair.</h2>
          <p>
            GRAIL Pass is designed to extend the existing Rewards Engine and
            Collector Moments framework for selected member events. No separate
            event engine has been created.
          </p>
        </div>
        <ul className="benefit-list">
          <li><strong>Included now</strong><span>Pass-aware reward configuration framework.</span></li>
          <li><strong>Coming later</strong><span>Member collecting events, seasonal challenges, Double XP weekends, and Pass-only Collector Moments when enabled.</span></li>
          <li><strong>Always fair</strong><span>Events do not buy listing placement or promoted search visibility.</span></li>
        </ul>
      </section>

      <section className="pass-section split-section" aria-labelledby="identity-title">
        <div>
          <p className="pass-kicker">Collector Identity</p>
          <h2 id="identity-title">A membership identity that grows with tenure.</h2>
          <p>
            GRAIL Pass unlocks premium self-expression without changing where
            listings appear. Identity benefits reuse Collector Identity,
            Collection Studio, and existing presentation systems.
          </p>
        </div>
        <div className="tenure-grid">
          {["New member", "3-month member", "6-month member", "1-year member", "Multi-year member"].map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>

      <section className="pass-section split-section" aria-labelledby="convenience-title">
        <div>
          <p className="pass-kicker">Convenience</p>
          <h2 id="convenience-title">Helpful tools, not marketplace advantage.</h2>
          <p>
            Convenience benefits may include early access to tools, priority
            support, saved listing templates, collection presets, expanded
            watchlist organization, and member shipping promotions when explicitly enabled.
          </p>
        </div>
        <ul className="benefit-list">
          <li><strong>Included now</strong><span>Live subscription management and membership recognition.</span></li>
          <li><strong>Coming later</strong><span>Premium profile frames, collection themes, member layouts, and early-access tools.</span></li>
          <li><strong>Not included</strong><span>No paid listing boosts, preferred placement, or paywalled seller analytics.</span></li>
        </ul>
      </section>

      <section className="pass-section plans-section" aria-labelledby="plans-title">
        <div className="section-heading">
          <p className="pass-kicker">Plans</p>
          <h2 id="plans-title">Monthly vs Annual</h2>
          <p>Both plans receive the same active benefits unless centralized configuration changes.</p>
        </div>
        <div className="plan-grid">
          {plans.map((plan) => {
            const isActivePlan = subscription?.plan === plan.type;

            return (
              <article key={plan.type} className={isActivePlan ? "active-plan" : ""}>
                <span>{plan.type === "annual" ? "Best Value" : "Flexible"}</span>
                <h3>{plan.displayName}</h3>
                <strong>{formatPlanPrice(plan)}</strong>
                {plan.type === "annual" && planMath.effectiveMonthly !== null ? (
                  <p>
                    Effective {formatCurrency(planMath.effectiveMonthly)}/month
                    {planMath.annualSavings ? ` · Save ${formatCurrency(planMath.annualSavings)}/year` : ""}
                  </p>
                ) : (
                  <p>Month-to-month membership billing.</p>
                )}
                {activeMembership ? (
                  isActivePlan ? <em>Current plan</em> : null
                ) : isSignedIn ? (
                  <button type="button" onClick={() => subscribe(plan.type)}>
                    Join {plan.type === "annual" ? "Annual" : "Monthly"}
                  </button>
                ) : (
                  <a href="/login">Sign In To Join</a>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="pass-section current-member-section" aria-labelledby="current-membership-title">
        <div className="section-heading">
          <p className="pass-kicker">Current Membership</p>
          <h2 id="current-membership-title">
            {activeMembership ? "Your active Pass" : "Membership status"}
          </h2>
        </div>
        <div className="member-grid">
          <InfoTile label="Status" value={isLoading ? "Loading" : formatStatus(currentMembership.status)} />
          <InfoTile label="Plan" value={subscription?.plan ? subscription.plan === "annual" ? "Annual" : "Monthly" : "No active plan"} />
          <InfoTile label="Renewal" value={isSignedIn ? renewalLabel : "Sign in to view renewal information."} />
          <InfoTile label="Buyer Bonus" value={formatPercent(buyerBonus)} />
          <InfoTile label="Seller Bonus" value={formatPercent(sellerBonus)} />
          <InfoTile label="Tenure" value={activeMembership ? tenureLabel : "No active tenure"} />
        </div>
        {isSignedIn ? (
          <div className="member-actions">
            {actions.canUpgrade ? (
              <button type="button" onClick={upgradeToAnnual}>Upgrade To Annual</button>
            ) : null}
            {actions.canCancel ? (
              <button type="button" onClick={cancelAutoRenew}>Cancel Auto-Renew</button>
            ) : null}
            {actions.canResume ? (
              <button type="button" onClick={resumeAutoRenew}>Resume Membership</button>
            ) : null}
            {subscription ? (
              <button type="button" onClick={openBillingPortal}>Manage Billing</button>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="pass-section now-later-section" aria-labelledby="now-later-title">
        <div className="section-heading">
          <p className="pass-kicker">Benefit Status</p>
          <h2 id="now-later-title">Included now vs coming later</h2>
        </div>
        <div className="two-column-list">
          <article>
            <h3>Included now</h3>
            <ul>
              <li>Monthly and Annual Stripe Billing subscriptions</li>
              <li>Membership status, renewal, cancellation, and billing management</li>
              <li>GRAIL Pass badge and membership recognition</li>
              <li>Configured reward boost framework</li>
            </ul>
          </article>
          <article>
            <h3>Coming later</h3>
            <ul>
              <li>Member collecting events when enabled</li>
              <li>Premium identity frames and themes</li>
              <li>Collection layout options</li>
              <li>Convenience tools that do not affect listing placement</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="pass-section faq-section" aria-labelledby="faq-title">
        <div className="section-heading">
          <p className="pass-kicker">FAQ</p>
          <h2 id="faq-title">Fair-marketplace answers</h2>
        </div>
        <div className="faq-grid">
          {[
            ["How does the buyer reward bonus work?", "When configured, active members receive an additional buyer reward percentage on eligible completed purchases through the existing Rewards Engine."],
            ["How does the seller reward bonus work?", "When configured, active members receive an additional seller reward percentage on eligible completed sales. The bonus is wallet reward earning, not a payout fee change."],
            ["Does GRAIL Pass change seller fees?", "No. Marketplace seller fee progression remains rank-based through the existing Rewards Engine."],
            ["Do listings receive preferred placement?", "No. GRAIL Pass does not buy better listing placement, promoted search placement, or paid visibility boosts."],
            ["Do seller analytics require GRAIL Pass?", "No. All sellers receive their own listing analytics. Private listing performance is never paywalled behind GRAIL Pass."],
            ["What are enhanced events?", "Future Pass-aware collecting events that reuse the Rewards Engine and Collector Moments framework. They remain inactive unless explicitly enabled."],
            ["What happens after cancellation?", "Access remains through the paid period when auto-renew is canceled, then membership benefits stop when the subscription is no longer active."],
            ["Do annual members receive the same benefits?", "Yes. Monthly and Annual plans receive the same active benefits unless centralized configuration changes."],
            ["How is billing managed?", "Billing is handled through Stripe. Active members can open the billing portal from this page or Billing & Payouts."],
          ].map(([question, answer]) => (
            <article key={question}>
              <h3>{question}</h3>
              <p>{answer}</p>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <article className="info-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

const pageStyles = `
  .grail-pass-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at 18% -10%, rgba(231,222,208,0.12), transparent 30%),
      radial-gradient(circle at 86% 6%, rgba(185,146,74,0.10), transparent 26%),
      linear-gradient(180deg, #040405 0%, #0A0A0C 48%, #040405 100%);
    color: #F5F1E8;
  }

  .pass-hero,
  .pass-section {
    width: 100%;
    margin: 0 auto;
  }

  .pass-hero {
    display: grid;
    grid-template-columns: minmax(0, 1.08fr) minmax(300px, 0.58fr);
    gap: 24px;
    align-items: stretch;
    padding: 10px 0 28px;
  }

  .pass-hero-copy,
  .membership-card,
  .pass-section,
  .plan-grid article,
  .info-tile,
  .two-column-list article,
  .faq-grid article,
  .reward-equation-grid article {
    border: 1px solid rgba(231,222,208,0.15);
    background:
      linear-gradient(135deg, rgba(231,222,208,0.08), rgba(255,255,255,0.018)),
      rgba(8,8,10,0.88);
    box-shadow:
      0 24px 70px rgba(0,0,0,0.28),
      inset 0 1px 0 rgba(255,255,255,0.05);
  }

  .pass-hero-copy {
    border-radius: 24px;
    min-height: 520px;
    padding: clamp(30px, 6vw, 70px);
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }

  .pass-kicker {
    margin: 0 0 14px;
    color: #B9924A;
    font-size: 11px;
    line-height: 15px;
    font-weight: 900;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .pass-hero h1 {
    margin: 0;
    color: #FFFFFF;
    font-size: clamp(54px, 9vw, 118px);
    line-height: 0.9;
    font-weight: 950;
    letter-spacing: -0.07em;
  }

  .pass-value {
    max-width: 720px;
    margin: 26px 0 0;
    color: #F5F1E8;
    font-size: clamp(24px, 3vw, 42px);
    line-height: 1.08;
    font-weight: 900;
    letter-spacing: -0.04em;
  }

  .pass-subvalue,
  .pass-section p,
  .benefit-list span,
  .two-column-list li,
  .faq-grid p,
  .configuration-note {
    color: #BDB7AE;
    font-size: 15px;
    line-height: 1.65;
    font-weight: 650;
  }

  .pass-subvalue {
    max-width: 660px;
    margin: 18px 0 0;
  }

  .pass-hero-actions,
  .member-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    margin-top: 34px;
  }

  .pass-hero-actions a,
  .pass-hero-actions button,
  .member-actions button,
  .plan-grid a,
  .plan-grid button {
    border: 1px solid rgba(231,222,208,0.76);
    border-radius: 999px;
    background: #F5F1E8;
    color: #050506;
    padding: 12px 18px;
    font-size: 12px;
    line-height: 15px;
    font-weight: 950;
    text-decoration: none;
    text-transform: uppercase;
    cursor: pointer;
  }

  .pass-hero-actions span {
    color: #C9CDD3;
    font-size: 13px;
    font-weight: 800;
  }

  .membership-card {
    border-radius: 24px;
    padding: 24px;
    min-height: 520px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .membership-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .membership-card-top > span,
  .reward-equation-grid span,
  .plan-grid article > span,
  .info-tile span {
    color: #B9924A;
    font-size: 10px;
    line-height: 13px;
    font-weight: 900;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .membership-mark {
    width: 136px;
    height: 136px;
    border: 1px solid rgba(231,222,208,0.26);
    border-radius: 999px;
    display: grid;
    place-items: center;
    color: #E7DED0;
    font-size: 38px;
    font-weight: 950;
    background:
      radial-gradient(circle at 50% 24%, rgba(255,255,255,0.18), transparent 46%),
      linear-gradient(135deg, rgba(231,222,208,0.16), rgba(185,146,74,0.08));
  }

  .membership-card dl {
    display: grid;
    gap: 12px;
    margin: 0;
  }

  .membership-card dl div {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    border-top: 1px solid rgba(231,222,208,0.12);
    padding-top: 12px;
  }

  .membership-card dt {
    color: #918B84;
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .membership-card dd {
    margin: 0;
    color: #FFFFFF;
    font-size: 13px;
    font-weight: 900;
    text-align: right;
  }

  .pass-action-status {
    border: 1px solid rgba(185,146,74,0.28);
    border-radius: 16px;
    background: rgba(185,146,74,0.08);
    color: #E7DED0;
    padding: 14px 16px;
    margin: 0 0 18px;
    font-weight: 800;
  }

  .pass-section {
    border-radius: 24px;
    padding: clamp(24px, 4vw, 42px);
    margin-top: 18px;
  }

  .pass-section h2 {
    margin: 0;
    color: #FFFFFF;
    font-size: clamp(30px, 4.5vw, 60px);
    line-height: 0.98;
    font-weight: 950;
    letter-spacing: -0.055em;
  }

  .reward-section {
    display: grid;
    grid-template-columns: minmax(0, 0.82fr) minmax(0, 1.18fr);
    gap: 24px;
  }

  .reward-equation-grid,
  .plan-grid,
  .member-grid,
  .two-column-list,
  .faq-grid {
    display: grid;
    gap: 14px;
  }

  .reward-equation-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .reward-equation-grid article,
  .plan-grid article,
  .info-tile,
  .two-column-list article,
  .faq-grid article {
    border-radius: 18px;
    padding: 18px;
  }

  .reward-equation-grid strong,
  .info-tile strong,
  .plan-grid strong {
    display: block;
    color: #FFFFFF;
    font-size: clamp(24px, 3vw, 38px);
    line-height: 1;
    font-weight: 950;
    letter-spacing: -0.04em;
    margin-top: 10px;
  }

  .configuration-note {
    grid-column: 1 / -1;
    margin: 0;
  }

  .split-section {
    display: grid;
    grid-template-columns: minmax(0, 0.8fr) minmax(0, 1fr);
    gap: 28px;
    align-items: start;
  }

  .benefit-list {
    display: grid;
    gap: 12px;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .benefit-list li {
    border-top: 1px solid rgba(231,222,208,0.12);
    padding-top: 14px;
  }

  .benefit-list strong {
    display: block;
    color: #FFFFFF;
    font-size: 18px;
    margin-bottom: 4px;
  }

  .tenure-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 10px;
  }

  .tenure-grid span {
    border: 1px solid rgba(231,222,208,0.14);
    border-radius: 999px;
    padding: 10px 12px;
    color: #E7DED0;
    text-align: center;
    font-size: 12px;
    font-weight: 900;
  }

  .section-heading {
    max-width: 760px;
    margin-bottom: 22px;
  }

  .plan-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .plan-grid article.active-plan {
    border-color: rgba(185,146,74,0.54);
  }

  .plan-grid h3,
  .two-column-list h3,
  .faq-grid h3 {
    margin: 10px 0 0;
    color: #FFFFFF;
    font-size: 22px;
    line-height: 1.1;
  }

  .plan-grid em {
    display: inline-block;
    border: 1px solid rgba(74,222,128,0.28);
    border-radius: 999px;
    color: #BBF7D0;
    padding: 8px 10px;
    font-size: 12px;
    font-style: normal;
    font-weight: 900;
  }

  .member-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .two-column-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .two-column-list ul {
    margin: 14px 0 0;
    padding-left: 18px;
  }

  .faq-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .faq-grid h3 {
    font-size: 18px;
  }

  @media (max-width: 980px) {
    .pass-hero,
    .reward-section,
    .split-section {
      grid-template-columns: 1fr;
    }

    .membership-card {
      min-height: auto;
      gap: 34px;
    }

    .reward-equation-grid,
    .member-grid,
    .faq-grid,
    .tenure-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 680px) {
    .pass-hero-copy {
      min-height: 420px;
    }

    .reward-equation-grid,
    .plan-grid,
    .member-grid,
    .two-column-list,
    .faq-grid,
    .tenure-grid {
      grid-template-columns: 1fr;
    }

    .pass-hero-actions,
    .member-actions {
      align-items: stretch;
      flex-direction: column;
    }

    .pass-hero-actions a,
    .pass-hero-actions button,
    .member-actions button,
    .plan-grid a,
    .plan-grid button {
      width: 100%;
      text-align: center;
    }
  }
`;
