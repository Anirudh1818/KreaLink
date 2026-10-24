"use client";

import Link from "next/link";
import { useLeaderboard } from "@/lib/reviews/useLeaderboard";
import { RATING_KEYS, RATING_LABEL } from "@/lib/reviews/types";
import { RatingSummary, ReviewList } from "./ReviewUI";

/** Public reviews + weekly rank for one creator (profile page, studio). */
export function CreatorReviewsSection({ username, tone = "dark" }: { username: string; tone?: "dark" | "light" }) {
  const { reviews, current, live } = useLeaderboard();
  const mine = reviews.filter((r) => r.creatorUsername.toLowerCase() === username.toLowerCase());
  const weekly = current.top.find((t) => t.username.toLowerCase() === username.toLowerCase());
  const standing = live.find((t) => t.username.toLowerCase() === username.toLowerCase());
  const dark = tone === "dark";
  const muted = dark ? "text-white/50" : "text-slate-500";

  const avg = (k: (typeof RATING_KEYS)[number]) => (mine.length ? mine.reduce((s, r) => s + r[k], 0) / mine.length : 0);

  return (
    <section className={`rounded-2xl p-5 space-y-4 ${dark ? "border border-white/10 bg-white/[0.03]" : "border border-slate-200 bg-white"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={`text-base font-bold ${dark ? "text-white" : "text-slate-900"}`}>Client reviews</h2>
          <div className="mt-1">
            <RatingSummary reviews={mine} tone={tone} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {weekly && (
            <Link href="/top-creators" className="rounded-full bg-amber-400/15 px-3 py-1 text-[12px] font-bold text-amber-500 ring-1 ring-amber-400/30">
              🏆 #{weekly.rank} Top Creator this week
            </Link>
          )}
          {standing && (
            <span className={`rounded-full px-3 py-1 text-[12px] font-semibold ring-1 ${dark ? "text-white/70 ring-white/15" : "text-slate-600 ring-slate-200"}`}>
              Score {standing.score.toFixed(1)} / 100 · live rank #{standing.rank}
            </span>
          )}
        </div>
      </div>

      {mine.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-4">
          {RATING_KEYS.map((k) => (
            <div key={k} className={`rounded-xl p-2 text-center ${dark ? "bg-white/[0.04]" : "bg-slate-50"}`}>
              <p className={`text-lg font-black ${dark ? "text-white" : "text-slate-900"}`}>{avg(k).toFixed(1)}</p>
              <p className={`text-[10px] ${muted}`}>{RATING_LABEL[k]}</p>
            </div>
          ))}
        </div>
      )}

      <ReviewList reviews={mine} tone={tone} empty="No reviews yet. Reviews appear after a brand approves a completed project." />
    </section>
  );
}
