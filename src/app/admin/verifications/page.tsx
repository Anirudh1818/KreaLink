"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { AppShell } from "@/components/AppShell";
import { Button, Modal, Notice } from "@/components/ui/kit";
import { VerificationBadge } from "@/components/auth/AccountUI";
import { applicationSummaryRows } from "@/components/auth/ApplicationForms";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import {
  decideVerification,
  evidenceBelongsTo,
  friendlyAuthError,
  openEvidence,
  purgeEvidence,
} from "@/lib/auth/accountActions";
import { validateGstinFormat } from "@/lib/auth/gstin";
import {
  ADMIN_TRANSITIONS,
  EVIDENCE_RETENTION_DAYS,
  STATUS_LABEL,
  VERIFICATION_STATUSES,
  type VerificationStatus,
} from "@/lib/auth/policy";
import type { BrandApplication, CreatorApplication, UserDoc, VerificationDoc } from "@/lib/auth/schema";
import { AdminHeader, fmtTime, millis, useAuditLog, useVerifications, type WithId } from "../adminData";

const ACTION_LABEL: Record<VerificationStatus, string> = {
  verified: "Approve",
  rejected: "Reject",
  info_required: "Request more information",
  suspended: "Suspend account",
  pending_review: "Return to review",
  unverified: "Reset",
};

const ACTION_VARIANT: Partial<Record<VerificationStatus, "forest" | "danger" | "light">> = {
  verified: "forest",
  rejected: "danger",
  suspended: "danger",
};

function applicantName(v: VerificationDoc): string {
  return v.role === "brand" ? (v.application as BrandApplication).legalName : (v.application as CreatorApplication).displayName;
}

/* ------------------------------------------------------------------ */
/* Validation signals — facts for the reviewer, not a verdict          */
/* ------------------------------------------------------------------ */

type Signal = { tone: "ok" | "warn" | "info"; text: string };

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function signalsFor(v: VerificationDoc, accountEmail: string | null): Signal[] {
  const out: Signal[] = [];
  if (v.role === "brand") {
    const a = v.application as BrandApplication;
    if (a.hasGstin) {
      const f = validateGstinFormat(a.gstin);
      out.push(f.valid
        ? { tone: "ok", text: `GSTIN is well-formed (state: ${f.stateName}). Format only — registration not confirmed.` }
        : { tone: "warn", text: `GSTIN fails structural check: ${f.error}` });
    } else {
      out.push({ tone: "info", text: "No GSTIN — alternative registration path. Review the uploaded registration document." });
    }
    const site = a.website ? hostOf(a.website) : null;
    const repDomain = a.representative.email.split("@")[1]?.toLowerCase() ?? "";
    if (!a.website) out.push({ tone: "info", text: "No website provided." });
    else if (site && repDomain && !repDomain.endsWith(site)) {
      out.push({ tone: "warn", text: `Representative email domain (${repDomain}) differs from website (${site}).` });
    } else if (site) out.push({ tone: "ok", text: `Representative email domain matches website (${site}).` });
    if (!a.hasGstin && v.evidence.length === 0) out.push({ tone: "warn", text: "No supporting documents on file." });
  } else {
    const a = v.application as CreatorApplication;
    out.push({ tone: "info", text: `${a.portfolioLinks.length} portfolio link(s), ${a.sampleWorkLinks.length} sample(s). Open and review the work itself.` });
    if (a.isRegisteredBusiness && a.gstin) {
      const f = validateGstinFormat(a.gstin);
      out.push(f.valid ? { tone: "ok", text: "Optional GSTIN is well-formed (format only)." } : { tone: "warn", text: `Optional GSTIN fails structural check: ${f.error}` });
    }
  }
  if (accountEmail === null) out.push({ tone: "warn", text: "Account record not found for this applicant." });
  out.push({ tone: "info", text: "Automated registry and identity checks are not configured — this is a manual review." });
  return out;
}

/* ------------------------------------------------------------------ */
/* Review panel                                                        */
/* ------------------------------------------------------------------ */

