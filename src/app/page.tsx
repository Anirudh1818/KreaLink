"use client";

import { FormEvent, useEffect, useState } from "react";
import { addDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isThemeKey, themes, type ThemeKey } from "@/lib/themes";
import { useAuth } from "@/lib/auth-context";

const features = [
  {
    title: "Fan Streaks",
    description:
      "Fans keep their support streak alive and build visible loyalty inside the creator’s community.",
    icon: "🔥",
  },
  {
    title: "Leaderboards",
    description:
      "Daily, weekly, monthly, and all-time rankings turn support into public fan status.",
    icon: "🏆",
  },
  {
    title: "Badges",
    description:
      "Fans unlock identity badges like Early Supporter, Top Fan, Diamond Fan, and Longest Streak.",
    icon: "💎",
  },
  {
    title: "Creator Recognition",
    description:
      "Top fans can unlock shoutouts, messages, creator moments, meetups, and brand rewards.",
    icon: "✨",
  },
];

type HomeCreator = {
  name: string;
  username: string;
  category: string;
  supporters: string;
  profilePhoto: string;
};

const reels = Array.from(
  { length: 22 },
  (_, index) => `/reels/reel-${String(index + 1).padStart(2, "0")}.mp4`
);

const fallbackCreators: HomeCreator[] = [
  {
    name: "Samay Raina",
    username: "samay",
    category: "Comedy Creator",
    supporters: "21.2K",
    profilePhoto: "",
  },
  {
    name: "Maya Fit",
    username: "mayafit",
    category: "Fitness Creator",
    supporters: "6.8K",
    profilePhoto: "",
  },
  {
    name: "Aarav Live",
    username: "aaravlive",
    category: "Streamer",
    supporters: "12.4K",
    profilePhoto: "",
  },
];

const leaderboard = [
  { rank: "01", name: "Rohan", support: "Top Fan", streak: "30 days" },
  { rank: "02", name: "Ishita", support: "Diamond Fan", streak: "27 days" },
  { rank: "03", name: "Dev", support: "Loyal Fan", streak: "21 days" },
];

