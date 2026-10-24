/**
 * KreaLink — job board (published briefs) and creator applications
 *
 *  - Jobs are briefs with status "Published": real ones from Firestore plus
 *    the two bundled demo briefs (labelled "Demo job").
 *  - A creator with a published profile applies to a real job →
 *    applications/{briefId}_{creatorUid} (rules: one per creator per job,
 *    addressed to the brand that posted it). Demo jobs keep applications in
 *    this browser so the flow can be shown without accounts.
 *  - The posting brand shortlists (→ shared pipeline engagement) or declines.
 */

import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEMO_BRIEFS } from "@/lib/demoData";
import type { CreativeBrief } from "@/lib/types";
import { notifyR2Change } from "@/lib/r2/events";
import { useR2Revision } from "@/lib/r2/useR2";
import { shortlistCreator } from "@/lib/r2/engagementStore";

export type Job = CreativeBrief & { id: string; source: "platform" | "demo"; postedAt: number };

export type ApplicationStatus = "applied" | "shortlisted" | "declined" | "withdrawn";

export type JobApplication = {
  id: string;               // `${briefId}_${creatorUid}` (or local id)
  briefId: string;
  briefTitle: string;
  brandOwnerUid: string;
  creatorUid: string;
  creatorUsername: string;
  creatorName: string;
  pitch: string;
  status: ApplicationStatus;
  createdAt: number;
  source: "platform" | "local";
};

const LS_KEY = "krealink-applications";
export const PITCH_MIN = 10;
export const PITCH_MAX = 1000;

function toMillis(t: unknown): number {
  if (t && typeof t === "object" && "toMillis" in t && typeof (t as { toMillis: unknown }).toMillis === "function") {
    return (t as { toMillis: () => number }).toMillis();
  }
  return typeof t === "number" ? t : Date.now();
}

function loadLocal(): JobApplication[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as JobApplication[]) : [];
  } catch {
    return [];
  }
}

