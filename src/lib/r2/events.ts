/**
 * KreaLink R2 — change notifications
 * Stores fire this after every write so mounted views can re-read localStorage.
 */

const R2_CHANGE_EVENT = "krealink-r2-change";

export function notifyR2Change() {
  try {
    window.dispatchEvent(new Event(R2_CHANGE_EVENT));
  } catch { /* ignore (SSR) */ }
}

/** Subscribe to R2 writes in this tab and in other tabs (storage event). */
export function subscribeR2(cb: () => void): () => void {
  window.addEventListener(R2_CHANGE_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(R2_CHANGE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
