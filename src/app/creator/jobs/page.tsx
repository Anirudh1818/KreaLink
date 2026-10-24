"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { AppShell } from "@/components/AppShell";
import { Button, Notice } from "@/components/ui/kit";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { DEMO_CREATORS } from "@/lib/demoData";
import type { CreatorProfile } from "@/lib/types";
import { evaluateCreatorMatch2 } from "@/lib/ai/matchingEngine2";
import { canPerform } from "@/lib/auth/policy";
import {
  PITCH_MAX,
  applyToJob,
  useApplications,
  useOpenJobs,
  validatePitch,
  withdrawApplication,
  type Job,
  type JobApplication,
} from "@/lib/jobs/store";

const STATUS_STYLE: Record<JobApplication["status"], string> = {
  applied: "bg-amber-500/15 text-amber-300",
  shortlisted: "bg-lime-500/15 text-lime-300",
  declined: "bg-rose-500/15 text-rose-300",
  withdrawn: "bg-white/10 text-white/50",
};

/** The signed-in creator's published profile (needed to apply and to score matches). */
function useMyCreatorProfile(username: string | undefined): { profile: CreatorProfile | null; loading: boolean } {
  const [state, setState] = useState<{ key: string; profile: CreatorProfile | null }>({ key: "", profile: null });
  useEffect(() => {
    if (!username) return;
    let live = true;
    getDoc(doc(db, "creators", username))
      .then((s) => live && setState({ key: username, profile: s.exists() ? (s.data() as CreatorProfile) : null }))
      .catch(() => live && setState({ key: username, profile: null }));
    return () => {
      live = false;
    };
  }, [username]);
  if (!username) return { profile: null, loading: false };
  return { profile: state.key === username ? state.profile : null, loading: state.key !== username };
}

