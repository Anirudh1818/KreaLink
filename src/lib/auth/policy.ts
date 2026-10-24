/**
 * KreaLink — Roles, verification states and access policy
 * ----------------------------------------------------------------------------
 * Pure, isomorphic module shared by the UI, the API routes and the tests.
 *
 * Three separate concepts:
 *   - Authentication  → Firebase Auth (who you are; email_verified claim)
 *   - Verification    → verifications/{uid}.status (are you eligible)
 *   - Authorization   → role + admins/{uid} + this policy, enforced for real
 *                       by firestore.rules / storage.rules on the server.
 *
 * The transition tables below are mirrored in firestore.rules. If you change
 * one, change the other and re-run `npm run test:rules`.
 */

/* ------------------------------------------------------------------ */
/* Roles                                                               */
/* ------------------------------------------------------------------ */

/** Roles a member can hold. Chosen once at signup, immutable afterwards. */
export type MemberRole = "brand" | "creator";
export const MEMBER_ROLES: readonly MemberRole[] = ["brand", "creator"] as const;

/**
 * Admin is NOT a member role. It is granted only by the provisioning script
 * (scripts/provision-admin.ts) writing admins/{uid}, which no client can write.
 */
export type Principal =
  | { kind: "anonymous" }
  | { kind: "member"; role: MemberRole }
  | { kind: "admin" };

export function isMemberRole(v: unknown): v is MemberRole {
  return v === "brand" || v === "creator";
}

/* ------------------------------------------------------------------ */
/* Verification state machine                                          */
/* ------------------------------------------------------------------ */

export type VerificationStatus =
  | "unverified"
  | "pending_review"
  | "verified"
  | "rejected"
  | "suspended"
  | "info_required";

export const VERIFICATION_STATUSES: readonly VerificationStatus[] = [
  "unverified",
  "pending_review",
  "verified",
  "rejected",
  "suspended",
  "info_required",
] as const;

export const STATUS_LABEL: Record<VerificationStatus, string> = {
  unverified: "Unverified",
  pending_review: "Pending Review",
  verified: "Verified",
  rejected: "Rejected",
  suspended: "Suspended",
  info_required: "Additional Information Required",
};

/** What the account holder sees — no internal reviewer detail. */
export const STATUS_MESSAGE: Record<VerificationStatus, string> = {
  unverified: "Complete and submit your verification application to unlock commercial features.",
  pending_review: "Your application is with our review team. We'll email you when there's a decision.",
  verified: "Your account is verified.",
  rejected: "Your application was not approved. See the reason below. Contact support if you believe this is a mistake.",
  suspended: "Your account is suspended. Commercial features are disabled. Contact support for details.",
  info_required: "We need a little more information. Update your application and resubmit.",
};

/** Applicant (account owner) may only submit / resubmit. */
export const APPLICANT_TRANSITIONS: Record<VerificationStatus, readonly VerificationStatus[]> = {
  unverified: ["unverified", "pending_review"],
  info_required: ["info_required", "pending_review"],
  pending_review: [],
  verified: [],
  rejected: [],
  suspended: [],
};

/** Admin decisions. Same-state "transitions" are not decisions and are refused. */
export const ADMIN_TRANSITIONS: Record<VerificationStatus, readonly VerificationStatus[]> = {
  unverified: ["suspended"],
  pending_review: ["verified", "rejected", "info_required", "suspended"],
  info_required: ["rejected", "suspended"],
  verified: ["suspended", "info_required"],
  suspended: ["verified", "rejected"],
  rejected: ["info_required"],
};

export function canApplicantTransition(from: VerificationStatus, to: VerificationStatus): boolean {
  return APPLICANT_TRANSITIONS[from].includes(to);
}

export function canAdminTransition(from: VerificationStatus, to: VerificationStatus): boolean {
  return ADMIN_TRANSITIONS[from].includes(to);
}

/** Applicants may edit their application only while it is a draft or info was requested. */
export function isApplicationEditable(status: VerificationStatus): boolean {
  return status === "unverified" || status === "info_required";
}

/* ------------------------------------------------------------------ */
/* Restricted actions                                                  */
/* ------------------------------------------------------------------ */

export type RestrictedAction =
  | "brand.sendInvitation"
  | "brand.startEngagement"
  | "brand.claimVerifiedBadge"
  | "creator.acceptInvitation"
  | "creator.submitDeliverable"
  | "creator.claimVerifiedBadge";

const ACTION_ROLE: Record<RestrictedAction, MemberRole> = {
  "brand.sendInvitation": "brand",
  "brand.startEngagement": "brand",
  "brand.claimVerifiedBadge": "brand",
  "creator.acceptInvitation": "creator",
  "creator.submitDeliverable": "creator",
  "creator.claimVerifiedBadge": "creator",
};

