"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import Header from "../components/Header";
import RequireAuth from "../components/RequireAuth";

type ListingImage = {
  image_url: string | null;
  image_type: string | null;
};

type CardItem = {
  id: string;
  title: string;
  subtitle: string;
  price: string;
  priceValue: number;
costValue: number;
  status: "Listed" | "Not Listed";
  listed: boolean;
imageUrl: string | null;
};

type ListingRow = {
  id: string;
  title: string | null;
  year: string | null;
  brand: string | null;
  player: string | null;
  grader: string | null;
  grade: string | null;
  condition: string | null;
  price: number | null;
purchase_price: number | null;
  status: string | null;
  created_at: string | null;
listing_images: ListingImage[] | null;
};

export default function PortfolioPage() {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCards();
  }, []);

  async function loadCards() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("listings")
      .select(
  `
  id,
  title,
  year,
  brand,
  player,
  grader,
  grade,
  condition,
  price,
purchase_price,
status,
created_at,
  listing_images (
    image_url,
    image_type
  )
`
)
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Portfolio cards error:", error.message);
      setCards([]);
      setLoading(false);
      return;
    }

    const realCards: CardItem[] = ((data || []) as ListingRow[]).map((card) => {
  const imageUrl =
  card.listing_images?.find((image) => image.image_type === "front")
    ?.image_url ||
  card.listing_images?.[0]?.image_url ||
  null;
      const title =
        card.title ||
        [card.year, card.brand, card.player].filter(Boolean).join(" ") ||
        "Untitled Card";

      const subtitle =
        card.grader && card.grade
          ? `${card.grader} ${card.grade}`
          : card.condition || "Trading Card";

      const priceValue = Number(card.price || 0);
const costValue = Number(card.purchase_price || 0);
const listed = card.status === "active";

      return {
        id: card.id,
        title,
        subtitle,
        price: formatMoney(priceValue),
        priceValue,
costValue,
status: listed ? "Listed" : "Not Listed",
        listed,
imageUrl,
      };
    });

    setCards(realCards);
    setLoading(false);
  }

  function formatMoney(value: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  }
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [sortMode, setSortMode] = useState("all");

  const shownCards = useMemo(() => {
    let filteredCards = [...cards];

    if (sortMode === "listed") {
      filteredCards = filteredCards.filter((card) => card.listed);
    }

    if (sortMode === "not-listed") {
      filteredCards = filteredCards.filter((card) => !card.listed);
    }

    if (sortMode === "price-high") {
      filteredCards.sort((a, b) => b.priceValue - a.priceValue);
    }

    if (sortMode === "price-low") {
      filteredCards.sort((a, b) => a.priceValue - b.priceValue);
    }

    return filteredCards;
  }, [cards, sortMode]);

  function chooseSort(mode: string) {
    setSortMode(mode);
    setSortMenuOpen(false);
  }
