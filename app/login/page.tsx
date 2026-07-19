"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

type IconName = "mail" | "lock" | "eye" | "eyeOff";

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    eye: (
      <>
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    eyeOff: (
      <>
        <path d="m3 3 18 18" />
        <path d="M10.6 6.2A9.8 9.8 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-2.1 2.8" />
        <path d="M6.2 6.2C3.8 7.8 2.5 12 2.5 12s3.5 6 9.5 6a9.6 9.6 0 0 0 3-.5" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7"
    >
      {paths[name]}
    </svg>
  );
}

function LoginFallback() {
  return (
    <main className="min-h-[100svh] bg-[#020304] px-6 text-white ring-1 ring-inset ring-[#1c1e20]">
      <section className="mx-auto w-full max-w-[520px] pb-16 pt-14 text-center sm:pt-[70px]">
        <p className="text-[24px] font-semibold tracking-[0.43em] sm:text-[28px]">
          GRAIL
        </p>
        <h1 className="mt-12 text-[34px] font-semibold tracking-[-0.02em] sm:mt-[48px] sm:text-[42px]">
          Loading sign in.
        </h1>
      </section>
    </main>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialVerificationEmail =
    searchParams.get("verifyEmail")?.trim().toLowerCase() || "";
  const initialMessage = initialVerificationEmail
    ? "Please verify your email before continuing."
    : searchParams.get("verified")
      ? "Email verified. Sign in to continue."
      : "";

  const [email, setEmail] = useState(initialVerificationEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState(initialMessage);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState(
    initialVerificationEmail,
  );
  const [resendMessage, setResendMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const field =
    "grail-auth-input h-16 w-full border-0 bg-transparent pl-16 pr-5 text-base text-white outline-none placeholder:text-[#98999c] sm:h-[82px] sm:pl-16 sm:pr-6 sm:text-[19px]";

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!email.trim() || !password) {
      setMessage("Please enter your email and password.");
      return;
    }

    try {
      setIsSubmitting(true);
      setMessage("Signing in...");

      const cleanEmail = email.trim().toLowerCase();
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        if (error.message.toLowerCase().includes("invalid login")) {
          setMessage("Incorrect email or password.");
          return;
        }

        if (error.message.toLowerCase().includes("email not confirmed")) {
          setPendingVerificationEmail(cleanEmail);
          setResendMessage("");
          setMessage("Please verify your email before continuing.");
          return;
        }

        throw error;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && !user.email_confirmed_at) {
        await supabase.auth.signOut();
        setPendingVerificationEmail(user.email || cleanEmail);
        setResendMessage("");
        setMessage("Please verify your email before continuing.");
        return;
      }

      setMessage("Signed in successfully.");

      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get("redirectTo") || "/";
      const safeRedirect =
        redirectTo.startsWith("/") && !redirectTo.startsWith("//")
          ? redirectTo
          : "/";

      router.push(safeRedirect);
      router.refresh();
    } catch (error: unknown) {
      console.error("Login error:", error);

      if (
        typeof error === "object" &&
        error !== null &&
        "message" in error
      ) {
        setMessage(String(error.message));
      } else {
        setMessage("Sign in failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendVerification() {
    const cleanEmail = (pendingVerificationEmail || email).trim().toLowerCase();

    if (!cleanEmail) {
      setResendMessage("Enter your email to resend verification.");
      return;
    }

    try {
      setIsResending(true);
      setResendMessage("Sending verification email...");

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: cleanEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/login?verified=1`,
        },
      });

      if (error) throw error;

      setPendingVerificationEmail(cleanEmail);
      setResendMessage("Verification email sent. Check your inbox.");
    } catch (error: unknown) {
      console.error("Verification resend error:", error);

      if (typeof error === "object" && error !== null && "message" in error) {
        setResendMessage(String(error.message));
      } else {
        setResendMessage("Verification email could not be resent. Please try again.");
      }
    } finally {
      setIsResending(false);
    }
  }

  return (
    <main className="min-h-[100svh] bg-[#020304] px-6 text-white ring-1 ring-inset ring-[#1c1e20]">
      <style jsx global>{`
        .grail-auth-input:-webkit-autofill,
        .grail-auth-input:-webkit-autofill:hover,
        .grail-auth-input:-webkit-autofill:focus {
          -webkit-text-fill-color: white;
          -webkit-box-shadow: 0 0 0 1000px #000 inset;
          box-shadow: 0 0 0 1000px #000 inset;
          caret-color: white;
        }
      `}</style>

      <section className="mx-auto w-full max-w-[520px] pb-16 pt-14 sm:pt-[70px]">
        <header className="text-center">
          <Link
  href="/"
  className="inline-block text-[24px] font-semibold tracking-[0.43em] transition-opacity hover:opacity-70 sm:text-[28px]"
>
  GRAIL
</Link>

          <h1 className="mt-12 text-[34px] font-semibold tracking-[-0.02em] sm:mt-[48px] sm:text-[42px]">
            Welcome Back
          </h1>

          <p className="mt-4 text-[17px] text-[#999a9d] sm:mt-5 sm:text-[21px]">
            Sign in to continue.
          </p>
        </header>

        <form
          onSubmit={handleLogin}
          className="mt-10 space-y-4 sm:mt-[42px] sm:space-y-5"
        >
          <label className="relative block rounded-[16px] border border-[#232527] bg-black">
            <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[#a3a4a7] sm:left-6">
              <Icon name="mail" />
            </span>

            <input
              className={field}
              type="email"
              autoComplete="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="relative block rounded-[16px] border border-[#232527] bg-black">
            <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[#a3a4a7] sm:left-6">
              <Icon name="lock" />
            </span>

            <input
              className={`${field} pr-16 sm:pr-20`}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-[#a3a4a7] hover:text-white sm:right-6"
            >
              <Icon name={showPassword ? "eye" : "eyeOff"} />
            </button>
          </label>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() =>
                setMessage("Password reset will be added next.")
              }
              className="text-sm text-[#a5a6a9] underline underline-offset-4 hover:text-white sm:text-base"
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-7 h-[68px] w-full rounded-[16px] border-2 border-[#e2e2e2] bg-transparent text-[20px] font-semibold transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50 sm:mt-9 sm:h-[82px] sm:text-[22px]"
          >
            {isSubmitting ? "Signing In..." : "Sign In"}
          </button>

          {message && (
            <p
              aria-live="polite"
              className="text-center text-sm text-[#a5a6a9] sm:text-base"
            >
              {message}
            </p>
          )}

          {pendingVerificationEmail ? (
            <div className="rounded-[18px] border border-[#232527] bg-black/80 p-5 text-center">
              <p className="text-sm leading-6 text-[#a5a6a9]">
                Verification is required for{" "}
                <span className="font-semibold text-white">
                  {pendingVerificationEmail}
                </span>
                . Use the link in your email to activate your GRAIL account.
              </p>
              <button
                type="button"
                disabled={isResending}
                onClick={handleResendVerification}
                className="mt-4 h-12 w-full rounded-[14px] border border-[#e2e2e2] text-sm font-semibold text-white transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isResending ? "Sending..." : "Resend Verification Email"}
              </button>
              {resendMessage ? (
                <p aria-live="polite" className="mt-3 text-sm text-[#a5a6a9]">
                  {resendMessage}
                </p>
              ) : null}
            </div>
          ) : null}

          <p className="pt-7 text-center text-[16px] text-[#98999c] sm:pt-[30px] sm:text-[19px]">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold text-white">
              Create Account
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
}
