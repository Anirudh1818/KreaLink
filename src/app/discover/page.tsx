"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { collection, getDocs, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useStoredTheme } from "@/lib/use-theme";
import { useAuth } from "@/lib/auth-context";
import { Navbar } from "@/components/Navbar";
import { CreatorProfile, CreativeBrief } from "@/lib/types";
import { calculateMatchScore } from "@/lib/matchingEngine";
import { DEMO_CREATORS, DEMO_BRIEFS } from "@/lib/demoData";

export default function DiscoverPage() {
  const { user } = useAuth();
  const { theme } = useStoredTheme();

  const [creators, setCreators] = useState<CreatorProfile[]>([]);
  const [briefs, setBriefs] = useState<CreativeBrief[]>(DEMO_BRIEFS);
  const [selectedBriefId, setSelectedBriefId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialization, setSelectedSpecialization] = useState("");
  const [selectedTool, setSelectedTool] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [selectedContentType, setSelectedContentType] = useState("");
  const [selectedFormat, setSelectedFormat] = useState("");
  const [commercialOnly, setCommercialOnly] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(false);

  // Quick Invite Modal state
  const [invitingCreator, setInvitingCreator] = useState<CreatorProfile | null>(null);
  const [brandName, setBrandName] = useState("");
  const [brandEmail, setBrandEmail] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);

  // Load creators and briefs from Firestore
  useEffect(() => {
    async function loadData() {
      try {
        // 1. Fetch creators from Firestore
        const creatorSnap = await getDocs(collection(db, "creators"));
        let loadedCreators: CreatorProfile[] = [];

        if (!creatorSnap.empty) {
          loadedCreators = creatorSnap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              name: String(d.name || docSnap.id),
              username: String(d.username || docSnap.id),
              specialization: String(d.specialization || d.category || "AI Creator"),
              bio: String(d.bio || ""),
              availability: String(d.availability || "Available for projects"),
              commercialUse: typeof d.commercialUse === "boolean" ? d.commercialUse : true,
              skills: Array.isArray(d.skills) ? d.skills : [],
              aiTools: Array.isArray(d.aiTools) ? d.aiTools : [],
              aiModels: Array.isArray(d.aiModels) ? d.aiModels : [],
              contentTypes: Array.isArray(d.contentTypes) ? d.contentTypes : [],
              formats: Array.isArray(d.formats) ? d.formats : [],
              workflow: String(d.workflow || ""),
              profilePhoto: String(d.profilePhoto || ""),
              verified: Boolean(d.verified),
              verification: {
                tools: Boolean(d.verification?.tools ?? d.verified),
                workflow: Boolean(d.verification?.workflow),
                portfolio: Boolean(d.verification?.portfolio),
              },
              status: String(d.status || "Active"),
              theme: d.theme || "flame",
            };
          });
        }

        // If Firestore had no creators yet, fall back to our demo creators for seamless testing
        if (loadedCreators.length === 0) {
          loadedCreators = DEMO_CREATORS.map((c) => c.creator);
        }

        setCreators(loadedCreators);

        // 2. Fetch briefs from Firestore
        try {
          const briefsSnap = await getDocs(collection(db, "briefs"));
          if (!briefsSnap.empty) {
            const loadedBriefs: CreativeBrief[] = briefsSnap.docs.map((b) => ({
              id: b.id,
              ...(b.data() as any),
            }));
            setBriefs(loadedBriefs);
          }
        } catch {
          // Use demo briefs fallback
        }
      } catch (err) {
        console.warn("Could not load from Firestore, using demo set:", err);
        setCreators(DEMO_CREATORS.map((c) => c.creator));
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Filter option presets derived from dataset
  const specializations = useMemo(() => {
    const set = new Set<string>();
    creators.forEach((c) => {
      if (c.specialization) set.add(c.specialization);
    });
    return Array.from(set);
  }, [creators]);

  const allTools = useMemo(() => {
    const set = new Set<string>();
    creators.forEach((c) => {
      (c.aiTools || []).forEach((t) => set.add(t));
      (c.aiModels || []).forEach((m) => set.add(m));
    });
    return Array.from(set);
  }, [creators]);

  const allSkills = useMemo(() => {
    const set = new Set<string>();
    creators.forEach((c) => {
      (c.skills || []).forEach((s) => set.add(s));
    });
    return Array.from(set);
  }, [creators]);

  const activeBrief = useMemo(() => {
    return briefs.find((b) => b.id === selectedBriefId);
  }, [briefs, selectedBriefId]);

  // Compute matches and filter results
  const filteredAndRankedCreators = useMemo(() => {
    let result = creators.map((creator) => {
      let matchScore: number | null = null;
      let matchExplanation = "";

      if (activeBrief) {
        const scoreObj = calculateMatchScore(activeBrief, creator);
        matchScore = scoreObj.overallScore;
        matchExplanation = scoreObj.explanation;
      }

      return {
        creator,
        matchScore,
        matchExplanation,
      };
    });

    // Text search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        ({ creator }) =>
          creator.name.toLowerCase().includes(q) ||
          creator.specialization.toLowerCase().includes(q) ||
          creator.bio.toLowerCase().includes(q) ||
          (creator.aiTools || []).some((t) => t.toLowerCase().includes(q)) ||
          (creator.skills || []).some((s) => s.toLowerCase().includes(q))
      );
    }

    // Specialization filter
    if (selectedSpecialization) {
      result = result.filter(
        ({ creator }) => creator.specialization === selectedSpecialization
      );
    }

    // Tool filter
    if (selectedTool) {
      result = result.filter(
        ({ creator }) =>
          (creator.aiTools || []).includes(selectedTool) ||
          (creator.aiModels || []).includes(selectedTool)
      );
    }

    // Skill filter
    if (selectedSkill) {
      result = result.filter(({ creator }) =>
        (creator.skills || []).includes(selectedSkill)
      );
    }

    // Content Type filter
    if (selectedContentType) {
      result = result.filter(({ creator }) =>
        (creator.contentTypes || []).includes(selectedContentType)
      );
    }

    // Format filter
    if (selectedFormat) {
      result = result.filter(({ creator }) =>
        (creator.formats || []).some((f) => f.includes(selectedFormat))
      );
    }

    // Commercial use only
    if (commercialOnly) {
      result = result.filter(({ creator }) => creator.commercialUse);
    }

    // Available only
    if (availableOnly) {
      result = result.filter(({ creator }) =>
        creator.availability?.toLowerCase().includes("available")
      );
    }

    // Sort: if brief is selected, sort descending by match score
    if (activeBrief) {
      result.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    }

    return result;
  }, [
    creators,
    activeBrief,
    searchQuery,
    selectedSpecialization,
    selectedTool,
    selectedSkill,
    selectedContentType,
    selectedFormat,
    commercialOnly,
    availableOnly,
  ]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedSpecialization("");
    setSelectedTool("");
    setSelectedSkill("");
    setSelectedContentType("");
    setSelectedFormat("");
    setCommercialOnly(false);
    setAvailableOnly(false);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitingCreator) return;

    setIsSendingInvite(true);
    try {
      const inviteRef = doc(collection(db, "invitations"));
      await setDoc(inviteRef, {
        creatorUsername: invitingCreator.username,
        brandName: brandName.trim() || "Brand Client",
        contactEmail: brandEmail.trim() || user?.email || "agency@client.com",
        campaignTitle: activeBrief?.campaignName || "Campaign Collaboration",
        briefId: activeBrief?.id || null,
        message: inviteMsg.trim() || "We would like to invite you to our creative brief.",
        status: "Invited",
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
    <main className="min-h-screen bg-[#050508] text-white">
      <Navbar />

      {/* Top Banner / Breadcrumb */}
      <section className="relative z-10 border-b border-white/10 bg-white/[0.02] px-5 py-8 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1 text-xs font-black uppercase tracking-[0.2em] text-white/50">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                Marketplace Discovery
              </div>
              <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
                Discover AI Creators
              </h2>
              <p className="mt-1 text-sm text-white/55">
                Browse verified AI filmmakers, animators, and generative artists calibrated by tooling &amp; capabilities.
              </p>
            </div>

            {/* Brief Selector to enable Instant Match Scoring */}
            <div className="flex flex-col gap-1.5 rounded-2xl border border-white/15 bg-black/40 p-3.5">
              <label className="text-xs font-black uppercase tracking-wider text-white/60">
                ⚡ Rank by Creative Brief:
              </label>
              <select
                value={selectedBriefId}
                onChange={(e) => setSelectedBriefId(e.target.value)}
                className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold text-white outline-none focus:border-white/30"
              >
                <option value="">-- No brief selected (Show all) --</option>
                {briefs.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.campaignName} ({b.aspectRatio || "Video"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search bar & Filter Pills */}
          <div className="mt-6 space-y-3">
            <div className="relative">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search creators by name, style, AI tool (e.g. Runway, Midjourney), or skills..."
                className="w-full rounded-2xl border border-white/10 bg-black/50 px-5 py-4 text-sm font-bold text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-white/40 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Filter controls row */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Specialization Filter */}
              <select
                value={selectedSpecialization}
                onChange={(e) => setSelectedSpecialization(e.target.value)}
                className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 font-bold text-white/80 outline-none"
              >
                <option value="">All Specializations</option>
                {specializations.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>

              {/* Tool Filter */}
              <select
                value={selectedTool}
                onChange={(e) => setSelectedTool(e.target.value)}
                className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 font-bold text-white/80 outline-none"
              >
                <option value="">All AI Tools / Models</option>
                {allTools.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              {/* Skill Filter */}
              <select
                value={selectedSkill}
                onChange={(e) => setSelectedSkill(e.target.value)}
                className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 font-bold text-white/80 outline-none"
              >
                <option value="">All Skills</option>
                {allSkills.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              {/* Format Filter */}
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 font-bold text-white/80 outline-none"
              >
                <option value="">All Formats</option>
                <option value="9:16">9:16 Vertical (Reels/TikTok)</option>
                <option value="16:9">16:9 Landscape</option>
                <option value="4K">4K UHD</option>
              </select>

              {/* Commercial Use Toggle */}
              <button
                type="button"
                onClick={() => setCommercialOnly((prev) => !prev)}
                className={`rounded-xl border px-3 py-2 font-bold transition ${
                  commercialOnly
                    ? "border-amber-500/50 bg-amber-500/20 text-amber-300"
                    : "border-white/10 bg-white/[0.03] text-white/60 hover:text-white"
                }`}
              >
                ⚡ Commercial Rights Only
              </button>

              {/* Availability Toggle */}
              <button
                type="button"
                onClick={() => setAvailableOnly((prev) => !prev)}
                className={`rounded-xl border px-3 py-2 font-bold transition ${
                  availableOnly
                    ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
                    : "border-white/10 bg-white/[0.03] text-white/60 hover:text-white"
                }`}
              >
                🟢 Available Now
              </button>

              {(searchQuery ||
                selectedSpecialization ||
                selectedTool ||
                selectedSkill ||
                selectedFormat ||
                commercialOnly ||
                availableOnly) && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 font-bold text-rose-300 transition hover:bg-rose-500/20"
                >
                  ✕ Reset Filters
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Catalog Grid */}
      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm font-bold text-white/50">
            Showing{" "}
            <span className="text-white">
              {filteredAndRankedCreators.length}
            </span>{" "}
            creators
            {activeBrief && ` ranked for "${activeBrief.campaignName}"`}
          </p>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-sm font-bold text-white/40">
            Loading creators...
          </div>
        ) : filteredAndRankedCreators.length === 0 ? (
          /* Graceful Empty State */
          <div className="rounded-[2.4rem] border border-white/10 bg-black/30 p-12 text-center backdrop-blur-md">
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
              style={{ background: theme.softGradient }}
            >
              🔍
            </div>
            <h3 className="mt-4 text-2xl font-black">No exact matches found.</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/50">
              Try removing one or more filters, or search for different tools and skills.
            </p>
            <button
              onClick={resetFilters}
              className="mt-6 rounded-2xl px-6 py-3 text-xs font-black text-white transition hover:scale-105"
              style={{ background: theme.gradient }}
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAndRankedCreators.map(
              ({ creator, matchScore, matchExplanation }) => (
                <div
                  key={creator.username}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-[2.2rem] border border-white/10 bg-black/40 p-6 backdrop-blur-md transition-all duration-300 hover:border-white/25 hover:shadow-2xl"
                >
                  <div>
                    {/* Header: Avatar, Info, and optional Match Score Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div
                          className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl p-[2px]"
                          style={{ background: theme.gradient }}
                        >
                          <div className="flex h-full w-full items-center justify-center rounded-[0.8rem] bg-[#121217] text-xl font-black text-white">
                            {creator.profilePhoto ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={creator.profilePhoto}
                                alt={creator.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              creator.name.charAt(0).toUpperCase()
                            )}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <Link
                            href={`/${creator.username}`}
                            className="block truncate text-lg font-black text-white hover:underline"
                          >
                            {creator.name}
                          </Link>
                          <p className="truncate text-xs font-bold text-white/40">
                            @{creator.username}
                          </p>
                        </div>
                      </div>

                      {/* Match Score Badge (if brief is active) */}
                      {matchScore !== null && (
                        <div
                          className="flex flex-col items-end rounded-xl px-2.5 py-1 text-right"
                          style={{
                            background:
                              matchScore >= 90
                                ? "rgba(16,185,129,0.15)"
                                : "rgba(245,158,11,0.15)",
                            border: `1px solid ${
                              matchScore >= 90
                                ? "rgba(16,185,129,0.3)"
                                : "rgba(245,158,11,0.3)"
                            }`,
                          }}
                        >
                          <span
                            className="text-base font-black"
                            style={{
                              color: matchScore >= 90 ? "#6ee7b7" : "#fcd34d",
                            }}
                          >
                            {matchScore}%
                          </span>
                          <span className="text-[10px] font-bold uppercase text-white/45">
                            Match
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Specialization & Availability */}
                    <div className="mt-4">
                      <span className="inline-block rounded-lg bg-white/[0.06] px-2.5 py-1 text-xs font-bold text-white/90">
                        {creator.specialization}
                      </span>
                    </div>

                    <p className="mt-2 text-xs leading-5 text-white/55 line-clamp-2">
                      {creator.bio}
                    </p>

                    {/* AI Match Explanation (if brief selected) */}
                    {matchExplanation && (
                      <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-2.5 text-[11px] leading-4 text-emerald-300">
                        <span className="font-black">Why this creator: </span>
                        {matchExplanation}
                      </div>
                    )}

                    {/* Tags: AI Tools */}
                    <div className="mt-4">
                      <p className="text-[10px] font-black uppercase tracking-wider text-white/35">
                        AI Stack
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {[...(creator.aiTools || []), ...(creator.aiModels || [])]
                          .slice(0, 4)
                          .map((tool) => (
                            <span
                              key={tool}
                              className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] font-bold text-white/70"
                            >
                              {tool}
                            </span>
                          ))}
                        {[...(creator.aiTools || []), ...(creator.aiModels || [])]
                          .length > 4 && (
                          <span className="text-[10px] font-bold text-white/30 self-center">
                            +
                            {[...(creator.aiTools || []), ...(creator.aiModels || [])]
                              .length - 4}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Deliverables & Formats */}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                      <span
                        className={`rounded-md px-2 py-0.5 ${
                          creator.commercialUse
                            ? "bg-amber-500/10 text-amber-300"
                            : "bg-white/[0.03] text-white/40"
                        }`}
                      >
                        {creator.commercialUse ? "⚡ Commercial" : "Personal"}
                      </span>

                      <span className="rounded-md bg-white/[0.03] px-2 py-0.5 text-white/50">
                        {(creator.formats || [])[0] || "9:16"}
                      </span>

                      {creator.verification?.tools && (
                        <span className="rounded-md bg-cyan-500/10 px-2 py-0.5 text-cyan-300">
                          ✓ Tool Signal
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-6 flex items-center gap-2 border-t border-white/10 pt-4">
                    <Link
                      href={`/${creator.username}`}
                      className="flex-1 rounded-xl border border-white/10 bg-white/[0.05] py-2.5 text-center text-xs font-black text-white/80 transition hover:bg-white/[0.1] hover:text-white"
                    >
                      View Profile
                    </Link>

                    <button
                      onClick={() => {
                        setInvitingCreator(creator);
                        setInviteSent(false);
                      }}
                      className="rounded-xl px-4 py-2.5 text-xs font-black text-white transition hover:scale-105"
                      style={{ background: theme.gradient }}
                    >
                      Invite
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>

      {/* Quick Invite Modal */}
      {invitingCreator && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-5 backdrop-blur-xl">
          <div
            className="w-full max-w-md rounded-[2.2rem] border border-white/10 bg-[#0b0810] p-6 shadow-2xl"
            style={{ boxShadow: `0 0 80px ${theme.glow}` }}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-white/40">
                  Invite Creator
                </p>
                <h4 className="mt-1 text-xl font-black text-white">
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
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
                <span className="text-3xl">🎉</span>
                <p className="mt-2 text-sm font-black text-white">
                  Invitation Sent!
                </p>
                <p className="mt-1 text-xs text-white/60">
                  {invitingCreator.name} has been notified and can review your inquiry.
                </p>
                <button
                  onClick={() => setInvitingCreator(null)}
                  className="mt-4 w-full rounded-xl py-2.5 text-xs font-black text-white"
                  style={{ background: theme.gradient }}
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendInvite} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-white/60">
                    Your Brand / Agency Name *
                  </label>
                  <input
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="e.g. Apex Performance Gear"
                    required
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs font-bold text-white outline-none focus:border-white/30"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-white/60">
                    Contact Email *
                  </label>
                  <input
                    value={brandEmail}
                    onChange={(e) => setBrandEmail(e.target.value)}
                    placeholder="producer@agency.com"
                    type="email"
                    required
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs font-bold text-white outline-none focus:border-white/30"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-white/60">
                    Project Message / Scope
                  </label>
                  <textarea
                    value={inviteMsg}
                    onChange={(e) => setInviteMsg(e.target.value)}
                    placeholder={
                      activeBrief
                        ? `Inviting to brief: "${activeBrief.campaignName}"`
                        : "Describe your project requirements, timeline and deliverables..."
                    }
                    rows={3}
                    className="mt-1 w-full resize-none rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs font-bold text-white outline-none focus:border-white/30"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSendingInvite}
                  className="mt-2 w-full rounded-xl py-3 text-xs font-black text-white transition hover:scale-[1.01]"
                  style={{ background: theme.gradient }}
                >
                  {isSendingInvite ? "Sending..." : "Send Invitation"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
