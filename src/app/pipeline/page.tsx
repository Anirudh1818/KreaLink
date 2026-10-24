"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { rankCreatorsForBrief2, type MatchResult2 } from "@/lib/ai/matchingEngine2";
import { DEMO_BRIEFS } from "@/lib/demoData";
import type { CreativeBrief } from "@/lib/types";
import {
  PIPELINE_STAGES,
  STAGE_LABEL,
  acceptAllAndApply,
  advanceStage,
  approveVersion,
  checkMediaAgainstSpecs,
  compareLicensesForBrief,
  createVersion,
  deliverySpecsForBrief,
  flatCreators,
  getAllEngagements,
  getVersions,
  requestRevision,
  runAutoShortlistForBrief,
  shortlistCreator,
  stageIndex,
  stepStage,
  submitVersion,
  type AgentShortlistResult,
  type Engagement,
  type LicenseComparison,
  type LicenseTerm,
  type Version,
} from "@/lib/r2";
import { useR2Revision } from "@/lib/r2/useR2";

// ─── Demo brief ───────────────────────────────────────────────────────────────

const GLOWCO_BRIEF: CreativeBrief = {
  id: "brief-001",
  brandId: "glowco",
  brandName: "GlowCo",
  campaignName: "GlowCo Skincare Launch",
  requirements:
    "Premium 20-second launch reel for our vitamin C serum. Minimalist luxury, natural light. Worldwide paid social usage for 12 months, non-exclusive.",
  contentType: "Short-form Video (Reels/TikTok)",
  style: ["Minimalist", "Luxury Aesthetic", "Natural Lighting"],
  platform: "Instagram Reels & TikTok",
  aspectRatio: "9:16 Vertical (Reels/Shorts)",
  targetAudience: "Gen Z & Millennials seeking clean skincare",
  deliverables: ["1x 20-Second Hero Reel (9:16)", "3x Product Stills"],
  commercialUse: true,
  status: "Published",
};

const LICENSE_FIELDS: { key: keyof LicenseTerm; label: string }[] = [
  { key: "usageType", label: "Usage Type" },
  { key: "territory", label: "Territory" },
  { key: "duration", label: "Duration" },
  { key: "platforms", label: "Platforms" },
  { key: "exclusivity", label: "Exclusivity" },
];

const VERSION_BADGE: Record<Version["status"], { label: string; cls: string }> = {
  in_progress: { label: "Draft", cls: "bg-white/10 text-white/60" },
  submitted: { label: "Review", cls: "bg-amber-500/20 text-amber-400" },
  requested: { label: "Changes", cls: "bg-rose-500/20 text-rose-400" },
  approved: { label: "Approved", cls: "bg-lime-500/20 text-lime-400" },
};

// ─── Components ───────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const color = score >= 90 ? "#4ade80" : score >= 80 ? "#a3e635" : score >= 70 ? "#facc15" : "#f87171";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/10">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs font-bold tabular-nums" style={{ color }}>{score}%</span>
    </div>
  );
}

