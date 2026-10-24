"use client";

/**
 * Shared engagement UI: agent proposal review, selection dialog, agreed terms,
 * next-step prompts and production progress. Used by the Brand Hub, the
 * Pipeline page and the Creator Studio. `tone` adapts to dark/light surfaces.
 */

import { useState } from "react";
import type { MatchResult2 } from "@/lib/ai/matchingEngine2";
import type { CreativeBrief } from "@/lib/types";
import {
  STRONG_MATCH_THRESHOLD,
  buildAgreedLicense,
  compareLicensesForBrief,
  deliverySpecsForBrief,
  nextStepFor,
  offerSource,
  selectCreator,
  setAgentAction,
  type AgentShortlistResult,
  type AgreedLicense,
  type Engagement,
  type LicenseTerm,
  type Side,
} from "@/lib/r2";

export type Tone = "dark" | "light";

const T = {
  dark: {
    card: "rounded-2xl border border-white/10 bg-white/[0.03] p-4",
    inner: "rounded-xl border border-white/10 bg-white/[0.04] p-3",
    text: "text-white",
    muted: "text-white/50",
    input: "w-full rounded-xl bg-white/[0.05] border border-white/10 px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-lime-400/50",
    primary: "rounded-xl bg-lime-400 px-3 py-1.5 text-xs font-bold text-black hover:bg-lime-300 disabled:opacity-40",
    ghost: "rounded-xl border border-white/15 px-3 py-1.5 text-xs font-bold text-white/70 hover:bg-white/5 disabled:opacity-40",
    warn: "rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300",
    danger: "rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300",
    ok: "rounded-xl border border-lime-500/30 bg-lime-500/10 p-3 text-xs text-lime-300",
  },
  light: {
    card: "rounded-2xl border border-slate-200 bg-white p-4",
    inner: "rounded-xl border border-slate-200 bg-slate-50 p-3",
    text: "text-slate-900",
    muted: "text-slate-500",
    input: "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-500",
    primary: "rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-40",
    ghost: "rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40",
    warn: "rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800",
    danger: "rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800",
    ok: "rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800",
  },
} as const;

const fmt = (v: LicenseTerm[keyof LicenseTerm]) => (Array.isArray(v) ? v.join(", ") : v);

const LICENSE_FIELDS: { key: keyof LicenseTerm; label: string }[] = [
  { key: "usageType", label: "Usage" },
  { key: "territory", label: "Territory" },
  { key: "duration", label: "Duration" },
  { key: "platforms", label: "Platforms" },
  { key: "exclusivity", label: "Exclusivity" },
];

/* ------------------------------------------------------------------ */
/* Agent proposal review (accept / edit / reject)                      */
/* ------------------------------------------------------------------ */

