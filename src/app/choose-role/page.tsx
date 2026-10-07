"use client";

import Link from "next/link";
import { useStoredTheme } from "@/lib/use-theme";
import { Navbar } from "@/components/Navbar";
import { NetworkCanvas } from "@/components/NetworkCanvas";

export default function ChooseRolePage() {
  const { theme } = useStoredTheme();

  return (
    <main className="relative min-h-screen bg-[#07070a] text-white overflow-hidden">
      {/* 3D Network Canvas Background */}
      <NetworkCanvas />

      {/* Ambient Gradient Glows */}
      <div
        className="pointer-events-none fixed inset-0 opacity-40 mix-blend-screen"
        style={{
          background: `radial-gradient(circle 600px at 50% 20%, ${theme.accent}15, transparent 70%),
                       radial-gradient(circle 450px at 80% 80%, #0ea5e912, transparent 65%)`,
        }}
      />

      <Navbar />

      <section className="relative z-10 mx-auto max-w-5xl px-5 py-16 text-center md:py-24">
        {/* Status Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-white/70 backdrop-blur-md shadow-inner">
          <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: theme.accent }} />
          <span>KreaLink Architecture</span>
        </div>

        <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl md:text-6xl text-white">
          Choose your <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white/90 to-white/60">marketplace journey</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-white/60 md:text-lg font-light leading-relaxed">
          KreaLink powers high-trust collaborations between elite generative directors, prompt artists, and forward-thinking brands &amp; agencies.
        </p>

        <div className="mt-14 grid gap-8 md:grid-cols-2 text-left">
          {/* Creator Path */}
          <Link
            href="/join-creator"
            className="group relative flex flex-col justify-between overflow-hidden rounded-[2rem] border border-white/10 bg-[#0c0d12]/80 p-8 sm:p-10 backdrop-blur-xl transition-all duration-300 hover:border-amber-500/50 hover:bg-[#111219]/90 hover:shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-1"
          >
            <div
              className="absolute -right-12 -top-12 h-44 w-44 rounded-full blur-[80px] transition duration-500 group-hover:scale-150"
              style={{ background: theme.glow, opacity: 0.25 }}
            />

            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-2xl shadow-inner">
                  🎬
                </div>
                <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-300">
                  Creator Economy
                </span>
              </div>

              <h2 className="mt-8 text-2xl sm:text-3xl font-black text-white group-hover:text-amber-200 transition">
                I am an AI Creator
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/55">
                Showcase your generative toolsets (Runway, Midjourney, Kling, ComfyUI, Flux), models, verified workflow pipelines, and 4K reels to get hired for commercial campaigns.
              </p>

              <div className="mt-6 flex flex-wrap gap-2 text-[11px] font-medium text-white/60">
                <span className="rounded-md bg-white/[0.04] px-2.5 py-1 border border-white/5">Runway Gen-3</span>
                <span className="rounded-md bg-white/[0.04] px-2.5 py-1 border border-white/5">Midjourney v6.1</span>
                <span className="rounded-md bg-white/[0.04] px-2.5 py-1 border border-white/5">Flux.1</span>
                <span className="rounded-md bg-white/[0.04] px-2.5 py-1 border border-white/5">Commercial Rights</span>
              </div>
            </div>

            <div className="mt-10 flex items-center justify-between border-t border-white/10 pt-6">
              <span className="text-xs font-semibold text-white/70 group-hover:text-white">
                Launch Creator Studio
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white transition group-hover:bg-amber-500 group-hover:text-black">
                →
              </span>
            </div>
          </Link>

          {/* Brand Path */}
          <Link
            href="/brand"
            className="group relative flex flex-col justify-between overflow-hidden rounded-[2rem] border border-white/10 bg-[#0c0d12]/80 p-8 sm:p-10 backdrop-blur-xl transition-all duration-300 hover:border-cyan-500/50 hover:bg-[#111219]/90 hover:shadow-2xl hover:shadow-cyan-500/10 hover:-translate-y-1"
          >
            <div
              className="absolute -right-12 -top-12 h-44 w-44 rounded-full blur-[80px] transition duration-500 group-hover:scale-150 bg-cyan-500/20"
            />

            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-2xl shadow-inner">
                  🏢
                </div>
                <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-cyan-300">
                  Enterprise &amp; Brand
                </span>
              </div>

              <h2 className="mt-8 text-2xl sm:text-3xl font-black text-white group-hover:text-cyan-200 transition">
                I am a Brand or Agency
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/55">
                Use our AI Brief Builder to turn rough campaign ideas into structured parameters, discover ranked creators with 7-factor explainability, and inspect verification signals.
              </p>

              <div className="mt-6 flex flex-wrap gap-2 text-[11px] font-medium text-white/60">
                <span className="rounded-md bg-white/[0.04] px-2.5 py-1 border border-white/5">AI Brief Synthesizer</span>
                <span className="rounded-md bg-white/[0.04] px-2.5 py-1 border border-white/5">7-Factor Match Engine</span>
                <span className="rounded-md bg-white/[0.04] px-2.5 py-1 border border-white/5">Verified Talent</span>
              </div>
            </div>

            <div className="mt-10 flex items-center justify-between border-t border-white/10 pt-6">
              <span className="text-xs font-semibold text-white/70 group-hover:text-white">
                Enter Brand Workspace
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white transition group-hover:bg-cyan-500 group-hover:text-black">
                →
              </span>
            </div>
          </Link>
        </div>

        {/* Existing Accounts Quick Link */}
        <div className="mt-14 inline-flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-6 py-3 text-xs text-white/50 backdrop-blur-md">
          <span>Already registered?</span>
          <Link
            href="/creator-studio"
            className="font-bold text-white hover:text-amber-400 transition underline underline-offset-4"
          >
            Creator Studio
          </Link>
          <span className="text-white/20">•</span>
          <Link
            href="/brand"
            className="font-bold text-white hover:text-cyan-400 transition underline underline-offset-4"
          >
            Brand Briefs
          </Link>
          <span className="text-white/20">•</span>
          <Link
            href="/discover"
            className="font-bold text-white hover:text-white/80 transition underline underline-offset-4"
          >
            Talent Discovery
          </Link>
        </div>
      </section>
    </main>
  );
}
