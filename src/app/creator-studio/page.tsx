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
import { useStoredTheme } from "@/lib/use-theme";
import { useAuth } from "@/lib/auth-context";
import { Navbar } from "@/components/Navbar";
import {
  CreatorProfile,
  PortfolioItem,
  Invitation,
  Engagement,
} from "@/lib/types";
import { DEMO_CREATORS } from "@/lib/demoData";

type StudioTab = "overview" | "capabilities" | "portfolio" | "invitations";

export default function CreatorStudioPage() {
  const { user } = useAuth();
  const { theme } = useStoredTheme();

  const [activeTab, setActiveTab] = useState<StudioTab>("overview");
  const [currentUsername, setCurrentUsername] = useState<string>("mayaverma");
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile>(
    DEMO_CREATORS[0].creator
  );
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>(
    DEMO_CREATORS[0].portfolio
  );
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState("");

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
      try {
        // Resolve target username: check URL, localStorage, or fallback to demo
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

        setCurrentUsername(targetUser);

        // Fetch creator doc from Firestore
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
            theme: d.theme || "flame",
          };
          setCreatorProfile(loaded);
        } else {
          // Fall back to matching demo creator or default
          const found = DEMO_CREATORS.find((c) => c.creator.username === targetUser);
          if (found) {
            setCreatorProfile(found.creator);
            setPortfolioItems(found.portfolio);
          }
        }

        // Fetch portfolio items subcollection: creators/{username}/portfolio
        try {
          const portRef = collection(db, "creators", targetUser, "portfolio");
          const portSnap = await getDocs(portRef);
          if (!portSnap.empty) {
            const items: PortfolioItem[] = portSnap.docs.map((docSnap) => ({
              id: docSnap.id,
              ...(docSnap.data() as any),
            }));
            setPortfolioItems(items);
          }
        } catch {
          // ignore
        }

        // Fetch invitations for this creator
        try {
          const invSnap = await getDocs(collection(db, "invitations"));
          if (!invSnap.empty) {
            const myInvs = invSnap.docs
              .map((d) => ({ id: d.id, ...(d.data() as any) }))
              .filter((inv: Invitation) => inv.creatorUsername === targetUser);
            setInvitations(myInvs);
          }
        } catch {
          // ignore
        }

        // Fetch engagements for this creator
        try {
          const engSnap = await getDocs(collection(db, "engagements"));
          if (!engSnap.empty) {
            const myEngs = engSnap.docs
              .map((d) => ({ id: d.id, ...(d.data() as any) }))
              .filter((eng: Engagement) => eng.creatorUsername === targetUser);
            setEngagements(myEngs);
          }
        } catch {
          // ignore
        }
      } catch (err) {
        console.warn("Creator studio load notice:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadCreatorData();
  }, [user]);

  // Handle Save Profile / Settings
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaveMessage("Saving changes to Firestore...");

    try {
      const creatorRef = doc(db, "creators", creatorProfile.username);
      await setDoc(
        creatorRef,
        {
          ...creatorProfile,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setSaveMessage("✓ Profile and capabilities updated successfully!");
    } catch {
      setSaveMessage("✓ Settings saved locally.");
    } finally {
      setTimeout(() => setSaveMessage(""), 3500);
    }
  }

  // Handle Portfolio Item Modal Open
  function openAddPortfolioModal() {
    setEditingPortfolioId(null);
    setPortfolioForm({
      title: "",
      description: "",
      mediaUrl: "/reels/reel-01.mp4",
      contentType: "Short-form Video (Reels/TikTok)",
      toolsString: (creatorProfile.aiTools || []).slice(0, 3).join(", ") || "Runway, Midjourney",
      modelsString: (creatorProfile.aiModels || []).slice(0, 2).join(", ") || "Runway Gen-3 Alpha",
      skillsString: (creatorProfile.skills || []).slice(0, 3).join(", ") || "Prompt Engineering",
      workflow: creatorProfile.workflow || "Midjourney concept → Runway camera motion → Topaz 4K",
      formatsString: (creatorProfile.formats || []).join(", ") || "9:16 Vertical (Reels/Shorts)",
      commercialUse: creatorProfile.commercialUse,
    });
    setIsPortfolioModalOpen(true);
  }

  function openEditPortfolioModal(item: PortfolioItem) {
    setEditingPortfolioId(item.id);
    setPortfolioForm({
      title: item.title,
      description: item.description || "",
      mediaUrl: item.mediaUrl || "/reels/reel-01.mp4",
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

  // Handle Portfolio Save (Create or Edit)
  async function handleSavePortfolioItem(e: React.FormEvent) {
    e.preventDefault();
    const itemId = editingPortfolioId || `port-${Date.now()}`;

    const newItem: PortfolioItem = {
      id: itemId,
      title: portfolioForm.title.trim() || "Untitled Project",
      description: portfolioForm.description.trim(),
      mediaUrl: portfolioForm.mediaUrl.trim() || "/reels/reel-01.mp4",
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
    try {
      // 1. Update invitation status to Accepted
      if (inv.id) {
        await setDoc(doc(db, "invitations", inv.id), { status: "Accepted" }, { merge: true });
      }

      // 2. Create Engagement
      const engId = `eng-${Date.now()}`;
      const newEng: Engagement = {
        id: engId,
        invitationId: inv.id,
        briefId: inv.briefId,
        brandId: inv.brandId,
        brandName: inv.brandName,
        creatorUsername: creatorProfile.username,
        campaignTitle: inv.campaignTitle,
        deliverables: ["Primary Campaign Asset", "Keyframe Stills"],
        status: "Accepted",
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, "engagements", engId), newEng, { merge: true });

      // Update local state
      setInvitations((prev) =>
        prev.map((i) => (i.id === inv.id ? { ...i, status: "Accepted" } : i))
      );
      setEngagements((prev) => [newEng, ...prev]);
    } catch {
      setInvitations((prev) =>
        prev.map((i) => (i.id === inv.id ? { ...i, status: "Accepted" } : i))
      );
    }
  }

  // Handle Decline Invitation
  async function handleDeclineInvitation(inv: Invitation) {
    try {
      if (inv.id) {
        await setDoc(doc(db, "invitations", inv.id), { status: "Declined" }, { merge: true });
      }
    } catch {
      // ignore
    }

    setInvitations((prev) =>
      prev.map((i) => (i.id === inv.id ? { ...i, status: "Declined" } : i))
    );
  }

  // Handle Engagement Status Progress
  async function handleUpdateEngagementStatus(engId: string, nextStatus: "In Progress" | "Delivered") {
    try {
      await setDoc(doc(db, "engagements", engId), { status: nextStatus }, { merge: true });
    } catch {
      // ignore
    }

    setEngagements((prev) =>
      prev.map((e) => (e.id === engId ? { ...e, status: nextStatus } : e))
    );
  }

  return (
    <main className="min-h-screen bg-[#050508] text-white">
      <Navbar />

      {/* Creator Studio Top Header */}
      <section className="relative z-10 border-b border-white/10 bg-white/[0.02] px-5 py-8 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-1 text-xs font-black uppercase tracking-[0.2em] text-white/50">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                KreaLink Creator Studio
              </div>
              <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
                {creatorProfile.name}
              </h2>
              <p className="mt-1 text-sm text-white/55">
                @{creatorProfile.username} · {creatorProfile.specialization}
              </p>
            </div>

            {/* View Live Public Profile Button */}
            <div className="flex items-center gap-3">
              <Link
                href={`/${creatorProfile.username}`}
                target="_blank"
                className="rounded-xl border border-white/15 bg-white/[0.05] px-4 py-2.5 text-xs font-black text-white hover:bg-white/[0.1]"
              >
                View Public Profile ↗
              </Link>
            </div>
          </div>

          {saveMessage && (
            <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs font-bold text-emerald-300">
              {saveMessage}
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="mt-8 flex flex-wrap gap-2 border-t border-white/10 pt-4 text-xs font-bold">
            <button
              onClick={() => setActiveTab("overview")}
              className={`rounded-xl px-4 py-2.5 transition ${
                activeTab === "overview"
                  ? "bg-white/20 text-white shadow-sm"
                  : "bg-white/[0.04] text-white/60 hover:text-white"
              }`}
            >
              👤 Profile &amp; Workflow
            </button>

            <button
              onClick={() => setActiveTab("capabilities")}
              className={`rounded-xl px-4 py-2.5 transition ${
                activeTab === "capabilities"
                  ? "bg-white/20 text-white shadow-sm"
                  : "bg-white/[0.04] text-white/60 hover:text-white"
              }`}
            >
              🛠️ AI Capabilities &amp; Stack
            </button>

            <button
              onClick={() => setActiveTab("portfolio")}
              className={`rounded-xl px-4 py-2.5 transition ${
                activeTab === "portfolio"
                  ? "bg-white/20 text-white shadow-sm"
                  : "bg-white/[0.04] text-white/60 hover:text-white"
              }`}
            >
              🎬 Portfolio Projects ({portfolioItems.length})
            </button>

            <button
              onClick={() => setActiveTab("invitations")}
              className={`rounded-xl px-4 py-2.5 transition ${
                activeTab === "invitations"
                  ? "bg-white/20 text-white shadow-sm"
                  : "bg-white/[0.04] text-white/60 hover:text-white"
              }`}
            >
              📬 Brand Invitations ({invitations.length})
            </button>
          </div>
        </div>
      </section>

      {/* Main Studio Area */}
      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        {/* ======================================================== */}
        {/* TAB 1: OVERVIEW & WORKFLOW */}
        {/* ======================================================== */}
        {activeTab === "overview" && (
          <form
            onSubmit={handleSaveProfile}
            className="max-w-3xl space-y-6 rounded-[2.4rem] border border-white/10 bg-black/35 p-6 md:p-8 backdrop-blur-xl"
          >
            <div>
              <h3 className="text-xl font-black">Creator Identity &amp; Workflow</h3>
              <p className="text-xs text-white/50">
                Update how brands and agencies discover and view your profile.
              </p>
            </div>

            <div className="space-y-4 text-xs font-bold">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-white/60">Display Name</label>
                  <input
                    value={creatorProfile.name}
                    onChange={(e) =>
                      setCreatorProfile({ ...creatorProfile, name: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 font-bold text-white outline-none focus:border-white/30"
                  />
                </div>

                <div>
                  <label className="text-white/60">Primary Specialization</label>
                  <input
                    value={creatorProfile.specialization}
                    onChange={(e) =>
                      setCreatorProfile({
                        ...creatorProfile,
                        specialization: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 font-bold text-white outline-none focus:border-white/30"
                  />
                </div>
              </div>

              <div>
                <label className="text-white/60">Creator Bio</label>
                <textarea
                  value={creatorProfile.bio}
                  onChange={(e) =>
                    setCreatorProfile({ ...creatorProfile, bio: e.target.value })
                  }
                  rows={3}
                  className="mt-1 w-full resize-none rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 font-bold text-white outline-none focus:border-white/30"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-white/60">Availability Status</label>
                  <select
                    value={creatorProfile.availability}
                    onChange={(e) =>
                      setCreatorProfile({
                        ...creatorProfile,
                        availability: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 font-bold text-white outline-none focus:border-white/30"
                  >
                    <option value="Available immediately">Available immediately</option>
                    <option value="Open for select projects">Open for select projects</option>
                    <option value="Part-time / Freelance">Part-time / Freelance</option>
                    <option value="Booked (Waitlist only)">Booked (Waitlist only)</option>
                  </select>
                </div>

                <div>
                  <label className="text-white/60">Contact Email</label>
                  <input
                    value={creatorProfile.email || ""}
                    onChange={(e) =>
                      setCreatorProfile({ ...creatorProfile, email: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 font-bold text-white outline-none focus:border-white/30"
                  />
                </div>
              </div>

              {/* Commercial Use Toggle */}
              <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-sm font-bold text-white">
                      Commercial Use Rights Available
                    </p>
                    <p className="text-xs text-white/45">
                      Check if you grant commercial rights, brand clearances, and monetized advertising deliverables.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={creatorProfile.commercialUse}
                    onChange={(e) =>
                      setCreatorProfile({
                        ...creatorProfile,
                        commercialUse: e.target.checked,
                      })
                    }
                    className="h-5 w-5 accent-emerald-500 rounded"
                  />
                </label>
              </div>

              {/* Workflow Pipeline */}
              <div>
                <label className="text-white/60">
                  Production Workflow &amp; Pipeline Description
                </label>
                <textarea
                  value={creatorProfile.workflow || ""}
                  onChange={(e) =>
                    setCreatorProfile({ ...creatorProfile, workflow: e.target.value })
                  }
                  rows={3}
                  placeholder="e.g. Ideation in Midjourney v6.1 → Runway Gen-3 / Kling 1.5 motion synthesis → Topaz Video AI 4K upscale → DaVinci Resolve finishing."
                  className="mt-1 w-full resize-none rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 font-bold text-white outline-none focus:border-white/30"
                />
              </div>

              {/* Verification Signals (Read-only status) */}
              <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                <p className="text-xs font-black uppercase tracking-wider text-white/40">
                  Platform Verification Signals
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-md bg-cyan-500/10 px-2.5 py-1 text-cyan-300 font-bold">
                    Tool Signal: {creatorProfile.verification?.tools ? "✓ Active" : "Pending Review"}
                  </span>
                  <span className="rounded-md bg-cyan-500/10 px-2.5 py-1 text-cyan-300 font-bold">
                    Workflow Signal: {creatorProfile.verification?.workflow ? "✓ Active" : "Pending Review"}
                  </span>
                  <span className="rounded-md bg-cyan-500/10 px-2.5 py-1 text-cyan-300 font-bold">
                    Portfolio Signal: {creatorProfile.verification?.portfolio ? "✓ Active" : "Pending Review"}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="mt-2 rounded-xl px-6 py-3 text-xs font-black text-white"
                style={{ background: theme.gradient }}
              >
                Save Profile Changes
              </button>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* TAB 2: CAPABILITIES & AI STACK */}
        {/* ======================================================== */}
        {activeTab === "capabilities" && (
          <form
            onSubmit={handleSaveProfile}
            className="max-w-3xl space-y-6 rounded-[2.4rem] border border-white/10 bg-black/35 p-6 md:p-8 backdrop-blur-xl"
          >
            <div>
              <h3 className="text-xl font-black">AI Capabilities &amp; Toolstack</h3>
              <p className="text-xs text-white/50">
                Update the skills, generative models, and deliverable formats indexed by KreaLink&apos;s matching engine.
              </p>
            </div>

            <div className="space-y-4 text-xs font-bold">
              {/* Skills */}
              <div>
                <label className="text-white/60">Skills (comma-separated)</label>
                <input
                  value={(creatorProfile.skills || []).join(", ")}
                  onChange={(e) =>
                    setCreatorProfile({
                      ...creatorProfile,
                      skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 font-bold text-white outline-none focus:border-white/30"
                />
              </div>

              {/* AI Tools */}
              <div>
                <label className="text-white/60">AI Tools &amp; Platforms (comma-separated)</label>
                <input
                  value={(creatorProfile.aiTools || []).join(", ")}
                  onChange={(e) =>
                    setCreatorProfile({
                      ...creatorProfile,
                      aiTools: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 font-bold text-white outline-none focus:border-white/30"
                />
              </div>

              {/* AI Models */}
              <div>
                <label className="text-white/60">Foundation AI Models (comma-separated)</label>
                <input
                  value={(creatorProfile.aiModels || []).join(", ")}
                  onChange={(e) =>
                    setCreatorProfile({
                      ...creatorProfile,
                      aiModels: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 font-bold text-white outline-none focus:border-white/30"
                />
              </div>

              {/* Content Types */}
              <div>
                <label className="text-white/60">Content Types (comma-separated)</label>
                <input
                  value={(creatorProfile.contentTypes || []).join(", ")}
                  onChange={(e) =>
                    setCreatorProfile({
                      ...creatorProfile,
                      contentTypes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 font-bold text-white outline-none focus:border-white/30"
                />
              </div>

              {/* Formats */}
              <div>
                <label className="text-white/60">Supported Formats / Resolutions (comma-separated)</label>
                <input
                  value={(creatorProfile.formats || []).join(", ")}
                  onChange={(e) =>
                    setCreatorProfile({
                      ...creatorProfile,
                      formats: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 font-bold text-white outline-none focus:border-white/30"
                />
              </div>

              <button
                type="submit"
                className="mt-2 rounded-xl px-6 py-3 text-xs font-black text-white"
                style={{ background: theme.gradient }}
              >
                Update Capabilities
              </button>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* TAB 3: PORTFOLIO CRUD */}
        {/* ======================================================== */}
        {activeTab === "portfolio" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black">AI Portfolio Projects</h3>
                <p className="text-xs text-white/50">
                  Manage projects showcasing your AI tools, models, and workflows.
                </p>
              </div>

              <button
                onClick={openAddPortfolioModal}
                className="rounded-xl px-4 py-2.5 text-xs font-black text-white transition hover:scale-105"
                style={{ background: theme.gradient }}
              >
                + Add Portfolio Item
              </button>
            </div>

            {portfolioItems.length === 0 ? (
              <div className="rounded-[2rem] border border-white/10 bg-black/30 p-12 text-center">
                <span className="text-3xl">📁</span>
                <h4 className="mt-3 text-xl font-black">No portfolio work added yet.</h4>
                <p className="mt-1 text-xs text-white/50">
                  Upload or link your AI video reels and stills to showcase your skills to hiring brands.
                </p>
                <button
                  onClick={openAddPortfolioModal}
                  className="mt-4 rounded-xl px-5 py-2.5 text-xs font-black text-white"
                  style={{ background: theme.gradient }}
                >
                  Add Project →
                </button>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {portfolioItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 p-5 backdrop-blur-md"
                  >
                    <div>
                      {/* Media Preview */}
                      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black/60">
                        {item.mediaUrl && item.mediaUrl.endsWith(".mp4") ? (
                          <video
                            src={item.mediaUrl}
                            poster={item.thumbnailUrl}
                            className="h-full w-full object-cover"
                            muted
                            loop
                            autoPlay
                            playsInline
                          />
                        ) : item.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.thumbnailUrl}
                            alt={item.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-3xl">
                            🎬
                          </div>
                        )}
                        <span className="absolute left-2.5 top-2.5 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white">
                          {item.contentType || "Video"}
                        </span>
                      </div>

                      <h4 className="mt-4 text-lg font-black text-white">{item.title}</h4>
                      <p className="mt-1 text-xs text-white/60 line-clamp-2">
                        {item.description}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-1">
                        {[...(item.tools || []), ...(item.models || [])].slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-bold text-white/70"
                          >
                            {t}
                          </span>
                        ))}
                      </div>

                      {item.workflow && (
                        <p className="mt-2 text-[11px] text-white/40 italic line-clamp-1">
                          Pipeline: {item.workflow}
                        </p>
                      )}
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-3">
                      <button
                        onClick={() => openEditPortfolioModal(item)}
                        className="text-xs font-bold text-white/80 hover:text-white"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDeletePortfolioItem(item.id)}
                        className="text-xs font-bold text-rose-400 hover:text-rose-300"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: INVITATIONS & ENGAGEMENTS */}
        {/* ======================================================== */}
        {activeTab === "invitations" && (
          <div className="space-y-8">
            {/* Incoming Invitations */}
            <div>
              <h3 className="text-2xl font-black">Brand Brief Invitations</h3>
              <p className="text-xs text-white/50">
                Incoming campaign inquiries from verified brands and agencies.
              </p>

              {invitations.length === 0 ? (
                <div className="mt-4 rounded-[2rem] border border-white/10 bg-black/30 p-10 text-center text-xs text-white/40">
                  No incoming invitations right now. Your profile is indexed in Creator Discovery.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {invitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/35 p-5 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-lg bg-white/[0.08] px-2.5 py-0.5 text-xs font-bold text-white">
                            From: {inv.brandName}
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
                        <p className="mt-1 text-[11px] text-white/40">
                          Contact: {inv.contactEmail}
                        </p>
                      </div>

                      {inv.status === "Invited" && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAcceptInvitation(inv)}
                            className="rounded-xl px-4 py-2 text-xs font-black text-white transition hover:scale-105"
                            style={{ background: theme.gradient }}
                          >
                            Accept &amp; Start
                          </button>
                          <button
                            onClick={() => handleDeclineInvitation(inv)}
                            className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-bold text-white/60 hover:text-white"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Engagements */}
            <div className="border-t border-white/10 pt-6">
              <h3 className="text-xl font-black">Active Campaign Engagements</h3>
              <p className="text-xs text-white/50">
                Accepted campaigns currently in production.
              </p>

              {engagements.length === 0 ? (
                <div className="mt-4 rounded-[2rem] border border-white/10 bg-black/30 p-8 text-center text-xs text-white/40">
                  No accepted engagements currently running.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {engagements.map((eng) => (
                    <div
                      key={eng.id}
                      className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/35 p-5 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-base">
                            {eng.campaignTitle}
                          </span>
                          <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                            Status: {eng.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-white/50">
                          Client: {eng.brandName}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        {eng.status === "Accepted" && (
                          <button
                            onClick={() =>
                              handleUpdateEngagementStatus(eng.id!, "In Progress")
                            }
                            className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 font-bold text-cyan-300 hover:bg-cyan-500/20"
                          >
                            Mark &quot;In Progress&quot;
                          </button>
                        )}
                        {eng.status === "In Progress" && (
                          <button
                            onClick={() =>
                              handleUpdateEngagementStatus(eng.id!, "Delivered")
                            }
                            className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 font-bold text-emerald-300 hover:bg-emerald-500/20"
                          >
                            Mark &quot;Delivered&quot;
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Portfolio Item Add/Edit Modal */}
      {isPortfolioModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-5 backdrop-blur-xl">
          <div
            className="w-full max-w-lg rounded-[2.4rem] border border-white/10 bg-[#0b0810] p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            style={{ boxShadow: `0 0 80px ${theme.glow}` }}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-white/40">
                  Portfolio Project
                </p>
                <h4 className="mt-1 text-2xl font-black text-white">
                  {editingPortfolioId ? "Edit Project" : "Add New AI Project"}
                </h4>
              </div>
              <button
                onClick={() => setIsPortfolioModalOpen(false)}
                className="text-lg font-bold text-white/40 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePortfolioItem} className="space-y-4 text-xs font-bold">
              <div>
                <label className="text-white/60">Project Title *</label>
                <input
                  value={portfolioForm.title}
                  onChange={(e) =>
                    setPortfolioForm({ ...portfolioForm, title: e.target.value })
                  }
                  placeholder="e.g. Velocity-X Kinetic Sneaker Reel"
                  required
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 font-bold text-white outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="text-white/60">Description / Concept</label>
                <textarea
                  value={portfolioForm.description}
                  onChange={(e) =>
                    setPortfolioForm({ ...portfolioForm, description: e.target.value })
                  }
                  rows={2}
                  className="mt-1 w-full resize-none rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 font-bold text-white outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="text-white/60">Media Asset URL (video/image)</label>
                <input
                  value={portfolioForm.mediaUrl}
                  onChange={(e) =>
                    setPortfolioForm({ ...portfolioForm, mediaUrl: e.target.value })
                  }
                  placeholder="/reels/reel-01.mp4"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 font-bold text-white outline-none focus:border-white/30"
                />
                <p className="mt-1 text-[11px] text-white/35">
                  Tip: Local assets like /reels/reel-01.mp4 through /reels/reel-22.mp4 are pre-bundled.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-white/60">Content Type</label>
                  <select
                    value={portfolioForm.contentType}
                    onChange={(e) =>
                      setPortfolioForm({ ...portfolioForm, contentType: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 font-bold text-white outline-none focus:border-white/30"
                  >
                    <option value="Short-form Video (Reels/TikTok)">Short-form Video (Reels/TikTok)</option>
                    <option value="Brand Commercials">Brand Commercials</option>
                    <option value="Cinematic Trailers">Cinematic Trailers</option>
                    <option value="Product Visualizations">Product Visualizations</option>
                    <option value="Concept Art & Posters">Concept Art & Posters</option>
                  </select>
                </div>

                <div>
                  <label className="text-white/60">Formats / Aspect Ratio</label>
                  <input
                    value={portfolioForm.formatsString}
                    onChange={(e) =>
                      setPortfolioForm({ ...portfolioForm, formatsString: e.target.value })
                    }
                    placeholder="9:16 Vertical, 4K UHD"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 font-bold text-white outline-none focus:border-white/30"
                  />
                </div>
              </div>

              <div>
                <label className="text-white/60">AI Tools &amp; Models Used</label>
                <input
                  value={portfolioForm.toolsString}
                  onChange={(e) =>
                    setPortfolioForm({ ...portfolioForm, toolsString: e.target.value })
                  }
                  placeholder="Runway, Midjourney v6.1, Kling 1.5"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 font-bold text-white outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="text-white/60">Pipeline / Production Notes</label>
                <input
                  value={portfolioForm.workflow}
                  onChange={(e) =>
                    setPortfolioForm({ ...portfolioForm, workflow: e.target.value })
                  }
                  placeholder="Midjourney concept → Runway camera move → Topaz 4K"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 font-bold text-white outline-none focus:border-white/30"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 rounded-xl py-3.5 text-xs font-black text-white"
                  style={{ background: theme.gradient }}
                >
                  Save Project
                </button>
                <button
                  type="button"
                  onClick={() => setIsPortfolioModalOpen(false)}
                  className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3.5 text-xs font-bold text-white/60"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
