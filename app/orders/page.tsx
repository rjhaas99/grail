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
  tracking_number?: string | null;
  carrier?: string | null;
  delivered_at?: string | null;
  dispute_status?: string | null;
  dispute_reason?: string | null;
  dispute_notes?: string | null;
  dispute_opened_at?: string | null;
  transfer_status?: string | null;
  inspection_ends_at?: string | null;
  inspection_completed_at?: string | null;
  completed_at?: string | null;
  refund_status?: string | null;
};

type ListingRow = {
  id: string;
  title: string | null;
};

type AuctionBidRow = {
  id: string;
  listing_id: string | null;
  amount: number | null;
  status: string | null;
  created_at: string | null;
};

type AuctionBidListingRow = {
  id: string;
  title: string | null;
  status: string | null;
  sale_format: string | null;
  auction_status: string | null;
  auction_current_bid: number | null;
  auction_winner_id: string | null;
  auction_payment_due_at: string | null;
  auction_ends_at: string | null;
  auction_bid_count: number | null;
  auction_reserve_met_at: string | null;
  reserve_fee_status: string | null;
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
  trackingNumber?: string;
  carrier?: string;
  deliveredAt?: string | null;
  disputeStatus?: string;
  disputeReason?: string | null;
  disputeNotes?: string | null;
  disputeOpenedAt?: string | null;
  transferStatus?: string;
  inspectionEndsAt?: string | null;
  inspectionCompletedAt?: string | null;
  completedAt?: string | null;
  refundStatus?: string;
};

type MyBidView = {
  id: string;
  listingId: string;
  cardTitle: string;
  amountDisplay: string;
  currentBidDisplay: string;
  status: string;
  statusDetail: string;
  date: string;
  paymentDueAt: string | null;
  href: string;
  canCompletePayment: boolean;
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
  trackingNumber: "",
  carrier: "",
  deliveredAt: null,
  disputeStatus: "none",
  disputeReason: null,
  disputeNotes: null,
  disputeOpenedAt: null,
  transferStatus: "not_ready",
  inspectionCompletedAt: null,
  completedAt: null,
  refundStatus: "none",
}));

const disputeReasons = [
  "Not received",
  "Damaged",
  "Not as described",
  "Suspected fake/counterfeit",
  "Wrong card",
  "Other",
];

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

