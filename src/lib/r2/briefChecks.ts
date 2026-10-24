/**
 * KreaLink R2 — brief sanity checks
 * Detects requirements that contradict each other, so matching can say so
 * instead of silently ranking against an impossible brief.
 */

import type { CreativeBrief } from "@/lib/types";
import { deliverySpecsForBrief } from "./deliveryCheck";

const VERTICAL_PLATFORMS = /\b(reels?|tiktok|shorts|stories)\b/i;
const LANDSCAPE_PLATFORMS = /\b(youtube(?!\s*shorts)|tv|broadcast|cinema|web video|ctv)\b/i;
const PAID_USE = /\b(paid|ads?|advertis\w*|sponsored|commercial)\b/i;

export function detectBriefConflicts(brief: CreativeBrief): string[] {
  const out: string[] = [];
  const ratio = deliverySpecsForBrief(brief).aspectRatio;
  const platform = brief.platform ?? "";
  const text = `${brief.requirements} ${brief.notes ?? ""} ${brief.deliverables.join(" ")}`;

  if (ratio === "16:9" && VERTICAL_PLATFORMS.test(platform) && !LANDSCAPE_PLATFORMS.test(platform)) {
    out.push(`The brief asks for 16:9 landscape, but ${platform} is a vertical (9:16) placement.`);
  }
  if (ratio === "9:16" && LANDSCAPE_PLATFORMS.test(platform) && !VERTICAL_PLATFORMS.test(platform)) {
    out.push(`The brief asks for 9:16 vertical, but ${platform} is usually landscape (16:9).`);
  }
  const otherRatio = text.match(/\b(16:9|9:16|1:1|4:5)\b/);
  if (otherRatio && otherRatio[1] !== ratio) {
    out.push(`Deliverables mention ${otherRatio[1]} while the brief format is ${ratio}.`);
  }
  if (!brief.commercialUse && PAID_USE.test(text)) {
    out.push("The brief describes paid or commercial use but does not require commercial rights.");
  }
  const dur = deliverySpecsForBrief(brief).durationSec;
  if (dur && dur > 90 && VERTICAL_PLATFORMS.test(platform)) {
    out.push(`A ${dur}s deliverable is longer than typical Reels/TikTok placements (≤90s).`);
  }
  return out;
}
