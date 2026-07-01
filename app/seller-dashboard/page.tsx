"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Header from "../components/Header";
import { mockSellerDashboardData } from "../lib/mockData";

type OfferStatus = "Pending" | "Accepted" | "Countered" | "Declined";
type OrderStatus = "Processing" | "Shipped" | "Paid";
type DashboardOrder = {
  id: string;
  card: string;
  buyer: string;
  total: string;
  payoutDisplay: string;
  status: OrderStatus;
  orderDate: string;
  fulfillmentStatus: string;
  transferStatus: string;
  disputeStatus: string;
  trackingNumber: string;
  carrier: string;
  inspectionEndsAt?: string | null;
  sellerPayoutAmount: number;
  href?: string;
};
type SupabaseOrderRow = {
  id: string;
  listing_id?: string | null;
  buyer_id?: string | null;
  seller_id?: string | null;
  total_amount?: number | null;
  card_price?: number | null;
  status?: string | null;
  created_at?: string | null;
  buyer_fee?: number | null;
  fulfillment_status?: string | null;
  tracking_number?: string | null;
  carrier?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  inspection_ends_at?: string | null;
  dispute_status?: string | null;
  seller_payout_amount?: number | null;
  platform_fee?: number | null;
  processing_fee?: number | null;
  transfer_status?: string | null;
  stripe_transfer_id?: string | null;
  payout_released_at?: string | null;
};
type ListingRow = {
  id: string;
  title: string | null;
};
type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
};
type PayoutStatus = {
  connected: boolean;
  maskedAccountId?: string;
  onboardingStatus?: "complete" | "pending" | "incomplete" | string;
  detailsSubmitted?: boolean;
  payoutsEnabled?: boolean;
  requirementsCount?: number;
  disabledReason?: string | null;
};

const listings = mockSellerDashboardData.activeListings;
const initialOffers = mockSellerDashboardData.incomingOffers.map((offer) => ({
  ...offer,
  status: offer.status as OfferStatus,
}));
const initialOrders = mockSellerDashboardData.recentOrders.map((order) => ({
  ...order,
  status: order.status as OrderStatus,
  payoutDisplay: order.total,
  orderDate: order.shipBy,
  fulfillmentStatus: "pending",
  transferStatus: "not_ready",
  disputeStatus: "none",
  trackingNumber: "",
  carrier: "",
  sellerPayoutAmount: 0,
}));

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function shortId(value?: string | null) {
  return value ? value.slice(0, 8) : "Unknown";
}

function getProfileName(profile?: ProfileRow, fallbackId?: string | null) {
  return profile?.full_name || profile?.username || shortId(fallbackId);
}

