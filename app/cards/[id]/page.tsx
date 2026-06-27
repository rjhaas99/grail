"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "../../components/Header";
import { supabase } from "../../../lib/supabase";

type ListingImage = {
  image_url: string | null;
  image_type: string | null;
};

type Listing = {
  id: string;
  seller_id: string | null;
  title: string | null;
  sport: string | null;
  player: string | null;
  year: string | null;
  brand: string | null;
  card_number: string | null;
  card_type: string | null;
  grader: string | null;
  grade: string | null;
  cert_number: string | null;
  condition: string | null;
  quantity: number | null;
  price: number | null;
  status: string | null;
  created_at: string | null;
  listing_images: ListingImage[];
};

type SellerProfile = {
  full_name: string | null;
  username: string | null;
  seller_level: string | null;
  total_sales: number | null;
  positive_feedback: number | null;
  verified: boolean | null;
};

export default function CardPage() {
  const router = useRouter();
  const params = useParams();

  const id = String(params.id);

  const [listing, setListing] = useState<Listing | null>(null);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadListing() {
      setLoading(true);

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
          card_type,
          grader,
          grade,
          cert_number,
          condition,
          quantity,
          price,
          status,
          created_at,
          listing_images (
            image_url,
            image_type
          )
        `
        )
        .eq("id", id)
        .eq("status", "active")
        .maybeSingle();

      if (error) {
        console.error("Card page listing error:", error);
        setListing(null);
        setLoading(false);
        return;
      }

      if (!data) {
  setListing(null);
  setLoading(false);
  return;
}

const listingData = data as unknown as Listing;

setListing(listingData);

const frontImage =
  listingData.listing_images?.find((image) => image.image_type === "front")
    ?.image_url ||
  listingData.listing_images?.[0]?.image_url ||
  null;

setSelectedImage(frontImage);

if (listingData.seller_id) {
        const { data: sellerData } = await supabase
          .from("profiles")
          .select(
            "full_name, username, seller_level, total_sales, positive_feedback, verified"
          )
          .eq("id", listingData.seller_id)
          .maybeSingle();

        setSeller(sellerData);
      }

      setLoading(false);
    }

    loadListing();
  }, [id]);

  async function goProtected(path: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/login?redirectTo=${encodeURIComponent(path)}`);
      return;
    }

    router.push(path);
  }

  function formatPrice(price: number | null) {
    if (!price) return "Price not listed";

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);
  }

  function formatListedDate(date: string | null) {
    if (!date) return "Recently";

    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const frontImage =
    listing?.listing_images?.find((image) => image.image_type === "front")
      ?.image_url || null;

  const backImage =
    listing?.listing_images?.find((image) => image.image_type === "back")
      ?.image_url || null;

  const sellerName =
    seller?.full_name || seller?.username || "GRAIL Seller";

  const sellerLevel = seller?.seller_level || "Level 1 Collector";

  return (
    <main className="min-h-screen bg-black text-white">
      <Header />

      {loading ? (
        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-8">
            <p className="text-zinc-400">Loading card...</p>
          </div>
        </section>
      ) : !listing ? (
        <section className="mx-auto max-w-4xl px-6 py-20 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">
            Card Not Found
          </p>

          <h1 className="mt-4 text-5xl font-semibold">
            This listing does not exist.
          </h1>

          <p className="mt-4 text-zinc-400">
            The card may have been sold, removed, or the link is incorrect.
          </p>

          <Link
            href="/browse"
            className="mt-8 inline-block rounded-full bg-white px-8 py-4 font-semibold text-black hover:bg-zinc-200"
          >
            Back to Browse
          </Link>
        </section>
      ) : (
        <section className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
                <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl bg-zinc-900">
                  {selectedImage ? (
                    <img
                      src={selectedImage}
                      alt={listing.title || "Card listing"}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <p className="text-zinc-600">No Image</p>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => frontImage && setSelectedImage(frontImage)}
                    className="flex h-24 items-center justify-center overflow-hidden rounded-2xl border border-zinc-800 bg-black text-xs text-zinc-500 hover:border-zinc-600"
                  >
                    {frontImage ? (
                      <img
                        src={frontImage}
                        alt="Front"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      "Front"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => backImage && setSelectedImage(backImage)}
                    className="flex h-24 items-center justify-center overflow-hidden rounded-2xl border border-zinc-800 bg-black text-xs text-zinc-500 hover:border-zinc-600"
                  >
                    {backImage ? (
                      <img
                        src={backImage}
                        alt="Back"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      "Back"
                    )}
                  </button>

                  <div className="flex h-24 items-center justify-center rounded-2xl border border-zinc-800 bg-black text-xs text-zinc-500">
                    Slab
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
                <h2 className="text-2xl font-semibold">Similar Cards</h2>

                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <Link
                    href="/browse"
                    className="rounded-2xl border border-zinc-900 bg-black p-4 hover:border-zinc-700"
                  >
                    <div className="mb-4 h-36 rounded-xl bg-zinc-900" />
                    <p className="text-sm font-semibold">Browse More</p>
                    <p className="mt-1 text-sm text-zinc-500">
                      Similar listings
                    </p>
                    <p className="mt-3 font-bold">View →</p>
                  </Link>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">
                  Trading Card
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => goProtected(`/cards/${listing.id}`)}
                    className="rounded-full border border-zinc-800 px-4 py-2 text-sm hover:border-zinc-600"
                  >
                    ♡ Watch
                  </button>

                  <button
                    type="button"
                    className="rounded-full border border-zinc-800 px-4 py-2 text-sm hover:border-zinc-600"
                  >
                    Share
                  </button>
                </div>
              </div>

              <h1 className="mt-4 text-5xl font-semibold leading-tight">
                {listing.title || "Untitled Card"}
              </h1>

              <p className="mt-3 text-zinc-400">
                {listing.sport || "Trading Card"}
                {listing.year ? ` • ${listing.year}` : ""}
                {listing.brand ? ` ${listing.brand}` : ""}
                {listing.card_number ? ` #${listing.card_number}` : ""}
                {listing.grader && listing.grade
                  ? ` • ${listing.grader} ${listing.grade}`
                  : ""}
              </p>

              <div className="mt-8 rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
                <p className="text-sm text-zinc-500">Asking Price</p>

                <div className="mt-2 flex items-end justify-between gap-4">
                  <h2 className="text-5xl font-bold">
                    {formatPrice(listing.price)}
                  </h2>

                  <p className="rounded-full bg-zinc-900 px-4 py-2 text-sm text-zinc-300">
                    Active listing
                  </p>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => goProtected(`/checkout?listingId=${listing.id}`)}
                    className="rounded-full bg-white px-7 py-4 text-center font-semibold text-black hover:bg-zinc-200"
                  >
                    Buy Now
                  </button>

                  <button
                    type="button"
                    onClick={() => goProtected(`/make-offer?listingId=${listing.id}`)}
                    className="rounded-full border border-zinc-800 px-7 py-4 text-center font-semibold hover:border-zinc-600"
                  >
                    Make Offer
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => goProtected(`/messages?listingId=${listing.id}`)}
                  className="mt-3 w-full rounded-full border border-zinc-800 px-7 py-4 font-semibold text-zinc-300 hover:border-zinc-600"
                >
                  Message Seller
                </button>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-4">
                  <p className="text-sm text-zinc-500">Quantity</p>
                  <p className="mt-1 text-xl font-semibold">
                    {listing.quantity || 1}
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-4">
                  <p className="text-sm text-zinc-500">Status</p>
                  <p className="mt-1 text-xl font-semibold">
                    Active
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-4">
                  <p className="text-sm text-zinc-500">Listed</p>
                  <p className="mt-1 text-xl font-semibold">
                    {formatListedDate(listing.created_at)}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold">Seller</h3>
                    <p className="mt-3 text-lg font-medium">{sellerName}</p>
                    <p className="text-sm text-zinc-500">{sellerLevel}</p>
                  </div>

                  <div className="rounded-full border border-zinc-800 px-4 py-2 text-sm text-zinc-300">
                    {seller?.verified ? "Verified Seller" : "GRAIL Seller"}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-black p-4">
                    <p className="text-xs text-zinc-500">Sales</p>
                    <p className="mt-1 font-semibold">
                      {seller?.total_sales ?? 0}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-black p-4">
                    <p className="text-xs text-zinc-500">Rating</p>
                    <p className="mt-1 font-semibold">
                      {seller?.positive_feedback ?? 0}%
                    </p>
                  </div>

                  <div className="rounded-2xl bg-black p-4">
                    <p className="text-xs text-zinc-500">Ships</p>
                    <p className="mt-1 font-semibold">Pending</p>
                  </div>
                </div>

                <button
                  type="button"
                  className="mt-5 w-full rounded-full border border-zinc-800 px-6 py-3 text-sm font-semibold hover:border-zinc-600"
                >
                  View Seller Profile
                </button>
              </div>

              <div className="mt-6 rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
                <h3 className="text-xl font-semibold">Card Details</h3>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-zinc-500">Sport</p>
                    <p className="mt-1 font-medium">
                      {listing.sport || "Not listed"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-zinc-500">Player</p>
                    <p className="mt-1 font-medium">
                      {listing.player || "Not listed"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-zinc-500">Year</p>
                    <p className="mt-1 font-medium">
                      {listing.year || "Not listed"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-zinc-500">Set</p>
                    <p className="mt-1 font-medium">
                      {listing.brand || "Not listed"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-zinc-500">Card #</p>
                    <p className="mt-1 font-medium">
                      {listing.card_number || "Not listed"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-zinc-500">Grade</p>
                    <p className="mt-1 font-medium">
                      {listing.grader && listing.grade
                        ? `${listing.grader} ${listing.grade}`
                        : "Not graded"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-zinc-500">Cert #</p>
                    <p className="mt-1 font-medium">
                      {listing.cert_number || "Optional"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-zinc-500">Condition</p>
                    <p className="mt-1 font-medium">
                      {listing.card_type === "raw"
                        ? listing.condition || "Raw"
                        : "Graded"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}