export default function Home() {
  const { user } = useAuth();
  const [activeTheme, setActiveTheme] = useState<ThemeKey>("flame");
  const [creators, setCreators] = useState<HomeCreator[]>(fallbackCreators);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [isJoiningWaitlist, setIsJoiningWaitlist] = useState(false);
  const [waitlistMessage, setWaitlistMessage] = useState("");
  const [showSplash, setShowSplash] = useState(true);
  const [reelSlots, setReelSlots] = useState([0, 1, 2, 3, 4, 5]);

  const theme = themes[activeTheme];

  useEffect(() => {
    const savedTheme = localStorage.getItem("fanstreak-theme");

    if (isThemeKey(savedTheme)) {
      setActiveTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem("fanstreak-splash-seen") === "true") {
      setShowSplash(false);
      return;
    }

    const timer = setTimeout(() => {
      sessionStorage.setItem("fanstreak-splash-seen", "true");
      setShowSplash(false);
    }, 2600);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setReelSlots((previous) => {
        const used = new Set(previous);
        const available = [];
        for (let index = 0; index < reels.length; index += 1) {
          if (!used.has(index)) available.push(index);
        }
        if (!available.length) return previous;

        const next = [...previous];
        const slot = Math.floor(Math.random() * next.length);
        next[slot] = available[Math.floor(Math.random() * available.length)];
        return next;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function loadCreatorsFromFirestore() {
      const snapshot = await getDocs(collection(db, "creators"));

      if (snapshot.empty) {
        setCreators(fallbackCreators);
        return;
      }

      const firestoreCreators: HomeCreator[] = snapshot.docs.map((creatorDoc) => {
        const data = creatorDoc.data();

        return {
          name: String(data.name || "Creator"),
          username: String(data.username || creatorDoc.id),
          category: String(data.category || "Creator"),
          supporters: String(data.supporters || "0"),
          profilePhoto: String(data.profilePhoto || ""),
        };
      });

      const firestoreUsernames = new Set(
        firestoreCreators.map((creator) => creator.username.toLowerCase())
      );

      const fallbackWithoutDuplicates = fallbackCreators.filter(
        (creator) => !firestoreUsernames.has(creator.username.toLowerCase())
      );

      setCreators([...firestoreCreators, ...fallbackWithoutDuplicates]);
    }

    loadCreatorsFromFirestore().catch((error) => {
      console.error("Failed to load creators on home page:", error);
      setCreators(fallbackCreators);
    });
  }, []);

  function changeTheme(themeKey: ThemeKey) {
    setActiveTheme(themeKey);
    localStorage.setItem("fanstreak-theme", themeKey);
  }

  async function joinEarlyAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanEmail = waitlistEmail.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setWaitlistMessage("Please enter a valid email.");
      return;
    }

    try {
      setIsJoiningWaitlist(true);
      setWaitlistMessage("");

      await addDoc(collection(db, "earlyAccess"), {
        email: cleanEmail,
        source: "home_page",
        createdAt: serverTimestamp(),
      });

      setWaitlistEmail("");
      setWaitlistMessage("You are on the early access list.");
    } catch (error) {
      console.error("Failed to join early access:", error);
      setWaitlistMessage("Something went wrong. Please try again.");
    } finally {
      setIsJoiningWaitlist(false);
    }
  }

  const featuredCreator = creators[0] || fallbackCreators[0];
  const featuredInitial =
    featuredCreator.name.trim().charAt(0).toUpperCase() || "C";

  return (
    <main className="min-h-screen overflow-hidden bg-[#050508] text-white">
      <style>{`
        @keyframes fsSplashIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
        @keyframes fsSplashOut { to { opacity: 0; visibility: hidden; } }
        @keyframes fsFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
        @keyframes fsKen { 0% { transform: scale(1); } 100% { transform: scale(1.14); } }
      `}</style>

      {showSplash && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-[#050508]"
          style={{ animation: "fsSplashOut 0.6s ease 2s forwards" }}
        >
          <div
            className="flex flex-col items-center"
            style={{ animation: "fsSplashIn 0.7s ease" }}
          >
            <div
              className="flex h-24 w-24 items-center justify-center rounded-[2rem] border border-white/10"
              style={{
                background: theme.gradient,
                boxShadow: `0 0 90px ${theme.glow}`,
              }}
            >
              <span className="text-5xl">🔥</span>
            </div>
            <h1
              className="mt-6 bg-clip-text text-5xl font-black tracking-tight text-transparent"
              style={{ backgroundImage: theme.text }}
            >
              FanStreak
            </h1>
            <p className="mt-3 text-sm font-bold uppercase tracking-[0.3em] text-white/40">
              Creator fandom &amp; status
            </p>
          </div>
        </div>
      )}

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
          <div className="flex items-center gap-3">
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
                Creator loyalty platform
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-8 text-sm text-white/60 md:flex">
            <a className="transition hover:text-white" href="#creators">
              Creators
            </a>
            <a className="transition hover:text-white" href="#worlds">
              Themes
            </a>
            <a className="transition hover:text-white" href="#features">
              Features
            </a>
            <a className="transition hover:text-white" href="#how">
              How it works
            </a>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={user ? "/me" : "/login"}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white/70 transition hover:bg-white/[0.08]"
            >
              {user ? "Account" : "Sign in"}
            </a>
            <a
              href="#early-access"
              className="rounded-2xl px-5 py-3 text-sm font-bold text-white transition hover:scale-[1.02]"
              style={{
                background: theme.gradient,
                boxShadow: `0 0 35px ${theme.glow}`,
              }}
            >
              Get Started
            </a>
          </div>
        </nav>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-20 pt-20 md:px-8 md:pb-28 md:pt-28">
        <div className="pointer-events-none absolute left-1/2 top-0 h-full w-screen -translate-x-1/2 overflow-hidden">
          <div className="flex h-full w-full">
            {reelSlots.map((reelIndex, slot) => {
              const src = reels[reelIndex];

              return (
                <div
                  key={slot}
                  className={`relative h-full flex-1 ${
                    slot >= 4
                      ? "hidden lg:block"
                      : slot === 3
                      ? "hidden sm:block"
                      : ""
                  }`}
                >
                  <video
                    className="h-full w-full object-cover"
                    src={src}
                    poster={src.replace(".mp4", ".jpg")}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                  />
                </div>
              );
            })}
          </div>

          <div className="absolute inset-0 bg-[#050508]/55" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#050508] via-[#050508]/25 to-[#050508]" />
        </div>

        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
          <div className="mb-7 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/65 shadow-2xl">
            <span className="mr-2">✦</span>
            FanStreak.in · creator fandom, status, and recognition
          </div>

          <div
            className="mb-7 flex h-28 w-28 items-center justify-center rounded-[2.2rem] border border-white/10 bg-gradient-to-b from-white/10 to-white/[0.03]"
            style={{ boxShadow: `0 0 90px ${theme.glow}` }}
          >
            <div
              className="flex h-20 w-20 items-center justify-center rounded-[1.8rem] text-5xl"
              style={{ background: theme.gradient }}
            >
              🔥
            </div>
          </div>

          <h2 className="max-w-4xl text-5xl font-black leading-[1.02] tracking-tight text-white sm:text-6xl md:text-7xl">
            Support your creator.
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: theme.text }}
            >
              Build your name.
            </span>
          </h2>

          <p className="mt-7 max-w-3xl text-lg leading-8 text-white/60 md:text-2xl md:leading-10">
            Enter creator communities where every support builds your streak,
            rank, badge, and fan status.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-white/40">
            {["Streaks", "Rankings", "Badges", "Recognition"].map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2"
              >
                {item}
              </span>
            ))}
          </div>

        </div>
      </section>

      <section
        id="features"
        className="relative z-10 mx-auto max-w-7xl px-5 py-16 md:px-8"
      >
        <div className="max-w-3xl">
          <h2 className="text-4xl font-black tracking-tight md:text-5xl">
            Everything built around fan status
          </h2>
          <p className="mt-4 text-lg text-white/50">
            FanStreak turns support into a visible identity inside the creator’s
            community.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-[2rem] border border-white/10 bg-white/[0.035] p-8 shadow-2xl transition hover:bg-white/[0.055]"
            >
              <div
                className="mb-10 flex h-14 w-14 items-center justify-center rounded-2xl text-3xl"
                style={{ background: theme.softGradient }}
              >
                {feature.icon}
              </div>
              <h3 className="text-3xl font-black">{feature.title}</h3>
              <p className="mt-4 max-w-xl text-lg leading-8 text-white/55">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        id="creators"
        className="relative z-10 mx-auto grid max-w-7xl gap-8 px-5 py-16 md:grid-cols-[1fr_0.85fr] md:px-8"
      >
        <div>
          <h2 className="text-4xl font-black tracking-tight md:text-5xl">
            Creator pages built to convert
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/55">
            Every creator gets a personal FanStreak link. Fans open the link,
            choose their support amount, complete payment, and start building
            their rank.
          </p>

          <div className="mt-8 grid gap-4">
            {creators.map((creator) => (
              <a
                key={creator.username}
                href={`/${creator.username}`}
                className="flex items-center justify-between rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5 transition hover:bg-white/[0.06]"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-black"
                    style={{ background: theme.gradient }}
                  >
                    {creator.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-black">{creator.name}</h3>
                    <p className="text-sm text-white/45">{creator.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className="bg-clip-text font-black text-transparent"
                    style={{ backgroundImage: theme.text }}
                  >
                    {creator.supporters}
                  </p>
                  <p className="text-xs text-white/45">supporters</p>
                </div>
              </a>
            ))}
          </div>
        </div>

        <div className="rounded-[2.2rem] border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.025] p-6 shadow-2xl">
          <div className="rounded-[1.7rem] border border-white/10 bg-black/35 p-6">
            <div className="flex items-center gap-4">
              <div
                className="h-20 w-20 rounded-3xl p-[3px]"
                style={{ background: theme.gradient }}
              >
                <div className="flex h-full w-full items-center justify-center rounded-[1.35rem] bg-[#111116] text-3xl font-black">
                  {featuredInitial}
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-black">{featuredCreator.name}</h3>
                <p className="text-white/45">
                  fanstreak.in/{featuredCreator.username}
                </p>
              </div>
            </div>

            <a
              href={`/${featuredCreator.username}`}
              className="mt-7 block w-full rounded-2xl py-4 text-center font-black"
              style={{
                background: theme.gradient,
                boxShadow: `0 0 35px ${theme.glow}`,
              }}
            >
              Support creator
            </a>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p
                  className="bg-clip-text text-2xl font-black text-transparent"
                  style={{ backgroundImage: theme.text }}
                >
                  {featuredCreator.supporters}
                </p>
                <p className="text-sm text-white/45">Supporters</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p
                  className="bg-clip-text text-2xl font-black text-transparent"
                  style={{ backgroundImage: theme.text }}
                >
                  103d
                </p>
                <p className="text-sm text-white/45">Top streak</p>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="mb-3 font-black">Weekly leaderboard</h4>
              <div className="space-y-3">
                {leaderboard.map((fan) => (
                  <div
                    key={fan.rank}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black"
                        style={{ background: theme.gradient }}
                      >
                        {fan.rank}
                      </span>
                      <div>
                        <p className="font-bold">{fan.name}</p>
                        <p className="text-xs text-white/45">{fan.streak}</p>
                      </div>
                    </div>
                    <p className="font-black text-white">{fan.support}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="worlds"
        className="relative z-10 mx-auto max-w-7xl px-5 py-16 md:px-8"
      >
        <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div>
            <p className="mb-4 text-sm font-black uppercase tracking-[0.25em] text-white/40">
              FanStreak themes
            </p>
            <h2 className="text-4xl font-black tracking-tight md:text-5xl">
              Switch the whole platform’s look
            </h2>
            <p className="mt-5 text-lg leading-8 text-white/55">
              Every user can switch between premium FanStreak themes. The chosen
              look follows them across the home page and creator page.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {(Object.keys(themes) as ThemeKey[]).map((key) => {
              const item = themes[key];
              const active = activeTheme === key;

              return (
                <button
                  key={key}
                  onClick={() => changeTheme(key)}
                  className="rounded-[2rem] border bg-white/[0.035] p-4 text-left shadow-2xl transition hover:bg-white/[0.055]"
                  style={{
                    borderColor: active ? item.border : "rgba(255,255,255,0.1)",
                    boxShadow: active ? `0 0 45px ${item.glow}` : undefined,
                  }}
                >
                  <div
                    className="relative overflow-hidden rounded-[1.5rem] p-[1px]"
                    style={{ background: item.gradient }}
                  >
                    <div className="rounded-[1.45rem] bg-black/55 p-5 backdrop-blur-xl">
                      <div className="mb-12 flex items-center justify-between">
                        <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white">
                          {active ? "Active" : item.label}
                        </span>
                        <span className="text-xl">🔥</span>
                      </div>
                      <h3 className="text-2xl font-black">{item.name}</h3>
                      <p className="mt-2 text-sm text-white/65">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="how"
        className="relative z-10 mx-auto max-w-5xl px-5 py-20 text-center md:px-8"
      >
        <h2 className="text-4xl font-black tracking-tight md:text-5xl">
          How it works
        </h2>

        <div className="mt-12 grid gap-6 text-left md:grid-cols-3">
          {[
            {
              number: "1",
              title: "Find your creator",
              body: "Open the creator’s FanStreak link from their bio or explore page.",
            },
            {
              number: "2",
              title: "Start supporting",
              body: "Choose your support amount and activate your FanStreak.",
            },
            {
              number: "3",
              title: "Climb ranks",
              body: "Earn badges, move up leaderboards, and unlock creator recognition.",
            },
          ].map((step) => (
            <div
              key={step.number}
              className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-7"
            >
              <div
                className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-black"
                style={{ background: theme.gradient }}
              >
                {step.number}
              </div>
              <h3 className="text-2xl font-black">{step.title}</h3>
              <p className="mt-4 leading-7 text-white/50">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        id="early-access"
        className="relative z-10 mx-auto max-w-5xl px-5 py-20 text-center md:px-8"
      >
        <div
          className="rounded-[2.5rem] border border-white/10 bg-white/[0.035] p-6 md:p-10"
          style={{ boxShadow: `0 0 80px ${theme.glow}` }}
        >
          <p className="text-sm font-black uppercase tracking-[0.25em] text-white/40">
            Early access
          </p>

          <h2 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">
            Get early access
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: theme.text }}
            >
              before public launch.
            </span>
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/55">
            Join the waitlist for launch updates, creator drops, and early
            access when FanStreak opens publicly.
          </p>

          <form
            onSubmit={joinEarlyAccess}
            className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row"
          >
            <input
              value={waitlistEmail}
              onChange={(event) => setWaitlistEmail(event.target.value)}
              type="email"
              placeholder="you@email.com"
              className="min-h-14 flex-1 rounded-2xl border border-white/10 bg-black/30 px-5 font-bold text-white outline-none placeholder:text-white/30 focus:border-white/25"
            />

            <button
              type="submit"
              disabled={isJoiningWaitlist}
              className="min-h-14 rounded-2xl px-7 font-black text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: theme.gradient,
                boxShadow: `0 0 35px ${theme.glow}`,
              }}
            >
              {isJoiningWaitlist ? "Joining..." : "Join waitlist"}
            </button>
          </form>

          {waitlistMessage && (
            <p className="mt-4 text-sm font-bold text-white/55">
              {waitlistMessage}
            </p>
          )}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-5xl px-5 pb-16 text-center md:px-8">
        <p className="text-sm font-black uppercase tracking-[0.25em] text-white/40">
          Get started
        </p>
        <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
          Jump in or make it your own
        </h2>

        <div className="mx-auto mt-8 flex w-full max-w-xl flex-col gap-4 sm:flex-row">
          <a
            href="#creators"
            className="flex-1 rounded-2xl px-7 py-4 text-base font-black text-white transition hover:scale-[1.02]"
            style={{
              background: theme.gradient,
              boxShadow: `0 0 45px ${theme.glow}`,
            }}
          >
            Explore creators →
          </a>
          <a
            href="/join-creator"
            className="flex-1 rounded-2xl border border-white/10 bg-white/[0.03] px-7 py-4 text-base font-bold text-white transition hover:bg-white/[0.07]"
          >
            Join as Creator
          </a>
        </div>

        <div className="mt-10 w-full rounded-[2rem] border border-white/10 bg-black/25 p-4 text-left">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="text-left">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-white/40">
                Theme switcher
              </p>
              <p className="mt-2 text-lg font-black">
                Choose your FanStreak look
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
                      boxShadow: active ? `0 0 25px ${item.glow}` : undefined,
                    }}
                  >
                    <span
                      className="mb-2 block h-3 w-full rounded-full"
                      style={{ background: item.gradient }}
                    />
                    <span className="block text-sm font-black">{item.name}</span>
                    <span className="text-xs text-white/35">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 px-5 py-10 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2
              className="bg-clip-text text-2xl font-black text-transparent"
              style={{ backgroundImage: theme.text }}
            >
              FanStreak
            </h2>
            <p className="mt-2 text-sm text-white/45">
              FanStreak.in — creator fandom, status, and monetization.
            </p>
          </div>

          <div className="flex gap-6 text-sm text-white/45">
            <a href="#features">About</a>
            <a href="#creators">Creators</a>
            <a href="#worlds">Themes</a>
            <a href="#early-access">Early Access</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
