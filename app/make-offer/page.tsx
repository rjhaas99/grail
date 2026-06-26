import Link from "next/link";
import Header from "../components/Header";
import RequireAuth from "../components/RequireAuth";

export default function MakeOfferPage() {
  return (
    <RequireAuth>
      <main className="min-h-screen bg-black text-white">
        <Header />

        <section className="mx-auto max-w-4xl px-6 py-16">
          <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">
            Make Offer
          </p>

          <h1 className="mt-4 text-5xl font-semibold">Send an Offer</h1>

          <div className="mt-10 rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
            <h2 className="text-2xl font-semibold">
              1986 Fleer Michael Jordan PSA 9
            </h2>

            <p className="mt-2 text-zinc-500">Asking Price: $4,500</p>

            <div className="mt-8 space-y-5">
              <input
                className="w-full rounded-2xl border border-zinc-800 bg-black p-4 outline-none"
                placeholder="Offer amount"
              />

              <textarea
                className="min-h-32 w-full rounded-2xl border border-zinc-800 bg-black p-4 outline-none"
                placeholder="Optional message to seller"
              />

              <Link
                href="/offers"
                className="block w-full rounded-full bg-white px-8 py-4 text-center font-semibold text-black hover:bg-zinc-200"
              >
                Submit Offer
              </Link>
            </div>
          </div>
        </section>
      </main>
    </RequireAuth>
  );
}