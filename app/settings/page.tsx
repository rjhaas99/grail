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
};

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");

  const [offerAlerts, setOfferAlerts] = useState(true);
  const [messageAlerts, setMessageAlerts] = useState(true);
  const [salesAlerts, setSalesAlerts] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSettings() {
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
        .select("full_name, username, email, bio")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;

      setProfile(data);

      setFullName(data?.full_name || user.user_metadata?.full_name || "");
      setUsername(data?.username || user.user_metadata?.username || "");
      setBio(data?.bio || "");

      setLoading(false);
    }

    loadSettings();

    return () => {
      active = false;
    };
  }, []);

  async function handleSave() {
    setMessage("");

    if (!user) {
      setMessage("You must be signed in to update settings.");
      return;
    }

    if (!fullName.trim() || !username.trim()) {
      setMessage("Full name and username are required.");
      return;
    }

    try {
      setSaving(true);

      const cleanUsername = username.trim().toLowerCase();

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          username: cleanUsername,
          bio: bio.trim() || null,
        })
        .eq("id", user.id);

      if (error) throw error;

      setUsername(cleanUsername);
      setMessage("Settings saved successfully.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Settings could not be saved. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  const email = profile?.email || user?.email || "No email found";

  return (
    <RequireAuth>
      <main className="min-h-screen bg-black text-white">
        <Header />

        <section className="mx-auto max-w-6xl px-6 py-16">
          <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">
            Settings
          </p>

          <h1 className="mt-4 text-5xl font-semibold tracking-tight">
            Account Settings
          </h1>

          <p className="mt-4 max-w-2xl text-zinc-400">
            Manage your GRAIL account, profile details, notifications, security, and marketplace preferences.
          </p>

          {loading ? (
            <div className="mt-12 rounded-3xl border border-zinc-900 bg-zinc-950 p-8">
              <p className="text-zinc-400">Loading settings...</p>
            </div>
          ) : (
            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
                  <h2 className="text-2xl font-semibold">
                    Public Profile
                  </h2>

                  <p className="mt-2 text-sm text-zinc-500">
                    This information appears on your GRAIL collector profile.
                  </p>

                  <div className="mt-6 space-y-5">
                    <div>
                      <label className="text-sm text-zinc-500">
                        Full Name
                      </label>

                      <input
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-zinc-800 bg-black p-4 text-white outline-none"
                        placeholder="Full name"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-zinc-500">
                        Username
                      </label>

                      <input
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-zinc-800 bg-black p-4 text-white outline-none"
                        placeholder="Username"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-zinc-500">
                        Bio
                      </label>

                      <textarea
                        value={bio}
                        onChange={(event) => setBio(event.target.value)}
                        className="mt-2 min-h-32 w-full rounded-2xl border border-zinc-800 bg-black p-4 text-white outline-none"
                        placeholder="Tell buyers and sellers about your collection."
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="rounded-full bg-white px-8 py-4 font-semibold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save Profile"}
                    </button>

                    {message && (
                      <p className="text-sm text-zinc-400">
                        {message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
                  <h2 className="text-2xl font-semibold">
                    Notification Preferences
                  </h2>

                  <p className="mt-2 text-sm text-zinc-500">
                    Choose which updates GRAIL should send you.
                  </p>

                  <div className="mt-6 space-y-4">
                    <SettingToggle
                      title="Offer alerts"
                      description="Get notified when buyers send, counter, accept, or decline offers."
                      enabled={offerAlerts}
                      setEnabled={setOfferAlerts}
                    />

                    <SettingToggle
                      title="Message alerts"
                      description="Get notified when buyers or sellers send you a message."
                      enabled={messageAlerts}
                      setEnabled={setMessageAlerts}
                    />

                    <SettingToggle
                      title="Sales and order alerts"
                      description="Get notified about purchases, payouts, shipping, and verification updates."
                      enabled={salesAlerts}
                      setEnabled={setSalesAlerts}
                    />

                    <SettingToggle
                      title="Marketing emails"
                      description="Receive marketplace updates, featured cards, promotions, and product news."
                      enabled={marketingEmails}
                      setEnabled={setMarketingEmails}
                    />
                  </div>
                </div>

                <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
                  <h2 className="text-2xl font-semibold">
                    Security
                  </h2>

                  <p className="mt-2 text-sm text-zinc-500">
                    Keep your account protected.
                  </p>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <button className="rounded-2xl border border-zinc-800 bg-black p-5 text-left hover:border-zinc-600">
                      <p className="font-semibold">Change Password</p>
                      <p className="mt-2 text-sm leading-6 text-zinc-500">
                        Password reset flow will be connected next.
                      </p>
                    </button>

                    <button className="rounded-2xl border border-zinc-800 bg-black p-5 text-left hover:border-zinc-600">
                      <p className="font-semibold">Two-Factor Authentication</p>
                      <p className="mt-2 text-sm leading-6 text-zinc-500">
                        Add extra account protection before launch.
                      </p>
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
                  <h2 className="text-2xl font-semibold">
                    Account
                  </h2>

                  <div className="mt-6 space-y-5">
                    <div className="rounded-2xl border border-zinc-900 bg-black p-5">
                      <p className="text-sm text-zinc-500">Email</p>
                      <p className="mt-2 break-all font-medium">{email}</p>
                    </div>

                    <div className="rounded-2xl border border-zinc-900 bg-black p-5">
                      <p className="text-sm text-zinc-500">Account Status</p>
                      <p className="mt-2 font-medium text-green-400">
                        Active
                      </p>
                    </div>

                    <div className="rounded-2xl border border-zinc-900 bg-black p-5">
                      <p className="text-sm text-zinc-500">Seller Level</p>
                      <p className="mt-2 font-medium">
                        Level 1 Collector
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
                  <h2 className="text-2xl font-semibold">
                    Marketplace Rules
                  </h2>

                  <div className="mt-6 space-y-4 text-sm leading-6 text-zinc-500">
                    <p>
                      Users can browse cards without an account.
                    </p>

                    <p>
                      Buying, making offers, messaging sellers, listing cards, and viewing account pages require sign in.
                    </p>

                    <p>
                      Seller stats, fees, verification, rewards, and payout controls should be controlled by GRAIL.
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl border border-red-900/40 bg-red-950/10 p-6">
                  <h2 className="text-2xl font-semibold text-red-300">
                    Danger Zone
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-red-200/70">
                    Account deletion should require confirmation and backend cleanup before launch.
                  </p>

                  <button className="mt-6 w-full rounded-full border border-red-800 px-6 py-3 text-sm font-semibold text-red-300 hover:bg-red-950/40">
                    Request Account Deletion
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </RequireAuth>
  );
}

function SettingToggle({
  title,
  description,
  enabled,
  setEnabled,
}: {
  title: string;
  description: string;
  enabled: boolean;
  setEnabled: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => setEnabled(!enabled)}
      className="flex w-full items-center justify-between gap-5 rounded-2xl border border-zinc-900 bg-black p-5 text-left hover:border-zinc-700"
    >
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          {description}
        </p>
      </div>

      <span
        className={`flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition ${
          enabled ? "bg-white" : "bg-zinc-800"
        }`}
      >
        <span
          className={`h-6 w-6 rounded-full transition ${
            enabled ? "translate-x-6 bg-black" : "translate-x-0 bg-zinc-500"
          }`}
        />
      </span>
    </button>
  );
}