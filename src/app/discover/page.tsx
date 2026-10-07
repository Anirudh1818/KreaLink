"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { collection, getDocs, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Navbar } from "@/components/Navbar";
import { CreatorProfile, CreativeBrief, INVITATION_STATUS } from "@/lib/types";
import { evaluateCreatorMatch2 } from "@/lib/ai/matchingEngine2";
import { DEMO_CREATORS, DEMO_BRIEFS } from "@/lib/demoData";

const CANONICAL_SPECIALIZATIONS = [
  "AI Filmmaker & Director",
  "Generative AI Visual Artist",
  "AI Commercial Producer",
  "AI Animator & Motion Designer",
  "Virtual Concept Artist & Worldbuilder",
  "VFX & AI Compositing Specialist",
  "Cinematic Worldbuilder & Director",
  "Spatial Storyteller & Narrative Artist",
];

const CANONICAL_TOOLS_AND_MODELS = [
  "Runway",
  "Runway Gen-3 Alpha",
  "Midjourney",
  "Midjourney v6.1",
  "Flux.1",
  "Kling AI",
  "ComfyUI",
  "Luma Dream Machine",
  "Topaz Video AI",
  "Magnific AI",
  "Pika",
  "Hailuo / Minimax",
  "ElevenLabs",
  "Photoshop AI",
  "DaVinci Resolve",
  "OpenAI Sora",
];

const CANONICAL_SKILLS = [
  "Prompt Engineering",
  "Camera Movement Control",
  "Dynamic Camera Trajectories",
  "Character Consistency",
  "Photorealistic Lighting & Shading",
  "Fluid & Particle FX",
  "Worldbuilding & Lore",
  "Style Transfer & LoRA Training",
  "35mm Analog Film Emulation",
  "Post-Processing & Upscaling",
  "Motion Tracking & VFX",
  "Color Grading & Finishing",
];

const CANONICAL_FORMATS = [
  { label: "9:16 Vertical (Reels / TikTok / Shorts)", value: "9:16" },
  { label: "16:9 Landscape (YouTube / Cinema)", value: "16:9" },
  { label: "1:1 Square (Instagram Feed)", value: "1:1" },
  { label: "4:5 Portrait", value: "4:5" },
  { label: "4K UHD Master", value: "4K" },
  { label: "21:9 Widescreen Cinema", value: "21:9" },
];

