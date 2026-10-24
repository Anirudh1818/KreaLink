"use client";

import { useState } from "react";
import type { Engagement } from "@/lib/r2/types";
import { RATING_KEYS, RATING_LABEL, REVIEW_COMMENT_MAX, type Review, type ReviewRatings } from "@/lib/reviews/types";
import { submitReview, validateReview } from "@/lib/reviews/store";

type Tone = "dark" | "light";

export function Stars({ value, size = 13, className = "" }: { value: number; size?: number; className?: string }) {
  const full = Math.round(value);
  return (
    <span className={`inline-flex items-center ${className}`} role="img" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ fontSize: size, lineHeight: 1 }} className={i <= full ? "text-amber-400" : "text-slate-400/40"}>
          ★
        </span>
      ))}
    </span>
  );
}

function StarInput({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12px] font-semibold">{label}</span>
      <span className="inline-flex" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={value === i}
            aria-label={`${i} star${i > 1 ? "s" : ""}`}
            onClick={() => onChange(i)}
            className={`px-0.5 text-[20px] leading-none transition ${i <= value ? "text-amber-400" : "text-slate-400/40 hover:text-amber-300"}`}
          >
            ★
          </button>
        ))}
      </span>
    </div>
  );
}

/** Brand reviews the creator after approving the final delivery (one per engagement). */
export function ReviewForm({ eng, brandName, tone = "dark" }: { eng: Engagement; brandName: string; tone?: Tone }) {
  const [ratings, setRatings] = useState<ReviewRatings>({ rating: 0, quality: 0, communication: 0, timeliness: 0 });
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const dark = tone === "dark";

  async function submit() {
    const problem = validateReview(ratings, comment);
    if (problem) return setMsg({ ok: false, text: problem });
    setBusy(true);
    setMsg(null);
    try {
      await submitReview(eng, ratings, comment, brandName);
      setMsg({ ok: true, text: "Review published. It now counts toward this creator's rating and weekly ranking." });
    } catch (err) {
      const code = (err as { code?: string }).code;
      setMsg({
        ok: false,
        text: code === "permission-denied" ? "This engagement already has a review, or it isn't eligible yet." : (err as Error).message,
      });
    } finally {
      setBusy(false);
    }
  }

  if (msg?.ok) {
    return <div className={`rounded-xl p-3 text-xs font-semibold ${dark ? "bg-lime-500/10 text-lime-300 border border-lime-500/30" : "bg-emerald-50 text-emerald-800 border border-emerald-200"}`}>{msg.text}</div>;
  }

  return (
    <div className={`space-y-3 rounded-2xl p-4 ${dark ? "border border-white/10 bg-white/[0.03] text-white" : "border border-slate-200 bg-white text-slate-900"}`}>
      <div>
        <p className="text-sm font-bold">⭐ Review @{eng.creatorId}</p>
        <p className={`text-[11px] ${dark ? "text-white/50" : "text-slate-500"}`}>
          Reviews come only from approved deliveries and feed the creator&apos;s rating and the weekly Top 10.
        </p>
      </div>
      {RATING_KEYS.map((k) => (
        <StarInput key={k} label={RATING_LABEL[k]} value={ratings[k]} onChange={(v) => setRatings((r) => ({ ...r, [k]: v }))} />
      ))}
      <textarea
        rows={3}
        maxLength={REVIEW_COMMENT_MAX}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="What was it like working with this creator? Quality, revisions, delivery…"
        className={`w-full rounded-xl px-3 py-2 text-xs outline-none ${dark ? "bg-white/[0.05] border border-white/10 text-white placeholder-white/30 focus:border-lime-400/50" : "border border-slate-200 bg-white text-slate-800 focus:border-emerald-500"}`}
      />
      {msg && !msg.ok && <p className="text-xs font-semibold text-rose-500">{msg.text}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className={`rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-50 ${dark ? "bg-lime-400 text-black hover:bg-lime-300" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
      >
        {busy ? "Publishing…" : "Publish review"}
      </button>
    </div>
  );
}

export function ReviewList({ reviews, tone = "light", empty = "No reviews yet." }: { reviews: Review[]; tone?: Tone; empty?: string }) {
  const dark = tone === "dark";
  const muted = dark ? "text-white/50" : "text-slate-500";
  if (reviews.length === 0) return <p className={`text-xs ${muted}`}>{empty}</p>;
  return (
    <ul className="space-y-3">
      {[...reviews].sort((a, b) => b.createdAt - a.createdAt).map((r) => (
        <li key={r.id} className={`rounded-xl p-3 ${dark ? "border border-white/10 bg-white/[0.03]" : "border border-slate-200 bg-white"}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Stars value={r.rating} />
              <span className={`text-xs font-bold ${dark ? "text-white" : "text-slate-900"}`}>{r.brandName}</span>
              {r.source === "sample" && <span className="rounded-full bg-slate-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-500">Sample review</span>}
              {r.source === "local" && <span className="rounded-full bg-slate-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-500">Demo · this device</span>}
              {r.source === "platform" && <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-600">Verified engagement</span>}
            </div>
            <span className={`text-[10px] ${muted}`}>{new Date(r.createdAt).toLocaleDateString()}</span>
          </div>
          <p className={`mt-1 text-[11px] ${muted}`}>{r.campaignTitle}</p>
          <p className={`mt-1 text-xs ${dark ? "text-white/80" : "text-slate-700"}`}>{r.comment}</p>
          <p className={`mt-1 text-[10px] ${muted}`}>
            Quality {r.quality}/5 · Communication {r.communication}/5 · On-time {r.timeliness}/5
          </p>
        </li>
      ))}
    </ul>
  );
}

/** Average rating summary for a set of reviews. */
export function RatingSummary({ reviews, tone = "light" }: { reviews: Review[]; tone?: Tone }) {
  const dark = tone === "dark";
  if (reviews.length === 0) return <span className={`text-xs ${dark ? "text-white/50" : "text-slate-500"}`}>No reviews yet</span>;
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  return (
    <span className="inline-flex items-center gap-1.5">
      <Stars value={avg} />
      <span className={`text-xs font-bold ${dark ? "text-white" : "text-slate-900"}`}>{avg.toFixed(1)}</span>
      <span className={`text-[11px] ${dark ? "text-white/50" : "text-slate-500"}`}>({reviews.length})</span>
    </span>
  );
}
