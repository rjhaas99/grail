import { NextResponse } from "next/server";
import { createTransactionCheckoutSession } from "../../../../lib/transactionCheckout";
import { getCheckoutShippingQuote } from "../../../../lib/shippingProfiles.server";
import {
  createServiceSupabaseClient,
  getCurrentUser,
  type AuctionListingRow,
} from "../../_shared";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type CheckoutRequestBody = {
  pweAcknowledged?: boolean;
};

function getListingFrontImage(listing: AuctionListingRow) {
  return (
    listing.listing_images?.find((image) => image.image_type === "front")?.image_url ||
    listing.listing_images?.find((image) => Boolean(image.image_url))?.image_url ||
    null
  );
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const listingId = String(id || "").trim();
  const { user, error: authError } = await getCurrentUser(request);

  if (authError || !user) {
    return NextResponse.json({ error: "Sign in to pay for this auction." }, { status: 401 });
  }

  console.info("Checkout diagnostic:", {
    event: "auction.route_entered",
    listingId: listingId || null,
    authenticatedUserId: user.id,
  });

  const body = (await request.json().catch(() => ({}))) as CheckoutRequestBody;
  let supabase;

  try {
    supabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Auction winner checkout configuration error:", error);
    return NextResponse.json(
      { error: "Auction checkout is temporarily unavailable." },
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
        status,
        sale_format,
        auction_status,
        auction_current_bid,
        auction_winner_id,
        auction_payment_due_at,
        shipping_profile_id,
        listing_images (
          image_url,
          image_type
        )
      `,
    )
    .eq("id", listingId)
    .maybeSingle();

  if (error) {
    console.error("Auction winner checkout listing fetch error:", {
      error,
      errorMessage: error.message,
      listingId,
      buyerId: user.id,
    });
    return NextResponse.json(
      { error: "Auction could not be loaded." },
      { status: 500 },
    );
  }

  const listing = data as AuctionListingRow | null;

  if (!listing || listing.sale_format !== "auction") {
    return NextResponse.json({ error: "Auction not found." }, { status: 404 });
  }

  if (listing.auction_status !== "awaiting_payment") {
    return NextResponse.json(
      { error: "This auction is not awaiting winner payment." },
      { status: 400 },
    );
  }

  if (listing.auction_winner_id !== user.id) {
    return NextResponse.json(
      { error: "Only the winning bidder can pay for this auction." },
      { status: 403 },
    );
  }

  if (
    listing.auction_payment_due_at &&
    new Date(listing.auction_payment_due_at).getTime() < Date.now()
  ) {
    return NextResponse.json(
      { error: "Auction payment window has expired." },
      { status: 400 },
    );
  }

  const winningBid = Number(listing.auction_current_bid || 0);

  if (!listing.seller_id || winningBid <= 0) {
    return NextResponse.json(
      { error: "Auction checkout amount is unavailable." },
      { status: 400 },
    );
  }

  try {
    const imageUrl = getListingFrontImage(listing);
    const shippingQuote = await getCheckoutShippingQuote({
      supabase,
      profileId: listing.shipping_profile_id,
      listingValue: winningBid,
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
      event: "auction.checkout_payload",
      listingId,
      sellerId: listing.seller_id,
      authenticatedUserId: user.id,
      amount: winningBid,
      shippingAmount: shippingQuote.shippingAmount,
      shippingProfileId: shippingQuote.profile.id,
      title: listing.title || "GRAIL Auction",
      imageUrl: imageUrl || null,
    });

    const checkout = await createTransactionCheckoutSession({
      transactionType: "auction",
      listingId,
      sellerId: listing.seller_id,
      buyerId: user.id,
      amount: winningBid,
      shippingAmount: shippingQuote.shippingAmount,
      shippingLabel: `Shipping — ${shippingQuote.profile.label}`,
      title: listing.title || "GRAIL Auction",
      imageUrl,
      cancelPath: `/cards/${listingId}?auction_checkout=canceled`,
      extraMetadata: {
        auctionId: listingId,
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
    console.error("Auction winner Stripe checkout error:", {
      error,
      errorMessage: message,
      listingId,
      buyerId: user.id,
      winningBid,
      stackLocation:
        error instanceof Error
          ? error.stack
              ?.split("\n")
              .map((line) => line.trim())
              .find((line) => line.startsWith("at ")) || null
          : null,
    });
    return NextResponse.json(
      { error: "Auction checkout could not be started.", detail: message },
      { status: 500 },
    );
  }
}
