"use client";

import { useMemo, useState } from "react";
import {
  PIPELINE_STAGES,
  STAGE_LABEL,
  advanceStage,
  checkMediaAgainstSpecs,
  createVersion,
  creatorRespond,
  deliverySpecsForBrief,
  detectAspectRatio,
  extractVideoMeta,
  getEngagementsForCreator,
  getVersions,
  metaFromInputs,
  parseResolution,
  stageIndex,
  submitVersion,
  type DeliveryIssue,
  type DeliverySpecs,
  type Engagement,
  type Version,
} from "@/lib/r2";
import { useR2Revision } from "@/lib/r2/useR2";

const DEFAULT_SPECS: DeliverySpecs = { aspectRatio: "9:16", minShortSide: 720 };

const VERSION_PILL: Record<Version["status"], string> = {
  in_progress: "bg-slate-100 text-slate-700",
  submitted: "bg-amber-100 text-amber-800",
  requested: "bg-rose-100 text-rose-800",
  approved: "bg-emerald-100 text-emerald-800",
};

const VERSION_LABEL: Record<Version["status"], string> = {
  in_progress: "In progress",
  submitted: "Reviewing",
  requested: "Changes requested",
  approved: "Approved",
};

/* ------------------------------------------------------------------ */
/* Submit form + live delivery check                                   */
/* ------------------------------------------------------------------ */

