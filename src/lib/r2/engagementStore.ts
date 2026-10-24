/**
 * KreaLink R2 — Engagement Store
 * localStorage-first; Firestore sync attempted as side-effect.
 */

import type { Engagement, EngagementMeta, EngagementStage, EngagementUpdate } from "./types";
import { PIPELINE_STAGES } from "./types";
import { notifyR2Change } from "./events";

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
  notifyR2Change();
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
  const eng: Engagement = {
    id,
    briefId,
    creatorId,
    stage: "shortlisted",
    history: [{ at: now, stage: "shortlisted", by }],
    ...meta,
    createdAt: now,
    updatedAt: now,
  };
  return upsertEngagement(eng);
}

/** Position of a stage on the canonical tracker ("selected" sits with "accepted"). */
export function stageIndex(stage: EngagementStage): number {
  if (stage === "selected") return PIPELINE_STAGES.indexOf("accepted");
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
