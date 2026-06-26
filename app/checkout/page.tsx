import Header from "../components/Header";
import RequireAuth from "../components/RequireAuth";

export default function CheckoutPage() {
  return (
    <RequireAuth>
      <main className="min-h-screen bg-black text-white">
        <Header />

        <section className="mx-auto max-w-4xl px-6 py-16">
          <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">
            Checkout
          </p>

          <h1 className="mt-4 text-5xl font-semibold">
            Complete Purchase
          </h1>

          <div className="mt-10 rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
            <h2 className="text-2xl font-semibold">
              1986 Fleer Michael Jordan PSA 9
            </h2>

            <p className="mt-2 text-zinc-500">
              Seller: Ryan Haas
            </p>

            <div className="mt-8 space-y-4">
              <div className="flex justify-between">
                <span className="text-zinc-500">Card Price</span>
                <span>$4,500</span>
              </div>

              <div className="flex justify-between">
                <span className="text-zinc-500">Buyer Fee</span>
                <span>$135</span>
              </div>

              <div className="flex justify-between">
                <span className="text-zinc-500">Shipping</span>
                <span>$12</span>
              </div>

              <div className="flex justify-between border-t border-zinc-800 pt-4 text-xl font-semibold">
                <span>Total</span>
                <span>$4,647</span>
              </div>
            </div>

            <button className="mt-8 w-full rounded-full bg-white px-8 py-4 font-semibold text-black hover:bg-zinc-200">
              Confirm Purchase
            </button>
          </div>
        </section>
      </main>
    </RequireAuth>
  );
}