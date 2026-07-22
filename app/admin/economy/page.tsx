"use client";

import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../AdminLayout";
import Header from "../../components/Header";
import { supabase } from "../../../lib/supabase";
import {
  defaultShippingRateSettings,
  type ShippingRateSettings,
} from "../../lib/shippingProfiles";

const adminEmails = ["ryanjhaas99@gmail.com"];

type MarketplaceSwitches = {
  marketplaceEnabled: boolean;
  sellerRewardsEnabled: boolean;
  buyerRewardsEnabled: boolean;
  walletRewardsEnabled: boolean;
  xpEnabled: boolean;
  achievementsEnabled: boolean;
  notificationsEnabled: boolean;
  rewardEventsEnabled: boolean;
};

type MarketplaceEvent = {
  id: string;
  eventName: string;
  enabled: boolean;
  scheduled: boolean;
  startAt: string | null;
  endAt: string | null;
  timeZone: string;
  buyerMultiplier: number;
  sellerMultiplier: number;
  xpMultiplier: number;
  walletMultiplier: number;
  treasureMultiplier: number;
  challengeMultiplier: number;
  notificationTitle: string | null;
  notificationBody: string | null;
  bannerTitle: string | null;
  bannerSubtitle: string | null;
  bannerButtonLabel: string | null;
  bannerButtonHref: string | null;
  bannerBackground: string | null;
  bannerPriority: number;
  bannerDismissible: boolean;
  bannerCountdownEnabled: boolean;
  priority: number;
  allowStacking: boolean;
  status?: string;
};

type CurrentEconomy = {
  rankName: string;
  sellerFeePercent: number;
  buyerRewardPercent: number;
  sellerRewardPercent: number;
  buyerMultiplier: number;
  sellerMultiplier: number;
  walletMultiplier: number;
  xpMultiplier: number;
};

type MarketplaceStatus = {
  marketplace: string;
  currentEconomy: string;
  currentActiveEvent: string;
  nextScheduledEvent: string;
  currentMarketplaceState: string;
  rewardTierCount: number;
  userCount: number;
  walletLiability: number;
  gmv: number;
  platformRevenue: number;
  walletIssuedToday: number;
  walletIssuedThisMonth: number;
  walletIssuedLifetime: number;
  averageReward: number;
  largestReward: number;
  rewardCost: number;
  rewardCostByTier: Array<{
    tier: string;
    amount: number;
  }>;
};

type ControlCenterResponse = {
  marketplaceStatus?: MarketplaceStatus;
  switches?: MarketplaceSwitches;
  events?: MarketplaceEvent[];
  shippingRates?: ShippingRateSettings;
  currentEvent?: MarketplaceEvent | null;
  upcomingEvent?: MarketplaceEvent | null;
  currentEconomy?: CurrentEconomy | null;
  error?: string;
  message?: string;
};

const emptySwitches: MarketplaceSwitches = {
  marketplaceEnabled: true,
  sellerRewardsEnabled: true,
  buyerRewardsEnabled: true,
  walletRewardsEnabled: true,
  xpEnabled: true,
  achievementsEnabled: true,
  notificationsEnabled: true,
  rewardEventsEnabled: true,
};

const emptyEvent: Partial<MarketplaceEvent> = {
  eventName: "",
  enabled: false,
  scheduled: true,
  startAt: "",
  endAt: "",
  timeZone: "America/New_York",
  buyerMultiplier: 1,
  sellerMultiplier: 1,
  xpMultiplier: 1,
  walletMultiplier: 1,
  treasureMultiplier: 1,
  challengeMultiplier: 1,
  notificationTitle: "",
  notificationBody: "",
  bannerTitle: "",
  bannerSubtitle: "",
  bannerButtonLabel: "Browse Cards",
  bannerButtonHref: "/browse",
  bannerBackground: "platinum",
  bannerPriority: 0,
  bannerDismissible: true,
  bannerCountdownEnabled: true,
  priority: 0,
  allowStacking: false,
};