function saveLocal(all: JobApplication[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
  notifyR2Change();
}

/* ------------------------------------------------------------------ */
/* Jobs                                                                */
/* ------------------------------------------------------------------ */

/** Published jobs: real briefs (newest first) followed by the demo briefs. */
export function useOpenJobs(): { jobs: Job[]; loading: boolean } {
  const [platform, setPlatform] = useState<Job[] | null>(null);
  useEffect(
    () =>
      onSnapshot(
        query(collection(db, "briefs"), where("status", "==", "Published")),
        (snap) =>
          setPlatform(
            snap.docs
              .map((d) => {
                const x = d.data() as CreativeBrief;
                return { ...x, id: d.id, source: "platform" as const, postedAt: toMillis(x.createdAt) };
              })
              .filter((j) => j.campaignName && j.ownerUid)
              .sort((a, b) => b.postedAt - a.postedAt)
          ),
        () => setPlatform([])
      ),
    []
  );
  const jobs = useMemo(() => {
    const demo: Job[] = DEMO_BRIEFS.filter((b) => b.id).map((b) => ({ ...b, id: b.id!, source: "demo", postedAt: 0 }));
    const real = platform ?? [];
    const realIds = new Set(real.map((j) => j.id));
    return [...real, ...demo.filter((d) => !realIds.has(d.id))];
  }, [platform]);
  return { jobs, loading: platform === null };
}

/* ------------------------------------------------------------------ */
/* Applications                                                        */
/* ------------------------------------------------------------------ */

function mapApp(id: string, x: Record<string, unknown>): JobApplication {
  return {
    id,
    briefId: String(x.briefId ?? ""),
    briefTitle: String(x.briefTitle ?? ""),
    brandOwnerUid: String(x.brandOwnerUid ?? ""),
    creatorUid: String(x.creatorUid ?? ""),
    creatorUsername: String(x.creatorUsername ?? ""),
    creatorName: String(x.creatorName ?? ""),
    pitch: String(x.pitch ?? ""),
    status: (x.status as ApplicationStatus) ?? "applied",
    createdAt: toMillis(x.createdAt),
    source: "platform",
  };
}

/** Applications visible to this user: their platform ones (by role) + this browser's demo ones. */
export function useApplications(filter: { field: "creatorUid" | "brandOwnerUid"; uid: string | null }): JobApplication[] {
  const rev = useR2Revision();
  const [platform, setPlatform] = useState<{ key: string; rows: JobApplication[] }>({ key: "", rows: [] });
  const key = filter.uid ? `${filter.field}:${filter.uid}` : "";

  useEffect(() => {
    if (!filter.uid) return;
    const k = `${filter.field}:${filter.uid}`;
    return onSnapshot(
      query(collection(db, "applications"), where(filter.field, "==", filter.uid)),
      (snap) => setPlatform({ key: k, rows: snap.docs.map((d) => mapApp(d.id, d.data())) }),
      () => setPlatform({ key: k, rows: [] })
    );
  }, [filter.field, filter.uid]);

  return useMemo(() => {
    const local = rev ? loadLocal() : [];
    const mine = platform.key === key ? platform.rows : [];
    const localMatches = filter.uid ? local.filter((a) => a[filter.field] === filter.uid) : local;
    const byId = new Map<string, JobApplication>();
    for (const a of [...localMatches, ...mine]) byId.set(a.id, a);
    return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
  }, [rev, platform, key, filter.field, filter.uid]);
}

export function validatePitch(pitch: string): string | null {
  const t = pitch.trim();
  if (t.length < PITCH_MIN) return `Write a short pitch (at least ${PITCH_MIN} characters).`;
  if (t.length > PITCH_MAX) return `Keep the pitch under ${PITCH_MAX} characters.`;
  return null;
}

/** Creator applies to a job. Real jobs → Firestore; demo jobs → this browser. */
export async function applyToJob(params: {
  job: Job;
  creatorUid: string;
  creatorUsername: string;
  creatorName: string;
  pitch: string;
}): Promise<void> {
  const { job, creatorUid, creatorUsername, creatorName, pitch } = params;
  const problem = validatePitch(pitch);
  if (problem) throw new Error(problem);
  const base = {
    briefId: job.id,
    briefTitle: job.campaignName.slice(0, 160),
    brandOwnerUid: job.ownerUid ?? "demo-brand",
    creatorUid,
    creatorUsername,
    creatorName: creatorName.slice(0, 120) || creatorUsername,
    pitch: pitch.trim(),
    status: "applied" as const,
  };
  if (job.source === "platform") {
    await setDoc(doc(db, "applications", `${job.id}_${creatorUid}`), {
      ...base,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return;
  }
  const id = `${job.id}_${creatorUid}`;
  saveLocal([...loadLocal().filter((a) => a.id !== id), { ...base, id, createdAt: Date.now(), source: "local" }]);
}

/**
 * Brand decision. Shortlisting also opens a pipeline engagement; for real
 * accounts it carries both owner ids, so it syncs to the creator's studio.
 */
export async function decideApplication(
  app: JobApplication,
  status: "shortlisted" | "declined",
  ctx: { brief?: CreativeBrief; brandUid?: string; brandName?: string }
): Promise<void> {
  if (app.source === "platform") {
    await updateDoc(doc(db, "applications", app.id), { status, updatedAt: serverTimestamp() });
  } else {
    saveLocal(loadLocal().map((a) => (a.id === app.id ? { ...a, status } : a)));
  }
  if (status === "shortlisted") {
    shortlistCreator(
      app.briefId,
      app.creatorUsername,
      {
        campaignTitle: app.briefTitle,
        brandName: ctx.brandName,
        brief: ctx.brief,
        ...(app.source === "platform" && ctx.brandUid ? { brandOwnerUid: ctx.brandUid, creatorOwnerUid: app.creatorUid } : {}),
      },
      "brand"
    );
  }
}

export async function withdrawApplication(app: JobApplication): Promise<void> {
  if (app.source === "platform") {
    await updateDoc(doc(db, "applications", app.id), { status: "withdrawn", updatedAt: serverTimestamp() });
  } else {
    saveLocal(loadLocal().map((a) => (a.id === app.id ? { ...a, status: "withdrawn" } : a)));
  }
}
