import Link from "next/link";
import Header from "../components/Header";

export default function BrowsePage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Header />

      <div className="mx-auto max-w-7xl px-8 py-12">

        <h1 className="mb-2 text-5xl font-bold">
          Browse Cards
        </h1>

        <p className="mb-10 text-zinc-400">
          Discover graded sports cards from collectors.
        </p>

        <div className="mb-8">
          <input
            type="text"
            placeholder="Search player, team, card..."
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-white outline-none"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">

          <Link
  href="/cards/jordan-rookie"
  className="block rounded-3xl border border-zinc-800 p-5 hover:border-zinc-600 transition"
>
  <div className="mb-4 h-56 rounded-2xl bg-zinc-900"></div>

  <h3 className="font-semibold">
    Michael Jordan Rookie
  </h3>

  <p className="mt-1 text-zinc-500">
    PSA 9
  </p>

  <p className="mt-4 text-2xl font-bold">
    $4,500
  </p>
</Link>

          <div className="rounded-3xl border border-zinc-800 p-5">
            <div className="mb-4 h-56 rounded-2xl bg-zinc-900"></div>

            <h3 className="font-semibold">
              Tom Brady Auto
            </h3>

            <p className="mt-1 text-zinc-500">
              BGS 9.5
            </p>

            <p className="mt-4 text-2xl font-bold">
              $2,950
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 p-5">
            <div className="mb-4 h-56 rounded-2xl bg-zinc-900"></div>

            <h3 className="font-semibold">
              LeBron James Rookie
            </h3>

            <p className="mt-1 text-zinc-500">
              PSA 10
            </p>

            <p className="mt-4 text-2xl font-bold">
              $8,200
            </p>
          </div>

        </div>
      </div>
    </main>
  );
}