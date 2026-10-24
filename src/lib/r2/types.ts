/**
 * KreaLink Round 2 — Core Types
 * Engagement pipeline, versioning, licensing and delivery check.
 */

import type { CreativeBrief } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Engagement pipeline                                                 */
/* ------------------------------------------------------------------ */

export type EngagementStage =
  | "shortlisted"
  | "contacted"
  | "accepted"
  | "declined"
  | "selected"
  | "production"
  | "delivered"
  | "accepted_final"
  | "changes_requested";

/** Canonical happy-path order shown in stage trackers. */
export const PIPELINE_STAGES: EngagementStage[] = [
  "shortlisted",
  "contacted",
  "accepted",
  "selected",
  "production",
  "changes_requested",
  "delivered",
  "accepted_final",
];

export const STAGE_LABEL: Record<EngagementStage, string> = {
  shortlisted: "Shortlisted",
  contacted: "Contacted",
  accepted: "Accepted",
  declined: "Declined",
  selected: "Selected",
  production: "In Production",
  changes_requested: "Revision",
  delivered: "Delivered",
  accepted_final: "Approved",
};

export type EngagementUpdate = {
  at: number; // epoch ms
  stage: EngagementStage;
  note?: string;
  by: "brand" | "creator" | "system";
};

export type Engagement = {
  id: string; // `${briefId}-${creatorId}`
  briefId: string;
  creatorId: string;
  stage: EngagementStage;
  history: EngagementUpdate[];
  scope?: string;        // agreed scope text
  timeline?: string;
  requirements?: string; // confirmed deliverable requirements at selection
  campaignTitle?: string;
  brandName?: string;
  matchScore?: number;
  brief?: CreativeBrief; // snapshot so the creator side can validate against specs
  agreedLicense?: AgreedLicense; // locked at selection, carried through delivery
  progress?: ProgressUpdate[];   // production updates visible to the brand
  brandOwnerUid?: string;        // set when both sides have real accounts →
  creatorOwnerUid?: string;      //   the engagement syncs through Firestore
  createdAt: number;
  updatedAt: number;
};

/** Licensing terms agreed when the brand selects the creator. */
export type AgreedLicense = {
  terms: LicenseTerm;            // what the brief requires (the agreed grant)
  creatorOffers: LicenseTerm;    // what the creator offered at the time
  mismatches: LicenseMismatch[]; // differences acknowledged at selection
  overrideNote?: string;         // how blocking mismatches were resolved
  agreedAt: number;
};

export type ProgressUpdate = {
  at: number;
  by: "creator" | "brand";
  note: string;
  percent?: number;
};

/** Optional context captured when an engagement is first created. */
export type EngagementMeta = Pick<
  Engagement,
  "campaignTitle" | "brandName" | "matchScore" | "brief" | "brandOwnerUid" | "creatorOwnerUid"
>;

/* ------------------------------------------------------------------ */
/* Versions & revisions                                                */
/* ------------------------------------------------------------------ */

export type RevisionStatus =
  | "requested"
  | "in_progress"
  | "submitted"
  | "approved";

export type FeedbackItem = {
  id: string;
  versionId: string;
  at: number;
  by: "brand" | "creator";
  authorName?: string;   // who asked (shown in version history)
  text: string;
  resolved: boolean;
};

export type Version = {
  id: string;            // `v${n}`
  engagementId: string;
  n: number;             // 1, 2, 3…
  status: RevisionStatus;
  createdAt: number;
  submittedAt?: number;
  approvedAt?: number;
  mediaUrl?: string;     // local blob URL or public URL
  mediaMeta?: MediaMeta;
  changeLog: string;     // what changed from previous version
  requestedBy?: string;  // name of who requested the revision
  submittedBy?: string;  // creator handle that made this version
  respondsTo?: {         // the feedback this version answers (revision rounds)
    versionN: number;
    feedback: string;
    requestedBy: string;
    requestedAt: number;
  };
  feedback: FeedbackItem[];
};

/* ------------------------------------------------------------------ */
/* Delivery check                                                      */
/* ------------------------------------------------------------------ */

export type MediaMeta = {
  width: number;
  height: number;
  durationSec?: number;
  fileSizeMb?: number;
  aspectRatio: string;   // e.g. "9:16"
  resolution: string;    // e.g. "720×1280"
};

export type DeliveryIssue = {
  severity: "error" | "warn";
  field: "aspectRatio" | "resolution" | "duration" | "fileSize" | "format";
  message: string;
  fix: string;
};

/** Technical specs a deliverable is validated against (derived from a brief). */
export type DeliverySpecs = {
  aspectRatio: string;   // e.g. "9:16"
  durationSec?: number;
  minShortSide: number;  // px
};

export type DeliveryCheck = {
  mediaUrl: string;
  meta: MediaMeta;
  issues: DeliveryIssue[];
  pass: boolean;
};

/* ------------------------------------------------------------------ */
/* Licensing                                                           */
/* ------------------------------------------------------------------ */

export type LicenseTerm = {
  usageType: "commercial" | "editorial" | "internal" | "unlimited";
  territory: "worldwide" | "regional" | "limited" | string;
  duration: "perpetual" | "1year" | "2year" | "6month" | string;
  platforms: string[];   // ["Instagram", "YouTube", "Broadcast", …]
  exclusivity: "exclusive" | "non-exclusive" | "category-exclusive";
};

export type LicenseMismatch = {
  field: keyof LicenseTerm;
  brandRequires: string;
  creatorOffers: string;
  severity: "blocking" | "advisory";
};

export type LicenseComparison = {
  creatorId: string;
  briefId: string;
  brandRequires: LicenseTerm;
  creatorOffers: LicenseTerm;
  mismatches: LicenseMismatch[];
  compatible: boolean;
};

/* ------------------------------------------------------------------ */
/* Auto-shortlist agent                                                */
/* ------------------------------------------------------------------ */

export type AgentAction = {
  id: string;
  type: "shortlist" | "rank" | "filter" | "explain" | "message";
  description: string;
  creatorId?: string;
  score?: number;
  reason?: string;
  status: "pending" | "accepted" | "edited" | "rejected";
  editedValue?: string;   // brand's note when editing
  originalCreatorId?: string; // set when the brand swapped the agent's pick
};

export type WeakAlternative = { creatorId: string; score: number; reason: string };

export type AgentShortlistResult = {
  briefId: string;
  actions: AgentAction[];
  summary: string;
  createdAt: number;
  nextStep: string;
  strongMatchFound?: boolean;          // false → no creator met the threshold
  weakAlternatives?: WeakAlternative[]; // shown, never auto-proposed
  conflicts?: string[];                // contradictory brief requirements
  applied?: boolean;                   // accepted actions written to the pipeline
};

/** Minimum overall score for the agent to propose a creator. */
export const STRONG_MATCH_THRESHOLD = 70;