const eventTemplates: Array<Partial<MarketplaceEvent> & { label: string }> = [
  { label: "Christmas", eventName: "Christmas", buyerMultiplier: 2, sellerMultiplier: 2, xpMultiplier: 2, walletMultiplier: 2, treasureMultiplier: 1, challengeMultiplier: 1, priority: 40 },
  { label: "Black Friday", eventName: "Black Friday", buyerMultiplier: 2, sellerMultiplier: 1.5, xpMultiplier: 1.5, walletMultiplier: 2, treasureMultiplier: 1, challengeMultiplier: 1, priority: 50 },
  { label: "Opening Day", eventName: "Opening Day", buyerMultiplier: 1.5, sellerMultiplier: 1.5, xpMultiplier: 2, walletMultiplier: 1, treasureMultiplier: 1, challengeMultiplier: 1, priority: 30 },
  { label: "National Card Show", eventName: "National Card Show", buyerMultiplier: 1.25, sellerMultiplier: 1.25, xpMultiplier: 1.5, walletMultiplier: 1, treasureMultiplier: 1, challengeMultiplier: 1, priority: 35 },
  { label: "Summer Event", eventName: "Summer Event", buyerMultiplier: 1.25, sellerMultiplier: 1.25, xpMultiplier: 1.25, walletMultiplier: 1.25, treasureMultiplier: 1, challengeMultiplier: 1, priority: 20 },
  { label: "Holiday Event", eventName: "Holiday Event", buyerMultiplier: 1.5, sellerMultiplier: 1.5, xpMultiplier: 2, walletMultiplier: 2, treasureMultiplier: 1, challengeMultiplier: 1, priority: 35 },
  { label: "Double XP Weekend", eventName: "Double XP Weekend", buyerMultiplier: 1, sellerMultiplier: 1, xpMultiplier: 2, walletMultiplier: 1, treasureMultiplier: 1, challengeMultiplier: 1, priority: 25 },
  { label: "Double Wallet Weekend", eventName: "Double Wallet Weekend", buyerMultiplier: 1, sellerMultiplier: 1, xpMultiplier: 1, walletMultiplier: 2, treasureMultiplier: 1, challengeMultiplier: 1, priority: 25 },
  { label: "Buyer Bonus Weekend", eventName: "Buyer Bonus Weekend", buyerMultiplier: 2, sellerMultiplier: 1, xpMultiplier: 1, walletMultiplier: 1, treasureMultiplier: 1, challengeMultiplier: 1, priority: 25 },
  { label: "Seller Bonus Weekend", eventName: "Seller Bonus Weekend", buyerMultiplier: 1, sellerMultiplier: 2, xpMultiplier: 1, walletMultiplier: 1, treasureMultiplier: 1, challengeMultiplier: 1, priority: 25 },
  { label: "Referral Weekend", eventName: "Referral Weekend", buyerMultiplier: 1, sellerMultiplier: 1, xpMultiplier: 1.5, walletMultiplier: 1, treasureMultiplier: 1, challengeMultiplier: 1, priority: 20 },
  { label: "Treasure Weekend", eventName: "Treasure Weekend", buyerMultiplier: 1, sellerMultiplier: 1, xpMultiplier: 1, walletMultiplier: 1, treasureMultiplier: 2, challengeMultiplier: 1, priority: 25 },
];

const switchLabels: Array<{ key: keyof MarketplaceSwitches; label: string }> = [
  { key: "marketplaceEnabled", label: "Marketplace Enabled" },
  { key: "sellerRewardsEnabled", label: "Seller Rewards Enabled" },
  { key: "buyerRewardsEnabled", label: "Buyer Rewards Enabled" },
  { key: "walletRewardsEnabled", label: "Wallet Rewards Enabled" },
  { key: "xpEnabled", label: "XP Enabled" },
  { key: "achievementsEnabled", label: "Achievements Enabled" },
  { key: "notificationsEnabled", label: "Notifications Enabled" },
  { key: "rewardEventsEnabled", label: "Reward Events Enabled" },
];

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatPercent(value?: number | null) {
  return value === null || value === undefined ? "Pending" : `${Number(value).toFixed(2)}%`;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function toDateTimeInput(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 16);
}

function getCountdown(value?: string | null) {
  if (!value) {
    return "Not scheduled";
  }

  const remaining = new Date(value).getTime() - Date.now();

  if (remaining <= 0) {
    return "Now";
  }

  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);

  return days > 0 ? `${days}d ${hours}h` : `${Math.max(hours, 1)}h`;
}

function multiplyPercent(value: number | undefined, multiplier: number | undefined) {
  return Math.round(Number(value || 0) * Number(multiplier || 1) * 100) / 100;
}

