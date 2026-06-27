"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Header from "../components/Header";
import { supabase } from "../../lib/supabase";

type ListingImage = {
  image_url: string | null;
  image_type: string | null;
};

type Listing = {
  id: string;
  title: string | null;
  sport: string | null;
  player: string | null;
  year: string | null;
  brand: string | null;
  card_type: string | null;
  grader: string | null;
  grade: string | null;
  price: number | null;
  created_at: string | null;
  listing_images: ListingImage[];
};

export default function BrowsePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadListings() {
      const { data, error } = await supabase
        .from("listings")
        .select(
          `
          id,
          title,
          sport,
          player,
          year,
          brand,
          card_type,
          grader,
          grade,
          price,
          created_at,
          listing_images (
            image_url,
            image_type
          )
        `
        )
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Browse listings error:", error);
        setListings([]);
        setLoading(false);
        return;
      }

      const rows = (data || []) as unknown as Listing[];

setListings(rows);
setLoading(false);
    }

    loadListings();
  }, []);

  function getFrontImage(listing: Listing) {
    const frontImage = listing.listing_images?.find(
      (image) => image.image_type === "front"
    );

    return frontImage?.image_url || listing.listing_images?.[0]?.image_url || null;
  }

  function formatPrice(price: number | null) {
    if (!price) return "Price not listed";

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <Header />

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">
              Marketplace
            </p>

            <h1 className="mt-4 text-5xl font-semibold tracking-tight">
              Browse Cards
            </h1>

            <p className="mt-4 max-w-2xl text-zinc-400">
              Discover active listings from collectors and sellers on GRAIL.
            </p>
          </div>

          <Link
            href="/list"
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-zinc-200"
          >
            List a Card
          </Link>
        </div>

        <div className="mt-10">
          <input
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-5 py-4 text-white outline-none placeholder:text-zinc-600"
            placeholder="Search cards, players, brands, sets..."
          />
        </div>

        {loading ? (
          <div className="mt-12 rounded-3xl border border-zinc-900 bg-zinc-950 p-8">
            <p className="text-zinc-400">Loading listings...</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="mt-12 rounded-3xl border border-zinc-900 bg-zinc-950 p-8 text-center">
            <h2 className="text-2xl font-semibold">No listings yet</h2>

            <p className="mt-3 text-zinc-500">
              Once someone lists a card, it will appear here.
            </p>

            <Link
              href="/list"
              className="mt-6 inline-block rounded-full bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-zinc-200"
            >
              Create First Listing
            </Link>
          </div>
        ) : (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((listing) => {
              const imageUrl = getFrontImage(listing);

              return (
                <Link
                  key={listing.id}
                  href={`/cards/${listing.id}`}
                  className="group rounded-3xl border border-zinc-900 bg-zinc-950 p-4 transition hover:border-zinc-700"
                >
                  <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl bg-zinc-900">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={listing.title || "Card listing"}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      <p className="text-sm text-zinc-600">
                        No Image
                      </p>
                    )}
                  </div>

                  <div className="mt-4">
                    <p className="line-clamp-2 text-lg font-semibold">
                      {listing.title || "Untitled Card"}
                    </p>

                    <p className="mt-2 text-sm text-zinc-500">
                      {listing.sport || "Trading Card"}
                      {listing.grader && listing.grade
                        ? ` • ${listing.grader} ${listing.grade}`
                        : ""}
                    </p>

                    <p className="mt-4 text-2xl font-bold">
                      {formatPrice(listing.price)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}