export default function DiscoverPage() {
  const { user } = useAuth();

  const [creators, setCreators] = useState<CreatorProfile[]>([]);
  const [briefs, setBriefs] = useState<CreativeBrief[]>(DEMO_BRIEFS);
  const [selectedBriefId, setSelectedBriefId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialization, setSelectedSpecialization] = useState("");
  const [selectedTool, setSelectedTool] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [selectedFormat, setSelectedFormat] = useState("");
  const [commercialOnly, setCommercialOnly] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [expandedScoreUsername, setExpandedScoreUsername] = useState<string | null>(null);

  // Quick Invite Modal state
  const [invitingCreator, setInvitingCreator] = useState<CreatorProfile | null>(null);
  const [brandName, setBrandName] = useState("");
  const [brandEmail, setBrandEmail] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);

  // Load creators and briefs from Firestore + Local Cache + Canonical Roster
  useEffect(() => {
    async function loadData() {
      try {
        const creatorMap = new Map<string, CreatorProfile>();

        // 1. Initialize with Canonical Demo Roster
        DEMO_CREATORS.forEach((d) => {
          creatorMap.set(d.creator.username.toLowerCase(), d.creator);
        });

        // 2. Fetch all creators from Firestore (if available)
        try {
          const creatorSnap = await getDocs(collection(db, "creators"));
          if (!creatorSnap.empty) {
            creatorSnap.docs.forEach((docSnap) => {
              const d = docSnap.data();
              const parsed: CreatorProfile = {
                name: String(d.name || docSnap.id),
                username: String(d.username || docSnap.id),
                email: String(d.email || ""),
                specialization: String(d.specialization || d.category || "AI Creator"),
                bio: String(d.bio || ""),
                availability: String(d.availability || "Available immediately"),
                commercialUse: typeof d.commercialUse === "boolean" ? d.commercialUse : true,
                skills: Array.isArray(d.skills) ? d.skills : [],
                aiTools: Array.isArray(d.aiTools) ? d.aiTools : [],
                aiModels: Array.isArray(d.aiModels) ? d.aiModels : [],
                contentTypes: Array.isArray(d.contentTypes) ? d.contentTypes : [],
                formats: Array.isArray(d.formats) ? d.formats : [],
                workflow: String(d.workflow || ""),
                profilePhoto: String(d.profilePhoto || ""),
                verified: Boolean(d.verified ?? true),
                verification: {
                  tools: Boolean(d.verification?.tools ?? true),
                  workflow: Boolean(d.verification?.workflow ?? true),
                  portfolio: Boolean(d.verification?.portfolio ?? true),
                },
                status: String(d.status || "Active"),
                theme: d.theme || "flame",
              };
              creatorMap.set(parsed.username.toLowerCase(), parsed);
            });
          }
        } catch (firestoreErr) {
          console.warn("Firestore creator fetch note:", firestoreErr);
        }

        // 3. Merge locally registered creators from localStorage
        if (typeof window !== "undefined") {
          try {
            const regRaw = localStorage.getItem("krealink-registered-creators");
            if (regRaw) {
              const regList = JSON.parse(regRaw);
              if (Array.isArray(regList)) {
                regList.forEach((c) => {
                  if (c && c.username) {
                    creatorMap.set(c.username.toLowerCase(), c);
                  }
                });
              }
            }

            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.startsWith("krealink-profile-")) {
                try {
                  const item = JSON.parse(localStorage.getItem(key) || "");
                  if (item && item.username) {
                    creatorMap.set(item.username.toLowerCase(), item);
                  }
                } catch {
                  // ignore
                }
              }
            }
          } catch {
            // ignore
          }
        }

        // Identify newly joined creator and sort them to the top
        const newlyJoinedUsername = typeof window !== "undefined"
          ? localStorage.getItem("krealink-newly-joined-creator")?.toLowerCase()
          : null;
        const demoUsernames = new Set(DEMO_CREATORS.map((d) => d.creator.username.toLowerCase()));

        const loadedCreators = Array.from(creatorMap.values()).sort((a, b) => {
          const aUser = a.username.toLowerCase();
          const bUser = b.username.toLowerCase();

          if (newlyJoinedUsername && aUser === newlyJoinedUsername) return -1;
          if (newlyJoinedUsername && bUser === newlyJoinedUsername) return 1;

          const aIsCustom = !demoUsernames.has(aUser);
          const bIsCustom = !demoUsernames.has(bUser);
          if (aIsCustom && !bIsCustom) return -1;
          if (!aIsCustom && bIsCustom) return 1;

          return 0;
        });

        setCreators(loadedCreators);

        // Fetch briefs from Firestore
        try {
          const briefsSnap = await getDocs(collection(db, "briefs"));
          if (!briefsSnap.empty) {
            const loadedBriefs: CreativeBrief[] = briefsSnap.docs.map((b) => ({
              id: b.id,
              ...(b.data() as unknown as CreativeBrief),
            }));
            setBriefs(loadedBriefs);
          }
        } catch {
          // Fallback to demo briefs
        }
      } catch (err) {
        console.warn("Using demo set fallback:", err);
        setCreators(DEMO_CREATORS.map((c) => c.creator));
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Filter option presets derived from canonical taxonomy + creator dataset
  const specializations = useMemo(() => {
    const set = new Set<string>(CANONICAL_SPECIALIZATIONS);
    creators.forEach((c) => {
      if (c.specialization) set.add(c.specialization);
    });
    return Array.from(set).sort();
  }, [creators]);

  const allTools = useMemo(() => {
    const set = new Set<string>(CANONICAL_TOOLS_AND_MODELS);
    creators.forEach((c) => {
      (c.aiTools || []).forEach((t) => set.add(t));
      (c.aiModels || []).forEach((m) => set.add(m));
    });
    return Array.from(set).sort();
  }, [creators]);

  const allSkills = useMemo(() => {
    const set = new Set<string>(CANONICAL_SKILLS);
    creators.forEach((c) => {
      (c.skills || []).forEach((s) => set.add(s));
    });
    return Array.from(set).sort();
  }, [creators]);

  // Selected brief for matching
  const activeBrief = useMemo(() => {
    return briefs.find((b) => b.id === selectedBriefId) || null;
  }, [briefs, selectedBriefId]);

  // Filtered and ranked creators
  const filteredAndRankedCreators = useMemo(() => {
    let result = creators.map((creator) => {
      if (activeBrief) {
        const match = evaluateCreatorMatch2(activeBrief, creator);
        return {
          creator,
          matchScore: match.overallScore,
          confidence: match.confidence,
          evidenceCount: match.evidenceCount,
          evidencePoints: match.evidencePoints,
          gaps: match.gaps,
          subscores: match.subscores,
          matchExplanation: match.whyExplanation,
          whyNotExplanation: match.whyNotExplanation,
          alternativeRole: match.alternativeRole,
        };
      }
      return {
        creator,
        matchScore: null,
        confidence: null,
        evidenceCount: 0,
        evidencePoints: [],
        gaps: [],
        subscores: null,
        matchExplanation: "",
        whyNotExplanation: undefined,
        alternativeRole: undefined,
      };
    });

    // 1. Text Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(({ creator }) => {
        const inName = creator.name.toLowerCase().includes(q);
        const inUser = creator.username.toLowerCase().includes(q);
        const inBio = creator.bio.toLowerCase().includes(q);
        const inSpec = creator.specialization.toLowerCase().includes(q);
        const inTools = (creator.aiTools || []).some((t) => t.toLowerCase().includes(q));
        const inModels = (creator.aiModels || []).some((m) => m.toLowerCase().includes(q));
        const inSkills = (creator.skills || []).some((s) => s.toLowerCase().includes(q));
        return inName || inUser || inBio || inSpec || inTools || inModels || inSkills;
      });
    }

    // 2. Specialization Filter
    if (selectedSpecialization) {
      const target = selectedSpecialization.toLowerCase();
      result = result.filter(({ creator }) => {
        const spec = (creator.specialization || "").toLowerCase();
        return spec === target || spec.includes(target) || target.includes(spec);
      });
    }

    // 3. AI Tool/Model Filter
    if (selectedTool) {
      const target = selectedTool.toLowerCase();
      result = result.filter(({ creator }) =>
        [...(creator.aiTools || []), ...(creator.aiModels || [])].some((t) => {
          const tl = t.toLowerCase();
          return tl === target || tl.includes(target) || target.includes(tl);
        })
      );
    }

    // 4. Skill Filter
    if (selectedSkill) {
      const target = selectedSkill.toLowerCase();
      result = result.filter(({ creator }) =>
        (creator.skills || []).some((s) => {
          const sl = s.toLowerCase();
          return sl === target || sl.includes(target) || target.includes(sl);
        })
      );
    }

    // 5. Format Filter
    if (selectedFormat) {
      const target = selectedFormat.toLowerCase();
      result = result.filter(({ creator }) =>
        (creator.formats || []).some((f) => f.toLowerCase().includes(target))
      );
    }

    // 6. Commercial Rights Only
    if (commercialOnly) {
      result = result.filter(({ creator }) => creator.commercialUse);
    }

    // 7. Available Only
    if (availableOnly) {
      result = result.filter(({ creator }) =>
        creator.availability.toLowerCase().includes("immediate") ||
        creator.availability.toLowerCase().includes("available")
      );
    }

    // Sort by match score if active brief, otherwise keep clean list
    if (activeBrief) {
      result.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
    }

    return result;
  }, [
    creators,
    activeBrief,
    searchQuery,
    selectedSpecialization,
    selectedTool,
    selectedSkill,
    selectedFormat,
    commercialOnly,
    availableOnly,
  ]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedSpecialization("");
    setSelectedTool("");
    setSelectedSkill("");
    setSelectedFormat("");
    setCommercialOnly(false);
    setAvailableOnly(false);
    setSelectedBriefId("");
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitingCreator) return;

    setIsSendingInvite(true);
    try {
      const inviteRef = doc(collection(db, "invitations"));
      const brandId = activeBrief?.brandId || (user?.uid ? `brand-${user.uid.slice(0, 8)}` : "demo-brand");
      await setDoc(inviteRef, {
        ownerUid: user?.uid || "demo-brand-owner",
        brandOwnerUid: user?.uid || "demo-brand-owner",
        brandId,
        creatorUsername: invitingCreator.username,
        brandName: brandName.trim() || "Brand Client",
        contactEmail: brandEmail.trim() || user?.email || "agency@client.com",
        campaignTitle: activeBrief?.campaignName || "Campaign Collaboration",
        briefId: activeBrief?.id || null,
        message: inviteMsg.trim() || "We would like to invite you to collaborate on our creative campaign.",
        status: INVITATION_STATUS.INVITED,
        createdAt: serverTimestamp(),
      });
      setInviteSent(true);
    } catch {
      setInviteSent(true);
    } finally {
      setIsSendingInvite(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#07080c] text-white">
      <Navbar />

      {/* ======================================================== */}
      {/* HEADER & FILTER BAR */}
      {/* ======================================================== */}
      <section className="relative z-10 border-b border-white/[0.06] bg-[#090b10] px-5 py-8 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1 text-[11px] font-mono tracking-wider uppercase text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Verified Creator Roster</span>
              </div>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
                Discover AI Creators
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-2xl">
                Curated filmmakers, generative directors, and prompt artists verified by toolchains, workflows, and commercial rights clearance.
              </p>
            </div>

            {/* Mode Switcher & Brief Matcher */}
            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0e111a]/90 p-4 sm:min-w-[360px] shadow-xl">
              <div className="flex items-center gap-1.5 rounded-xl bg-black/60 p-1 border border-white/5">
                <button
                  type="button"
                  onClick={() => setSelectedBriefId("")}
                  className={`flex-1 rounded-lg py-2 text-center text-xs font-semibold transition ${
                    !selectedBriefId
                      ? "bg-white text-black shadow-md font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Standard Catalog
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedBriefId && briefs.length > 0 && briefs[0].id) {
                      setSelectedBriefId(briefs[0].id);
                    }
                  }}
                  className={`flex-1 rounded-lg py-2 text-center text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                    selectedBriefId
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <span>⚡</span>
                  <span>Match to Brief</span>
                </button>
              </div>

              {selectedBriefId && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-indigo-300 font-semibold uppercase tracking-wider">
                      Active Campaign Brief:
                    </span>
                    <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                      Live 7-Factor Ranking
                    </span>
                  </div>
                  <select
                    value={selectedBriefId}
                    onChange={(e) => setSelectedBriefId(e.target.value)}
                    className="w-full rounded-lg border border-indigo-500/30 bg-[#090b10] px-3 py-2 text-xs font-semibold text-white outline-none focus:border-indigo-400 cursor-pointer"
                  >
                    {briefs.map((b) => (
                      <option key={b.id} value={b.id} className="bg-[#0c0e15] text-slate-200 py-1.5">
                        {b.campaignName} ({b.aspectRatio || "Video"})
                      </option>
                    ))}
                  </select>
                  {activeBrief && (
                    <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-2 pt-0.5 font-mono">
                      <span className="text-slate-300">Format: {activeBrief.aspectRatio}</span>
                      <span>•</span>
                      <span className="text-slate-300">Type: {activeBrief.contentType}</span>
                      <span>•</span>
                      <span className="text-slate-300">Platform: {activeBrief.platform}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Search Input Bar */}
          <div className="mt-6">
            <div className="relative">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by creator name, specialty, or toolchain (e.g. Runway Gen-3, Midjourney v6.1, Flux.1, LoRA)..."
                className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3.5 pl-11 text-xs sm:text-sm font-medium text-white placeholder:text-white/30 focus:border-amber-400/50 focus:outline-none focus:ring-1 focus:ring-amber-400/20"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white/40">
                🔍
              </span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/40 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Filter Pills Row */}
          <div className="mt-4 flex flex-wrap items-center gap-2.5 text-xs">
            <select
              value={selectedSpecialization}
              onChange={(e) => setSelectedSpecialization(e.target.value)}
              className="rounded-lg border border-white/15 bg-[#0e111a] px-3.5 py-2 font-medium text-slate-200 outline-none hover:border-white/30 focus:border-amber-400/50 cursor-pointer shadow-sm transition"
            >
              <option value="" className="bg-[#0c0e15] text-slate-200 py-1.5">All Specialties</option>
              {specializations.map((spec) => (
                <option key={spec} value={spec} className="bg-[#0c0e15] text-slate-200 py-1.5">
                  {spec}
                </option>
              ))}
            </select>

            <select
              value={selectedTool}
              onChange={(e) => setSelectedTool(e.target.value)}
              className="rounded-lg border border-white/15 bg-[#0e111a] px-3.5 py-2 font-medium text-slate-200 outline-none hover:border-white/30 focus:border-amber-400/50 cursor-pointer shadow-sm transition"
            >
              <option value="" className="bg-[#0c0e15] text-slate-200 py-1.5">All Tools &amp; Models</option>
              {allTools.map((t) => (
                <option key={t} value={t} className="bg-[#0c0e15] text-slate-200 py-1.5">
                  {t}
                </option>
              ))}
            </select>

            <select
              value={selectedSkill}
              onChange={(e) => setSelectedSkill(e.target.value)}
              className="rounded-lg border border-white/15 bg-[#0e111a] px-3.5 py-2 font-medium text-slate-200 outline-none hover:border-white/30 focus:border-amber-400/50 cursor-pointer shadow-sm transition"
            >
              <option value="" className="bg-[#0c0e15] text-slate-200 py-1.5">All Skills</option>
              {allSkills.map((s) => (
                <option key={s} value={s} className="bg-[#0c0e15] text-slate-200 py-1.5">
                  {s}
                </option>
              ))}
            </select>

            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="rounded-lg border border-white/15 bg-[#0e111a] px-3.5 py-2 font-medium text-slate-200 outline-none hover:border-white/30 focus:border-amber-400/50 cursor-pointer shadow-sm transition"
            >
              <option value="" className="bg-[#0c0e15] text-slate-200 py-1.5">All Formats</option>
              {CANONICAL_FORMATS.map((fmt) => (
                <option key={fmt.value} value={fmt.value} className="bg-[#0c0e15] text-slate-200 py-1.5">
                  {fmt.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setCommercialOnly((prev) => !prev)}
              className={`rounded-lg border px-3 py-2 font-semibold transition ${
                commercialOnly
                  ? "border-amber-500/50 bg-amber-500/20 text-amber-300"
                  : "border-white/10 bg-white/[0.03] text-white/60 hover:text-white"
              }`}
            >
              Commercial Rights Only
            </button>

            <button
              type="button"
              onClick={() => setAvailableOnly((prev) => !prev)}
              className={`rounded-lg border px-3 py-2 font-semibold transition ${
                availableOnly
                  ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
                  : "border-white/10 bg-white/[0.03] text-white/60 hover:text-white"
              }`}
            >
              Available Now
            </button>

            {(searchQuery ||
              selectedSpecialization ||
              selectedTool ||
              selectedSkill ||
              selectedFormat ||
              commercialOnly ||
              availableOnly ||
              selectedBriefId) && (
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 font-semibold text-rose-300 transition hover:bg-rose-500/20"
              >
                ✕ Reset Filters
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* CREATOR CATALOG RESULTS */}
      {/* ======================================================== */}
      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <div className="mb-6 flex items-center justify-between text-xs text-slate-400">
          <p>
            Showing <span className="font-bold text-white">{filteredAndRankedCreators.length}</span> creators
            {activeBrief && ` ranked for "${activeBrief.campaignName}"`}
          </p>
        </div>

        {isLoading ? (
          /* Polished Skeleton Loaders */
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-white/[0.08] bg-[#0c0e15] p-5">
                <div className="aspect-[16/10] w-full rounded-xl bg-white/[0.04]" />
                <div className="mt-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/[0.06]" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 w-1/2 rounded bg-white/[0.08]" />
                    <div className="h-2.5 w-1/3 rounded bg-white/[0.04]" />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-2.5 w-full rounded bg-white/[0.04]" />
                  <div className="h-2.5 w-4/5 rounded bg-white/[0.04]" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredAndRankedCreators.length === 0 ? (
          /* Empty State */
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e15] p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-2xl">
              🔍
            </div>
            <h3 className="mt-4 text-xl font-bold text-white">No creators match your exact criteria.</h3>
            <p className="mx-auto mt-2 max-w-md text-xs text-slate-400">
              Try relaxing your filters or searching for different generative tools and models.
            </p>
            <button
              onClick={resetFilters}
              className="mt-6 rounded-full bg-white px-6 py-2.5 text-xs font-bold text-black transition hover:bg-slate-200"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          /* Creator Cards Grid */
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAndRankedCreators.map(
              ({
                creator,
                matchScore,
                confidence,
                evidencePoints,
                gaps,
                matchExplanation,
                whyNotExplanation,
                alternativeRole,
              }, cardIdx) => {
                const isScoreExpanded = expandedScoreUsername === creator.username;
                const matchedDemo = DEMO_CREATORS.find(
                  (d) => d.creator.username.toLowerCase() === creator.username.toLowerCase()
                );
                const isNewCreator = !matchedDemo;
                const reelVideo =
                  matchedDemo?.portfolio[0]?.mediaUrl ||
                  "/creators/digitaldavincis/reels/reel-1.mp4";
                const reelPoster =
                  matchedDemo?.portfolio[0]?.thumbnailUrl ||
                  creator.profilePhoto ||
                  "/creators/digitaldavincis/reels/reel-1.jpg";

                return (
                  <div
                    key={creator.username}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0e15] transition-all duration-300 hover:border-white/20 hover:shadow-2xl"
                  >
                    <div>
                      {/* Video Media Preview */}
                      <div className="relative aspect-[16/10] w-full overflow-hidden bg-black">
                        <video
                          src={reelVideo}
                          poster={reelPoster}
                          preload={cardIdx < 4 ? "metadata" : "none"}
                          autoPlay={cardIdx < 4}
                          loop
                          muted
                          playsInline
                          onMouseEnter={(e) => {
                            if (cardIdx >= 4) {
                              e.currentTarget.play().catch(() => {});
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (cardIdx >= 4) {
                              e.currentTarget.pause();
                            }
                          }}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />

                        {/* Top Overlay Badges */}
                        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {isNewCreator && (
                              <span className="rounded-full border border-sky-400/40 bg-sky-950/80 px-2.5 py-0.5 text-[10px] font-semibold text-sky-300 backdrop-blur-md animate-pulse">
                                ✦ New Creator
                              </span>
                            )}
                            <span className="rounded-full border border-emerald-500/30 bg-emerald-950/80 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300 backdrop-blur-md">
                              ✓ Verified
                            </span>
                          </div>

                          {matchScore !== null && (
                            <div className="flex items-center gap-1.5">
                              <div className="flex items-center gap-1 rounded-full border border-amber-500/40 bg-black/80 px-2.5 py-0.5 backdrop-blur-md">
                                <span className="text-xs font-extrabold text-amber-400">
                                  {matchScore}%
                                </span>
                                <span className="text-[10px] font-mono text-white/50 uppercase">
                                  Match
                                </span>
                              </div>
                              {confidence && (
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[9px] font-mono uppercase font-bold border backdrop-blur-md ${
                                    confidence === "HIGH"
                                      ? "border-emerald-500/40 bg-emerald-950/80 text-emerald-300"
                                      : confidence === "MEDIUM"
                                      ? "border-amber-500/40 bg-amber-950/80 text-amber-300"
                                      : "border-slate-500/40 bg-slate-900/80 text-slate-300"
                                  }`}
                                >
                                  {confidence} Fit
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Bottom Overlay: Commercial & Formats */}
                        <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between text-[10px] font-mono text-white/80">
                          <span className="rounded bg-black/70 px-2 py-0.5 backdrop-blur-md">
                            {(creator.formats || [])[0] || "9:16 Vertical"}
                          </span>
                          <span className="rounded bg-black/70 px-2 py-0.5 backdrop-blur-md text-emerald-400">
                            {creator.commercialUse ? "Commercial Ready" : "Personal"}
                          </span>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-5">
                        {/* Identity */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
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
                            <div className="min-w-0">
                              <Link
                                href={`/${creator.username}`}
                                className="block truncate text-base font-bold text-white transition hover:text-amber-300"
                              >
                                {creator.name}
                              </Link>
                              <p className="truncate text-xs font-mono text-white/40">@{creator.username}</p>
                            </div>
                          </div>

                          <span className="text-[11px] font-medium text-emerald-400 shrink-0">
                            {creator.availability}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <p className="text-xs font-semibold text-amber-200/90">
                            {creator.specialization}
                          </p>
                          {alternativeRole && (
                            <span className="rounded-full border border-sky-400/30 bg-sky-950/80 px-2 py-0.5 text-[9px] font-mono text-sky-300">
                              ★ {alternativeRole}
                            </span>
                          )}
                        </div>

                        <p className="mt-2 text-xs leading-relaxed text-slate-300 line-clamp-2">
                          {creator.bio}
                        </p>

                        {/* AI Match Explanation (if brief is active) */}
                        {matchExplanation && (
                          <div className="mt-3.5 rounded-xl border border-amber-500/25 bg-amber-500/[0.05] p-3 text-[11px] leading-relaxed text-amber-200">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-amber-300">Why this creator matches:</span>
                              <button
                                onClick={() =>
                                  setExpandedScoreUsername(isScoreExpanded ? null : creator.username)
                                }
                                className="text-[10px] font-mono underline hover:text-white"
                              >
                                {isScoreExpanded ? "Hide breakdown" : "Multi-signal details"}
                              </button>
                            </div>
                            <p>{matchExplanation}</p>

                            {/* Factor Breakdown Accordion */}
                            {isScoreExpanded && (
                              <div className="mt-2.5 pt-2 border-t border-amber-500/20 space-y-2 text-[10px] font-mono">
                                {evidencePoints && evidencePoints.length > 0 && (
                                  <div className="space-y-1">
                                    <p className="text-emerald-400 font-bold uppercase text-[9px]">Demonstrated Evidence</p>
                                    {evidencePoints.slice(0, 3).map((ep, idx) => (
                                      <div key={idx} className="flex items-center justify-between text-slate-300">
                                        <span className="truncate pr-2">✓ {ep.signal}</span>
                                        <span className="text-emerald-300 text-[9px] shrink-0 border border-emerald-500/20 rounded px-1">{ep.level}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {gaps && gaps.length > 0 && (
                                  <div className="space-y-1 pt-1 border-t border-white/[0.06]">
                                    <p className="text-amber-400 font-bold uppercase text-[9px]">Potential Gaps</p>
                                    {gaps.map((g, idx) => (
                                      <div key={idx} className="flex items-center justify-between text-amber-200/90">
                                        <span className="truncate pr-2">⚠ {g.message}</span>
                                        <span className="text-[9px] uppercase shrink-0 font-bold text-amber-400">{g.severity}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {whyNotExplanation && (
                                  <p className="pt-1 text-[9px] text-slate-400 border-t border-white/[0.06]">
                                    ℹ {whyNotExplanation}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* AI Tools & Models Pills */}
                        <div className="mt-4">
                          <p className="text-[10px] font-mono uppercase tracking-wider text-white/40">
                            Verified Generative Stack
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {[...(creator.aiTools || []), ...(creator.aiModels || [])]
                              .slice(0, 4)
                              .map((tool) => (
                                <span
                                  key={tool}
                                  className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-slate-300"
                                >
                                  {tool}
                                </span>
                              ))}
                            {[...(creator.aiTools || []), ...(creator.aiModels || [])].length > 4 && (
                              <span className="self-center text-[10px] font-mono text-white/40">
                                +{[...(creator.aiTools || []), ...(creator.aiModels || [])].length - 4}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="p-5 pt-0">
                      <div className="flex items-center gap-2 border-t border-white/[0.06] pt-4">
                        <Link
                          href={`/${creator.username}`}
                          className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] py-2.5 text-center text-xs font-semibold text-white transition hover:bg-white/[0.08]"
                        >
                          Inspect Profile
                        </Link>

                        <button
                          onClick={() => {
                            setInvitingCreator(creator);
                            setInviteSent(false);
                          }}
                          className="rounded-lg bg-white px-4 py-2.5 text-xs font-bold text-black transition hover:bg-slate-200"
                        >
                          Invite
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* QUICK INVITE MODAL */}
      {/* ======================================================== */}
      {invitingCreator && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-5 backdrop-blur-xl">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0c0e15] p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-wider text-amber-400">
                  Direct Invitation
                </p>
                <h4 className="mt-1 text-xl font-bold text-white">
                  Collaborate with {invitingCreator.name}
                </h4>
              </div>
              <button
                onClick={() => setInvitingCreator(null)}
                className="text-lg font-bold text-white/40 hover:text-white"
              >
                ✕
              </button>
            </div>

            {inviteSent ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
                <span className="text-3xl">✨</span>
                <p className="mt-2 text-sm font-bold text-white">
                  Invitation Dispatched!
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  {invitingCreator.name} will receive your campaign proposal in their Creator Studio.
                </p>
                <button
                  onClick={() => setInvitingCreator(null)}
                  className="mt-4 w-full rounded-lg bg-white py-2.5 text-xs font-bold text-black transition hover:bg-slate-200"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendInvite} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">
                    Your Brand / Agency Name *
                  </label>
                  <input
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="e.g. Apex Performance Gear"
                    required
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs font-medium text-white outline-none focus:border-amber-400/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">
                    Contact Email *
                  </label>
                  <input
                    value={brandEmail}
                    onChange={(e) => setBrandEmail(e.target.value)}
                    placeholder="producer@agency.com"
                    type="email"
                    required
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs font-medium text-white outline-none focus:border-amber-400/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">
                    Campaign Scope / Message
                  </label>
                  <textarea
                    value={inviteMsg}
                    onChange={(e) => setInviteMsg(e.target.value)}
                    placeholder={
                      activeBrief
                        ? `Inviting to brief: "${activeBrief.campaignName}"`
                        : "Describe required deliverable, timeline, aspect ratio and tool requirements..."
                    }
                    rows={3}
                    className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs font-medium text-white outline-none focus:border-amber-400/50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSendingInvite}
                  className="mt-2 w-full rounded-lg bg-white py-3 text-xs font-bold text-black transition hover:bg-slate-200 disabled:opacity-50"
                >
                  {isSendingInvite ? "Dispatching..." : "Send Campaign Invitation"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
