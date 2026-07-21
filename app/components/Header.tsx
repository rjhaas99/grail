"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { calculateProgression, type ProgressionSummary } from "../lib/progression";

type Profile = {
  full_name: string | null;
  username: string | null;
};

const mainMenuItems = [
  { label: "Browse Cards", href: "/browse" },
  { label: "Sell a Card", href: "/list" },
  { label: "My Collection", href: "/portfolio" },
  { label: "Offers", href: "/offers" },
  { label: "Messages", href: "/messages" },
  { label: "Watched Cards", href: "/watched" },
  { label: "Seller Dashboard", href: "/seller-dashboard" },
];

const accountItems = [
  { label: "Profile", href: "/profile" },
  { label: "Notifications", href: "/notifications" },
  { label: "Wallet", href: "/wallet" },
  { label: "GRAIL Pass", href: "/grail-pass" },
  { label: "Billing & Payouts", href: "/billing-payouts" },
  { label: "Orders", href: "/orders" },
  { label: "Rewards", href: "/rewards" },
  { label: "Settings", href: "/settings" },
];

export default function Header() {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const menuCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accountCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [progression, setProgression] = useState<ProgressionSummary>(calculateProgression(0));
  const [searchQuery, setSearchQuery] = useState("");

  const accountName =
    profile?.full_name ||
    profile?.username ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Account";

  const accountInitial = accountName.trim().charAt(0).toUpperCase() || "G";
  const dropdownLinkStyle = {
    display: "block",
    border: "1px solid transparent",
    borderRadius: "10px",
    padding: "8px 11px",
    color: "#e4e4e7",
    textDecoration: "none",
    fontSize: "13px",
    lineHeight: "17px",
    fontWeight: 800,
    transition:
      "background 160ms ease, border-color 160ms ease, color 160ms ease, transform 160ms ease",
    boxSizing: "border-box" as const,
  };

  function clearMenuCloseTimer() {
    if (menuCloseTimer.current) {
      clearTimeout(menuCloseTimer.current);
      menuCloseTimer.current = null;
    }
  }

  function clearAccountCloseTimer() {
    if (accountCloseTimer.current) {
      clearTimeout(accountCloseTimer.current);
      accountCloseTimer.current = null;
    }
  }

  function closeMenus() {
    clearMenuCloseTimer();
    clearAccountCloseTimer();
    setMenuOpen(false);
    setAccountOpen(false);
  }

  function openMenuFromHover() {
    clearMenuCloseTimer();
    setAccountOpen(false);
    setMenuOpen(true);
  }

  function closeMenuAfterHover() {
    clearMenuCloseTimer();
    menuCloseTimer.current = setTimeout(() => {
      setMenuOpen(false);
      menuCloseTimer.current = null;
    }, 120);
  }

  function openAccountFromHover() {
    clearAccountCloseTimer();
    setMenuOpen(false);
    setAccountOpen(true);
  }

  function closeAccountAfterHover() {
    clearAccountCloseTimer();
    accountCloseTimer.current = setTimeout(() => {
      setAccountOpen(false);
      accountCloseTimer.current = null;
    }, 120);
  }

  async function getProfile(nextUser: User | null) {
    if (!nextUser) {
      return null;
    }

    const { data } = await supabase
      .from("profiles")
      .select("full_name, username")
      .eq("id", nextUser.id)
      .maybeSingle();

    return data ?? null;
  }

  async function getProgression(accessToken?: string | null) {
    if (!accessToken) {
      return calculateProgression(0);
    }

    try {
      const response = await fetch("/api/progression", {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });
      const payload = (await response.json()) as {
        progression?: ProgressionSummary;
      };

      return payload.progression ?? calculateProgression(0);
    } catch (error) {
      console.warn("Header progression load skipped:", error);
      return calculateProgression(0);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setProgression(calculateProgression(0));
    closeMenus();
    router.refresh();
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchQuery.trim();

    closeMenus();

    if (!query) {
      router.push("/browse");
      return;
    }

    router.push(`/browse?search=${encodeURIComponent(query)}`);
  }

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const nextUser = session?.user?.email_confirmed_at ? session.user : null;
      if (session?.user && !session.user.email_confirmed_at) {
        await supabase.auth.signOut();
      }
      const [nextProfile, nextProgression] = await Promise.all([
        getProfile(nextUser),
        getProgression(nextUser ? session?.access_token : undefined),
      ]);

      if (!active) {
        return;
      }

      setUser(nextUser);
      setProfile(nextProfile);
      setProgression(nextProgression);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const nextUser = session?.user?.email_confirmed_at ? session.user : null;
      if (session?.user && !session.user.email_confirmed_at) {
        await supabase.auth.signOut();
      }
      const [nextProfile, nextProgression] = await Promise.all([
        getProfile(nextUser),
        getProgression(nextUser ? session?.access_token : undefined),
      ]);
      setUser(nextUser);
      setProfile(nextProfile);
      setProgression(nextProgression);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const clickedMenu = menuRef.current?.contains(target) ?? false;
      const clickedAccount = accountRef.current?.contains(target) ?? false;

      if (!clickedMenu && !clickedAccount) {
        clearMenuCloseTimer();
        clearAccountCloseTimer();
        setMenuOpen(false);
        setAccountOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    return () => {
      clearMenuCloseTimer();
      clearAccountCloseTimer();
    };
  }, []);

  return (
    <>
      <style>
        {`
          .grail-dropdown-link:hover {
            background: rgba(231, 222, 208, 0.075);
            border-color: rgba(231, 222, 208, 0.22);
            color: #ffffff !important;
            transform: translateX(1px);
          }

          .grail-dropdown-signout:hover {
            background: rgba(248, 113, 113, 0.085) !important;
            border-color: rgba(248, 113, 113, 0.24) !important;
          }

          .grail-header-search-input::placeholder {
            color: #7b7b85;
          }

          @media (max-width: 900px) {
            .grail-header {
              height: auto !important;
              grid-template-columns: 1fr !important;
              gap: 10px !important;
              padding: 10px 0 !important;
            }

            .grail-header-brand,
            .grail-header-account {
              width: 100% !important;
            }

            .grail-header-account {
              justify-content: flex-start !important;
              flex-wrap: wrap !important;
            }

            .grail-header-search {
              width: 100% !important;
              justify-self: stretch !important;
              order: 3;
            }
          }

          @media (max-width: 520px) {
            .grail-header-auth-link {
              min-width: auto !important;
              padding: 0 14px !important;
            }
          }
        `}
      </style>

      <header
      className="grail-header"
      style={{
        height: "54px",
        width: "min(1240px, calc(100vw - 32px))",
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "230px minmax(220px, 1fr) 300px",
        alignItems: "center",
        borderBottom: "1px solid #17171c",
        background: "#000",
        color: "#fafafa",
        fontFamily: "Arial, Helvetica, sans-serif",
        position: "relative",
        zIndex: 1000,
      }}
    >
      <div
        className="grail-header-brand"
        style={{ display: "flex", alignItems: "center", gap: "16px" }}
      >
        <div
          ref={menuRef}
          onMouseEnter={openMenuFromHover}
          onMouseLeave={closeMenuAfterHover}
          style={{ position: "relative" }}
        >
          <button
            type="button"
            aria-label="Open navigation"
            aria-expanded={menuOpen}
            onClick={() => {
              setAccountOpen(false);
              setMenuOpen((current) => !current);
            }}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "999px",
              border: menuOpen
                ? "1px solid rgba(231,222,208,0.52)"
                : "1px solid #27272a",
              background: menuOpen ? "rgba(231,222,208,0.06)" : "transparent",
              display: "grid",
              gap: "4px",
              placeContent: "center",
              padding: 0,
              cursor: "pointer",
            }}
          >
            {[0, 1, 2].map((line) => (
              <span
                key={line}
                style={{
                  display: "block",
                  width: "16px",
                  height: "1px",
                  background: "#fff",
                }}
              />
            ))}
          </button>

          {menuOpen && (
            <div
              style={{
                position: "absolute",
                left: "-2px",
                top: "48px",
                width: "286px",
                border: "1px solid rgba(231,222,208,0.18)",
                borderRadius: "14px",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.018)), rgba(5,5,6,0.9)",
                boxShadow:
                  "0 24px 54px rgba(0,0,0,0.58), inset 0 1px 0 rgba(231,222,208,0.08)",
                padding: "10px",
                zIndex: 3000,
                backdropFilter: "blur(16px)",
              }}
            >
              <p
                style={{
                  margin: "4px 12px 8px",
                  color: "#8d949d",
                  fontSize: "10px",
                  lineHeight: "12px",
                  fontWeight: 900,
                  letterSpacing: "0.3em",
                }}
              >
                MENU
              </p>

              {mainMenuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenus}
                  className="grail-dropdown-link"
                  style={dropdownLinkStyle}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <Link
          href="/"
          onClick={closeMenus}
          style={{
            color: "#fff",
            textDecoration: "none",
            fontSize: "24px",
            lineHeight: "28px",
            fontWeight: 600,
            letterSpacing: "0.35em",
          }}
        >
          GRAIL
        </Link>
      </div>

      <form
        className="grail-header-search"
        onSubmit={handleSearchSubmit}
        style={{
          width: "min(590px, 100%)",
          height: "34px",
          justifySelf: "center",
          border: "1px solid #17171c",
          borderRadius: "10px",
          background: "#08080a",
          display: "flex",
          alignItems: "center",
          gap: "11px",
          padding: "0 14px",
          color: "#7b7b85",
          fontSize: "13px",
          boxSizing: "border-box",
        }}
      >
        <button
          type="submit"
          aria-label="Search"
          style={{
            width: "12px",
            height: "12px",
            minWidth: "12px",
            minHeight: "12px",
            maxWidth: "12px",
            maxHeight: "12px",
            border: "2px solid #7b7b85",
            borderRadius: "999px",
            display: "inline-block",
            boxSizing: "border-box",
            background: "transparent",
            padding: 0,
            boxShadow: "none",
            appearance: "none",
            cursor: "pointer",
            flex: "0 0 12px",
          }}
        />
        <input
          className="grail-header-search-input"
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search cards, sellers, collections..."
          aria-label="Search cards, sellers, collections"
          style={{
            width: "100%",
            minWidth: 0,
            border: 0,
            outline: 0,
            background: "transparent",
            color: "#f4f4f5",
            padding: 0,
            boxShadow: "none",
            boxSizing: "border-box",
            font: "inherit",
            fontSize: "13px",
            fontWeight: 800,
          }}
        />
      </form>

      <nav
        className="grail-header-account"
        aria-label="Account navigation"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "12px",
        }}
      >
        {!user ? (
          <>
            <Link
              href="/login"
              onClick={closeMenus}
              className="grail-header-auth-link"
              style={{
                height: "38px",
                minWidth: "86px",
                border: "1px solid #27272a",
                borderRadius: "999px",
                color: "#fff",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                fontWeight: 600,
                background: "#050506",
              }}
            >
              Sign In
            </Link>

            <Link
              href="/signup"
              onClick={closeMenus}
              className="grail-header-auth-link"
              style={{
                height: "38px",
                minWidth: "132px",
                borderRadius: "999px",
                color: "#111",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                fontWeight: 600,
                background: "#f4f4f5",
              }}
            >
              Create Account
            </Link>
          </>
        ) : (
          <div
            ref={accountRef}
            onMouseEnter={openAccountFromHover}
            onMouseLeave={closeAccountAfterHover}
            style={{ position: "relative" }}
          >
            <button
              type="button"
              aria-label="Open account menu"
              aria-expanded={accountOpen}
              onClick={() => {
                setMenuOpen(false);
                setAccountOpen((current) => !current);
              }}
              style={{
                height: "38px",
                maxWidth: "210px",
                border: accountOpen
                  ? "1px solid rgba(231,222,208,0.52)"
                  : "1px solid rgba(201,205,211,0.22)",
                borderRadius: "999px",
                background: "rgba(9,9,11,0.82)",
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                gap: "9px",
                padding: "0 12px 0 7px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 800,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "999px",
                  background: "#E7DED0",
                  color: "#111",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 900,
                  flexShrink: 0,
                }}
              >
                {accountInitial}
              </span>
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {accountName}
              </span>
              <span
                title={`Level ${progression.level} ${progression.title}`}
                style={{
                  border: `1px solid ${progression.border}`,
                  borderRadius: "999px",
                  background: "rgba(231,222,208,0.055)",
                  color: progression.accent,
                  minWidth: "26px",
                  height: "20px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "10px",
                  fontWeight: 900,
                  flexShrink: 0,
                }}
              >
                L{progression.level}
              </span>
            </button>

            {accountOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "48px",
                  width: "286px",
                  border: "1px solid rgba(231,222,208,0.18)",
                  borderRadius: "14px",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.018)), rgba(5,5,6,0.9)",
                  boxShadow:
                    "0 24px 54px rgba(0,0,0,0.58), inset 0 1px 0 rgba(231,222,208,0.08)",
                  padding: "10px",
                  zIndex: 3000,
                  backdropFilter: "blur(16px)",
                }}
              >
                <div style={{ padding: "9px 12px 10px" }}>
                  <p
                    style={{
                      margin: 0,
                      color: "#fff",
                      fontSize: "14px",
                      lineHeight: "18px",
                      fontWeight: 900,
                    }}
                  >
                    {accountName}
                  </p>
                  <p
                    style={{
                      margin: "3px 0 0",
                      color: "#8d949d",
                      fontSize: "12px",
                      lineHeight: "15px",
                      fontWeight: 700,
                    }}
                  >
                    Level {progression.level} {progression.title}
                  </p>
                  <div
                    style={{
                      marginTop: "9px",
                      height: "6px",
                      borderRadius: "999px",
                      background: "rgba(201,205,211,0.12)",
                      overflow: "hidden",
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        width: `${progression.rankProgressPercentage}%`,
                        height: "100%",
                        borderRadius: "inherit",
                        background: `linear-gradient(90deg, ${progression.accent}, #E7DED0)`,
                      }}
                    />
                  </div>
                  <Link
                    href="/rewards#xp-guide"
                    onClick={closeMenus}
                    style={{
                      marginTop: "9px",
                      color: "#E7DED0",
                      display: "inline-flex",
                      fontSize: "11px",
                      lineHeight: "14px",
                      fontWeight: 900,
                      textDecoration: "none",
                    }}
                  >
                    How XP works
                  </Link>
                </div>

                <div
                  style={{
                    height: "1px",
                    background: "rgba(201,205,211,0.14)",
                    margin: "5px 0",
                  }}
                />

                {accountItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenus}
                    className="grail-dropdown-link"
                    style={dropdownLinkStyle}
                  >
                    {item.label}
                  </Link>
                ))}

                <div
                  style={{
                    height: "1px",
                    background: "rgba(201,205,211,0.14)",
                    margin: "5px 0",
                  }}
                />

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="grail-dropdown-signout"
                  style={{
                    width: "100%",
                    border: "1px solid transparent",
                    borderRadius: "10px",
                    background: "transparent",
                    padding: "8px 11px",
                    color: "#f87171",
                    textAlign: "left",
                    fontSize: "13px",
                    lineHeight: "17px",
                    fontWeight: 900,
                    cursor: "pointer",
                    transition:
                      "background 160ms ease, border-color 160ms ease, color 160ms ease",
                    boxSizing: "border-box",
                  }}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </nav>
      </header>
    </>
  );
}
