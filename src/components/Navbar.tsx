"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useStoredTheme } from "@/lib/use-theme";

export function Navbar() {
  const { user } = useAuth();
  const { theme } = useStoredTheme();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07070a]/85 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 md:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-2xl border bg-white/5 text-lg font-black"
            style={{
              borderColor: theme.border,
              boxShadow: `0 0 24px ${theme.glow}`,
            }}
          >
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: theme.text }}
            >
              K
            </span>
          </div>

          <div>
            <h1
              className="bg-clip-text text-xl font-black tracking-tight text-transparent"
              style={{ backgroundImage: theme.text }}
            >
              KreaLink
            </h1>
            <p className="hidden text-[11px] font-bold tracking-wider text-white/45 sm:block">
              AI CREATOR MARKETPLACE
            </p>
          </div>
        </Link>

        {/* Central Nav Links */}
        <div className="hidden items-center gap-1 md:flex">
          <Link
            href="/discover"
            className="rounded-xl px-3.5 py-2 text-sm font-bold text-white/70 transition hover:bg-white/[0.06] hover:text-white"
          >
            Discover Creators
          </Link>
          <Link
            href="/brand"
            className="rounded-xl px-3.5 py-2 text-sm font-bold text-white/70 transition hover:bg-white/[0.06] hover:text-white"
          >
            Brand Hub
          </Link>
          <Link
            href="/creator-studio"
            className="rounded-xl px-3.5 py-2 text-sm font-bold text-white/70 transition hover:bg-white/[0.06] hover:text-white"
          >
            Creator Studio
          </Link>
        </div>

        {/* Right Action CTAs */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/brand?tab=create-brief"
            className="hidden rounded-xl px-4 py-2 text-xs font-black text-white transition hover:scale-[1.02] active:scale-[0.98] sm:inline-block"
            style={{
              background: theme.gradient,
              boxShadow: `0 0 20px ${theme.glow}`,
            }}
          >
            + Create Brief
          </Link>

          <Link
            href="/join-creator"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-bold text-white/80 transition hover:bg-white/[0.08]"
          >
            Join as Creator
          </Link>

          <Link
            href={user ? "/me" : "/login"}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-xs font-bold text-white/70 transition hover:bg-white/[0.1]"
            title={user ? "My Account" : "Sign In"}
          >
            {user ? "👤" : "🔑"}
          </Link>
        </div>
      </nav>
    </header>
  );
}
