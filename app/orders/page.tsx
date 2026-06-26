import Link from "next/link";
import Header from "../components/Header";
import RequireAuth from "../components/RequireAuth";

const orders = [
  {
    id: "ORD-1001",
    card: "1986 Fleer Michael Jordan Rookie",
    grade: "PSA 9",
    role: "Buyer",
    seller: "Ryan Haas",
    buyer: "Alex Morgan",
    price: "$4,500",
    total: "$4,647",
    status: "In Verification",
    date: "Today",
    href: "/cards/jordan-rookie",
  },
  {
    id: "ORD-1002",
    card: "Tom Brady Auto",
    grade: "BGS 9.5",
    role: "Seller",
    seller: "Ryan Haas",
    buyer: "Chris Walker",
    price: "$2,950",
    total: "$3,050",
    status: "Shipped",
    date: "May 28",
    href: "/cards/tom-brady-auto",
  },
  {
    id: "ORD-1003",
    card: "LeBron James Rookie",
    grade: "PSA 10",
    role: "Buyer",
    seller: "Premier Cards",
    buyer: "Ryan Haas",
    price: "$8,200",
    total: "$8,458",
    status: "Completed",
    date: "May 19",
    href: "/cards/lebron-rookie",
  },
];

const statusStyles: Record<string, string> = {
  "In Verification": "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
  Shipped: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  Completed: "border-green-500/30 bg-green-500/10 text-green-300",
  Cancelled: "border-red-500/30 bg-red-500/10 text-red-300",
};

export default function OrdersPage() {
  return (
    <RequireAuth>
      <main className="min-h-screen bg-black text-white">
        <Header />

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">
                Orders
              </p>

              <h1 className="mt-4 text-5xl font-semibold tracking-tight">
                Order History
              </h1>

              <p className="mt-4 max-w-2xl text-zinc-400">
                Track purchases, sales, verification status, shipping, and completed transactions.
              </p>
            </div>

            <Link
              href="/browse"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-zinc-200"
            >
              Browse Cards
            </Link>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-4">
            <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <p className="text-sm text-zinc-500">Total Orders</p>
              <h2 className="mt-3 text-4xl font-semibold">3</h2>
            </div>

            <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <p className="text-sm text-zinc-500">Buying</p>
              <h2 className="mt-3 text-4xl font-semibold">2</h2>
            </div>

            <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <p className="text-sm text-zinc-500">Selling</p>
              <h2 className="mt-3 text-4xl font-semibold">1</h2>
            </div>

            <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <p className="text-sm text-zinc-500">In Progress</p>
              <h2 className="mt-3 text-4xl font-semibold">2</h2>
            </div>
          </div>

          <div className="mt-12 rounded-3xl border border-zinc-900 bg-zinc-950 p-4">
            <div className="flex items-center justify-between px-2 py-3">
              <h2 className="text-2xl font-semibold">
                Recent Orders
              </h2>

              <button className="rounded-full border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-600 hover:text-white">
                Export
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl border border-zinc-900 bg-black p-5"
                >
                  <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-sm text-zinc-500">
                          {order.id}
                        </p>

                        <span className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400">
                          {order.role}
                        </span>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs ${
                            statusStyles[order.status] ||
                            "border-zinc-800 bg-zinc-900 text-zinc-300"
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>

                      <Link
                        href={order.href}
                        className="mt-4 block text-2xl font-semibold hover:underline"
                      >
                        {order.card}
                      </Link>

                      <p className="mt-1 text-sm text-zinc-500">
                        {order.grade}
                      </p>

                      <div className="mt-5 grid gap-3 text-sm text-zinc-400 md:grid-cols-3">
                        <div>
                          <p className="text-zinc-600">Seller</p>
                          <p className="mt-1 text-zinc-300">{order.seller}</p>
                        </div>

                        <div>
                          <p className="text-zinc-600">Buyer</p>
                          <p className="mt-1 text-zinc-300">{order.buyer}</p>
                        </div>

                        <div>
                          <p className="text-zinc-600">Date</p>
                          <p className="mt-1 text-zinc-300">{order.date}</p>
                        </div>
                      </div>
                    </div>

                    <div className="min-w-[180px] rounded-2xl border border-zinc-900 bg-zinc-950 p-5 lg:text-right">
                      <p className="text-sm text-zinc-500">Card Price</p>
                      <p className="mt-1 text-xl font-semibold">{order.price}</p>

                      <p className="mt-4 text-sm text-zinc-500">Total</p>
                      <p className="mt-1 text-2xl font-bold">{order.total}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3 border-t border-zinc-900 pt-5">
                    <Link
                      href={order.href}
                      className="rounded-full border border-zinc-800 px-5 py-2 text-sm text-zinc-300 hover:border-zinc-600 hover:text-white"
                    >
                      View Card
                    </Link>

                    <Link
                      href="/messages"
                      className="rounded-full border border-zinc-800 px-5 py-2 text-sm text-zinc-300 hover:border-zinc-600 hover:text-white"
                    >
                      Message
                    </Link>

                    <Link
                      href="/billing"
                      className="rounded-full border border-zinc-800 px-5 py-2 text-sm text-zinc-300 hover:border-zinc-600 hover:text-white"
                    >
                      Payment Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
            <h2 className="text-2xl font-semibold">
              Order Protection
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-500">
              In the real version of GRAIL, orders should stay locked behind authentication,
              connect to payment processing, verify card delivery, and only release payouts
              after the transaction clears your rules.
            </p>
          </div>
        </section>
      </main>
    </RequireAuth>
  );
}