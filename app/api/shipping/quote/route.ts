import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getCheckoutShippingQuote } from "../../../lib/shippingProfiles.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ShippingQuotePayload = {
  listingId?: string;
  amount?: number;
};

type ListingRow = {
  id: string;
  price: number | string | null;
  auction_starting_bid?: number | string | null;
  auction_current_bid?: number | string | null;
  sale_format?: string | null;
  shipping_profile_id?: string | null;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function createServiceSupabaseClient() {
  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
  );
}

function getListingValue(listing: ListingRow, overrideAmount?: number) {
  if (Number.isFinite(overrideAmount) && Number(overrideAmount) > 0) {
    return Number(overrideAmount);
  }

  const price = Number(listing.price || 0);
  const currentBid = Number(listing.auction_current_bid || 0);
  const startingBid = Number(listing.auction_starting_bid || 0);

  if (listing.sale_format === "auction") {
    return currentBid > 0 ? currentBid : startingBid;
  }

  return price;
}

export async function POST(request: Request) {
  let payload: ShippingQuotePayload;

  try {
    payload = (await request.json()) as ShippingQuotePayload;
  } catch {
    return NextResponse.json({ error: "Invalid shipping rate request." }, { status: 400 });
  }

  const listingId = payload.listingId?.trim();

  if (!listingId) {
    return NextResponse.json({ error: "Listing ID is required." }, { status: 400 });
  }

  let supabase;

  try {
    supabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Shipping rate configuration error:", error);
    return NextResponse.json(
      { error: "Shipping rate is temporarily unavailable." },
      { status: 500 },
    );
  }

  const { data, error } = await supabase
    .from("listings")
    .select("id, price, auction_starting_bid, auction_current_bid, sale_format, shipping_profile_id")
    .eq("id", listingId)
    .maybeSingle();

  if (error) {
    console.error("Shipping rate listing fetch error:", {
      listingId,
      error: error.message,
    });
    return NextResponse.json({ error: "Shipping rate could not be loaded." }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Listing was not found." }, { status: 404 });
  }

  const listing = data as ListingRow;
  const quote = await getCheckoutShippingQuote({
    supabase,
    profileId: listing.shipping_profile_id,
    listingValue: getListingValue(listing, payload.amount),
  });

  if (!quote.ok) {
    return NextResponse.json({ error: quote.error }, { status: 400 });
  }

  return NextResponse.json({
    shippingAmount: quote.shippingAmount,
    profile: quote.publicProfile,
    source: quote.source,
  });
}
