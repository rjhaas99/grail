"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Header from "../components/Header";
import { getPublicCollectorHref } from "../lib/publicCollectorLinks";

type ProfileRow = {
  id: string;
  username: string | null;
};

function getCollectionHref(userId: string, username?: string | null) {
  return getPublicCollectorHref({ id: userId, username }, userId);
}

export default function MyCollectionPage() {
  const router = useRouter();
  const [targetHref, setTargetHref] = useState("");
  const [status, setStatus] = useState<"loading" | "signed-out" | "ready">("loading");

  useEffect(() => {
    let isMounted = true;

    async function openMyCollection() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user.id) {
        if (isMounted) {
          setStatus("signed-out");
        }
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("id", session.user.id)
        .maybeSingle();

      if (error) {
        console.warn("My Collection profile lookup skipped:", error);
      }

      const nextHref = getCollectionHref(
        session.user.id,
        (profile as ProfileRow | null)?.username,
      );

      if (isMounted) {
        setTargetHref(nextHref);
        setStatus("ready");
        router.replace(nextHref);
      }
    }

    openMyCollection();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <main className="my-collection-page">
      <style>{pageStyles}</style>
      <div className="my-collection-shell">
        <Header />

        <section className="my-collection-gateway panel" aria-live="polite">
          <span>My Collection</span>
          {status === "signed-out" ? (
            <>
              <h1>Sign in to open your collection.</h1>
              <p>
                My Collection is your collector home on GRAIL. Once signed in,
                this page opens your public collection showcase with owner tools.
              </p>
              <div className="gateway-actions">
                <Link href="/login">Sign In</Link>
                <Link href="/signup">Create Account</Link>
              </div>
            </>
          ) : (
            <>
              <h1>Opening your collection.</h1>
              <p>
                Your collection now uses the same premium showcase that visitors
                see, with owner controls added when you are signed in.
              </p>
              {targetHref ? (
                <div className="gateway-actions">
                  <Link href={targetHref}>Open My Collection</Link>
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

const pageStyles = `
  .my-collection-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at 50% -120px, rgba(201,205,211,0.08), transparent 32%),
      linear-gradient(180deg, #000 0%, #030304 58%, #000 100%);
    color: #fafafa;
    font-family: Arial, Helvetica, sans-serif;
  }

  .my-collection-shell {
    width: min(1240px, calc(100vw - 32px));
    margin: 0 auto;
    padding: 8px 0 38px;
  }

  .panel {
    border: 1px solid #1d1d22;
    border-radius: 12px;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.006)),
      rgba(5,5,6,0.92);
    box-shadow: 0 18px 44px rgba(0,0,0,0.28);
  }

  .my-collection-gateway {
    margin-top: 24px;
    min-height: 340px;
    padding: clamp(24px, 5vw, 52px);
    display: grid;
    align-content: center;
    background:
      radial-gradient(circle at 18% 10%, rgba(231,222,208,0.16), transparent 28%),
      radial-gradient(circle at 82% 0%, rgba(185,146,74,0.10), transparent 24%),
      linear-gradient(135deg, #111112, #050506 54%, #0c0c0e);
    overflow: hidden;
  }

  .my-collection-gateway span {
    color: #C9CDD3;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .my-collection-gateway h1 {
    max-width: 760px;
    margin: 12px 0 0;
    color: #fff;
    font-size: clamp(42px, 7vw, 84px);
    line-height: 0.96;
    font-weight: 950;
    letter-spacing: 0;
  }

  .my-collection-gateway p {
    max-width: 660px;
    margin: 18px 0 0;
    color: #D8D2C8;
    font-size: 15px;
    line-height: 23px;
    font-weight: 800;
  }

  .gateway-actions {
    margin-top: 22px;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .gateway-actions a {
    min-height: 40px;
    border: 1px solid rgba(231,222,208,0.28);
    border-radius: 10px;
    background: rgba(231,222,208,0.055);
    color: #fff;
    padding: 0 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    font-size: 12px;
    line-height: 16px;
    font-weight: 900;
  }

  .gateway-actions a:hover,
  .gateway-actions a:focus-visible {
    border-color: rgba(231,222,208,0.62);
    background: rgba(231,222,208,0.11);
    outline: none;
  }

  @media (max-width: 680px) {
    .my-collection-shell {
      width: calc(100vw - 22px);
    }
  }
`;
