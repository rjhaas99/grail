"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Header from "../components/Header";
import RequireAuth from "../components/RequireAuth";
import { supabase } from "../../lib/supabase";

type Profile = {
  full_name: string | null;
  username: string | null;
  email: string | null;
  bio: string | null;
  avatar_url: string | null;
  seller_level: string | null;
  total_sales: number | null;
  total_orders: number | null;
  positive_feedback: number | null;
  verified: boolean | null;
  created_at: string | null;
};

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;

      setUser(user);

      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select(
          "full_name, username, email, bio, avatar_url, seller_level, total_sales, total_orders, positive_feedback, verified, created_at"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;

      setProfile(data);
      setLoading(false);
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Collector";

  const username =
    profile?.username ||
    user?.user_metadata?.username ||
    "grail_user";

  const email = profile?.email || user?.email || "No email found";

  const sellerLevel = profile?.seller_level || "Level 1 Collector";

  const totalSales = profile?.total_sales ?? 0;
  const totalOrders = profile?.total_orders ?? 0;
  const feedback = profile?.positive_feedback ?? 0;

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "New member";

  return (
    <RequireAuth>
      <main className="min-h-screen bg-black text-white">
        <Header />

        <section className="mx-auto max-w-6xl px-6 py-16">
          <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">
            Profile
          </p>

          <h1 className="mt-4 text-5xl font-semibold tracking-tight">
            My Account
          </h1>

          <p className="mt-4 max-w-2xl text-zinc-400">
            View your collector profile, seller status, and public marketplace identity.
          </p>

          {loading ? (
            <div className="mt-12 rounded-3xl border border-zinc-900 bg-zinc-950 p-8">
              <p className="text-zinc-400">Loading profile...</p>
            </div>
          ) : (
            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6 lg:col-span-1">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-28 w-28 items-center justify-center rounded-full border border-zinc-800 bg-black text-4xl font-semibold">
                    {displayName.charAt(0).toUpperCase()}
                  </div>

                  <h2 className="mt-6 text-2xl font-semibold">
                    {displayName}
                  </h2>

                  <p className="mt-1 text-sm text-zinc-500">
                    @{username}
                  </p>

                  <div className="mt-5 rounded-full border border-zinc-800 px-4 py-2 text-sm text-zinc-300">
                    {sellerLevel}
                  </div>

                  {profile?.verified ? (
                    <p className="mt-4 text-sm text-green-400">
                      Verified seller
                    </p>
                  ) : (
                    <p className="mt-4 text-sm text-zinc-500">
                      Verification not completed
                    </p>
                  )}
                </div>

                <div className="mt-8 border-t border-zinc-900 pt-6">
                  <p className="text-sm text-zinc-500">Member Since</p>
                  <p className="mt-1 font-medium">{memberSince}</p>
                </div>
              </div>

              <div className="space-y-6 lg:col-span-2">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
                    <p className="text-sm text-zinc-500">Total Sales</p>
                    <h3 className="mt-3 text-3xl font-semibold">
                      {totalSales}
                    </h3>
                  </div>

                  <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
                    <p className="text-sm text-zinc-500">Orders</p>
                    <h3 className="mt-3 text-3xl font-semibold">
                      {totalOrders}
                    </h3>
                  </div>

                  <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
                    <p className="text-sm text-zinc-500">Positive Feedback</p>
                    <h3 className="mt-3 text-3xl font-semibold">
                      {feedback}%
                    </h3>
                  </div>
                </div>

                <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
                  <h2 className="text-2xl font-semibold">
                    Account Details
                  </h2>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-zinc-900 bg-black p-5">
                      <p className="text-sm text-zinc-500">Full Name</p>
                      <p className="mt-2 font-medium">{displayName}</p>
                    </div>

                    <div className="rounded-2xl border border-zinc-900 bg-black p-5">
                      <p className="text-sm text-zinc-500">Username</p>
                      <p className="mt-2 font-medium">@{username}</p>
                    </div>

                    <div className="rounded-2xl border border-zinc-900 bg-black p-5 md:col-span-2">
                      <p className="text-sm text-zinc-500">Email</p>
                      <p className="mt-2 font-medium">{email}</p>
                    </div>

                    <div className="rounded-2xl border border-zinc-900 bg-black p-5 md:col-span-2">
                      <p className="text-sm text-zinc-500">Bio</p>
                      <p className="mt-2 leading-7 text-zinc-300">
                        {profile?.bio ||
                          "No bio added yet. This will become your public collector profile description."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
                  <h2 className="text-2xl font-semibold">
                    Seller Status
                  </h2>

                  <p className="mt-3 text-zinc-400">
                    Your seller level is controlled by GRAIL based on completed sales,
                    order history, and buyer feedback.
                  </p>

                  <div className="mt-6 h-3 rounded-full bg-zinc-900">
                    <div className="h-3 w-1/4 rounded-full bg-white" />
                  </div>

                  <p className="mt-3 text-sm text-zinc-500">
                    Level 1 Collector → Level 2 Dealer
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </RequireAuth>
  );
}