"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";

// ─── Demo data ────────────────────────────────────────────────────────────────

const BRIEF = {
  id: "brief-001",
  campaign: "GlowCo Skincare Launch",
  contentType: "Short-form Video (Reels/TikTok)",
  aspectRatio: "9:16 Vertical",
  platform: "Instagram Reels & TikTok",
  style: "Minimalist Luxury",
  duration: "15-30s",
  commercialUse: true,
  territory: "worldwide",
  usageType: "digital",
};

const CREATORS = [
  {
    username: "anya_visuals",
    name: "Anya Sharma",
    score: 96,
    specialization: "Luxury Product Reels",
    tools: ["Runway Gen-3", "Midjourney v6"],
    availability: "Available",
    verified: true,
    licensing: { territory: "worldwide", usageType: "digital", exclusivity: "non-exclusive", duration: "12 months" },
    licenseOk: true,
  },
  {
    username: "nicolasneubert",
    name: "Nicolas Neubert",
    score: 88,
    specialization: "Cinematic Brand Spots",
    tools: ["Kling AI", "Flux.1 Dev"],
    availability: "Available",
    verified: true,
    licensing: { territory: "regional", usageType: "digital", exclusivity: "non-exclusive", duration: "12 months" },
    licenseOk: false,
    licenseIssue: "Territory mismatch: Brief requires worldwide, creator offers regional only",
  },
  {
    username: "kylekesterson",
    name: "Kyle Kesterson",
    score: 82,
    specialization: "Product Visualizations",
    tools: ["Runway Gen-3", "OpenAI Sora"],
    availability: "Busy until Nov 15",
    verified: true,
    licensing: { territory: "worldwide", usageType: "digital", exclusivity: "exclusive", duration: "24 months" },
    licenseOk: true,
  },
  {
    username: "rin.motion",
    name: "Rin Motida",
    score: 79,
    specialization: "Fashion & Beauty AI Films",
    tools: ["Stable Diffusion XL", "Runway"],
    availability: "Available",
    verified: false,
    licensing: { territory: "worldwide", usageType: "digital", exclusivity: "non-exclusive", duration: "6 months" },
    licenseOk: false,
    licenseIssue: "Duration mismatch: Brief needs 12 months, creator offers 6 months",
  },
  {
    username: "deepframe.ai",
    name: "DeepFrame Studio",
    score: 74,
    specialization: "AI Commercials",
    tools: ["Pika", "Kling AI"],
    availability: "Available",
    verified: true,
    licensing: { territory: "worldwide", usageType: "digital", exclusivity: "non-exclusive", duration: "12 months" },
    licenseOk: true,
  },
];

const ENGAGEMENT_STAGES = [
  "Shortlisted",
  "Contacted",
  "Accepted",
  "In Production",
  "Revision",
  "Delivered",
  "Approved",
];

const REVISIONS = [
  {
    v: "v1",
    submittedAt: "Oct 18, 2026",
    status: "changes_requested",
    notes: "Great opener. Need warmer color grade and remove the logo flash at 0:12.",
    meta: { aspectRatio: "9:16", duration: "22s", resolution: "1080×1920" },
    deliveryCheck: { aspectRatio: true, duration: true, resolution: true },
  },
  {
    v: "v2",
    submittedAt: "Oct 21, 2026",
    status: "reviewing",
    notes: "",
    meta: { aspectRatio: "9:16", duration: "24s", resolution: "1080×1920" },
    deliveryCheck: { aspectRatio: true, duration: true, resolution: true },
  },
];

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

