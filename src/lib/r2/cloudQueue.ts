/**
 * KreaLink R2 — cloud write hook
 * Stores call queueCloudWrite(engagementId) after a local change. When a
 * signed-in session has started Firestore sync (see firestoreSync.ts), the
 * registered writer pushes that engagement; otherwise this is a no-op and the
 * engagement stays a local demo record.
 */

type Writer = (engagementId: string) => void;
let writer: Writer | null = null;

export function registerCloudWriter(fn: Writer | null) {
  writer = fn;
}

export function queueCloudWrite(engagementId: string) {
  try {
    writer?.(engagementId);
  } catch { /* never block local writes */ }
}
