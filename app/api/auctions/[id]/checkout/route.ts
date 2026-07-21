import { NextResponse } from "next/server";
import { createTransactionCheckoutSession } from "../../../../lib/transactionCheckout";
import {
  createServiceSupabaseClient,
  getCurrentUser,
  type AuctionListingRow,
} from "../../_shared";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
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
        listing_images (
          image_url,
          image_type,
          display_order
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
    const checkout = await createTransactionCheckoutSession({
      transactionType: "auction",
      listingId,
      sellerId: listing.seller_id,
      buyerId: user.id,
      amount: winningBid,
      title: listing.title || "GRAIL Auction",
      imageUrl: getListingFrontImage(listing),
      cancelPath: `/cards/${listingId}?auction_checkout=canceled`,
      extraMetadata: {
        auctionId: listingId,
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
    });
    return NextResponse.json(
      { error: "Auction checkout could not be started.", detail: message },
      { status: 500 },
    );
  }
}
