"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Button, Modal, Notice } from "@/components/ui/kit";
import { VerificationBadge } from "@/components/auth/AccountUI";
import { useAuth } from "@/lib/auth-context";
import { decideVerification, friendlyAuthError } from "@/lib/auth/accountActions";
import { ADMIN_TRANSITIONS, STATUS_LABEL, canAdminTransition, type VerificationStatus } from "@/lib/auth/policy";

const ACTION_TEXT: Record<VerificationStatus, string> = {
  verified: "Approve / reinstate (Verified)",
  pending_review: "Return to review (Pending Review)",
  info_required: "Request additional information",
  rejected: "Reject application",
  suspended: "Suspend account (blocks all commercial actions)",
  unverified: "Reset",
};
import { AdminHeader, fmtTime, useAllUsers, useVerifications, type WithId } from "../adminData";
import type { UserDoc, VerificationDoc } from "@/lib/auth/schema";

export default function AdminUsersSurveillancePage() {
  const { user } = useAuth();
  const { rows: users, error: userError, loading: userLoading } = useAllUsers();
  const { rows: verifications } = useVerifications();

  const [roleFilter, setRoleFilter] = useState<"all" | "brand" | "creator">("all");
  const [search, setSearch] = useState("");
  const [actingOn, setActingOn] = useState<{ user: WithId<UserDoc>; verification: VerificationDoc | null } | null>(null);
  const [decision, setDecision] = useState<VerificationStatus>("verified");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  // Map user verification records by UID
  const verificationDocMap = useMemo(() => {
    const map = new Map<string, VerificationDoc>();
    for (const v of verifications) {
      map.set(v.uid, v);
    }
    return map;
  }, [verifications]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchEmail = u.email.toLowerCase().includes(q);
        const matchName = (u.displayName || "").toLowerCase().includes(q);
        const matchUid = u.uid.toLowerCase().includes(q);
        if (!matchEmail && !matchName && !matchUid) return false;
      }
      return true;
    });
  }, [users, roleFilter, search]);

  async function handleConfirmDecision() {
    if (!actingOn || !user) return;
    const target = actingOn.verification;
    // Decisions apply only to real, submitted applications — never invent one.
    if (!target) {
      setNotice({ tone: "danger", text: "This account hasn't submitted a verification application yet, so there is nothing to decide." });
      setActingOn(null);
      return;
    }
    // Brand approval must go through the review queue (GST portal confirmation).
    if (decision === "verified" && target.role === "brand" && target.status !== "suspended") {
      setNotice({ tone: "danger", text: "Approve brands from the Verification Queue, where the GSTIN must be confirmed on the GST portal." });
      setActingOn(null);
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const u = actingOn.user;
      const profileId = u.role === "creator" ? u.creatorUsername : u.brandId;
      await decideVerification({
        adminUid: user.uid,
        target,
        to: decision,
        reason: reason.trim(),
        publicProfile: profileId ? { collection: u.role === "creator" ? "creators" : "brands", id: profileId } : null,
      });
      setNotice({ tone: "success", text: `Updated ${u.displayName || u.email} to ${STATUS_LABEL[decision]}. Recorded in the audit trail.` });
      setActingOn(null);
      setReason("");
    } catch (err) {
      setNotice({ tone: "danger", text: friendlyAuthError(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-5 px-4 pb-16 pt-6">
        <AdminHeader
          title="Account Surveillance & Oversight"
          subtitle="Real-time monitor of every registered brand and creator. Exercise total platform control: inspect applications, approve accounts, or suspend access."
        />

        {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
        {userError && <Notice tone="danger">{userError}</Notice>}

        {/* Filter controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-semibold text-white/60">Filter Role:</span>
            {(["all", "brand", "creator"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition ${
                  roleFilter === r ? "bg-lime-400 text-black shadow-lg shadow-lime-400/20" : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                {r === "all" ? "All Accounts" : `${r}s`}
              </button>
            ))}
          </div>

          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Search by name, email, or UID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-black/40 px-3.5 py-1.5 text-xs text-white placeholder-white/40 focus:border-lime-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Surveillance Table */}
        <div className="kl-card overflow-x-auto p-0 text-strong">
          <table className="w-full min-w-[850px] text-[12.5px]">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-left text-[11px] uppercase tracking-wider text-muted">
                <th className="px-4 py-3 font-semibold">User / Identity</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Account State</th>
                <th className="px-4 py-3 font-semibold">Registered</th>
                <th className="px-4 py-3 font-semibold text-right">Surveillance Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map((u) => {
                const vDoc = verificationDocMap.get(u.uid) || null;
                const currentStatus: VerificationStatus = vDoc ? vDoc.status : "unverified";
                const isApproved = currentStatus === "verified";
                const isSuspended = currentStatus === "suspended";

                return (
                  <tr key={u.uid} className="transition hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-white">{u.displayName || "Anonymous Member"}</span>
                        <span className="text-[11.5px] text-white/60">{u.email}</span>
                        <span className="font-mono text-[10px] text-white/40">UID: {u.uid}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                          u.role === "brand" ? "bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30" : "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <VerificationBadge status={currentStatus} />
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {fmtTime(u.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          href={`/admin/verifications?target=${u.uid}`}
                          className="rounded-lg bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
                        >
                          View Application
                        </Link>

                        {!vDoc ? (
                          <span className="px-2 text-xs text-muted">No application yet</span>
                        ) : (
                        <>
                        {!isApproved && !isSuspended && (u.role === "brand" ? (
                          <Link
                            href={`/admin/verifications?status=${vDoc.status}`}
                            className="rounded-lg bg-forest-700 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-forest-800"
                          >
                            Review &amp; approve (GSTIN)
                          </Link>
                        ) : (
                          canAdminTransition(vDoc.status, "verified") && (
                            <Button
                              size="sm"
                              variant="forest"
                              onClick={() => {
                                setActingOn({ user: u, verification: vDoc });
                                setDecision("verified");
                                setReason("");
                              }}
                            >
                              Approve
                            </Button>
                          )
                        ))}

                        {!isSuspended ? (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              setActingOn({ user: u, verification: vDoc });
                              setDecision("suspended");
                              setReason("Account suspended by administrative oversight.");
                            }}
                          >
                            Suspend
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="lime"
                            onClick={() => {
                              setActingOn({ user: u, verification: vDoc });
                              setDecision("verified");
                              setReason("Account reinstated after administrative review.");
                            }}
                          >
                            Reinstate
                          </Button>
                        )}
                        </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredUsers.length === 0 && !userLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted">
                    No matching users found under surveillance.
                  </td>
                </tr>
              )}

              {userLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted">
                    Connecting to live platform surveillance...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal for Accept / Suspend / Override Decisions */}
        {actingOn && (
          <Modal
            open={!!actingOn}
            onClose={() => setActingOn(null)}
            title={`Administrative Action: ${STATUS_LABEL[decision]}`}
          >
            <div className="space-y-4">
              <p className="text-sm text-body">
                You are about to transition <strong className="text-strong">{actingOn.user.displayName || actingOn.user.email}</strong> from{" "}
                <strong className="text-forest-700">{STATUS_LABEL[actingOn.verification ? actingOn.verification.status : "unverified"]}</strong> to{" "}
                <strong className={decision === "verified" ? "text-forest-700" : "text-rose-600"}>{STATUS_LABEL[decision]}</strong>.
              </p>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted">Action</label>
                <select
                  value={decision}
                  onChange={(e) => setDecision(e.target.value as VerificationStatus)}
                  className="mt-1 w-full rounded-xl border border-white/20 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-lime-400"
                >
                  {/* Only moves the verification state machine allows from the current status. */}
                  {(actingOn.verification ? ADMIN_TRANSITIONS[actingOn.verification.status] : [])
                    .filter((to) => !(to === "verified" && actingOn.user.role === "brand" && actingOn.verification?.status !== "suspended"))
                    .map((to) => (
                      <option key={to} value={to}>{ACTION_TEXT[to]}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted">Decision Reason / Audit Note</label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Record mandatory reason for security audit logs..."
                  className="mt-1 w-full rounded-xl border border-white/20 bg-black/60 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-lime-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" variant="ghost" onClick={() => setActingOn(null)} disabled={busy}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant={decision === "verified" ? "forest" : "danger"}
                  onClick={handleConfirmDecision}
                  disabled={busy || reason.trim().length < 3}
                >
                  {busy ? "Enforcing on Ledger..." : `Confirm ${STATUS_LABEL[decision]}`}
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </AppShell>
  );
}
