/**
 * KreaLink — Account & verification data schema
 * ----------------------------------------------------------------------------
 * Firestore collections (see firestore.rules for enforcement):
 *
 *   users/{uid}            role (brand|creator, immutable), profile links
 *   admins/{uid}           admin grant — written ONLY by scripts/provision-admin.ts
 *   verifications/{uid}    status + application; owner/admin read only
 *   auditLogs/{id}         append-only admin action log; admin read only
 *
 * Storage: verification-evidence/{uid}/{file} — owner write/read, admin read/delete.
 * Evidence is referenced by storage path, never by a public download URL.
 */

import type { MemberRole, VerificationStatus } from "./policy";
import { validateGstinFormat } from "./gstin";

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

export type UserDoc = {
  uid: string;
  role: MemberRole;
  email: string;
  displayName: string;
  brandId?: string;          // brand accounts
  creatorUsername?: string;  // creator accounts, set once a public profile exists
  createdAt: unknown;
  updatedAt: unknown;
};

export type AdminDoc = {
  active: boolean;
  email: string;
  requireMfa: boolean;
  grantedBy: string;
  grantedAt: unknown;
};

export type EvidenceRef = {
  path: string;          // verification-evidence/{uid}/{fileId}
  name: string;
  contentType: string;
  size: number;
  kind: string;          // e.g. "gst_certificate", "incorporation_certificate", "identity"
  uploadedAt: number;
};

export type Consent = {
  accepted: true;
  version: string;
  acceptedAt: number;
};

export const BUSINESS_TYPES = {
  private_limited: "Private Limited Company",
  public_limited: "Public Limited Company",
  llp: "Limited Liability Partnership",
  partnership: "Partnership Firm",
  sole_proprietorship: "Sole Proprietorship",
  agency: "Agency / Studio",
  other: "Other",
} as const;
export type BusinessType = keyof typeof BUSINESS_TYPES;

/** Alternative evidence when a business has no GSTIN. */
export const ALT_BUSINESS_EVIDENCE = {
  incorporation_certificate: "Certificate of Incorporation (MCA)",
  udyam_registration: "Udyam (MSME) Registration",
  shop_establishment: "Shop & Establishment / Trade Licence",
  foreign_registration: "Company registration (outside India)",
  other: "Other official registration",
} as const;
export type AltBusinessEvidence = keyof typeof ALT_BUSINESS_EVIDENCE;

export type BrandApplication = {
  contactName: string;
  legalName: string;
  tradeName: string;
  businessType: BusinessType;
  country: string;                 // ISO 3166-1 alpha-2
  website: string;                 // "" when none
  representative: { name: string; designation: string; email: string };
  hasGstin: boolean;
  gstin: string;                   // "" when hasGstin is false
  altEvidenceType: AltBusinessEvidence | "";  // required when no GSTIN
  registrationNumber: string;      // alt path registration / CIN / Udyam no.
};

export const AVAILABILITY = {
  open: "Open to new work",
  limited: "Limited availability",
  booked: "Fully booked",
} as const;
export type Availability = keyof typeof AVAILABILITY;

export type CreatorApplication = {
  displayName: string;
  headline: string;
  bio: string;
  portfolioLinks: string[];
  sampleWorkLinks: string[];
  specializations: string[];
  formats: string[];
  aiTools: string[];
  availability: Availability;
  offersCommercialLicense: boolean;
  commercialNotes: string;
  isRegisteredBusiness: boolean;   // optional tax info — never required
  gstin: string;                   // only if isRegisteredBusiness and they have one
};

export type VerificationDoc = {
  uid: string;
  role: MemberRole;
  status: VerificationStatus;
  application: BrandApplication | CreatorApplication;
  evidence: EvidenceRef[];
  consent: Consent;
  submittedAt?: unknown;
  updatedAt: unknown;
  reviewedBy?: string;
  reviewedAt?: unknown;
  decisionReason?: string;
  lastAuditId?: string;
};

export type AuditAction =
  | "verification.decision"
  | "evidence.view"
  | "evidence.purge"
  | "admin.grant"
  | "admin.revoke";

export type AuditLogDoc = {
  action: AuditAction;
  actorUid: string;
  targetUid: string;
  fromStatus?: VerificationStatus;
  toStatus?: VerificationStatus;
  reason: string;
  at: unknown;
};

