"use client";

import Link from "next/link";
import { useState } from "react";
import type { CreativeBrief } from "@/lib/types";
import { decideApplication, useApplications, type JobApplication } from "@/lib/jobs/store";

const STATUS_STYLE: Record<JobApplication["status"], string> = {
  applied: "bg-amber-100 text-amber-800",
  shortlisted: "bg-emerald-100 text-emerald-800",
  declined: "bg-rose-100 text-rose-700",
  withdrawn: "bg-slate-100 text-slate-500",
};

/**
 * Applicants for the brand's jobs. Shortlisting opens a pipeline engagement
 * (shared with the creator's account when both are real accounts).
 */
export function BrandApplicants({
  brandUid,
  brandName,
  briefs,
  selectedBriefId,
}: {
  brandUid: string | null;
  brandName: string;
  briefs: CreativeBrief[];
  selectedBriefId: string;
}) {
  const apps = useApplications({ field: "brandOwnerUid", uid: brandUid });
  const [scope, setScope] = useState<"job" | "all">("job");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const shown = scope === "job" ? apps.filter((a) => a.briefId === selectedBriefId) : apps;
  const pending = apps.filter((a) => a.status === "applied").length;

  async function decide(app: JobApplication, status: "shortlisted" | "declined") {
    setBusyId(app.id);
    setError("");
    try {
      await decideApplication(app, status, {
        brief: briefs.find((b) => b.id === app.briefId),
        brandUid: brandUid ?? undefined,
        brandName,
      });
    } catch {
      setError("Couldn't update that application. Refresh and try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="kl-card p-5 text-slate-900 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold">Applicants {pending > 0 && <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">{pending} new</span>}</h3>
          <p className="text-[11px] text-slate-500">Creators who applied to your jobs. Shortlist to start an engagement.</p>
        </div>
        <div className="inline-flex rounded-full bg-slate-100 p-1 text-[11px] font-semibold">
          {(["job", "all"] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={scope === s}
              onClick={() => setScope(s)}
              className={`rounded-full px-3 py-1 transition ${scope === s ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
            >
              {s === "job" ? "This job" : `All jobs (${apps.length})`}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
      {shown.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-500">
          No applications yet. Creators see your published jobs under <span className="font-semibold">Find Jobs</span>.
        </p>
      ) : (
        <ul className="space-y-2">
          {shown.map((a) => (
            <li key={a.id} className="kl-card-soft p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/${a.creatorUsername}`} className="text-sm font-bold hover:text-emerald-700">
                    {a.creatorName} <span className="font-normal text-slate-500">@{a.creatorUsername}</span>
                  </Link>
                  <p className="text-[11px] text-slate-500">
                    {scope === "all" && `${a.briefTitle} · `}applied {new Date(a.createdAt).toLocaleString()}
                    {a.source === "local" && " · demo (this device)"}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS_STYLE[a.status]}`}>{a.status}</span>
              </div>
              <p className="text-xs text-slate-700">“{a.pitch}”</p>
              {a.status === "applied" && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busyId === a.id}
                    onClick={() => decide(a, "shortlisted")}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Shortlist →
                  </button>
                  <button
                    type="button"
                    disabled={busyId === a.id}
                    onClick={() => decide(a, "declined")}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
