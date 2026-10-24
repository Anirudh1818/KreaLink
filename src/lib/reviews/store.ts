/**
 * KreaLink — review storage
 *  - Engagements between two real accounts → reviews/{engagementId} in
 *    Firestore (rules: verified brand, approved engagement, one per engagement).
 *  - Demo engagements (seeded creators) → this browser only.
 *  - Sample reviews for seeded creators ship with the app.
 */

import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { notifyR2Change } from "@/lib/r2/events";
import { useR2Revision } from "@/lib/r2/useR2";
import type { Engagement } from "@/lib/r2/types";
import { SAMPLE_REVIEWS } from "./sampleReviews";
import { REVIEW_COMMENT_MAX, isValidRating, type Review, type ReviewRatings } from "./types";

const LS_KEY = "krealink-reviews";
export const REVIEWS_COLLECTION = "reviews";

function loadLocal(): Review[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Review[]) : [];
  } catch {
    return [];
  }
}

function saveLocal(all: Review[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
  notifyR2Change();
}

export function validateReview(ratings: ReviewRatings, comment: string): string | null {
  for (const v of Object.values(ratings)) if (!isValidRating(v)) return "Give every rating 1 to 5 stars.";
  if (comment.trim().length < 10) return "Write at least a sentence (10+ characters) about the work.";
  if (comment.length > REVIEW_COMMENT_MAX) return `Keep the review under ${REVIEW_COMMENT_MAX} characters.`;
  return null;
}

/** Engagements between two real accounts store reviews on the platform. */
export function isShared(eng: Engagement): boolean {
  return !!eng.brandOwnerUid && !!eng.creatorOwnerUid;
}

/**
 * Submit the brand's review of an approved engagement.
 * Shared engagements go to Firestore (server-validated); demo ones stay local.
 */
export async function submitReview(eng: Engagement, ratings: ReviewRatings, comment: string, brandName: string): Promise<void> {
  if (eng.stage !== "accepted_final") throw new Error("You can review a creator once you've approved the final delivery.");
  const problem = validateReview(ratings, comment);
  if (problem) throw new Error(problem);
  const base = {
    engagementId: eng.id,
    creatorUsername: eng.creatorId,
    brandName: brandName.slice(0, 120),
    campaignTitle: (eng.campaignTitle ?? eng.briefId).slice(0, 160),
    comment: comment.trim(),
    ...ratings,
  };
  if (isShared(eng)) {
    await setDoc(doc(db, REVIEWS_COLLECTION, eng.id), { ...base, brandOwnerUid: eng.brandOwnerUid, createdAt: serverTimestamp() });
    return;
  }
  const local = loadLocal().filter((r) => r.id !== eng.id);
  saveLocal([...local, { ...base, id: eng.id, createdAt: Date.now(), source: "local" }]);
}

/** Admin moderation: delete a platform review with an audit entry (rules require both). */
export async function removeReview(adminUid: string, review: Review, reason: string): Promise<void> {
  if (review.source !== "platform") {
    saveLocal(loadLocal().filter((r) => r.id !== review.id));
    return;
  }
  const batch = writeBatch(db);
  batch.set(doc(db, "auditLogs", `review-remove-${review.id}`), {
    action: "review.remove",
    actorUid: adminUid,
    targetUid: review.id,
    reason: reason.trim().slice(0, 1000),
    at: serverTimestamp(),
  });
  batch.delete(doc(db, REVIEWS_COLLECTION, review.id));
  await batch.commit();
}

function toMillis(t: unknown): number {
  if (t && typeof t === "object" && "toMillis" in t && typeof (t as { toMillis: unknown }).toMillis === "function") {
    return (t as { toMillis: () => number }).toMillis();
  }
  return typeof t === "number" ? t : Date.now();
}

/** Every review visible to this visitor: platform + this browser + samples (deduped by id). */
export function useAllReviews(): { reviews: Review[]; loading: boolean } {
  const rev = useR2Revision();
  const [platform, setPlatform] = useState<Review[] | null>(null);

  useEffect(
    () =>
      onSnapshot(
        collection(db, REVIEWS_COLLECTION),
        (snap) =>
          setPlatform(
            snap.docs.map((d) => {
              const x = d.data();
              return {
                id: d.id,
                engagementId: String(x.engagementId ?? d.id),
                creatorUsername: String(x.creatorUsername ?? ""),
                brandName: String(x.brandName ?? "Brand"),
                brandOwnerUid: x.brandOwnerUid as string | undefined,
                campaignTitle: String(x.campaignTitle ?? ""),
                comment: String(x.comment ?? ""),
                rating: Number(x.rating),
                quality: Number(x.quality),
                communication: Number(x.communication),
                timeliness: Number(x.timeliness),
                createdAt: toMillis(x.createdAt),
                source: "platform" as const,
              };
            })
          ),
        () => setPlatform([])
      ),
    []
  );

  const reviews = useMemo(() => {
    const byId = new Map<string, Review>();
    for (const r of SAMPLE_REVIEWS) byId.set(r.id, r);
    for (const r of rev ? loadLocal() : []) byId.set(r.id, r);
    for (const r of platform ?? []) if (r.creatorUsername && isValidRating(r.rating)) byId.set(r.id, r);
    return [...byId.values()];
  }, [rev, platform]);

  return { reviews, loading: platform === null };
}
