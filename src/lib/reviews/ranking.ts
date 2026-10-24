/**
 * KreaLink — creator ranking & weekly Top 10
 * ----------------------------------------------------------------------------
 * Pure and deterministic: the same inputs give the same ranking everywhere.
 *
 * Score (0–100):
 *   50  Overall rating            Bayesian average (prior C reviews at the platform mean)
 *   20  Delivery quality          Bayesian average of quality, communication, timeliness
 *   15  Track record              completed, reviewed projects (log-scaled, caps at 20)
 *   10  Momentum                  reviews in the 30 days before the cutoff (caps at 5)
 *    5  Portfolio & trust         portfolio items (caps at 6) + verified badge
 *
 * Weekly Top 10: every week starts Monday 00:00 IST. The Top 10 "picked" for
 * a week is computed only from reviews created before that week started, so
 * it is frozen for 7 days and identical for every visitor — no cron needed.
 */

import type { Review } from "./types";

export const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEK_MS = 7 * DAY_MS;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export const BAYES_PRIOR_COUNT = 5;
export const TOP_N = 10;
export const MOMENTUM_WINDOW_MS = 30 * DAY_MS;

/** Start (epoch ms) of the ranking week containing `t` — Monday 00:00 IST. */
export function weekStart(t: number): number {
  const shifted = t + IST_OFFSET_MS;
  const day = Math.floor(shifted / DAY_MS);
  const mondayIndex = (day + 3) % 7; // 1970-01-01 was a Thursday → Monday = 0
  return (day - mondayIndex) * DAY_MS - IST_OFFSET_MS;
}

export function nextPickAt(now: number): number {
  return weekStart(now) + WEEK_MS;
}

export type RankInputCreator = {
  username: string;
  name: string;
  specialization: string;
  profilePhoto?: string;
  verified?: boolean;
  portfolioCount: number;
};

export type ScoreBreakdown = {
  rating: number;     // 0–50
  delivery: number;   // 0–20
  trackRecord: number; // 0–15
  momentum: number;   // 0–10
  trust: number;      // 0–5
};

export type RankedCreator = RankInputCreator & {
  rank: number;
  score: number;          // 0–100, one decimal
  breakdown: ScoreBreakdown;
  avgRating: number;      // plain average, for display
  reviewCount: number;
  recentReviews: number;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

function bayes(sum: number, count: number, prior: number): number {
  return (BAYES_PRIOR_COUNT * prior + sum) / (BAYES_PRIOR_COUNT + count);
}

/** Rank creators using reviews created strictly before `cutoff`. */
export function computeRanking(creators: RankInputCreator[], allReviews: Review[], cutoff: number): RankedCreator[] {
  const reviews = allReviews.filter((r) => r.createdAt < cutoff);
  const byCreator = new Map<string, Review[]>();
  for (const r of reviews) {
    const k = r.creatorUsername.toLowerCase();
    byCreator.set(k, [...(byCreator.get(k) ?? []), r]);
  }

  // Platform means are the Bayesian priors (fall back to a neutral 3.5).
  const n = reviews.length;
  const meanRating = n ? reviews.reduce((s, r) => s + r.rating, 0) / n : 3.5;
  const deliveryOf = (r: Review) => (r.quality + r.communication + r.timeliness) / 3;
  const meanDelivery = n ? reviews.reduce((s, r) => s + deliveryOf(r), 0) / n : 3.5;

  const ranked: Omit<RankedCreator, "rank">[] = [];
  for (const c of creators) {
    const mine = byCreator.get(c.username.toLowerCase()) ?? [];
    if (mine.length === 0) continue; // ranking needs at least one verified-work review
    const count = mine.length;
    const ratingSum = mine.reduce((s, r) => s + r.rating, 0);
    const deliverySum = mine.reduce((s, r) => s + deliveryOf(r), 0);
    const recent = mine.filter((r) => r.createdAt >= cutoff - MOMENTUM_WINDOW_MS).length;

    const breakdown: ScoreBreakdown = {
      rating: round1((bayes(ratingSum, count, meanRating) / 5) * 50),
      delivery: round1((bayes(deliverySum, count, meanDelivery) / 5) * 20),
      trackRecord: round1(Math.min(1, Math.log2(1 + count) / Math.log2(21)) * 15),
      momentum: round1(Math.min(1, recent / 5) * 10),
      trust: round1(Math.min(1, c.portfolioCount / 6) * 3 + (c.verified ? 2 : 0)),
    };
    const score = round1(breakdown.rating + breakdown.delivery + breakdown.trackRecord + breakdown.momentum + breakdown.trust);
    ranked.push({ ...c, score, breakdown, avgRating: round1(ratingSum / count), reviewCount: count, recentReviews: recent });
  }

  // Deterministic order: score, then review count, then average, then username.
  ranked.sort(
    (a, b) =>
      b.score - a.score ||
      b.reviewCount - a.reviewCount ||
      b.avgRating - a.avgRating ||
      a.username.localeCompare(b.username)
  );
  return ranked.map((r, i) => ({ ...r, rank: i + 1 }));
}

export type WeeklyPick = {
  weekStart: number;
  top: RankedCreator[];
  /** Movement vs the previous week's Top 10: positive = moved up, null = new entry. */
  movement: Record<string, number | null>;
};

/** The frozen Top 10 for the week starting at `start`. */
export function weeklyTop(creators: RankInputCreator[], reviews: Review[], start: number): WeeklyPick {
  const top = computeRanking(creators, reviews, start).slice(0, TOP_N);
  const prev = computeRanking(creators, reviews, start - WEEK_MS).slice(0, TOP_N);
  const prevRank = new Map(prev.map((p) => [p.username.toLowerCase(), p.rank]));
  const movement: Record<string, number | null> = {};
  for (const t of top) {
    const before = prevRank.get(t.username.toLowerCase());
    movement[t.username.toLowerCase()] = before === undefined ? null : before - t.rank;
  }
  return { weekStart: start, top, movement };
}

/** Current week's pick plus the previous `count` weeks (newest first). */
export function weeklyHistory(creators: RankInputCreator[], reviews: Review[], now: number, count = 4): WeeklyPick[] {
  const current = weekStart(now);
  return Array.from({ length: count + 1 }, (_, i) => weeklyTop(creators, reviews, current - i * WEEK_MS));
}
