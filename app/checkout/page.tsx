"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import RequireAuth from "../components/RequireAuth";

export default function CheckoutRedirectPage() {
  const router = useRouter();
  const [listingId] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return new URLSearchParams(window.location.search).get("listingId") || "";
  });
  const message = listingId
    ? "Preparing secure checkout..."
    : "Choose a listing before checkout.";

  useEffect(() => {
    if (listingId) {
      router.replace(`/checkout/${encodeURIComponent(listingId)}`);
    }
  }, [listingId, router]);

  return (
    <RequireAuth>
      <main className="min-h-screen bg-black text-white">
        <Header />
        <section className="mx-auto max-w-4xl px-6 py-16">
          <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">Checkout</p>
          <h1 className="mt-4 text-5xl font-semibold">Secure Checkout</h1>
          <div className="mt-10 rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
            <p className="text-zinc-400">{message}</p>
            {message === "Choose a listing before checkout." ? (
              <Link className="mt-6 inline-flex rounded-full bg-white px-6 py-3 font-semibold text-black" href="/browse">
                Browse Cards
              </Link>
            ) : null}
          </div>
        </section>
      </main>
    </RequireAuth>
  );
}
