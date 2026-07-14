"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Header from "../../components/Header";
import PublicTrustSection from "../../components/PublicTrustSection";
import { supabase } from "../../../lib/supabase";

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  bio: string | null;
  seller_level: string | null;
  verified: boolean | null;
  created_at: string | null;
};

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
  status: string | null;
  created_at: string | null;
  listing_images: ListingImage[] | null;
};

type SellerStats = {
  active_listings: number | null;
  sold_cards: number | null;
  total_sales: number | null;
};

export default function SellerPublicProfilePage() {
  const params = useParams();
  const sellerId = String(params.id || "");

  const [profile, setProfile] = useState<Profile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadSellerProfile = useCallback(async () => {
    setLoading(true);
    setMessage("");

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select(
        "id, full_name, username, email, bio, seller_level, verified, created_at"
      )
      .eq("id", sellerId)
      .maybeSingle();

    if (profileError) {
      setMessage(profileError.message);
      setLoading(false);
      return;
    }

    if (!profileData) {
      setMessage("Seller profile was not found.");
      setLoading(false);
      return;
    }

    setProfile(profileData as Profile);

    const { data: statsData, error: statsError } = await supabase
      .from("public_seller_stats")
      .select("active_listings, sold_cards, total_sales")
      .eq("seller_id", sellerId)
      .maybeSingle();

    if (!statsError && statsData) {
      setStats(statsData as SellerStats);
    }

    const { data: listingData, error: listingError } = await supabase
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
        status,
        created_at,
        listing_images (
          image_url,
          image_type
        )
      `
      )
      .eq("seller_id", sellerId)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (listingError) {
      setMessage(listingError.message);
      setListings([]);
    } else {
      setListings((listingData || []) as unknown as Listing[]);
    }

    setLoading(false);
  }, [sellerId]);

  useEffect(() => {
    if (sellerId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadSellerProfile();
    }
  }, [sellerId, loadSellerProfile]);

  function formatPrice(price: number | null) {
    if (!price) return "Price not listed";

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
      year: "numeric",
    });
  }

  function formatMoney(price: number | null) {
    if (!price) return "$0";

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);
  }

  function getDisplayName() {
    if (!profile) return "Seller";
    return profile.full_name || profile.username || "GRAIL Seller";
  }

  function getUsername() {
    if (!profile?.username) return "seller";
    return profile.username;
  }

  function getImage(listing: Listing) {
    return (
      listing.listing_images?.find((image) => image.image_type === "front")
        ?.image_url ||
      listing.listing_images?.[0]?.image_url ||
      null
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <Header />

      <section className="mx-auto max-w-7xl px-6 py-16">
        {loading ? (
          <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-8">
            <p className="text-zinc-400">Loading seller profile...</p>
          </div>
        ) : !profile ? (
          <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-8">
            <h1 className="text-3xl font-semibold">Seller not found</h1>

            <p className="mt-3 text-zinc-500">{message}</p>

            <Link
              href="/browse"
              className="mt-6 inline-block rounded-full bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-zinc-200"
            >
              Browse Cards
            </Link>
          </div>
        ) : (
          <>
            <div className="rounded-[2rem] border border-zinc-900 bg-zinc-950 p-8">
              <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">
                    Seller Profile
                  </p>

                  <div className="mt-6 flex items-center gap-5">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border border-zinc-800 bg-black text-3xl font-semibold">
                      {getDisplayName().charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-5xl font-semibold tracking-tight">
                          {getDisplayName()}
                        </h1>

                        {profile.verified && (
                          <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
                            Verified
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-zinc-500">@{getUsername()}</p>

                     <PublicTrustSection userId={profile.id} />
                    </div>
                  </div>

                  <p className="mt-6 max-w-2xl leading-7 text-zinc-400">
                    {profile.bio ||
                      "This seller has not added a bio yet. Check out their active cards below."}
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <span className="rounded-full border border-zinc-800 px-4 py-2 text-sm text-zinc-300">
                      {profile.seller_level || "Level 1 Collector"}
                    </span>

                    <span className="rounded-full border border-zinc-800 px-4 py-2 text-sm text-zinc-300">
                      Member since {formatDate(profile.created_at)}
                    </span>
                  </div>
                </div>

                <div className="grid min-w-full gap-3 sm:grid-cols-3 lg:min-w-[520px]">
                  <div className="rounded-3xl border border-zinc-900 bg-black p-5">
                    <p className="text-sm text-zinc-500">Active Listings</p>
                    <h2 className="mt-3 text-3xl font-semibold">
                      {stats?.active_listings || listings.length}
                    </h2>
                  </div>

                  <div className="rounded-3xl border border-zinc-900 bg-black p-5">
                    <p className="text-sm text-zinc-500">Sold Cards</p>
                    <h2 className="mt-3 text-3xl font-semibold">
                      {stats?.sold_cards || 0}
                    </h2>
                  </div>

                  <div className="rounded-3xl border border-zinc-900 bg-black p-5">
                    <p className="text-sm text-zinc-500">Total Sales</p>
                    <h2 className="mt-3 text-3xl font-semibold">
                      {formatMoney(stats?.total_sales || 0)}
                    </h2>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
                  Storefront
                </p>

                <h2 className="mt-3 text-4xl font-semibold">Cards for Sale</h2>
              </div>

              <Link
                href="/browse"
                className="rounded-full border border-zinc-800 px-6 py-3 text-sm font-semibold text-zinc-300 hover:border-zinc-600 hover:text-white"
              >
                Browse All Cards
              </Link>
            </div>

            {listings.length === 0 ? (
              <div className="mt-8 rounded-3xl border border-zinc-900 bg-zinc-950 p-8 text-center">
                <h3 className="text-2xl font-semibold">
                  No active cards for sale
                </h3>

                <p className="mt-3 text-zinc-500">
                  This seller does not have any active listings right now.
                </p>
              </div>
            ) : (
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {listings.map((listing) => {
                  const image = getImage(listing);

                  return (
                    <Link
                      key={listing.id}
                      href={`/cards/${listing.id}`}
                      className="group overflow-hidden rounded-3xl border border-zinc-900 bg-zinc-950 transition hover:border-zinc-700"
                    >
                      <div className="aspect-[3/4] bg-black">
                        {image ? (
                          <img
                            src={image}
                            alt={listing.title || "Card listing"}
                            className="h-full w-full object-cover transition group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-zinc-700">
                            No Image
                          </div>
                        )}
                      </div>

                      <div className="p-5">
                        <p className="min-h-12 font-semibold">
                          {listing.title || "Untitled Card"}
                        </p>

                        <p className="mt-2 text-sm text-zinc-500">
                          {listing.year} {listing.brand}
                        </p>

                        <div className="mt-5 flex items-center justify-between">
                          <p className="text-xl font-bold">
                            {formatPrice(listing.price)}
                          </p>

                          <span className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400">
                            View
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
