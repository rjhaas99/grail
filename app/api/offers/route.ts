import { NextResponse } from "next/server";
import { resolveMarketplacePresentationState } from "../../lib/marketplacePresentationState";
import { createNotification } from "../../lib/notificationEngine";
import { getPublicCollectorHref } from "../../lib/publicCollectorLinks";
import { getShippingProfile } from "../../lib/shippingProfiles";
import { getWatchCountsByListingId } from "../../lib/watchCounts";
import {
  createServiceSupabaseClient,
  getCurrentUser,
} from "../auctions/_shared";

export const runtime = "nodejs";

type OfferStatus = "pending" | "accepted" | "declined" | "countered" | "withdrawn" | "expired" | "completed";

type OfferRow = {
  id: string;
  listing_id: string | null;
  buyer_id: string | null;
  seller_id: string | null;
  amount: number | null;
  message: string | null;
  status: string | null;
  created_at: string | null;
};

type ListingRow = {
  id: string;
  title: string | null;
  sport?: string | null;
  player?: string | null;
  player_name?: string | null;
  year?: string | null;
  brand?: string | null;
  card_number?: string | null;
  card_type?: string | null;
  grader?: string | null;
  grade?: string | null;
  condition?: string | null;
  price: number | null;
  minimum_offer_amount?: number | null;
  offers_enabled?: boolean | null;
  offer_acceptance?: string | null;
  status: string | null;
  sale_format?: string | null;
  auction_status?: string | null;
  auction_ends_at?: string | null;
  is_collection_card?: boolean | null;
  is_public_collection?: boolean | null;
  seller_id: string | null;
  shipping_profile_id?: string | null;
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

type OrderRow = {
  id: string;
  listing_id: string | null;
  buyer_id: string | null;
  seller_id: string | null;
};

const offerListingSelect = `
  id,
  title,
  sport,
  player,
  player_name,
  year,
  brand,
  card_number,
  card_type,
  grader,
  grade,
  condition,
  price,
  minimum_offer_amount,
  offers_enabled,
  offer_acceptance,
  status,
  sale_format,
  auction_status,
  auction_ends_at,
  is_collection_card,
  is_public_collection,
  seller_id,
  shipping_profile_id,
  listing_images (
    image_url,
    image_type
  )
`;

function normalizeAmount(value: unknown) {
  const amount = Number(value);

  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
}

function normalizeStatus(value?: string | null): OfferStatus {
  const normalized = String(value || "pending").toLowerCase();

  if (
    normalized === "accepted" ||
    normalized === "declined" ||
    normalized === "countered" ||
    normalized === "withdrawn" ||
    normalized === "expired" ||
    normalized === "completed"
  ) {
    return normalized;
  }

  return "pending";
}

function getProfileName(profile: ProfileRow | undefined, fallback: string) {
  return profile?.full_name || profile?.username || fallback;
}

function getListingImageUrl(listing?: ListingRow | null) {
  return (
    listing?.listing_images?.find((image) => image.image_type === "front")?.image_url ||
    listing?.listing_images?.find((image) => Boolean(image.image_url))?.image_url ||
    null
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

async function notifyOfferParticipants({
  supabase,
  listing,
  buyerId,
  sellerId,
  action,
  amount,
}: {
  supabase: ReturnType<typeof createServiceSupabaseClient>;
  listing: ListingRow | null;
  buyerId?: string | null;
  sellerId?: string | null;
  action:
    | "created"
    | "accepted"
    | "declined"
    | "countered"
    | "withdrawn"
    | "counter_accepted";
  amount: number;
}) {
  const title = listing?.title || "GRAIL listing";
  const amountDisplay = formatCurrency(amount);

  if (action === "created") {
    await createNotification(supabase, {
      userId: sellerId,
      title: "Offer Received",
      body: `${amountDisplay} offer received for ${title}.`,
      linkUrl: "/offers",
      type: "offer_received",
    });
    return;
  }

  if (action === "accepted") {
    await createNotification(supabase, {
      userId: buyerId,
      title: "Offer Accepted",
      body: `Your ${amountDisplay} offer for ${title} was accepted. Complete payment to start the order.`,
      linkUrl: "/offers",
      type: "offer_accepted",
    });
    await createNotification(supabase, {
      userId: buyerId,
      title: "Payment Needed",
      body: `Complete payment for the accepted offer on ${title}.`,
      linkUrl: "/orders",
      type: "payment_needed",
    });
    await createNotification(supabase, {
      userId: sellerId,
      title: "Offer Accepted",
      body: `You accepted a ${amountDisplay} offer for ${title}. Waiting for buyer payment.`,
      linkUrl: "/seller-dashboard",
      type: "offer_accepted",
    });
    return;
  }

  if (action === "counter_accepted") {
    await createNotification(supabase, {
      userId: sellerId,
      title: "Counter Accepted",
      body: `The buyer accepted your ${amountDisplay} counter offer for ${title}. Waiting for payment.`,
      linkUrl: "/seller-dashboard",
      type: "counter_accepted",
    });
    await createNotification(supabase, {
      userId: buyerId,
      title: "Payment Needed",
      body: `Complete payment for the accepted counter offer on ${title}.`,
      linkUrl: "/orders",
      type: "payment_needed",
    });
    return;
  }

  if (action === "declined") {
    await createNotification(supabase, {
      userId: buyerId,
      title: "Offer Declined",
      body: `Your offer for ${title} was declined.`,
      linkUrl: "/offers",
      type: "offer_declined",
    });
    return;
  }

  if (action === "countered") {
    await createNotification(supabase, {
      userId: buyerId,
      title: "Counter Offer Received",
      body: `The seller countered ${title} at ${amountDisplay}.`,
      linkUrl: "/offers",
      type: "offer_countered",
    });
    return;
  }

  await createNotification(supabase, {
    userId: sellerId,
    title: "Offer Withdrawn",
    body: `The buyer withdrew their offer for ${title}.`,
    linkUrl: "/offers",
    type: "offer_withdrawn",
  });
}

function toOfferView({
  offer,
  currentUserId,
  listing,
  buyer,
  seller,
  completedOrder,
  watchCount = 0,
}: {
  offer: OfferRow;
  currentUserId: string;
  listing?: ListingRow;
  buyer?: ProfileRow;
  seller?: ProfileRow;
  completedOrder?: OrderRow;
  watchCount?: number;
}) {
  const rawStatus = normalizeStatus(offer.status);
  const status = completedOrder ? "completed" : rawStatus;
  const role = offer.seller_id === currentUserId ? "seller" : "buyer";
  const amount = Number(offer.amount || 0);
  const cardTitle = listing?.title || "GRAIL Listing";
  const shippingProfile = getShippingProfile(listing?.shipping_profile_id);

  return {
    id: offer.id,
    listingId: offer.listing_id,
    cardTitle,
    cardHref: offer.listing_id ? `/cards/${offer.listing_id}` : "/browse",
    buyerId: offer.buyer_id,
    sellerId: offer.seller_id,
    buyerName: getProfileName(buyer, offer.buyer_id === currentUserId ? "You" : "Collector"),
    sellerName: getProfileName(seller, offer.seller_id === currentUserId ? "You" : "Seller"),
    buyerHref: getPublicCollectorHref(buyer, offer.buyer_id),
    sellerHref: getPublicCollectorHref(seller, offer.seller_id),
    amount,
    askingPrice: Number(listing?.price || 0),
    minimumOffer: Number(listing?.minimum_offer_amount || 0),
    imageUrl: getListingImageUrl(listing),
    player: listing?.player || listing?.player_name || "",
    year: listing?.year || "",
    brand: listing?.brand || "",
    cardNumber: listing?.card_number || "",
    category: listing?.sport || "",
    cardType: listing?.card_type || "",
    grader: listing?.grader || "",
    grade: listing?.grade || "",
    condition: listing?.condition || "",
    watchCount,
    isHot: watchCount >= 15,
    isGraded: Boolean(listing?.grader || listing?.grade),
    isRaw: !listing?.grader && !listing?.grade,
    message: offer.message,
    status,
    statusLabel:
      status === "completed"
        ? "Completed"
        : status === "accepted"
          ? "Accepted"
          : status === "declined"
            ? "Declined"
            : status === "countered"
              ? "Countered"
              : status === "withdrawn"
                ? "Withdrawn"
                : status === "expired"
                  ? "Expired"
                  : "Pending",
    role,
    createdAt: offer.created_at,
    timeRemaining: status === "accepted" ? "Payment needed" : "No expiration set",
    canAccept: role === "seller" && status === "pending",
    canDecline: role === "seller" && status === "pending",
    canCounter: role === "seller" && status === "pending",
    canWithdraw: role === "buyer" && status === "pending",
    canAcceptCounter: role === "buyer" && status === "countered",
    canDeclineCounter: role === "buyer" && status === "countered",
    canCheckout: role === "buyer" && status === "accepted",
    orderId: completedOrder?.id || null,
    orderHref: completedOrder?.id ? `/orders?order=${completedOrder.id}` : "/orders",
    shippingProfileId: shippingProfile.id,
    shippingProfileLabel: shippingProfile.label,
    requiresPweAcknowledgement:
      shippingProfile.capabilities.buyerAcknowledgementRequired,
  };
}

export async function GET(request: Request) {
  const { user, error: authError } = await getCurrentUser(request);

  if (authError || !user) {
    return NextResponse.json({ error: "Sign in to view offers." }, { status: 401 });
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("offers")
    .select("id, listing_id, buyer_id, seller_id, amount, message, status, created_at")
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Offers fetch error:", {
      error,
      errorMessage: error.message,
      userId: user.id,
    });
    return NextResponse.json({ error: "Offers could not be loaded." }, { status: 500 });
  }

  const offers = (data || []) as OfferRow[];
  const listingIds = Array.from(
    new Set(offers.map((offer) => offer.listing_id).filter((id): id is string => Boolean(id))),
  );
  const profileIds = Array.from(
    new Set(
      offers
        .flatMap((offer) => [offer.buyer_id, offer.seller_id])
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const listingsById = new Map<string, ListingRow>();
  const profilesById = new Map<string, ProfileRow>();
  const completedOrdersByOfferKey = new Map<string, OrderRow>();
  const watchCountsByListingId = new Map<string, number>();

  if (listingIds.length > 0) {
    const { data: listingData, error: listingError } = await supabase
      .from("listings")
      .select(offerListingSelect)
      .in("id", listingIds);

    if (listingError) {
      console.error("Offers listing fetch error:", listingError);
    } else {
      ((listingData || []) as ListingRow[]).forEach((listing) => {
        listingsById.set(listing.id, listing);
      });
    }

    try {
      const watchCounts = await getWatchCountsByListingId(supabase, listingIds);

      watchCounts.forEach((count, listingId) => {
        watchCountsByListingId.set(listingId, count);
      });
    } catch (watchError) {
      console.error("Offers watch count fetch error:", watchError);
    }

    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("id, listing_id, buyer_id, seller_id")
      .in("listing_id", listingIds);

    if (orderError) {
      console.error("Offers order fetch error:", orderError);
    } else {
      ((orderData || []) as OrderRow[]).forEach((order) => {
        if (order.listing_id && order.buyer_id && order.seller_id) {
          completedOrdersByOfferKey.set(
            `${order.listing_id}:${order.buyer_id}:${order.seller_id}`,
            order,
          );
        }
      });
    }
  }

  if (profileIds.length > 0) {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, username")
      .in("id", profileIds);

    if (profileError) {
      console.error("Offers profile fetch error:", profileError);
    } else {
      ((profileData || []) as ProfileRow[]).forEach((profile) => {
        profilesById.set(profile.id, profile);
      });
    }
  }

  const normalizedOffers = offers.map((offer) => {
    const completedOrder = offer.listing_id && offer.buyer_id && offer.seller_id
      ? completedOrdersByOfferKey.get(`${offer.listing_id}:${offer.buyer_id}:${offer.seller_id}`)
      : undefined;

    return toOfferView({
      offer,
      currentUserId: user.id,
      listing: offer.listing_id ? listingsById.get(offer.listing_id) : undefined,
      buyer: offer.buyer_id ? profilesById.get(offer.buyer_id) : undefined,
      seller: offer.seller_id ? profilesById.get(offer.seller_id) : undefined,
      completedOrder,
      watchCount: offer.listing_id
        ? watchCountsByListingId.get(offer.listing_id) || 0
        : 0,
    });
  });

  return NextResponse.json({ offers: normalizedOffers });
}

export async function POST(request: Request) {
  const { user, error: authError } = await getCurrentUser(request);

  if (authError || !user) {
    return NextResponse.json({ error: "Sign in to make an offer." }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as {
    listingId?: string;
    amount?: unknown;
    message?: string;
  } | null;
  const listingId = String(body?.listingId || "").trim();
  const amount = normalizeAmount(body?.amount);
  const message = String(body?.message || "").trim();

  if (!listingId) {
    return NextResponse.json({ error: "Listing is required." }, { status: 400 });
  }

  if (amount <= 0) {
    return NextResponse.json({ error: "Enter a valid offer amount." }, { status: 400 });
  }

  const supabase = createServiceSupabaseClient();
  const { data: listingData, error: listingError } = await supabase
    .from("listings")
    .select(offerListingSelect)
    .eq("id", listingId)
    .maybeSingle();

  if (listingError) {
    console.error("Offer listing fetch error:", listingError);
    return NextResponse.json({ error: "Listing could not be loaded." }, { status: 500 });
  }

  const listing = listingData as ListingRow | null;

  const listingStatus = listing?.status?.toLowerCase() || "";
  const marketplaceState = listing
    ? resolveMarketplacePresentationState(listing)
    : "collection_offer_only";

  if (!listing || !["active", "collection"].includes(listingStatus)) {
    return NextResponse.json({ error: "This listing is not accepting offers." }, { status: 404 });
  }

  if (listing.offers_enabled === false) {
    return NextResponse.json({ error: "This listing is not accepting offers." }, { status: 400 });
  }

  if (
    marketplaceState === "active_auction" ||
    marketplaceState === "auction_pending_settlement"
  ) {
    return NextResponse.json({ error: "Auctions use bidding, not offers." }, { status: 400 });
  }

  if (!listing.seller_id) {
    return NextResponse.json({ error: "Seller was not found for this listing." }, { status: 400 });
  }

  if (listing.seller_id === user.id) {
    return NextResponse.json({ error: "You cannot make an offer on your own listing." }, { status: 403 });
  }

  if (
    marketplaceState === "for_sale" &&
    listing.price &&
    amount >= Number(listing.price)
  ) {
    return NextResponse.json(
      { error: "Your offer must be lower than the asking price. Use Buy Now to pay full price." },
      { status: 400 },
    );
  }

  const minimumOfferAmount = Number(listing.minimum_offer_amount || 0);

  if (minimumOfferAmount > 0 && amount < minimumOfferAmount) {
    return NextResponse.json(
      { error: "Offer is below the seller's minimum." },
      { status: 400 },
    );
  }

  const shouldAutoAccept =
    listing.offer_acceptance === "auto_accept_at_minimum" &&
    minimumOfferAmount > 0 &&
    amount >= minimumOfferAmount;

  const { data: insertedOffer, error: insertError } = await supabase
    .from("offers")
    .insert({
      listing_id: listing.id,
      buyer_id: user.id,
      seller_id: listing.seller_id,
      amount,
      message: message || null,
      status: shouldAutoAccept ? "accepted" : "pending",
    })
    .select("id, listing_id, buyer_id, seller_id, amount, message, status, created_at")
    .single();

  if (insertError) {
    console.error("Offer insert error:", {
      error: insertError,
      errorMessage: insertError.message,
      listingId,
      buyerId: user.id,
    });
    return NextResponse.json({ error: "Offer could not be sent." }, { status: 500 });
  }

  await notifyOfferParticipants({
    supabase,
    listing,
    buyerId: user.id,
    sellerId: listing.seller_id,
    action: shouldAutoAccept ? "accepted" : "created",
    amount,
  });

  return NextResponse.json({
    offer: toOfferView({
      offer: insertedOffer as OfferRow,
      currentUserId: user.id,
      listing,
    }),
  });
}

export async function PATCH(request: Request) {
  const { user, error: authError } = await getCurrentUser(request);

  if (authError || !user) {
    return NextResponse.json({ error: "Sign in to manage offers." }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as {
    offerId?: string;
    action?: string;
    counterAmount?: unknown;
  } | null;
  const offerId = String(body?.offerId || "").trim();
  const action = String(body?.action || "").trim();

  if (!offerId || !action) {
    return NextResponse.json({ error: "Offer action is required." }, { status: 400 });
  }

  const supabase = createServiceSupabaseClient();
  const { data: offerData, error: offerError } = await supabase
    .from("offers")
    .select("id, listing_id, buyer_id, seller_id, amount, message, status, created_at")
    .eq("id", offerId)
    .maybeSingle();

  if (offerError) {
    console.error("Offer action fetch error:", offerError);
    return NextResponse.json({ error: "Offer could not be loaded." }, { status: 500 });
  }

  const offer = offerData as OfferRow | null;

  if (!offer) {
    return NextResponse.json({ error: "Offer not found." }, { status: 404 });
  }

  const currentStatus = normalizeStatus(offer.status);
  const { data: listingData, error: listingError } = await supabase
    .from("listings")
    .select(offerListingSelect)
    .eq("id", offer.listing_id || "")
    .maybeSingle();

  if (listingError) {
    console.error("Offer action listing fetch error:", listingError);
    return NextResponse.json({ error: "Listing could not be loaded." }, { status: 500 });
  }

  const listing = listingData as ListingRow | null;
  let nextStatus: OfferStatus | null = null;
  let nextAmount = Number(offer.amount || 0);
  let notificationAction:
    | "accepted"
    | "declined"
    | "countered"
    | "withdrawn"
    | "counter_accepted"
    | null = null;

  if (action === "accept") {
    if (offer.seller_id !== user.id || currentStatus !== "pending") {
      return NextResponse.json({ error: "This offer cannot be accepted." }, { status: 403 });
    }
    nextStatus = "accepted";
    notificationAction = "counter_accepted";
  } else if (action === "decline") {
    if (offer.seller_id !== user.id || currentStatus !== "pending") {
      return NextResponse.json({ error: "This offer cannot be declined." }, { status: 403 });
    }
    nextStatus = "declined";
    notificationAction = "declined";
  } else if (action === "counter") {
    if (offer.seller_id !== user.id || currentStatus !== "pending") {
      return NextResponse.json({ error: "This offer cannot be countered." }, { status: 403 });
    }
    const counterAmount = normalizeAmount(body?.counterAmount);
    if (counterAmount <= 0) {
      return NextResponse.json({ error: "Enter a valid counter amount." }, { status: 400 });
    }
    nextStatus = "countered";
    nextAmount = counterAmount;
    notificationAction = "countered";
  } else if (action === "withdraw") {
    if (offer.buyer_id !== user.id || currentStatus !== "pending") {
      return NextResponse.json({ error: "This offer cannot be withdrawn." }, { status: 403 });
    }
    nextStatus = "withdrawn";
    notificationAction = "withdrawn";
  } else if (action === "accept_counter") {
    if (offer.buyer_id !== user.id || currentStatus !== "countered") {
      return NextResponse.json({ error: "This counter offer cannot be accepted." }, { status: 403 });
    }
    nextStatus = "accepted";
    notificationAction = "accepted";
  } else if (action === "decline_counter") {
    if (offer.buyer_id !== user.id || currentStatus !== "countered") {
      return NextResponse.json({ error: "This counter offer cannot be declined." }, { status: 403 });
    }
    nextStatus = "declined";
    notificationAction = "declined";
  } else {
    return NextResponse.json({ error: "Unsupported offer action." }, { status: 400 });
  }

  const { data: updatedOffer, error: updateError } = await supabase
    .from("offers")
    .update({
      status: nextStatus,
      amount: nextAmount,
    })
    .eq("id", offer.id)
    .select("id, listing_id, buyer_id, seller_id, amount, message, status, created_at")
    .single();

  if (updateError) {
    console.error("Offer action update error:", {
      error: updateError,
      errorMessage: updateError.message,
      offerId,
      action,
      userId: user.id,
    });
    return NextResponse.json({ error: "Offer could not be updated." }, { status: 500 });
  }

  if (notificationAction) {
    await notifyOfferParticipants({
      supabase,
      listing,
      buyerId: offer.buyer_id,
      sellerId: offer.seller_id,
      action: notificationAction,
      amount: nextAmount,
    });
  }

  return NextResponse.json({
    offer: toOfferView({
      offer: updatedOffer as OfferRow,
      currentUserId: user.id,
      listing: listing || undefined,
    }),
  });
}
