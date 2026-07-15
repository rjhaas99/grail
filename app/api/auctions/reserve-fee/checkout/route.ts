import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  getAuctionStorageDurationDays,
  normalizeAuctionDurationOption,
} from "../../../../lib/auctionDurations";
import {
  calculateReserveFee,
  createServiceSupabaseClient,
  getCurrentUser,
  getRequiredEnv,
  getSiteUrl,
  type AuctionListingRow,
} from "../../_shared";

export const runtime = "nodejs";

type ReserveFeeCheckoutPayload = {
  listingId?: string;
  auctionDurationDays?: number;
  auctionDurationOption?: string;
};

export async function POST(request: Request) {
  const { user, error: authError } = await getCurrentUser(request);

  if (authError || !user) {
    return NextResponse.json({ error: "Sign in to publish a reserve auction." }, { status: 401 });
  }

  let payload: ReserveFeeCheckoutPayload;

  try {
    payload = (await request.json()) as ReserveFeeCheckoutPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const listingId = payload.listingId?.trim();

  if (!listingId) {
    return NextResponse.json({ error: "Listing id is required." }, { status: 400 });
  }

  let supabase;
  let stripe;

  try {
    supabase = createServiceSupabaseClient();
    stripe = new Stripe(getRequiredEnv("STRIPE_SECRET_KEY"));
  } catch (error) {
    console.error("Reserve Commitment Fee checkout configuration error:", error);
    return NextResponse.json(
      { error: "Reserve Commitment Fee checkout is not configured." },
      { status: 500 },
    );
  }

  const { data, error } = await supabase
    .from("listings")
    .select(
      "id, seller_id, title, status, sale_format, auction_status, auction_reserve_price, auction_duration_days, reserve_fee_amount, reserve_fee_status, stripe_reserve_fee_checkout_session_id",
    )
    .eq("id", listingId)
    .eq("seller_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Reserve Commitment Fee listing fetch error:", {
      error,
      errorMessage: error.message,
      listingId,
      sellerId: user.id,
    });
    return NextResponse.json(
      { error: "Auction listing could not be loaded." },
      { status: 500 },
    );
  }

  const listing = data as AuctionListingRow | null;

  if (!listing) {
    return NextResponse.json(
      { error: "Auction listing not found or you do not own it." },
      { status: 404 },
    );
  }

  const reservePrice = Number(listing.auction_reserve_price || 0);

  if (
    listing.sale_format !== "auction" ||
    reservePrice <= 0 ||
    listing.reserve_fee_status === "paid" ||
    listing.reserve_fee_status === "refunded"
  ) {
    return NextResponse.json(
      { error: "This auction does not need Reserve Commitment Fee checkout." },
      { status: 400 },
    );
  }

  const reserveFeeAmount = calculateReserveFee(reservePrice);
  const auctionDuration = normalizeAuctionDurationOption(
    payload.auctionDurationOption ?? payload.auctionDurationDays ?? listing.auction_duration_days,
  );
  const auctionStorageDays = getAuctionStorageDurationDays(auctionDuration.option);
  const siteUrl = getSiteUrl();
  const stripeMetadata = {
    type: "auction_reserve_fee",
    source: "grail",
    listingId,
    sellerId: user.id,
    reservePrice: String(reservePrice),
    reserveFeeAmount: String(reserveFeeAmount),
    auctionDurationOption: auctionDuration.option,
    auctionDurationDays: String(auctionStorageDays),
  };

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: Math.round(reserveFeeAmount * 100),
            product_data: {
              name: "GRAIL Reserve Commitment Fee",
              description: listing.title || "Reserve auction commitment fee",
            },
          },
        },
      ],
      success_url: `${siteUrl}/seller-dashboard?auction_reserve_fee=success&listing=${listingId}`,
      cancel_url: `${siteUrl}/list?edit=${listingId}&auction_reserve_fee=canceled`,
      metadata: stripeMetadata,
      payment_intent_data: {
        metadata: stripeMetadata,
      },
    });

    const { error: updateError } = await supabase
      .from("listings")
      .update({
        reserve_fee_amount: reserveFeeAmount,
        reserve_fee_status: "payment_required",
        auction_duration_days: auctionStorageDays,
        stripe_reserve_fee_checkout_session_id: checkoutSession.id,
      })
      .eq("id", listingId)
      .eq("seller_id", user.id);

    if (updateError) {
      console.error("Reserve Commitment Fee checkout session save error:", {
        error: updateError,
        errorMessage: updateError.message,
        listingId,
        sellerId: user.id,
        stripeSessionId: checkoutSession.id,
      });
      return NextResponse.json(
        { error: "Reserve Commitment Fee checkout could not be saved." },
        { status: 500 },
      );
    }

    console.info("Reserve Commitment Fee checkout created:", {
      stripeSessionId: checkoutSession.id,
      listingId,
      sellerId: user.id,
      reserveFeeAmount,
      auctionDurationOption: auctionDuration.option,
      auctionDurationDays: auctionStorageDays,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe checkout failed.";
    console.error("Reserve Commitment Fee Stripe checkout error:", {
      error,
      errorMessage: message,
      listingId,
      sellerId: user.id,
      reserveFeeAmount,
    });
    return NextResponse.json(
      { error: "Reserve Commitment Fee checkout could not be started.", detail: message },
      { status: 500 },
    );
  }
}
