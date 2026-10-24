"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Notice } from "@/components/ui/kit";
import { VerificationBadge } from "@/components/auth/AccountUI";
import { VERIFICATION_STATUSES } from "@/lib/auth/policy";
import { AdminHeader, fmtTime, useAuditLog, useVerifications } from "./adminData";

export default function AdminOverviewPage() {
  const { rows, error, loading } = useVerifications();
  const { rows: recent } = useAuditLog(undefined, 8);

  const counts = Object.fromEntries(VERIFICATION_STATUSES.map((s) => [s, rows.filter((r) => r.status === s).length]));
  const waiting = rows.filter((r) => r.status === "pending_review").length;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6 px-4 pb-16 pt-6">
        <AdminHeader title="Platform oversight" subtitle="Verification queues, account actions and the audit trail." />
        {error && <Notice tone="danger">{error}</Notice>}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {VERIFICATION_STATUSES.map((s) => (
            <Link key={s} href={`/admin/verifications?status=${s}`} className="kl-card flex items-center justify-between p-5 text-strong transition hover:-translate-y-0.5">
              <VerificationBadge status={s} />
              <span className="text-[26px] font-bold tabular-nums">{loading ? "…" : counts[s]}</span>
            </Link>
          ))}
        </div>

        {waiting > 0 && (
          <Notice tone="info" title={`${waiting} application(s) waiting for review`} action={<Link href="/admin/verifications" className="text-[12px] font-semibold underline">Open queue</Link>} />
        )}

        <div className="kl-card p-5 text-strong">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[14px] font-bold">Recent admin activity</h2>
            <Link href="/admin/audit" className="text-[12px] font-semibold text-forest-600 underline">Full audit log</Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-[12.5px] text-muted">No admin actions recorded yet.</p>
          ) : (
            <ul className="divide-y divide-line text-[12.5px]">
              {recent.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <span className="font-semibold">{r.action}</span>
                    {r.fromStatus && r.toStatus && ` · ${r.fromStatus} → ${r.toStatus}`} · target {r.targetUid.slice(0, 8)}…
                  </span>
                  <span className="text-muted">{fmtTime(r.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