export default function AdminEconomyPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [status, setStatus] = useState("");
  const [marketplaceStatus, setMarketplaceStatus] = useState<MarketplaceStatus | null>(null);
  const [switches, setSwitches] = useState<MarketplaceSwitches>(emptySwitches);
  const [events, setEvents] = useState<MarketplaceEvent[]>([]);
  const [currentEvent, setCurrentEvent] = useState<MarketplaceEvent | null>(null);
  const [upcomingEvent, setUpcomingEvent] = useState<MarketplaceEvent | null>(null);
  const [currentEconomy, setCurrentEconomy] = useState<CurrentEconomy | null>(null);
  const [shippingRates, setShippingRates] = useState<ShippingRateSettings>(
    defaultShippingRateSettings,
  );
  const [eventDraft, setEventDraft] = useState<Partial<MarketplaceEvent>>(emptyEvent);
  const [saving, setSaving] = useState(false);

  const selectedPreviewEvent = useMemo(
    () => events.find((event) => event.id === eventDraft.id) || (eventDraft.eventName ? eventDraft : currentEvent),
    [currentEvent, eventDraft, events],
  );

  async function loadControlCenter() {
    setIsLoading(true);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Admin economy session error:", sessionError);
    }

    const email = session?.user.email?.toLowerCase() || "";

    if (!email || !adminEmails.includes(email)) {
      setAdminEmail(email);
      setIsAdmin(false);
      setStatus("Access denied.");
      setIsLoading(false);
      return;
    }

    setAdminEmail(email);
    setIsAdmin(true);

    try {
      const response = await fetch("/api/admin/economy", {
        headers: {
          authorization: `Bearer ${session?.access_token || ""}`,
        },
      });
      const payload = (await response.json()) as ControlCenterResponse;

      if (!response.ok) {
        throw new Error(payload.error || "GRAIL Control Center could not be loaded.");
      }

      setMarketplaceStatus(payload.marketplaceStatus || null);
      setSwitches(payload.switches || emptySwitches);
      setEvents(payload.events || []);
      setShippingRates(payload.shippingRates || defaultShippingRateSettings);
      setCurrentEvent(payload.currentEvent || null);
      setUpcomingEvent(payload.upcomingEvent || null);
      setCurrentEconomy(payload.currentEconomy || null);
      setStatus("GRAIL Control Center loaded.");
    } catch (error) {
      console.error("Admin economy load error:", error);
      setStatus(error instanceof Error ? error.message : "GRAIL Control Center could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }

  async function saveSwitches() {
    setSaving(true);
    setStatus("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    try {
      const response = await fetch("/api/admin/economy", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({
          action: "update_switches",
          switches,
        }),
      });
      const payload = (await response.json()) as ControlCenterResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Marketplace switches could not be saved.");
      }

      setStatus(payload.message || "Marketplace switches saved.");
      await loadControlCenter();
    } catch (error) {
      console.error("Admin economy switch save error:", error);
      setStatus(error instanceof Error ? error.message : "Marketplace switches could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function saveEvent() {
    setSaving(true);
    setStatus("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    try {
      const response = await fetch("/api/admin/economy", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({
          action: "save_event",
          event: eventDraft,
        }),
      });
      const payload = (await response.json()) as ControlCenterResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Marketplace event could not be saved.");
      }

      setStatus(payload.message || "Marketplace event saved.");
      setEventDraft(emptyEvent);
      await loadControlCenter();
    } catch (error) {
      console.error("Admin economy event save error:", error);
      setStatus(error instanceof Error ? error.message : "Marketplace event could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function saveShippingRates() {
    setSaving(true);
    setStatus("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    try {
      const response = await fetch("/api/admin/economy", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({
          action: "update_shipping_rates",
          shippingRates,
        }),
      });
      const payload = (await response.json()) as ControlCenterResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Shipping rates could not be saved.");
      }

      setStatus(payload.message || "Shipping rates saved.");
      await loadControlCenter();
    } catch (error) {
      console.error("Admin economy shipping rate save error:", error);
      setStatus(error instanceof Error ? error.message : "Shipping rates could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  function applyTemplate(template: Partial<MarketplaceEvent>) {
    setEventDraft({
      ...emptyEvent,
      ...template,
      notificationTitle: `${template.eventName || "GRAIL"} is live`,
      notificationBody: "A marketplace event is active on GRAIL.",
      bannerTitle: `${template.eventName || "GRAIL Event"} Live`,
      bannerSubtitle: "Marketplace event framework is active. Reward logic comes later.",
      bannerButtonLabel: "Browse Cards",
      bannerButtonHref: "/browse",
      bannerBackground: "platinum",
      bannerPriority: template.priority || 0,
      bannerDismissible: true,
      bannerCountdownEnabled: true,
    });
  }

  function editEvent(event: MarketplaceEvent) {
    setEventDraft({
      ...event,
      startAt: toDateTimeInput(event.startAt),
      endAt: toDateTimeInput(event.endAt),
    });
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadControlCenter();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="control-page">
      <style>{pageStyles}</style>
      <AdminLayout />
      <div className="control-shell">
        <Header />

        <section className="page-heading">
          <span>Admin</span>
          <h1>GRAIL Control Center</h1>
          <p>Marketplace operating controls for economy, events, and future reward systems.</p>
        </section>

        {!isLoading && !isAdmin ? (
          <section className="panel access-panel">
            <h2>Access denied</h2>
            <p>{adminEmail ? `${adminEmail} is not allowed.` : "Sign in as an admin."}</p>
          </section>
        ) : (
          <>
            <section className="panel status-panel">
              <div className="section-heading">
                <div>
                  <span>Section 1</span>
                  <h2>Marketplace Status</h2>
                </div>
                <button type="button" onClick={loadControlCenter}>
                  Refresh
                </button>
              </div>
              <div className="status-grid">
                <div><span>Marketplace</span><strong><i className="live-dot" /> {marketplaceStatus?.marketplace || "Loading"}</strong></div>
                <div><span>Current Economy</span><strong>{marketplaceStatus?.currentEconomy || "Normal"}</strong></div>
                <div><span>Current Active Event</span><strong>{marketplaceStatus?.currentActiveEvent || "None"}</strong></div>
                <div><span>Next Scheduled Event</span><strong>{marketplaceStatus?.nextScheduledEvent || "None"}</strong></div>
                <div><span>Current Reward Tier</span><strong>{currentEconomy?.rankName || "Pending"}</strong></div>
                <div><span>Current Seller Fee</span><strong>{formatPercent(currentEconomy?.sellerFeePercent)}</strong></div>
                <div><span>Current Buyer Reward</span><strong>{formatPercent(currentEconomy?.buyerRewardPercent)}</strong></div>
                <div><span>Current Seller Reward</span><strong>{formatPercent(currentEconomy?.sellerRewardPercent)}</strong></div>
                <div><span>Current XP Multiplier</span><strong>{currentEconomy?.xpMultiplier || 1}x</strong></div>
                <div><span>Current Wallet Multiplier</span><strong>{currentEconomy?.walletMultiplier || 1}x</strong></div>
                <div><span>Current Marketplace State</span><strong>{marketplaceStatus?.currentMarketplaceState || "Normal"}</strong></div>
                <div><span>Current Reward Tier Count</span><strong>{marketplaceStatus?.rewardTierCount ?? 0}</strong></div>
                <div><span>Current User Count</span><strong>{marketplaceStatus?.userCount ?? 0}</strong></div>
                <div><span>Current Wallet Liability</span><strong>{formatCurrency(marketplaceStatus?.walletLiability)}</strong></div>
                <div><span>Current GMV</span><strong>{formatCurrency(marketplaceStatus?.gmv)}</strong></div>
                <div><span>Current Platform Revenue</span><strong>{formatCurrency(marketplaceStatus?.platformRevenue)}</strong></div>
                <div><span>Outstanding Wallet Liability</span><strong>{formatCurrency(marketplaceStatus?.walletLiability)}</strong></div>
                <div><span>Wallet Issued Today</span><strong>{formatCurrency(marketplaceStatus?.walletIssuedToday)}</strong></div>
                <div><span>Wallet Issued This Month</span><strong>{formatCurrency(marketplaceStatus?.walletIssuedThisMonth)}</strong></div>
                <div><span>Wallet Issued Lifetime</span><strong>{formatCurrency(marketplaceStatus?.walletIssuedLifetime)}</strong></div>
                <div><span>Average Reward</span><strong>{formatCurrency(marketplaceStatus?.averageReward)}</strong></div>
                <div><span>Largest Reward</span><strong>{formatCurrency(marketplaceStatus?.largestReward)}</strong></div>
                <div><span>Reward Cost</span><strong>{formatCurrency(marketplaceStatus?.rewardCost)}</strong></div>
              </div>
              <div className="tier-cost-grid">
                {(marketplaceStatus?.rewardCostByTier || []).length > 0 ? (
                  marketplaceStatus?.rewardCostByTier.map((item) => (
                    <div key={item.tier}>
                      <span>{item.tier}</span>
                      <strong>{formatCurrency(item.amount)}</strong>
                    </div>
                  ))
                ) : (
                  <p className="empty-state">No wallet rewards issued yet.</p>
                )}
              </div>
            </section>

            <section className="panel switches-panel">
              <div className="section-heading">
                <div>
                  <span>Section 2</span>
                  <h2>Marketplace Switches</h2>
                </div>
                <button type="button" disabled={saving} onClick={saveSwitches}>
                  {saving ? "Saving..." : "Save Switches"}
                </button>
              </div>
              <div className="switch-grid">
                {switchLabels.map((item) => (
                  <label key={item.key} className="switch-row">
                    <span>{item.label}</span>
                    <input
                      type="checkbox"
                      checked={switches[item.key]}
                      onChange={(event) =>
                        setSwitches((current) => ({
                          ...current,
                          [item.key]: event.target.checked,
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
            </section>

            <section className="panel event-panel">
              <div className="section-heading">
                <div>
                  <span>Section 3</span>
                  <h2>Marketplace Shipping Rates</h2>
                </div>
                <button type="button" disabled={saving} onClick={saveShippingRates}>
                  {saving ? "Saving..." : "Save Shipping Rates"}
                </button>
              </div>
              <div className="event-form-grid">
                <label>
                  <span>PWE Rate</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={shippingRates.pweFlatRate}
                    onChange={(event) =>
                      setShippingRates((current) => ({
                        ...current,
                        pweFlatRate: Number(event.target.value),
                      }))
                    }
                  />
                </label>
                <label>
                  <span>Ground Advantage Rate</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={shippingRates.groundAdvantageRate}
                    onChange={(event) =>
                      setShippingRates((current) => ({
                        ...current,
                        groundAdvantageRate: Number(event.target.value),
                      }))
                    }
                  />
                </label>
                <label>
                  <span>Priority Mail Rate</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={shippingRates.priorityMailRate}
                    onChange={(event) =>
                      setShippingRates((current) => ({
                        ...current,
                        priorityMailRate: Number(event.target.value),
                      }))
                    }
                  />
                </label>
                <label>
                  <span>PWE Max Listing Value</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={shippingRates.pweMaxListingValue}
                    onChange={(event) =>
                      setShippingRates((current) => ({
                        ...current,
                        pweMaxListingValue: Number(event.target.value),
                      }))
                    }
                  />
                </label>
              </div>
            </section>

            <section className="panel event-panel">
              <div className="section-heading">
                <div>
                  <span>Section 4</span>
                  <h2>Event Engine</h2>
                </div>
                <button type="button" disabled={saving} onClick={saveEvent}>
                  {saving ? "Saving..." : "Save Event"}
                </button>
              </div>
              <div className="template-row">
                {eventTemplates.map((template) => (
                  <button key={template.label} type="button" onClick={() => applyTemplate(template)}>
                    {template.label}
                  </button>
                ))}
                <button type="button" onClick={() => setEventDraft(emptyEvent)}>
                  Custom Event
                </button>
              </div>
              <div className="event-form-grid">
                <label><span>Event Name</span><input value={eventDraft.eventName || ""} onChange={(event) => setEventDraft((draft) => ({ ...draft, eventName: event.target.value }))} /></label>
                <label><span>Enabled</span><input type="checkbox" checked={Boolean(eventDraft.enabled)} onChange={(event) => setEventDraft((draft) => ({ ...draft, enabled: event.target.checked }))} /></label>
                <label><span>Scheduled</span><input type="checkbox" checked={Boolean(eventDraft.scheduled)} onChange={(event) => setEventDraft((draft) => ({ ...draft, scheduled: event.target.checked }))} /></label>
                <label><span>Start Date / Time</span><input type="datetime-local" value={eventDraft.startAt || ""} onChange={(event) => setEventDraft((draft) => ({ ...draft, startAt: event.target.value }))} /></label>
                <label><span>End Date / Time</span><input type="datetime-local" value={eventDraft.endAt || ""} onChange={(event) => setEventDraft((draft) => ({ ...draft, endAt: event.target.value }))} /></label>
                <label><span>Time Zone</span><input value={eventDraft.timeZone || "America/New_York"} onChange={(event) => setEventDraft((draft) => ({ ...draft, timeZone: event.target.value }))} /></label>
                <label><span>Buyer Multiplier</span><input type="number" min="0.01" step="0.01" value={eventDraft.buyerMultiplier || 1} onChange={(event) => setEventDraft((draft) => ({ ...draft, buyerMultiplier: Number(event.target.value) }))} /></label>
                <label><span>Seller Multiplier</span><input type="number" min="0.01" step="0.01" value={eventDraft.sellerMultiplier || 1} onChange={(event) => setEventDraft((draft) => ({ ...draft, sellerMultiplier: Number(event.target.value) }))} /></label>
                <label><span>XP Multiplier</span><input type="number" min="0.01" step="0.01" value={eventDraft.xpMultiplier || 1} onChange={(event) => setEventDraft((draft) => ({ ...draft, xpMultiplier: Number(event.target.value) }))} /></label>
                <label><span>Wallet Multiplier</span><input type="number" min="0.01" step="0.01" value={eventDraft.walletMultiplier || 1} onChange={(event) => setEventDraft((draft) => ({ ...draft, walletMultiplier: Number(event.target.value) }))} /></label>
                <label><span>Treasure Chest Multiplier</span><input type="number" min="0.01" step="0.01" value={eventDraft.treasureMultiplier || 1} onChange={(event) => setEventDraft((draft) => ({ ...draft, treasureMultiplier: Number(event.target.value) }))} /></label>
                <label><span>Challenge Multiplier</span><input type="number" min="0.01" step="0.01" value={eventDraft.challengeMultiplier || 1} onChange={(event) => setEventDraft((draft) => ({ ...draft, challengeMultiplier: Number(event.target.value) }))} /></label>
                <label><span>Priority</span><input type="number" step="1" value={eventDraft.priority || 0} onChange={(event) => setEventDraft((draft) => ({ ...draft, priority: Number(event.target.value) }))} /></label>
                <label><span>Allow Stacking</span><input type="checkbox" checked={Boolean(eventDraft.allowStacking)} onChange={(event) => setEventDraft((draft) => ({ ...draft, allowStacking: event.target.checked }))} /></label>
                <label className="wide-field"><span>Notification Title</span><input value={eventDraft.notificationTitle || ""} onChange={(event) => setEventDraft((draft) => ({ ...draft, notificationTitle: event.target.value }))} /></label>
                <label className="wide-field"><span>Notification Body</span><textarea value={eventDraft.notificationBody || ""} onChange={(event) => setEventDraft((draft) => ({ ...draft, notificationBody: event.target.value }))} /></label>
                <label className="wide-field"><span>Banner Title</span><input value={eventDraft.bannerTitle || ""} onChange={(event) => setEventDraft((draft) => ({ ...draft, bannerTitle: event.target.value }))} /></label>
                <label className="wide-field"><span>Banner Subtitle</span><input value={eventDraft.bannerSubtitle || ""} onChange={(event) => setEventDraft((draft) => ({ ...draft, bannerSubtitle: event.target.value }))} /></label>
                <label><span>Banner Button</span><input value={eventDraft.bannerButtonLabel || ""} onChange={(event) => setEventDraft((draft) => ({ ...draft, bannerButtonLabel: event.target.value }))} /></label>
                <label><span>Button Link</span><input value={eventDraft.bannerButtonHref || ""} onChange={(event) => setEventDraft((draft) => ({ ...draft, bannerButtonHref: event.target.value }))} /></label>
                <label><span>Banner Background</span><input value={eventDraft.bannerBackground || "platinum"} onChange={(event) => setEventDraft((draft) => ({ ...draft, bannerBackground: event.target.value }))} /></label>
                <label><span>Banner Priority</span><input type="number" step="1" value={eventDraft.bannerPriority || 0} onChange={(event) => setEventDraft((draft) => ({ ...draft, bannerPriority: Number(event.target.value) }))} /></label>
                <label><span>Dismissible</span><input type="checkbox" checked={Boolean(eventDraft.bannerDismissible)} onChange={(event) => setEventDraft((draft) => ({ ...draft, bannerDismissible: event.target.checked }))} /></label>
                <label><span>Countdown</span><input type="checkbox" checked={Boolean(eventDraft.bannerCountdownEnabled)} onChange={(event) => setEventDraft((draft) => ({ ...draft, bannerCountdownEnabled: event.target.checked }))} /></label>
              </div>
            </section>

            <section className="panel events-list-panel">
              <div className="section-heading">
                <div>
                  <span>Section 5</span>
                  <h2>Upcoming Events</h2>
                </div>
              </div>
              <div className="event-summary-grid">
                <div><span>Current Event</span><strong>{currentEvent?.eventName || "None"}</strong><em>{currentEvent ? `Ends ${formatDate(currentEvent.endAt)}` : "No active event"}</em></div>
                <div><span>Upcoming Event</span><strong>{upcomingEvent?.eventName || "None"}</strong><em>{upcomingEvent ? `Starts in ${getCountdown(upcomingEvent.startAt)}` : "No scheduled event"}</em></div>
              </div>
              <div className="event-list">
                {events.length > 0 ? events.map((event) => (
                  <article key={event.id}>
                    <div>
                      <strong>{event.eventName}</strong>
                      <span>{event.status || "Scheduled"} · Priority {event.priority}</span>
                      <small>{formatDate(event.startAt)} → {formatDate(event.endAt)}</small>
                    </div>
                    <button type="button" onClick={() => editEvent(event)}>
                      Edit
                    </button>
                  </article>
                )) : <p className="empty-state">No marketplace events yet.</p>}
              </div>
            </section>

            <section className="panel preview-panel">
              <div className="section-heading">
                <div>
                  <span>Section 6</span>
                  <h2>Event Preview</h2>
                </div>
              </div>
              <div className="preview-grid">
                <div><span>Event</span><strong>{selectedPreviewEvent?.eventName || "None"}</strong><em>Preview only</em></div>
                <div><span>Buyer Reward</span><strong>{formatPercent(currentEconomy?.buyerRewardPercent)} → {formatPercent(multiplyPercent(currentEconomy?.buyerRewardPercent, selectedPreviewEvent?.buyerMultiplier))}</strong><em>Multiplier {selectedPreviewEvent?.buyerMultiplier || 1}x</em></div>
                <div><span>Seller Reward</span><strong>{formatPercent(currentEconomy?.sellerRewardPercent)} → {formatPercent(multiplyPercent(currentEconomy?.sellerRewardPercent, selectedPreviewEvent?.sellerMultiplier))}</strong><em>Multiplier {selectedPreviewEvent?.sellerMultiplier || 1}x</em></div>
                <div><span>XP</span><strong>{currentEconomy?.xpMultiplier || 1}x → {(currentEconomy?.xpMultiplier || 1) * (selectedPreviewEvent?.xpMultiplier || 1)}x</strong><em>Framework only</em></div>
                <div><span>Wallet</span><strong>{currentEconomy?.walletMultiplier || 1}x → {(currentEconomy?.walletMultiplier || 1) * (selectedPreviewEvent?.walletMultiplier || 1)}x</strong><em>Applies to completed rewards</em></div>
                <div><span>Treasure</span><strong>Disabled → Framework Ready</strong><em>Multiplier {selectedPreviewEvent?.treasureMultiplier || 1}x</em></div>
              </div>
            </section>

            <section className="panel economy-panel">
              <div className="section-heading">
                <div>
                  <span>Section 7</span>
                  <h2>Current Economy</h2>
                </div>
              </div>
              <div className="status-grid">
                <div><span>Current Seller Fee</span><strong>{formatPercent(currentEconomy?.sellerFeePercent)}</strong></div>
                <div><span>Current Buyer Reward</span><strong>{formatPercent(currentEconomy?.buyerRewardPercent)}</strong></div>
                <div><span>Current Seller Reward</span><strong>{formatPercent(currentEconomy?.sellerRewardPercent)}</strong></div>
                <div><span>Current Buyer Multiplier</span><strong>{currentEconomy?.buyerMultiplier || 1}x</strong></div>
                <div><span>Current Seller Multiplier</span><strong>{currentEconomy?.sellerMultiplier || 1}x</strong></div>
                <div><span>Current Wallet Multiplier</span><strong>{currentEconomy?.walletMultiplier || 1}x</strong></div>
                <div><span>Current XP Multiplier</span><strong>{currentEconomy?.xpMultiplier || 1}x</strong></div>
              </div>
            </section>

            <section className="future-grid">
              {["GRAIL Pass", "Treasure Chests", "Weekly Challenges", "Referral Rewards", "Daily Rewards"].map((item) => (
                <div key={item} className="panel future-card">
                  <span>Future Section</span>
                  <h2>{item}</h2>
                  <strong>Coming Soon</strong>
                </div>
              ))}
            </section>
          </>
        )}

        {status ? <p className="status-message">{status}</p> : null}
      </div>
    </main>
  );
}

const pageStyles = `
  .control-page {
    min-height: 100vh;
    background: radial-gradient(circle at 50% -120px, rgba(201,205,211,0.08), transparent 32%), linear-gradient(180deg, #000 0%, #030304 58%, #000 100%);
    color: #fafafa;
    font-family: Arial, Helvetica, sans-serif;
  }
  .control-shell {
    width: 1240px;
    margin: 0 auto;
    padding: 8px 0 42px;
  }
  .panel {
    border: 1px solid #1d1d22;
    border-radius: 12px;
    background: linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.008)), rgba(5,5,6,0.92);
    box-shadow: 0 18px 44px rgba(0,0,0,0.28);
  }
  .page-heading {
    margin-top: 18px;
  }
  .page-heading span,
  .section-heading span,
  label span,
  .status-grid span,
  .preview-grid span,
  .event-summary-grid span,
  .future-card span {
    color: #C9CDD3;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .page-heading h1 {
    margin: 8px 0 0;
    color: #fff;
    font-size: 42px;
    line-height: 46px;
    font-weight: 900;
  }
  .page-heading p,
  .access-panel p,
  .empty-state,
  .status-message,
  .event-list span,
  .event-list small,
  .preview-grid em,
  .event-summary-grid em {
    color: #a1a1aa;
    font-size: 13px;
    line-height: 18px;
    font-weight: 800;
  }
  .status-panel,
  .switches-panel,
  .event-panel,
  .events-list-panel,
  .preview-panel,
  .economy-panel,
  .access-panel {
    margin-top: 18px;
    padding: 16px;
  }
  .section-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  .section-heading h2,
  .access-panel h2,
  .future-card h2 {
    margin: 6px 0 0;
    color: #fff;
    font-size: 22px;
    line-height: 26px;
    font-weight: 900;
  }
  .status-grid,
  .preview-grid,
  .tier-cost-grid {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }
  .status-grid div,
  .preview-grid div,
  .tier-cost-grid div,
  .event-summary-grid div,
  .future-card {
    border: 1px solid rgba(201,205,211,0.14);
    border-radius: 10px;
    background: rgba(8,8,10,0.72);
    padding: 12px;
    min-height: 82px;
  }
  .status-grid strong,
  .preview-grid strong,
  .tier-cost-grid strong,
  .event-summary-grid strong,
  .future-card strong {
    display: block;
    margin-top: 8px;
    color: #fff;
    font-size: 18px;
    line-height: 22px;
    font-weight: 900;
  }
  .live-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: #b7f7c2;
    display: inline-block;
    box-shadow: 0 0 12px rgba(183,247,194,0.48);
  }
  .switch-grid,
  .event-form-grid {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }
  .switch-row,
  label {
    border: 1px solid rgba(201,205,211,0.14);
    border-radius: 10px;
    background: rgba(8,8,10,0.72);
    padding: 12px;
    display: grid;
    gap: 8px;
  }
  .switch-row {
    grid-template-columns: 1fr 22px;
    align-items: center;
  }
  input,
  textarea {
    width: 100%;
    border: 1px solid #24242a;
    border-radius: 10px;
    background: #08080a;
    color: #fff;
    padding: 10px;
    box-sizing: border-box;
    font: inherit;
    font-size: 13px;
    font-weight: 800;
    outline: none;
  }
  input[type="checkbox"] {
    width: 20px;
    height: 20px;
    accent-color: #E7DED0;
  }
  textarea {
    min-height: 80px;
    resize: vertical;
  }
  .wide-field {
    grid-column: span 2;
  }
  button {
    border: 1px solid rgba(231,222,208,0.28);
    border-radius: 10px;
    background: rgba(231,222,208,0.055);
    color: #fff;
    min-height: 38px;
    padding: 0 12px;
    font-size: 12px;
    line-height: 15px;
    font-weight: 900;
    cursor: pointer;
  }
  button:disabled {
    cursor: not-allowed;
    opacity: 0.62;
  }
  .template-row {
    margin-top: 14px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .event-summary-grid {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .event-list {
    margin-top: 12px;
    display: grid;
    gap: 10px;
  }
  .event-list article {
    border: 1px solid rgba(201,205,211,0.14);
    border-radius: 10px;
    background: rgba(8,8,10,0.72);
    padding: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .event-list strong {
    display: block;
    color: #fff;
    font-size: 14px;
    line-height: 18px;
    font-weight: 900;
  }
  .event-list span,
  .event-list small,
  .event-summary-grid em,
  .preview-grid em {
    display: block;
    margin-top: 5px;
    font-style: normal;
  }
  .future-grid {
    margin-top: 18px;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 10px;
  }
  .future-card strong {
    color: #E7DED0;
    font-size: 13px;
    line-height: 16px;
  }
  .status-message,
  .empty-state {
    margin: 14px 0 0;
    border: 1px solid rgba(231,222,208,0.18);
    border-radius: 10px;
    background: rgba(231,222,208,0.055);
    color: #E7DED0;
    padding: 12px;
  }
  @media (max-width: 1100px) {
    .control-shell {
      width: calc(100vw - 32px);
    }
    .status-grid,
    .preview-grid,
    .tier-cost-grid,
    .switch-grid,
    .event-form-grid,
    .event-summary-grid,
    .future-grid {
      grid-template-columns: 1fr;
    }
    .wide-field {
      grid-column: auto;
    }
    .event-list article {
      align-items: flex-start;
      flex-direction: column;
    }
  }
`;