function AgentPanel({ onDone }: { onDone: () => void }) {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [step, setStep] = useState(0);

  const steps = [
    "Parsing brief requirements…",
    "Loading creator pool (248 profiles)…",
    "Scoring content-type alignment…",
    "Checking tool & workflow compatibility…",
    "Validating commercial licensing…",
    "Ranking by weighted multi-factor score…",
    "Auto-shortlisting top 5 creators ✓",
  ];

  async function run() {
    setRunning(true);
    setStep(0);
    for (let i = 0; i < steps.length; i++) {
      await new Promise(r => setTimeout(r, 500));
      setStep(i + 1);
    }
    setDone(true);
    setRunning(false);
    setTimeout(onDone, 800);
  }

  return (
    <div className="rounded-2xl border border-lime-500/30 bg-lime-500/5 p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-lime-400/20 flex items-center justify-center text-lg">🤖</div>
        <div>
          <p className="text-sm font-bold text-white">Auto-Shortlist Agent</p>
          <p className="text-xs text-white/50">Ranks all creators against this brief in seconds</p>
        </div>
        {!done && (
          <button
            onClick={run}
            disabled={running}
            className="ml-auto px-4 py-2 rounded-xl bg-lime-400 text-black text-xs font-bold hover:bg-lime-300 disabled:opacity-60 transition"
          >
            {running ? "Running…" : "Run Agent"}
          </button>
        )}
        {done && <span className="ml-auto text-xs font-bold text-lime-400">✓ Complete</span>}
      </div>

      {(running || done) && (
        <div className="space-y-1.5 text-xs font-mono">
          {steps.slice(0, step).map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-lime-300/80">
              <span className="text-lime-400">›</span> {s}
            </div>
          ))}
          {running && step < steps.length && (
            <div className="flex items-center gap-2 text-white/40">
              <span className="animate-pulse">›</span> {steps[step]}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LicenseBadge({ ok, issue }: { ok: boolean; issue?: string }) {
  if (ok) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-lime-500/15 border border-lime-500/30 text-lime-400 text-[10px] font-bold">
      ✓ License OK
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[10px] font-bold" title={issue}>
      ⚠ License Conflict
    </span>
  );
}

function DeliveryCheckPanel({ revision }: { revision: typeof REVISIONS[0] }) {
  const checks = [
    { label: "Aspect Ratio", value: revision.meta.aspectRatio, expected: "9:16", pass: revision.deliveryCheck.aspectRatio },
    { label: "Duration", value: revision.meta.duration, expected: "15-30s", pass: revision.deliveryCheck.duration },
    { label: "Resolution", value: revision.meta.resolution, expected: "≥720p", pass: revision.deliveryCheck.resolution },
  ];
  const allPass = checks.every(c => c.pass);
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-white/70">Delivery Check — {revision.v}</p>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${allPass ? "bg-lime-500/20 text-lime-400" : "bg-rose-500/20 text-rose-400"}`}>
          {allPass ? "✓ PASS" : "✗ FAIL"}
        </span>
      </div>
      <div className="space-y-1.5">
        {checks.map(c => (
          <div key={c.label} className="flex items-center justify-between text-xs">
            <span className="text-white/50">{c.label}</span>
            <span className={c.pass ? "text-lime-400 font-mono" : "text-rose-400 font-mono"}>{c.value}</span>
            <span className={c.pass ? "text-lime-400" : "text-rose-400"}>{c.pass ? "✓" : "✗"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [agentDone, setAgentDone] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState(CREATORS[0]);
  const [engStage, setEngStage] = useState(4); // "In Production"
  const [activeRevision, setActiveRevision] = useState(1); // v2
  const [licenseTab, setLicenseTab] = useState<string>(CREATORS[0].username);
  const [revisionFeedback, setRevisionFeedback] = useState("");
  const [approved, setApproved] = useState(false);

  const licenseCreator = CREATORS.find(c => c.username === licenseTab) || CREATORS[0];

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-6 pb-16">

        {/* ── Header ── */}
        <div className="rounded-2xl bg-gradient-to-br from-[#0d2a1c] via-[#0a1f16] to-[#050606] border border-lime-500/20 p-6 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-400/10 border border-lime-400/20 text-lime-400 text-[10px] font-bold uppercase tracking-widest mb-2">
              Round 2 Features
            </div>
            <h1 className="text-2xl font-extrabold text-white">Campaign Pipeline</h1>
            <p className="text-sm text-white/50 mt-1">
              <span className="font-semibold text-white/70">{BRIEF.campaign}</span> · {BRIEF.contentType} · {BRIEF.platform}
            </p>
          </div>
          <div className="flex gap-3">
            {[
              { label: "Auto-Shortlist", icon: "🤖", done: agentDone },
              { label: "Licensing", icon: "📄", done: true },
              { label: "Revisions", icon: "🔁", done: true },
              { label: "Delivery Check", icon: "✅", done: true },
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
            <AgentPanel onDone={() => setAgentDone(true)} />

            <div className="space-y-2">
              <p className="text-xs font-bold text-white/40 uppercase tracking-widest px-1">
                {agentDone ? "Auto-Shortlisted Creators" : "Top Matches"}
              </p>
              {CREATORS.map((c, i) => (
                <button
                  key={c.username}
                  onClick={() => setSelectedCreator(c)}
                  className={`w-full text-left rounded-xl border p-3 transition ${
                    selectedCreator.username === c.username
                      ? "border-lime-400/50 bg-lime-400/5"
                      : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-lime-400/30 to-forest-950 flex items-center justify-center text-xs font-black text-lime-400">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-white truncate">{c.name}</p>
                        {c.verified && <span className="text-lime-400 text-[10px]">✓</span>}
                      </div>
                      <p className="text-[10px] text-white/40 truncate">{c.specialization}</p>
                    </div>
                    <LicenseBadge ok={c.licenseOk} issue={c.licenseIssue} />
                  </div>
                  <ScoreBar score={c.score} />
                </button>
              ))}
            </div>
          </div>

          {/* ──── MIDDLE: Engagement Pipeline + Revisions ──── */}
          <div className="lg:col-span-1 space-y-4">

            {/* Engagement Stage Tracker */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-white">Engagement Pipeline</p>
                <span className="text-xs text-lime-400 font-bold">{ENGAGEMENT_STAGES[engStage - 1]}</span>
              </div>

              {/* Stage dots */}
              <div className="flex items-start justify-between gap-1 overflow-x-auto pb-1">
                {ENGAGEMENT_STAGES.map((s, i) => (
                  <StagePill key={s} stage={s} active={i < engStage} />
                ))}
              </div>

              {/* Progress bar */}
              <div className="h-1.5 rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-lime-400 to-lime-300 transition-all"
                  style={{ width: `${((engStage - 1) / (ENGAGEMENT_STAGES.length - 1)) * 100}%` }}
                />
              </div>

              {/* Stage advance buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setEngStage(s => Math.max(1, s - 1))}
                  disabled={engStage <= 1}
                  className="flex-1 py-2 rounded-xl border border-white/10 text-xs font-bold text-white/50 hover:text-white hover:border-white/20 disabled:opacity-30 transition"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setEngStage(s => Math.min(ENGAGEMENT_STAGES.length, s + 1))}
                  disabled={engStage >= ENGAGEMENT_STAGES.length}
                  className="flex-1 py-2 rounded-xl bg-lime-400 text-black text-xs font-bold hover:bg-lime-300 disabled:opacity-30 transition"
                >
                  Advance Stage →
                </button>
              </div>

              {/* Creator info */}
              <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-lime-400/20 flex items-center justify-center text-sm font-black text-lime-400">
                  {selectedCreator.name[0]}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{selectedCreator.name}</p>
                  <p className="text-[10px] text-white/40">{selectedCreator.specialization}</p>
                </div>
                <div className={`ml-auto text-[10px] font-bold px-2 py-1 rounded-full ${
                  selectedCreator.availability === "Available"
                    ? "bg-lime-500/20 text-lime-400"
                    : "bg-amber-500/20 text-amber-400"
                }`}>
                  {selectedCreator.availability}
                </div>
              </div>
            </div>

            {/* Revision Tracker */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
              <p className="text-sm font-bold text-white">Revision Tracker</p>

              <div className="flex gap-2">
                {REVISIONS.map((r, i) => (
                  <button
                    key={r.v}
                    onClick={() => setActiveRevision(i)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      activeRevision === i
                        ? "bg-white/10 text-white"
                        : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    {r.v}
                    <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] ${
                      r.status === "reviewing"
                        ? "bg-amber-500/20 text-amber-400"
                        : r.status === "changes_requested"
                        ? "bg-rose-500/20 text-rose-400"
                        : "bg-lime-500/20 text-lime-400"
                    }`}>
                      {r.status === "changes_requested" ? "Changes" : r.status === "reviewing" ? "Review" : "Approved"}
                    </span>
                  </button>
                ))}
              </div>

              {/* Active revision */}
              {(() => {
                const rev = REVISIONS[activeRevision];
                return (
                  <div className="space-y-3">
                    <div className="rounded-xl bg-black/40 border border-white/10 aspect-video flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-3xl mb-2">🎬</div>
                        <p className="text-xs text-white/40">{rev.v} — {rev.meta.duration} · {rev.meta.aspectRatio}</p>
                        <p className="text-[10px] text-white/30">{rev.meta.resolution}</p>
                      </div>
                    </div>

                    <div className="text-xs text-white/50">Submitted: {rev.submittedAt}</div>

                    {rev.notes && (
                      <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-300">
                        <span className="font-bold text-rose-400">Feedback: </span>{rev.notes}
                      </div>
                    )}

                    {rev.status === "reviewing" && !approved && (
                      <div className="space-y-2">
                        <textarea
                          value={revisionFeedback}
                          onChange={e => setRevisionFeedback(e.target.value)}
                          placeholder="Leave feedback or approve…"
                          rows={2}
                          className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-lime-400/50 resize-none"
                        />
                        <div className="flex gap-2">
                          <button className="flex-1 py-2 rounded-xl border border-rose-500/30 text-rose-400 text-xs font-bold hover:bg-rose-500/10 transition">
                            Request Changes
                          </button>
                          <button
                            onClick={() => setApproved(true)}
                            className="flex-1 py-2 rounded-xl bg-lime-400 text-black text-xs font-bold hover:bg-lime-300 transition"
                          >
                            ✓ Approve
                          </button>
                        </div>
                      </div>
                    )}

                    {approved && (
                      <div className="rounded-xl bg-lime-500/15 border border-lime-500/30 p-3 text-center text-xs font-bold text-lime-400">
                        ✓ Version approved — moving to delivery
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* ──── RIGHT: Licensing + Delivery Check ──── */}
          <div className="lg:col-span-1 space-y-4">

            {/* Licensing Checker */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
              <p className="text-sm font-bold text-white">License Compatibility</p>

              {/* Creator tabs */}
              <div className="flex flex-wrap gap-1.5">
                {CREATORS.map(c => (
                  <button
                    key={c.username}
                    onClick={() => setLicenseTab(c.username)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                      licenseTab === c.username
                        ? "bg-white/10 text-white"
                        : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    {c.name.split(" ")[0]}
                  </button>
                ))}
              </div>

              {/* Brief requirements */}
              <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3 space-y-1.5">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Brief Requirements</p>
                {[
                  ["Usage Type", BRIEF.usageType],
                  ["Territory", BRIEF.territory],
                  ["Commercial Use", BRIEF.commercialUse ? "Yes" : "No"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-xs">
                    <span className="text-white/50">{k}</span>
                    <span className="text-white font-mono">{v}</span>
                  </div>
                ))}
              </div>

              {/* Creator offer */}
              <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3 space-y-1.5">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Creator Offer</p>
                {[
                  ["Usage Type", licenseCreator.licensing.usageType],
                  ["Territory", licenseCreator.licensing.territory],
                  ["Exclusivity", licenseCreator.licensing.exclusivity],
                  ["Duration", licenseCreator.licensing.duration],
                ].map(([k, v]) => {
                  const mismatch =
                    (k === "Territory" && v !== BRIEF.territory) ||
                    (k === "Usage Type" && v !== BRIEF.usageType);
                  return (
                    <div key={k} className="flex items-center justify-between text-xs">
                      <span className="text-white/50">{k}</span>
                      <span className={`font-mono ${mismatch ? "text-rose-400 font-bold" : "text-white"}`}>
                        {v} {mismatch ? "⚠" : ""}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Result */}
              <div className={`rounded-xl p-3 text-xs font-bold text-center ${
                licenseCreator.licenseOk
                  ? "bg-lime-500/15 border border-lime-500/30 text-lime-400"
                  : "bg-rose-500/15 border border-rose-500/30 text-rose-400"
              }`}>
                {licenseCreator.licenseOk
                  ? "✓ Licensing terms compatible — safe to proceed"
                  : `⚠ Conflict detected: ${licenseCreator.licenseIssue}`}
              </div>
            </div>

            {/* Delivery Check */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
              <p className="text-sm font-bold text-white">AI Delivery Checker</p>
              <p className="text-xs text-white/40">Automatically validates media specs against brief requirements</p>
              {REVISIONS.map((r, i) => (
                <DeliveryCheckPanel key={r.v} revision={r} />
              ))}
              <div className="rounded-xl bg-lime-500/10 border border-lime-500/20 p-3 text-xs text-lime-300">
                <span className="font-bold text-lime-400">v2 is delivery-ready.</span> All technical specs pass. Aspect ratio 9:16 ✓ · Duration within 15-30s ✓ · Resolution 1080p ✓
              </div>
            </div>

            {/* Final Actions */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
              <p className="text-sm font-bold text-white">Campaign Actions</p>
              <div className="space-y-2">
                <button className="w-full py-3 rounded-xl bg-lime-400 text-black font-bold text-sm hover:bg-lime-300 transition">
                  ✓ Approve & Finalize Delivery
                </button>
                <button className="w-full py-2.5 rounded-xl border border-white/10 text-white/60 font-bold text-xs hover:bg-white/5 transition">
                  🔁 Request Another Revision
                </button>
                <button className="w-full py-2.5 rounded-xl border border-white/10 text-white/60 font-bold text-xs hover:bg-white/5 transition">
                  📄 Export License Agreement
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
