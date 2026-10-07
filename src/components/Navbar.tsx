"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { KreaLinkLogo } from "./KreaLinkLogo";

export function Navbar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Discover Talent", href: "/discover" },
    { label: "Brand Hub & Briefs", href: "/brand" },
    { label: "Creator Studio", href: "/creator-studio" },
  ];

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "border-b border-white/[0.08] bg-[#07080c]/90 shadow-2xl backdrop-blur-2xl"
          : "border-b border-transparent bg-[#07080c]/60 backdrop-blur-md"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 md:px-8">
        {/* Editorial Logo */}
        <Link href="/" className="group flex items-center gap-3">
          <KreaLinkLogo size={36} glow={true} className="transition-transform group-hover:scale-105" />

          <div className="flex flex-col">
            <span className="font-heading text-base font-bold tracking-tight text-white transition group-hover:text-indigo-300">
              KreaLink
            </span>
            <span className="text-[10px] font-mono tracking-wider uppercase text-slate-400">
              AI Creator Marketplace
            </span>
          </div>
        </Link>

        {/* Primary Desktop Navigation Links */}
        <div className="hidden items-center gap-1 rounded-full border border-white/[0.08] bg-[#0c0e15]/80 p-1 backdrop-blur-xl md:flex">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/" && pathname?.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? "bg-white text-black font-bold shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right CTA / Action Cluster */}
        <div className="flex items-center gap-3">
          <Link
            href="/brand?tab=create-brief"
            className="hidden items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold text-indigo-300 transition-all hover:border-indigo-500/50 hover:bg-indigo-500/20 active:scale-95 sm:inline-flex"
          >
            <span className="text-indigo-400 font-bold">+</span>
            <span>New Brief</span>
          </Link>

          <Link
            href="/join-creator"
            className="hidden rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-white/75 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white lg:inline-block"
          >
            Join as Creator
          </Link>

          <Link
            href={user ? "/me" : "/login"}
            className="flex h-8.5 w-8.5 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-xs font-semibold text-white/70 transition hover:border-white/25 hover:bg-white/[0.08] hover:text-white"
            title={user ? "My Profile" : "Sign In"}
          >
            {user ? (
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </Link>
        </div>
      </nav>
    </header>
  );
}
