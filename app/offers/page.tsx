"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Header from "../components/Header";
import RequireAuth from "../components/RequireAuth";
import { supabase } from "../../lib/supabase";

type Listing = {
  id: string;
  title: string | null;
  price: number | null;
};

type Offer = {
  id: string;
  listing_id: string | null;
  buyer_id: string | null;
  seller_id: string | null;
  amount: number | null;
  message: string | null;
  status: string | null;
  created_at: string | null;
  listings: Listing | null;
};

export default function OffersPage() {
  const [incomingOffers, setIncomingOffers] = useState<Offer[]>([]);
  const [outgoingOffers, setOutgoingOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadOffers();
  }, []);

  async function loadOffers() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: incomingData, error: incomingError } = await supabase
      .from("offers")
      .select(
        `
        id,
        listing_id,
        buyer_id,
        seller_id,
        amount,
        message,
        status,
        created_at,
        listings (
          id,
          title,
          price
        )
      `
      )
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });

    if (incomingError) {
      setMessage(incomingError.message);
      setIncomingOffers([]);
    } else {
      setIncomingOffers((incomingData || []) as unknown as Offer[]);
    }

    const { data: outgoingData, error: outgoingError } = await supabase
      .from("offers")
      .select(
        `
        id,
        listing_id,
        buyer_id,
        seller_id,
        amount,
        message,
        status,
        created_at,
        listings (
          id,
          title,
          price
        )
      `
      )
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });

    if (outgoingError) {
      setMessage(outgoingError.message);
      setOutgoingOffers([]);
    } else {
      setOutgoingOffers((outgoingData || []) as unknown as Offer[]);
    }

    setLoading(false);
  }

  function formatPrice(price: number | null) {
    if (!price) return "$0";

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);
  }

  function formatDate(date: string | null) {
    if (!date) return "Recently";

    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function statusStyle(status: string | null) {
    if (status === "accepted") return "text-green-400";
    if (status === "declined") return "text-red-400";
    if (status === "countered") return "text-yellow-300";
    return "text-zinc-400";
  }

  async function updateOfferStatus(offerId: string, status: string) {
    setMessage("");

    const { error } = await supabase
      .from("offers")
      .update({ status })
      .eq("id", offerId);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadOffers();
  }

  return (
    <RequireAuth>
      <main className="min-h-screen bg-black text-white">
        <Header />

        <section className="mx-auto max-w-6xl px-6 py-16">
          <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">
            Offers
          </p>

          <h1 className="mt-4 text-5xl font-semibold">
            Pending Offers
          </h1>

          <p className="mt-4 text-zinc-400">
            Review incoming offers and manage offers you have sent.
          </p>

          {message && (
            <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
              {message}
            </div>
          )}

          {loading ? (
            <div className="mt-12 rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <p className="text-zinc-400">Loading offers...</p>
            </div>
          ) : (
            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold">Incoming Offers</h2>

                  <p className="text-sm text-zinc-500">
                    {incomingOffers.length} total
                  </p>
                </div>

                <div className="mt-6 space-y-4">
                  {incomingOffers.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-900 p-5">
                      <p className="text-zinc-500">
                        No incoming offers yet.
                      </p>
                    </div>
                  ) : (
                    incomingOffers.map((offer) => (
                      <div
                        key={offer.id}
                        className="rounded-2xl border border-zinc-900 p-5"
                      >
                        <div className="flex justify-between gap-4">
                          <div>
                            <Link
                              href={
                                offer.listing_id
                                  ? `/cards/${offer.listing_id}`
                                  : "/browse"
                              }
                              className="font-semibold hover:underline"
                            >
                              {offer.listings?.title || "Untitled Card"}
                            </Link>

                            <p className="mt-1 text-sm text-zinc-500">
                              Listed at {formatPrice(offer.listings?.price || null)}
                            </p>

                            <p className="mt-1 text-xs text-zinc-600">
                              {formatDate(offer.created_at)}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-sm text-zinc-500">Offer</p>
                            <p className="text-2xl font-bold">
                              {formatPrice(offer.amount)}
                            </p>

                            <p
                              className={`mt-1 text-sm capitalize ${statusStyle(
                                offer.status
                              )}`}
                            >
                              {offer.status || "pending"}
                            </p>
                          </div>
                        </div>

                        {offer.message && (
                          <p className="mt-5 rounded-2xl bg-black p-4 text-sm leading-6 text-zinc-400">
                            {offer.message}
                          </p>
                        )}

                        {offer.status === "pending" && (
                          <div className="mt-5 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                updateOfferStatus(offer.id, "accepted")
                              }
                              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
                            >
                              Accept
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                updateOfferStatus(offer.id, "countered")
                              }
                              className="rounded-full border border-zinc-800 px-5 py-2 text-sm hover:border-zinc-600"
                            >
                              Counter
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                updateOfferStatus(offer.id, "declined")
                              }
                              className="rounded-full border border-zinc-800 px-5 py-2 text-sm text-zinc-400 hover:border-zinc-600"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold">Outgoing Offers</h2>

                  <p className="text-sm text-zinc-500">
                    {outgoingOffers.length} total
                  </p>
                </div>

                <div className="mt-6 space-y-4">
                  {outgoingOffers.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-900 p-5">
                      <p className="text-zinc-500">
                        You have not sent any offers yet.
                      </p>
                    </div>
                  ) : (
                    outgoingOffers.map((offer) => (
                      <div
                        key={offer.id}
                        className="rounded-2xl border border-zinc-900 p-5"
                      >
                        <div className="flex justify-between gap-4">
                          <div>
                            <Link
                              href={
                                offer.listing_id
                                  ? `/cards/${offer.listing_id}`
                                  : "/browse"
                              }
                              className="font-semibold hover:underline"
                            >
                              {offer.listings?.title || "Untitled Card"}
                            </Link>

                            <p className="mt-1 text-sm text-zinc-500">
                              Seller asking {formatPrice(offer.listings?.price || null)}
                            </p>

                            <p className="mt-1 text-xs text-zinc-600">
                              {formatDate(offer.created_at)}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-sm text-zinc-500">Your Offer</p>
                            <p className="text-2xl font-bold">
                              {formatPrice(offer.amount)}
                            </p>

                            <p
                              className={`mt-1 text-sm capitalize ${statusStyle(
                                offer.status
                              )}`}
                            >
                              {offer.status || "pending"}
                            </p>
                          </div>
                        </div>

                        {offer.message && (
                          <p className="mt-5 rounded-2xl bg-black p-4 text-sm leading-6 text-zinc-400">
                            {offer.message}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </RequireAuth>
  );
}