/* ------------------------------------------------------------------ */
/* Limits (mirrored in firestore.rules)                                */
/* ------------------------------------------------------------------ */

export const LIMITS = {
  shortText: 120,
  longText: 2000,
  reason: 1000,
  maxLinks: 8,
  maxTags: 20,
  maxEvidence: 6,
  maxEvidenceBytes: 10 * 1024 * 1024,
  evidenceTypes: ["application/pdf", "image/png", "image/jpeg", "image/webp"],
} as const;

/* ------------------------------------------------------------------ */
/* Validators                                                          */
/* ------------------------------------------------------------------ */

export type FieldErrors = Record<string, string>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COUNTRY = /^[A-Z]{2}$/;

export function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function req(errors: FieldErrors, key: string, v: string, max: number = LIMITS.shortText, min = 2) {
  const t = v.trim();
  if (t.length < min) errors[key] = "Required.";
  else if (t.length > max) errors[key] = `Keep this under ${max} characters.`;
}

export function validateBrandApplication(a: BrandApplication, evidence: EvidenceRef[]): FieldErrors {
  const e: FieldErrors = {};
  req(e, "contactName", a.contactName);
  req(e, "legalName", a.legalName);
  req(e, "tradeName", a.tradeName);
  if (!(a.businessType in BUSINESS_TYPES)) e.businessType = "Choose a business type.";
  if (!COUNTRY.test(a.country)) e.country = "Choose a country.";
  if (a.website && !isHttpUrl(a.website)) e.website = "Enter a full URL starting with https://";
  req(e, "representative.name", a.representative.name);
  req(e, "representative.designation", a.representative.designation);
  if (!EMAIL.test(a.representative.email)) e["representative.email"] = "Enter a valid email.";

  // GSTIN is mandatory for every brand (KreaLink onboards GST-registered Indian businesses).
  if (a.country !== "IN") e.country = "Brand accounts currently require an Indian GST registration.";
  if (!a.hasGstin || !a.gstin.trim()) {
    e.gstin = "GSTIN is required for brand accounts.";
  } else {
    const g = validateGstinFormat(a.gstin);
    if (!g.valid) e.gstin = g.error;
  }
  if (evidence.length > LIMITS.maxEvidence) e.evidence = `At most ${LIMITS.maxEvidence} files.`;
  return e;
}

export function validateCreatorApplication(a: CreatorApplication, evidence: EvidenceRef[]): FieldErrors {
  const e: FieldErrors = {};
  req(e, "displayName", a.displayName);
  req(e, "headline", a.headline);
  req(e, "bio", a.bio, LIMITS.longText, 20);
  const links = a.portfolioLinks.filter(Boolean);
  if (links.length === 0) e.portfolioLinks = "Add at least one portfolio link.";
  if (links.length > LIMITS.maxLinks) e.portfolioLinks = `At most ${LIMITS.maxLinks} links.`;
  if (links.some((l) => !isHttpUrl(l))) e.portfolioLinks = "Each link must be a full URL starting with https://";
  const samples = a.sampleWorkLinks.filter(Boolean);
  if (samples.length > LIMITS.maxLinks) e.sampleWorkLinks = `At most ${LIMITS.maxLinks} links.`;
  if (samples.some((l) => !isHttpUrl(l))) e.sampleWorkLinks = "Each link must be a full URL starting with https://";
  if (a.specializations.length === 0) e.specializations = "Pick at least one specialization.";
  if (a.formats.length === 0) e.formats = "Pick at least one format.";
  if (a.aiTools.length === 0) e.aiTools = "Pick at least one AI tool.";
  for (const k of ["specializations", "formats", "aiTools"] as const) {
    if (a[k].length > LIMITS.maxTags) e[k] = `At most ${LIMITS.maxTags}.`;
  }
  if (!(a.availability in AVAILABILITY)) e.availability = "Choose your availability.";
  if (a.commercialNotes.length > LIMITS.longText) e.commercialNotes = `Keep this under ${LIMITS.longText} characters.`;
  // GSTIN is optional for creators; only validate when they chose to provide one.
  if (a.isRegisteredBusiness && a.gstin.trim()) {
    const g = validateGstinFormat(a.gstin);
    if (!g.valid) e.gstin = g.error;
  }
  if (evidence.length > LIMITS.maxEvidence) e.evidence = `At most ${LIMITS.maxEvidence} files.`;
  return e;
}
