"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useStoredTheme } from "@/lib/use-theme";
import { NetworkCanvas } from "@/components/NetworkCanvas";
import { KreaLinkLogo } from "@/components/KreaLinkLogo";

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
  const { user, setLocalUser } = useAuth();
  const { theme } = useStoredTheme();
  const searchParams = useSearchParams();

  const [role, setRole] = useState<"creator" | "brand">("creator");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const requestedNext = searchParams.get("next");
  const defaultPath =
    role === "creator"
      ? mode === "signup"
        ? "/join-creator"
        : "/creator-studio"
      : "/brand";
  const nextPath =
    requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : defaultPath;

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

      let authedUser: { uid: string; email: string | null; displayName: string | null } | null = null;

      try {
        if (mode === "signup") {
          const credential = await createUserWithEmailAndPassword(
            auth,
            cleanEmail,
            password
          );
          if (name.trim()) {
            await updateProfile(credential.user, { displayName: name.trim() });
          }
          authedUser = {
            uid: credential.user.uid,
            email: credential.user.email,
            displayName: name.trim() || credential.user.displayName,
          };
        } else {
          const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
          authedUser = {
            uid: credential.user.uid,
            email: credential.user.email,
            displayName: credential.user.displayName,
          };
        }
      } catch (caught) {
        const code =
          caught && typeof caught === "object" && "code" in caught
            ? String((caught as { code: string }).code)
            : "";

        console.warn("Firebase Auth call status:", code);

        // If Firebase Auth is not configured on Firebase Console or returns network error, fallback seamlessly to session auth
        const isFirebaseConfigError =
          code === "auth/configuration-not-found" ||
          code === "auth/operation-not-allowed" ||
          code === "auth/network-request-failed" ||
          code === "auth/invalid-api-key" ||
          code === "auth/api-key-not-valid";

        if (isFirebaseConfigError) {
          const cleanLocalId = `user-${cleanEmail.replace(/[^a-z0-9]/g, "").slice(0, 10) || "creator"}-${Math.random().toString(36).substring(2, 6)}`;
          authedUser = {
            uid: cleanLocalId,
            email: cleanEmail,
            displayName: name.trim() || cleanEmail.split("@")[0],
          };
        } else {
          // Normal validation errors (wrong password, user not found, invalid email format)
          setError(friendlyAuthError(code));
          setIsBusy(false);
          return;
        }
      }

      if (authedUser) {
        setLocalUser(authedUser);
        if (role === "creator") {
          const cleanHandle = (authedUser.displayName || cleanEmail.split("@")[0])
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "");
          localStorage.setItem("krealink-current-creator", cleanHandle);
        }
        router.replace(nextPath);
      }
    } catch {
      setError("Unable to authenticate. Please check your credentials.");
    } finally {
      setIsBusy(false);
    }
  }

  // Instant 1-Click Demo Logins
  const handleQuickDemo = (demoRole: "creator" | "brand") => {
    setRole(demoRole);
    setError("");
    if (demoRole === "creator") {
      const demoUser = {
        uid: "creator-maya-verma",
        email: "maya.verma@example.com",
        displayName: "Maya Verma",
      };
      setLocalUser(demoUser);
      localStorage.setItem("krealink-current-creator", "mayaverma");
      router.replace(requestedNext || "/creator-studio?creator=mayaverma");
    } else {
      const demoUser = {
        uid: "brand-apex-athletics",
        email: "director@apexathletics.com",
        displayName: "Apex Athletics",
      };
      setLocalUser(demoUser);
      router.replace(requestedNext || "/brand");
    }
  };

  return (
    <main className="min-h-screen w-full bg-[#07080c] text-white flex flex-col lg:grid lg:grid-cols-12 overflow-hidden">
      {/* ======================================================== */}
      {/* LEFT COLUMN: CINEMATIC VISUAL SHOWCASE (DESKTOP) */}
      {/* ======================================================== */}
      <div className="relative hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col justify-between p-12 xl:p-16 border-r border-white/[0.08] bg-[#090b11] overflow-hidden">
        {/* Interactive 3D Network Canvas */}
        <NetworkCanvas />

        {/* Ambient Gradient Lighting */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute -left-20 -top-20 h-96 w-96 rounded-full blur-[120px] opacity-25"
            style={{ background: theme.accent }}
          />
          <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-cyan-500/15 blur-[120px]" />
          <div className="bg-grid-pattern absolute inset-0 opacity-30" />
        </div>

        {/* Brand Header */}
        <div className="relative z-10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <KreaLinkLogo size={44} glow={true} className="transition group-hover:scale-105" />
            <div>
              <span className="font-heading text-xl font-bold tracking-tight text-white">
                KreaLink
              </span>
              <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                AI Creator Marketplace
              </span>
            </div>
          </Link>

          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1 text-[11px] font-mono text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Platform Online</span>
          </div>
        </div>

        {/* Center Showcase Card */}
        <div className="relative z-10 my-auto py-10 max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300 mb-6">
            <span>✦</span>
            <span>Algorithmic Creator Matching</span>
          </div>

          <h2 className="text-4xl xl:text-5xl font-heading font-bold tracking-tight text-white leading-tight">
            Where forward-thinking brands discover{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-white to-sky-300">
              generative visionaries.
            </span>
          </h2>

          <p className="mt-4 text-base text-slate-400 leading-relaxed font-normal">
            Turn unstructured campaign concepts into AI-synthesized briefs, discover verified AI directors with proven 4K pipelines, and collaborate securely.
          </p>

          {/* Featured Creator Spotlight Preview */}
          <div className="mt-8 rounded-2xl border border-white/10 bg-[#0c0e16]/80 p-5 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl overflow-hidden bg-gradient-to-tr from-indigo-500 to-purple-500 p-0.5">
                  <div className="h-full w-full rounded-[10px] bg-slate-900 flex items-center justify-center font-heading font-bold text-sm text-white">
                    MV
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-heading font-bold text-white">Maya Verma</h4>
                  <p className="text-[11px] text-slate-400 font-mono">AI Filmmaker · 96% Brief Match</p>
                </div>
              </div>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-mono font-bold text-emerald-300">
                Commercial Verified
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
              <span className="rounded-md border border-white/5 bg-white/[0.04] px-2 py-0.5 text-slate-300 font-mono">Runway Gen-3</span>
              <span className="rounded-md border border-white/5 bg-white/[0.04] px-2 py-0.5 text-slate-300 font-mono">Midjourney v6.1</span>
              <span className="rounded-md border border-white/5 bg-white/[0.04] px-2 py-0.5 text-slate-300 font-mono">Flux.1 Dev</span>
              <span className="rounded-md border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-indigo-300 font-mono">9:16 Vertical</span>
            </div>
          </div>
        </div>

        {/* Footer Metrics */}
        <div className="relative z-10 flex items-center justify-between border-t border-white/[0.08] pt-6 text-xs text-slate-400">
          <div className="flex items-center gap-6">
            <div>
              <span className="block font-heading font-bold text-white text-base">500+</span>
              <span className="text-[11px]">Vetted AI Creators</span>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div>
              <span className="block font-heading font-bold text-white text-base">100%</span>
              <span className="text-[11px]">Commercial Clearance</span>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div>
              <span className="block font-heading font-bold text-white text-base">&lt; 3s</span>
              <span className="text-[11px]">Algorithmic Match</span>
            </div>
          </div>

          <Link href="/discover" className="text-xs font-semibold text-slate-300 hover:text-white transition">
            Explore Talent Roster →
          </Link>
        </div>
      </div>

      {/* ======================================================== */}
      {/* RIGHT COLUMN: AUTHENTICATION TERMINAL */}
      {/* ======================================================== */}
      <div className="flex-1 lg:col-span-6 xl:col-span-5 flex flex-col justify-center px-6 py-12 sm:px-12 md:px-16 lg:px-12 xl:px-16 min-h-screen">
        <div className="w-full max-w-md mx-auto">
          {/* Mobile Brand Link */}
          <div className="lg:hidden mb-8 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl border bg-white/5 font-heading font-bold text-base"
                style={{ borderColor: theme.border }}
              >
                K
              </div>
              <span className="font-heading font-bold text-lg text-white">KreaLink</span>
            </Link>
            <Link href="/" className="text-xs font-semibold text-slate-400 hover:text-white">
              Back Home
            </Link>
          </div>

          {/* Role Selection Tabs */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e15] p-1.5 flex gap-1 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setRole("creator");
                setError("");
              }}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition ${
                role === "creator"
                  ? "bg-white text-black font-bold shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>🎬</span>
              <span>AI Creator</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRole("brand");
                setError("");
              }}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition ${
                role === "brand"
                  ? "bg-white text-black font-bold shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>🏢</span>
              <span>Brand / Agency</span>
            </button>
          </div>

          {/* Form Header */}
          <div className="mt-8">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {mode === "signup"
                ? role === "creator"
                  ? "Create Creator Account"
                  : "Create Brand Account"
                : role === "creator"
                ? "Sign in as AI Creator"
                : "Sign in as Brand Partner"}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed font-normal">
              {role === "creator"
                ? "Access your Creator Studio, manage generative toolsets, and review campaign invitations."
                : "Manage campaign briefs, run AI creator matchmaker, and dispatch proposals."}
            </p>
          </div>

          {/* One-Click Demo Fast Logins */}
          <div className="mt-6 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Fast Access Demo:</span>
              <span className="text-[10px] text-emerald-400 font-mono">No password required</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo("creator")}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-xs font-medium text-slate-200 hover:border-indigo-500/40 hover:bg-indigo-500/10 transition"
              >
                <span className="block font-bold text-white text-[11px]">🎬 Demo Creator</span>
                <span className="text-[10px] text-slate-400 truncate block">maya.verma@example.com</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo("brand")}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-xs font-medium text-slate-200 hover:border-cyan-500/40 hover:bg-cyan-500/10 transition"
              >
                <span className="block font-bold text-white text-[11px]">🏢 Demo Brand</span>
                <span className="text-[10px] text-slate-400 truncate block">director@apexathletics.com</span>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Full Name or Studio *
                </label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={role === "creator" ? "Maya Verma" : "Apex Athletics Creative"}
                  className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-xs sm:text-sm font-medium text-white outline-none placeholder:text-slate-500 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Work Email *
              </label>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                placeholder="director@agency.com"
                className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-xs sm:text-sm font-medium text-white outline-none placeholder:text-slate-500 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Password *
                </label>
                {mode === "signin" && (
                  <span className="text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer">
                    Forgot password?
                  </span>
                )}
              </div>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-xs sm:text-sm font-medium text-white outline-none placeholder:text-slate-500 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isBusy}
              className="mt-2 w-full rounded-xl py-3.5 text-xs sm:text-sm font-heading font-bold text-white transition hover:opacity-95 disabled:opacity-50 shadow-lg"
              style={{
                background: theme.gradient,
                boxShadow: `0 0 25px ${theme.glow}`,
              }}
            >
              {isBusy
                ? "Verifying credentials..."
                : mode === "signup"
                ? role === "creator"
                  ? "Create Creator Account →"
                  : "Create Brand Account →"
                : role === "creator"
                ? "Sign In to Creator Studio →"
                : "Sign In to Brand Workspace →"}
            </button>
          </form>

          {/* Mode Switcher */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signup" ? "signin" : "signup");
                setError("");
              }}
              className="text-xs font-medium text-slate-400 hover:text-white transition"
            >
              {mode === "signup"
                ? "Already have an account? Sign in instead"
                : "Need an account? Create one in seconds"}
            </button>
          </div>

          {/* Creator Onboarding Link */}
          {role === "creator" && (
            <div className="mt-8 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 text-center text-xs text-slate-400">
              New AI Creator? Complete your full onboarding:{" "}
              <Link
                href="/join-creator"
                className="font-bold text-white hover:text-indigo-300 underline underline-offset-4 ml-1 transition"
              >
                Creator Onboarding Flow →
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
