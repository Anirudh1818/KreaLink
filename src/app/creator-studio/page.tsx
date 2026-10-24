"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import {
  CreatorProfile,
  PortfolioItem,
  Invitation,
  Engagement,
  INVITATION_STATUS,
  ENGAGEMENT_STATUS,
} from "@/lib/types";
import { DEMO_CREATORS } from "@/lib/demoData";
import { ActiveEngagements, useActiveEngagementCount } from "./ActiveEngagements";
import { PortalAccessBanner } from "@/components/auth/AccountUI";
import { LicenseOfferForm } from "./LicenseOfferForm";
import { CreatorReviewsSection } from "@/components/reviews/CreatorReviewsSection";
import { registerCreatorOffers } from "@/lib/r2";

type StudioTab = "overview" | "current-projects" | "engagements" | "licensing" | "reviews" | "portfolio" | "skills" | "earnings";

export default function CreatorStudioPage() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<StudioTab>("current-projects");
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile>(
    DEMO_CREATORS[0].creator
  );
  const [, setPortfolioItems] = useState<PortfolioItem[]>(
    DEMO_CREATORS[0].portfolio
  );
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const activeEngagementCount = useActiveEngagementCount(creatorProfile.username);

  // Deliverable Submission State
  const [deliverableAssetUrl, setDeliverableAssetUrl] = useState("");
  const [deliverableNotes, setDeliverableNotes] = useState("");
  const [isCheckingDelivery, setIsCheckingDelivery] = useState(false);
  const [deliveryCheckDone, setDeliveryCheckDone] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Active sub-tab under project
  const [activeProjectSubTab, setActiveProjectSubTab] = useState<"deliverables" | "brief" | "messages" | "files" | "payments">("deliverables");

  // 1. Load creator document, portfolio, and invitations
  useEffect(() => {
    async function loadCreatorData() {
      try {
        let targetUser = "";
      if (user?.uid) {
        try {
          const q = query(collection(db, "creators"), where("ownerUid", "==", user.uid));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const cDoc = snap.docs[0];
            setCreatorProfile(cDoc.data() as CreatorProfile);
            targetUser = cDoc.id;
          } else {
            const uDoc = await getDoc(doc(db, "users", user.uid)).catch(() => null);
            const uData = uDoc?.data();
            const vDoc = await getDoc(doc(db, "verifications", user.uid)).catch(() => null);
            const vApp = vDoc?.data()?.application;
            const name = uData?.displayName || user.displayName || user.email?.split("@")[0] || "Creator";
            const username = uData?.creatorUsername || name.toLowerCase().replace(/[^a-z0-9_]/g, "_");
            const fallbackProfile: CreatorProfile = {
              ownerUid: user.uid,
              name,
              username,
              bio: vApp?.bio || "AI Content Creator",
              specialization: vApp?.specializations?.[0] || "AI Creator",
              skills: vApp?.specializations || ["Generative Video"],
              aiTools: vApp?.aiTools || ["Runway", "Midjourney"],
              aiModels: ["Claude", "GPT-4o"],
              contentTypes: vApp?.formats || ["Short-form Video (9:16)"],
              formats: vApp?.formats || ["9:16"],
              commercialUse: vApp?.offersCommercialLicense ?? true,
              availability: vApp?.availability === "open" ? "Open to Work" : "Limited Availability",
              profilePhoto: user.photoURL || "",
              verified: vDoc?.data()?.status === "verified",
              verification: {
                tools: true,
                workflow: true,
                portfolio: true,
              },
              status: "Active",
              theme: "flame",
            };
            setCreatorProfile(fallbackProfile);
            targetUser = username;
          }
          setPortfolioItems([]);
        } catch {
          // continue
        }
      } else {
        targetUser = "paultrillo";
        if (typeof window !== "undefined") {
          const urlParams = new URLSearchParams(window.location.search);
          const creatorQuery = urlParams.get("creator");
          const tabParam = urlParams.get("tab");
        if (tabParam === "engagements" || tabParam === "licensing" || tabParam === "reviews") setActiveTab(tabParam);
          const localStored =
            localStorage.getItem("krealink-current-creator") ||
            null;
          if (creatorQuery) targetUser = creatorQuery;
          else if (localStored) targetUser = localStored;
        }

        try {
          const creatorRef = doc(db, "creators", targetUser);
          const creatorSnap = await getDoc(creatorRef);

          if (creatorSnap.exists()) {
            const loaded = creatorSnap.data() as CreatorProfile;
            registerCreatorOffers([loaded]);
            setCreatorProfile(loaded);
          } else {
            const found = DEMO_CREATORS.find((c) => c.creator.username.toLowerCase() === targetUser.toLowerCase());
            if (found) {
              setCreatorProfile(found.creator);
              setPortfolioItems(found.portfolio);
            }
          }
        } catch {
          // continue
        }
      }

        // Load Invitations
        try {
          if (!user?.uid) throw new Error("anonymous demo session");
          const invSnap = await getDocs(query(collection(db, "invitations"), where("creatorOwnerUid", "==", user.uid)));
          if (!invSnap.empty) {
            setInvitations(invSnap.docs.map((d) => ({ id: d.id, ...(d.data() as unknown as Invitation) })));
          } else if (typeof window !== "undefined") {
            const localInvs = localStorage.getItem("krealink-invitations");
            if (localInvs) setInvitations(JSON.parse(localInvs));
          }
        } catch {
          if (typeof window !== "undefined") {
            const localInvs = localStorage.getItem("krealink-invitations");
            if (localInvs) setInvitations(JSON.parse(localInvs));
          }
        }

        // Load Engagements
        try {
          if (!user?.uid) throw new Error("anonymous demo session");
          const engSnap = await getDocs(query(collection(db, "engagements"), where("creatorOwnerUid", "==", user.uid)));
          if (!engSnap.empty) {
            setEngagements(engSnap.docs.map((d) => ({ id: d.id, ...(d.data() as unknown as Engagement) })));
          } else if (typeof window !== "undefined") {
            const localEngs = localStorage.getItem("krealink-legacy-engagements");
            if (localEngs) setEngagements(JSON.parse(localEngs));
          }
        } catch {
          if (typeof window !== "undefined") {
            const localEngs = localStorage.getItem("krealink-legacy-engagements");
            if (localEngs) setEngagements(JSON.parse(localEngs));
          }
        }
      } catch (err) {
        console.warn("Creator load note:", err);
      }
    }

    loadCreatorData();
  }, [user]);

  // Persona switcher for live demo presentations
  function handleSwitchDemoPersona(username: string) {
    const found = DEMO_CREATORS.find((c) => c.creator.username.toLowerCase() === username.toLowerCase());
    if (found) {
      setCreatorProfile(found.creator);
      setPortfolioItems(found.portfolio);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("krealink-current-creator", found.creator.username);
        } catch {
          // ignore
        }
      }
    }
  }

  // Handle Delivery Check trigger
  function handleRunDeliveryCheck() {
    setIsCheckingDelivery(true);
    setTimeout(() => {
      setIsCheckingDelivery(false);
      setDeliveryCheckDone(true);
    }, 600);
  }

  // Handle Creator Deliverable Submission
  async function handleSubmitDeliverable() {
    setIsSubmitting(true);
    const engId = engagements[0]?.id || "eng-demo-1";

    const updatedEngs = engagements.map((e) =>
      e.id === engId
        ? {
            ...e,
            status: ENGAGEMENT_STATUS.DELIVERED,
            submission: {
              assetUrl: deliverableAssetUrl,
              notes: deliverableNotes,
              submittedAt: new Date().toISOString(),
            },
          }
        : e
    );
    setEngagements(updatedEngs);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("krealink-legacy-engagements", JSON.stringify(updatedEngs));
      } catch {
        // ignore
      }
    }

    try {
      await setDoc(
        doc(db, "engagements", engId),
        {
          status: ENGAGEMENT_STATUS.DELIVERED,
          submission: {
            assetUrl: deliverableAssetUrl,
            notes: deliverableNotes,
            submittedAt: serverTimestamp(),
          },
          creatorOwnerUid: user?.uid || creatorProfile.ownerUid || "demo-creator-owner",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch {
      // Retain optimistic state
    } finally {
      setIsSubmitting(false);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Creator Studio Top Header Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-[#0a352c] via-[#0d4036] to-[#082923] p-5 text-white border border-emerald-500/25 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">
              Creator Studio
            </h1>
            <p className="mt-0.5 text-xs text-emerald-200/80">
              Create. Collaborate. Grow.
            </p>
          </div>

          {/* Persona Switcher Dropdown (demo presentation only) */}
          {!user && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-emerald-300">Demo Persona:</span>
              <select
                value={creatorProfile.username}
                onChange={(e) => handleSwitchDemoPersona(e.target.value)}
                className="rounded-xl border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-bold text-white outline-none cursor-pointer"
              >
                {DEMO_CREATORS.map((c) => (
                  <option key={c.creator.username} value={c.creator.username} className="bg-[#0c1017] text-white">
                    {c.creator.name} ({c.creator.specialization.slice(0, 24)})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <PortalAccessBanner role="creator" />

        {/* Studio Navigation Tabs */}
        <div className="flex items-center gap-3 border-b border-white/[0.08] pb-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-t-xl transition ${
              activeTab === "overview"
                ? "text-emerald-400 border-b-2 border-emerald-500 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("current-projects")}
            className={`px-4 py-2 rounded-t-xl transition ${
              activeTab === "current-projects"
                ? "text-emerald-400 border-b-2 border-emerald-500 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Current Projects ({engagements.length || 3})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("engagements")}
            className={`px-4 py-2 rounded-t-xl transition ${
              activeTab === "engagements"
                ? "text-emerald-400 border-b-2 border-emerald-500 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Active Engagements ({activeEngagementCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("licensing")}
            className={`px-4 py-2 rounded-t-xl transition ${
              activeTab === "licensing"
                ? "text-emerald-400 border-b-2 border-emerald-500 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Licensing
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("reviews")}
            className={`px-4 py-2 rounded-t-xl transition ${
              activeTab === "reviews"
                ? "text-emerald-400 border-b-2 border-emerald-500 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Reviews &amp; Ranking
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("portfolio")}
            className={`px-4 py-2 rounded-t-xl transition ${
              activeTab === "portfolio"
                ? "text-emerald-400 border-b-2 border-emerald-500 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Portfolio
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("skills")}
            className={`px-4 py-2 rounded-t-xl transition ${
              activeTab === "skills"
                ? "text-emerald-400 border-b-2 border-emerald-500 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Skills &amp; Tools
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("earnings")}
            className={`px-4 py-2 rounded-t-xl transition ${
              activeTab === "earnings"
                ? "text-emerald-400 border-b-2 border-emerald-500 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Earnings
          </button>
        </div>

        {activeTab === "reviews" ? (
          <CreatorReviewsSection username={creatorProfile.username} />
        ) : activeTab === "licensing" ? (
          <LicenseOfferForm key={creatorProfile.username} creatorUsername={creatorProfile.username} ownerUid={creatorProfile.ownerUid} />
        ) : activeTab === "engagements" ? (
          <ActiveEngagements creatorUsername={creatorProfile.username} />
        ) : (
        <>
        {/* Active Project Header Card */}
        <div className="rounded-2xl bg-[#0c1017] border border-white/[0.08] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0">
                <Image
                  src="/reels/reel-01.jpg"
                  alt="Thumbnail"
                  width={48}
                  height={48}
                  className="object-cover h-full w-full"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">
                    GlowCo Skincare Launch Campaign
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">
                    In Production
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Due in 10 days · 2 of 4 deliverables submitted
                </p>
              </div>
            </div>

            {/* Sub-tabs under Project */}
            <div className="flex items-center gap-2 text-xs font-medium">
              {(["deliverables", "brief", "messages", "files", "payments"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setActiveProjectSubTab(t)}
                  className={`px-3 py-1.5 rounded-lg capitalize transition ${
                    activeProjectSubTab === t
                      ? "bg-white/10 text-white font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Central Content Surface (Clean White Surface matching Screen 4) */}
        <div className="rounded-3xl bg-white text-slate-900 p-6 md:p-8 shadow-2xl border border-slate-100 space-y-6">
          {/* 3-Column Grid Layout: Upload (Left), AI Delivery Check (Middle), Activity & Status (Right) */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Column 1: Upload Deliverable Form (4 Cols) */}
            <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Upload Deliverable</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Upload your file or provide a URL (9:16)
                </p>

                {/* Drag and drop zone */}
                <div className="mt-3 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 text-center hover:border-emerald-500 hover:bg-emerald-50/20 transition cursor-pointer">
                  <span className="text-2xl block mb-1">☁</span>
                  <p className="text-xs font-bold text-slate-800">
                    Drop files here or click to upload
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Supports MP4, MOV, PNG, JPG (Max 2GB)
                  </p>
                </div>

                {/* URL Input */}
                <div className="mt-3 space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 block">
                    Or paste asset URL:
                  </label>
                  <input
                    type="text"
                    value={deliverableAssetUrl}
                    onChange={(e) => setDeliverableAssetUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Notes Input */}
                <div className="mt-3 space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 block">
                    Add a note for the brand (optional):
                  </label>
                  <textarea
                    rows={2}
                    value={deliverableNotes}
                    onChange={(e) => setDeliverableNotes(e.target.value)}
                    placeholder="E.g. Concept, changes made, or key highlights..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleRunDeliveryCheck}
                  disabled={isCheckingDelivery}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs tracking-wide transition shadow-md flex items-center justify-center gap-1.5"
                >
                  <span>{isCheckingDelivery ? "Checking Assets..." : "Upload & Run Delivery Check"}</span>
                </button>
              </div>
            </div>

            {/* Column 2: AI Delivery Check (4 Cols) */}
            <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">AI Delivery Check</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Checking your file against brief requirements...
                    </p>
                  </div>
                  <span className="text-emerald-600 font-bold text-xs">✦ AI</span>
                </div>

                {/* Asset File Card */}
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 flex items-center gap-3">
                  <div className="h-10 w-14 rounded-lg bg-black overflow-hidden relative shrink-0 flex items-center justify-center">
                    <Image
                      src="/reels/reel-01.jpg"
                      alt="Thumbnail"
                      width={56}
                      height={40}
                      className="object-cover h-full w-full"
                    />
                    <span className="absolute text-white text-xs">▶</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      skincare_ad_v2.mp4
                    </p>
                    <p className="text-[10px] text-slate-400">
                      12.4 MB · MP4 · 9:16 · 15s
                    </p>
                  </div>
                </div>

                {/* Checklist with Green Checkmarks */}
                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <span className="text-emerald-600 font-bold">✓</span> File format
                    </span>
                    <span className="text-emerald-700 font-semibold text-[11px]">MP4 (Supported)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <span className="text-emerald-600 font-bold">✓</span> Aspect ratio
                    </span>
                    <span className="text-emerald-700 font-semibold text-[11px]">9:16 (Matches brief)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <span className="text-emerald-600 font-bold">✓</span> Duration
                    </span>
                    <span className="text-emerald-700 font-semibold text-[11px]">15.0s (Within 15s limit)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <span className="text-emerald-600 font-bold">✓</span> Resolution
                    </span>
                    <span className="text-emerald-700 font-semibold text-[11px]">1080 x 1920 (Good quality)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <span className="text-emerald-600 font-bold">✓</span> File size
                    </span>
                    <span className="text-emerald-700 font-semibold text-[11px]">12.4 MB (OK)</span>
                  </div>
                </div>

                {/* Yellow Advisory Box */}
                <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[11px]">
                    <span>⚠</span>
                    <span>Audio level slightly low</span>
                  </div>
                  <p className="text-[10px] text-amber-700 leading-snug">
                    Consider increasing volume for better clarity.
                  </p>
                </div>
              </div>

              {/* Re-run Check Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleRunDeliveryCheck}
                  className="w-full py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold"
                >
                  ↻ Re-run Check
                </button>
              </div>
            </div>

            {/* Column 3: AI Activity & Submission Ready (4 Cols) */}
            <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">AI Activity</h4>
                <div className="mt-3 space-y-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">●</span>
                    <span>Analyzing file properties...</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">●</span>
                    <span>Checking against brief requirements...</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">●</span>
                    <span>Verifying commercial usage...</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-500 font-bold">●</span>
                    <span className="text-amber-800">Checking audio quality... (1 suggestion)</span>
                  </div>
                </div>
              </div>

              {/* Submission Ready Card */}
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50/50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 text-base font-bold">✓</span>
                  <h5 className="font-bold text-slate-900 text-xs">Submission Ready</h5>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Your file meets all key requirements. You can now submit for review.
                </p>

                {submitSuccess && (
                  <p className="text-xs font-bold text-emerald-700">
                    ✓ Successfully submitted for brand review!
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleSubmitDeliverable}
                  disabled={isSubmitting || !deliveryCheckDone}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs tracking-wide transition shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Submit for Review →"}
                </button>
              </div>
            </div>
          </div>

          {/* Bottom: Revision Timeline */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-700">
              Revision Timeline
            </h4>

            <div className="space-y-2.5">
              {/* v2 */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-12 rounded-lg bg-black overflow-hidden relative shrink-0">
                    <Image
                      src="/reels/reel-01.jpg"
                      alt="v2"
                      width={48}
                      height={36}
                      className="object-cover h-full w-full"
                    />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800">
                      v2 · Mar 8, 2026 - Updated lighting and color tone
                    </span>
                    <p className="text-[10px] text-slate-500">
                      Submissions received and pending brand final signoff.
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                  Reviewing
                </span>
              </div>

              {/* v1 */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between opacity-80">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-12 rounded-lg bg-black overflow-hidden relative shrink-0">
                    <Image
                      src="/reels/reel-02.jpg"
                      alt="v1"
                      width={48}
                      height={36}
                      className="object-cover h-full w-full"
                    />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800">
                      v1 · Mar 6, 2026 - Initial concept
                    </span>
                    <p className="text-[10px] text-slate-500">
                      Brand feedback: &quot;Please adjust lighting to warmer tone.&quot;
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                  Changes requested
                </span>
              </div>
            </div>
          </div>
        </div>
        </>
        )}
      </div>
    </AppShell>
  );
}
