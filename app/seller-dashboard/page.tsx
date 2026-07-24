"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "../../lib/supabase";
import CollectorLevelBadge from "../components/CollectorLevelBadge";
import GrailPassPresenceCard from "../components/GrailPassPresenceCard";
import PageShell from "../components/PageShell";
import type { GrailPassMembership } from "../lib/grailPass";
import { mockSellerDashboardData } from "../lib/mockData";
import {
  calculateProgression,
  getNextProgressionRank,
  type ProgressionSummary,
} from "../lib/progression";
import {
  formatOrderShippingAddress,
  normalizeOrderShippingAddress,
  type OrderShippingAddress,
} from "../lib/shippingAddresses";
import { getShippingProfile } from "../lib/shippingProfiles";

type OfferStatus = "Pending" | "Accepted" | "Countered" | "Declined" | "Withdrawn" | "Expired" | "Completed";
type OrderStatus = "Processing" | "Shipped" | "Paid";
type RewardTier = {
  rankName: string;
  sellerFeePercent: number;
  buyerBasePercent: number;
  sellerBasePercent: number;
  buyerMultiplier: number;
  sellerMultiplier: number;
  buyerRewardPercent: number;
  sellerRewardPercent: number;
  xpMultiplier: number;
  walletMultiplier: number;
};
type RewardsMarketplace = {
  currentEvent?: { eventName: string } | null;
  upcomingEvent?: { eventName: string } | null;
  marketplaceStatus?: string;
  currentMarketplaceState?: string;
  currentMultipliers?: {
    buyerMultiplier: number;
    sellerMultiplier: number;
    xpMultiplier: number;
    walletMultiplier: number;
    treasureMultiplier: number;
    challengeMultiplier: number;
  };
  currentCountdown?: {
    label: string;
    status: string;
  };
};
type GrailPassResponse = {
  membership?: GrailPassMembership;
};
type WalletSummary = {
  availableCredit: number;
  pendingCredit: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
};
type WalletLedgerEntry = {
  id: string;
  amount: number;
  title: string;
  createdAt: string | null;
};
type DashboardOffer = {
  id: string;
  listingId: string;
  card: string;
  buyer: string;
  offer: string;
  asking: string;
  minimumOffer: string;
  numericOffer: number;
  numericAsking: number;
  createdAt?: string | null;
  status: OfferStatus;
  href: string;
};
type ApiOffer = {
  id: string;
  listingId?: string | null;
  cardTitle: string;
  cardHref: string;
  buyerName: string;
  amount: number;
  askingPrice: number;
  statusLabel: OfferStatus;
  status: string;
  role: "buyer" | "seller";
  createdAt?: string | null;
};
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
  refundStatus: string;
  autoReleaseError?: string | null;
  completedAt?: string | null;
  disputeStatus: string;
  disputeReason?: string | null;
  disputeNotes?: string | null;
  disputeOpenedAt?: string | null;
  trackingNumber: string;
  carrier: string;
  shippingStatus: string;
  shippingService: string;
  shippingProfileId: string;
  shippingProfileLabel: string;
  shippingTrackingSupported: boolean;
  shippingLabelRequired: boolean;
  labelUrl?: string | null;
  labelCost: number;
  shippoEta?: string | null;
  shippoTrackingUrl?: string | null;
  deliveredAt?: string | null;
  inspectionEndsAt?: string | null;
  sellerPayoutAmount: number;
  cardPrice: number;
  sellerFee: number;
  paymentProcessingFee: number;
  shippingAddress?: OrderShippingAddress | null;
  imageUrl?: string | null;
  href?: string;
  listingStatus?: string | null;
  isCollectionOnly?: boolean;
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
  shipping_status?: string | null;
  shipping_service?: string | null;
  shipping_profile_id?: string | null;
  shipping_profile_label?: string | null;
  shipping_tracking_supported?: boolean | null;
  shipping_label_required?: boolean | null;
  shipping_to_address?: Record<string, unknown> | null;
  label_url?: string | null;
  label_cost?: number | string | null;
  shippo_eta?: string | null;
  shippo_tracking_url?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  inspection_ends_at?: string | null;
  dispute_status?: string | null;
  dispute_reason?: string | null;
  dispute_notes?: string | null;
  dispute_opened_at?: string | null;
  seller_payout_amount?: number | null;
  platform_fee?: number | null;
  processing_fee?: number | null;
  transfer_status?: string | null;
  stripe_transfer_id?: string | null;
  payout_released_at?: string | null;
  refund_status?: string | null;
  auto_release_error?: string | null;
  completed_at?: string | null;
};
type ListingRow = {
  id: string;
  title: string | null;
  status?: string | null;
  is_collection_card?: boolean | null;
  is_public_collection?: boolean | null;
  listing_images?: Array<{
    image_url: string | null;
    image_type: string | null;
  }> | null;
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
type AuctionDashboardListing = {
  id: string;
  title: string;
  auctionStatus: string;
  status: string;
  currentBid: number;
  startingBid: number;
  bidCount: number;
  endsAt?: string | null;
  reserveStatus: string;
  reserveFeeStatus: string;
  paymentDueAt?: string | null;
  buyerName?: string;
  href: string;
};
type ActiveListingView = {
  id: string;
  card: string;
  player: string;
  year: string;
  brand: string;
  cardNumber: string;
  category: string;
  cardType: string;
  condition: string;
  price: string;
  numericPrice: number;
  market: string;
  numericMarket: number;
  status: string;
  href: string;
  imageUrl: string | null;
  watchCount: number;
  offerCount: number;
  messageActivity: number;
  checkoutStarts: number;
  timeListedDays: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  isRaw: boolean;
  isGraded: boolean;
  isHot: boolean;
  isCollectionOnly: boolean;
};
type ActiveListingRow = {
  id: string;
  title: string | null;
  sport?: string | null;
  player?: string | null;
  year?: string | null;
  brand?: string | null;
  card_number?: string | null;
  card_type?: string | null;
  grader?: string | null;
  grade?: string | null;
  condition?: string | null;
  price: number | null;
  status: string | null;
  estimated_value?: number | null;
  sportscardspro_estimated_value?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  is_collection_card?: boolean | null;
  is_public_collection?: boolean | null;
  listing_images?: Array<{
    image_url: string | null;
    image_type: string | null;
  }> | null;
};
type ListingAnalyticsRow = {
  listingId: string;
  watchCount: number;
  offerCount: number;
  messageActivity: number;
  checkoutStarts: number;
  timeListedDays: number | null;
};

type ShippingLabelForm = {
  fromName: string;
  fromStreet1: string;
  fromStreet2: string;
  fromCity: string;
  fromState: string;
  fromZip: string;
  fromPhone: string;
  fromEmail: string;
  parcelLength: string;
  parcelWidth: string;
  parcelHeight: string;
  parcelWeight: string;
};

type SellerDashboardTab =
  | "all"
  | "active"
  | "auctions"
  | "offers"
  | "payment"
  | "ready"
  | "sold"
  | "completed"
  | "drafts";
type SellerDashboardViewMode = "grid" | "compact";
type SellerDashboardFilter =
  | "raw"
  | "graded"
  | "sports"
  | "tcg"
  | "hot";
type SellerDashboardSortMode =
  | "recently_updated"
  | "highest_value"
  | "lowest_value"
  | "newest"
  | "oldest";

type SellerDraft = {
  id: string;
  title: string;
  imagePreview?: string;
  createdAt?: string;
  updatedAt?: string;
};

const dashboardViewStorageKey = "grail-seller-dashboard-view";
const sellerDashboardDraftStorageKey = "grail-listing-drafts";
const dashboardPageSize = 24;
const compactDashboardPageSize = 40;

const sellerDashboardTabs: Array<{
  id: SellerDashboardTab;
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "active", label: "Active Listings" },
  { id: "auctions", label: "Auctions" },
  { id: "offers", label: "Incoming Offers" },
  { id: "payment", label: "Payment Pending" },
  { id: "ready", label: "Ready To Ship" },
  { id: "sold", label: "Recent Sold" },
  { id: "completed", label: "Completed" },
  { id: "drafts", label: "Drafts" },
];

const sellerDashboardFilters: Array<{
  id: SellerDashboardFilter;
  label: string;
}> = [
  { id: "raw", label: "Raw" },
  { id: "graded", label: "Graded" },
  { id: "sports", label: "Sports" },
  { id: "tcg", label: "TCG" },
  { id: "hot", label: "Hot" },
];

const sellerDashboardSortOptions: Array<{
  id: SellerDashboardSortMode;
  label: string;
}> = [
  { id: "recently_updated", label: "Recently Updated" },
  { id: "highest_value", label: "Highest Value" },
  { id: "lowest_value", label: "Lowest Value" },
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
];

const initialOffers: DashboardOffer[] = [];
const initialOrders = mockSellerDashboardData.recentOrders.map((order) => ({
  ...order,
  status: order.status as OrderStatus,
  payoutDisplay: order.total,
  orderDate: order.shipBy,
  fulfillmentStatus: "pending",
  transferStatus: "not_ready",
  refundStatus: "none",
  autoReleaseError: null,
  completedAt: null,
  disputeStatus: "none",
  disputeReason: null,
  disputeNotes: null,
  disputeOpenedAt: null,
  trackingNumber: "",
  carrier: "",
  shippingStatus: "pending",
  shippingService: "",
  shippingProfileId: "usps_ground_advantage",
  shippingProfileLabel: "USPS Ground Advantage",
  shippingTrackingSupported: true,
  shippingLabelRequired: true,
  labelUrl: null,
  labelCost: 0,
  shippoEta: null,
  shippoTrackingUrl: null,
  deliveredAt: null,
  sellerPayoutAmount: 0,
  cardPrice: 0,
  sellerFee: 0,
  paymentProcessingFee: 0,
  shippingAddress: null,
}));

const defaultShippingLabelForm: ShippingLabelForm = {
  fromName: "",
  fromStreet1: "",
  fromStreet2: "",
  fromCity: "",
  fromState: "",
  fromZip: "",
  fromPhone: "",
  fromEmail: "",
  parcelLength: "7",
  parcelWidth: "5",
  parcelHeight: "1",
  parcelWeight: "8",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value?: number | null) {
  if (value === null || value === undefined) {
    return "Pending";
  }

  return `${Number(value).toFixed(2)}%`;
}

function shortId(value?: string | null) {
  return value ? value.slice(0, 8) : "Unknown";
}

function getProfileName(profile?: ProfileRow, fallbackId?: string | null) {
  return profile?.full_name || profile?.username || shortId(fallbackId);
}

function getListingFrontImage(listing?: ListingRow | null) {
  return (
    listing?.listing_images?.find((image) => image.image_type === "front")?.image_url ||
    listing?.listing_images?.find((image) => Boolean(image.image_url))?.image_url ||
    null
  );
}

function getAnyListingFrontImage(listing?: {
  listing_images?: Array<{
    image_url: string | null;
    image_type: string | null;
  }> | null;
} | null) {
  return (
    listing?.listing_images?.find((image) => image.image_type === "front")?.image_url ||
    listing?.listing_images?.find((image) => Boolean(image.image_url))?.image_url ||
    null
  );
}

function getCardConditionDisplay(listing: ActiveListingRow) {
  if (listing.grader && listing.grade) {
    return `${listing.grader} ${listing.grade}`;
  }

  if (listing.condition) {
    return listing.condition.toLowerCase().includes("raw")
      ? listing.condition
      : `Raw ${listing.condition}`;
  }

  return listing.card_type?.toLowerCase() === "graded" ? "Graded" : "Raw";
}

function getSellerDashboardViewPreference(): SellerDashboardViewMode {
  if (typeof window === "undefined") {
    return "grid";
  }

  return window.localStorage.getItem(dashboardViewStorageKey) === "compact"
    ? "compact"
    : "grid";
}

function readSellerDrafts(): SellerDraft[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedDrafts = window.localStorage.getItem(sellerDashboardDraftStorageKey);
    const parsedDrafts = storedDrafts ? JSON.parse(storedDrafts) : [];

    return Array.isArray(parsedDrafts)
      ? parsedDrafts
          .map((draft) => {
            const record = draft as Partial<SellerDraft> & {
              title?: unknown;
              id?: unknown;
            };

            return {
              id: typeof record.id === "string" ? record.id : "",
              title:
                typeof record.title === "string" && record.title.trim()
                  ? record.title
                  : "Untitled Draft",
              imagePreview:
                typeof record.imagePreview === "string"
                  ? record.imagePreview
                  : undefined,
              createdAt:
                typeof record.createdAt === "string"
                  ? record.createdAt
                  : undefined,
              updatedAt:
                typeof record.updatedAt === "string"
                  ? record.updatedAt
                  : undefined,
            };
          })
          .filter((draft) => Boolean(draft.id))
      : [];
  } catch (error) {
    console.warn("Seller dashboard drafts could not be read:", error);
    return [];
  }
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

function formatAuctionTime(value?: string | null) {
  if (!value) {
    return "No end time";
  }

  const remaining = new Date(value).getTime() - Date.now();

  if (remaining <= 0) {
    return `Ended ${formatDateTime(value)}`;
  }

  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

  if (days > 0) {
    return `${days}d ${hours}h remaining`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }

  return `${Math.max(minutes, 1)}m remaining`;
}

function getAuctionReserveStatus(row: {
  reserve_fee_status?: string | null;
  auction_reserve_met_at?: string | null;
}) {
  if (!row.reserve_fee_status || row.reserve_fee_status === "none") {
    return "No Reserve";
  }

  return row.auction_reserve_met_at ? "Reserve Met" : "Reserve Not Met";
}

function hasInspectionPassed(value?: string | null) {
  return Boolean(value && new Date(value).getTime() <= Date.now());
}

