"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;

      if (!user) {
        const redirectTo = encodeURIComponent(pathname || "/");
        router.replace(`/login?redirectTo=${redirectTo}`);
        return;
      }

      if (!user.email_confirmed_at) {
        await supabase.auth.signOut();
        const redirectTo = encodeURIComponent(pathname || "/");
        const verifyEmail = encodeURIComponent(user.email || "");
        router.replace(`/login?redirectTo=${redirectTo}&verifyEmail=${verifyEmail}`);
        return;
      }

      setAllowed(true);
      setChecking(false);
    }

    checkUser();

    return () => {
      active = false;
    };
  }, [pathname, router]);

  if (checking || !allowed) {
    return (
      <main className="min-h-screen bg-black px-6 py-24 text-center text-white">
        <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">
          GRAIL
        </p>

        <h1 className="mt-8 text-3xl font-semibold">
          Checking account...
        </h1>
      </main>
    );
  }

  return <>{children}</>;
}
