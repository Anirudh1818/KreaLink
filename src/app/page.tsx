"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useStoredTheme } from "@/lib/use-theme";
import { Navbar } from "@/components/Navbar";
import { CreatorProfile } from "@/lib/types";
import { DEMO_CREATORS } from "@/lib/demoData";
import { ReelTile } from "@/components/ReelTile";

const reels = Array.from(
  { length: 12 },
  (_, index) => `/reels/reel-${String(index + 1).padStart(2, "0")}.mp4`
);

export default function Home() {
  const { theme } = useStoredTheme();
  const [featuredCreators, setFeaturedCreators] = useState<CreatorProfile[]>(
    DEMO_CREATORS.slice(0, 4).map((c) => c.creator)
  );

  useEffect(() => {
    async function loadFeatured() {
      try {
        const snap = await getDocs(collection(db, "creators"));
        if (!snap.empty) {
          const loaded: CreatorProfile[] = snap.docs.slice(0, 4).map((d) => ({
            username: d.id,
            ...(d.data() as any),
          }));
          setFeaturedCreators(loaded);
        }
      } catch {
        // demo creators fallback
      }
    }
    loadFeatured();
  }, []);

  return (
    <main className="min-h-screen overflow-hidden bg-[#030306] text-white">
      {/* Background ambient glow */}
      <div className="pointer-events-none fixed inset-0">
        <div
          className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full blur-[140px]"
          style={{ background: theme.glow, opacity: 0.8 }}
        />
        <div
          className="absolute right-[-100px] top-60 h-[450px] w-[450px] rounded-full blur-[120px]"
          style={{ background: theme.glow, opacity: 0.4 }}
        />
        <div className="absolute bottom-0 left-[-100px] h-[450px] w-[450px] rounded-full bg-cyan-600/10 blur-[130px]" />
      </div>

      <Navbar />

      {/* HERO SECTION */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-16 pt-12 md:px-8 md:pt-20">
        <div className="mx-auto max-w-4xl text-center">
          {/* Journey Flow Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-white/60 backdrop-blur-xl">
            <span>IDEA</span>
            <span className="text-white/30">→</span>
            <span>AI BRIEF</span>
            <span className="text-white/30">→</span>
            <span>BEST-FIT CREATOR</span>
            <span className="text-white/30">→</span>
            <span className="text-emerald-400">CREATE</span>
          </div>

          <h1 className="mt-8 text-5xl font-black leading-[1.02] tracking-tight md:text-7xl">
            Hire the World&apos;s Best
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: theme.text }}
            >
              AI Content Creators.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/65 md:text-xl">
            KreaLink connects forward-thinking brands and creative agencies with elite AI filmmakers, animators, and generative artists using structured AI briefs and capability matching.
          </p>

          {/* Primary CTAs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/discover"
              className="rounded-2xl px-8 py-4 text-sm font-black text-white transition hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: theme.gradient,
                boxShadow: `0 0 45px ${theme.glow}`,
              }}
            >
              Find AI Creators →
            </Link>

            <Link
              href="/brand?tab=create-brief"
              className="rounded-2xl border border-white/15 bg-white/[0.06] px-8 py-4 text-sm font-black text-white transition hover:bg-white/[0.12]"
            >
              🤖 Create AI Brief
            </Link>

            <Link
              href="/join-creator"
              className="rounded-2xl border border-white/10 bg-transparent px-6 py-4 text-sm font-bold text-white/70 transition hover:bg-white/[0.04] hover:text-white"
            >
              Join as Creator
            </Link>
          </div>

          {/* Trust stats row */}
          <div className="mt-14 grid grid-cols-2 gap-4 border-t border-white/10 pt-8 sm:grid-cols-4 text-left">
            <div>
              <p className="text-2xl font-black text-white">100%</p>
              <p className="text-xs font-bold text-white/45">AI-Native Portfolios</p>
            </div>
            <div>
              <p className="text-2xl font-black text-white">7+ Factors</p>
              <p className="text-xs font-bold text-white/45">Transparent Match Scoring</p>
            </div>
            <div>
              <p className="text-2xl font-black text-white">Commercial Rights</p>
              <p className="text-xs font-bold text-white/45">Clear Licensing Signals</p>
            </div>
            <div>
              <p className="text-2xl font-black text-white">&lt; 30s</p>
              <p className="text-xs font-bold text-white/45">AI Brief Generation</p>
            </div>
          </div>
        </div>

        {/* Ambient Video Reels Grid Banner */}
        <div className="mt-16 overflow-hidden rounded-[2.6rem] border border-white/10 bg-black/40 p-3 shadow-2xl backdrop-blur-xl">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {reels.slice(0, 6).map((src, i) => (
              <div
                key={src}
                className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-black/60 shadow-lg"
              >
                <ReelTile src={src} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <span className="absolute bottom-2.5 left-2.5 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white/80 backdrop-blur-md">
                  AI Reel 0{i + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4-STEP MARKETPLACE WORKFLOW */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1 text-xs font-black uppercase tracking-[0.2em] text-white/50">
            End-to-End Workflow
          </div>
          <h2 className="mt-3 text-3xl font-black md:text-5xl">
            How KreaLink Works
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-white/55">
            From natural-language ideation to verified creator engagement in minutes.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[2.2rem] border border-white/10 bg-black/35 p-6 backdrop-blur-md">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-2xl">
              💡
            </span>
            <span className="mt-4 block text-xs font-black uppercase tracking-wider text-white/40">
              Step 01
            </span>
            <h3 className="mt-1 text-xl font-black text-white">Describe Your Vision</h3>
            <p className="mt-2 text-xs leading-5 text-white/55">
              Enter a rough campaign idea. Our AI Brief Builder structures requirements, aspect ratios, style tags, and commercial terms.
            </p>
          </div>

          <div className="rounded-[2.2rem] border border-white/10 bg-black/35 p-6 backdrop-blur-md">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-2xl">
              ⚡
            </span>
            <span className="mt-4 block text-xs font-black uppercase tracking-wider text-white/40">
              Step 02
            </span>
            <h3 className="mt-1 text-xl font-black text-white">Explainable Matching</h3>
            <p className="mt-2 text-xs leading-5 text-white/55">
              Our 7-factor engine ranks creators by skills, tools, models, format, and commercial capability — with clear &quot;Why this creator?&quot; insights.
            </p>
          </div>

          <div className="rounded-[2.2rem] border border-white/10 bg-black/35 p-6 backdrop-blur-md">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-2xl">
              🎨
            </span>
            <span className="mt-4 block text-xs font-black uppercase tracking-wider text-white/40">
              Step 03
            </span>
            <h3 className="mt-1 text-xl font-black text-white">Inspect AI Portfolios</h3>
            <p className="mt-2 text-xs leading-5 text-white/55">
              Evaluate verified toolchains (Runway, Midjourney, Kling, ComfyUI), production workflows, and past commercial deliverables.
            </p>
          </div>

          <div className="rounded-[2.2rem] border border-white/10 bg-black/35 p-6 backdrop-blur-md">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-2xl">
              🤝
            </span>
            <span className="mt-4 block text-xs font-black uppercase tracking-wider text-white/40">
              Step 04
            </span>
            <h3 className="mt-1 text-xl font-black text-white">Invite &amp; Engage</h3>
            <p className="mt-2 text-xs leading-5 text-white/55">
              Send brief invitations with one click. Creators accept inside Creator Studio, and your campaign production begins immediately.
            </p>
          </div>
        </div>
      </section>

      {/* FEATURED CREATORS SECTION */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1 text-xs font-black uppercase tracking-[0.2em] text-white/50">
              Elite Talent
            </div>
            <h2 className="mt-2 text-3xl font-black md:text-5xl">
              Featured AI Creators
            </h2>
            <p className="mt-1 text-sm text-white/55">
              Specialized across commercial spots, 9:16 vertical motion, VFX, and luxury aesthetics.
            </p>
          </div>

          <Link
            href="/discover"
            className="rounded-xl border border-white/15 bg-white/[0.05] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/[0.1]"
          >
            View All Creators →
          </Link>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featuredCreators.map((c) => (
            <Link
              key={c.username}
              href={`/${c.username}`}
              className="group flex flex-col justify-between rounded-[2.2rem] border border-white/10 bg-black/40 p-6 backdrop-blur-md transition duration-300 hover:border-white/30 hover:shadow-2xl"
            >
              <div>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl font-black text-lg p-[2px]"
                    style={{ background: theme.gradient }}
                  >
                    <div className="flex h-full w-full items-center justify-center rounded-[0.8rem] bg-[#121217]">
                      {c.profilePhoto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.profilePhoto}
                          alt={c.name}
                          className="h-full w-full rounded-[0.8rem] object-cover"
                        />
                      ) : (
                        c.name.charAt(0)
                      )}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <h3 className="truncate font-black text-white group-hover:underline">
                      {c.name}
                    </h3>
                    <p className="truncate text-xs font-bold text-white/40">
                      @{c.username}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-xs font-bold text-emerald-300">
                  {c.specialization}
                </p>

                <p className="mt-2 text-xs leading-5 text-white/55 line-clamp-2">
                  {c.bio}
                </p>

                <div className="mt-4 flex flex-wrap gap-1">
                  {[...(c.aiTools || []), ...(c.aiModels || [])].slice(0, 3).map((t) => (
                    <span
                      key={t}
                      className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-bold text-white/70"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-3 text-[11px] font-bold text-white/50">
                <span>{c.commercialUse ? "⚡ Commercial Ready" : "Personal"}</span>
                <span className="text-white group-hover:translate-x-1 transition">
                  Profile →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CALL TO ACTION BANNER */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div
          className="relative overflow-hidden rounded-[2.8rem] p-[1px]"
          style={{ background: theme.gradient, boxShadow: `0 0 100px ${theme.glow}` }}
        >
          <div className="relative rounded-[2.75rem] border border-white/10 bg-[#08060d] px-8 py-14 text-center md:px-16 md:py-20">
            <h2 className="text-4xl font-black tracking-tight md:text-6xl">
              Ready to launch your next AI campaign?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-white/60 md:text-lg">
              Start with a natural-language brief or browse capability-verified AI creators ready for commercial work.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/brand?tab=create-brief"
                className="rounded-2xl px-8 py-4 text-sm font-black text-white transition hover:scale-105"
                style={{ background: theme.gradient }}
              >
                Create an AI Brief →
              </Link>
              <Link
                href="/discover"
                className="rounded-2xl border border-white/15 bg-white/[0.06] px-8 py-4 text-sm font-black text-white hover:bg-white/[0.12]"
              >
                Browse Marketplace
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/10 bg-[#050508] px-5 py-12 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm font-black">
              K
            </div>
            <div>
              <p className="font-black text-white">KreaLink</p>
              <p className="text-[11px] text-white/40">AI Content Creator Marketplace</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-bold text-white/60">
            <Link href="/discover" className="hover:text-white">Discover</Link>
            <Link href="/brand" className="hover:text-white">Brand Hub</Link>
            <Link href="/creator-studio" className="hover:text-white">Creator Studio</Link>
            <Link href="/join-creator" className="hover:text-white">Join as Creator</Link>
            <Link href="/choose-role" className="hover:text-white">Choose Role</Link>
          </div>

          <p className="text-xs text-white/35">
            Kampus.VC Hackathon · KreaLink 2026
          </p>
        </div>
      </footer>
    </main>
  );
}
