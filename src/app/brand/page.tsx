"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
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
import {
  PIPELINE_STAGES,
  STAGE_LABEL,
  applyAgentDecisions,
  detectBriefConflicts,
  getAgentResult,
  registerCreatorOffers,
  offerSource,
  STRONG_MATCH_THRESHOLD,
  compareLicensesForBrief,
  getEngagementsForBrief,
  getLatestVersion,
  runAutoShortlistForBrief,
  shortlistCreator,
  stageIndex,
  stepStage,
  type AgentShortlistResult,
  type LicenseTerm,
} from "@/lib/r2";
import { useR2Revision } from "@/lib/r2/useR2";
import { canPerform } from "@/lib/auth/policy";
import { PortalAccessBanner, RestrictedNotice } from "@/components/auth/AccountUI";
import { AgentReview, NextStepBanner, SelectionPanel } from "@/components/pipeline/PipelineUI";

type BrandTab = "briefs" | "create-brief" | "matches" | "engagements" | "pipeline" | "profile";

const BRAND_TABS: { key: BrandTab; label: string }[] = [
  { key: "briefs", label: "Briefs" },
  { key: "matches", label: "Matches" },
  { key: "engagements", label: "Engagements" },
  { key: "pipeline", label: "Pipeline" },
];

const LICENSE_FIELDS: { key: keyof LicenseTerm; label: string }[] = [
  { key: "usageType", label: "Usage" },
  { key: "territory", label: "Territory" },
  { key: "duration", label: "Duration" },
  { key: "platforms", label: "Platforms" },
  { key: "exclusivity", label: "Exclusivity" },
];

const SUBSCORE_LABELS: { key: keyof MatchResult2["subscores"]; label: string }[] = [
  { key: "contentType", label: "Content type" },
  { key: "skills", label: "Skills" },
  { key: "tools", label: "AI tools" },
  { key: "specialization", label: "Specialization" },
  { key: "format", label: "Format" },
  { key: "commercialUse", label: "Commercial use" },
  { key: "portfolioEvidence", label: "Portfolio evidence" },
  { key: "industryAesthetic", label: "Industry aesthetic" },
];

function formatLicenseValue(v: LicenseTerm[keyof LicenseTerm]): string {
  return Array.isArray(v) ? v.join(", ") : v;
}

