"use client";

import { useRef, useState, useTransition, useEffect, useCallback } from "react";
import Link from "next/link";
import { DEMO_CREATORS } from "@/lib/demoData";
import { KreaLinkLogo } from "./KreaLinkLogo";

// Concept scenarios for the interactive intelligence showcase
export interface IntelligenceScenario {
  id: string;
  name: string;
  shortLabel: string;
  userIdea: string;
  activeCapabilities: string[];
  matchedCreatorUsername: string;
  creatorName: string;
  creatorRole: string;
  creatorAvatarInitial: string;
  matchScore: number;
  matchConfidence: "HIGH" | "MEDIUM" | "LOW";
  whyExplanation: string;
  keySkills: string[];
  sampleReelVideo: string;
}

export const SCENARIOS: IntelligenceScenario[] = [
  {
    id: "sneaker",
    name: "Futuristic Performance Visual",
    shortLabel: "👟 Kinetic Film",
    userIdea: "High-velocity commercial campaign with dynamic camera trajectories, neon shutter drag, and photorealistic optical physics.",
    activeCapabilities: ["Cinematic VFX", "Runway Gen-3", "Midjourney v6.1", "9:16 Vertical", "Commercial Use"],
    matchedCreatorUsername: "paultrillo",
    creatorName: "Paul Trillo",
    creatorRole: "AI Film Director & Experimental VFX Pioneer",
    creatorAvatarInitial: "P",
    matchScore: 98,
    matchConfidence: "HIGH",
    whyExplanation: "Cinematic Directing · Optical Flow Dynamics · Sora & Gen-3 Pipeline · 100% Commercial Clearance",
    keySkills: ["Dynamic Camera Trajectories", "Generative VFX", "Optical Flow Dynamics"],
    sampleReelVideo: "/creators/paultrillo/reels/reel-1.mp4",
  },
  {
    id: "fragrance",
    name: "Luxury Fragrance & Virtual Fashion",
    shortLabel: "✨ Luxury Editorial",
    userIdea: "Slow-motion luxury campaign with fluid textile simulations, obsidian glass, velvet shadows, and evocative 35mm film lighting.",
    activeCapabilities: ["Analog 35mm Film", "Flux.1 Dev", "Midjourney v6.1", "Commercial Use"],
    matchedCreatorUsername: "juliewieland",
    creatorName: "Julie Wieland",
    creatorRole: "AI Cinematographer & Editorial Fashion Visualizer",
    creatorAvatarInitial: "J",
    matchScore: 96,
    matchConfidence: "HIGH",
    whyExplanation: "High-Fashion Editorial · 35mm Analog Lighting · Character Consistency · Verified Clearance",
    keySkills: ["Analog Film Emulation", "Editorial Lighting", "Character Consistency"],
    sampleReelVideo: "/creators/juliewieland/reels/reel-1.mp4",
  },
  {
    id: "scifi",
    name: "Genesis Deep-Space Odyssey",
    shortLabel: "🚀 Sci-Fi Epic",
    userIdea: "Cinematic deep-space station sequence with orbital logistics, monolithic architecture, and zero-gravity temporal realism.",
    activeCapabilities: ["Worldbuilding", "Runway Gen-3", "Midjourney v6.1", "Cinematic VFX", "Commercial Use"],
    matchedCreatorUsername: "nicolasneubert",
    creatorName: "Nicolas Neubert",
    creatorRole: "Sci-Fi AI Worldbuilder & Cinematic Director",
    creatorAvatarInitial: "N",
    matchScore: 97,
    matchConfidence: "HIGH",
    whyExplanation: "Genesis Worldbuilding · Temporal Coherence · Multi-Shot Camera Dolly · 4K Mastery",
    keySkills: ["Cinematic Worldbuilding", "Spatial Architecture", "Temporal Narrative Coherence"],
    sampleReelVideo: "/creators/nicolasneubert/reels/reel-1.mp4",
  },
  {
    id: "surreal",
    name: "Surreal Fantasy & Hybrid VFX",
    shortLabel: "🧬 Surreal Particle Art",
    userIdea: "Haunting poetic visual story with levitating physical objects, bioluminescent botanical overgrowth, and hybrid 3D particle VFX.",
    activeCapabilities: ["Worldbuilding", "Cinematic VFX", "Flux.1 Dev", "Runway Gen-3", "Commercial Use"],
    matchedCreatorUsername: "kavancardoza",
    creatorName: "Kavan Cardoza",
    creatorRole: "AI Surrealist & High-Concept VFX Director",
    creatorAvatarInitial: "K",
    matchScore: 95,
    matchConfidence: "HIGH",
    whyExplanation: "Surreal Dark Fantasy · Blender 3D Hybrid VFX · ComfyUI ControlNet · Particle FX Mastery",
    keySkills: ["Surreal World Design", "Complex Particle FX", "Practical & AI Hybrid VFX"],
    sampleReelVideo: "/creators/kavancardoza/reels/reel-1.mp4",
  },
];

