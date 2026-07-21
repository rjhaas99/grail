import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const adminEmails = ["ryanjhaas99@gmail.com"];

type OrderRow = {
  id: string;
  listing_id: string | null;
  buyer_id: string | null;
  seller_id: string | null;
  total_amount: number | null;
  card_price: number | null;
  seller_payout_amount: number | null;
  platform_fee: number | null;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  stripe_refund_id: string | null;
  stripe_transfer_id: string | null;
  refund_status: string | null;
  transfer_status: string | null;
  fulfillment_status: string | null;
  dispute_status: string | null;
  auto_release_error: string | null;
  created_at: string | null;
  completed_at: string | null;
  payout_released_at: string | null;
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
    console.error("Admin payments auth error:", error);
  }

  return { user, error: error?.message || null };
}

function shortId(value?: string | null) {
  return value ? value.slice(0, 8) : "Unknown";
}

function getProfileName(profile?: ProfileRow, fallbackId?: string | null) {
  return profile?.full_name || profile?.username || shortId(fallbackId);
}

export async function GET(request: Request) {
  let serviceSupabase;

  try {
    serviceSupabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Admin payments configuration error:", error);
    return NextResponse.json(
      { error: "Admin payments are temporarily unavailable." },
      { status: 500 },
    );
  }

  const { user, error: authError } = await getCurrentUser(request);
  const email = user?.email?.toLowerCase() || "";

  if (authError || !user || !adminEmails.includes(email)) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  const { data: orderData, error: orderError } = await serviceSupabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (orderError) {
    console.error("Admin payments order fetch error:", {
      error: orderError,
      errorMessage: orderError.message,
      adminId: user.id,
    });
    return NextResponse.json(
      { error: "Payment orders could not be loaded." },
      { status: 500 },
    );
  }

  const orders = (orderData || []) as OrderRow[];
  const listingIds = Array.from(
    new Set(
      orders
        .map((order) => order.listing_id)
        .filter((listingId): listingId is string => Boolean(listingId)),
    ),
  );
  const profileIds = Array.from(
    new Set(
      orders
        .flatMap((order) => [order.buyer_id, order.seller_id])
        .filter((profileId): profileId is string => Boolean(profileId)),
    ),
  );
  const listingsById = new Map<string, ListingRow>();
  const profilesById = new Map<string, ProfileRow>();

  if (listingIds.length > 0) {
    const { data: listingData, error: listingError } = await serviceSupabase
      .from("listings")
      .select("id, title")
      .in("id", listingIds);

    if (listingError) {
      console.error("Admin payments listing fetch error:", {
        error: listingError,
        errorMessage: listingError.message,
      });
    } else {
      ((listingData || []) as ListingRow[]).forEach((listing) => {
        listingsById.set(listing.id, listing);
      });
    }
  }

  if (profileIds.length > 0) {
    const { data: profileData, error: profileError } = await serviceSupabase
      .from("profiles")
      .select("id, full_name, username")
      .in("id", profileIds);

    if (profileError) {
      console.error("Admin payments profile fetch error:", {
        error: profileError,
        errorMessage: profileError.message,
      });
    } else {
      ((profileData || []) as ProfileRow[]).forEach((profile) => {
        profilesById.set(profile.id, profile);
      });
    }
  }

  return NextResponse.json({
    orders: orders.map((order) => {
      const listing = order.listing_id ? listingsById.get(order.listing_id) : undefined;
      const buyerProfile = order.buyer_id ? profilesById.get(order.buyer_id) : undefined;
      const sellerProfile = order.seller_id ? profilesById.get(order.seller_id) : undefined;

      return {
        id: order.id,
        shortId: shortId(order.id),
        listingId: order.listing_id,
        cardTitle: listing?.title || "GRAIL Card",
        buyerId: order.buyer_id,
        buyerName: getProfileName(buyerProfile, order.buyer_id),
        sellerId: order.seller_id,
        sellerName: getProfileName(sellerProfile, order.seller_id),
        totalAmount: Number(order.total_amount || 0),
        cardPrice: Number(order.card_price || 0),
        sellerPayoutAmount: Number(order.seller_payout_amount || 0),
        platformFee: Number(order.platform_fee || 0),
        stripeSessionId: order.stripe_session_id || "",
        stripePaymentIntentId: order.stripe_payment_intent_id || "",
        stripeChargeId: order.stripe_charge_id || "",
        stripeRefundId: order.stripe_refund_id || "",
        stripeTransferId: order.stripe_transfer_id || "",
        refundStatus: order.refund_status || "none",
        transferStatus: order.transfer_status || "not_ready",
        fulfillmentStatus: order.fulfillment_status || "pending",
        disputeStatus: order.dispute_status || "none",
        autoReleaseError: order.auto_release_error || "",
        createdAt: order.created_at,
        completedAt: order.completed_at,
        payoutReleasedAt: order.payout_released_at,
      };
    }),
  });
}
