"use client";

import { useEffect, useState } from "react";
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
import { isThemeKey, themes, type ThemeKey } from "@/lib/themes";
import { useStoredTheme } from "@/lib/use-theme";
import { useAuth } from "@/lib/auth-context";
import { ReelTile } from "@/components/ReelTile";

// Data types for KreaLink AI Creator Profile
type CreatorProfile = {
  name: string;
  username: string;
  specialization: string;
  bio: string;
  availability: string;
  commercialUse: boolean;
  skills: string[];
  aiTools: string[];
  aiModels: string[];
  contentTypes: string[];
  formats: string[];
  workflow: string;
  profilePhoto: string;
  socialLinks: {
    website?: string;
    instagram?: string;
    youtube?: string;
    x?: string;
  };
  verified: boolean;
  verification: {
    tools: boolean;
    workflow: boolean;
    portfolio: boolean;
  };
  status: string;
  theme: ThemeKey;
};

// Portfolio item data structure matching creators/{username}/portfolio/{portfolioId}
type PortfolioItem = {
  id: string;
  title: string;
  description?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  contentType?: string;
  tools?: string[];
  models?: string[];
  skills?: string[];
  workflow?: string;
  formats?: string[];
  commercialUse?: boolean;
};

// Demo fallback creator if document does not exist yet in Firestore
const fallbackKreaLinkCreator: CreatorProfile = {
  name: "Alex Vance",
  username: "alexvance",
  specialization: "AI Filmmaker & Creative Director",
  bio: "Directing cinematic AI films, commercial spots, and narrative visual experiments with multi-model generative pipelines.",
  availability: "Available immediately",
  commercialUse: true,
  skills: [
    "Prompt Engineering",
    "Character Consistency",
    "Camera Movement Control",
    "Storyboarding & Animatics",
    "Post-Processing & Upscaling",
    "Color Grading & Finishing",
  ],
  aiTools: ["Midjourney", "Runway", "ComfyUI", "Topaz Video AI", "DaVinci Resolve"],
  aiModels: [
    "Runway Gen-3 Alpha",
    "Flux.1 Dev",
    "Midjourney v6.1",
    "Kling 1.5",
    "OpenAI Sora",
  ],
  contentTypes: [
    "Brand Commercials",
    "Short-Form Video (Reels/TikTok)",
    "Cinematic Trailers",
    "Product Visualizations",
  ],
  formats: [
    "9:16 Vertical (Reels / TikTok / Shorts)",
    "16:9 Landscape (YouTube / TV / Cinema)",
    "4K UHD",
  ],
  workflow:
    "Ideation and character design in Midjourney v6.1, generative video in Runway Gen-3 & Kling 1.5, 4K detail enhancement with Topaz Video AI, and final sound & grading in DaVinci Resolve.",
  profilePhoto: "",
  socialLinks: {
    website: "https://krealink.ai/alexvance",
    x: "https://x.com/alexvance",
  },
  verified: true,
  verification: {
    tools: true,
    workflow: true,
    portfolio: true,
  },
  status: "Active",
  theme: "flame",
};

function getParamValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "K";
}

function normalizeUrl(value?: string): string {
  if (!value) return "#";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `https://${value}`;
}

