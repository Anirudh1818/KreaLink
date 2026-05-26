"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isThemeKey, themes, type ThemeKey } from "@/lib/themes";

type StudioCreator = {
  name: string;
  username: string;
  category: string;
  bio: string;
  profilePhoto: string;
  email: string;
  supporters: string;
  volume: string;
  status: string;
  verified: boolean;
  socialLinks: {
    instagram?: string;
    youtube?: string;
    x?: string;
    website?: string;
  };
};

type LeaderboardFan = {
  rank: "01" | "02" | "03" | "04";
  name: string;
  badge: string;
  metric: string;
};

const fallbackStudioCreator: StudioCreator = {
  name: "Samay Raina",
  username: "samay",
  category: "Comedy Creator",
  bio: "Comedy creator · creator community · fan recognition",
  profilePhoto: "",
  email: "",
  supporters: "21.2K",
  volume: "₹8.72L",
  status: "Live",
  verified: true,
  socialLinks: {},
};

const leaderboardSets: {
  title: string;
  subtitle: string;
  reward: string;
  fans: LeaderboardFan[];
}[] = [
  {
    title: "🔥 Highest Streak",
    subtitle:
      "The fans who show up again and again. Every day they continue, their name becomes harder to ignore.",
    reward:
      "Reward: Longest streak fan gets OG Fan Badge + monthly creator recognition.",
    fans: [
      { rank: "01", name: "Rohan", badge: "Streak King", metric: "103 days" },
      { rank: "02", name: "Ishita", badge: "Daily Fan", metric: "87 days" },
      { rank: "03", name: "Dev", badge: "Consistent Fan", metric: "61 days" },
      { rank: "04", name: "Arjun", badge: "Rising Streak", metric: "42 days" },
    ],
  },
  {
    title: "💎 Most Loyal Fans",
    subtitle:
      "Not just one-time supporters — these are the fans who stay, engage, return, and build real fan identity.",
    reward:
      "Reward: Most loyal fans get priority recognition and special identity badges.",
    fans: [
      {
        rank: "01",
        name: "Ishita",
        badge: "Diamond Loyalist",
        metric: "98 score",
      },
      { rank: "02", name: "Rohan", badge: "Core Fan", metric: "94 score" },
      { rank: "03", name: "Meera", badge: "True Fan", metric: "89 score" },
      { rank: "04", name: "Kabir", badge: "Active Fan", metric: "81 score" },
    ],
  },
  {
    title: "👑 Highest Paid",
    subtitle:
      "The strongest supporters compete for premium visibility, VIP status, and the biggest reward slots.",
    reward:
      "Reward: Highest paid supporters unlock VIP recognition and premium reward slots.",
    fans: [
      { rank: "01", name: "Dev", badge: "VIP Supporter", metric: "₹12,501" },
      { rank: "02", name: "Rohan", badge: "Top Patron", metric: "₹9,251" },
      { rank: "03", name: "Ishita", badge: "Elite Fan", metric: "₹7,101" },
      { rank: "04", name: "Arjun", badge: "Power Fan", metric: "₹5,501" },
    ],
  },
];

const recentActivity = [
  { name: "Rohan", action: "started a new FanStreak", amount: "₹501" },
  { name: "Ishita", action: "continued her streak", amount: "₹251" },
  { name: "Dev", action: "unlocked Loyal Fan status", amount: "₹101" },
  { name: "Arjun", action: "entered weekly leaderboard", amount: "₹51" },
];

const rewards = [
  "Highest Streak: OG Fan Badge + monthly recognition",
  "Most Loyal Fans: Priority recognition + special fan status",
  "Highest Paid: VIP badge + premium creator reward slot",
  "Top fans can later unlock meetups, shoutouts, and brand rewards",
];