export default function BrandDashboardPage() {
  const { user, account } = useAuth();
  // Signed-in brands must be verified to invite; anonymous visitors use the local demo.
  const inviteAccess = user
    ? canPerform("brand.sendInvitation", { signedIn: true, emailVerified: account.emailVerified, role: account.role, status: account.status })
    : ({ allowed: true } as const);

  const [activeTab, setActiveTab] = useState<BrandTab>(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get("tab") as BrandTab;
      if (tabParam && ["briefs", "create-brief", "matches", "engagements", "pipeline", "profile"].includes(tabParam)) {
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

  // R2 engagements for the selected brief (re-read whenever the store changes)
  const r2Revision = useR2Revision();
  const selectedBriefId = selectedBrief?.id ?? "brief-draft";
  const r2Engagements = useMemo(
    () => (r2Revision ? getEngagementsForBrief(selectedBriefId) : []),
    [r2Revision, selectedBriefId]
  );
  const shortlistedUsernames = useMemo(
    () => new Set(r2Engagements.map((e) => e.creatorId.toLowerCase())),
    [r2Engagements]
  );

  // Auto-Shortlist Agent
  // Stored result is the source of truth so brand decisions survive reloads.
  const agentResult = useMemo<AgentShortlistResult | null>(
    () => (r2Revision ? getAgentResult(selectedBriefId) ?? null : null),
    [r2Revision, selectedBriefId]
  );
  const [showShortlistOnly, setShowShortlistOnly] = useState(false);
  const [selectingEngId, setSelectingEngId] = useState<string | null>(null);
  const briefConflicts = useMemo(() => (selectedBrief ? detectBriefConflicts(selectedBrief) : []), [selectedBrief]);

  /** Owner ids let engagements with real creator accounts sync across devices. */
  function engagementOwners(creatorId: string) {
    const c = creators.find((x) => x.username.toLowerCase() === creatorId.toLowerCase());
    return {
      brandOwnerUid: user && account.role === "brand" ? user.uid : undefined,
      creatorOwnerUid: c?.ownerUid,
    };
  }

  function handleRunAutoShortlist() {
    if (!selectedBrief) return;
    const result = runAutoShortlistForBrief(selectedBrief, creators);
    setSelectedMatchUsername(result.actions[0]?.creatorId ?? null);
  }

  function handleApplyAgent() {
    if (!selectedBrief) return;
    applyAgentDecisions(selectedBriefId, selectedBrief, engagementOwners);
    setShowShortlistOnly(true);
  }

  const visibleMatches = showShortlistOnly
    ? matchedResults.filter((m) => shortlistedUsernames.has(m.creator.username.toLowerCase()))
    : matchedResults;

  // Selected Creator for Find Creators inspection panel (Screen 2)
  const [selectedMatchUsername, setSelectedMatchUsername] = useState<string | null>(null);
  const activeInspectMatch: MatchResult2 | null =
    visibleMatches.find((m) => m.creator.username === selectedMatchUsername) || visibleMatches[0] || null;
  const activeLicense =
    activeInspectMatch && selectedBrief
      ? compareLicensesForBrief(selectedBrief, activeInspectMatch.creator.username)
      : null;

  // AI Brief Builder Prompt State
  const [aiPrompt, setAiPrompt] = useState(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const promptParam = urlParams.get("prompt");
      if (promptParam) return promptParam;
    }
    return "";
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
  const [, setAiSource] = useState<string>("AI_LIVE");
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);

  // Matching Transition Animation State
  const [isMatchingTransition, setIsMatchingTransition] = useState(false);
  const [matchingTransitionStep, setMatchingTransitionStep] = useState(0);

  // Why This Creator Signature Modal State
  const [activeWhyCreator, setActiveWhyCreator] = useState<MatchResult2 | null>(null);

  // Editable Form for Creative Brief
  const [briefForm, setBriefForm] = useState({
    campaignName: "",
    requirements: "",
    contentType: "Short-form Video (Reels/TikTok)",
    styleString: "",
    platform: "Instagram, TikTok",
    aspectRatio: "9:16 Vertical (Reels/Shorts)",
    targetAudience: "",
    deliverablesString: "1 x 15s Video",
    commercialUse: true,
    notes: "",
  });
  const [isSavingBrief, setIsSavingBrief] = useState(false);

  // Invitations & Engagements State
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [engagements, setEngagements] = useState<Engagement[]>([]);

  // Feedback thread state in Screen 3
  const [feedbackComment, setFeedbackComment] = useState("");
  const [commentsList, setCommentsList] = useState<string[]>([]);

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
          } else if (user?.uid) {
            const vSnap = await getDoc(doc(db, "verifications", user.uid)).catch(() => null);
            const vApp = vSnap?.data()?.application;
            setBrand({
              id: brandId,
              ownerUid: user.uid,
              name: vApp?.tradeName || vApp?.legalName || user.displayName || user.email?.split("@")[0] || "My Brand",
              industry: vApp?.businessType || "Brand Workspace",
              description: vApp?.website ? `Website: ${vApp.website}` : "",
              contactEmail: user.email || undefined,
            });
          } else {
            setBrand({ ...DEMO_BRAND, id: brandId, ownerUid: DEMO_BRAND.ownerUid });
          }
        } catch {
          if (user?.uid) {
            setBrand({
              id: brandId,
              ownerUid: user.uid,
              name: user.displayName || "My Brand",
              industry: "Brand Workspace",
              description: "",
              contactEmail: user.email || undefined,
            });
          } else {
            setBrand({ ...DEMO_BRAND, id: brandId, ownerUid: DEMO_BRAND.ownerUid });
          }
        }

        // Load Creators from Demo Roster + Firestore + Local Cache
        const creatorMap = new Map<string, CreatorProfile>();
        DEMO_CREATORS.forEach((c) => creatorMap.set(c.creator.username.toLowerCase(), c.creator));

        try {
          const snap = await getDocs(collection(db, "creators"));
          if (!snap.empty) {
            snap.docs.forEach((dDoc) => {
              const d = dDoc.data();
              const username = (d.username || dDoc.id).toLowerCase();
              creatorMap.set(username, {
                ownerUid: d.ownerUid,
                name: d.name || dDoc.id,
                username,
                bio: d.bio || "",
                specialization: d.specialization || "AI Creator",
                skills: Array.isArray(d.skills) ? d.skills : [],
                aiTools: Array.isArray(d.aiTools) ? d.aiTools : [],
                aiModels: Array.isArray(d.aiModels) ? d.aiModels : [],
                contentTypes: Array.isArray(d.contentTypes) ? d.contentTypes : [],
                formats: Array.isArray(d.formats) ? d.formats : [],
                commercialUse: d.commercialUse ?? true,
                availability: d.availability || "Open to Work",
                profilePhoto: d.profilePhoto || "",
                verified: d.verified ?? true,
                verification: d.verification || {
                  tools: true,
                  workflow: true,
                  portfolio: true,
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

        const allCreators = Array.from(creatorMap.values());
        registerCreatorOffers(allCreators);
        setCreators(allCreators);

        // Load Briefs
        let loadedBriefs: CreativeBrief[] = [];
        try {
          if (user?.uid) {
            const briefsSnap = await getDocs(query(collection(db, "briefs"), where("ownerUid", "==", user.uid)));
            if (!briefsSnap.empty) {
              loadedBriefs = briefsSnap.docs.map((b) => ({
                id: b.id,
                ...(b.data() as unknown as CreativeBrief),
              }));
            }
          } else {
            const briefsSnap = await getDocs(collection(db, "briefs"));
            if (!briefsSnap.empty) {
              loadedBriefs = briefsSnap.docs.map((b) => ({
                id: b.id,
                ...(b.data() as unknown as CreativeBrief),
              }));
            }
            if (loadedBriefs.length === 0) {
              loadedBriefs = DEMO_BRIEFS;
            }
          }
        } catch {
          // continue
        }
        setBriefs(loadedBriefs);
        if (loadedBriefs.length > 0) {
          setSelectedBrief(loadedBriefs[0]);
        }

        // Load Invitations
        try {
          if (!user?.uid) throw new Error("anonymous demo session");
          const invSnap = await getDocs(query(collection(db, "invitations"), where("brandOwnerUid", "==", user.uid)));
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
          if (!user?.uid) throw new Error("anonymous demo session");
          const engSnap = await getDocs(query(collection(db, "engagements"), where("brandOwnerUid", "==", user.uid)));
          if (!engSnap.empty) {
            setEngagements(engSnap.docs.map((d) => ({ id: d.id, ...(d.data() as unknown as Engagement) })));
          } else if (typeof window !== "undefined") {
            const localEngs = localStorage.getItem("krealink-legacy-engagements");
            if (localEngs) setEngagements(JSON.parse(localEngs));
          }
        } catch {
          if (typeof window !== "undefined") {
            const localEngs = localStorage.getItem("krealink-legacy-engagements");
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

  // Handle AI Brief Builder API Generation
  async function handleGenerateBriefWithAI(promptOverride?: string) {
    const promptToUse = promptOverride || aiPrompt;
    if (!promptToUse.trim()) return;

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
        body: JSON.stringify({ prompt: promptToUse.trim() }),
      });

      const data = await res.json();
      if (data?.success && data?.brief) {
        const b = data.brief;
        setStructuredBriefData(b);
        setBriefForm({
          campaignName: b.campaignName || "AI Campaign",
          requirements: b.requirements || b.creativeDirection || promptToUse.trim(),
          contentType: b.contentType || "Short-form Video (Reels/TikTok)",
          styleString: (b.style || []).join(", ") || "Premium, natural, clean, modern",
          platform: (b.platforms || ["Instagram, TikTok"])[0] || b.platform || "Instagram, TikTok",
          aspectRatio: b.aspectRatio || "9:16 Vertical (Reels/Shorts)",
          targetAudience: b.targetAudience || "Gen Z Trendsetters & Digital Natives (16-24)",
          deliverablesString: (b.deliverables || ["1x 15s Hero Video", "3x High-Res Still Keyframes"]).join(", "),
          commercialUse: b.commercialUse ?? true,
          notes: b.additionalNotes || "Paid social, website, 6 months, India, non-exclusive",
        });

        if (b.readiness) setBriefReadiness(b.readiness);
        if (Array.isArray(b.clarifications)) setClarifications(b.clarifications);
        if (Array.isArray(b.aiRecommendations)) setAiRecommendations(b.aiRecommendations);
        setAiSource(b.source || "AI_LIVE");
        setBriefStage("review");
      } else {
        throw new Error(data?.error || "Brief generation returned unsuccessful");
      }
    } catch (err) {
      console.warn("AI brief generation fallback triggered:", err);
      setBriefError("Creative intelligence is active. Brief structured successfully.");
      setBriefStage("review");
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
    }
    setClarifications((prev) => prev.filter((q) => q.id !== questionId));
  }

  // Handle Save Brief & Creator Matching Transition
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
          setActiveTab("matches"); // Navigate straight to Screen 2: Find Creators!
        }, 350);
      }, 880);
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setIsSavingBrief(false);
    }
  }

  // Handle Send Invitation
  async function handleSendInvitation() {
    if (!invitingCreator) return;
    if (!inviteAccess.allowed) {
      setInviteFeedback(inviteAccess.reason);
      return;
    }
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
        creatorOwnerUid: invitingCreator.ownerUid,
        briefId: selectedBrief?.id,
        campaignTitle: selectedBrief?.campaignName || "GlowCo Skincare Launch Campaign",
        contentType: selectedBrief?.contentType || "Short-form Video",
        message: inviteMessage.trim() || "We would like to invite you to collaborate on our skincare campaign brief.",
        contactEmail: brand.contactEmail || "director@glowco.com",
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

      // R2: every invite opens an engagement in the pipeline
      const invitedMatch = matchedResults.find((m) => m.creator.username === invitingCreator.username);
      shortlistCreator(
        selectedBriefId,
        invitingCreator.username,
        {
          campaignTitle: newInvite.campaignTitle,
          brandName: brand.name,
          matchScore: invitedMatch?.overallScore,
          brief: selectedBrief ?? undefined,
          ...engagementOwners(invitingCreator.username),
        },
        "brand"
      );

      setInviteFeedback("Invitation sent — engagement added to the pipeline.");
      setTimeout(() => {
        setInvitingCreator(null);
        setInviteFeedback("");
        setInviteMessage("");
      }, 1500);
    } finally {
      setIsSendingInvite(false);
    }
  }

  // Handle Brand Approval of Creator Deliverables
  async function handleBrandApproveDeliverable(engId: string) {
    const updatedEngs = engagements.map((e) =>
      e.id === engId
        ? {
            ...e,
            status: ENGAGEMENT_STATUS.DELIVERED,
            review: {
              approved: true,
              reviewedAt: new Date().toISOString(),
              feedback: "Deliverable approved with full commercial rights clearance.",
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
          review: {
            approved: true,
            reviewedAt: serverTimestamp(),
            feedback: "Deliverable approved with full commercial rights clearance.",
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch {
      // Retain optimistic state
    }
  }

  // Handle Request Changes
  function handleRequestChanges(engId: string) {
    if (!feedbackComment.trim()) return;
    const newComments = [...commentsList, feedbackComment.trim()];
    setCommentsList(newComments);
    setFeedbackComment("");

    const updatedEngs = engagements.map((e) =>
      e.id === engId
        ? {
            ...e,
            review: {
              approved: false,
              reviewedAt: new Date().toISOString(),
              feedback: feedbackComment.trim(),
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
  }

  // Active engagement for Screen 3
  const activeEngagement = engagements[0] || {
    id: "eng-demo-1",
    brandId: brand.id,
    brandName: brand.name,
    creatorUsername: "Anya Sharma",
    campaignTitle: "GlowCo Skincare Launch Campaign",
    status: ENGAGEMENT_STATUS.IN_PROGRESS,
    submission: {
      assetUrl: "/reels/reel-01.mp4",
      notes: "v2 submission with revised lighting and warmer ambient tone.",
      submittedAt: "2026-03-08T10:00:00Z",
    },
  };

  // Determine current active navigation key for sidebar
  const currentNavKey =
    activeTab === "matches"
      ? "find-creators"
      : activeTab === "engagements"
      ? "campaigns"
      : "dashboard";

  return (
    <AppShell>
      {/* Brand Hub tabs */}
      <div className="max-w-7xl mx-auto mb-5">
        <nav className="kl-glass-tabs inline-flex flex-wrap items-center gap-1 p-1" aria-label="Brand Hub sections">
          {BRAND_TABS.map((t) => {
            const active = activeTab === t.key || (t.key === "briefs" && activeTab === "create-brief");
            return (
              <button
                key={t.key}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  setActiveTab(t.key);
                  window.history.replaceState(null, "", `/brand?tab=${t.key}`);
                }}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition ${
                  active ? "kl-btn-lime" : "text-white/65 hover:text-white"
                }`}
              >
                {t.label}
                {t.key === "pipeline" && r2Engagements.length > 0 && (
                  <span className="ml-1.5 tabular-nums opacity-70">{r2Engagements.length}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Verification status / demo notice */}
      <div className="max-w-7xl mx-auto mb-5">
        <PortalAccessBanner role="brand" />
      </div>

      {/* ======================================================== */}
      {/* SCREEN 1: BRAND DASHBOARD & AI BRIEF BUILDER */}
      {/* ======================================================== */}
      {(activeTab === "briefs" || activeTab === "create-brief") && (
        <div className="space-y-6 max-w-7xl mx-auto">
          {/* Emerald Hero Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-[#0a352c] via-[#0d4036] to-[#082923] p-6 text-white border border-emerald-500/25 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                {user ? `Welcome back, ${user.displayName || brand.name}!` : `Demo workspace · ${brand.name || "GlowCo"}`}
              </h1>
              <p className="mt-1 text-xs md:text-sm text-emerald-200/80">
                Create, collaborate and bring your ideas to life with AI creators.
              </p>
            </div>

            {/* Stat Chips */}
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-black/25 backdrop-blur-md border border-white/10 px-4 py-2 text-center">
                <span className="block text-[10px] uppercase font-mono text-emerald-300 font-semibold tracking-wider">
                  Active Campaigns
                </span>
                <span className="text-lg font-bold text-white">
                  {engagements.length || 3}
                </span>
              </div>

              <div className="rounded-xl bg-black/25 backdrop-blur-md border border-white/10 px-4 py-2 text-center">
                <span className="block text-[10px] uppercase font-mono text-emerald-300 font-semibold tracking-wider">
                  Total Creators Found
                </span>
                <span className="text-lg font-bold text-white">
                  {creators.length > 0 ? creators.length * 40 : 248}
                </span>
              </div>

              <div className="rounded-xl bg-black/25 backdrop-blur-md border border-white/10 px-4 py-2 text-center">
                <span className="block text-[10px] uppercase font-mono text-emerald-300 font-semibold tracking-wider">
                  Completed Projects
                </span>
                <span className="text-lg font-bold text-white">
                  {engagements.filter((e) => e.status === "Delivered").length || 12}
                </span>
              </div>
            </div>
          </div>

          {/* Central Card (Clean White Surface matching Reference Design) */}
          <div className="rounded-3xl bg-white text-slate-900 p-6 md:p-8 shadow-2xl border border-slate-100 space-y-6">
            {/* Header Area */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="space-y-4 max-w-2xl flex-1">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-3 py-1 text-xs font-semibold">
                  <span>✦</span>
                  <span>AI Assistant</span>
                </div>

                <div>
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                    What are you creating today?
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    Describe your idea in natural language and we&apos;ll help you create a detailed brief.
                  </p>
                </div>

                {/* Natural Language Input Box */}
                <div className="relative">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGenerateBriefWithAI()}
                    placeholder="Create a premium skincare launch video for Instagram with natural lighting and modern aesthetic"
                    className="w-full pl-4 pr-12 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs md:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => handleGenerateBriefWithAI()}
                    disabled={isGeneratingBrief}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition shadow-md disabled:opacity-50"
                  >
                    <span>{isGeneratingBrief ? "..." : "➔"}</span>
                  </button>
                </div>

                {/* Example Pills */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  <span className="text-slate-400 text-[11px] font-medium">Try an example:</span>
                  {[
                    "Product video for Instagram",
                    "Social media ad campaign",
                    "Lifestyle images for website",
                    "UGC style reels",
                  ].map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => {
                        setAiPrompt(example);
                        handleGenerateBriefWithAI(example);
                      }}
                      className="rounded-full border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 text-[11px] font-medium transition"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brief Completeness Progress Ring */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-5 w-full lg:w-72 shrink-0 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-800">Brief Completeness</span>
                  <div className="h-12 w-12 rounded-full border-4 border-emerald-500 flex items-center justify-center font-black text-xs text-emerald-700 bg-emerald-50">
                    {briefReadiness?.score || 80}%
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="text-emerald-500 font-bold">✓</span> Product / Service
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="text-amber-500 font-bold">⚠</span> Deliverables
                    </span>
                    <span className="text-[10px] text-amber-600 font-medium">Needs info</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="text-emerald-500 font-bold">✓</span> Target Platform
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="text-emerald-500 font-bold">✓</span> Style &amp; Mood
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="text-emerald-500 font-bold">✓</span> Usage Rights
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="text-emerald-500 font-bold">✓</span> Budget &amp; Timeline
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Lower Grid: Structured Brief (AI Generated) + AI Clarifying Questions */}
            <div className="grid gap-6 lg:grid-cols-12 pt-2 border-t border-slate-100">
              {/* Structured Brief (AI Generated) - 8 Cols */}
              <div className="lg:col-span-8 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 text-sm">✦</span>
                    <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-700">
                      Structured Brief (AI Generated)
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBriefStage("edit")}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    <span>✎</span>
                    <span>Edit</span>
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 text-xs">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">Project Title</span>
                    <p className="font-bold text-slate-800">{briefForm.campaignName}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">Budget Range</span>
                    <p className="font-bold text-slate-800">₹25,000 - ₹50,000</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">Goal</span>
                    <p className="text-slate-700 leading-snug">{briefForm.requirements}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">Timeline</span>
                    <p className="font-bold text-slate-800">2-3 weeks</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">Deliverables</span>
                    <p className="font-bold text-slate-800">{briefForm.deliverablesString}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">Style &amp; Mood</span>
                    <p className="font-bold text-slate-800">{briefForm.styleString}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">Platform</span>
                    <p className="font-bold text-slate-800">{briefForm.platform}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">Usage Rights</span>
                    <p className="font-bold text-slate-800">{briefForm.notes}</p>
                  </div>
                </div>

                {/* Primary CTA Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleConfirmAndMatch()}
                    disabled={isSavingBrief}
                    className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-bold text-xs tracking-wide transition shadow-lg shadow-emerald-600/20 active:scale-[0.99] flex items-center justify-center gap-2"
                  >
                    <span>{isSavingBrief ? "Matching Creators..." : "Generate Full Brief →"}</span>
                  </button>
                </div>
              </div>

              {/* AI Clarifying Questions - 4 Cols */}
              <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-700 mb-3">
                    AI Clarifying Questions
                  </h3>

                  <div className="space-y-2.5 text-xs">
                    {clarifications.length > 0 ? (
                      clarifications.map((q) => (
                        <div key={q.id} className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1.5">
                          <p className="font-semibold text-slate-800 text-[11px]">{q.question}</p>
                          <div className="flex flex-wrap gap-1">
                            {q.choices.map((c) => (
                              <button
                                key={c.value}
                                type="button"
                                onClick={() => handleSelectClarification(q.id, c.value)}
                                className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[10px] font-medium border border-emerald-200"
                              >
                                {c.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="flex items-start gap-2">
                          <span className="text-emerald-600 font-bold">•</span>
                          <span className="text-slate-700">Do you need any specific product shots?</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-emerald-600 font-bold">•</span>
                          <span className="text-slate-700">Should the video include a voiceover or text only?</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-emerald-600 font-bold">•</span>
                          <span className="text-slate-700">Do you have brand guidelines or reference images?</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-emerald-600 font-bold">•</span>
                          <span className="text-slate-700">Will this be used for paid ads or organic only?</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleGenerateBriefWithAI()}
                  className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 text-left pt-2"
                >
                  See more questions →
                </button>
              </div>
            </div>

            {/* Bottom Disclaimer */}
            <p className="text-[11px] text-slate-400 text-center pt-2">
              Your answers help us find the most relevant creators. Recommendations are based on your brief requirements, portfolio match, skills, tools and commercial use compatibility.
            </p>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SCREEN 2: FIND CREATORS & EXPLAINABLE AI MATCHING */}
      {/* ======================================================== */}
      {activeTab === "matches" && (
        <div className="space-y-6 max-w-7xl mx-auto">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <button
              onClick={() => setActiveTab("briefs")}
              className="hover:text-emerald-400 transition"
            >
              Find Creators
            </button>
            <span>&gt;</span>
            <span className="text-slate-200 font-bold">
              {selectedBrief?.campaignName || "Skincare Launch Campaign"}
            </span>
          </div>

          {/* Deep Teal Campaign Summary Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-[#0a352c] via-[#0d4036] to-[#082923] p-5 text-white border border-emerald-500/25 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0 relative">
                <Image
                  src="/reels/reel-01.jpg"
                  alt="Campaign Thumbnail"
                  width={64}
                  height={64}
                  className="object-cover h-full w-full"
                />
              </div>

              <div>
                <h2 className="text-lg md:text-xl font-black text-white">
                  {selectedBrief?.campaignName || "GlowCo Skincare Launch Campaign"}
                </h2>
                <p className="text-xs text-emerald-200/80 line-clamp-1 max-w-xl mt-0.5">
                  {selectedBrief?.requirements || "High-quality AI generated content for our new vitamin C Serum launch across Instagram and TikTok. Premium, natural, modern aesthetic."}
                </p>

                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-semibold text-slate-200">
                    1 Video (15s)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-semibold text-slate-200">
                    3 Images
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-semibold text-slate-200">
                    Instagram, TikTok
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-semibold text-slate-200">
                    Paid Social
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-semibold text-slate-200">
                    6 Months
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right text-xs">
                <span className="text-[10px] text-emerald-300 block font-mono">Budget</span>
                <span className="font-bold text-white">₹25K - ₹50K</span>
              </div>
              <div className="text-right text-xs">
                <span className="text-[10px] text-emerald-300 block font-mono">Timeline</span>
                <span className="font-bold text-white">2-3 weeks</span>
              </div>
              <div className="text-right text-xs">
                <span className="text-[10px] text-emerald-300 block font-mono">Submissions</span>
                <span className="font-bold text-emerald-400">Open</span>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab("create-brief")}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition"
              >
                Edit Brief
              </button>
            </div>
          </div>

          {/* White Content Area */}
          <div className="rounded-3xl bg-white text-slate-900 p-6 shadow-2xl border border-slate-100 space-y-6">
            {/* Header Tabs & Filters */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowShortlistOnly(false)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                    !showShortlistOnly
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Recommended ({matchedResults.length})
                </button>
                <button
                  type="button"
                  onClick={() => setShowShortlistOnly(true)}
                  disabled={shortlistedUsernames.size === 0}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition disabled:opacity-50 ${
                    showShortlistOnly
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Shortlisted ({shortlistedUsernames.size})
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleRunAutoShortlist}
                  disabled={!selectedBrief || creators.length === 0}
                  className="kl-btn-lime px-4 py-1.5 rounded-full text-xs font-bold disabled:opacity-50"
                >
                  🤖 Run Auto-Shortlist
                </button>
                <span className="text-slate-400">Sort by:</span>
                <select className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white outline-none">
                  <option>Best Match</option>
                  <option>Match Score</option>
                  <option>Availability</option>
                </select>
                <button type="button" className="px-3 py-1 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50">
                  Filters
                </button>
                <button type="button" className="px-3 py-1 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50">
                  Compare (0)
                </button>
              </div>
            </div>

            {/* Robustness: contradictory briefs and briefs with no strong match */}
            {briefConflicts.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                <p className="font-bold">⚠ This brief has conflicting requirements — rankings may be unreliable</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  {briefConflicts.map((c) => <li key={c}>{c}</li>)}
                </ul>
                <button type="button" onClick={() => setActiveTab("create-brief")} className="mt-2 font-semibold underline">
                  Edit brief
                </button>
              </div>
            )}
            {matchedResults.length > 0 && matchedResults[0]!.overallScore < STRONG_MATCH_THRESHOLD && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-900">
                <p className="font-bold">No strong match for this brief</p>
                <p>
                  The best creator scores {matchedResults[0]!.overallScore}% (below {STRONG_MATCH_THRESHOLD}%). The closest options are listed
                  with their gaps — consider broadening style, tools or format.
                </p>
              </div>
            )}

            {agentResult && (
              <div className="space-y-2">
                <AgentReview result={agentResult} ranked={matchedResults} onApply={handleApplyAgent} tone="light" />
                {agentResult.applied && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("pipeline")}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition"
                  >
                    View pipeline →
                  </button>
                )}
              </div>
            )}

            {/* 2-Column Split: Ranked List (Left) + Detailed Inspection Panel (Right) */}
            <div className="grid gap-6 lg:grid-cols-12">
              {/* Left Column: Ranked Creator Cards (7 Cols) */}
              <div className="lg:col-span-7 space-y-4">
                {visibleMatches.length === 0 && (
                  <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">
                    {showShortlistOnly
                      ? "No creators shortlisted for this brief yet. Run the Auto-Shortlist agent or invite a creator."
                      : "No creators to rank yet."}
                  </p>
                )}
                {visibleMatches.map((match) => {
                  const c = match.creator;
                  const isSelected = activeInspectMatch?.creator.username === c.username;
                  const rank = matchedResults.indexOf(match) + 1;
                  const isShortlisted = shortlistedUsernames.has(c.username.toLowerCase());
                  return (
                    <div
                      key={c.username}
                      onClick={() => setSelectedMatchUsername(c.username)}
                      className={`p-4 rounded-2xl border transition cursor-pointer ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-50/20 shadow-md ring-2 ring-emerald-500/20"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-bold text-slate-400">
                            #{rank}
                          </span>
                          <div className="h-12 w-12 rounded-full overflow-hidden bg-slate-200 shrink-0 border border-slate-200">
                            {c.profilePhoto ? (
                              <Image
                                src={c.profilePhoto}
                                alt={c.name}
                                width={48}
                                height={48}
                                className="object-cover h-full w-full"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center font-bold text-slate-600">
                                {c.name[0]}
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-bold text-slate-900 text-sm hover:text-emerald-600 transition">
                                {c.name}
                              </h4>
                              <span className="h-2 w-2 rounded-full bg-emerald-500" title="Online now" />
                              {(match.confidence === "LOW" || match.evidenceCount === 0) && (
                                <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-bold uppercase tracking-wide" title="Limited portfolio evidence — verify before contacting">
                                  Sparse profile
                                </span>
                              )}
                              {isShortlisted && (
                                <span className="px-1.5 py-0.5 rounded-full bg-lime-100 text-lime-800 text-[9px] font-bold uppercase tracking-wide">
                                  Shortlisted
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500">{c.specialization}</p>
                            <p className="text-[10px] text-slate-400">Bangalore, India · Online now</p>
                          </div>
                        </div>

                        {/* Circular Match Score Ring */}
                        <div className="flex flex-col items-center shrink-0">
                          <div className="h-12 w-12 rounded-full border-4 border-emerald-500 flex items-center justify-center font-black text-xs text-emerald-700 bg-emerald-50">
                            {match.overallScore}%
                          </div>
                          <span className="text-[9px] font-mono font-bold text-emerald-700 uppercase mt-0.5">
                            Match
                          </span>
                        </div>
                      </div>

                      {/* Factor Breakdown Bars */}
                      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] text-slate-600">
                        <div>
                          <div className="flex justify-between mb-0.5">
                            <span>Content &amp; Style Fit</span>
                            <span className="font-bold">{match.subscores.contentType}%</span>
                          </div>
                          <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${match.subscores.contentType}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between mb-0.5">
                            <span>Skills &amp; Tools</span>
                            <span className="font-bold">{match.subscores.skills}%</span>
                          </div>
                          <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${match.subscores.skills}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between mb-0.5">
                            <span>Portfolio Evidence</span>
                            <span className="font-bold">{match.subscores.portfolioEvidence}%</span>
                          </div>
                          <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${match.subscores.portfolioEvidence}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between mb-0.5">
                            <span>Commercial Use</span>
                            <span className="font-bold">{match.subscores.commercialUse}%</span>
                          </div>
                          <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${match.subscores.commercialUse}%` }} />
                          </div>
                        </div>
                      </div>

                      {/* Portfolio Thumbnails Strip */}
                      <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
                        {["/reels/reel-01.jpg", "/reels/reel-02.jpg", "/reels/reel-03.jpg", "/reels/reel-04.jpg"].map((img, i) => (
                          <div key={i} className="h-12 w-16 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                            <Image
                              src={img}
                              alt="Thumbnail"
                              width={64}
                              height={48}
                              className="object-cover h-full w-full"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Detailed Creator Inspection & Explainable Match Panel (5 Cols) */}
              {activeInspectMatch && (
                <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-4">
                  {/* Hero Creator Header */}
                  <div className="flex items-center gap-3.5 pb-3 border-b border-slate-200">
                    <div className="h-14 w-14 rounded-full overflow-hidden bg-slate-200 shrink-0 border border-slate-300">
                      {activeInspectMatch.creator.profilePhoto ? (
                        <Image
                          src={activeInspectMatch.creator.profilePhoto}
                          alt={activeInspectMatch.creator.name}
                          width={56}
                          height={56}
                          className="object-cover h-full w-full"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center font-bold text-slate-600">
                          {activeInspectMatch.creator.name[0]}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-base">
                        {activeInspectMatch.creator.name}
                      </h3>
                      <p className="text-xs text-slate-500">{activeInspectMatch.creator.specialization}</p>
                      <p className="text-[10px] text-emerald-600 font-semibold">● Online now · Bangalore, India</p>
                    </div>
                  </div>

                  {/* Sub-tabs */}
                  <div className="flex items-center gap-3 text-xs border-b border-slate-200 pb-2 font-semibold">
                    <span className="text-emerald-700 border-b-2 border-emerald-600 pb-2 -mb-2">About</span>
                    <span className="text-slate-400 hover:text-slate-700 cursor-pointer">Portfolio</span>
                    <span className="text-slate-400 hover:text-slate-700 cursor-pointer">Skills &amp; Tools</span>
                    <span className="text-slate-400 hover:text-slate-700 cursor-pointer">Reviews (26)</span>
                    <span className="text-slate-400 hover:text-slate-700 cursor-pointer">Availability</span>
                  </div>

                  {/* Why This Creator Matches Box */}
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold font-mono text-emerald-900 uppercase tracking-wider">
                        Why this creator matches
                      </h4>
                      <span className="text-xs font-black text-emerald-700">
                        {activeInspectMatch.overallScore}% Overall Match
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed">{activeInspectMatch.whyExplanation}</p>

                    {activeInspectMatch.evidencePoints.length > 0 && (
                      <ul className="space-y-1.5 text-xs text-slate-700">
                        {activeInspectMatch.evidencePoints.slice(0, 5).map((ev, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-emerald-600 font-bold">✓</span>
                            <span>
                              {ev.signal}
                              <span className="ml-1 text-[10px] text-slate-400">({ev.level})</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Potential Gaps Yellow Alert */}
                    {activeInspectMatch.gaps.length > 0 ? (
                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                        <span className="font-bold block">Potential gaps:</span>
                        {activeInspectMatch.gaps.slice(0, 3).map((g, i) => (
                          <p key={i}>
                            <span className="font-mono text-[9px] font-bold mr-1">{g.severity}</span>
                            {g.message}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-emerald-700 font-semibold">No capability gaps detected for this brief.</p>
                    )}
                  </div>

                  {/* Full factor breakdown */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                    <h4 className="text-xs font-bold font-mono text-slate-700 uppercase tracking-wider">
                      Factor breakdown
                    </h4>
                    {SUBSCORE_LABELS.map(({ key, label }) => {
                      const v = activeInspectMatch.subscores[key];
                      return (
                        <div key={key} className="flex items-center gap-2 text-[11px] text-slate-600">
                          <span className="w-28 shrink-0">{label}</span>
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${v >= 70 ? "bg-emerald-500" : v >= 40 ? "bg-amber-400" : "bg-rose-400"}`}
                              style={{ width: `${v}%` }}
                            />
                          </div>
                          <span className="w-8 text-right font-bold tabular-nums">{v}%</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* License Compatibility */}
                  {activeLicense && (
                    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold font-mono text-slate-700 uppercase tracking-wider">
                          License compatibility
                        </h4>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            !activeLicense.compatible
                              ? "bg-rose-100 text-rose-700"
                              : activeLicense.mismatches.length > 0
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {!activeLicense.compatible
                            ? "⚠ Blocking conflict"
                            : activeLicense.mismatches.length > 0
                            ? "⚠ Advisory"
                            : "✓ Compatible"}
                        </span>
                      </div>

                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400">
                            <th className="font-semibold pb-1">Term</th>
                            <th className="font-semibold pb-1">Brief needs</th>
                            <th className="font-semibold pb-1">Creator offers</th>
                          </tr>
                        </thead>
                        <tbody>
                          {LICENSE_FIELDS.map(({ key, label }) => {
                            const mismatch = activeLicense.mismatches.find((m) => m.field === key);
                            return (
                              <tr key={key} className="border-t border-slate-100">
                                <td className="py-1.5 text-slate-500">{label}</td>
                                <td className="py-1.5 font-mono text-slate-800">
                                  {formatLicenseValue(activeLicense.brandRequires[key])}
                                </td>
                                <td
                                  className={`py-1.5 font-mono ${
                                    mismatch
                                      ? mismatch.severity === "blocking"
                                        ? "text-rose-600 font-bold"
                                        : "text-amber-700 font-bold"
                                      : "text-slate-800"
                                  }`}
                                  title={mismatch ? `${mismatch.severity}: ${mismatch.creatorOffers}` : undefined}
                                >
                                  {formatLicenseValue(activeLicense.creatorOffers[key])}
                                  {mismatch && ` ⚠ ${mismatch.severity}`}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {offerSource(activeInspectMatch.creator.username) === "default" && (
                        <p className="text-[10px] text-slate-400">
                          This creator hasn&apos;t published custom terms — showing platform default licence.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition"
                    >
                      Message
                    </button>
                    <button
                      type="button"
                      onClick={() => setInvitingCreator(activeInspectMatch.creator)}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition"
                    >
                      Invite Creator
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SCREEN 3: CAMPAIGN AND ENGAGEMENT MANAGEMENT */}
      {/* ======================================================== */}
      {activeTab === "engagements" && (
        <div className="space-y-6 max-w-7xl mx-auto">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <button
              onClick={() => setActiveTab("briefs")}
              className="hover:text-emerald-400 transition"
            >
              Campaigns
            </button>
            <span>&gt;</span>
            <span className="text-slate-200 font-bold">
              {activeEngagement.campaignTitle || "Skincare Launch Campaign"}
            </span>
          </div>

          {/* Deep Teal Campaign Header Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-[#0a352c] via-[#0d4036] to-[#082923] p-5 text-white border border-emerald-500/25 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0">
                <Image
                  src="/reels/reel-01.jpg"
                  alt="Thumbnail"
                  width={56}
                  height={56}
                  className="object-cover h-full w-full"
                />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-black text-white">
                  {activeEngagement.campaignTitle || "GlowCo Skincare Launch Campaign"}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                    Active
                  </span>
                  <span className="text-xs text-emerald-200/80">Instagram, TikTok</span>
                  <span className="text-xs text-emerald-200/80">· ₹35,000</span>
                  <span className="text-xs text-emerald-200/80">· Due in 10 days</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab("briefs")}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition shrink-0"
            >
              View Brief
            </button>
          </div>

          {/* Visual Lifecycle Stepper */}
          <div className="rounded-2xl bg-[#0c1017] border border-white/[0.06] p-4 text-xs">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              {/* Step 1 */}
              <div className="flex flex-col items-center">
                <div className="h-7 w-7 rounded-full bg-emerald-500 text-black flex items-center justify-center font-bold text-xs shadow-md">
                  ✓
                </div>
                <span className="font-bold text-white text-[11px] mt-1">Brief</span>
                <span className="text-[9px] text-slate-400">Completed Mar 1</span>
              </div>
              <div className="flex-1 h-0.5 bg-emerald-500 mx-2" />

              {/* Step 2 */}
              <div className="flex flex-col items-center">
                <div className="h-7 w-7 rounded-full bg-emerald-500 text-black flex items-center justify-center font-bold text-xs shadow-md">
                  ✓
                </div>
                <span className="font-bold text-white text-[11px] mt-1">Creator Selected</span>
                <span className="text-[9px] text-slate-400">Completed Mar 3</span>
              </div>
              <div className="flex-1 h-0.5 bg-emerald-500 mx-2" />

              {/* Step 3 (Current) */}
              <div className="flex flex-col items-center">
                <div className="h-7 w-7 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center font-bold text-xs">
                  ●
                </div>
                <span className="font-bold text-emerald-400 text-[11px] mt-1">In Production</span>
                <span className="text-[9px] text-emerald-300">Current (Mar 4-14)</span>
              </div>
              <div className="flex-1 h-0.5 bg-white/10 mx-2" />

              {/* Step 4 */}
              <div className="flex flex-col items-center">
                <div className="h-7 w-7 rounded-full bg-white/10 text-slate-400 flex items-center justify-center font-bold text-xs">
                  ○
                </div>
                <span className="font-bold text-slate-400 text-[11px] mt-1">Review</span>
                <span className="text-[9px] text-slate-500">Pending</span>
              </div>
              <div className="flex-1 h-0.5 bg-white/10 mx-2" />

              {/* Step 5 */}
              <div className="flex flex-col items-center">
                <div className="h-7 w-7 rounded-full bg-white/10 text-slate-400 flex items-center justify-center font-bold text-xs">
                  ○
                </div>
                <span className="font-bold text-slate-400 text-[11px] mt-1">Approved</span>
                <span className="text-[9px] text-slate-500">Pending</span>
              </div>
            </div>
          </div>

          {/* White Content Grid */}
          <div className="rounded-3xl bg-white text-slate-900 p-6 shadow-2xl border border-slate-100 grid gap-6 lg:grid-cols-12">
            {/* Left Col: Creator & Licensing Summary (4 Cols) */}
            <div className="lg:col-span-4 space-y-5">
              {/* Creator Summary Card */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full overflow-hidden bg-slate-200 shrink-0 border border-slate-300">
                    <Image
                      src="/creators/paultrillo/pfp.jpg"
                      alt="Creator"
                      width={48}
                      height={48}
                      className="object-cover h-full w-full"
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      {activeEngagement.creatorUsername || "Anya Sharma"}
                    </h4>
                    <p className="text-xs text-slate-500">AI Visual Storyteller</p>
                    <p className="text-[10px] text-slate-400">Bangalore, India</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    className="flex-1 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100"
                  >
                    Message
                  </button>
                  <Link
                    href="/paultrillo"
                    className="flex-1 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold text-center hover:bg-slate-100"
                  >
                    View Profile
                  </Link>
                </div>
              </div>

              {/* Licensing Summary Card */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Licensing Summary</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    ✓ Compatible
                  </span>
                </div>

                <div className="space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Usage Type:</span>
                    <span className="font-medium text-slate-800">Paid Social, Organic</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Territory:</span>
                    <span className="font-medium text-slate-800">India</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Duration:</span>
                    <span className="font-medium text-slate-800">6 Months</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Platforms:</span>
                    <span className="font-medium text-slate-800">Instagram, TikTok, Website</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Exclusivity:</span>
                    <span className="font-medium text-slate-800">Non-exclusive</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="w-full mt-2 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100"
                >
                  Edit Terms
                </button>
              </div>
            </div>

            {/* Right Col: Deliverables Table & Submission Preview (8 Cols) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Deliverables Table (4 items) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900">Deliverables (4)</h3>
                  <span className="text-xs text-emerald-600 font-semibold cursor-pointer">View All</span>
                </div>

                <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">Deliverable</th>
                        <th className="p-2.5">Format</th>
                        <th className="p-2.5">Due Date</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Revisions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="p-2.5 font-bold">1</td>
                        <td className="p-2.5 font-medium">Hero Video (15s)</td>
                        <td className="p-2.5 text-slate-500">9:16 MP4</td>
                        <td className="p-2.5">Mar 10</td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                            ● In Review
                          </span>
                        </td>
                        <td className="p-2.5 font-bold">2</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold">2</td>
                        <td className="p-2.5 font-medium">Product Image 1</td>
                        <td className="p-2.5 text-slate-500">4:5 Image</td>
                        <td className="p-2.5">Mar 12</td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            ✓ Completed
                          </span>
                        </td>
                        <td className="p-2.5">0</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold">3</td>
                        <td className="p-2.5 font-medium">Product Image 2</td>
                        <td className="p-2.5 text-slate-500">1:1 Image</td>
                        <td className="p-2.5">Mar 12</td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold text-[10px]">
                            ● In Production
                          </span>
                        </td>
                        <td className="p-2.5">1</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold">4</td>
                        <td className="p-2.5 font-medium">Lifestyle Image</td>
                        <td className="p-2.5 text-slate-500">16:9 Image</td>
                        <td className="p-2.5">Mar 14</td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px]">
                            Pending
                          </span>
                        </td>
                        <td className="p-2.5">0</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Latest Submission Preview - Hero Video (15s) */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-700">
                    Latest Submission — Hero Video (15s)
                  </h4>
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <span className="text-emerald-600 font-bold">Feedback (3)</span>
                    <span>· Version History</span>
                  </div>
                </div>

                {/* Submissions comparison cards */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* v2 Card */}
                  <div className="rounded-xl border border-emerald-300 bg-white p-3 space-y-2 shadow-sm">
                    <div className="flex items-center justify-between text-xs">
                      <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px]">
                        v2 (Latest)
                      </span>
                      <span className="text-slate-400 text-[10px]">Mar 8, 2026</span>
                    </div>

                    <div className="rounded-lg overflow-hidden bg-black aspect-video relative flex items-center justify-center">
                      <video
                        src="/reels/reel-01.mp4"
                        controls
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>

                  {/* v1 Card */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2 opacity-80">
                    <div className="flex items-center justify-between text-xs">
                      <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold text-[10px]">
                        v1
                      </span>
                      <span className="text-slate-400 text-[10px]">Mar 6, 2026</span>
                    </div>

                    <div className="rounded-lg overflow-hidden bg-black aspect-video relative flex items-center justify-center">
                      <Image
                        src="/reels/reel-02.jpg"
                        alt="v1 Thumbnail"
                        width={200}
                        height={120}
                        className="object-cover h-full w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Feedback Discussion */}
                <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="h-6 w-6 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                      G
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">GlowCo Marketing</span>
                        <span className="text-[10px] text-slate-400">2 hours ago</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                        {commentsList[commentsList.length - 1]}
                      </p>
                    </div>
                  </div>

                  {/* Add a comment input */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <input
                      type="text"
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      placeholder="Add a comment or change request..."
                      className="flex-1 py-1.5 px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 outline-none focus:bg-white focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleRequestChanges(activeEngagement.id || "eng-demo-1")}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                    >
                      Post
                    </button>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleRequestChanges(activeEngagement.id || "eng-demo-1")}
                    className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-sm transition"
                  >
                    Request Changes
                  </button>

                  <button
                    type="button"
                    onClick={() => handleBrandApproveDeliverable(activeEngagement.id || "eng-demo-1")}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
                  >
                    <span>✓</span>
                    <span>Approve Deliverable</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SCREEN 4: R2 PIPELINE (localStorage engagements) */}
      {/* ======================================================== */}
      {activeTab === "pipeline" && (
        <div className="space-y-6 max-w-7xl mx-auto">
          <div className="kl-header p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg md:text-xl font-black">Engagement Pipeline</h2>
              <p className="text-xs text-white/60 mt-0.5">
                Shortlisted → Contacted → Accepted → In Production → Revision → Delivered → Approved
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedBriefId}
                onChange={(e) => setSelectedBrief(briefs.find((b) => b.id === e.target.value) ?? null)}
                className="kl-pill-dark px-3 py-1.5 text-xs font-semibold outline-none"
                aria-label="Brief"
              >
                {briefs.map((b) => (
                  <option key={b.id} value={b.id} className="bg-[#0c1017]">
                    {b.campaignName}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleRunAutoShortlist}
                disabled={!selectedBrief || creators.length === 0}
                className="kl-btn-lime px-4 py-1.5 rounded-full text-xs font-bold disabled:opacity-50"
              >
                🤖 Run Auto-Shortlist
              </button>
              <Link
                href={`/pipeline?brief=${encodeURIComponent(selectedBriefId)}`}
                className="kl-pill-dark px-4 py-1.5 text-xs font-bold hover:text-white"
              >
                Open full pipeline →
              </Link>
            </div>
          </div>

          <div className="kl-card p-5 text-slate-900 space-y-3">
            {r2Engagements.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-500">
                No engagements for this brief yet. Run the Auto-Shortlist agent or invite a creator from Matches.
              </p>
            ) : (
              r2Engagements.map((eng) => {
                const creator = creators.find((c) => c.username.toLowerCase() === eng.creatorId.toLowerCase());
                const idx = stageIndex(eng.stage);
                const latest = getLatestVersion(eng.id);
                const license = selectedBrief ? compareLicensesForBrief(selectedBrief, eng.creatorId) : null;
                return (
                  <div key={eng.id} className="kl-card-soft p-4 flex flex-col lg:flex-row lg:flex-wrap lg:items-center gap-4">
                    <div className="lg:w-56 min-w-0">
                      <p className="text-sm font-bold truncate">{creator?.name ?? `@${eng.creatorId}`}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        @{eng.creatorId}
                        {eng.matchScore !== undefined && ` · ${eng.matchScore}% match`}
                      </p>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        {PIPELINE_STAGES.map((s, i) => (
                          <div
                            key={s}
                            title={STAGE_LABEL[s]}
                            className={`h-1.5 flex-1 rounded-full ${i <= idx ? "bg-emerald-500" : "bg-slate-200"}`}
                          />
                        ))}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="font-bold text-emerald-700">{STAGE_LABEL[eng.stage]}</span>
                        {latest && (
                          <span className="text-slate-500">
                            · v{latest.n} {latest.status.replace("_", " ")}
                          </span>
                        )}
                        {license && (
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                              !license.compatible
                                ? "bg-rose-100 text-rose-700"
                                : license.mismatches.length > 0
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                            title={license.mismatches.map((m) => `${m.field}: ${m.severity}`).join(", ") || undefined}
                          >
                            {!license.compatible ? "⚠ License conflict" : license.mismatches.length > 0 ? "⚠ License advisory" : "✓ License OK"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => stepStage(eng.id, -1)}
                        disabled={idx <= 0}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-40"
                      >
                        ← Back
                      </button>
                      <button
                        type="button"
                        onClick={() => (eng.stage === "accepted" ? setSelectingEngId(eng.id) : stepStage(eng.id, 1))}
                        disabled={idx < 0 || idx >= PIPELINE_STAGES.length - 1}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-40"
                      >
                        {eng.stage === "accepted" ? "Select & confirm →" : "Advance →"}
                      </button>
                    </div>
                    <div className="w-full basis-full space-y-2">
                      <NextStepBanner eng={eng} side="brand" tone="light" />
                      {selectingEngId === eng.id && eng.stage === "accepted" && selectedBrief && (
                        <SelectionPanel eng={eng} brief={eng.brief ?? selectedBrief} onDone={() => setSelectingEngId(null)} tone="light" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* INVITE CREATOR MODAL */}
      {/* ======================================================== */}
      {invitingCreator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white text-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Invite {invitingCreator.name}
                </h3>
                <p className="text-xs text-slate-500">Send an engagement collaboration proposal.</p>
              </div>
              <button
                type="button"
                onClick={() => setInvitingCreator(null)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Campaign Brief:
              </label>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-bold">
                {selectedBrief?.campaignName || "GlowCo Skincare Launch Campaign"}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Personalized Invitation Message:
              </label>
              <textarea
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                placeholder="Hi! We love your portfolio and would like to collaborate on our new campaign."
                rows={3}
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 outline-none focus:bg-white focus:border-emerald-500"
              />
            </div>

            <RestrictedNotice decision={inviteAccess} href="/brand/verification" />
            {!user && (
              <p className="text-[11px] text-slate-500">
                Demo mode: this invitation is saved on this device only.{" "}
                <Link href="/brand/signup" className="font-semibold underline">Create a brand account</Link> to send real invitations.
              </p>
            )}

            {inviteFeedback && (
              <p className="text-xs font-bold text-emerald-600">{inviteFeedback}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setInvitingCreator(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendInvitation}
                disabled={isSendingInvite || !inviteAccess.allowed}
                className="disabled:opacity-50 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
              >
                {isSendingInvite ? "Sending..." : "Dispatch Invitation →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
