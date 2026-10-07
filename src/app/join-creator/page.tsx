"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useStoredTheme } from "@/lib/use-theme";
import { useAuth } from "@/lib/auth-context";
import { KreaLinkLogo } from "@/components/KreaLinkLogo";

// Preset options for AI creator onboarding
const PRESET_SPECIALIZATIONS = [
  "AI Filmmaker & Director",
  "Generative AI Visual Artist",
  "AI Animator & Motion Designer",
  "Virtual Concept Artist & Worldbuilder",
  "AI Commercial Producer",
  "VFX & AI Compositing Specialist",
];

const PRESET_SKILLS = [
  "Prompt Engineering",
  "Character Consistency",
  "Camera Movement Control",
  "Storyboarding & Animatics",
  "Post-Processing & Upscaling",
  "Style Transfer & LoRA Training",
  "Motion Tracking & VFX",
  "Voice Cloning & Audio Design",
  "Color Grading & Finishing",
  "Cinematic Worldbuilding",
];

const PRESET_AI_TOOLS = [
  "Midjourney",
  "Runway",
  "ComfyUI",
  "Kling AI",
  "Luma Dream Machine",
  "Hailuo / Minimax",
  "Pika",
  "Topaz Video AI",
  "Magnific AI",
  "ElevenLabs",
  "Photoshop AI",
  "DaVinci Resolve",
];

const PRESET_AI_MODELS = [
  "Runway Gen-3 Alpha",
  "Flux.1 Dev / Schnell",
  "Midjourney v6.1",
  "Kling 1.5",
  "OpenAI Sora",
  "SDXL / Stable Diffusion",
  "Luma Ray 2",
  "MiniMax Video-01",
  "Claude 3.5 Sonnet",
  "GPT-4o",
];

const PRESET_CONTENT_TYPES = [
  "Brand Commercials",
  "Short-Form Video (Reels/TikTok)",
  "Cinematic Trailers",
  "Social Media Ads",
  "Music Videos",
  "Product Visualizations",
  "Concept Art & Keyframes",
  "Animated Shorts",
];

const PRESET_FORMATS = [
  "9:16 Vertical (Reels / TikTok / Shorts)",
  "16:9 Landscape (YouTube / TV / Cinema)",
  "1:1 Square (Instagram Post)",
  "4:5 Portrait",
  "21:9 Widescreen Cinema",
  "4K UHD",
  "1080p Full HD",
];

const PRESET_AVAILABILITY = [
  "Available immediately",
  "Open for select projects",
  "Part-time / Freelance",
  "Booked (Waitlist only)",
];