function SubmitVersionForm({ eng, nextVersion }: { eng: Engagement; nextVersion: number }) {
  const specs = useMemo(() => (eng.brief ? deliverySpecsForBrief(eng.brief) : DEFAULT_SPECS), [eng.brief]);

  const [assetUrl, setAssetUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [aspectRatio, setAspectRatio] = useState("");
  const [resolution, setResolution] = useState("");
  const [duration, setDuration] = useState(specs.durationSec ? String(specs.durationSec) : "");
  const [probing, setProbing] = useState(false);
  const [probeError, setProbeError] = useState("");

  const durationSec = duration.trim() ? Number(duration) : undefined;
  const parsedRes = parseResolution(resolution);
  const detectedRatio = parsedRes ? detectAspectRatio(parsedRes.width, parsedRes.height) : null;

  const meta = useMemo(() => {
    const m = metaFromInputs(resolution, Number.isFinite(durationSec) ? durationSec : undefined);
    const declared = aspectRatio.trim();
    return declared ? { ...m, aspectRatio: declared } : m;
  }, [resolution, durationSec, aspectRatio]);

  const issues = useMemo<DeliveryIssue[]>(() => {
    const list = checkMediaAgainstSpecs(meta, specs);
    if (detectedRatio && aspectRatio.trim() && aspectRatio.trim() !== detectedRatio) {
      list.push({
        severity: "error",
        field: "aspectRatio",
        message: `Resolution ${meta.resolution} is ${detectedRatio}, but you declared ${aspectRatio.trim()}.`,
        fix: "Fix the declared ratio or re-export at the correct resolution.",
      });
    }
    if (!parsedRes) {
      list.push({
        severity: "error",
        field: "resolution",
        message: "Enter the export resolution, e.g. 1080×1920.",
        fix: "Use WIDTHxHEIGHT in pixels.",
      });
    }
    if (durationSec === undefined || !Number.isFinite(durationSec)) {
      list.push({
        severity: specs.durationSec ? "error" : "warn",
        field: "duration",
        message: "Enter the clip duration in seconds.",
        fix: "Check your editor's export summary.",
      });
    }
    return list;
  }, [meta, specs, detectedRatio, aspectRatio, parsedRes, durationSec]);

  const hasErrors = issues.some((i) => i.severity === "error");
  const canSubmit = assetUrl.trim() !== "" && !hasErrors;

  const rows: { label: string; expected: string; actual: string; field: DeliveryIssue["field"] }[] = [
    { label: "Aspect ratio", expected: specs.aspectRatio, actual: meta.aspectRatio, field: "aspectRatio" },
    {
      label: "Duration",
      expected: specs.durationSec ? `${specs.durationSec}s ±20%` : "any",
      actual: durationSec !== undefined && Number.isFinite(durationSec) ? `${durationSec}s` : "—",
      field: "duration",
    },
    { label: "Resolution", expected: `≥${specs.minShortSide}px short side`, actual: meta.resolution, field: "resolution" },
  ];

  async function handleProbe() {
    setProbing(true);
    setProbeError("");
    try {
      const m = await extractVideoMeta(assetUrl.trim());
      setResolution(`${m.width}x${m.height}`);
      setAspectRatio(m.aspectRatio);
      if (m.durationSec !== undefined) setDuration(String(m.durationSec));
    } catch {
      setProbeError("Couldn't read this file's metadata (it may block cross-origin access). Enter the specs manually.");
    } finally {
      setProbing(false);
    }
  }

  function handleSubmit() {
    if (!canSubmit) return;
    const changeLog = notes.trim() || `v${nextVersion} submission`;
    const v = createVersion(eng.id, changeLog, assetUrl.trim());
    submitVersion(v.id, assetUrl.trim(), meta);
    advanceStage(eng.id, "delivered", `v${v.n} submitted for review`, "creator");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3">
        <h5 className="text-xs font-bold text-slate-900">Submit v{nextVersion}</h5>
        <label className="block space-y-1">
          <span className="text-[11px] font-semibold text-slate-600">Asset URL</span>
          <div className="flex gap-2">
            <input
              type="url"
              value={assetUrl}
              onChange={(e) => setAssetUrl(e.target.value)}
              placeholder="https://… or /reels/reel-01.mp4"
              className="kl-input text-xs"
            />
            <button
              type="button"
              onClick={handleProbe}
              disabled={!assetUrl.trim() || probing}
              className="shrink-0 px-3 rounded-xl border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {probing ? "Reading…" : "Auto-detect"}
            </button>
          </div>
          {probeError && <span className="block text-[10px] text-amber-700">{probeError}</span>}
        </label>

        <div className="grid grid-cols-3 gap-2">
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-slate-600">Aspect ratio</span>
            <input
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              placeholder={detectedRatio ?? specs.aspectRatio}
              className="kl-input text-xs"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-slate-600">Resolution</span>
            <input
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="1080x1920"
              className="kl-input text-xs"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-slate-600">Duration (s)</span>
            <input
              type="number"
              min={0}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="15"
              className="kl-input text-xs"
            />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-[11px] font-semibold text-slate-600">Notes for the brand</span>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What changed in this version?"
            className="kl-input text-xs"
          />
        </label>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h5 className="text-xs font-bold text-slate-900">Delivery check preview</h5>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              hasErrors ? "bg-rose-100 text-rose-700" : issues.length > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {hasErrors ? "✗ Fails brief" : issues.length > 0 ? "⚠ Warnings" : "✓ Ready"}
          </span>
        </div>

        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400">
              <th className="font-semibold pb-1">Check</th>
              <th className="font-semibold pb-1">Brief</th>
              <th className="font-semibold pb-1">Yours</th>
              <th className="pb-1" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const issue = issues.find((i) => i.field === r.field);
              return (
                <tr key={r.label} className="border-t border-slate-100">
                  <td className="py-1.5 text-slate-500">{r.label}</td>
                  <td className="py-1.5 font-mono text-slate-700">{r.expected}</td>
                  <td className="py-1.5 font-mono text-slate-900">{r.actual}</td>
                  <td
                    className={`py-1.5 text-right font-bold ${
                      !issue ? "text-emerald-600" : issue.severity === "error" ? "text-rose-600" : "text-amber-600"
                    }`}
                  >
                    {!issue ? "✓" : issue.severity === "error" ? "✗" : "⚠"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {issues.length > 0 && (
          <ul className="space-y-1.5">
            {issues.map((i, idx) => (
              <li
                key={idx}
                className={`rounded-lg p-2 text-[11px] ${
                  i.severity === "error" ? "bg-rose-50 text-rose-800" : "bg-amber-50 text-amber-800"
                }`}
              >
                <span className="font-bold">{i.message}</span> {i.fix}
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition disabled:opacity-50"
        >
          Submit v{nextVersion} for review →
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Engagement card                                                     */
/* ------------------------------------------------------------------ */

function EngagementCard({ eng, versions }: { eng: Engagement; versions: Version[] }) {
  const idx = stageIndex(eng.stage);
  const canSubmit = eng.stage === "production" || eng.stage === "changes_requested";
  const lastRequested = [...versions].reverse().find((v) => v.status === "requested");
  const latestFeedback = lastRequested?.feedback[lastRequested.feedback.length - 1];

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-slate-900">{eng.campaignTitle ?? eng.briefId}</h4>
          <p className="text-[11px] text-slate-500">
            {eng.brandName ?? "Brand"}
            {eng.brief && ` · ${eng.brief.contentType} · ${eng.brief.aspectRatio}`}
          </p>
        </div>
        <span className="self-start px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
          {STAGE_LABEL[eng.stage]}
        </span>
      </div>

      {eng.stage !== "declined" && (
        <div className="flex items-center gap-1" aria-label={`Stage ${idx + 1} of ${PIPELINE_STAGES.length}`}>
          {PIPELINE_STAGES.map((s, i) => (
            <div key={s} title={STAGE_LABEL[s]} className={`h-1.5 flex-1 rounded-full ${i <= idx ? "bg-emerald-500" : "bg-slate-200"}`} />
          ))}
        </div>
      )}

      {eng.stage === "contacted" && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 flex-1">This brand invited you to collaborate.</span>
          <button
            type="button"
            onClick={() => creatorRespond(eng.id, false)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-white"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => creatorRespond(eng.id, true)}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
          >
            Accept
          </button>
        </div>
      )}

      {(eng.stage === "accepted" || eng.stage === "selected") && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 flex-1">You&apos;ve accepted — start production when ready.</span>
          <button
            type="button"
            onClick={() => advanceStage(eng.id, "production", "Creator started production", "creator")}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
          >
            Start production
          </button>
        </div>
      )}

      {eng.stage === "changes_requested" && latestFeedback && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
          <span className="font-bold">Brand feedback: </span>
          {latestFeedback.text}
        </div>
      )}

      {canSubmit && <SubmitVersionForm eng={eng} nextVersion={versions.length + 1} />}

      {versions.length > 0 && (
        <div className="space-y-2 pt-3 border-t border-slate-200">
          <h5 className="text-[11px] font-bold font-mono uppercase tracking-wider text-slate-600">Versions</h5>
          {[...versions].reverse().map((v) => (
            <div key={v.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">
                  v{v.n} · {v.changeLog}
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  {v.submittedAt ? new Date(v.submittedAt).toLocaleString() : "Not submitted"}
                  {v.mediaMeta && ` · ${v.mediaMeta.aspectRatio} · ${v.mediaMeta.resolution}`}
                  {v.mediaMeta?.durationSec !== undefined && ` · ${v.mediaMeta.durationSec}s`}
                </p>
              </div>
              <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold ${VERSION_PILL[v.status]}`}>
                {VERSION_LABEL[v.status]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab body                                                            */
/* ------------------------------------------------------------------ */

export function ActiveEngagements({ creatorUsername }: { creatorUsername: string }) {
  const rev = useR2Revision();
  const engagements = useMemo(
    () => (rev ? getEngagementsForCreator(creatorUsername) : []),
    [rev, creatorUsername]
  );
  const versionsByEng = useMemo(
    () => new Map(engagements.map((e) => [e.id, getVersions(e.id)])),
    [engagements]
  );

  if (engagements.length === 0) {
    return (
      <div className="rounded-3xl bg-white text-slate-900 p-10 text-center space-y-2">
        <p className="text-sm font-bold">No active engagements for @{creatorUsername}</p>
        <p className="text-xs text-slate-500">
          When a brand shortlists or invites you from the Brand Hub, the engagement shows up here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white text-slate-900 p-6 md:p-8 shadow-2xl border border-slate-100 space-y-5">
      {engagements.map((eng) => (
        <EngagementCard key={eng.id} eng={eng} versions={versionsByEng.get(eng.id) ?? []} />
      ))}
    </div>
  );
}

/** Count for the tab label. */
export function useActiveEngagementCount(creatorUsername: string): number {
  const rev = useR2Revision();
  return useMemo(() => (rev ? getEngagementsForCreator(creatorUsername).length : 0), [rev, creatorUsername]);
}
