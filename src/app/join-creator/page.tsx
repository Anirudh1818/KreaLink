"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useStoredTheme } from "@/lib/use-theme";
import { useAuth } from "@/lib/auth-context";

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

// Helper chip multi-select component
function ChipSelector({
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
    <div className="rounded-[1.6rem] border border-white/10 bg-black/25 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <label className="text-sm font-bold text-white/70">{title}</label>
          {subtitle && <p className="text-xs text-white/40">{subtitle}</p>}
        </div>
        <span className="rounded-full bg-white/[0.07] px-2.5 py-0.5 text-xs font-bold text-white/60">
          {selected.length} selected
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {presets.map((item) => {
          const isSelected = selected.includes(item);
          return (
            <button
              key={item}
              type="button"
              onClick={() => onToggle(item)}
              className={`rounded-xl px-3 py-2 text-xs font-bold transition-all duration-200 ${
                isSelected
                  ? "border border-white/30 bg-white/20 text-white shadow-sm"
                  : "border border-white/10 bg-white/[0.04] text-white/60 hover:border-white/20 hover:bg-white/[0.08] hover:text-white/90"
              }`}
              style={
                isSelected && accentColor
                  ? {
                      borderColor: accentColor,
                      boxShadow: `0 0 16px ${accentColor}40`,
                    }
                  : undefined
              }
            >
              {isSelected ? "✓ " : "+ "}
              {item}
            </button>
          );
        })}

        {/* Custom selected items that are not in the presets list */}
        {selected
          .filter((item) => !presets.includes(item))
          .map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onToggle(item)}
              className="rounded-xl border border-white/30 bg-white/20 px-3 py-2 text-xs font-bold text-white shadow-sm"
              style={
                accentColor
                  ? {
                      borderColor: accentColor,
                      boxShadow: `0 0 16px ${accentColor}40`,
                    }
                  : undefined
              }
            >
              ✓ {item} (custom)
            </button>
          ))}
      </div>

      {/* Quick Add Custom tag */}
      <div className="mt-3 flex gap-2">
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
          className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs font-bold text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2 text-xs font-bold text-white/70 transition hover:bg-white/[0.12] hover:text-white"
        >
          + Add
        </button>
      </div>
    </div>
  );
}