// Rich data for 8 balanced capability nodes orbiting around center
export interface CapabilityNode {
  id: string;
  label: string;
  category: "skill" | "tool" | "format" | "rights";
  badge: string;
  metric: string;
  tooltipTitle: string;
  tooltipDescription: string;
  deepDescription: string;
  creatorsCount: number;
  xPct: number; // percentage in visualization layout (0 - 100)
  yPct: number;
}

// 8 Ergonomically balanced perimeter coordinates (Zero overlapping zones)
export const CAPABILITY_NODES: CapabilityNode[] = [
  {
    id: "Cinematic VFX",
    label: "Cinematic VFX",
    category: "skill",
    badge: "Discipline",
    metric: "99.2% Consistency",
    tooltipTitle: "Cinematic Direction & VFX",
    tooltipDescription: "Camera motion control, lighting consistency, and filmic composition across generative video models.",
    deepDescription: "Multi-shot directorial pipeline integrating dynamic optical physics, volumetric atmospheric lighting, and high-speed shutter simulation across Gen-3 and Kling engines.",
    creatorsCount: 38,
    xPct: 18,
    yPct: 18,
  },
  {
    id: "Worldbuilding",
    label: "Worldbuilding",
    category: "skill",
    badge: "Specialization",
    metric: "Temporal Coherence",
    tooltipTitle: "Spatial & Conceptual Coherence",
    tooltipDescription: "Architectural and environmental multi-shot continuity across extended cinematic scenes.",
    deepDescription: "Complex environmental continuity pipelines maintaining structural geometry, weather patterns, and futuristic urban topography across multi-angle camera coverage.",
    creatorsCount: 24,
    xPct: 50,
    yPct: 12,
  },
  {
    id: "Analog 35mm Film",
    label: "Analog 35mm Film",
    category: "skill",
    badge: "Aesthetics",
    metric: "Color Science & Grain",
    tooltipTitle: "35mm Analog Film Emulation",
    tooltipDescription: "Organic film stock grain, halation, and natural color science emulating Kodak 5219 and 35mm primes.",
    deepDescription: "Curated prompt and LoRA styling protocols replicating photochemical emulsion physics, anamorphic bokeh, and controlled halation without synthetic digital artifacts.",
    creatorsCount: 27,
    xPct: 82,
    yPct: 18,
  },
  {
    id: "Runway Gen-3",
    label: "Runway Gen-3",
    category: "tool",
    badge: "Video Model",
    metric: "4K Motion Vectoring",
    tooltipTitle: "Runway Gen-3 Alpha Model",
    tooltipDescription: "High-fidelity temporal video synthesis used for kinetic camera moves and fluid physical dynamics.",
    deepDescription: "State-of-the-art temporal diffusion model tuned for high-velocity tracking, continuous character identities, and precision prompt-guided motion vectoring.",
    creatorsCount: 42,
    xPct: 88,
    yPct: 50,
  },
  {
    id: "9:16 Vertical",
    label: "9:16 Vertical",
    category: "format",
    badge: "Aspect Ratio",
    metric: "Mobile Native 60fps",
    tooltipTitle: "Social Reel / TikTok Format",
    tooltipDescription: "Native 1080x1920 vertical delivery optimized for thumb-stop mobile retention and dynamic social campaigns.",
    deepDescription: "Vertical composition optimized for mobile engagement, high-density thumb-stop retention, and dynamic safe-zone framing across TikTok, Reels, and Shorts.",
    creatorsCount: 49,
    xPct: 82,
    yPct: 82,
  },
  {
    id: "Commercial Use",
    label: "Commercial Use",
    category: "rights",
    badge: "Verified Signal",
    metric: "100% Cleared IP",
    tooltipTitle: "Direct Commercial Rights",
    tooltipDescription: "Creator-verified commercial clearance for global client deliverables, advertising, and broadcast deployment.",
    deepDescription: "Full IP and commercial deliverable rights indemnity directly cleared by verified creator tiers for high-budget broadcast, paid social, and global digital deployment.",
    creatorsCount: 60,
    xPct: 50,
    yPct: 88,
  },
  {
    id: "Midjourney v6.1",
    label: "Midjourney v6.1",
    category: "tool",
    badge: "Keyframing",
    metric: "Style Anchor",
    tooltipTitle: "Midjourney v6.1 Concept Generation",
    tooltipDescription: "Photorealistic keyframing and style anchoring before video motion synthesis.",
    deepDescription: "Foundational aesthetic framing engine generating pixel-perfect baseline keyframes, custom lighting schemas, and character visual anchors prior to temporal interpolation.",
    creatorsCount: 56,
    xPct: 18,
    yPct: 82,
  },
  {
    id: "Flux.1 Dev",
    label: "Flux.1 Dev",
    category: "tool",
    badge: "Open Weights",
    metric: "Sub-Pixel Detail",
    tooltipTitle: "Flux.1 High-Resolution Model",
    tooltipDescription: "Precision prompt adherence, sub-pixel text rendering, and anatomical consistency for commercial production.",
    deepDescription: "12-billion parameter flow-matching transformer model with industry-leading text rendering, intricate micro-textures, and photorealistic skin subsurface scattering.",
    creatorsCount: 29,
    xPct: 12,
    yPct: 50,
  },
];

