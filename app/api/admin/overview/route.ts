import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getCurrentMarketplaceEvent, getMarketplaceSwitches } from "../../../lib/marketplaceEconomy";
import { getRewardTiers } from "../../../lib/rewards";

export const runtime = "nodejs";

const adminEmails = ["ryanjhaas99@gmail.com"];

type OrderRow = {
  total_amount: number | string | null;
  platform_fee: number | string | null;
  seller_payout_amount: number | string | null;
  transfer_status: string | null;
  dispute_status: string | null;
  refund_status: string | null;
};

type WalletRow = {
  available_credit: number | string | null;
  pending_credit: number | string | null;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function createAnonSupabaseClient() {
  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      auth: {
        persistSession: false,
      },
    },
  );
}

function createServiceSupabaseClient() {
  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false,
      },
    },
  );
}

function getBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") || "";

  return authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
}

async function getCurrentUser(request: Request) {
  const token = getBearerToken(request);

  if (!token) {
    return { user: null, error: "Missing authorization token." };
  }

  const supabase = createAnonSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error) {
    console.error("Admin overview auth error:", {
      error,
      errorMessage: error.message,
    });
  }

  return { user, error: error?.message || null };
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function getCount(
  countPromise: PromiseLike<{ count: number | null; error: { message?: string } | null }>,
  label: string,
) {
  const { count, error } = await countPromise;

  if (error) {
    console.warn(`Admin overview ${label} count unavailable:`, error);
    return 0;
  }

  return count || 0;
}

export async function GET(request: Request) {
  let serviceSupabase;

  try {
    serviceSupabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Admin overview configuration error:", error);
    return NextResponse.json(
      { error: "Admin overview is temporarily unavailable." },
      { status: 500 },
    );
  }

  const { user, error: authError } = await getCurrentUser(request);
  const email = user?.email?.toLowerCase() || "";

  if (authError || !user || !adminEmails.includes(email)) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  const [
    switches,
    eventState,
    tiers,
    users,
    activeListings,
    activeAuctions,
    ordersResult,
    walletsResult,
  ] = await Promise.all([
    getMarketplaceSwitches(serviceSupabase),
    getCurrentMarketplaceEvent(serviceSupabase),
    getRewardTiers(serviceSupabase).catch((error) => {
      console.warn("Admin overview reward tiers unavailable:", error);
      return [];
    }),
    getCount(
      serviceSupabase.from("profiles").select("id", { count: "exact", head: true }),
      "users",
    ),
    getCount(
      serviceSupabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      "active listings",
    ),
    getCount(
      serviceSupabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("sale_format", "auction")
        .eq("auction_status", "active"),
      "active auctions",
    ),
    serviceSupabase
      .from("orders")
      .select(
        "total_amount, platform_fee, seller_payout_amount, transfer_status, dispute_status, refund_status",
      ),
    serviceSupabase.from("wallets").select("available_credit, pending_credit"),
  ]);

  if (ordersResult.error) {
    console.warn("Admin overview orders unavailable:", {
      error: ordersResult.error,
      errorMessage: ordersResult.error.message,
    });
  }

  if (walletsResult.error) {
    console.warn("Admin overview wallets unavailable:", {
      error: walletsResult.error,
      errorMessage: walletsResult.error.message,
    });
  }

  const orders = ((ordersResult.data || []) as OrderRow[]).filter(
    (order) => order.refund_status !== "refunded",
  );
  const wallets = (walletsResult.data || []) as WalletRow[];
  const currentTier = tiers.find((tier) => tier.enabled) || tiers[0] || null;
  const gmv = orders.reduce((total, order) => total + toNumber(order.total_amount), 0);
  const platformRevenue = orders.reduce(
    (total, order) => total + toNumber(order.platform_fee),
    0,
  );
  const pendingPayouts = orders.filter((order) =>
    ["ready", "not_ready", "failed"].includes(order.transfer_status || ""),
  );
  const openDisputes = orders.filter((order) =>
    ["opened", "under_review"].includes(order.dispute_status || ""),
  );
  const walletLiability = wallets.reduce(
    (total, wallet) =>
      total + toNumber(wallet.available_credit) + toNumber(wallet.pending_credit),
    0,
  );

  return NextResponse.json({
    overview: {
      marketplaceStatus: switches.marketplaceEnabled ? "Live" : "Paused",
      currentMarketplaceEvent: eventState.currentEvent?.eventName || "None",
      upcomingMarketplaceEvent: eventState.upcomingEvent?.eventName || "None",
      currentEconomy: currentTier?.rankName || "Pending",
      currentSellerFee: currentTier?.sellerFeePercent ?? null,
      currentBuyerReward: currentTier?.buyerRewardPercent ?? null,
      currentSellerReward: currentTier?.sellerRewardPercent ?? null,
      users,
      activeListings,
      gmv,
      platformRevenue,
      walletLiability,
      pendingPayouts: pendingPayouts.length,
      pendingPayoutAmount: pendingPayouts.reduce(
        (total, order) => total + toNumber(order.seller_payout_amount),
        0,
      ),
      openDisputes: openDisputes.length,
      activeAuctions,
      health: {
        wallet: "Healthy",
        payments: "Healthy",
        marketplace: switches.marketplaceEnabled ? "Live" : "Paused",
        rewards:
          switches.buyerRewardsEnabled &&
          switches.sellerRewardsEnabled &&
          switches.walletRewardsEnabled
            ? "Enabled"
            : "Limited",
        notifications: switches.notificationsEnabled ? "Enabled" : "Disabled",
        disputes: openDisputes.length,
        auctions: activeAuctions,
      },
    },
  });
}
