"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isThemeKey, themes, type ThemeKey } from "@/lib/themes";

export default function JoinCreatorPage() {
  const router = useRouter();

  const [activeTheme, setActiveTheme] = useState<ThemeKey>("flame");
  const [creatorName, setCreatorName] = useState("");
  const [username, setUsername] = useState("");
  const [category, setCategory] = useState("");
  const [bio, setBio] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");
  const [xLink, setXLink] = useState("");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [showSocialLinks, setShowSocialLinks] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState("");

  const theme = themes[activeTheme];

  useEffect(() => {
    const savedTheme = localStorage.getItem("fanstreak-theme");

    if (isThemeKey(savedTheme)) {
      setActiveTheme(savedTheme);
    }
  }, []);

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

    // Photos are stored inline in the Firestore doc (1 MB hard limit), and
    // base64 inflates size by ~33%. Keep originals comfortably under that.
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

  async function createCreatorProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const finalName = creatorName.trim();
    const finalUsername = cleanUsername(username.trim());
    const finalCategory = category.trim();
    const finalEmail = email.trim().toLowerCase();

    if (!finalName || !finalUsername || !finalCategory || !finalEmail) {
      setMessage("Please fill name, username, category, and email.");
      return;
    }

    if (!finalEmail.includes("@") || !finalEmail.includes(".")) {
      setMessage("Please enter a valid email.");
      return;
    }

    try {
      setIsCreating(true);
      setMessage("");

      // Don't silently overwrite an existing creator (username squatting).
      const existingCreator = await getDoc(doc(db, "creators", finalUsername));

      if (existingCreator.exists()) {
        setMessage("That username is already taken. Please choose another.");
        return;
      }

      await setDoc(doc(db, "creators", finalUsername), {
        name: finalName,
        username: finalUsername,
        category: finalCategory,
        bio:
          bio.trim() ||
          `${finalName} · ${finalCategory} · fan recognition`,
        profilePhoto,
        email: finalEmail,
        socialLinks: {
          instagram: instagram.trim(),
          youtube: youtube.trim(),
          x: xLink.trim(),
          website: website.trim(),
        },
        supporters: "0",
        volume: "₹0",
        status: "Pending",
        verified: false,
        theme: activeTheme,
        createdFrom: "join_creator_page",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      localStorage.setItem("fanstreak-current-creator", finalUsername);
      setMessage("Creator profile generated. Opening Creator Studio...");

      setTimeout(() => {
       router.push(`/creator-studio?creator=${finalUsername}`);
      }, 900);
    } catch (error) {
      console.error("Failed to create creator profile:", error);
      setMessage("Something went wrong. Please try again.");
    } finally {
      setIsCreating(false);
    }
  }

  const creatorInitial =
    creatorName.trim().charAt(0).toUpperCase() || "C";

  const previewName = creatorName.trim() || "Creator Name";
  const previewUsername = username.trim() || "username";
  const previewCategory = category.trim() || "Creator Category";
  const previewBio =
    bio.trim() || "Your creator bio, links, rewards, and FanStreak identity will appear here.";

  return (
    <main className="min-h-screen overflow-hidden bg-[#030306] text-white">
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

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07070a]/85 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <a href="/" className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl border bg-white/5"
              style={{
                borderColor: theme.border,
                boxShadow: `0 0 36px ${theme.glow}`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/flame.png" alt="FanStreak" className="h-7 w-7" />
            </div>
            <div>
              <h1
                className="bg-clip-text text-2xl font-black tracking-tight text-transparent"
                style={{ backgroundImage: theme.text }}
              >
                FanStreak
              </h1>
              <p className="hidden text-xs text-white/45 sm:block">
                Creator onboarding
              </p>
            </div>
          </a>

          <a
            href="/"
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white/65 transition hover:bg-white/[0.08]"
          >
            Back home
          </a>
        </nav>
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-8 px-5 py-10 md:grid-cols-[0.95fr_1.05fr] md:px-8 md:py-16">
        <div className="flex flex-col justify-center">
          <div className="inline-flex w-fit rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-white/45">
            Creator access
          </div>

          <h2 className="mt-6 text-5xl font-black leading-[0.98] tracking-tight md:text-7xl">
            Launch your
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: theme.text }}
            >
              FanStreak page.
            </span>
          </h2>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/58 md:text-xl">
            Create a premium creator profile with your identity, bio, links,
            streak system, leaderboard access, and reward engine.
          </p>

          <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.035] p-5">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-white/40">
              Creator world preview
            </p>

            <div className="mt-5 rounded-[1.6rem] border border-white/10 bg-black/35 p-5">
              <div className="flex items-start gap-4">
                <div
                  className="h-20 w-20 overflow-hidden rounded-3xl p-[3px]"
                  style={{
                    background: theme.gradient,
                    boxShadow: `0 0 38px ${theme.glow}`,
                  }}
                >
                  <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[1.35rem] bg-[#111116] text-3xl font-black">
                    {profilePhoto ? (
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

                <div className="min-w-0">
                  <h3 className="text-2xl font-black">{previewName}</h3>
                  <p className="mt-1 text-sm text-white/45">
                    fanstreak.in/{previewUsername}
                  </p>
                  <p className="mt-1 text-sm text-white/45">
                    {previewCategory}
                  </p>
                </div>
              </div>

              <p className="mt-5 leading-7 text-white/55">{previewBio}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                {instagram && (
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-bold text-white/60">
                    Instagram added
                  </span>
                )}
                {youtube && (
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-bold text-white/60">
                    YouTube added
                  </span>
                )}
                {xLink && (
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-bold text-white/60">
                    X added
                  </span>
                )}
                {website && (
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-bold text-white/60">
                    Website added
                  </span>
                )}
                {!instagram && !youtube && !xLink && !website && (
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-bold text-white/35">
                    Social links will appear under your bio
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <form
          onSubmit={createCreatorProfile}
          className="rounded-[2.6rem] border border-white/10 bg-[#0b0810]/90 p-6 shadow-2xl backdrop-blur-xl md:p-8"
          style={{ boxShadow: `0 0 110px ${theme.glow}` }}
        >
          <p className="text-sm font-black uppercase tracking-[0.22em] text-white/40">
            Profile generator
          </p>
          <h3 className="mt-3 text-4xl font-black">Create creator profile</h3>
          <p className="mt-3 leading-7 text-white/50">
            Build your creator page first. After generation, your Creator Studio
            opens automatically.
          </p>

          <div className="mt-7 grid gap-4">
            <div className="rounded-[1.8rem] border border-white/10 bg-black/25 p-4">
              <label className="mb-3 block text-sm font-bold text-white/45">
                Profile photo
              </label>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div
                  className="h-24 w-24 overflow-hidden rounded-3xl p-[3px]"
                  style={{ background: theme.gradient }}
                >
                  <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[1.45rem] bg-[#111116] text-3xl font-black">
                    {profilePhoto ? (
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
                    className="inline-flex cursor-pointer rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-black text-white/70 transition hover:bg-white/[0.09]"
                  >
                    Upload profile photo
                  </label>
                  <p className="mt-2 text-xs leading-5 text-white/35">
                    For this MVP, the image is stored as preview data. Later we
                    will connect proper cloud storage.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold text-white/45">
                  Creator name
                </label>
                <input
                  value={creatorName}
                  onChange={(event) => setCreatorName(event.target.value)}
                  placeholder="Example: Aarush Bhola"
                  className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-4 font-bold text-white outline-none placeholder:text-white/25 focus:border-white/25"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-white/45">
                  FanStreak username
                </label>
                <input
                  value={username}
                  onChange={(event) =>
                    setUsername(cleanUsername(event.target.value))
                  }
                  placeholder="example: aarushbhola17"
                  className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-4 font-bold text-white outline-none placeholder:text-white/25 focus:border-white/25"
                />
                <p className="mt-2 text-xs text-white/35">
                  fanstreak.in/{username || "username"}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold text-white/45">
                  Category
                </label>
                <input
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  placeholder="Example: Fitness Influencer"
                  className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-4 font-bold text-white outline-none placeholder:text-white/25 focus:border-white/25"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-white/45">
                  Email
                </label>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  placeholder="creator@email.com"
                  className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-4 font-bold text-white outline-none placeholder:text-white/25 focus:border-white/25"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-white/45">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                placeholder="Write a short premium creator bio"
                rows={3}
                className="w-full resize-none rounded-2xl border border-white/10 bg-black/35 px-4 py-4 font-bold text-white outline-none placeholder:text-white/25 focus:border-white/25"
              />
            </div>

            <div className="rounded-[1.8rem] border border-white/10 bg-black/25 p-4">
              <button
                type="button"
                onClick={() => setShowSocialLinks((current) => !current)}
                className="flex w-full items-center justify-between text-left"
              >
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-white/40">
                    Social link hub
                  </p>
                  <p className="mt-2 text-xl font-black">
                    Add creator links
                  </p>
                  <p className="mt-1 text-sm text-white/45">
                    Instagram, YouTube, X, website, merch, or community links.
                  </p>
                </div>

                <span
                  className="flex h-11 w-11 items-center justify-center rounded-2xl text-xl font-black"
                  style={{ background: theme.softGradient }}
                >
                  {showSocialLinks ? "−" : "+"}
                </span>
              </button>

              {showSocialLinks && (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <input
                    value={instagram}
                    onChange={(event) => setInstagram(event.target.value)}
                    placeholder="Instagram link"
                    className="rounded-2xl border border-white/10 bg-black/35 px-4 py-4 font-bold text-white outline-none placeholder:text-white/25 focus:border-white/25"
                  />
                  <input
                    value={youtube}
                    onChange={(event) => setYoutube(event.target.value)}
                    placeholder="YouTube link"
                    className="rounded-2xl border border-white/10 bg-black/35 px-4 py-4 font-bold text-white outline-none placeholder:text-white/25 focus:border-white/25"
                  />
                  <input
                    value={xLink}
                    onChange={(event) => setXLink(event.target.value)}
                    placeholder="X / Twitter link"
                    className="rounded-2xl border border-white/10 bg-black/35 px-4 py-4 font-bold text-white outline-none placeholder:text-white/25 focus:border-white/25"
                  />
                  <input
                    value={website}
                    onChange={(event) => setWebsite(event.target.value)}
                    placeholder="Website / other link"
                    className="rounded-2xl border border-white/10 bg-black/35 px-4 py-4 font-bold text-white outline-none placeholder:text-white/25 focus:border-white/25"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="mt-2 rounded-2xl py-4 font-black text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: theme.gradient,
                boxShadow: `0 0 50px ${theme.glow}`,
              }}
            >
              {isCreating ? "Creating profile..." : "Generate creator profile"}
            </button>

            {message && (
              <p className="text-center text-sm font-bold text-white/55">
                {message}
              </p>
            )}
          </div>
        </form>
      </section>
    </main>
  );
}
