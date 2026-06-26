import Header from "../components/Header";
import RequireAuth from "../components/RequireAuth";

export default function SalesPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Header />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">
          Sales History
        </p>

        <h1 className="mt-4 text-5xl font-semibold">Completed Sales</h1>

        <p className="mt-4 text-zinc-400">
          Review sold cards, sale prices, fees, and seller earnings.
        </p>

        <div className="mt-12 space-y-4">
          <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
            <div className="flex items-center justify-between gap-6">
              <div>
                <h3 className="text-xl font-semibold">
                  Michael Jordan Rookie
                </h3>
                <p className="mt-1 text-sm text-zinc-500">
                  PSA 9 • Sold Jun 23, 2026
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm text-zinc-500">Sale Price</p>
                <p className="text-2xl font-bold">$4,500</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-zinc-900 p-4">
                <p className="text-sm text-zinc-500">Seller Fee</p>
                <p className="mt-1 font-semibold">$450</p>
              </div>

              <div className="rounded-2xl border border-zinc-900 p-4">
                <p className="text-sm text-zinc-500">Seller Payout</p>
                <p className="mt-1 font-semibold">$4,050</p>
              </div>

              <div className="rounded-2xl border border-zinc-900 p-4">
                <p className="text-sm text-zinc-500">Status</p>
                <p className="mt-1 font-semibold text-green-400">Completed</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
            <div className="flex items-center justify-between gap-6">
              <div>
                <h3 className="text-xl font-semibold">Tom Brady Auto</h3>
                <p className="mt-1 text-sm text-zinc-500">
                  BGS 9.5 • Sold Jun 19, 2026
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm text-zinc-500">Sale Price</p>
                <p className="text-2xl font-bold">$2,950</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-zinc-900 p-4">
                <p className="text-sm text-zinc-500">Seller Fee</p>
                <p className="mt-1 font-semibold">$295</p>
              </div>

              <div className="rounded-2xl border border-zinc-900 p-4">
                <p className="text-sm text-zinc-500">Seller Payout</p>
                <p className="mt-1 font-semibold">$2,655</p>
              </div>

              <div className="rounded-2xl border border-zinc-900 p-4">
                <p className="text-sm text-zinc-500">Status</p>
                <p className="mt-1 font-semibold text-green-400">Completed</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}