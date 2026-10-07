"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Navbar } from "@/components/Navbar";
import {
  BrandProfile,
  CreativeBrief,
  CreatorProfile,
  Invitation,
  Engagement,
  BRIEF_STATUS,
  INVITATION_STATUS,
  ENGAGEMENT_STATUS,
} from "@/lib/types";
import { rankCreatorsForBrief2, MatchResult2 } from "@/lib/ai/matchingEngine2";
import { BriefReadiness, ClarificationQuestion, StructuredBrief2 } from "@/lib/ai/schemas";
import { DEMO_BRAND, DEMO_BRIEFS, DEMO_CREATORS } from "@/lib/demoData";

type BrandTab = "briefs" | "create-brief" | "matches" | "engagements" | "profile";

export default function BrandDashboardPage() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<BrandTab>(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get("tab") as BrandTab;
      if (tabParam && ["briefs", "create-brief", "matches", "engagements", "profile"].includes(tabParam)) {
        return tabParam;
      }
    }
    return "briefs";
  });

  // Brand Profile State
  const [brand, setBrand] = useState<BrandProfile>(DEMO_BRAND);

  // Briefs & Matching State
  const [briefs, setBriefs] = useState<CreativeBrief[]>([]);
  const [selectedBrief, setSelectedBrief] = useState<CreativeBrief | null>(null);
  const [creators, setCreators] = useState<CreatorProfile[]>([]);
  const matchedResults = useMemo<MatchResult2[]>(() => {
    if (selectedBrief && creators.length > 0) {
      return rankCreatorsForBrief2(selectedBrief, creators);
    }
    return [];
  }, [selectedBrief, creators]);

  // AI Brief Builder Prompt State
  const [aiPrompt, setAiPrompt] = useState(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const promptParam = urlParams.get("prompt");
      if (promptParam) return promptParam;
    }
    return "I need a futuristic 30-second Instagram reel for our new running shoe targeting Gen Z. It should feel energetic and cinematic and we need commercial rights.";
  });
  // AI Brief Builder Lifecycle State
  const [briefStage, setBriefStage] = useState<"input" | "processing" | "review" | "edit">("input");
  const [processingStep, setProcessingStep] = useState<number>(0);
  const [processingNotice, setProcessingNotice] = useState<string>("");
  const [briefError, setBriefError] = useState<string | null>(null);

  // Structured AI Result State
  const [, setStructuredBriefData] = useState<StructuredBrief2 | null>(null);
  const [briefReadiness, setBriefReadiness] = useState<BriefReadiness | null>(null);
  const [clarifications, setClarifications] = useState<ClarificationQuestion[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<string[]>([]);
  const [aiSource, setAiSource] = useState<string>("AI_LIVE");
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);

  // Matching Transition Animation State
  const [isMatchingTransition, setIsMatchingTransition] = useState(false);
  const [matchingTransitionStep, setMatchingTransitionStep] = useState(0);

  // Why This Creator Signature Modal State
  const [activeWhyCreator, setActiveWhyCreator] = useState<MatchResult2 | null>(null);

  // Editable Form for Creative Brief
  const [briefForm, setBriefForm] = useState({
    campaignName: "Futuristic Gen-Z Running Shoe Launch",
    requirements:
      "A high-energy, 30-second commercial reel introducing the QuantumStrider running shoe. Needs hyper-kinetic camera motion, neon-lit cyberpunk city track, and consistent hero character.",
    contentType: "Short-form Video (Reels/TikTok)",
    styleString: "Futuristic, Cinematic, High-Energy, Cyberpunk / Neon",
    platform: "Instagram Reels & TikTok",
    aspectRatio: "9:16 Vertical (Reels/Shorts)",
    targetAudience: "Gen Z Trendsetters & Digital Natives (16-24)",
    deliverablesString:
      "1x 30-Second Hero Video Deliverable (9:16), 3x High-Res Still Keyframes, 1x Clean Cut for Social Ads",
    commercialUse: true,
    notes: "Audio sound design must sync with kinetic shoe impacts.",
  });
  const [isSavingBrief, setIsSavingBrief] = useState(false);

  // Invitations & Engagements State
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [engagements, setEngagements] = useState<Engagement[]>([]);

  // Invite Creator Modal
  const [invitingCreator, setInvitingCreator] = useState<CreatorProfile | null>(null);
  const [inviteMessage, setInviteMessage] = useState("");
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState("");

  // Seed demo data helper state
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedStatus, setSeedStatus] = useState("");

  // 1. Initial Load of Brand, Briefs, Creators, Invitations
  useEffect(() => {
    async function loadBrandData() {
      try {
        const brandId = user?.uid ? `brand-${user.uid.slice(0, 8)}` : DEMO_BRAND.id;
        try {
          const myBrandSnap = await getDoc(doc(db, "brands", brandId));
          if (myBrandSnap.exists()) {
            const b = myBrandSnap.data() as unknown as BrandProfile;
            setBrand({ ...b, id: myBrandSnap.id });
          } else {
            setBrand({ ...DEMO_BRAND, id: brandId, ownerUid: user?.uid || DEMO_BRAND.ownerUid });
          }
        } catch {
          setBrand({ ...DEMO_BRAND, id: brandId, ownerUid: user?.uid || DEMO_BRAND.ownerUid });
        }

        // Load Creators from Demo Roster + Firestore + Local Cache
        const creatorMap = new Map<string, CreatorProfile>();
        DEMO_CREATORS.forEach((d) => {
          creatorMap.set(d.creator.username.toLowerCase(), d.creator);
        });

        try {
          const creatorSnap = await getDocs(collection(db, "creators"));
          if (!creatorSnap.empty) {
            creatorSnap.docs.forEach((docSnap) => {
              const d = docSnap.data();
              creatorMap.set(docSnap.id.toLowerCase(), {
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
              });
            });
          }
        } catch {
          // continue
        }

        if (typeof window !== "undefined") {
          try {
            const regRaw = localStorage.getItem("krealink-registered-creators");
            if (regRaw) {
              const regList = JSON.parse(regRaw);
              if (Array.isArray(regList)) {
                regList.forEach((c) => {
                  if (c && c.username) creatorMap.set(c.username.toLowerCase(), c);
                });
              }
            }
          } catch {
            // continue
          }
        }

        setCreators(Array.from(creatorMap.values()));

        // Load Briefs
        const briefsSnap = await getDocs(collection(db, "briefs"));
        let loadedBriefs: CreativeBrief[] = [];
        if (!briefsSnap.empty) {
          loadedBriefs = briefsSnap.docs.map((b) => ({
            id: b.id,
            ...(b.data() as unknown as CreativeBrief),
          }));
        }
        if (loadedBriefs.length === 0) {
          loadedBriefs = DEMO_BRIEFS;
        }
        setBriefs(loadedBriefs);
        if (loadedBriefs.length > 0) {
          setSelectedBrief(loadedBriefs[0]);
        }

        // Load Invitations
        try {
          const invSnap = await getDocs(collection(db, "invitations"));
          if (!invSnap.empty) {
            setInvitations(invSnap.docs.map((d) => ({ id: d.id, ...(d.data() as unknown as Invitation) })));
          } else if (typeof window !== "undefined") {
            const localInvs = localStorage.getItem("krealink-invitations");
            if (localInvs) setInvitations(JSON.parse(localInvs));
          }
        } catch {
          if (typeof window !== "undefined") {
            const localInvs = localStorage.getItem("krealink-invitations");
            if (localInvs) {
              try { setInvitations(JSON.parse(localInvs)); } catch { /* ignore */ }
            }
          }
        }

        // Load Engagements
        try {
          const engSnap = await getDocs(collection(db, "engagements"));
          if (!engSnap.empty) {
            setEngagements(engSnap.docs.map((d) => ({ id: d.id, ...(d.data() as unknown as Engagement) })));
          } else if (typeof window !== "undefined") {
            const localEngs = localStorage.getItem("krealink-engagements");
            if (localEngs) setEngagements(JSON.parse(localEngs));
          }
        } catch {
          if (typeof window !== "undefined") {
            const localEngs = localStorage.getItem("krealink-engagements");
            if (localEngs) {
              try { setEngagements(JSON.parse(localEngs)); } catch { /* ignore */ }
            }
          }
        }
      } catch (err) {
        console.warn("Brand load note:", err);
      }
    }

    loadBrandData();
  }, [user]);

  // Handle AI Brief Builder API Generation with 5-Step Intelligence Sequence
  async function handleGenerateBriefWithAI() {
    if (!aiPrompt.trim()) return;

    setIsGeneratingBrief(true);
    setBriefStage("processing");
    setBriefError(null);
    setProcessingStep(1);
    setProcessingNotice("Understanding your idea & creative vision...");

    const t1 = setTimeout(() => {
      setProcessingStep(2);
      setProcessingNotice("Identifying creative requirements, formats & style...");
    }, 280);

    const t2 = setTimeout(() => {
      setProcessingStep(3);
      setProcessingNotice("Structuring the brief & technical parameters...");
    }, 560);

    const t3 = setTimeout(() => {
      setProcessingStep(4);
      setProcessingNotice("Checking for missing information & calculating readiness...");
    }, 840);

    try {
      const res = await fetch("/api/ai/brief-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt.trim() }),
      });

      const data = await res.json();
      if (data?.success && data?.brief) {
        const b = data.brief;
        setStructuredBriefData(b);
        setBriefForm({
          campaignName: b.campaignName || "AI Campaign",
          requirements: b.requirements || b.creativeDirection || aiPrompt.trim(),
          contentType: b.contentType || "Short-form Video (Reels/TikTok)",
          styleString: (b.style || []).join(", "),
          platform: (b.platforms || ["Instagram Reels & TikTok"])[0] || b.platform || "Instagram Reels & TikTok",
          aspectRatio: b.aspectRatio || "9:16 Vertical (Reels/Shorts)",
          targetAudience: b.targetAudience || "Gen Z & Digital Natives",
          deliverablesString: (b.deliverables || []).join(", "),
          commercialUse: Boolean(b.commercialUse),
          notes: b.notes || b.additionalNotes || "",
        });

        setBriefReadiness(data.readiness || b.readiness || null);
        setClarifications(data.clarifications || b.clarifications || []);
        setAiRecommendations(data.recommendations || b.aiRecommendations || []);
        setAiSource(data.source || b.source || "AI_LIVE");

        setTimeout(() => {
          setProcessingStep(5);
          setProcessingNotice("Brief ready.");
          setTimeout(() => {
            setBriefStage("review");
          }, 320);
        }, 1120);
      } else {
        throw new Error(data?.error || "Brief generation returned unsuccessful");
      }
    } catch (err) {
      console.warn("AI brief generation fallback triggered:", err);
      setBriefError("Creative intelligence is temporarily unavailable. You can try again or edit the brief parameters directly.");
      setBriefStage("input");
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setIsGeneratingBrief(false);
    }
  }

  function handleSelectClarification(questionId: string, value: string) {
    if (questionId === "clarify_aspect_ratio") {
      setBriefForm((prev) => ({ ...prev, aspectRatio: value }));
    } else if (questionId === "clarify_content_type") {
      setBriefForm((prev) => ({ ...prev, contentType: value }));
    } else if (questionId === "clarify_commercial_rights") {
      setBriefForm((prev) => ({ ...prev, commercialUse: value === "true" }));
    } else if (questionId === "clarify_duration") {
      setBriefForm((prev) => ({
        ...prev,
        notes: prev.notes ? `${prev.notes} | Runtime: ${value}` : `Runtime: ${value}`,
      }));
    } else if (questionId === "clarify_style") {
      setBriefForm((prev) => ({
        ...prev,
        styleString: prev.styleString ? `${prev.styleString}, ${value}` : value,
      }));
    }
    setClarifications((prev) => prev.filter((q) => q.id !== questionId));
    setBriefReadiness((prev) => {
      if (!prev) return null;
      const newScore = Math.min(100, prev.score + 14);
      return {
        ...prev,
        score: newScore,
        confirmedCount: prev.confirmedCount + 1,
        missingCrucialCount: Math.max(0, prev.missingCrucialCount - 1),
        status: newScore >= 80 ? "READY" : "NEEDS_CLARIFICATION",
      };
    });
  }

  // Handle Save Brief & Smooth 5-Stage Creator Matching Transition
  async function handleConfirmAndMatch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setIsSavingBrief(true);
    setIsMatchingTransition(true);
    setMatchingTransitionStep(1);

    const t1 = setTimeout(() => setMatchingTransitionStep(2), 220);
    const t2 = setTimeout(() => setMatchingTransitionStep(3), 440);
    const t3 = setTimeout(() => setMatchingTransitionStep(4), 660);

    try {
      const briefId = doc(collection(db, "briefs")).id;
      const newBrief: CreativeBrief = {
        id: briefId,
        ownerUid: user?.uid || brand.ownerUid || "demo-brand-owner",
        brandId: brand.id,
        brandName: brand.name,
        campaignName: briefForm.campaignName.trim() || "Untitled Campaign",
        requirements: briefForm.requirements.trim(),
        contentType: briefForm.contentType.trim(),
        style: briefForm.styleString.split(",").map((s) => s.trim()).filter(Boolean),
        platform: briefForm.platform.trim(),
        aspectRatio: briefForm.aspectRatio.trim(),
        targetAudience: briefForm.targetAudience.trim(),
        deliverables: briefForm.deliverablesString.split(",").map((d) => d.trim()).filter(Boolean),
        commercialUse: briefForm.commercialUse,
        notes: briefForm.notes.trim(),
        status: BRIEF_STATUS.PUBLISHED,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      try {
        await setDoc(doc(db, "briefs", briefId), newBrief, { merge: true });
      } catch {
        // Continue locally
      }

      setBriefs((prev) => [newBrief, ...prev]);
      setSelectedBrief(newBrief);

      setTimeout(() => {
        setMatchingTransitionStep(5);
        setTimeout(() => {
          setIsMatchingTransition(false);
          setActiveTab("matches"); // Navigate straight to creator matches!
        }, 350);
      }, 880);
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setIsSavingBrief(false);
    }
  }

  // Handle Save Brand Profile
  async function handleSaveBrandProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      await setDoc(doc(db, "brands", brand.id), {
        ...brand,
        ownerUid: user?.uid || brand.ownerUid || "demo-brand-owner",
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.warn("Brand save note:", err);
    }
  }

  // Handle Send Invitation
  async function handleSendInvitation(e: React.FormEvent) {
    e.preventDefault();
    if (!invitingCreator) return;

    setIsSendingInvite(true);
    setInviteFeedback("");

    try {
      const inviteId = doc(collection(db, "invitations")).id;
      const newInvite: Invitation = {
        id: inviteId,
        ownerUid: user?.uid || brand.ownerUid || "demo-brand-owner",
        brandOwnerUid: user?.uid || brand.ownerUid || "demo-brand-owner",
        brandId: brand.id,
        brandName: brand.name,
        creatorUsername: invitingCreator.username,
        briefId: selectedBrief?.id,
        campaignTitle: selectedBrief?.campaignName || "Campaign Collaboration",
        contentType: selectedBrief?.contentType || "Short-form Video",
        message: inviteMessage.trim() || "We would like to invite you to collaborate on our campaign brief.",
        contactEmail: brand.contactEmail || "director@brand.com",
        status: INVITATION_STATUS.INVITED,
        createdAt: serverTimestamp(),
      };

      try {
        await setDoc(doc(db, "invitations", inviteId), newInvite, { merge: true });
      } catch {
        // continue
      }

      setInvitations((prev) => {
        const updated = [newInvite, ...prev];
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("krealink-invitations", JSON.stringify(updated));
          } catch {
            // ignore
          }
        }
        return updated;
      });

      setInviteFeedback("Invitation successfully sent!");
      setTimeout(() => {
        setInvitingCreator(null);
        setInviteFeedback("");
        setInviteMessage("");
      }, 1500);
    } finally {
      setIsSendingInvite(false);
    }
  }

  // Handle Brand Engagement Status Update (e.g. In Progress -> Delivered)
  async function handleBrandUpdateEngagementStatus(
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
          brandOwnerUid: user?.uid || brand.ownerUid || "demo-brand-owner",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch {
      // Retain optimistic state
    }
  }

  // Seed Demo Dataset with 1 Click
  async function handleSeedDemoData() {
    setIsSeeding(true);
    setSeedStatus("Seeding demo creators, portfolios, and briefs to Firestore...");

    try {
      const res = await fetch("/api/seed", {
        method: "POST",
        headers: { "x-krealink-seed": "demo" },
      });
      const data = await res.json();
      if (data?.success) {
        setSeedStatus("✓ Demo data successfully populated!");
        setCreators(DEMO_CREATORS.map((c) => c.creator));
        setBriefs(DEMO_BRIEFS);
        setSelectedBrief(DEMO_BRIEFS[0]);
      } else {
        setSeedStatus("Demo dataset activated locally.");
      }
    } catch {
      setCreators(DEMO_CREATORS.map((c) => c.creator));
      setBriefs(DEMO_BRIEFS);
      setSelectedBrief(DEMO_BRIEFS[0]);
      setSeedStatus("✓ Demo data active!");
    } finally {
      setIsSeeding(false);
      setTimeout(() => setSeedStatus(""), 4000);
    }
  }

  return (
    <main className="min-h-screen bg-[#07080c] text-white">
      <Navbar />

      {/* ======================================================== */}
      {/* 1. BRAND WORKSPACE HEADER */}
      {/* ======================================================== */}
      <section className="relative border-b border-white/[0.06] bg-[#090b10] px-5 py-8 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1 text-[11px] font-mono tracking-wider uppercase text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                <span>Brand &amp; Agency Workspace</span>
              </div>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
                {brand.name}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-400">
                {brand.industry} · Manage creative briefs, review 7-factor creator matches, and track active engagements.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleSeedDemoData}
                disabled={isSeeding}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/[0.08] disabled:opacity-50"
              >
                {isSeeding ? "Seeding..." : "⚡ Seed Demo Dataset"}
              </button>

              <button
                onClick={() => setActiveTab("create-brief")}
                className="rounded-full bg-white px-5 py-2 text-xs font-bold text-black transition hover:bg-slate-200 shadow-md"
              >
                + New AI Brief
              </button>
            </div>
          </div>

          {seedStatus && (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs font-semibold text-emerald-300">
              {seedStatus}
            </div>
          )}

          {/* Tab Navigation */}
          <div className="mt-8 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-t border-white/[0.06] pt-4 text-xs font-semibold sm:flex-wrap">
            <button
              onClick={() => setActiveTab("briefs")}
              className={`shrink-0 rounded-full px-4 py-2 transition ${
                activeTab === "briefs"
                  ? "bg-white text-black font-bold"
                  : "bg-white/[0.03] text-slate-400 hover:text-white"
              }`}
            >
              My Briefs ({briefs.length})
            </button>

            <button
              onClick={() => setActiveTab("create-brief")}
              className={`shrink-0 rounded-full px-4 py-2 transition ${
                activeTab === "create-brief"
                  ? "bg-white text-black font-bold"
                  : "bg-white/[0.03] text-slate-400 hover:text-white"
              }`}
            >
              🤖 AI Brief Builder
            </button>

            <button
              onClick={() => setActiveTab("matches")}
              className={`shrink-0 rounded-full px-4 py-2 transition ${
                activeTab === "matches"
                  ? "bg-white text-black font-bold"
                  : "bg-white/[0.03] text-slate-400 hover:text-white"
              }`}
            >
              ⚡ Creator Matches ({matchedResults.length})
            </button>

            <button
              onClick={() => setActiveTab("engagements")}
              className={`shrink-0 rounded-full px-4 py-2 transition ${
                activeTab === "engagements"
                  ? "bg-white text-black font-bold"
                  : "bg-white/[0.03] text-slate-400 hover:text-white"
              }`}
            >
              Active Engagements ({invitations.length + engagements.length})
            </button>

            <button
              onClick={() => setActiveTab("profile")}
              className={`shrink-0 rounded-full px-4 py-2 transition ${
                activeTab === "profile"
                  ? "bg-white text-black font-bold"
                  : "bg-white/[0.03] text-slate-400 hover:text-white"
              }`}
            >
              Brand Profile
            </button>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. TAB CONTENT PANELS */}
      {/* ======================================================== */}
      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        {/* ======================================================== */}
        {/* TAB 1: MY BRIEFS */}
        {/* ======================================================== */}
        {activeTab === "briefs" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Active Campaign Briefs</h2>
                <p className="text-xs text-slate-400">
                  Select a brief to view matching AI creators and 7-factor explainable ranking.
                </p>
              </div>
              <button
                onClick={() => setActiveTab("create-brief")}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-semibold text-white hover:bg-white/[0.08]"
              >
                + Create Brief
              </button>
            </div>

            {briefs.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e15] p-12 text-center text-slate-400">
                <p className="text-2xl">📝</p>
                <h3 className="mt-3 text-lg font-bold text-white">No briefs published yet</h3>
                <p className="mt-1 text-xs">Use the AI Brief Assistant to convert an idea into production specs.</p>
                <button
                  onClick={() => setActiveTab("create-brief")}
                  className="mt-5 rounded-full bg-white px-6 py-2.5 text-xs font-bold text-black hover:bg-slate-200"
                >
                  Create Your First Brief →
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {briefs.map((brief) => {
                  const isSelected = selectedBrief?.id === brief.id;
                  return (
                    <div
                      key={brief.id || brief.campaignName}
                      className={`flex flex-col justify-between rounded-2xl border p-6 transition ${
                        isSelected
                          ? "border-amber-500/40 bg-amber-500/[0.05] shadow-lg"
                          : "border-white/[0.08] bg-[#0c0e15] hover:border-white/20"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="rounded-md bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                            {brief.contentType}
                          </span>
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                            {brief.commercialUse ? "Commercial Rights" : "Editorial"}
                          </span>
                        </div>

                        <h3 className="mt-3 text-lg font-bold text-white">
                          {brief.campaignName}
                        </h3>
                        <p className="mt-2 text-xs leading-relaxed text-slate-300 line-clamp-2">
                          {brief.requirements}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-mono text-white/50">
                          <span className="rounded bg-black/40 px-2 py-0.5 border border-white/[0.06]">
                            📐 {brief.aspectRatio}
                          </span>
                          <span className="rounded bg-black/40 px-2 py-0.5 border border-white/[0.06]">
                            🎯 {brief.targetAudience}
                          </span>
                          <span className="rounded bg-black/40 px-2 py-0.5 border border-white/[0.06]">
                            📱 {brief.platform}
                          </span>
                        </div>
                      </div>

                      <div className="mt-6 flex items-center justify-between border-t border-white/[0.06] pt-4">
                        <button
                          onClick={() => {
                            setSelectedBrief(brief);
                            setActiveTab("matches");
                          }}
                          className="rounded-full bg-white px-4 py-2 text-xs font-bold text-black transition hover:bg-slate-200"
                        >
                          View Creator Matches →
                        </button>
                        <span className="text-[11px] font-mono text-white/40">
                          Status: {brief.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: AI BRIEF BUILDER */}
        {/* ======================================================== */}
        {activeTab === "create-brief" && (
          <div className="space-y-8 max-w-4xl mx-auto">
            {/* STAGE A: NATURAL LANGUAGE ENTRY */}
            {briefStage === "input" && (
              <div className="rounded-3xl border border-white/10 bg-[#0c0e15] p-6 md:p-9 shadow-2xl">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
                    ✦
                  </span>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-heading font-bold text-white tracking-tight">
                      WHAT ARE YOU CREATING?
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                      Describe the campaign in your own words. KreaLink will structure the creative requirements for you.
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="relative">
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Example: I need a cinematic launch campaign for a premium sneaker brand on Instagram."
                      rows={4}
                      className="w-full resize-none rounded-2xl border border-white/15 bg-black/60 px-5 py-4 text-sm sm:text-base font-medium text-white outline-none placeholder:text-white/30 focus:border-indigo-400/60 focus:ring-1 focus:ring-indigo-400/30 transition shadow-inner leading-relaxed"
                    />
                  </div>

                  {/* 4 Quick Inspiration Chips */}
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                      Quick Inspiration:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setAiPrompt(
                            "I need a cinematic 30-second Instagram reel for our new luxury running shoe targeting Gen Z. It should feel energetic and cinematic with neon reflections, dynamic camera trajectories, and commercial rights included."
                          )
                        }
                        className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs text-slate-300 hover:text-white hover:border-white/25 hover:bg-white/[0.06] transition"
                      >
                        👟 Cinematic Luxury Shoe Launch
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setAiPrompt(
                            "Create a 45-second deep-space sci-fi cinematic trailer with monolithic planetary mega-structures, orbital telemetry, zero-gravity physics, and 21:9 widescreen cinema delivery."
                          )
                        }
                        className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs text-slate-300 hover:text-white hover:border-white/25 hover:bg-white/[0.06] transition"
                      >
                        🎮 Futuristic Game Trailer
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setAiPrompt(
                            "High-velocity vertical social campaign for TikTok and Instagram Reels with kinetic shutter cuts, cyberpunk streetwear aesthetic, and 9:16 mobile framing."
                          )
                        }
                        className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs text-slate-300 hover:text-white hover:border-white/25 hover:bg-white/[0.06] transition"
                      >
                        📱 Gen-Z Social Campaign
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setAiPrompt(
                            "Slow-motion luxury perfume commercial with liquid simulation, obsidian glass textures, velvet shadows, and evocative 35mm analog film lighting."
                          )
                        }
                        className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs text-slate-300 hover:text-white hover:border-white/25 hover:bg-white/[0.06] transition"
                      >
                        ✨ Luxury Product Film
                      </button>
                    </div>
                  </div>

                  {/* Error Notification if service down */}
                  {briefError && (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 text-xs flex items-center justify-between gap-3 text-rose-300">
                      <div className="flex items-center gap-2">
                        <span>⚠</span>
                        <span>{briefError}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleGenerateBriefWithAI}
                        className="rounded-lg bg-rose-500/20 border border-rose-500/40 px-3 py-1 font-semibold text-white hover:bg-rose-500/30"
                      >
                        Try Again
                      </button>
                    </div>
                  )}

                  {/* Action CTA */}
                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleGenerateBriefWithAI}
                      disabled={isGeneratingBrief || !aiPrompt.trim()}
                      className="group inline-flex items-center gap-2.5 rounded-full bg-white px-7 py-3.5 text-xs font-heading font-bold text-black transition hover:bg-slate-200 active:scale-95 disabled:opacity-40 shadow-xl shadow-white/10"
                    >
                      <span>BUILD MY BRIEF</span>
                      <span className="transition-transform group-hover:translate-x-1">→</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBriefStage("edit")}
                      className="text-xs font-mono text-slate-400 hover:text-white transition"
                    >
                      Skip to manual entry ✎
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STAGE B: INTELLIGENT PROCESSING SEQUENCE */}
            {briefStage === "processing" && (
              <div className="rounded-3xl border border-indigo-500/30 bg-[#0c0e15] p-8 md:p-12 shadow-2xl space-y-6 text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-mono text-indigo-300 uppercase tracking-wider">
                  <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
                  <span>KreaLink Creative Intelligence Engine</span>
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-heading font-bold text-white tracking-tight">
                    {processingNotice}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Analyzing model requirements, licensing clearance, and production deliverables.
                  </p>
                </div>

                {/* 5-Step Visual Progression */}
                <div className="max-w-md mx-auto space-y-2.5 text-left text-xs font-mono pt-4">
                  {[
                    "UNDERSTANDING YOUR IDEA",
                    "IDENTIFYING CREATIVE REQUIREMENTS",
                    "STRUCTURING THE BRIEF",
                    "CHECKING FOR MISSING INFORMATION",
                    "BRIEF READY",
                  ].map((stepLabel, idx) => {
                    const stepNum = idx + 1;
                    const isDone = processingStep > stepNum;
                    const isCurrent = processingStep === stepNum;
                    return (
                      <div
                        key={stepLabel}
                        className={`flex items-center justify-between rounded-xl border p-3 transition-all ${
                          isDone
                            ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-300"
                            : isCurrent
                            ? "border-indigo-500/50 bg-indigo-500/15 text-white animate-pulse"
                            : "border-white/[0.06] bg-black/30 text-white/40"
                        }`}
                      >
                        <span className="font-semibold">{stepLabel}</span>
                        <span>{isDone ? "✓" : isCurrent ? "●" : "○"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STAGE C: PROGRESSIVE AI RESPONSE & WE UNDERSTOOD THIS */}
            {briefStage === "review" && (
              <div className="space-y-6">
                {/* Header Bar with Brief Readiness & Actions */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <div>
                      <h3 className="text-base font-bold text-white">Synthesized Creative Brief</h3>
                      <p className="text-xs text-slate-400">
                        Review inferred parameters, clarify gaps, and confirm to discover matching creators.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-mono text-slate-300">
                      Mode: {aiSource === "AI_LIVE" ? "AI-Assisted Engine" : "Local Intelligence Engine"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setBriefStage("input")}
                      className="text-xs font-mono text-slate-400 hover:text-white transition"
                    >
                      ← Start Over
                    </button>
                  </div>
                </div>

                {/* Brief Readiness Indicator */}
                {briefReadiness && (
                  <div className="rounded-2xl border border-white/10 bg-[#0c0e15] p-5 shadow-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-base font-black ${
                            briefReadiness.score >= 80
                              ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                              : briefReadiness.score >= 50
                              ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                              : "border-rose-500/40 bg-rose-500/15 text-rose-300"
                          }`}
                        >
                          {briefReadiness.score}%
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                              Brief Readiness Score
                            </h4>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                                briefReadiness.score >= 80
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : "bg-amber-500/20 text-amber-300"
                              }`}
                            >
                              {briefReadiness.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {briefReadiness.score >= 80
                              ? "Fully production-ready for precision 7-factor creator matchmaking."
                              : "Review inferred parameters below or answer clarification questions to boost match quality."}
                          </p>
                        </div>
                      </div>

                      {/* Readiness Progress Bar */}
                      <div className="w-full sm:w-48 space-y-1">
                        <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              briefReadiness.score >= 80
                                ? "bg-emerald-400"
                                : briefReadiness.score >= 50
                                ? "bg-amber-400"
                                : "bg-rose-400"
                            }`}
                            style={{ width: `${briefReadiness.score}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] font-mono text-slate-400">
                          <span>Confidence Level</span>
                          <span>{briefReadiness.score}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Breakdown of Complete & Needs Attention */}
                    <div className="mt-4 pt-3.5 border-t border-white/[0.06] grid sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 block mb-1">
                          Complete:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {briefReadiness.strengths.map((str, idx) => (
                            <span
                              key={idx}
                              className="rounded-md border border-emerald-500/25 bg-emerald-950/40 px-2 py-0.5 text-[11px] text-emerald-300"
                            >
                              ✓ {str}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 block mb-1">
                          Needs Attention:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {briefReadiness.gaps.length > 0 ? (
                            briefReadiness.gaps.map((gap, idx) => (
                              <span
                                key={idx}
                                className="rounded-md border border-amber-500/25 bg-amber-950/40 px-2 py-0.5 text-[11px] text-amber-300"
                              >
                                ⚠ {gap}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              Zero critical ambiguities detected.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Intelligent Clarification Cards (Single-Tap Choices) */}
                {clarifications.length > 0 && (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400 text-sm">💡</span>
                        <h4 className="text-sm font-bold text-amber-300">
                          Intelligent Clarification (1-Click Refinement)
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono text-amber-300/70">
                        Tap choice to update brief instantly
                      </span>
                    </div>

                    <div className="space-y-3">
                      {clarifications.map((q) => (
                        <div key={q.id} className="rounded-xl border border-white/[0.08] bg-black/60 p-4">
                          <p className="text-xs font-semibold text-white">{q.question}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{q.reason}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {q.choices.map((c) => (
                              <button
                                key={c.value}
                                type="button"
                                onClick={() => handleSelectClarification(q.id, c.value)}
                                className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/25 hover:border-amber-400 text-left active:scale-95"
                              >
                                <span>{c.label}</span>
                                {c.description && (
                                  <span className="block text-[10px] font-normal text-slate-400">
                                    {c.description}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* "WE UNDERSTOOD THIS" Progressive Parameter Breakdown */}
                <div className="rounded-3xl border border-white/10 bg-[#0c0e15] p-6 md:p-8 space-y-6">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <h3 className="text-base font-heading font-bold text-white tracking-tight flex items-center gap-2">
                      <span className="text-indigo-400">✦</span>
                      <span>WE UNDERSTOOD THIS</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setBriefStage("edit")}
                      className="text-xs font-mono text-indigo-300 hover:text-white transition flex items-center gap-1"
                    >
                      <span>Edit Brief Details</span>
                      <span>✎</span>
                    </button>
                  </div>

                  {/* Progressive 6-Factor Summary Grid */}
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 text-xs">
                    <div className="rounded-xl border border-white/[0.06] bg-black/40 p-3.5">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase">
                        <span>Campaign</span>
                        <span className="text-emerald-400">✓ Confirmed</span>
                      </div>
                      <p className="mt-1 text-sm font-bold text-white truncate">
                        {briefForm.campaignName}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/[0.06] bg-black/40 p-3.5">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase">
                        <span>Content Type</span>
                        <span className="text-emerald-400">✓ Confirmed</span>
                      </div>
                      <p className="mt-1 text-sm font-bold text-white truncate">
                        {briefForm.contentType}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/[0.06] bg-black/40 p-3.5">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase">
                        <span>Visual Style</span>
                        <span className="text-emerald-400">✓ Confirmed</span>
                      </div>
                      <p className="mt-1 text-sm font-bold text-white truncate">
                        {briefForm.styleString}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/[0.06] bg-black/40 p-3.5">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase">
                        <span>Platform</span>
                        <span className="text-emerald-400">✓ Confirmed</span>
                      </div>
                      <p className="mt-1 text-sm font-bold text-white truncate">
                        {briefForm.platform}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/[0.06] bg-black/40 p-3.5">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase">
                        <span>Format / Aspect Ratio</span>
                        <span className="text-sky-300">✦ AI Inferred</span>
                      </div>
                      <p className="mt-1 text-sm font-bold text-white truncate">
                        {briefForm.aspectRatio}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/[0.06] bg-black/40 p-3.5">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase">
                        <span>Commercial Clearance</span>
                        <span className="text-emerald-400">✓ 100% Cleared</span>
                      </div>
                      <p className="mt-1 text-sm font-bold text-emerald-300 truncate">
                        {briefForm.commercialUse ? "Commercial Rights Granted" : "Editorial Use Only"}
                      </p>
                    </div>
                  </div>

                  {/* Narrative Requirement */}
                  <div className="rounded-xl border border-white/[0.06] bg-black/40 p-4">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                      Synthesized Creative Direction:
                    </span>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
                      &quot;{briefForm.requirements}&quot;
                    </p>
                  </div>

                  {/* Deliverables List */}
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">
                      Deliverables:
                    </span>
                    <p className="text-xs text-slate-300">
                      {briefForm.deliverablesString}
                    </p>
                  </div>
                </div>

                {/* AI Creative Recommendations Card */}
                {aiRecommendations.length > 0 && (
                  <div className="rounded-2xl border border-sky-500/20 bg-sky-950/20 p-5 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sky-400 text-xs">✦</span>
                      <h4 className="text-xs font-bold font-mono text-sky-300 uppercase tracking-wider">
                        AI Creative Recommendations
                      </h4>
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {aiRecommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-sky-400 font-bold mt-0.5">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Confirmation Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleConfirmAndMatch()}
                    disabled={isSavingBrief}
                    className="group inline-flex items-center gap-2.5 rounded-full bg-white px-8 py-3.5 text-xs font-heading font-bold text-black transition hover:bg-slate-200 active:scale-95 disabled:opacity-50 shadow-xl shadow-white/10"
                  >
                    <span>{isSavingBrief ? "Matching Creators..." : "Confirm Brief & Find Creators"}</span>
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBriefStage("edit")}
                    className="rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 text-xs font-semibold text-white hover:bg-white/[0.08] transition"
                  >
                    Edit All Parameters ✎
                  </button>
                </div>
              </div>
            )}

            {/* STAGE D: FULL PARAMETER EDIT MODE */}
            {briefStage === "edit" && (
              <form onSubmit={handleConfirmAndMatch} className="rounded-3xl border border-white/10 bg-[#0c0e15] p-6 md:p-8 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white">Edit Creative Parameters</h3>
                    <p className="text-xs text-slate-400">Refine any field before triggering 7-factor creator matching.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBriefStage("review")}
                    className="text-xs font-mono text-slate-400 hover:text-white transition"
                  >
                    ← Back to Preview
                  </button>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Campaign Title *</label>
                  <input
                    value={briefForm.campaignName}
                    onChange={(e) => setBriefForm({ ...briefForm, campaignName: e.target.value })}
                    required
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-indigo-400/50"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-300">Deliverable Content Type</label>
                    <input
                      value={briefForm.contentType}
                      onChange={(e) => setBriefForm({ ...briefForm, contentType: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-indigo-400/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300">Target Platforms</label>
                    <input
                      value={briefForm.platform}
                      onChange={(e) => setBriefForm({ ...briefForm, platform: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-indigo-400/50"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-300">Aspect Ratio / Format</label>
                    <select
                      value={briefForm.aspectRatio}
                      onChange={(e) => setBriefForm({ ...briefForm, aspectRatio: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-xs font-medium text-white outline-none focus:border-indigo-400/50 cursor-pointer"
                    >
                      <option value="9:16 Vertical (Reels/Shorts)">9:16 Vertical (Reels/Shorts)</option>
                      <option value="16:9 Landscape (YouTube/TV)">16:9 Landscape (YouTube/TV)</option>
                      <option value="1:1 Square (Instagram)">1:1 Square (Instagram)</option>
                      <option value="21:9 Widescreen Cinema">21:9 Widescreen Cinema</option>
                      <option value="4K UHD">4K UHD Cinema</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300">Target Audience</label>
                    <input
                      value={briefForm.targetAudience}
                      onChange={(e) => setBriefForm({ ...briefForm, targetAudience: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-indigo-400/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Visual Style &amp; Mood Tags</label>
                  <input
                    value={briefForm.styleString}
                    onChange={(e) => setBriefForm({ ...briefForm, styleString: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-indigo-400/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Detailed Creative Requirements *</label>
                  <textarea
                    value={briefForm.requirements}
                    onChange={(e) => setBriefForm({ ...briefForm, requirements: e.target.value })}
                    rows={3}
                    required
                    className="mt-1 w-full resize-none rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-indigo-400/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Deliverables List (comma-separated)</label>
                  <input
                    value={briefForm.deliverablesString}
                    onChange={(e) => setBriefForm({ ...briefForm, deliverablesString: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-indigo-400/50"
                  />
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-black/30 p-4">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <p className="text-xs font-bold text-white">Full Commercial Use Rights Required</p>
                      <p className="text-[11px] text-slate-400">Only rank creators providing complete commercial clearance for brand campaigns.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={briefForm.commercialUse}
                      onChange={(e) => setBriefForm({ ...briefForm, commercialUse: e.target.checked })}
                      className="h-4 w-4 accent-emerald-400 rounded"
                    />
                  </label>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSavingBrief}
                    className="flex-1 rounded-full bg-white py-3.5 text-xs font-bold text-black transition hover:bg-slate-200 active:scale-95 disabled:opacity-50 shadow-lg"
                  >
                    {isSavingBrief ? "Matching Creators..." : "Save Brief & Match Creators →"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setBriefStage("review")}
                    className="rounded-full border border-white/15 bg-white/[0.04] px-6 py-3.5 text-xs font-semibold text-white hover:bg-white/[0.08]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: CREATOR MATCHES & RANKING */}
        {/* ======================================================== */}
        {activeTab === "matches" && (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-white/[0.06] pb-5">
              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-indigo-400">7-Factor Ranked Results</span>
                <h2 className="mt-1 text-2xl font-bold text-white">
                  Creator Recommendations for &quot;{selectedBrief?.campaignName || "Active Brief"}&quot;
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Switch Brief:</span>
                <select
                  value={selectedBrief?.id || ""}
                  onChange={(e) => {
                    const b = briefs.find((x) => x.id === e.target.value);
                    if (b) setSelectedBrief(b);
                  }}
                  className="rounded-lg border border-white/15 bg-[#0e111a] px-3 py-1.5 text-xs font-semibold text-white outline-none cursor-pointer"
                >
                  {briefs.map((b) => (
                    <option key={b.id} value={b.id} className="bg-[#0c0e15] text-slate-200 py-1">
                      {b.campaignName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {matchedResults.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e15] p-12 text-center text-slate-400">
                <p className="text-sm">No creators loaded to match against this brief.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {matchedResults.map((match, rankIdx) => {
                  const {
                    creator,
                    overallScore,
                    confidence,
                    evidencePoints,
                    gaps,
                    subscores,
                    whyExplanation,
                    alternativeRole,
                  } = match;

                  return (
                    <div
                      key={creator.username}
                      className="rounded-2xl border border-white/[0.08] bg-[#0c0e15] p-6 transition hover:border-white/20 shadow-xl"
                    >
                      <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
                        {/* Creator Info (7 cols) */}
                        <div className="lg:col-span-7">
                          <div className="flex items-center gap-3.5">
                            <span className="font-mono text-xs font-bold text-slate-400">#{rankIdx + 1}</span>
                            {creator.profilePhoto ? (
                              <Image
                                src={creator.profilePhoto}
                                alt={creator.name}
                                width={48}
                                height={48}
                                className="h-12 w-12 rounded-xl object-cover border border-white/10 shrink-0"
                                unoptimized
                              />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-indigo-500/20 to-sky-500/20 text-base font-bold text-white shrink-0">
                                {creator.name.charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <Link
                                  href={`/${creator.username}`}
                                  className="text-base font-bold text-white hover:text-indigo-300 transition"
                                >
                                  {creator.name}
                                </Link>
                                <span className="text-xs text-emerald-400" title="Verified">✓ Verified</span>
                                {alternativeRole && (
                                  <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                                    ★ {alternativeRole}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 truncate">{creator.specialization}</p>
                            </div>
                          </div>

                          {/* Grounded Why Matched */}
                          <div className="mt-3.5 rounded-xl border border-white/[0.06] bg-black/40 p-3 text-xs leading-relaxed text-slate-300">
                            <span className="font-semibold text-emerald-300">Grounded Rationale: </span>
                            {whyExplanation}
                          </div>

                          {/* Evidence Proof Points */}
                          {evidencePoints.length > 0 && (
                            <div className="mt-2.5 space-y-1">
                              {evidencePoints.slice(0, 3).map((ep: { signal: string; level: string }, i: number) => {
                                const lvl = ep.level.toLowerCase();
                                const isDemo = lvl.includes("portfolio");
                                const isSys = lvl.includes("system") || lvl.includes("platform");
                                return (
                                  <div key={i} className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                    <span className="text-emerald-400 font-bold">✓</span>
                                    <span className="text-slate-300">{ep.signal}</span>
                                    <span
                                      className={`rounded border px-1.5 py-0.2 text-[9px] font-mono lowercase ${
                                        isDemo
                                          ? "border-emerald-500/30 bg-emerald-950/60 text-emerald-300"
                                          : isSys
                                          ? "border-sky-500/30 bg-sky-950/60 text-sky-300"
                                          : "border-purple-500/30 bg-purple-950/60 text-purple-300"
                                      }`}
                                    >
                                      {ep.level}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Creative Gaps Warning Badges */}
                          {gaps.length > 0 && (
                            <div className="mt-2.5 space-y-1">
                              {gaps.map((g: { message: string; severity?: string }, i: number) => {
                                const sev = g.severity || "CAUTION";
                                return (
                                  <div key={i} className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                    <span className={sev === "CRITICAL" ? "text-rose-400 font-bold" : "text-amber-400 font-bold"}>
                                      {sev === "CRITICAL" ? "✕" : "⚠"}
                                    </span>
                                    <span className="text-amber-200/90">{g.message}</span>
                                    <span
                                      className={`rounded px-1.5 py-0.2 text-[9px] font-mono uppercase font-bold border ${
                                        sev === "CRITICAL"
                                          ? "border-rose-500/40 bg-rose-950/80 text-rose-300"
                                          : sev === "CAUTION"
                                          ? "border-amber-500/30 bg-amber-950/70 text-amber-300"
                                          : "border-slate-600 bg-slate-900 text-slate-400"
                                      }`}
                                    >
                                      {sev}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Toolchain tags */}
                          <div className="mt-3 flex flex-wrap gap-1">
                            {creator.aiTools.slice(0, 4).map((tool: string) => (
                              <span
                                key={tool}
                                className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-slate-300"
                              >
                                {tool}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Radar Breakdown & Score (5 cols) */}
                        <div className="lg:col-span-5 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-white/[0.06] pt-4 lg:pt-0 lg:pl-6">
                          <div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Match Fit</span>
                                <span
                                  title="Confidence reflects the strength and amount of available evidence supporting this recommendation."
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-mono uppercase font-bold border cursor-help ${
                                    confidence === "HIGH"
                                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                                      : "border-amber-500/40 bg-amber-500/10 text-amber-300"
                                  }`}
                                >
                                  ● {confidence} Confidence
                                </span>
                              </div>
                              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-0.5 text-sm font-extrabold text-emerald-300">
                                {overallScore}%
                              </span>
                            </div>

                            {/* Factor Breakdown */}
                            <div className="mt-3 space-y-1.5 text-[10px] font-mono">
                              <div>
                                <div className="flex justify-between text-slate-300 mb-0.5">
                                  <span>Content Type Alignment</span>
                                  <span>{subscores.contentType}%</span>
                                </div>
                                <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${subscores.contentType}%` }} />
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between text-slate-300 mb-0.5">
                                  <span>Skills Mastery</span>
                                  <span>{subscores.skills}%</span>
                                </div>
                                <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${subscores.skills}%` }} />
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between text-slate-300 mb-0.5">
                                  <span>AI Toolchain Verification</span>
                                  <span>{subscores.tools}%</span>
                                </div>
                                <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                  <div className="h-full bg-sky-400 rounded-full" style={{ width: `${subscores.tools}%` }} />
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between text-slate-300 mb-0.5">
                                  <span>Specialization Fit</span>
                                  <span>{subscores.specialization}%</span>
                                </div>
                                <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                  <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${subscores.specialization}%` }} />
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between text-slate-300 mb-0.5">
                                  <span>Format Support</span>
                                  <span>{subscores.format}%</span>
                                </div>
                                <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                  <div className="h-full bg-slate-300 rounded-full" style={{ width: `${subscores.format}%` }} />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Quick Actions */}
                          <div className="mt-5 space-y-2">
                            <button
                              type="button"
                              onClick={() => setActiveWhyCreator(match)}
                              className="w-full rounded-lg border border-indigo-500/30 bg-indigo-500/10 py-1.5 text-center text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 transition flex items-center justify-center gap-1"
                            >
                              <span>Why This Creator?</span>
                              <span>↗</span>
                            </button>

                            <div className="flex items-center gap-2">
                              <Link
                                href={`/${creator.username}`}
                                className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] py-2 text-center text-xs font-semibold text-white hover:bg-white/[0.08]"
                              >
                                Inspect Portfolio
                              </Link>

                              <button
                                onClick={() => {
                                  setInvitingCreator(creator);
                                  setInviteFeedback("");
                                }}
                                className="flex-1 rounded-lg bg-white py-2 text-xs font-bold text-black hover:bg-slate-200 shadow-sm"
                              >
                                Invite Creator
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: ACTIVE ENGAGEMENTS TRACKER */}
        {/* ======================================================== */}
        {activeTab === "engagements" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Engagements &amp; Collaboration Pipeline</h2>
              <p className="text-xs text-slate-400">Track accepted briefs, production milestones, and deliverable reviews.</p>
            </div>

            {invitations.length === 0 && engagements.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e15] p-12 text-center text-slate-400">
                <p className="text-2xl">🤝</p>
                <h3 className="mt-3 text-lg font-bold text-white">No active engagements yet</h3>
                <p className="mt-1 text-xs">Invite a matched creator to initiate production.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* 1. Active Signed Engagements */}
                {engagements.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 font-mono">
                        Active Contracts &amp; Production ({engagements.length})
                      </h3>
                      <span className="text-[11px] font-mono text-slate-400">
                        One-way delivery lifecycle
                      </span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {engagements.map((eng) => (
                        <div
                          key={eng.id}
                          className="flex flex-col justify-between rounded-2xl border border-emerald-500/25 bg-[#0c0e15] p-5 shadow-lg"
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[11px] text-slate-400">
                                Creator: @{eng.creatorUsername}
                              </span>
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider border ${
                                  eng.status === ENGAGEMENT_STATUS.DELIVERED
                                    ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
                                    : eng.status === ENGAGEMENT_STATUS.IN_PROGRESS
                                    ? "border-indigo-500/40 bg-indigo-500/20 text-indigo-300"
                                    : "border-sky-500/40 bg-sky-500/20 text-sky-300"
                                }`}
                              >
                                {eng.status}
                              </span>
                            </div>

                            <h4 className="mt-2 text-base font-bold text-white">{eng.campaignTitle}</h4>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {eng.deliverables?.map((d, i) => (
                                <span key={i} className="rounded bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 text-[10px] text-slate-300 font-mono">
                                  📦 {d}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-xs">
                            <span className="text-slate-400 font-mono text-[11px]">
                              {eng.status === ENGAGEMENT_STATUS.ACCEPTED && "Awaiting creator kickoff"}
                              {eng.status === ENGAGEMENT_STATUS.IN_PROGRESS && "In production"}
                              {eng.status === ENGAGEMENT_STATUS.DELIVERED && "Commercial rights verified"}
                            </span>

                            {eng.status === ENGAGEMENT_STATUS.IN_PROGRESS && (
                              <button
                                type="button"
                                onClick={() => handleBrandUpdateEngagementStatus(eng.id!, ENGAGEMENT_STATUS.DELIVERED)}
                                className="rounded-full bg-emerald-400 hover:bg-emerald-300 px-3.5 py-1 text-xs font-bold text-black transition"
                              >
                                Mark Delivered ✓
                              </button>
                            )}

                            {eng.status === ENGAGEMENT_STATUS.DELIVERED && (
                              <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
                                ✓ Approved
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Dispatched Proposals */}
                {invitations.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono">
                      Dispatched Proposals ({invitations.length})
                    </h3>

                    <div className="grid gap-4 md:grid-cols-2">
                      {invitations.map((inv) => (
                        <div key={inv.id} className="rounded-2xl border border-white/[0.08] bg-[#0c0e15] p-5">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[11px] text-slate-400">Proposal</span>
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

                          <h4 className="mt-2 text-base font-bold text-white">{inv.campaignTitle}</h4>
                          <p className="text-xs text-slate-400">Creator: @{inv.creatorUsername}</p>
                          <p className="mt-2 text-xs italic text-slate-300">&quot;{inv.message}&quot;</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: BRAND PROFILE */}
        {/* ======================================================== */}
        {activeTab === "profile" && (
          <form onSubmit={handleSaveBrandProfile} className="max-w-2xl mx-auto rounded-2xl border border-white/[0.08] bg-[#0c0e15] p-6 md:p-8 space-y-4">
            <h2 className="text-lg font-bold text-white border-b border-white/[0.06] pb-3">Brand Information</h2>

            <div>
              <label className="text-xs font-semibold text-slate-300">Brand / Agency Name</label>
              <input
                value={brand.name}
                onChange={(e) => setBrand({ ...brand, name: e.target.value })}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-amber-400/50"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Industry / Vertical</label>
              <input
                value={brand.industry}
                onChange={(e) => setBrand({ ...brand, industry: e.target.value })}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-amber-400/50"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Contact Email</label>
              <input
                value={brand.contactEmail || ""}
                onChange={(e) => setBrand({ ...brand, contactEmail: e.target.value })}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-amber-400/50"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Overview / Vision</label>
              <textarea
                value={brand.description}
                onChange={(e) => setBrand({ ...brand, description: e.target.value })}
                rows={3}
                className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-amber-400/50"
              />
            </div>

            <button
              type="submit"
              className="mt-3 rounded-full bg-white px-6 py-2.5 text-xs font-bold text-black hover:bg-slate-200"
            >
              Save Brand Profile
            </button>
          </form>
        )}
      </section>

      {/* ======================================================== */}
      {/* INVITE CREATOR MODAL */}
      {/* ======================================================== */}
      {invitingCreator && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-5 backdrop-blur-xl">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0c0e15] p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-wider text-amber-400">Direct Invitation</p>
                <h3 className="mt-1 text-xl font-bold text-white">Invite {invitingCreator.name}</h3>
                <p className="text-xs text-slate-400">Brief: {selectedBrief?.campaignName || "Campaign Collaboration"}</p>
              </div>
              <button
                onClick={() => setInvitingCreator(null)}
                className="text-lg font-bold text-white/40 hover:text-white"
              >
                ✕
              </button>
            </div>

            {inviteFeedback ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center text-xs font-bold text-emerald-300">
                {inviteFeedback}
              </div>
            ) : (
              <form onSubmit={handleSendInvitation} className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Proposal Message *</label>
                  <textarea
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    placeholder="We loved your generative work and would like to invite you to collaborate on our upcoming campaign brief..."
                    rows={4}
                    required
                    className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-black/50 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-amber-400/50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSendingInvite}
                  className="w-full rounded-full bg-white py-3 text-xs font-bold text-black hover:bg-slate-200 disabled:opacity-50"
                >
                  {isSendingInvite ? "Sending Proposal..." : "Dispatch Campaign Proposal →"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5-STAGE MATCHING TRANSITION OVERLAY */}
      {/* ======================================================== */}
      {isMatchingTransition && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 px-5 backdrop-blur-2xl">
          <div className="w-full max-w-md rounded-2xl border border-indigo-500/20 bg-[#0a0d14] p-8 shadow-2xl text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-500/10 text-2xl text-indigo-400">
              ⚡
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-indigo-400">
              Creative Intelligence Engine
            </span>
            <h3 className="mt-1 text-xl font-bold text-white">
              Evaluating Creator Network
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Cross-referencing your brief against validated creator portfolios
            </p>

            <div className="mt-6 space-y-3 text-left">
              {[
                { step: 1, label: "Understanding Creative Requirements", desc: "Parsing intent, aspect ratio, styles & deliverables" },
                { step: 2, label: "Scanning Creator Capabilities", desc: "Matching tools (Runway, Midjourney, Kling) and domains" },
                { step: 3, label: "Analyzing Portfolio Evidence", desc: "Verifying real client deliverable proof & visual artifacts" },
                { step: 4, label: "Ranking 7-Factor Fit", desc: "Weighting skills, formats, and commercial rights" },
                { step: 5, label: "Top Matches Found", desc: "Generating explainable rationale and role assignments" },
              ].map((s) => {
                const isDone = matchingTransitionStep > s.step;
                const isCurrent = matchingTransitionStep === s.step;
                return (
                  <div
                    key={s.step}
                    className={`flex items-start gap-3 rounded-xl border p-3 transition-all duration-300 ${
                      isDone
                        ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-300"
                        : isCurrent
                        ? "border-indigo-500/40 bg-indigo-500/10 text-white"
                        : "border-white/[0.04] bg-white/[0.01] text-slate-500"
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isDone ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
                          ✓
                        </span>
                      ) : isCurrent ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-300 animate-pulse">
                          ●
                        </span>
                      ) : (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/5 text-[11px] font-mono text-slate-600">
                          {s.step}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold leading-tight">{s.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">{s.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* WHY THIS CREATOR SIGNATURE MODAL */}
      {/* ======================================================== */}
      {activeWhyCreator && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-xl overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0c0e15] p-6 md:p-8 shadow-2xl my-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/[0.08] pb-5">
              <div className="flex items-center gap-3.5">
                {activeWhyCreator.creator.profilePhoto ? (
                  <Image
                    src={activeWhyCreator.creator.profilePhoto}
                    alt={activeWhyCreator.creator.name}
                    width={52}
                    height={52}
                    className="h-13 w-13 rounded-xl object-cover border border-white/10 shrink-0"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-13 w-13 items-center justify-center rounded-xl border border-white/10 bg-indigo-500/20 text-lg font-bold text-white shrink-0">
                    {activeWhyCreator.creator.name.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold text-white">{activeWhyCreator.creator.name}</h3>
                    {activeWhyCreator.alternativeRole && (
                      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                        ★ {activeWhyCreator.alternativeRole}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{activeWhyCreator.creator.specialization}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-2xl font-extrabold text-emerald-400">{activeWhyCreator.overallScore}%</div>
                  <div className="text-[10px] font-mono uppercase text-slate-400">
                    {activeWhyCreator.confidence} Confidence
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveWhyCreator(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/5 transition"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="mt-5 space-y-5">
              {/* Grounded Rationale */}
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 mb-1">
                  <span>💡</span>
                  <span>Why This Creator Was Recommended</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-300">
                  {activeWhyCreator.whyExplanation}
                </p>
              </div>

              {/* Verified Evidence vs Potential Gaps */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Evidence */}
                <div className="rounded-xl border border-white/[0.06] bg-black/40 p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2.5 flex items-center gap-1.5">
                    <span className="text-emerald-400">✓</span>
                    <span>Verified Evidence Points</span>
                  </div>
                  {activeWhyCreator.evidencePoints.length === 0 ? (
                    <p className="text-xs text-slate-500">Based on general profile credentials.</p>
                  ) : (
                    <div className="space-y-2">
                      {activeWhyCreator.evidencePoints.map((ep, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <span className="text-emerald-400 shrink-0 mt-0.5">•</span>
                          <span className="text-slate-300">{ep.signal}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Gaps / Trade-offs */}
                <div className="rounded-xl border border-white/[0.06] bg-black/40 p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2.5 flex items-center gap-1.5">
                    <span className="text-amber-400">⚠</span>
                    <span>Creative Nuances &amp; Trade-offs</span>
                  </div>
                  {activeWhyCreator.gaps.length === 0 ? (
                    <p className="text-xs text-emerald-400/80">No significant gaps detected for this campaign specification.</p>
                  ) : (
                    <div className="space-y-2">
                      {activeWhyCreator.gaps.map((g, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <span className="text-amber-400 shrink-0 mt-0.5">!</span>
                          <span className="text-amber-200/90">{g.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {activeWhyCreator.whyNotExplanation && (
                    <p className="mt-2 text-[11px] text-slate-400 border-t border-white/5 pt-2">
                      {activeWhyCreator.whyNotExplanation}
                    </p>
                  )}
                </div>
              </div>

              {/* 7-Factor Radar Breakdown */}
              <div className="rounded-xl border border-white/[0.06] bg-black/40 p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
                  7-Factor Algorithmic Score Breakdown
                </div>
                <div className="grid gap-x-6 gap-y-2.5 md:grid-cols-2 text-xs font-mono">
                  {[
                    { label: "Content Type Alignment", val: activeWhyCreator.subscores.contentType, color: "bg-emerald-400" },
                    { label: "Skills Mastery", val: activeWhyCreator.subscores.skills, color: "bg-emerald-400" },
                    { label: "AI Toolchain Verification", val: activeWhyCreator.subscores.tools, color: "bg-sky-400" },
                    { label: "Specialization Fit", val: activeWhyCreator.subscores.specialization, color: "bg-indigo-400" },
                    { label: "Aspect Ratio & Format", val: activeWhyCreator.subscores.format, color: "bg-purple-400" },
                    { label: "Commercial Rights Fit", val: activeWhyCreator.subscores.commercialUse, color: "bg-amber-400" },
                    { label: "Portfolio Evidence Depth", val: activeWhyCreator.subscores.portfolioEvidence, color: "bg-teal-400" },
                    { label: "Industry & Aesthetic", val: activeWhyCreator.subscores.industryAesthetic, color: "bg-rose-400" },
                  ].map((sub, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>{sub.label}</span>
                        <span>{sub.val}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full ${sub.color} rounded-full`} style={{ width: `${sub.val}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/[0.08] pt-5">
              <button
                type="button"
                onClick={() => setActiveWhyCreator(null)}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"
              >
                Close
              </button>
              <Link
                href={`/${activeWhyCreator.creator.username}`}
                className="rounded-full border border-white/15 bg-white/10 px-5 py-2 text-xs font-semibold text-white hover:bg-white/20"
              >
                Inspect Portfolio →
              </Link>
              <button
                type="button"
                onClick={() => {
                  const c = activeWhyCreator.creator;
                  setActiveWhyCreator(null);
                  setInvitingCreator(c);
                  setInviteFeedback("");
                }}
                className="rounded-full bg-white px-5 py-2 text-xs font-bold text-black hover:bg-slate-200"
              >
                Invite This Creator
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
