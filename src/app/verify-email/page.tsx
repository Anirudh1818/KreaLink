"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button, Notice } from "@/components/ui/kit";
import { useAuth } from "@/lib/auth-context";
import { friendlyAuthError, resendVerificationEmail } from "@/lib/auth/accountActions";
import { homeFor } from "@/lib/auth/policy";

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, account, refreshAuth } = useAuth();
  const [msg, setMsg] = useState<{ tone: "info" | "success" | "danger"; text: string } | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Once verified, continue to the right portal step.
  useEffect(() => {
    if (user && account.ready && account.emailVerified) {
      router.replace(homeFor(account.principal, account.status, true));
    }
  }, [user, account, router]);

  async function handleResend() {
    try {
      await resendVerificationEmail();
      setMsg({ tone: "success", text: "Verification email sent. Check your inbox and spam folder." });
      setCooldown(60);
    } catch (err) {
      setMsg({ tone: "danger", text: friendlyAuthError(err) });
    }
  }

  async function handleCheck() {
    setChecking(true);
    try {
      const verified = await refreshAuth();
      if (!verified) setMsg({ tone: "info", text: "Not verified yet. Click the link in the email, then try again." });
    } finally {
      setChecking(false);
    }
  }

  return (
    <AppShell noSidebar>
      <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-5 py-12">
        <div className="kl-card w-full max-w-md space-y-4 p-6 text-strong">
          <h1 className="text-[20px] font-bold">Verify your email</h1>
          {!user ? (
            <>
              <p className="text-[13px] text-muted">Sign in to verify your email address.</p>
              <Button variant="forest" href="/login?next=/verify-email" className="w-full justify-center">Sign in</Button>
            </>
          ) : (
            <>
              <p className="text-[13px] text-muted">
                We sent a verification link to <span className="font-semibold text-strong">{user.email}</span>. Open it to
                confirm the address, then come back here.
              </p>
              {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
              <Button variant="forest" onClick={handleCheck} disabled={checking} className="w-full justify-center">
                {checking ? "Checking…" : "I've verified my email"}
              </Button>
              <Button variant="light" onClick={handleResend} disabled={cooldown > 0} className="w-full justify-center">
                {cooldown > 0 ? `Resend available in ${cooldown}s` : "Resend verification email"}
              </Button>
              <p className="text-center text-[11.5px] text-muted">
                Wrong address? <Link href="/me" className="font-semibold text-forest-600 underline">Manage account</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
