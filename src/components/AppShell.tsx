"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export type AppShellProps = {
  children: ReactNode;
  role?: "brand" | "creator";
  activeNav?: string;
  onNavClick?: (navKey: string) => void;
  brandName?: string;
  creatorName?: string;
};

export function AppShell({
  children,
  role = "brand",
  activeNav,
  onNavClick,
  brandName = "GlowCo Marketing",
  creatorName = "Anya Sharma",
}: AppShellProps) {
  const { user } = useAuth();
  const pathname = usePathname();

  const brandNavItems = [
    { key: "dashboard", label: "Dashboard", icon: "⊞", href: "/brand?tab=briefs" },
    { key: "find-creators", label: "Find Creators", icon: "🔍", href: "/brand?tab=matches" },
    { key: "campaigns", label: "Campaigns", icon: "📁", href: "/brand?tab=engagements" },
    { key: "messages", label: "Messages", icon: "💬", badge: 3, href: "#" },
    { key: "saved-creators", label: "Saved Creators", icon: "♡", href: "/discover" },
    { key: "analytics", label: "Analytics", icon: "📈", href: "#" },
    { key: "brand-toolkit", label: "Brand Toolkit", icon: "🧰", href: "#" },
  ];

  const creatorNavItems = [
    { key: "dashboard", label: "Dashboard", icon: "⊞", href: "/creator-studio" },
    { key: "my-projects", label: "My Projects", icon: "📁", badge: 2, href: "/creator-studio?tab=invitations" },
    { key: "messages", label: "Messages", icon: "💬", badge: 2, href: "#" },
    { key: "profile-portfolio", label: "Profile & Portfolio", icon: "👤", href: "/creator-studio?tab=portfolio" },
    { key: "analytics", label: "Analytics", icon: "📈", href: "#" },
    { key: "brand-opportunities", label: "Brand Opportunities", icon: "⚡", href: "/discover" },
  ];

  const navItems = role === "creator" ? creatorNavItems : brandNavItems;

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
      <div className="flex flex-1">
        {/* Left Sidebar */}
        <aside className="w-60 shrink-0 bg-[#0c1017] border-r border-white/[0.06] flex flex-col justify-between hidden md:flex sticky top-0 h-screen z-40 select-none">
          <div className="p-4 space-y-6">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 px-2 group">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-black font-black text-xs shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                K
              </div>
              <span className="font-heading font-extrabold text-lg tracking-tight text-white group-hover:text-emerald-300 transition">
                KreaLink
              </span>
            </Link>

            {/* Menu Section */}
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-mono tracking-wider uppercase text-slate-500 font-semibold">
                MENU
              </span>
              <nav className="mt-2 space-y-1">
                {navItems.map((item) => {
                  const isCurrent = activeNav ? activeNav === item.key : pathname.includes(item.key);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        if (onNavClick) onNavClick(item.key);
                        else if (item.href && item.href !== "#") window.location.href = item.href;
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        isCurrent
                          ? "bg-[#122822] text-emerald-400 border border-emerald-500/25 shadow-sm shadow-emerald-950/50"
                          : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`text-sm ${isCurrent ? "text-emerald-400" : "text-slate-400"}`}>
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-black leading-none">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Bottom Settings & User Account Profile */}
          <div className="p-3 border-t border-white/[0.06] space-y-2">
            <button
              type="button"
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.04] transition"
            >
              <span className="text-sm">⚙</span>
              <span>Settings</span>
            </button>

            <Link
              href={role === "creator" ? "/creator-studio" : "/brand"}
              className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] transition"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-bold text-white text-xs shadow-sm">
                {role === "creator" ? "A" : "G"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">
                  {role === "creator" ? creatorName : brandName}
                </p>
                <p className="text-[10px] text-slate-400 capitalize truncate">
                  {role === "creator" ? "Creator Account" : "Brand Account"}
                </p>
              </div>
            </Link>
          </div>
        </aside>

        {/* Main View Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <header className="h-14 border-b border-white/[0.06] bg-[#0c1017]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
            {/* Search Input */}
            <div className="relative w-80 md:w-96">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
              <input
                type="text"
                placeholder={role === "creator" ? "Search brands, projects or messages..." : "Search creators, tools, styles or campaigns..."}
                className="w-full pl-8 pr-14 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500/50 transition"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono text-slate-400">
                Ctrl K
              </span>
            </div>

            {/* Right Profile & Actions */}
            <div className="flex items-center gap-3">
              {/* Role Switcher Pill */}
              <div className="flex items-center rounded-lg bg-black/40 border border-white/10 p-0.5 text-[11px] font-medium">
                <Link
                  href="/brand"
                  className={`px-2.5 py-1 rounded-md transition ${
                    role === "brand" ? "bg-emerald-500/20 text-emerald-300 font-bold" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Brand View
                </Link>
                <Link
                  href="/creator-studio"
                  className={`px-2.5 py-1 rounded-md transition ${
                    role === "creator" ? "bg-emerald-500/20 text-emerald-300 font-bold" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Creator View
                </Link>
              </div>

              {/* Notification Bell */}
              <button
                type="button"
                className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.04] transition"
                title="Notifications"
              >
                <span className="text-sm">🔔</span>
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-[#0c1017]" />
              </button>

              {/* User Avatar */}
              <div className="flex items-center gap-2 pl-2 border-l border-white/[0.08]">
                <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-bold text-white text-xs">
                  {role === "creator" ? "A" : "G"}
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-semibold text-white leading-tight">
                    {role === "creator" ? creatorName : brandName}
                  </p>
                  <p className="text-[10px] text-slate-400 capitalize">
                    {role === "creator" ? "Creator Account" : "Brand Account"}
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* Dynamic Content */}
          <main className="flex-1 p-5 md:p-7 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
