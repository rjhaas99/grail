import Link from "next/link";
import Header from "../components/Header";
import RequireAuth from "../components/RequireAuth";

export default function DashboardPage() {
  return (
    <RequireAuth>
      <main className="min-h-screen bg-black text-white">
        <Header />

        <section className="mx-auto max-w-7xl px-8 py-12">
          <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">
            Seller Dashboard
          </p>

          <h1 className="mt-4 text-5xl font-semibold">Business Center</h1>

          <p className="mt-4 text-zinc-400">
            Track sales, offers, earnings, listings, and seller performance.
          </p>

          <div className="mt-12 grid gap-4 md:grid-cols-4">
            <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <p className="text-sm text-zinc-500">Total Sales</p>
              <h2 className="mt-3 text-3xl font-semibold">$7,450</h2>
            </div>

            <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <p className="text-sm text-zinc-500">GRAIL Earnings</p>
              <h2 className="mt-3 text-3xl font-semibold">$745</h2>
            </div>

            <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <p className="text-sm text-zinc-500">Active Listings</p>
              <h2 className="mt-3 text-3xl font-semibold">8</h2>
            </div>

            <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <p className="text-sm text-zinc-500">Pending Offers</p>
              <h2 className="mt-3 text-3xl font-semibold">3</h2>
            </div>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6 lg:col-span-2">
              <h2 className="text-2xl font-semibold">Recent Activity</h2>

              <div className="mt-6 space-y-4">
                <div className="flex justify-between rounded-2xl border border-zinc-900 p-4">
                  <div>
                    <p className="font-medium">
                      <Link
                        href="/cards/jordan-rookie"
                        className="hover:underline"
                      >
                        Michael Jordan Rookie
                      </Link>{" "}
                      sold
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      Seller payout: $4,050
                    </p>
                  </div>

                  <p className="text-green-400">Completed</p>
                </div>

                <div className="flex justify-between rounded-2xl border border-zinc-900 p-4">
                  <div>
                    <p className="font-medium">New offer received</p>
                    <p className="mt-1 text-sm text-zinc-500">
                      Tom Brady Auto • $2,700
                    </p>
                  </div>

                  <p className="text-zinc-400">Pending</p>
                </div>

                <div className="flex justify-between rounded-2xl border border-zinc-900 p-4">
                  <div>
                    <p className="font-medium">LeBron Rookie listed</p>
                    <p className="mt-1 text-sm text-zinc-500">
                      Asking price: $8,200
                    </p>
                  </div>

                  <p className="text-zinc-400">Active</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <h2 className="text-2xl font-semibold">Seller Level</h2>

              <p className="mt-2 text-zinc-500">Level 1 Collector</p>

              <div className="mt-6 h-3 rounded-full bg-zinc-900">
                <div className="h-3 w-1/4 rounded-full bg-white" />
              </div>

              <p className="mt-3 text-sm text-zinc-500">$250 / $1,000 sold</p>

              <div className="mt-8 rounded-2xl border border-zinc-900 p-4">
                <p className="text-sm text-zinc-500">Next Unlock</p>
                <p className="mt-1 font-semibold">Level 2 Dealer</p>
                <p className="mt-2 text-sm text-zinc-500">
                  9% seller fee, Dealer badge, and featured listings.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </RequireAuth>
  );
}