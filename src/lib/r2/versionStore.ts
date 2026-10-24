/**
 * KreaLink R2 — Version & Revision Store
 */

import type { Version, FeedbackItem } from "./types";

const LS_KEY = "krealink-versions";

function load(): Version[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Version[]) : [];
  } catch {
    return [];
  }
}

function save(all: Version[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

export function getVersions(engagementId: string): Version[] {
  return load()
    .filter((v) => v.engagementId === engagementId)
    .sort((a, b) => a.n - b.n);
}

export function getLatestVersion(engagementId: string): Version | undefined {
  const vs = getVersions(engagementId);
  return vs[vs.length - 1];
}

export function createVersion(
  engagementId: string,
  changeLog: string,
  mediaUrl?: string,
  requestedBy?: string
): Version {
  const all = load();
  const existing = all.filter((v) => v.engagementId === engagementId);
  const n = existing.length + 1;
  const v: Version = {
    id: `${engagementId}-v${n}`,
    engagementId,
    n,
    status: "in_progress",
    createdAt: Date.now(),
    changeLog,
    requestedBy,
    mediaUrl,
    feedback: [],
  };
  all.push(v);
  save(all);
  return v;
}

export function submitVersion(versionId: string, mediaUrl: string): Version | null {
  const all = load();
  const idx = all.findIndex((v) => v.id === versionId);
  if (idx < 0) return null;
  all[idx] = {
    ...all[idx]!,
    status: "submitted",
    submittedAt: Date.now(),
    mediaUrl,
  };
  save(all);
  return all[idx]!;
}

export function approveVersion(versionId: string): Version | null {
  const all = load();
  const idx = all.findIndex((v) => v.id === versionId);
  if (idx < 0) return null;
  all[idx] = { ...all[idx]!, status: "approved", approvedAt: Date.now() };
  save(all);
  return all[idx]!;
}

export function requestRevision(
  versionId: string,
  feedbackText: string,
  by: FeedbackItem["by"] = "brand"
): Version | null {
  const all = load();
  const idx = all.findIndex((v) => v.id === versionId);
  if (idx < 0) return null;
  const fb: FeedbackItem = {
    id: `fb-${Date.now()}`,
    versionId,
    at: Date.now(),
    by,
    text: feedbackText,
    resolved: false,
  };
  all[idx] = {
    ...all[idx]!,
    status: "requested",
    feedback: [...(all[idx]!.feedback ?? []), fb],
  };
  save(all);
  return all[idx]!;
}
