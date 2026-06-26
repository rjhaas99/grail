import Header from "../components/Header";
import RequireAuth from "../components/RequireAuth";

export default function RewardsPage() {
  return (
    <RequireAuth>
      <main className="min-h-screen bg-black text-white">
        <Header />

        <section className="mx-auto max-w-4xl px-6 py-20">
          <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">
            Seller Rewards
          </p>

          <h1 className="mt-4 text-5xl font-semibold">
            Level 1 Collector
          </h1>

          <p className="mt-4 text-zinc-400">
            Progress toward Level 2 Dealer.
          </p>

          <div className="mt-10">
            <div className="h-4 rounded-full bg-zinc-900">
              <div className="h-4 w-[25%] rounded-full bg-white" />
            </div>

            <p className="mt-3 text-sm text-zinc-500">
              $250 / $1,000 Sold
            </p>
          </div>
        </section>
      </main>
    </RequireAuth>
  );
}