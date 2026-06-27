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
};

type Order = {
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
  shipped: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  completed: "border-green-500/30 bg-green-500/10 text-green-300",
  cancelled: "border-red-500/30 bg-red-500/10 text-red-300",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    setCurrentUserId(user.id);

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
          price
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setOrders([]);
      setLoading(false);
      return;
    }

    setOrders((data || []) as unknown as Order[]);
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

  function getRole(order: Order) {
    if (order.buyer_id === currentUserId) return "Buyer";
    if (order.seller_id === currentUserId) return "Seller";
    return "User";
  }

  const buyingOrders = orders.filter((order) => order.buyer_id === currentUserId);
  const sellingOrders = orders.filter((order) => order.seller_id === currentUserId);
  const inProgressOrders = orders.filter(
    (order) => order.status !== "completed" && order.status !== "cancelled"
  );

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
                Track purchases, sales, checkout totals, and transaction status.
              </p>
            </div>

            <Link
              href="/browse"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-zinc-200"
            >
              Browse Cards
            </Link>
          </div>

          {message && (
            <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
              {message}
            </div>
          )}

          <div className="mt-12 grid gap-4 md:grid-cols-4">
            <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <p className="text-sm text-zinc-500">Total Orders</p>
              <h2 className="mt-3 text-4xl font-semibold">{orders.length}</h2>
            </div>

            <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <p className="text-sm text-zinc-500">Buying</p>
              <h2 className="mt-3 text-4xl font-semibold">
                {buyingOrders.length}
              </h2>
            </div>

            <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <p className="text-sm text-zinc-500">Selling</p>
              <h2 className="mt-3 text-4xl font-semibold">
                {sellingOrders.length}
              </h2>
            </div>

            <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <p className="text-sm text-zinc-500">In Progress</p>
              <h2 className="mt-3 text-4xl font-semibold">
                {inProgressOrders.length}
              </h2>
            </div>
          </div>

          {loading ? (
            <div className="mt-12 rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <p className="text-zinc-400">Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="mt-12 rounded-3xl border border-zinc-900 bg-zinc-950 p-8 text-center">
              <h2 className="text-2xl font-semibold">No orders yet</h2>

              <p className="mt-3 text-zinc-500">
                Orders will appear here after you buy or sell a card.
              </p>

              <Link
                href="/browse"
                className="mt-6 inline-block rounded-full bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-zinc-200"
              >
                Browse Cards
              </Link>
            </div>
          ) : (
            <div className="mt-12 rounded-3xl border border-zinc-900 bg-zinc-950 p-4">
              <div className="flex items-center justify-between px-2 py-3">
                <h2 className="text-2xl font-semibold">Recent Orders</h2>

                <button className="rounded-full border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-600 hover:text-white">
                  Export
                </button>
              </div>

              <div className="mt-4 space-y-4">
                {orders.map((order) => {
                  const role = getRole(order);
                  const status = order.status || "pending";

                  return (
                    <div
                      key={order.id}
                      className="rounded-2xl border border-zinc-900 bg-black p-5"
                    >
                      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="text-sm text-zinc-500">
                              {order.id.slice(0, 8).toUpperCase()}
                            </p>

                            <span className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400">
                              {role}
                            </span>

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
                              order.listing_id
                                ? `/cards/${order.listing_id}`
                                : "/browse"
                            }
                            className="mt-4 block text-2xl font-semibold hover:underline"
                          >
                            {order.listings?.title || "Untitled Card"}
                          </Link>

                          <div className="mt-5 grid gap-3 text-sm text-zinc-400 md:grid-cols-3">
                            <div>
                              <p className="text-zinc-600">Role</p>
                              <p className="mt-1 text-zinc-300">{role}</p>
                            </div>

                            <div>
                              <p className="text-zinc-600">Date</p>
                              <p className="mt-1 text-zinc-300">
                                {formatDate(order.created_at)}
                              </p>
                            </div>

                            <div>
                              <p className="text-zinc-600">Listing ID</p>
                              <p className="mt-1 text-zinc-300">
                                {order.listing_id
                                  ? order.listing_id.slice(0, 8)
                                  : "Missing"}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="min-w-[210px] rounded-2xl border border-zinc-900 bg-zinc-950 p-5 lg:text-right">
                          <p className="text-sm text-zinc-500">Card Price</p>
                          <p className="mt-1 text-xl font-semibold">
                            {formatPrice(order.card_price)}
                          </p>

                          <p className="mt-4 text-sm text-zinc-500">Total</p>
                          <p className="mt-1 text-2xl font-bold">
                            {formatPrice(order.total_amount)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 border-t border-zinc-900 pt-5 text-sm md:grid-cols-3">
                        <div className="rounded-2xl bg-zinc-950 p-4">
                          <p className="text-zinc-500">Buyer Fee</p>
                          <p className="mt-1 font-semibold">
                            {formatPrice(order.buyer_fee)}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-zinc-950 p-4">
                          <p className="text-zinc-500">Shipping</p>
                          <p className="mt-1 font-semibold">
                            {formatPrice(order.shipping_amount)}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-zinc-950 p-4">
                          <p className="text-zinc-500">Status</p>
                          <p className="mt-1 font-semibold capitalize">
                            {status}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <Link
                          href={
                            order.listing_id
                              ? `/cards/${order.listing_id}`
                              : "/browse"
                          }
                          className="rounded-full border border-zinc-800 px-5 py-2 text-sm text-zinc-300 hover:border-zinc-600 hover:text-white"
                        >
                          View Card
                        </Link>

                        <Link
                          href={`/messages?orderId=${order.id}`}
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
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-8 rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
            <h2 className="text-2xl font-semibold">Checkout Status</h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-500">
              This order flow now creates real database orders. Before launch,
              we still need to connect a real payment processor so money is actually collected.
            </p>
          </div>
        </section>
      </main>
    </RequireAuth>
  );
}