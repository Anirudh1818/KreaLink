"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import {
  getMultiFactorResolver,
  signInWithEmailAndPassword,
  TotpMultiFactorGenerator,
  type MultiFactorError,
  type MultiFactorResolver,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { continueWithGoogle, friendlyAuthError } from "@/lib/auth/accountActions";
import { decideRoute, homeFor, safeNextPath } from "@/lib/auth/policy";
import { KreaMark, Icon } from "@/components/ui/icons";
import { Button, Field, Notice } from "@/components/ui/kit";

/* ------------------------------------------------------------------ */
/* Inner component (uses useSearchParams)                              */
/* ------------------------------------------------------------------ */
function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const { user, account } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mfa, setMfa] = useState<MultiFactorResolver | null>(null);
  const [code, setCode] = useState("");

  // Route by trusted role + verification state once the account has loaded.
  useEffect(() => {
    if (!user || !account.ready) return;
    if (account.needsRoleSetup) {
      router.replace("/choose-role?setup=1");
      return;
    }
    const target = next && decideRoute(next, account.principal, account.status).allow ? next : homeFor(account.principal, account.status, account.emailVerified);
    router.replace(target);
  }, [user, account, next, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: unknown) {
      if ((err as { code?: string }).code === "auth/multi-factor-auth-required") {
        setMfa(getMultiFactorResolver(auth, err as MultiFactorError));
      } else {
        setError(friendlyAuthError(err));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleMfa(e: React.FormEvent) {
    e.preventDefault();
    if (!mfa) return;
    const hint = mfa.hints.find((h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID);
    if (!hint) {
      setError("This account's second factor isn't supported here. Contact a platform administrator.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await mfa.resolveSignIn(TotpMultiFactorGenerator.assertionForSignIn(hint.uid, code.trim()));
      setMfa(null);
    } catch (err) {
      setError(friendlyAuthError(err) === "Something went wrong. Please try again." ? "That code didn't work. Try the current code from your authenticator app." : friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setLoading(true);
    try {
      // null role: sign in only; never creates a role silently.
      await continueWithGoogle(null);
    } catch (err: unknown) {
      setError(friendlyAuthError(err));
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
            <h1 className="mt-3 text-[20px] font-bold">{mfa ? "Two-step verification" : "Welcome back"}</h1>
            <p className="mt-1 text-[12.5px] text-white/60">
              {mfa ? "Enter the 6-digit code from your authenticator app" : "Sign in to your KreaLink workspace"}
            </p>
          </div>

          {/* Card */}
          <div className="kl-card p-6">
            {error && (
              <Notice tone="danger" className="mb-4">
                {error}
              </Notice>
            )}

            {mfa ? (
              <form onSubmit={handleMfa} className="space-y-4">
                <Field label="Authentication code" required>
                  <input
                    className="kl-input tracking-[0.3em]"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    autoComplete="one-time-code"
                    required
                  />
                </Field>
                <Button variant="forest" size="md" type="submit" className="w-full justify-center" disabled={loading || code.length !== 6}>
                  {loading ? "Verifying…" : "Verify and sign in"}
                </Button>
                <button type="button" onClick={() => setMfa(null)} className="w-full text-center text-[12px] text-muted hover:underline">
                  Cancel
                </button>
              </form>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Field label="Email" required>
                    <input
                      className="kl-input"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
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
                      autoComplete="current-password"
                      required
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
                        Signing in…
                      </span>
                    ) : (
                      "Sign In"
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

                <div className="mt-5 space-y-2 text-center text-[12px] text-muted">
                  <p>New to KreaLink?</p>
                  <p>
                    <Link href="/brand/signup" className="font-semibold text-forest-600 hover:underline">Sign up as a Brand</Link>
                    {" · "}
                    <Link href="/creator/signup" className="font-semibold text-forest-600 hover:underline">Sign up as a Creator</Link>
                  </p>
                  <p className="pt-2 text-[11px] text-white/40">
                    Staff member?{" "}
                    <Link href="/admin/login" className="font-semibold text-red-400 hover:underline">
                      Admin Portal Login
                    </Link>
                  </p>
                </div>
              </>
            )}
          </div>
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
