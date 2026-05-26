"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isThemeKey, themes, type ThemeKey } from "@/lib/themes";

const supportAmounts = ["₹9", "₹19", "₹49", "₹599", "₹999"];

const badges = ["Early Supporter", "7-Day Streak", "Top Fan", "Diamond Fan"];

type CreatorProfile = {
  name: string;
  username: string;
  category: string;
  bio: string;
  status: string;
  supporters: string;
  volume: string;
  profilePhoto: string;
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

const fallbackCreator: CreatorProfile = {
  name: "Creator",
  username: "creator",
  category: "Creator",
  bio: "This creator profile is not live yet.",
  status: "Pending",
  supporters: "0",
  volume: "₹0",
  profilePhoto: "",
  verified: false,
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
      "Longest streak fan gets OG Fan Badge + monthly creator recognition.",
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
      "Most loyal fans get priority recognition and special identity badges.",
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
      "Highest paid supporters unlock VIP recognition and premium reward slots.",
    fans: [
      { rank: "01", name: "Dev", badge: "VIP Supporter", metric: "₹12,501" },
      { rank: "02", name: "Rohan", badge: "Top Patron", metric: "₹9,251" },
      { rank: "03", name: "Ishita", badge: "Elite Fan", metric: "₹7,101" },
      { rank: "04", name: "Arjun", badge: "Power Fan", metric: "₹5,501" },
    ],
  },
];

function normalizeUrl(value?: string) {
  const cleanValue = String(value || "").trim();

  if (!cleanValue) {
    return "";
  }

  if (cleanValue.startsWith("http://") || cleanValue.startsWith("https://")) {
    return cleanValue;
  }

  return `https://${cleanValue}`;
}

