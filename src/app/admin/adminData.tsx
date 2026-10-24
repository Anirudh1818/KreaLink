"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AuditLogDoc, UserDoc, VerificationDoc } from "@/lib/auth/schema";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/verifications", label: "Verification Queue & Approvals" },
  { href: "/admin/users", label: "All Accounts & Surveillance" },
  { href: "/admin/audit", label: "Security & Audit Trail" },
];

export function AdminHeader({ title, subtitle }: { title: string; subtitle: string }) {
  const pathname = usePathname();
  return (
    <div className="space-y-4">
      <div className="kl-header p-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-lime-300/80">Admin Portal · internal</p>
        <h1 className="mt-1 text-[22px] font-bold">{title}</h1>
        <p className="mt-1 text-[13px] text-white/65">{subtitle}</p>
      </div>
      <nav className="kl-glass-tabs inline-flex flex-wrap gap-1 p-1" aria-label="Admin sections">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-xl px-4 py-1.5 text-xs font-semibold transition ${active ? "kl-btn-lime" : "text-white/65 hover:text-white"}`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export type WithId<T> = T & { id: string };

/** All verification records (admin-only read; rules deny everyone else). */
export function useVerifications(): { rows: WithId<VerificationDoc>[]; error: string | null; loading: boolean } {
  const [state, setState] = useState<{ rows: WithId<VerificationDoc>[]; error: string | null; loading: boolean }>({ rows: [], error: null, loading: true });
  useEffect(
    () =>
      onSnapshot(
        collection(db, "verifications"),
        (s) => setState({ rows: s.docs.map((d) => ({ id: d.id, ...(d.data() as VerificationDoc) })), error: null, loading: false }),
        () => setState({ rows: [], error: "You don't have access to verification records.", loading: false })
      ),
    []
  );
  return state;
}

/** Audit entries, newest first; optionally for one target account. */
export function useAuditLog(targetUid?: string, max = 100) {
  const [rows, setRows] = useState<WithId<AuditLogDoc>[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    // Single-field filter + client sort avoids needing a composite index.
    const q = targetUid
      ? query(collection(db, "auditLogs"), where("targetUid", "==", targetUid))
      : query(collection(db, "auditLogs"), orderBy("at", "desc"), limit(max));
    return onSnapshot(
      q,
      (s) => {
        const list = s.docs.map((d) => ({ id: d.id, ...(d.data() as AuditLogDoc) }));
        list.sort((a, b) => millis(b.at) - millis(a.at));
        setRows(list);
        setError(null);
      },
      () => setError("You don't have access to the audit log.")
    );
  }, [targetUid, max]);
  return { rows, error };
}

/** Real-time surveillance of all registered users in Firestore. */
export function useAllUsers(): { rows: WithId<UserDoc>[]; error: string | null; loading: boolean } {
  const [state, setState] = useState<{ rows: WithId<UserDoc>[]; error: string | null; loading: boolean }>({
    rows: [],
    error: null,
    loading: true,
  });
  useEffect(
    () =>
      onSnapshot(
        collection(db, "users"),
        (s) => setState({ rows: s.docs.map((d) => ({ id: d.id, ...(d.data() as UserDoc) })), error: null, loading: false }),
        () => setState({ rows: [], error: "You don't have permission to list platform users.", loading: false })
      ),
    []
  );
  return state;
}

export function millis(t: unknown): number {
  if (t && typeof t === "object" && "toMillis" in t && typeof (t as { toMillis: unknown }).toMillis === "function") {
    return (t as { toMillis: () => number }).toMillis();
  }
  return typeof t === "number" ? t : 0;
}

export function fmtTime(t: unknown): string {
  const ms = millis(t);
  return ms ? new Date(ms).toLocaleString() : "—";
}
