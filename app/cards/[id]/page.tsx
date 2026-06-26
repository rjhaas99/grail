import Link from "next/link";
import Header from "../../components/Header";

export default function CardPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Header />

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <div className="flex aspect-[3/4] items-center justify-center rounded-2xl bg-zinc-900">
                <p className="text-zinc-600">Card Front Image</p>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="flex h-24 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-xs text-zinc-500">
                  Front
                </div>

                <div className="flex h-24 items-center justify-center rounded-2xl border border-zinc-800 bg-black text-xs text-zinc-500">
                  Back
                </div>

                <div className="flex h-24 items-center justify-center rounded-2xl border border-zinc-800 bg-black text-xs text-zinc-500">
                  Slab
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <h2 className="text-2xl font-semibold">Similar Cards</h2>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <Link
                  href="/cards/tom-brady-auto"
                  className="rounded-2xl border border-zinc-900 bg-black p-4 hover:border-zinc-700"
                >
                  <div className="mb-4 h-36 rounded-xl bg-zinc-900" />
                  <p className="text-sm font-semibold">Tom Brady Auto</p>
                  <p className="mt-1 text-sm text-zinc-500">BGS 9.5</p>
                  <p className="mt-3 font-bold">$2,950</p>
                </Link>

                <Link
                  href="/cards/lebron-rookie"
                  className="rounded-2xl border border-zinc-900 bg-black p-4 hover:border-zinc-700"
                >
                  <div className="mb-4 h-36 rounded-xl bg-zinc-900" />
                  <p className="text-sm font-semibold">LeBron Rookie</p>
                  <p className="mt-1 text-sm text-zinc-500">PSA 10</p>
                  <p className="mt-3 font-bold">$8,200</p>
                </Link>

                <Link
                  href="/browse"
                  className="rounded-2xl border border-zinc-900 bg-black p-4 hover:border-zinc-700"
                >
                  <div className="mb-4 h-36 rounded-xl bg-zinc-900" />
                  <p className="text-sm font-semibold">More Cards</p>
                  <p className="mt-1 text-sm text-zinc-500">Browse all</p>
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
                <button className="rounded-full border border-zinc-800 px-4 py-2 text-sm hover:border-zinc-600">
                  ♡ Watch
                </button>

                <button className="rounded-full border border-zinc-800 px-4 py-2 text-sm hover:border-zinc-600">
                  Share
                </button>
              </div>
            </div>

            <h1 className="mt-4 text-5xl font-semibold leading-tight">
              1986 Fleer Michael Jordan PSA 9
            </h1>

            <p className="mt-3 text-zinc-400">
              Basketball • 1986 Fleer #57 • Graded by PSA
            </p>

            <div className="mt-8 rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <p className="text-sm text-zinc-500">Asking Price</p>

              <div className="mt-2 flex items-end justify-between gap-4">
                <h2 className="text-5xl font-bold">$4,500</h2>

                <p className="rounded-full bg-zinc-900 px-4 py-2 text-sm text-zinc-300">
                  11 watching
                </p>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Link
  href="/checkout"
  className="rounded-full bg-white px-7 py-4 text-center font-semibold text-black hover:bg-zinc-200"
>
  Buy Now
</Link>

                <Link
  href="/make-offer"
  className="rounded-full border border-zinc-800 px-7 py-4 text-center font-semibold hover:border-zinc-600"
>
  Make Offer
</Link>
              </div>

              <button className="mt-3 w-full rounded-full border border-zinc-800 px-7 py-4 font-semibold text-zinc-300 hover:border-zinc-600">
                Message Seller
              </button>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-4">
                <p className="text-sm text-zinc-500">Views</p>
                <p className="mt-1 text-xl font-semibold">142</p>
              </div>

              <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-4">
                <p className="text-sm text-zinc-500">Offers</p>
                <p className="mt-1 text-xl font-semibold">3</p>
              </div>

              <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-4">
                <p className="text-sm text-zinc-500">Listed</p>
                <p className="mt-1 text-xl font-semibold">8d</p>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold">Seller</h3>
                  <p className="mt-3 text-lg font-medium">Ryan Haas</p>
                  <p className="text-sm text-zinc-500">Level 2 Dealer</p>
                </div>

                <div className="rounded-full border border-zinc-800 px-4 py-2 text-sm text-zinc-300">
                  Verified Collector
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-black p-4">
                  <p className="text-xs text-zinc-500">Sales</p>
                  <p className="mt-1 font-semibold">217</p>
                </div>

                <div className="rounded-2xl bg-black p-4">
                  <p className="text-xs text-zinc-500">Rating</p>
                  <p className="mt-1 font-semibold">99.8%</p>
                </div>

                <div className="rounded-2xl bg-black p-4">
                  <p className="text-xs text-zinc-500">Ships</p>
                  <p className="mt-1 font-semibold">2 days</p>
                </div>
              </div>

              <button className="mt-5 w-full rounded-full border border-zinc-800 px-6 py-3 text-sm font-semibold hover:border-zinc-600">
                View Seller Profile
              </button>
            </div>

            <div className="mt-6 rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <h3 className="text-xl font-semibold">Card Details</h3>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-zinc-500">Sport</p>
                  <p className="mt-1 font-medium">Basketball</p>
                </div>

                <div>
                  <p className="text-sm text-zinc-500">Player</p>
                  <p className="mt-1 font-medium">Michael Jordan</p>
                </div>

                <div>
                  <p className="text-sm text-zinc-500">Year</p>
                  <p className="mt-1 font-medium">1986</p>
                </div>

                <div>
                  <p className="text-sm text-zinc-500">Set</p>
                  <p className="mt-1 font-medium">Fleer</p>
                </div>

                <div>
                  <p className="text-sm text-zinc-500">Card #</p>
                  <p className="mt-1 font-medium">57</p>
                </div>

                <div>
                  <p className="text-sm text-zinc-500">Grade</p>
                  <p className="mt-1 font-medium">PSA 9</p>
                </div>

                <div>
                  <p className="text-sm text-zinc-500">Cert #</p>
                  <p className="mt-1 font-medium">Optional</p>
                </div>

                <div>
                  <p className="text-sm text-zinc-500">Condition</p>
                  <p className="mt-1 font-medium">Graded</p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <h3 className="text-xl font-semibold">Recent Offers</h3>

              <div className="mt-5 space-y-3">
                <div className="flex justify-between border-b border-zinc-900 pb-3">
                  <span className="text-zinc-500">Highest Offer</span>
                  <span className="font-medium">$4,300</span>
                </div>

                <div className="flex justify-between border-b border-zinc-900 pb-3">
                  <span className="text-zinc-500">Previous Offer</span>
                  <span className="font-medium">$4,200</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-zinc-500">Opening Offer</span>
                  <span className="font-medium">$4,100</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}