export default function CreatorPage() {
  const params = useParams();
  const rawCreator = params?.creator as string | string[] | undefined;

  const creatorUsername = Array.isArray(rawCreator)
    ? rawCreator[0].toLowerCase()
    : String(rawCreator || "creator").toLowerCase();

  const [creatorProfile, setCreatorProfile] =
    useState<CreatorProfile>(fallbackCreator);
  const [isLoadingCreator, setIsLoadingCreator] = useState(true);
  const [creatorNotFound, setCreatorNotFound] = useState(false);

  const [selectedAmount, setSelectedAmount] = useState("₹49");
  const [customAmount, setCustomAmount] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState<ThemeKey>("flame");

  const theme = themes[activeTheme];
  const finalAmount = isCustom ? `₹${customAmount || "0"}` : selectedAmount;
  const canContinue = !isCustom || Number(customAmount) > 0;

  useEffect(() => {
    const savedTheme = localStorage.getItem("fanstreak-theme");

    if (isThemeKey(savedTheme)) {
      setActiveTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    async function loadCreatorProfile() {
      try {
        setIsLoadingCreator(true);
        setCreatorNotFound(false);

        const creatorRef = doc(db, "creators", creatorUsername);
        const creatorSnapshot = await getDoc(creatorRef);

        if (!creatorSnapshot.exists()) {
          setCreatorNotFound(true);
          return;
        }

        const data = creatorSnapshot.data();

        setCreatorProfile({
          name: String(data.name || "Creator"),
          username: String(data.username || creatorSnapshot.id),
          category: String(data.category || "Creator"),
          bio: String(
            data.bio ||
              `${String(data.name || "Creator")} · ${String(
                data.category || "Creator"
              )} · fan recognition`
          ),
          status: String(data.status || "Pending"),
          supporters: String(data.supporters || "0"),
          volume: String(data.volume || "₹0"),
          profilePhoto: String(data.profilePhoto || ""),
          verified: Boolean(data.verified || false),
          socialLinks: {
            instagram: String(data.socialLinks?.instagram || ""),
            youtube: String(data.socialLinks?.youtube || ""),
            x: String(data.socialLinks?.x || ""),
            website: String(data.socialLinks?.website || ""),
          },
        });

        if (isThemeKey(String(data.theme || ""))) {
          setActiveTheme(data.theme as ThemeKey);
          localStorage.setItem("fanstreak-theme", data.theme as ThemeKey);
        }
      } catch (error) {
        console.error("Failed to load creator profile:", error);
        setCreatorNotFound(true);
      } finally {
        setIsLoadingCreator(false);
      }
    }

    loadCreatorProfile();
  }, [creatorUsername]);

  function changeTheme(themeKey: ThemeKey) {
    setActiveTheme(themeKey);
    localStorage.setItem("fanstreak-theme", themeKey);
  }

  function chooseAmount(amount: string) {
    setSelectedAmount(amount);
    setIsCustom(false);
    setCustomAmount("");
  }

  function openSupportModal() {
    if (!canContinue) return;
    setIsModalOpen(true);
  }

  const creatorInitial =
    creatorProfile.name.trim().charAt(0).toUpperCase() || "C";

  const nameParts = creatorProfile.name.trim().split(/\s+/).filter(Boolean);
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
  const firstName =
    nameParts.length > 1
      ? nameParts.slice(0, -1).join(" ")
      : creatorProfile.name;

  const availableSocialLinks = [
    { label: "Instagram", value: creatorProfile.socialLinks.instagram },
    { label: "YouTube", value: creatorProfile.socialLinks.youtube },
    { label: "X", value: creatorProfile.socialLinks.x },
    { label: "Website", value: creatorProfile.socialLinks.website },
  ].filter((item) => item.value && item.value.trim().length > 0);

  const creatorHeroStats = [
    { value: creatorProfile.supporters, label: "Supporters" },
    { value: "103d", label: "Record streak" },
    { value: "Top 5", label: "Reward zone" },
    { value: "4", label: "Elite badges" },
  ];

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
          <h1 className="mt-6 text-3xl font-black">Loading creator world...</h1>
          <p className="mt-2 text-white/45">Preparing FanStreak profile</p>
        </div>
      </main>
    );
  }

  if (creatorNotFound) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050508] px-5 text-white">
        <div className="max-w-xl text-center">
          <div
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.5rem] text-4xl"
            style={{
              background: theme.gradient,
              boxShadow: `0 0 60px ${theme.glow}`,
            }}
          >
            🔥
          </div>
          <h1 className="mt-6 text-4xl font-black">Creator not found</h1>
          <p className="mt-3 text-white/50">
            This FanStreak creator world is not live yet.
          </p>
          <a
            href="/"
            className="mt-8 inline-block rounded-2xl px-6 py-4 font-black text-white"
            style={{
              background: theme.gradient,
              boxShadow: `0 0 40px ${theme.glow}`,
            }}
          >
            Back to FanStreak
          </a>
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
                fanstreak.in/{creatorProfile.username}
              </p>
            </div>
          </a>

          <a
            href="#support"
            className="rounded-2xl px-5 py-3 text-sm font-bold text-white"
            style={{
              background: theme.gradient,
              boxShadow: `0 0 35px ${theme.glow}`,
            }}
          >
            Support
          </a>
        </nav>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-14 pt-10 md:px-8 md:pt-16">
        <div
          className="rounded-[2.7rem] p-[1px]"
          style={{
            background: theme.gradient,
            boxShadow: `0 0 100px ${theme.glow}`,
          }}
        >
          <div className="relative overflow-hidden rounded-[2.65rem] border border-white/10 bg-[#08060d] px-6 py-7 md:px-10 md:py-10">
            <div className="pointer-events-none absolute inset-0">
              <div
                className="absolute -right-16 -top-16 h-72 w-72 rounded-full blur-[90px]"
                style={{ background: theme.glow }}
              />
              <div
                className="absolute -left-16 bottom-0 h-72 w-72 rounded-full blur-[90px]"
                style={{ background: theme.glow, opacity: 0.7 }}
              />
              <div
                className="absolute inset-x-0 top-0 h-32"
                style={{ background: theme.softGradient }}
              />
            </div>

            <div className="relative grid gap-8 md:grid-cols-[1fr_420px] md:items-center">
              <div>
                <div className="mb-6 inline-flex rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-bold text-white/70 backdrop-blur-xl">
                  {creatorProfile.status === "Live"
                    ? "Verified Creator World"
                    : "Creator World Preview"}{" "}
                  · {theme.name}
                </div>

                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  <div
                    className="h-32 w-32 shrink-0 rounded-full p-[3px]"
                    style={{
                      background: theme.gradient,
                      boxShadow: `0 0 55px ${theme.glow}`,
                    }}
                  >
                    <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#101015] text-5xl font-black">
                      {creatorProfile.profilePhoto ? (
                        <img
                          src={creatorProfile.profilePhoto}
                          alt={creatorProfile.name}
                          className="h-full w-full rounded-full object-contain object-center"
                        />
                      ) : (
                        creatorInitial
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-5xl font-black leading-[0.95] tracking-tight md:text-7xl">
                        {firstName}
                        <br />
                        <span
                          className="bg-clip-text text-transparent"
                          style={{ backgroundImage: theme.text }}
                        >
                          {lastName || creatorProfile.category}
                        </span>
                      </h2>

                      {creatorProfile.verified && (
                        <span className="rounded-full bg-blue-500 px-3 py-1 text-xs font-black">
                          ✓ Verified
                        </span>
                      )}
                    </div>

                    <p className="mt-4 text-base font-medium text-white/50 md:text-lg">
                      {creatorProfile.bio}
                    </p>

                    {availableSocialLinks.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {availableSocialLinks.map((link) => (
                          <a
                            key={link.label}
                            href={normalizeUrl(link.value)}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-black text-white/65 transition hover:bg-white/[0.1]"
                          >
                            {link.label}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <p className="mt-8 max-w-3xl text-lg leading-8 text-white/60 md:text-xl md:leading-9">
                  Start your FanStreak, climb the fan leaderboard, unlock
                  identity badges, and become visible inside this creator’s
                  strongest fan community.
                </p>

                <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
                  {creatorHeroStats.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur-xl"
                    >
                      <p
                        className="bg-clip-text text-2xl font-black text-transparent"
                        style={{ backgroundImage: theme.text }}
                      >
                        {item.value}
                      </p>
                      <p className="mt-1 text-sm text-white/45">
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[2.2rem] border border-white/10 bg-black/35 p-5 shadow-2xl backdrop-blur-xl">
                <div className="rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-5">
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-white/45">
                    FanStreak access
                  </p>
                  <h3 className="mt-4 text-3xl font-black">
                    Build your name in the fandom
                  </h3>
                  <p className="mt-3 leading-7 text-white/50">
                    Support, keep your streak active, and compete for public
                    recognition.
                  </p>

                  <a
                    href="#support"
                    className="mt-6 block w-full rounded-2xl py-4 text-center font-black text-white transition hover:scale-[1.01]"
                    style={{
                      background: theme.gradient,
                      boxShadow: `0 0 45px ${theme.glow}`,
                    }}
                  >
                    Start your FanStreak →
                  </a>

                  <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                    {["🔥 Streak", "🏆 Rank", "💎 Badge"].map((item) => (
                      <div
                        key={item}
                        className="rounded-2xl border border-white/10 bg-black/25 p-3"
                      >
                        <p className="text-xl">{item.split(" ")[0]}</p>
                        <p className="mt-1 text-xs font-bold text-white/45">
                          {item.split(" ")[1]}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="relative mt-8 rounded-[2rem] border border-white/10 bg-black/25 p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-white/40">
                    Theme preview
                  </p>
                  <p className="mt-2 text-lg font-black">
                    Switch creator world theme
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {(Object.keys(themes) as ThemeKey[]).map((key) => {
                    const item = themes[key];
                    const active = activeTheme === key;

                    return (
                      <button
                        key={key}
                        onClick={() => changeTheme(key)}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                          active
                            ? "bg-white/[0.09] text-white"
                            : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06]"
                        }`}
                        style={{
                          borderColor: active ? item.border : undefined,
                          boxShadow: active
                            ? `0 0 25px ${item.glow}`
                            : undefined,
                        }}
                      >
                        <span
                          className="mb-2 block h-3 w-full rounded-full"
                          style={{ background: item.gradient }}
                        />
                        <span className="block text-sm font-black">
                          {item.name}
                        </span>
                        <span className="text-xs text-white/35">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section
  id="support"
  className="relative z-10 mx-auto max-w-7xl px-5 pb-16 md:px-8"
>
  <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 md:p-8">
    <div className="max-w-3xl">
      <p className="text-sm font-black uppercase tracking-[0.22em] text-white/40">
        Start supporting
      </p>

      <h3 className="mt-3 text-4xl font-black md:text-5xl">
        Choose your support
      </h3>

      <p className="mt-4 max-w-2xl text-lg leading-8 text-white/50">
        Your support activates your FanStreak and places you inside this
        creator’s ranking system.
      </p>
    </div>

    <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {supportAmounts.map((amount) => {
        const active = !isCustom && selectedAmount === amount;

        return (
          <button
            key={amount}
            onClick={() => chooseAmount(amount)}
            className="rounded-2xl border py-5 text-xl font-black transition hover:scale-[1.01]"
            style={{
              borderColor: active ? theme.border : "rgba(255,255,255,0.1)",
              background: active ? theme.softGradient : "rgba(0,0,0,0.3)",
              boxShadow: active ? `0 0 35px ${theme.glow}` : undefined,
            }}
          >
            {amount}
          </button>
        );
      })}

      <button
        onClick={() => {
          setIsCustom(true);
          setSelectedAmount("");
        }}
        className="rounded-2xl border py-5 text-xl font-black transition hover:scale-[1.01]"
        style={{
          borderColor: isCustom ? theme.border : "rgba(255,255,255,0.1)",
          background: isCustom ? theme.softGradient : "rgba(0,0,0,0.3)",
          boxShadow: isCustom ? `0 0 35px ${theme.glow}` : undefined,
        }}
      >
        Custom
      </button>
    </div>

    {isCustom && (
      <div className="mt-5">
        <label className="mb-2 block text-sm font-bold text-white/45">
          Enter custom support amount
        </label>

        <div className="flex items-center rounded-2xl border border-white/10 bg-black/30 px-4 py-4">
          <span className="mr-3 text-xl font-black">₹</span>
          <input
            value={customAmount}
            onChange={(event) =>
              setCustomAmount(event.target.value.replace(/\D/g, ""))
            }
            className="w-full bg-transparent text-xl font-black text-white outline-none placeholder:text-white/25"
            placeholder="Enter amount"
            inputMode="numeric"
          />
        </div>
      </div>
    )}

    <button
      onClick={openSupportModal}
      disabled={!canContinue}
      className="mt-6 w-full rounded-2xl py-5 text-xl font-black text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        background: canContinue ? theme.gradient : "rgba(255,255,255,0.1)",
        boxShadow: canContinue ? `0 0 45px ${theme.glow}` : undefined,
        color: canContinue ? "white" : "rgba(255,255,255,0.3)",
      }}
    >
      Continue with {finalAmount}
    </button>

    <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
      <p className="text-base leading-7 text-white/45">
        After payment, your streak begins and your fan profile appears on this
        creator’s leaderboard.
      </p>
    </div>
  </div>

  <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 md:p-8">
    <div className="max-w-3xl">
      <p className="text-sm font-black uppercase tracking-[0.22em] text-white/40">
        Fan competition
      </p>

      <h3 className="mt-3 text-4xl font-black md:text-5xl">
        Three ways to become visible
      </h3>

      <p className="mt-4 text-lg leading-8 text-white/50">
        Fans can climb through streaks, loyalty, or support value. Each
        leaderboard gives them a different reason to return and keep supporting.
      </p>
    </div>

    <div className="mt-8 grid gap-6 xl:grid-cols-3">
      {leaderboardSets.map((board) => (
        <div
          key={board.title}
          className="rounded-[2rem] border border-white/10 bg-black/25 p-5"
        >
          <h4 className="text-2xl font-black md:text-3xl">{board.title}</h4>

          <p className="mt-3 min-h-[72px] text-sm leading-6 text-white/45">
            {board.subtitle}
          </p>

          <div className="mt-6 space-y-3">
            {board.fans.map((fan) => (
              <div
                key={`${board.title}-${fan.rank}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-xs font-black"
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
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
            <p className="text-sm leading-6 text-white/55">{board.reward}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
</section>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-6 px-5 pb-20 md:grid-cols-2 md:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-white/40">
            Fan identity
          </p>
          <h3 className="mt-3 text-3xl font-black">Badges to unlock</h3>

          <div className="mt-7 grid gap-3">
            {badges.map((badge) => (
              <div
                key={badge}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 p-4"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
                    style={{ background: theme.softGradient }}
                  >
                    ✦
                  </span>
                  <p className="font-bold">{badge}</p>
                </div>
                <span className="text-sm text-white/35">Locked</span>
              </div>
            ))}
          </div>
        </div>

        <div
          className="rounded-[2rem] border border-white/10 p-6"
          style={{ background: theme.softGradient }}
        >
          <p className="text-sm font-black uppercase tracking-[0.22em] text-white/45">
            Reward zone
          </p>
          <h3 className="mt-3 text-3xl font-black">Top fans unlock moments</h3>
          <p className="mt-4 leading-8 text-white/60">
            Highest-ranked fans can unlock creator recognition, shoutout slots,
            private moments, meetups, and brand rewards as the community grows.
          </p>

          <div className="mt-7 rounded-2xl border border-white/10 bg-black/25 p-5">
            <p className="text-sm text-white/45">Current reward target</p>
            <p className="mt-2 text-2xl font-black">
              Top 5 fans enter the monthly recognition list
            </p>
          </div>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-5 backdrop-blur-xl">
          <div
            className="w-full max-w-lg rounded-[2.2rem] border border-white/10 bg-[#0b0810] p-6"
            style={{ boxShadow: `0 0 100px ${theme.glow}` }}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-white/40">
                  Confirm support
                </p>
                <h3 className="mt-3 text-3xl font-black">
                  Start your FanStreak
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition hover:bg-white/[0.08]"
              >
                ×
              </button>
            </div>

            <div className="rounded-[1.7rem] border border-white/10 bg-white/[0.035] p-5">
              <div className="flex items-center gap-4">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-2xl p-[2px]"
                  style={{ background: theme.gradient }}
                >
                  <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[0.9rem] bg-[#101015] text-2xl font-black">
                    {creatorProfile.profilePhoto ? (
                      <img
                        src={creatorProfile.profilePhoto}
                        alt={creatorProfile.name}
                        className="h-full w-full object-contain object-center"
                      />
                    ) : (
                      creatorInitial
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-white/45">Supporting</p>
                  <p className="text-xl font-black">{creatorProfile.name}</p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-sm text-white/45">Selected support</p>
                <p
                  className="mt-1 bg-clip-text text-4xl font-black text-transparent"
                  style={{ backgroundImage: theme.text }}
                >
                  {finalAmount}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                window.location.href = "/success";
              }}
              className="mt-5 w-full rounded-2xl py-4 font-black text-white"
              style={{
                background: theme.gradient,
                boxShadow: `0 0 45px ${theme.glow}`,
              }}
            >
              Proceed to payment
            </button>

            <p className="mt-4 text-center text-sm text-white/35">
              Payment integration will connect here after MVP UI approval.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
