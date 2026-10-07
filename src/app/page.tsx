"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Navbar } from "@/components/Navbar";
import { NetworkCanvas } from "@/components/NetworkCanvas";
import {
  CreativeIntelligenceNetwork,
  SCENARIOS,
  IntelligenceScenario,
} from "@/components/CreativeIntelligenceNetwork";
import { CreatorProfile } from "@/lib/types";
import { DEMO_CREATORS } from "@/lib/demoData";

// Interactive Simulator Presets for Live Hero
const SIMULATOR_PRESETS = [
  {
    id: "sneaker",
    title: "Futuristic Running Shoe Reel",
    prompt: "High-energy 30-second commercial reel for QuantumStrider shoe. Needs kinetic camera motion, neon cyberpunk track, and commercial rights.",
    brief: {
      contentType: "Short-form Video (Reels/TikTok)",
      aspectRatio: "9:16 Vertical",
      tools: ["Runway Gen-3", "Midjourney v6.1", "Topaz 4K"],
      style: "Kinetic, Cyberpunk, High-Speed",
      commercial: "Commercial Rights Included",
    },
    matchedCreator: DEMO_CREATORS[0].creator, // Paul Trillo
    matchScore: 98,
    reelVideo: "/creators/paultrillo/reels/reel-1.mp4",
    whyReason: "World authority in kinetic commercial VFX, high-speed camera trajectories, and optical flow video synthesis across OpenAI Sora and Runway Gen-3.",
  },
  {
    id: "perfume",
    title: "Aura Noir Luxury Fragrance",
    prompt: "Slow-motion luxury perfume commercial with liquid simulation, obsidian bottle, velvet shadows, and editorial high-fashion aesthetics.",
    brief: {
      contentType: "Brand Commercials",
      aspectRatio: "16:9 Cinema & 9:16",
      tools: ["Flux.1 Dev", "Luma Ray 2", "DaVinci Resolve"],
      style: "High-Fashion, Liquid Simulation, Moody 35mm",
      commercial: "Commercial Rights Included",
    },
    matchedCreator: DEMO_CREATORS[2].creator, // Julie Wieland
    matchScore: 96,
    reelVideo: "/creators/juliewieland/reels/reel-1.mp4",
    whyReason: "Recognized leader in digital luxury and virtual fashion aesthetics with proven liquid lighting workflows and 35mm Kodak analog film grain emulation.",
  },
  {
    id: "scifi",
    title: "Genesis Sci-Fi Odyssey Trailer",
    prompt: "Cinematic 45-second deep-space trailer sequence with monolithic space habitats, orbital telemetry, and zero-gravity temporal realism.",
    brief: {
      contentType: "Cinematic Trailers",
      aspectRatio: "21:9 Widescreen Cinema",
      tools: ["Midjourney v6.1", "Runway Gen-3", "Topaz 4K"],
      style: "Sci-Fi Epic, Dystopian Architecture, Monolithic",
      commercial: "Commercial Rights Included",
    },
    matchedCreator: DEMO_CREATORS[1].creator, // Nicolas Neubert
    matchScore: 97,
    reelVideo: "/creators/nicolasneubert/reels/reel-1.mp4",
    whyReason: "Creator of viral Genesis trailer. Unmatched architectural worldbuilding pipelines and multi-shot temporal narrative consistency.",
  },
];

