"use client";

import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Stars } from "@/components/reviews/ReviewUI";
import { useLeaderboard } from "@/lib/reviews/useLeaderboard";
import { BAYES_PRIOR_COUNT, TOP_N, WEEK_MS, type RankedCreator, type ScoreBreakdown } from "@/lib/reviews/ranking";

const BREAKDOWN: { key: keyof ScoreBreakdown; label: string; max: number }[] = [
  { key: "rating", label: "Rating", max: 50 },
  { key: "delivery", label: "Delivery", max: 20 },
  { key: "trackRecord", label: "Track record", max: 15 },
  { key: "momentum", label: "Momentum", max: 10 },
  { key: "trust", label: "Portfolio & trust", max: 5 },
];

const fmtDate = (t: number) => new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

function countdown(ms: number): string {
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
}

function Movement({ value }: { value: number | null | undefined }) {
  if (value === undefined) return null;
  if (value === null) return <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-300">NEW</span>;
  if (value > 0) return <span className="text-[11px] font-bold text-lime-400">▲ {value}</span>;
  if (value < 0) return <span className="text-[11px] font-bold text-rose-400">▼ {Math.abs(value)}</span>;
  return <span className="text-[11px] font-bold text-white/40">—</span>;
}

function CreatorRow({ c, movement }: { c: RankedCreator; movement?: number | null }) {
  const medal = c.rank === 1 ? "🥇" : c.rank === 2 ? "🥈" : c.rank === 3 ? "🥉" : null;
  return (
    <li className={`rounded-2xl border p-4 transition ${c.rank <= 3 ? "border-lime-400/30 bg-lime-400/[0.05]" : "border-white/10 bg-white/[0.03]"}`}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="w-10 text-center text-xl font-black text-white">{medal ?? `#${c.rank}`}</div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-lime-400/15 text-sm font-black text-lime-300">
          {c.profilePhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.profilePhoto} alt="" className="h-full w-full object-cover" />
          ) : (
            c.name[0]
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/${c.username}`} className="truncate text-sm font-bold text-white hover:text-lime-300">
              {c.name}
            </Link>
            {c.verified && <span className="text-[10px] text-lime-400">✓ verified</span>}
            <Movement value={movement} />
          </div>
          <p className="truncate text-[11px] text-white/45">{c.specialization}</p>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-white/60">
            <Stars value={c.avgRating} />
            <span className="font-semibold text-white/80">{c.avgRating.toFixed(1)}</span>
            <span>· {c.reviewCount} review{c.reviewCount === 1 ? "" : "s"}</span>
            {c.recentReviews > 0 && <span>· {c.recentReviews} in last 30 days</span>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black tabular-nums text-lime-300">{c.score.toFixed(1)}</p>
          <p className="text-[10px] uppercase tracking-wider text-white/40">score / 100</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {BREAKDOWN.map((b) => (
          <div key={b.key} title={`${b.label}: ${c.breakdown[b.key]} / ${b.max}`}>
            <div className="h-1.5 rounded-full bg-white/10">
              <div className="h-full rounded-full bg-lime-400/80" style={{ width: `${(c.breakdown[b.key] / b.max) * 100}%` }} />
            </div>
            <p className="mt-1 truncate text-[9px] text-white/40">
              {b.label} {c.breakdown[b.key]}/{b.max}
            </p>
          </div>
        ))}
      </div>
    </li>
  );
}

export default function TopCreatorsPage() {
  const { current, past, live, loading, now, nextPick } = useLeaderboard();
  const [view, setView] = useState<"week" | "live">("week");

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6 px-4 pb-16 pt-6">
        <div className="rounded-2xl border border-lime-500/20 bg-gradient-to-br from-[#0d2a1c] via-[#0a1f16] to-[#050606] p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-lime-400">Picked every 7 days</p>
          <h1 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">Top {TOP_N} Creators of the Week</h1>
          <p className="mt-1 text-sm text-white/55">
            Week of {fmtDate(current.weekStart)} – {fmtDate(current.weekStart + WEEK_MS - 1)} · ranked by verified client reviews and delivered work.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-black/30 px-3 py-1.5 text-[12px] font-semibold text-white/80 ring-1 ring-white/10">
              ⏳ Next pick in {countdown(Math.max(0, nextPick - now))} · Monday 00:00 IST
            </span>
            <div className="inline-flex rounded-full bg-black/30 p-1 ring-1 ring-white/10">
              {(["week", "live"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  aria-pressed={view === v}
                  className={`rounded-full px-3 py-1 text-[12px] font-semibold transition ${view === v ? "bg-lime-400 text-black" : "text-white/70 hover:text-white"}`}
                >
                  {v === "week" ? "This week's Top 10" : "Live standings"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading && current.top.length === 0 && live.length === 0 && <p className="text-sm text-white/40">Loading reviews…</p>}

        {view === "week" ? (
          current.top.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-white/50">
              No creator had a completed, reviewed project before this week started. The first Top 10 appears next Monday.
            </p>
          ) : (
            <ol className="space-y-3">
              {current.top.map((c) => (
                <CreatorRow key={c.username} c={c} movement={current.movement[c.username.toLowerCase()]} />
              ))}
            </ol>
          )
        ) : (
          <>
            <p className="text-[12px] text-white/50">
              Live standings include every review up to now. They become next week&apos;s Top {TOP_N} at the next pick.
            </p>
            <ol className="space-y-3">
              {live.slice(0, 25).map((c) => (
                <CreatorRow key={c.username} c={c} />
              ))}
            </ol>
          </>
        )}

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-sm font-bold text-white">Past weekly picks</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {past.map((w) => (
              <div key={w.weekStart} className="rounded-xl border border-white/10 p-3">
                <p className="text-[11px] font-semibold text-white/60">Week of {fmtDate(w.weekStart)}</p>
                {w.top.length === 0 ? (
                  <p className="mt-1 text-[11px] text-white/35">No ranked creators yet.</p>
                ) : (
                  <ol className="mt-1 space-y-0.5 text-[12px] text-white/80">
                    {w.top.slice(0, 3).map((c) => (
                      <li key={c.username}>
                        #{c.rank} {c.name} <span className="text-white/40">· {c.score.toFixed(1)}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-[12px] leading-relaxed text-white/60">
          <h2 className="text-sm font-bold text-white">How the ranking works</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Only brands that approved a creator&apos;s final delivery can review them — one review per engagement.</li>
            <li>
              <b className="text-white/80">Rating (50)</b> and <b className="text-white/80">Delivery (20)</b> use a Bayesian average: every creator starts with{" "}
              {BAYES_PRIOR_COUNT} &quot;average&quot; reviews, so a single 5★ can&apos;t beat a long, consistent record.
            </li>
            <li><b className="text-white/80">Track record (15)</b> grows with completed, reviewed projects; <b className="text-white/80">Momentum (10)</b> rewards reviews in the last 30 days.</li>
            <li><b className="text-white/80">Portfolio &amp; trust (5)</b> counts portfolio depth and admin verification.</li>
            <li>Each Monday 00:00 IST the Top {TOP_N} is locked using only reviews from before that moment, so it&apos;s the same for everyone all week.</li>
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
