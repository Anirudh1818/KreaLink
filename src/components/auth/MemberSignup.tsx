"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { KreaMark, Icon } from "@/components/ui/icons";
import { Button, Field, Notice } from "@/components/ui/kit";
import { useAuth } from "@/lib/auth-context";
import { continueWithGoogle, friendlyAuthError, registerMember } from "@/lib/auth/accountActions";
import { homeFor, type MemberRole } from "@/lib/auth/policy";

const COPY: Record<MemberRole, { title: string; subtitle: string; nameLabel: string; steps: string[] }> = {
  brand: {
    title: "Create your Brand account",
    subtitle: "Brief, match and hire AI creators for commercial campaigns.",
    nameLabel: "Your name (business contact)",
    steps: [
      "Create your account and verify your email",
      "Post your first brief and get matched with AI creators",
      "Optional: verify your business (GSTIN) for a trusted-brand badge",
    ],
  },
  creator: {
    title: "Join as a Creator",
    subtitle: "Get matched to brand briefs that fit your AI workflow.",
    nameLabel: "Creator display name",
    steps: [
      "Create your account and verify your email",
      "Share your portfolio, tools and commercial preferences",
      "Our team reviews your portfolio before you can accept paid work",
    ],
  },
};

export function MemberSignup({ role }: { role: MemberRole }) {
  const router = useRouter();
  const { user, account } = useAuth();
  const copy = COPY[role];

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) return setError("Passwords don't match.");
    if (!agreed) return setError("Please accept the Terms and Privacy Notice to continue.");
    setBusy(true);
    try {
      await registerMember({ role, displayName: name, email, password });
      router.push(role === "brand" ? "/brand" : "/creator");
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError("");
    if (!agreed) return setError("Please accept the Terms and Privacy Notice to continue.");
    setBusy(true);
    try {
      await continueWithGoogle(role);
      router.push(role === "brand" ? "/brand" : "/creator");
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  const signedInElsewhere = user && account.ready && (account.role || account.isAdmin);

  return (
    <AppShell noSidebar>
      <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-5 py-12">
        <div className="grid w-full max-w-4xl gap-6 md:grid-cols-2">
          <div className="kl-header flex flex-col justify-between rounded-[22px] p-7">
            <div>
              <KreaMark size={36} />
              <h1 className="mt-4 text-[22px] font-bold">{copy.title}</h1>
              <p className="mt-1 text-[13px] text-white/65">{copy.subtitle}</p>
            </div>
            <ol className="mt-8 space-y-3 text-[12.5px] text-white/80">
              {copy.steps.map((s, i) => (
                <li key={s} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold">{i + 1}</span>
                  <span className="pt-0.5">{s}</span>
                </li>
              ))}
            </ol>
            <p className="mt-8 text-[11.5px] text-white/50">
              {role === "brand" ? "Joining as a creator instead? " : "Hiring creators instead? "}
              <Link href={role === "brand" ? "/creator/signup" : "/brand/signup"} className="font-semibold text-lime-300 underline">
                {role === "brand" ? "Creator signup" : "Brand signup"}
              </Link>
            </p>
          </div>

          <div className="kl-card p-6 text-strong">
            {signedInElsewhere ? (
              <div className="space-y-4">
                <Notice tone="info" title={`You're signed in as ${user.email}`}>
                  This account is already registered{account.role ? ` as a ${account.role}` : ""}. One account holds one role.
                </Notice>
                <Button variant="forest" href={homeFor(account.principal)} className="w-full justify-center">
                  Continue to your portal
                </Button>
              </div>
            ) : (
              <>
                {error && <Notice tone="danger" className="mb-4">{error}</Notice>}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Field label={copy.nameLabel} required>
                    <input className="kl-input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={120} autoComplete="name" />
                  </Field>
                  <Field label={role === "brand" ? "Work email" : "Email"} required>
                    <input className="kl-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Password" hint="8+ characters" required>
                      <input className="kl-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
                    </Field>
                    <Field label="Confirm password" required>
                      <input className="kl-input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} autoComplete="new-password" />
                    </Field>
                  </div>
                  <label className="flex items-start gap-2 text-[12px] text-muted">
                    <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
                    <span>
                      I agree to the KreaLink Terms and Privacy Notice. We use your email to secure your account and
                      contact you about verification. We don&apos;t sell your data.
                    </span>
                  </label>
                  <Button variant="forest" type="submit" disabled={busy} className="w-full justify-center">
                    {busy ? (
                      <span className="flex items-center gap-2"><Icon name="refresh" size={14} className="animate-spin" /> Creating account…</span>
                    ) : (
                      `Create ${role} account`
                    )}
                  </Button>
                </form>
                <div className="my-4 flex items-center gap-2 text-[11px] text-muted">
                  <div className="h-px flex-1 bg-line" /> or <div className="h-px flex-1 bg-line" />
                </div>
                <Button variant="light" icon="arrowRight" onClick={handleGoogle} disabled={busy} className="w-full justify-center">
                  Continue with Google
                </Button>
                <p className="mt-4 text-center text-[12px] text-muted">
                  Already have an account?{" "}
                  <Link href="/login" className="font-semibold text-forest-600 hover:underline">Sign in</Link>
                </p>
                <p className="mt-3 text-center text-[11px] text-muted">
                  Admin accounts are never created here — they are provisioned internally.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