// Helper compact chip multi-select component
function CompactChipSelector({
  title,
  subtitle,
  presets,
  selected,
  onToggle,
  onAddCustom,
  accentColor,
}: {
  title: string;
  subtitle?: string;
  presets: string[];
  selected: string[];
  onToggle: (item: string) => void;
  onAddCustom: (item: string) => void;
  accentColor?: string;
}) {
  const [customValue, setCustomValue] = useState("");

  const handleAdd = () => {
    if (customValue.trim()) {
      onAddCustom(customValue.trim());
      setCustomValue("");
    }
  };

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0c0e15] p-4">
      <div className="mb-2.5 flex items-center justify-between">
        <div>
          <label className="text-xs font-heading font-semibold text-white">{title}</label>
          {subtitle && <p className="text-[11px] text-slate-400">{subtitle}</p>}
        </div>
        <span className="rounded-full bg-white/[0.06] border border-white/5 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-300">
          {selected.length} selected
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {presets.map((item) => {
          const isSelected = selected.includes(item);
          return (
            <button
              key={item}
              type="button"
              onClick={() => onToggle(item)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                isSelected
                  ? "border border-indigo-500/50 bg-indigo-500/20 text-indigo-200 shadow-sm"
                  : "border border-white/[0.08] bg-white/[0.02] text-slate-400 hover:border-white/20 hover:text-white"
              }`}
              style={
                isSelected && accentColor
                  ? { borderColor: accentColor, backgroundColor: `${accentColor}25` }
                  : undefined
              }
            >
              {isSelected ? "✓ " : "+ "}
              {item}
            </button>
          );
        })}

        {/* Custom selected items */}
        {selected
          .filter((item) => !presets.includes(item))
          .map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onToggle(item)}
              className="rounded-lg border border-indigo-500/50 bg-indigo-500/20 px-2.5 py-1 text-xs font-medium text-indigo-200 shadow-sm"
            >
              ✓ {item}
            </button>
          ))}
      </div>

      {/* Quick Add Custom tag */}
      <div className="mt-2.5 flex gap-2">
        <input
          type="text"
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder={`Add custom ${title.toLowerCase()}...`}
          className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-medium text-white placeholder:text-slate-500 focus:border-indigo-500/60 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.12] hover:text-white"
        >
          + Add
        </button>
      </div>
    </div>
  );
}

function cleanUsername(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

export default function JoinCreatorPage() {
  const router = useRouter();
  const { user, setLocalUser } = useAuth();
  const { activeTheme } = useStoredTheme();

  // Multi-Step State: 1 = Identity, 2 = AI Stack, 3 = Deliverables, 4 = Commercial Terms
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Basic Information
  const [customCreatorName, setCustomCreatorName] = useState<string | null>(null);
  const creatorName = customCreatorName !== null ? customCreatorName : (user?.displayName || "");

  const [customUsername, setCustomUsername] = useState<string | null>(null);
  const defaultUsername = user?.displayName
    ? cleanUsername(user.displayName)
    : user?.email
    ? cleanUsername(user.email.split("@")[0])
    : "";
  const username = customUsername !== null ? customUsername : defaultUsername;

  const [customEmail, setCustomEmail] = useState<string | null>(null);
  const email = customEmail !== null ? customEmail : (user?.email || "");
  const [bio, setBio] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [specialization, setSpecialization] = useState("AI Filmmaker & Director");

  // Step 2: AI Capabilities & Stack
  const [skills, setSkills] = useState<string[]>([
    "Prompt Engineering",
    "Character Consistency",
  ]);
  const [aiTools, setAiTools] = useState<string[]>([
    "Midjourney",
    "Runway",
  ]);
  const [aiModels, setAiModels] = useState<string[]>([
    "Runway Gen-3 Alpha",
    "Midjourney v6.1",
  ]);

  // Step 3: Deliverables & Formats
  const [contentTypes, setContentTypes] = useState<string[]>([
    "Brand Commercials",
    "Short-Form Video (Reels/TikTok)",
  ]);
  const [formats, setFormats] = useState<string[]>([
    "9:16 Vertical (Reels / TikTok / Shorts)",
    "16:9 Landscape (YouTube / TV / Cinema)",
  ]);
  const [workflow, setWorkflow] = useState<string>("");

  // Step 4: Commercial & Availability
  const [commercialUse, setCommercialUse] = useState<boolean>(true);
  const [availability, setAvailability] = useState<string>("Available immediately");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");
  const [xLink, setXLink] = useState("");

  // Form State
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState("");

  function handleProfilePhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Please upload an image file.");
      return;
    }
    const maxPhotoBytes = 600 * 1024;
    if (file.size > maxPhotoBytes) {
      setMessage("Please upload an image under 600KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setProfilePhoto(String(reader.result || ""));
    };
    reader.readAsDataURL(file);
  }

  // Chip togglers
  function toggleSkill(item: string) {
    setSkills((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  }

  function toggleAiTool(item: string) {
    setAiTools((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  }

  function toggleAiModel(item: string) {
    setAiModels((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  }

  function toggleContentType(item: string) {
    setContentTypes((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  }

  function toggleFormat(item: string) {
    setFormats((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  }

  // Custom chip adders
  function addCustomSkill(item: string) {
    const trimmed = item.trim();
    if (trimmed && !skills.includes(trimmed)) setSkills((prev) => [...prev, trimmed]);
  }

  function addCustomAiTool(item: string) {
    const trimmed = item.trim();
    if (trimmed && !aiTools.includes(trimmed)) setAiTools((prev) => [...prev, trimmed]);
  }

  function addCustomAiModel(item: string) {
    const trimmed = item.trim();
    if (trimmed && !aiModels.includes(trimmed)) setAiModels((prev) => [...prev, trimmed]);
  }

  function addCustomContentType(item: string) {
    const trimmed = item.trim();
    if (trimmed && !contentTypes.includes(trimmed)) setContentTypes((prev) => [...prev, trimmed]);
  }

  function addCustomFormat(item: string) {
    const trimmed = item.trim();
    if (trimmed && !formats.includes(trimmed)) setFormats((prev) => [...prev, trimmed]);
  }

  // Step validations
  const isStep1Valid =
    Boolean(creatorName.trim()) &&
    Boolean(username.trim()) &&
    Boolean(email.trim()) &&
    Boolean(specialization.trim());

  const isStep2Valid =
    skills.length > 0 &&
    aiTools.length > 0 &&
    aiModels.length > 0;

  const isStep3Valid =
    contentTypes.length > 0 &&
    formats.length > 0;

  const isStep4Valid = Boolean(availability);

  const isAllValid = isStep1Valid && isStep2Valid && isStep3Valid && isStep4Valid;

  // Onboarding Submission
  async function createCreatorProfile(event: FormEvent) {
    event.preventDefault();

    const finalName = creatorName.trim();
    const finalUsername = cleanUsername(username.trim());
    const finalEmail = email.trim().toLowerCase();
    const finalSpecialization = specialization.trim();
    const finalBio = bio.trim() || "Generative AI creator specializing in cinematic content.";

    if (!finalName || !finalUsername || !finalEmail) {
      setMessage("Please complete all required fields in Step 1.");
      setCurrentStep(1);
      return;
    }

    let currentUserUid = user?.uid;
    if (!currentUserUid) {
      currentUserUid = `creator-${finalUsername}-${Math.random().toString(36).substring(2, 6)}`;
      setLocalUser({
        uid: currentUserUid,
        email: finalEmail,
        displayName: finalName,
      });
    }

    try {
      setIsCreating(true);
      setMessage("");

      let existingData: Record<string, unknown> | null = null;
      try {
        const creatorRef = doc(db, "creators", finalUsername);
        const existingCreator = await getDoc(creatorRef);
        if (existingCreator.exists()) {
          existingData = existingCreator.data();
          if (existingData?.ownerUid && existingData.ownerUid !== currentUserUid) {
            setMessage("That username is taken by another creator. Please pick a different handle.");
            setCurrentStep(1);
            setIsCreating(false);
            return;
          }
        }
      } catch (checkErr) {
        console.warn("Firestore read notice:", checkErr);
      }

      const creatorDocData = {
        ownerUid: currentUserUid,
        name: finalName,
        username: finalUsername,
        email: finalEmail,
        bio: finalBio,
        specialization: finalSpecialization,
        skills,
        aiTools,
        aiModels,
        contentTypes,
        formats,
        commercialUse: Boolean(commercialUse),
        availability,
        workflow: workflow.trim(),
        profilePhoto: profilePhoto || (existingData?.profilePhoto as string) || "",
        socialLinks: {
          website: website.trim(),
          instagram: instagram.trim(),
          youtube: youtube.trim(),
          x: xLink.trim(),
        },
        verified: (existingData?.verified as boolean) ?? true,
        verification: (existingData?.verification as { tools?: boolean; workflow?: boolean; portfolio?: boolean }) ?? {
          tools: true,
          workflow: Boolean(workflow.trim()),
          portfolio: true,
        },
        status: (existingData?.status as string) ?? "Active",
        theme: activeTheme,
        createdFrom: "join_creator_page",
        createdAt: existingData?.createdAt ?? serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      try {
        const creatorRef = doc(db, "creators", finalUsername);
        await setDoc(creatorRef, creatorDocData, { merge: true });

        // Seed initial portfolio showcase item
        const initialProject = {
          id: "project-1",
          title: `${finalSpecialization} Showcase Reel`,
          description: finalBio,
          mediaUrl: "/creators/digitaldavincis/reels/reel-1.mp4",
          thumbnailUrl: profilePhoto || "/creators/digitaldavincis/reels/reel-1.jpg",
          contentType: contentTypes[0] || "Short-form Video (Reels/TikTok)",
          tools: aiTools,
          models: aiModels,
          skills: skills,
          workflow: workflow.trim() || `${aiTools.join(" → ")} → Topaz 4K`,
          formats: formats,
          commercialUse: Boolean(commercialUse),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        try {
          await setDoc(doc(db, "creators", finalUsername, "portfolio", "project-1"), initialProject, { merge: true });
        } catch {
          // ignore
        }
      } catch (writeErr) {
        console.warn("Firestore write notice (saved to local session store):", writeErr);
      }

      // Persist locally for instant offline/demo recovery and discover talent sync
      if (typeof window !== "undefined") {
        localStorage.setItem("krealink-profile-" + finalUsername, JSON.stringify(creatorDocData));
        localStorage.setItem("krealink-current-creator", finalUsername);
        localStorage.setItem("krealink-newly-joined-creator", finalUsername);

        try {
          const raw = localStorage.getItem("krealink-registered-creators");
          const existing = raw ? JSON.parse(raw) : [];
          const updated = [
            creatorDocData,
            ...existing.filter((c: { username?: string }) => c.username?.toLowerCase() !== finalUsername.toLowerCase()),
          ];
          localStorage.setItem("krealink-registered-creators", JSON.stringify(updated));
        } catch {
          // ignore
        }
      }

      setMessage("AI Creator profile created and listed on Discover Talent! Launching Creator Studio...");

      setTimeout(() => {
        router.push(`/creator-studio?creator=${finalUsername}`);
      }, 700);
    } catch (error) {
      console.error("Failed to create creator profile:", error);
      setMessage("Something went wrong while saving your profile. Please try again.");
    } finally {
      setIsCreating(false);
    }
  }

  const creatorInitial = creatorName.trim().charAt(0).toUpperCase() || "K";

  return (
    <main className="min-h-screen bg-[#07080c] text-white flex flex-col">
      {/* Top Studio Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#090b11]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 md:px-8">
          <Link href="/" className="flex items-center gap-3 group">
            <KreaLinkLogo size={36} glow={true} className="transition group-hover:scale-105" />
            <div>
              <span className="font-heading font-bold text-base tracking-tight text-white">
                KreaLink
              </span>
              <span className="hidden sm:inline-block ml-2 text-[11px] font-mono uppercase tracking-wider text-slate-400">
                · Creator Studio Onboarding
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-xs font-medium text-slate-400 hover:text-white transition"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Studio Frame */}
      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 w-full flex-1 flex flex-col">
        {/* Step Progress Tracker */}
        <div className="mb-8 rounded-2xl border border-white/[0.08] bg-[#0c0e15] p-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-400">
                Step {currentStep} of 4
              </span>
              <h2 className="text-lg font-heading font-bold text-white">
                {currentStep === 1 && "Identity & Specialization"}
                {currentStep === 2 && "AI Tech Stack & Foundation Models"}
                {currentStep === 3 && "Deliverable Formats & Pipeline"}
                {currentStep === 4 && "Commercial Rights & Studio Launch"}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {[
                { num: 1, label: "Identity" },
                { num: 2, label: "AI Stack" },
                { num: 3, label: "Formats" },
                { num: 4, label: "Launch" },
              ].map((s) => (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => setCurrentStep(s.num as 1 | 2 | 3 | 4)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    currentStep === s.num
                      ? "bg-white text-black font-bold shadow"
                      : currentStep > s.num
                      ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                      : "bg-white/[0.03] text-slate-400 hover:text-white"
                  }`}
                >
                  <span className="font-mono text-[10px]">{s.num}</span>
                  <span className="hidden md:inline">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3.5 h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-300"
              style={{ width: `${currentStep * 25}%` }}
            />
          </div>
        </div>

        {/* 2-Column Responsive Studio Layout */}
        <div className="grid gap-8 lg:grid-cols-12 flex-1 items-start">
          {/* ======================================================== */}
          {/* LEFT COLUMN: LIVE TALENT CARD PREVIEW (5 COLS) */}
          {/* ======================================================== */}
          <div className="lg:col-span-5 sticky top-24 space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e15] p-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  Live Portfolio Preview
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Real-time sync
                </span>
              </div>

              {/* Creator Card */}
              <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/40 p-4">
                <div className="flex items-start gap-3.5">
                  <div className="h-16 w-16 shrink-0 rounded-2xl overflow-hidden bg-gradient-to-tr from-indigo-500 to-purple-500 p-0.5 shadow-lg">
                    <div className="h-full w-full rounded-[14px] bg-[#090b11] flex items-center justify-center text-xl font-heading font-bold text-white overflow-hidden">
                      {profilePhoto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profilePhoto} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        creatorInitial
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading font-bold text-base text-white truncate">
                        {creatorName || "Your Name"}
                      </h3>
                      <span className="shrink-0 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-mono font-bold text-emerald-300">
                        {commercialUse ? "Commercial" : "Showcase"}
                      </span>
                    </div>
                    <p className="text-xs text-indigo-400 font-mono mt-0.5 truncate">
                      @{username || "handle"}
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">
                      {specialization}
                    </p>
                  </div>
                </div>

                {/* Bio Snippet */}
                <p className="mt-3 text-xs text-slate-300 line-clamp-2 italic leading-relaxed">
                  &quot;{bio || "Your creative statement and generative specialties will appear here."}&quot;
                </p>

                {/* Active Stack Chips */}
                <div className="mt-3.5 border-t border-white/[0.06] pt-3">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-1.5">
                    Selected AI Stack:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[...aiTools, ...aiModels].slice(0, 5).map((item) => (
                      <span
                        key={item}
                        className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] font-mono text-slate-300"
                      >
                        {item}
                      </span>
                    ))}
                    {[...aiTools, ...aiModels].length > 5 && (
                      <span className="text-[10px] font-mono text-slate-400 self-center">
                        +{([...aiTools, ...aiModels].length - 5)} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Content Types Snippet */}
                <div className="mt-2.5 border-t border-white/[0.06] pt-2 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-mono">{contentTypes[0] || "Video Reels"}</span>
                  <span className="text-emerald-400 font-mono">{availability}</span>
                </div>
              </div>

              {/* Status Note */}
              <div className="mt-3 text-center">
                <span className="text-[11px] text-slate-500 font-mono">
                  Indexed in KreaLink 7-Factor Discovery Algorithm
                </span>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* RIGHT COLUMN: FOCUSED STEP FORM CONTAINER (7 COLS) */}
          {/* ======================================================== */}
          <div className="lg:col-span-7">
            <form onSubmit={createCreatorProfile} className="rounded-2xl border border-white/[0.08] bg-[#0c0e15] p-6 shadow-2xl">
              {/* ======================================================== */}
              {/* STEP 1: IDENTITY & SPECIALIZATION */}
              {/* ======================================================== */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="border-b border-white/[0.08] pb-3">
                    <h3 className="text-base font-heading font-bold text-white">1. Creator Identity &amp; Handle</h3>
                    <p className="text-xs text-slate-400">Establish your marketplace branding and primary generative title.</p>
                  </div>

                  {/* Profile Photo */}
                  <div className="rounded-xl border border-white/[0.06] bg-black/40 p-3.5 flex items-center gap-4">
                    <div className="h-14 w-14 shrink-0 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center font-heading font-bold text-lg text-white">
                      {profilePhoto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profilePhoto} alt="Upload" className="h-full w-full object-cover" />
                      ) : (
                        creatorInitial
                      )}
                    </div>
                    <div>
                      <input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePhotoUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="photo-upload"
                        className="inline-block cursor-pointer rounded-lg border border-white/10 bg-white/[0.06] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white/[0.12] transition"
                      >
                        {profilePhoto ? "Change Avatar" : "Upload Avatar Image"}
                      </label>
                      <p className="text-[11px] text-slate-400 mt-1">PNG, JPG, or WebP up to 600KB</p>
                    </div>
                  </div>

                  {/* Name and Handle */}
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Full Name or Studio *
                      </label>
                      <input
                        value={creatorName}
                        onChange={(e) => setCustomCreatorName(e.target.value)}
                        placeholder="e.g. Maya Verma"
                        required
                        className="w-full rounded-xl border border-white/10 bg-black/50 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-white outline-none placeholder:text-slate-500 focus:border-indigo-500/60"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Creator Handle (@username) *
                      </label>
                      <input
                        value={username}
                        onChange={(e) => setCustomUsername(cleanUsername(e.target.value))}
                        placeholder="e.g. mayaverma"
                        required
                        className="w-full rounded-xl border border-white/10 bg-black/50 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-white outline-none placeholder:text-slate-500 focus:border-indigo-500/60"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Professional Contact Email *
                    </label>
                    <input
                      value={email}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      type="email"
                      placeholder="creator@studio.com"
                      required
                      className="w-full rounded-xl border border-white/10 bg-black/50 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-white outline-none placeholder:text-slate-500 focus:border-indigo-500/60"
                    />
                  </div>

                  {/* Specialization Selection */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Primary AI Specialization *
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_SPECIALIZATIONS.map((spec) => (
                        <button
                          key={spec}
                          type="button"
                          onClick={() => setSpecialization(spec)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                            specialization === spec
                              ? "bg-white text-black font-bold shadow-sm"
                              : "border border-white/10 bg-white/[0.03] text-slate-400 hover:text-white"
                          }`}
                        >
                          {spec}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Creator Statement &amp; Bio *
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Describe your generative directing style, camera motion control, and narrative focus..."
                      rows={3}
                      className="w-full resize-none rounded-xl border border-white/10 bg-black/50 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-white outline-none placeholder:text-slate-500 focus:border-indigo-500/60"
                    />
                  </div>

                  {/* Step 1 Actions */}
                  <div className="pt-4 border-t border-white/[0.08] flex justify-end">
                    <button
                      type="button"
                      disabled={!isStep1Valid}
                      onClick={() => setCurrentStep(2)}
                      className="rounded-xl bg-white px-6 py-2.5 text-xs font-heading font-bold text-black hover:bg-slate-200 transition disabled:opacity-40"
                    >
                      Continue to AI Stack (Step 2) →
                    </button>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* STEP 2: AI TECH STACK & FOUNDATION MODELS */}
              {/* ======================================================== */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="border-b border-white/[0.08] pb-3">
                    <h3 className="text-base font-heading font-bold text-white">2. AI Tech Stack &amp; Tools</h3>
                    <p className="text-xs text-slate-400">Specify your generative engines and skills for algorithmic matching.</p>
                  </div>

                  <CompactChipSelector
                    title="AI Generation Platforms"
                    subtitle="Select all tools you actively deploy for client productions"
                    presets={PRESET_AI_TOOLS}
                    selected={aiTools}
                    onToggle={toggleAiTool}
                    onAddCustom={addCustomAiTool}
                  />

                  <CompactChipSelector
                    title="Foundation Video & Visual Models"
                    subtitle="Select models you specialize in (Runway Gen-3, Midjourney v6.1, Flux.1, Kling...)"
                    presets={PRESET_AI_MODELS}
                    selected={aiModels}
                    onToggle={toggleAiModel}
                    onAddCustom={addCustomAiModel}
                  />

                  <CompactChipSelector
                    title="Specialized Production Skills"
                    subtitle="Camera motion, character consistency, LoRA training, upscaling..."
                    presets={PRESET_SKILLS}
                    selected={skills}
                    onToggle={toggleSkill}
                    onAddCustom={addCustomSkill}
                  />

                  {/* Step 2 Actions */}
                  <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                    >
                      ← Back to Identity
                    </button>
                    <button
                      type="button"
                      disabled={!isStep2Valid}
                      onClick={() => setCurrentStep(3)}
                      className="rounded-xl bg-white px-6 py-2.5 text-xs font-heading font-bold text-black hover:bg-slate-200 transition disabled:opacity-40"
                    >
                      Continue to Deliverables (Step 3) →
                    </button>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* STEP 3: DELIVERABLE FORMATS & PRODUCTION PIPELINE */}
              {/* ======================================================== */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="border-b border-white/[0.08] pb-3">
                    <h3 className="text-base font-heading font-bold text-white">3. Content Types &amp; Pipeline Recipe</h3>
                    <p className="text-xs text-slate-400">Define your production formats and describe your creation workflow.</p>
                  </div>

                  <CompactChipSelector
                    title="Campaign Content Types"
                    subtitle="Commercials, short-form reels, animated teasers, product ads..."
                    presets={PRESET_CONTENT_TYPES}
                    selected={contentTypes}
                    onToggle={toggleContentType}
                    onAddCustom={addCustomContentType}
                  />

                  <CompactChipSelector
                    title="Supported Aspect Ratios &amp; Resolutions"
                    subtitle="9:16 Vertical, 16:9 Landscape, 4K UHD, Cinematic Widescreen..."
                    presets={PRESET_FORMATS}
                    selected={formats}
                    onToggle={toggleFormat}
                    onAddCustom={addCustomFormat}
                  />

                  {/* Production Pipeline Workflow */}
                  <div className="rounded-xl border border-white/[0.08] bg-[#0c0e15] p-4">
                    <label className="block text-xs font-heading font-semibold text-white mb-1">
                      Generative Production Pipeline Recipe
                    </label>
                    <p className="text-[11px] text-slate-400 mb-2">
                      Outline your step-by-step workflow (e.g., Midjourney concept art → Runway Gen-3 camera movement → Topaz 4K upscale → DaVinci grading)
                    </p>
                    <textarea
                      value={workflow}
                      onChange={(e) => setWorkflow(e.target.value)}
                      placeholder="e.g. Midjourney for character generation, Runway Gen-3 / Kling 1.5 for motion, Topaz for 4K upscale, and DaVinci Resolve for final sound & grading."
                      rows={3}
                      className="w-full resize-none rounded-lg border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-medium text-white outline-none placeholder:text-slate-500 focus:border-indigo-500/60"
                    />
                  </div>

                  {/* Step 3 Actions */}
                  <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                    >
                      ← Back to AI Stack
                    </button>
                    <button
                      type="button"
                      disabled={!isStep3Valid}
                      onClick={() => setCurrentStep(4)}
                      className="rounded-xl bg-white px-6 py-2.5 text-xs font-heading font-bold text-black hover:bg-slate-200 transition disabled:opacity-40"
                    >
                      Continue to Commercial Terms (Step 4) →
                    </button>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* STEP 4: COMMERCIAL TERMS & LAUNCH */}
              {/* ======================================================== */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <div className="border-b border-white/[0.08] pb-3">
                    <h3 className="text-base font-heading font-bold text-white">4. Commercial Terms &amp; Launch</h3>
                    <p className="text-xs text-slate-400">Confirm commercial clearance guarantees, availability, and launch your studio profile.</p>
                  </div>

                  {/* Commercial Rights Toggle */}
                  <div className="rounded-xl border border-white/[0.08] bg-[#0c0e15] p-4">
                    <span className="text-xs font-heading font-semibold text-white block mb-1">
                      Commercial Licensing Clearance *
                    </span>
                    <p className="text-[11px] text-slate-400 mb-3">
                      Guarantee that your generative deliverables include full commercial advertising rights.
                    </p>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setCommercialUse(true)}
                        className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                          commercialUse
                            ? "border-emerald-500/50 bg-emerald-500/10 text-white"
                            : "border-white/10 bg-white/[0.02] text-slate-400"
                        }`}
                      >
                        <span className="text-lg">⚡</span>
                        <div>
                          <p className="text-xs font-bold text-white">Full Commercial Rights Granted</p>
                          <p className="text-[10px] text-slate-400">Cleared for brand campaigns &amp; advertising.</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCommercialUse(false)}
                        className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                          !commercialUse
                            ? "border-amber-500/50 bg-amber-500/10 text-white"
                            : "border-white/10 bg-white/[0.02] text-slate-400"
                        }`}
                      >
                        <span className="text-lg">🎨</span>
                        <div>
                          <p className="text-xs font-bold text-white">Non-Commercial / Showcase Only</p>
                          <p className="text-[10px] text-slate-400">Limited to editorial or experimental showcase.</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Availability */}
                  <div className="rounded-xl border border-white/[0.08] bg-[#0c0e15] p-4">
                    <span className="text-xs font-heading font-semibold text-white block mb-1">
                      Production Availability *
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {PRESET_AVAILABILITY.map((avail) => (
                        <button
                          key={avail}
                          type="button"
                          onClick={() => setAvailability(avail)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                            availability === avail
                              ? "bg-white text-black font-bold shadow-sm"
                              : "border border-white/10 bg-white/[0.03] text-slate-400 hover:text-white"
                          }`}
                        >
                          {avail}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Social & Portfolio Links */}
                  <div className="rounded-xl border border-white/[0.08] bg-[#0c0e15] p-4">
                    <span className="text-xs font-heading font-semibold text-white block mb-1">
                      Portfolio &amp; External Links (Optional)
                    </span>
                    <div className="grid gap-2.5 sm:grid-cols-2 mt-2">
                      <input
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="Portfolio Website URL"
                        className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs font-medium text-white outline-none placeholder:text-slate-500 focus:border-indigo-500/60"
                      />
                      <input
                        value={xLink}
                        onChange={(e) => setXLink(e.target.value)}
                        placeholder="𝕏 / Twitter Profile"
                        className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs font-medium text-white outline-none placeholder:text-slate-500 focus:border-indigo-500/60"
                      />
                      <input
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                        placeholder="Instagram Profile"
                        className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs font-medium text-white outline-none placeholder:text-slate-500 focus:border-indigo-500/60"
                      />
                      <input
                        value={youtube}
                        onChange={(e) => setYoutube(e.target.value)}
                        placeholder="YouTube / Vimeo URL"
                        className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs font-medium text-white outline-none placeholder:text-slate-500 focus:border-indigo-500/60"
                      />
                    </div>
                  </div>

                  {/* Error / Status Message */}
                  {message && (
                    <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 text-xs font-semibold text-indigo-300">
                      {message}
                    </div>
                  )}

                  {/* Step 4 Actions */}
                  <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                    >
                      ← Back to Deliverables
                    </button>
                    <button
                      type="submit"
                      disabled={isCreating || !isAllValid}
                      className="rounded-xl bg-white px-8 py-3 text-xs sm:text-sm font-heading font-bold text-black hover:bg-slate-200 transition disabled:opacity-40 shadow-xl"
                    >
                      {isCreating ? "Publishing Profile..." : "Launch AI Creator Profile 🚀"}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
