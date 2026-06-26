import Link from "next/link";
import Header from "./components/Header";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Header />

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-28 text-center">
        <p className="mb-6 text-xs font-medium uppercase tracking-[0.45em] text-zinc-500">
          Sports Card Marketplace
        </p>

        <h2 className="mx-auto max-w-5xl text-6xl font-semibold tracking-tight md:text-8xl">
          Buy. Sell. Collect.
        </h2>

        <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-zinc-400">
          A modern platform for collectors to list cards, discover inventory,
          track value, and manage every sale in one place.
        </p>

        <div className="mt-10 flex justify-center gap-4">
          <Link
            href="/browse"
            className="rounded-full bg-white px-8 py-4 text-sm font-semibold text-black hover:bg-zinc-200"
          >
            Browse Cards
          </Link>

          <Link
            href="/list"
            className="rounded-full border border-zinc-800 px-8 py-4 text-sm font-semibold text-white hover:border-zinc-600"
          >
            List a Card
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-zinc-900 p-8">
            <div className="mb-20 text-xs tracking-[0.3em] text-zinc-600">
              01
            </div>

            <h3 className="text-3xl font-semibold">Buy</h3>

            <p className="mt-4 text-sm leading-7 text-zinc-500">
              Browse rare cards, discover new listings, and build your collection.
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-900 p-8">
            <div className="mb-20 text-xs tracking-[0.3em] text-zinc-600">
              02
            </div>

            <h3 className="text-3xl font-semibold">Sell</h3>

            <p className="mt-4 text-sm leading-7 text-zinc-500">
              List cards instantly, receive offers, and manage payouts.
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-900 p-8">
            <div className="mb-20 text-xs tracking-[0.3em] text-zinc-600">
              03
            </div>

            <h3 className="text-3xl font-semibold">Portfolio</h3>

            <p className="mt-4 text-sm leading-7 text-zinc-500">
              Track inventory, collection value, profits, and completed sales.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}