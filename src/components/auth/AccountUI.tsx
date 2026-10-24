"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, Button, Notice } from "@/components/ui/kit";
import { useAuth } from "@/lib/auth-context";
import type { Account } from "@/lib/auth-context";
import { STATUS_LABEL, STATUS_MESSAGE, type AccessDecision, type MemberRole, type VerificationStatus } from "@/lib/auth/policy";

const STATUS_TONE: Record<VerificationStatus, "green" | "red" | "amber" | "gray" | "blue"> = {
  unverified: "gray",
  pending_review: "blue",
  verified: "green",
  rejected: "red",
  suspended: "red",
  info_required: "amber",
};

export function VerificationBadge({ status, className }: { status: VerificationStatus; className?: string }) {
  return (
    <Badge tone={STATUS_TONE[status]} icon={status === "verified" ? "shield" : undefined} dot={status !== "verified"} className={className}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

const NOTICE_TONE: Record<VerificationStatus, "info" | "success" | "warn" | "danger"> = {
  unverified: "info",
  pending_review: "info",
  verified: "success",
  rejected: "danger",
  suspended: "danger",
  info_required: "warn",
};

/** Applicant-facing status. Shows the decision reason, never reviewer identity. */
export function AccountStatusPanel({ account, action }: { account: Account; action?: ReactNode }) {
  const { status, verification, role, emailVerified } = account;
  if (!emailVerified) {
    return (
      <Notice tone="warn" title="Verify your email address" action={<Link href="/verify-email" className="text-[12px] font-semibold text-forest-700 underline">Verify now</Link>}>
        We sent a verification link to your inbox. Everything works now — verifying your email is only needed for the optional Verified badge.
      </Notice>
    );
  }
  const showReason = (status === "rejected" || status === "info_required" || status === "suspended") && verification?.decisionReason;
  return (
    <Notice
      tone={NOTICE_TONE[status]}
      title={
        <span className="flex flex-wrap items-center gap-2">
          {role === "brand" ? "Brand" : "Creator"} verification <VerificationBadge status={status} />
        </span>
      }
      action={action}
    >
      <p>{STATUS_MESSAGE[status]}</p>
      {showReason && (
        <p className="mt-1">
          <span className="font-semibold">Reviewer note:</span> {verification!.decisionReason}
        </p>
      )}
    </Notice>
  );
}

/** Inline explanation shown where a restricted action is disabled. */
export function RestrictedNotice({ decision, href }: { decision: AccessDecision; href?: string }) {
  if (decision.allowed) return null;
  return (
    <Notice tone="warn" title="Verification required">
      {decision.reason}
      {href && (
        <>
          {" "}
          <Link href={href} className="font-semibold underline">
            Go to verification
          </Link>
        </>
      )}
    </Notice>
  );
}

/**
 * Top-of-workspace banner: demo notice for visitors, verification status and
 * next step for members, a compact badge once verified.
 */
export function PortalAccessBanner({ role }: { role: MemberRole }) {
  const { user, account } = useAuth();
  if (!account.ready || account.isAdmin) return null;
  const label = role === "brand" ? "brand" : "creator";
  const verifyHref = role === "brand" ? "/brand/verification" : "/creator/verification";

  if (!user) {
    return (
      <Notice
        tone="agent"
        title="You're viewing the demo workspace"
        action={
          <span className="flex flex-wrap gap-2">
            <Button variant="lime" size="sm" href={`/${role}/signup`}>Sign up as a {label}</Button>
            <Button variant="glass" size="sm" href={`/login?next=/${role === "brand" ? "brand" : "creator"}`}>Sign in</Button>
          </span>
        }
      >
        Explore freely with sample data. To {role === "brand" ? "invite creators and start paid campaigns" : "accept brand invitations and get paid"}, create a {label} account and complete verification.
      </Notice>
    );
  }

  if (account.role !== role) return null;

  if (account.emailVerified && account.status === "verified") {
    return (
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-white/70">
        <VerificationBadge status="verified" /> Verified {label} — all {label} features are unlocked.
      </div>
    );
  }

  return (
    <AccountStatusPanel
      account={account}
      action={
        account.emailVerified && (account.status === "unverified" || account.status === "info_required") ? (
          <Button variant="forest" size="sm" href={verifyHref}>
            {account.status === "info_required" ? "Update application" : "Get Verified badge (optional)"}
          </Button>
        ) : account.emailVerified ? (
          <Link href={verifyHref} className="text-[12px] font-semibold underline">View application</Link>
        ) : undefined
      }
    />
  );
}

export function PortalLoading({ label = "Checking your access…" }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="text-sm font-semibold text-white/50">{label}</p>
    </div>
  );
}
