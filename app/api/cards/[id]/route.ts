import { NextResponse } from "next/server";
import {
  createServiceSupabaseClient,
  getCurrentUser,
} from "../../auctions/_shared";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const listingId = String(id || "").trim();

  if (!listingId) {
    return NextResponse.json({ error: "Listing ID is required." }, { status: 400 });
  }

  let supabase;

  try {
    supabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Card detail API configuration error:", error);
    return NextResponse.json(
      { error: "Card detail lookup is temporarily unavailable." },
      { status: 500 },
    );
  }

  const { data, error } = await supabase
    .from("listings")
    .select(
      `
        id,
        seller_id,
        title,
        sport,
        player,
        year,
        brand,
        card_number,
        card_type,
        grader,
        grade,
        cert_number,
        condition,
        price,
        status,
        collection_note,
        is_collection_card,
        is_public_collection,
        psa_verified,
        psa_cert_number,
        psa_grade,
        psa_card_name,
        psa_verified_at,
        estimated_value,
        sportscardspro_id,
        sportscardspro_product_name,
        sportscardspro_set_name,
        sportscardspro_estimated_value,
        sportscardspro_price_field,
        sportscardspro_source_url,
        sportscardspro_fetched_at,
        sale_format,
        auction_status,
        auction_starts_at,
        auction_ends_at,
        auction_starting_bid,
        auction_current_bid,
        auction_bid_count,
        auction_reserve_met_at,
        auction_winner_id,
        auction_payment_due_at,
        reserve_fee_status,
        created_at,
        listing_images (
          image_url,
          image_type
        )
      `,
    )
    .eq("id", listingId)
    .maybeSingle();

  if (error) {
    console.error("Card detail API listing fetch error:", {
      error,
      errorMessage: error.message,
      listingId,
    });
    return NextResponse.json({ error: "Card could not be loaded." }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Card not found." }, { status: 404 });
  }

  const listing = data as {
    id: string;
    seller_id?: string | null;
    status?: string | null;
    sale_format?: string | null;
    auction_status?: string | null;
    auction_winner_id?: string | null;
    is_public_collection?: boolean | null;
  };
  const listingStatus = listing.status?.toLowerCase();

  if (listingStatus === "deleted" || listingStatus === "inactive") {
    return NextResponse.json({ error: "Card not found." }, { status: 404 });
  }

  let currentUserId = "";

  if ((request.headers.get("authorization") || "").startsWith("Bearer ")) {
    const { user } = await getCurrentUser(request);
    currentUserId = user?.id || "";
  }

  const isPublicListing =
    listingStatus === "active" ||
    listingStatus === "sold" ||
    (listingStatus === "collection" && Boolean(listing.is_public_collection));
  const isDirectParticipant =
    Boolean(currentUserId) &&
    (listing.seller_id === currentUserId || listing.auction_winner_id === currentUserId);
  let isOrderParticipant = false;

  if (!isPublicListing && !isDirectParticipant && currentUserId) {
    const { data: participantOrder, error: participantError } = await supabase
      .from("orders")
      .select("id")
      .eq("listing_id", listing.id)
      .or(`buyer_id.eq.${currentUserId},seller_id.eq.${currentUserId}`)
      .limit(1)
      .maybeSingle();

    if (participantError) {
      console.error("Card detail API participant order fetch error:", {
        error: participantError,
        errorMessage: participantError.message,
        listingId,
        currentUserId,
      });
    }

    isOrderParticipant = Boolean(participantOrder);
  }

  if (!isPublicListing && !isDirectParticipant && !isOrderParticipant) {
    return NextResponse.json({ error: "Card not found." }, { status: 404 });
  }

  let profile = null;
  let order = null;

  if (listing.seller_id) {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, username")
      .eq("id", listing.seller_id)
      .maybeSingle();

    if (profileError) {
      console.error("Card detail API profile fetch error:", {
        error: profileError,
        errorMessage: profileError.message,
        listingId,
      });
    } else {
      profile = profileData;
    }
  }

  if (
    listingStatus === "sold" &&
    (listing.sale_format !== "auction" || listing.auction_status === "paid")
  ) {
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("total_amount, card_price")
      .eq("listing_id", listing.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (orderError) {
      console.error("Card detail API sold order fetch error:", {
        error: orderError,
        errorMessage: orderError.message,
        listingId,
      });
    } else {
      order = orderData;
    }
  }

  return NextResponse.json({
    listing: data,
    profile,
    order,
  });
}
