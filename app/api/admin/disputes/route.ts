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
  created_at: string | null;
  fulfillment_status: string | null;
  tracking_number: string | null;
  carrier: string | null;
  dispute_status: string | null;
  dispute_reason: string | null;
  dispute_notes: string | null;
  dispute_opened_at: string | null;
  admin_dispute_notes: string | null;
  transfer_status: string | null;
  stripe_payment_intent_id?: string | null;
  stripe_charge_id?: string | null;
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

type EvidenceRow = {
  id: string;
  order_id: string;
  uploaded_by: string;
  role: string;
  image_url: string | null;
  note: string | null;
  created_at: string | null;
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
    console.error("Admin disputes auth error:", error);
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
    console.error("Admin disputes configuration error:", error);
    return NextResponse.json(
      { error: "Admin disputes are temporarily unavailable." },
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
    .in("dispute_status", ["opened", "under_review"])
    .order("dispute_opened_at", { ascending: false });

  if (orderError) {
    console.error("Admin disputes order fetch error:", {
      error: orderError,
      errorMessage: orderError.message,
      adminId: user.id,
    });
    return NextResponse.json(
      { error: "Disputes could not be loaded." },
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
  const evidenceByOrderId = new Map<string, EvidenceRow[]>();

  if (listingIds.length > 0) {
    const { data: listingData, error: listingError } = await serviceSupabase
      .from("listings")
      .select("id, title")
      .in("id", listingIds);

    if (listingError) {
      console.error("Admin disputes listing fetch error:", listingError);
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
      console.error("Admin disputes profile fetch error:", profileError);
    } else {
      ((profileData || []) as ProfileRow[]).forEach((profile) => {
        profilesById.set(profile.id, profile);
      });
    }
  }

  if (orders.length > 0) {
    const { data: evidenceData, error: evidenceError } = await serviceSupabase
      .from("dispute_evidence")
      .select("id, order_id, uploaded_by, role, image_url, note, created_at")
      .in("order_id", orders.map((order) => order.id))
      .order("created_at", { ascending: false });

    if (evidenceError) {
      console.error("Admin disputes evidence fetch error:", evidenceError);
    } else {
      for (const evidence of (evidenceData || []) as EvidenceRow[]) {
        let imageUrl = evidence.image_url || "";

        if (imageUrl && !imageUrl.startsWith("http")) {
          const { data: signedUrlData, error: signedUrlError } =
            await serviceSupabase.storage.from("card-images").createSignedUrl(imageUrl, 3600);

          if (signedUrlError) {
            console.error("Admin disputes evidence signed URL error:", {
              error: signedUrlError,
              errorMessage: signedUrlError.message,
              evidenceId: evidence.id,
              imagePath: imageUrl,
            });
            imageUrl = "";
          } else {
            imageUrl = signedUrlData.signedUrl;
          }
        }

        const existing = evidenceByOrderId.get(evidence.order_id) || [];
        existing.push({ ...evidence, image_url: imageUrl });
        evidenceByOrderId.set(evidence.order_id, existing);
      }
    }
  }

  return NextResponse.json({
    orders: orders.map((order) => {
      const listing = order.listing_id ? listingsById.get(order.listing_id) : undefined;
      const buyerProfile = order.buyer_id ? profilesById.get(order.buyer_id) : undefined;
      const sellerProfile = order.seller_id ? profilesById.get(order.seller_id) : undefined;

      return {
        id: order.id,
        listingId: order.listing_id,
        cardTitle: listing?.title || "GRAIL Card",
        buyerId: order.buyer_id,
        buyerName: getProfileName(buyerProfile, order.buyer_id),
        sellerId: order.seller_id,
        sellerName: getProfileName(sellerProfile, order.seller_id),
        totalAmount: Number(order.total_amount || 0),
        cardPrice: Number(order.card_price || 0),
        carrier: order.carrier || "",
        trackingNumber: order.tracking_number || "",
        fulfillmentStatus: order.fulfillment_status || "pending",
        transferStatus: order.transfer_status || "not_ready",
        disputeStatus: order.dispute_status || "opened",
        disputeReason: order.dispute_reason || "Not provided",
        disputeNotes: order.dispute_notes || "Not provided",
        disputeOpenedAt: order.dispute_opened_at,
        adminDisputeNotes: order.admin_dispute_notes || "",
        canRefundAutomatically: Boolean(
          order.stripe_payment_intent_id || order.stripe_charge_id,
        ),
        evidence: (evidenceByOrderId.get(order.id) || []).map((evidence) => ({
          id: evidence.id,
          uploadedBy: evidence.uploaded_by,
          uploaderName: getProfileName(
            profilesById.get(evidence.uploaded_by),
            evidence.uploaded_by,
          ),
          role: evidence.role,
          imageUrl: evidence.image_url || "",
          note: evidence.note || "",
          createdAt: evidence.created_at,
        })),
        createdAt: order.created_at,
      };
    }),
  });
}
