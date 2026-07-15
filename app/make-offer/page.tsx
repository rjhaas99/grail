"use client";

import { FormEvent, useEffect, useState } from "react";
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

export default function MakeOfferPage() {
  const router = useRouter();

  const [listing, setListing] = useState<Listing | null>(null);
  const [amount, setAmount] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [pageMessage, setPageMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadListing() {
      const params = new URLSearchParams(window.location.search);
      const listingId = params.get("listingId");

      if (!listingId) {
        setPageMessage("Missing listing. Go back to the card page and click Make Offer again.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("listings")
        .select("id, seller_id, title, price, status")
        .eq("id", listingId)
        .eq("status", "active")
        .maybeSingle();

      if (!active) return;

      if (error) {
        setPageMessage(error.message);
        setLoading(false);
        return;
      }

      if (!data) {
        setPageMessage("This listing was not found or is no longer active.");
        setLoading(false);
        return;
      }

      setListing(data as Listing);
      setLoading(false);
    }

    loadListing();

    return () => {
      active = false;
    };
  }, []);

  function formatPrice(price: number | null) {
    if (!price) return "Price not listed";

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPageMessage("");

    if (!listing) {
      setPageMessage("Listing not loaded.");
      return;
    }

    if (!listing.seller_id) {
      setPageMessage("Seller was not found for this listing.");
      return;
    }

    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      setPageMessage("Please enter a valid offer amount.");
      return;
    }

if (listing.price && numericAmount >= listing.price) {
  setPageMessage(
    "Your offer must be lower than the asking price. Use Buy Now to pay full price."
  );
  return;
}

    try {
      setSubmitting(true);
      setPageMessage("Submitting offer...");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(`/login?redirectTo=${encodeURIComponent(`/make-offer?listingId=${listing.id}`)}`);
        return;
      }

      if (user.id === listing.seller_id) {
        setPageMessage("You cannot make an offer on your own listing.");
        setSubmitting(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.push(`/login?redirectTo=${encodeURIComponent(`/make-offer?listingId=${listing.id}`)}`);
        return;
      }

      const response = await fetch("/api/offers", {
        method: "POST",
        headers: {
          authorization: `Bearer ${session.access_token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          listingId: listing.id,
          amount: numericAmount,
          message: offerMessage.trim(),
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Offer could not be submitted.");
      }

      setPageMessage("Offer submitted successfully.");
      router.push("/offers");
      router.refresh();
    } catch (error) {
  console.error("Offer submit error:", error);

  if (error && typeof error === "object" && "message" in error) {
    setPageMessage(String(error.message));
  } else {
    setPageMessage(JSON.stringify(error));
  }
} finally {
  setSubmitting(false);
}
  }

  return (
    <RequireAuth>
      <main className="min-h-screen bg-black text-white">
        <Header />

        <section className="mx-auto max-w-4xl px-6 py-16">
          <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">
            Make Offer
          </p>

          <h1 className="mt-4 text-5xl font-semibold">
            Send an Offer
          </h1>

          <p className="mt-4 text-zinc-400">
            Submit a real offer to the seller. They will be able to accept, counter, or decline.
          </p>

          {loading ? (
            <div className="mt-10 rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <p className="text-zinc-400">Loading listing...</p>
            </div>
          ) : !listing ? (
            <div className="mt-10 rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <p className="text-zinc-400">{pageMessage}</p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="mt-10 rounded-3xl border border-zinc-900 bg-zinc-950 p-6"
            >
              <h2 className="text-2xl font-semibold">
                {listing.title || "Untitled Card"}
              </h2>

              <p className="mt-2 text-zinc-500">
                Asking Price: {formatPrice(listing.price)}
              </p>

              <div className="mt-8 space-y-5">
                <input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-black p-4 outline-none"
                  placeholder="Offer amount"
                />

                <textarea
                  value={offerMessage}
                  onChange={(event) => setOfferMessage(event.target.value)}
                  className="min-h-32 w-full rounded-2xl border border-zinc-800 bg-black p-4 outline-none"
                  placeholder="Optional message to seller"
                />

                <button
                  type="submit"
                  disabled={submitting}
                  className="block w-full rounded-full bg-white px-8 py-4 text-center font-semibold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Submitting Offer..." : "Submit Offer"}
                </button>

                {pageMessage && (
                  <p className="text-center text-sm text-zinc-400">
                    {pageMessage}
                  </p>
                )}
              </div>
            </form>
          )}
        </section>
      </main>
    </RequireAuth>
  );
}
