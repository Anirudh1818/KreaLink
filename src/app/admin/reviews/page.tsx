"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button, Modal, Notice } from "@/components/ui/kit";
import { Stars } from "@/components/reviews/ReviewUI";
import { useAuth } from "@/lib/auth-context";
import { removeReview, useAllReviews } from "@/lib/reviews/store";
import type { Review } from "@/lib/reviews/types";
import { AdminHeader } from "../adminData";

/** Moderation: admins remove abusive or fraudulent reviews; every removal is audited. */
export default function AdminReviewsPage() {
  const { user } = useAuth();
  const { reviews, loading } = useAllReviews();
  const [target, setTarget] = useState<Review | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const platform = reviews.filter((r) => r.source === "platform").sort((a, b) => b.createdAt - a.createdAt);
  const samples = reviews.filter((r) => r.source === "sample").length;

  async function confirm() {
    if (!target || !user) return;
    setBusy(true);
    try {
      await removeReview(user.uid, target, reason);
      setNotice({ tone: "success", text: `Removed the review by ${target.brandName}. Recorded in the audit trail.` });
      setTarget(null);
      setReason("");
    } catch {
      setNotice({ tone: "danger", text: "Couldn't remove the review. It may already have been removed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-5 px-4 pb-16 pt-6">
        <AdminHeader title="Review moderation" subtitle="Reviews come only from approved engagements. Remove abusive or fraudulent ones — every removal is audited." />
        {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
        <p className="text-[12px] text-white/50">
          {platform.length} platform review(s) · {samples} built-in sample review(s) for demo creators (not moderatable).
        </p>
        {loading ? (
          <p className="text-sm text-white/40">Loading…</p>
        ) : platform.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-white/50">No platform reviews yet.</p>
        ) : (
          <ul className="space-y-3">
            {platform.map((r) => (
              <li key={r.id} className="kl-card flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Stars value={r.rating} />
                    <span className="text-sm font-bold text-strong">{r.brandName}</span>
                    <span className="text-[11px] text-muted">→ @{r.creatorUsername} · {r.campaignTitle}</span>
                  </div>
                  <p className="mt-1 text-[12.5px] text-body">{r.comment}</p>
                  <p className="mt-1 text-[11px] text-muted">
                    {new Date(r.createdAt).toLocaleString()} · engagement {r.engagementId}
                  </p>
                </div>
                <Button variant="danger" size="xs" icon="x" onClick={() => setTarget(r)}>Remove</Button>
              </li>
            ))}
          </ul>
        )}

        <Modal
          open={target !== null}
          onClose={() => !busy && setTarget(null)}
          title="Remove this review?"
          subtitle={target ? `${target.brandName} → @${target.creatorUsername}` : undefined}
          icon="shield"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="light" onClick={() => setTarget(null)} disabled={busy}>Cancel</Button>
              <Button variant="danger" onClick={confirm} disabled={busy || reason.trim().length < 3}>{busy ? "Removing…" : "Remove review"}</Button>
            </div>
          }
        >
          <p className="text-[13px] text-body">The review is deleted permanently and the creator&apos;s rating and ranking are recalculated. Record why:</p>
          <textarea
            className="kl-input mt-3"
            rows={3}
            maxLength={1000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Abusive language / review not related to the delivered work"
          />
        </Modal>
      </div>
    </AppShell>
  );
}
