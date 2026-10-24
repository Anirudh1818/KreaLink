"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button, Notice } from "@/components/ui/kit";
import { useAuth } from "@/lib/auth-context";

/**
 * Shown to signed-in accounts that are not (yet) admins. It explains how the
 * platform owner grants admin access; it cannot grant anything itself —
 * admins/{uid} is writable only from the Firebase console or the Admin SDK.
 */
export default function AdminAccessPage() {
  const { user, account } = useAuth();
  const [copied, setCopied] = useState<string | null>(null);

  if (!user) return null;

  function copy(label: string, text: string) {
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  const fields: [string, string, string][] = [
    ["active", "boolean", "true"],
    ["email", "string", user.email ?? ""],
    ["requireMfa", "boolean", "false"],
    ["grantedBy", "string", "firebase-console"],
    ["grantedAt", "timestamp", "now"],
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-5 px-4 pb-16 pt-6">
        <div className="kl-header p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-lime-300/80">Admin Portal · owner access</p>
          <h1 className="mt-1 text-[22px] font-bold">This account isn&apos;t an admin yet</h1>
          <p className="mt-1 text-[13px] text-white/65">
            Admin access is never granted from the website. A platform owner turns it on with a trusted write in Firebase.
          </p>
        </div>

        {account.adminNeedsMfa && (
          <Notice tone="warn" title="Two-step verification required">
            Your admin grant requires MFA. Set up an authenticator app on your Account page, then sign out and back in.
          </Notice>
        )}

        <div className="kl-card space-y-4 p-6 text-strong">
          <h2 className="text-[15px] font-bold">Your account</h2>
          <div className="space-y-2 text-[12.5px]">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f3f6f5] px-3 py-2">
              <span><span className="text-muted">User ID:</span> <code className="font-mono">{user.uid}</code></span>
              <Button variant="light" size="xs" onClick={() => copy("uid", user.uid)}>{copied === "uid" ? "Copied" : "Copy"}</Button>
            </div>
            <div className="rounded-xl bg-[#f3f6f5] px-3 py-2">
              <span className="text-muted">Email:</span> {user.email} {account.emailVerified ? "(verified)" : "(not verified — verify it first)"}
            </div>
          </div>
        </div>

        <div className="kl-card space-y-4 p-6 text-strong">
          <h2 className="text-[15px] font-bold">Option 1 — Firebase console (about a minute)</h2>
          <ol className="list-decimal space-y-2 pl-5 text-[12.5px]">
            <li>Open the Firebase console for this project → <b>Firestore Database</b>.</li>
            <li>Start collection <code className="font-mono">admins</code> (or open it if it exists).</li>
            <li>Add a document with <b>Document ID</b> = your User ID above.</li>
            <li>Add these fields, then save:</li>
          </ol>
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="pb-1 font-semibold">Field</th>
                <th className="pb-1 font-semibold">Type</th>
                <th className="pb-1 font-semibold">Value</th>
              </tr>
            </thead>
            <tbody>
              {fields.map(([f, t, val]) => (
                <tr key={f} className="border-t border-line">
                  <td className="py-1.5 font-mono">{f}</td>
                  <td className="py-1.5">{t}</td>
                  <td className="py-1.5 font-mono">{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[12px] text-muted">Come back and refresh — the Admin Portal unlocks immediately.</p>
        </div>

        <div className="kl-card space-y-3 p-6 text-strong">
          <h2 className="text-[15px] font-bold">Option 2 — provisioning script (audited)</h2>
          <p className="text-[12.5px]">With a Firebase service-account key on a trusted machine:</p>
          <pre className="overflow-x-auto rounded-xl bg-[#0f1514] p-3 font-mono text-[11.5px] text-lime-200">
{`set GOOGLE_APPLICATION_CREDENTIALS=C:\\secure\\service-account.json
set FIREBASE_PROJECT_ID=<your-project-id>
npm run admin:provision -- grant ${user.email ?? "<email>"} --by "<your name>"`}
          </pre>
          <p className="text-[12px] text-muted">This also writes an audit log entry and refuses to remove the last admin.</p>
        </div>

        <Notice tone="info" title="Requires the KreaLink security rules">
          Admin access works only after <code className="font-mono">firestore.rules</code> and <code className="font-mono">storage.rules</code> from
          this repository are deployed to the same Firebase project (<code className="font-mono">firebase deploy --only firestore:rules,storage</code>).
        </Notice>
      </div>
    </AppShell>
  );
}