function ReviewPanel({ v, adminUid }: { v: WithId<VerificationDoc>; adminUid: string }) {
  const [account, setAccount] = useState<UserDoc | null | undefined>(undefined);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState<VerificationStatus | "purge" | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "danger" | "info"; text: string } | null>(null);
  const [registry, setRegistry] = useState<string | null>(null);
  // Brands: reviewer must confirm the GSTIN on the official GST portal before approving.
  const [portalChecked, setPortalChecked] = useState(false);
  const needsPortalCheck = v.role === "brand";
  const { rows: history } = useAuditLog(v.uid);

  useEffect(() => {
    let live = true;
    getDoc(doc(db, "users", v.uid))
      .then((s) => live && setAccount(s.exists() ? (s.data() as UserDoc) : null))
      .catch(() => live && setAccount(null));
    return () => {
      live = false;
    };
  }, [v.uid]);

  const isSelf = v.uid === adminUid;
  const signals = signalsFor(v, account === undefined ? "" : account?.email ?? null);

  async function confirmAction() {
    if (!pending) return;
    setBusy(true);
    setMsg(null);
    try {
      if (pending === "purge") {
        await purgeEvidence(adminUid, v, `Retention purge after ${STATUS_LABEL[v.status]} decision`);
        setMsg({ tone: "success", text: "Evidence deleted and purge recorded." });
      } else {
        // Mirror the badge onto the public profile only if it exists.
        let publicProfile: { collection: "creators" | "brands"; id: string } | null = null;
        const id = v.role === "creator" ? account?.creatorUsername : account?.brandId;
        if (id) {
          const exists = await getDoc(doc(db, v.role === "creator" ? "creators" : "brands", id)).then((s) => s.exists()).catch(() => false);
          if (exists) publicProfile = { collection: v.role === "creator" ? "creators" : "brands", id };
        }
        const finalReason =
          pending === "verified" && needsPortalCheck
            ? `${reason.trim()} [GSTIN confirmed Active with matching legal name on the GST portal by reviewer]`
            : reason;
        await decideVerification({ adminUid, target: v, to: pending, reason: finalReason, publicProfile });
        setMsg({ tone: "success", text: `Moved to ${STATUS_LABEL[pending]}. Decision recorded in the audit log.` });
        setReason("");
      }
      setPending(null);
    } catch (err) {
      setMsg({ tone: "danger", text: friendlyAuthError(err) });
    } finally {
      setBusy(false);
    }
  }

  async function viewEvidence(i: number) {
    try {
      const url = await openEvidence(adminUid, v.uid, v.evidence[i]!);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setMsg({ tone: "danger", text: friendlyAuthError(err) });
    }
  }

  async function runRegistry() {
    const a = v.application as BrandApplication;
    setRegistry("Checking…");
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/verification/gstin", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
        body: JSON.stringify({ gstin: a.gstin, legalName: a.legalName, tradeName: a.tradeName }),
      });
      const data = await res.json();
      if (!res.ok) return setRegistry(data.error ?? "Check failed.");
      if (data.provider?.status === "found") {
        const mm = (data.mismatches ?? []) as { field: string; submitted: string; registered: string; severity: string }[];
        setRegistry(mm.length ? `Registry mismatches: ${mm.map((m) => `${m.field} (${m.severity}): submitted "${m.submitted}", registered "${m.registered}"`).join("; ")}` : "Registry record matches submitted details.");
      } else setRegistry(data.message ?? `Registry status: ${data.provider?.status}`);
    } catch {
      setRegistry("Verification service unreachable.");
    }
  }

  const transitions = ADMIN_TRANSITIONS[v.status];
  const canPurge = (v.status === "verified" || v.status === "rejected") && v.evidence.length > 0;
  const kinds = useMemo(() => v.evidence.map((e) => ({ ...e, ok: evidenceBelongsTo(e.path, v.uid) })), [v]);

  return (
    <div className="kl-card space-y-5 p-5 text-strong">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-bold">{applicantName(v)}</h2>
          <p className="text-[12px] text-muted">
            {v.role === "brand" ? "Brand" : "Creator"} · {account === undefined ? "…" : account?.email ?? "no account record"} · submitted {fmtTime(v.submittedAt)}
          </p>
        </div>
        <VerificationBadge status={v.status} />
      </div>

      {isSelf && <Notice tone="warn">This is your own application. Another admin must review it.</Notice>}

      <section className="space-y-2">
        <h3 className="text-[12px] font-bold uppercase tracking-wide text-muted">Submitted details</h3>
        <dl className="grid gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-2">
          {applicationSummaryRows(v.role, v.application).map(([k, val]) => (
            <div key={k} className="min-w-0">
              <dt className="text-[11px] font-semibold text-muted">{k}</dt>
              <dd className="break-words">{val || "—"}</dd>
            </div>
          ))}
        </dl>
        {v.role === "creator" && (
          <ul className="space-y-1 text-[12.5px]">
            {[...(v.application as CreatorApplication).portfolioLinks, ...(v.application as CreatorApplication).sampleWorkLinks].map((l) => (
              <li key={l}>
                <a href={l} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-forest-600 underline">{l}</a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-[12px] font-bold uppercase tracking-wide text-muted">Validation signals</h3>
        <ul className="space-y-1.5 text-[12.5px]">
          {signals.map((s, i) => (
            <li key={i} className="flex gap-2">
              <span className={s.tone === "ok" ? "text-forest-600" : s.tone === "warn" ? "text-amber-600" : "text-muted"}>
                {s.tone === "ok" ? "✓" : s.tone === "warn" ? "⚠" : "•"}
              </span>
              {s.text}
            </li>
          ))}
        </ul>
        {v.role === "brand" && (v.application as BrandApplication).hasGstin && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="forest"
              size="xs"
              icon="arrowUpRight"
              onClick={() => {
                void navigator.clipboard?.writeText((v.application as BrandApplication).gstin).catch(() => {});
                window.open("https://services.gst.gov.in/services/searchtp", "_blank", "noopener,noreferrer");
              }}
            >
              Open GST portal search (GSTIN copied)
            </Button>
            <Button variant="light" size="xs" icon="search" onClick={runRegistry}>Run GST registry check</Button>
            {registry && <span className="text-[12px] text-muted">{registry}</span>}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-[12px] font-bold uppercase tracking-wide text-muted">Evidence ({v.evidence.length})</h3>
        {kinds.length === 0 ? (
          <p className="text-[12.5px] text-muted">No documents uploaded.</p>
        ) : (
          <ul className="space-y-1.5 text-[12.5px]">
            {kinds.map((e, i) => (
              <li key={e.path} className="flex items-center justify-between gap-2 rounded-xl bg-[#f7f8f7] px-3 py-2">
                <span className="min-w-0 truncate">{e.kind} · {e.name}</span>
                {e.ok ? (
                  <Button variant="light" size="xs" icon="eye" onClick={() => viewEvidence(i)}>View (logged)</Button>
                ) : (
                  <span className="text-[11px] text-rose-600">Invalid reference</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {!isSelf && (
        <section className="space-y-3 border-t border-line pt-4">
          <h3 className="text-[12px] font-bold uppercase tracking-wide text-muted">Decision</h3>
          {transitions.length === 0 ? (
            <p className="text-[12.5px] text-muted">No admin decisions are available from this state.</p>
          ) : (
            <>
              <textarea
                className="kl-input"
                rows={3}
                maxLength={1000}
                placeholder="Reason (shown to the applicant for rejections, info requests and suspensions)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              {needsPortalCheck && transitions.includes("verified") && (
                <label className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-[12px] text-[#6b4b07]">
                  <input type="checkbox" checked={portalChecked} onChange={(e) => setPortalChecked(e.target.checked)} className="mt-0.5" />
                  <span>
                    I searched GSTIN <span className="font-mono font-semibold">{(v.application as BrandApplication).gstin}</span> on the
                    official GST portal: the status is <b>Active</b> and the legal name matches <b>{(v.application as BrandApplication).legalName}</b>.
                    Required to approve.
                  </span>
                </label>
              )}
              <div className="flex flex-wrap gap-2">
                {transitions.map((to) => (
                  <Button key={to} variant={ACTION_VARIANT[to] ?? "light"} size="sm" disabled={busy || reason.trim().length < 3 || (to === "verified" && needsPortalCheck && !portalChecked)} onClick={() => setPending(to)}>
                    {ACTION_LABEL[to]}
                  </Button>
                ))}
              </div>
              {reason.trim().length < 3 && <p className="text-[11px] text-muted">A reason is required for every decision.</p>}
            </>
          )}
          {canPurge && (
            <Button variant="danger" size="xs" icon="x" disabled={busy} onClick={() => setPending("purge")}>
              Delete evidence (retention: {EVIDENCE_RETENTION_DAYS} days after decision)
            </Button>
          )}
        </section>
      )}

      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      <section className="space-y-2 border-t border-line pt-4">
        <h3 className="text-[12px] font-bold uppercase tracking-wide text-muted">History</h3>
        {history.length === 0 ? (
          <p className="text-[12.5px] text-muted">No admin actions yet.</p>
        ) : (
          <ul className="space-y-1.5 text-[12px]">
            {history.map((h) => (
              <li key={h.id}>
                <span className="font-semibold">{h.action}</span>
                {h.fromStatus && h.toStatus && ` · ${STATUS_LABEL[h.fromStatus]} → ${STATUS_LABEL[h.toStatus]}`} · {fmtTime(h.at)} · by{" "}
                {h.actorUid === adminUid ? "you" : `${h.actorUid.slice(0, 8)}…`} — {h.reason}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal
        open={pending !== null}
        onClose={() => !busy && setPending(null)}
        title={pending === "purge" ? "Delete evidence?" : `${pending ? ACTION_LABEL[pending] : ""}?`}
        subtitle={applicantName(v)}
        icon="shield"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="light" onClick={() => setPending(null)} disabled={busy}>Cancel</Button>
            <Button variant={pending === "verified" ? "forest" : "danger"} onClick={confirmAction} disabled={busy}>
              {busy ? "Saving…" : "Confirm"}
            </Button>
          </div>
        }
      >
        <p className="text-[13px] text-body">
          {pending === "purge"
            ? `This permanently deletes ${v.evidence.length} document(s) for this applicant. The deletion is recorded in the audit log.`
            : pending
            ? `Change status from ${STATUS_LABEL[v.status]} to ${STATUS_LABEL[pending]}. This is recorded in the audit log with your account and reason: “${reason.trim()}”.`
            : ""}
        </p>
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Queue                                                               */
/* ------------------------------------------------------------------ */

function Queue() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuth();
  const { rows, error, loading } = useVerifications();
  const statusParam = params.get("status") as VerificationStatus | null;
  const status: VerificationStatus = statusParam && VERIFICATION_STATUSES.includes(statusParam) ? statusParam : "pending_review";
  const [role, setRole] = useState<"all" | "brand" | "creator">("all");
  const [selected, setSelected] = useState<string | null>(null);

  const list = rows
    .filter((r) => r.status === status && (role === "all" || r.role === role))
    .sort((a, b) => millis(a.submittedAt) - millis(b.submittedAt)); // oldest first
  const current = list.find((r) => r.id === selected) ?? list[0] ?? null;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-5 px-4 pb-16 pt-6">
        <AdminHeader title="Verification queue" subtitle="Review brand and creator applications. Every decision is audited." />
        {error && <Notice tone="danger">{error}</Notice>}

        <div className="flex flex-wrap items-center gap-2">
          {VERIFICATION_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => router.replace(`/admin/verifications?status=${s}`)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${s === status ? "kl-btn-lime" : "kl-pill-dark hover:text-white"}`}
            >
              {STATUS_LABEL[s]} ({rows.filter((r) => r.status === s).length})
            </button>
          ))}
          <select className="kl-pill-dark ml-auto px-3 py-1.5 text-[12px] outline-none" value={role} onChange={(e) => setRole(e.target.value as typeof role)} aria-label="Role">
            <option value="all" className="bg-[#0c1017]">All roles</option>
            <option value="brand" className="bg-[#0c1017]">Brands</option>
            <option value="creator" className="bg-[#0c1017]">Creators</option>
          </select>
        </div>

        <div className="grid gap-5 lg:grid-cols-12">
          <div className="space-y-2 lg:col-span-4">
            {loading ? (
              <p className="text-[13px] text-white/50">Loading…</p>
            ) : list.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-[12.5px] text-white/50">Nothing in this queue.</p>
            ) : (
              list.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelected(r.id)}
                  className={`w-full rounded-2xl p-4 text-left transition ${current?.id === r.id ? "bg-white text-strong" : "bg-white/[0.04] text-white hover:bg-white/[0.08]"}`}
                >
                  <p className="truncate text-[13px] font-bold">{applicantName(r)}</p>
                  <p className={`text-[11.5px] ${current?.id === r.id ? "text-muted" : "text-white/50"}`}>
                    {r.role === "brand" ? "Brand" : "Creator"} · {fmtTime(r.submittedAt)}
                  </p>
                </button>
              ))
            )}
          </div>
          <div className="lg:col-span-8">
            {current && user ? <ReviewPanel key={current.id} v={current} adminUid={user.uid} /> : null}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function AdminVerificationsPage() {
  return (
    <Suspense fallback={null}>
      <Queue />
    </Suspense>
  );
}
