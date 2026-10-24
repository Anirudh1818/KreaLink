/**
 * KreaLink R2 — Version & Revision Store
 * Each version records who made it and, for revision rounds, which brand
 * feedback (and requester) it answers. Round status:
 *   requested → in_progress → submitted → approved
 */

import type { Version, FeedbackItem, MediaMeta } from "./types";
import { notifyR2Change } from "./events";
import { queueCloudWrite } from "./cloudQueue";

const LS_KEY = "krealink-versions";

function load(): Version[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Version[]) : [];
  } catch {
    return [];
  }
}

function save(all: Version[], engagementId?: string) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
  notifyR2Change();
  if (engagementId) queueCloudWrite(engagementId);
}

function mutate(versionId: string, fn: (v: Version) => Version): Version | null {
  const all = load();
  const idx = all.findIndex((v) => v.id === versionId);
  if (idx < 0) return null;
  all[idx] = fn(all[idx]!);
  save(all, all[idx]!.engagementId);
  return all[idx]!;
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

/** Replace an engagement's versions with the copy received from Firestore. */
export function importRemoteVersions(engagementId: string, versions: Version[]): void {
  const others = load().filter((v) => v.engagementId !== engagementId);
  save([...others, ...versions]);
}

/** The most recent unresolved brand feedback, if a revision was requested. */
export function openRevisionRequest(engagementId: string): Version["respondsTo"] | undefined {
  const requested = [...getVersions(engagementId)].reverse().find((v) => v.status === "requested");
  const fb = requested?.feedback[requested.feedback.length - 1];
  if (!requested || !fb) return undefined;
  return { versionN: requested.n, feedback: fb.text, requestedBy: fb.authorName ?? "Brand", requestedAt: fb.at };
}

export function createVersion(
  engagementId: string,
  changeLog: string,
  mediaUrl?: string,
  requestedBy?: string,
  opts: { submittedBy?: string; respondsTo?: Version["respondsTo"] } = {}
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
    ...(requestedBy ? { requestedBy } : {}),
    ...(mediaUrl ? { mediaUrl } : {}),
    ...(opts.submittedBy ? { submittedBy: opts.submittedBy } : {}),
    ...(opts.respondsTo ? { respondsTo: opts.respondsTo, requestedBy: opts.respondsTo.requestedBy } : {}),
    feedback: [],
  };
  all.push(v);
  save(all, engagementId);
  return v;
}

/** Creator starts working on the next revision round (status: in progress). */
export function startRevision(engagementId: string, submittedBy: string): Version {
  const draft = getVersions(engagementId).find((v) => v.status === "in_progress");
  if (draft) return draft;
  const respondsTo = openRevisionRequest(engagementId);
  return createVersion(engagementId, "Revision in progress", undefined, undefined, { submittedBy, respondsTo });
}

export function submitVersion(
  versionId: string,
  mediaUrl: string,
  mediaMeta?: MediaMeta,
  changeLog?: string
): Version | null {
  return mutate(versionId, (v) => ({
    ...v,
    status: "submitted",
    submittedAt: Date.now(),
    mediaUrl,
    ...(mediaMeta ? { mediaMeta } : {}),
    ...(changeLog ? { changeLog } : {}),
  }));
}

export function approveVersion(versionId: string): Version | null {
  return mutate(versionId, (v) => ({ ...v, status: "approved", approvedAt: Date.now() }));
}

export function requestRevision(
  versionId: string,
  feedbackText: string,
  by: FeedbackItem["by"] = "brand",
  authorName?: string
): Version | null {
  const fb: FeedbackItem = {
    id: `fb-${Date.now()}`,
    versionId,
    at: Date.now(),
    by,
    text: feedbackText,
    resolved: false,
    ...(authorName ? { authorName } : {}),
  };
  return mutate(versionId, (v) => ({ ...v, status: "requested", feedback: [...(v.feedback ?? []), fb] }));
}
