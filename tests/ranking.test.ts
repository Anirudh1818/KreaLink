/**
 * KreaLink — creator ranking & weekly Top 10
 * Run: npm run test:unit
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DAY_MS,
  TOP_N,
  WEEK_MS,
  computeRanking,
  nextPickAt,
  weekStart,
  weeklyHistory,
  weeklyTop,
  type RankInputCreator,
} from "../src/lib/reviews/ranking";
import { SAMPLE_REVIEWS } from "../src/lib/reviews/sampleReviews";
import type { Review } from "../src/lib/reviews/types";

const IST = (iso: string) => Date.parse(`${iso}+05:30`);

function creator(username: string, extra: Partial<RankInputCreator> = {}): RankInputCreator {
  return { username, name: username, specialization: "AI Film", portfolioCount: 3, verified: false, ...extra };
}

let n = 0;
function review(creatorUsername: string, rating: number, at: number, sub = rating): Review {
  n += 1;
  return {
    id: `r${n}`, engagementId: `e${n}`, creatorUsername, brandName: "B", campaignTitle: "C", comment: "Good work overall.",
    rating, quality: sub, communication: sub, timeliness: sub, createdAt: at, source: "platform",
  };
}

describe("weekly boundaries (Monday 00:00 IST)", () => {
  it("snaps any moment to the Monday 00:00 IST that starts its week", () => {
    const monday = IST("2026-10-19T00:00:00"); // Monday
    assert.equal(weekStart(IST("2026-10-24T20:00:00")), monday); // Saturday
    assert.equal(weekStart(monday), monday);
    assert.equal(weekStart(monday - 1), monday - WEEK_MS); // Sunday 23:59:59.999
    assert.equal(new Date(monday).getUTCDay(), 0); // = Sunday 18:30 UTC
    assert.equal(nextPickAt(IST("2026-10-24T20:00:00")), IST("2026-10-26T00:00:00"));
  });
});

describe("score", () => {
  it("is bounded 0–100 and explained by its breakdown", () => {
    const ranked = computeRanking([creator("a", { verified: true, portfolioCount: 10 })], Array.from({ length: 30 }, (_, i) => review("a", 5, 1000 + i)), 10_000);
    const r = ranked[0]!;
    const sum = Object.values(r.breakdown).reduce((s, v) => s + v, 0);
    assert.ok(r.score <= 100 && r.score > 0);
    assert.ok(Math.abs(sum - r.score) < 0.15);
  });

  it("a single 5★ review cannot beat a long consistent record (Bayesian)", () => {
    const now = IST("2026-10-24T12:00:00");
    const reviews = [review("lucky", 5, now - DAY_MS * 100), ...Array.from({ length: 12 }, (_, i) => review("steady", 5, now - DAY_MS * (100 + i), 5)).map((r, i) => ({ ...r, rating: i % 4 === 0 ? 4 : 5 }))];
    const ranked = computeRanking([creator("lucky"), creator("steady")], reviews, now);
    assert.equal(ranked[0]!.username, "steady");
    assert.equal(ranked.find((r) => r.username === "lucky")!.avgRating, 5);
  });

  it("creators without reviews are not ranked", () => {
    const ranked = computeRanking([creator("x"), creator("y")], [review("x", 4, 1)], 10);
    assert.deepEqual(ranked.map((r) => r.username), ["x"]);
  });

  it("ties break deterministically", () => {
    const reviews = [review("bbb", 4, 1), review("aaa", 4, 1)];
    const a = computeRanking([creator("bbb"), creator("aaa")], reviews, 10).map((r) => r.username);
    const b = computeRanking([creator("aaa"), creator("bbb")], [...reviews].reverse(), 10).map((r) => r.username);
    assert.deepEqual(a, ["aaa", "bbb"]);
    assert.deepEqual(a, b);
  });

  it("momentum rewards recent reviews", () => {
    const cutoff = IST("2026-10-19T00:00:00");
    const ranked = computeRanking(
      [creator("recent"), creator("old")],
      [review("recent", 4, cutoff - DAY_MS * 2), review("old", 4, cutoff - DAY_MS * 200)],
      cutoff
    );
    assert.ok(ranked.find((r) => r.username === "recent")!.breakdown.momentum > 0);
    assert.equal(ranked.find((r) => r.username === "old")!.breakdown.momentum, 0);
    assert.equal(ranked[0]!.username, "recent");
  });
});

describe("weekly Top 10", () => {
  const start = IST("2026-10-19T00:00:00");

  it("is frozen: reviews posted during the week don't change this week's pick", () => {
    const creators = [creator("a"), creator("b")];
    const before = [review("a", 5, start - DAY_MS), review("b", 3, start - DAY_MS)];
    const midWeek = [...before, ...Array.from({ length: 10 }, (_, i) => review("b", 5, start + DAY_MS + i))];
    assert.deepEqual(weeklyTop(creators, before, start).top.map((t) => t.username), ["a", "b"]);
    assert.deepEqual(weeklyTop(creators, midWeek, start).top.map((t) => t.username), ["a", "b"]);
    // …but they count for next week's pick.
    assert.equal(weeklyTop(creators, midWeek, start + WEEK_MS).top[0]!.username, "b");
  });

  it("picks at most 10 and reports movement vs last week", () => {
    const creators = Array.from({ length: 14 }, (_, i) => creator(`c${String(i).padStart(2, "0")}`));
    const reviews = creators.map((c, i) => review(c.username, 1 + (i % 5), start - WEEK_MS - DAY_MS));
    reviews.push(...Array.from({ length: 8 }, (_, i) => review("c00", 5, start - DAY_MS - i)));
    const pick = weeklyTop(creators, reviews, start);
    assert.equal(pick.top.length, TOP_N);
    // c00 (one 1★ last week) was outside last week's Top 10; after eight 5★ it's #1 and marked NEW.
    assert.equal(pick.top[0]!.username, "c00");
    assert.equal(pick.movement["c00"], null);
    // Creators present both weeks get a numeric movement.
    assert.ok(pick.top.slice(1).some((t) => typeof pick.movement[t.username] === "number"));
  });

  it("history returns the current week first, one entry per 7 days", () => {
    const h = weeklyHistory([creator("a")], [review("a", 5, start - WEEK_MS * 3)], start + DAY_MS, 4);
    assert.equal(h.length, 5);
    assert.equal(h[0]!.weekStart, start);
    assert.ok(h.every((w, i) => i === 0 || h[i - 1]!.weekStart - w.weekStart === WEEK_MS));
  });

  it("sample reviews produce a real ranking for the demo creators", () => {
    const demo = ["paultrillo", "nicolasneubert", "juliewieland", "kavancardoza", "kylekesterson", "digitaldavincis"].map((u) => creator(u));
    const pick = weeklyTop(demo, SAMPLE_REVIEWS, IST("2026-10-26T00:00:00"));
    assert.equal(pick.top.length, 6);
    assert.ok(SAMPLE_REVIEWS.every((r) => r.source === "sample" && r.rating >= 1 && r.rating <= 5));
  });
});
