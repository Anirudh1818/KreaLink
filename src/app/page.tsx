import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { KreaMark, Icon } from "@/components/ui/icons";
import { Button, Badge, Avatar, Card, Notice, EmptyState, cn } from "@/components/ui/kit";

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */
function Hero() {
  return (
    <section className="relative overflow-hidden bg-ink px-5 pb-20 pt-16">
      {/* background glow */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-forest-700/25 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-lime-500/10 blur-[80px]" />

      <div className="relative mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold leading-[1.15] tracking-tight text-white sm:text-5xl lg:text-6xl">
          Match the right AI creator.
          <br />
          <span className="bg-gradient-to-r from-lime-400 to-forest-300 bg-clip-text text-transparent">
            Run the work to delivery.
          </span>
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-white/60">
          KreaLink scores and ranks every creator against your brief—content fit, skills, tools,
          portfolio evidence, and commercial readiness—then guides the engagement from shortlisting
          all the way to approved delivery.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button variant="lime" size="lg" icon="chatPlus" href="/brand?tab=create-brief">
            Start a Brief
          </Button>
          <Button variant="glass" size="lg" icon="compass" href="/discover">
            Explore Creators
          </Button>
          <Button variant="glass" size="lg" icon="layers" href="/pipeline">
            View Live Pipeline →
          </Button>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-[12px] text-white/45">
          {[
            ["6", "Verified AI Creators"],
            ["2", "Live Briefs"],
            ["8", "Matching Signals"],
            ["∞", "Revisions tracked"],
          ].map(([n, label]) => (
            <div key={label} className="flex flex-col items-center gap-0.5">
              <span className="text-2xl font-bold text-white">{n}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Feature cards                                                       */
/* ------------------------------------------------------------------ */
type FeatureCardProps = {
  icon: string;
  title: string;
  body: string;
  badge?: string;
  href?: string;
};

function FeatureCard({ icon, title, body, badge, href }: FeatureCardProps) {
  return (
    <div className="kl-card group p-6 transition hover:shadow-md">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-mint-100 text-forest-700">
        <span className="text-[22px]">{icon}</span>
      </div>
      {badge && (
        <Badge tone="lime" className="mb-2">
          {badge}
        </Badge>
      )}
      <h3 className="text-[15px] font-semibold text-strong">{title}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{body}</p>
      {href && (
        <Link
          href={href}
          className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-forest-600 hover:text-forest-800"
        >
          See it in action <Icon name="arrowRight" size={13} />
        </Link>
      )}
    </div>
  );
}

const FEATURES: FeatureCardProps[] = [
  {
    icon: "🎯",
    title: "Ranked Creator Matching",
    body: "8 scoring signals—content type, skills, tools, portfolio evidence, commercial use, industry aesthetic. Gaps surfaced with CRITICAL / CAUTION / ADVISORY labels.",
    href: "/brand?tab=matches",
  },
  {
    icon: "🔄",
    title: "Engagement Pipeline",
    body: "Shortlisted → Contacted → Accepted → Selected → Production → Delivery. Brand and creator both track progress in one place.",
    href: "/creator-studio",
  },
  {
    icon: "📋",
    title: "Revision Tracking",
    body: "Feedback tied to a specific version, creator response with new upload, full history of who requested what and when, per-round status.",
    href: "/creator-studio",
  },
  {
    icon: "⚖️",
    title: "Licensing Compliance",
    body: "Brand requirements (usage, territory, duration, platforms, exclusivity) matched against what each creator offers. Mismatches flagged before selection.",
    href: "/discover",
  },
  {
    icon: "🤖",
    title: "Auto-Shortlist Agent",
    body: "Paste your brief. The agent ranks the full creator catalog, explains every pick, and proposes a shortlist the brand can accept, edit or reject.",
    href: "/brand?tab=create-brief",
  },
  {
    icon: "✅",
    title: "Delivery Check",
    body: "Format, aspect ratio, duration and resolution verified from real video metadata. A 16:9 upload against a 9:16 brief is flagged with a fix instruction.",
    href: "/creator-studio",
  },
];

/* ------------------------------------------------------------------ */
/* Journey steps                                                       */
/* ------------------------------------------------------------------ */
const JOURNEY = [
  { n: "01", title: "Create a brief", desc: "Describe your campaign in plain text. AI structures it into a full brief with aspect ratio, skills, tools and licensing needs." },
  { n: "02", title: "Auto-shortlist", desc: "The agent scores every creator and proposes a ranked shortlist with explanations. Accept, edit or remove picks." },
  { n: "03", title: "Review & select", desc: "Compare licensing terms, check portfolio evidence, invite the creators you want. They accept or decline." },
  { n: "04", title: "Production", desc: "Creator works. Brands see status updates. Revisions are tracked per version with timestamped feedback." },
  { n: "05", title: "Delivery", desc: "Creator uploads. Delivery check verifies format and aspect ratio. Brand approves or requests one more round." },
];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function HomePage() {
  return (
    <AppShell>
      <div className="min-h-[calc(100dvh-3.5rem)]">
        <Hero />

        {/* Features */}
        <section className="bg-panel px-5 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <FeatureCard key={f.title} {...f} />
              ))}
            </div>
          </div>
        </section>

        {/* Journey */}
        <section className="px-5 py-16">
          <div className="mx-auto max-w-4xl">
            <div className="mb-10 text-center">
              <h2 className="text-[26px] font-bold text-white">The full creator journey</h2>
              <p className="mt-2 text-[13px] text-white/55">
                A judge can follow every step from a new brief through to approved delivery.
              </p>
            </div>
            <div className="space-y-3">
              {JOURNEY.map((s) => (
                <div
                  key={s.n}
                  className="flex items-start gap-4 rounded-2xl bg-white/[0.04] px-5 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-forest-800 text-[13px] font-bold text-lime-400">
                    {s.n}
                  </span>
                  <div>
                    <p className="text-[14px] font-semibold text-white">{s.title}</p>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-white/55">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Demo CTA */}
        <section className="px-5 pb-20">
          <div className="mx-auto max-w-2xl">
            <div className="kl-header overflow-hidden rounded-[24px] p-8 text-center">
              <div className="mb-3 flex justify-center">
                <KreaMark size={44} />
              </div>
              <h2 className="text-[22px] font-bold">Try the full demo now</h2>
              <p className="mt-2 text-[13px] text-white/65">
                Apex Athletics × 6 verified AI creators. Two briefs — 9:16 reel and 16:9 film.
                Ranked matches, licensing compliance, revision history, delivery check.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button variant="lime" size="md" icon="chatPlus" href="/brand?tab=create-brief">
                  Open Brand Hub
                </Button>
                <Button variant="glass" size="md" icon="compass" href="/discover">
                  Browse Creators
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
