/**
 * Sample reviews for the seeded demo creators, so the leaderboard and profiles
 * have data before real engagements complete. Always labelled "Sample review"
 * in the UI (source: "sample").
 */

import type { Review } from "./types";

type Seed = [creator: string, brand: string, campaign: string, date: string, r: number, q: number, c: number, t: number, comment: string];

const SEEDS: Seed[] = [
  ["paultrillo", "Apex Athletics", "Gen-Z Running Shoe Launch", "2026-06-12", 5, 5, 4, 5, "Cinematic, energetic and on brief from v1. Clean licensing paperwork."],
  ["paultrillo", "Lumen Audio", "Wireless Buds Teaser", "2026-08-03", 5, 5, 5, 4, "Exceptional motion design; one revision round and done."],
  ["paultrillo", "Northwind Coffee", "Cold Brew Summer Reel", "2026-09-18", 4, 5, 4, 4, "Beautiful work, slightly slower on the second revision."],
  ["paultrillo", "GlowCo", "Vitamin C Serum Launch", "2026-10-09", 5, 5, 5, 5, "Best AI film partner we've worked with."],
  ["juliewieland", "Maison Verre", "Autumn Editorial", "2026-05-21", 5, 5, 5, 5, "Editorial quality that matched our print campaign."],
  ["juliewieland", "GlowCo", "Holiday Gift Sets", "2026-07-30", 5, 4, 5, 5, "Fast, communicative and precise with brand colours."],
  ["juliewieland", "Ardent Travel", "Monsoon Getaways", "2026-09-05", 4, 4, 5, 4, "Great storytelling; needed a tweak on aspect ratio."],
  ["juliewieland", "Velvet Studio", "Lookbook Reels", "2026-10-14", 5, 5, 5, 5, "Delivered early and exceeded the brief."],
  ["juliewieland", "Apex Athletics", "Techwear Rain Film", "2026-10-20", 5, 5, 4, 5, "Moody, premium, exactly what we wanted."],
  ["kylekesterson", "Orbit Labs", "Product Explainer", "2026-04-10", 4, 4, 4, 3, "Strong 3D product shots; timeline slipped a few days."],
  ["kylekesterson", "Northwind Coffee", "Bean Origin Story", "2026-07-08", 4, 5, 3, 4, "Gorgeous visuals, slower replies."],
  ["kylekesterson", "Lumen Audio", "Studio Monitor Launch", "2026-09-27", 5, 5, 4, 4, "Technically excellent product visualisation."],
  ["kavancardoza", "Ardent Travel", "Surreal Destinations", "2026-06-02", 4, 5, 4, 4, "Very creative concepts; brief needed tightening."],
  ["kavancardoza", "Velvet Studio", "Dreamscape Campaign", "2026-08-22", 5, 5, 4, 5, "Stunning surreal work, delivered on time."],
  ["kavancardoza", "Orbit Labs", "VFX Teaser", "2026-10-02", 4, 4, 4, 4, "Solid VFX, good collaboration."],
  ["digitaldavincis", "Maison Verre", "Brand Film", "2026-03-15", 4, 4, 5, 4, "Reliable studio, polished commercial output."],
  ["digitaldavincis", "Apex Athletics", "Social Ads Cutdowns", "2026-07-19", 4, 4, 4, 5, "Quick turnaround on many cutdowns."],
  ["digitaldavincis", "GlowCo", "Skincare UGC Set", "2026-09-30", 3, 3, 4, 4, "Fine overall; colour grade needed two revisions."],
  ["nicolasneubert", "Orbit Labs", "Sci-Fi Worldbuild", "2026-05-05", 5, 5, 3, 3, "Incredible worlds; regional licence limited our usage."],
  ["nicolasneubert", "Lumen Audio", "Concept Trailer", "2026-08-28", 4, 5, 3, 4, "Amazing art direction, communication could improve."],
];

/** Fixed dates so every week's Top 10 is reproducible. 12:00 IST on each date. */
export const SAMPLE_REVIEWS: Review[] = SEEDS.map(([creator, brand, campaign, date, rating, quality, communication, timeliness, comment], i) => ({
  id: `sample-${i + 1}`,
  engagementId: `sample-${i + 1}`,
  creatorUsername: creator,
  brandName: brand,
  campaignTitle: campaign,
  createdAt: Date.parse(`${date}T12:00:00+05:30`),
  rating,
  quality,
  communication,
  timeliness,
  comment,
  source: "sample",
}));
