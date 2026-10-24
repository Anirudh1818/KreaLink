/**
 * KreaLink R2 — React binding
 * Returns a revision string that changes whenever R2 data is written.
 * It is "" on the server and during hydration, so callers can skip
 * localStorage reads until the client has mounted.
 */

import { useSyncExternalStore } from "react";
import { subscribeR2 } from "./events";

const WATCHED_KEYS = ["krealink-engagements", "krealink-versions", "krealink-agent-results", "krealink-reviews", "krealink-license-offers", "krealink-applications"];

function rawSnapshot(): string {
  try {
    return WATCHED_KEYS.map((k) => localStorage.getItem(k) ?? "").join("\u0000");
  } catch {
    return "";
  }
}

export function useR2Revision(): string {
  return useSyncExternalStore(subscribeR2, rawSnapshot, () => "");
}
