import { NextResponse } from "next/server";
import { createTransactionCheckoutSession } from "../../../../lib/transactionCheckout";
import { getCheckoutShippingQuote } from "../../../../lib/shippingProfiles.server";
import {
  createServiceSupabaseClient,
  getCurrentUser,
} from "../../../auctions/_shared";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type OfferRow = {
  id: string;
  listing_id: string | null;
  buyer_id: string | null;
  seller_id: string | null;
  amount: number | null;
  status: string | null;
};

type CheckoutRequestBody = {
  pweAcknowledged?: boolean;
};

type ListingRow = {
  id: string;
  seller_id: string | null;
  title: string | null;
  price?: number | null;
  status: string | null;
  sale_format?: string | null;
  shipping_profile_id?: string | null;
  listing_images?: Array<{
    image_url: string | null;
    image_type: string | null;
  }> | null;
};

function getListingFrontImage(listing: ListingRow) {
  return (
    listing.listing_images?.find((image) => image.image_type === "front")?.image_url ||
    listing.listing_images?.find((image) => Boolean(image.image_url))?.image_url ||
    null
  );
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const offerId = String(id || "").trim();
  const { user, error: authError } = await getCurrentUser(request);

  if (authError || !user) {
    return NextResponse.json({ error: "Sign in to pay for this offer." }, { status: 401 });
  }

  console.info("Checkout diagnostic:", {
    event: "accepted_offer.route_entered",
    offerId: offerId || null,
    authenticatedUserId: user.id,
  });

  if (!offerId) {
    return NextResponse.json({ error: "Offer is required." }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as CheckoutRequestBody;
  const supabase = createServiceSupabaseClient();
  const { data: offerData, error: offerError } = await supabase
    .from("offers")
    .select("id, listing_id, buyer_id, seller_id, amount, status")
    .eq("id", offerId)
    .maybeSingle();

  if (offerError) {
    console.error("Accepted offer checkout fetch error:", {
      error: offerError,
      errorMessage: offerError.message,
      offerId,
      buyerId: user.id,
    });
    return NextResponse.json({ error: "Offer could not be loaded." }, { status: 500 });
  }

  const offer = offerData as OfferRow | null;

  if (!offer || offer.buyer_id !== user.id) {
    return NextResponse.json({ error: "Offer not found." }, { status: 404 });
  }

  if (offer.status !== "accepted") {
    return NextResponse.json(
      { error: "This offer is not awaiting payment." },
      { status: 400 },
    );
  }

  const amount = Number(offer.amount || 0);

  if (!offer.listing_id || !offer.seller_id || amount <= 0) {
    return NextResponse.json(
      { error: "Offer payment details are unavailable." },
      { status: 400 },
    );
  }

  const { data: listingData, error: listingError } = await supabase
    .from("listings")
    .select(
      `
        id,
        seller_id,
        title,
        price,
        status,
        sale_format,
        shipping_profile_id,
        listing_images (
          image_url,
          image_type
        )
      `,
    )
    .eq("id", offer.listing_id)
    .maybeSingle();

  if (listingError) {
    console.error("Accepted offer listing fetch error:", {
      error: listingError,
      errorMessage: listingError.message,
      offerId,
      listingId: offer.listing_id,
    });
    return NextResponse.json({ error: "Listing could not be loaded." }, { status: 500 });
  }

  const listing = listingData as ListingRow | null;

  if (!listing || listing.seller_id !== offer.seller_id) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  if (listing.status !== "active") {
    return NextResponse.json(
      { error: "This listing is no longer available for offer payment." },
      { status: 400 },
    );
  }

  if (listing.sale_format === "auction") {
    return NextResponse.json(
      { error: "Auction listings must use auction checkout." },
      { status: 400 },
    );
  }

  try {
    const imageUrl = getListingFrontImage(listing);
    const shippingQuote = await getCheckoutShippingQuote({
      supabase,
      profileId: listing.shipping_profile_id,
      listingValue: amount,
    });

    if (!shippingQuote.ok) {
      return NextResponse.json({ error: shippingQuote.error }, { status: 400 });
    }

    if (
      shippingQuote.profile.capabilities.buyerAcknowledgementRequired &&
      !body.pweAcknowledged
    ) {
      return NextResponse.json(
        { error: "Acknowledge Plain White Envelope shipping before checkout." },
        { status: 400 },
      );
    }

    console.info("Checkout diagnostic:", {
      event: "accepted_offer.checkout_payload",
      offerId: offer.id,
      listingId: listing.id,
      sellerId: offer.seller_id,
      authenticatedUserId: user.id,
      amount,
      shippingAmount: shippingQuote.shippingAmount,
      shippingProfileId: shippingQuote.profile.id,
      title: listing.title || "GRAIL Accepted Offer",
      imageUrl: imageUrl || null,
    });

    const checkout = await createTransactionCheckoutSession({
      transactionType: "accepted_offer",
      listingId: listing.id,
      sellerId: offer.seller_id,
      buyerId: user.id,
      amount,
      shippingAmount: shippingQuote.shippingAmount,
      shippingLabel: `Shipping — ${shippingQuote.profile.label}`,
      title: listing.title || "GRAIL Accepted Offer",
      imageUrl,
      successPath: `/orders?offer_checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelPath: "/offers?checkout=canceled",
      extraMetadata: {
        offerId: offer.id,
        transactionId: `offer:${offer.id}`,
        shippingAmount: shippingQuote.shippingAmount,
        shippingProfileId: shippingQuote.profile.id,
        shippingProfileLabel: shippingQuote.profile.label,
        shippingTrackingSupported: shippingQuote.profile.capabilities.trackingSupported,
        shippingLabelRequired: shippingQuote.profile.capabilities.labelGenerationSupported,
        shippingBuyerAcknowledged: Boolean(body.pweAcknowledged),
      },
    });

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe checkout failed.";
    console.error("Accepted offer Stripe checkout error:", {
      error,
      errorMessage: message,
      offerId,
      listingId: listing.id,
      buyerId: user.id,
      amount,
      stackLocation:
        error instanceof Error
          ? error.stack
              ?.split("\n")
              .map((line) => line.trim())
              .find((line) => line.startsWith("at ")) || null
          : null,
    });
    return NextResponse.json(
      { error: "Offer checkout could not be started.", detail: message },
      { status: 500 },
    );
  }
}
