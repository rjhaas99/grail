import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  createServiceSupabaseClient,
  getCurrentUser,
  getRequiredEnv,
  getSiteUrl,
  type AuctionListingRow,
} from "../../_shared";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const listingId = String(id || "").trim();
  const { user, error: authError } = await getCurrentUser(request);

  if (authError || !user) {
    return NextResponse.json({ error: "Sign in to pay for this auction." }, { status: 401 });
  }

  let supabase;
  let stripe;

  try {
    supabase = createServiceSupabaseClient();
    stripe = new Stripe(getRequiredEnv("STRIPE_SECRET_KEY"));
  } catch (error) {
    console.error("Auction winner checkout configuration error:", error);
    return NextResponse.json(
      { error: "Auction checkout is not configured." },
      { status: 500 },
    );
  }

  const { data, error } = await supabase
    .from("listings")
    .select(
      "id, seller_id, title, status, sale_format, auction_status, auction_current_bid, auction_winner_id, auction_payment_due_at",
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

  const siteUrl = getSiteUrl();
  const stripeMetadata = {
    type: "auction_sale",
    source: "grail",
    listingId,
    sellerId: listing.seller_id,
    buyerId: user.id,
    auctionId: listingId,
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: user.id,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: Math.round(winningBid * 100),
            product_data: {
              name: listing.title || "GRAIL Auction",
            },
          },
        },
      ],
      success_url: `${siteUrl}/checkout/${listingId}?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/cards/${listingId}?auction_checkout=canceled`,
      metadata: stripeMetadata,
      payment_intent_data: {
        metadata: stripeMetadata,
      },
    });

    return NextResponse.json({ url: session.url });
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
