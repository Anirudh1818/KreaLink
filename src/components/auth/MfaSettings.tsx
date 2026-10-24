"use client";

import { useState } from "react";
import { multiFactor, TotpMultiFactorGenerator, type TotpSecret } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button, Field, Notice } from "@/components/ui/kit";

/**
 * TOTP (authenticator app) enrollment. Requires Firebase Identity Platform
 * with TOTP MFA enabled on the project; otherwise Firebase reports
 * operation-not-allowed and we say so plainly.
 */
export function MfaSettings({ required }: { required: boolean }) {
  const current = auth.currentUser;
  const [factors, setFactors] = useState(() => (current ? multiFactor(current).enrolledFactors : []));
  const [secret, setSecret] = useState<TotpSecret | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "danger" | "info"; text: string } | null>(null);

  if (!current) return null;
  const user = current;

  function explain(err: unknown): string {
    const c = (err as { code?: string }).code ?? "";
    if (c === "auth/requires-recent-login") return "For security, sign out and sign in again, then retry.";
    if (c === "auth/operation-not-allowed" || c === "auth/admin-restricted-operation") {
      return "Authenticator-app MFA isn't enabled for this KreaLink project yet. Ask the platform owner to enable TOTP MFA in Firebase Identity Platform.";
    }
    if (c === "auth/invalid-verification-code") return "That code didn't match. Use the current 6-digit code.";
    if (c === "auth/unverified-email") return "Verify your email address before enabling two-step verification.";
    return "Couldn't update two-step verification. Please try again.";
  }

  async function start() {
    setBusy(true);
    setMsg(null);
    try {
      const session = await multiFactor(user).getSession();
      setSecret(await TotpMultiFactorGenerator.generateSecret(session));
    } catch (err) {
      setMsg({ tone: "danger", text: explain(err) });
    } finally {
      setBusy(false);
    }
  }

  async function finish(e: React.FormEvent) {
    e.preventDefault();
    if (!secret) return;
    setBusy(true);
    setMsg(null);
    try {
      await multiFactor(user).enroll(TotpMultiFactorGenerator.assertionForEnrollment(secret, code.trim()), "Authenticator app");
      setFactors(multiFactor(user).enrolledFactors);
      setSecret(null);
      setCode("");
      setMsg({ tone: "success", text: "Two-step verification is on. Sign out and back in to start an MFA session." });
    } catch (err) {
      setMsg({ tone: "danger", text: explain(err) });
    } finally {
      setBusy(false);
    }
  }

  const enrolled = factors.length > 0;

  return (
    <div className="kl-card space-y-4 p-6 text-strong">
      <div>
        <h3 className="text-[15px] font-bold">Two-step verification</h3>
        <p className="mt-0.5 text-[12.5px] text-muted">
          {enrolled
            ? `On — ${factors.map((f) => f.displayName ?? f.factorId).join(", ")}.`
            : required
            ? "Required for your admin access. Set up an authenticator app to continue."
            : "Add an authenticator app for stronger sign-in security."}
        </p>
      </div>
      {required && !enrolled && <Notice tone="warn">Admin tools stay locked until two-step verification is set up and used to sign in.</Notice>}
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {!enrolled && !secret && (
        <Button variant="forest" size="sm" icon="shield" onClick={start} disabled={busy}>
          {busy ? "Starting…" : "Set up authenticator app"}
        </Button>
      )}
      {secret && (
        <form onSubmit={finish} className="space-y-3">
          <p className="text-[12.5px]">
            Add this key to your authenticator app (Google Authenticator, 1Password, Authy…), then enter the 6-digit code it shows.
          </p>
          <code className="block break-all rounded-xl bg-[#f3f6f5] px-3 py-2 font-mono text-[12px]">{secret.secretKey}</code>
          <a href={secret.generateQrCodeUrl(user.email ?? "account", "KreaLink")} className="text-[12px] font-semibold text-forest-600 underline">
            Open in authenticator app
          </a>
          <Field label="Code from your app" required>
            <input
              className="kl-input tracking-[0.3em]"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              autoComplete="one-time-code"
            />
          </Field>
          <Button variant="forest" size="sm" type="submit" disabled={busy || code.length !== 6}>
            {busy ? "Verifying…" : "Turn on"}
          </Button>
        </form>
      )}
    </div>
  );
}
