import Header from "../components/Header";
import RequireAuth from "../components/RequireAuth";


export default function OffersPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Header />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">
          Offers
        </p>

        <h1 className="mt-4 text-5xl font-semibold">
          Pending Offers
        </h1>

        <p className="mt-4 text-zinc-400">
          Review incoming offers and manage offers you have sent.
        </p>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
            <h2 className="text-2xl font-semibold">Incoming Offers</h2>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-zinc-900 p-5">
                <div className="flex justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">Michael Jordan Rookie</h3>
                    <p className="mt-1 text-sm text-zinc-500">Listed at $4,500</p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-zinc-500">Offer</p>
                    <p className="text-2xl font-bold">$4,100</p>
                  </div>
                </div>

                <div className="mt-5 flex gap-3">
                  <button className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black">
                    Accept
                  </button>
                  <button className="rounded-full border border-zinc-800 px-5 py-2 text-sm">
                    Counter
                  </button>
                  <button className="rounded-full border border-zinc-800 px-5 py-2 text-sm text-zinc-400">
                    Decline
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-900 p-5">
                <div className="flex justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">Tom Brady Auto</h3>
                    <p className="mt-1 text-sm text-zinc-500">Listed at $2,950</p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-zinc-500">Offer</p>
                    <p className="text-2xl font-bold">$2,700</p>
                  </div>
                </div>

                <div className="mt-5 flex gap-3">
                  <button className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black">
                    Accept
                  </button>
                  <button className="rounded-full border border-zinc-800 px-5 py-2 text-sm">
                    Counter
                  </button>
                  <button className="rounded-full border border-zinc-800 px-5 py-2 text-sm text-zinc-400">
                    Decline
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
            <h2 className="text-2xl font-semibold">Outgoing Offers</h2>

            <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-zinc-900 p-5">
  <div className="flex justify-between gap-4">
    <div>
      <h3 className="font-semibold">Michael Jordan Rookie</h3>
      <p className="mt-1 text-sm text-zinc-500">Seller asking $4,500</p>
    </div>

    <div className="text-right">
      <p className="text-sm text-zinc-500">Your Offer</p>
      <p className="text-2xl font-bold">$4,300</p>
    </div>
  </div>

  <p className="mt-5 text-sm text-zinc-500">
    Waiting for seller response.
  </p>
</div>
              <div className="rounded-2xl border border-zinc-900 p-5">
                <div className="flex justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">LeBron James Rookie</h3>
                    <p className="mt-1 text-sm text-zinc-500">Seller asking $8,200</p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-zinc-500">Your Offer</p>
                    <p className="text-2xl font-bold">$7,800</p>
                  </div>
                </div>

                <p className="mt-5 text-sm text-zinc-500">
                  Waiting for seller response.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}