"use client";

import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { isThemeKey, themes, type ThemeKey } from "@/lib/themes";

type FanStreak = {
  creator: string;
  creatorName: string;
  streakDays: number;
  frequency: string;
  lastAmount: string;
};

export default function FanProfilePage() {
  const { user, loading } = useAuth();

  const [activeTheme, setActiveTheme] = useState<ThemeKey>("flame");
  const [streaks, setStreaks] = useState<FanStreak[]>([]);
  const [isLoadingStreaks, setIsLoadingStreaks] = useState(true);

  const theme = themes[activeTheme];

  useEffect(() => {
    const savedTheme = localStorage.getItem("fanstreak-theme");

    if (isThemeKey(savedTheme)) {
      setActiveTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      setIsLoadingStreaks(false);
      return;
    }

    async function loadStreaks() {
      try {
        const streaksQuery = query(
          collection(db, "supports"),
          where("fanUid", "==", user!.uid)
        );
        const snapshot = await getDocs(streaksQuery);

        const loaded: FanStreak[] = snapshot.docs
          .map((streakDoc) => {
            const data = streakDoc.data();
            return {
              creator: String(data.creator || ""),
              creatorName: String(data.creatorName || data.creator || "Creator"),
              streakDays: Number(data.streakDays || 0),
              frequency: String(data.frequency || "once"),
              lastAmount: String(data.lastAmount || ""),
            };
          })
          .sort((a, b) => b.streakDays - a.streakDays);

        setStreaks(loaded);
      } catch (error) {
        console.error("Failed to load fan streaks:", error);
      } finally {
        setIsLoadingStreaks(false);
      }
    }

    loadStreaks();
  }, [user, loading]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050508] px-5 text-white">
        <p className="text-white/55">Loading your profile...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center overflow-hidden bg-[#050508] px-5 text-white">
        <div className="pointer-events-none fixed inset-0">
          <div
            className="absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full blur-[120px]"
            style={{ background: theme.glow }}
          />
        </div>

        <div
          className="relative z-10 w-full max-w-md rounded-[2.2rem] border border-white/10 bg-[#0b0810] p-7 text-center"
          style={{ boxShadow: `0 0 100px ${theme.glow}` }}
        >
          <h1 className="text-3xl font-black">You are signed out</h1>
          <p className="mt-3 text-sm leading-6 text-white/45">
            Sign in to see your streaks, rank, and fan identity.
          </p>
          <a
            href="/login?next=/me"
            className="mt-6 inline-block w-full rounded-2xl py-4 font-black text-white"
            style={{
              background: theme.gradient,
              boxShadow: `0 0 40px ${theme.glow}`,
            }}
          >
            Sign in
          </a>
        </div>
      </main>
    );
  }

  const fanName = user.displayName || user.email?.split("@")[0] || "Fan";
  const fanInitial = fanName.trim().charAt(0).toUpperCase() || "F";

  return (
    <main className="min-h-screen overflow-hidden bg-[#050508] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div
          className="absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full blur-[120px]"
          style={{ background: theme.glow }}
        />
        <div className="absolute bottom-0 left-0 h-[360px] w-[360px] rounded-full bg-purple-700/10 blur-[110px]" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07070a]/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 md:px-8">
          <a href="/" className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl border bg-white/5"
              style={{
                borderColor: theme.border,
                boxShadow: `0 0 30px ${theme.glow}`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/flame.png" alt="FanStreak" className="h-7 w-7" />
            </div>
            <h1
              className="bg-clip-text text-2xl font-black tracking-tight text-transparent"
              style={{ backgroundImage: theme.text }}
            >
              FanStreak
            </h1>
          </a>

          <button
            onClick={() => signOut(auth)}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white/65 transition hover:bg-white/[0.08]"
          >
            Sign out
          </button>
        </nav>
      </header>

      <section className="relative z-10 mx-auto max-w-5xl px-5 pb-20 pt-10 md:px-8 md:pt-16">
        <div
          className="rounded-[2.5rem] border border-white/10 bg-white/[0.035] p-6 md:p-8"
          style={{ boxShadow: `0 0 90px ${theme.glow}` }}
        >
          <div className="flex items-center gap-5">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-3xl text-3xl font-black"
              style={{ background: theme.gradient }}
            >
              {fanInitial}
            </div>
            <div>
              <h2 className="text-4xl font-black">{fanName}</h2>
              <p className="mt-1 text-sm text-white/45">{user.email}</p>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-white/40">
            Your streaks
          </p>
          <h3 className="mt-3 text-3xl font-black">Creators you support</h3>

          {isLoadingStreaks ? (
            <p className="mt-6 text-white/45">Loading your streaks...</p>
          ) : streaks.length === 0 ? (
            <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.035] p-8 text-center">
              <p className="text-lg font-black">No streaks yet</p>
              <p className="mt-2 text-sm leading-6 text-white/45">
                Support a creator to start your first FanStreak.
              </p>
              <a
                href="/"
                className="mt-6 inline-block rounded-2xl px-6 py-4 font-black text-white"
                style={{
                  background: theme.gradient,
                  boxShadow: `0 0 40px ${theme.glow}`,
                }}
              >
                Explore creators
              </a>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {streaks.map((streak) => (
                <a
                  key={streak.creator}
                  href={`/${streak.creator}`}
                  className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 transition hover:bg-white/[0.06]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-2xl font-black">
                        {streak.creatorName}
                      </h4>
                      <p className="mt-1 text-sm text-white/45">
                        fanstreak.in/{streak.creator}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className="bg-clip-text text-3xl font-black text-transparent"
                        style={{ backgroundImage: theme.text }}
                      >
                        {streak.streakDays}d
                      </p>
                      <p className="text-xs text-white/45">streak</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-bold text-white/60">
                      {streak.frequency === "daily"
                        ? "Daily mandate active"
                        : "One-time support"}
                    </span>
                    {streak.lastAmount && (
                      <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-bold text-white/60">
                        Last {streak.lastAmount}
                      </span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