const collectionValue = cards.reduce(
    (sum, card) => sum + card.priceValue,
    0
  );

  const totalCost = cards.reduce(
    (sum, card) => sum + card.costValue,
    0
  );

  const profitLoss = collectionValue - totalCost;

  function formatProfitLoss(value: number) {
    if (value > 0) return `+${formatMoney(value)}`;
    if (value < 0) return `-${formatMoney(Math.abs(value))}`;
    return "$0";
  }
  return (
    <RequireAuth>
      <main className="min-h-screen bg-black text-white">
        <Header />

        <section className="mx-auto max-w-6xl px-6 py-16">
          <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">
            Portfolio
          </p>

          <h1 className="mt-4 text-5xl font-semibold">My Collection</h1>

          <p className="mt-4 text-zinc-400">
            Track your inventory, collection value, and performance.
          </p>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <p className="text-zinc-500">Collection Value</p>
              <h2 className="mt-2 text-4xl font-bold">
  {formatMoney(collectionValue)}
</h2>
            </div>

            <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <p className="text-zinc-500">Cards Owned</p>
              <h2 className="mt-2 text-4xl font-bold">{cards.length}</h2>
            </div>

            <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <p className="text-zinc-500">Profit / Loss</p>
              <h2
  className={`mt-2 text-4xl font-bold ${
  profitLoss > 0
    ? "text-green-400"
    : profitLoss < 0
    ? "text-red-400"
    : "text-zinc-500"
}`}
>
  {formatProfitLoss(profitLoss)}
</h2>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] gap-6 items-start">
            <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setSortMenuOpen(!sortMenuOpen)}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 bg-black text-zinc-300 hover:border-zinc-600 hover:text-white"
                      title="Sort cards"
                    >
                      <span className="text-xl leading-none">☰</span>
                    </button>

                    {sortMenuOpen && (
                      <div className="absolute left-0 top-12 z-50 w-48 rounded-2xl border border-zinc-800 bg-black p-2 shadow-2xl">
                        <button
                          type="button"
                          onClick={() => chooseSort("all")}
                          className="block w-full rounded-xl px-4 py-3 text-left text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white"
                        >
                          All Cards
                        </button>

                        <button
                          type="button"
                          onClick={() => chooseSort("listed")}
                          className="block w-full rounded-xl px-4 py-3 text-left text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white"
                        >
                          Listed
                        </button>

                        <button
                          type="button"
                          onClick={() => chooseSort("not-listed")}
                          className="block w-full rounded-xl px-4 py-3 text-left text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white"
                        >
                          Not Listed
                        </button>

                        <button
                          type="button"
                          onClick={() => chooseSort("price-high")}
                          className="block w-full rounded-xl px-4 py-3 text-left text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white"
                        >
                          Price: High to Low
                        </button>

                        <button
                          type="button"
                          onClick={() => chooseSort("price-low")}
                          className="block w-full rounded-xl px-4 py-3 text-left text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white"
                        >
                          Price: Low to High
                        </button>
                      </div>
                    )}
                  </div>

                  <h3 className="text-2xl font-semibold">My Cards</h3>
                </div>

                <p className="text-sm text-zinc-500">{shownCards.length} Cards</p>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {shownCards.map((card) => (
                  <div
                    key={card.id}
                    className="flex h-full flex-col rounded-2xl border border-zinc-900 bg-black p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-32 w-24 items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
  {card.imageUrl ? (
    <img
      src={card.imageUrl}
      alt={card.title}
      className="h-full w-full object-contain"
    />
  ) : (
    <div className="h-24 w-16 rounded border-2 border-zinc-300 bg-zinc-800" />
  )}
</div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          card.listed
                            ? "bg-green-500 text-black"
                            : "bg-zinc-800 text-zinc-300"
                        }`}
                      >
                        {card.status}
                      </span>
                    </div>

                    <p className="mt-4 block h-10 overflow-hidden text-sm font-semibold leading-5 hover:underline">
                      {card.title}
                    </p>

                    <p className="mt-1 h-5 overflow-hidden text-sm text-zinc-500">
                      {card.subtitle}
                    </p>

                    <p className="mt-3 text-xl font-bold">{card.price}</p>

                    <div className="mt-auto flex gap-3 pt-4">
                      {card.listed && (
                        <Link
                          href="/checkout"
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-800 text-sm hover:border-zinc-500"
                          title="Buy Now"
                        >
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4 text-white"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
  </svg>
</Link>
                      )}

                      <Link
  href={`/messages?listingId=${card.id}`}
  className="relative h-9 w-9 rounded-full border border-zinc-800 text-white hover:border-zinc-500"
  title="Message"
>
  <svg
    viewBox="0 0 24 24"
    className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 6 9-6" />
  </svg>
</Link>

                      <Link
                        href="/make-offer"
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-800 text-sm font-bold hover:border-zinc-500"
                        title="Make Offer"
                      >
                        $
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <h3 className="text-2xl font-semibold">Seller Progress</h3>

              <p className="mt-2 text-zinc-500">Level 1 Collector</p>

              <div className="mt-6 h-3 rounded-full bg-zinc-900">
                <div className="h-3 w-1/4 rounded-full bg-white" />
              </div>

              <p className="mt-3 text-sm text-zinc-500">$250 / $1,000 Sold</p>

              <div className="mt-8 space-y-4">
                <Link
                  href="/listings"
                  className="flex justify-between border-b border-zinc-900 pb-3 text-zinc-300 hover:text-white"
                >
                  <span>Active Listings</span>
                  <span>8</span>
                </Link>

                <Link
                  href="/offers"
                  className="flex justify-between border-b border-zinc-900 pb-3 text-zinc-300 hover:text-white"
                >
                  <span>Pending Offers</span>
                  <span>3</span>
                </Link>

                <Link
                  href="/sales"
                  className="flex justify-between text-zinc-300 hover:text-white"
                >
                  <span>Completed Sales</span>
                  <span>14</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </RequireAuth>
  );
}