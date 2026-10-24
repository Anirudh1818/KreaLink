/**
 * KreaLink — client account & verification actions
 * Every write here is re-validated by firestore.rules / storage.rules.
 */

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  signInWithPopup,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { deleteObject, getBlob, ref, uploadBytes } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";
import {
  brandIdForUid,
  canAdminTransition,
  CONSENT_POLICY_VERSION,
  type MemberRole,
  type VerificationStatus,
} from "./policy";
import { LIMITS, type BrandApplication, type CreatorApplication, type EvidenceRef, type VerificationDoc } from "./schema";

export class AccountError extends Error {}

/** Map Firebase error codes to user-safe messages (no internals). */
export function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  const map: Record<string, string> = {
    "auth/email-already-in-use": "An account with this email already exists. Sign in instead.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/weak-password": "Use a password with at least 8 characters.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/wrong-password": "Email or password is incorrect.",
    "auth/user-not-found": "Email or password is incorrect.",
    "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
    "auth/popup-closed-by-user": "The sign-in window was closed before finishing.",
    "auth/network-request-failed": "Network error. Check your connection and try again.",
    "auth/multi-factor-auth-required": "This account requires a second factor. Complete MFA sign-in to continue.",
    "permission-denied": "You don't have permission to do that.",
  };
  if (err instanceof AccountError) return err.message;
  return map[code] ?? "Something went wrong. Please try again.";
}

function verifyEmailUrl(): string | undefined {
  try {
    return `${window.location.origin}/verify-email`;
  } catch {
    return undefined;
  }
}

function sendVerification(u: User) {
  const url = verifyEmailUrl();
  return sendEmailVerification(u, url ? { url } : undefined);
}