export default function JoinCreatorPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeTheme, theme } = useStoredTheme();

  // Basic Information
  const [creatorName, setCreatorName] = useState("");
  const [username, setUsername] = useState("");
  const [customEmail, setCustomEmail] = useState<string | null>(null);
  const email = customEmail !== null ? customEmail : (user?.email || "");
  const [bio, setBio] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");

  // AI Specialization & Capabilities
  const [specialization, setSpecialization] = useState(
    "AI Filmmaker & Director"
  );
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
  const [contentTypes, setContentTypes] = useState<string[]>([
    "Brand Commercials",
    "Short-Form Video (Reels/TikTok)",
  ]);
  const [formats, setFormats] = useState<string[]>([
    "9:16 Vertical (Reels / TikTok / Shorts)",
    "16:9 Landscape (YouTube / TV / Cinema)",
  ]);

  // Commercial & Availability
  const [commercialUse, setCommercialUse] = useState<boolean>(true);
  const [availability, setAvailability] = useState<string>(
    "Available immediately"
  );
  const [workflow, setWorkflow] = useState<string>("");

  // External Links (Optional)
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");
  const [xLink, setXLink] = useState("");
  const [showSocialLinks, setShowSocialLinks] = useState(false);

  // Form State
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState("");

  function cleanUsername(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9-]/g, "");
  }

  function handleProfilePhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Please upload an image file.");
      return;
    }

    // Keep photo size under 600KB for Firestore doc inline storage
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
    if (trimmed && !skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed]);
    }
  }

  function addCustomAiTool(item: string) {
    const trimmed = item.trim();
    if (trimmed && !aiTools.includes(trimmed)) {
      setAiTools((prev) => [...prev, trimmed]);
    }
  }

  function addCustomAiModel(item: string) {
    const trimmed = item.trim();
    if (trimmed && !aiModels.includes(trimmed)) {
      setAiModels((prev) => [...prev, trimmed]);
    }
  }

  function addCustomContentType(item: string) {
    const trimmed = item.trim();
    if (trimmed && !contentTypes.includes(trimmed)) {
      setContentTypes((prev) => [...prev, trimmed]);
    }
  }

  function addCustomFormat(item: string) {
    const trimmed = item.trim();
    if (trimmed && !formats.includes(trimmed)) {
      setFormats((prev) => [...prev, trimmed]);
    }
  }

  // Validation readiness check
  const isFormReady =
    Boolean(creatorName.trim()) &&
    Boolean(username.trim()) &&
    Boolean(email.trim()) &&
    Boolean(specialization.trim()) &&
    Boolean(bio.trim()) &&
    skills.length > 0 &&
    aiTools.length > 0 &&
    aiModels.length > 0 &&
    contentTypes.length > 0 &&
    formats.length > 0 &&
    Boolean(availability);

  async function createCreatorProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const finalName = creatorName.trim();
    const finalUsername = cleanUsername(username.trim());
    const finalEmail = email.trim().toLowerCase();
    const finalSpecialization = specialization.trim();
    const finalBio = bio.trim();

    if (!finalName) {
      setMessage("Please enter your creator name.");
      return;
    }

    if (!finalUsername) {
      setMessage("Please enter a username.");
      return;
    }

    if (!finalEmail || !finalEmail.includes("@") || !finalEmail.includes(".")) {
      setMessage("Please enter a valid email address.");
      return;
    }

    if (!finalSpecialization) {
      setMessage("Please select or specify your AI specialization.");
      return;
    }

    if (!finalBio) {
      setMessage("Please write a short bio about your AI creative work.");
      return;
    }

    if (skills.length === 0) {
      setMessage("Please select at least one skill.");
      return;
    }

    if (aiTools.length === 0) {
      setMessage("Please select at least one AI tool you use.");
      return;
    }

    if (aiModels.length === 0) {
      setMessage("Please select at least one AI model you work with.");
      return;
    }

    if (contentTypes.length === 0) {
      setMessage("Please select at least one content type you produce.");
      return;
    }

    if (formats.length === 0) {
      setMessage("Please select at least one supported format or aspect ratio.");
      return;
    }

    if (!availability) {
      setMessage("Please select your availability status.");
      return;
    }

    if (!user) {
      setMessage(
        "Please sign in first — your creator profile is tied to your account."
      );
      setTimeout(() => router.push("/login?next=/join-creator"), 1200);
      return;
    }

    try {
      setIsCreating(true);
      setMessage("");

      // Check if username is already taken by a different user (merge-safe check)
      const creatorRef = doc(db, "creators", finalUsername);
      const existingCreator = await getDoc(creatorRef);

      if (existingCreator.exists()) {
        const existingData = existingCreator.data();
        if (existingData?.ownerUid && existingData.ownerUid !== user.uid) {
          setMessage(
            "That username is already taken by another creator. Please choose another."
          );
          return;
        }
      }

      const existingData = existingCreator.exists()
        ? existingCreator.data()
        : null;

      const creatorDocData = {
        ownerUid: user.uid,
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
        profilePhoto: profilePhoto || existingData?.profilePhoto || "",
        socialLinks: {
          website: website.trim(),
          instagram: instagram.trim(),
          youtube: youtube.trim(),
          x: xLink.trim(),
        },
        verified: existingData?.verified ?? false,
        verification: existingData?.verification ?? {
          tools: false,
          workflow: false,
          portfolio: false,
        },
        status: existingData?.status ?? "Active",
        theme: activeTheme,
        createdFrom: "join_creator_page",
        createdAt: existingData?.createdAt ?? serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Merge-safe write
      await setDoc(creatorRef, creatorDocData, { merge: true });

      localStorage.setItem("krealink-current-creator", finalUsername);
      localStorage.setItem("fanstreak-current-creator", finalUsername);

      setMessage("AI Creator profile created successfully! Opening Creator Studio...");

      setTimeout(() => {
        router.push(`/creator-studio?creator=${finalUsername}`);
      }, 900);
    } catch (error) {
      console.error("Failed to create creator profile:", error);
      setMessage("Something went wrong while saving your profile. Please try again.");
    } finally {
      setIsCreating(false);
    }
  }

  const creatorInitial =
    creatorName.trim().charAt(0).toUpperCase() || "K";

  const previewName = creatorName.trim() || "AI Creator";
  const previewUsername = username.trim() || "username";
  const previewSpecialization =
    specialization.trim() || "AI Filmmaker & Director";
  const previewBio =
    bio.trim() ||
    "AI-native creator specializing in cinematic video generation, high-fidelity consistency, and commercial brand assets.";

  return (
    <main className="min-h-screen overflow-hidden bg-[#030306] text-white">
      {/* Background ambient lighting */}
      <div className="pointer-events-none fixed inset-0">
        <div
          className="absolute left-1/2 top-0 h-[560px] w-[560px] -translate-x-1/2 rounded-full blur-[115px]"
          style={{ background: theme.glow, opacity: 0.95 }}
        />
        <div
          className="absolute right-[-120px] top-40 h-[420px] w-[420px] rounded-full blur-[105px]"
          style={{ background: theme.glow, opacity: 0.75 }}
        />
        <div
          className="absolute bottom-[-120px] left-[-120px] h-[440px] w-[440px] rounded-full blur-[120px]"
          style={{ background: theme.glow, opacity: 0.5 }}
        />
      </div>

      {/* Top Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07070a]/85 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl border bg-white/5 font-black text-xl"
              style={{
                borderColor: theme.border,
                boxShadow: `0 0 36px ${theme.glow}`,
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
                AI Content Creator Marketplace
              </p>
            </div>
          </Link>

          <Link
            href="/"
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white/65 transition hover:bg-white/[0.08]"
          >
            Back home
          </Link>
        </nav>
      </header>

      {/* Main Content Area: 2 Columns */}
      <section className="relative z-10 mx-auto grid max-w-7xl gap-8 px-5 py-10 lg:grid-cols-[0.92fr_1.08fr] md:px-8 md:py-16">
        {/* Left Column: Headline and Live Profile Preview Card */}
        <div className="flex flex-col">
          <div className="sticky top-28 space-y-6">
            <div>
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-white/50">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                AI Creator Network
              </div>

              <h2 className="mt-5 text-4xl font-black leading-[1.04] tracking-tight md:text-6xl">
                Launch your
                <br />
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: theme.text }}
                >
                  KreaLink profile.
                </span>
              </h2>

              <p className="mt-4 text-base leading-7 text-white/60 md:text-lg">
                Showcase your AI tools, models, skills, and availability. Get
                discovered and hired by top brands and creative agencies.
              </p>
            </div>

            {/* Live Profile Card Preview */}
            <div className="rounded-[2.2rem] border border-white/10 bg-white/[0.035] p-5 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-white/40">
                  Live Creator Card Preview
                </p>
                <span className="text-xs font-bold text-white/35">
                  Real-time preview
                </span>
              </div>

              <div className="mt-4 rounded-[1.8rem] border border-white/10 bg-black/40 p-5 shadow-inner">
                {/* Avatar and basic info */}
                <div className="flex items-start gap-4">
                  <div
                    className="h-20 w-20 shrink-0 overflow-hidden rounded-3xl p-[3px]"
                    style={{
                      background: theme.gradient,
                      boxShadow: `0 0 32px ${theme.glow}`,
                    }}
                  >
                    <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[1.35rem] bg-[#111116] text-3xl font-black">
                      {profilePhoto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={profilePhoto}
                          alt="Creator preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        creatorInitial
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-xl font-black md:text-2xl">
                      {previewName}
                    </h3>
                    <p className="truncate text-xs font-bold text-white/45">
                      krealink.ai/@{previewUsername}
                    </p>
                    <p className="mt-1 inline-block rounded-lg bg-white/[0.08] px-2.5 py-0.5 text-xs font-black text-white/80">
                      {previewSpecialization}
                    </p>
                  </div>
                </div>

                {/* Status Pills */}
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {availability}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 ${
                      commercialUse
                        ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                        : "border-white/10 bg-white/[0.05] text-white/50"
                    }`}
                  >
                    {commercialUse ? "⚡ Commercial Rights Ready" : "🎨 Non-Commercial"}
                  </span>
                </div>

                {/* Bio */}
                <p className="mt-4 text-xs leading-6 text-white/65">
                  {previewBio}
                </p>

                {/* Selected Capabilities Showcase */}
                <div className="mt-4 space-y-2.5 border-t border-white/10 pt-4">
                  {/* Skills */}
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-white/40">
                      Skills:
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {skills.length > 0 ? (
                        skills.map((s) => (
                          <span
                            key={s}
                            className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-bold text-white/70"
                          >
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs italic text-white/30">
                          No skills selected yet
                        </span>
                      )}
                    </div>
                  </div>

                  {/* AI Tools & Models */}
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-white/40">
                      AI Stack:
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {[...aiTools, ...aiModels].length > 0 ? (
                        [...aiTools, ...aiModels].map((tool) => (
                          <span
                            key={tool}
                            className="rounded-lg border border-white/10 bg-white/[0.08] px-2 py-0.5 text-[11px] font-bold text-white/90"
                          >
                            {tool}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs italic text-white/30">
                          No tools selected yet
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content Types & Formats */}
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-white/40">
                      Deliverables:
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {[...contentTypes, ...formats].length > 0 ? (
                        [...contentTypes, ...formats].slice(0, 5).map((item) => (
                          <span
                            key={item}
                            className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] font-bold text-white/60"
                          >
                            {item}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs italic text-white/30">
                          No content types or formats selected
                        </span>
                      )}
                      {[...contentTypes, ...formats].length > 5 && (
                        <span className="text-[11px] font-bold text-white/40 self-center">
                          +{([...contentTypes, ...formats].length - 5)} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Workflow preview if entered */}
                  {workflow && (
                    <div className="pt-1">
                      <span className="text-[11px] font-black uppercase tracking-wider text-white/40">
                        Pipeline:
                      </span>
                      <p className="mt-0.5 text-[11px] italic text-white/50 line-clamp-2">
                        &quot;{workflow}&quot;
                      </p>
                    </div>
                  )}
                </div>

                {/* External links indicator */}
                <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-3">
                  {website && (
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-bold text-white/60">
                      🌐 Website
                    </span>
                  )}
                  {xLink && (
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-bold text-white/60">
                      𝕏 Profile
                    </span>
                  )}
                  {instagram && (
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-bold text-white/60">
                      📸 Instagram
                    </span>
                  )}
                  {youtube && (
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-bold text-white/60">
                      ▶ YouTube
                    </span>
                  )}
                  {!website && !xLink && !instagram && !youtube && (
                    <span className="text-[11px] text-white/30 italic">
                      Links will appear here
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Form */}
        <form
          onSubmit={createCreatorProfile}
          className="rounded-[2.6rem] border border-white/10 bg-[#0b0810]/90 p-6 shadow-2xl backdrop-blur-xl md:p-8"
          style={{ boxShadow: `0 0 110px ${theme.glow}` }}
        >
          <div className="border-b border-white/10 pb-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/40">
              Creator Onboarding
            </p>
            <h3 className="mt-2 text-3xl font-black md:text-4xl">
              Create AI Creator Profile
            </h3>
            <p className="mt-2 text-sm leading-6 text-white/50">
              Complete your profile to get indexed in KreaLink&apos;s AI brief
              matching engine.
            </p>
          </div>

          <div className="mt-6 space-y-6">
            {/* Section 1: Basic Info */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
                1. Basic Information
              </h4>

              {/* Profile Photo */}
              <div className="rounded-[1.8rem] border border-white/10 bg-black/25 p-4">
                <label className="mb-3 block text-sm font-bold text-white/60">
                  Profile photo
                </label>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div
                    className="h-20 w-20 overflow-hidden rounded-3xl p-[3px]"
                    style={{ background: theme.gradient }}
                  >
                    <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[1.35rem] bg-[#111116] text-2xl font-black">
                      {profilePhoto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={profilePhoto}
                          alt="Uploaded profile"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        creatorInitial
                      )}
                    </div>
                  </div>

                  <div className="flex-1">
                    <input
                      id="profile-photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePhotoUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="profile-photo-upload"
                      className="inline-flex cursor-pointer rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 text-xs font-black text-white/80 transition hover:bg-white/[0.09]"
                    >
                      {profilePhoto ? "Change photo" : "Upload photo"}
                    </label>
                    <p className="mt-2 text-xs text-white/35">
                      JPG, PNG, or WebP up to 600KB.
                    </p>
                  </div>
                </div>
              </div>

              {/* Name and Username */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-white/60">
                    Full name *
                  </label>
                  <input
                    value={creatorName}
                    onChange={(e) => setCreatorName(e.target.value)}
                    placeholder="e.g. Maya Lin"
                    className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3.5 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-white/25"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-white/60">
                    Username *
                  </label>
                  <input
                    value={username}
                    onChange={(e) =>
                      setUsername(cleanUsername(e.target.value))
                    }
                    placeholder="e.g. mayalin-ai"
                    className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3.5 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-white/25"
                  />
                  <p className="mt-1 text-xs text-white/35">
                    krealink.ai/@{username || "username"}
                  </p>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="mb-2 block text-sm font-bold text-white/60">
                  Contact email *
                </label>
                <input
                  value={email}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  type="email"
                  placeholder="creator@krealink.ai"
                  className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3.5 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-white/25"
                />
              </div>

              {/* Specialization */}
              <div className="rounded-[1.8rem] border border-white/10 bg-black/25 p-4">
                <label className="mb-2 block text-sm font-bold text-white/70">
                  Primary Specialization *
                </label>
                <p className="mb-3 text-xs text-white/40">
                  Select a common AI specialization or customize your title:
                </p>
                <div className="flex flex-wrap gap-2">
                  {PRESET_SPECIALIZATIONS.map((spec) => (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => setSpecialization(spec)}
                      className={`rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                        specialization === spec
                          ? "border border-white/30 bg-white/20 text-white shadow-sm"
                          : "border border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white"
                      }`}
                    >
                      {specialization === spec ? "✓ " : ""}
                      {spec}
                    </button>
                  ))}
                </div>

                <div className="mt-3">
                  <input
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    placeholder="Custom specialization..."
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-bold text-white outline-none placeholder:text-white/25 focus:border-white/30"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="mb-2 block text-sm font-bold text-white/60">
                  Bio *
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Describe your creative style, experience, storytelling approach, and what makes your AI workflows unique."
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-white/10 bg-black/35 px-4 py-3.5 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-white/25"
                />
              </div>
            </div>

            {/* Section 2: AI Capabilities & Toolstack */}
            <div className="space-y-4 pt-2">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
                2. AI Capabilities &amp; Toolstack
              </h4>

              {/* Skills Multi-select */}
              <ChipSelector
                title="Skills & Techniques *"
                subtitle="Select techniques you have mastered (multi-select)"
                presets={PRESET_SKILLS}
                selected={skills}
                onToggle={toggleSkill}
                onAddCustom={addCustomSkill}
                accentColor={theme.border}
              />

              {/* AI Tools Multi-select */}
              <ChipSelector
                title="AI Tools & Platforms *"
                subtitle="Tools used in your creation process (multi-select)"
                presets={PRESET_AI_TOOLS}
                selected={aiTools}
                onToggle={toggleAiTool}
                onAddCustom={addCustomAiTool}
                accentColor={theme.border}
              />

              {/* AI Models Multi-select */}
              <ChipSelector
                title="AI Models Used *"
                subtitle="Generative foundation models you work with (multi-select)"
                presets={PRESET_AI_MODELS}
                selected={aiModels}
                onToggle={toggleAiModel}
                onAddCustom={addCustomAiModel}
                accentColor={theme.border}
              />
            </div>

            {/* Section 3: Deliverables & Formats */}
            <div className="space-y-4 pt-2">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
                3. Deliverables &amp; Formats
              </h4>

              {/* Content Types Multi-select */}
              <ChipSelector
                title="Content Types *"
                subtitle="What formats and campaigns do you produce? (multi-select)"
                presets={PRESET_CONTENT_TYPES}
                selected={contentTypes}
                onToggle={toggleContentType}
                onAddCustom={addCustomContentType}
                accentColor={theme.border}
              />

              {/* Formats / Aspect Ratios Multi-select */}
              <ChipSelector
                title="Supported Formats & Resolutions *"
                subtitle="Aspect ratios and output quality (multi-select)"
                presets={PRESET_FORMATS}
                selected={formats}
                onToggle={toggleFormat}
                onAddCustom={addCustomFormat}
                accentColor={theme.border}
              />
            </div>

            {/* Section 4: Commercial Terms & Workflow */}
            <div className="space-y-4 pt-2">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
                4. Commercial Terms &amp; Availability
              </h4>

              {/* Commercial Rights Selector */}
              <div className="rounded-[1.6rem] border border-white/10 bg-black/25 p-4">
                <div className="mb-2">
                  <label className="text-sm font-bold text-white/70">
                    Commercial Use Rights *
                  </label>
                  <p className="text-xs text-white/40">
                    Can brands hire you for commercial advertising and brand campaigns?
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setCommercialUse(true)}
                    className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition ${
                      commercialUse === true
                        ? "border-emerald-500/60 bg-emerald-500/10 text-white shadow-lg shadow-emerald-500/10"
                        : "border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06]"
                    }`}
                  >
                    <span className="text-xl">⚡</span>
                    <div>
                      <p className="text-sm font-bold text-white">
                        Full Commercial Rights
                      </p>
                      <p className="mt-0.5 text-xs text-white/50">
                        Available for brand briefs, commercial licenses &amp; monetization.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCommercialUse(false)}
                    className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition ${
                      commercialUse === false
                        ? "border-amber-500/60 bg-amber-500/10 text-white shadow-lg shadow-amber-500/10"
                        : "border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06]"
                    }`}
                  >
                    <span className="text-xl">🎨</span>
                    <div>
                      <p className="text-sm font-bold text-white">
                        Non-Commercial Only
                      </p>
                      <p className="mt-0.5 text-xs text-white/50">
                        Limited to editorial, personal showcase, or non-monetized work.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Availability Selector */}
              <div className="rounded-[1.6rem] border border-white/10 bg-black/25 p-4">
                <div className="mb-2">
                  <label className="text-sm font-bold text-white/70">
                    Availability Status *
                  </label>
                  <p className="text-xs text-white/40">
                    Let brands know if you are open to take on creative briefs right now.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {PRESET_AVAILABILITY.map((avail) => (
                    <button
                      key={avail}
                      type="button"
                      onClick={() => setAvailability(avail)}
                      className={`rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                        availability === avail
                          ? "border border-white/30 bg-white/20 text-white shadow-sm"
                          : "border border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white"
                      }`}
                    >
                      {availability === avail ? "✓ " : ""}
                      {avail}
                    </button>
                  ))}
                </div>
              </div>

              {/* Workflow Pipeline */}
              <div className="rounded-[1.6rem] border border-white/10 bg-black/25 p-4">
                <label className="mb-1 block text-sm font-bold text-white/70">
                  Production Workflow &amp; Pipeline (Optional)
                </label>
                <p className="mb-2 text-xs text-white/40">
                  Explain how you produce content (e.g. Midjourney v6.1 → Runway Gen-3 camera rigging → Topaz 4K upscale → Premiere sound design)
                </p>
                <textarea
                  value={workflow}
                  onChange={(e) => setWorkflow(e.target.value)}
                  placeholder="e.g. Midjourney for character generation, Runway Gen-3 / Kling 1.5 for motion, Topaz for 4K upscale, and DaVinci Resolve for final sound & grading."
                  rows={2}
                  className="w-full resize-none rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-bold text-white outline-none placeholder:text-white/25 focus:border-white/25"
                />
              </div>

              {/* Optional Links Hub */}
              <div className="rounded-[1.6rem] border border-white/10 bg-black/25 p-4">
                <button
                  type="button"
                  onClick={() => setShowSocialLinks((current) => !current)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
                      External Links (Optional)
                    </p>
                    <p className="mt-1 text-base font-bold text-white">
                      Portfolio &amp; Social Links
                    </p>
                    <p className="text-xs text-white/45">
                      Website, X/Twitter, Instagram, YouTube links.
                    </p>
                  </div>

                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-2xl text-lg font-black"
                    style={{ background: theme.softGradient }}
                  >
                    {showSocialLinks ? "−" : "+"}
                  </span>
                </button>

                {showSocialLinks && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <input
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="Portfolio / Website URL"
                      className="rounded-xl border border-white/10 bg-black/35 px-3.5 py-3 text-xs font-bold text-white outline-none placeholder:text-white/25 focus:border-white/25"
                    />
                    <input
                      value={xLink}
                      onChange={(e) => setXLink(e.target.value)}
                      placeholder="X / Twitter URL"
                      className="rounded-xl border border-white/10 bg-black/35 px-3.5 py-3 text-xs font-bold text-white outline-none placeholder:text-white/25 focus:border-white/25"
                    />
                    <input
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      placeholder="Instagram URL"
                      className="rounded-xl border border-white/10 bg-black/35 px-3.5 py-3 text-xs font-bold text-white outline-none placeholder:text-white/25 focus:border-white/25"
                    />
                    <input
                      value={youtube}
                      onChange={(e) => setYoutube(e.target.value)}
                      placeholder="YouTube / Vimeo URL"
                      className="rounded-xl border border-white/10 bg-black/35 px-3.5 py-3 text-xs font-bold text-white outline-none placeholder:text-white/25 focus:border-white/25"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Section 5: Review & Submit */}
            <div className="rounded-[1.8rem] border border-white/10 bg-black/35 p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/50">
                  Review Selections Before Submit
                </p>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    isFormReady
                      ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border border-amber-500/30 bg-amber-500/10 text-amber-300"
                  }`}
                >
                  {isFormReady ? "✓ All required fields set" : "Incomplete fields"}
                </span>
              </div>

              <div className="mt-3 grid gap-2 text-xs text-white/70 sm:grid-cols-2">
                <div className="rounded-xl bg-white/[0.03] p-2.5">
                  <span className="font-bold text-white/40">Creator: </span>
                  <span className="font-bold text-white">
                    {creatorName || "Missing name"} (@{username || "missing"})
                  </span>
                </div>
                <div className="rounded-xl bg-white/[0.03] p-2.5">
                  <span className="font-bold text-white/40">Specialization: </span>
                  <span className="font-bold text-white">
                    {specialization || "None"}
                  </span>
                </div>
                <div className="rounded-xl bg-white/[0.03] p-2.5">
                  <span className="font-bold text-white/40">Skills: </span>
                  <span className="font-bold text-white">
                    {skills.length} selected ({skills.slice(0, 3).join(", ")}
                    {skills.length > 3 ? "..." : ""})
                  </span>
                </div>
                <div className="rounded-xl bg-white/[0.03] p-2.5">
                  <span className="font-bold text-white/40">AI Stack: </span>
                  <span className="font-bold text-white">
                    {aiTools.length} tools, {aiModels.length} models
                  </span>
                </div>
                <div className="rounded-xl bg-white/[0.03] p-2.5">
                  <span className="font-bold text-white/40">Deliverables: </span>
                  <span className="font-bold text-white">
                    {contentTypes.length} types, {formats.length} formats
                  </span>
                </div>
                <div className="rounded-xl bg-white/[0.03] p-2.5">
                  <span className="font-bold text-white/40">Commercial: </span>
                  <span className="font-bold text-white">
                    {commercialUse ? "Commercial Rights Granted" : "Non-Commercial Only"}
                  </span>
                </div>
              </div>

              {!user && (
                <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                  ⚠️ You are currently not signed in. You will be prompted to sign in when you submit so your profile connects to your account.
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isCreating}
              className="mt-2 w-full rounded-2xl py-4 font-black text-white transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: theme.gradient,
                boxShadow: `0 0 50px ${theme.glow}`,
              }}
            >
              {isCreating
                ? "Creating AI Creator Profile..."
                : "Create AI Creator Profile"}
            </button>

            {message && (
              <p className="text-center text-sm font-bold text-white/70">
                {message}
              </p>
            )}
          </div>
        </form>
      </section>
    </main>
  );
}
