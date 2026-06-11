"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";

function PassportContent() {
  const params = useParams();
  const searchParams = useSearchParams();

  const fanName = searchParams.get("fanName") || "Passport Fan";
  const creatorName = searchParams.get("creatorName") || "Creator";
  const creatorUsername = searchParams.get("creator") || "creator";

  const fanSlug = String(params?.fan || "passport-fan");

  return (
    <main className="min-h-screen overflow-hidden bg-[#050508] px-5 py-10 text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-0 h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-pink-500/25 blur-[120px]" />
        <div className="absolute right-0 top-52 h-[360px] w-[360px] rounded-full bg-purple-600/25 blur-[110px]" />
        <div className="absolute bottom-0 left-0 h-[340px] w-[340px] rounded-full bg-orange-500/15 blur-[110px]" />
      </div>

      <section className="relative z-10 mx-auto max-w-6xl">
        <a
          href={`/${creatorUsername}`}
          className="inline-flex rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-white/60 transition hover:bg-white/[0.08]"
        >
          ← Back to creator page
        </a>

        <div className="mt-8 rounded-[2.8rem] bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 p-[1px] shadow-[0_0_100px_rgba(236,72,153,0.28)]">
          <div className="rounded-[2.75rem] bg-[#08060d] p-6 md:p-10">
            <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.25em] text-white/40">
                  FanStreak Passport
                </p>

                <h1 className="mt-4 text-5xl font-black leading-tight md:text-7xl">
                  {fanName}
                </h1>

                <p className="mt-4 text-xl text-white/55">
                  Passport Fan of {creatorName}
                </p>

                <div className="mt-8 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <p className="text-sm text-white/35">Fan Level</p>
                    <p className="mt-2 text-2xl font-black">Passport Fan</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <p className="text-sm text-white/35">Current Streak</p>
                    <p className="mt-2 text-2xl font-black">Ready</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <p className="text-sm text-white/35">Current Rank</p>
                    <p className="mt-2 text-2xl font-black">Unranked</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <p className="text-sm text-white/35">Passport ID</p>
                    <p className="mt-2 text-xl font-black">
                      FS-{fanSlug.slice(0, 10).toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-5">
                  <p className="text-sm leading-7 text-white/45">
                    This Passport confirms premium fan identity only. Streak
                    days, ranks, and leaderboard positions are updated based on
                    real support and consistency inside the creator community.
                  </p>
                </div>
              </div>

              <div className="rounded-[2.4rem] border border-white/10 bg-black/35 p-6">
                <div className="rounded-[2rem] bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 p-[1px]">
                  <div className="rounded-[1.95rem] bg-black/80 p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-black uppercase tracking-[0.22em] text-white/35">
                          FanStreak
                        </p>
                        <h2 className="mt-2 bg-gradient-to-r from-orange-300 via-pink-400 to-purple-400 bg-clip-text text-4xl font-black text-transparent">
                          Passport
                        </h2>
                      </div>

                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-3xl">
                        🔥
                      </div>
                    </div>

                    <div className="mt-8">
                      <p className="text-sm uppercase tracking-[0.22em] text-white/35">
                        Passport Fan
                      </p>
                      <p className="mt-2 text-3xl font-black">{fanName}</p>
                      <p className="mt-2 text-sm text-white/45">
                        Supporter of {creatorName}
                      </p>
                    </div>

                    <div className="mt-8 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-xs text-white/35">Badge</p>
                        <p className="mt-1 font-black">Passport Holder</p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-xs text-white/35">Status</p>
                        <p className="mt-1 font-black">Premium Fan</p>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div>
                        <p className="text-xs text-white/35">Passport Link</p>
                        <p className="mt-1 break-all text-sm font-black text-white/70">
                          fanstreak.in/passport/{fanSlug}
                        </p>
                      </div>

                      <div className="grid h-16 w-16 shrink-0 grid-cols-4 gap-1 rounded-xl bg-white p-2">
                        {Array.from({ length: 16 }).map((_, index) => (
                          <span
                            key={index}
                            className={`rounded-[3px] ${
                              index % 3 === 0 ? "bg-black" : "bg-black/25"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {[
                    "Shareable Fan Passport Card",
                    "Passport badge on fan identity",
                    "Creator Drop priority alerts",
                    "Passport Fan Wall visibility",
                    "Future meetup priority consideration",
                    "Fair play: rankings depend on real support",
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"
                    >
                      <p className="font-bold text-white/70">✦ {item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function PassportPage() {
  // useSearchParams requires a Suspense boundary during prerendering.
  return (
    <Suspense fallback={null}>
      <PassportContent />
    </Suspense>
  );
}
