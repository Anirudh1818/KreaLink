"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { KreaMark, Icon, type IconName } from "@/components/ui/icons";
import { Avatar, Badge, IconButton, Button, cn } from "@/components/ui/kit";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type NavLink = { href: string; label: string; icon: IconName };

const TOP_LINKS: NavLink[] = [
  { href: "/discover", label: "Discover", icon: "compass" },
  { href: "/brand", label: "Brand Hub", icon: "briefcase" },
  { href: "/creator-studio", label: "Studio", icon: "film" },
  { href: "/pipeline", label: "Pipeline", icon: "layers" },
];

const SIDEBAR_TOOLS: NavLink[] = [
  { href: "/brand?tab=create-brief", label: "New Brief", icon: "chatPlus" },
  { href: "/brand?tab=matches", label: "Talent Analytics", icon: "chart" },
  { href: "/brand?tab=matches", label: "Compare Creators", icon: "compare" },
];

/* ------------------------------------------------------------------ */
/* Brief history (reads localStorage, falls back to demo stubs)       */
/* ------------------------------------------------------------------ */

type BriefStub = { id: string; label: string; status: "active" | "draft" | "closed" };

function useBriefHistory(): BriefStub[] {
  const [stubs, setStubs] = useState<BriefStub[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("krealink-briefs");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setStubs(parsed.slice(0, 6) as BriefStub[]);
          return;
        }
      }
    } catch { /* ignore */ }
    // Demo stubs
    setStubs([
      { id: "brief-sneaker-01", label: "Sneaker Reel (9:16)", status: "active" },
      { id: "brief-apparel-02", label: "Apparel Film (16:9)", status: "active" },
    ]);
  }, []);
  return stubs;
}

const STATUS_COLOR: Record<BriefStub["status"], "green" | "amber" | "gray"> = {
  active: "green",
  draft: "amber",
  closed: "gray",
};

/* ------------------------------------------------------------------ */
/* Top-level Navbar                                                    */
/* ------------------------------------------------------------------ */