async function createUserDoc(u: User, role: MemberRole, displayName: string) {
  const name = displayName.trim().slice(0, 120) || u.email || "KreaLink member";
  await setDoc(doc(db, "users", u.uid), {
    uid: u.uid,
    role,
    email: u.email,
    displayName: name,
    ...(role === "brand" ? { brandId: brandIdForUid(u.uid) } : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  // Brands get a public workspace doc (no contact details; it's world-readable).
  // Must run after users/{uid} exists — the rules check the role and brandId there.
  if (role === "brand") {
    const brandId = brandIdForUid(u.uid);
    await setDoc(doc(db, "brands", brandId), {
      id: brandId,
      ownerUid: u.uid,
      name,
      industry: "",
      description: "",
      createdAt: serverTimestamp(),
    }).catch(() => {});
  }
}

/** Email/password signup for a brand or creator. Never creates an admin. */
export async function registerMember(input: {
  role: MemberRole;
  displayName: string;
  email: string;
  password: string;
}): Promise<User> {
  if (input.password.length < 8) throw new AccountError("Use a password with at least 8 characters.");
  const cred = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password);
  await updateProfile(cred.user, { displayName: input.displayName.trim() });
  await createUserDoc(cred.user, input.role, input.displayName);
  await sendVerification(cred.user).catch(() => {});
  return cred.user;
}

/** Google signup/sign-in. Existing accounts keep their original role. */
export async function continueWithGoogle(role: MemberRole | null): Promise<User> {
  const cred = await signInWithPopup(auth, new GoogleAuthProvider());
  const existing = await getDoc(doc(db, "users", cred.user.uid)).catch(() => null);
  if (existing?.exists()) {
    const current = existing.data().role as MemberRole;
    if (role && current !== role) {
      throw new AccountError(`This Google account is already registered as a ${current}. Sign in from the ${current} portal.`);
    }
    return cred.user;
  }
  if (role) await createUserDoc(cred.user, role, cred.user.displayName ?? "");
  return cred.user;
}

/** For accounts created before roles existed: pick a role once. */
export async function completeRoleSetup(role: MemberRole): Promise<void> {
  const u = auth.currentUser;
  if (!u) throw new AccountError("Sign in first.");
  await createUserDoc(u, role, u.displayName ?? "");
}

export async function resendVerificationEmail(): Promise<void> {
  const u = auth.currentUser;
  if (!u) throw new AccountError("Sign in first.");
  await sendVerification(u);
}

/* ------------------------------------------------------------------ */
/* Applications                                                        */
/* ------------------------------------------------------------------ */

export async function saveApplication(params: {
  uid: string;
  role: MemberRole;
  application: BrandApplication | CreatorApplication;
  evidence: EvidenceRef[];
  submit: boolean;
  existing: VerificationDoc | null;
}): Promise<void> {
  const { uid, role, application, evidence, submit, existing } = params;
  const consent = { accepted: true as const, version: CONSENT_POLICY_VERSION, acceptedAt: Date.now() };
  const ref_ = doc(db, "verifications", uid);
  const status: VerificationStatus = submit ? "pending_review" : existing?.status ?? "unverified";
  const body = {
    status,
    application,
    evidence,
    consent,
    updatedAt: serverTimestamp(),
    ...(submit ? { submittedAt: serverTimestamp() } : {}),
  };
  if (existing) await updateDoc(ref_, body);
  else await setDoc(ref_, { uid, role, ...body });

  // Sync to public profile collections so real accounts are reflected immediately
  try {
    if (role === "creator") {
      const cApp = application as CreatorApplication;
      const username = (cApp.displayName || "creator")
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_")
        .slice(0, 30) || `creator_${uid.slice(0, 6)}`;
      const creatorRef = doc(db, "creators", username);
      const existingCreator = await getDoc(creatorRef).catch(() => null);
      if (!existingCreator?.exists() || existingCreator.data()?.ownerUid === uid) {
        await setDoc(creatorRef, {
          ownerUid: uid,
          name: cApp.displayName || "Creator",
          username,
          bio: cApp.bio || "",
          specialization: cApp.specializations?.[0] || "AI Creator",
          skills: cApp.specializations || [],
          aiTools: cApp.aiTools || [],
          aiModels: ["Claude", "GPT-4o"],
          contentTypes: cApp.formats || [],
          formats: cApp.formats || [],
          commercialUse: cApp.offersCommercialLicense ?? true,
          availability: cApp.availability === "open" ? "Open to Work" : "Limited Availability",
          profilePhoto: "",
          status: "Active",
          theme: "flame",
          updatedAt: serverTimestamp(),
        }, { merge: true }).catch(() => {});

        // Link creatorUsername on users/{uid}
        await updateDoc(doc(db, "users", uid), {
          creatorUsername: username,
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      }
    } else if (role === "brand") {
      const bApp = application as BrandApplication;
      const brandId = brandIdForUid(uid);
      await setDoc(doc(db, "brands", brandId), {
        id: brandId,
        ownerUid: uid,
        name: bApp.tradeName || bApp.legalName || "Brand",
        industry: bApp.businessType || "",
        description: bApp.website ? `Website: ${bApp.website}` : "",
        updatedAt: serverTimestamp(),
      }, { merge: true }).catch(() => {});
    }
  } catch {
    // Non-blocking for application save
  }
}

/* ------------------------------------------------------------------ */
/* Evidence (private Storage)                                          */
/* ------------------------------------------------------------------ */

export async function uploadEvidence(uid: string, file: File, kind: string): Promise<EvidenceRef> {
  if (!(LIMITS.evidenceTypes as readonly string[]).includes(file.type)) {
    throw new AccountError("Upload a PDF, PNG, JPEG or WebP file.");
  }
  if (file.size > LIMITS.maxEvidenceBytes) throw new AccountError("Files must be under 10 MB.");
  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const path = `verification-evidence/${uid}/${id}-${safeName}`;
  await uploadBytes(ref(storage, path), file, { contentType: file.type });
  return { path, name: file.name.slice(0, 120), contentType: file.type, size: file.size, kind, uploadedAt: Date.now() };
}

export async function removeEvidence(path: string): Promise<void> {
  await deleteObject(ref(storage, path)).catch(() => {});
}

/** Evidence must live under the applicant's own folder. */
export function evidenceBelongsTo(path: string, uid: string): boolean {
  return path.startsWith(`verification-evidence/${uid}/`) && !path.includes("..");
}

/* ------------------------------------------------------------------ */
/* Admin actions (rules require admins/{uid} + audit entry)            */
/* ------------------------------------------------------------------ */

export async function decideVerification(params: {
  adminUid: string;
  target: VerificationDoc;
  to: VerificationStatus;
  reason: string;
  publicProfile?: { collection: "creators" | "brands"; id: string } | null;
}): Promise<void> {
  const { adminUid, target, to, reason, publicProfile } = params;
  if (!canAdminTransition(target.status, to)) {
    throw new AccountError(`Cannot move an application from ${target.status} to ${to}.`);
  }
  const trimmed = reason.trim();
  if (trimmed.length < 3) throw new AccountError("Record a reason for this decision.");
  const batch = writeBatch(db);
  const logRef = doc(collection(db, "auditLogs"));
  batch.set(logRef, {
    action: "verification.decision",
    actorUid: adminUid,
    targetUid: target.uid,
    fromStatus: target.status,
    toStatus: to,
    reason: trimmed.slice(0, LIMITS.reason),
    at: serverTimestamp(),
  });
  batch.update(doc(db, "verifications", target.uid), {
    status: to,
    reviewedBy: adminUid,
    reviewedAt: serverTimestamp(),
    decisionReason: trimmed.slice(0, LIMITS.reason),
    lastAuditId: logRef.id,
    updatedAt: serverTimestamp(),
  });
  // Mirror the trusted badge onto the public profile, if one exists.
  if (publicProfile) {
    batch.set(doc(db, publicProfile.collection, publicProfile.id), { verified: to === "verified" }, { merge: true });
  }
  await batch.commit();
}

export async function purgeEvidence(adminUid: string, target: VerificationDoc, reason: string): Promise<void> {
  for (const e of target.evidence) {
    if (evidenceBelongsTo(e.path, target.uid)) await removeEvidence(e.path);
  }
  const batch = writeBatch(db);
  const logRef = doc(collection(db, "auditLogs"));
  batch.set(logRef, { action: "evidence.purge", actorUid: adminUid, targetUid: target.uid, reason, at: serverTimestamp() });
  batch.update(doc(db, "verifications", target.uid), { evidence: [], lastAuditId: logRef.id, updatedAt: serverTimestamp() });
  await batch.commit();
}

/** Log, then open evidence as a short-lived object URL (never a public URL). */
export async function openEvidence(adminUid: string, targetUid: string, e: EvidenceRef): Promise<string> {
  if (!evidenceBelongsTo(e.path, targetUid)) throw new AccountError("Evidence reference does not belong to this applicant.");
  const logRef = doc(collection(db, "auditLogs"));
  await setDoc(logRef, {
    action: "evidence.view",
    actorUid: adminUid,
    targetUid,
    reason: `Viewed ${e.kind} (${e.name.slice(0, 60)})`,
    at: serverTimestamp(),
  });
  const blob = await getBlob(ref(storage, e.path));
  return URL.createObjectURL(blob);
}