function normalizeOrderStatus(status?: string | null): OrderStatus {
  const normalized = status?.toLowerCase();

  if (normalized === "shipped") {
    return "Shipped";
  }

  if (normalized === "processing") {
    return "Processing";
  }

  return "Paid";
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function calculatePayout(order: SupabaseOrderRow) {
  const cardPrice = Number(order.card_price || order.total_amount || 0);
  const platformFee = roundCurrency(cardPrice * 0.075);
  const processingFee = roundCurrency(Number(order.buyer_fee || 0));

  return Math.max(roundCurrency(cardPrice - platformFee - processingFee), 0);
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card panel">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function SellerDashboardPage() {
  const [offers, setOffers] = useState(initialOffers);
  const [orders, setOrders] = useState<DashboardOrder[]>(initialOrders);
  const [payoutStatus, setPayoutStatus] = useState<PayoutStatus | null>(null);
  const [isLoadingPayoutStatus, setIsLoadingPayoutStatus] = useState(true);
  const [isStartingPayouts, setIsStartingPayouts] = useState(false);
  const [payoutMessage, setPayoutMessage] = useState("");
  const [dashboardMessage, setDashboardMessage] = useState("");
  const [trackingOrderId, setTrackingOrderId] = useState("");
  const [trackingCarrier, setTrackingCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadSellerOrders() {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Seller dashboard session error:", sessionError);
      }

      if (!session?.user.id) {
        return;
      }

      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .eq("seller_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(8);

        if (error) {
          throw error;
        }

        const orderRows = (data || []) as SupabaseOrderRow[];

        if (orderRows.length === 0) {
          return;
        }

        const listingIds = Array.from(
          new Set(
            orderRows
              .map((order) => order.listing_id)
              .filter((listingId): listingId is string => Boolean(listingId)),
          ),
        );
        const buyerIds = Array.from(
          new Set(
            orderRows
              .map((order) => order.buyer_id)
              .filter((buyerId): buyerId is string => Boolean(buyerId)),
          ),
        );
        const listingsById = new Map<string, ListingRow>();
        const profilesById = new Map<string, ProfileRow>();

        if (listingIds.length > 0) {
          const { data: listingData, error: listingError } = await supabase
            .from("listings")
            .select("id, title")
            .in("id", listingIds);

          if (listingError) {
            console.error("Seller dashboard order listing fetch error:", listingError);
          } else {
            ((listingData || []) as ListingRow[]).forEach((listing) => {
              listingsById.set(listing.id, listing);
            });
          }
        }

        if (buyerIds.length > 0) {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("id, full_name, username")
            .in("id", buyerIds);

          if (profileError) {
            console.error("Seller dashboard buyer profile fetch error:", profileError);
          } else {
            ((profileData || []) as ProfileRow[]).forEach((profile) => {
              profilesById.set(profile.id, profile);
            });
          }
        }

        if (!isMounted) {
          return;
        }

        setOrders(
          orderRows.map((order) => {
            const listing = order.listing_id
              ? listingsById.get(order.listing_id)
              : undefined;
            const total = Number(order.total_amount || order.card_price || 0);
            const sellerPayoutAmount = Number(order.seller_payout_amount || calculatePayout(order));

            return {
              id: order.id,
              card: listing?.title || "GRAIL Card",
              buyer: getProfileName(
                order.buyer_id ? profilesById.get(order.buyer_id) : undefined,
                order.buyer_id,
              ),
              total: formatCurrency(total),
              payoutDisplay: formatCurrency(sellerPayoutAmount),
              status: normalizeOrderStatus(order.status),
              orderDate: formatDate(order.created_at),
              fulfillmentStatus: order.fulfillment_status || "pending",
              transferStatus: order.transfer_status || "not_ready",
              disputeStatus: order.dispute_status || "none",
              trackingNumber: order.tracking_number || "",
              carrier: order.carrier || "",
              inspectionEndsAt: order.inspection_ends_at,
              sellerPayoutAmount,
              href: order.listing_id ? `/cards/${order.listing_id}` : "/orders",
            };
          }),
        );
      } catch (error) {
        console.error("Seller dashboard orders fetch error:", error);
      }
    }

    loadSellerOrders();

    return () => {
      isMounted = false;
    };
  }, []);

  const getAccessToken = useCallback(async () => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("Seller dashboard payout auth error:", error);
    }

    return session?.access_token || "";
  }, []);

  const loadPayoutStatus = useCallback(async (statusMessage?: string) => {
    setIsLoadingPayoutStatus(true);

    if (statusMessage) {
      setPayoutMessage(statusMessage);
    }

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        setPayoutStatus({ connected: false });
        setPayoutMessage("Sign in to set up seller payouts.");
        return;
      }

      const response = await fetch("/api/stripe/connect/status", {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });
      const payload = (await response.json()) as PayoutStatus & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Payout status could not be loaded.");
      }

      setPayoutStatus(payload);

      if (payload.connected && payload.onboardingStatus === "complete") {
        setPayoutMessage("Stripe Express payout setup is complete.");
      } else if (payload.connected && payload.onboardingStatus === "pending") {
        setPayoutMessage("Stripe is reviewing your payout setup.");
      } else if (!statusMessage) {
        setPayoutMessage("");
      }
    } catch (error) {
      console.error("Seller dashboard payout status error:", error);
      setPayoutMessage("Payout setup status could not be loaded.");
      setPayoutStatus({ connected: false });
    } finally {
      setIsLoadingPayoutStatus(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    const stripeReturnState =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("stripe")
        : null;
    const message = stripeReturnState === "return"
      ? "Checking Stripe payout setup..."
      : stripeReturnState === "refresh"
        ? "Stripe onboarding link expired. Continue setup when ready."
        : undefined;

    const timer = window.setTimeout(() => {
      void loadPayoutStatus(message);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadPayoutStatus]);

  async function startPayoutOnboarding() {
    setIsStartingPayouts(true);
    setPayoutMessage("");

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        setPayoutMessage("Sign in to set up seller payouts.");
        return;
      }

      const response = await fetch("/api/stripe/connect/onboard", {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });
      const payload = (await response.json()) as {
        url?: string;
        error?: string;
        detail?: string;
      };

      if (!response.ok || !payload.url) {
        throw new Error(
          payload.detail ||
            payload.error ||
            "Stripe onboarding could not be started.",
        );
      }

      window.location.href = payload.url;
    } catch (error) {
      console.error("Seller dashboard payout onboarding error:", error);
      setPayoutMessage(
        error instanceof Error
          ? error.message
          : "Stripe payout onboarding could not be started.",
      );
    } finally {
      setIsStartingPayouts(false);
    }
  }

  function updateLocalOrder(orderId: string, patch: Partial<DashboardOrder>) {
    setOrders((items) =>
      items.map((order) => (order.id === orderId ? { ...order, ...patch } : order)),
    );
  }

  async function updateOrderFields(orderId: string, fields: Record<string, unknown>) {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Seller dashboard fulfillment auth error:", sessionError);
    }

    if (!session?.user.id) {
      setDashboardMessage("Sign in to manage fulfillment.");
      return false;
    }

    const { error } = await supabase
      .from("orders")
      .update(fields)
      .eq("id", orderId)
      .eq("seller_id", session.user.id);

    if (error) {
      console.error("Seller dashboard fulfillment update error:", {
        error,
        errorMessage: error.message,
        orderId,
        fields,
      });
      setDashboardMessage("Order could not be updated. Check RLS policies and order columns.");
      return false;
    }

    return true;
  }

  function openTrackingModal(order: DashboardOrder) {
    setTrackingOrderId(order.id);
    setTrackingCarrier(order.carrier);
    setTrackingNumber(order.trackingNumber);
    setDashboardMessage("");
  }

  async function saveTracking() {
    if (!trackingOrderId) {
      return;
    }

    if (!trackingCarrier.trim() || !trackingNumber.trim()) {
      setDashboardMessage("Carrier and tracking number are required.");
      return;
    }

    setUpdatingOrderId(trackingOrderId);

    const success = await updateOrderFields(trackingOrderId, {
      carrier: trackingCarrier.trim(),
      tracking_number: trackingNumber.trim(),
    });

    if (success) {
      updateLocalOrder(trackingOrderId, {
        carrier: trackingCarrier.trim(),
        trackingNumber: trackingNumber.trim(),
      });
      setTrackingOrderId("");
      setTrackingCarrier("");
      setTrackingNumber("");
      setDashboardMessage("Tracking saved.");
    }

    setUpdatingOrderId("");
  }

  async function markShipped(order: DashboardOrder) {
    setUpdatingOrderId(order.id);

    const now = new Date().toISOString();
    const success = await updateOrderFields(order.id, {
      fulfillment_status: "shipped",
      shipped_at: now,
      transfer_status: "not_ready",
    });

    if (success) {
      updateLocalOrder(order.id, {
        fulfillmentStatus: "shipped",
        transferStatus: "not_ready",
      });
      setDashboardMessage("Order marked shipped.");
    }

    setUpdatingOrderId("");
  }

  async function markDelivered(order: DashboardOrder) {
    setUpdatingOrderId(order.id);

    const deliveredAt = new Date();
    const inspectionEndsAt = new Date(deliveredAt.getTime() + 3 * 24 * 60 * 60 * 1000);
    const success = await updateOrderFields(order.id, {
      fulfillment_status: "delivered",
      delivered_at: deliveredAt.toISOString(),
      inspection_ends_at: inspectionEndsAt.toISOString(),
      transfer_status: "not_ready",
      dispute_status: order.disputeStatus || "none",
      seller_payout_amount: order.sellerPayoutAmount,
    });

    if (success) {
      updateLocalOrder(order.id, {
        fulfillmentStatus: "delivered",
        transferStatus: "not_ready",
        disputeStatus: order.disputeStatus || "none",
        inspectionEndsAt: inspectionEndsAt.toISOString(),
      });
      setDashboardMessage("Order marked delivered. Payout waits for the inspection window.");
    }

    setUpdatingOrderId("");
  }

  async function markInspectionComplete(order: DashboardOrder) {
    if (order.disputeStatus !== "none") {
      setDashboardMessage("Payout cannot become ready while a dispute is open.");
      return;
    }

    setUpdatingOrderId(order.id);

    const success = await updateOrderFields(order.id, {
      transfer_status: "ready",
      seller_payout_amount: order.sellerPayoutAmount,
    });

    if (success) {
      updateLocalOrder(order.id, { transferStatus: "ready" });
      setDashboardMessage("Inspection marked complete. Payout is ready.");
    }

    setUpdatingOrderId("");
  }

  async function releasePayout(order: DashboardOrder) {
    setUpdatingOrderId(order.id);

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        setDashboardMessage("Sign in to release payouts.");
        return;
      }

      const response = await fetch("/api/stripe/payouts/release", {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ orderId: order.id }),
      });
      const payload = (await response.json()) as { error?: string; detail?: string };

      if (!response.ok) {
        throw new Error(
          payload.detail || payload.error || "Payout could not be released.",
        );
      }

      updateLocalOrder(order.id, { transferStatus: "paid" });
      setDashboardMessage("Payout released.");
    } catch (error) {
      console.error("Seller dashboard payout release error:", error);
      setDashboardMessage(
        error instanceof Error ? error.message : "Payout could not be released.",
      );
    } finally {
      setUpdatingOrderId("");
    }
  }

  function getPayoutBlockReason(order: DashboardOrder) {
    if (order.transferStatus === "paid") return "Payout released";
    if (!payoutStatus?.payoutsEnabled) return "Payout setup incomplete";
    if (order.disputeStatus === "opened") return "Dispute opened";
    if (order.fulfillmentStatus !== "delivered") return "Waiting for delivery";
    if (order.transferStatus !== "ready") return "Inspection window active";
    return "";
  }

  function updateOffer(id: string, status: OfferStatus) {
    setOffers((items) =>
      items.map((offer) => (offer.id === id ? { ...offer, status } : offer)),
    );
  }

  const payoutConnected = Boolean(payoutStatus?.connected);
  const payoutComplete = payoutStatus?.onboardingStatus === "complete";
  const payoutPending = payoutStatus?.onboardingStatus === "pending";
  const payoutIncomplete = payoutConnected && !payoutComplete && !payoutPending;
  const payoutTitle = isLoadingPayoutStatus
    ? "Payout Setup"
    : !payoutConnected
      ? "Payout Setup"
      : payoutComplete
        ? "Payouts Enabled"
        : payoutPending
          ? "Payout Verification Pending"
          : "Payout Setup Incomplete";
  const payoutCopy = isLoadingPayoutStatus
    ? "Loading Stripe Express payout status..."
    : !payoutConnected
      ? "Connect Stripe Express to receive seller payouts after orders are fulfilled."
      : payoutComplete
        ? "Stripe Express account connected."
        : payoutPending
          ? "Stripe is reviewing your payout setup."
          : "Finish Stripe Express onboarding to enable seller payouts.";
  const shouldShowPayoutButton = !isLoadingPayoutStatus && (!payoutConnected || payoutIncomplete);
  const payoutButtonLabel = payoutConnected ? "Continue Payout Setup" : "Set Up Payouts";
  const isDevToolsEnabled = process.env.NODE_ENV !== "production";

  return (
    <main className="dashboard-page">
      <style>{pageStyles}</style>
      <div className="dashboard-shell">
        <Header />

        <section className="page-heading">
          <div>
            <span>Seller Tools</span>
            <h1>Seller Dashboard</h1>
            <p>Manage your listings, offers, orders, messages, and seller rewards.</p>
          </div>
          <Link href="/list">List New Card</Link>
        </section>

        <section className="stats-grid">
          <StatCard label="Active Listings" value={mockSellerDashboardData.stats.activeListings} />
          <StatCard label="Pending Offers" value={mockSellerDashboardData.stats.pendingOffers} />
          <StatCard label="Orders This Month" value={mockSellerDashboardData.stats.ordersThisMonth} />
          <StatCard label="Total Earnings" value={mockSellerDashboardData.stats.totalEarnings} />
          <StatCard label="Seller Level" value={mockSellerDashboardData.stats.sellerLevel} />
          <StatCard label="Response Rate" value={mockSellerDashboardData.stats.responseRate} />
        </section>

        {dashboardMessage ? <p className="dashboard-message">{dashboardMessage}</p> : null}

        <section className="dashboard-layout">
          <div className="main-column">
            <section className="panel dashboard-section">
              <div className="section-heading">
                <h2>Active Listings</h2>
                <Link href="/list">Add Listing</Link>
              </div>
              <div className="table-list">
                {listings.map((listing) => (
                  <article key={listing.card} className="table-row listing-row">
                    <div>
                      <strong>{listing.card}</strong>
                      <span>{listing.status}</span>
                    </div>
                    <span>{listing.price}</span>
                    <span>{listing.market}</span>
                    <span>{listing.watches} watches</span>
                    <span>{listing.views} views</span>
                    <div className="row-actions">
                      <button type="button">Edit</button>
                      <button type="button">Promote</button>
                      <Link href={listing.href}>View</Link>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="panel dashboard-section">
              <div className="section-heading">
                <h2>Incoming Offers</h2>
                <Link href="/offers">View Offers</Link>
              </div>
              <div className="table-list">
                {offers.map((offer) => (
                  <article key={offer.id} className="table-row offer-row">
                    <div>
                      <strong>{offer.buyer}</strong>
                      <span>{offer.card}</span>
                    </div>
                    <span>{offer.offer}</span>
                    <span>{offer.asking}</span>
                    <span className={`status status-${offer.status.toLowerCase()}`}>
                      {offer.status}
                    </span>
                    <div className="row-actions">
                      <button type="button" onClick={() => updateOffer(offer.id, "Accepted")}>
                        Accept
                      </button>
                      <button type="button" onClick={() => updateOffer(offer.id, "Countered")}>
                        Counter
                      </button>
                      <button type="button" onClick={() => updateOffer(offer.id, "Declined")}>
                        Decline
                      </button>
                      <Link href="/messages">Message</Link>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="panel dashboard-section">
              <div className="section-heading">
                <h2>Recent Sold Orders</h2>
                <Link href="/orders">View Orders</Link>
              </div>
              <div className="table-list">
                {orders.map((order) => {
                  const blockReason = getPayoutBlockReason(order);
                  const canReleasePayout =
                    payoutStatus?.payoutsEnabled &&
                    order.transferStatus === "ready" &&
                    order.disputeStatus === "none" &&
                    order.fulfillmentStatus === "delivered";

                  return (
                    <article key={order.id} className="table-row order-row payout-order-row">
                      <div>
                        <strong>{order.card}</strong>
                        <span>Order {order.id}</span>
                        <span>Buyer {order.buyer}</span>
                      </div>
                      <div>
                        <strong>{order.total}</strong>
                        <span>Sold price</span>
                        <span>Payout {order.payoutDisplay}</span>
                      </div>
                      <div>
                        <span className={`status status-${order.fulfillmentStatus}`}>
                          {order.fulfillmentStatus}
                        </span>
                        <span className={`status status-${order.transferStatus}`}>
                          {order.transferStatus}
                        </span>
                      </div>
                      <div>
                        <span>Tracking {order.trackingNumber || "Not added"}</span>
                        <span>{order.carrier || "Carrier pending"}</span>
                        <span>Inspection {formatDate(order.inspectionEndsAt)}</span>
                      </div>
                      <div className="row-actions">
                        {order.href ? <Link href={order.href}>View Card</Link> : null}
                        <button
                          type="button"
                          disabled={updatingOrderId === order.id}
                          onClick={() => openTrackingModal(order)}
                        >
                          Add Tracking
                        </button>
                        <button
                          type="button"
                          disabled={updatingOrderId === order.id}
                          onClick={() => markShipped(order)}
                        >
                          Mark Shipped
                        </button>
                        <button
                          type="button"
                          disabled={updatingOrderId === order.id}
                          onClick={() => markDelivered(order)}
                        >
                          Mark Delivered
                        </button>
                        {isDevToolsEnabled ? (
                          <button
                            type="button"
                            disabled={updatingOrderId === order.id}
                            onClick={() => markInspectionComplete(order)}
                          >
                            Mark Inspection Complete
                          </button>
                        ) : null}
                        {canReleasePayout ? (
                          <button
                            type="button"
                            disabled={updatingOrderId === order.id}
                            onClick={() => releasePayout(order)}
                          >
                            Release Payout
                          </button>
                        ) : (
                          <span className="payout-reason">{blockReason}</span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="sidebar">
            <section className="panel sidebar-panel payout-panel">
              <h2>{payoutTitle}</h2>
              <p>{payoutCopy}</p>
              {payoutStatus?.maskedAccountId ? (
                <p className="stripe-account-id">
                  Stripe account: <strong>{payoutStatus.maskedAccountId}</strong>
                </p>
              ) : null}
              {typeof payoutStatus?.requirementsCount === "number" &&
              payoutStatus.requirementsCount > 0 ? (
                <p className="payout-warning">
                  {payoutStatus.requirementsCount} requirement
                  {payoutStatus.requirementsCount === 1 ? "" : "s"} due.
                </p>
              ) : null}
              {payoutStatus?.disabledReason ? (
                <p className="payout-warning">{payoutStatus.disabledReason}</p>
              ) : null}
              {payoutComplete ? (
                <div className="payout-badges">
                  <span>Details submitted</span>
                  <span>Payouts enabled</span>
                </div>
              ) : null}
              {shouldShowPayoutButton ? (
                <button
                  type="button"
                  className="payout-button"
                  disabled={isStartingPayouts}
                  onClick={startPayoutOnboarding}
                >
                  {isStartingPayouts ? "Opening Stripe..." : payoutButtonLabel}
                </button>
              ) : null}
              {payoutMessage ? <p className="payout-message">{payoutMessage}</p> : null}
            </section>

            <section className="panel sidebar-panel">
              <h2>Seller Rewards</h2>
              <p>Current level: {mockSellerDashboardData.rewards.currentLevel}</p>
              <div className="progress-block">
                <div>
                  <span>Progress to Level 5</span>
                  <strong>{mockSellerDashboardData.rewards.progressToNext}%</strong>
                </div>
                <div className="progress-track">
                  <span style={{ width: `${mockSellerDashboardData.rewards.progressToNext}%` }} />
                </div>
              </div>
              <StatCard label="Completed Sales" value={String(mockSellerDashboardData.rewards.completedSales)} />
              <StatCard label="Fast Shipping Streak" value={mockSellerDashboardData.rewards.fastShippingStreak} />
              <StatCard label="Response Score" value={mockSellerDashboardData.rewards.responseScore} />
              <StatCard label="Buyer Rating" value={mockSellerDashboardData.rewards.buyerRating} />
              <p>Higher seller rewards can boost visibility on Browse.</p>
            </section>

            <section className="panel sidebar-panel">
              <h2>Visibility Boost</h2>
              <ul>
                <li>Complete sales</li>
                <li>Ship fast</li>
                <li>Respond quickly</li>
                <li>Maintain strong reviews</li>
                <li>Avoid cancellations</li>
                <li>Keep market-fair pricing</li>
              </ul>
            </section>

            <section className="panel sidebar-panel quick-actions">
              <h2>Quick Actions</h2>
              <Link href="/list">List New Card</Link>
              <Link href="/collections/vault-runner">View Public Collection</Link>
              <Link href="/messages">View Messages</Link>
              <Link href="/offers">View Offers</Link>
            </section>
          </aside>
        </section>
      </div>
      {trackingOrderId ? (
        <div className="modal-backdrop" role="presentation">
          <section className="panel tracking-modal" role="dialog" aria-modal="true">
            <div className="section-heading">
              <h2>Add Tracking</h2>
              <button
                type="button"
                onClick={() => {
                  setTrackingOrderId("");
                  setTrackingCarrier("");
                  setTrackingNumber("");
                }}
              >
                Close
              </button>
            </div>
            <label>
              <span>Carrier</span>
              <input
                value={trackingCarrier}
                onChange={(event) => setTrackingCarrier(event.target.value)}
                placeholder="USPS, UPS, FedEx..."
              />
            </label>
            <label>
              <span>Tracking number</span>
              <input
                value={trackingNumber}
                onChange={(event) => setTrackingNumber(event.target.value)}
                placeholder="Tracking number"
              />
            </label>
            <div className="row-actions">
              <button type="button" disabled={Boolean(updatingOrderId)} onClick={saveTracking}>
                Save Tracking
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

const pageStyles = `
  .dashboard-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at 50% -120px, rgba(201,205,211,0.08), transparent 32%),
      linear-gradient(180deg, #000 0%, #030304 58%, #000 100%);
    color: #fafafa;
    font-family: Arial, Helvetica, sans-serif;
  }

  .dashboard-shell {
    width: 1240px;
    margin: 0 auto;
    padding: 8px 0 38px;
  }

  .panel {
    border: 1px solid #1d1d22;
    border-radius: 12px;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.006)),
      rgba(5,5,6,0.92);
    box-shadow: 0 18px 44px rgba(0,0,0,0.28);
  }

  .page-heading {
    margin-top: 18px;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 20px;
  }

  .page-heading span {
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
  .sidebar-panel p,
  .sidebar-panel li {
    color: #a1a1aa;
    font-size: 13px;
    line-height: 18px;
    font-weight: 800;
  }

  .page-heading a,
  .section-heading a,
  .row-actions a,
  .row-actions button,
  .quick-actions a,
  .payout-button {
    border: 1px solid rgba(231,222,208,0.28);
    border-radius: 10px;
    background: rgba(231,222,208,0.055);
    color: #fff;
    min-height: 36px;
    padding: 0 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
  }

  .page-heading a:hover,
  .section-heading a:hover,
  .row-actions a:hover,
  .row-actions button:hover,
  .quick-actions a:hover,
  .payout-button:hover:not(:disabled) {
    border-color: rgba(231,222,208,0.62);
    background: rgba(231,222,208,0.11);
    box-shadow: 0 0 18px rgba(201,205,211,0.13);
  }

  .payout-button:disabled {
    cursor: wait;
    opacity: 0.62;
  }

  .stats-grid {
    margin-top: 18px;
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 12px;
  }

  .dashboard-message {
    margin: 14px 0 0;
    border: 1px solid rgba(201,205,211,0.18);
    border-radius: 10px;
    background: rgba(201,205,211,0.055);
    color: #C9CDD3;
    padding: 10px 12px;
    font-size: 12px;
    line-height: 16px;
    font-weight: 900;
  }

  .stat-card {
    min-height: 82px;
    padding: 14px;
  }

  .stat-card span {
    color: #85858f;
    font-size: 11px;
    line-height: 14px;
    font-weight: 800;
  }

  .stat-card strong {
    display: block;
    margin-top: 8px;
    color: #fff;
    font-size: 24px;
    line-height: 28px;
    font-weight: 900;
  }

  .dashboard-layout {
    margin-top: 18px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 310px;
    gap: 18px;
    align-items: start;
  }

  .main-column,
  .sidebar {
    display: grid;
    gap: 14px;
  }

  .sidebar {
    position: sticky;
    top: 16px;
  }

  .dashboard-section,
  .sidebar-panel {
    padding: 14px;
  }

  .section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
  }

  .section-heading h2,
  .sidebar-panel h2 {
    margin: 0;
    color: #fff;
    font-size: 18px;
    line-height: 22px;
    font-weight: 900;
  }

  .table-list {
    margin-top: 12px;
    display: grid;
    gap: 10px;
  }

  .table-row {
    border: 1px solid #202026;
    border-radius: 10px;
    background: rgba(8,8,10,0.76);
    padding: 12px;
    display: grid;
    gap: 12px;
    align-items: center;
  }

  .listing-row {
    grid-template-columns: 1.3fr 90px 100px 100px 90px auto;
  }

  .offer-row {
    grid-template-columns: 1.3fr 90px 90px 100px auto;
  }

  .order-row {
    grid-template-columns: 1.2fr 100px 90px 100px 100px auto;
  }

  .payout-order-row {
    grid-template-columns: minmax(180px, 1.2fr) 110px 120px 150px minmax(220px, auto);
  }

  .table-row strong {
    display: block;
    color: #fff;
    font-size: 13px;
    line-height: 17px;
    font-weight: 900;
  }

  .table-row span {
    color: #C9CDD3;
    font-size: 12px;
    line-height: 16px;
    font-weight: 800;
  }

  .row-actions {
    display: flex;
    gap: 7px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .payout-reason {
    border: 1px solid rgba(201,205,211,0.16);
    border-radius: 999px;
    background: rgba(201,205,211,0.045);
    padding: 7px 9px;
  }

  .status {
    border: 1px solid rgba(201,205,211,0.28);
    border-radius: 999px;
    padding: 5px 9px;
    justify-self: start;
    font-size: 10px !important;
    line-height: 12px !important;
    text-transform: uppercase;
  }

  .status-accepted,
  .status-shipped,
  .status-paid,
  .status-delivered,
  .status-ready {
    color: #86efac !important;
    background: rgba(52,211,153,0.08);
    border-color: rgba(52,211,153,0.24);
  }

  .status-pending,
  .status-not_ready {
    color: #C9CDD3 !important;
    background: rgba(201,205,211,0.08);
  }

  .status-declined {
    color: #fb7185 !important;
    background: rgba(244,63,94,0.08);
    border-color: rgba(244,63,94,0.24);
  }

  .status-countered {
    color: #c4b5fd !important;
    background: rgba(167,139,250,0.08);
    border-color: rgba(167,139,250,0.24);
  }

  .status-blocked,
  .status-failed {
    color: #fb7185 !important;
    background: rgba(244,63,94,0.08);
    border-color: rgba(244,63,94,0.24);
  }

  .progress-block {
    border: 1px solid #202026;
    border-radius: 10px;
    background: rgba(8,8,10,0.76);
    padding: 10px;
  }

  .progress-block div:first-child {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    color: #C9CDD3;
    font-size: 11px;
    font-weight: 900;
  }

  .progress-track {
    margin-top: 9px;
    height: 8px;
    border-radius: 999px;
    background: rgba(201,205,211,0.12);
    overflow: hidden;
  }

  .progress-track span {
    display: block;
    width: 76%;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #C9CDD3, #E7DED0);
  }

  .sidebar-panel {
    display: grid;
    gap: 10px;
  }

  .stripe-account-id {
    border: 1px solid rgba(201,205,211,0.16);
    border-radius: 10px;
    background: rgba(201,205,211,0.045);
    padding: 10px;
  }

  .stripe-account-id strong {
    color: #fff;
  }

  .payout-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .payout-badges span {
    border: 1px solid rgba(52,211,153,0.24);
    border-radius: 999px;
    background: rgba(52,211,153,0.08);
    color: #86efac;
    padding: 5px 9px;
    font-size: 10px;
    line-height: 12px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .payout-warning {
    border: 1px solid rgba(251,113,133,0.22);
    border-radius: 10px;
    background: rgba(251,113,133,0.07);
    color: #fda4af !important;
    padding: 9px 10px;
  }

  .payout-message {
    color: #C9CDD3 !important;
    font-size: 12px !important;
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 60;
    background: rgba(0,0,0,0.72);
    display: grid;
    place-items: center;
    padding: 18px;
  }

  .tracking-modal {
    width: min(430px, 100%);
    padding: 16px;
    display: grid;
    gap: 12px;
  }

  .tracking-modal label {
    display: grid;
    gap: 7px;
  }

  .tracking-modal label span {
    color: #C9CDD3;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .tracking-modal input {
    border: 1px solid #202026;
    border-radius: 10px;
    background: rgba(8,8,10,0.84);
    color: #fff;
    min-height: 40px;
    padding: 0 11px;
    font-size: 13px;
    font-weight: 800;
    outline: none;
  }

  .sidebar-panel ul {
    margin: 0;
    padding-left: 18px;
  }

  .quick-actions {
    align-items: start;
  }

  @media (max-width: 1100px) {
    .dashboard-shell {
      width: calc(100vw - 32px);
    }

    .page-heading,
    .dashboard-layout,
    .stats-grid,
    .listing-row,
    .offer-row,
    .order-row {
      grid-template-columns: 1fr;
    }

    .page-heading {
      display: grid;
      align-items: start;
    }

    .sidebar {
      position: static;
    }

    .row-actions {
      justify-content: flex-start;
    }
  }
`;