function TopNav({
  sidebarOpen,
  onMenuToggle,
}: {
  sidebarOpen: boolean;
  onMenuToggle: () => void;
}) {
  const pathname = usePathname();
  const { user, signOutUser } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close user menu on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center border-b border-white/[0.08] bg-ink/90 px-3 backdrop-blur-xl">
      {/* Left: hamburger + logo */}
      <div className="flex items-center gap-2">
        <IconButton
          icon="menu"
          tone="glass"
          size={34}
          label={sidebarOpen ? "Close menu" : "Open menu"}
          onClick={onMenuToggle}
          className="md:hidden"
        />
        <Link href="/" className="flex items-center gap-2 rounded-lg px-1 py-1 transition hover:opacity-90">
          <KreaMark size={28} />
          <span className="hidden text-[14px] font-semibold tracking-tight text-white sm:block">
            KreaLink
          </span>
        </Link>
      </div>

      {/* Centre nav */}
      <nav className="mx-auto hidden items-center gap-0.5 md:flex">
        {TOP_LINKS.map((l) => {
          const active = pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-medium transition",
                active ? "bg-white/10 text-white" : "text-white/65 hover:text-white"
              )}
            >
              <Icon name={l.icon} size={13} />
              {l.label}
            </Link>
          );
        })}
      </nav>

      {/* Right: actions + avatar */}
      <div className="ml-auto flex items-center gap-1.5">
        <IconButton icon="search" tone="glass" size={34} label="Search" href="/discover" />
        <IconButton icon="bell" tone="glass" size={34} label="Notifications" badge={2} onClick={() => {}} />
        <IconButton icon="settings" tone="glass" size={34} label="Settings" href="/me" className="hidden sm:flex" />

        {/* Avatar / user menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((p) => !p)}
            className="ml-1 flex items-center gap-2 rounded-full p-0.5 ring-2 ring-white/15 transition hover:ring-lime-400/50"
          >
            <Avatar
              src={user?.photoURL ?? undefined}
              name={user?.displayName || user?.email || "Guest"}
              size={28}
            />
          </button>
          {menuOpen && (
            <div className="animate-pop absolute right-0 top-10 z-50 w-52 overflow-hidden rounded-2xl bg-[#1a1b1b] shadow-2xl ring-1 ring-white/10">
              <div className="px-4 py-3">
                <p className="text-[12px] font-semibold text-white truncate">{user?.displayName || "Guest"}</p>
                <p className="text-[11px] text-white/50 truncate">{user?.email ?? "Not signed in"}</p>
              </div>
              <div className="border-t border-white/8 py-1">
                <Link
                  href="/me"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-[12px] text-white/75 hover:bg-white/8 hover:text-white"
                >
                  <Icon name="user" size={13} /> Account
                </Link>
                <Link
                  href="/creator-studio"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-[12px] text-white/75 hover:bg-white/8 hover:text-white"
                >
                  <Icon name="film" size={13} /> Creator Studio
                </Link>
              </div>
              <div className="border-t border-white/8 py-1">
                {user ? (
                  <button
                    type="button"
                    onClick={() => { signOutUser(); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-[12px] text-rose-400 hover:bg-rose-500/10"
                  >
                    <Icon name="logout" size={13} /> Sign Out
                  </button>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-[12px] text-lime-300 hover:bg-lime-400/10"
                  >
                    <Icon name="arrowRight" size={13} /> Sign In
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Dark Sidebar                                                        */
/* ------------------------------------------------------------------ */

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const briefHistory = useBriefHistory();

  return (
    <>
      {/* Backdrop (mobile) */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-[2px] md:hidden"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <aside
        className={cn(
          "fixed left-0 top-14 z-40 flex h-[calc(100dvh-3.5rem)] w-64 flex-col overflow-y-auto border-r border-white/[0.07] bg-rail transition-transform duration-200 rail-scroll",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* MENU section */}
        <div className="px-3 pt-4">
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-rail-muted">
            Menu
          </p>
          {SIDEBAR_TOOLS.map((l) => {
            const active = pathname.includes(l.href.split("?")[0] ?? "");
            return (
              <Link
                key={l.label}
                href={l.href}
                onClick={onClose}
                className={cn(
                  "mb-0.5 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition",
                  active ? "bg-white/10 text-white" : "text-rail-text hover:bg-white/[0.06] hover:text-white"
                )}
              >
                <Icon name={l.icon} size={14} className={active ? "text-lime-400" : "text-rail-muted"} />
                {l.label}
              </Link>
            );
          })}
        </div>

        {/* HISTORY section */}
        <div className="mt-5 flex-1 px-3">
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-rail-muted">
            Recent Briefs
          </p>
          {briefHistory.length === 0 ? (
            <p className="px-2 text-[11.5px] text-rail-muted">No briefs yet.</p>
          ) : (
            briefHistory.map((b) => (
              <Link
                key={b.id}
                href={`/brand?tab=briefs&brief=${b.id}`}
                onClick={onClose}
                className="mb-1 flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] text-rail-text hover:bg-white/[0.06] hover:text-white"
              >
                <span className="flex-1 truncate">{b.label}</span>
                <Badge tone={STATUS_COLOR[b.status]} dot className="shrink-0">
                  {b.status}
                </Badge>
              </Link>
            ))
          )}
        </div>

        {/* Bottom CTA */}
        <div className="border-t border-white/[0.07] p-3">
          <Button
            variant="lime"
            size="sm"
            icon="chatPlus"
            href="/brand?tab=create-brief"
            className="w-full justify-center"
            onClick={onClose}
          >
            Start New Brief
          </Button>
        </div>
      </aside>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* AppShell wrapper                                                    */
/* ------------------------------------------------------------------ */

export function AppShell({
  children,
  noSidebar,
}: {
  children: ReactNode;
  noSidebar?: boolean;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-ink text-body">
      <TopNav sidebarOpen={sidebarOpen} onMenuToggle={() => setSidebarOpen((p) => !p)} />

      {!noSidebar && (
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}

      {/* Main content shifts right on md when sidebar is shown */}
      <main
        className={cn(
          "pt-14 transition-[margin] duration-200",
          !noSidebar && "md:ml-64"
        )}
      >
        {children}
      </main>
    </div>
  );
}