function StagePill({ stage, active }: { stage: string; active: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-1 ${active ? "opacity-100" : "opacity-30"}`}>
      <div className={`w-2.5 h-2.5 rounded-full border-2 ${active ? "bg-lime-400 border-lime-400" : "border-white/30"}`} />
      <span className="text-[10px] font-medium text-white/70 text-center leading-tight max-w-[56px]">{stage}</span>
    </div>
  );
}

function AgentPanel({ brief, poolSize }: { brief: CreativeBrief; poolSize: number }) {
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [result, setResult] = useState<AgentShortlistResult | null>(null);

  async function run() {
    setRunning(true);
    setResult(null);
    setLog([]);

    // Real work first, then replay the steps so the log reflects actual output.
    const ranked = runAutoShortlistForBrief(brief);
    const top = ranked.actions[0];
    const steps = [
      `Parsing brief "${brief.campaignName}" (${brief.contentType}, ${brief.aspectRatio.split(" ")[0]})…`,
      `Loading creator pool (${poolSize} profiles)…`,
      "Scoring content type, skills, tools, format, commercial use & portfolio evidence…",
      top ? `Top match: @${top.creatorId} at ${top.score}%` : "No strong matches found",
      `Shortlisting top ${ranked.actions.length} creators into the pipeline ✓`,
    ];
    for (const s of steps) {
      await new Promise((r) => setTimeout(r, 350));
      setLog((prev) => [...prev, s]);
    }
    setResult(acceptAllAndApply(ranked, brief));
    setRunning(false);
  }

  return (
    <div className="rounded-2xl border border-lime-500/30 bg-lime-500/5 p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-lime-400/20 flex items-center justify-center text-lg">🤖</div>
        <div>
          <p className="text-sm font-bold text-white">Auto-Shortlist Agent</p>
          <p className="text-xs text-white/50">Runs the matching engine against this brief</p>
        </div>
        <button
          onClick={run}
          disabled={running}
          className="ml-auto px-4 py-2 rounded-xl bg-lime-400 text-black text-xs font-bold hover:bg-lime-300 disabled:opacity-60 transition"
        >
          {running ? "Running…" : result ? "Re-run" : "Run Agent"}
        </button>
      </div>

      {log.length > 0 && (
        <div className="space-y-1.5 text-xs font-mono">
          {log.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-lime-300/80">
              <span className="text-lime-400">›</span> {s}
            </div>
          ))}
          {running && <div className="text-white/40 animate-pulse">›</div>}
        </div>
      )}

      {result && (
        <p className="text-[11px] text-white/50">
          {result.summary} {result.nextStep}
        </p>
      )}
    </div>
  );
}

function LicenseBadge({ cmp }: { cmp: LicenseComparison }) {
  if (cmp.compatible && cmp.mismatches.length === 0) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-lime-500/15 border border-lime-500/30 text-lime-400 text-[10px] font-bold">
      ✓ License OK
    </span>
  );
  const issue = cmp.mismatches.map((m) => `${m.field} (${m.severity})`).join(", ");
  if (cmp.compatible) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold" title={issue}>
      ⚠ Advisory
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[10px] font-bold" title={issue}>
      ⚠ License Conflict
    </span>
  );
}

function DeliveryCheckPanel({ version, brief }: { version: Version; brief: CreativeBrief }) {
  const specs = deliverySpecsForBrief(brief);
  const meta = version.mediaMeta;
  if (!meta) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs text-white/40">
        v{version.n} — no media metadata recorded.
      </div>
    );
  }
  const issues = checkMediaAgainstSpecs(meta, specs);
  const checks = [
    { label: "Aspect Ratio", value: meta.aspectRatio, field: "aspectRatio" },
    { label: "Duration", value: meta.durationSec !== undefined ? `${meta.durationSec}s` : "—", field: "duration" },
    { label: "Resolution", value: meta.resolution, field: "resolution" },
  ] as const;
  const pass = !issues.some((i) => i.severity === "error");
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-white/70">Delivery Check — v{version.n}</p>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pass ? "bg-lime-500/20 text-lime-400" : "bg-rose-500/20 text-rose-400"}`}>
          {pass ? (issues.length ? "⚠ PASS w/ warnings" : "✓ PASS") : "✗ FAIL"}
        </span>
      </div>
      <div className="space-y-1.5">
        {checks.map((c) => {
          const issue = issues.find((i) => i.field === c.field);
          const tone = !issue ? "text-lime-400" : issue.severity === "error" ? "text-rose-400" : "text-amber-400";
          return (
            <div key={c.label} className="flex items-center justify-between text-xs" title={issue?.message}>
              <span className="text-white/50">{c.label}</span>
              <span className={`${tone} font-mono`}>{c.value}</span>
              <span className={tone}>{!issue ? "✓" : issue.severity === "error" ? "✗" : "⚠"}</span>
            </div>
          );
        })}
      </div>
      {issues.length > 0 && (
        <ul className="space-y-1 text-[11px] text-white/50">
          {issues.map((i, idx) => <li key={idx}>• {i.message}</li>)}
        </ul>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

function PipelineView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rev = useR2Revision();

  const allEngagements = useMemo(() => (rev ? getAllEngagements() : []), [rev]);

  // Briefs: demo brief, seeded demo briefs, plus any brief snapshotted on an engagement
  const briefOptions = useMemo(() => {
    const map = new Map<string, CreativeBrief>();
    for (const b of [GLOWCO_BRIEF, ...DEMO_BRIEFS]) if (b.id) map.set(b.id, b);
    for (const e of allEngagements) if (e.brief?.id && !map.has(e.brief.id)) map.set(e.brief.id, e.brief);
    return Array.from(map.values());
  }, [allEngagements]);

  const BRIEF = briefOptions.find((b) => b.id === searchParams.get("brief")) ?? GLOWCO_BRIEF;
  const briefId = BRIEF.id!;

  const pool = useMemo(() => flatCreators(), []);
  const ranked = useMemo(() => rankCreatorsForBrief2(BRIEF, pool), [BRIEF, pool]);
  const rankedById = useMemo(() => new Map(ranked.map((m) => [m.creator.username, m])), [ranked]);

  const engagements = useMemo(() => allEngagements.filter((e) => e.briefId === briefId), [allEngagements, briefId]);
  const engByCreator = useMemo(() => new Map(engagements.map((e) => [e.creatorId, e])), [engagements]);

  // Left list: the shortlist once there is one, otherwise the engine's top matches
  const listed: MatchResult2[] = engagements.length > 0
    ? engagements.map((e) => rankedById.get(e.creatorId)).filter((m): m is MatchResult2 => !!m)
    : ranked.slice(0, 5);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = listed.find((m) => m.creator.username === selectedId) ?? listed[0] ?? null;
  const selectedEng: Engagement | undefined = selected ? engByCreator.get(selected.creator.username) : undefined;
  const engStage = selectedEng ? stageIndex(selectedEng.stage) : -1;

  const selectedEngId = selectedEng?.id;
  const versions = useMemo(() => (rev && selectedEngId ? getVersions(selectedEngId) : []), [rev, selectedEngId]);
  const [activeVersionN, setActiveVersionN] = useState<number | null>(null);
  const activeVersion = versions.find((v) => v.n === activeVersionN) ?? versions[versions.length - 1];
  const reviewable = [...versions].reverse().find((v) => v.status === "submitted");
  const [revisionFeedback, setRevisionFeedback] = useState("");

  const [licenseTab, setLicenseTab] = useState<string | null>(null);
  const licenseCreatorId = listed.find((m) => m.creator.username === licenseTab)?.creator.username ?? listed[0]?.creator.username;
  const license = licenseCreatorId ? compareLicensesForBrief(BRIEF, licenseCreatorId) : null;

  function handleShortlist(m: MatchResult2) {
    shortlistCreator(
      briefId,
      m.creator.username,
      { campaignTitle: BRIEF.campaignName, brandName: BRIEF.brandName, matchScore: m.overallScore, brief: BRIEF },
      "brand"
    );
  }

  function handleApprove() {
    if (!selectedEng || !reviewable) return;
    approveVersion(reviewable.id);
    advanceStage(selectedEng.id, "accepted_final", `v${reviewable.n} approved`, "brand");
    setRevisionFeedback("");
  }

  function handleRequestChanges() {
    if (!selectedEng || !reviewable || !revisionFeedback.trim()) return;
    requestRevision(reviewable.id, revisionFeedback.trim(), "brand");
    advanceStage(selectedEng.id, "changes_requested", revisionFeedback.trim(), "brand");
    setRevisionFeedback("");
  }

  /** Demo helper: stand in for the creator so the full loop can be shown on one screen. */
  function handleSimulateSubmission() {
    if (!selectedEng) return;
    const n = versions.length + 1;
    const v = createVersion(selectedEng.id, n === 1 ? "Initial cut" : `Revision ${n - 1} — addressed feedback`, "/reels/reel-01.mp4");
    submitVersion(v.id, "/reels/reel-01.mp4", {
      width: 1080,
      height: 1920,
      durationSec: deliverySpecsForBrief(BRIEF).durationSec ?? 20,
      aspectRatio: "9:16",
      resolution: "1080×1920",
    });
    advanceStage(selectedEng.id, "delivered", `v${n} submitted for review`, "creator");
    setActiveVersionN(n);
  }

  function handleExportLicense() {
    if (!license) return;
    const lines = [
      `License compatibility — ${BRIEF.campaignName}`,
      `Creator: @${license.creatorId}`,
      `Generated: ${new Date().toISOString()}`,
      "",
      ...LICENSE_FIELDS.map(({ key, label }) => {
        const fmt = (v: LicenseTerm[keyof LicenseTerm]) => (Array.isArray(v) ? v.join(", ") : v);
        const m = license.mismatches.find((x) => x.field === key);
        return `${label}: brief requires ${fmt(license.brandRequires[key])}; creator offers ${fmt(license.creatorOffers[key])}${m ? ` [${m.severity.toUpperCase()}]` : ""}`;
      }),
      "",
      license.compatible ? "Result: compatible" : "Result: BLOCKING conflicts — resolve before contracting",
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `license-${briefId}-${license.creatorId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const specs = deliverySpecsForBrief(BRIEF);
  const submittedVersions = versions.filter((v) => v.submittedAt);

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-6 pb-16">

        {/* ── Header ── */}
        <div className="rounded-2xl bg-gradient-to-br from-[#0d2a1c] via-[#0a1f16] to-[#050606] border border-lime-500/20 p-6 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-400/10 border border-lime-400/20 text-lime-400 text-[10px] font-bold uppercase tracking-widest mb-2">
              Round 2 Features
            </div>
            <h1 className="text-2xl font-extrabold text-white">Campaign Pipeline</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/50">
              <select
                value={briefId}
                onChange={(e) => router.replace(`/pipeline?brief=${encodeURIComponent(e.target.value)}`)}
                className="rounded-lg bg-black/40 border border-white/15 px-2 py-1 text-sm font-semibold text-white/80 outline-none"
                aria-label="Brief"
              >
                {briefOptions.map((b) => (
                  <option key={b.id} value={b.id} className="bg-[#0c1017]">{b.campaignName}</option>
                ))}
              </select>
              <span>· {BRIEF.contentType} · {BRIEF.platform}</span>
            </div>
          </div>
          <div className="flex gap-3">
            {[
              { label: "Auto-Shortlist", icon: "🤖", done: engagements.length > 0 },
              { label: "Licensing", icon: "📄", done: engagements.length > 0 },
              { label: "Revisions", icon: "🔁", done: versions.length > 0 },
              { label: "Delivery Check", icon: "✅", done: submittedVersions.length > 0 },
            ].map(f => (
              <div key={f.label} className={`text-center px-3 py-2 rounded-xl border ${f.done ? "border-lime-500/30 bg-lime-500/10" : "border-white/10 bg-white/5"}`}>
                <div className="text-xl">{f.icon}</div>
                <p className="text-[10px] font-bold text-white/60 mt-0.5">{f.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Grid: 3 columns ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ──── LEFT: Auto-Shortlist Agent + Creator List ──── */}
          <div className="lg:col-span-1 space-y-4">
            <AgentPanel key={briefId} brief={BRIEF} poolSize={pool.length} />

            <div className="space-y-2">
              <p className="text-xs font-bold text-white/40 uppercase tracking-widest px-1">
                {engagements.length > 0 ? `Shortlisted Creators (${engagements.length})` : "Top Matches"}
              </p>
              {listed.map((m) => {
                const c = m.creator;
                const eng = engByCreator.get(c.username);
                return (
                  <button
                    key={c.username}
                    onClick={() => { setSelectedId(c.username); setActiveVersionN(null); }}
                    className={`w-full text-left rounded-xl border p-3 transition ${
                      selected?.creator.username === c.username
                        ? "border-lime-400/50 bg-lime-400/5"
                        : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-lime-400/30 to-forest-950 flex items-center justify-center text-xs font-black text-lime-400">
                        {ranked.indexOf(m) + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-white truncate">{c.name}</p>
                          {c.verified && <span className="text-lime-400 text-[10px]">✓</span>}
                        </div>
                        <p className="text-[10px] text-white/40 truncate">
                          {eng ? STAGE_LABEL[eng.stage] : c.specialization}
                        </p>
                      </div>
                      <LicenseBadge cmp={compareLicensesForBrief(BRIEF, c.username)} />
                    </div>
                    <ScoreBar score={m.overallScore} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* ──── MIDDLE: Engagement Pipeline + Revisions ──── */}
          <div className="lg:col-span-1 space-y-4">

            {/* Engagement Stage Tracker */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-white">Engagement Pipeline</p>
                <span className="text-xs text-lime-400 font-bold">
                  {selectedEng ? STAGE_LABEL[selectedEng.stage] : "Not in pipeline"}
                </span>
              </div>

              {/* Stage dots */}
              <div className="flex items-start justify-between gap-1 overflow-x-auto pb-1">
                {PIPELINE_STAGES.map((s, i) => (
                  <StagePill key={s} stage={STAGE_LABEL[s]} active={i <= engStage} />
                ))}
              </div>

              {/* Progress bar */}
              <div className="h-1.5 rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-lime-400 to-lime-300 transition-all"
                  style={{ width: `${Math.max(0, engStage / (PIPELINE_STAGES.length - 1)) * 100}%` }}
                />
              </div>

              {/* Stage advance buttons */}
              {selectedEng ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => stepStage(selectedEng.id, -1)}
                    disabled={engStage <= 0}
                    className="flex-1 py-2 rounded-xl border border-white/10 text-xs font-bold text-white/50 hover:text-white hover:border-white/20 disabled:opacity-30 transition"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => stepStage(selectedEng.id, 1)}
                    disabled={engStage < 0 || engStage >= PIPELINE_STAGES.length - 1}
                    className="flex-1 py-2 rounded-xl bg-lime-400 text-black text-xs font-bold hover:bg-lime-300 disabled:opacity-30 transition"
                  >
                    Advance Stage →
                  </button>
                </div>
              ) : selected ? (
                <button
                  onClick={() => handleShortlist(selected)}
                  className="w-full py-2 rounded-xl bg-lime-400 text-black text-xs font-bold hover:bg-lime-300 transition"
                >
                  + Shortlist {selected.creator.name}
                </button>
              ) : null}

              {/* Creator info */}
              {selected && (
                <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-lime-400/20 flex items-center justify-center text-sm font-black text-lime-400">
                      {selected.creator.name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{selected.creator.name}</p>
                      <p className="text-[10px] text-white/40 truncate">{selected.creator.specialization}</p>
                    </div>
                    <div className="ml-auto shrink-0 text-[10px] font-bold px-2 py-1 rounded-full bg-lime-500/20 text-lime-400">
                      {selected.creator.availability}
                    </div>
                  </div>
                  <p className="text-[11px] text-white/50 leading-relaxed">{selected.whyExplanation}</p>
                </div>
              )}

              {/* History */}
              {selectedEng && selectedEng.history.length > 0 && (
                <ul className="space-y-1 text-[11px] text-white/40 max-h-28 overflow-y-auto">
                  {[...selectedEng.history].reverse().map((h, i) => (
                    <li key={i}>
                      <span className="text-white/60">{STAGE_LABEL[h.stage]}</span> · {h.by} · {new Date(h.at).toLocaleString()}
                      {h.note && ` — ${h.note}`}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Revision Tracker */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-white">Revision Tracker</p>
                {selectedEng && (selectedEng.stage === "production" || selectedEng.stage === "changes_requested") && (
                  <button
                    onClick={handleSimulateSubmission}
                    className="text-[10px] font-bold text-white/40 hover:text-lime-400 transition"
                    title="Demo helper: submits a sample version on the creator's behalf"
                  >
                    Simulate creator v{versions.length + 1} (demo)
                  </button>
                )}
              </div>

              {versions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/15 p-4 text-xs text-white/40 space-y-2">
                  <p>No versions submitted yet.</p>
                  {selectedEng && (
                    <Link
                      href={`/creator-studio?creator=${encodeURIComponent(selectedEng.creatorId)}&tab=engagements`}
                      className="inline-block font-bold text-lime-400 hover:text-lime-300"
                    >
                      Open creator&apos;s Active Engagements →
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {versions.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setActiveVersionN(v.n)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          activeVersion?.n === v.n ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
                        }`}
                      >
                        v{v.n}
                        <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] ${VERSION_BADGE[v.status].cls}`}>
                          {VERSION_BADGE[v.status].label}
                        </span>
                      </button>
                    ))}
                  </div>

                  {activeVersion && (
                    <div className="space-y-3">
                      <div className="rounded-xl bg-black/40 border border-white/10 aspect-video flex items-center justify-center">
                        <div className="text-center px-3">
                          <div className="text-3xl mb-2">🎬</div>
                          <p className="text-xs text-white/60">v{activeVersion.n} — {activeVersion.changeLog}</p>
                          {activeVersion.mediaMeta && (
                            <p className="text-[10px] text-white/30">
                              {activeVersion.mediaMeta.durationSec ?? "?"}s · {activeVersion.mediaMeta.aspectRatio} · {activeVersion.mediaMeta.resolution}
                            </p>
                          )}
                          {activeVersion.mediaUrl && (
                            <a href={activeVersion.mediaUrl} target="_blank" rel="noreferrer" className="text-[10px] text-lime-400 hover:underline break-all">
                              {activeVersion.mediaUrl}
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-white/50">
                        Submitted: {activeVersion.submittedAt ? new Date(activeVersion.submittedAt).toLocaleString() : "—"}
                      </div>

                      {activeVersion.feedback.map((fb) => (
                        <div key={fb.id} className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-300">
                          <span className="font-bold text-rose-400">Feedback: </span>{fb.text}
                        </div>
                      ))}

                      {activeVersion.status === "submitted" && (
                        <div className="space-y-2">
                          <textarea
                            value={revisionFeedback}
                            onChange={e => setRevisionFeedback(e.target.value)}
                            placeholder="Leave feedback to request changes, or approve…"
                            rows={2}
                            className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-lime-400/50 resize-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleRequestChanges}
                              disabled={!revisionFeedback.trim()}
                              className="flex-1 py-2 rounded-xl border border-rose-500/30 text-rose-400 text-xs font-bold hover:bg-rose-500/10 disabled:opacity-40 transition"
                            >
                              Request Changes
                            </button>
                            <button
                              onClick={handleApprove}
                              className="flex-1 py-2 rounded-xl bg-lime-400 text-black text-xs font-bold hover:bg-lime-300 transition"
                            >
                              ✓ Approve
                            </button>
                          </div>
                        </div>
                      )}

                      {activeVersion.status === "approved" && (
                        <div className="rounded-xl bg-lime-500/15 border border-lime-500/30 p-3 text-center text-xs font-bold text-lime-400">
                          ✓ v{activeVersion.n} approved — engagement complete
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ──── RIGHT: Licensing + Delivery Check ──── */}
          <div className="lg:col-span-1 space-y-4">

            {/* Licensing Checker */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
              <p className="text-sm font-bold text-white">License Compatibility</p>

              {/* Creator tabs */}
              <div className="flex flex-wrap gap-1.5">
                {listed.map((m) => (
                  <button
                    key={m.creator.username}
                    onClick={() => setLicenseTab(m.creator.username)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                      licenseCreatorId === m.creator.username
                        ? "bg-white/10 text-white"
                        : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    {m.creator.name.split(" ")[0]}
                  </button>
                ))}
              </div>

              {license && (
                <>
                  <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3 space-y-1.5">
                    <div className="grid grid-cols-3 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                      <span>Term</span><span>Brief</span><span>Creator</span>
                    </div>
                    {LICENSE_FIELDS.map(({ key, label }) => {
                      const fmt = (v: LicenseTerm[keyof LicenseTerm]) => (Array.isArray(v) ? v.join(", ") : v);
                      const mismatch = license.mismatches.find((m) => m.field === key);
                      return (
                        <div key={key} className="grid grid-cols-3 gap-2 text-xs">
                          <span className="text-white/50">{label}</span>
                          <span className="text-white font-mono break-words">{fmt(license.brandRequires[key])}</span>
                          <span
                            className={`font-mono break-words ${
                              mismatch ? (mismatch.severity === "blocking" ? "text-rose-400 font-bold" : "text-amber-400 font-bold") : "text-white"
                            }`}
                          >
                            {fmt(license.creatorOffers[key])} {mismatch ? "⚠" : ""}
                          </span>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-white/10">
                      <span className="text-white/50">Commercial Use</span>
                      <span className="text-white font-mono">{BRIEF.commercialUse ? "Required" : "Not required"}</span>
                    </div>
                  </div>

                  {/* Result */}
                  <div className={`rounded-xl p-3 text-xs font-bold ${
                    !license.compatible
                      ? "bg-rose-500/15 border border-rose-500/30 text-rose-400"
                      : license.mismatches.length > 0
                      ? "bg-amber-500/15 border border-amber-500/30 text-amber-400"
                      : "bg-lime-500/15 border border-lime-500/30 text-lime-400 text-center"
                  }`}>
                    {license.mismatches.length === 0 ? (
                      "✓ Licensing terms compatible — safe to proceed"
                    ) : (
                      <ul className="space-y-1">
                        {license.mismatches.map((m) => (
                          <li key={m.field}>
                            ⚠ {m.severity === "blocking" ? "Blocking" : "Advisory"} — {m.field}: brief requires {m.brandRequires}, creator offers {m.creatorOffers}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Delivery Check */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
              <p className="text-sm font-bold text-white">AI Delivery Checker</p>
              <p className="text-xs text-white/40">
                Validates each version against the brief: {specs.aspectRatio}
                {specs.durationSec ? ` · ${specs.durationSec}s ±20%` : ""} · ≥{specs.minShortSide}px
              </p>
              {submittedVersions.length === 0 ? (
                <p className="text-xs text-white/30">Nothing submitted for this creator yet.</p>
              ) : (
                submittedVersions.map((v) => <DeliveryCheckPanel key={v.id} version={v} brief={BRIEF} />)
              )}
            </div>

            {/* Final Actions */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
              <p className="text-sm font-bold text-white">Campaign Actions</p>
              <div className="space-y-2">
                <button
                  onClick={handleApprove}
                  disabled={!reviewable}
                  className="w-full py-3 rounded-xl bg-lime-400 text-black font-bold text-sm hover:bg-lime-300 disabled:opacity-40 transition"
                >
                  ✓ Approve & Finalize Delivery{reviewable ? ` (v${reviewable.n})` : ""}
                </button>
                <button
                  onClick={() => { if (reviewable) setActiveVersionN(reviewable.n); }}
                  disabled={!reviewable}
                  className="w-full py-2.5 rounded-xl border border-white/10 text-white/60 font-bold text-xs hover:bg-white/5 disabled:opacity-40 transition"
                >
                  🔁 Request Another Revision
                </button>
                <button
                  onClick={handleExportLicense}
                  disabled={!license}
                  className="w-full py-2.5 rounded-xl border border-white/10 text-white/60 font-bold text-xs hover:bg-white/5 disabled:opacity-40 transition"
                >
                  📄 Export License Summary
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function PipelinePage() {
  return (
    <Suspense fallback={null}>
      <PipelineView />
    </Suspense>
  );
}
