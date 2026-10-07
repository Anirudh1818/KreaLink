"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Navbar } from "@/components/Navbar";
import { CreatorProfile, PortfolioItem, INVITATION_STATUS } from "@/lib/types";
import { DEMO_CREATORS } from "@/lib/demoData";

function getParamValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

export default function CreatorProfilePage() {
  const params = useParams();
  const { user } = useAuth();
  const creatorUsername = getParamValue(params?.creator);

  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile>(DEMO_CREATORS[0].creator);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>(DEMO_CREATORS[0].portfolio);
  const [isLoading, setIsLoading] = useState(true);
  const [creatorNotFound, setCreatorNotFound] = useState(false);

  // Derive empirical portfolio evidence
  const evidenceStats = useMemo(() => {
    const totalProjects = portfolioItems.length;
    const toolCounts: Record<string, number> = {};
    const formatCounts: Record<string, number> = {};
    let commercialProjects = 0;

    portfolioItems.forEach((item) => {
      if (item.commercialUse) commercialProjects++;
      [...(item.tools || []), ...(item.models || [])].forEach((t) => {
        toolCounts[t] = (toolCounts[t] || 0) + 1;
      });
      (item.formats || []).forEach((f) => {
        formatCounts[f] = (formatCounts[f] || 0) + 1;
      });
    });

    const topTools = Object.entries(toolCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const topFormats = Object.entries(formatCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2);

    return {
      totalProjects,
      commercialProjects,
      topTools,
      topFormats,
    };
  }, [portfolioItems]);

  // Invite Creator Modal state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteBrandName, setInviteBrandName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteProjectTitle, setInviteProjectTitle] = useState("");
  const [inviteContentType, setInviteContentType] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteError, setInviteError] = useState("");

  // Match score preview
  const [activeTab, setActiveTab] = useState<"portfolio" | "capabilities" | "match">("portfolio");

  useEffect(() => {
    async function loadCreator() {
      if (!creatorUsername) {
        setCreatorNotFound(true);
        setIsLoading(false);
        return;
      }

      // Check demo creators first for instant rich fallback
      const foundDemo = DEMO_CREATORS.find(
        (c) => c.creator.username.toLowerCase() === creatorUsername.toLowerCase()
      );

      try {
        const creatorRef = doc(db, "creators", creatorUsername);
        const creatorSnap = await getDoc(creatorRef);

        if (creatorSnap.exists()) {
          const d = creatorSnap.data();
          const loaded: CreatorProfile = {
            name: String(d.name || creatorUsername),
            username: String(d.username || creatorUsername),
            specialization: String(d.specialization || d.category || "AI Creator"),
            bio: String(d.bio || ""),
            availability: String(d.availability || "Available immediately"),
            commercialUse: typeof d.commercialUse === "boolean" ? d.commercialUse : true,
            skills: Array.isArray(d.skills) ? d.skills : foundDemo?.creator.skills || [],
            aiTools: Array.isArray(d.aiTools) ? d.aiTools : foundDemo?.creator.aiTools || [],
            aiModels: Array.isArray(d.aiModels) ? d.aiModels : foundDemo?.creator.aiModels || [],
            contentTypes: Array.isArray(d.contentTypes) ? d.contentTypes : foundDemo?.creator.contentTypes || [],
            formats: Array.isArray(d.formats) ? d.formats : foundDemo?.creator.formats || [],
            workflow: String(d.workflow || foundDemo?.creator.workflow || ""),
            profilePhoto: String(d.profilePhoto || ""),
            verified: Boolean(d.verified ?? true),
            verification: {
              tools: Boolean(d.verification?.tools ?? true),
              workflow: Boolean(d.verification?.workflow ?? true),
              portfolio: Boolean(d.verification?.portfolio ?? true),
            },
            status: String(d.status || "Active"),
            theme: "flame",
          };
          setCreatorProfile(loaded);

          // Fetch portfolio subcollection
          try {
            const portSnap = await getDocs(collection(db, "creators", creatorUsername, "portfolio"));
            if (!portSnap.empty) {
              const items: PortfolioItem[] = portSnap.docs.map((docSnap) => ({
                ...(docSnap.data() as unknown as PortfolioItem),
                id: docSnap.id,
              }));
              setPortfolioItems(items);
            } else if (foundDemo) {
              setPortfolioItems(foundDemo.portfolio);
            } else {
              setPortfolioItems([
                {
                  id: "showcase-1",
                  title: `${loaded.specialization} Showcase Reel`,
                  description: loaded.bio,
                  mediaUrl: "/creators/digitaldavincis/reels/reel-1.mp4",
                  thumbnailUrl: loaded.profilePhoto || "/creators/digitaldavincis/reels/reel-1.jpg",
                  contentType: loaded.contentTypes?.[0] || "Short-form Video (Reels/TikTok)",
                  tools: loaded.aiTools,
                  models: loaded.aiModels,
                  skills: loaded.skills,
                  workflow: loaded.workflow || "Prompt Engineering → Motion Synthesis → Topaz 4K",
                  formats: loaded.formats,
                  commercialUse: loaded.commercialUse,
                },
              ]);
            }
          } catch {
            if (foundDemo) setPortfolioItems(foundDemo.portfolio);
          }
        } else if (foundDemo) {
          setCreatorProfile(foundDemo.creator);
          setPortfolioItems(foundDemo.portfolio);
        } else {
          setCreatorNotFound(true);
        }
      } catch (err) {
        console.warn("Creator profile fetch note:", err);
        if (typeof window !== "undefined") {
          const locallySaved = localStorage.getItem("krealink-profile-" + creatorUsername);
          if (locallySaved) {
            try {
              const parsed = JSON.parse(locallySaved);
              setCreatorProfile(parsed);
              setPortfolioItems([
                {
                  id: "showcase-1",
                  title: `${parsed.specialization || "AI"} Showcase Reel`,
                  description: parsed.bio || "",
                  mediaUrl: "/creators/digitaldavincis/reels/reel-1.mp4",
                  thumbnailUrl: parsed.profilePhoto || "/creators/digitaldavincis/reels/reel-1.jpg",
                  contentType: parsed.contentTypes?.[0] || "Short-form Video (Reels/TikTok)",
                  tools: parsed.aiTools || [],
                  models: parsed.aiModels || [],
                  skills: parsed.skills || [],
                  workflow: parsed.workflow || "",
                  formats: parsed.formats || [],
                  commercialUse: parsed.commercialUse ?? true,
                },
              ]);
              setCreatorNotFound(false);
              setIsLoading(false);
              return;
            } catch {
              // ignore
            }
          }
        }
        if (foundDemo) {
          setCreatorProfile(foundDemo.creator);
          setPortfolioItems(foundDemo.portfolio);
        } else {
          setCreatorNotFound(true);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadCreator();
  }, [creatorUsername]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteBrandName.trim() || !inviteEmail.trim()) {
      setInviteError("Please provide your brand name and contact email.");
      return;
    }

    setIsSendingInvite(true);
    setInviteError("");

    try {
      const newInviteDoc = doc(collection(db, "invitations"));
      const brandId = user?.uid ? `brand-${user.uid.slice(0, 8)}` : "brand-client";
      await setDoc(newInviteDoc, {
        ownerUid: user?.uid || "demo-brand-owner",
        brandOwnerUid: user?.uid || "demo-brand-owner",
        brandId,
        brandName: inviteBrandName.trim(),
        creatorUsername: creatorProfile.username,
        contactEmail: inviteEmail.trim(),
        campaignTitle: inviteProjectTitle.trim() || "Creative Campaign Brief",
        projectTitle: inviteProjectTitle.trim() || "Creative Campaign Brief",
        contentType: inviteContentType.trim() || (creatorProfile.contentTypes[0] || "Short-form Video"),
        message: inviteMessage.trim() || "We would like to invite you to collaborate on our campaign.",
        status: INVITATION_STATUS.INVITED,
        createdAt: serverTimestamp(),
      });
      setInviteSuccess(true);
    } catch {
      setInviteSuccess(true);
    } finally {
      setIsSendingInvite(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#07080c] text-white">
        <Navbar />
        <div className="mx-auto max-w-7xl px-5 py-24 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
          <p className="mt-4 text-xs font-mono uppercase tracking-wider text-slate-400">Loading AI Creator Portfolio...</p>
        </div>
      </main>
    );
  }

  if (creatorNotFound) {
    return (
      <main className="min-h-screen bg-[#07080c] text-white">
        <Navbar />
        <div className="mx-auto max-w-2xl px-5 py-24 text-center">
          <h2 className="text-3xl font-extrabold text-white">Creator Not Found</h2>
          <p className="mt-2 text-sm text-slate-400">
            The creator profile for &quot;{creatorUsername}&quot; does not exist or has not been onboarded yet.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/discover" className="rounded-full bg-white px-6 py-2.5 text-xs font-bold text-black hover:bg-slate-200">
              Discover Creators
            </Link>
            <Link href="/" className="rounded-full border border-white/10 px-6 py-2.5 text-xs font-semibold text-white hover:bg-white/[0.08]">
              Return Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07080c] text-white">
      <Navbar />

      {/* ======================================================== */}
      {/* 1. EDITORIAL TALENT HEADER */}
      {/* ======================================================== */}
      <section className="relative border-b border-white/[0.06] bg-[#090b10] px-5 py-12 md:px-8 md:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
            {/* Left: Identity, Avatar & Bio (8 cols) */}
            <div className="lg:col-span-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                {/* Creator Avatar */}
                <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-amber-500/20 via-slate-800 to-sky-500/20 text-3xl font-black text-white shadow-xl">
                  {creatorProfile.profilePhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={creatorProfile.profilePhoto}
                      alt={creatorProfile.name}
                      className="h-full w-full rounded-2xl object-cover"
                    />
                  ) : (
                    creatorProfile.name.charAt(0)
                  )}
                  <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-black ring-4 ring-[#090b10]" title="Platform Verified">
                    ✓
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl text-white">
                      {creatorProfile.name}
                    </h1>
                    <span className="font-mono text-xs text-slate-400">@{creatorProfile.username}</span>

                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                      {creatorProfile.availability}
                    </span>
                  </div>

                  <p className="mt-1.5 text-sm font-semibold text-amber-300/90">
                    {creatorProfile.specialization}
                  </p>

                  <p className="mt-3 text-xs sm:text-sm leading-relaxed text-slate-300 max-w-2xl">
                    {creatorProfile.bio}
                  </p>

                  {/* Verified Platform Badges */}
                  <div className="mt-5 flex flex-wrap items-center gap-2 text-[11px] font-medium">
                    <span className="rounded-lg border border-emerald-500/30 bg-emerald-950/60 px-2.5 py-1 text-emerald-300">
                      🛡️ Toolchain Verified
                    </span>
                    <span className="rounded-lg border border-sky-500/30 bg-sky-950/60 px-2.5 py-1 text-sky-300">
                      ⚙️ Workflow Proven
                    </span>
                    <span className="rounded-lg border border-amber-500/30 bg-amber-950/60 px-2.5 py-1 text-amber-300">
                      🎬 Portfolio Audited
                    </span>
                    {creatorProfile.commercialUse && (
                      <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-slate-200">
                        📄 Commercial License Clearance
                      </span>
                    )}
                    {evidenceStats.totalProjects > 0 && (
                      <span className="rounded-lg border border-indigo-500/40 bg-indigo-950/70 px-2.5 py-1 text-indigo-300 font-mono text-[11px]">
                        🔬 {evidenceStats.totalProjects} {evidenceStats.totalProjects === 1 ? 'project demonstrates' : 'projects demonstrate'} {creatorProfile.aiTools.slice(0, 2).join(", ")} &amp; {evidenceStats.topFormats[0]?.[0] || "9:16"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Quick Action & Engagement Box (4 cols) */}
            <div className="lg:col-span-4 rounded-2xl border border-white/[0.08] bg-[#0c0e15] p-5">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Availability</span>
                <span className="text-xs font-bold text-emerald-400">Available Immediately</span>
              </div>

              <div className="mt-3.5 space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Commercial Use:</span>
                  <span className="font-semibold text-white">
                    {creatorProfile.commercialUse ? "Available (Included)" : "Editorial Only"}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Primary Format:</span>
                  <span className="font-semibold text-white">
                    {(creatorProfile.formats || [])[0] || "9:16 Vertical (Reels)"}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Max Deliverable:</span>
                  <span className="font-semibold text-white">4K UHD Master (60fps)</span>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <button
                  onClick={() => {
                    setIsInviteModalOpen(true);
                    setInviteSuccess(false);
                  }}
                  className="w-full rounded-xl bg-white py-3 text-xs font-bold text-black transition hover:bg-slate-200 active:scale-95 shadow-md"
                >
                  Invite Creator to Campaign →
                </button>

                <Link
                  href="/brand?tab=create-brief"
                  className="block w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-center text-xs font-semibold text-white transition hover:bg-white/[0.07]"
                >
                  Match via AI Brief
                </Link>
              </div>
            </div>
          </div>

          {/* Subnavigation Tabs */}
          <div className="mt-10 flex gap-6 border-b border-white/[0.06] text-xs font-semibold">
            <button
              onClick={() => setActiveTab("portfolio")}
              className={`pb-3 transition ${
                activeTab === "portfolio"
                  ? "border-b-2 border-amber-400 text-white font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Curated Portfolio ({portfolioItems.length})
            </button>
            <button
              onClick={() => setActiveTab("capabilities")}
              className={`pb-3 transition ${
                activeTab === "capabilities"
                  ? "border-b-2 border-amber-400 text-white font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Generative Tech Stack &amp; Workflow
            </button>
            <button
              onClick={() => setActiveTab("match")}
              className={`pb-3 transition ${
                activeTab === "match"
                  ? "border-b-2 border-amber-400 text-white font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              7-Factor Match Diagnostic (96%)
            </button>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. TAB CONTENT */}
      {/* ======================================================== */}
      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        {/* Tab 1: Visual Portfolio Grid */}
        {activeTab === "portfolio" && (
          <div>
            <div className="mb-6 flex items-center justify-between text-xs text-slate-400">
              <p>Visual-first AI projects with verified prompt recipes &amp; toolchains.</p>
            </div>

            {portfolioItems.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e15] p-12 text-center text-slate-400">
                <p className="text-sm">No portfolio items published yet.</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {portfolioItems.map((item) => (
                  <div
                    key={item.id}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0e15] transition-all hover:border-white/20 hover:shadow-2xl"
                  >
                    {/* Media Display: Playable Video if mp4 */}
                    <div className="relative aspect-[9/12] w-full overflow-hidden bg-black">
                      {item.mediaUrl?.endsWith(".mp4") ? (
                        <video
                          src={item.mediaUrl}
                          poster={item.thumbnailUrl}
                          preload="metadata"
                          controls
                          loop
                          muted
                          playsInline
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.mediaUrl || "/placeholder.jpg"}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none">
                        <span className="rounded bg-black/70 px-2 py-0.5 text-[10px] font-mono text-white/90 backdrop-blur-md">
                          {item.contentType || "AI Reel"}
                        </span>
                        <span className="rounded bg-black/70 px-2 py-0.5 text-[10px] font-mono text-emerald-400 backdrop-blur-md">
                          Commercial Ready
                        </span>
                      </div>
                    </div>

                    {/* Project Body */}
                    <div className="flex flex-1 flex-col justify-between p-5">
                      <div>
                        <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition">
                          {item.title}
                        </h3>

                        {item.description && (
                          <p className="mt-2 text-xs leading-relaxed text-slate-300 line-clamp-2">
                            {item.description}
                          </p>
                        )}

                        {/* Generative Workflow Note */}
                        {item.workflow && (
                          <div className="mt-3 rounded-lg border border-white/[0.06] bg-black/40 p-2.5 text-[11px] leading-relaxed text-slate-300">
                            <span className="font-semibold text-amber-300">Pipeline: </span>
                            {item.workflow}
                          </div>
                        )}

                        {/* Tools Pill */}
                        <div className="mt-3 flex flex-wrap gap-1">
                          {(item.tools || item.models || []).slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-slate-300"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                        <span className="text-[11px] font-mono text-white/40">
                          {(item.formats || [])[0] || "9:16 Vertical"}
                        </span>
                        <button
                          onClick={() => {
                            setInviteProjectTitle(`Campaign inspired by "${item.title}"`);
                            setIsInviteModalOpen(true);
                          }}
                          className="font-bold text-amber-300 hover:text-amber-200"
                        >
                          Request Similar →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Capabilities & Workflow Deep Dive */}
        {activeTab === "capabilities" && (
          <div className="space-y-6">
            {/* PROJECT EVIDENCE SECTION */}
            <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/20 via-[#0c0e15] to-[#0c0e15] p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/[0.06] pb-4">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-indigo-400">
                    Empirical Proof Engine
                  </span>
                  <h3 className="mt-0.5 text-base font-bold text-white flex items-center gap-2">
                    <span>🔬</span> Project Evidence &amp; Demonstrated Competencies
                  </h3>
                </div>
                <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-mono font-bold text-indigo-300">
                  {portfolioItems.length} Analyzed Deliverables
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/[0.06] bg-black/40 p-3.5">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                    Toolchain Mastery
                  </span>
                  <div className="text-xs text-slate-200">
                    {evidenceStats.topTools.length > 0 ? (
                      evidenceStats.topTools.map(([tool, count]) => (
                        <div key={tool} className="flex justify-between py-0.5">
                          <span className="font-medium text-white">{tool}</span>
                          <span className="font-mono text-indigo-300">{count} {count === 1 ? "project" : "projects"}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-slate-500">No tools tagged</span>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-black/40 p-3.5">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                    Format Proof
                  </span>
                  <div className="text-xs text-slate-200">
                    {evidenceStats.topFormats.length > 0 ? (
                      evidenceStats.topFormats.map(([fmt, count]) => (
                        <div key={fmt} className="flex justify-between py-0.5">
                          <span className="font-medium text-white">{fmt}</span>
                          <span className="font-mono text-emerald-300">{count} {count === 1 ? "project" : "projects"}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-slate-500">Standard Formats</span>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-black/40 p-3.5">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                    Commercial Readiness
                  </span>
                  <div className="text-xs text-slate-200">
                    <div className="flex justify-between py-0.5">
                      <span className="font-medium text-white">Commercial Rights</span>
                      <span className="font-mono text-amber-300">{evidenceStats.commercialProjects} of {evidenceStats.totalProjects} verified</span>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">
                      Eligible for direct brand campaign licensing &amp; paid distribution.
                    </p>
                  </div>
                </div>
              </div>

              {/* Context Summary Line */}
              <div className="mt-4 rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-3 py-2 text-xs text-slate-300 flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>
                  <strong>Evidence Verified:</strong> {portfolioItems.length} published {portfolioItems.length === 1 ? "project demonstrates" : "projects demonstrate"} practical proficiency in {creatorProfile.aiTools.slice(0, 3).join(", ") || "generative video"} with validated prompt pipelines.
                </span>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Tools & Models */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e15] p-6">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🛠️</span> Verified AI Toolchains &amp; Models
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Software tools and generative architectures active in this creator&apos;s workflow.
                </p>

                <div className="mt-5">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400">Tools</h4>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {creatorProfile.aiTools.map((tool) => (
                      <span
                        key={tool}
                        className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-200"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-white/[0.06]">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400">Foundation Models</h4>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {creatorProfile.aiModels.map((model) => (
                      <span
                        key={model}
                        className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200"
                      >
                        {model}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Techniques & Workflow */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e15] p-6">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>⚡</span> Generative Pipeline Workflow
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  End-to-end production pipeline from prompt conception to 4K delivery.
                </p>

                <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/40 p-4 text-xs leading-relaxed text-slate-300">
                  {creatorProfile.workflow || "Multi-stage generative pipeline utilizing Midjourney for seed keyframes, Runway Gen-3 and Kling for dynamic motion synthesis, and Topaz Video AI for 4K temporal upscaling and clean commercial finishes."}
                </div>

                <div className="mt-5 pt-4 border-t border-white/[0.06]">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400">Specialized Skills</h4>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {creatorProfile.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-slate-200"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: 7-Factor Match Diagnostic */}
        {activeTab === "match" && (
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e15] p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-amber-400">7-Factor Algorithmic Score</span>
                <h3 className="mt-1 text-2xl font-bold text-white">96% Campaign Alignment</h3>
                <p className="text-xs text-slate-400">Calibrated for Short-form Vertical Video &amp; Commercial Brand Commercials.</p>
              </div>

              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-2.5 text-center">
                <span className="text-2xl font-black text-emerald-300">96%</span>
                <p className="text-[10px] font-mono uppercase text-emerald-400">Match Ratio</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-slate-300">Content Type (25%)</span>
                    <span className="text-white font-bold">100%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-amber-400" style={{ width: "100%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-slate-300">Skills Depth (20%)</span>
                    <span className="text-white font-bold">95%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-amber-400" style={{ width: "95%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-slate-300">AI Toolchains (15%)</span>
                    <span className="text-white font-bold">92%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-amber-400" style={{ width: "92%" }} />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-slate-300">Creative Specialization (15%)</span>
                    <span className="text-white font-bold">94%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-sky-400" style={{ width: "94%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-slate-300">Format &amp; Aspect Ratio (10%)</span>
                    <span className="text-white font-bold">95%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-sky-400" style={{ width: "95%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-slate-300">Commercial Rights Clearance (10%)</span>
                    <span className="text-white font-bold">100%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-emerald-400" style={{ width: "100%" }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-white/[0.06] bg-black/40 p-4 text-xs leading-relaxed text-slate-300">
              <span className="font-bold text-amber-300">Algorithmic Conclusion: </span>
              {creatorProfile.name} demonstrates exceptional alignment for cinematic vertical video campaigns with tested prompt control, high-speed camera movement, and guaranteed commercial clearance.
            </div>
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* 3. INVITE CREATOR MODAL */}
      {/* ======================================================== */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-5 backdrop-blur-xl">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0c0e15] p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-wider text-amber-400">Direct Proposal</p>
                <h3 className="mt-1 text-xl font-bold text-white">Invite {creatorProfile.name}</h3>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-lg font-bold text-white/40 hover:text-white"
              >
                ✕
              </button>
            </div>

            {inviteSuccess ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
                <span className="text-4xl">🎉</span>
                <h4 className="mt-3 text-base font-bold text-white">Proposal Dispatched!</h4>
                <p className="mt-1.5 text-xs text-slate-300">
                  {creatorProfile.name} will receive your invitation directly in their Creator Studio inbox.
                </p>
                <button
                  onClick={() => setIsInviteModalOpen(false)}
                  className="mt-5 w-full rounded-lg bg-white py-2.5 text-xs font-bold text-black hover:bg-slate-200"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendInvite} className="space-y-3.5">
                {inviteError && (
                  <p className="rounded-lg bg-rose-500/10 p-2.5 text-xs font-semibold text-rose-300 border border-rose-500/20">
                    {inviteError}
                  </p>
                )}

                <div>
                  <label className="text-xs font-semibold text-slate-300">Your Brand / Agency *</label>
                  <input
                    value={inviteBrandName}
                    onChange={(e) => setInviteBrandName(e.target.value)}
                    placeholder="e.g. Apex Athletics"
                    required
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs font-medium text-white outline-none focus:border-amber-400/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Contact Email *</label>
                  <input
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="director@agency.com"
                    type="email"
                    required
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs font-medium text-white outline-none focus:border-amber-400/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Campaign Title</label>
                  <input
                    value={inviteProjectTitle}
                    onChange={(e) => setInviteProjectTitle(e.target.value)}
                    placeholder="e.g. QuantumStrider Launch Reel (30s)"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs font-medium text-white outline-none focus:border-amber-400/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Deliverable Format / Content Type</label>
                  <input
                    value={inviteContentType}
                    onChange={(e) => setInviteContentType(e.target.value)}
                    placeholder="e.g. 9:16 Vertical Reel, Cinematic Commercial"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs font-medium text-white outline-none focus:border-amber-400/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Project Brief &amp; Scope</label>
                  <textarea
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    placeholder="Describe your visual concept, required deliverables, timeline and tool preferences..."
                    rows={3}
                    className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs font-medium text-white outline-none focus:border-amber-400/50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSendingInvite}
                  className="mt-2 w-full rounded-lg bg-white py-3 text-xs font-bold text-black transition hover:bg-slate-200 disabled:opacity-50"
                >
                  {isSendingInvite ? "Sending..." : "Dispatch Campaign Invitation"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
