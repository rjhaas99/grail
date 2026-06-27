"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Header from "../components/Header";
import RequireAuth from "../components/RequireAuth";
import { supabase } from "../../lib/supabase";

type Listing = {
  id: string;
  title: string | null;
  price: number | null;
  status: string | null;
};

type SaleOrder = {
  id: string;
  listing_id: string | null;
  buyer_id: string | null;
  seller_id: string | null;
  card_price: number | null;
  buyer_fee: number | null;
  shipping_amount: number | null;
  total_amount: number | null;
  status: string | null;
  created_at: string | null;
  listings: Listing | null;
};

const statusStyles: Record<string, string> = {
  pending: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
  paid: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  shipped: "border-purple-500/30 bg-purple-500/10 text-purple-300",
  completed: "border-green-500/30 bg-green-500/10 text-green-300",
  cancelled: "border-red-500/30 bg-red-500/10 text-red-300",
};

export default function SalesPage() {
  const [sales, setSales] = useState<SaleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadSales();
  }, []);

  async function loadSales() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        id,
        listing_id,
        buyer_id,
        seller_id,
        card_price,
        buyer_fee,
        shipping_amount,
        total_amount,
        status,
        created_at,
        listings (
          id,
          title,
          price,
          status
        )
      `
      )
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setSales([]);
      setLoading(false);
      return;
    }

    setSales((data || []) as unknown as SaleOrder[]);
    setLoading(false);
  }

  function formatPrice(price: number | null) {
    if (!price) return "$0.00";

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(price);
  }

  function formatDate(date: string | null) {
    if (!date) return "Recently";

    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  async function updateSaleStatus(orderId: string, status: string) {
    setMessage("");

    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadSales();
  }

  const grossSales = sales.reduce(
    (sum, sale) => sum + Number(sale.card_price || 0),
    0
  );

  const shippingCollected = sales.reduce(
    (sum, sale) => sum + Number(sale.shipping_amount || 0),
    0
  );

  const buyerFeesCollected = sales.reduce(
    (sum, sale) => sum + Number(sale.buyer_fee || 0),
    0
  );

  const pendingSales = sales.filter((sale) => sale.status === "pending");
  const shippedSales = sales.filter((sale) => sale.status === "shipped");
  const completedSales = sales.filter((sale) => sale.status === "completed");

  const estimatedPayout = grossSales;

  return (
    <RequireAuth>
      <main className="min-h-screen bg-black text-white">
        <Header />

        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">
                Sales
              </p>

              <h1 className="mt-4 text-5xl font-semibold tracking-tight">
                Sold Card History
              </h1>

              <p className="mt-4 max-w-2xl text-zinc-400">
                Manage sold cards, order status, payout estimates, buyer fees,
                and shipping activity.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/orders"
                className="rounded-full border border-zinc-800 px-6 py-3 text-sm font-semibold text-zinc-300 hover:border-zinc-600 hover:text-white"
              >
                Orders
              </Link>

              <Link
                href="/list"
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-zinc-200"
              >
                List New Card
              </Link>
            </div>
          </div>

          {message && (
            <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
              {message}
            </div>
          )}

          {loading ? (
            <div className="mt-12 rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <p className="text-zinc-400">Loading sales...</p>
            </div>
          ) : (
            <>
              <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
                  <p className="text-sm text-zinc-500">Gross Sales</p>
                  <h2 className="mt-3 text-4xl font-semibold">
                    {formatPrice(grossSales)}
                  </h2>
                  <p className="mt-3 text-xs text-zinc-600">
                    Total sold card value.
                  </p>
                </div>

                <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
                  <p className="text-sm text-zinc-500">Estimated Payout</p>
                  <h2 className="mt-3 text-4xl font-semibold">
                    {formatPrice(estimatedPayout)}
                  </h2>
                  <p className="mt-3 text-xs text-zinc-600">
                    Seller fees not connected yet.
                  </p>
                </div>

                <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
                  <p className="text-sm text-zinc-500">Total Sales</p>
                  <h2 className="mt-3 text-4xl font-semibold">
                    {sales.length}
                  </h2>
                  <p className="mt-3 text-xs text-zinc-600">
                    Orders where you are the seller.
                  </p>
                </div>

                <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
                  <p className="text-sm text-zinc-500">Completed</p>
                  <h2 className="mt-3 text-4xl font-semibold">
                    {completedSales.length}
                  </h2>
                  <p className="mt-3 text-xs text-zinc-600">
                    Finished transactions.
                  </p>
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
                  <p className="text-sm text-zinc-500">Pending</p>
                  <h2 className="mt-3 text-3xl font-semibold">
                    {pendingSales.length}
                  </h2>
                </div>

                <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
                  <p className="text-sm text-zinc-500">Shipped</p>
                  <h2 className="mt-3 text-3xl font-semibold">
                    {shippedSales.length}
                  </h2>
                </div>

                <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
                  <p className="text-sm text-zinc-500">Buyer Fees Collected</p>
                  <h2 className="mt-3 text-3xl font-semibold">
                    {formatPrice(buyerFeesCollected)}
                  </h2>
                </div>
              </div>

              <div className="mt-12 rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div>
                    <h2 className="text-2xl font-semibold">Sales Records</h2>

                    <p className="mt-2 text-sm text-zinc-500">
                      Update order status as the sale moves through the process.
                    </p>
                  </div>

                  <div className="rounded-full border border-zinc-800 px-4 py-2 text-sm text-zinc-400">
                    {sales.length} total
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {sales.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-900 bg-black p-8 text-center">
                      <h3 className="text-xl font-semibold">No sales yet</h3>

                      <p className="mt-3 text-zinc-500">
                        When someone buys one of your cards, it will appear here.
                      </p>

                      <Link
                        href="/list"
                        className="mt-6 inline-block rounded-full bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-zinc-200"
                      >
                        List a Card
                      </Link>
                    </div>
                  ) : (
                    sales.map((sale) => {
                      const status = sale.status || "pending";

                      return (
                        <div
                          key={sale.id}
                          className="rounded-2xl border border-zinc-900 bg-black p-5"
                        >
                          <div className="flex flex-col justify-between gap-6 lg:flex-row">
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-3">
                                <p className="text-xs uppercase tracking-[0.25em] text-zinc-600">
                                  Order {sale.id.slice(0, 8)}
                                </p>

                                <span
                                  className={`rounded-full border px-3 py-1 text-xs capitalize ${
                                    statusStyles[status] ||
                                    "border-zinc-800 bg-zinc-900 text-zinc-300"
                                  }`}
                                >
                                  {status}
                                </span>
                              </div>

                              <Link
                                href={
                                  sale.listing_id
                                    ? `/cards/${sale.listing_id}`
                                    : "/orders"
                                }
                                className="mt-4 block text-2xl font-semibold hover:underline"
                              >
                                {sale.listings?.title || "Untitled Card"}
                              </Link>

                              <div className="mt-5 grid gap-4 text-sm md:grid-cols-3">
                                <div>
                                  <p className="text-zinc-600">Sale Date</p>
                                  <p className="mt-1 text-zinc-300">
                                    {formatDate(sale.created_at)}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-zinc-600">Buyer ID</p>
                                  <p className="mt-1 text-zinc-300">
                                    {sale.buyer_id
                                      ? sale.buyer_id.slice(0, 8)
                                      : "Missing"}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-zinc-600">Listing ID</p>
                                  <p className="mt-1 text-zinc-300">
                                    {sale.listing_id
                                      ? sale.listing_id.slice(0, 8)
                                      : "Missing"}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="min-w-[240px] rounded-2xl border border-zinc-900 bg-zinc-950 p-5">
                              <div className="flex justify-between text-sm">
                                <span className="text-zinc-500">
                                  Card Price
                                </span>
                                <span>{formatPrice(sale.card_price)}</span>
                              </div>

                              <div className="mt-3 flex justify-between text-sm">
                                <span className="text-zinc-500">Buyer Fee</span>
                                <span>{formatPrice(sale.buyer_fee)}</span>
                              </div>

                              <div className="mt-3 flex justify-between text-sm">
                                <span className="text-zinc-500">Shipping</span>
                                <span>{formatPrice(sale.shipping_amount)}</span>
                              </div>

                              <div className="mt-4 flex justify-between border-t border-zinc-800 pt-4 text-lg font-semibold">
                                <span>Total Paid</span>
                                <span>{formatPrice(sale.total_amount)}</span>
                              </div>

                              <div className="mt-4 flex justify-between text-sm">
                                <span className="text-zinc-500">
                                  Seller Payout
                                </span>
                                <span>{formatPrice(sale.card_price)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-6 flex flex-wrap gap-3 border-t border-zinc-900 pt-5">
                            {status !== "paid" && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateSaleStatus(sale.id, "paid")
                                }
                                className="rounded-full border border-zinc-800 px-5 py-2 text-sm text-zinc-300 hover:border-zinc-600 hover:text-white"
                              >
                                Mark Paid
                              </button>
                            )}

                            {status !== "shipped" && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateSaleStatus(sale.id, "shipped")
                                }
                                className="rounded-full border border-zinc-800 px-5 py-2 text-sm text-zinc-300 hover:border-zinc-600 hover:text-white"
                              >
                                Mark Shipped
                              </button>
                            )}

                            {status !== "completed" && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateSaleStatus(sale.id, "completed")
                                }
                                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
                              >
                                Complete Sale
                              </button>
                            )}

                            {status !== "cancelled" && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateSaleStatus(sale.id, "cancelled")
                                }
                                className="rounded-full border border-red-900/60 px-5 py-2 text-sm text-red-300 hover:border-red-500"
                              >
                                Cancel
                              </button>
                            )}

                            <Link
                              href="/messages"
                              className="rounded-full border border-zinc-800 px-5 py-2 text-sm text-zinc-300 hover:border-zinc-600 hover:text-white"
                            >
                              Message Buyer
                            </Link>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="mt-8 rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
                <h2 className="text-2xl font-semibold">Payout Summary</h2>

                <div className="mt-6 grid gap-4 md:grid-cols-4">
                  <div className="rounded-2xl bg-black p-5">
                    <p className="text-sm text-zinc-500">Gross Sales</p>
                    <p className="mt-2 text-2xl font-semibold">
                      {formatPrice(grossSales)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-black p-5">
                    <p className="text-sm text-zinc-500">Shipping Collected</p>
                    <p className="mt-2 text-2xl font-semibold">
                      {formatPrice(shippingCollected)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-black p-5">
                    <p className="text-sm text-zinc-500">Seller Fees</p>
                    <p className="mt-2 text-2xl font-semibold">$0.00</p>
                  </div>

                  <div className="rounded-2xl bg-black p-5">
                    <p className="text-sm text-zinc-500">Est. Payout</p>
                    <p className="mt-2 text-2xl font-semibold">
                      {formatPrice(estimatedPayout)}
                    </p>
                  </div>
                </div>

                <p className="mt-6 max-w-3xl text-sm leading-7 text-zinc-500">
                  This page is connected to real Supabase orders. Payment
                  processing, seller fees, labels, and payout transfers still
                  need to be connected before launch.
                </p>
              </div>
            </>
          )}
        </section>
      </main>
    </RequireAuth>
  );
}