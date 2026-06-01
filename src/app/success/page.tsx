"use client";

import { useEffect, useState } from "react";
import { isThemeKey, themes, type ThemeKey } from "@/lib/themes";


const unlockedItems = [
  {
    title: "FanStreak activated",
    description: "Your creator support journey has officially started.",
    icon: "🔥",
  },
  {
    title: "Leaderboard entry created",
    description: "Your fan profile is now eligible for ranking updates.",
    icon: "🏆",
  },
  {
    title: "Badge path unlocked",
    description: "Keep supporting to unlock loyalty and status badges.",
    icon: "💎",
  },
];

export default function SuccessPage() {
  const [activeTheme, setActiveTheme] = useState<ThemeKey>("flame");
  const [copied, setCopied] = useState(false);
  const [support, setSupport] = useState({
    creator: "",
    creatorName: "",
    fanName: "",
    streak: "1",
    frequency: "once",
    amount: "",
  });

  const theme = themes[activeTheme];

  const creatorLink = support.creator ? `/${support.creator}` : "/";
  const creatorLabel = support.creatorName || "your creator";
  const isDaily = support.frequency === "daily";

  useEffect(() => {
    const savedTheme = localStorage.getItem("fanstreak-theme");

if (isThemeKey(savedTheme)) {
  setActiveTheme(savedTheme);
}
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    setSupport({
      creator: params.get("creator") || "",
      creatorName: params.get("creatorName") || "",
      fanName: params.get("fanName") || "",
      streak: params.get("streak") || "1",
      frequency: params.get("frequency") || "once",
      amount: params.get("amount") || "",
    });
  }, []);

  async function copyShareText() {
    const creatorHandle = support.creator || "fanstreak";
    const text = `I just started my FanStreak for ${creatorLabel} 🔥 fanstreak.in/${creatorHandle}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      alert("Share text copied.");
    } catch {
      alert(text);
    }

    setTimeout(() => {
      setCopied(false);
    }, 1800);
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
                FanStreak activated
              </p>
            </div>
          </a>

          <a
            href={creatorLink}
            className="rounded-2xl px-5 py-3 text-sm font-bold text-white"
            style={{
              background: theme.gradient,
              boxShadow: `0 0 35px ${theme.glow}`,
            }}
          >
            Back to creator
          </a>
        </nav>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-20 pt-12 md:px-8 md:pt-20">
        <div
          className="rounded-[2.7rem] p-[1px]"
          style={{
            background: theme.gradient,
            boxShadow: `0 0 100px ${theme.glow}`,
          }}
        >
          <div className="relative overflow-hidden rounded-[2.65rem] border border-white/10 bg-[#08060d] p-6 text-center md:p-12">
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

            <div className="relative mx-auto max-w-4xl">
              <div
                className="mx-auto flex h-28 w-28 items-center justify-center rounded-[2.2rem] border border-white/10 text-6xl"
                style={{
                  background: theme.gradient,
                  boxShadow: `0 0 80px ${theme.glow}`,
                }}
              >
                🔥
              </div>

              <p className="mt-8 text-sm font-black uppercase tracking-[0.25em] text-white/40">
                Support successful
              </p>

              <h2 className="mt-4 text-5xl font-black leading-[1.02] tracking-tight md:text-7xl">
                Your FanStreak
                <br />
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: theme.text }}
                >
                  has started.
                </span>
              </h2>

              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/55 md:text-xl">
                You are now inside {creatorLabel}’s fan community. Keep your
                streak alive, climb the leaderboard, and build your fan identity.
              </p>

              <div className="mt-10 grid gap-4 md:grid-cols-3">
                <div className="rounded-[2rem] border border-white/10 bg-black/25 p-6">
                  <p
                    className="bg-clip-text text-4xl font-black text-transparent"
                    style={{ backgroundImage: theme.text }}
                  >
                    Day {support.streak}
                  </p>
                  <p className="mt-2 text-sm font-bold text-white/45">
                    Current streak
                  </p>
                </div>

                <div className="rounded-[2rem] border border-white/10 bg-black/25 p-6">
                  <p
                    className="bg-clip-text text-4xl font-black text-transparent"
                    style={{ backgroundImage: theme.text }}
                  >
                    #428
                  </p>
                  <p className="mt-2 text-sm font-bold text-white/45">
                    Starting rank
                  </p>
                </div>

                <div className="rounded-[2rem] border border-white/10 bg-black/25 p-6">
                  <p
                    className="bg-clip-text text-4xl font-black text-transparent"
                    style={{ backgroundImage: theme.text }}
                  >
                    7d
                  </p>
                  <p className="mt-2 text-sm font-bold text-white/45">
                    First badge target
                  </p>
                </div>
              </div>

              <div className="mt-10 grid gap-4 text-left md:grid-cols-3">
                {unlockedItems.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6"
                  >
                    <div
                      className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
                      style={{ background: theme.softGradient }}
                    >
                      {item.icon}
                    </div>
                    <h3 className="text-xl font-black">{item.title}</h3>
                    <p className="mt-3 leading-7 text-white/50">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-10 rounded-[2rem] border border-white/10 bg-black/25 p-5 text-left">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-white/40">
                  Next move
                </p>
                <h3 className="mt-3 text-3xl font-black">
                  Come back tomorrow and protect your streak
                </h3>
                <p className="mt-3 leading-8 text-white/55">
                  Every new support keeps your FanStreak alive and pushes your
                  name higher inside the fandom.
                </p>
                {isDaily && (
                  <p className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm leading-7 text-white/55">
                    Daily support is active{support.amount ? ` (${support.amount}/day)` : ""}.
                    You will get a reminder before each debit and can pause or
                    cancel anytime from your fan profile.
                  </p>
                )}
              </div>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <a
                  href={creatorLink}
                  className="flex-1 rounded-2xl py-4 text-center font-black text-white"
                  style={{
                    background: theme.gradient,
                    boxShadow: `0 0 45px ${theme.glow}`,
                  }}
                >
                  View leaderboard →
                </a>

                <button
                  onClick={copyShareText}
                  className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] py-4 font-black text-white/75 transition hover:bg-white/[0.08]"
                >
                  {copied ? "Copied" : "Share your FanStreak"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