function getInspectionStatus(order: DashboardOrder) {
  if (order.refundStatus === "refunded" || order.transferStatus === "refunded") {
    return "Buyer refunded. Payout not released.";
  }

  if (order.transferStatus === "paid") {
    return "Complete.";
  }

  if (["opened", "under_review"].includes(order.disputeStatus)) {
    return "Dispute opened. Payout blocked.";
  }

  if (!order.shippingLabelRequired && order.shippingStatus === "mailed") {
    return "Mailed by Plain White Envelope. No tracking is included.";
  }

  if (!order.shippingLabelRequired && order.fulfillmentStatus === "pending") {
    return "Paid. Mark the Plain White Envelope mailed when it is sent.";
  }

  if (!order.labelUrl) {
    return "Paid. Purchase a shipping label to ship this order.";
  }

  if (order.shippingStatus === "label_created") {
    return "Ready to print label.";
  }

  if (order.shippingStatus === "in_transit") {
    return "Shipped. Package is in transit.";
  }

  if (order.shippingStatus === "out_for_delivery") {
    return "Out for delivery.";
  }

  if (order.shippingStatus === "delivery_exception" || order.shippingStatus === "returned") {
    return "Delivery issue reported. Review tracking.";
  }

  if (order.fulfillmentStatus !== "delivered") {
    return "Shipping label created. Tracking will update automatically.";
  }

  if (order.inspectionEndsAt && !hasInspectionPassed(order.inspectionEndsAt)) {
    return `Inspection window active until ${formatDateTime(order.inspectionEndsAt)}.`;
  }

  return "Inspection complete. Payout eligible.";
}

function getSellerOrderStatus(order: DashboardOrder) {
  if (order.refundStatus === "refunded" || order.transferStatus === "refunded") {
    return "Refunded";
  }

  if (order.transferStatus === "paid" || order.completedAt) {
    return "Payout Released";
  }

  if (["opened", "under_review"].includes(order.disputeStatus)) {
    return "Disputed";
  }

  if (order.fulfillmentStatus === "delivered") {
    return "Inspection";
  }

  if (order.shippingStatus === "out_for_delivery") {
    return "Out for Delivery";
  }

  if (order.shippingStatus === "in_transit") {
    return "In Transit";
  }

  if (order.shippingStatus === "label_created" && order.labelUrl) {
    return "Ready to Print Label";
  }

  if (order.shippingStatus === "mailed") {
    return "Shipped";
  }

  if (order.fulfillmentStatus === "shipped") {
    return "Shipped";
  }

  return order.labelUrl
    ? "Ready to Print Label"
    : order.shippingLabelRequired
      ? "Ready to Ship"
      : "Paid";
}

function getSellerPayoutLabel(order: DashboardOrder) {
  if (order.refundStatus === "refunded" || order.transferStatus === "refunded") {
    return "Refunded";
  }

  if (order.transferStatus === "paid") {
    return "Paid";
  }

  if (order.transferStatus === "ready") {
    return "Queued";
  }

  if (order.transferStatus === "blocked" || ["opened", "under_review"].includes(order.disputeStatus)) {
    return "Blocked";
  }

  return "Pending";
}

function formatShippingStatus(status?: string | null) {
  const normalized = status || "pending";

  return normalized
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getTrackingUrl(order: DashboardOrder) {
  if (order.shippoTrackingUrl) {
    return order.shippoTrackingUrl;
  }

  if (!order.carrier || !order.trackingNumber) {
    return null;
  }

  const tracking = encodeURIComponent(order.trackingNumber);
  const carrier = order.carrier.toLowerCase();

  if (carrier.includes("usps")) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${tracking}`;
  }

  if (carrier.includes("ups")) {
    return `https://www.ups.com/track?tracknum=${tracking}`;
  }

  if (carrier.includes("fedex")) {
    return `https://www.fedex.com/fedextrack/?trknbr=${tracking}`;
  }

  return null;
}

function getSellerAuctionLifecycleLabel(auction: AuctionDashboardListing) {
  if (auction.auctionStatus === "finalizing") {
    return "Finalizing Auction";
  }

  if (auction.auctionStatus === "awaiting_payment") {
    return "Payment Pending";
  }

  if (auction.auctionStatus === "paid") {
    return "Paid / Ready to Ship";
  }

  if (auction.auctionStatus === "payment_expired") {
    return "Payment Expired";
  }

  if (auction.auctionStatus === "ended_reserve_not_met") {
    return "Reserve Not Met";
  }

  if (auction.auctionStatus === "ended_unsold") {
    return "Ended Unsold";
  }

  if (auction.auctionStatus === "active") {
    return "Active";
  }

  return auction.auctionStatus.replace(/_/g, " ");
}

