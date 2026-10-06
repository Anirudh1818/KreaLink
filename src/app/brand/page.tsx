"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useStoredTheme } from "@/lib/use-theme";
import { useAuth } from "@/lib/auth-context";
import { Navbar } from "@/components/Navbar";
import {
  BrandProfile,
  CreativeBrief,
  CreatorProfile,
  CreatorMatchResult,
  Invitation,
  Engagement,
} from "@/lib/types";
import { rankCreatorsForBrief } from "@/lib/matchingEngine";
import { DEMO_BRAND, DEMO_BRIEFS, DEMO_CREATORS } from "@/lib/demoData";

type BrandTab = "briefs" | "create-brief" | "matches" | "engagements" | "profile";

export default function BrandDashboardPage() {
  const { user } = useAuth();
  const { theme } = useStoredTheme();

  const [activeTab, setActiveTab] = useState<BrandTab>("briefs");

  // Brand Profile State
  const [brand, setBrand] = useState<BrandProfile>(DEMO_BRAND);
  const [isEditingBrand, setIsEditingBrand] = useState(false);

  // Briefs & Matching State
  const [briefs, setBriefs] = useState<CreativeBrief[]>([]);
  const [selectedBrief, setSelectedBrief] = useState<CreativeBrief | null>(null);
  const [creators, setCreators] = useState<CreatorProfile[]>([]);
  const [matchedResults, setMatchedResults] = useState<CreatorMatchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // AI Brief Builder Prompt State
  const [aiPrompt, setAiPrompt] = useState(
    "I need a futuristic 30-second Instagram reel for our new running shoe targeting Gen Z. It should feel energetic and cinematic and we need commercial rights."
  );
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [aiNotice, setAiNotice] = useState<string>("");

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
        // Load Brand profile
        const brandId = user?.uid ? `brand-${user.uid.slice(0, 8)}` : DEMO_BRAND.id;
        try {
          const brandSnap = await getDocs(collection(db, "brands"));
          if (!brandSnap.empty) {
            const b = brandSnap.docs[0].data() as BrandProfile;
            setBrand({ ...b, id: brandSnap.docs[0].id });
          }
        } catch {
          setBrand(DEMO_BRAND);
        }

        // Load Creators
        const creatorSnap = await getDocs(collection(db, "creators"));
        let loadedCreators: CreatorProfile[] = [];
        if (!creatorSnap.empty) {
          loadedCreators = creatorSnap.docs.map((docSnap) => ({
            username: docSnap.id,
            ...(docSnap.data() as any),
          }));
        }
        if (loadedCreators.length === 0) {
          loadedCreators = DEMO_CREATORS.map((c) => c.creator);
        }
        setCreators(loadedCreators);

        // Load Briefs
        const briefsSnap = await getDocs(collection(db, "briefs"));
        let loadedBriefs: CreativeBrief[] = [];
        if (!briefsSnap.empty) {
          loadedBriefs = briefsSnap.docs.map((b) => ({
            id: b.id,
            ...(b.data() as any),
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
            setInvitations(invSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
          }
        } catch {
          // ignore
        }

        // Load Engagements
        try {
          const engSnap = await getDocs(collection(db, "engagements"));
          if (!engSnap.empty) {
            setEngagements(engSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
          }
        } catch {
          // ignore
        }
      } catch (err) {
        console.warn("Brand load note:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadBrandData();
  }, [user]);

  // Check URL query parameters for tab navigation
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get("tab") as BrandTab;
      if (tabParam && ["briefs", "create-brief", "matches", "engagements", "profile"].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  // Update Matching Results whenever selectedBrief or creators change
  useEffect(() => {
    if (selectedBrief && creators.length > 0) {
      const ranked = rankCreatorsForBrief(selectedBrief, creators);
      setMatchedResults(ranked);
    }
  }, [selectedBrief, creators]);

  // Handle AI Brief Builder API Generation
  async function handleGenerateBriefWithAI() {
    if (!aiPrompt.trim()) return;

    setIsGeneratingBrief(true);
    setAiNotice("");

    try {
      const res = await fetch("/api/ai/brief-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt.trim() }),
      });

      const data = await res.json();
      if (data?.success && data?.brief) {
        const b = data.brief;
        setBriefForm({
          campaignName: b.campaignName || "AI Campaign",
          requirements: b.requirements || "",
          contentType: b.contentType || "Short-form Video (Reels/TikTok)",
          styleString: (b.style || []).join(", "),
          platform: b.platform || "Instagram Reels & TikTok",
          aspectRatio: b.aspectRatio || "9:16 Vertical (Reels/Shorts)",
          targetAudience: b.targetAudience || "Target Audience",
          deliverablesString: (b.deliverables || []).join(", "),
          commercialUse: Boolean(b.commercialUse),
          notes: b.notes || "",
        });

        if (b.source === "ai") {
          setAiNotice("✨ Brief structured by AI LLM service.");
        } else {
          setAiNotice("⚡ Brief structured via intelligent rule parser (development demo mode).");
        }
      }
    } catch (err) {
      console.warn("AI brief generation fallback triggered:", err);
      setAiNotice("⚡ Local parser prepared your brief structure.");
    } finally {
      setIsGeneratingBrief(false);
    }
  }

  // Handle Save Brief
  async function handleSaveBrief(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingBrief(true);

    try {
      const briefId = `brief-${Date.now()}`;
      const newBrief: CreativeBrief = {
        id: briefId,
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
        status: "Published",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Save to Firestore
      try {
        await setDoc(doc(db, "briefs", briefId), newBrief, { merge: true });
      } catch {
        // Continue for UI prototype if rules block write
      }

      setBriefs((prev) => [newBrief, ...prev]);
      setSelectedBrief(newBrief);
      setActiveTab("matches"); // Jump straight to creator matches!
    } finally {
      setIsSavingBrief(false);
    }
  }

  // Handle Save Brand Profile
  async function handleSaveBrandProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      await setDoc(doc(db, "brands", brand.id), {
        ...brand,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setIsEditingBrand(false);
    } catch (err) {
      console.warn("Brand save note:", err);
      setIsEditingBrand(false);
    }
  }

  // Handle Send Invitation
  async function handleSendInvitation(e: React.FormEvent) {
    e.preventDefault();
    if (!invitingCreator) return;

    setIsSendingInvite(true);
    setInviteFeedback("");

    try {
      const inviteId = `inv-${Date.now()}`;
      const newInvite: Invitation = {
        id: inviteId,
        brandId: brand.id,
        brandName: brand.name,
        creatorUsername: invitingCreator.username,
        briefId: selectedBrief?.id || "direct-brief",
        campaignTitle: selectedBrief?.campaignName || "Campaign Collaboration",
        contentType: selectedBrief?.contentType || "AI Video",
        message: inviteMessage.trim() || `We'd love to invite you to collaborate on ${selectedBrief?.campaignName || "our campaign"}.`,
        contactEmail: brand.contactEmail || user?.email || "producer@brand.com",
        status: "Invited",
        createdAt: serverTimestamp(),
      };

      try {
        await setDoc(doc(db, "invitations", inviteId), newInvite, { merge: true });
      } catch {
        // UI fallback
      }

      setInvitations((prev) => [newInvite, ...prev]);
      setInviteFeedback(`✓ Invitation sent to ${invitingCreator.name}!`);
      setTimeout(() => {
        setInvitingCreator(null);
        setInviteFeedback("");
        setActiveTab("engagements");
      }, 1200);
    } finally {
      setIsSendingInvite(false);
    }
  }

  // Seed Demo Dataset with 1 Click
  async function handleSeedDemoData() {
    setIsSeeding(true);
    setSeedStatus("Seeding demo creators, portfolios, and briefs to Firestore...");

    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (data?.success) {
        setSeedStatus("✓ Demo data successfully populated!");
        // Refresh local state with demo creators & briefs
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
    <main className="min-h-screen bg-[#050508] text-white">
      <Navbar />

      {/* Brand Dashboard Header */}
      <section className="relative z-10 border-b border-white/10 bg-white/[0.02] px-5 py-8 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-1 text-xs font-black uppercase tracking-[0.2em] text-white/50">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Brand &amp; Agency Workspace
              </div>
              <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
                {brand.name}
              </h2>
              <p className="mt-1 text-sm text-white/55">
                {brand.industry} · Manage briefs, AI creator matches, and active engagements.
              </p>
            </div>

            {/* Quick Actions: Seed Demo Data & Create Brief */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleSeedDemoData}
                disabled={isSeeding}
                className="rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-xs font-bold text-white/80 transition hover:bg-white/[0.12] disabled:opacity-50"
                title="Populates 7 realistic AI creators with complete portfolios and briefs into Firestore"
              >
                {isSeeding ? "Seeding..." : "⚡ Seed Demo Dataset"}
              </button>

              <button
                onClick={() => setActiveTab("create-brief")}
                className="rounded-xl px-5 py-2.5 text-xs font-black text-white transition hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: theme.gradient,
                  boxShadow: `0 0 25px ${theme.glow}`,
                }}
              >
                + New AI Brief
              </button>
            </div>
          </div>

          {seedStatus && (
            <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs font-bold text-emerald-300">
              {seedStatus}
            </div>
          )}

          {/* Tab Navigation */}
          <div className="mt-8 flex flex-wrap gap-2 border-t border-white/10 pt-4 text-xs font-bold">
            <button
              onClick={() => setActiveTab("briefs")}
              className={`rounded-xl px-4 py-2.5 transition ${
                activeTab === "briefs"
                  ? "bg-white/20 text-white shadow-sm"
                  : "bg-white/[0.04] text-white/60 hover:text-white"
              }`}
            >
              📋 My Briefs ({briefs.length})
            </button>

            <button
              onClick={() => setActiveTab("create-brief")}
              className={`rounded-xl px-4 py-2.5 transition ${
                activeTab === "create-brief"
                  ? "bg-white/20 text-white shadow-sm"
                  : "bg-white/[0.04] text-white/60 hover:text-white"
              }`}
            >
              🤖 AI Brief Builder
            </button>

            <button
              onClick={() => setActiveTab("matches")}
              className={`rounded-xl px-4 py-2.5 transition ${
                activeTab === "matches"
                  ? "bg-white/20 text-white shadow-sm"
                  : "bg-white/[0.04] text-white/60 hover:text-white"
              }`}
            >
              ⚡ Creator Matches ({matchedResults.length})
            </button>

            <button
              onClick={() => setActiveTab("engagements")}
              className={`rounded-xl px-4 py-2.5 transition ${
                activeTab === "engagements"
                  ? "bg-white/20 text-white shadow-sm"
                  : "bg-white/[0.04] text-white/60 hover:text-white"
              }`}
            >
              🚀 Engagements ({invitations.length + engagements.length})
            </button>

            <button
              onClick={() => setActiveTab("profile")}
              className={`rounded-xl px-4 py-2.5 transition ${
                activeTab === "profile"
                  ? "bg-white/20 text-white shadow-sm"
                  : "bg-white/[0.04] text-white/60 hover:text-white"
              }`}
            >
              🏢 Brand Profile
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Body */}
      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        {/* ======================================================== */}
        {/* TAB 1: MY BRIEFS */}
        {/* ======================================================== */}
        {activeTab === "briefs" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black">Active Creative Briefs</h3>
                <p className="text-xs text-white/50">
                  Select a brief to view matching AI creators and rank scores.
                </p>
              </div>
              <button
                onClick={() => setActiveTab("create-brief")}
                className="rounded-xl border border-white/15 bg-white/[0.05] px-4 py-2 text-xs font-bold text-white hover:bg-white/[0.1]"
              >
                + Create Brief
              </button>
            </div>

            {briefs.length === 0 ? (
              <div className="rounded-[2rem] border border-white/10 bg-black/30 p-12 text-center">
                <p className="text-3xl">📝</p>
                <h4 className="mt-3 text-xl font-black">No briefs created yet</h4>
                <p className="mt-1 text-xs text-white/50">
                  Use the AI Brief Builder to convert campaign ideas into structured briefs.
                </p>
                <button
                  onClick={() => setActiveTab("create-brief")}
                  className="mt-5 rounded-xl px-5 py-2.5 text-xs font-black text-white"
                  style={{ background: theme.gradient }}
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
                      className={`flex flex-col justify-between rounded-[2rem] border p-6 transition ${
                        isSelected
                          ? "border-emerald-500/50 bg-emerald-500/[0.06] shadow-xl"
                          : "border-white/10 bg-black/35 hover:border-white/20"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="rounded-lg bg-white/[0.08] px-2.5 py-1 text-[11px] font-bold text-white/80">
                            {brief.contentType}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              brief.commercialUse
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-white/[0.05] text-white/40"
                            }`}
                          >
                            {brief.commercialUse ? "⚡ Commercial Use" : "Personal"}
                          </span>
                        </div>

                        <h4 className="mt-3 text-xl font-black text-white">
                          {brief.campaignName}
                        </h4>
                        <p className="mt-2 text-xs leading-5 text-white/60 line-clamp-2">
                          {brief.requirements}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-1.5 text-[10px] font-bold text-white/50">
                          <span className="rounded bg-white/[0.03] px-2 py-0.5">
                            📐 {brief.aspectRatio}
                          </span>
                          <span className="rounded bg-white/[0.03] px-2 py-0.5">
                            🎯 {brief.targetAudience}
                          </span>
                          <span className="rounded bg-white/[0.03] px-2 py-0.5">
                            📱 {brief.platform}
                          </span>
                        </div>
                      </div>

                      <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                        <button
                          onClick={() => {
                            setSelectedBrief(brief);
                            setActiveTab("matches");
                          }}
                          className="rounded-xl px-4 py-2 text-xs font-black text-white transition hover:scale-105"
                          style={{ background: theme.gradient }}
                        >
                          View Creator Matches →
                        </button>
                        <span className="text-xs font-bold text-white/40">
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
        {/* TAB 2: AI-ASSISTED BRIEF BUILDER */}
        {/* ======================================================== */}
        {activeTab === "create-brief" && (
          <div className="space-y-8">
            {/* Step 1: Natural Language Prompt Input */}
            <div className="rounded-[2.4rem] border border-white/10 bg-[#08060d] p-6 md:p-8 backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 text-sm font-black">
                  AI
                </span>
                <div>
                  <h3 className="text-xl font-black">AI Brief Assistant</h3>
                  <p className="text-xs text-white/50">
                    Describe your campaign in natural language — our AI converts it into structured marketplace parameters.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. I need a futuristic 30-second Instagram reel for our new running shoe targeting Gen Z. It should feel energetic and cinematic and we need commercial rights."
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-white/10 bg-black/40 px-4 py-3.5 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-white/30"
                />

                {/* Quick Preset Ideas */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-white/40 font-bold">Try example:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setAiPrompt(
                        "I need a futuristic 30-second Instagram reel for our new running shoe targeting Gen Z. It should feel energetic and cinematic and we need commercial rights."
                      )
                    }
                    className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-white/70 hover:bg-white/[0.08]"
                  >
                    👟 Futuristic Running Shoe Reel
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setAiPrompt(
                        "Create a dark luxury 45-second cinematic trailer for a digital perfume launch. Dramatic chromatic lighting and high-fashion aesthetic in 16:9 4K."
                      )
                    }
                    className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-white/70 hover:bg-white/[0.08]"
                  >
                    ✨ Luxury Fragrance Trailer
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setAiPrompt(
                        "Need a 15-second hyperreal automotive concept reveal showing an autonomous sports car in rain with neon reflections for YouTube Ads."
                      )
                    }
                    className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-white/70 hover:bg-white/[0.08]"
                  >
                    🏎️ Autonomous Car Teaser
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={handleGenerateBriefWithAI}
                    disabled={isGeneratingBrief}
                    className="rounded-2xl px-6 py-3.5 text-xs font-black text-white transition hover:scale-[1.02] disabled:opacity-50"
                    style={{ background: theme.gradient }}
                  >
                    {isGeneratingBrief ? "Structuring Brief with AI..." : "⚡ Generate Structured Brief"}
                  </button>
                  {aiNotice && (
                    <span className="text-xs font-bold text-emerald-300">
                      {aiNotice}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Step 2: Editable Structured Brief Form */}
            <form
              onSubmit={handleSaveBrief}
              className="rounded-[2.4rem] border border-white/10 bg-black/35 p-6 md:p-8 backdrop-blur-xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h4 className="text-lg font-black text-white">
                    Review &amp; Edit Structured Brief
                  </h4>
                  <p className="text-xs text-white/50">
                    Verify the generated campaign parameters before saving and matching creators.
                  </p>
                </div>
                <span className="rounded-full bg-white/[0.08] px-3 py-1 text-xs font-bold text-white/80">
                  Ready to Publish
                </span>
              </div>

              <div className="mt-6 space-y-4 text-xs font-bold">
                {/* Campaign Name */}
                <div>
                  <label className="text-white/60">Campaign Name *</label>
                  <input
                    value={briefForm.campaignName}
                    onChange={(e) =>
                      setBriefForm({ ...briefForm, campaignName: e.target.value })
                    }
                    required
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-bold text-white outline-none focus:border-white/30"
                  />
                </div>

                {/* Content Type & Platform */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-white/60">Content Type *</label>
                    <select
                      value={briefForm.contentType}
                      onChange={(e) =>
                        setBriefForm({ ...briefForm, contentType: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 text-xs font-bold text-white outline-none focus:border-white/30"
                    >
                      <option value="Short-form Video (Reels/TikTok)">Short-form Video (Reels/TikTok)</option>
                      <option value="Brand Commercials">Brand Commercials</option>
                      <option value="Cinematic Trailers">Cinematic Trailers</option>
                      <option value="Product Visualizations">Product Visualizations</option>
                      <option value="Music Videos">Music Videos</option>
                      <option value="Concept Art & Posters">Concept Art & Posters</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-white/60">Distribution Platform</label>
                    <input
                      value={briefForm.platform}
                      onChange={(e) =>
                        setBriefForm({ ...briefForm, platform: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-xs font-bold text-white outline-none focus:border-white/30"
                    />
                  </div>
                </div>

                {/* Aspect Ratio & Target Audience */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-white/60">Aspect Ratio / Deliverable Format</label>
                    <select
                      value={briefForm.aspectRatio}
                      onChange={(e) =>
                        setBriefForm({ ...briefForm, aspectRatio: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 text-xs font-bold text-white outline-none focus:border-white/30"
                    >
                      <option value="9:16 Vertical (Reels/Shorts)">9:16 Vertical (Reels/Shorts)</option>
                      <option value="16:9 Landscape (YouTube/TV)">16:9 Landscape (YouTube/TV)</option>
                      <option value="1:1 Square (Instagram)">1:1 Square (Instagram)</option>
                      <option value="4K UHD">4K UHD Cinema</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-white/60">Target Audience</label>
                    <input
                      value={briefForm.targetAudience}
                      onChange={(e) =>
                        setBriefForm({ ...briefForm, targetAudience: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-xs font-bold text-white outline-none focus:border-white/30"
                    />
                  </div>
                </div>

                {/* Visual Style Tags */}
                <div>
                  <label className="text-white/60">Visual Style &amp; Mood (comma-separated)</label>
                  <input
                    value={briefForm.styleString}
                    onChange={(e) =>
                      setBriefForm({ ...briefForm, styleString: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-xs font-bold text-white outline-none focus:border-white/30"
                  />
                </div>

                {/* Campaign Requirements */}
                <div>
                  <label className="text-white/60">Detailed Creative Requirements *</label>
                  <textarea
                    value={briefForm.requirements}
                    onChange={(e) =>
                      setBriefForm({ ...briefForm, requirements: e.target.value })
                    }
                    rows={3}
                    required
                    className="mt-1 w-full resize-none rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-xs font-bold text-white outline-none focus:border-white/30"
                  />
                </div>

                {/* Deliverables */}
                <div>
                  <label className="text-white/60">Deliverable List (comma-separated)</label>
                  <input
                    value={briefForm.deliverablesString}
                    onChange={(e) =>
                      setBriefForm({ ...briefForm, deliverablesString: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-xs font-bold text-white outline-none focus:border-white/30"
                  />
                </div>

                {/* Commercial Use Toggle */}
                <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <p className="text-sm font-bold text-white">
                        Full Commercial Use Rights Required
                      </p>
                      <p className="text-xs text-white/45">
                        Only rank creators who grant commercial advertising and monetization clearance.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={briefForm.commercialUse}
                      onChange={(e) =>
                        setBriefForm({ ...briefForm, commercialUse: e.target.checked })
                      }
                      className="h-5 w-5 accent-emerald-500 rounded"
                    />
                  </label>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={isSavingBrief}
                  className="mt-4 w-full rounded-2xl py-4 text-sm font-black text-white transition hover:scale-[1.01]"
                  style={{
                    background: theme.gradient,
                    boxShadow: `0 0 45px ${theme.glow}`,
                  }}
                >
                  {isSavingBrief ? "Publishing Brief..." : "Save Brief & Find Matching Creators →"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: CREATOR MATCHES & RANKING */}
        {/* ======================================================== */}
        {activeTab === "matches" && (
          <div className="space-y-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-2xl font-black">
                  AI Creator Matches
                </h3>
                <p className="text-xs text-white/50">
                  Ranked for brief:{" "}
                  <strong className="text-white">
                    {selectedBrief?.campaignName || "Active Brief"}
                  </strong>
                </p>
              </div>

              {/* Brief Selector Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40">Switch Brief:</span>
                <select
                  value={selectedBrief?.id || ""}
                  onChange={(e) => {
                    const b = briefs.find((x) => x.id === e.target.value);
                    if (b) setSelectedBrief(b);
                  }}
                  className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-bold text-white outline-none"
                >
                  {briefs.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.campaignName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {matchedResults.length === 0 ? (
              <div className="py-12 text-center text-xs font-bold text-white/40">
                Calculating creator matches...
              </div>
            ) : (
              <div className="space-y-4">
                {matchedResults.map((result, idx) => {
                  const { creator, overallScore, factorScores, explanation } = result;
                  const isTopMatch = idx === 0;

                  return (
                    <div
                      key={creator.username}
                      className={`overflow-hidden rounded-[2.2rem] border p-6 backdrop-blur-xl transition ${
                        isTopMatch
                          ? "border-emerald-500/40 bg-emerald-500/[0.04] shadow-2xl"
                          : "border-white/10 bg-black/40 hover:border-white/20"
                      }`}
                    >
                      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        {/* Creator Header */}
                        <div className="flex items-start gap-4">
                          <div
                            className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl p-[2px]"
                            style={{ background: theme.gradient }}
                          >
                            <div className="flex h-full w-full items-center justify-center rounded-[0.9rem] bg-[#121217] text-2xl font-black">
                              {creator.profilePhoto ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={creator.profilePhoto}
                                  alt={creator.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                creator.name.charAt(0)
                              )}
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/${creator.username}`}
                                className="text-xl font-black text-white hover:underline"
                              >
                                {creator.name}
                              </Link>
                              {creator.verified && (
                                <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                                  ✓ Verified
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-bold text-white/50">
                              @{creator.username} · {creator.specialization}
                            </p>
                            <p className="mt-1 text-xs text-white/65 line-clamp-1">
                              {creator.bio}
                            </p>
                          </div>
                        </div>

                        {/* Match Score Display */}
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span
                              className="text-3xl font-black"
                              style={{
                                color: overallScore >= 90 ? "#6ee7b7" : "#fcd34d",
                              }}
                            >
                              {overallScore}%
                            </span>
                            <p className="text-[10px] font-black uppercase tracking-wider text-white/40">
                              Match Score
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <Link
                              href={`/${creator.username}`}
                              className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/[0.1]"
                            >
                              Profile
                            </Link>
                            <button
                              onClick={() => {
                                setInvitingCreator(creator);
                                setInviteMessage(
                                  `Hi ${creator.name}, we loved your portfolio and would like to invite you to our brief "${selectedBrief?.campaignName}".`
                                );
                              }}
                              className="rounded-xl px-4 py-2.5 text-xs font-black text-white transition hover:scale-105"
                              style={{ background: theme.gradient }}
                            >
                              Invite Creator
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Factor Scores Breakdown */}
                      <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 sm:grid-cols-4 lg:grid-cols-7 text-[11px]">
                        <div className="rounded-lg bg-white/[0.03] p-2 text-center">
                          <span className="text-white/40">Content Type</span>
                          <p className="font-bold text-white">{factorScores.contentType}%</p>
                        </div>
                        <div className="rounded-lg bg-white/[0.03] p-2 text-center">
                          <span className="text-white/40">Skills</span>
                          <p className="font-bold text-white">{factorScores.skills}%</p>
                        </div>
                        <div className="rounded-lg bg-white/[0.03] p-2 text-center">
                          <span className="text-white/40">Tools</span>
                          <p className="font-bold text-white">{factorScores.tools}%</p>
                        </div>
                        <div className="rounded-lg bg-white/[0.03] p-2 text-center">
                          <span className="text-white/40">Specialization</span>
                          <p className="font-bold text-white">{factorScores.specialization}%</p>
                        </div>
                        <div className="rounded-lg bg-white/[0.03] p-2 text-center">
                          <span className="text-white/40">Format</span>
                          <p className="font-bold text-white">{factorScores.format}%</p>
                        </div>
                        <div className="rounded-lg bg-white/[0.03] p-2 text-center">
                          <span className="text-white/40">Commercial</span>
                          <p className="font-bold text-white">{factorScores.commercialUse}%</p>
                        </div>
                        <div className="rounded-lg bg-white/[0.03] p-2 text-center">
                          <span className="text-white/40">Portfolio</span>
                          <p className="font-bold text-white">{factorScores.portfolioRelevance}%</p>
                        </div>
                      </div>

                      {/* Natural-Language "Why This Creator?" */}
                      <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-3 text-xs leading-5 text-emerald-300">
                        <span className="font-black text-emerald-200">
                          Why this creator?{" "}
                        </span>
                        {explanation}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: ENGAGEMENTS & INVITATIONS */}
        {/* ======================================================== */}
        {activeTab === "engagements" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-black">Campaign Engagements &amp; Invitations</h3>
              <p className="text-xs text-white/50">
                Track invitation responses and ongoing creative productions.
              </p>
            </div>

            {invitations.length === 0 && engagements.length === 0 ? (
              <div className="rounded-[2rem] border border-white/10 bg-black/30 p-12 text-center">
                <p className="text-3xl">🤝</p>
                <h4 className="mt-3 text-xl font-black">No active invitations yet</h4>
                <p className="mt-1 text-xs text-white/50">
                  Invite top-ranked creators from your brief matches to kick off campaigns.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/35 p-5 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-white/[0.08] px-2.5 py-0.5 text-xs font-bold text-white">
                          Creator: @{inv.creatorUsername}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            inv.status === "Accepted"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : inv.status === "Declined"
                              ? "bg-rose-500/20 text-rose-300"
                              : "bg-amber-500/20 text-amber-300"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </div>
                      <h4 className="mt-2 text-lg font-black text-white">
                        {inv.campaignTitle}
                      </h4>
                      <p className="mt-1 text-xs text-white/60">
                        &quot;{inv.message}&quot;
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <Link
                        href={`/${inv.creatorUsername}`}
                        className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-bold text-white hover:bg-white/[0.1]"
                      >
                        Inspect Profile
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: BRAND PROFILE */}
        {/* ======================================================== */}
        {activeTab === "profile" && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h3 className="text-2xl font-black">Brand / Agency Profile</h3>
              <p className="text-xs text-white/50">
                Information shared with AI creators when reviewing brief invitations.
              </p>
            </div>

            <form
              onSubmit={handleSaveBrandProfile}
              className="rounded-[2rem] border border-white/10 bg-black/35 p-6 space-y-4 text-xs font-bold"
            >
              <div>
                <label className="text-white/60">Brand Name</label>
                <input
                  value={brand.name}
                  onChange={(e) => setBrand({ ...brand, name: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-bold text-white outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="text-white/60">Industry / Sector</label>
                <input
                  value={brand.industry}
                  onChange={(e) => setBrand({ ...brand, industry: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-bold text-white outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="text-white/60">Brand Description</label>
                <textarea
                  value={brand.description}
                  onChange={(e) => setBrand({ ...brand, description: e.target.value })}
                  rows={3}
                  className="mt-1 w-full resize-none rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-bold text-white outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="text-white/60">Contact Email</label>
                <input
                  value={brand.contactEmail || ""}
                  onChange={(e) => setBrand({ ...brand, contactEmail: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-bold text-white outline-none focus:border-white/30"
                />
              </div>

              <button
                type="submit"
                className="mt-2 rounded-xl px-6 py-3 text-xs font-black text-white"
                style={{ background: theme.gradient }}
              >
                Save Brand Profile
              </button>
            </form>
          </div>
        )}
      </section>

      {/* Invite Modal */}
      {invitingCreator && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-5 backdrop-blur-xl">
          <div
            className="w-full max-w-lg rounded-[2.2rem] border border-white/10 bg-[#0b0810] p-6 shadow-2xl"
            style={{ boxShadow: `0 0 80px ${theme.glow}` }}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-white/40">
                  Marketplace Invitation
                </p>
                <h4 className="mt-1 text-2xl font-black text-white">
                  Invite {invitingCreator.name}
                </h4>
                <p className="text-xs text-white/50">
                  Brief: {selectedBrief?.campaignName || "Campaign Collaboration"}
                </p>
              </div>
              <button
                onClick={() => setInvitingCreator(null)}
                className="text-lg font-bold text-white/40 hover:text-white"
              >
                ✕
              </button>
            </div>

            {inviteFeedback ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center text-xs font-bold text-emerald-300">
                {inviteFeedback}
              </div>
            ) : (
              <form onSubmit={handleSendInvitation} className="space-y-4 text-xs font-bold">
                <div>
                  <label className="text-white/60">Invitation Message</label>
                  <textarea
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    rows={4}
                    required
                    className="mt-1 w-full resize-none rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-xs font-bold text-white outline-none focus:border-white/30"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isSendingInvite}
                    className="flex-1 rounded-xl py-3.5 text-xs font-black text-white"
                    style={{ background: theme.gradient }}
                  >
                    {isSendingInvite ? "Sending..." : "Confirm & Send Invitation"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvitingCreator(null)}
                    className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3.5 text-xs font-bold text-white/60"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
