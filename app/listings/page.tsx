import Header from "../components/Header";

export default function ListingsPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Header />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">
          Seller Dashboard
        </p>

        <h1 className="mt-4 text-5xl font-semibold">
          Active Listings
        </h1>

        <p className="mt-4 text-zinc-400">
          Cards currently listed for sale.
        </p>

        <div className="mt-10 space-y-4">
          <div className="flex items-center justify-between rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
            <div>
              <h3 className="font-semibold">Michael Jordan Rookie</h3>
              <p className="mt-1 text-sm text-zinc-500">PSA 9</p>
            </div>

            <div className="text-right">
              <p className="text-2xl font-bold">$4,500</p>
              <p className="text-sm text-green-400">Active</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
            <div>
              <h3 className="font-semibold">Tom Brady Auto</h3>
              <p className="mt-1 text-sm text-zinc-500">BGS 9.5</p>
            </div>

            <div className="text-right">
              <p className="text-2xl font-bold">$2,950</p>
              <p className="text-sm text-green-400">Active</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}