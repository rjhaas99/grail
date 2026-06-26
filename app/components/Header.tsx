"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

type Profile = {
  full_name: string | null;
  username: string | null;
  seller_level: string | null;
};

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();

  const menuRef = useRef<HTMLDivElement | null>(null);
  const accountRef = useRef<HTMLDivElement | null>(null);

  const [mobileMenu, setMobileMenu] = useState(false);
  const [mobileAccount, setMobileAccount] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const menuItem =
    "block w-full rounded-xl px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-900";

  const accountName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Account";

  const sellerLevel = profile?.seller_level || "Level 1 Collector";

  function closeAllMenus() {
    setMenuOpen(false);
    setAccountOpen(false);
    setMobileMenu(false);
    setMobileAccount(false);
  }

  async function loadUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setUser(user);

    if (!user) {
      setProfile(null);
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("full_name, username, seller_level")
      .eq("id", user.id)
      .maybeSingle();

    if (data) {
      setProfile(data);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();

    setUser(null);
    setProfile(null);
    closeAllMenus();

    router.push("/login");
    router.refresh();
  }

  useEffect(() => {
    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    closeAllMenus();
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        accountRef.current &&
        !accountRef.current.contains(target)
      ) {
        setMenuOpen(false);
        setAccountOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <>
      <header className="mx-auto flex max-w-7xl items-center justify-between px-8 py-6">
        <div className="flex items-center gap-4">
          <div ref={menuRef} className="relative hidden md:block">
            <button
              onClick={() => {
                setAccountOpen(false);
                setMenuOpen((current) => !current);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 hover:border-zinc-600"
            >
              <span className="space-y-1">
                <span className="block h-px w-4 bg-white" />
                <span className="block h-px w-4 bg-white" />
                <span className="block h-px w-4 bg-white" />
              </span>
            </button>

            {menuOpen && (
              <div className="absolute left-0 z-50 mt-3 w-64 rounded-2xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl">
                <div className="px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                    Menu
                  </p>
                </div>

                <Link onClick={closeAllMenus} href="/browse" className={menuItem}>
                  Browse Cards
                </Link>
                <Link onClick={closeAllMenus} href="/list" className={menuItem}>
                  Sell a Card
                </Link>
                <Link onClick={closeAllMenus} href="/portfolio" className={menuItem}>
                  Portfolio
                </Link>
                <Link onClick={closeAllMenus} href="/offers" className={menuItem}>
                  Offers
                </Link>
                <Link onClick={closeAllMenus} href="/messages" className={menuItem}>
                  Messages
                </Link>
                <Link onClick={closeAllMenus} href="/dashboard" className={menuItem}>
                  Seller Dashboard
                </Link>
              </div>
            )}
          </div>

          <button
            onClick={() => setMobileMenu(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 md:hidden"
          >
            <span className="space-y-1">
              <span className="block h-px w-4 bg-white" />
              <span className="block h-px w-4 bg-white" />
              <span className="block h-px w-4 bg-white" />
            </span>
          </button>

          <Link
            onClick={closeAllMenus}
            href="/"
            className="text-2xl font-semibold tracking-[0.35em] transition-opacity hover:opacity-70"
          >
            GRAIL
          </Link>
        </div>

        <div className="hidden md:block">
          {!user ? (
            <div className="flex items-center gap-3">
              <Link
                onClick={closeAllMenus}
                href="/login"
                className="rounded-full border border-zinc-800 px-5 py-2 text-sm font-semibold text-white hover:border-zinc-600"
              >
                Sign In
              </Link>

              <Link
                onClick={closeAllMenus}
                href="/signup"
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200"
              >
                Create Account
              </Link>
            </div>
          ) : (
            <div ref={accountRef} className="relative">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setAccountOpen((current) => !current);
                }}
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200"
              >
                {accountName} ▾
              </button>

              {accountOpen && (
                <div className="absolute right-0 z-50 mt-3 w-64 rounded-2xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl">
                  <div className="px-3 py-3">
                    <p className="text-base font-semibold text-white">
                      {accountName}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {sellerLevel}
                    </p>
                  </div>

                  <div className="my-1 border-t border-zinc-800" />

                  <Link onClick={closeAllMenus} href="/profile" className={menuItem}>
                    Profile
                  </Link>
                  <Link onClick={closeAllMenus} href="/notifications" className={menuItem}>
                    Notifications
                  </Link>
                  <Link onClick={closeAllMenus} href="/billing" className={menuItem}>
                    Billing & Payouts
                  </Link>
                  <Link onClick={closeAllMenus} href="/orders" className={menuItem}>
                    Orders
                  </Link>
                  <Link onClick={closeAllMenus} href="/rewards" className={menuItem}>
                    Seller Rewards
                  </Link>
                  <Link onClick={closeAllMenus} href="/settings" className={menuItem}>
                    Settings
                  </Link>

                  <div className="my-1 border-t border-zinc-800" />

                  <button
                    onClick={handleSignOut}
                    className="block w-full rounded-xl px-3 py-2 text-left text-sm text-red-400 hover:bg-zinc-900"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {!user ? (
          <Link
            onClick={closeAllMenus}
            href="/login"
            className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black md:hidden"
          >
            Sign In
          </Link>
        ) : (
          <button
            onClick={() => setMobileAccount(true)}
            className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black md:hidden"
          >
            Account
          </button>
        )}
      </header>

      {mobileMenu && (
        <div className="fixed inset-0 z-[999] bg-black p-8 text-white md:hidden">
          <div className="flex items-center justify-between">
            <p className="text-2xl font-semibold tracking-[0.35em]">GRAIL</p>

            <button
              onClick={() => setMobileMenu(false)}
              className="rounded-full border border-zinc-800 px-4 py-2"
            >
              Close
            </button>
          </div>

          <div className="mt-10 space-y-3">
            <Link onClick={closeAllMenus} href="/browse" className={menuItem}>
              Browse Cards
            </Link>
            <Link onClick={closeAllMenus} href="/list" className={menuItem}>
              Sell a Card
            </Link>
            <Link onClick={closeAllMenus} href="/portfolio" className={menuItem}>
              Portfolio
            </Link>
            <Link onClick={closeAllMenus} href="/offers" className={menuItem}>
              Offers
            </Link>
            <Link onClick={closeAllMenus} href="/messages" className={menuItem}>
              Messages
            </Link>
            <Link onClick={closeAllMenus} href="/dashboard" className={menuItem}>
              Seller Dashboard
            </Link>
          </div>
        </div>
      )}

      {mobileAccount && user && (
        <div className="fixed inset-0 z-[999] bg-black p-8 text-white md:hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-semibold">{accountName}</p>
              <p className="text-sm text-zinc-500">{sellerLevel}</p>
            </div>

            <button
              onClick={() => setMobileAccount(false)}
              className="rounded-full border border-zinc-800 px-4 py-2"
            >
              Close
            </button>
          </div>

          <div className="mt-10 space-y-3">
            <Link onClick={closeAllMenus} href="/profile" className={menuItem}>
              Profile
            </Link>
            <Link onClick={closeAllMenus} href="/notifications" className={menuItem}>
              Notifications
            </Link>
            <Link onClick={closeAllMenus} href="/billing" className={menuItem}>
              Billing & Payouts
            </Link>
            <Link onClick={closeAllMenus} href="/orders" className={menuItem}>
              Orders
            </Link>
            <Link onClick={closeAllMenus} href="/rewards" className={menuItem}>
              Seller Rewards
            </Link>
            <Link onClick={closeAllMenus} href="/settings" className={menuItem}>
              Settings
            </Link>

            <div className="my-4 border-t border-zinc-800" />

            <button
              onClick={handleSignOut}
              className="block w-full rounded-xl px-3 py-2 text-left text-sm text-red-400 hover:bg-zinc-900"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </>
  );
}