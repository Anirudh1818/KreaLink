/**
 * KreaLink — creator reviews
 * A review is written by the brand after it approves the final delivery of an
 * engagement (one review per engagement). Reviews are immutable; admins may
 * remove one (audited) for moderation.
 */

export type ReviewRatings = {
  rating: number;        // overall, 1–5
  quality: number;       // quality of the work, 1–5
  communication: number; // 1–5
  timeliness: number;    // delivered on time, 1–5
};

export type Review = ReviewRatings & {
  id: string;            // = engagementId (one review per engagement)
  engagementId: string;
  creatorUsername: string;
  brandName: string;
  brandOwnerUid?: string;
  campaignTitle: string;
  comment: string;
  createdAt: number;     // epoch ms
  source: "platform" | "local" | "sample"; // where it came from (shown in UI)
};

export const RATING_KEYS: (keyof ReviewRatings)[] = ["rating", "quality", "communication", "timeliness"];

export const RATING_LABEL: Record<keyof ReviewRatings, string> = {
  rating: "Overall",
  quality: "Quality of work",
  communication: "Communication",
  timeliness: "On-time delivery",
};

export const REVIEW_COMMENT_MAX = 1000;

export function isValidRating(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 5;
}
