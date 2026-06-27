"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { supabase } from "../../lib/supabase";

type IconName =
  | "user"
  | "mail"
  | "lock"
  | "eye"
  | "eyeOff"
  | "calendar";

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    user: (
      <>
        <circle cx="12" cy="7" r="4" />
        <path d="M5.5 21v-1.5a6.5 6.5 0 0 1 13 0V21" />
      </>
    ),
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
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 3v4M17 3v4M3 10h18" />
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
      className="h-7 w-7 sm:h-8 sm:w-8"
    >
      {paths[name]}
    </svg>
  );
}

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const field =
    "h-16 w-full border-0 bg-transparent pl-16 pr-5 text-base text-white outline-none placeholder:text-[#98999c] sm:h-[82px] sm:pl-16 sm:pr-6 sm:text-[19px]";

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!fullName || !username || !email || !password || !birthdate) {
      setMessage("Please fill out every field.");
      return;
    }

    if (!termsAccepted) {
      setMessage("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }

    const birth = new Date(`${birthdate}T00:00:00`);
    const today = new Date();

    let age = today.getFullYear() - birth.getFullYear();
    const monthDifference = today.getMonth() - birth.getMonth();

    if (
      monthDifference < 0 ||
      (monthDifference === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }

    if (age < 18) {
      setMessage("You must be at least 18 years old.");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();

    try {
      setIsSubmitting(true);
      setMessage("Creating account...");

      const { data: existingUsername, error: usernameError } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", cleanUsername)
        .maybeSingle();

      if (usernameError) throw usernameError;

      if (existingUsername) {
        setMessage("That username is already taken.");
        return;
      }

      const { error } = await supabase.auth.signUp({
  email: cleanEmail,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/login`,
    data: {
      full_name: fullName.trim(),
      username: cleanUsername,
      birthdate,
    },
  },
});

      if (error) throw error;

      

      setMessage("Account created. Check your email to confirm.");
    } catch (error: unknown) {
  console.error("Signup error:", error);

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error
  ) {
    setMessage(String(error.message));
  } else {
    setMessage("Account creation failed. Please try again.");
  }
} finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-[100svh] bg-[#020304] px-6 text-white ring-1 ring-inset ring-[#1c1e20]">
      <section className="mx-auto w-full max-w-[520px] pb-16 pt-14 sm:pt-[70px]">
        <header className="text-center">
          <p className="text-[24px] font-semibold tracking-[0.43em] sm:text-[34px]">
            GRAIL
          </p>

          <h1 className="mt-16 text-[34px] font-semibold tracking-[-0.02em] sm:mt-[48px] sm:text-[42px]">
            Welcome to GRAIL
          </h1>

          <p className="mt-4 text-[17px] text-[#999a9d] sm:mt-7 sm:text-[25px]">
            Create an account to continue.
          </p>
        </header>

        <form
          onSubmit={handleSignup}
          className="mt-10 space-y-4 sm:mt-[42px] sm:space-y-5"
        >
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <label className="relative rounded-[16px] border border-[#232527] bg-black">
              <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[#a3a4a7] sm:left-7">
                <Icon name="user" />
              </span>

              <input
                className={field}
                type="text"
                autoComplete="name"
                placeholder="Full Name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </label>

            <label className="relative rounded-[16px] border border-[#232527] bg-black">
              <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[#a3a4a7] sm:left-7">
                <Icon name="user" />
              </span>

              <input
                className={field}
                type="text"
                autoComplete="username"
                placeholder="Username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>
          </div>

          <label className="relative block rounded-[16px] border border-[#232527] bg-black">
            <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[#a3a4a7] sm:left-7">
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
            <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[#a3a4a7] sm:left-7">
              <Icon name="lock" />
            </span>

            <input
              className={`${field} pr-16 sm:pr-20`}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-[#a3a4a7] hover:text-white sm:right-7"
            >
              <Icon name={showPassword ? "eye" : "eyeOff"} />
            </button>
          </label>

          <div className="relative block h-16 rounded-[16px] border border-[#232527] bg-black sm:h-[82px]">
  <span className="pointer-events-none absolute left-5 top-1/2 z-10 -translate-y-1/2 text-[#a3a4a7] sm:left-7">
    <Icon name="calendar" />
  </span>

  <input
    type="date"
    aria-label="Birthdate"
    value={birthdate}
    onChange={(event) => setBirthdate(event.target.value)}
    className={`${field} flex cursor-pointer items-center py-0 pr-6 leading-none [color-scheme:dark]`}
  />
</div>

          <label className="flex cursor-pointer items-center gap-4 pt-5 text-[15px] leading-6 text-[#a5a6a9] sm:gap-6 sm:pt-7 sm:text-[21px]">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(event) => setTermsAccepted(event.target.checked)}
              className="peer sr-only"
            />

            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] border-2 border-[#a5a6a9] peer-checked:border-white peer-checked:bg-white sm:h-8 sm:w-8">
              {termsAccepted && (
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 text-black"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path d="m5 12 4 4L19 6" />
                </svg>
              )}
            </span>

            <span>
              I agree to the{" "}
              <Link
                href="/terms"
                className="underline underline-offset-4 hover:text-white"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="underline underline-offset-4 hover:text-white"
              >
                Privacy Policy
              </Link>
              .
            </span>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-7 h-[68px] w-full rounded-[16px] border-2 border-[#e2e2e2] bg-transparent text-[20px] font-semibold transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50 sm:mt-9 sm:mt-[82px] sm:text-[22px]"
          >
            {isSubmitting ? "Creating Account..." : "Create Account"}
          </button>

          {message && (
            <p
              aria-live="polite"
              className="text-center text-sm text-[#a5a6a9] sm:text-base"
            >
              {message}
            </p>
          )}

          <p className="pt-7 text-center text-[16px] text-[#98999c] sm:pt-[30px] sm:text-[22px]">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-white">
              Sign In
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}