export type AccessSnapshot = {
  signedIn: boolean;
  emailVerified: boolean;
  role: MemberRole | null;
  status: VerificationStatus;
};

export type AccessDecision = { allowed: true } | { allowed: false; reason: string };

/** UI-side mirror of the rules; the rules are the authority. */
export function canPerform(action: RestrictedAction, a: AccessSnapshot): AccessDecision {
  const role = ACTION_ROLE[action];
  if (!a.signedIn) return { allowed: false, reason: "Sign in to continue." };
  if (a.role !== role) return { allowed: false, reason: `This action is only available to ${role} accounts.` };
  if (!a.emailVerified) return { allowed: false, reason: "Verify your email address first." };
  if (a.status === "suspended") return { allowed: false, reason: "Your account is suspended." };
  if (a.status !== "verified") {
    return { allowed: false, reason: `Your ${role} account must be verified first (current status: ${STATUS_LABEL[a.status]}).` };
  }
  return { allowed: true };
}

/* ------------------------------------------------------------------ */
/* Routing                                                             */
/* ------------------------------------------------------------------ */

export type PortalArea = "brand" | "creator" | "admin" | "public";

/** Which portal a pathname belongs to. Unlisted paths are public. */
export function portalForPath(pathname: string): PortalArea {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  if (pathname === "/brand" || pathname.startsWith("/brand/")) return "brand";
  if (
    pathname === "/creator" ||
    pathname.startsWith("/creator/") ||
    pathname === "/creator-studio" ||
    pathname.startsWith("/creator-studio/")
  ) {
    return "creator";
  }
  return "public";
}

/** Paths inside a portal that must stay reachable without that role (signup flows). */
const OPEN_PORTAL_PATHS = ["/brand/signup", "/creator/signup"];

/** Explains how owners get admin access; any signed-in account may view it. */
export const ADMIN_ACCESS_PATH = "/admin/access";

export type RouteDecision = { allow: true } | { allow: false; redirectTo: string };

/** Home route for a principal after sign-in. */
export function homeFor(p: Principal, status: VerificationStatus, emailVerified: boolean): string {
  if (p.kind === "admin") return "/admin";
  if (p.kind === "anonymous") return "/login";
  if (!emailVerified) return "/verify-email";
  if (status === "verified") return p.role === "brand" ? "/brand" : "/creator";
  return p.role === "brand" ? "/brand/verification" : "/creator/verification";
}

/**
 * Route guard used by the client portal gates. Anonymous visitors may still
 * browse the brand / creator demo workspaces (preserving the existing demo);
 * signed-in members are kept inside their own portal; /admin is admin-only.
 */
export function decideRoute(pathname: string, p: Principal, status: VerificationStatus = "unverified"): RouteDecision {
  const area = portalForPath(pathname);
  if (area === "public" || OPEN_PORTAL_PATHS.some((o) => pathname.startsWith(o))) return { allow: true };
  if (area === "admin") {
    if (p.kind === "admin") return { allow: true };
    if (p.kind === "anonymous") return { allow: false, redirectTo: `/login?next=${pathname}` };
    // Signed-in non-admins only see how admin access is granted.
    return pathname === ADMIN_ACCESS_PATH ? { allow: true } : { allow: false, redirectTo: ADMIN_ACCESS_PATH };
  }
  if (p.kind === "admin") return { allow: true }; // oversight access
  if (p.kind === "anonymous") {
    // Verification pages need an account; the dashboards stay open as demo.
    if (pathname.endsWith("/verification")) return { allow: false, redirectTo: `/login?next=${pathname}` };
    return { allow: true };
  }
  if (p.role !== area) return { allow: false, redirectTo: p.role === "brand" ? "/brand" : "/creator" };
  // Brands must complete GSTIN verification before using the Brand Hub.
  if (p.role === "brand" && status !== "verified" && pathname !== "/brand/verification") {
    return { allow: false, redirectTo: "/brand/verification" };
  }
  return { allow: true };
}

/** Stable brand document id for an account (matches the existing Brand Hub). */
export function brandIdForUid(uid: string): string {
  return `brand-${uid.slice(0, 8)}`;
}

/** Only allow same-origin relative redirects (no open redirects via ?next=). */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return null;
  return next;
}

/* ------------------------------------------------------------------ */
/* Retention                                                           */
/* ------------------------------------------------------------------ */

/** Evidence files are purged this many days after a final decision. */
export const EVIDENCE_RETENTION_DAYS = 90;
export const CONSENT_POLICY_VERSION = "2026-10-verification-v1";
