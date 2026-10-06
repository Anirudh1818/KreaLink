"use client";

import Link from "next/link";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useStoredTheme } from "@/lib/use-theme";
import { Navbar } from "@/components/Navbar";

export default function AccountHubPage() {
  const { user, loading } = useAuth();
  const { theme } = useStoredTheme();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050508] px-5 text-white">
        <p className="text-sm font-bold text-white/50">Loading your account...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#050508] text-white">
        <Navbar />
        <div className="flex min-h-[70vh] items-center justify-center px-5">
          <div
            className="w-full max-w-md rounded-[2.2rem] border border-white/10 bg-[#0b0810] p-8 text-center"
            style={{ boxShadow: `0 0 100px ${theme.glow}` }}
          >
            <span className="text-4xl">👤</span>
            <h1 className="mt-4 text-2xl font-black">You are signed out</h1>
            <p className="mt-2 text-xs leading-6 text-white/50">
              Sign in to manage your creator studio, creative briefs, and campaign invitations.
            </p>
            <Link
              href="/login?next=/me"
              className="mt-6 inline-block w-full rounded-2xl py-3.5 text-xs font-black text-white"
              style={{ background: theme.gradient }}
            >
              Sign In to KreaLink
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050508] text-white">
      <Navbar />

      <section className="mx-auto max-w-4xl px-5 py-12 md:px-8">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-1 text-xs font-black uppercase tracking-[0.2em] text-white/50">
              Account Overview
            </div>
            <h2 className="mt-2 text-3xl font-black">{user.displayName || "KreaLink User"}</h2>
            <p className="mt-0.5 text-xs font-bold text-white/50">{user.email}</p>
          </div>

          <button
            onClick={() => signOut(auth)}
            className="w-fit rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-500/10"
          >
            Sign Out
          </button>
        </div>

        {/* Workspace Hub Cards */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {/* Creator Studio Card */}
          <Link
            href="/creator-studio"
            className="group rounded-[2.2rem] border border-white/10 bg-black/40 p-6 transition duration-300 hover:border-white/30 hover:shadow-2xl"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.05] text-2xl">
              🎨
            </div>
            <h3 className="mt-4 text-xl font-black text-white">Creator Studio</h3>
            <p className="mt-1 text-xs leading-5 text-white/55">
              Manage your generative toolchain, AI models, workflow pipeline, and portfolio projects.
            </p>
            <span className="mt-6 inline-block text-xs font-black text-emerald-300 group-hover:underline">
              Open Creator Studio →
            </span>
          </Link>

          {/* Brand Workspace Card */}
          <Link
            href="/brand"
            className="group rounded-[2.2rem] border border-white/10 bg-black/40 p-6 transition duration-300 hover:border-white/30 hover:shadow-2xl"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.05] text-2xl">
              🏢
            </div>
            <h3 className="mt-4 text-xl font-black text-white">Brand Workspace</h3>
            <p className="mt-1 text-xs leading-5 text-white/55">
              Structure creative briefs with AI, match against verified creators, and track engagements.
            </p>
            <span className="mt-6 inline-block text-xs font-black text-cyan-300 group-hover:underline">
              Open Brand Hub →
            </span>
          </Link>
        </div>

        {/* Marketplace Explorer */}
        <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h4 className="font-black text-sm text-white">Discover All AI Creators</h4>
            <p className="text-xs text-white/50">
              Search by tools (Runway, Kling, Midjourney), skills, and commercial readiness.
            </p>
          </div>
          <Link
            href="/discover"
            className="rounded-xl px-5 py-2.5 text-xs font-black text-white text-center"
            style={{ background: theme.gradient }}
          >
            Explore Catalog →
          </Link>
        </div>
      </section>
    </main>
  );
}
