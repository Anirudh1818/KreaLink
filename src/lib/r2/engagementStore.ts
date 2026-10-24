/**
 * KreaLink R2 — Engagement Store
 * localStorage-first; Firestore sync attempted as side-effect.
 */

import type { Engagement, EngagementStage, EngagementUpdate } from "./types";

const LS_KEY = "krealink-engagements";

function load(): Engagement[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Engagement[]) : [];
  } catch {
    return [];
  }
}

function save(all: Engagement[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
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
  return load().filter((e) => e.creatorId === creatorId);
}

export function upsertEngagement(eng: Engagement): Engagement {
  const all = load();
  const idx = all.findIndex((e) => e.id === eng.id);
  if (idx >= 0) {
    all[idx] = { ...eng, updatedAt: Date.now() };
  } else {
    all.push(eng);
  }
  save(all);
  return eng;
}

export function advanceStage(
  engId: string,
  stage: EngagementStage,
  note?: string,
  by: EngagementUpdate["by"] = "brand"
): Engagement | null {
  const all = load();
  const idx = all.findIndex((e) => e.id === engId);
  if (idx < 0) return null;
  const update: EngagementUpdate = { at: Date.now(), stage, note, by };
  all[idx] = {
    ...all[idx]!,
    stage,
    history: [...(all[idx]!.history ?? []), update],
    updatedAt: Date.now(),
  };
  save(all);
  return all[idx]!;
}

/** Create an engagement if it doesn't exist yet (shortlisting). */
export function shortlistCreator(briefId: string, creatorId: string): Engagement {
  const id = `${briefId}-${creatorId}`;
  const existing = getEngagement(id);
  if (existing) return existing;
  const now = Date.now();
  const eng: Engagement = {
    id,
    briefId,
    creatorId,
    stage: "shortlisted",
    history: [{ at: now, stage: "shortlisted", by: "system" }],
    createdAt: now,
    updatedAt: now,
  };
  return upsertEngagement(eng);
}

export function contactCreator(engId: string): Engagement | null {
  return advanceStage(engId, "contacted", "Brand initiated contact", "brand");
}

export function creatorRespond(
  engId: string,
  accept: boolean
): Engagement | null {
  return advanceStage(
    engId,
    accept ? "accepted" : "declined",
    accept ? "Creator accepted the invitation" : "Creator declined the invitation",
    "creator"
  );
}

export function selectCreator(engId: string, scope: string, timeline: string): Engagement | null {
  const all = load();
  const idx = all.findIndex((e) => e.id === engId);
  if (idx < 0) return null;
  const update: EngagementUpdate = {
    at: Date.now(),
    stage: "selected",
    note: `Scope: ${scope}. Timeline: ${timeline}`,
    by: "brand",
  };
  all[idx] = {
    ...all[idx]!,
    stage: "selected",
    scope,
    timeline,
    history: [...(all[idx]!.history ?? []), update],
    updatedAt: Date.now(),
  };
  save(all);
  return all[idx]!;
}