function formatDateTime(value?: string | null) {
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

function shortId(value?: string | null) {
  return value ? value.slice(0, 8) : "Unknown";
}

function getProfileName(profile?: ProfileRow, fallbackId?: string | null) {
  return profile?.full_name || profile?.username || shortId(fallbackId);
}

function isInspectionActive(value?: string | null) {
  return value ? new Date(value).getTime() > Date.now() : false;
}

function getTrackingUrl(carrier?: string, trackingNumber?: string) {
  if (!carrier || !trackingNumber) {
    return "";
  }

  const encodedTracking = encodeURIComponent(trackingNumber);

  switch (carrier.toLowerCase()) {
    case "usps":
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodedTracking}`;
    case "ups":
      return `https://www.ups.com/track?tracknum=${encodedTracking}`;
    case "fedex":
      return `https://www.fedex.com/fedextrack/?trknbr=${encodedTracking}`;
    case "dhl":
      return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${encodedTracking}`;
    default:
      return "";
  }
}

function getInspectionStatus(order: OrderView) {
  if (order.refundStatus === "refunded" || order.transferStatus === "refunded") {
    return "Buyer refunded.";
  }

  if (order.transferStatus === "paid") {
    return "Order complete.";
  }

  if (["opened", "under_review"].includes(order.disputeStatus || "")) {
    return "Dispute opened. Payout blocked.";
  }

  if (order.fulfillmentStatus !== "delivered") {
    return "Waiting for delivery.";
  }

  if (isInspectionActive(order.inspectionEndsAt)) {
    return `Inspection window active until ${formatDateTime(order.inspectionEndsAt)}.`;
  }

  return "Inspection complete. Payout eligible.";
}

function getSimpleOrderStatus(order: OrderView) {
  if (order.refundStatus === "refunded" || order.transferStatus === "refunded") {
    return "Refunded";
  }

  if (order.transferStatus === "paid" || order.completedAt) {
    return "Complete";
  }

  if (["opened", "under_review"].includes(order.disputeStatus || "")) {
    return "Disputed";
  }

  if (order.fulfillmentStatus === "delivered") {
    return "Delivered / Inspecting";
  }

  if (order.fulfillmentStatus === "shipped") {
    return "Shipped";
  }

  return "Paid";
}

function getBidLifecycleStatus({
  bid,
  listing,
  currentUserId,
}: {
  bid: AuctionBidRow;
  listing: AuctionBidListingRow;
  currentUserId: string;
}) {
  const auctionStatus = listing.auction_status || "unknown";
  const bidAmount = Number(bid.amount || 0);
  const currentBid = Number(listing.auction_current_bid || 0);
  const isWinner = listing.auction_winner_id === currentUserId;

  if (auctionStatus === "active") {
    return bidAmount >= currentBid
      ? { status: "Current Bid", detail: "You currently have the highest bid." }
      : { status: "Outbid", detail: "Another collector currently has the highest bid." };
  }

  if (auctionStatus === "finalizing") {
    return {
      status: "Finalizing Auction",
      detail: "GRAIL is confirming the winning bid.",
    };
  }

  if (auctionStatus === "awaiting_payment") {
    return isWinner
      ? {
          status: "Payment Pending",
          detail: `Complete payment by ${formatDateTime(listing.auction_payment_due_at)}.`,
        }
      : { status: "Lost Auction", detail: "Another bidder won this auction." };
  }

  if (auctionStatus === "paid") {
    return isWinner
      ? { status: "Completed", detail: "Auction payment was completed." }
      : { status: "Lost Auction", detail: "Another bidder won this auction." };
  }

  if (auctionStatus === "payment_expired") {
    return isWinner
      ? {
          status: "Payment Expired",
          detail: "The 24-hour payment window expired.",
        }
      : { status: "Lost Auction", detail: "Another bidder won this auction." };
  }

  if (auctionStatus === "ended_reserve_not_met") {
    return {
      status: "Reserve Not Met",
      detail: "The auction ended below reserve. No sale occurred.",
    };
  }

  return { status: "Lost Auction", detail: "This auction has ended." };
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderView[]>(mockOrderViews);
  const [myBids, setMyBids] = useState<MyBidView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBids, setIsLoadingBids] = useState(true);
  const [notice, setNotice] = useState("Demo orders");
  const [updatingOrderId, setUpdatingOrderId] = useState("");
  const [startingAuctionCheckoutId, setStartingAuctionCheckoutId] = useState("");
  const [disputeOrder, setDisputeOrder] = useState<OrderView | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeNotes, setDisputeNotes] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<Record<string, File | null>>({});
  const [evidenceNotes, setEvidenceNotes] = useState<Record<string, string>>({});
  const [collapsedEvidenceUploads, setCollapsedEvidenceUploads] = useState<Record<string, boolean>>({});
  const [uploadingEvidenceId, setUploadingEvidenceId] = useState("");
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});

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
              trackingNumber: order.tracking_number || "",
              carrier: order.carrier || "",
              deliveredAt: order.delivered_at,
              disputeStatus: order.dispute_status || "none",
              disputeReason: order.dispute_reason,
              disputeNotes: order.dispute_notes,
              disputeOpenedAt: order.dispute_opened_at,
              transferStatus: order.transfer_status || "not_ready",
              inspectionEndsAt: order.inspection_ends_at,
              inspectionCompletedAt: order.inspection_completed_at,
              completedAt: order.completed_at,
              refundStatus: order.refund_status || "none",
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

  useEffect(() => {
    let isMounted = true;

    async function loadMyBids() {
      setIsLoadingBids(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user.id) {
        if (isMounted) {
          setMyBids([]);
          setIsLoadingBids(false);
        }
        return;
      }

      try {
        const { data: bidData, error: bidError } = await supabase
          .from("auction_bids")
          .select("id, listing_id, amount, status, created_at")
          .eq("bidder_id", session.user.id)
          .eq("status", "valid")
          .order("created_at", { ascending: false });

        if (bidError) {
          throw bidError;
        }

        const bids = (bidData || []) as AuctionBidRow[];
        const latestBidByListing = new Map<string, AuctionBidRow>();

        bids.forEach((bid) => {
          if (!bid.listing_id) {
            return;
          }

          const existing = latestBidByListing.get(bid.listing_id);

          if (!existing || Number(bid.amount || 0) > Number(existing.amount || 0)) {
            latestBidByListing.set(bid.listing_id, bid);
          }
        });

        const listingIds = Array.from(latestBidByListing.keys());

        if (listingIds.length === 0) {
          if (isMounted) {
            setMyBids([]);
          }
          return;
        }

        const { data: listingData, error: listingError } = await supabase
          .from("listings")
          .select(
            "id, title, status, sale_format, auction_status, auction_current_bid, auction_winner_id, auction_payment_due_at, auction_ends_at, auction_bid_count, auction_reserve_met_at, reserve_fee_status",
          )
          .in("id", listingIds);

        if (listingError) {
          throw listingError;
        }

        const listingsById = new Map<string, AuctionBidListingRow>();
        ((listingData || []) as AuctionBidListingRow[]).forEach((listing) => {
          listingsById.set(listing.id, listing);
        });

        const views = Array.from(latestBidByListing.entries())
          .map(([listingId, bid]) => {
            const listing = listingsById.get(listingId);

            if (!listing || listing.sale_format !== "auction") {
              return null;
            }

            const lifecycle = getBidLifecycleStatus({
              bid,
              listing,
              currentUserId: session.user.id,
            });

            return {
              id: bid.id,
              listingId,
              cardTitle: listing.title || "GRAIL Auction",
              amountDisplay: formatCurrency(Number(bid.amount || 0)),
              currentBidDisplay: formatCurrency(Number(listing.auction_current_bid || 0)),
              status: lifecycle.status,
              statusDetail: lifecycle.detail,
              date: formatDate(bid.created_at),
              paymentDueAt: listing.auction_payment_due_at,
              href: `/cards/${listingId}`,
              canCompletePayment:
                listing.auction_status === "awaiting_payment" &&
                listing.auction_winner_id === session.user.id,
            } satisfies MyBidView;
          })
          .filter((view): view is MyBidView => Boolean(view));

        if (isMounted) {
          setMyBids(views);
        }
      } catch (error) {
        console.error("Orders My Bids fetch error:", error);

        if (isMounted) {
          setMyBids([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingBids(false);
        }
      }
    }

    loadMyBids();

    return () => {
      isMounted = false;
    };
  }, []);

  function openDispute(order: OrderView) {
    setDisputeOrder(order);
    setDisputeReason("");
    setDisputeNotes("");
    setNotice("");
  }

  async function sendSystemNotification(kind: "dispute_opened", orderId: string) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return;
    }

    try {
      await fetch("/api/notifications/system", {
        method: "POST",
        headers: {
          authorization: `Bearer ${session.access_token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ kind, orderId }),
      });
    } catch (error) {
      console.warn("Order system notification skipped:", error);
    }
  }

  async function startAuctionCheckout(listingId: string) {
    setStartingAuctionCheckoutId(listingId);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setNotice("Sign in to complete auction payment.");
      setStartingAuctionCheckoutId("");
      return;
    }

    try {
      const response = await fetch(`/api/auctions/${listingId}/checkout`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${session.access_token}`,
        },
      });
      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Auction checkout could not be started.");
      }

      window.location.assign(payload.url);
    } catch (error) {
      console.error("Orders auction checkout error:", error);
      setNotice(error instanceof Error ? error.message : "Auction checkout could not be started.");
      setStartingAuctionCheckoutId("");
    }
  }

  async function approveInspection(order: OrderView) {
    setUpdatingOrderId(order.id);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Approve inspection auth error:", sessionError);
    }

    if (!session?.access_token) {
      setNotice("Sign in to approve inspection.");
      setUpdatingOrderId("");
      return;
    }

    try {
      const response = await fetch("/api/orders/approve-inspection", {
        method: "POST",
        headers: {
          authorization: `Bearer ${session.access_token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ orderId: order.id }),
      });
      const payload = (await response.json()) as {
        order?: {
          inspection_completed_at?: string;
          inspection_ends_at?: string;
          transfer_status?: string;
          completed_at?: string | null;
        };
        payout?: {
          status?: "paid" | "queued" | "not_ready";
        };
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Inspection approval failed.");
      }

      setOrders((items) =>
        items.map((item) =>
          item.id === order.id
            ? {
                ...item,
                inspectionCompletedAt: payload.order?.inspection_completed_at,
                inspectionEndsAt: payload.order?.inspection_ends_at,
                transferStatus: payload.order?.transfer_status || "ready",
                completedAt: payload.order?.completed_at || item.completedAt,
              }
            : item,
        ),
      );
      setNotice(
        payload.payout?.status === "paid"
          ? "Order approved. Seller payout was sent and the order is complete."
          : "Inspection complete. Seller payout is queued.",
      );
    } catch (error) {
      console.error("Approve inspection error:", error);
      setNotice(
        error instanceof Error
          ? error.message
          : "Inspection approval could not be saved.",
      );
    } finally {
      setUpdatingOrderId("");
    }
  }

  async function submitDispute() {
    if (!disputeOrder) {
      return;
    }

    if (!disputeReason || !disputeNotes.trim()) {
      setNotice("Choose a dispute reason and describe the issue.");
      return;
    }

    const order = disputeOrder;
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

    const canOpenDispute =
      order.isBuyer &&
      order.fulfillmentStatus === "delivered" &&
      Boolean(order.inspectionEndsAt) &&
      isInspectionActive(order.inspectionEndsAt) &&
      order.disputeStatus === "none" &&
      order.transferStatus !== "paid";

    if (!canOpenDispute) {
      setNotice("This order is not eligible for a dispute.");
      setUpdatingOrderId("");
      return;
    }

    const disputeOpenedAt = new Date().toISOString();
    const { error } = await supabase
      .from("orders")
      .update({
        dispute_status: "opened",
        transfer_status: "blocked",
        dispute_reason: disputeReason,
        dispute_notes: disputeNotes.trim(),
        dispute_opened_at: disputeOpenedAt,
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
          ? {
              ...item,
              disputeStatus: "opened",
              disputeReason,
              disputeNotes: disputeNotes.trim(),
              disputeOpenedAt,
              transferStatus: "blocked",
            }
          : item,
      ),
    );
    setDisputeOrder(null);
    setDisputeReason("");
    setDisputeNotes("");
    setNotice("Dispute opened. GRAIL review workflow coming next.");
    void sendSystemNotification("dispute_opened", order.id);
    setUpdatingOrderId("");
  }

  async function uploadEvidence(order: OrderView) {
    const file = evidenceFiles[order.id];

    if (!file) {
      setNotice("Choose an evidence image before uploading.");
      return;
    }

    if (!["opened", "under_review"].includes(order.disputeStatus || "")) {
      setNotice("Evidence can only be uploaded while a dispute is open or under review.");
      return;
    }

    setUploadingEvidenceId(order.id);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Orders evidence auth error:", sessionError);
    }

    if (!session?.user.id) {
      setNotice("Sign in to upload dispute evidence.");
      setUploadingEvidenceId("");
      return;
    }

    const formData = new FormData();
    formData.append("orderId", order.id);
    formData.append("note", evidenceNotes[order.id]?.trim() || "");
    formData.append("file", file);

    const response = await fetch("/api/disputes/evidence/upload", {
      method: "POST",
      headers: {
        authorization: `Bearer ${session.access_token}`,
      },
      body: formData,
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      console.error("Orders evidence API upload error:", {
        error: payload.error,
        orderId: order.id,
        fileName: file.name,
      });
      setNotice(payload.error || "Evidence upload failed.");
      setUploadingEvidenceId("");
      return;
    }

    setEvidenceFiles((items) => ({ ...items, [order.id]: null }));
    setEvidenceNotes((items) => ({ ...items, [order.id]: "" }));
    setCollapsedEvidenceUploads((items) => ({ ...items, [order.id]: true }));
    setNotice("Evidence uploaded.");
    setUploadingEvidenceId("");
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

        <section className="orders-list panel my-bids-panel" aria-labelledby="my-bids-title">
          <div className="orders-section-heading">
            <div>
              <span>Auctions</span>
              <h2 id="my-bids-title">My Bids</h2>
              <p>Track current bids, won auctions, payment pending auctions, and completed auction purchases.</p>
            </div>
          </div>

          {isLoadingBids ? <p className="empty-orders">Loading bids...</p> : null}

          {!isLoadingBids && myBids.length === 0 ? (
            <article className="empty-orders">
              <h2>No auction bids yet.</h2>
              <p>Your active, won, lost, and payment pending auction bids will appear here.</p>
            </article>
          ) : null}

          {!isLoadingBids
            ? myBids.map((bid) => (
                <article key={bid.id} className="order-row bid-row">
                  <div>
                    <span>{bid.listingId}</span>
                    <h2>{bid.cardTitle}</h2>
                    <p>Your bid: {bid.amountDisplay}</p>
                    <p>{bid.date}</p>
                  </div>
                  <div className="order-status-stack">
                    <strong className={`status status-${bid.status.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
                      {bid.status}
                    </strong>
                    <span>{bid.currentBidDisplay} current bid</span>
                  </div>
                  <p className="order-summary-note">{bid.statusDetail}</p>
                  <div className="order-actions">
                    <Link href={bid.href}>View Auction</Link>
                    {bid.canCompletePayment ? (
                      <button
                        type="button"
                        disabled={startingAuctionCheckoutId === bid.listingId}
                        onClick={() => startAuctionCheckout(bid.listingId)}
                      >
                        {startingAuctionCheckoutId === bid.listingId
                          ? "Opening Checkout..."
                          : "Complete Payment"}
                      </button>
                    ) : null}
                  </div>
                </article>
              ))
            : null}
        </section>

        <section className="orders-list panel">
          {isLoading ? <p className="empty-orders">Loading orders...</p> : null}

          {!isLoading && orders.length === 0 ? (
            <article className="empty-orders">
              <h2>No orders yet.</h2>
              <p>Completed Stripe test checkouts will appear here after the webhook records them.</p>
            </article>
          ) : null}

          {!isLoading ? orders.map((order) => {
            const trackingUrl = getTrackingUrl(order.carrier, order.trackingNumber);
            const simpleStatus = getSimpleOrderStatus(order);
            const isExpanded = Boolean(expandedOrderIds[order.id]);
            const canOpenDispute =
              order.isBuyer &&
              order.fulfillmentStatus === "delivered" &&
              Boolean(order.inspectionEndsAt) &&
              order.disputeStatus === "none" &&
              order.transferStatus !== "paid" &&
              order.transferStatus !== "refunded" &&
              order.refundStatus !== "refunded" &&
              isInspectionActive(order.inspectionEndsAt);
            const canApproveInspection =
              order.isBuyer &&
              order.fulfillmentStatus === "delivered" &&
              order.disputeStatus === "none" &&
              !["paid", "refunded", "ready"].includes(order.transferStatus || "") &&
              order.refundStatus !== "refunded";
            const canUploadEvidence =
              order.isBuyer &&
              ["opened", "under_review"].includes(order.disputeStatus || "");
            const showEvidenceUpload =
              canUploadEvidence && !collapsedEvidenceUploads[order.id];

            return (
              <article key={order.id} className="order-row">
                <div>
                  <span>{order.id}</span>
                  <h2>{order.cardTitle}</h2>
                  <p>{order.participantLabel}</p>
                  <p>{order.date}</p>
                </div>
                <div className="order-status-stack">
                  <strong className={`status status-${simpleStatus.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
                    {simpleStatus}
                  </strong>
                  {order.refundStatus === "refunded" ? (
                    <span>Refund processed</span>
                  ) : null}
                </div>
                <p className="order-summary-note">{getInspectionStatus(order)}</p>
                <strong>{order.totalDisplay}</strong>
                <div className="order-actions">
                  <Link href={order.href}>View Card</Link>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedOrderIds((items) => ({
                        ...items,
                        [order.id]: !items[order.id],
                      }))
                    }
                  >
                    {isExpanded ? "Hide Details" : "View Details"}
                  </button>
                  {canApproveInspection ? (
                    <button
                      type="button"
                      disabled={updatingOrderId === order.id}
                      onClick={() => approveInspection(order)}
                    >
                      Mark as Inspected
                    </button>
                  ) : null}
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
                {isExpanded ? (
                  <div className="order-detail-panel">
                    <span>{order.carrier ? `Carrier: ${order.carrier}` : "Carrier pending"}</span>
                    <span>
                      {order.trackingNumber
                        ? `Tracking: ${order.trackingNumber}`
                        : "Tracking pending"}
                    </span>
                    {trackingUrl ? (
                      <a href={trackingUrl} target="_blank" rel="noreferrer">
                        Track Package
                      </a>
                    ) : null}
                    <span>Delivered: {formatDate(order.deliveredAt)}</span>
                    <span>Fulfillment: {order.fulfillmentStatus}</span>
                    <span>Dispute: {order.disputeStatus}</span>
                    <span>Refund: {order.refundStatus || "none"}</span>
                    <span>Inspection: {getInspectionStatus(order)}</span>
                  </div>
                ) : null}
                {showEvidenceUpload ? (
                  <div className="evidence-upload">
                    <span>Upload Evidence</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        setEvidenceFiles((items) => ({
                          ...items,
                          [order.id]: event.target.files?.[0] || null,
                        }))
                      }
                    />
                    <textarea
                      value={evidenceNotes[order.id] || ""}
                      onChange={(event) =>
                        setEvidenceNotes((items) => ({
                          ...items,
                          [order.id]: event.target.value,
                        }))
                      }
                      placeholder="Optional evidence note"
                    />
                    <button
                      type="button"
                      disabled={uploadingEvidenceId === order.id}
                      onClick={() => uploadEvidence(order)}
                    >
                      Upload Evidence
                    </button>
                  </div>
                ) : null}
              </article>
            );
          }) : null}
        </section>
      </div>
      {disputeOrder ? (
        <div className="modal-backdrop" role="presentation">
          <section className="panel dispute-modal" role="dialog" aria-modal="true">
            <div className="modal-heading">
              <div>
                <span>Open Dispute</span>
                <h2>{disputeOrder.cardTitle}</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDisputeOrder(null);
                  setDisputeReason("");
                  setDisputeNotes("");
                }}
              >
                Close
              </button>
            </div>
            <label>
              <span>Reason</span>
              <select
                value={disputeReason}
                onChange={(event) => setDisputeReason(event.target.value)}
              >
                <option value="">Select a reason</option>
                {disputeReasons.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Describe the issue</span>
              <textarea
                value={disputeNotes}
                onChange={(event) => setDisputeNotes(event.target.value)}
                placeholder="Tell GRAIL what happened with this order."
              />
            </label>
            <div className="order-actions">
              <button
                type="button"
                disabled={updatingOrderId === disputeOrder.id}
                onClick={submitDispute}
              >
                Submit Dispute
              </button>
              <button
                type="button"
                disabled={updatingOrderId === disputeOrder.id}
                onClick={() => {
                  setDisputeOrder(null);
                  setDisputeReason("");
                  setDisputeNotes("");
                }}
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      ) : null}
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

  .orders-section-heading {
    padding: 10px 10px 4px;
  }

  .orders-section-heading span {
    color: #C9CDD3;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .orders-section-heading h2 {
    margin: 6px 0 0;
    color: #fff;
    font-size: 22px;
    line-height: 27px;
    font-weight: 900;
  }

  .orders-section-heading p {
    margin: 6px 0 0;
    color: #a1a1aa;
    font-size: 13px;
    line-height: 18px;
    font-weight: 800;
  }

  .order-row {
    border: 1px solid #202026;
    border-radius: 10px;
    background: rgba(8,8,10,0.76);
    padding: 14px;
    display: grid;
    grid-template-columns: minmax(220px, 1fr) 140px minmax(190px, 0.8fr) auto auto;
    gap: 16px;
    align-items: center;
  }

  .bid-row {
    grid-template-columns: minmax(220px, 1fr) 150px minmax(220px, 1fr) auto;
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
  .order-shipping-stack,
  .order-actions {
    display: grid;
    gap: 7px;
    justify-items: start;
  }

  .order-status-stack span,
  .order-shipping-stack span {
    letter-spacing: 0;
  }

  .order-shipping-stack a {
    min-height: 30px;
    padding: 0 10px;
    font-size: 11px;
  }

  .order-summary-note {
    margin: 0;
    color: #a1a1aa;
    font-size: 12px;
    line-height: 17px;
    font-weight: 800;
  }

  .order-detail-panel {
    grid-column: 1 / -1;
    border: 1px solid rgba(201,205,211,0.12);
    border-radius: 10px;
    background: rgba(201,205,211,0.035);
    padding: 10px;
    display: flex;
    gap: 9px;
    align-items: center;
    flex-wrap: wrap;
  }

  .order-detail-panel span,
  .order-detail-panel a {
    border: 1px solid rgba(201,205,211,0.14);
    border-radius: 999px;
    background: rgba(8,8,10,0.62);
    color: #C9CDD3;
    min-height: 30px;
    padding: 0 10px;
    display: inline-flex;
    align-items: center;
    text-decoration: none;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0;
    text-transform: none;
  }

  .evidence-upload {
    grid-column: 1 / -1;
    border: 1px solid rgba(201,205,211,0.12);
    border-radius: 10px;
    background: rgba(201,205,211,0.035);
    padding: 10px;
    display: grid;
    grid-template-columns: minmax(160px, 0.4fr) minmax(220px, 1fr) auto;
    gap: 9px;
    align-items: center;
  }

  .evidence-upload span {
    color: #C9CDD3;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .evidence-upload input,
  .evidence-upload textarea {
    border: 1px solid #202026;
    border-radius: 10px;
    background: rgba(8,8,10,0.84);
    color: #fff;
    padding: 9px 10px;
    font-size: 12px;
    font-weight: 800;
  }

  .evidence-upload textarea {
    min-height: 42px;
    resize: vertical;
  }

  .evidence-upload button {
    border: 1px solid rgba(231,222,208,0.28);
    border-radius: 10px;
    background: rgba(231,222,208,0.055);
    color: #fff;
    min-height: 38px;
    padding: 0 12px;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
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

  .status-current-bid,
  .status-payment-pending,
  .status-finalizing-auction {
    color: #E7DED0;
    background: rgba(231,222,208,0.08);
    border-color: rgba(231,222,208,0.28);
  }

  .status-outbid,
  .status-lost-auction,
  .status-payment-expired,
  .status-reserve-not-met {
    color: #C9CDD3;
    background: rgba(201,205,211,0.06);
    border-color: rgba(201,205,211,0.18);
  }

  .status-completed {
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

  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 70;
    background: rgba(0,0,0,0.72);
    display: grid;
    place-items: center;
    padding: 18px;
  }

  .dispute-modal {
    width: min(480px, 100%);
    padding: 16px;
    display: grid;
    gap: 12px;
  }

  .modal-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .modal-heading span,
  .dispute-modal label span {
    color: #C9CDD3;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .modal-heading h2 {
    margin: 5px 0 0;
    color: #fff;
    font-size: 18px;
    line-height: 22px;
    font-weight: 900;
  }

  .modal-heading button {
    border: 1px solid rgba(231,222,208,0.24);
    border-radius: 999px;
    background: rgba(231,222,208,0.055);
    color: #fff;
    min-height: 32px;
    padding: 0 11px;
    font-size: 11px;
    font-weight: 900;
    cursor: pointer;
  }

  .dispute-modal label {
    display: grid;
    gap: 7px;
  }

  .dispute-modal select,
  .dispute-modal textarea {
    border: 1px solid #202026;
    border-radius: 10px;
    background: rgba(8,8,10,0.84);
    color: #fff;
    padding: 10px 11px;
    font-size: 13px;
    font-weight: 800;
  }

  .dispute-modal textarea {
    min-height: 110px;
    resize: vertical;
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
