import Link from "next/link";
import Header from "../components/Header";
import RequireAuth from "../components/RequireAuth";

export default function PortfolioPage() {
  return (
    <RequireAuth>
      <main className="min-h-screen bg-black text-white">
        <Header />

        <section className="mx-auto max-w-6xl px-6 py-16">
          <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">
            Portfolio
          </p>

          <h1 className="mt-4 text-5xl font-semibold">
            My Collection
          </h1>

          <p className="mt-4 text-zinc-400">
            Track your inventory, collection value, and performance.
          </p>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <p className="text-zinc-500">Collection Value</p>
              <h2 className="mt-2 text-4xl font-bold">$12,450</h2>
            </div>

            <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <p className="text-zinc-500">Cards Owned</p>
              <h2 className="mt-2 text-4xl font-bold">48</h2>
            </div>

            <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <p className="text-zinc-500">Profit / Loss</p>
              <h2 className="mt-2 text-4xl font-bold text-green-400">
                +$2,140
              </h2>
            </div>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-semibold">
                  My Cards
                </h3>

                <p className="text-sm text-zinc-500">
                  48 Cards
                </p>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between rounded-2xl border border-zinc-900 p-4">
                  <div>
                    <p className="font-medium">Michael Jordan Rookie</p>
                    <p className="text-sm text-zinc-500">PSA 9</p>
                  </div>

                  <p className="font-semibold">$4,500</p>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-zinc-900 p-4">
                  <div>
                    <p className="font-medium">Tom Brady Auto</p>
                    <p className="text-sm text-zinc-500">BGS 9.5</p>
                  </div>

                  <p className="font-semibold">$2,950</p>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-zinc-900 p-4">
                  <div>
                    <p className="font-medium">LeBron James Rookie</p>
                    <p className="text-sm text-zinc-500">PSA 10</p>
                  </div>

                  <p className="font-semibold">$8,200</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <h3 className="text-2xl font-semibold">
                Seller Progress
              </h3>

              <p className="mt-2 text-zinc-500">
                Level 1 Collector
              </p>

              <div className="mt-6 h-3 rounded-full bg-zinc-900">
                <div className="h-3 w-1/4 rounded-full bg-white" />
              </div>

              <p className="mt-3 text-sm text-zinc-500">
                $250 / $1,000 Sold
              </p>

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