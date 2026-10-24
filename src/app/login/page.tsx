"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { KreaMark, Icon } from "@/components/ui/icons";
import { Button, Field, Notice, cn } from "@/components/ui/kit";

/* ------------------------------------------------------------------ */
/* Inner component (uses useSearchParams)                              */
/* ------------------------------------------------------------------ */
function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/brand";

  const { setLocalUser } = useAuth();

  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "sign-in") {
        await signInWithEmailAndPassword(auth!, email, password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth!, email, password);
        if (name && cred.user) await updateProfile(cred.user, { displayName: name });
      }
      router.push(next);
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message ?? "Something went wrong";
      if (msg.includes("config")) {
        // Firebase not configured — fall back to local session
        setLocalUser({ uid: "local-" + Date.now(), displayName: name || email, email });
        router.push(next);
      } else {
        setError(msg.replace("Firebase: ", "").replace(/\(auth\/[^)]+\)\.$/, "").trim());
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setLoading(true);
    try {
      await signInWithPopup(auth!, new GoogleAuthProvider());
      router.push(next);
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message ?? "Google sign-in failed";
      if (msg.includes("config") || msg.includes("popup")) {
        setError("Google sign-in isn't available in demo mode. Use email/password.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell noSidebar>
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col bg-ink">
      <div className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-[400px]">
          {/* Forest header card */}
          <div className="kl-header mb-6 rounded-[22px] px-7 py-6 text-center">
            <KreaMark size={40} />
            <h1 className="mt-3 text-[20px] font-bold">
              {mode === "sign-in" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-1 text-[12.5px] text-white/60">
              {mode === "sign-in"
                ? "Sign in to your KreaLink workspace"
                : "Start matching, creating and delivering"}
            </p>
          </div>

          {/* Card */}
          <div className="kl-card p-6">
            {error && (
              <Notice tone="danger" className="mb-4">
                {error}
              </Notice>
            )}

            {/* Mode toggle */}
            <div className="mb-5 flex rounded-[14px] bg-[#eceeed] p-1 shadow-[inset_0_0_0_1px_var(--color-line)]">
              {(["sign-in", "sign-up"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "flex-1 rounded-[10px] py-2 text-[12.5px] font-semibold transition",
                    mode === m
                      ? "bg-white text-strong shadow-[0_1px_3px_rgba(0,0,0,0.08),inset_0_0_0_1px_var(--color-line)]"
                      : "text-muted hover:text-strong"
                  )}
                >
                  {m === "sign-in" ? "Sign In" : "Sign Up"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "sign-up" && (
                <Field label="Display Name">
                  <input
                    className="kl-input"
                    type="text"
                    placeholder="Astik Chaudhary"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </Field>
              )}
              <Field label="Email" required>
                <input
                  className="kl-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>
              <Field label="Password" required>
                <input
                  className="kl-input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </Field>

              <Button
                variant="forest"
                size="md"
                type="submit"
                className="mt-1 w-full justify-center"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Icon name="refresh" size={14} className="animate-spin" />
                    {mode === "sign-in" ? "Signing in…" : "Creating account…"}
                  </span>
                ) : mode === "sign-in" ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            <div className="my-4 flex items-center gap-2 text-[11px] text-muted">
              <div className="h-px flex-1 bg-line" />
              or
              <div className="h-px flex-1 bg-line" />
            </div>

            <Button
              variant="light"
              size="md"
              icon="arrowRight"
              onClick={handleGoogle}
              disabled={loading}
              className="w-full justify-center"
            >
              Continue with Google
            </Button>

            {mode === "sign-in" && (
              <p className="mt-4 text-center text-[12px] text-muted">
                No account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("sign-up")}
                  className="font-semibold text-forest-600 hover:underline"
                >
                  Sign up free
                </button>
              </p>
            )}
          </div>

          <p className="mt-5 text-center text-[11px] text-white/35">
            Demo mode: Firebase auth may not be configured. Email sign-in creates a local session.
          </p>
        </div>
      </div>
    </div>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/* Page with Suspense boundary (required for useSearchParams)          */
/* ------------------------------------------------------------------ */
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-ink">
          <KreaMark size={36} />
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
