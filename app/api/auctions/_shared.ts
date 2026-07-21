import { createClient } from "@supabase/supabase-js";
import { getConfiguredSiteUrl } from "../../lib/siteConfig";

export const adminEmails = ["ryanjhaas99@gmail.com"];

export type AuctionListingRow = {
  id: string;
  seller_id: string | null;
  title: string | null;
  status: string | null;
  sale_format?: string | null;
  auction_status?: string | null;
  auction_starts_at?: string | null;
  auction_ends_at?: string | null;
  auction_starting_bid?: number | null;
  auction_reserve_price?: number | null;
  auction_reserve_met_at?: string | null;
  auction_current_bid?: number | null;
  auction_bid_count?: number | null;
  auction_winner_id?: string | null;
  auction_payment_due_at?: string | null;
  auction_duration_days?: number | null;
  reserve_fee_amount?: number | null;
  reserve_fee_status?: string | null;
  stripe_reserve_fee_checkout_session_id?: string | null;
  stripe_reserve_fee_payment_intent_id?: string | null;
  stripe_reserve_fee_refund_id?: string | null;
  listing_images?: Array<{
    image_url: string | null;
    image_type: string | null;
    display_order?: number | null;
  }> | null;
};

export function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

export function createAnonSupabaseClient() {
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

export function createServiceSupabaseClient() {
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

export function getBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") || "";

  return authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
}

export async function getCurrentUser(request: Request) {
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
    console.error("Auction auth error:", error);
  }

  return { user, error: error?.message || null };
}

export function getSiteUrl() {
  return getConfiguredSiteUrl();
}

export function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateReserveFee(reservePrice: number) {
  return roundCurrency(Math.min(100, Math.max(1, reservePrice * 0.05)));
}

export function getBidIncrement(currentBid: number) {
  if (currentBid < 100) return 1;
  if (currentBid < 500) return 5;
  if (currentBid < 1000) return 10;
  if (currentBid < 5000) return 25;
  return 50;
}

export function getMinimumNextBid(listing: AuctionListingRow) {
  const currentBid = Number(listing.auction_current_bid || 0);

  if (currentBid > 0) {
    return roundCurrency(currentBid + getBidIncrement(currentBid));
  }

  return Math.max(roundCurrency(Number(listing.auction_starting_bid || 0)), 0.99);
}

export function isAuctionActive(listing: AuctionListingRow) {
  if (listing.sale_format !== "auction") return false;
  if (listing.status !== "active") return false;
  if (listing.auction_status !== "active") return false;
  if (!listing.auction_ends_at) return false;
  return new Date(listing.auction_ends_at).getTime() > Date.now();
}

export function getAuctionReserveStatus(listing: AuctionListingRow) {
  const hasReserve = listing.reserve_fee_status && listing.reserve_fee_status !== "none";

  if (!hasReserve) {
    return "No Reserve";
  }

  return listing.auction_reserve_met_at ? "Reserve Met" : "Reserve Not Met";
}
