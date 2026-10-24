/**
 * KreaLink R2 — Delivery Check
 * Inspects video/image metadata in the browser and flags mismatches
 * against brief requirements.
 */

import type { MediaMeta, DeliveryIssue, DeliveryCheck, DeliverySpecs } from "./types";
import type { CreativeBrief } from "@/lib/types";

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

/** Parse "1080x1920" / "1080×1920" → { width, height }. */
export function parseResolution(s: string): { width: number; height: number } | null {
  const m = s.trim().match(/^(\d+)\s*[x×X*]\s*(\d+)$/);
  if (!m) return null;
  return { width: parseInt(m[1]!), height: parseInt(m[2]!) };
}

/** Build MediaMeta from values a creator typed in (no file access needed). */
export function metaFromInputs(resolution: string, durationSec?: number): MediaMeta {
  const res = parseResolution(resolution);
  if (!res) return { width: 0, height: 0, durationSec, aspectRatio: "unknown", resolution: resolution || "unknown" };
  return {
    width: res.width,
    height: res.height,
    durationSec,
    aspectRatio: detectAspectRatio(res.width, res.height),
    resolution: `${res.width}×${res.height}`,
  };
}

/** Pull the technical specs out of a brief ("9:16 Vertical…", "1x 30-Second Hero Video"). */
export function deliverySpecsForBrief(brief: CreativeBrief): DeliverySpecs {
  const aspectRatio = brief.aspectRatio.split(" ")[0] ?? brief.aspectRatio;
  let durationSec: number | undefined;
  for (const d of [...brief.deliverables, brief.requirements]) {
    const m = d.match(/(\d+)\s*(?:-|\s)?\s*(?:s\b|sec|second)/i);
    if (m) {
      durationSec = parseInt(m[1]!);
      break;
    }
  }
  const wants4k = /\b4k\b/i.test(brief.deliverables.join(" "));
  return { aspectRatio, durationSec, minShortSide: wants4k ? 2160 : 720 };
}

/** Pure spec check — shared by the URL-probing and manual-entry flows. */
export function checkMediaAgainstSpecs(meta: MediaMeta, specs: DeliverySpecs): DeliveryIssue[] {
  const issues: DeliveryIssue[] = [];

  if (meta.aspectRatio === "unknown") {
    issues.push({
      severity: "error",
      field: "aspectRatio",
      message: "Could not determine the aspect ratio of this file.",
      fix: "Enter the export resolution (e.g. 1080×1920) so it can be validated.",
    });
  }

  // 1. Aspect ratio check
  const briefRatioStr = specs.aspectRatio;
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

  // 2. Resolution check (min short side from specs)
  const shortSide = Math.min(meta.width, meta.height);
  if (shortSide > 0 && shortSide < specs.minShortSide) {
    issues.push({
      severity: "warn",
      field: "resolution",
      message: `Resolution ${meta.resolution} is below the required minimum (${specs.minShortSide}px short side).`,
      fix: "Re-export at a higher quality setting or use source footage.",
    });
  }

  // 3. Duration check
  const briefDurationSec = specs.durationSec;
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

  return issues;
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
    meta = { width: 0, height: 0, aspectRatio: "unknown", resolution: "unknown" };
  }

  const issues = checkMediaAgainstSpecs(meta, {
    aspectRatio: briefAspectRatio.split(" ")[0] ?? briefAspectRatio,
    durationSec: briefDurationSec,
    minShortSide: 720,
  });

  return {
    mediaUrl,
    meta,
    issues,
    pass: !issues.some((i) => i.severity === "error"),
  };
}
