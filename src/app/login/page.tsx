"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useStoredTheme } from "@/lib/use-theme";

function friendlyAuthError(code: string) {
  switch (code) {
    case "auth/invalid-email":
      return "That email address looks invalid.";
    case "auth/email-already-in-use":
      return "An account already exists for this email. Try signing in.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email or password is incorrect.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/operation-not-allowed":
      return "Email/password sign-in is not enabled in Firebase yet.";
    default:
      return "Something went wrong. Please try again.";
  }
}

function LoginForm() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useStoredTheme();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  // Only allow same-site relative redirects ("//evil.com" is protocol-relative
  // and would leave the site, so it must be rejected too).
  const requestedNext = searchParams.get("next");
  const nextPath =
    requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/";

  useEffect(() => {
    if (user) {
      router.replace(nextPath);
    }
  }, [user, nextPath, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    if (mode === "signup" && !name.trim()) {
      setError("Please enter your name.");
      return;
    }

    try {
      setIsBusy(true);
      setError("");

      if (mode === "signup") {
        const credential = await createUserWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );
        await updateProfile(credential.user, { displayName: name.trim() });
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      }

      router.replace(nextPath);
    } catch (caught) {
      const code =
        caught && typeof caught === "object" && "code" in caught
          ? String((caught as { code: string }).code)
          : "";
      setError(friendlyAuthError(code));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden bg-[#050508] px-5 py-10 text-white">
      <div className="pointer-events-none fixed inset-0">
        <div
          className="absolute left-1/2 top-0 h-[460px] w-[460px] -translate-x-1/2 rounded-full blur-[120px]"
          style={{ background: theme.glow }}
        />
        <div
          className="absolute bottom-0 right-0 h-[340px] w-[340px] rounded-full blur-[110px]"
          style={{ background: theme.glow, opacity: 0.4 }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <a href="/" className="mb-6 flex items-center justify-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-2xl border bg-white/5"
            style={{
              borderColor: theme.border,
              boxShadow: `0 0 30px ${theme.glow}`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/flame.png" alt="FanStreak" className="h-7 w-7" />
          </div>
          <h1
            className="bg-clip-text text-2xl font-black tracking-tight text-transparent"
            style={{ backgroundImage: theme.text }}
          >
            FanStreak
          </h1>
        </a>

        <form
          onSubmit={submit}
          className="rounded-[2.2rem] border border-white/10 bg-[#0b0810] p-7"
          style={{ boxShadow: `0 0 100px ${theme.glow}` }}
        >
          <p className="text-sm font-black uppercase tracking-[0.22em] text-white/40">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </p>
          <h2 className="mt-3 text-3xl font-black">
            {mode === "signup" ? "Join FanStreak" : "Sign in to FanStreak"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/45">
            Your streaks, rank, and support are tied to your account so they are
            really yours.
          </p>

          {mode === "signup" && (
            <div className="mt-6">
              <label className="mb-2 block text-sm font-bold text-white/45">
                Your name
              </label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Aarav Sharma"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 font-bold text-white outline-none placeholder:text-white/25 focus:border-white/25"
              />
            </div>
          )}

          <div className="mt-5">
            <label className="mb-2 block text-sm font-bold text-white/45">
              Email
            </label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="you@email.com"
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 font-bold text-white outline-none placeholder:text-white/25 focus:border-white/25"
            />
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-sm font-bold text-white/45">
              Password
            </label>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              placeholder="At least 6 characters"
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 font-bold text-white outline-none placeholder:text-white/25 focus:border-white/25"
            />
          </div>

          {error && (
            <p className="mt-4 text-sm font-bold text-rose-300">{error}</p>
          )}

          <button
            type="submit"
            disabled={isBusy}
            className="mt-6 w-full rounded-2xl py-4 font-black text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: theme.gradient,
              boxShadow: `0 0 40px ${theme.glow}`,
            }}
          >
            {isBusy
              ? "Please wait..."
              : mode === "signup"
              ? "Create account"
              : "Sign in"}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "signup" ? "signin" : "signup");
              setError("");
            }}
            className="mt-4 w-full text-center text-sm font-bold text-white/50 transition hover:text-white/80"
          >
            {mode === "signup"
              ? "Already have an account? Sign in"
              : "New to FanStreak? Create an account"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  // useSearchParams requires a Suspense boundary during prerendering.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
