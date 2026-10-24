/**
 * KreaLink — Firebase Admin (server only)
 * ID-token verification needs only the project id (Google's public keys).
 * Privileged writes (admin provisioning) use a service account supplied via
 * GOOGLE_APPLICATION_CREDENTIALS — never committed, never NEXT_PUBLIC_*.
 */

import "server-only";
import { getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function projectId(): string | undefined {
  return process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
}

function adminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;
  return initializeApp({ projectId: projectId() });
}

export type VerifiedCaller = { uid: string; email: string | null; emailVerified: boolean };

/** Returns the caller from a `Authorization: Bearer <Firebase ID token>` header, or null. */
export async function verifyCaller(req: Request): Promise<VerifiedCaller | null> {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+([A-Za-z0-9._-]+)$/);
  if (!match || !projectId()) return null;
  try {
    // Signature/expiry/audience check via Google's public keys. Revocation
    // checks need a service account, so they are not enabled here.
    const decoded = await getAuth(adminApp()).verifyIdToken(match[1]!);
    return { uid: decoded.uid, email: decoded.email ?? null, emailVerified: decoded.email_verified === true };
  } catch {
    return null;
  }
}