export default function SellerDashboardPage() {
  const [activeListings, setActiveListings] = useState<ActiveListingView[]>([]);
  const [offers, setOffers] = useState(initialOffers);
  const [orders, setOrders] = useState<DashboardOrder[]>(initialOrders);
  const [drafts, setDrafts] = useState<SellerDraft[]>([]);
  const [auctionListings, setAuctionListings] = useState<AuctionDashboardListing[]>([]);
  const [auctionPaymentTransactions, setAuctionPaymentTransactions] = useState<
    AuctionDashboardListing[]
  >([]);
  const [payoutStatus, setPayoutStatus] = useState<PayoutStatus | null>(null);
  const [isLoadingPayoutStatus, setIsLoadingPayoutStatus] = useState(true);
  const [isStartingPayouts, setIsStartingPayouts] = useState(false);
  const [payoutMessage, setPayoutMessage] = useState("");
  const [dashboardMessage, setDashboardMessage] = useState("");
  const [shippingLabelOrderId, setShippingLabelOrderId] = useState("");
  const [shippingLabelForm, setShippingLabelForm] = useState<ShippingLabelForm>(defaultShippingLabelForm);
  const [updatingOrderId, setUpdatingOrderId] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<Record<string, File | null>>({});
  const [evidenceNotes, setEvidenceNotes] = useState<Record<string, string>>({});
  const [collapsedEvidenceUploads, setCollapsedEvidenceUploads] = useState<Record<string, boolean>>({});
  const [uploadingEvidenceId, setUploadingEvidenceId] = useState("");
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});
  const [progression, setProgression] = useState<ProgressionSummary>(calculateProgression(0));
  const [rewardTier, setRewardTier] = useState<RewardTier | null>(null);
  const [marketplaceRewards, setMarketplaceRewards] = useState<RewardsMarketplace | null>(null);
  const [walletSummary, setWalletSummary] = useState<WalletSummary | null>(null);
  const [lastWalletReward, setLastWalletReward] = useState<WalletLedgerEntry | null>(null);
  const [grailPass, setGrailPass] = useState<GrailPassMembership | null>(null);
  const [activeTab, setActiveTab] = useState<SellerDashboardTab>("all");
  const [viewMode, setViewMode] = useState<SellerDashboardViewMode>(() =>
    getSellerDashboardViewPreference(),
  );
  const [dashboardSearch, setDashboardSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<SellerDashboardFilter[]>([]);
  const [dashboardSort, setDashboardSort] =
    useState<SellerDashboardSortMode>("recently_updated");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [dashboardPage, setDashboardPage] = useState(1);

  useEffect(() => {
    let isMounted = true;

    async function loadProgressionAndRewards() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        return;
      }

      try {
        const [
          progressionResponse,
          rewardsResponse,
          walletResponse,
          grailPassResponse,
        ] = await Promise.all([
          fetch("/api/progression", {
            headers: {
              authorization: `Bearer ${session.access_token}`,
            },
          }),
          fetch("/api/rewards", {
            headers: {
              authorization: `Bearer ${session.access_token}`,
            },
          }),
          fetch("/api/wallet", {
            headers: {
              authorization: `Bearer ${session.access_token}`,
            },
          }),
          fetch("/api/grail-pass/subscription", {
            headers: {
              authorization: `Bearer ${session.access_token}`,
            },
          }),
        ]);
        const payload = (await progressionResponse.json()) as {
          progression?: ProgressionSummary;
        };
        const rewardsPayload = (await rewardsResponse.json()) as {
          tier?: RewardTier | null;
          marketplace?: RewardsMarketplace | null;
        };
        const walletPayload = (await walletResponse.json()) as {
          wallet?: WalletSummary;
          ledger?: WalletLedgerEntry[];
        };
        const grailPassPayload = (await grailPassResponse.json()) as GrailPassResponse;

        if (isMounted && payload.progression) {
          setProgression(payload.progression);
        }
        if (isMounted) {
          setRewardTier(rewardsPayload.tier || null);
          setMarketplaceRewards(rewardsPayload.marketplace || null);
          setWalletSummary(walletPayload.wallet || null);
          setLastWalletReward(
            (walletPayload.ledger || []).find((entry) => Number(entry.amount) > 0) || null,
          );
          setGrailPass(grailPassPayload.membership || null);
        }
      } catch (error) {
        console.warn("Seller dashboard progression/rewards load skipped:", error);
      }
    }

    loadProgressionAndRewards();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(dashboardViewStorageKey, viewMode);
  }, [viewMode]);

  useEffect(() => {
    const draftReadHandle = window.setTimeout(() => {
      setDrafts(readSellerDrafts());
    }, 0);

    return () => {
      window.clearTimeout(draftReadHandle);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadIncomingOffers() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        if (isMounted) {
          setOffers([]);
        }
        return;
      }

      try {
        const response = await fetch("/api/offers", {
          headers: {
            authorization: `Bearer ${session.access_token}`,
          },
        });
        const payload = (await response.json()) as {
          offers?: ApiOffer[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || "Incoming offers could not be loaded.");
        }

        if (!isMounted) {
          return;
        }

        const sellerOffers = (payload.offers || []).filter(
          (offer) => offer.role === "seller" && offer.status === "pending",
        );
        const offerListingIds = Array.from(
          new Set(
            sellerOffers
              .map((offer) => offer.listingId)
              .filter((listingId): listingId is string => Boolean(listingId)),
          ),
        );
        const minimumOffersByListingId = new Map<string, number>();

        if (offerListingIds.length > 0) {
          const { data: minimumOfferData, error: minimumOfferError } = await supabase
            .from("listings")
            .select("id, minimum_offer_amount")
            .in("id", offerListingIds);

          if (minimumOfferError) {
            console.warn("Seller dashboard minimum offer fetch skipped:", minimumOfferError);
          } else {
            ((minimumOfferData || []) as Array<{
              id: string;
              minimum_offer_amount?: number | null;
            }>).forEach((listing) => {
              minimumOffersByListingId.set(
                listing.id,
                Number(listing.minimum_offer_amount || 0),
              );
            });
          }
        }

        setOffers(
          sellerOffers
            .map((offer) => {
              const minimumOffer = offer.listingId
                ? minimumOffersByListingId.get(offer.listingId) || 0
                : 0;

              return {
              id: offer.id,
              listingId: offer.listingId || "",
              card: offer.cardTitle,
              buyer: offer.buyerName,
              offer: formatCurrency(Number(offer.amount || 0)),
              asking: offer.askingPrice > 0 ? formatCurrency(Number(offer.askingPrice)) : "Ask unavailable",
              minimumOffer:
                minimumOffer > 0 ? formatCurrency(minimumOffer) : "No minimum set",
              numericOffer: Number(offer.amount || 0),
              numericAsking: Number(offer.askingPrice || 0),
              createdAt: offer.createdAt,
              status: offer.statusLabel,
              href: offer.cardHref,
            };
            }),
        );
      } catch (error) {
        console.error("Seller dashboard incoming offers fetch error:", error);
        if (isMounted) {
          setOffers([]);
        }
      }
    }

    loadIncomingOffers();

    return () => {
      isMounted = false;
    };
  }, []);

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
          .limit(250);

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
            .select(
              `
                id,
                title,
                status,
                is_collection_card,
                is_public_collection,
                listing_images (
                  image_url,
                  image_type
                )
              `,
            )
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
            const sellerPayoutAmount = Number(order.seller_payout_amount || 0);
            const cardPrice = Number(order.card_price || 0);
            const sellerFee = Number(order.platform_fee || 0);
            const paymentProcessingFee = Number(order.processing_fee || 0);
            const shippingProfile = getShippingProfile(order.shipping_profile_id);
            const isCollectionOnly = Boolean(
              listing?.status?.toLowerCase() === "collection" ||
                listing?.is_collection_card ||
                listing?.is_public_collection,
            );

            return {
              id: order.id,
              card: listing?.title || "GRAIL Card",
              buyer: getProfileName(
                order.buyer_id ? profilesById.get(order.buyer_id) : undefined,
                order.buyer_id,
              ),
              total: formatCurrency(total),
              payoutDisplay: sellerPayoutAmount > 0
                ? formatCurrency(sellerPayoutAmount)
                : "Pending",
              status: normalizeOrderStatus(order.status),
              orderDate: formatDate(order.created_at),
              fulfillmentStatus: order.fulfillment_status || "pending",
              transferStatus: order.transfer_status || "not_ready",
              refundStatus: order.refund_status || "none",
              autoReleaseError: order.auto_release_error,
              completedAt: order.completed_at,
              disputeStatus: order.dispute_status || "none",
              disputeReason: order.dispute_reason,
              disputeNotes: order.dispute_notes,
              disputeOpenedAt: order.dispute_opened_at,
              trackingNumber: order.tracking_number || "",
              carrier: order.carrier || "",
              shippingStatus: order.shipping_status || "pending",
              shippingService: order.shipping_service || "",
              shippingProfileId: shippingProfile.id,
              shippingProfileLabel: order.shipping_profile_label || shippingProfile.label,
              shippingTrackingSupported:
                order.shipping_tracking_supported ??
                shippingProfile.capabilities.trackingSupported,
              shippingLabelRequired:
                order.shipping_label_required ??
                shippingProfile.capabilities.labelGenerationSupported,
              labelUrl: order.label_url,
              labelCost: Number(order.label_cost || 0),
              shippoEta: order.shippo_eta,
              shippoTrackingUrl: order.shippo_tracking_url,
              deliveredAt: order.delivered_at,
              inspectionEndsAt: order.inspection_ends_at,
              sellerPayoutAmount,
              cardPrice,
              sellerFee,
              paymentProcessingFee,
              shippingAddress: normalizeOrderShippingAddress(order.shipping_to_address),
              imageUrl: getListingFrontImage(listing),
              href: order.listing_id ? `/cards/${order.listing_id}` : "/orders",
              listingStatus: listing?.status,
              isCollectionOnly,
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

  useEffect(() => {
    let isMounted = true;

    async function loadSellerListings() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user.id) {
        return;
      }

      const { data, error } = await supabase
        .from("listings")
        .select(
          `
            id,
            title,
            sport,
            player,
            year,
            brand,
            card_number,
            card_type,
            grader,
            grade,
            condition,
            price,
            status,
            estimated_value,
            sportscardspro_estimated_value,
            created_at,
            updated_at,
            is_collection_card,
            is_public_collection,
            listing_images (
              image_url,
              image_type
            )
          `,
        )
        .eq("seller_id", session.user.id)
        .in("status", ["active", "collection"])
        .or("sale_format.is.null,sale_format.eq.fixed")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) {
        console.error("Seller dashboard active listing fetch error:", error);
        return;
      }

      if (!isMounted) {
        return;
      }

      const listingIds = ((data || []) as ActiveListingRow[]).map((listing) => listing.id);
      const analyticsByListingId = new Map<string, ListingAnalyticsRow>();

      if (session.access_token && listingIds.length > 0) {
        try {
          const analyticsBatchSize = 80;

          for (let index = 0; index < listingIds.length; index += analyticsBatchSize) {
            const batchIds = listingIds.slice(index, index + analyticsBatchSize);
            const analyticsResponse = await fetch(
              `/api/listings/analytics?listingIds=${encodeURIComponent(batchIds.join(","))}`,
              {
                headers: {
                  authorization: `Bearer ${session.access_token}`,
                },
              },
            );
            const analyticsPayload = (await analyticsResponse.json()) as {
              analytics?: ListingAnalyticsRow[];
              error?: string;
            };

            if (!analyticsResponse.ok) {
              throw new Error(
                analyticsPayload.error || "Listing analytics could not be loaded.",
              );
            }

            (analyticsPayload.analytics || []).forEach((analytics) => {
              analyticsByListingId.set(analytics.listingId, analytics);
            });
          }
        } catch (error) {
          console.warn("Seller dashboard listing analytics skipped:", error);
        }
      }

      setActiveListings(
        ((data || []) as ActiveListingRow[]).map((listing) => {
          const estimatedValue = Number(
            listing.sportscardspro_estimated_value || listing.estimated_value || 0,
          );
          const analytics = analyticsByListingId.get(listing.id);
          const status = listing.status?.toLowerCase() || "";
          const isCollectionOnly =
            status === "collection" ||
            Boolean(listing.is_collection_card) ||
            Boolean(listing.is_public_collection);
          const condition = getCardConditionDisplay(listing);
          const isGraded = Boolean(listing.grader && listing.grade) ||
            listing.card_type?.toLowerCase() === "graded";
          const price = Number(listing.price || 0);

          return {
            id: listing.id,
            card: listing.title || "GRAIL Card",
            player: listing.player || "",
            year: listing.year || "",
            brand: listing.brand || "",
            cardNumber: listing.card_number || "",
            category: listing.sport || "Sports",
            cardType: listing.card_type || (isGraded ? "Graded" : "Raw"),
            condition,
            price: isCollectionOnly
              ? "Offer Only"
              : price > 0
                ? formatCurrency(price)
                : "Price pending",
            numericPrice: isCollectionOnly ? 0 : price,
            market: estimatedValue > 0 ? formatCurrency(estimatedValue) : "Market pending",
            numericMarket: estimatedValue,
            status: isCollectionOnly ? "Offer Only" : "Active",
            href: `/cards/${listing.id}`,
            imageUrl: getAnyListingFrontImage(listing),
            watchCount: analytics?.watchCount || 0,
            offerCount: analytics?.offerCount || 0,
            messageActivity: analytics?.messageActivity || 0,
            checkoutStarts: analytics?.checkoutStarts || 0,
            timeListedDays: analytics?.timeListedDays ?? null,
            createdAt: listing.created_at,
            updatedAt: listing.updated_at,
            isRaw: !isGraded,
            isGraded,
            isHot: (analytics?.watchCount || 0) >= 15,
            isCollectionOnly,
          };
        }),
      );
    }

    loadSellerListings();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadSellerAuctions() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user.id) {
        return;
      }

      const { data, error } = await supabase
        .from("listings")
        .select(
          "id, title, status, auction_status, auction_ends_at, auction_starting_bid, auction_current_bid, auction_bid_count, auction_reserve_met_at, auction_payment_due_at, reserve_fee_status",
        )
        .eq("seller_id", session.user.id)
        .eq("sale_format", "auction")
        .eq("status", "active")
        .eq("auction_status", "active")
        .order("created_at", { ascending: false })
        .limit(250);

      if (error) {
        console.error("Seller dashboard auction fetch error:", error);
        return;
      }

      if (!isMounted) {
        return;
      }

      setAuctionListings(
        (data || []).map((listing) => ({
          id: listing.id,
          title: listing.title || "GRAIL Auction",
          status: listing.status || "unknown",
          auctionStatus: listing.auction_status || "unknown",
          currentBid: Number(listing.auction_current_bid || 0),
          startingBid: Number(listing.auction_starting_bid || 0),
          bidCount: Number(listing.auction_bid_count || 0),
          endsAt: listing.auction_ends_at,
          reserveStatus: getAuctionReserveStatus(listing),
          reserveFeeStatus: listing.reserve_fee_status || "none",
          paymentDueAt: listing.auction_payment_due_at,
          href: `/cards/${listing.id}`,
        })),
      );

      const { data: paymentData, error: paymentError } = await supabase
        .from("listings")
        .select(
          "id, title, status, auction_status, auction_ends_at, auction_starting_bid, auction_current_bid, auction_bid_count, auction_reserve_met_at, auction_winner_id, auction_payment_due_at, reserve_fee_status",
        )
        .eq("seller_id", session.user.id)
        .eq("sale_format", "auction")
        .in("auction_status", [
          "finalizing",
          "awaiting_payment",
          "payment_expired",
          "ended_reserve_not_met",
          "ended_unsold",
        ])
        .order("auction_payment_due_at", { ascending: true, nullsFirst: false })
        .limit(250);

      if (paymentError) {
        console.error("Seller dashboard auction transaction fetch error:", paymentError);
        return;
      }

      if (!isMounted) {
        return;
      }

      const winnerIds = Array.from(
        new Set(
          (paymentData || [])
            .map((listing) => listing.auction_winner_id)
            .filter((id): id is string => Boolean(id)),
        ),
      );
      const winnersById = new Map<string, ProfileRow>();

      if (winnerIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, full_name, username")
          .in("id", winnerIds);

        ((profileData || []) as ProfileRow[]).forEach((profile) => {
          winnersById.set(profile.id, profile);
        });
      }

      setAuctionPaymentTransactions(
        (paymentData || []).map((listing) => ({
          id: listing.id,
          title: listing.title || "GRAIL Auction",
          status: listing.status || "unknown",
          auctionStatus: listing.auction_status || "unknown",
          currentBid: Number(listing.auction_current_bid || 0),
          startingBid: Number(listing.auction_starting_bid || 0),
          bidCount: Number(listing.auction_bid_count || 0),
          endsAt: listing.auction_ends_at,
          reserveStatus: getAuctionReserveStatus(listing),
          reserveFeeStatus: listing.reserve_fee_status || "none",
          paymentDueAt: listing.auction_payment_due_at,
          buyerName: getProfileName(
            listing.auction_winner_id
              ? winnersById.get(listing.auction_winner_id)
              : undefined,
            listing.auction_winner_id,
          ),
          href: `/cards/${listing.id}`,
        })),
      );
    }

    loadSellerAuctions();

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

  function updateShippingLabelForm(field: keyof ShippingLabelForm, value: string) {
    setShippingLabelForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function openShippingLabelModal(order: DashboardOrder) {
    setShippingLabelOrderId(order.id);
    setShippingLabelForm(defaultShippingLabelForm);
    setDashboardMessage("");
  }

  function closeShippingLabelModal() {
    setShippingLabelOrderId("");
    setShippingLabelForm(defaultShippingLabelForm);
  }

  async function purchaseShippingLabel() {
    if (!shippingLabelOrderId) {
      return;
    }

    const accessToken = await getAccessToken();

    if (!accessToken) {
      setDashboardMessage("Sign in to purchase shipping labels.");
      return;
    }

    setUpdatingOrderId(shippingLabelOrderId);
    setDashboardMessage("Purchasing Shippo label...");

    try {
      const response = await fetch("/api/orders/shipping-label", {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          orderId: shippingLabelOrderId,
          from: {
            name: shippingLabelForm.fromName,
            street1: shippingLabelForm.fromStreet1,
            street2: shippingLabelForm.fromStreet2,
            city: shippingLabelForm.fromCity,
            state: shippingLabelForm.fromState,
            zip: shippingLabelForm.fromZip,
            country: "US",
            phone: shippingLabelForm.fromPhone,
            email: shippingLabelForm.fromEmail,
          },
          parcel: {
            length: shippingLabelForm.parcelLength,
            width: shippingLabelForm.parcelWidth,
            height: shippingLabelForm.parcelHeight,
            weight: shippingLabelForm.parcelWeight,
          },
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        order?: {
          carrier?: string | null;
          shipping_service?: string | null;
          shipping_profile_label?: string | null;
          tracking_number?: string | null;
          label_url?: string | null;
          label_cost?: number | string | null;
          shipping_status?: string | null;
          fulfillment_status?: string | null;
          shippo_tracking_url?: string | null;
          shippo_eta?: string | null;
          seller_payout_amount?: number | string | null;
        };
        shipping?: {
          carrier?: string;
          service?: string;
          shippingProfile?: string;
          trackingNumber?: string;
          labelUrl?: string;
          labelCost?: number;
          shippingStatus?: string;
          estimatedDelivery?: string | null;
        };
        payout?: {
          netPayout?: number;
        };
      };

      if (!response.ok || !payload.order) {
        throw new Error(payload.error || "Shipping label could not be purchased.");
      }

      updateLocalOrder(shippingLabelOrderId, {
        carrier: payload.order.carrier || payload.shipping?.carrier || "USPS",
        shippingService: payload.order.shipping_service || payload.shipping?.service || "USPS Ground Advantage",
        shippingProfileLabel:
          payload.order.shipping_profile_label ||
          payload.shipping?.shippingProfile ||
          payload.order.shipping_service ||
          payload.shipping?.service ||
          "USPS Ground Advantage",
        trackingNumber: payload.order.tracking_number || payload.shipping?.trackingNumber || "",
        labelUrl: payload.order.label_url || payload.shipping?.labelUrl || null,
        labelCost: Number(payload.order.label_cost || payload.shipping?.labelCost || 0),
        shippingStatus: payload.order.shipping_status || payload.shipping?.shippingStatus || "label_created",
        fulfillmentStatus: payload.order.fulfillment_status || "shipped",
        shippoTrackingUrl: payload.order.shippo_tracking_url || null,
        shippoEta: payload.order.shippo_eta || payload.shipping?.estimatedDelivery || null,
        sellerPayoutAmount: Number(
          payload.order.seller_payout_amount || payload.payout?.netPayout || 0,
        ),
        payoutDisplay:
          Number(payload.order.seller_payout_amount || payload.payout?.netPayout || 0) > 0
            ? formatCurrency(Number(payload.order.seller_payout_amount || payload.payout?.netPayout || 0))
            : "Pending",
        transferStatus: "not_ready",
      });
      closeShippingLabelModal();
      setDashboardMessage("Shipping label purchased. Tracking and payout deduction saved.");
    } catch (error) {
      console.error("Seller dashboard Shippo label error:", error);
      setDashboardMessage(
        error instanceof Error ? error.message : "Shipping label could not be purchased.",
      );
    } finally {
      setUpdatingOrderId("");
    }
  }

  async function markOrderMailed(order: DashboardOrder) {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      setDashboardMessage("Sign in to update shipping.");
      return;
    }

    setUpdatingOrderId(order.id);
    setDashboardMessage("Marking envelope mailed...");

    try {
      const response = await fetch("/api/orders/mark-mailed", {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ orderId: order.id }),
      });
      const payload = (await response.json()) as {
        error?: string;
        order?: {
          carrier?: string | null;
          shipping_service?: string | null;
          shipping_profile_label?: string | null;
          tracking_number?: string | null;
          label_url?: string | null;
          label_cost?: number | string | null;
          shipping_status?: string | null;
          fulfillment_status?: string | null;
          seller_payout_amount?: number | string | null;
        };
      };

      if (!response.ok || !payload.order) {
        throw new Error(payload.error || "Order could not be marked mailed.");
      }

      updateLocalOrder(order.id, {
        carrier: payload.order.carrier || "USPS",
        shippingService:
          payload.order.shipping_service ||
          payload.order.shipping_profile_label ||
          order.shippingProfileLabel,
        shippingProfileLabel:
          payload.order.shipping_profile_label || order.shippingProfileLabel,
        trackingNumber: payload.order.tracking_number || "",
        labelUrl: payload.order.label_url || null,
        labelCost: Number(payload.order.label_cost || 0),
        shippingStatus: payload.order.shipping_status || "mailed",
        fulfillmentStatus: payload.order.fulfillment_status || "shipped",
        sellerPayoutAmount: Number(
          payload.order.seller_payout_amount || order.sellerPayoutAmount,
        ),
        payoutDisplay:
          Number(payload.order.seller_payout_amount || order.sellerPayoutAmount) > 0
            ? formatCurrency(Number(payload.order.seller_payout_amount || order.sellerPayoutAmount))
            : order.payoutDisplay,
        transferStatus: "not_ready",
      });
      setDashboardMessage("Envelope marked mailed. Buyer notification sent.");
    } catch (error) {
      console.error("Seller dashboard mark mailed error:", error);
      setDashboardMessage(
        error instanceof Error ? error.message : "Order could not be marked mailed.",
      );
    } finally {
      setUpdatingOrderId("");
    }
  }

  async function uploadEvidence(order: DashboardOrder) {
    const file = evidenceFiles[order.id];

    if (!file) {
      setDashboardMessage("Choose an evidence image before uploading.");
      return;
    }

    if (!["opened", "under_review"].includes(order.disputeStatus)) {
      setDashboardMessage("Evidence can only be uploaded while a dispute is open or under review.");
      return;
    }

    setUploadingEvidenceId(order.id);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Seller dashboard evidence auth error:", sessionError);
    }

    if (!session?.user.id) {
      setDashboardMessage("Sign in to upload dispute evidence.");
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
      console.error("Seller dashboard evidence API upload error:", {
        error: payload.error,
        orderId: order.id,
        fileName: file.name,
      });
      setDashboardMessage(payload.error || "Evidence upload failed.");
      setUploadingEvidenceId("");
      return;
    }

    setEvidenceFiles((items) => ({ ...items, [order.id]: null }));
    setEvidenceNotes((items) => ({ ...items, [order.id]: "" }));
    setCollapsedEvidenceUploads((items) => ({ ...items, [order.id]: true }));
    setDashboardMessage("Evidence uploaded.");
    setUploadingEvidenceId("");
  }

  function getPayoutBlockReason(order: DashboardOrder) {
    if (order.transferStatus === "paid") return "Payout released";
    if (order.refundStatus === "refunded" || order.transferStatus === "refunded") {
      return "Buyer refunded - payout not released";
    }
    if (!payoutStatus?.payoutsEnabled) return "Payout setup incomplete";
    if (["opened", "under_review"].includes(order.disputeStatus)) {
      return "Dispute opened - payout blocked";
    }
    if (order.fulfillmentStatus !== "delivered") return "Waiting for delivery";
    if (order.transferStatus === "failed") return "Payout failed. Retry when eligible.";
    if (order.inspectionEndsAt && !hasInspectionPassed(order.inspectionEndsAt)) {
      return "Inspection window active";
    }
    if (order.transferStatus !== "ready") return "Payout not ready";
    return "";
  }

  async function updateOffer(id: string, status: OfferStatus) {
    if (status === "Countered") {
      setDashboardMessage("Open Offers to send a counter amount.");
      return;
    }

    const action = status === "Accepted" ? "accept" : status === "Declined" ? "decline" : "";

    if (!action) {
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setDashboardMessage("Sign in to manage offers.");
      return;
    }

    try {
      const response = await fetch("/api/offers", {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${session.access_token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ offerId: id, action }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Offer could not be updated.");
      }

      setOffers((items) => items.filter((offer) => offer.id !== id));
      setDashboardMessage(
        status === "Accepted"
          ? "Offer accepted. Buyer payment is now needed."
          : "Offer declined.",
      );
    } catch (error) {
      console.error("Seller dashboard offer update error:", error);
      setDashboardMessage(error instanceof Error ? error.message : "Offer could not be updated.");
    }
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
  const upcomingProgressionRank = getNextProgressionRank(progression.level);
  const activeInventoryCount = activeListings.length + auctionListings.length;
  const shippingLabelOrder = shippingLabelOrderId
    ? orders.find((order) => order.id === shippingLabelOrderId) || null
    : null;
  const shippingLabelAddressLines = formatOrderShippingAddress(
    shippingLabelOrder?.shippingAddress || null,
  );
  const hasSavedShippingAddress = shippingLabelAddressLines.length > 0;
  const normalizedDashboardSearch = dashboardSearch.trim().toLowerCase();
  const pageSize =
    viewMode === "compact" ? compactDashboardPageSize : dashboardPageSize;
  const paymentPendingAuctions = useMemo(
    () =>
      auctionPaymentTransactions.filter((auction) =>
        ["finalizing", "awaiting_payment"].includes(auction.auctionStatus),
      ),
    [auctionPaymentTransactions],
  );
  const readyToShipOrders = useMemo(
    () =>
      orders.filter((order) => {
        if (order.isCollectionOnly) {
          return false;
        }

        if (order.refundStatus === "refunded" || order.transferStatus === "paid") {
          return false;
        }

        const sellerStatus = getSellerOrderStatus(order);

        return ["Paid", "Ready to Ship", "Ready to Print Label"].includes(sellerStatus);
      }),
    [orders],
  );
  const completedOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.transferStatus === "paid" ||
          Boolean(order.completedAt) ||
          getSellerOrderStatus(order) === "Payout Released",
      ),
    [orders],
  );
  const recentSoldOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.refundStatus !== "refunded" &&
          !completedOrders.some((completedOrder) => completedOrder.id === order.id),
      ),
    [completedOrders, orders],
  );
  const pendingPayoutCount = useMemo(
    () =>
      orders.filter(
        (order) =>
          !["paid", "refunded"].includes(order.transferStatus) &&
          order.sellerPayoutAmount > 0,
      ).length,
    [orders],
  );
  const quickStats = [
    { label: "Active Listings", value: String(activeListings.length), detail: "Fixed price inventory" },
    { label: "Auctions", value: String(auctionListings.length), detail: "Live auction listings" },
    { label: "Offers Waiting", value: String(offers.length), detail: "Seller responses needed" },
    { label: "Payment Pending", value: String(paymentPendingAuctions.length), detail: "Buyer payment windows" },
    { label: "Ready To Ship", value: String(readyToShipOrders.length), detail: "Paid orders to fulfill" },
    {
      label: "Pending Payout",
      value: String(pendingPayoutCount),
      detail: "Awaiting release",
    },
    { label: "Total Sales", value: String(orders.length), detail: "Orders in seller history" },
  ];
  const tabCounts: Record<SellerDashboardTab, number> = {
    all:
      activeListings.length +
      auctionListings.length +
      offers.length +
      paymentPendingAuctions.length +
      readyToShipOrders.length +
      recentSoldOrders.length +
      completedOrders.length +
      drafts.length,
    active: activeListings.length,
    auctions: auctionListings.length,
    offers: offers.length,
    payment: paymentPendingAuctions.length,
    ready: readyToShipOrders.length,
    sold: recentSoldOrders.length,
    completed: completedOrders.length,
    drafts: drafts.length,
  };

  function resetDashboardContentState() {
    setDashboardPage(1);
    setSelectedItemIds([]);
  }

  function selectDashboardTab(tab: SellerDashboardTab) {
    setActiveTab(tab);
    resetDashboardContentState();
  }

  function toggleDashboardFilter(filter: SellerDashboardFilter) {
    setActiveFilters((currentFilters) =>
      currentFilters.includes(filter)
        ? currentFilters.filter((currentFilter) => currentFilter !== filter)
        : [...currentFilters, filter],
    );
    resetDashboardContentState();
  }

  function toggleSelectedItem(itemId: string) {
    setSelectedItemIds((currentIds) =>
      currentIds.includes(itemId)
        ? currentIds.filter((currentId) => currentId !== itemId)
        : [...currentIds, itemId],
    );
  }

  const getListingSearchText = useCallback((listing: ActiveListingView) => {
    return [
      listing.card,
      listing.player,
      listing.year,
      listing.brand,
      listing.cardNumber,
      listing.category,
      listing.condition,
      listing.status,
      listing.id,
    ]
      .join(" ")
      .toLowerCase();
  }, []);

  const matchesListingFilters = useCallback((listing: ActiveListingView) => {
    if (activeFilters.length === 0) {
      return true;
    }

    return activeFilters.every((filter) => {
      if (filter === "raw") return listing.isRaw;
      if (filter === "graded") return listing.isGraded;
      if (filter === "sports") return listing.category.toLowerCase().includes("sport");
      if (filter === "tcg") return listing.category.toLowerCase().includes("tcg");
      if (filter === "hot") return listing.isHot;
      return true;
    });
  }, [activeFilters]);

  const sortListings = useCallback((listings: ActiveListingView[]) => {
    return listings.slice().sort((first, second) => {
      if (dashboardSort === "highest_value") {
        return (second.numericMarket || second.numericPrice) - (first.numericMarket || first.numericPrice);
      }

      if (dashboardSort === "lowest_value") {
        return (first.numericMarket || first.numericPrice) - (second.numericMarket || second.numericPrice);
      }

      const firstTime = new Date(
        dashboardSort === "recently_updated"
          ? first.updatedAt || first.createdAt || 0
          : first.createdAt || 0,
      ).getTime();
      const secondTime = new Date(
        dashboardSort === "recently_updated"
          ? second.updatedAt || second.createdAt || 0
          : second.createdAt || 0,
      ).getTime();

      return dashboardSort === "oldest"
        ? firstTime - secondTime
        : secondTime - firstTime;
    });
  }, [dashboardSort]);

  const filteredListings = useMemo(() => {
    const matchingListings = activeListings.filter((listing) => {
      if (!matchesListingFilters(listing)) {
        return false;
      }

      if (!normalizedDashboardSearch) {
        return true;
      }

      return getListingSearchText(listing).includes(normalizedDashboardSearch);
    });

    return sortListings(matchingListings);
  }, [
    activeListings,
    getListingSearchText,
    matchesListingFilters,
    normalizedDashboardSearch,
    sortListings,
  ]);

  const filteredAuctions = useMemo(
    () =>
      auctionListings.filter((auction) => {
        if (!normalizedDashboardSearch) {
          return true;
        }

        return [
          auction.title,
          auction.auctionStatus,
          auction.reserveStatus,
          auction.id,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedDashboardSearch);
      }),
    [auctionListings, normalizedDashboardSearch],
  );
  const filteredOffers = useMemo(
    () =>
      offers.filter((offer) => {
        if (!normalizedDashboardSearch) {
          return true;
        }

        return [offer.card, offer.buyer, offer.offer, offer.minimumOffer, offer.id]
          .join(" ")
          .toLowerCase()
          .includes(normalizedDashboardSearch);
      }),
    [normalizedDashboardSearch, offers],
  );
  const filteredPaymentPending = useMemo(
    () =>
      paymentPendingAuctions.filter((auction) => {
        if (!normalizedDashboardSearch) {
          return true;
        }

        return [auction.title, auction.auctionStatus, auction.id]
          .join(" ")
          .toLowerCase()
          .includes(normalizedDashboardSearch);
      }),
    [normalizedDashboardSearch, paymentPendingAuctions],
  );
  const filteredReadyOrders = useMemo(
    () =>
      readyToShipOrders.filter((order) => {
        if (!normalizedDashboardSearch) {
          return true;
        }

        return [
          order.card,
          order.buyer,
          order.id,
          order.shippingProfileLabel,
          order.trackingNumber,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedDashboardSearch);
      }),
    [normalizedDashboardSearch, readyToShipOrders],
  );
  const filteredRecentSoldOrders = useMemo(
    () =>
      recentSoldOrders.filter((order) => {
        if (!normalizedDashboardSearch) {
          return true;
        }

        return [order.card, order.buyer, order.id, getSellerOrderStatus(order)]
          .join(" ")
          .toLowerCase()
          .includes(normalizedDashboardSearch);
      }),
    [normalizedDashboardSearch, recentSoldOrders],
  );
  const filteredCompletedOrders = useMemo(
    () =>
      completedOrders.filter((order) => {
        if (!normalizedDashboardSearch) {
          return true;
        }

        return [order.card, order.buyer, order.id, getSellerPayoutLabel(order)]
          .join(" ")
          .toLowerCase()
          .includes(normalizedDashboardSearch);
      }),
    [completedOrders, normalizedDashboardSearch],
  );
  const filteredDrafts = useMemo(
    () =>
      drafts.filter((draft) => {
        if (!normalizedDashboardSearch) {
          return true;
        }

        return [draft.title, draft.id]
          .join(" ")
          .toLowerCase()
          .includes(normalizedDashboardSearch);
      }),
    [drafts, normalizedDashboardSearch],
  );

  function getCurrentTabItemCount() {
    if (activeTab === "active") return filteredListings.length;
    if (activeTab === "auctions") return filteredAuctions.length;
    if (activeTab === "offers") return filteredOffers.length;
    if (activeTab === "payment") return filteredPaymentPending.length;
    if (activeTab === "ready") return filteredReadyOrders.length;
    if (activeTab === "sold") return filteredRecentSoldOrders.length;
    if (activeTab === "completed") return filteredCompletedOrders.length;
    if (activeTab === "drafts") return filteredDrafts.length;

    return Math.max(
      filteredListings.length,
      filteredAuctions.length,
      filteredOffers.length,
      filteredReadyOrders.length,
      filteredRecentSoldOrders.length,
    );
  }

  function paginateItems<T>(items: T[]) {
    const start = (dashboardPage - 1) * pageSize;

    return items.slice(start, start + pageSize);
  }

  const currentTabItemCount = getCurrentTabItemCount();
  const totalPages = Math.max(1, Math.ceil(currentTabItemCount / pageSize));
  const legacySellerDashboardDisabled = true;

  function renderEmptyState(title: string, copy: string, action?: ReactNode) {
    return (
      <section className="dashboard-empty-state">
        <h2>{title}</h2>
        <p>{copy}</p>
        {action}
      </section>
    );
  }

  function renderListingArtwork(listing: ActiveListingView, size: "card" | "row") {
    const width = size === "card" ? 180 : 54;
    const height = size === "card" ? 240 : 72;

    return (
      <div className={`seller-listing-art seller-listing-art-${size}`}>
        {listing.imageUrl ? (
          <Image
            src={listing.imageUrl}
            alt={listing.card}
            width={width}
            height={height}
            unoptimized
          />
        ) : (
          <div aria-hidden="true" className="seller-listing-art-fallback">
            <span />
            <strong />
          </div>
        )}
      </div>
    );
  }

  function renderListingActions(listing: ActiveListingView) {
    return (
      <div className="row-actions">
        <Link href={listing.href}>View Listing</Link>
        <Link href={`/list?edit=${listing.id}`}>Edit</Link>
        {listing.offerCount > 0 ? <Link href="/offers">View Offers</Link> : null}
        {listing.messageActivity > 0 ? <Link href="/messages">Messages</Link> : null}
      </div>
    );
  }

  function renderListingGrid(listings: ActiveListingView[]) {
    if (listings.length === 0) {
      return renderEmptyState(
        "No Active Listings",
        "Listings that match this tab and filter set will appear here.",
        <Link href="/list">Add Listing</Link>,
      );
    }

    return (
      <section className="seller-grid-view" aria-label="Seller listings grid">
        {listings.map((listing) => (
          <article key={listing.id} className="seller-grid-card panel">
            <label className="bulk-select-control">
              <input
                type="checkbox"
                checked={selectedItemIds.includes(listing.id)}
                onChange={() => toggleSelectedItem(listing.id)}
              />
              <span>Select</span>
            </label>
            <Link href={listing.href} className="seller-grid-art-link">
              {renderListingArtwork(listing, "card")}
            </Link>
            <div className="seller-card-copy">
              <span className={`status status-${listing.status.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
                {listing.status}
              </span>
              <h2>{listing.card}</h2>
              <p>
                {[listing.year, listing.brand, listing.player || listing.condition]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <strong>{listing.price}</strong>
            </div>
            <div className="seller-card-signals">
              <span>{listing.watchCount} watchers</span>
              <span>{listing.offerCount} offers</span>
              <span>{listing.messageActivity} messages</span>
            </div>
            {renderListingActions(listing)}
          </article>
        ))}
      </section>
    );
  }

  function renderListingCompact(listings: ActiveListingView[]) {
    if (listings.length === 0) {
      return renderEmptyState(
        "No Active Listings",
        "Listings that match this tab and filter set will appear here.",
        <Link href="/list">Add Listing</Link>,
      );
    }

    return (
      <section className="seller-compact-list" aria-label="Seller listings compact view">
        <div className="seller-compact-header">
          <span />
          <span>Card</span>
          <span>Price</span>
          <span>Status</span>
          <span>Offers</span>
          <span>Messages</span>
          <span>Watchers</span>
          <span>Last Updated</span>
          <span>Actions</span>
        </div>
        {listings.map((listing) => (
          <article key={listing.id} className="seller-compact-row">
            <label className="bulk-select-control compact">
              <input
                type="checkbox"
                checked={selectedItemIds.includes(listing.id)}
                onChange={() => toggleSelectedItem(listing.id)}
              />
            </label>
            <div className="seller-compact-title">
              {renderListingArtwork(listing, "row")}
              <div>
                <strong>{listing.card}</strong>
                <span>
                  {[listing.year, listing.brand, listing.cardNumber].filter(Boolean).join(" · ")}
                </span>
              </div>
            </div>
            <span>{listing.price}</span>
            <span className={`status status-${listing.status.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
              {listing.status}
            </span>
            <span>{listing.offerCount}</span>
            <span>{listing.messageActivity}</span>
            <span>{listing.watchCount}</span>
            <span>{formatDate(listing.updatedAt || listing.createdAt)}</span>
            {renderListingActions(listing)}
          </article>
        ))}
      </section>
    );
  }

  function renderListings(listings: ActiveListingView[]) {
    const visibleListings = paginateItems(listings);

    return viewMode === "grid"
      ? renderListingGrid(visibleListings)
      : renderListingCompact(visibleListings);
  }

  function renderAuctions(auctions: AuctionDashboardListing[]) {
    const visibleAuctions = paginateItems(auctions);

    if (visibleAuctions.length === 0) {
      return renderEmptyState(
        "No Active Auctions",
        "Active auction listings will appear here.",
        <Link href="/list">Create Auction</Link>,
      );
    }

    return (
      <section className="seller-compact-list" aria-label="Seller auction listings">
        <div className="seller-compact-header auction">
          <span>Auction</span>
          <span>Bid</span>
          <span>Status</span>
          <span>Bids</span>
          <span>Reserve</span>
          <span>Time</span>
          <span>Actions</span>
        </div>
        {visibleAuctions.map((auction) => (
          <article key={auction.id} className="seller-compact-row auction">
            <div>
              <strong>{auction.title}</strong>
              <span>{auction.id}</span>
            </div>
            <span>{formatCurrency(auction.currentBid || auction.startingBid)}</span>
            <span className="status status-auction">{getSellerAuctionLifecycleLabel(auction)}</span>
            <span>{auction.bidCount}</span>
            <span>{auction.reserveStatus}</span>
            <span>{formatAuctionTime(auction.endsAt)}</span>
            <div className="row-actions">
              <Link href={auction.href}>View Auction</Link>
            </div>
          </article>
        ))}
      </section>
    );
  }

  function renderOffers(visibleOffers: DashboardOffer[]) {
    const pageOffers = paginateItems(visibleOffers);

    if (pageOffers.length === 0) {
      return renderEmptyState(
        "No Incoming Offers",
        "Buyer offers that need a seller response will appear here.",
        <Link href="/offers">View Offers</Link>,
      );
    }

    return (
      <section className="seller-compact-list" aria-label="Incoming seller offers">
        <div className="seller-compact-header offer">
          <span>Card</span>
          <span>Buyer</span>
          <span>Offer</span>
          <span>Minimum Offer</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        {pageOffers.map((offer) => (
          <article key={offer.id} className="seller-compact-row offer">
            <div>
              <strong>{offer.card}</strong>
              <span>{offer.id}</span>
            </div>
            <span>{offer.buyer}</span>
            <strong>{offer.offer}</strong>
            <span>{offer.minimumOffer}</span>
            <span className={`status status-${offer.status.toLowerCase()}`}>{offer.status}</span>
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
              <Link href={offer.href}>View Card</Link>
            </div>
          </article>
        ))}
      </section>
    );
  }

  function renderPaymentPending(auctions: AuctionDashboardListing[]) {
    const pageAuctions = paginateItems(auctions);

    if (pageAuctions.length === 0) {
      return renderEmptyState(
        "No Payment Pending",
        "Orders or auction results awaiting buyer payment will appear here.",
      );
    }

    return (
      <section className="seller-compact-list" aria-label="Payment pending">
        <div className="seller-compact-header payment">
          <span>Card</span>
          <span>Buyer</span>
          <span>Amount</span>
          <span>Payment Window</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        {pageAuctions.map((auction) => (
          <article key={auction.id} className="seller-compact-row payment">
            <div>
              <strong>{auction.title}</strong>
              <span>Auction result</span>
            </div>
            <span>{auction.buyerName || "Buyer pending"}</span>
            <strong>{formatCurrency(auction.currentBid || auction.startingBid)}</strong>
            <span>{auction.paymentDueAt ? formatDateTime(auction.paymentDueAt) : "Window pending"}</span>
            <span className="status status-pending">{getSellerAuctionLifecycleLabel(auction)}</span>
            <div className="row-actions">
              <Link href={auction.href}>View Auction</Link>
            </div>
          </article>
        ))}
      </section>
    );
  }

  function renderOrderRows(visibleOrders: DashboardOrder[], emptyTitle: string, emptyCopy: string) {
    const pageOrders = paginateItems(visibleOrders);

    if (pageOrders.length === 0) {
      return renderEmptyState(emptyTitle, emptyCopy, <Link href="/orders">View Orders</Link>);
    }

    return (
      <section className="seller-order-list" aria-label={emptyTitle}>
        {pageOrders.map((order) => {
          const blockReason = getPayoutBlockReason(order);
          const hasShippoLabel = Boolean(order.labelUrl);
          const isPwe = order.shippingProfileId === "plain_white_envelope";
          const trackingUrl = getTrackingUrl(order);
          const simpleStatus = getSellerOrderStatus(order);
          const payoutLabel = getSellerPayoutLabel(order);
          const isExpanded = Boolean(expandedOrderIds[order.id]);
          const showPayoutReason =
            !["Paid", "Queued", "Refunded"].includes(payoutLabel) && blockReason;
          const canUploadEvidence = ["opened", "under_review"].includes(
            order.disputeStatus,
          );
          const showEvidenceUpload =
            isExpanded && canUploadEvidence && !collapsedEvidenceUploads[order.id];
          const canPurchaseLabel =
            order.shippingLabelRequired &&
            order.fulfillmentStatus === "pending" &&
            !hasShippoLabel &&
            order.refundStatus !== "refunded" &&
            order.transferStatus !== "paid";
          const canMarkMailed =
            !order.shippingLabelRequired &&
            order.fulfillmentStatus === "pending" &&
            order.shippingStatus !== "mailed" &&
            order.refundStatus !== "refunded" &&
            order.transferStatus !== "paid";

          return (
            <article key={order.id} className="seller-order-row panel">
              <div className="order-title-cell">
                {order.imageUrl ? (
                  <Image
                    src={order.imageUrl}
                    alt={order.card}
                    width={54}
                    height={72}
                    unoptimized
                  />
                ) : null}
                <div>
                  <strong>{order.card}</strong>
                  <span>Order {order.id}</span>
                  <span>Buyer {order.buyer}</span>
                  {isPwe ? <span>PWE · No tracking</span> : null}
                </div>
              </div>
              <div>
                <strong>{order.total}</strong>
                <span>Order total</span>
                <span>Payout {order.payoutDisplay}</span>
              </div>
              <div className="status-stack">
                <span className={`status status-${simpleStatus.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
                  {simpleStatus}
                </span>
                <span className={`status status-${payoutLabel.toLowerCase()}`}>
                  Payout {payoutLabel}
                </span>
              </div>
              <div className="seller-order-summary">
                <span>Sold {order.orderDate}</span>
                <span>Ship date {order.trackingNumber ? formatDate(order.deliveredAt) : "Pending"}</span>
                <span>Completed {formatDate(order.completedAt)}</span>
              </div>
              <div className="row-actions">
                {order.href ? <Link href={order.href}>View Listing</Link> : null}
                {hasShippoLabel && order.labelUrl ? (
                  <a href={order.labelUrl} target="_blank" rel="noreferrer">
                    Print Label
                  </a>
                ) : null}
                {trackingUrl ? (
                  <a href={trackingUrl} target="_blank" rel="noreferrer">
                    Tracking
                  </a>
                ) : null}
                {canPurchaseLabel ? (
                  <button
                    type="button"
                    disabled={updatingOrderId === order.id}
                    onClick={() => openShippingLabelModal(order)}
                  >
                    Purchase Label
                  </button>
                ) : null}
                {canMarkMailed ? (
                  <button
                    type="button"
                    disabled={updatingOrderId === order.id}
                    onClick={() => markOrderMailed(order)}
                  >
                    Mark Mailed
                  </button>
                ) : null}
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
                {showPayoutReason ? (
                  <span className="payout-reason">{blockReason}</span>
                ) : null}
              </div>
              {isExpanded ? (
                <div className="seller-order-details">
                  <span>Shipping method {order.shippingProfileLabel || order.shippingService || "Pending"}</span>
                  <span>Carrier {order.carrier || "Pending"}</span>
                  <span>
                    Tracking{" "}
                    {order.trackingNumber ||
                      (order.shippingTrackingSupported ? "Pending" : "Not included")}
                  </span>
                  <span>Shipment {formatShippingStatus(order.shippingStatus)}</span>
                  <span>Service {order.shippingService || "Pending"}</span>
                  <span>Estimated delivery {formatDate(order.shippoEta)}</span>
                  <span>Label cost {order.labelCost > 0 ? formatCurrency(order.labelCost) : "Pending"}</span>
                  <span>Delivered {formatDate(order.deliveredAt)}</span>
                  <span>Fulfillment {order.fulfillmentStatus}</span>
                  <span>Transfer {order.transferStatus}</span>
                  <span>Refund {order.refundStatus}</span>
                  <span>Sale price {order.cardPrice > 0 ? formatCurrency(order.cardPrice) : order.total}</span>
                  <span>Seller fee {formatCurrency(order.sellerFee)}</span>
                  <span>Payment processing {formatCurrency(order.paymentProcessingFee)}</span>
                  <span>
                    Shipping label{" "}
                    {order.shippingLabelRequired
                      ? formatCurrency(order.labelCost)
                      : "Not required"}
                  </span>
                  <span>Net payout {formatCurrency(order.sellerPayoutAmount)}</span>
                  {order.disputeReason ? (
                    <span>Dispute reason: {order.disputeReason}</span>
                  ) : null}
                  {order.disputeNotes ? (
                    <span>Dispute notes: {order.disputeNotes}</span>
                  ) : null}
                  {order.disputeOpenedAt ? (
                    <span>Dispute opened: {formatDateTime(order.disputeOpenedAt)}</span>
                  ) : null}
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
        })}
      </section>
    );
  }

  function renderDrafts() {
    const pageDrafts = paginateItems(filteredDrafts);

    if (pageDrafts.length === 0) {
      return renderEmptyState(
        "No Drafts",
        "Saved listing drafts from this browser will appear here.",
        <Link href="/list">Start Listing</Link>,
      );
    }

    return (
      <section className="seller-grid-view" aria-label="Seller drafts">
        {pageDrafts.map((draft) => (
          <article key={draft.id} className="seller-grid-card panel">
            <div className="seller-listing-art seller-listing-art-card">
              {draft.imagePreview ? (
                <Image
                  src={draft.imagePreview}
                  alt={draft.title}
                  width={180}
                  height={240}
                  unoptimized
                />
              ) : (
                <div aria-hidden="true" className="seller-listing-art-fallback">
                  <span />
                  <strong />
                </div>
              )}
            </div>
            <div className="seller-card-copy">
              <span className="status status-pending">Draft</span>
              <h2>{draft.title}</h2>
              <p>Updated {formatDate(draft.updatedAt || draft.createdAt)}</p>
            </div>
            <div className="row-actions">
              <Link href={`/list?draft=${encodeURIComponent(draft.id)}`}>Continue Draft</Link>
            </div>
          </article>
        ))}
      </section>
    );
  }

  function renderAllOverview() {
    return (
      <div className="seller-overview-grid">
        <section className="panel dashboard-overview-section">
          <div className="section-heading">
            <h2>Active Inventory</h2>
            <button type="button" onClick={() => selectDashboardTab("active")}>View All</button>
          </div>
          {renderListings(filteredListings.slice(0, viewMode === "compact" ? 8 : 6))}
        </section>
        <section className="panel dashboard-overview-section">
          <div className="section-heading">
            <h2>Incoming Offers</h2>
            <button type="button" onClick={() => selectDashboardTab("offers")}>View All</button>
          </div>
          {renderOffers(filteredOffers.slice(0, 6))}
        </section>
        <section className="panel dashboard-overview-section">
          <div className="section-heading">
            <h2>Ready To Ship</h2>
            <button type="button" onClick={() => selectDashboardTab("ready")}>View All</button>
          </div>
          {renderOrderRows(
            filteredReadyOrders.slice(0, 6),
            "No Ready To Ship",
            "Orders ready for fulfillment will appear here.",
          )}
        </section>
      </div>
    );
  }

  function renderDashboardContent() {
    if (activeTab === "all") {
      return renderAllOverview();
    }

    if (activeTab === "active") {
      return renderListings(filteredListings);
    }

    if (activeTab === "auctions") {
      return renderAuctions(filteredAuctions);
    }

    if (activeTab === "offers") {
      return renderOffers(filteredOffers);
    }

    if (activeTab === "payment") {
      return renderPaymentPending(filteredPaymentPending);
    }

    if (activeTab === "ready") {
      return renderOrderRows(
        filteredReadyOrders,
        "No Ready To Ship",
        "Paid orders that are ready for fulfillment will appear here.",
      );
    }

    if (activeTab === "sold") {
      return renderOrderRows(
        filteredRecentSoldOrders,
        "No Recent Sold Orders",
        "Recently sold orders will appear here.",
      );
    }

    if (activeTab === "completed") {
      return renderOrderRows(
        filteredCompletedOrders,
        "No Completed Orders",
        "Completed orders and released payouts will appear here.",
      );
    }

    return renderDrafts();
  }

  function renderPagination() {
    if (activeTab === "all" || totalPages <= 1) {
      return null;
    }

    return (
      <div className="dashboard-pagination">
        <button
          type="button"
          disabled={dashboardPage <= 1}
          onClick={() => setDashboardPage((currentPage) => Math.max(1, currentPage - 1))}
        >
          Previous
        </button>
        <span>
          Page {dashboardPage} of {totalPages}
        </span>
        <button
          type="button"
          disabled={dashboardPage >= totalPages}
          onClick={() =>
            setDashboardPage((currentPage) => Math.min(totalPages, currentPage + 1))
          }
        >
          Next
        </button>
      </div>
    );
  }

  return (
    <PageShell
      className="dashboard-page"
      shellClassName="dashboard-shell"
      shellStyle={{ padding: "8px 0 38px" }}
      styles={pageStyles}
    >
        <section className="seller-hero panel">
          <div className="seller-hero-main">
            <span>Seller Tools</span>
            <h1>Seller Dashboard</h1>
            <p>Manage listings, auctions, offers, fulfillment, payouts, and seller rewards from one scan-friendly command center.</p>
            <div className="seller-hero-actions">
              <Link href="/list">List New Card</Link>
              <Link href="/offers">View Offers</Link>
              <Link href="/messages">Messages</Link>
              <Link href="/billing-payouts">Billing & Payouts</Link>
            </div>
          </div>
          <div className="seller-hero-summary">
            <span>Seller Status</span>
            <strong>
              <CollectorLevelBadge
                level={progression.level}
                rank={progression.title}
                size="xs"
              />
              {progression.title} · Level {progression.level}
            </strong>
            <p>{payoutTitle}</p>
            <small>{payoutCopy}</small>
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
            {payoutMessage ? <small className="payout-message">{payoutMessage}</small> : null}
          </div>
          <div className="seller-hero-metrics" aria-label="Seller summary">
            <span>
              Active listings
              <strong>{activeInventoryCount}</strong>
            </span>
            <span>
              Active auctions
              <strong>{auctionListings.length}</strong>
            </span>
            <span>
              Pending payouts
              <strong>{pendingPayoutCount}</strong>
            </span>
            <span>
              Incoming offers
              <strong>{offers.length}</strong>
            </span>
            <span>
              Recent sales
              <strong>{recentSoldOrders.length}</strong>
            </span>
          </div>
        </section>

        <section className="quick-stats-row" aria-label="Seller quick stats">
          {quickStats.map((stat) => (
            <article key={stat.label} className="quick-stat">
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              <small>{stat.detail}</small>
            </article>
          ))}
        </section>

        {dashboardMessage ? <p className="dashboard-message">{dashboardMessage}</p> : null}

        <section className="seller-dashboard-nav panel" aria-label="Seller dashboard sections">
          {sellerDashboardTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? "is-active" : ""}
              onClick={() => selectDashboardTab(tab.id)}
            >
              {tab.label}
              <span>{tabCounts[tab.id]}</span>
            </button>
          ))}
        </section>

        <section className="seller-dashboard-content panel">
          <div className="dashboard-content-toolbar">
            <label className="dashboard-search">
              <span>Search Seller Dashboard</span>
              <input
                type="search"
                value={dashboardSearch}
                onChange={(event) => {
                  setDashboardSearch(event.target.value);
                  resetDashboardContentState();
                }}
                placeholder="Search title, player, buyer, order ID, offer..."
              />
            </label>
            <div className="view-toggle" aria-label="Dashboard view">
              <button
                type="button"
                className={viewMode === "grid" ? "is-active" : ""}
                onClick={() => {
                  setViewMode("grid");
                  resetDashboardContentState();
                }}
              >
                Grid
              </button>
              <button
                type="button"
                className={viewMode === "compact" ? "is-active" : ""}
                onClick={() => {
                  setViewMode("compact");
                  resetDashboardContentState();
                }}
              >
                Compact
              </button>
            </div>
            <label className="dashboard-sort">
              <span>Sort</span>
              <select
                value={dashboardSort}
                onChange={(event) => {
                  setDashboardSort(event.target.value as SellerDashboardSortMode);
                  resetDashboardContentState();
                }}
              >
                {sellerDashboardSortOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="dashboard-filter-row" aria-label="Seller dashboard filters">
            {sellerDashboardFilters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={activeFilters.includes(filter.id) ? "is-active" : ""}
                onClick={() => toggleDashboardFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {selectedItemIds.length > 0 ? (
            <div className="bulk-action-bar">
              <span>{selectedItemIds.length} selected</span>
              <small>Bulk action framework is ready for future inventory actions.</small>
              <button type="button" onClick={() => setSelectedItemIds([])}>
                Clear Selection
              </button>
            </div>
          ) : null}

          <div className="dashboard-content-heading">
            <div>
              <span>{sellerDashboardTabs.find((tab) => tab.id === activeTab)?.label}</span>
              <h2>
                {activeTab === "all"
                  ? "Seller Overview"
                  : sellerDashboardTabs.find((tab) => tab.id === activeTab)?.label}
              </h2>
            </div>
            <p>
              {currentTabItemCount} {currentTabItemCount === 1 ? "result" : "results"}
            </p>
          </div>

          {renderDashboardContent()}
          {renderPagination()}
        </section>

        {legacySellerDashboardDisabled ? null : (
        <section className="dashboard-layout">
          <div className="main-column">
            <section className="panel dashboard-section">
              <div className="section-heading">
                <h2>Active Listings</h2>
                <Link href="/list">Add Listing</Link>
              </div>
              <div className="table-list">
                {activeListings.length > 0 ? (
                  activeListings.map((listing) => (
                    <article key={listing.id} className="table-row listing-row">
                      <div>
                        <strong>{listing.card}</strong>
                        <span>{listing.status}</span>
                      </div>
                      <span>{listing.price}</span>
                      <span>{listing.market}</span>
                      <span>{listing.watchCount} ❤️ · {listing.offerCount} offers</span>
                      <span>
                        {listing.timeListedDays === null
                          ? "Listed recently"
                          : `Listed ${listing.timeListedDays}d ago`} ·{" "}
                        {listing.messageActivity} messages · {listing.checkoutStarts} checkouts
                      </span>
                      <div className="row-actions">
                        <Link href={`/list?edit=${listing.id}`}>Edit</Link>
                        <Link href={listing.href}>View</Link>
                      </div>
                    </article>
                  ))
                ) : (
                  <article className="table-row listing-row">
                    <div>
                      <strong>No active fixed-price listings.</strong>
                      <span>Sold and inactive cards stay out of active inventory.</span>
                    </div>
                    <Link href="/list">Add Listing</Link>
                  </article>
                )}
              </div>
            </section>

            <section className="panel dashboard-section">
              <div className="section-heading">
                <h2>Auctions</h2>
                <Link href="/list">Create Auction</Link>
              </div>
              <div className="table-list">
                {auctionListings.length > 0 ? (
                  auctionListings.map((auction) => (
                    <article key={auction.id} className="table-row listing-row auction-row">
                      <div>
                        <strong>{auction.title}</strong>
                        <span>{getSellerAuctionLifecycleLabel(auction)}</span>
                      </div>
                      <span>
                        {formatCurrency(auction.currentBid || auction.startingBid)}
                      </span>
                      <span>{auction.bidCount} bids</span>
                      <span>{auction.reserveStatus}</span>
                      <span>
                        {auction.auctionStatus === "awaiting_payment"
                          ? `Pay by ${formatDateTime(auction.paymentDueAt)}`
                          : formatAuctionTime(auction.endsAt)}
                      </span>
                      <span>Commitment Fee {auction.reserveFeeStatus}</span>
                      <div className="row-actions">
                        <Link href={auction.href}>View Auction</Link>
                      </div>
                    </article>
                  ))
                ) : (
                  <article className="table-row listing-row">
                    <div>
                      <strong>No active auctions.</strong>
                      <span>Ended auctions move into payment or order status.</span>
                    </div>
                    <Link href="/list">Create Auction</Link>
                  </article>
                )}
              </div>
            </section>

            {auctionPaymentTransactions.length > 0 ? (
              <section className="panel dashboard-section">
                <div className="section-heading">
                  <h2>Payment Pending</h2>
                  <Link href="/orders">View Orders</Link>
                </div>
                <div className="table-list">
                  {auctionPaymentTransactions.map((auction) => (
                    <article key={auction.id} className="table-row listing-row auction-row">
                      <div>
                        <strong>{auction.title}</strong>
                        <span>{getSellerAuctionLifecycleLabel(auction)}</span>
                      </div>
                      <span>
                        {formatCurrency(auction.currentBid || auction.startingBid)}
                      </span>
                      <span>{auction.bidCount} bids</span>
                      <span>{auction.reserveStatus}</span>
                      <span>
                        {auction.auctionStatus === "awaiting_payment"
                          ? `Pay by ${formatDateTime(auction.paymentDueAt)}`
                          : getSellerAuctionLifecycleLabel(auction)}
                      </span>
                      <span>Commitment Fee {auction.reserveFeeStatus}</span>
                      <div className="row-actions">
                        {auction.auctionStatus === "payment_expired" ? (
                          <>
                            <Link href={`/list?edit=${auction.id}`}>Relist Auction</Link>
                            <Link href={`/list?edit=${auction.id}`}>Sell Fixed Price</Link>
                            <Link href={auction.href}>Keep in Collection</Link>
                          </>
                        ) : (
                          <Link href={auction.href}>View Auction</Link>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

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
                      <Link href={offer.href}>View Card</Link>
                    </div>
                  </article>
                ))}
                {offers.length === 0 ? (
                  <article className="table-row offer-row">
                    <div>
                      <strong>No active offers</strong>
                      <span>New buyer offers will appear here.</span>
                    </div>
                  </article>
                ) : null}
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
                  const hasTracking = Boolean(order.carrier && order.trackingNumber);
                  const hasShippoLabel = Boolean(order.labelUrl);
                  const isPwe = order.shippingProfileId === "plain_white_envelope";
                  const trackingUrl = getTrackingUrl(order);
                  const simpleStatus = getSellerOrderStatus(order);
                  const payoutLabel = getSellerPayoutLabel(order);
                  const isExpanded = Boolean(expandedOrderIds[order.id]);
                  const showPayoutReason =
                    !["Paid", "Queued", "Refunded"].includes(payoutLabel) && blockReason;
                  const canUploadEvidence = ["opened", "under_review"].includes(
                    order.disputeStatus,
                  );
                  const showEvidenceUpload =
                    isExpanded && canUploadEvidence && !collapsedEvidenceUploads[order.id];
                  const canPurchaseLabel =
                    order.shippingLabelRequired &&
                    order.fulfillmentStatus === "pending" &&
                    !hasShippoLabel &&
                    order.refundStatus !== "refunded" &&
                    order.transferStatus !== "paid";
                  const canMarkMailed =
                    !order.shippingLabelRequired &&
                    order.fulfillmentStatus === "pending" &&
                    order.shippingStatus !== "mailed" &&
                    order.refundStatus !== "refunded" &&
                    order.transferStatus !== "paid";

                  return (
                    <article key={order.id} className="table-row order-row payout-order-row">
                      <div className="order-title-cell">
                        {order.imageUrl ? (
                          <Image
                            src={order.imageUrl}
                            alt={order.card}
                            width={54}
                            height={72}
                            unoptimized
                          />
                        ) : null}
                        <div>
                          <strong>{order.card}</strong>
                          <span>Order {order.id}</span>
                          <span>Buyer {order.buyer}</span>
                          {isPwe ? <span>PWE · No tracking</span> : null}
                        </div>
                      </div>
                      <div>
                        <strong>{order.total}</strong>
                        <span>Sold price</span>
                        <span>Payout {order.payoutDisplay}</span>
                      </div>
                      <div className="status-stack">
                        <span className={`status status-${simpleStatus.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
                          {simpleStatus}
                        </span>
                        <span className={`status status-${payoutLabel.toLowerCase()}`}>
                          Payout {payoutLabel}
                        </span>
                      </div>
                      <div className="seller-order-summary">
                        <span>{getInspectionStatus(order)}</span>
                        {order.autoReleaseError ? (
                          <span>Payout retry/error: {order.autoReleaseError}</span>
                        ) : null}
                      </div>
                      <div className="row-actions">
                        {order.href ? <Link href={order.href}>View Card</Link> : null}
                        {hasShippoLabel && order.labelUrl ? (
                          <a href={order.labelUrl} target="_blank" rel="noreferrer">
                            Print Label
                          </a>
                        ) : null}
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
                        {canPurchaseLabel ? (
                          <button
                            type="button"
                            disabled={updatingOrderId === order.id}
                            onClick={() => openShippingLabelModal(order)}
                          >
                            Purchase Shipping Label
                          </button>
                        ) : null}
                        {canMarkMailed ? (
                          <button
                            type="button"
                            disabled={updatingOrderId === order.id}
                            onClick={() => markOrderMailed(order)}
                          >
                            Mark Mailed
                          </button>
                        ) : null}
                        {order.fulfillmentStatus === "pending" && !hasTracking && !canPurchaseLabel && !canMarkMailed ? (
                          <span className="payout-reason">
                            {order.shippingLabelRequired
                              ? "Purchase a shipping label to continue"
                              : "Mark the envelope mailed to continue"}
                          </span>
                        ) : null}
                        {showPayoutReason ? (
                          <span className="payout-reason">{blockReason}</span>
                        ) : null}
                      </div>
                      {isExpanded ? (
                        <div className="seller-order-details">
                          <span>Shipping method {order.shippingProfileLabel || order.shippingService || "Pending"}</span>
                          <span>Carrier {order.carrier || "Pending"}</span>
                          <span>
                            Tracking{" "}
                            {order.trackingNumber ||
                              (order.shippingTrackingSupported ? "Pending" : "Not included")}
                          </span>
                          <span>Shipment {formatShippingStatus(order.shippingStatus)}</span>
                          <span>Service {order.shippingService || "Pending"}</span>
                          <span>Estimated delivery {formatDate(order.shippoEta)}</span>
                          <span>Label cost {order.labelCost > 0 ? formatCurrency(order.labelCost) : "Pending"}</span>
                          {trackingUrl ? (
                            <a href={trackingUrl} target="_blank" rel="noreferrer">
                              Track Package
                            </a>
                          ) : null}
                          {order.labelUrl ? (
                            <a href={order.labelUrl} target="_blank" rel="noreferrer">
                              Print Label
                            </a>
                          ) : null}
                          <span>Delivered {formatDate(order.deliveredAt)}</span>
                          <span>Fulfillment {order.fulfillmentStatus}</span>
                          <span>Transfer {order.transferStatus}</span>
                          <span>Refund {order.refundStatus}</span>
                          <span>Sale price {order.cardPrice > 0 ? formatCurrency(order.cardPrice) : order.total}</span>
                          <span>Seller fee {formatCurrency(order.sellerFee)}</span>
                          <span>Payment processing {formatCurrency(order.paymentProcessingFee)}</span>
                          <span>
                            Shipping label{" "}
                            {order.shippingLabelRequired
                              ? formatCurrency(order.labelCost)
                              : "Not required"}
                          </span>
                          <span>Net payout {formatCurrency(order.sellerPayoutAmount)}</span>
                          {order.disputeReason ? (
                            <span>Dispute reason: {order.disputeReason}</span>
                          ) : null}
                          {order.disputeNotes ? (
                            <span>Dispute notes: {order.disputeNotes}</span>
                          ) : null}
                          {order.disputeOpenedAt ? (
                            <span>Dispute opened: {formatDateTime(order.disputeOpenedAt)}</span>
                          ) : null}
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

            <section className="panel sidebar-panel progression-card">
              <div className="progression-card-header">
                <CollectorLevelBadge
                  level={progression.level}
                  rank={progression.title}
                  size="sm"
                />
                <div>
                  <h2>GRAIL Progression</h2>
                  <p>Level {progression.level} {progression.title}</p>
                </div>
              </div>
              <div className="progress-block">
                <div>
                  <span>
                    {upcomingProgressionRank
                      ? `Progress to ${upcomingProgressionRank.title}`
                      : "Highest rank reached"}
                  </span>
                  <strong>{progression.rankProgressPercentage}%</strong>
                </div>
                <div className="progress-track">
                  <span style={{ width: `${progression.rankProgressPercentage}%` }} />
                </div>
              </div>
              <div className="progression-stat-list">
                <span>Current Rank</span>
                <strong>{progression.title}</strong>
                <span>Current Level</span>
                <strong>
                  Level {progression.level} · {progression.rankLevel}/5
                </strong>
                <span>Lifetime XP</span>
                <strong>{progression.xp.toLocaleString()}</strong>
                <span>Achievements</span>
                <strong>{progression.achievementsCount}</strong>
                <span>XP Remaining</span>
                <strong>
                  {upcomingProgressionRank
                    ? progression.xpToNextRank.toLocaleString()
                    : "Complete"}
                </strong>
                <span>Next Rank</span>
                <strong>
                  {upcomingProgressionRank
                    ? `${upcomingProgressionRank.title} · Level ${upcomingProgressionRank.startLevel}`
                    : "Max"}
                </strong>
              </div>
              <div className="progression-reward-list">
                <span>GRAIL Economy</span>
                <em>{rewardTier?.rankName || "Configuration Pending"}</em>
                <em>
                  Marketplace {marketplaceRewards?.marketplaceStatus || "Live"} ·{" "}
                  {marketplaceRewards?.currentMarketplaceState || "Normal"}
                </em>
                <em>
                  Event{" "}
                  {marketplaceRewards?.currentEvent?.eventName ||
                    marketplaceRewards?.upcomingEvent?.eventName ||
                    "None"}
                </em>
                <em>Seller Fee {formatPercent(rewardTier?.sellerFeePercent)}</em>
                <em>Buyer Reward {formatPercent(rewardTier?.buyerRewardPercent)}</em>
                <em>Seller Reward {formatPercent(rewardTier?.sellerRewardPercent)}</em>
                <em>Lifetime Credit Earned {formatCurrency(walletSummary?.lifetimeEarned || 0)}</em>
                <em>
                  Last Reward{" "}
                  {lastWalletReward
                    ? `${formatCurrency(lastWalletReward.amount)} · ${lastWalletReward.title}`
                    : "None yet"}
                </em>
                <em>
                  Multipliers XP {marketplaceRewards?.currentMultipliers?.xpMultiplier || 1}x ·
                  Wallet {marketplaceRewards?.currentMultipliers?.walletMultiplier || 1}x
                </em>
              </div>
              <p>
                View the full Rewards page for the rank roadmap, XP sources, perks,
                and recent progression activity.
              </p>
              <Link href="/rewards" className="progression-rewards-link">
                View Rewards
              </Link>
              <GrailPassPresenceCard
                variant="compact"
                eyebrow={
                  grailPass?.status && grailPass.status !== "none"
                    ? "GRAIL Pass Active"
                    : "Seller Preview"
                }
                title={
                  grailPass?.status && grailPass.status !== "none"
                    ? `${grailPass.displayName} seller rewards.`
                    : "GRAIL Pass seller rewards."
                }
                description={
                  grailPass?.status && grailPass.status !== "none"
                    ? "GRAIL Pass can add configured seller reward bonuses without changing marketplace placement or rank-based seller fees."
                    : "GRAIL Pass focuses on rewards, events, and identity. It does not buy listing placement."
                }
                perkKeys={["reward_boost"]}
              />
            </section>

            <section className="panel sidebar-panel">
              <h2>Fair Marketplace Signals</h2>
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
              <Link href="/wallet">View Wallet</Link>
            </section>
          </aside>
        </section>
        )}
      {shippingLabelOrderId ? (
        <div className="modal-backdrop" role="presentation">
          <section className="panel tracking-modal shipping-label-modal" role="dialog" aria-modal="true">
            <div className="section-heading">
              <h2>Purchase Shipping Label</h2>
              <button type="button" onClick={closeShippingLabelModal}>
                Close
              </button>
            </div>
            <p>
              Shippo will create a USPS label, attach tracking to the order,
              and deduct the actual label cost from the seller payout. The buyer
              shipping address is collected by Stripe Checkout.
            </p>
            <div className="shipping-label-grid">
              <div className="shipping-label-group">
                <strong>Sender</strong>
                <label>
                  <span>Name</span>
                  <input
                    value={shippingLabelForm.fromName}
                    onChange={(event) => updateShippingLabelForm("fromName", event.target.value)}
                    placeholder="Sender name"
                  />
                </label>
                <label>
                  <span>Street</span>
                  <input
                    value={shippingLabelForm.fromStreet1}
                    onChange={(event) => updateShippingLabelForm("fromStreet1", event.target.value)}
                    placeholder="Street address"
                  />
                </label>
                <label>
                  <span>Apartment / Suite</span>
                  <input
                    value={shippingLabelForm.fromStreet2}
                    onChange={(event) => updateShippingLabelForm("fromStreet2", event.target.value)}
                    placeholder="Optional"
                  />
                </label>
                <div className="shipping-label-row">
                  <label>
                    <span>City</span>
                    <input
                      value={shippingLabelForm.fromCity}
                      onChange={(event) => updateShippingLabelForm("fromCity", event.target.value)}
                    />
                  </label>
                  <label>
                    <span>State</span>
                    <input
                      value={shippingLabelForm.fromState}
                      onChange={(event) => updateShippingLabelForm("fromState", event.target.value)}
                      maxLength={2}
                    />
                  </label>
                  <label>
                    <span>ZIP</span>
                    <input
                      value={shippingLabelForm.fromZip}
                      onChange={(event) => updateShippingLabelForm("fromZip", event.target.value)}
                    />
                  </label>
                </div>
                <div className="shipping-label-row two">
                  <label>
                    <span>Phone</span>
                    <input
                      value={shippingLabelForm.fromPhone}
                      onChange={(event) => updateShippingLabelForm("fromPhone", event.target.value)}
                      placeholder="Optional"
                    />
                  </label>
                  <label>
                    <span>Email</span>
                    <input
                      value={shippingLabelForm.fromEmail}
                      onChange={(event) => updateShippingLabelForm("fromEmail", event.target.value)}
                      placeholder="Optional"
                    />
                  </label>
                </div>
              </div>
              <div className="shipping-label-group">
                <strong>Ship To</strong>
                {hasSavedShippingAddress ? (
                  <div className="saved-shipping-address">
                    {shippingLabelAddressLines.map((line, index) => (
                      <span key={`${line}-${index}`}>{line}</span>
                    ))}
                  </div>
                ) : (
                  <p className="shipping-address-warning">
                    Buyer shipping address has not been saved yet. Stripe
                    Checkout must collect it before a label can be purchased.
                  </p>
                )}
              </div>
              <div className="shipping-label-group parcel">
                <strong>Package</strong>
                <div className="shipping-label-row">
                  <label>
                    <span>Length</span>
                    <input
                      value={shippingLabelForm.parcelLength}
                      onChange={(event) => updateShippingLabelForm("parcelLength", event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Width</span>
                    <input
                      value={shippingLabelForm.parcelWidth}
                      onChange={(event) => updateShippingLabelForm("parcelWidth", event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Height</span>
                    <input
                      value={shippingLabelForm.parcelHeight}
                      onChange={(event) => updateShippingLabelForm("parcelHeight", event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Weight oz</span>
                    <input
                      value={shippingLabelForm.parcelWeight}
                      onChange={(event) => updateShippingLabelForm("parcelWeight", event.target.value)}
                    />
                  </label>
                </div>
              </div>
            </div>
            <div className="row-actions">
              <button
                type="button"
                disabled={Boolean(updatingOrderId) || !hasSavedShippingAddress}
                onClick={purchaseShippingLabel}
              >
                Purchase USPS Label
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </PageShell>
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

  .seller-hero {
    margin-top: 10px;
    padding: 18px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(240px, 0.44fr) minmax(260px, 0.52fr);
    gap: 18px;
    align-items: stretch;
  }

  .seller-hero-main,
  .seller-hero-summary {
    display: grid;
    align-content: start;
    gap: 10px;
  }

  .seller-hero-main > span,
  .seller-hero-summary > span,
  .dashboard-content-heading span,
  .dashboard-search span,
  .dashboard-sort span {
    color: #C9CDD3;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .seller-hero h1 {
    margin: 0;
    color: #fff;
    font-size: 34px;
    line-height: 38px;
    font-weight: 900;
  }

  .seller-hero p,
  .seller-hero small,
  .quick-stat small,
  .dashboard-content-heading p,
  .dashboard-empty-state p {
    margin: 0;
    color: #a1a1aa;
    font-size: 13px;
    line-height: 18px;
    font-weight: 800;
  }

  .seller-hero-actions {
    margin-top: 4px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .seller-hero-actions a,
  .seller-dashboard-nav button,
  .dashboard-filter-row button,
  .view-toggle button,
  .bulk-action-bar button,
  .dashboard-pagination button,
  .dashboard-empty-state a {
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

  .seller-hero-actions a:hover,
  .seller-dashboard-nav button:hover,
  .dashboard-filter-row button:hover,
  .view-toggle button:hover,
  .bulk-action-bar button:hover,
  .dashboard-pagination button:hover:not(:disabled),
  .dashboard-empty-state a:hover {
    border-color: rgba(231,222,208,0.62);
    background: rgba(231,222,208,0.11);
    box-shadow: 0 0 18px rgba(201,205,211,0.13);
  }

  .seller-hero-summary {
    border: 1px solid rgba(201,205,211,0.12);
    border-radius: 12px;
    background: rgba(8,8,10,0.55);
    padding: 14px;
  }

  .seller-hero-summary strong {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #fff;
    font-size: 15px;
    line-height: 20px;
    font-weight: 900;
  }

  .seller-hero-metrics {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 9px;
  }

  .seller-hero-metrics span,
  .quick-stat {
    border: 1px solid rgba(201,205,211,0.12);
    border-radius: 12px;
    background: rgba(8,8,10,0.58);
    padding: 11px;
    display: grid;
    gap: 6px;
    color: #85858f;
    font-size: 10px;
    line-height: 13px;
    font-weight: 900;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .seller-hero-metrics strong,
  .quick-stat strong {
    color: #fff;
    font-size: 22px;
    line-height: 26px;
    font-weight: 900;
    letter-spacing: 0;
    text-transform: none;
  }

  .quick-stats-row {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 10px;
  }

  .quick-stat {
    min-height: 86px;
  }

  .quick-stat span {
    color: #85858f;
  }

  .quick-stat small {
    letter-spacing: 0;
    text-transform: none;
  }

  .seller-dashboard-nav {
    margin-top: 14px;
    padding: 10px;
    display: flex;
    gap: 8px;
    overflow-x: auto;
  }

  .seller-dashboard-nav button {
    flex: 0 0 auto;
    border-color: rgba(201,205,211,0.14);
    background: rgba(8,8,10,0.72);
    color: #C9CDD3;
  }

  .seller-dashboard-nav button.is-active,
  .dashboard-filter-row button.is-active,
  .view-toggle button.is-active {
    border-color: rgba(231,222,208,0.48);
    background: rgba(231,222,208,0.12);
    color: #fff;
  }

  .seller-dashboard-nav button span {
    margin-left: 8px;
    border-radius: 999px;
    background: rgba(201,205,211,0.1);
    color: #fff;
    min-width: 22px;
    padding: 3px 7px;
    font-size: 10px;
    line-height: 12px;
  }

  .seller-dashboard-content {
    margin-top: 14px;
    padding: 14px;
    display: grid;
    gap: 14px;
  }

  .dashboard-content-toolbar {
    display: grid;
    grid-template-columns: minmax(280px, 1fr) auto minmax(180px, auto);
    gap: 10px;
    align-items: end;
  }

  .dashboard-search,
  .dashboard-sort {
    display: grid;
    gap: 7px;
  }

  .dashboard-search input,
  .dashboard-sort select {
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

  .view-toggle,
  .dashboard-filter-row {
    display: flex;
    gap: 7px;
    flex-wrap: wrap;
  }

  .dashboard-filter-row button {
    min-height: 32px;
    color: #C9CDD3;
  }

  .bulk-action-bar {
    border: 1px solid rgba(231,222,208,0.2);
    border-radius: 12px;
    background: rgba(231,222,208,0.055);
    padding: 10px;
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
  }

  .bulk-action-bar span {
    color: #fff;
    font-size: 12px;
    font-weight: 900;
  }

  .bulk-action-bar small {
    color: #C9CDD3;
    font-size: 12px;
    font-weight: 800;
  }

  .dashboard-content-heading {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: end;
  }

  .dashboard-content-heading h2,
  .dashboard-empty-state h2,
  .seller-card-copy h2,
  .dashboard-overview-section h3 {
    margin: 0;
    color: #fff;
    font-size: 20px;
    line-height: 24px;
    font-weight: 900;
  }

  .seller-grid-view {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }

  .seller-grid-card {
    padding: 12px;
    display: grid;
    gap: 10px;
    align-content: start;
  }

  .bulk-select-control {
    display: inline-flex;
    gap: 7px;
    align-items: center;
    color: #C9CDD3;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .bulk-select-control.compact span {
    display: none;
  }

  .seller-grid-art-link {
    text-decoration: none;
  }

  .seller-listing-art {
    border: 1px solid rgba(201,205,211,0.12);
    border-radius: 12px;
    background: radial-gradient(circle at 50% 20%, rgba(231,222,208,0.08), transparent 42%), #050506;
    display: grid;
    place-items: center;
    overflow: hidden;
  }

  .seller-listing-art-card {
    min-height: 230px;
  }

  .seller-listing-art-row {
    width: 54px;
    height: 72px;
  }

  .seller-listing-art img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .seller-listing-art-fallback {
    width: 42%;
    aspect-ratio: 0.72;
    border: 1px solid rgba(231,222,208,0.22);
    border-radius: 8px;
    background: rgba(231,222,208,0.055);
  }

  .seller-card-copy {
    display: grid;
    gap: 6px;
  }

  .seller-card-copy p {
    margin: 0;
    color: #85858f;
    font-size: 12px;
    line-height: 16px;
    font-weight: 800;
  }

  .seller-card-copy strong {
    color: #fff;
    font-size: 18px;
    line-height: 22px;
    font-weight: 900;
  }

  .seller-card-signals {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .seller-card-signals span {
    border: 1px solid rgba(201,205,211,0.12);
    border-radius: 999px;
    background: rgba(201,205,211,0.045);
    color: #C9CDD3;
    padding: 5px 8px;
    font-size: 10px;
    line-height: 12px;
    font-weight: 900;
  }

  .seller-compact-list,
  .seller-order-list {
    display: grid;
    gap: 8px;
  }

  .seller-compact-header,
  .seller-compact-row {
    display: grid;
    gap: 10px;
    align-items: center;
  }

  .seller-compact-header {
    grid-template-columns: 28px minmax(220px, 1.35fr) 95px 110px 70px 85px 80px 100px minmax(150px, auto);
    border-bottom: 1px solid rgba(201,205,211,0.1);
    padding: 0 10px 8px;
    color: #85858f;
    font-size: 10px;
    line-height: 13px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .seller-compact-header.auction,
  .seller-compact-row.auction {
    grid-template-columns: minmax(260px, 1fr) 90px 140px 70px 110px 130px auto;
  }

  .seller-compact-header.offer,
  .seller-compact-row.offer {
    grid-template-columns: minmax(260px, 1fr) 120px 90px 120px 100px auto;
  }

  .seller-compact-header.payment,
  .seller-compact-row.payment {
    grid-template-columns: minmax(260px, 1fr) 120px 100px 170px 130px auto;
  }

  .seller-compact-row {
    grid-template-columns: 28px minmax(220px, 1.35fr) 95px 110px 70px 85px 80px 100px minmax(150px, auto);
    border: 1px solid #202026;
    border-radius: 10px;
    background: rgba(8,8,10,0.76);
    padding: 10px;
  }

  .seller-compact-title,
  .seller-order-row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 10px;
    align-items: center;
  }

  .seller-compact-row strong,
  .seller-order-row strong,
  .dashboard-overview-section strong {
    color: #fff;
    font-size: 13px;
    line-height: 17px;
    font-weight: 900;
  }

  .seller-compact-row span,
  .seller-order-row span,
  .dashboard-overview-section span {
    color: #C9CDD3;
    font-size: 12px;
    line-height: 16px;
    font-weight: 800;
  }

  .seller-order-row {
    grid-template-columns: minmax(220px, 1.1fr) 110px 140px minmax(160px, 0.8fr) minmax(210px, auto);
    padding: 12px;
  }

  .dashboard-empty-state {
    border: 1px dashed rgba(201,205,211,0.2);
    border-radius: 12px;
    background: rgba(8,8,10,0.45);
    min-height: 170px;
    padding: 22px;
    display: grid;
    place-items: center;
    text-align: center;
    align-content: center;
    gap: 10px;
  }

  .dashboard-pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
  }

  .dashboard-pagination span {
    color: #C9CDD3;
    font-size: 12px;
    font-weight: 900;
  }

  .dashboard-pagination button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .seller-overview-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .dashboard-overview-section {
    padding: 12px;
    display: grid;
    gap: 10px;
  }

  .page-heading {
    margin-top: 10px;
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
  .section-heading button,
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
  .section-heading button:hover,
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

  .stat-card strong.stat-rank-value {
    display: inline-flex;
    align-items: center;
    gap: 7px;
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

  .status-stack {
    display: grid;
    gap: 6px;
  }

  .seller-order-summary {
    display: grid;
    gap: 6px;
  }

  .order-title-cell {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 10px;
    align-items: center;
  }

  .order-title-cell img {
    width: 46px;
    height: 62px;
    object-fit: contain;
    border-radius: 7px;
    background: #030304;
  }

  .seller-order-details {
    grid-column: 1 / -1;
    border: 1px solid rgba(201,205,211,0.12);
    border-radius: 10px;
    background: rgba(201,205,211,0.035);
    padding: 10px;
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }

  .seller-order-details span,
  .seller-order-details a {
    border: 1px solid rgba(201,205,211,0.14);
    border-radius: 999px;
    background: rgba(8,8,10,0.62);
    min-height: 30px;
    padding: 0 10px;
    display: inline-flex;
    align-items: center;
    color: #fff;
    text-decoration: none;
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

  .evidence-upload {
    grid-column: 1 / -1;
    border: 1px solid rgba(201,205,211,0.12);
    border-radius: 10px;
    background: rgba(201,205,211,0.035);
    padding: 10px;
    display: grid;
    grid-template-columns: minmax(160px, 0.35fr) minmax(220px, 1fr) auto;
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

  .progression-card-header {
    display: grid;
    grid-template-columns: 54px minmax(0, 1fr);
    gap: 11px;
    align-items: center;
  }

  .progression-stat-list {
    border: 1px solid rgba(201,205,211,0.16);
    border-radius: 10px;
    background: rgba(8,8,10,0.72);
    padding: 10px;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 8px 12px;
    align-items: baseline;
  }

  .progression-stat-list span,
  .progression-reward-list span {
    color: #85858f;
    font-size: 10px;
    line-height: 13px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .progression-stat-list strong {
    color: #fff;
    font-size: 13px;
    line-height: 16px;
    font-weight: 900;
    text-align: right;
  }

  .progression-reward-list {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }

  .progression-reward-list span {
    width: 100%;
  }

  .progression-reward-list em {
    border: 1px solid rgba(231,222,208,0.2);
    border-radius: 999px;
    background: rgba(231,222,208,0.055);
    color: #E7DED0;
    min-height: 25px;
    padding: 0 9px;
    display: inline-flex;
    align-items: center;
    font-size: 10px;
    line-height: 13px;
    font-style: normal;
    font-weight: 900;
  }

  .progression-rewards-link {
    border: 1px solid rgba(231,222,208,0.24);
    border-radius: 10px;
    background: rgba(231,222,208,0.055);
    color: #E7DED0;
    min-height: 34px;
    padding: 0 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    font-size: 12px;
    line-height: 15px;
    font-weight: 900;
  }

  .progression-rewards-link:hover {
    border-color: rgba(231,222,208,0.42);
    background: rgba(231,222,208,0.09);
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

  .shipping-label-modal {
    width: min(760px, 100%);
    max-height: calc(100vh - 36px);
    overflow: auto;
  }

  .shipping-label-modal p {
    margin: 0;
    color: #C9CDD3;
    font-size: 12px;
    line-height: 18px;
  }

  .shipping-label-grid {
    display: grid;
    gap: 12px;
  }

  .shipping-label-group {
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px;
    background: rgba(255,255,255,0.03);
    padding: 12px;
    display: grid;
    gap: 10px;
  }

  .shipping-label-group strong {
    color: #fff;
    font-size: 12px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .saved-shipping-address {
    border: 1px solid rgba(201,205,211,0.12);
    border-radius: 12px;
    background: rgba(8,8,10,0.58);
    padding: 11px;
    display: grid;
    gap: 4px;
  }

  .saved-shipping-address span {
    color: #E7DED0;
    font-size: 12px;
    line-height: 17px;
    font-weight: 800;
  }

  .shipping-address-warning {
    color: #fca5a5 !important;
  }

  .shipping-label-row {
    display: grid;
    grid-template-columns: 1fr 72px 110px;
    gap: 8px;
  }

  .shipping-label-row.two {
    grid-template-columns: 1fr 1fr;
  }

  .shipping-label-group.parcel .shipping-label-row {
    grid-template-columns: repeat(4, 1fr);
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

  .tracking-modal input,
  .tracking-modal select {
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

    .seller-hero,
    .dashboard-content-toolbar,
    .seller-overview-grid {
      grid-template-columns: 1fr;
    }

    .quick-stats-row {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .seller-grid-view {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .seller-compact-header {
      display: none;
    }

    .seller-compact-row,
    .seller-compact-row.auction,
    .seller-compact-row.offer,
    .seller-compact-row.payment,
    .seller-order-row {
      grid-template-columns: 1fr;
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

    .shipping-label-row,
    .shipping-label-row.two,
    .shipping-label-group.parcel .shipping-label-row {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 640px) {
    .quick-stats-row,
    .seller-grid-view {
      grid-template-columns: 1fr;
    }

    .seller-hero-metrics {
      grid-template-columns: 1fr;
    }

    .seller-dashboard-content {
      padding: 12px;
    }

    .dashboard-content-heading,
    .bulk-action-bar {
      align-items: flex-start;
      flex-direction: column;
    }
  }
`;