export default function Home() {
  const [activeHeroScenario, setActiveHeroScenario] = useState<IntelligenceScenario>(SCENARIOS[0]);
  const [heroPromptInput, setHeroPromptInput] = useState(SCENARIOS[0].userIdea);
  const [activePreset, setActivePreset] = useState(SIMULATOR_PRESETS[0]);
  const [pipelinePhase, setPipelinePhase] = useState<"ready" | "analyzing" | "matched">("matched");
  const [customPrompt, setCustomPrompt] = useState(SIMULATOR_PRESETS[0].prompt);
  const [featuredCreators, setFeaturedCreators] = useState<CreatorProfile[]>(
    DEMO_CREATORS.slice(0, 6).map((c) => c.creator)
  );

  const handleHeroScenarioSelect = (scenario: IntelligenceScenario) => {
    setActiveHeroScenario(scenario);
    setHeroPromptInput(scenario.userIdea);
  };

  const handleHeroPromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!heroPromptInput.trim()) return;
    const lower = heroPromptInput.toLowerCase();
    let best = SCENARIOS[0];
    if (lower.includes("watch") || lower.includes("perfume") || lower.includes("fashion") || lower.includes("luxury")) {
      best = SCENARIOS[1];
    } else if (lower.includes("sci-fi") || lower.includes("space") || lower.includes("game") || lower.includes("trailer")) {
      best = SCENARIOS[2];
    } else if (lower.includes("anime") || lower.includes("surreal") || lower.includes("particle") || lower.includes("fantasy")) {
      best = SCENARIOS[3];
    } else {
      best = SCENARIOS[0];
    }
    setActiveHeroScenario({
      ...best,
      id: "custom-" + Date.now(),
      userIdea: heroPromptInput.trim(),
    });
  };

  useEffect(() => {
    async function loadCreators() {
      try {
        const snap = await getDocs(collection(db, "creators"));
        if (!snap.empty) {
          const loaded: CreatorProfile[] = snap.docs.slice(0, 6).map((d) => ({
            ...(d.data() as unknown as CreatorProfile),
            username: d.id,
          }));
          setFeaturedCreators(loaded);
        }
      } catch {
        // Fallback to rich demo roster
      }
    }
    loadCreators();
  }, []);

  const handleSelectPreset = (preset: typeof SIMULATOR_PRESETS[0]) => {
    setActivePreset(preset);
    setCustomPrompt(preset.prompt);
    setPipelinePhase("analyzing");
    setTimeout(() => {
      setPipelinePhase("matched");
    }, 450);
  };

  const [globalMouse, setGlobalMouse] = useState<{ x: number; y: number } | null>(null);

  return (
    <main
      onMouseMove={(e) => setGlobalMouse({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setGlobalMouse(null)}
      className="relative min-h-screen bg-[#07080c] text-white selection:bg-indigo-500/30 selection:text-white"
    >
      {/* Subtle Interactive Ambient Cursor Spotlight */}
      {globalMouse && (
        <div
          className="pointer-events-none fixed inset-0 z-40 transition-opacity duration-300 opacity-60"
          style={{
            background: `radial-gradient(650px circle at ${globalMouse.x}px ${globalMouse.y}px, rgba(99, 102, 241, 0.05), transparent 75%)`,
          }}
        />
      )}
      <Navbar />

      {/* ======================================================== */}
      {/* 1. RECOMPOSED EDITORIAL HERO VIEWPORT */}
      {/* ======================================================== */}
      <section className="relative min-h-[88vh] overflow-hidden border-b border-white/[0.06] pt-8 pb-16 md:pt-14 md:pb-22">
        {/* Dark Atmospheric Background Environment */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/4 top-[-100px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-indigo-500/[0.08] blur-[150px]" />
          <div className="absolute right-0 top-1/4 h-[440px] w-[440px] rounded-full bg-cyan-500/[0.05] blur-[140px]" />
          <div className="absolute left-1/2 bottom-0 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-emerald-500/[0.04] blur-[130px]" />
          <div className="bg-grid-pattern absolute inset-0 opacity-25" />
        </div>

        {/* 3D Constellation Filament Layer */}
        <NetworkCanvas className="opacity-50" />

        <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
          {/* Two-Part Editorial Composition */}
          <div className="grid lg:grid-cols-12 items-center gap-10 lg:gap-14">
            {/* LEFT: Brand Message + Concise Value Proposition + Interactive Prompt Engine (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col items-start">
              {/* Eyebrow Pill */}
              <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#0c0e15]/90 px-3.5 py-1.5 backdrop-blur-xl shadow-lg">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] sm:text-[11px] font-mono tracking-widest uppercase text-slate-300">
                  THE AI-NATIVE CREATOR MARKETPLACE
                </span>
                <span className="text-slate-600 hidden sm:inline">•</span>
                <span className="text-[10px] font-mono text-emerald-400 font-semibold hidden sm:inline">
                  PLATFORM ONLINE
                </span>
              </div>

              {/* Editorial Headline */}
              <h1 className="mt-6 font-heading text-4xl sm:text-5xl lg:text-[3.25rem] xl:text-[3.65rem] font-bold tracking-tight text-white leading-[1.08]">
                Your idea.
                <br />
                <span className="bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                  The right AI creator.
                </span>
              </h1>

              {/* Supporting Copy */}
              <p className="mt-5 text-sm sm:text-base text-slate-300 leading-relaxed max-w-lg font-normal">
                Turn a rough campaign idea into a structured brief and discover creators matched to the tools, skills, formats and workflows your project actually needs.
              </p>

              {/* Compact Interactive Prompt Engine ("WHAT ARE YOU CREATING?") */}
              <div className="mt-7 w-full max-w-lg rounded-2xl border border-white/10 bg-[#0c0e15]/95 p-4 shadow-2xl backdrop-blur-xl ring-1 ring-white/5">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>WHAT ARE YOU CREATING?</span>
                  </label>
                  <span className="text-[10px] font-mono text-slate-500">Live AI Match</span>
                </div>

                <form onSubmit={handleHeroPromptSubmit} className="relative">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={heroPromptInput}
                      onChange={(e) => setHeroPromptInput(e.target.value)}
                      placeholder="e.g. Kinetic 30s running shoe reel with dynamic camera roll..."
                      className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-500/70 transition pr-24"
                    />
                    <button
                      type="submit"
                      className="absolute right-1 rounded-lg bg-white px-3 py-1.5 text-xs font-heading font-bold text-black hover:bg-slate-200 transition active:scale-95 shadow-md"
                    >
                      Analyze →
                    </button>
                  </div>
                </form>

                {/* Instant Concept Chips */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-mono text-slate-500 mr-0.5">Try:</span>
                  {SCENARIOS.map((scenario) => (
                    <button
                      key={scenario.id}
                      type="button"
                      onClick={() => handleHeroScenarioSelect(scenario)}
                      className={`rounded-full px-2.5 py-0.5 text-[10px] sm:text-[11px] font-medium transition-all ${
                        activeHeroScenario.id === scenario.id
                          ? "border border-indigo-400/50 bg-indigo-500/20 text-indigo-200 shadow-sm"
                          : "border border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white hover:border-white/20"
                      }`}
                    >
                      {scenario.shortLabel}
                    </button>
                  ))}
                </div>

                {/* Action Links */}
                <div className="mt-3.5 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                  <Link
                    href={`/brand?tab=create-brief&prompt=${encodeURIComponent(heroPromptInput)}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/[0.12] hover:text-white transition"
                  >
                    <span>Structure Full Brief with AI</span>
                    <span className="text-indigo-400">→</span>
                  </Link>

                  <Link
                    href="/discover"
                    className="text-xs font-mono text-slate-400 hover:text-white transition"
                  >
                    Explore Creators ↗
                  </Link>
                </div>
              </div>

              {/* Subtle Value Signals */}
              <div className="mt-8 pt-5 border-t border-white/[0.06] grid grid-cols-3 gap-4 w-full max-w-lg">
                <div>
                  <div className="font-heading font-bold text-white text-sm sm:text-base">7-Factor</div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">Match Scoring</div>
                </div>
                <div>
                  <div className="font-heading font-bold text-white text-sm sm:text-base">Verified</div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">Toolchains</div>
                </div>
                <div>
                  <div className="font-heading font-bold text-white text-sm sm:text-base">100% Cleared</div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">Commercial IP</div>
                </div>
              </div>
            </div>

            {/* RIGHT: Large Immersive Interactive Intelligence Network (7 Cols) */}
            <div className="lg:col-span-7 w-full">
              <CreativeIntelligenceNetwork
                activeScenarioId={activeHeroScenario.id}
                onScenarioChange={handleHeroScenarioSelect}
                externalCustomPrompt={heroPromptInput}
              />
            </div>
          </div>

          {/* Editorial Flow Ribbon: Hero -> Pipeline Transition */}
          <div className="relative mt-16 sm:mt-20 pt-8 border-t border-white/[0.06] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            {/* Luminous Center Drop Filament */}
            <div className="pointer-events-none absolute -bottom-16 left-1/2 -translate-x-1/2 h-16 w-px bg-gradient-to-b from-indigo-500/50 via-cyan-400/40 to-transparent hidden md:block" />

            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono">
                ⚡
              </div>
              <div>
                <span className="text-[10px] font-mono tracking-widest uppercase text-indigo-400 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  Continuous Intelligence Architecture
                </span>
                <p className="text-xs text-slate-400 mt-0.5">
                  From natural-language ideation to verified multi-model creator delivery.
                </p>
              </div>
            </div>

            <a
              href="#pipeline"
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] font-mono text-slate-300 hover:border-indigo-400/40 hover:bg-white/[0.06] hover:text-white transition group"
            >
              <span>Explore Live Pipeline Simulator</span>
              <span className="text-indigo-400 transition-transform group-hover:translate-y-0.5">↓</span>
            </a>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. LIVE INTELLIGENCE PIPELINE SIMULATOR */}
      {/* ======================================================== */}
      <section id="pipeline" className="relative border-b border-white/[0.06] bg-[#07080c] py-20 md:py-28">
        <div className="relative z-10 mx-auto max-w-5xl px-5 md:px-8">
          <div className="relative rounded-2xl border border-white/[0.1] bg-[#0c0e15]/90 p-5 shadow-2xl backdrop-blur-2xl md:p-7">
              {/* Pipeline Step Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs font-bold text-amber-300">
                    ⚡
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-white">Live Intelligence Pipeline Simulator</h2>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-mono font-bold uppercase transition ${
                        pipelinePhase === "analyzing"
                          ? "bg-sky-500/20 text-sky-300 animate-pulse border border-sky-500/30"
                          : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      }`}>
                        {pipelinePhase === "analyzing" ? "Synthesizing Brief..." : "Pipeline Active"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">See how KreaLink turns an unstructured idea into an engagement</p>
                  </div>
                </div>

                {/* Preset Chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-mono text-white/40 mr-1">Presets:</span>
                  {SIMULATOR_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                        activePreset.id === preset.id
                          ? "border border-amber-400/40 bg-amber-400/10 text-amber-300 font-semibold shadow-sm"
                          : "border border-white/[0.08] bg-white/[0.03] text-white/60 hover:text-white"
                      }`}
                    >
                      {preset.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4-Step Visual Flow Grid */}
              <div className="mt-6 grid gap-4 lg:grid-cols-12">
                {/* Step 1 & 2: Raw Idea & Structured Brief (Left 7 Cols) */}
                <div className="space-y-4 lg:col-span-7">
                  {/* Step 1: Input Idea */}
                  <div className="rounded-xl border border-white/[0.07] bg-black/40 p-4">
                    <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-400">
                      <span>1. Brand Campaign Vision</span>
                      <span className="text-amber-400">Natural Language</span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-200 italic">
                      &quot;{customPrompt}&quot;
                    </p>
                  </div>

                  {/* Step 2: AI Structured Brief Extracted */}
                  <div className="rounded-xl border border-white/[0.07] bg-black/40 p-4">
                    <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-400">
                      <span>2. AI Structured Brief Extraction</span>
                      <span className="text-sky-400">Auto-Synthesized</span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                      <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-2.5">
                        <p className="text-[10px] text-white/40 uppercase font-mono">Format</p>
                        <p className="mt-0.5 font-semibold text-slate-200">{activePreset.brief.aspectRatio}</p>
                      </div>

                      <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-2.5">
                        <p className="text-[10px] text-white/40 uppercase font-mono">Deliverable</p>
                        <p className="mt-0.5 font-semibold text-slate-200">{activePreset.brief.contentType}</p>
                      </div>

                      <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-2.5 col-span-2 sm:col-span-1">
                        <p className="text-[10px] text-white/40 uppercase font-mono">Licensing</p>
                        <p className="mt-0.5 font-semibold text-emerald-400">Commercial Ready</p>
                      </div>
                    </div>

                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {activePreset.brief.tools.map((tool) => (
                        <span key={tool} className="rounded-md border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-300">
                          {tool}
                        </span>
                      ))}
                      <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-300">
                        {activePreset.brief.style}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Step 3 & 4: 7-Factor Match & Creator Card (Right 5 Cols) */}
                <div className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-black/60 p-4">
                  {/* Step 3: Match Header */}
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                          3. 7-Factor Algorithmic Match
                        </span>
                      </div>
                      <div className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-black text-emerald-300">
                        {activePreset.matchScore}% Match
                      </div>
                    </div>

                    {/* Creator Identity Snapshot */}
                    <div className="mt-3.5 flex items-center gap-3">
                      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-amber-500/20 to-sky-500/20 text-sm font-bold text-white shadow-inner overflow-hidden">
                        {activePreset.matchedCreator.profilePhoto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={activePreset.matchedCreator.profilePhoto}
                            alt={activePreset.matchedCreator.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          activePreset.matchedCreator.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-bold text-white">{activePreset.matchedCreator.name}</h3>
                          <span className="text-[10px] text-emerald-400" title="Platform Verified">✓</span>
                        </div>
                        <p className="text-[11px] text-slate-400">{activePreset.matchedCreator.specialization}</p>
                      </div>
                    </div>

                    {/* Explanatory "Why This Creator?" */}
                    <div className="mt-3 rounded-lg border border-white/[0.05] bg-black/40 p-2.5 text-[11px] leading-relaxed text-slate-300">
                      <span className="font-semibold text-amber-300">Why Selected: </span>
                      {activePreset.whyReason}
                    </div>
                  </div>

                  {/* Step 4: Video Preview & Direct Action */}
                  <div className="mt-4 pt-3 border-t border-white/[0.06]">
                    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-white/10 bg-black">
                      <video
                        src={activePreset.reelVideo}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-mono text-white/80 backdrop-blur-md">
                        Generated via {activePreset.brief.tools[0]}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <Link
                        href={`/${activePreset.matchedCreator.username}`}
                        className="flex-1 rounded-lg bg-white py-2 text-center text-xs font-bold text-black transition hover:bg-slate-200"
                      >
                        Inspect Portfolio
                      </Link>
                      <Link
                        href={`/brand?tab=matches`}
                        className="flex-1 rounded-lg border border-white/10 bg-white/[0.05] py-2 text-center text-xs font-semibold text-white transition hover:bg-white/[0.1]"
                      >
                        Invite Creator
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      {/* ======================================================== */}
      {/* 2. THE MARKETPLACE PARADIGM SHIFT: BROKEN VS KREALINK */}
      {/* ======================================================== */}
      <section className="relative z-10 border-b border-white/[0.06] bg-[#07080c] py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-amber-400">The Problem & The Shift</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
              Why Traditional Freelance Platforms Fail at AI Content.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-400 sm:text-base">
              Traditional marketplaces search keywords on résumés. Generative AI production requires verifying model architectures, prompt workflows, temporal consistency, and clean commercial rights.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {/* The Old Way */}
            <div className="rounded-2xl border border-red-500/20 bg-red-950/[0.08] p-6 md:p-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400">
                <span>✕ The Legacy Approach</span>
              </div>
              <h3 className="mt-4 text-xl font-bold text-white">Manual Guesswork & Unverified Output</h3>
              
              <ul className="mt-6 space-y-3.5 text-xs sm:text-sm text-slate-400">
                <li className="flex items-start gap-2.5">
                  <span className="text-red-400 font-bold">✕</span>
                  <span>Search through thousands of static graphic designers hoping they know video synthesis.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-400 font-bold">✕</span>
                  <span>Unstructured briefs leading to weeks of email back-and-forth about aspect ratios and camera motion.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-400 font-bold">✕</span>
                  <span>Zero visibility into generative toolchains (Runway, Kling, ComfyUI, LoRAs).</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-400 font-bold">✕</span>
                  <span>Ambiguous IP and commercial usage clearance, exposing brands to copyright risk.</span>
                </li>
              </ul>
            </div>

            {/* The KreaLink Way */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/[0.1] p-6 md:p-8 shadow-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                <span>✓ The KreaLink Engine</span>
              </div>
              <h3 className="mt-4 text-xl font-bold text-white">AI-Native Creative Intelligence</h3>

              <ul className="mt-6 space-y-3.5 text-xs sm:text-sm text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>AI Brief Builder:</strong> Natural language prompts instantly structured into production specs.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>7-Factor Explainable Scoring:</strong> Understand exactly why a creator matches your visual goals.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Platform Verified Signals:</strong> Audited tools, reproducible prompt recipes, and video portfolios.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Guaranteed Commercial Clearance:</strong> Explicit verified rights assignment on every deliverable.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. CURATED AI CREATOR ROSTER WITH REAL VIDEO REELS */}
      {/* ======================================================== */}
      <section className="relative z-10 border-b border-white/[0.06] bg-[#07080c] py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-amber-400">Curated Creator Roster</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Trained on the World&apos;s Leading Models.
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Browse elite creators verified across Runway Gen-3, Midjourney, Flux.1, Kling 1.5, and ComfyUI pipelines.
              </p>
            </div>

            <Link
              href="/discover"
              className="text-xs font-bold text-amber-400 transition hover:text-amber-300 flex items-center gap-1"
            >
              <span>Explore All Creators</span>
              <span>→</span>
            </Link>
          </div>

          {/* Creators Portfolio Cards */}
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredCreators.map((creator) => {
              const matchedDemo = DEMO_CREATORS.find(
                (d) => d.creator.username.toLowerCase() === creator.username.toLowerCase()
              );
              const reelClip =
                matchedDemo?.portfolio[0]?.mediaUrl ||
                `/creators/${creator.username}/reels/reel-1.mp4`;
              const reelPoster =
                matchedDemo?.portfolio[0]?.thumbnailUrl ||
                `/creators/${creator.username}/reels/reel-1.jpg`;

              return (
                <div
                  key={creator.username}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0e15] transition-all duration-300 hover:border-white/20 hover:shadow-2xl"
                >
                  {/* Playable Video Preview */}
                  <div className="relative aspect-[9/12] w-full overflow-hidden bg-black">
                    <video
                      src={reelClip}
                      poster={reelPoster}
                      preload="metadata"
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Top Badges */}
                    <div className="absolute top-3 inset-x-3 flex items-center justify-between">
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-950/80 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 backdrop-blur-md">
                        ✓ Verified Signal
                      </span>
                      <span className="rounded-full border border-white/15 bg-black/60 px-2.5 py-0.5 text-[10px] font-mono text-white/80 backdrop-blur-md">
                        {creator.commercialUse ? "Commercial Ready" : "Editorial"}
                      </span>
                    </div>

                    {/* Tool Badges on Video Bottom */}
                    <div className="absolute bottom-3 inset-x-3 flex flex-wrap gap-1">
                      {creator.aiTools.slice(0, 3).map((tool) => (
                        <span
                          key={tool}
                          className="rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-md"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Card Metadata */}
                  <div className="flex flex-1 flex-col justify-between p-5">
                    <div>
                      <div className="flex items-center gap-3">
                        {creator.profilePhoto ? (
                          <Image
                            src={creator.profilePhoto}
                            alt={creator.name}
                            width={40}
                            height={40}
                            className="h-10 w-10 rounded-full object-cover border border-white/10 shrink-0"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white shrink-0">
                            {creator.name.slice(0, 1)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition truncate">
                              {creator.name}
                            </h3>
                            <span className="text-xs font-mono text-white/40 shrink-0">@{creator.username}</span>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">{creator.specialization}</p>
                        </div>
                      </div>

                      <p className="mt-3 text-xs leading-relaxed text-slate-300 line-clamp-2">
                        {creator.bio}
                      </p>
                    </div>

                    <div className="mt-5 flex items-center gap-2 pt-4 border-t border-white/[0.06]">
                      <Link
                        href={`/${creator.username}`}
                        className="flex-1 rounded-lg bg-white/[0.06] py-2 text-center text-xs font-bold text-white transition hover:bg-white/[0.12]"
                      >
                        View Profile
                      </Link>
                      <Link
                        href={`/brand?tab=create-brief`}
                        className="flex-1 rounded-lg border border-amber-500/30 bg-amber-500/10 py-2 text-center text-xs font-bold text-amber-300 transition hover:bg-amber-500/20"
                      >
                        Invite
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. THE 7-FACTOR EXPLAINABLE MATCHING ALGORITHM */}
      {/* ======================================================== */}
      <section className="relative z-10 border-b border-white/[0.06] bg-[#07080c] py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-amber-400">Algorithmic Precision</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
              Explainable Matching. No Random Guesses.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-400 sm:text-base">
              Every score on KreaLink is mathematically grounded in 7 objective compatibility dimensions, ensuring brands find creators with proven mastery of the required toolchains.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-white/[0.08] bg-[#0c0e15] p-5">
              <span className="font-mono text-2xl font-bold text-amber-400">25%</span>
              <h3 className="mt-2 text-sm font-bold text-white">Content Type Alignment</h3>
              <p className="mt-1 text-xs text-slate-400">Exact match on vertical reels, 3D spots, or cinematic motion design.</p>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-[#0c0e15] p-5">
              <span className="font-mono text-2xl font-bold text-amber-400">20%</span>
              <h3 className="mt-2 text-sm font-bold text-white">AI Skills Depth</h3>
              <p className="mt-1 text-xs text-slate-400">Character consistency, camera control, prompt engineering, temporal stability.</p>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-[#0c0e15] p-5">
              <span className="font-mono text-2xl font-bold text-amber-400">15%</span>
              <h3 className="mt-2 text-sm font-bold text-white">AI Toolchain Verification</h3>
              <p className="mt-1 text-xs text-slate-400">Active demonstrated mastery in Runway Gen-3, Midjourney, Kling, ComfyUI.</p>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-[#0c0e15] p-5">
              <span className="font-mono text-2xl font-bold text-amber-400">15%</span>
              <h3 className="mt-2 text-sm font-bold text-white">Creative Specialization</h3>
              <p className="mt-1 text-xs text-slate-400">Specific domain authority (Footwear, Luxury Beauty, Sci-Fi Anime, VFX).</p>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-[#0c0e15] p-5">
              <span className="font-mono text-2xl font-bold text-sky-400">10%</span>
              <h3 className="mt-2 text-sm font-bold text-white">Format & Aspect Ratio</h3>
              <p className="mt-1 text-xs text-slate-400">9:16 Vertical, 4K UHD 60fps, social cut-down specifications.</p>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-[#0c0e15] p-5">
              <span className="font-mono text-2xl font-bold text-emerald-400">10%</span>
              <h3 className="mt-2 text-sm font-bold text-white">Commercial License Ready</h3>
              <p className="mt-1 text-xs text-slate-400">Guaranteed clearance for worldwide advertising and broadcast use.</p>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-[#0c0e15] p-5 col-span-2">
              <span className="font-mono text-2xl font-bold text-sky-400">5%</span>
              <h3 className="mt-2 text-sm font-bold text-white">Portfolio Semantic Relevance</h3>
              <p className="mt-1 text-xs text-slate-400">Verified prior work pieces closely mirroring campaign aesthetic requirements.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 5. PLATFORM VERIFICATION SIGNALS */}
      {/* ======================================================== */}
      <section className="relative z-10 border-b border-white/[0.06] bg-[#07080c] py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-black/80 p-8 md:p-12">
            <div className="grid gap-8 lg:grid-cols-12 items-center">
              <div className="lg:col-span-6">
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  Platform Verification Framework
                </span>
                <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Confidence Built on Transparent Verification Signals.
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  Every creator profile displays four transparent verification tiers. We verify actual model proficiency and workflow consistency so you can hire without friction.
                </p>

                <div className="mt-6 flex flex-wrap gap-4">
                  <Link
                    href="/brand?tab=create-brief"
                    className="rounded-full bg-white px-6 py-2.5 text-xs font-bold text-black transition hover:bg-slate-200"
                  >
                    Start a Verified Campaign
                  </Link>
                  <Link
                    href="/join-creator"
                    className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-2.5 text-xs font-semibold text-white transition hover:bg-white/[0.08]"
                  >
                    Get Verified as a Creator
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-6 grid grid-cols-2 gap-3.5">
                <div className="rounded-xl border border-white/[0.08] bg-black/60 p-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 text-sm">
                    🛡️
                  </div>
                  <h3 className="mt-3 text-xs font-bold text-white">Tool Verified</h3>
                  <p className="mt-1 text-[11px] text-slate-400">Demonstrated proficiency across specified AI generation tools.</p>
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-black/60 p-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 text-sm">
                    ⚙️
                  </div>
                  <h3 className="mt-3 text-xs font-bold text-white">Workflow Proven</h3>
                  <p className="mt-1 text-[11px] text-slate-400">Multi-step reproducible prompt workflows and pipeline logs.</p>
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-black/60 p-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 text-sm">
                    🎬
                  </div>
                  <h3 className="mt-3 text-xs font-bold text-white">Portfolio Audited</h3>
                  <p className="mt-1 text-[11px] text-slate-400">Original high-fidelity 4K video assets and keyframe archives.</p>
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-black/60 p-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 text-sm">
                    📄
                  </div>
                  <h3 className="mt-3 text-xs font-bold text-white">Commercial Clearance</h3>
                  <p className="mt-1 text-[11px] text-slate-400">Explicit commercial rights grant on final deliverables.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 6. FINAL EDITORIAL CALL TO ACTION */}
      {/* ======================================================== */}
      <section className="relative z-10 py-24 text-center">
        <div className="mx-auto max-w-4xl px-5 md:px-8">
          <p className="font-mono text-xs uppercase tracking-widest text-amber-400">Ready to Produce?</p>
          <h2 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            Your Next Campaign
            <br />
            <span className="bg-gradient-to-r from-white via-slate-200 to-amber-200 bg-clip-text text-transparent">
              Starts With an Idea.
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
            Join the forward-thinking brands pairing generative imagination with master AI directors. From brief to engagement in minutes.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
            <Link
              href="/brand?tab=create-brief"
              className="rounded-full bg-white px-8 py-3.5 text-xs font-bold text-black transition hover:bg-slate-200 active:scale-95 shadow-xl shadow-white/10"
            >
              Structure a Brief with AI →
            </Link>

            <Link
              href="/discover"
              className="rounded-full border border-white/15 bg-white/[0.04] px-8 py-3.5 text-xs font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.08]"
            >
              Browse Creator Network
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] bg-[#050608] py-8 text-center text-xs text-white/40">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 md:px-8">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white/80">KreaLink</span>
            <span>— AI-Native Creator Marketplace</span>
          </div>
          <div className="flex items-center gap-6 font-mono text-[11px]">
            <Link href="/discover" className="hover:text-white transition">Discover</Link>
            <Link href="/brand" className="hover:text-white transition">Brand Hub</Link>
            <Link href="/creator-studio" className="hover:text-white transition">Creator Studio</Link>
            <Link href="/join-creator" className="hover:text-white transition">Join</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
