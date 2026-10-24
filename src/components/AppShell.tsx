"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { useAuth, type Account } from "@/lib/auth-context";
import { decideRoute, portalForPath } from "@/lib/auth/policy";
import { KreaMark, Icon, type IconName } from "@/components/ui/icons";
import { Avatar, Badge, IconButton, Button, cn } from "@/components/ui/kit";
import { PortalLoading, VerificationBadge } from "@/components/auth/AccountUI";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type NavLink = { href: string; label: string; icon: IconName };

const DISCOVER: NavLink = { href: "/discover", label: "Discover", icon: "compass" };
const POST_BRIEF: NavLink = { href: "/post", label: "Create Post", icon: "chatPlus" };
const BRAND_HUB: NavLink = { href: "/brand", label: "Brand Hub", icon: "briefcase" };
const STUDIO: NavLink = { href: "/creator-studio", label: "Studio", icon: "film" };
const CREATOR_PORTAL: NavLink = { href: "/creator", label: "Creator Portal", icon: "film" };
const FIND_JOBS: NavLink = { href: "/creator/jobs", label: "Find Jobs", icon: "search" };
const PIPELINE: NavLink = { href: "/pipeline", label: "Pipeline", icon: "layers" };
const ADMIN: NavLink = { href: "/admin", label: "Admin", icon: "shield" };
const TOP: NavLink = { href: "/top-creators", label: "Top Creators", icon: "star" };

/** Navigation follows the trusted role; anonymous visitors see the demo set. */
function topLinksFor(account: Account): NavLink[] {
  if (account.isAdmin) return [ADMIN, DISCOVER, TOP, POST_BRIEF];
  if (account.role === "brand") return [POST_BRIEF, DISCOVER, TOP, BRAND_HUB, PIPELINE];
  if (account.role === "creator") return [FIND_JOBS, CREATOR_PORTAL, STUDIO, TOP, POST_BRIEF];
  return [POST_BRIEF, DISCOVER, TOP, BRAND_HUB, STUDIO, PIPELINE];
}

/** Sidebar tools for each portal — roles never see each other's tools. */
type SidebarKind = "brand" | "creator" | "admin";

function sidebarKindFor(account: Account): SidebarKind {
  if (account.isAdmin) return "admin";
  if (account.role === "creator") return "creator";
  return "brand"; // brand members and anonymous demo visitors
}

const SIDEBAR_BY_KIND: Record<SidebarKind, NavLink[]> = {
  brand: [
    { href: "/post", label: "Create Post / Brief", icon: "chatPlus" },
    { href: "/brand?tab=pipeline", label: "Applicants & Pipeline", icon: "inbox" },
    { href: "/brand?tab=matches", label: "Talent Analytics", icon: "chart" },
    { href: "/brand?tab=matches", label: "Compare Creators", icon: "compare" },
  ],
  creator: [
    { href: "/creator", label: "Creator Portal", icon: "home" },
    { href: "/creator/jobs", label: "Find Jobs", icon: "search" },
    { href: "/creator-studio?tab=engagements", label: "Opportunities", icon: "inbox" },
    { href: "/join-creator", label: "Public Profile", icon: "user" },
    { href: "/creator-studio?tab=licensing", label: "Licensing Terms", icon: "scale" },
    { href: "/creator-studio?tab=reviews", label: "Reviews & Ranking", icon: "star" },
    { href: "/creator/verification", label: "Verification", icon: "shield" },
  ],
  admin: [
    { href: "/admin", label: "Overview", icon: "chart" },
    { href: "/admin/verifications", label: "Verification Queue", icon: "shield" },
    { href: "/admin/users", label: "All Accounts", icon: "users" },
    { href: "/admin/reviews", label: "Reviews", icon: "star" },
    { href: "/admin/audit", label: "Audit Trail", icon: "history" },
  ],
};


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
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setStubs(parsed.slice(0, 6) as BriefStub[]);
          return;
        }
      }
    } catch { /* ignore */ }
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
  const { user, account, signOutUser } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const TOP_LINKS = topLinksFor(account);
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
      <div className="ml-auto flex items-center gap-2">
        <Link
          href="/post"
          className="inline-flex items-center gap-1.5 rounded-full bg-lime-400 px-3.5 py-1.5 text-[12px] font-bold text-ink shadow-md transition hover:bg-lime-300 active:scale-95"
        >
          <Icon name="chatPlus" size={13} />
          <span>Post Brief</span>
        </Link>
        <IconButton icon="search" tone="glass" size={34} label="Search" href="/discover" />
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
                {user && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge tone="dark">{account.isAdmin ? "Admin" : account.role ? (account.role === "brand" ? "Brand" : "Creator") : "No role yet"}</Badge>
                    {account.role && !account.isAdmin && <VerificationBadge status={account.status} />}
                  </div>
                )}
              </div>
              <div className="border-t border-white/8 py-1">
                {user ? (
                  <>
                    <Link
                      href="/me"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-[12px] text-white/75 hover:bg-white/8 hover:text-white"
                    >
                      <Icon name="user" size={13} /> Account
                    </Link>
                    {account.role && !account.isAdmin && (
                      <Link
                        href={account.role === "brand" ? "/brand/verification" : "/creator/verification"}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-[12px] text-white/75 hover:bg-white/8 hover:text-white"
                      >
                        <Icon name="shield" size={13} /> Verification
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <Link
                      href="/brand/signup"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-[12px] text-white/75 hover:bg-white/8 hover:text-white"
                    >
                      <Icon name="briefcase" size={13} /> Sign up as a Brand
                    </Link>
                    <Link
                      href="/creator/signup"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-[12px] text-white/75 hover:bg-white/8 hover:text-white"
                    >
                      <Icon name="film" size={13} /> Sign up as a Creator
                    </Link>
                  </>
                )}
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
  const { account } = useAuth();
  const kind = sidebarKindFor(account);
  const tools = SIDEBAR_BY_KIND[kind];

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
          {tools.map((l) => {
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

        {/* Brief history and New Brief CTA are brand-only */}
        {kind === "brand" ? (
        <>
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
            Post a Job
          </Button>
        </div>
        </>
        ) : (
          <div className="flex-1" />
        )}
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
  const router = useRouter();
  const { account } = useAuth();

  // Close sidebar on route change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSidebarOpen(false);
  }, [pathname]);

  // Portal guard (UX only — firestore.rules enforce access on the server).
  const area = portalForPath(pathname);
  const decision = account.ready ? decideRoute(pathname, account.principal) : { allow: true as const };
  const mustPickRole = account.needsRoleSetup && area !== "public" && !pathname.endsWith("/signup") && !pathname.startsWith("/post") && !pathname.startsWith("/create-post");
  const redirectTo = mustPickRole
    ? "/choose-role?setup=1"
    : area === "admin" && account.adminNeedsMfa
    ? "/me"
    : !decision.allow
    ? decision.redirectTo
    : null;
  const blocked = area !== "public" && (!account.ready || redirectTo !== null);

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  return (
    <div className="min-h-screen bg-ink text-white/85">
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
        {blocked ? <PortalLoading label={redirectTo ? "Redirecting…" : undefined} /> : children}
      </main>
    </div>
  );
}
