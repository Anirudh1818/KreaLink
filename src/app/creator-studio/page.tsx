"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Navbar } from "@/components/Navbar";
import {
  CreatorProfile,
  PortfolioItem,
  Invitation,
  Engagement,
  INVITATION_STATUS,
  ENGAGEMENT_STATUS,
} from "@/lib/types";
import { DEMO_CREATORS } from "@/lib/demoData";

type StudioTab = "overview" | "capabilities" | "portfolio" | "invitations";

export default function CreatorStudioPage() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<StudioTab>("overview");
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile>(
    DEMO_CREATORS[0].creator
  );
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>(
    DEMO_CREATORS[0].portfolio
  );
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [saveMessage, setSaveMessage] = useState("");
  const [isInferringProfileStack, setIsInferringProfileStack] = useState(false);
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [aiAssistBanner, setAiAssistBanner] = useState<{
    type: "success" | "error";
    message: string;
    reasoning?: string;
  } | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<{
    tools: string[];
    models: string[];
    skills: string[];
    workflow: string;
    contentType: string;
    formats: string[];
    commercialUse?: boolean;
    confidence?: string;
    reasoning?: string;
  } | null>(null);

  // Portfolio Item Form / Modal
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const [editingPortfolioId, setEditingPortfolioId] = useState<string | null>(null);
  const [portfolioForm, setPortfolioForm] = useState({
    title: "",
    description: "",
    mediaUrl: "",
    contentType: "Short-form Video (Reels/TikTok)",
    toolsString: "Runway, Midjourney",
    modelsString: "Runway Gen-3 Alpha, Midjourney v6.1",
    skillsString: "Prompt Engineering, Camera Movement Control",
    workflow: "Midjourney concept → Runway camera move → Topaz 4K",
    formatsString: "9:16 Vertical (Reels/Shorts), 4K UHD",
    commercialUse: true,
  });

  // 1. Load creator document, portfolio, and invitations
  useEffect(() => {
    async function loadCreatorData() {
      let targetUser = "mayaverma";
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const creatorQuery = urlParams.get("creator");
        const localStored =
          localStorage.getItem("krealink-current-creator") ||
          localStorage.getItem("fanstreak-current-creator");
        if (creatorQuery) targetUser = creatorQuery;
        else if (localStored) targetUser = localStored;
      }

      try {
        const creatorRef = doc(db, "creators", targetUser);
        const creatorSnap = await getDoc(creatorRef);

        if (creatorSnap.exists()) {
          const d = creatorSnap.data();
          const loaded: CreatorProfile = {
            name: String(d.name || targetUser),
            username: String(d.username || targetUser),
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
            verified: Boolean(d.verified),
            verification: {
              tools: Boolean(d.verification?.tools ?? d.verified),
              workflow: Boolean(d.verification?.workflow),
              portfolio: Boolean(d.verification?.portfolio),
            },
            status: String(d.status || "Active"),
            theme: "flame",
          };
          setCreatorProfile(loaded);
        } else {
          let foundLocally: CreatorProfile | null = null;
          if (typeof window !== "undefined") {
            const raw = localStorage.getItem("krealink-profile-" + targetUser);
            if (raw) {
              try {
                foundLocally = JSON.parse(raw);
              } catch {
                // ignore
              }
            }
          }

          if (foundLocally) {
            setCreatorProfile(foundLocally);
          } else {
            const found = DEMO_CREATORS.find((c) => c.creator.username === targetUser);
            if (found) {
              setCreatorProfile(found.creator);
              setPortfolioItems(found.portfolio);
            }
          }
        }

        // Fetch portfolio items
        try {
          const portRef = collection(db, "creators", targetUser, "portfolio");
          const portSnap = await getDocs(portRef);
          if (!portSnap.empty) {
            const items: PortfolioItem[] = portSnap.docs.map((docSnap) => ({
              ...(docSnap.data() as unknown as PortfolioItem),
              id: docSnap.id,
            }));
            setPortfolioItems(items);
          }
        } catch {
          // ignore
        }

        // Fetch invitations
        try {
          const invSnap = await getDocs(collection(db, "invitations"));
          if (!invSnap.empty) {
            const myInvs = invSnap.docs
              .map((d) => ({ id: d.id, ...(d.data() as unknown as Invitation) }))
              .filter((inv: Invitation) => !inv.creatorUsername || inv.creatorUsername.toLowerCase() === targetUser.toLowerCase());
            setInvitations(myInvs);
          } else if (typeof window !== "undefined") {
            const localInvs = localStorage.getItem("krealink-invitations");
            if (localInvs) {
              const parsed: Invitation[] = JSON.parse(localInvs);
              setInvitations(parsed.filter((inv) => !inv.creatorUsername || inv.creatorUsername.toLowerCase() === targetUser.toLowerCase()));
            }
          }
        } catch {
          if (typeof window !== "undefined") {
            const localInvs = localStorage.getItem("krealink-invitations");
            if (localInvs) {
              try {
                const parsed: Invitation[] = JSON.parse(localInvs);
                setInvitations(parsed.filter((inv) => !inv.creatorUsername || inv.creatorUsername.toLowerCase() === targetUser.toLowerCase()));
              } catch {
                // ignore
              }
            }
          }
        }

        // Fetch engagements
        try {
          const engSnap = await getDocs(collection(db, "engagements"));
          if (!engSnap.empty) {
            const myEngs = engSnap.docs
              .map((d) => ({ id: d.id, ...(d.data() as unknown as Engagement) }))
              .filter((eng: Engagement) => !eng.creatorUsername || eng.creatorUsername.toLowerCase() === targetUser.toLowerCase());
            setEngagements(myEngs);
          } else if (typeof window !== "undefined") {
            const localEngs = localStorage.getItem("krealink-engagements");
            if (localEngs) {
              const parsed: Engagement[] = JSON.parse(localEngs);
              setEngagements(parsed.filter((eng) => !eng.creatorUsername || eng.creatorUsername.toLowerCase() === targetUser.toLowerCase()));
            }
          }
        } catch {
          if (typeof window !== "undefined") {
            const localEngs = localStorage.getItem("krealink-engagements");
            if (localEngs) {
              try {
                const parsed: Engagement[] = JSON.parse(localEngs);
                setEngagements(parsed.filter((eng) => !eng.creatorUsername || eng.creatorUsername.toLowerCase() === targetUser.toLowerCase()));
              } catch {
                // ignore
              }
            }
          }
        }
      } catch (err) {
        console.warn("Creator studio load notice:", err);
        if (typeof window !== "undefined") {
          const localSaved = localStorage.getItem("krealink-profile-" + targetUser);
          if (localSaved) {
            try {
              setCreatorProfile(JSON.parse(localSaved));
              return;
            } catch {
              // ignore
            }
          }
        }
        const found = DEMO_CREATORS.find((c) => c.creator.username === targetUser) || DEMO_CREATORS[0];
        setCreatorProfile(found.creator);
        setPortfolioItems(found.portfolio);
      }
    }

    loadCreatorData();
  }, [user]);

  // Handle Save Profile
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaveMessage("Saving profile updates...");

    try {
      const creatorDocRef = doc(db, "creators", creatorProfile.username);
      await setDoc(
        creatorDocRef,
        {
          ...creatorProfile,
          ownerUid: user?.uid || creatorProfile.ownerUid || "demo-creator-owner",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setSaveMessage("✓ Profile and workflow successfully saved!");
    } catch {
      setSaveMessage("✓ Profile updated in local studio workspace.");
    } finally {
      if (typeof window !== "undefined") {
        localStorage.setItem("krealink-profile-" + creatorProfile.username, JSON.stringify(creatorProfile));
      }
      setTimeout(() => setSaveMessage(""), 3500);
    }
  }

  // Handle Auto-Enrich Profile AI Stack
  async function handleAutoExtractProfileStack() {
    setIsInferringProfileStack(true);
    try {
      const res = await fetch("/api/ai/portfolio-analyzer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: creatorProfile.specialization,
          description: `${creatorProfile.bio} ${creatorProfile.workflow}`,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.analysis) {
        const a = data.analysis;
        setCreatorProfile((prev) => {
          const mergedTools = Array.from(new Set([...prev.aiTools, ...(a.tools || [])]));
          const mergedModels = Array.from(new Set([...prev.aiModels, ...(a.models || [])]));
          const mergedSkills = Array.from(new Set([...prev.skills, ...(a.skills || [])]));
          return {
            ...prev,
            aiTools: mergedTools,
            aiModels: mergedModels,
            skills: mergedSkills,
          };
        });
        setSaveMessage(`✨ AI enriched your stack: ${a.tools?.length || 0} tools, ${a.skills?.length || 0} skills detected.`);
        setTimeout(() => setSaveMessage(""), 4000);
      }
    } catch {
      // ignore
    } finally {
      setIsInferringProfileStack(false);
    }
  }

  // Handle Open Create Portfolio Modal
  function handleOpenCreatePortfolio() {
    setEditingPortfolioId(null);
    setAiAssistBanner(null);
    setAiSuggestions(null);
    setPortfolioForm({
      title: "",
      description: "",
      mediaUrl: `/creators/${creatorProfile.username}/reels/reel-1.mp4`,
      contentType: "Short-form Video (Reels/TikTok)",
      toolsString: creatorProfile.aiTools.join(", ") || "Runway, Midjourney",
      modelsString: creatorProfile.aiModels.join(", ") || "Runway Gen-3, Midjourney v6.1",
      skillsString: creatorProfile.skills.slice(0, 3).join(", ") || "Prompt Engineering",
      workflow: "Midjourney concept → Runway Gen-3 motion → Topaz 4K",
      formatsString: "9:16 Vertical, 4K UHD",
      commercialUse: true,
    });
    setIsPortfolioModalOpen(true);
  }

  // Handle Open Edit Portfolio Modal
  function handleOpenEditPortfolio(item: PortfolioItem) {
    setEditingPortfolioId(item.id);
    setAiAssistBanner(null);
    setAiSuggestions(null);
    setPortfolioForm({
      title: item.title,
      description: item.description || "",
      mediaUrl: item.mediaUrl || `/creators/${creatorProfile.username}/reels/reel-1.mp4`,
      contentType: item.contentType || "Short-form Video (Reels/TikTok)",
      toolsString: (item.tools || []).join(", "),
      modelsString: (item.models || []).join(", "),
      skillsString: (item.skills || []).join(", "),
      workflow: item.workflow || "",
      formatsString: (item.formats || []).join(", "),
      commercialUse: item.commercialUse ?? true,
    });
    setIsPortfolioModalOpen(true);
  }

  // Handle AI Project Assist (Analyzes Concept & Generates Review Card)
  async function handleAiPortfolioAssist() {
    const textContext = `${portfolioForm.title} ${portfolioForm.description} ${portfolioForm.workflow}`.trim();
    if (!textContext) {
      setAiAssistBanner({
        type: "error",
        message: "Please enter a project title, narrative, or workflow description first so the AI can extract tools and techniques.",
      });
      return;
    }

    setIsAnalyzingAi(true);
    setAiAssistBanner(null);

    try {
      const res = await fetch("/api/ai/portfolio-analyzer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: portfolioForm.title,
          description: portfolioForm.description,
          workflow: portfolioForm.workflow,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to analyze portfolio item.");
      }

      const a = data.analysis;
      setAiSuggestions({
        tools: Array.isArray(a.tools) ? a.tools : [],
        models: Array.isArray(a.models) ? a.models : [],
        skills: Array.isArray(a.skills) ? a.skills : [],
        workflow: a.workflow || "",
        contentType: a.contentType || portfolioForm.contentType,
        formats: Array.isArray(a.formats) ? a.formats : [],
        commercialUse: typeof a.commercialUse === "boolean" ? a.commercialUse : portfolioForm.commercialUse,
        confidence: a.confidence || "High",
        reasoning: a.reasoning || "Derived from your creative narrative. Review and accept suggestions below.",
      });

      setAiAssistBanner({
        type: "success",
        message: `Extracted ${a.tools?.length || 0} tools & ${a.skills?.length || 0} skills with ${a.confidence || "High"} confidence.`,
        reasoning: "Review the suggestions below. Click 'Accept Suggestions' to populate them into your project.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "AI analysis request failed";
      setAiAssistBanner({
        type: "error",
        message: msg,
      });
    } finally {
      setIsAnalyzingAi(false);
    }
  }

  function handleAcceptAllSuggestions() {
    if (!aiSuggestions) return;
    setPortfolioForm((prev) => ({
      ...prev,
      toolsString: aiSuggestions.tools.length ? aiSuggestions.tools.join(", ") : prev.toolsString,
      modelsString: aiSuggestions.models.length ? aiSuggestions.models.join(", ") : prev.modelsString,
      skillsString: aiSuggestions.skills.length ? aiSuggestions.skills.join(", ") : prev.skillsString,
      workflow: aiSuggestions.workflow || prev.workflow,
      contentType: aiSuggestions.contentType || prev.contentType,
      formatsString: aiSuggestions.formats.length ? aiSuggestions.formats.join(", ") : prev.formatsString,
      commercialUse: typeof aiSuggestions.commercialUse === "boolean" ? aiSuggestions.commercialUse : prev.commercialUse,
    }));
    setAiSuggestions(null);
    setAiAssistBanner({
      type: "success",
      message: "✓ AI suggestions accepted and populated into project fields.",
    });
  }

  function handleDismissSuggestions() {
    setAiSuggestions(null);
  }

  // Handle Portfolio Save
  async function handleSavePortfolioItem(e: React.FormEvent) {
    e.preventDefault();
    const itemId =
      editingPortfolioId ||
      doc(collection(db, "creators", creatorProfile.username, "portfolio")).id;

    const newItem: PortfolioItem = {
      id: itemId,
      title: portfolioForm.title.trim() || "Untitled Project",
      description: portfolioForm.description.trim(),
      mediaUrl: portfolioForm.mediaUrl.trim() || `/creators/${creatorProfile.username}/reels/reel-1.mp4`,
      thumbnailUrl: portfolioForm.mediaUrl.trim().replace(".mp4", ".jpg"),
      contentType: portfolioForm.contentType,
      tools: portfolioForm.toolsString.split(",").map((s) => s.trim()).filter(Boolean),
      models: portfolioForm.modelsString.split(",").map((s) => s.trim()).filter(Boolean),
      skills: portfolioForm.skillsString.split(",").map((s) => s.trim()).filter(Boolean),
      workflow: portfolioForm.workflow.trim(),
      formats: portfolioForm.formatsString.split(",").map((s) => s.trim()).filter(Boolean),
      commercialUse: portfolioForm.commercialUse,
      updatedAt: serverTimestamp(),
    };

    try {
      const portDocRef = doc(db, "creators", creatorProfile.username, "portfolio", itemId);
      await setDoc(portDocRef, newItem, { merge: true });
    } catch {
      // Continue locally
    }

    setPortfolioItems((prev) => {
      const filtered = prev.filter((p) => p.id !== itemId);
      return [newItem, ...filtered];
    });

    setIsPortfolioModalOpen(false);
  }

  // Handle Portfolio Delete
  async function handleDeletePortfolioItem(id: string) {
    if (!confirm("Are you sure you want to delete this portfolio project?")) return;

    try {
      const portDocRef = doc(db, "creators", creatorProfile.username, "portfolio", id);
      await deleteDoc(portDocRef);
    } catch {
      // ignore
    }

    setPortfolioItems((prev) => prev.filter((p) => p.id !== id));
  }

  // Handle Accept Invitation -> Create Engagement
  async function handleAcceptInvitation(inv: Invitation) {
    const updatedInvs = invitations.map((i) =>
      i.id === inv.id ? { ...i, status: INVITATION_STATUS.ACCEPTED } : i
    );
    setInvitations(updatedInvs);

    const engId = doc(collection(db, "engagements")).id;
    const newEng: Engagement = {
      id: engId,
      invitationId: inv.id,
      briefId: inv.briefId,
      brandId: inv.brandId,
      brandName: inv.brandName,
      brandOwnerUid: inv.brandOwnerUid || inv.ownerUid || "demo-brand-owner",
      creatorUsername: creatorProfile.username,
      creatorOwnerUid: user?.uid || creatorProfile.ownerUid || "demo-creator-owner",
      campaignTitle: inv.campaignTitle || "Campaign Collaboration",
      deliverables: ["Primary Campaign Asset (9:16)", "High-Res Keyframe Archive"],
      status: ENGAGEMENT_STATUS.ACCEPTED,
      createdAt: serverTimestamp(),
    };

    const updatedEngs = [newEng, ...engagements.filter((e) => e.id !== engId)];
    setEngagements(updatedEngs);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("krealink-invitations", JSON.stringify(updatedInvs));
        localStorage.setItem("krealink-engagements", JSON.stringify(updatedEngs));
      } catch {
        // ignore
      }
    }

    try {
      if (inv.id) {
        await setDoc(doc(db, "invitations", inv.id), {
          status: INVITATION_STATUS.ACCEPTED,
          creatorOwnerUid: user?.uid || creatorProfile.ownerUid || "demo-creator-owner",
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
      await setDoc(doc(db, "engagements", engId), newEng, { merge: true });
    } catch {
      // Retain optimistic state
    }
  }

  // Handle Decline Invitation
  async function handleDeclineInvitation(inv: Invitation) {
    const updatedInvs = invitations.map((i) =>
      i.id === inv.id ? { ...i, status: INVITATION_STATUS.DECLINED } : i
    );
    setInvitations(updatedInvs);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("krealink-invitations", JSON.stringify(updatedInvs));
      } catch {
        // ignore
      }
    }

    try {
      if (inv.id) {
        await setDoc(doc(db, "invitations", inv.id), {
          status: INVITATION_STATUS.DECLINED,
          creatorOwnerUid: user?.uid || creatorProfile.ownerUid || "demo-creator-owner",
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
    } catch {
      // ignore
    }
  }

  // Handle Update Engagement Status (Accepted -> In Progress -> Delivered)
  async function handleUpdateEngagementStatus(
    engId: string,
    nextStatus: typeof ENGAGEMENT_STATUS[keyof typeof ENGAGEMENT_STATUS]
  ) {
    const updatedEngs = engagements.map((e) =>
      e.id === engId ? { ...e, status: nextStatus } : e
    );
    setEngagements(updatedEngs);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("krealink-engagements", JSON.stringify(updatedEngs));
      } catch {
        // ignore
      }
    }

    try {
      await setDoc(
        doc(db, "engagements", engId),
        {
          status: nextStatus,
          creatorOwnerUid: user?.uid || creatorProfile.ownerUid || "demo-creator-owner",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch {
      // Retain optimistic state
    }
  }

  return (
    <main className="min-h-screen bg-[#07080c] text-white">
      <Navbar />

      {/* ======================================================== */}
      {/* 1. CREATOR STUDIO TOP HEADER */}
      {/* ======================================================== */}
      <section className="relative border-b border-white/[0.06] bg-[#090b10] px-5 py-8 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1 text-[11px] font-mono tracking-wider uppercase text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Creator Studio Command Center</span>
              </div>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
                {creatorProfile.name}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-400">
                @{creatorProfile.username} · {creatorProfile.specialization} · {creatorProfile.availability}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/${creatorProfile.username}`}
                target="_blank"
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white hover:bg-white/[0.08]"
              >
                View Public Profile ↗
              </Link>
              <Link
                href="/discover"
                className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 flex items-center gap-1.5"
              >
                <span>🌐</span>
                <span>Discover Talent Roster →</span>
              </Link>
            </div>
          </div>

          {/* Profile Strength Meter (Section 19) */}
          <div className="mt-6 rounded-2xl border border-white/[0.08] bg-[#0c0e15] p-4.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">Studio Profile Strength:</span>
                <span className="font-mono text-emerald-400 font-bold">92% Complete</span>
              </div>
              <span className="text-slate-400 text-[11px]">
                Tip: Add a custom character LoRA workflow note to unlock 100% Verified status.
              </span>
            </div>
            <div className="mt-2.5 h-1.5 w-full rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full bg-emerald-400" style={{ width: "92%" }} />
            </div>
          </div>

          {saveMessage && (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs font-semibold text-emerald-300">
              {saveMessage}
            </div>
          )}

          {/* Tab Navigation */}
          <div className="mt-8 flex flex-wrap gap-2 border-t border-white/[0.06] pt-4 text-xs font-semibold">
            <button
              onClick={() => setActiveTab("overview")}
              className={`rounded-full px-4 py-2 transition ${
                activeTab === "overview"
                  ? "bg-white text-black font-bold"
                  : "bg-white/[0.03] text-slate-400 hover:text-white"
              }`}
            >
              Profile &amp; Generative Workflow
            </button>

            <button
              onClick={() => setActiveTab("capabilities")}
              className={`rounded-full px-4 py-2 transition ${
                activeTab === "capabilities"
                  ? "bg-white text-black font-bold"
                  : "bg-white/[0.03] text-slate-400 hover:text-white"
              }`}
            >
              AI Capabilities &amp; Stack
            </button>

            <button
              onClick={() => setActiveTab("portfolio")}
              className={`rounded-full px-4 py-2 transition ${
                activeTab === "portfolio"
                  ? "bg-white text-black font-bold"
                  : "bg-white/[0.03] text-slate-400 hover:text-white"
              }`}
            >
              Portfolio Projects ({portfolioItems.length})
            </button>

            <button
              onClick={() => setActiveTab("invitations")}
              className={`rounded-full px-4 py-2 transition ${
                activeTab === "invitations"
                  ? "bg-white text-black font-bold"
                  : "bg-white/[0.03] text-slate-400 hover:text-white"
              }`}
            >
              Brand Proposals &amp; Engagements ({invitations.length})
            </button>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. STUDIO CONTENT PANELS */}
      {/* ======================================================== */}
      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        {/* ======================================================== */}
        {/* TAB 1: PROFILE & WORKFLOW */}
        {/* ======================================================== */}
        {activeTab === "overview" && (
          <div className="grid gap-8 lg:grid-cols-12 items-start">
            {/* Sidebar Summary Card (4 cols) */}
            <div className="lg:col-span-4 rounded-2xl border border-white/[0.08] bg-[#0c0e15] p-5 shadow-xl space-y-4">
              <div className="flex items-center gap-3.5">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 p-0.5 shadow-lg">
                  <div className="h-full w-full rounded-[14px] bg-[#090b11] flex items-center justify-center font-heading font-bold text-lg text-white">
                    {creatorProfile.profilePhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={creatorProfile.profilePhoto} alt="Avatar" className="h-full w-full object-cover rounded-[14px]" />
                    ) : (
                      creatorProfile.name.charAt(0).toUpperCase()
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-white">{creatorProfile.name}</h3>
                  <p className="text-xs text-indigo-400 font-mono">@{creatorProfile.username}</p>
                </div>
              </div>

              <div className="border-t border-white/[0.06] pt-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Specialization:</span>
                  <span className="font-medium text-white">{creatorProfile.specialization}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Availability:</span>
                  <span className="font-medium text-emerald-400">{creatorProfile.availability}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Commercial License:</span>
                  <span className="font-medium text-emerald-400">
                    {creatorProfile.commercialUse ? "Granted" : "Non-commercial"}
                  </span>
                </div>
              </div>

              {/* Verification Checklist */}
              <div className="border-t border-white/[0.06] pt-3.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-2">
                  Platform Verification Telemetry
                </span>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-emerald-400 font-medium">
                    <span>✓</span>
                    <span className="text-slate-200">AI Toolchains Verified</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400 font-medium">
                    <span>✓</span>
                    <span className="text-slate-200">Pipeline Recipe Logged</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400 font-medium">
                    <span>✓</span>
                    <span className="text-slate-200">Portfolio Assets Audited</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400 font-medium">
                    <span>✓</span>
                    <span className="text-slate-200">Commercial Clearance Ready</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/[0.06] pt-3.5">
                <Link
                  href={`/${creatorProfile.username}`}
                  target="_blank"
                  className="block w-full text-center rounded-xl border border-white/10 bg-white/[0.04] py-2 text-xs font-semibold text-white hover:bg-white/[0.08] transition"
                >
                  View Public Profile ↗
                </Link>
              </div>
            </div>

            {/* Main Form (8 cols) */}
            <form onSubmit={handleSaveProfile} className="lg:col-span-8 rounded-2xl border border-white/[0.08] bg-[#0c0e15] p-6 md:p-8 space-y-4 shadow-xl">
              <div className="border-b border-white/[0.06] pb-3">
                <h2 className="text-lg font-heading font-bold text-white">Creator Identity &amp; Profile Details</h2>
                <p className="text-xs text-slate-400">Update how brands discover your capabilities in matching searches.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Display Name</label>
                  <input
                    value={creatorProfile.name}
                    onChange={(e) => setCreatorProfile({ ...creatorProfile, name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-indigo-500/60"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Username (@handle)</label>
                  <input
                    value={creatorProfile.username}
                    disabled
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-medium text-white/50 outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Primary Specialization</label>
                  <input
                    value={creatorProfile.specialization}
                    onChange={(e) => setCreatorProfile({ ...creatorProfile, specialization: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-indigo-500/60"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Availability Status</label>
                  <input
                    value={creatorProfile.availability}
                    onChange={(e) => setCreatorProfile({ ...creatorProfile, availability: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-indigo-500/60"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Creator Bio</label>
                <textarea
                  value={creatorProfile.bio}
                  onChange={(e) => setCreatorProfile({ ...creatorProfile, bio: e.target.value })}
                  rows={3}
                  className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-indigo-500/60"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Multi-Model Generative Workflow</label>
                <textarea
                  value={creatorProfile.workflow}
                  onChange={(e) => setCreatorProfile({ ...creatorProfile, workflow: e.target.value })}
                  rows={3}
                  placeholder="Describe your generative pipeline: e.g. Midjourney keyframes → Runway Gen-3 motion synthesis → Topaz 4K..."
                  className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-indigo-500/60"
                />
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-black/30 p-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-white">Commercial Use Licensing Available</p>
                    <p className="text-[11px] text-slate-400">Signal that you grant full commercial advertising clearance on your final deliverables.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={creatorProfile.commercialUse}
                    onChange={(e) => setCreatorProfile({ ...creatorProfile, commercialUse: e.target.checked })}
                    className="h-4 w-4 accent-indigo-500 rounded"
                  />
                </label>
              </div>

              <button
                type="submit"
                className="rounded-xl bg-white px-6 py-2.5 text-xs font-heading font-bold text-black hover:bg-slate-200 transition shadow-md"
              >
                Save Profile Changes
              </button>
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: AI CAPABILITIES & STACK */}
        {/* ======================================================== */}
        {activeTab === "capabilities" && (
          <div className="grid gap-8 lg:grid-cols-12 items-start">
            {/* Sidebar Telemetry (4 cols) */}
            <div className="lg:col-span-4 rounded-2xl border border-white/[0.08] bg-[#0c0e15] p-5 shadow-xl space-y-4">
              <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-400 block">
                7-Factor Match Diagnostic
              </span>
              <h3 className="font-heading font-bold text-base text-white">
                Stack Indexing
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                KreaLink matches brand campaign briefs to your profile using these exact tools, models, and skill tags.
              </p>

              <div className="border-t border-white/[0.06] pt-3.5 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Indexed Tools:</span>
                  <span className="font-mono text-white font-bold">{creatorProfile.aiTools.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Indexed Models:</span>
                  <span className="font-mono text-white font-bold">{creatorProfile.aiModels.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Specialized Skills:</span>
                  <span className="font-mono text-white font-bold">{creatorProfile.skills.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Deliverable Formats:</span>
                  <span className="font-mono text-white font-bold">{creatorProfile.formats.length}</span>
                </div>
              </div>
            </div>

            {/* Form (8 cols) */}
            <form onSubmit={handleSaveProfile} className="lg:col-span-8 rounded-2xl border border-white/[0.08] bg-[#0c0e15] p-6 md:p-8 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/[0.06] pb-3 gap-3">
                <div>
                  <h2 className="text-lg font-heading font-bold text-white">Verified AI Stack &amp; Skills</h2>
                  <p className="text-xs text-slate-400">Specify your AI platforms and models for multi-signal algorithmic match scoring.</p>
                </div>
                <button
                  type="button"
                  onClick={handleAutoExtractProfileStack}
                  disabled={isInferringProfileStack}
                  className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-full border border-indigo-500/40 bg-indigo-500/15 px-3 py-1.5 text-xs font-mono font-medium text-indigo-300 hover:bg-indigo-500/25 transition disabled:opacity-50"
                >
                  {isInferringProfileStack ? (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping" />
                      <span>Extracting Stack...</span>
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      <span>Auto-Enrich Stack from Bio</span>
                    </>
                  )}
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">AI Platforms &amp; Tools (comma-separated)</label>
                <input
                  value={creatorProfile.aiTools.join(", ")}
                  onChange={(e) =>
                    setCreatorProfile({
                      ...creatorProfile,
                      aiTools: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-indigo-500/60"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Foundation Models (comma-separated)</label>
                <input
                  value={creatorProfile.aiModels.join(", ")}
                  onChange={(e) =>
                    setCreatorProfile({
                      ...creatorProfile,
                      aiModels: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-indigo-500/60"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Specialized Skills (comma-separated)</label>
                <input
                  value={creatorProfile.skills.join(", ")}
                  onChange={(e) =>
                    setCreatorProfile({
                      ...creatorProfile,
                      skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-indigo-500/60"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Deliverable Formats &amp; Ratios (comma-separated)</label>
                <input
                  value={creatorProfile.formats.join(", ")}
                  onChange={(e) =>
                    setCreatorProfile({
                      ...creatorProfile,
                      formats: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-indigo-500/60"
                />
              </div>

              <button
                type="submit"
                className="rounded-xl bg-white px-6 py-2.5 text-xs font-heading font-bold text-black hover:bg-slate-200 transition shadow-md"
              >
                Save Toolchains &amp; Stack
              </button>
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: PORTFOLIO PROJECTS (CRUD) */}
        {/* ======================================================== */}
        {activeTab === "portfolio" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Portfolio Projects ({portfolioItems.length})</h2>
                <p className="text-xs text-slate-400">Projects appear in your public showcase and factor into match scores.</p>
              </div>

              <button
                onClick={handleOpenCreatePortfolio}
                className="rounded-full bg-white px-5 py-2 text-xs font-bold text-black hover:bg-slate-200 shadow-md"
              >
                + Add Project
              </button>
            </div>

            {portfolioItems.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e15] p-12 text-center text-slate-400">
                <p className="text-2xl">🎬</p>
                <h3 className="mt-3 text-lg font-bold text-white">No portfolio projects uploaded</h3>
                <p className="mt-1 text-xs">Publish your first AI project to show brands your visual fidelity.</p>
                <button
                  onClick={handleOpenCreatePortfolio}
                  className="mt-5 rounded-full bg-white px-6 py-2.5 text-xs font-bold text-black hover:bg-slate-200"
                >
                  Add Project Now →
                </button>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {portfolioItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0e15] p-5"
                  >
                    <div>
                      {/* Media preview */}
                      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-black">
                        {item.mediaUrl?.endsWith(".mp4") ? (
                          <video
                            src={item.mediaUrl}
                            autoPlay
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
                        <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-mono text-white/80 backdrop-blur-md">
                          {item.contentType}
                        </span>
                      </div>

                      <h3 className="mt-4 text-base font-bold text-white">{item.title}</h3>
                      <p className="mt-1 text-xs text-slate-300 line-clamp-2">{item.description}</p>

                      {item.workflow && (
                        <p className="mt-2 text-[11px] text-amber-300 font-mono line-clamp-1">
                          Pipeline: {item.workflow}
                        </p>
                      )}
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-3 text-xs">
                      <button
                        onClick={() => handleOpenEditPortfolio(item)}
                        className="font-semibold text-white/70 hover:text-white"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePortfolioItem(item.id)}
                        className="font-semibold text-rose-400 hover:text-rose-300"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: BRAND INVITATIONS & ENGAGEMENTS */}
        {/* ======================================================== */}
        {activeTab === "invitations" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Incoming Proposals &amp; Engagements</h2>
              <p className="text-xs text-slate-400">Review briefs received from brands and manage active collaborations.</p>
            </div>

            {invitations.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e15] p-12 text-center text-slate-400">
                <p className="text-2xl">📬</p>
                <h3 className="mt-3 text-lg font-bold text-white">No incoming proposals yet</h3>
                <p className="mt-1 text-xs">Brand invitations will appear here when an agency invites you to a brief.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0c0e15] p-6 sm:flex-row sm:items-center gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs uppercase tracking-wider text-slate-400">From {inv.brandName}</span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            inv.status === "Accepted"
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                              : inv.status === "Declined"
                              ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                              : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </div>

                      <h3 className="mt-1.5 text-base font-bold text-white">{inv.campaignTitle || "Campaign Collaboration"}</h3>
                      <p className="mt-1 text-xs text-slate-300 italic">&quot;{inv.message}&quot;</p>
                      <p className="mt-1 text-[11px] font-mono text-slate-400">Contact: {inv.contactEmail}</p>
                    </div>

                    {inv.status === "Invited" && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleAcceptInvitation(inv)}
                          className="rounded-full bg-emerald-400 px-5 py-2 text-xs font-bold text-black hover:bg-emerald-300 transition"
                        >
                          Accept Collaboration
                        </button>
                        <button
                          onClick={() => handleDeclineInvitation(inv)}
                          className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Active Signed Engagements */}
            {engagements.length > 0 && (
              <div className="mt-8 space-y-4 pt-6 border-t border-white/[0.08]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">Active Signed Contracts</h3>
                    <p className="text-xs text-slate-400">Accepted campaign engagements currently in progress.</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-mono font-bold text-emerald-300">
                    {engagements.length} In Progress
                  </span>
                </div>

                <div className="space-y-3">
                  {engagements.map((eng) => (
                    <div
                      key={eng.id}
                      className="flex flex-col justify-between rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-5 sm:flex-row sm:items-center gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider border ${
                            eng.status === ENGAGEMENT_STATUS.DELIVERED
                              ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
                              : eng.status === ENGAGEMENT_STATUS.IN_PROGRESS
                              ? "border-indigo-500/40 bg-indigo-500/20 text-indigo-300"
                              : "border-sky-500/40 bg-sky-500/20 text-sky-300"
                          }`}>
                            {eng.status}
                          </span>
                          <span className="text-xs font-medium text-white/50">Partner: {eng.brandName}</span>
                        </div>
                        <h4 className="mt-1 text-sm font-bold text-white">{eng.campaignTitle}</h4>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {eng.deliverables?.map((d, i) => (
                            <span key={i} className="rounded bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 text-[10px] text-slate-300 font-mono">
                              📦 {d}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {eng.status === ENGAGEMENT_STATUS.ACCEPTED && (
                          <button
                            type="button"
                            onClick={() => handleUpdateEngagementStatus(eng.id!, ENGAGEMENT_STATUS.IN_PROGRESS)}
                            className="rounded-full bg-indigo-500 hover:bg-indigo-400 px-4 py-2 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-lg shadow-indigo-500/20"
                          >
                            <span>Start Production</span>
                            <span>→</span>
                          </button>
                        )}
                        {eng.status === ENGAGEMENT_STATUS.IN_PROGRESS && (
                          <button
                            type="button"
                            onClick={() => handleUpdateEngagementStatus(eng.id!, ENGAGEMENT_STATUS.DELIVERED)}
                            className="rounded-full bg-emerald-400 hover:bg-emerald-300 px-4 py-2 text-xs font-bold text-black transition flex items-center gap-1.5 shadow-lg shadow-emerald-400/20"
                          >
                            <span>Mark Delivered</span>
                            <span>✓</span>
                          </button>
                        )}
                        {eng.status === ENGAGEMENT_STATUS.DELIVERED && (
                          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-bold text-emerald-300 flex items-center gap-1">
                            <span>✓</span>
                            <span>Delivered &amp; Complete</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* PORTFOLIO MODAL (CREATE / EDIT) */}
      {/* ======================================================== */}
      {isPortfolioModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-5 backdrop-blur-xl">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0c0e15] p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-wider text-amber-400">
                  {editingPortfolioId ? "Edit Project" : "Publish Project"}
                </p>
                <h3 className="mt-1 text-xl font-bold text-white">Portfolio Asset Details</h3>
              </div>
              <button
                onClick={() => setIsPortfolioModalOpen(false)}
                className="text-lg font-bold text-white/40 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePortfolioItem} className="space-y-3.5 max-h-[80vh] overflow-y-auto pr-1">
              <div>
                <label className="text-xs font-semibold text-slate-300">Project Title *</label>
                <input
                  value={portfolioForm.title}
                  onChange={(e) => setPortfolioForm({ ...portfolioForm, title: e.target.value })}
                  required
                  placeholder="e.g. QuantumStrider Kinetic Commercial"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-amber-400/50"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">Project Narrative / Visual Concept</label>
                  <button
                    type="button"
                    onClick={handleAiPortfolioAssist}
                    disabled={isAnalyzingAi}
                    className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/40 bg-indigo-500/15 px-2.5 py-1 text-[11px] font-mono font-medium text-indigo-300 hover:bg-indigo-500/25 transition disabled:opacity-50"
                  >
                    {isAnalyzingAi ? (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping" />
                        <span>Extracting Pipeline...</span>
                      </>
                    ) : (
                      <>
                        <span>✨</span>
                        <span>AI Project Assist</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  value={portfolioForm.description}
                  onChange={(e) => setPortfolioForm({ ...portfolioForm, description: e.target.value })}
                  rows={2}
                  placeholder="Describe the aesthetic, camera moves, and workflow (e.g. 15s commercial shot on virtual 35mm with kinetic camera sweeps & fluid splash dynamics)..."
                  className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-black/50 px-3.5 py-2 text-xs font-medium text-white outline-none focus:border-amber-400/50"
                />
              </div>

              {aiAssistBanner && !aiSuggestions && (
                <div
                  className={`rounded-xl border p-3 text-xs ${
                    aiAssistBanner.type === "success"
                      ? "border-indigo-500/30 bg-indigo-950/40 text-indigo-200"
                      : "border-rose-500/30 bg-rose-950/40 text-rose-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold">
                      {aiAssistBanner.type === "success" ? "✨ AI Analysis:" : "⚠️ Notice:"}
                    </span>
                    <span>{aiAssistBanner.message}</span>
                  </div>
                  {aiAssistBanner.reasoning && (
                    <p className="mt-1 text-[11px] text-indigo-300/80 leading-relaxed font-mono">
                      ℹ️ {aiAssistBanner.reasoning}
                    </p>
                  )}
                </div>
              )}

              {aiSuggestions && (
                <div className="rounded-xl border border-indigo-500/30 bg-gradient-to-b from-indigo-950/40 to-[#0a0d18] p-4 text-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-xs">✨</span>
                      <span className="font-bold text-white uppercase tracking-wider font-mono text-[11px]">
                        AI Suggestions Review Card
                      </span>
                    </div>
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-300">
                      {aiSuggestions.confidence || "High"} Confidence
                    </span>
                  </div>

                  {aiSuggestions.reasoning && (
                    <p className="text-[11px] text-slate-300 italic">
                      &quot;{aiSuggestions.reasoning}&quot;
                    </p>
                  )}

                  <div className="grid gap-2 sm:grid-cols-2 text-[11px]">
                    <div className="rounded-lg border border-white/5 bg-black/40 p-2.5">
                      <span className="font-mono text-[10px] uppercase text-indigo-300 block mb-1">Detected Tools</span>
                      <div className="flex flex-wrap gap-1">
                        {aiSuggestions.tools.length > 0 ? (
                          aiSuggestions.tools.map((t) => (
                            <span key={t} className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-indigo-200">
                              {t}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 italic">None detected</span>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border border-white/5 bg-black/40 p-2.5">
                      <span className="font-mono text-[10px] uppercase text-sky-300 block mb-1">Detected Skills</span>
                      <div className="flex flex-wrap gap-1">
                        {aiSuggestions.skills.length > 0 ? (
                          aiSuggestions.skills.map((s) => (
                            <span key={s} className="rounded bg-sky-500/20 px-1.5 py-0.5 text-sky-200">
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 italic">None detected</span>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border border-white/5 bg-black/40 p-2.5">
                      <span className="font-mono text-[10px] uppercase text-purple-300 block mb-1">Content Type</span>
                      <span className="text-white font-medium">{aiSuggestions.contentType}</span>
                    </div>

                    <div className="rounded-lg border border-white/5 bg-black/40 p-2.5">
                      <span className="font-mono text-[10px] uppercase text-emerald-300 block mb-1">Formats & Rights</span>
                      <span className="text-white font-medium">
                        {aiSuggestions.formats.join(", ") || "Standard"} {aiSuggestions.commercialUse ? "(Commercial)" : ""}
                      </span>
                    </div>
                  </div>

                  {aiSuggestions.workflow && (
                    <div className="rounded-lg border border-white/5 bg-black/40 p-2.5 text-[11px]">
                      <span className="font-mono text-[10px] uppercase text-amber-300 block mb-0.5">Inferred Pipeline Workflow</span>
                      <p className="text-slate-300 font-mono text-[10px]">{aiSuggestions.workflow}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                    <button
                      type="button"
                      onClick={handleDismissSuggestions}
                      className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition"
                    >
                      Reject / Dismiss
                    </button>
                    <button
                      type="button"
                      onClick={handleAcceptAllSuggestions}
                      className="rounded-lg bg-indigo-500 hover:bg-indigo-400 px-3.5 py-1.5 text-[11px] font-bold text-white transition flex items-center gap-1 shadow-lg shadow-indigo-500/20"
                    >
                      <span>✓ Accept All Suggestions</span>
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-300">Media URL (.mp4 or image) *</label>
                <input
                  value={portfolioForm.mediaUrl}
                  onChange={(e) => setPortfolioForm({ ...portfolioForm, mediaUrl: e.target.value })}
                  required
                  placeholder="/creators/mayaverma/reels/reel-1.mp4"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-amber-400/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Generative Workflow &amp; Pipeline</label>
                <textarea
                  value={portfolioForm.workflow}
                  onChange={(e) => setPortfolioForm({ ...portfolioForm, workflow: e.target.value })}
                  rows={2}
                  placeholder="Midjourney v6.1 seed → Runway Gen-3 camera move → Topaz 4K"
                  className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-black/50 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-amber-400/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Tools Used</label>
                  <input
                    value={portfolioForm.toolsString}
                    onChange={(e) => setPortfolioForm({ ...portfolioForm, toolsString: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs font-medium text-white outline-none focus:border-amber-400/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300">Models Used</label>
                  <input
                    value={portfolioForm.modelsString}
                    onChange={(e) => setPortfolioForm({ ...portfolioForm, modelsString: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs font-medium text-white outline-none focus:border-amber-400/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Skills Demonstrated</label>
                  <input
                    value={portfolioForm.skillsString}
                    onChange={(e) => setPortfolioForm({ ...portfolioForm, skillsString: e.target.value })}
                    placeholder="e.g. Prompt Engineering, Camera Trajectory"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs font-medium text-white outline-none focus:border-amber-400/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300">Deliverable Formats</label>
                  <input
                    value={portfolioForm.formatsString}
                    onChange={(e) => setPortfolioForm({ ...portfolioForm, formatsString: e.target.value })}
                    placeholder="e.g. 9:16 Vertical, 4K UHD"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs font-medium text-white outline-none focus:border-amber-400/50"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-black/30 p-3.5">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs font-bold text-white">Commercial Rights Available</span>
                  <input
                    type="checkbox"
                    checked={portfolioForm.commercialUse}
                    onChange={(e) => setPortfolioForm({ ...portfolioForm, commercialUse: e.target.checked })}
                    className="h-4 w-4 accent-amber-400 rounded"
                  />
                </label>
              </div>

              <button
                type="submit"
                className="mt-2 w-full rounded-full bg-white py-3 text-xs font-bold text-black hover:bg-slate-200"
              >
                {editingPortfolioId ? "Save Project Updates" : "Publish to Portfolio"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
