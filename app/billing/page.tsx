import Link from "next/link";
import Header from "../components/Header";
import RequireAuth from "../components/RequireAuth";

const payoutRows = [
  {
    id: 1,
    title: "Michael Jordan Rookie",
    date: "Today",
    gross: "$4,500",
    fees: "$450",
    payout: "$4,050",
    status: "Processing",
  },
  {
    id: 2,
    title: "Tom Brady Auto",
    date: "May 28",
    gross: "$2,950",
    fees: "$295",
    payout: "$2,655",
    status: "Paid",
  },
  {
    id: 3,
    title: "LeBron James Rookie",
    date: "May 19",
    gross: "$8,200",
    fees: "$820",
    payout: "$7,380",
    status: "Paid",
  },
];

export default function BillingPage() {
  return (
    <RequireAuth>
      <main className="min-h-screen bg-black text-white">
        <Header />

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">
                Billing & Payouts
              </p>

              <h1 className="mt-4 text-5xl font-semibold tracking-tight">
                Money Center
              </h1>

              <p className="mt-4 max-w-2xl text-zinc-400">
                Manage seller payouts, fees, payment methods, and transaction history.
              </p>
            </div>

            <button className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-zinc-200">
              Add Payout Method
            </button>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <p className="text-sm text-zinc-500">Available Balance</p>
              <h2 className="mt-3 text-4xl font-semibold">$4,050</h2>
              <p className="mt-3 text-sm text-zinc-500">
                Ready after order verification
              </p>
            </div>

            <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <p className="text-sm text-zinc-500">Pending Payouts</p>
              <h2 className="mt-3 text-4xl font-semibold">$4,050</h2>
              <p className="mt-3 text-sm text-zinc-500">
                Processing from recent sales
              </p>
            </div>

            <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <p className="text-sm text-zinc-500">Lifetime Payouts</p>
              <h2 className="mt-3 text-4xl font-semibold">$14,085</h2>
              <p className="mt-3 text-sm text-zinc-500">
                Total seller earnings
              </p>
            </div>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6 lg:col-span-2">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold">
                  Payout History
                </h2>

                <Link
                  href="/orders"
                  className="rounded-full border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-600 hover:text-white"
                >
                  View Orders
                </Link>
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-900">
                <div className="grid grid-cols-6 gap-4 border-b border-zinc-900 bg-black px-5 py-4 text-xs uppercase tracking-[0.2em] text-zinc-500">
                  <p className="col-span-2">Sale</p>
                  <p>Date</p>
                  <p>Gross</p>
                  <p>Payout</p>
                  <p>Status</p>
                </div>

                <div className="divide-y divide-zinc-900">
                  {payoutRows.map((row) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-6 gap-4 px-5 py-5 text-sm"
                    >
                      <div className="col-span-2">
                        <p className="font-medium">{row.title}</p>
                        <p className="mt-1 text-zinc-500">
                          Fee: {row.fees}
                        </p>
                      </div>

                      <p className="text-zinc-400">{row.date}</p>
                      <p>{row.gross}</p>
                      <p className="font-semibold">{row.payout}</p>
                      <p
                        className={
                          row.status === "Paid"
                            ? "text-green-400"
                            : "text-zinc-400"
                        }
                      >
                        {row.status}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
                <h2 className="text-2xl font-semibold">
                  Payout Method
                </h2>

                <div className="mt-6 rounded-2xl border border-zinc-900 bg-black p-5">
                  <p className="font-medium">No payout method connected</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    Connect a bank account before launch so sellers can receive payouts.
                  </p>
                </div>

                <button className="mt-5 w-full rounded-full bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-zinc-200">
                  Connect Bank Account
                </button>
              </div>

              <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
                <h2 className="text-2xl font-semibold">
                  Fee Breakdown
                </h2>

                <div className="mt-6 space-y-4 text-sm">
                  <div className="flex justify-between border-b border-zinc-900 pb-4">
                    <span className="text-zinc-500">Seller Fee</span>
                    <span>10%</span>
                  </div>

                  <div className="flex justify-between border-b border-zinc-900 pb-4">
                    <span className="text-zinc-500">Buyer Fee</span>
                    <span>3%</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-zinc-500">Payout Speed</span>
                    <span>After verification</span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
                <h2 className="text-2xl font-semibold">
                  Security
                </h2>

                <p className="mt-3 text-sm leading-6 text-zinc-500">
                  Real payouts should be handled through a payment processor like Stripe before launch.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </RequireAuth>
  );
}