export default function CreatorStudioPage() {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTheme, setActiveTheme] = useState<ThemeKey>("flame");
  const [studioCreator, setStudioCreator] =
    useState<StudioCreator>(fallbackStudioCreator);
  const [isLoadingCreator, setIsLoadingCreator] = useState(true);

  const theme = themes[activeTheme];

  useEffect(() => {
    const savedTheme = localStorage.getItem("fanstreak-theme");

    if (isThemeKey(savedTheme)) {
      setActiveTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    async function loadCurrentCreator() {
      try {
        setIsLoadingCreator(true);

        const urlParams = new URLSearchParams(window.location.search);
        const creatorFromUrl = urlParams.get("creator");
        const creatorFromStorage = localStorage.getItem(
          "fanstreak-current-creator"
        );

        const finalCreatorUsername =
          creatorFromUrl || creatorFromStorage || "samay";

        const creatorSnapshot = await getDoc(
          doc(db, "creators", finalCreatorUsername)
        );

        if (!creatorSnapshot.exists()) {
          setStudioCreator({
            ...fallbackStudioCreator,
            username: finalCreatorUsername,
          });
          return;
        }

        const data = creatorSnapshot.data();

        const loadedCreator: StudioCreator = {
          name: String(data.name || "Creator"),
          username: String(data.username || creatorSnapshot.id),
          category: String(data.category || "Creator"),
          bio: String(data.bio || "Creator profile and FanStreak dashboard."),
          profilePhoto: String(data.profilePhoto || ""),
          email: String(data.email || ""),
          supporters: String(data.supporters || "0"),
          volume: String(data.volume || "₹0"),
          status: String(data.status || "Pending"),
          verified: Boolean(data.verified || false),
          socialLinks: {
            instagram: String(data.socialLinks?.instagram || ""),
            youtube: String(data.socialLinks?.youtube || ""),
            x: String(data.socialLinks?.x || ""),
            website: String(data.socialLinks?.website || ""),
          },
        };

        setStudioCreator(loadedCreator);
        localStorage.setItem("fanstreak-current-creator", loadedCreator.username);

        if (isThemeKey(String(data.theme || ""))) {
          setActiveTheme(data.theme as ThemeKey);
          localStorage.setItem("fanstreak-theme", data.theme as ThemeKey);
        }
      } catch (error) {
        console.error("Failed to load creator studio profile:", error);
      } finally {
        setIsLoadingCreator(false);
      }
    }

    loadCurrentCreator();
  }, []);

  function changeTheme(themeKey: ThemeKey) {
    setActiveTheme(themeKey);
    localStorage.setItem("fanstreak-theme", themeKey);
    setSaved(false);
  }

  function getCreatorPublicUrl() {
    if (typeof window === "undefined") {
      return `https://fanstreak.in/${studioCreator.username}`;
    }

    return `${window.location.origin}/${studioCreator.username}`;
  }

  async function copyCreatorLink() {
    const creatorUrl = getCreatorPublicUrl();

    try {
      await navigator.clipboard.writeText(creatorUrl);
      setCopied(true);
      alert(`Creator link copied: ${creatorUrl}`);
    } catch {
      alert(`Copy failed. Link: ${creatorUrl}`);
    }

    setTimeout(() => {
      setCopied(false);
    }, 1800);
  }

  async function saveThemeAndRewards() {
    try {
      localStorage.setItem("fanstreak-theme", activeTheme);

      await setDoc(
        doc(db, "creators", studioCreator.username),
        {
          theme: activeTheme,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setSaved(true);
      alert(
        `${theme.name} saved for ${studioCreator.name}. Open /${studioCreator.username} to preview.`
      );

      setTimeout(() => {
        setSaved(false);
      }, 2200);
    } catch (error) {
      console.error("Failed to save creator studio settings:", error);
      alert("Could not save settings. Please try again.");
    }
  }

  const creatorInitial =
    studioCreator.name.trim().charAt(0).toUpperCase() || "C";

  const stats = [
    {
      label: "Total support received",
      value: studioCreator.volume,
      sub: "Creator support volume",
    },
    {
      label: "Active supporters",
      value: studioCreator.supporters,
      sub: "Fans connected to this creator",
    },
    {
      label: "Live streaks",
      value: "0",
      sub: "Will grow after real payments",
    },
    {
      label: "Pending payout",
      value: "₹0",
      sub: "Ready after payment setup",
    },
  ];

  const availableSocialLinks = [
    { label: "Instagram", value: studioCreator.socialLinks.instagram },
    { label: "YouTube", value: studioCreator.socialLinks.youtube },
    { label: "X", value: studioCreator.socialLinks.x },
    { label: "Website", value: studioCreator.socialLinks.website },
  ].filter((item) => item.value && item.value.trim().length > 0);

  if (isLoadingCreator) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050508] px-5 text-white">
        <div className="text-center">
          <div
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.5rem] text-4xl"
            style={{
              background: theme.gradient,
              boxShadow: `0 0 60px ${theme.glow}`,
            }}
          >
            🔥
          </div>
          <h1 className="mt-6 text-3xl font-black">Loading Creator Studio...</h1>
          <p className="mt-2 text-white/45">Preparing creator dashboard</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#050508] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div
          className="absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full blur-[120px]"
          style={{ background: theme.glow }}
        />
        <div
          className="absolute right-0 top-52 h-[320px] w-[320px] rounded-full blur-[110px]"
          style={{ background: theme.glow, opacity: 0.35 }}
        />
        <div className="absolute bottom-0 left-0 h-[360px] w-[360px] rounded-full bg-purple-700/10 blur-[110px]" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07070a]/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <a href="/" className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl border bg-white/5"
              style={{
                borderColor: theme.border,
                boxShadow: `0 0 30px ${theme.glow}`,
              }}
            >
              <span className="text-2xl">🔥</span>
            </div>
            <div>
              <h1
                className="bg-clip-text text-2xl font-black tracking-tight text-transparent"
                style={{ backgroundImage: theme.text }}
              >
                FanStreak
              </h1>
              <p className="hidden text-xs text-white/45 sm:block">
                {studioCreator.name} Studio
              </p>
            </div>
          </a>

          <div className="flex items-center gap-3">
            <a
              href={`/${studioCreator.username}`}
              className="hidden rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white/65 transition hover:bg-white/[0.08] sm:block"
            >
              View public page
            </a>
            <button
              onClick={() =>
                alert("Withdraw flow will open here after payout setup.")
              }
              className="rounded-2xl px-5 py-3 text-sm font-bold text-white"
              style={{
                background: theme.gradient,
                boxShadow: `0 0 35px ${theme.glow}`,
              }}
            >
              Withdraw
            </button>
          </div>
        </nav>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-10 pt-10 md:px-8 md:pt-16">
        <div className="grid gap-6 md:grid-cols-[1fr_390px]">
          <div
            className="rounded-[2.5rem] border border-white/10 bg-white/[0.035] p-6 md:p-8"
            style={{ boxShadow: `0 0 90px ${theme.glow}` }}
          >
            <p className="text-sm font-black uppercase tracking-[0.25em] text-white/40">
              Creator dashboard
            </p>
            <h2 className="mt-4 text-5xl font-black leading-[1.02] tracking-tight md:text-7xl">
              Your fandom,
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: theme.text }}
              >
                monetized.
              </span>
            </h2>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-white/55 md:text-xl">
              Welcome, {studioCreator.name}. Track your supporters, creator
              page, fan rankings, rewards, links, and payout status from one
              premium studio.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-black/25 p-4"
                >
                  <p
                    className="bg-clip-text text-2xl font-black text-transparent"
                    style={{ backgroundImage: theme.text }}
                  >
                    {item.value}
                  </p>
                  <p className="mt-2 text-sm font-bold text-white/60">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xs text-white/35">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2.5rem] border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.025] p-6 shadow-2xl">
            <div className="rounded-[2rem] border border-white/10 bg-black/35 p-5">
              <div className="flex items-center gap-4">
                <div
                  className="h-20 w-20 overflow-hidden rounded-3xl p-[3px]"
                  style={{ background: theme.gradient }}
                >
                  <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[1.35rem] bg-[#101015] text-3xl font-black">
                    {studioCreator.profilePhoto ? (
                      <img
                        src={studioCreator.profilePhoto}
                        alt={studioCreator.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      creatorInitial
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-black">
                      {studioCreator.name}
                    </h3>
                    {studioCreator.verified && (
                      <span className="rounded-full bg-blue-500 px-2 py-1 text-xs font-black">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/45">
                    {studioCreator.category}
                  </p>
                  <p className="mt-1 text-xs text-white/35">
                    Status: {studioCreator.status}
                  </p>
                </div>
              </div>

              <p className="mt-5 leading-7 text-white/55">
                {studioCreator.bio}
              </p>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm text-white/45">Your FanStreak link</p>
                <p className="mt-2 break-all text-lg font-black text-white">
                  fanstreak.in/{studioCreator.username}
                </p>
              </div>

              {availableSocialLinks.length > 0 && (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-white/35">
                    Link hub
                  </p>
                  <div className="mt-3 grid gap-2">
                    {availableSocialLinks.map((link) => (
                      <a
                        key={link.label}
                        href={link.value}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-bold text-white/70 transition hover:bg-white/[0.08]"
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={copyCreatorLink}
                className="mt-4 w-full rounded-2xl py-4 font-black text-white"
                style={{
                  background: theme.gradient,
                  boxShadow: `0 0 40px ${theme.glow}`,
                }}
              >
                {copied ? "Copied link" : "Copy creator link"}
              </button>

              <a
                href={`/${studioCreator.username}`}
                className="mt-3 block w-full rounded-2xl border border-white/10 bg-white/[0.04] py-4 text-center font-black text-white/70 transition hover:bg-white/[0.08]"
              >
                Preview public page
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-10 md:px-8">
        <div className="mb-6">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-white/40">
            Fan competition system
          </p>
          <h3 className="mt-3 text-4xl font-black">
            Three ways fans fight for your attention.
          </h3>
          <p className="mt-3 max-w-3xl leading-8 text-white/50">
            Some fans win through streaks, some through loyalty, and some through support value.
Every leaderboard gives fans a different reason to return, support, and stay visible.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {leaderboardSets.map((board) => (
            <div
              key={board.title}
              className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6"
            >
              <p className="text-sm font-black uppercase tracking-[0.18em] text-white/35">
                Leaderboard
              </p>
              <h3 className="mt-3 text-3xl font-black">{board.title}</h3>
              <p className="mt-3 min-h-[56px] leading-7 text-white/50">
                {board.subtitle}
              </p>

              <div className="mt-6 space-y-3">
                {board.fans.map((fan) => (
                  <div
                    key={`${board.title}-${fan.rank}`}
                    className="rounded-2xl border border-white/10 bg-black/25 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black"
                          style={{ background: theme.gradient }}
                        >
                          {fan.rank}
                        </span>
                        <div>
                          <p className="font-black">{fan.name}</p>
                          <p className="text-xs text-white/40">{fan.badge}</p>
                        </div>
                      </div>
                      <p
                        className="bg-clip-text text-sm font-black text-transparent"
                        style={{ backgroundImage: theme.text }}
                      >
                        {fan.metric}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-sm leading-6 text-white/55">
                  {board.reward}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-6 px-5 pb-10 md:grid-cols-[0.9fr_1.1fr] md:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-white/40">
            Recent support activity
          </p>
          <h3 className="mt-3 text-3xl font-black">What fans are doing</h3>

          <div className="mt-7 space-y-3">
            {recentActivity.map((activity) => (
              <div
                key={`${activity.name}-${activity.action}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/25 p-4"
              >
                <div>
                  <p className="font-black">{activity.name}</p>
                  <p className="mt-1 text-sm text-white/45">
                    {activity.action}
                  </p>
                </div>
                <p
                  className="bg-clip-text text-xl font-black text-transparent"
                  style={{ backgroundImage: theme.text }}
                >
                  {activity.amount}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-white/40">
            Creator world theme
          </p>
          <h3 className="mt-3 text-3xl font-black">
            Choose your page identity
          </h3>
          <p className="mt-3 leading-7 text-white/50">
            This selected theme is saved and will reflect on the creator’s public
            FanStreak page when fans open the profile.
          </p>

          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {(Object.keys(themes) as ThemeKey[]).map((themeKey) => {
              const item = themes[themeKey];
              const active = activeTheme === themeKey;

              return (
                <button
                  key={themeKey}
                  onClick={() => changeTheme(themeKey)}
                  className={`rounded-[2rem] border p-4 text-left transition ${
                    active
                      ? "bg-white/[0.08] text-white"
                      : "border-white/10 bg-black/25 text-white/65 hover:bg-white/[0.05]"
                  }`}
                  style={{
                    borderColor: active ? item.border : undefined,
                    boxShadow: active ? `0 0 45px ${item.glow}` : undefined,
                  }}
                >
                  <div
                    className="h-20 rounded-[1.4rem]"
                    style={{ background: item.gradient }}
                  />
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <h4 className="font-black">{item.name}</h4>
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-bold text-white/50">
                      {active ? "Active" : item.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-6 px-5 pb-20 md:grid-cols-[1.1fr_0.9fr] md:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-white/40">
            Reward settings
          </p>
          <h3 className="mt-3 text-3xl font-black">
            Rewards mapped to fan psychology
          </h3>
          <p className="mt-4 leading-8 text-white/55">
            Each leaderboard has a different reward type so fans can compete
            through streaks, loyalty, or support value.
          </p>

          <div className="mt-7 space-y-3">
            {rewards.map((reward) => (
              <div
                key={reward}
                className="rounded-2xl border border-white/10 bg-black/25 p-4"
              >
                <p className="font-bold text-white/75">{reward}</p>
              </div>
            ))}
          </div>
        </div>

        <div
          className="rounded-[2rem] border border-white/10 p-6"
          style={{ background: theme.softGradient }}
        >
          <p className="text-sm font-black uppercase tracking-[0.22em] text-white/45">
            Studio actions
          </p>
          <h3 className="mt-3 text-3xl font-black">Save creator settings</h3>
          <p className="mt-4 leading-8 text-white/60">
            Save your selected theme and reward setup. Your public creator page
            can be previewed anytime.
          </p>

          <button
            onClick={saveThemeAndRewards}
            className="mt-7 w-full rounded-2xl py-4 font-black text-white"
            style={{
              background: theme.gradient,
              boxShadow: `0 0 40px ${theme.glow}`,
            }}
          >
            {saved ? "Theme and rewards saved" : "Save theme & reward settings"}
          </button>

          <a
            href={`/${studioCreator.username}`}
            className="mt-3 block w-full rounded-2xl border border-white/10 bg-black/25 py-4 text-center font-black text-white/75 transition hover:bg-black/35"
          >
            Preview fan page
          </a>
        </div>
      </section>
    </main>
  );
}