export interface CreativeIntelligenceNetworkProps {
  activeScenarioId?: string;
  onScenarioChange?: (scenario: IntelligenceScenario) => void;
  externalCustomPrompt?: string;
}

export function CreativeIntelligenceNetwork({
  activeScenarioId,
  onScenarioChange,
  externalCustomPrompt,
}: CreativeIntelligenceNetworkProps) {
  const [internalScenario, setInternalScenario] = useState<IntelligenceScenario>(() => {
    if (activeScenarioId) {
      const match = SCENARIOS.find((s) => s.id === activeScenarioId);
      if (match) return match;
    }
    return SCENARIOS[0];
  });

  const activeScenario = internalScenario;

  const [customInput, setCustomInput] = useState("");
  const [analyzingState, setAnalyzingState] = useState<"idle" | "evaluating" | "converged">("converged");
  const [hoveredNode, setHoveredNode] = useState<CapabilityNode | null>(null);
  const [inspectedNode, setInspectedNode] = useState<CapabilityNode | null>(null);
  const [resonanceWave, setResonanceWave] = useState(false);
  const [, startTransition] = useTransition();

  // Synchronize with external activeScenarioId if provided
  useEffect(() => {
    if (activeScenarioId && activeScenarioId !== internalScenario.id) {
      const target = SCENARIOS.find((s) => s.id === activeScenarioId);
      if (target) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setInternalScenario(target);
        setAnalyzingState("evaluating");
        setResonanceWave(true);
        setTimeout(() => setResonanceWave(false), 800);
        setTimeout(() => {
          startTransition(() => {
            setAnalyzingState("converged");
          });
        }, 400);
      }
    }
  }, [activeScenarioId, internalScenario.id]);

  // Synchronize with external prompt if provided
  useEffect(() => {
    if (externalCustomPrompt && externalCustomPrompt !== internalScenario.userIdea) {
      const lower = externalCustomPrompt.toLowerCase();
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

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInternalScenario({
        ...best,
        id: "custom-" + Date.now(),
        userIdea: externalCustomPrompt,
      });
      setAnalyzingState("evaluating");
      setResonanceWave(true);
      setTimeout(() => setResonanceWave(false), 800);
      setTimeout(() => setAnalyzingState("converged"), 400);
    }
  }, [externalCustomPrompt, internalScenario.userIdea]);

  // Mouse coordinates inside the constellation canvas for wobbly magnetic physics
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [wobbleMap, setWobbleMap] = useState<Record<string, { x: number; y: number; scale: number }>>({});

  // 3D Chassis Tilt & Cursor Position Tracking
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    // Controlled 3D tilt
    const rotateY = (x / (rect.width / 2)) * 3.5;
    const rotateX = -(y / (rect.height / 2)) * 3.5;
    setTilt({ rotateX, rotateY });

    if (canvasRef.current) {
      const cRect = canvasRef.current.getBoundingClientRect();
      setCursorPos({
        x: e.clientX - cRect.left,
        y: e.clientY - cRect.top,
      });
    }
  };

  const handleMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0 });
    setCursorPos(null);
    setHoveredNode(null);
    setWobbleMap({});
  };

  // Update dynamic magnetic spring wobble when cursor moves near nodes
  const calculateWobbles = useCallback(() => {
    if (!canvasRef.current || !cursorPos) {
      setWobbleMap({});
      return;
    }
    const cWidth = canvasRef.current.clientWidth;
    const cHeight = canvasRef.current.clientHeight;

    const nextWobbles: Record<string, { x: number; y: number; scale: number }> = {};
    const threshold = 140; // proximity threshold in px

    CAPABILITY_NODES.forEach((node, idx) => {
      // When hovered, lock in place steadily with slight scale so tooltip text is 100% stable & legible
      if (hoveredNode?.id === node.id) {
        nextWobbles[node.id] = { x: 0, y: 0, scale: 1.05 };
        return;
      }

      const nodeX = (node.xPct / 100) * cWidth;
      const nodeY = (node.yPct / 100) * cHeight;
      const dx = cursorPos.x - nodeX;
      const dy = cursorPos.y - nodeY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < threshold) {
        const intensity = 1 - dist / threshold;
        const time = Date.now() / 180;
        const wobbleFactor = Math.sin(time + idx * 1.5) * 3;
        const pushX = (dx / (dist || 1)) * intensity * 16 + wobbleFactor;
        const pushY = (dy / (dist || 1)) * intensity * 16 + wobbleFactor * 0.8;
        const scale = 1 + intensity * 0.1;
        nextWobbles[node.id] = { x: pushX, y: pushY, scale };
      }
    });

    setWobbleMap(nextWobbles);
  }, [cursorPos, hoveredNode]);

  useEffect(() => {
    if (!cursorPos) return;
    const anim = requestAnimationFrame(calculateWobbles);
    return () => cancelAnimationFrame(anim);
  }, [cursorPos, calculateWobbles]);

  const triggerScenario = (scenario: IntelligenceScenario) => {
    setInternalScenario(scenario);
    setCustomInput("");
    setAnalyzingState("evaluating");
    setResonanceWave(true);
    setTimeout(() => setResonanceWave(false), 800);
    setTimeout(() => {
      startTransition(() => {
        setAnalyzingState("converged");
      });
    }, 450);

    if (onScenarioChange) {
      onScenarioChange(scenario);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    const lower = customInput.toLowerCase();

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

    const syntheticScenario: IntelligenceScenario = {
      ...best,
      id: "custom-" + Date.now(),
      name: "Custom Campaign Idea",
      shortLabel: "Custom Idea",
      userIdea: customInput.trim(),
    };

    setInternalScenario(syntheticScenario);
    setAnalyzingState("evaluating");
    setResonanceWave(true);
    setTimeout(() => setResonanceWave(false), 800);
    setTimeout(() => {
      startTransition(() => {
        setAnalyzingState("converged");
      });
    }, 500);

    if (onScenarioChange) {
      onScenarioChange(syntheticScenario);
    }
  };

  // Node Click Pop-up Action
  const handleNodeClick = (node: CapabilityNode) => {
    setInspectedNode(node);
  };

  // Central Core Click Resonance Pulse
  const handleCoreClick = () => {
    setResonanceWave(true);
    setAnalyzingState("evaluating");
    setTimeout(() => setResonanceWave(false), 900);
    setTimeout(() => setAnalyzingState("converged"), 450);
  };

  // Find demo creator profile data if exists
  const creatorData = DEMO_CREATORS.find(
    (c) => c.creator.username === activeScenario.matchedCreatorUsername
  )?.creator;

  // Currently focused node (hovered node or active first node)
  const activeDisplayNode = hoveredNode || CAPABILITY_NODES[0];

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full select-none"
      style={{
        perspective: "1200px",
      }}
    >
      {/* Outer Spatial Chassis */}
      <div
        className="relative rounded-3xl border border-white/[0.08] bg-[#090b11]/95 p-5 sm:p-6 shadow-[0_20px_70px_rgba(0,0,0,0.85)] backdrop-blur-2xl transition-transform duration-300 ease-out will-change-transform"
        style={{
          transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
        }}
      >
        {/* Ambient Atmospheric Glows */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-52 w-80 -translate-x-1/2 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-44 w-44 rounded-full bg-cyan-500/10 blur-2xl" />

        {/* Header Telemetry Status Bar */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  analyzingState === "evaluating" ? "bg-amber-400 animate-ping" : "bg-emerald-400 animate-pulse"
                }`}
              />
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  analyzingState === "evaluating" ? "bg-amber-400" : "bg-emerald-400"
                }`}
              />
            </span>
            <span className="font-mono text-[11px] uppercase tracking-wider text-slate-300">
              Creative Intelligence Network
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
            <span
              className={`rounded px-1.5 py-0.5 border text-xs font-semibold ${
                analyzingState === "evaluating"
                  ? "bg-amber-500/15 border-amber-500/30 text-amber-300 animate-pulse"
                  : "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
              }`}
            >
              {analyzingState === "evaluating" ? "SYNTHESIZING BRIEF..." : "CONVERGED (7-FACTOR)"}
            </span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-cyan-400 font-semibold hidden sm:inline">
              Verified Pipeline
            </span>
          </div>
        </div>

        {/* 1. "YOUR IDEA" Card (Top of Network) */}
        <div className="mt-4 rounded-xl border border-white/[0.08] bg-black/60 p-3.5 shadow-inner transition">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-indigo-400">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              <span>Campaign Requirement</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Natural Language Intent</span>
          </div>
          <p className="mt-1.5 text-xs sm:text-[13px] font-medium leading-snug text-slate-100">
            &ldquo;{activeScenario.userIdea}&rdquo;
          </p>
        </div>

        {/* 2. Interactive Constellation Canvas / Visual Graph */}
        <div
          ref={canvasRef}
          className="relative mt-4 h-[380px] sm:h-[420px] w-full rounded-2xl border border-white/[0.08] bg-[#06070a] p-3 shadow-inner overflow-hidden"
        >
          {/* Subtle Technical Grid Background */}
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl opacity-20"
            style={{
              backgroundImage: `radial-gradient(rgba(255,255,255,0.18) 1px, transparent 1px)`,
              backgroundSize: "22px 22px",
            }}
          />

          {/* Shockwave Resonance Wave Animation */}
          {resonanceWave && (
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 rounded-full border-2 border-cyan-400/80 animate-[ping_0.8s_ease-out_forwards] shadow-[0_0_35px_rgba(14,165,233,0.8)]" />
          )}

          {/* SVG Laser Connection Lines between Center and Capability Nodes */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
            <defs>
              <linearGradient id="inactiveLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.15" />
              </linearGradient>
              <linearGradient id="activeLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.95" />
                <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#818cf8" stopOpacity="0.65" />
              </linearGradient>
              {/* Glow filter for active lines */}
              <filter id="laserGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Connecting lines from center (50%, 50%) to nodes */}
            {CAPABILITY_NODES.map((node) => {
              const isActive = activeScenario.activeCapabilities.includes(node.id);
              const wobble = wobbleMap[node.id] || { x: 0, y: 0 };
              return (
                <g key={`group-${node.id}`}>
                  <line
                    x1="50%"
                    y1="50%"
                    x2={`calc(${node.xPct}% + ${wobble.x}px)`}
                    y2={`calc(${node.yPct}% + ${wobble.y}px)`}
                    stroke={isActive ? "url(#activeLineGrad)" : "url(#inactiveLineGrad)"}
                    strokeWidth={isActive ? (analyzingState === "evaluating" ? 3 : 2) : 0.8}
                    strokeDasharray={isActive ? (analyzingState === "evaluating" ? "5 5" : "none") : "2 5"}
                    filter={isActive ? "url(#laserGlow)" : undefined}
                    className="transition-all duration-300"
                  />
                  {/* Subtle animated data particle on active lines */}
                  {isActive && analyzingState === "converged" && (
                    <circle
                      r="2.5"
                      fill="#38bdf8"
                      className="animate-[pulse_1.5s_infinite]"
                      style={{
                        cx: `calc(50% + (${node.xPct - 50}% * 0.55))`,
                        cy: `calc(50% + (${node.yPct - 50}% * 0.55))`,
                      }}
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Central KreaLink Intelligence Core */}
          <div
            onClick={handleCoreClick}
            title="Click to trigger full network resonance pulse"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center cursor-pointer group"
          >
            {/* Ambient Rotating Orbital Filament */}
            <div className="relative flex items-center justify-center p-2">
              <KreaLinkLogo size={62} glow={true} animated={true} />
            </div>

            <div className="flex items-center gap-1.5 mt-1 rounded-full border border-white/10 bg-[#0c0e15]/95 px-2.5 py-0.5 text-[9px] font-mono tracking-wider text-slate-200 shadow-md group-hover:border-indigo-400/50 group-hover:text-white transition">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>KreaLink Core</span>
            </div>
          </div>

          {/* 8 Interactive Capability Nodes */}
          {CAPABILITY_NODES.map((node) => {
            const isActive = activeScenario.activeCapabilities.includes(node.id);
            const isHovered = hoveredNode?.id === node.id;
            const wobble = wobbleMap[node.id] || { x: 0, y: 0, scale: 1 };

            // Dynamic tooltip positioning to prevent any canvas clipping
            const popUpwards = node.yPct > 55;
            const alignRight = node.xPct > 65;
            const alignCenter = node.xPct >= 35 && node.xPct <= 65;

            return (
              <div
                key={node.id}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => handleNodeClick(node)}
                style={{
                  left: `${node.xPct}%`,
                  top: `${node.yPct}%`,
                  transform: `translate(calc(-50% + ${wobble.x}px), calc(-50% + ${wobble.y}px)) scale(${wobble.scale})`,
                  zIndex: isHovered ? 100 : 20,
                }}
                className="absolute cursor-pointer transition-transform duration-150 ease-out"
              >
                {/* Node Pill */}
                <div
                  className={`group relative flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-mono transition-all duration-300 shadow-lg ${
                    isActive
                      ? "border-emerald-500/70 bg-[#071912] text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.4)] ring-1 ring-emerald-500/40"
                      : "border-white/[0.12] bg-[#0c0e15]/95 text-slate-300 hover:border-white/35 hover:text-white hover:bg-black/90"
                  } ${isHovered ? "ring-2 ring-cyan-400/80 shadow-[0_0_25px_rgba(6,182,212,0.5)] border-cyan-400/70 bg-[#0a1226]" : ""}`}
                >
                  <span
                    className={`h-2 w-2 rounded-full transition-transform group-hover:scale-125 ${
                      isActive ? "bg-emerald-400 animate-pulse" : isHovered ? "bg-cyan-400 animate-pulse" : "bg-slate-500"
                    }`}
                  />
                  <span className="whitespace-nowrap font-medium tracking-tight">
                    {node.label}
                  </span>

                  {/* Micro Hint indicator on hover */}
                  <span className="text-[10px] text-slate-400 group-hover:text-cyan-300 transition-colors ml-0.5">
                    ↗
                  </span>
                </div>

                {/* Floating Holographic Inspection HUD Tooltip (Rendered with zIndex: 100) */}
                {isHovered && (
                  <div
                    className={`absolute pointer-events-auto w-[280px] sm:w-[320px] rounded-2xl border border-cyan-400/50 bg-[#080c18]/98 p-4 shadow-[0_25px_60px_rgba(0,0,0,0.95)] backdrop-blur-2xl ring-1 ring-white/10 ${
                      popUpwards
                        ? "bottom-[calc(100%+10px)] animate-[tooltipBloomUp_0.15s_cubic-bezier(0.16,1,0.3,1)]"
                        : "top-[calc(100%+10px)] animate-[tooltipBloom_0.15s_cubic-bezier(0.16,1,0.3,1)]"
                    } ${
                      alignRight
                        ? "right-0"
                        : alignCenter
                        ? "left-1/2 -translate-x-1/2"
                        : "left-0"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNodeClick(node);
                    }}
                  >
                    {/* Top Laser Accent Line */}
                    <div className="absolute top-0 left-4 right-4 h-[2px] bg-gradient-to-r from-cyan-400 via-indigo-500 to-emerald-400 rounded-full" />

                    {/* Badge & Benchmark Metric */}
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="rounded-full border border-indigo-400/50 bg-indigo-500/20 px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider text-indigo-300">
                        {node.badge}
                      </span>
                      <span className="flex items-center gap-1 font-mono text-[10px] font-semibold text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {node.metric}
                      </span>
                    </div>

                    {/* Node Title */}
                    <h4 className="mt-2 font-heading text-sm font-bold text-white tracking-tight leading-snug">
                      {node.tooltipTitle}
                    </h4>

                    {/* Full Unclipped Description */}
                    <p className="mt-1.5 text-xs text-slate-300 leading-relaxed font-normal">
                      {node.tooltipDescription}
                    </p>

                    {/* Action Footer */}
                    <div className="mt-3 flex items-center justify-between border-t border-white/[0.08] pt-2 text-[11px] font-mono">
                      <span className="text-slate-400 flex items-center gap-1">
                        <span className="text-cyan-400 font-bold">⚡</span> Click to inspect specs
                      </span>
                      <span className="text-cyan-300 font-semibold hover:text-white transition-colors flex items-center gap-0.5">
                        Deep Specs →
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* ======================================================== */}
          {/* ON-CLICK POP-UP INSPECTION MODAL */}
          {/* ======================================================== */}
          {inspectedNode && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-md rounded-2xl animate-[fadeIn_0.15s_ease-out]">
              <div className="relative w-full max-w-sm rounded-2xl border border-white/20 bg-[#0a0d18]/98 p-5 shadow-[0_25px_60px_rgba(0,0,0,0.95)] backdrop-blur-2xl animate-[scaleUp_0.2s_cubic-bezier(0.16,1,0.3,1)]">
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setInspectedNode(null)}
                  className="absolute top-3.5 right-3.5 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs text-slate-400 hover:text-white hover:bg-white/10 transition"
                >
                  ✕
                </button>

                {/* Category & Verified Status */}
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-indigo-400/40 bg-indigo-500/20 px-2.5 py-0.5 text-[10px] font-mono font-bold text-indigo-300 uppercase">
                    {inspectedNode.badge}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                    <span>✓</span> Verified Pipeline
                  </span>
                </div>

                {/* Node Title & Metric */}
                <h3 className="mt-2 text-base font-heading font-bold text-white">
                  {inspectedNode.tooltipTitle}
                </h3>
                <p className="text-xs font-mono text-cyan-300 mt-0.5">
                  Benchmark: {inspectedNode.metric}
                </p>

                {/* In-Depth Architecture Telemetry */}
                <p className="mt-2.5 text-xs text-slate-300 leading-relaxed">
                  {inspectedNode.deepDescription}
                </p>

                {/* Stats Grid */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl border border-white/10 bg-black/40 p-2.5">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">
                      Creator Adoption
                    </span>
                    <span className="text-sm font-bold text-white mt-0.5 block">
                      {inspectedNode.creatorsCount} Verified Directors
                    </span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/40 p-2.5">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">
                      Concept Alignment
                    </span>
                    <span className="text-sm font-bold text-emerald-400 mt-0.5 block">
                      98% Compatibility
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setInternalScenario((prev) => {
                        const exists = prev.activeCapabilities.includes(inspectedNode.id);
                        return {
                          ...prev,
                          activeCapabilities: exists
                            ? prev.activeCapabilities.filter((c) => c !== inspectedNode.id)
                            : [...prev.activeCapabilities, inspectedNode.id],
                        };
                      });
                      setInspectedNode(null);
                    }}
                    className="flex-1 rounded-xl bg-white py-2 text-center text-xs font-bold text-black hover:bg-slate-200 transition"
                  >
                    {activeScenario.activeCapabilities.includes(inspectedNode.id)
                      ? "Remove from Active Brief"
                      : "Add to Active Brief"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectedNode(null)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white transition"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* DEDICATED LIVE TELEMETRY HUD BAR (100% UNCLIPPED & READABLE) */}
        {/* ======================================================== */}
        <div className="mt-3.5 rounded-xl border border-white/10 bg-[#070912]/95 p-3.5 shadow-lg transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${hoveredNode ? "bg-emerald-400 animate-pulse" : "bg-indigo-400"}`} />
              <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-300">
                {activeDisplayNode.badge} · {activeDisplayNode.metric}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {hoveredNode ? "Click node to inspect deep specs →" : "Hover or click any node to inspect"}
            </span>
          </div>

          <h4 className="mt-1 font-heading text-xs sm:text-sm font-bold text-white">
            {activeDisplayNode.tooltipTitle}
          </h4>

          <p className="mt-1 text-xs text-slate-300 leading-relaxed font-normal">
            {activeDisplayNode.tooltipDescription}
          </p>
        </div>

        {/* 3. CONVERGED CREATOR MATCH CARD (Bottom of Network) */}
        <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/20 via-[#0c141d] to-[#0a0d16] p-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Creator Identity */}
            <div className="flex items-center gap-3">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-indigo-500/30 via-slate-800 to-emerald-500/20 text-sm font-bold text-white shadow-inner overflow-hidden">
                {creatorData?.profilePhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={creatorData.profilePhoto}
                    alt={activeScenario.creatorName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  activeScenario.creatorAvatarInitial
                )}
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-black ring-2 ring-black">
                  ✓
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-heading text-sm font-bold text-white">
                    {activeScenario.creatorName}
                  </h4>
                  <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300">
                    {activeScenario.matchScore}% MATCH
                  </span>
                  <span className="hidden sm:inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-mono text-emerald-400">
                    ● HIGH CONFIDENCE
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {creatorData?.specialization || activeScenario.creatorRole}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <Link
                href={`/${activeScenario.matchedCreatorUsername}`}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                Inspect Portfolio
              </Link>
              <Link
                href={`/brand?tab=create-brief&prompt=${encodeURIComponent(activeScenario.userIdea)}`}
                className="rounded-lg bg-white px-3.5 py-1.5 text-xs font-bold text-black transition hover:bg-slate-200 shadow-sm"
              >
                Structure Brief →
              </Link>
            </div>
          </div>

          {/* Sample Reel Video Thumbnail Preview + Why Grounding */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center rounded-xl border border-white/[0.06] bg-black/50 p-2.5">
            <div className="sm:col-span-4 relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-black border border-white/10">
              <video
                src={activeScenario.sampleReelVideo}
                autoPlay
                loop
                muted
                playsInline
                className="h-full w-full object-cover"
              />
              <div className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[8px] font-mono text-white/80">
                Verified Clip
              </div>
            </div>

            <div className="sm:col-span-8 text-[11px] leading-relaxed text-slate-300">
              <span className="font-semibold text-emerald-300">Why Selected: </span>
              {activeScenario.whyExplanation}
            </div>
          </div>
        </div>

        {/* 4. "TRY IT" MOMENT: Interactive Concept Presets & Input */}
        <div className="mt-4 pt-3.5 border-t border-white/[0.06]">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Test Creative Concept:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => triggerScenario(s)}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-all ${
                    activeScenario.id === s.id
                      ? "border border-indigo-400/50 bg-indigo-500/20 text-indigo-200 shadow-sm"
                      : "border border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white"
                  }`}
                >
                  {s.shortLabel}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Vision Form */}
          <form onSubmit={handleCustomSubmit} className="flex gap-2">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Or type custom idea... (e.g. Cyberpunk sports car commercial)"
              className="flex-1 rounded-xl border border-white/10 bg-black/50 px-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-500/60"
            />
            <button
              type="submit"
              className="rounded-xl border border-indigo-500/40 bg-indigo-500/20 px-3.5 py-1.5 text-xs font-semibold text-indigo-200 transition hover:bg-indigo-500/30"
            >
              Analyze
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
