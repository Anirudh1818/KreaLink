/**
 * KreaLink R2 — Firestore sync for engagements between real accounts
 *
 * Engagements that know both owners (brandOwnerUid + creatorOwnerUid) are
 * mirrored to pipelineEngagements/{id} (versions embedded), so the brand and
 * the creator see the same engagement on any device. Demo engagements with
 * seeded creators stay local. firestore.rules restrict each document to its
 * two participants (and admins).
 */

import { collection, doc, onSnapshot, query, setDoc, where, type Unsubscribe } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Engagement, Version } from "./types";
import { getEngagement, importRemoteEngagement } from "./engagementStore";
import { getVersions, importRemoteVersions } from "./versionStore";
import { registerCloudWriter } from "./cloudQueue";

export const PIPELINE_COLLECTION = "pipelineEngagements";

type CloudDoc = Engagement & { versions: Version[] };

/** Firestore rejects undefined; JSON round-trip strips it. */
function clean<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function isShared(e: Engagement | undefined): e is Engagement & { brandOwnerUid: string; creatorOwnerUid: string } {
  return !!e?.brandOwnerUid && !!e?.creatorOwnerUid;
}

/** Push one engagement (with its versions) if it is shared between two accounts. */
async function pushEngagement(engagementId: string) {
  const eng = getEngagement(engagementId);
  if (!isShared(eng)) return;
  const body: CloudDoc = clean({ ...eng, versions: getVersions(engagementId) });
  await setDoc(doc(db, PIPELINE_COLLECTION, engagementId), body).catch((err) => {
    console.warn("Pipeline sync note:", (err as { code?: string }).code ?? err);
  });
}

/**
 * Start syncing for a signed-in member. Returns a stop function.
 * Brands subscribe to engagements they own; creators to ones addressed to them.
 */
export function startPipelineSync(uid: string, role: "brand" | "creator"): Unsubscribe {
  registerCloudWriter((id) => void pushEngagement(id));
  const field = role === "brand" ? "brandOwnerUid" : "creatorOwnerUid";
  const unsub = onSnapshot(
    query(collection(db, PIPELINE_COLLECTION), where(field, "==", uid)),
    (snap) => {
      for (const change of snap.docChanges()) {
        if (change.type === "removed") continue;
        const { versions, ...eng } = change.doc.data() as CloudDoc;
        const local = getEngagement(eng.id);
        if (local && (local.updatedAt ?? 0) > (eng.updatedAt ?? 0)) {
          void pushEngagement(eng.id); // our copy is newer — send it up
          continue;
        }
        importRemoteEngagement(eng);
        importRemoteVersions(eng.id, versions ?? []);
      }
    },
    (err) => console.warn("Pipeline subscription note:", err.code)
  );
  return () => {
    unsub();
    registerCloudWriter(null);
  };
}
