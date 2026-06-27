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
  created_at: string | null;
};

type OrderListing = {
  id: string;
  title: string | null;
  price: number | null;
  status: string | null;
};

type SellerOrder = {
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
  listings: OrderListing | null;
};

export default function SellerDashboardPage() {
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: orderData, error: orderError } = await supabase
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

    if (orderError) {
      setMessage(orderError.message);
      setOrders([]);
    } else {
      setOrders((orderData || []) as unknown as SellerOrder[]);
    }

    const { data: listingData, error: listingError } = await supabase
      .from("listings")
      .select("id, title, price, status, created_at")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });

    if (listingError) {
      setMessage(listingError.message);
      setListings([]);
    } else {
      setListings((listingData || []) as Listing[]);
    }

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

  const activeListings = listings.filter((listing) => listing.status === "active");
  const soldListings = listings.filter((listing) => listing.status === "sold");

  const grossSales = orders.reduce(
    (sum, order) => sum + Number(order.card_price || 0),
    0
  );

  const buyerFeesCollected = orders.reduce(
    (sum, order) => sum + Number(order.buyer_fee || 0),
    0
  );

  const estimatedSellerPayout = grossSales;

  const pendingOrders = orders.filter((order) => order.status === "pending");
  const completedOrders = orders.filter((order) => order.status === "completed");

  return (
    <RequireAuth>
      <main className="min-h-screen bg-black text-white">
        <Header />

        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">
                Seller Dashboard
              </p>

              <h1 className="mt-4 text-5xl font-semibold tracking-tight">
                Sales Overview
              </h1>

              <p className="mt-4 max-w-2xl text-zinc-400">
                Track listings, sold cards, revenue, pending orders, and seller activity.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/list"
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-zinc-200"
              >
                List New Card
              </Link>

              <Link
                href="/orders"
                className="rounded-full border border-zinc-800 px-6 py-3 text-sm font-semibold text-zinc-300 hover:border-zinc-600 hover:text-white"
              >
                View Orders
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
              <p className="text-zinc-400">Loading seller dashboard...</p>
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
                    Based on sold card price only.
                  </p>
                </div>

                <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
                  <p className="text-sm text-zinc-500">Estimated Payout</p>
                  <h2 className="mt-3 text-4xl font-semibold">
                    {formatPrice(estimatedSellerPayout)}
                  </h2>
                  <p className="mt-3 text-xs text-zinc-600">
                    Seller fees are not added yet.
                  </p>
                </div>

                <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
                  <p className="text-sm text-zinc-500">Active Listings</p>
                  <h2 className="mt-3 text-4xl font-semibold">
                    {activeListings.length}
                  </h2>
                  <p className="mt-3 text-xs text-zinc-600">
                    Cards still visible on Browse.
                  </p>
                </div>

                <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
                  <p className="text-sm text-zinc-500">Sold Cards</p>
                  <h2 className="mt-3 text-4xl font-semibold">
                    {soldListings.length}
                  </h2>
                  <p className="mt-3 text-xs text-zinc-600">
                    Listings marked as sold.
                  </p>
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
                  <p className="text-sm text-zinc-500">Total Orders</p>
                  <h2 className="mt-3 text-3xl font-semibold">
                    {orders.length}
                  </h2>
                </div>

                <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
                  <p className="text-sm text-zinc-500">Pending Orders</p>
                  <h2 className="mt-3 text-3xl font-semibold">
                    {pendingOrders.length}
                  </h2>
                </div>

                <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
                  <p className="text-sm text-zinc-500">Completed Orders</p>
                  <h2 className="mt-3 text-3xl font-semibold">
                    {completedOrders.length}
                  </h2>
                </div>
              </div>

              <div className="mt-12 grid gap-6 lg:grid-cols-2">
                <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-semibold">Recent Sales</h2>

                    <Link
                      href="/orders"
                      className="text-sm text-zinc-400 hover:text-white"
                    >
                      View all
                    </Link>
                  </div>

                  <div className="mt-6 space-y-4">
                    {orders.length === 0 ? (
                      <div className="rounded-2xl border border-zinc-900 p-5">
                        <p className="text-zinc-500">
                          No sales yet. Sold cards will appear here.
                        </p>
                      </div>
                    ) : (
                      orders.slice(0, 5).map((order) => (
                        <div
                          key={order.id}
                          className="rounded-2xl border border-zinc-900 bg-black p-5"
                        >
                          <div className="flex justify-between gap-4">
                            <div>
                              <Link
                                href={
                                  order.listing_id
                                    ? `/cards/${order.listing_id}`
                                    : "/orders"
                                }
                                className="font-semibold hover:underline"
                              >
                                {order.listings?.title || "Untitled Card"}
                              </Link>

                              <p className="mt-1 text-sm text-zinc-500">
                                Sold on {formatDate(order.created_at)}
                              </p>

                              <p className="mt-1 text-xs text-zinc-600 capitalize">
                                Status: {order.status || "pending"}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-sm text-zinc-500">Sale</p>
                              <p className="text-2xl font-bold">
                                {formatPrice(order.card_price)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-semibold">Your Listings</h2>

                    <Link
                      href="/list"
                      className="text-sm text-zinc-400 hover:text-white"
                    >
                      Add new
                    </Link>
                  </div>

                  <div className="mt-6 space-y-4">
                    {listings.length === 0 ? (
                      <div className="rounded-2xl border border-zinc-900 p-5">
                        <p className="text-zinc-500">
                          You have not listed any cards yet.
                        </p>
                      </div>
                    ) : (
                      listings.slice(0, 6).map((listing) => (
                        <div
                          key={listing.id}
                          className="rounded-2xl border border-zinc-900 bg-black p-5"
                        >
                          <div className="flex justify-between gap-4">
                            <div>
                              <Link
                                href={`/cards/${listing.id}`}
                                className="font-semibold hover:underline"
                              >
                                {listing.title || "Untitled Card"}
                              </Link>

                              <p className="mt-1 text-sm text-zinc-500">
                                Listed {formatDate(listing.created_at)}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-sm text-zinc-500">
                                {formatPrice(listing.price)}
                              </p>

                              <p
                                className={`mt-1 text-sm capitalize ${
                                  listing.status === "active"
                                    ? "text-green-400"
                                    : listing.status === "sold"
                                    ? "text-yellow-300"
                                    : "text-zinc-400"
                                }`}
                              >
                                {listing.status || "unknown"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-8 rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
                <h2 className="text-2xl font-semibold">Seller Notes</h2>

                <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-500">
                  This dashboard is now connected to real Supabase orders and listings.
                  Payouts are estimated for now because Stripe/payment processing is not connected yet.
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl bg-black p-5">
                    <p className="text-sm text-zinc-500">Buyer Fees Collected</p>
                    <p className="mt-2 text-2xl font-semibold">
                      {formatPrice(buyerFeesCollected)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-black p-5">
                    <p className="text-sm text-zinc-500">Seller Fee</p>
                    <p className="mt-2 text-2xl font-semibold">$0.00</p>
                  </div>

                  <div className="rounded-2xl bg-black p-5">
                    <p className="text-sm text-zinc-500">Payment Processor</p>
                    <p className="mt-2 text-2xl font-semibold">Not connected</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </RequireAuth>
  );
}