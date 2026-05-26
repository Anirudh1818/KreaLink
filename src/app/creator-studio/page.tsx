"use client";

import { useEffect, useState } from "react";
import { isThemeKey, themes, type ThemeKey } from "@/lib/themes";



const stats = [
  { label: "Total support received", value: "₹8.72L", sub: "+18.4% this month" },
  { label: "Active supporters", value: "21.2K", sub: "3.1K active this week" },
  { label: "Live streaks", value: "7.8K", sub: "Fans supporting consistently" },
  { label: "Pending payout", value: "₹1.46L", sub: "Ready for settlement" },
];

const topFans = [
  { rank: "01", name: "Rohan", badge: "Diamond Fan", streak: "30 days" },
  { rank: "02", name: "Ishita", badge: "Top Fan", streak: "27 days" },
  { rank: "03", name: "Dev", badge: "Loyal Fan", streak: "21 days" },
  { rank: "04", name: "Arjun", badge: "Rising Fan", streak: "14 days" },
];

const recentActivity = [
  { name: "Rohan", action: "started a new FanStreak", amount: "₹501" },
  { name: "Ishita", action: "continued her streak", amount: "₹251" },
  { name: "Dev", action: "unlocked Loyal Fan status", amount: "₹101" },
  { name: "Arjun", action: "entered weekly leaderboard", amount: "₹51" },
];

const rewards = [
  "Top 5 fans enter monthly recognition list",
  "Top fan gets creator shoutout",
  "Diamond fans unlock private community access",
  "Brand hamper slots for highest-ranked fans",
];

export default function CreatorStudioPage() {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTheme, setActiveTheme] = useState<ThemeKey>("flame");

  const theme = themes[activeTheme];

  useEffect(() => {
    const savedTheme = localStorage.getItem("fanstreak-theme");

if (isThemeKey(savedTheme)) {
  setActiveTheme(savedTheme);
}
  }, []);

  function changeTheme(themeKey: ThemeKey) {
    setActiveTheme(themeKey);
    localStorage.setItem("fanstreak-theme", themeKey);
    setSaved(false);
  }

  async function copyCreatorLink() {
    try {
      await navigator.clipboard.writeText("https://fanstreak.in/samay");
      setCopied(true);
      alert("Creator link copied: fanstreak.in/samay");
    } catch {
      alert("Copy failed. Link: https://fanstreak.in/samay");
    }

    setTimeout(() => {
      setCopied(false);
    }, 1800);
  }

  function saveThemeAndRewards() {
    localStorage.setItem("fanstreak-theme", activeTheme);
    setSaved(true);
    alert(`${theme.name} saved. Open /samay to see this theme on the fan page.`);

    setTimeout(() => {
      setSaved(false);
    }, 2200);
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
                Creator Studio
              </p>
            </div>
          </a>

          <div className="flex items-center gap-3">
            <a
              href="/samay"
              className="hidden rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white/65 transition hover:bg-white/[0.08] sm:block"
            >
              View public page
            </a>
            <button
              onClick={() => alert("Withdraw flow will open here after payout setup.")}
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
            className="rounded-[2.5rem] border border-white/10 bg-white/[0.035] p-6 shadow-[0_0_90px_rgba(236,72,153,0.12)] md:p-8"
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
              Track supporter growth, active streaks, top fans, reward zones,
              creator page themes, and payout status from one premium studio.
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
                  className="h-20 w-20 rounded-3xl p-[3px]"
                  style={{ background: theme.gradient }}
                >
                  <div className="flex h-full w-full items-center justify-center rounded-[1.35rem] bg-[#101015] text-3xl font-black">
                    S
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-black">Samay Raina</h3>
                  <p className="text-sm text-white/45">Comedy creator</p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm text-white/45">Your FanStreak link</p>
                <p className="mt-2 break-all text-lg font-black text-white">
                  fanstreak.in/samay
                </p>
              </div>

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
                href="/samay"
                className="mt-3 block w-full rounded-2xl border border-white/10 bg-white/[0.04] py-4 text-center font-black text-white/70 transition hover:bg-white/[0.08]"
              >
                Preview public page
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-6 px-5 pb-10 md:grid-cols-[0.9fr_1.1fr] md:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-white/40">
                Top fans
              </p>
              <h3 className="mt-3 text-3xl font-black">Weekly champions</h3>
            </div>
            <span className="rounded-full border border-white/10 bg-black/25 px-4 py-2 text-sm font-bold text-white/55">
              Live
            </span>
          </div>

          <div className="mt-7 space-y-3">
            {topFans.map((fan) => (
              <div
                key={fan.rank}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 p-4"
              >
                <div className="flex items-center gap-4">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-2xl font-black"
                    style={{ background: theme.gradient }}
                  >
                    {fan.rank}
                  </span>
                  <div>
                    <p className="font-black">{fan.name}</p>
                    <p className="text-sm text-white/45">{fan.streak}</p>
                  </div>
                </div>
                <p className="text-sm font-black text-white/75">{fan.badge}</p>
              </div>
            ))}
          </div>
        </div>

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
      </section>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-6 px-5 pb-20 md:grid-cols-[1.1fr_0.9fr] md:px-8">
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

          <div className="mt-7 grid gap-4 md:grid-cols-4">
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
                    className="h-28 rounded-[1.4rem]"
                    style={{ background: item.gradient }}
                  />
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <h4 className="font-black">{item.name}</h4>
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-bold text-white/50">
                      {active ? "Active" : item.label}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/45">
                    {item.description}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-5">
            <p className="text-sm text-white/45">Currently selected</p>
            <p
              className="mt-2 bg-clip-text text-3xl font-black text-transparent"
              style={{ backgroundImage: theme.text }}
            >
              {theme.name}
            </p>
            <p className="mt-2 text-sm text-white/45">
              Open the public page after saving to preview the fan-facing theme.
            </p>
          </div>
        </div>

        <div
          className="rounded-[2rem] border border-white/10 p-6"
          style={{ background: theme.softGradient }}
        >
          <p className="text-sm font-black uppercase tracking-[0.22em] text-white/45">
            Reward settings
          </p>
          <h3 className="mt-3 text-3xl font-black">Monthly fan moments</h3>
          <p className="mt-4 leading-8 text-white/60">
            Set reward targets for top-ranked fans. These rewards become the
            reason fans keep coming back, supporting, and competing.
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

          <button
            onClick={saveThemeAndRewards}
            className="mt-6 w-full rounded-2xl py-4 font-black text-white"
            style={{
              background: theme.gradient,
              boxShadow: `0 0 40px ${theme.glow}`,
            }}
          >
            {saved ? "Theme and rewards saved" : "Save theme & reward settings"}
          </button>

          <a
            href="/samay"
            className="mt-3 block w-full rounded-2xl border border-white/10 bg-black/25 py-4 text-center font-black text-white/75 transition hover:bg-black/35"
          >
            Preview fan page
          </a>
        </div>
      </section>
    </main>
  );
}
