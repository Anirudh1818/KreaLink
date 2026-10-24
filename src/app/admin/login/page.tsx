"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import {
  getMultiFactorResolver,
  signInWithEmailAndPassword,
  TotpMultiFactorGenerator,
  type MultiFactorError,
  type MultiFactorResolver,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";
import { friendlyAuthError } from "@/lib/auth/accountActions";
import { KreaMark } from "@/components/ui/icons";
import { Button, Field, Notice } from "@/components/ui/kit";

function AdminLoginInner() {
  const router = useRouter();
  const { user, account } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mfa, setMfa] = useState<MultiFactorResolver | null>(null);
  const [code, setCode] = useState("");

  // If already authenticated with active admin grant, go directly to /admin
  useEffect(() => {
    if (user && account.ready) {
      if (account.isAdmin) {
        router.replace("/admin");
      }
    }
  }, [user, account, router]);

  async function handleAdminSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);

      // Verify active admin grant in Firestore admins/{uid}
      const adminDoc = await getDoc(doc(db, "admins", cred.user.uid)).catch(() => null);
      if (!adminDoc?.exists() || adminDoc.data()?.active !== true) {
        await auth.signOut();
        setError("Access Denied: This account is not provisioned as a KreaLink Platform Administrator.");
        setLoading(false);
        return;
      }

      router.replace("/admin");
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
    setError("");
    setLoading(true);

    try {
      const hint = mfa.hints[0];
      const assertion = TotpMultiFactorGenerator.assertionForSignIn(
        hint.uid,
        code.trim().replace(/\s+/g, "")
      );
      const cred = await mfa.resolveSignIn(assertion);

      // Check admin doc
      const adminDoc = await getDoc(doc(db, "admins", cred.user.uid)).catch(() => null);
      if (!adminDoc?.exists() || adminDoc.data()?.active !== true) {
        await auth.signOut();
        setError("Access Denied: This account is not provisioned as a KreaLink Platform Administrator.");
        setLoading(false);
        return;
      }

      router.replace("/admin");
    } catch (err: unknown) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:py-24">
      <div className="relative overflow-hidden rounded-3xl border border-red-500/20 bg-[#0c0d0e] p-8 shadow-2xl shadow-red-950/20">
        <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-red-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 h-36 w-36 rounded-full bg-lime-400/10 blur-3xl pointer-events-none" />

        {/* Brand / Title */}
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <KreaMark size={32} />
            <span className="text-base font-extrabold tracking-tight text-white">KreaLink</span>
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
            Internal Portal
          </span>
        </div>

        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight text-white">Platform Administrator Login</h1>
          <p className="mt-1 text-xs text-white/60">
            Restricted gateway for KreaLink platform governance, verification decisions, and surveillance.
          </p>
        </div>

        {error && (
          <div className="mb-5">
            <Notice tone="danger">{error}</Notice>
          </div>
        )}

        {!mfa ? (
          <form onSubmit={handleAdminSignIn} className="space-y-4">
            <Field label="Administrator Email">
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="admin@krealink.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder-white/30 focus:border-red-500 focus:outline-none"
              />
            </Field>

            <Field label="Password">
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder-white/30 focus:border-red-500 focus:outline-none"
              />
            </Field>

            <Button
              type="submit"
              variant="dark"
              size="md"
              className="mt-2 w-full justify-center !bg-red-600 font-bold hover:!bg-red-500 text-white"
              disabled={loading}
            >
              {loading ? "Authenticating Authority..." : "Authenticate as Administrator"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleMfa} className="space-y-4">
            <Notice tone="info">
              Two-factor authentication is required for this administrative session.
            </Notice>

            <Field label="6-Digit Authenticator Code">
              <input
                type="text"
                required
                pattern="[0-9]{6}"
                inputMode="numeric"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full text-center tracking-widest text-lg font-mono rounded-xl border border-white/15 bg-black/40 px-3.5 py-2.5 text-white focus:border-red-500 focus:outline-none"
              />
            </Field>

            <Button
              type="submit"
              variant="dark"
              size="md"
              className="w-full justify-center !bg-red-600 font-bold hover:!bg-red-500 text-white"
              disabled={loading}
            >
              {loading ? "Validating Code..." : "Complete Admin Verification"}
            </Button>
          </form>
        )}

        <div className="mt-6 border-t border-white/10 pt-4 text-center">
          <p className="text-[11px] text-white/40">
            Looking for public access?{" "}
            <Link href="/login" className="text-white/70 underline hover:text-white">
              Member Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-8 text-center text-sm text-white/50">Loading Admin Gateway...</div>}>
        <AdminLoginInner />
      </Suspense>
    </AppShell>
  );
}
