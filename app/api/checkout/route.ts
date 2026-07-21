import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";
import { createTransactionCheckoutSession } from "../../lib/transactionCheckout";

type CheckoutRequestBody = {
  listingId?: string;
};

type CheckoutListing = {
  id: string;
  seller_id: string | null;
  title: string | null;
  sport: string | null;
  player: string | null;
  year: string | null;
  brand: string | null;
  card_number: string | null;
  price: number | null;
  status: string | null;
  sale_format?: string | null;
  listing_images?: Array<{
    image_url: string | null;
    image_type: string | null;
    display_order?: number | null;
  }> | null;
};

function buildListingTitle(listing: CheckoutListing) {
  return (
    listing.title ||
    [listing.year, listing.brand, listing.player, listing.card_number]
      .filter(Boolean)
      .join(" ") ||
    `GRAIL Listing ${listing.id}`
  );
}

function getListingFrontImage(listing: CheckoutListing) {
  return (
    listing.listing_images?.find((image) => image.image_type === "front")?.image_url ||
    listing.listing_images?.find((image) => Boolean(image.image_url))?.image_url ||
    null
  );
}

export async function POST(request: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    return NextResponse.json(
      {
        error: "Checkout is temporarily unavailable.",
      },
      { status: 503 },
    );
  }

  let body: CheckoutRequestBody;

  try {
    body = (await request.json()) as CheckoutRequestBody;
  } catch (error) {
    console.error("Checkout request JSON parse error:", error);
    return NextResponse.json(
      { error: "Invalid checkout request." },
      { status: 400 },
    );
  }

  const listingId = body.listingId?.trim();

  if (!listingId) {
    return NextResponse.json(
      { error: "Listing ID is required." },
      { status: 400 },
    );
  }

  try {
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
          price,
          status,
          sale_format,
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
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        { error: "Listing was not found." },
        { status: 404 },
      );
    }

    const listing = data as CheckoutListing;
    const price = Number(listing.price || 0);
    const saleFormat = listing.sale_format || "fixed";

    if (!listing.seller_id) {
      return NextResponse.json(
        { error: "This listing is missing seller payment information." },
        { status: 400 },
      );
    }

    if (listing.status !== "active") {
      return NextResponse.json(
        { error: "This card is open to offers, not Buy Now." },
        { status: 400 },
      );
    }

    if (saleFormat === "auction") {
      return NextResponse.json(
        { error: "Auction listings use winner checkout, not Buy Now." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json(
        { error: "This listing does not have a valid Buy Now price." },
        { status: 400 },
      );
    }

    const authHeader = request.headers.get("authorization") || "";
    const accessToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : "";
    let buyerId = "";

    if (accessToken) {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser(accessToken);

      if (userError) {
        console.error("Checkout auth user lookup error:", userError);
      }

      if (user?.id && user.id === listing.seller_id) {
        return NextResponse.json(
          { error: "You cannot buy your own listing." },
          { status: 403 },
        );
      }

      buyerId = user?.id || "";
    }

    const title = buildListingTitle(listing);
    const checkout = await createTransactionCheckoutSession({
      transactionType: "buy_now",
      listingId: listing.id,
      sellerId: listing.seller_id,
      buyerId,
      amount: price,
      title,
      imageUrl: getListingFrontImage(listing),
    });

    if (!checkout.url) {
      return NextResponse.json(
        { error: "Stripe checkout URL could not be created." },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    console.error("Stripe checkout session error:", error);
    return NextResponse.json(
      { error: "Stripe checkout could not be started." },
      { status: 500 },
    );
  }
}
