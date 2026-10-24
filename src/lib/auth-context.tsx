"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { onIdTokenChanged, signOut as fbSignOut, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase";
import {
  isMemberRole,
  type MemberRole,
  type Principal,
  type VerificationStatus,
} from "./auth/policy";
import type { AdminDoc, UserDoc, VerificationDoc } from "./auth/schema";
import { startPipelineSync } from "./r2/firestoreSync";

export type AuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
};

/**
 * Account state derived from protected Firestore documents. This is for the
 * UI only — firestore.rules re-checks every privileged read and write.
 */
export type Account = {
  ready: boolean;                 // all account docs have loaded
  emailVerified: boolean;
  role: MemberRole | null;
  isAdmin: boolean;               // active grant in admins/{uid}
  adminNeedsMfa: boolean;         // grant requires MFA but this session has none
  userDoc: UserDoc | null;
  verification: VerificationDoc | null;
  status: VerificationStatus;
  principal: Principal;
  needsRoleSetup: boolean;        // signed in, not admin, no users/{uid} yet
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  account: Account;
  /** Reload the Firebase user and force a fresh ID token (e.g. after email verification). */
  refreshAuth: () => Promise<boolean>;
  signOutUser: () => Promise<void>;
};

const ANON_ACCOUNT: Account = {
  ready: true,
  emailVerified: false,
  role: null,
  isAdmin: false,
  adminNeedsMfa: false,
  userDoc: null,
  verification: null,
  status: "unverified",
  principal: { kind: "anonymous" },
  needsRoleSetup: false,
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  account: { ...ANON_ACCOUNT, ready: false },
  refreshAuth: async () => false,
  signOutUser: async () => {},
});

type DocState<T> = { uid: string | null; data: T | null };
const UNLOADED = { uid: null, data: null };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [fbUser, setFbUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);
  const [hasSecondFactor, setHasSecondFactor] = useState(false);

  const [userDoc, setUserDoc] = useState<DocState<UserDoc>>(UNLOADED);
  const [adminDoc, setAdminDoc] = useState<DocState<AdminDoc>>(UNLOADED);
  const [verification, setVerification] = useState<DocState<VerificationDoc>>(UNLOADED);

  // Firebase is the only source of identity. Drop the legacy, client-forgeable
  // "local session" left by earlier builds.
  useEffect(() => {
    try {
      localStorage.removeItem("krealink_local_user");
    } catch { /* ignore */ }

    let unsubscribe = () => {};
    try {
      unsubscribe = onIdTokenChanged(
        auth,
        async (next) => {
          setFbUser(next);
          if (next) {
            const token = await next.getIdTokenResult();
            setEmailVerified(token.claims.email_verified === true);
            const fb = token.claims.firebase as { sign_in_second_factor?: string } | undefined;
            setHasSecondFactor(!!fb?.sign_in_second_factor);
          } else {
            setEmailVerified(false);
            setHasSecondFactor(false);
          }
          setLoading(false);
        },
        (error) => {
          console.warn("Firebase auth state note:", error?.message || error);
          setLoading(false);
        }
      );
    } catch {
      queueMicrotask(() => setLoading(false));
    }
    return () => unsubscribe();
  }, []);

  // Live account documents for the signed-in user. State is keyed by uid so
  // data from a previous account is never used after switching users.
  const uid = fbUser?.uid ?? null;
  useEffect(() => {
    if (!uid) return;
    const subs = [
      onSnapshot(
        doc(db, "users", uid),
        (s) => setUserDoc({ uid, data: s.exists() ? (s.data() as UserDoc) : null }),
        () => setUserDoc({ uid, data: null })
      ),
      onSnapshot(
        doc(db, "admins", uid),
        (s) => setAdminDoc({ uid, data: s.exists() ? (s.data() as AdminDoc) : null }),
        () => setAdminDoc({ uid, data: null })
      ),
      onSnapshot(
        doc(db, "verifications", uid),
        (s) => setVerification({ uid, data: s.exists() ? (s.data() as VerificationDoc) : null }),
        () => setVerification({ uid, data: null })
      ),
    ];
    return () => subs.forEach((u) => u());
  }, [uid]);

  const account = useMemo<Account>(() => {
    if (!fbUser) return { ...ANON_ACCOUNT, ready: !loading };
    const mine = <T,>(s: DocState<T>) => (s.uid === fbUser.uid ? s.data : null);
    const ready = userDoc.uid === fbUser.uid && adminDoc.uid === fbUser.uid && verification.uid === fbUser.uid;
    const userData = mine(userDoc);
    const adminData = mine(adminDoc);
    const grant = adminData?.active === true;
    const isAdmin = grant && (!adminData?.requireMfa || hasSecondFactor);
    const role = isMemberRole(userData?.role) ? userData!.role : null;
    const vData = mine(verification);
    const v = vData && vData.role === role ? vData : null;
    const principal: Principal = isAdmin ? { kind: "admin" } : role ? { kind: "member", role } : { kind: "anonymous" };
    return {
      ready,
      emailVerified,
      role,
      isAdmin,
      adminNeedsMfa: grant && !isAdmin,
      userDoc: userData,
      verification: v,
      status: v?.status ?? "unverified",
      principal,
      needsRoleSetup: ready && !grant && !role,
    };
  }, [fbUser, loading, emailVerified, hasSecondFactor, userDoc, adminDoc, verification]);

  // Shared brand↔creator engagements sync through Firestore for signed-in members.
  const syncUid = account.ready && !account.isAdmin && account.role ? fbUser?.uid ?? null : null;
  const syncRole = account.role;
  useEffect(() => {
    if (!syncUid || !syncRole) return;
    return startPipelineSync(syncUid, syncRole);
  }, [syncUid, syncRole]);

  const user = useMemo<AuthUser | null>(
    () => (fbUser ? { uid: fbUser.uid, email: fbUser.email, displayName: fbUser.displayName, photoURL: fbUser.photoURL } : null),
    [fbUser]
  );

  const refreshAuth = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) return false;
    await current.reload();
    const token = await current.getIdTokenResult(true);
    const verified = token.claims.email_verified === true;
    setEmailVerified(verified);
    return verified;
  }, []);

  const signOutUser = useCallback(async () => {
    try {
      await fbSignOut(auth);
    } catch { /* ignore */ }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, account, refreshAuth, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
