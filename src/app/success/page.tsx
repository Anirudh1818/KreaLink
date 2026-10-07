"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useStoredTheme } from "@/lib/use-theme";
import { Navbar } from "@/components/Navbar";

const steps = [
  {
    title: "AI Match & Brief Verification",
    description: "Campaign requirements and creator compatibility verified against platform signals.",
    icon: "⚡",
  },
  {
    title: "Direct Studio Notification",
    description: "The creator receives your brief and proposal directly inside their Creator Studio.",
    icon: "📬",
  },
  {
    title: "Production & Commercial Delivery",
    description: "Full production tracking with verified AI models, tools, and commercial licensing guarantees.",
    icon: "🛡️",
  },
];

function SuccessContent() {
  const { theme } = useStoredTheme();
  const params = useSearchParams();

  const type = params.get("type") || "invite";
  const creator = params.get("creator") || "";
  const campaign = params.get("campaign") || "Campaign Brief";

  const isInvite = type === "invite";

  return (
    <main className="min-h-screen overflow-hidden bg-[#050508] text-white">
      <Navbar />

      <div className="pointer-events-none fixed inset-0">
        <div
          className="absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full blur-[120px]"
          style={{ background: theme.glow }}
        />
        <div
          className="absolute right-0 top-52 h-[320px] w-[320px] rounded-full blur-[110px]"
          style={{ background: theme.glow, opacity: 0.35 }}
        />
        <div className="absolute bottom-0 left-0 h-[360px] w-[360px] rounded-full bg-cyan-700/10 blur-[110px]" />
      </div>

      <section className="relative z-10 mx-auto max-w-4xl px-5 pb-20 pt-12 md:px-8 md:pt-16">
        <div
          className="rounded-[2.7rem] p-[1px]"
          style={{
            background: theme.gradient,
            boxShadow: `0 0 100px ${theme.glow}`,
          }}
        >
          <div className="relative overflow-hidden rounded-[2.65rem] border border-white/10 bg-[#08060d] p-6 text-center md:p-12">
            <div className="pointer-events-none absolute inset-0">
              <div
                className="absolute -right-16 -top-16 h-72 w-72 rounded-full blur-[90px]"
                style={{ background: theme.glow }}
              />
              <div
                className="absolute -left-16 bottom-0 h-72 w-72 rounded-full blur-[90px]"
                style={{ background: theme.glow, opacity: 0.7 }}
              />
            </div>

            <div className="relative mx-auto max-w-3xl">
              <div
                className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] border border-white/10 text-5xl shadow-2xl"
                style={{
                  background: theme.gradient,
                  boxShadow: `0 0 80px ${theme.glow}`,
                }}
              >
                ✨
              </div>

              <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                {isInvite ? "Invitation Dispatched" : "Brief Submitted"}
              </div>

              <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">
                {isInvite ? (
                  <>
                    Collaboration Request
                    <br />
                    <span
                      className="bg-clip-text text-transparent"
                      style={{ backgroundImage: theme.text }}
                    >
                      Sent Successfully.
                    </span>
                  </>
                ) : (
                  <>
                    Creative Campaign Brief
                    <br />
                    <span
                      className="bg-clip-text text-transparent"
                      style={{ backgroundImage: theme.text }}
                    >
                      Published to KreaLink.
                    </span>
                  </>
                )}
              </h2>

              <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-white/60 md:text-lg">
                {isInvite && creator
                  ? `Your invitation for "${campaign}" has been delivered to @${creator}. They will review your brief and match criteria in their Creator Studio.`
                  : `Your creative brief "${campaign}" is now live. AI creators matching your required tools, workflow, and style can be discovered and invited.`}
              </p>

              <div className="mt-10 grid gap-4 text-left md:grid-cols-3">
                {steps.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 backdrop-blur-sm"
                  >
                    <div
                      className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
                      style={{ background: theme.softGradient }}
                    >
                      {item.icon}
                    </div>
                    <h3 className="text-base font-black text-white">{item.title}</h3>
                    <p className="mt-2 text-xs leading-5 text-white/50">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/brand?tab=matches"
                  className="flex-1 rounded-2xl py-4 text-center font-bold text-white transition hover:opacity-95"
                  style={{
                    background: theme.gradient,
                    boxShadow: `0 0 45px ${theme.glow}`,
                  }}
                >
                  View Creator Matches →
                </Link>

                <Link
                  href="/discover"
                  className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] py-4 text-center font-bold text-white/80 transition hover:bg-white/[0.08]"
                >
                  Explore More Creators
                </Link>

                {creator && (
                  <Link
                    href={`/${creator}`}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 text-center font-bold text-white/80 transition hover:bg-white/[0.08]"
                  >
                    @{creator} Profile
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050508] p-12 text-center text-white/50">Loading confirmation...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