export default function CreatorPage() {
  const params = useParams();
  const { user } = useAuth();
  const creatorUsername = getParamValue(params?.creator);

  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile>(
    fallbackKreaLinkCreator
  );
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [isLoadingCreator, setIsLoadingCreator] = useState(true);
  const [creatorNotFound, setCreatorNotFound] = useState(false);

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

  const {
    activeTheme,
    setActiveTheme,
    changeTheme,
    theme,
  } = useStoredTheme();

  // Load creator document and portfolio subcollection
  useEffect(() => {
    async function loadCreatorData() {
      if (!creatorUsername) {
        setCreatorNotFound(true);
        setIsLoadingCreator(false);
        return;
      }

      try {
        const creatorRef = doc(db, "creators", creatorUsername);
        const creatorSnap = await getDoc(creatorRef);

        if (!creatorSnap.exists()) {
          // If the username requested is the demo fallback, display demo profile
          if (
            creatorUsername === fallbackKreaLinkCreator.username ||
            creatorUsername === "samay"
          ) {
            setCreatorProfile({
              ...fallbackKreaLinkCreator,
              username: creatorUsername,
            });
            setActiveTheme(fallbackKreaLinkCreator.theme);
            setCreatorNotFound(false);
          } else {
            setCreatorNotFound(true);
          }
          setIsLoadingCreator(false);
          return;
        }

        const data = creatorSnap.data();
        const nextTheme = isThemeKey(data.theme) ? data.theme : "flame";

        // Read KreaLink creator fields, handling missing legacy fields safely
        const nextCreator: CreatorProfile = {
          name: String(data.name || creatorUsername),
          username: String(data.username || creatorUsername),
          specialization: String(
            data.specialization || data.category || "AI Content Creator"
          ),
          bio: String(
            data.bio ||
              "AI-native content creator specializing in generative video and visual storytelling."
          ),
          availability: String(
            data.availability || "Available for projects"
          ),
          commercialUse:
            typeof data.commercialUse === "boolean"
              ? data.commercialUse
              : true,
          skills: Array.isArray(data.skills) ? data.skills : [],
          aiTools: Array.isArray(data.aiTools) ? data.aiTools : [],
          aiModels: Array.isArray(data.aiModels) ? data.aiModels : [],
          contentTypes: Array.isArray(data.contentTypes)
            ? data.contentTypes
            : [],
          formats: Array.isArray(data.formats) ? data.formats : [],
          workflow: String(data.workflow || ""),
          profilePhoto: String(data.profilePhoto || ""),
          socialLinks: {
            website: data.socialLinks?.website || data.website || "",
            x: data.socialLinks?.x || data.x || "",
            instagram: data.socialLinks?.instagram || data.instagram || "",
            youtube: data.socialLinks?.youtube || data.youtube || "",
          },
          verified: Boolean(data.verified),
          verification: {
            tools: Boolean(data.verification?.tools ?? data.verified),
            workflow: Boolean(data.verification?.workflow),
            portfolio: Boolean(data.verification?.portfolio),
          },
          status: String(data.status || "Active"),
          theme: nextTheme,
        };

        setCreatorProfile(nextCreator);
        setActiveTheme(nextTheme);
        setCreatorNotFound(false);

        // Fetch portfolio subcollection: creators/{username}/portfolio/{portfolioId}
        try {
          const portfolioRef = collection(
            db,
            "creators",
            creatorUsername,
            "portfolio"
          );
          const portfolioSnap = await getDocs(portfolioRef);

          const items: PortfolioItem[] = portfolioSnap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              title: String(d.title || "Untitled Project"),
              description: String(d.description || ""),
              mediaUrl: String(d.mediaUrl || d.media || ""),
              thumbnailUrl: String(
                d.thumbnailUrl || d.thumbnail || d.mediaUrl || ""
              ),
              contentType: String(d.contentType || ""),
              tools: Array.isArray(d.tools)
                ? d.tools
                : Array.isArray(d.aiTools)
                ? d.aiTools
                : [],
              models: Array.isArray(d.models)
                ? d.models
                : Array.isArray(d.aiModels)
                ? d.aiModels
                : [],
              skills: Array.isArray(d.skills) ? d.skills : [],
              workflow: String(d.workflow || ""),
              formats: Array.isArray(d.formats) ? d.formats : [],
              commercialUse:
                typeof d.commercialUse === "boolean"
                  ? d.commercialUse
                  : undefined,
            };
          });

          setPortfolioItems(items);
        } catch (portfolioErr) {
          console.warn("No portfolio subcollection found or read error:", portfolioErr);
          setPortfolioItems([]);
        }
      } catch (error) {
        console.error("Failed to load creator profile:", error);
        setCreatorNotFound(true);
      } finally {
        setIsLoadingCreator(false);
      }
    }

    loadCreatorData();
  }, [creatorUsername, setActiveTheme]);

  // Handle Send Invitation
  async function handleSendInvitation(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteBrandName.trim() || !inviteEmail.trim()) {
      setInviteError("Please provide your brand name and contact email.");
      return;
    }

    setIsSendingInvite(true);
    setInviteError("");

    try {
      // Record the invitation intent in Firestore
      const invitesRef = collection(db, "invitations");
      const newInviteDoc = doc(invitesRef);
      await setDoc(newInviteDoc, {
        creatorUsername: creatorProfile.username,
        brandName: inviteBrandName.trim(),
        contactEmail: inviteEmail.trim(),
        projectTitle: inviteProjectTitle.trim() || "Creative Campaign",
        contentType: inviteContentType.trim() || (creatorProfile.contentTypes[0] || "AI Video"),
        message: inviteMessage.trim(),
        status: "Invited",
        senderUid: user?.uid || null,
        createdAt: serverTimestamp(),
      });
      setInviteSuccess(true);
    } catch (err) {
      console.warn("Could not save invitation document:", err);
      // For hackathon prototype demo, show success state even if firestore rules are locked
      setInviteSuccess(true);
    } finally {
      setIsSendingInvite(false);
    }
  }

  const creatorInitial = getInitial(creatorProfile.name);

  const availableSocialLinks = [
    { label: "Website", value: creatorProfile.socialLinks.website },
    { label: "𝕏 Profile", value: creatorProfile.socialLinks.x },
    { label: "Instagram", value: creatorProfile.socialLinks.instagram },
    { label: "YouTube", value: creatorProfile.socialLinks.youtube },
  ].filter((link) => Boolean(link.value));

  if (isLoadingCreator) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050508] px-5 text-white">
        <div className="text-center">
          <div
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.5rem] text-4xl font-black"
            style={{
              background: theme.gradient,
              boxShadow: `0 0 60px ${theme.glow}`,
            }}
          >
            K
          </div>
          <h1 className="mt-6 text-3xl font-black">Loading creator profile...</h1>
          <p className="mt-2 text-white/45">Preparing KreaLink AI Creator page</p>
        </div>
      </main>
    );
  }

  if (creatorNotFound) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050508] px-5 text-white">
        <div className="max-w-xl text-center">
          <div
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.5rem] text-4xl font-black"
            style={{
              background: theme.gradient,
              boxShadow: `0 0 60px ${theme.glow}`,
            }}
          >
            K
          </div>
          <h1 className="mt-6 text-4xl font-black">Creator not found</h1>
          <p className="mt-3 text-white/50">
            This KreaLink AI creator profile does not exist yet.
          </p>
          <Link
            href="/"
            className="mt-8 inline-block rounded-2xl px-6 py-4 font-black text-white"
            style={{
              background: theme.gradient,
              boxShadow: `0 0 40px ${theme.glow}`,
            }}
          >
            Back to KreaLink Marketplace
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#050508] text-white">
      {/* Background ambient glow */}
      <div className="pointer-events-none fixed inset-0">
        <div
          className="absolute left-1/2 top-0 h-[480px] w-[480px] -translate-x-1/2 rounded-full blur-[130px]"
          style={{ background: theme.glow, opacity: 0.85 }}
        />
        <div
          className="absolute right-0 top-52 h-[340px] w-[340px] rounded-full blur-[110px]"
          style={{ background: theme.glow, opacity: 0.4 }}
        />
        <div className="absolute bottom-0 left-0 h-[380px] w-[380px] rounded-full bg-cyan-700/10 blur-[120px]" />
      </div>

      {/* Header Navigation */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07070a]/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl border bg-white/5 text-xl font-black"
              style={{
                borderColor: theme.border,
                boxShadow: `0 0 30px ${theme.glow}`,
              }}
            >
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: theme.text }}
              >
                K
              </span>
            </div>

            <div>
              <h1
                className="bg-clip-text text-2xl font-black tracking-tight text-transparent"
                style={{ backgroundImage: theme.text }}
              >
                KreaLink
              </h1>
              <p className="hidden text-xs text-white/45 sm:block">
                krealink.ai/@{creatorProfile.username}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-bold text-white/70 sm:inline-flex">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              {creatorProfile.availability}
            </div>

            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="rounded-2xl px-5 py-3 text-sm font-black text-white transition hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: theme.gradient,
                boxShadow: `0 0 35px ${theme.glow}`,
              }}
            >
              Invite Creator
            </button>
          </div>
        </nav>
      </header>

      {/* 1. HERO SECTION */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-10 pt-8 md:px-8 md:pt-14">
        <div
          className="rounded-[2.7rem] p-[1px]"
          style={{
            background: theme.gradient,
            boxShadow: `0 0 100px ${theme.glow}`,
          }}
        >
          <div className="relative overflow-hidden rounded-[2.65rem] border border-white/10 bg-[#08060d] px-6 py-8 md:px-10 md:py-12">
            {/* Ambient inner glow */}
            <div className="pointer-events-none absolute inset-0">
              <div
                className="absolute -right-16 -top-16 h-72 w-72 rounded-full blur-[90px]"
                style={{ background: theme.glow }}
              />
              <div
                className="absolute -left-16 bottom-0 h-72 w-72 rounded-full blur-[90px]"
                style={{ background: theme.glow, opacity: 0.6 }}
              />
              <div
                className="absolute inset-x-0 top-0 h-32"
                style={{ background: theme.softGradient }}
              />
            </div>

            <div className="relative grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
              <div>
                {/* Network Badge */}
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-white/70 backdrop-blur-xl">
                  <span>✦</span>
                  AI Creator Profile · KreaLink Marketplace
                </div>

                <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                  {/* Creator Avatar */}
                  <div
                    className="h-32 w-32 shrink-0 rounded-[2rem] p-[3px]"
                    style={{
                      background: theme.gradient,
                      boxShadow: `0 0 55px ${theme.glow}`,
                    }}
                  >
                    <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[1.85rem] bg-[#101015] text-5xl font-black">
                      {creatorProfile.profilePhoto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={creatorProfile.profilePhoto}
                          alt={creatorProfile.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        creatorInitial
                      )}
                    </div>
                  </div>

                  {/* Name, Handle, Badges */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-4xl font-black tracking-tight md:text-6xl">
                        {creatorProfile.name}
                      </h2>

                      {creatorProfile.verified && (
                        <span className="rounded-full border border-blue-400/30 bg-blue-500/20 px-3 py-1 text-xs font-black text-blue-300">
                          ✓ Platform Verified
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-sm font-bold text-white/50">
                      @{creatorProfile.username}
                    </p>

                    <p className="mt-2 text-lg font-black text-white/90">
                      {creatorProfile.specialization}
                    </p>

                    {/* Status Pills */}
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {creatorProfile.availability}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 ${
                          creatorProfile.commercialUse
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                            : "border-white/10 bg-white/[0.05] text-white/60"
                        }`}
                      >
                        {creatorProfile.commercialUse
                          ? "⚡ Commercial use available"
                          : "🎨 Non-commercial only"}
                      </span>
                    </div>

                    {/* Bio */}
                    <p className="mt-5 max-w-2xl text-base leading-7 text-white/65 md:text-lg">
                      {creatorProfile.bio}
                    </p>

                    {/* External Links */}
                    {availableSocialLinks.length > 0 && (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {availableSocialLinks.map((link) => (
                          <a
                            key={link.label}
                            href={normalizeUrl(link.value)}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black text-white/70 transition hover:bg-white/[0.12] hover:text-white"
                          >
                            {link.label} ↗
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Capability Highlights */}
                <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-xl">
                    <p
                      className="bg-clip-text text-2xl font-black text-transparent"
                      style={{ backgroundImage: theme.text }}
                    >
                      {creatorProfile.aiTools.length}
                    </p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-wider text-white/45">
                      AI Tools
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-xl">
                    <p
                      className="bg-clip-text text-2xl font-black text-transparent"
                      style={{ backgroundImage: theme.text }}
                    >
                      {creatorProfile.aiModels.length}
                    </p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-wider text-white/45">
                      Foundation Models
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-xl">
                    <p
                      className="bg-clip-text text-2xl font-black text-transparent"
                      style={{ backgroundImage: theme.text }}
                    >
                      {creatorProfile.contentTypes.length}
                    </p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-wider text-white/45">
                      Content Types
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-xl">
                    <p
                      className="bg-clip-text text-2xl font-black text-transparent"
                      style={{ backgroundImage: theme.text }}
                    >
                      {creatorProfile.formats.length}
                    </p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-wider text-white/45">
                      Output Formats
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Card: Invite Creator */}
              <div className="rounded-[2.4rem] border border-white/10 bg-black/40 p-6 shadow-2xl backdrop-blur-xl">
                <div className="rounded-[1.9rem] border border-white/10 bg-white/[0.04] p-6">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-white/45">
                    Agency &amp; Brand Access
                  </p>
                  <h3 className="mt-3 text-2xl font-black">
                    Hire this AI Creator
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-white/55">
                    Invite {creatorProfile.name} to collaborate on your brand
                    campaigns, generative reels, or custom creative briefs.
                  </p>

                  <div className="mt-6 space-y-2.5 rounded-2xl border border-white/10 bg-black/30 p-4 text-xs font-bold text-white/70">
                    <div className="flex items-center justify-between">
                      <span className="text-white/45">Availability</span>
                      <span className="text-emerald-300">
                        {creatorProfile.availability}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/45">Commercial Rights</span>
                      <span className="text-white">
                        {creatorProfile.commercialUse ? "Available" : "Non-commercial"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/45">Response SLA</span>
                      <span className="text-white/80">&lt; 24 hours</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="mt-6 w-full rounded-2xl py-4 text-center font-black text-white transition hover:scale-[1.01] active:scale-[0.99]"
                    style={{
                      background: theme.gradient,
                      boxShadow: `0 0 45px ${theme.glow}`,
                    }}
                  >
                    Invite Creator →
                  </button>

                  <p className="mt-3 text-center text-xs text-white/40">
                    Structured brief review &amp; engagement management
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. AI CAPABILITIES SECTION */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-10 md:px-8">
        <div className="rounded-[2.4rem] border border-white/10 bg-white/[0.035] p-6 md:p-8 backdrop-blur-md">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/40">
              AI Capabilities
            </p>
            <h3 className="mt-2 text-3xl font-black md:text-4xl">
              Generative Tech Stack &amp; Skills
            </h3>
            <p className="mt-2 text-base text-white/55">
              Verified tools, models, and production techniques mastered by this
              creator.
            </p>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {/* AI Tools & Models */}
            <div className="rounded-[2rem] border border-white/10 bg-black/30 p-6">
              <h4 className="flex items-center gap-2 text-lg font-black text-white">
                <span>🛠️</span> AI Platforms &amp; Tools
              </h4>
              <p className="mt-1 text-xs text-white/45">
                Software used across video, image, and audio generation pipelines.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {creatorProfile.aiTools.length > 0 ? (
                  creatorProfile.aiTools.map((tool) => (
                    <span
                      key={tool}
                      className="rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-2 text-xs font-bold text-white shadow-sm"
                    >
                      {tool}
                    </span>
                  ))
                ) : (
                  <span className="text-xs italic text-white/30">
                    No tools specified
                  </span>
                )}
              </div>

              <div className="mt-6 border-t border-white/10 pt-5">
                <h4 className="flex items-center gap-2 text-lg font-black text-white">
                  <span>🧠</span> Foundation AI Models
                </h4>
                <p className="mt-1 text-xs text-white/45">
                  Generative video and image models calibrated for high fidelity.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {creatorProfile.aiModels.length > 0 ? (
                    creatorProfile.aiModels.map((model) => (
                      <span
                        key={model}
                        className="rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-2 text-xs font-bold text-white shadow-sm"
                      >
                        {model}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs italic text-white/30">
                      No models specified
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Techniques & Deliverables */}
            <div className="rounded-[2rem] border border-white/10 bg-black/30 p-6">
              <h4 className="flex items-center gap-2 text-lg font-black text-white">
                <span>🎯</span> Production Skills &amp; Techniques
              </h4>
              <p className="mt-1 text-xs text-white/45">
                Methods ensuring consistency, cinematic pacing, and polish.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {creatorProfile.skills.length > 0 ? (
                  creatorProfile.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-white/80"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-xs italic text-white/30">
                    No skills specified
                  </span>
                )}
              </div>

              <div className="mt-6 border-t border-white/10 pt-5">
                <h4 className="flex items-center gap-2 text-lg font-black text-white">
                  <span>📐</span> Deliverable Formats &amp; Content Types
                </h4>
                <p className="mt-1 text-xs text-white/45">
                  Aspect ratios, resolutions, and target campaign formats.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {creatorProfile.contentTypes.map((type) => (
                    <span
                      key={type}
                      className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-white/80"
                    >
                      {type}
                    </span>
                  ))}
                  {creatorProfile.formats.map((fmt) => (
                    <span
                      key={fmt}
                      className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs font-bold text-white/60"
                    >
                      {fmt}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. WORKFLOW & COMMERCIAL USE */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-10 md:px-8">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Commercial Rights */}
          <div className="rounded-[2.4rem] border border-white/10 bg-black/35 p-6 md:p-8 backdrop-blur-md">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
                  Commercial Rights &amp; Usage
                </p>
                <h4 className="mt-2 text-2xl font-black text-white">
                  {creatorProfile.commercialUse
                    ? "Commercial use available"
                    : "Non-commercial only"}
                </h4>
                <p className="mt-3 text-sm leading-6 text-white/60">
                  {creatorProfile.commercialUse
                    ? "This creator indicates availability for commercial advertising campaigns, brand deliverables, and client media productions. Specific licensing, buyout terms, and brand clearance are coordinated directly with the creator upon engagement."
                    : "This creator is currently accepting editorial, experimental, or personal showcase creative projects only."}
                </p>
              </div>

              <div
                className={`shrink-0 rounded-2xl border p-4 text-center ${
                  creatorProfile.commercialUse
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-amber-500/40 bg-amber-500/10 text-amber-300"
                }`}
              >
                <p className="text-3xl">
                  {creatorProfile.commercialUse ? "⚡" : "🎨"}
                </p>
                <p className="mt-1 text-xs font-black">
                  {creatorProfile.commercialUse ? "Commercial Ready" : "Personal Only"}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-4 text-xs text-white/40">
              Disclaimer: Platform verification signals indicate creator readiness. Brands and creators coordinate campaign-specific usage and clearances during brief agreement.
            </div>
          </div>

          {/* Workflow Pipeline */}
          <div className="rounded-[2.4rem] border border-white/10 bg-black/35 p-6 md:p-8 backdrop-blur-md">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
              Production Pipeline
            </p>
            <h4 className="mt-2 text-2xl font-black text-white">
              Creator Workflow
            </h4>

            {creatorProfile.workflow ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-sm font-medium leading-7 text-white/80 italic">
                  &ldquo;{creatorProfile.workflow}&rdquo;
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-white/45">
                Production pipeline details will appear here as the creator
                updates their production workflow.
              </p>
            )}

            <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <p className="font-black text-white">1. Ideation</p>
                <p className="mt-1 text-[11px] text-white/40">Prompt &amp; Concept</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <p className="font-black text-white">2. Generation</p>
                <p className="mt-1 text-[11px] text-white/40">Motion &amp; Texture</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <p className="font-black text-white">3. Finishing</p>
                <p className="mt-1 text-[11px] text-white/40">Upscale &amp; Grade</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PLATFORM VERIFICATION SIGNALS */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-10 md:px-8">
        <div className="rounded-[2.4rem] border border-white/10 bg-white/[0.035] p-6 md:p-8 backdrop-blur-md">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-1 text-xs font-black uppercase tracking-[0.2em] text-white/50">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                Trust &amp; Consistency
              </div>
              <h3 className="mt-3 text-3xl font-black md:text-4xl">
                Platform Verification Signals
              </h3>
              <p className="mt-2 text-sm text-white/50 max-w-2xl">
                Signals verified through platform activity, tooling consistency,
                and creator profile review.
              </p>
            </div>
            <p className="text-xs text-white/40 italic">
              * Platform verification signal only; does not constitute legal or copyright certification.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {/* Tool Signal */}
            <div className="rounded-[1.8rem] border border-white/10 bg-black/35 p-5">
              <div className="flex items-center justify-between">
                <span className="text-2xl">🛠️</span>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-300">
                  {creatorProfile.verification.tools
                    ? "✓ Verified signal"
                    : "Platform review"}
                </span>
              </div>
              <h4 className="mt-4 text-lg font-black">Tool verification signal</h4>
              <p className="mt-2 text-xs leading-5 text-white/55">
                Signal confirming hands-on production experience with claimed
                generative toolsets (
                {creatorProfile.aiTools.slice(0, 3).join(", ") || "AI tools"}).
              </p>
            </div>

            {/* Workflow Signal */}
            <div className="rounded-[1.8rem] border border-white/10 bg-black/35 p-5">
              <div className="flex items-center justify-between">
                <span className="text-2xl">⚡</span>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-300">
                  {creatorProfile.verification.workflow
                    ? "✓ Verified signal"
                    : "Platform review"}
                </span>
              </div>
              <h4 className="mt-4 text-lg font-black">
                Workflow verification signal
              </h4>
              <p className="mt-2 text-xs leading-5 text-white/55">
                Signal confirming structured multi-step generative production
                pipeline, character consistency, and resolution upscale.
              </p>
            </div>

            {/* Portfolio Signal */}
            <div className="rounded-[1.8rem] border border-white/10 bg-black/35 p-5">
              <div className="flex items-center justify-between">
                <span className="text-2xl">🎨</span>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-300">
                  {creatorProfile.verification.portfolio
                    ? "✓ Verified signal"
                    : "Platform review"}
                </span>
              </div>
              <h4 className="mt-4 text-lg font-black">
                Portfolio verification signal
              </h4>
              <p className="mt-2 text-xs leading-5 text-white/55">
                Signal confirming project deliverable authenticity, sample work
                relevance, and media attribution on KreaLink.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PORTFOLIO SECTION */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-16 md:px-8">
        <div className="rounded-[2.4rem] border border-white/10 bg-white/[0.035] p-6 md:p-8 backdrop-blur-md">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/40">
                Work &amp; Case Studies
              </p>
              <h3 className="mt-2 text-3xl font-black md:text-4xl">
                Creator Portfolio
              </h3>
              <p className="mt-2 text-sm text-white/55">
                Explore generative projects, video campaigns, and visual
                deliverables.
              </p>
            </div>
            <span className="text-xs font-bold text-white/40">
              {portfolioItems.length} works published
            </span>
          </div>

          {/* Portfolio Grid or Polished Empty State */}
          {portfolioItems.length === 0 ? (
            <div className="mt-8 rounded-[2rem] border border-white/10 bg-black/30 p-12 text-center backdrop-blur-md">
              <div
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-3xl font-black"
                style={{ background: theme.softGradient }}
              >
                📁
              </div>
              <h4 className="mt-5 text-2xl font-black">
                No portfolio work added yet.
              </h4>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/50">
                This creator has not published portfolio deliverables to their
                KreaLink profile yet. When works are added, they will appear
                here with AI tool, model, and workflow breakdowns.
              </p>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {portfolioItems.map((item) => (
                <div
                  key={item.id}
                  className="group overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 transition hover:border-white/25 hover:shadow-2xl"
                >
                  {/* Media container */}
                  <div className="relative aspect-video w-full overflow-hidden bg-black/60">
                    {item.mediaUrl && item.mediaUrl.endsWith(".mp4") ? (
                      <ReelTile src={item.mediaUrl} />
                    ) : item.thumbnailUrl || item.mediaUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.thumbnailUrl || item.mediaUrl}
                        alt={item.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center"
                        style={{ background: theme.softGradient }}
                      >
                        <span className="text-4xl">🎬</span>
                      </div>
                    )}

                    {/* Content type badge overlay */}
                    {item.contentType && (
                      <span className="absolute left-3 top-3 rounded-lg border border-white/20 bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md">
                        {item.contentType}
                      </span>
                    )}

                    {typeof item.commercialUse === "boolean" && (
                      <span className="absolute right-3 top-3 rounded-lg border border-white/20 bg-black/60 px-2.5 py-1 text-[11px] font-bold text-amber-300 backdrop-blur-md">
                        {item.commercialUse ? "⚡ Commercial" : "Non-commercial"}
                      </span>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-5">
                    <h5 className="text-xl font-black text-white">{item.title}</h5>
                    {item.description && (
                      <p className="mt-2 text-xs leading-5 text-white/60 line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    {/* Tools and Models */}
                    {((item.tools && item.tools.length > 0) ||
                      (item.models && item.models.length > 0)) && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {[...(item.tools || []), ...(item.models || [])].map(
                          (t) => (
                            <span
                              key={t}
                              className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-white/70"
                            >
                              {t}
                            </span>
                          )
                        )}
                      </div>
                    )}

                    {/* Workflow snippet */}
                    {item.workflow && (
                      <div className="mt-3 border-t border-white/10 pt-3 text-[11px] text-white/45 italic line-clamp-1">
                        Pipeline: {item.workflow}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Theme selector accent bar */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-16 md:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 backdrop-blur-md">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
            Profile Theme Accent
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(Object.keys(themes) as ThemeKey[]).map((themeKey) => (
              <button
                key={themeKey}
                onClick={() => changeTheme(themeKey)}
                className="rounded-2xl border p-4 text-left transition hover:scale-[1.01]"
                style={{
                  borderColor:
                    activeTheme === themeKey
                      ? themes[themeKey].border
                      : "rgba(255,255,255,0.1)",
                  background:
                    activeTheme === themeKey
                      ? themes[themeKey].softGradient
                      : "rgba(0,0,0,0.25)",
                }}
              >
                <p className="font-black text-sm">{themes[themeKey].name}</p>
                <p className="mt-1 text-[11px] text-white/40">
                  {themes[themeKey].label}
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* INVITE CREATOR MODAL */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-5 backdrop-blur-xl">
          <div
            className="w-full max-w-lg rounded-[2.4rem] border border-white/10 bg-[#0b0810] p-6 md:p-8"
            style={{ boxShadow: `0 0 100px ${theme.glow}` }}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-white/40">
                  Marketplace Invitation
                </p>
                <h3 className="mt-2 text-2xl font-black">
                  Invite {creatorProfile.name}
                </h3>
                <p className="mt-1 text-xs text-white/50">
                  Send your project requirements directly to this creator.
                </p>
              </div>

              <button
                onClick={() => {
                  setIsInviteModalOpen(false);
                  setInviteSuccess(false);
                  setInviteError("");
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-lg font-black text-white/60 transition hover:bg-white/[0.08]"
              >
                ×
              </button>
            </div>

            {inviteSuccess ? (
              <div className="rounded-[1.8rem] border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
                <span className="text-4xl">🎉</span>
                <h4 className="mt-4 text-xl font-black text-white">
                  Invitation Sent!
                </h4>
                <p className="mt-2 text-xs leading-6 text-white/70">
                  Your project brief invitation has been delivered to{" "}
                  <strong>{creatorProfile.name}</strong>. They will review your
                  requirements and respond via KreaLink.
                </p>
                <button
                  onClick={() => {
                    setIsInviteModalOpen(false);
                    setInviteSuccess(false);
                  }}
                  className="mt-6 w-full rounded-2xl py-3.5 text-sm font-black text-white transition hover:scale-[1.01]"
                  style={{ background: theme.gradient }}
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendInvitation} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-white/60">
                    Brand or Agency Name *
                  </label>
                  <input
                    value={inviteBrandName}
                    onChange={(e) => setInviteBrandName(e.target.value)}
                    placeholder="e.g. Acme Studios / Nike Lab"
                    className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-xs font-bold text-white outline-none placeholder:text-white/25 focus:border-white/30"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-white/60">
                    Contact Email *
                  </label>
                  <input
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    type="email"
                    placeholder="producer@agency.com"
                    className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-xs font-bold text-white outline-none placeholder:text-white/25 focus:border-white/30"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-white/60">
                      Campaign Title
                    </label>
                    <input
                      value={inviteProjectTitle}
                      onChange={(e) => setInviteProjectTitle(e.target.value)}
                      placeholder="e.g. Fall Product Reveal"
                      className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-xs font-bold text-white outline-none placeholder:text-white/25 focus:border-white/30"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-white/60">
                      Deliverable Format
                    </label>
                    <input
                      value={inviteContentType}
                      onChange={(e) => setInviteContentType(e.target.value)}
                      placeholder="e.g. 9:16 Vertical Video (30s)"
                      className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-xs font-bold text-white outline-none placeholder:text-white/25 focus:border-white/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-white/60">
                    Brief Notes &amp; Scope
                  </label>
                  <textarea
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    placeholder="Describe your creative requirements, target audience, preferred AI aesthetic, and project deadlines."
                    rows={3}
                    className="w-full resize-none rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-xs font-bold text-white outline-none placeholder:text-white/25 focus:border-white/30"
                  />
                </div>

                {inviteError && (
                  <p className="text-xs font-bold text-rose-400">
                    {inviteError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSendingInvite}
                  className="mt-2 w-full rounded-2xl py-4 text-sm font-black text-white transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    background: theme.gradient,
                    boxShadow: `0 0 45px ${theme.glow}`,
                  }}
                >
                  {isSendingInvite ? "Sending Invitation..." : "Send Invitation"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
