"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, signOut as fbSignOut } from "firebase/auth";
import { auth } from "./firebase";

export type AuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  setLocalUser: (u: AuthUser | null) => void;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  setLocalUser: () => {},
  signOutUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check local session storage first for immediate fast hydration
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("krealink_local_user");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.uid) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration-safe localStorage read
            setUser(parsed);
          }
        }
      } catch (err) {
        console.warn("Local auth session read note:", err);
      }
    }

    // 2. Also listen to Firebase auth state if available
    let unsubscribe = () => {};
    try {
      unsubscribe = onAuthStateChanged(
        auth,
        (nextUser) => {
          if (nextUser) {
            const formatted: AuthUser = {
              uid: nextUser.uid,
              email: nextUser.email,
              displayName: nextUser.displayName,
              photoURL: nextUser.photoURL,
            };
            setUser(formatted);
            if (typeof window !== "undefined") {
              localStorage.setItem("krealink_local_user", JSON.stringify(formatted));
            }
          }
          setLoading(false);
        },
        (error) => {
          console.warn("Firebase onAuthStateChanged note:", error?.message || error);
          setLoading(false);
        }
      );
    } catch {
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  function setLocalUser(newUser: AuthUser | null) {
    setUser(newUser);
    if (typeof window !== "undefined") {
      if (newUser) {
        localStorage.setItem("krealink_local_user", JSON.stringify(newUser));
      } else {
        localStorage.removeItem("krealink_local_user");
      }
    }
  }

  async function signOutUser() {
    try {
      await fbSignOut(auth);
    } catch {
      // ignore
    }
    setLocalUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, setLocalUser, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
