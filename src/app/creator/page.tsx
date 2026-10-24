"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/kit";
import { AccountStatusPanel } from "@/components/auth/AccountUI";
import { useAuth } from "@/lib/auth-context";
import { canPerform } from "@/lib/auth/policy";

const CARDS = [
  { href: "/creator/jobs", title: "Find jobs", body: "Browse briefs brands have posted and apply with a pitch." },
  { href: "/join-creator", title: "Public profile", body: "Your discoverable profile, AI stack and showreel." },
  { href: "/creator-studio?tab=engagements", title: "Opportunities & engagements", body: "Invitations from brands, active projects and stages." },
  { href: "/creator-studio", title: "Submissions & revisions", body: "Upload deliverables, run delivery checks, track v1/v2/v3." },
  { href: "/creator/verification", title: "Verification", body: "Portfolio review and your verification status." },
];

export default function CreatorPortalPage() {
  const { user, account } = useAuth();

  if (!user) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl space-y-4 px-4 py-16 text-center">
          <h1 className="text-[24px] font-bold text-white">Creator Portal</h1>
          <p className="text-[13px] text-white/60">Sign in or create a creator account to manage your profile, opportunities and submissions.</p>
          <div className="flex justify-center gap-2">
            <Button variant="lime" href="/creator/signup">Join as a Creator</Button>
            <Button variant="glass" href="/login?next=/creator">Sign in</Button>
          </div>
        </div>
      </AppShell>
    );
  }

  const accept = canPerform("creator.acceptInvitation", {
    signedIn: true,
    emailVerified: account.emailVerified,
    role: account.role,
    status: account.status,
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-5 px-4 pb-16 pt-6">
        <div className="kl-header p-6">
          <h1 className="text-[22px] font-bold">Welcome, {user.displayName || "creator"}</h1>
          <p className="mt-1 text-[13px] text-white/65">
            {accept.allowed ? "You can accept brand invitations and deliver paid work." : accept.reason}
          </p>
        </div>
        <AccountStatusPanel
          account={account}
          action={account.status !== "verified" ? <Link href="/creator/verification" className="text-[12px] font-semibold underline">Open application</Link> : undefined}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {CARDS.map((c) => (
            <Link key={c.href} href={c.href} className="kl-card block p-5 text-strong transition hover:-translate-y-0.5">
              <h2 className="text-[15px] font-bold">{c.title}</h2>
              <p className="mt-1 text-[12.5px] text-muted">{c.body}</p>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
