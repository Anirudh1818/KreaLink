"use client";

import { AppShell } from "@/components/AppShell";
import { Notice } from "@/components/ui/kit";
import { STATUS_LABEL } from "@/lib/auth/policy";
import { AdminHeader, fmtTime, useAuditLog } from "../adminData";

export default function AdminAuditPage() {
  const { rows, error } = useAuditLog(undefined, 200);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-5 px-4 pb-16 pt-6">
        <AdminHeader title="Audit log" subtitle="Append-only record of admin actions. Entries cannot be edited or deleted." />
        {error && <Notice tone="danger">{error}</Notice>}
        <div className="kl-card overflow-x-auto p-0 text-strong">
          <table className="w-full min-w-[720px] text-[12.5px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">When</th>
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold">Actor</th>
                <th className="px-4 py-3 font-semibold">Target</th>
                <th className="px-4 py-3 font-semibold">Change</th>
                <th className="px-4 py-3 font-semibold">Reason</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-line align-top">
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted">{fmtTime(r.at)}</td>
                  <td className="px-4 py-2.5 font-semibold">{r.action}</td>
                  <td className="px-4 py-2.5 font-mono text-[11px]">{r.actorUid}</td>
                  <td className="px-4 py-2.5 font-mono text-[11px]">{r.targetUid}</td>
                  <td className="px-4 py-2.5">{r.fromStatus && r.toStatus ? `${STATUS_LABEL[r.fromStatus]} → ${STATUS_LABEL[r.toStatus]}` : "—"}</td>
                  <td className="px-4 py-2.5">{r.reason}</td>
                </tr>
              ))}
              {rows.length === 0 && !error && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">No entries yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