export function AgentReview({
  result,
  ranked,
  onApply,
  tone = "dark",
}: {
  result: AgentShortlistResult;
  ranked: MatchResult2[];
  onApply: () => void;
  tone?: Tone;
}) {
  const t = T[tone];
  const [editing, setEditing] = useState<string | null>(null);
  const [swapTo, setSwapTo] = useState("");
  const [note, setNote] = useState("");

  const proposed = new Set(result.actions.map((a) => a.creatorId));
  const decided = result.actions.filter((a) => a.status !== "pending").length;
  const toAdd = result.actions.filter((a) => a.status === "accepted" || a.status === "edited").length;

  function saveEdit(actionId: string) {
    const m = ranked.find((r) => r.creator.username === swapTo);
    setAgentAction(result.briefId, actionId, "edited", {
      editedValue: note.trim() || undefined,
      ...(m ? { creatorId: m.creator.username, score: m.overallScore, reason: m.whyExplanation } : {}),
    });
    setEditing(null);
    setSwapTo("");
    setNote("");
  }

  return (
    <div className={`${t.card} space-y-3`}>
      <div>
        <p className={`text-sm font-bold ${t.text}`}>🤖 Agent proposals</p>
        <p className={`text-[11px] ${t.muted}`}>{result.summary}</p>
      </div>

      {result.conflicts && result.conflicts.length > 0 && (
        <div className={t.warn}>
          <p className="font-bold">Conflicting requirements in this brief</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {result.conflicts.map((c) => <li key={c}>{c}</li>)}
          </ul>
        </div>
      )}

      {result.actions.length === 0 && (
        <div className={t.warn}>
          <p className="font-bold">No creator meets the {STRONG_MATCH_THRESHOLD}% match bar — nothing was shortlisted.</p>
          {result.weakAlternatives && result.weakAlternatives.length > 0 && (
            <ul className="mt-1 space-y-1">
              {result.weakAlternatives.map((w) => (
                <li key={w.creatorId}>
                  <span className="font-semibold">@{w.creatorId}</span> · {w.score}% — {w.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ul className="space-y-2">
        {result.actions.map((a) => (
          <li key={a.id} className={`${t.inner} space-y-2`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-bold ${t.text}`}>{a.description}</p>
                {a.originalCreatorId && <p className={`text-[10px] ${t.muted}`}>Agent proposed @{a.originalCreatorId}; you swapped it.</p>}
                <p className={`text-[11px] ${t.muted} line-clamp-2`}>{a.reason}</p>
                {a.editedValue && <p className={`text-[11px] ${t.muted}`}>Your note: {a.editedValue}</p>}
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  a.status === "accepted" || a.status === "edited"
                    ? "bg-lime-500/20 text-lime-600"
                    : a.status === "rejected"
                    ? "bg-rose-500/20 text-rose-500"
                    : "bg-amber-500/20 text-amber-600"
                }`}
              >
                {a.status}
              </span>
            </div>
            {!result.applied && (
              <div className="flex flex-wrap gap-1.5">
                <button className={t.primary} onClick={() => setAgentAction(result.briefId, a.id, "accepted")}>Accept</button>
                <button className={t.ghost} onClick={() => { setEditing(a.id); setSwapTo(""); setNote(a.editedValue ?? ""); }}>Edit</button>
                <button className={t.ghost} onClick={() => setAgentAction(result.briefId, a.id, "rejected")}>Reject</button>
              </div>
            )}
            {editing === a.id && (
              <div className="space-y-2">
                <select className={t.input} value={swapTo} onChange={(e) => setSwapTo(e.target.value)} aria-label="Swap creator">
                  <option value="">Keep @{a.creatorId}</option>
                  {ranked
                    .filter((r) => !proposed.has(r.creator.username))
                    .map((r) => (
                      <option key={r.creator.username} value={r.creator.username}>
                        Swap for @{r.creator.username} ({r.overallScore}%)
                      </option>
                    ))}
                </select>
                <input className={t.input} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
                <div className="flex gap-1.5">
                  <button className={t.primary} onClick={() => saveEdit(a.id)}>Save edit</button>
                  <button className={t.ghost} onClick={() => setEditing(null)}>Cancel</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {result.actions.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={`text-[11px] ${t.muted}`}>
            {result.applied ? "Applied to the pipeline." : `${decided}/${result.actions.length} reviewed · ${toAdd} to add`}
          </p>
          {!result.applied && (
            <button className={t.primary} disabled={toAdd === 0} onClick={onApply}>
              Add {toAdd} to shortlist
            </button>
          )}
        </div>
      )}
      <p className={`text-[11px] ${t.muted}`}>Next: {result.nextStep}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Selection: confirm scope, timeline, requirements and licence        */
/* ------------------------------------------------------------------ */

export function SelectionPanel({
  eng,
  brief,
  onDone,
  tone = "dark",
}: {
  eng: Engagement;
  brief: CreativeBrief;
  onDone?: () => void;
  tone?: Tone;
}) {
  const t = T[tone];
  const specs = deliverySpecsForBrief(brief);
  const cmp = compareLicensesForBrief(brief, eng.creatorId);
  const blocking = cmp.mismatches.filter((m) => m.severity === "blocking");
  const [scope, setScope] = useState(eng.scope ?? brief.deliverables.join("; "));
  const [timeline, setTimeline] = useState(eng.timeline ?? "2 weeks");
  const [requirements, setRequirements] = useState(
    eng.requirements ??
      `${specs.aspectRatio}${specs.durationSec ? `, ${specs.durationSec}s` : ""}, min ${specs.minShortSide}px short side · ${brief.platform}`
  );
  const [override, setOverride] = useState("");
  const canConfirm = scope.trim().length >= 3 && timeline.trim().length >= 2 && requirements.trim().length >= 3 && (blocking.length === 0 || override.trim().length >= 10);

  function confirm() {
    selectCreator(eng.id, {
      scope: scope.trim(),
      timeline: timeline.trim(),
      requirements: requirements.trim(),
      agreedLicense: buildAgreedLicense(brief, eng.creatorId, override),
    });
    onDone?.();
  }

  return (
    <div className={`${t.card} space-y-3`}>
      <p className={`text-sm font-bold ${t.text}`}>Select @{eng.creatorId} &amp; confirm terms</p>
      <label className="block space-y-1">
        <span className={`text-[11px] font-semibold ${t.muted}`}>Scope</span>
        <textarea className={t.input} rows={2} value={scope} onChange={(e) => setScope(e.target.value)} />
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className={`text-[11px] font-semibold ${t.muted}`}>Timeline</span>
          <input className={t.input} value={timeline} onChange={(e) => setTimeline(e.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className={`text-[11px] font-semibold ${t.muted}`}>Technical requirements</span>
          <input className={t.input} value={requirements} onChange={(e) => setRequirements(e.target.value)} />
        </label>
      </div>
      <LicenseTable terms={cmp.brandRequires} offers={cmp.creatorOffers} mismatches={cmp.mismatches} tone={tone} />
      {offerSource(eng.creatorId) === "default" && (
        <p className={`text-[10px] ${t.muted}`}>This creator hasn&apos;t published licence terms; the platform default is shown.</p>
      )}
      {blocking.length > 0 && (
        <div className={t.danger}>
          <p className="font-bold">Blocking licence mismatch — resolve before selecting</p>
          <textarea
            className={`${t.input} mt-2`}
            rows={2}
            placeholder="How was this resolved? e.g. creator agreed in writing to worldwide rights for this campaign"
            value={override}
            onChange={(e) => setOverride(e.target.value)}
          />
        </div>
      )}
      <div className="flex justify-end gap-2">
        {onDone && <button className={t.ghost} onClick={onDone}>Cancel</button>}
        <button className={t.primary} disabled={!canConfirm} onClick={confirm}>Confirm selection</button>
      </div>
    </div>
  );
}

export function LicenseTable({
  terms,
  offers,
  mismatches,
  tone = "dark",
}: {
  terms: LicenseTerm;
  offers: LicenseTerm;
  mismatches: AgreedLicense["mismatches"];
  tone?: Tone;
}) {
  const t = T[tone];
  return (
    <table className="w-full text-[11px]">
      <thead>
        <tr className={`text-left text-[10px] uppercase tracking-wider ${t.muted}`}>
          <th className="pb-1 font-semibold">Term</th>
          <th className="pb-1 font-semibold">Brief needs</th>
          <th className="pb-1 font-semibold">Creator offers</th>
        </tr>
      </thead>
      <tbody>
        {LICENSE_FIELDS.map(({ key, label }) => {
          const m = mismatches.find((x) => x.field === key);
          return (
            <tr key={key}>
              <td className={`py-1 ${t.muted}`}>{label}</td>
              <td className={`py-1 font-mono ${t.text}`}>{fmt(terms[key])}</td>
              <td className={`py-1 font-mono ${m ? (m.severity === "blocking" ? "text-rose-500 font-bold" : "text-amber-500 font-bold") : t.text}`}>
                {fmt(offers[key])} {m ? `⚠ ${m.severity}` : ""}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ------------------------------------------------------------------ */
/* Agreed terms (carried from selection through delivery)              */
/* ------------------------------------------------------------------ */

export function AgreedTermsCard({ eng, tone = "dark" }: { eng: Engagement; tone?: Tone }) {
  const t = T[tone];
  if (!eng.agreedLicense && !eng.scope) return null;
  const a = eng.agreedLicense;
  return (
    <div className={`${t.card} space-y-2`}>
      <p className={`text-sm font-bold ${t.text}`}>📄 Agreed terms</p>
      <dl className="grid gap-1 text-[11px] sm:grid-cols-3">
        <div><dt className={t.muted}>Scope</dt><dd className={t.text}>{eng.scope ?? "—"}</dd></div>
        <div><dt className={t.muted}>Timeline</dt><dd className={t.text}>{eng.timeline ?? "—"}</dd></div>
        <div><dt className={t.muted}>Requirements</dt><dd className={t.text}>{eng.requirements ?? "—"}</dd></div>
      </dl>
      {a && (
        <>
          <LicenseTable terms={a.terms} offers={a.creatorOffers} mismatches={a.mismatches} tone={tone} />
          {a.overrideNote && <p className={`text-[11px] ${t.muted}`}>Resolution: {a.overrideNote}</p>}
          <p className={`text-[10px] ${t.muted}`}>Locked at selection on {new Date(a.agreedAt).toLocaleString()} — applies through delivery.</p>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Next step + progress                                                */
/* ------------------------------------------------------------------ */

export function NextStepBanner({ eng, side, tone = "dark" }: { eng: Engagement; side: Side; tone?: Tone }) {
  const t = T[tone];
  const step = nextStepFor(eng, side);
  if (!step) return null;
  return (
    <div className={step.action ? t.ok : t.inner}>
      <span className="font-bold">{step.action ? "🤖 Your next step: " : "⏳ "}</span>
      <span className={step.action ? "" : t.muted}>{step.text}</span>
    </div>
  );
}

export function ProgressFeed({ eng, tone = "dark" }: { eng: Engagement; tone?: Tone }) {
  const t = T[tone];
  const items = [...(eng.progress ?? [])].reverse();
  if (items.length === 0) return <p className={`text-[11px] ${t.muted}`}>No production updates yet.</p>;
  const latestPct = items.find((p) => p.percent !== undefined)?.percent;
  return (
    <div className="space-y-2">
      {latestPct !== undefined && (
        <div className="h-1.5 rounded-full bg-slate-400/20">
          <div className="h-full rounded-full bg-lime-400" style={{ width: `${latestPct}%` }} />
        </div>
      )}
      <ul className="space-y-1.5">
        {items.map((p) => (
          <li key={p.at} className={`text-[11px] ${t.text}`}>
            <span className={t.muted}>{new Date(p.at).toLocaleString()} · {p.by}{p.percent !== undefined ? ` · ${p.percent}%` : ""}</span>
            <br />
            {p.note}
          </li>
        ))}
      </ul>
    </div>
  );
}