function JobCard({
  job,
  creator,
  application,
  canApply,
  blockedReason,
  onApply,
}: {
  job: Job;
  creator: CreatorProfile | null;
  application?: JobApplication;
  canApply: boolean;
  blockedReason: string | null;
  onApply: (job: Job, pitch: string) => Promise<void>;
}) {
  const match = useMemo(() => (creator ? evaluateCreatorMatch2(job, creator) : null), [job, creator]);
  const [open, setOpen] = useState(false);
  const [pitch, setPitch] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    const problem = validatePitch(pitch);
    if (problem) return setErr(problem);
    setBusy(true);
    setErr("");
    try {
      await onApply(job, pitch);
      setOpen(false);
    } catch (e) {
      const code = (e as { code?: string }).code;
      setErr(code === "permission-denied" ? "You've already applied to this job, or your profile isn't published yet." : (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-white">{job.campaignName}</h3>
            {job.source === "demo" && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase text-white/50">Demo job</span>}
          </div>
          <p className="text-[12px] text-white/50">
            {job.brandName ?? "Brand"} · {job.contentType} · {job.aspectRatio.split(" ")[0]} · {job.platform}
          </p>
        </div>
        {match && (
          <div className="text-right">
            <p className={`text-xl font-black tabular-nums ${match.overallScore >= 70 ? "text-lime-300" : "text-amber-300"}`}>{match.overallScore}%</p>
            <p className="text-[10px] uppercase tracking-wider text-white/40">your match</p>
          </div>
        )}
      </div>
      <p className="text-[13px] text-white/70 line-clamp-3">{job.requirements}</p>
      <div className="flex flex-wrap gap-1.5">
        {job.deliverables.slice(0, 3).map((d) => (
          <span key={d} className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-white/60">{d}</span>
        ))}
        {job.commercialUse && <span className="rounded-md bg-lime-500/10 px-2 py-0.5 text-[11px] text-lime-300">Commercial use</span>}
      </div>
      {match && <p className="text-[11px] text-white/45">{match.whyExplanation}</p>}

      {application ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_STYLE[application.status]}`}>
            {application.status === "applied" ? "Applied — waiting for the brand" : application.status === "shortlisted" ? "Shortlisted! Check Active Engagements" : application.status === "declined" ? "Not selected" : "Withdrawn"}
          </span>
          {application.status === "applied" && (
            <button type="button" onClick={() => void withdrawApplication(application)} className="text-[11px] text-white/50 underline hover:text-white">
              Withdraw
            </button>
          )}
          {application.status === "shortlisted" && (
            <Link href="/creator-studio?tab=engagements" className="text-[11px] font-semibold text-lime-300 underline">Open engagement →</Link>
          )}
        </div>
      ) : open ? (
        <div className="space-y-2">
          <textarea
            rows={3}
            maxLength={PITCH_MAX}
            value={pitch}
            onChange={(e) => setPitch(e.target.value)}
            placeholder="Why you're a great fit: similar work, tools you'd use, how you'd approach it…"
            className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-lime-400/50"
          />
          {err && <p className="text-xs font-semibold text-rose-400">{err}</p>}
          <div className="flex gap-2">
            <Button variant="lime" size="sm" onClick={submit} disabled={busy}>{busy ? "Sending…" : "Send application"}</Button>
            <Button variant="glass" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="lime" size="sm" icon="send" onClick={() => setOpen(true)} disabled={!canApply}>Apply</Button>
          {blockedReason && <span className="text-[11px] text-white/50">{blockedReason}</span>}
        </div>
      )}
    </li>
  );
}

export default function CreatorJobsPage() {
  const { user, account } = useAuth();
  const { jobs, loading } = useOpenJobs();
  const username = account.userDoc?.creatorUsername;
  const { profile, loading: profileLoading } = useMyCreatorProfile(username);
  // Visitors without an account can browse with a demo creator's profile for match scores.
  const scoringProfile = profile ?? (user ? null : DEMO_CREATORS[0]!.creator);
  const applications = useApplications({ field: "creatorUid", uid: user?.uid ?? null });
  const byBrief = useMemo(() => new Map(applications.map((a) => [a.briefId, a])), [applications]);
  const [q, setQ] = useState("");

  const access = canPerform("creator.acceptInvitation", {
    signedIn: !!user,
    emailVerified: account.emailVerified,
    role: account.role,
    status: account.status,
  });
  const blockedReason = !user
    ? "Sign up as a creator to apply."
    : !access.allowed
    ? access.reason
    : !username
    ? "Publish your creator profile first."
    : null;

  const visible = jobs.filter((j) => {
    const t = `${j.campaignName} ${j.requirements} ${j.contentType} ${j.platform} ${j.brandName ?? ""}`.toLowerCase();
    return !q.trim() || t.includes(q.trim().toLowerCase());
  });

  async function onApply(job: Job, pitch: string) {
    if (!user || !username) throw new Error("Publish your creator profile first.");
    await applyToJob({ job, creatorUid: user.uid, creatorUsername: username, creatorName: profile?.name ?? user.displayName ?? username, pitch });
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-5 px-4 pb-16 pt-6">
        <div className="kl-header p-6">
          <h1 className="text-[22px] font-bold">Find jobs</h1>
          <p className="mt-1 text-[13px] text-white/65">Briefs posted by brands, with how well each one matches your profile.</p>
        </div>

        {user && !username && !profileLoading && (
          <Notice tone="warn" title="Publish your creator profile to apply" action={<Button variant="forest" size="sm" href="/join-creator">Create profile</Button>}>
            Brands review your profile and portfolio when you apply. It takes about two minutes.
          </Notice>
        )}
        {!user && (
          <Notice tone="info" title="Browsing as a visitor" action={<Button variant="forest" size="sm" href="/creator/signup">Join as a creator</Button>}>
            Match scores below use a sample creator profile. Sign up to apply with your own.
          </Notice>
        )}

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search jobs: product video, TikTok, skincare…"
          className="w-full rounded-2xl bg-white/[0.05] border border-white/10 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-lime-400/50"
        />

        {loading && jobs.length === 0 ? (
          <p className="text-sm text-white/40">Loading jobs…</p>
        ) : visible.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-white/50">No jobs match your search.</p>
        ) : (
          <ul className="space-y-3">
            {visible.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                creator={scoringProfile}
                application={byBrief.get(job.id)}
                canApply={!blockedReason}
                blockedReason={blockedReason}
                onApply={onApply}
              />
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
