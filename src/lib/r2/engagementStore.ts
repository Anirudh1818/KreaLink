/**
 * KreaLink R2 — Engagement Store
 * localStorage is the working copy (works for demo visitors). For engagements
 * between two real accounts, every change is also queued for Firestore and
 * remote changes are merged back in (see firestoreSync.ts).
 */

import type {
  AgreedLicense,
  Engagement,
  EngagementMeta,
  EngagementStage,
  EngagementUpdate,
  ProgressUpdate,
} from "./types";
import { PIPELINE_STAGES } from "./types";
import { notifyR2Change } from "./events";
import { queueCloudWrite } from "./cloudQueue";

const LS_KEY = "krealink-engagements";

function load(): Engagement[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Engagement[]) : [];
  } catch {
    return [];
  }
}

function save(all: Engagement[], changedId?: string) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
  notifyR2Change();
  if (changedId) queueCloudWrite(changedId);
}

/** Apply a change to one engagement and persist it. */
function mutate(engId: string, fn: (e: Engagement) => Engagement): Engagement | null {
  const all = load();
  const idx = all.findIndex((e) => e.id === engId);
  if (idx < 0) return null;
  all[idx] = { ...fn(all[idx]!), updatedAt: Date.now() };
  save(all, engId);
  return all[idx]!;
}

export function getAllEngagements(): Engagement[] {
  return load();
}

export function getEngagement(id: string): Engagement | undefined {
  return load().find((e) => e.id === id);
}

export function getEngagementsForBrief(briefId: string): Engagement[] {
  return load().filter((e) => e.briefId === briefId);
}

export function getEngagementsForCreator(creatorId: string): Engagement[] {
  const id = creatorId.toLowerCase();
  return load().filter((e) => e.creatorId.toLowerCase() === id);
}

export function upsertEngagement(eng: Engagement): Engagement {
  const all = load();
  const idx = all.findIndex((e) => e.id === eng.id);
  if (idx >= 0) {
    all[idx] = { ...eng, updatedAt: Date.now() };
  } else {
    all.push(eng);
  }
  save(all, eng.id);
  return eng;
}

/** Merge a record received from Firestore (newer wins; never re-queued). */
export function importRemoteEngagement(remote: Engagement): void {
  const all = load();
  const idx = all.findIndex((e) => e.id === remote.id);
  if (idx >= 0 && (all[idx]!.updatedAt ?? 0) > (remote.updatedAt ?? 0)) return;
  if (idx >= 0) all[idx] = remote;
  else all.push(remote);
  save(all);
}

export function advanceStage(
  engId: string,
  stage: EngagementStage,
  note?: string,
  by: EngagementUpdate["by"] = "brand"
): Engagement | null {
  const update: EngagementUpdate = { at: Date.now(), stage, note, by };
  return mutate(engId, (e) => ({ ...e, stage, history: [...(e.history ?? []), update] }));
}

/** Create an engagement if it doesn't exist yet (shortlisting). */
export function shortlistCreator(
  briefId: string,
  creatorId: string,
  meta: EngagementMeta = {},
  by: EngagementUpdate["by"] = "system"
): Engagement {
  const id = `${briefId}-${creatorId}`;
  const existing = getEngagement(id);
  if (existing) return existing;
  const now = Date.now();
  // Drop undefined owner ids so demo records stay local-only.
  const cleanMeta = Object.fromEntries(Object.entries(meta).filter(([, v]) => v !== undefined)) as EngagementMeta;
  const eng: Engagement = {
    id,
    briefId,
    creatorId,
    stage: "shortlisted",
    history: [{ at: now, stage: "shortlisted", by }],
    ...cleanMeta,
    createdAt: now,
    updatedAt: now,
  };
  return upsertEngagement(eng);
}

/** Position of a stage on the canonical tracker. */
export function stageIndex(stage: EngagementStage): number {
  return PIPELINE_STAGES.indexOf(stage);
}

/** Move one step forward (+1) or back (-1) along PIPELINE_STAGES. */
export function stepStage(
  engId: string,
  dir: 1 | -1,
  by: EngagementUpdate["by"] = "brand"
): Engagement | null {
  const eng = getEngagement(engId);
  if (!eng) return null;
  const next = PIPELINE_STAGES[stageIndex(eng.stage) + dir];
  if (!next) return eng;
  return advanceStage(engId, next, dir === 1 ? "Advanced manually" : "Moved back manually", by);
}

export function contactCreator(engId: string): Engagement | null {
  return advanceStage(engId, "contacted", "Brand initiated contact", "brand");
}

export function creatorRespond(engId: string, accept: boolean): Engagement | null {
  return advanceStage(
    engId,
    accept ? "accepted" : "declined",
    accept ? "Creator accepted the invitation" : "Creator declined the invitation",
    "creator"
  );
}

/**
 * Selection: the brand picks this creator and confirms scope, timeline,
 * requirements and the licensing terms that travel with the engagement.
 */
export function selectCreator(
  engId: string,
  terms: { scope: string; timeline: string; requirements: string; agreedLicense: AgreedLicense }
): Engagement | null {
  const update: EngagementUpdate = {
    at: Date.now(),
    stage: "selected",
    note: `Selected. Scope: ${terms.scope}. Timeline: ${terms.timeline}.`,
    by: "brand",
  };
  return mutate(engId, (e) => ({
    ...e,
    stage: "selected",
    scope: terms.scope,
    timeline: terms.timeline,
    requirements: terms.requirements,
    agreedLicense: terms.agreedLicense,
    history: [...(e.history ?? []), update],
  }));
}

/** Production status update posted by the creator (visible to the brand). */
export function addProgressUpdate(
  engId: string,
  note: string,
  percent?: number,
  by: ProgressUpdate["by"] = "creator"
): Engagement | null {
  const entry: ProgressUpdate = {
    at: Date.now(),
    by,
    note: note.trim().slice(0, 500),
    ...(percent !== undefined && Number.isFinite(percent) ? { percent: Math.max(0, Math.min(100, Math.round(percent))) } : {}),
  };
  return mutate(engId, (e) => ({ ...e, progress: [...(e.progress ?? []), entry] }));
}
