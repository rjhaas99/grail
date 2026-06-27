"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import RequireAuth from "../components/RequireAuth";
import { supabase } from "../../lib/supabase";

type Listing = {
  id: string;
  seller_id: string | null;
  title: string | null;
  price: number | null;
  status: string | null;
};

export default function CheckoutPage() {
  const router = useRouter();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadListing() {
      const params = new URLSearchParams(window.location.search);
      const listingId = params.get("listingId");

      if (!listingId) {
        setMessage("Missing listing. Go back to the card page and click Buy Now again.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("listings")
        .select("id, seller_id, title, price, status")
        .eq("id", listingId)
        .eq("status", "active")
        .maybeSingle();

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      if (!data) {
        setMessage("This listing was not found or is no longer active.");
        setLoading(false);
        return;
      }

      setListing(data as Listing);
      setLoading(false);
    }

    loadListing();
  }, []);

  function formatPrice(price: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(price);
  }

  async function confirmPurchase() {
    setMessage("");

    if (!listing) {
      setMessage("Listing not loaded.");
      return;
    }

    if (!listing.seller_id) {
      setMessage("Seller was not found for this listing.");
      return;
    }

    if (!listing.price || listing.price <= 0) {
      setMessage("This listing does not have a valid price.");
      return;
    }

    try {
      setSubmitting(true);
      setMessage("Creating order...");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(
          `/login?redirectTo=${encodeURIComponent(
            `/checkout?listingId=${listing.id}`
          )}`
        );
        return;
      }

      if (user.id === listing.seller_id) {
        setMessage("You cannot buy your own listing.");
        setSubmitting(false);
        return;
      }

      const cardPrice = listing.price;
      const buyerFee = Math.round(cardPrice * 0.03 * 100) / 100;
      const shippingAmount = 12;
      const totalAmount = cardPrice + buyerFee + shippingAmount;

      const { error: orderError } = await supabase.from("orders").insert({
        listing_id: listing.id,
        buyer_id: user.id,
        seller_id: listing.seller_id,
        card_price: cardPrice,
        buyer_fee: buyerFee,
        shipping_amount: shippingAmount,
        total_amount: totalAmount,
        status: "pending",
      });

      if (orderError) throw orderError;

      const { error: listingError } = await supabase
        .from("listings")
        .update({ status: "sold" })
        .eq("id", listing.id);

      if (listingError) throw listingError;

      setMessage("Purchase created successfully.");
      router.push("/orders");
      router.refresh();
    } catch (error) {
      console.error("Order submit error:", error);

      if (error && typeof error === "object" && "message" in error) {
        setMessage(String(error.message));
      } else {
        setMessage(JSON.stringify(error));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const cardPrice = listing?.price || 0;
  const buyerFee = Math.round(cardPrice * 0.03 * 100) / 100;
  const shippingAmount = 12;
  const totalAmount = cardPrice + buyerFee + shippingAmount;

  return (
    <RequireAuth>
      <main className="min-h-screen bg-black text-white">
        <Header />

        <section className="mx-auto max-w-4xl px-6 py-16">
          <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">
            Checkout
          </p>

          <h1 className="mt-4 text-5xl font-semibold">
            Complete Purchase
          </h1>

          {loading ? (
            <div className="mt-10 rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <p className="text-zinc-400">Loading checkout...</p>
            </div>
          ) : !listing ? (
            <div className="mt-10 rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <p className="text-zinc-400">{message}</p>
            </div>
          ) : (
            <div className="mt-10 rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <h2 className="text-2xl font-semibold">
                {listing.title || "Untitled Card"}
              </h2>

              <p className="mt-2 text-zinc-500">
                Secure checkout preview
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Card Price</span>
                  <span>{formatPrice(cardPrice)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-zinc-500">Buyer Fee</span>
                  <span>{formatPrice(buyerFee)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-zinc-500">Shipping</span>
                  <span>{formatPrice(shippingAmount)}</span>
                </div>

                <div className="flex justify-between border-t border-zinc-800 pt-4 text-xl font-semibold">
                  <span>Total</span>
                  <span>{formatPrice(totalAmount)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={confirmPurchase}
                disabled={submitting}
                className="mt-8 w-full rounded-full bg-white px-8 py-4 font-semibold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Creating Order..." : "Confirm Purchase"}
              </button>

              {message && (
                <p className="mt-5 text-center text-sm text-zinc-400">
                  {message}
                </p>
              )}
            </div>
          )}
        </section>
      </main>
    </RequireAuth>
  );
}