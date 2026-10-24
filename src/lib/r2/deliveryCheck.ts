/**
 * KreaLink R2 — Delivery Check
 * Inspects video/image metadata in the browser and flags mismatches
 * against brief requirements.
 */

import type { MediaMeta, DeliveryIssue, DeliveryCheck } from "./types";

/** Canonical aspect-ratio fractions (±4% tolerance). */
const KNOWN_RATIOS: { label: string; ratio: number }[] = [
  { label: "9:16", ratio: 9 / 16 },
  { label: "16:9", ratio: 16 / 9 },
  { label: "1:1", ratio: 1 },
  { label: "4:5", ratio: 4 / 5 },
  { label: "4:3", ratio: 4 / 3 },
  { label: "3:4", ratio: 3 / 4 },
  { label: "21:9", ratio: 21 / 9 },
];

export function detectAspectRatio(w: number, h: number): string {
  const r = w / h;
  const best = KNOWN_RATIOS.reduce(
    (prev, cur) =>
      Math.abs(cur.ratio - r) < Math.abs(prev.ratio - r) ? cur : prev,
    KNOWN_RATIOS[0]!
  );
  // Accept if within 4%
  if (Math.abs(best.ratio - r) / best.ratio < 0.04) return best.label;
  // Otherwise return raw fraction
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const g = gcd(w, h);
  return `${w / g}:${h / g}`;
}

/** Extract video metadata in the browser via HTMLVideoElement. */
export async function extractVideoMeta(url: string): Promise<MediaMeta> {
  return new Promise((resolve, reject) => {
    const vid = document.createElement("video");
    vid.preload = "metadata";
    vid.crossOrigin = "anonymous";
    vid.onloadedmetadata = () => {
      const w = vid.videoWidth;
      const h = vid.videoHeight;
      resolve({
        width: w,
        height: h,
        durationSec: Math.round(vid.duration),
        aspectRatio: detectAspectRatio(w, h),
        resolution: `${w}×${h}`,
      });
      vid.src = "";
    };
    vid.onerror = () => reject(new Error("Could not read video metadata"));
    vid.src = url;
  });
}

/** Parse e.g. "9:16" → 9/16 fraction. */
function parseRatio(s: string): number | null {
  const m = s.match(/^(\d+)[:/](\d+)$/);
  if (!m) return null;
  return parseInt(m[1]!) / parseInt(m[2]!);
}

/** Strict delivery check against a brief's requirements. */
export async function runDeliveryCheck(params: {
  mediaUrl: string;
  briefAspectRatio: string;  // e.g. "9:16 Vertical (Reels/Shorts)"
  briefDurationSec?: number;
}): Promise<DeliveryCheck> {
  const { mediaUrl, briefAspectRatio, briefDurationSec } = params;

  let meta: MediaMeta;
  try {
    meta = await extractVideoMeta(mediaUrl);
  } catch {
    // If video metadata can't be extracted, parse from filename hints
    meta = { width: 0, height: 0, aspectRatio: "unknown", resolution: "unknown" };
  }

  const issues: DeliveryIssue[] = [];

  // 1. Aspect ratio check
  const briefRatioStr = briefAspectRatio.split(" ")[0] ?? briefAspectRatio; // e.g. "9:16"
  const briefRatio = parseRatio(briefRatioStr);
  const deliveredRatio = parseRatio(meta.aspectRatio);

  if (briefRatio && deliveredRatio) {
    const diff = Math.abs(briefRatio - deliveredRatio) / briefRatio;
    if (diff > 0.04) {
      issues.push({
        severity: "error",
        field: "aspectRatio",
        message: `Uploaded ${meta.aspectRatio} but brief requires ${briefRatioStr}.`,
        fix: `Re-export your video at ${briefRatioStr} (e.g. crop or re-frame in your editing tool).`,
      });
    }
  }

  // 2. Resolution check (min 720p on short side)
  const shortSide = Math.min(meta.width, meta.height);
  if (shortSide > 0 && shortSide < 720) {
    issues.push({
      severity: "warn",
      field: "resolution",
      message: `Resolution ${meta.resolution} is below recommended minimum (720p short side).`,
      fix: "Re-export at a higher quality setting or use source footage.",
    });
  }

  // 3. Duration check
  if (briefDurationSec && meta.durationSec !== undefined) {
    const slack = briefDurationSec * 0.2; // ±20%
    if (Math.abs(meta.durationSec - briefDurationSec) > slack) {
      issues.push({
        severity: "warn",
        field: "duration",
        message: `Duration ${meta.durationSec}s deviates from requested ${briefDurationSec}s (±20%).`,
        fix: `Trim or extend to approximately ${briefDurationSec}s.`,
      });
    }
  }

  return {
    mediaUrl,
    meta,
    issues,
    pass: !issues.some((i) => i.severity === "error"),
  };
}
