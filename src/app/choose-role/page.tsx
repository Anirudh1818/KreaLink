"use client";

import Link from "next/link";
import { useStoredTheme } from "@/lib/use-theme";
import { Navbar } from "@/components/Navbar";

export default function ChooseRolePage() {
  const { theme } = useStoredTheme();

  return (
    <main className="min-h-screen bg-[#050508] text-white">
      <Navbar />

      <section className="relative z-10 mx-auto max-w-4xl px-5 py-16 text-center md:py-24">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-white/50">
          <span>✦</span>
          Welcome to KreaLink
        </div>

        <h2 className="mt-6 text-4xl font-black tracking-tight md:text-6xl">
          Choose your marketplace journey
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-white/60 md:text-lg">
          KreaLink powers collaborations between elite generative creators and forward-thinking brands &amp; agencies.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-2 text-left">
          {/* Creator Path */}
          <Link
            href="/join-creator"
            className="group relative overflow-hidden rounded-[2.4rem] border border-white/10 bg-black/40 p-8 transition duration-300 hover:border-white/30 hover:shadow-2xl"
          >
            <div
              className="absolute -right-10 -top-10 h-40 w-40 rounded-full blur-[70px] transition group-hover:scale-125"
              style={{ background: theme.glow, opacity: 0.5 }}
            />

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06] text-3xl">
              🎨
            </div>

            <h3 className="mt-6 text-2xl font-black text-white">
              I am an AI Creator
            </h3>
            <p className="mt-2 text-sm leading-6 text-white/55">
              Showcase your generative toolsets (Runway, Midjourney, Kling, ComfyUI), models, workflow pipeline, and portfolio to get hired for commercial campaigns.
            </p>

            <div className="mt-8 flex items-center gap-2 text-xs font-black text-white group-hover:underline">
              <span>Join as AI Creator →</span>
            </div>
          </Link>

          {/* Brand Path */}
          <Link
            href="/brand"
            className="group relative overflow-hidden rounded-[2.4rem] border border-white/10 bg-black/40 p-8 transition duration-300 hover:border-white/30 hover:shadow-2xl"
          >
            <div
              className="absolute -right-10 -top-10 h-40 w-40 rounded-full blur-[70px] transition group-hover:scale-125 bg-cyan-500/20"
            />

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06] text-3xl">
              🏢
            </div>

            <h3 className="mt-6 text-2xl font-black text-white">
              I am a Brand or Agency
            </h3>
            <p className="mt-2 text-sm leading-6 text-white/55">
              Use our AI Brief Builder to turn rough campaign ideas into structured parameters, discover ranked creators, and inspect verification signals.
            </p>

            <div className="mt-8 flex items-center gap-2 text-xs font-black text-white group-hover:underline">
              <span>Enter Brand Workspace →</span>
            </div>
          </Link>
        </div>

        <div className="mt-12 text-xs text-white/40">
          Already have a creator profile?{" "}
          <Link href="/creator-studio" className="font-bold text-white/70 hover:underline">
            Open Creator Studio
          </Link>
        </div>
      </section>
    </main>
  );
}
