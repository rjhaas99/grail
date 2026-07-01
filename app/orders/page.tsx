"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Header from "../components/Header";
import { mockOrders } from "../lib/mockData";

type SupabaseOrderRow = {
  id: string;
  listing_id?: string | null;
  buyer_id?: string | null;
  seller_id?: string | null;
  total_amount?: number | null;
  card_price?: number | null;
  status?: string | null;
  created_at?: string | null;
  fulfillment_status?: string | null;
  dispute_status?: string | null;
  transfer_status?: string | null;
  inspection_ends_at?: string | null;
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

type OrderView = {
  id: string;
  cardTitle: string;
  participantLabel: string;
  totalDisplay: string;
  status: string;
  date: string;
  href: string;
  isBuyer?: boolean;
  fulfillmentStatus?: string;
  disputeStatus?: string;
  transferStatus?: string;
  inspectionEndsAt?: string | null;
};

const mockOrderViews: OrderView[] = mockOrders.map((order) => ({
  id: order.id,
  cardTitle: order.cardTitle,
  participantLabel: `Seller: ${order.seller}`,
  totalDisplay: order.totalDisplay,
  status: order.status,
  date: order.date,
  href: order.href,
  isBuyer: true,
  fulfillmentStatus: "processing",
  disputeStatus: "none",
  transferStatus: "not_ready",
}));

function formatCurrency(value: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Recently";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function shortId(value?: string | null) {
  return value ? value.slice(0, 8) : "Unknown";
}

function getProfileName(profile?: ProfileRow, fallbackId?: string | null) {
  return profile?.full_name || profile?.username || shortId(fallbackId);
}

function isInspectionActive(value?: string | null) {
  return value ? new Date(value).getTime() > Date.now() : false;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderView[]>(mockOrderViews);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState("Demo orders");
  const [updatingOrderId, setUpdatingOrderId] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadOrders() {
      setIsLoading(true);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Orders auth session error:", sessionError);
      }

      if (!session?.user.id) {
        if (isMounted) {
          setOrders(mockOrderViews);
          setNotice("Sign in to view real orders. Showing demo orders.");
          setIsLoading(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .or(`buyer_id.eq.${session.user.id},seller_id.eq.${session.user.id}`)
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        const orderRows = (data || []) as SupabaseOrderRow[];
        const listingIds = Array.from(
          new Set(
            orderRows
              .map((order) => order.listing_id)
              .filter((listingId): listingId is string => Boolean(listingId)),
          ),
        );
        const listingsById = new Map<string, ListingRow>();
        const participantIds = Array.from(
          new Set(
            orderRows
              .flatMap((order) => [order.buyer_id, order.seller_id])
              .filter((profileId): profileId is string => Boolean(profileId)),
          ),
        );
        const profilesById = new Map<string, ProfileRow>();

        if (listingIds.length > 0) {
          const { data: listingData, error: listingError } = await supabase
            .from("listings")
            .select("id, title")
            .in("id", listingIds);

          if (listingError) {
            console.error("Orders listing fetch error:", listingError);
          } else {
            ((listingData || []) as ListingRow[]).forEach((listing) => {
              listingsById.set(listing.id, listing);
            });
          }
        }

        if (participantIds.length > 0) {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("id, full_name, username")
            .in("id", participantIds);

          if (profileError) {
            console.error("Orders profile fetch error:", profileError);
          } else {
            ((profileData || []) as ProfileRow[]).forEach((profile) => {
              profilesById.set(profile.id, profile);
            });
          }
        }

        if (!isMounted) {
          return;
        }

        if (orderRows.length === 0) {
          setOrders([]);
          setNotice("No real orders yet.");
          setIsLoading(false);
          return;
        }

        setOrders(
          orderRows.map((order) => {
            const listing = order.listing_id
              ? listingsById.get(order.listing_id)
              : undefined;
            const totalAmount = Number(order.total_amount || order.card_price || 0);
            const isSeller = order.seller_id === session.user.id;
            const isBuyer = order.buyer_id === session.user.id;

            return {
              id: order.id,
              cardTitle: listing?.title || "GRAIL Card",
              participantLabel: isSeller
                ? `Buyer: ${getProfileName(
                    order.buyer_id ? profilesById.get(order.buyer_id) : undefined,
                    order.buyer_id,
                  )}`
                : `Seller: ${getProfileName(
                    order.seller_id ? profilesById.get(order.seller_id) : undefined,
                    order.seller_id,
                  )}`,
              totalDisplay: formatCurrency(totalAmount),
              status: order.status || "paid",
              date: formatDate(order.created_at),
              href: order.listing_id ? `/cards/${order.listing_id}` : "/orders",
              isBuyer,
              fulfillmentStatus: order.fulfillment_status || "pending",
              disputeStatus: order.dispute_status || "none",
              transferStatus: order.transfer_status || "not_ready",
              inspectionEndsAt: order.inspection_ends_at,
            };
          }),
        );
        setNotice("Live Stripe orders");
      } catch (error) {
        console.error("Orders fetch error:", error);

        if (isMounted) {
          setOrders(mockOrderViews);
          setNotice("Real orders unavailable. Showing demo orders.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      isMounted = false;
    };
  }, []);

  async function openDispute(order: OrderView) {
    setUpdatingOrderId(order.id);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Orders dispute auth error:", sessionError);
    }

    if (!session?.user.id) {
      setNotice("Sign in to open a dispute.");
      setUpdatingOrderId("");
      return;
    }

    const { error } = await supabase
      .from("orders")
      .update({
        dispute_status: "opened",
        transfer_status: "blocked",
      })
      .eq("id", order.id)
      .eq("buyer_id", session.user.id);

    if (error) {
      console.error("Orders dispute update error:", {
        error,
        errorMessage: error.message,
        orderId: order.id,
      });
      setNotice("Dispute could not be opened. Check RLS policies and order columns.");
      setUpdatingOrderId("");
      return;
    }

    setOrders((items) =>
      items.map((item) =>
        item.id === order.id
          ? { ...item, disputeStatus: "opened", transferStatus: "blocked" }
          : item,
      ),
    );
    setNotice("Dispute opened. GRAIL review workflow coming next.");
    setUpdatingOrderId("");
  }

  return (
    <main className="orders-page">
      <style>{pageStyles}</style>
      <div className="orders-shell">
        <Header />

        <section className="page-heading">
          <div>
            <span>Orders</span>
            <h1>Orders</h1>
            <p>Order history for card purchases and shipping status.</p>
          </div>
          <Link href="/browse">Browse Cards</Link>
        </section>

        {notice ? <p className="orders-notice">{notice}</p> : null}

        <section className="orders-list panel">
          {isLoading ? <p className="empty-orders">Loading orders...</p> : null}

          {!isLoading && orders.length === 0 ? (
            <article className="empty-orders">
              <h2>No orders yet.</h2>
              <p>Completed Stripe test checkouts will appear here after the webhook records them.</p>
            </article>
          ) : null}

          {!isLoading ? orders.map((order) => {
            const canOpenDispute =
              order.isBuyer &&
              order.fulfillmentStatus === "delivered" &&
              order.disputeStatus === "none" &&
              isInspectionActive(order.inspectionEndsAt);

            return (
              <article key={order.id} className="order-row">
                <div>
                  <span>{order.id}</span>
                  <h2>{order.cardTitle}</h2>
                  <p>{order.participantLabel}</p>
                  <p>{order.date}</p>
                </div>
                <div className="order-status-stack">
                  <strong className={`status status-${order.status.toLowerCase()}`}>
                    {order.status}
                  </strong>
                  <span>{order.fulfillmentStatus}</span>
                  <span>Dispute: {order.disputeStatus}</span>
                </div>
                <strong>{order.totalDisplay}</strong>
                <div className="order-actions">
                  <Link href={order.href}>View Card</Link>
                  {canOpenDispute ? (
                    <button
                      type="button"
                      disabled={updatingOrderId === order.id}
                      onClick={() => openDispute(order)}
                    >
                      Open Dispute
                    </button>
                  ) : null}
                </div>
              </article>
            );
          }) : null}
        </section>
      </div>
    </main>
  );
}

const pageStyles = `
  .orders-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at 50% -120px, rgba(201,205,211,0.08), transparent 32%),
      linear-gradient(180deg, #000 0%, #030304 58%, #000 100%);
    color: #fafafa;
    font-family: Arial, Helvetica, sans-serif;
  }

  .orders-shell {
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

  .page-heading span,
  .order-row span {
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
  .order-row p,
  .orders-notice,
  .empty-orders p {
    color: #a1a1aa;
    font-size: 13px;
    line-height: 18px;
    font-weight: 800;
  }

  .orders-notice {
    margin: 14px 0 0;
    border: 1px solid rgba(201,205,211,0.16);
    border-radius: 10px;
    background: rgba(201,205,211,0.045);
    padding: 10px 12px;
  }

  .page-heading a,
  .order-row a,
  .order-actions button {
    border: 1px solid rgba(231,222,208,0.28);
    border-radius: 10px;
    background: rgba(231,222,208,0.055);
    color: #fff;
    min-height: 38px;
    padding: 0 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
  }

  .orders-list {
    margin-top: 18px;
    padding: 10px;
    display: grid;
    gap: 10px;
  }

  .order-row {
    border: 1px solid #202026;
    border-radius: 10px;
    background: rgba(8,8,10,0.76);
    padding: 14px;
    display: grid;
    grid-template-columns: 1fr auto auto auto;
    gap: 16px;
    align-items: center;
  }

  .order-row h2 {
    margin: 6px 0 0;
    color: #fff;
    font-size: 18px;
    line-height: 22px;
    font-weight: 900;
  }

  .order-row > strong {
    color: #fff;
    font-size: 16px;
    font-weight: 900;
  }

  .order-status-stack,
  .order-actions {
    display: grid;
    gap: 7px;
    justify-items: start;
  }

  .order-status-stack span {
    letter-spacing: 0;
  }

  .order-actions button:disabled {
    cursor: wait;
    opacity: 0.6;
  }

  .status {
    border: 1px solid rgba(201,205,211,0.28);
    border-radius: 999px;
    padding: 6px 10px;
    font-size: 10px;
    line-height: 12px;
    text-transform: uppercase;
  }

  .status-processing {
    color: #C9CDD3;
    background: rgba(201,205,211,0.08);
  }

  .status-paid {
    color: #86efac;
    background: rgba(52,211,153,0.08);
    border-color: rgba(52,211,153,0.24);
  }

  .status-shipped {
    color: #93c5fd;
    background: rgba(96,165,250,0.08);
    border-color: rgba(96,165,250,0.24);
  }

  .status-delivered {
    color: #86efac;
    background: rgba(52,211,153,0.08);
    border-color: rgba(52,211,153,0.24);
  }

  .empty-orders {
    margin: 0;
    padding: 22px;
  }

  .empty-orders h2 {
    margin: 0;
    color: #fff;
    font-size: 20px;
    line-height: 24px;
    font-weight: 900;
  }

  @media (max-width: 1100px) {
    .orders-shell {
      width: calc(100vw - 32px);
    }

    .page-heading,
    .order-row {
      grid-template-columns: 1fr;
    }

    .page-heading {
      display: grid;
      align-items: start;
    }
  }
`;
