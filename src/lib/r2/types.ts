/**
 * KreaLink Round 2 — Core Types
 * Engagement pipeline, versioning, licensing and delivery check.
 */

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
  createdAt: number;
  updatedAt: number;
};

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
  editedValue?: string;
};

export type AgentShortlistResult = {
  briefId: string;
  actions: AgentAction[];
  summary: string;
  createdAt: number;
  nextStep: string;
};
