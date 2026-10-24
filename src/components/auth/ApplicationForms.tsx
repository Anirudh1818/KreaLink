"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { Button, ChipToggle, Field, Notice } from "@/components/ui/kit";
import { AccountStatusPanel, PortalLoading } from "@/components/auth/AccountUI";
import { useAuth } from "@/lib/auth-context";
import { auth } from "@/lib/firebase";
import {
  friendlyAuthError,
  removeEvidence,
  saveApplication,
  uploadEvidence,
} from "@/lib/auth/accountActions";
import { validateGstinFormat } from "@/lib/auth/gstin";
import { EVIDENCE_RETENTION_DAYS, isApplicationEditable, type MemberRole } from "@/lib/auth/policy";
import {
  ALT_BUSINESS_EVIDENCE,
  AVAILABILITY,
  BUSINESS_TYPES,
  LIMITS,
  validateBrandApplication,
  validateCreatorApplication,
  type BrandApplication,
  type CreatorApplication,
  type EvidenceRef,
  type FieldErrors,
} from "@/lib/auth/schema";
import { CANONICAL_FORMATS, CANONICAL_SPECIALIZATIONS, CANONICAL_TOOLS } from "@/lib/ai/taxonomy";

/* ------------------------------------------------------------------ */
/* Defaults & local drafts                                             */
/* ------------------------------------------------------------------ */

const EMPTY_BRAND: BrandApplication = {
  contactName: "",
  legalName: "",
  tradeName: "",
  businessType: "private_limited",
  country: "IN",
  website: "",
  representative: { name: "", designation: "", email: "" },
  hasGstin: false,
  gstin: "",
  altEvidenceType: "",
  registrationNumber: "",
};

const EMPTY_CREATOR: CreatorApplication = {
  displayName: "",
  headline: "",
  bio: "",
  portfolioLinks: [""],
  sampleWorkLinks: [],
  specializations: [],
  formats: [],
  aiTools: [],
  availability: "open",
  offersCommercialLicense: true,
  commercialNotes: "",
  isRegisteredBusiness: false,
  gstin: "",
};

// Drafts stay on this device only; nothing is sent until you submit.
const COUNTRY_OPTIONS: [string, string][] = [
  ["IN", "India"], ["US", "United States"], ["GB", "United Kingdom"], ["AE", "United Arab Emirates"],
  ["SG", "Singapore"], ["DE", "Germany"], ["FR", "France"], ["AU", "Australia"], ["CA", "Canada"],
];

export function draftKey(uid: string, role: MemberRole) {
  return `krealink-application-draft-${role}-${uid}`;
}

function cleanLinks(list: string[]) {
  return list.map((l) => l.trim()).filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

function Err({ e, k }: { e: FieldErrors; k: string }) {
  return e[k] ? <span className="mt-1 block text-[11px] font-medium text-rose-600">{e[k]}</span> : null;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-4 border-t border-line pt-5 first:border-t-0 first:pt-0">
      <div>
        <h3 className="text-[14px] font-bold text-strong">{title}</h3>
        {hint && <p className="mt-0.5 text-[12px] text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function TagPicker({ options, value, onChange }: { options: readonly string[]; value: string[]; onChange: (v: string[]) => void }) {
  return <ChipToggle options={options} value={value} onChange={(v) => onChange(v.slice(0, LIMITS.maxTags))} />;
}

/** Single-choice chip (styled like ChipToggle). */
function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={
        "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-medium transition " +
        (active
          ? "bg-forest-700 text-white shadow-[0_6px_14px_-8px_rgba(16,45,39,0.9)]"
          : "bg-white text-body shadow-[inset_0_0_0_1px_var(--color-line-2)] hover:text-strong")
      }
    >
      {children}
    </button>
  );
}

function LinkList({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const rows = value.length ? value : [""];
  return (
    <div className="space-y-2">
      {rows.map((l, i) => (
        <div key={i} className="flex gap-2">
          <input
            className="kl-input"
            type="url"
            value={l}
            placeholder={placeholder}
            onChange={(e) => onChange(rows.map((x, j) => (j === i ? e.target.value : x)))}
          />
          {rows.length > 1 && (
            <Button variant="ghost" size="sm" icon="x" aria-label="Remove link" onClick={() => onChange(rows.filter((_, j) => j !== i))} />
          )}
        </div>
      ))}
      {rows.length < LIMITS.maxLinks && (
        <Button variant="light" size="xs" icon="plus" onClick={() => onChange([...rows, ""])}>Add link</Button>
      )}
    </div>
  );
}

function EvidenceUploader({
  uid,
  value,
  onChange,
  kinds,
  disabled,
}: {
  uid: string;
  value: EvidenceRef[];
  onChange: (v: EvidenceRef[]) => void;
  kinds: Record<string, string>;
  disabled: boolean;
}) {
  const [kind, setKind] = useState(Object.keys(kinds)[0]!);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const ref_ = await uploadEvidence(uid, file, kind);
      onChange([...value, ref_]);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((e) => (
            <li key={e.path} className="flex items-center justify-between gap-3 rounded-xl bg-[#f7f8f7] px-3 py-2 text-[12px]">
              <span className="min-w-0 truncate">
                <span className="font-semibold">{kinds[e.kind] ?? e.kind}</span> · {e.name} · {(e.size / 1024).toFixed(0)} KB
              </span>
              {!disabled && (
                <button
                  type="button"
                  className="shrink-0 text-rose-600 hover:underline"
                  onClick={async () => {
                    await removeEvidence(e.path);
                    onChange(value.filter((x) => x.path !== e.path));
                  }}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!disabled && value.length < LIMITS.maxEvidence && (
        <div className="flex flex-wrap items-center gap-2">
          <select className="kl-input w-auto" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Document type">
            {Object.entries(kinds).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
          <label className="inline-flex cursor-pointer items-center rounded-full bg-white px-4 py-2 text-[12px] font-semibold shadow-[inset_0_0_0_1px_var(--color-line-2)] hover:bg-[#f6f7f6]">
            {busy ? "Uploading…" : "Choose file"}
            <input
              type="file"
              className="hidden"
              accept={LIMITS.evidenceTypes.join(",")}
              disabled={busy}
              onChange={(e) => {
                void handleFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          <span className="text-[11px] text-muted">PDF, PNG, JPEG or WebP · max 10 MB</span>
        </div>
      )}
      {error && <Notice tone="danger">{error}</Notice>}
      <p className="text-[11px] text-muted">
        Documents are stored privately and are visible only to you and KreaLink reviewers. They&apos;re deleted{" "}
        {EVIDENCE_RETENTION_DAYS} days after a final decision.
      </p>
    </div>
  );
}

function ConsentBox({ checked, onChange, role }: { checked: boolean; onChange: (v: boolean) => void; role: MemberRole }) {
  return (
    <label className="flex items-start gap-2 rounded-xl bg-[#f7f8f7] p-3 text-[12px] text-body">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5" />
      <span>
        I confirm the information is accurate and I&apos;m authorised to submit it
        {role === "brand" ? " on behalf of this business" : ""}. I consent to KreaLink reviewers using it, and any
        documents I upload, only to verify this account. I can ask for my documents to be deleted at any time.
      </span>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* GSTIN helper (format check + honest server check)                   */
/* ------------------------------------------------------------------ */

type ServerCheck = { message: string; tone: "info" | "success" | "warn" | "danger" };

function GstinCheck({ gstin, legalName, tradeName }: { gstin: string; legalName: string; tradeName: string }) {
  const format = gstin.trim() ? validateGstinFormat(gstin) : null;
  const [server, setServer] = useState<ServerCheck | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setServer(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/verification/gstin", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
        body: JSON.stringify({ gstin, legalName, tradeName }),
      });
      const data = await res.json();
      if (!res.ok) return setServer({ tone: "danger", message: data.error ?? "Check failed." });
      if (data.provider?.status === "found") {
        setServer(
          data.verified
            ? { tone: "success", message: "The GST registry matches your business details. A reviewer will still confirm your application." }
            : { tone: "warn", message: "The GST registry record doesn't match the details you entered. Please review them." }
        );
      } else {
        setServer({ tone: "info", message: data.message ?? "This GSTIN will be checked manually by a reviewer." });
      }
    } catch {
      setServer({ tone: "warn", message: "Couldn't reach the verification service. A reviewer will check your GSTIN manually." });
    } finally {
      setBusy(false);
    }
  }

  if (!format) return null;
  return (
    <div className="space-y-2">
      {format.valid ? (
        <p className="text-[11.5px] text-forest-700">
          ✓ Well-formed GSTIN ({format.stateName}). This only checks the format — it does not confirm registration.
        </p>
      ) : (
        <p className="text-[11.5px] text-rose-600">{format.error}</p>
      )}
      {format.valid && legalName.trim().length >= 2 && (
        <Button variant="light" size="xs" icon="search" onClick={run} disabled={busy}>
          {busy ? "Checking…" : "Check with GST registry"}
        </Button>
      )}
      {server && <Notice tone={server.tone}>{server.message}</Notice>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Brand form                                                          */
/* ------------------------------------------------------------------ */

function BrandFields({ a, set, e }: { a: BrandApplication; set: (a: BrandApplication) => void; e: FieldErrors }) {
  return (
    <>
      <Section title="Business details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Legal name" hint="As registered" required>
            <input className="kl-input" value={a.legalName} maxLength={120} onChange={(x) => set({ ...a, legalName: x.target.value })} />
            <Err e={e} k="legalName" />
          </Field>
          <Field label="Trade / brand name" required>
            <input className="kl-input" value={a.tradeName} maxLength={120} onChange={(x) => set({ ...a, tradeName: x.target.value })} />
            <Err e={e} k="tradeName" />
          </Field>
          <Field label="Business type" required>
            <select className="kl-input" value={a.businessType} onChange={(x) => set({ ...a, businessType: x.target.value as BrandApplication["businessType"] })}>
              {Object.entries(BUSINESS_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Field>
          <Field label="Country" required>
            <select className="kl-input" value={a.country} onChange={(x) => set({ ...a, country: x.target.value })}>
              {COUNTRY_OPTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <Err e={e} k="country" />
          </Field>
          <Field label="Website" hint="Optional" className="sm:col-span-2">
            <input className="kl-input" type="url" placeholder="https://" value={a.website} onChange={(x) => set({ ...a, website: x.target.value })} />
            <Err e={e} k="website" />
          </Field>
        </div>
      </Section>

      <Section title="Contact and authorised representative" hint="The person who can act for the business on KreaLink.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name" required>
            <input className="kl-input" value={a.contactName} maxLength={120} onChange={(x) => set({ ...a, contactName: x.target.value })} />
            <Err e={e} k="contactName" />
          </Field>
          <Field label="Representative name" required>
            <input className="kl-input" value={a.representative.name} maxLength={120} onChange={(x) => set({ ...a, representative: { ...a.representative, name: x.target.value } })} />
            <Err e={e} k="representative.name" />
          </Field>
          <Field label="Designation" required>
            <input className="kl-input" value={a.representative.designation} maxLength={120} onChange={(x) => set({ ...a, representative: { ...a.representative, designation: x.target.value } })} />
            <Err e={e} k="representative.designation" />
          </Field>
          <Field label="Representative email" required>
            <input className="kl-input" type="email" value={a.representative.email} onChange={(x) => set({ ...a, representative: { ...a.representative, email: x.target.value } })} />
            <Err e={e} k="representative.email" />
          </Field>
        </div>
      </Section>

      <Section
        title="GST registration (optional)"
        hint="Add your GSTIN if you have one — our team checks it on the official GST portal before awarding the Verified badge. You can post jobs without it."
      >
        <Field label="GSTIN" hint="Optional">
          <input
            className="kl-input font-mono uppercase"
            value={a.gstin}
            maxLength={15}
            placeholder="22AAAAA0000A1Z5"
            onChange={(x) => {
              const gstin = x.target.value.toUpperCase().replace(/\s/g, "");
              set({ ...a, hasGstin: gstin.length > 0, gstin });
            }}
          />
          <Err e={e} k="gstin" />
          <div className="mt-2">
            <GstinCheck gstin={a.gstin} legalName={a.legalName} tradeName={a.tradeName} />
          </div>
        </Field>
        <p className="text-[11.5px] text-muted">
          Make sure the legal name above matches your GST registration exactly — mismatches delay approval.
        </p>
      </Section>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Creator form                                                        */
/* ------------------------------------------------------------------ */

function CreatorFields({ a, set, e }: { a: CreatorApplication; set: (a: CreatorApplication) => void; e: FieldErrors }) {
  return (
    <>
      <Section title="Professional profile">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Display name" required>
            <input className="kl-input" value={a.displayName} maxLength={120} onChange={(x) => set({ ...a, displayName: x.target.value })} />
            <Err e={e} k="displayName" />
          </Field>
          <Field label="Headline" hint="e.g. AI product films for beauty brands" required>
            <input className="kl-input" value={a.headline} maxLength={120} onChange={(x) => set({ ...a, headline: x.target.value })} />
            <Err e={e} k="headline" />
          </Field>
          <Field label="About your work" className="sm:col-span-2" required>
            <textarea className="kl-input" rows={4} maxLength={LIMITS.longText} value={a.bio} onChange={(x) => set({ ...a, bio: x.target.value })} />
            <Err e={e} k="bio" />
          </Field>
        </div>
      </Section>

      <Section title="Portfolio and sample work" hint="Reviewers look at real work. A completed profile alone doesn't verify you.">
        <Field label="Portfolio links" required>
          <LinkList value={a.portfolioLinks} onChange={(v) => set({ ...a, portfolioLinks: v })} placeholder="https://your-portfolio.example" />
          <Err e={e} k="portfolioLinks" />
        </Field>
        <Field label="Sample work" hint="Optional — specific pieces you made">
          <LinkList value={a.sampleWorkLinks} onChange={(v) => set({ ...a, sampleWorkLinks: v })} placeholder="https://vimeo.com/…" />
          <Err e={e} k="sampleWorkLinks" />
        </Field>
      </Section>

      <Section title="What you make">
        <Field label="Specializations" required>
          <TagPicker options={CANONICAL_SPECIALIZATIONS} value={a.specializations} onChange={(v) => set({ ...a, specializations: v })} />
          <Err e={e} k="specializations" />
        </Field>
        <Field label="Formats" required>
          <TagPicker options={CANONICAL_FORMATS} value={a.formats} onChange={(v) => set({ ...a, formats: v })} />
          <Err e={e} k="formats" />
        </Field>
        <Field label="AI tools" required>
          <TagPicker options={CANONICAL_TOOLS} value={a.aiTools} onChange={(v) => set({ ...a, aiTools: v })} />
          <Err e={e} k="aiTools" />
        </Field>
      </Section>

      <Section title="Availability and commercial use">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Availability" required>
            <select className="kl-input" value={a.availability} onChange={(x) => set({ ...a, availability: x.target.value as CreatorApplication["availability"] })}>
              {Object.entries(AVAILABILITY).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Field>
          <Field label="Commercial licensing">
            <div className="flex gap-2 pt-1">
              <Choice active={a.offersCommercialLicense} onClick={() => set({ ...a, offersCommercialLicense: true })}>I license work commercially</Choice>
              <Choice active={!a.offersCommercialLicense} onClick={() => set({ ...a, offersCommercialLicense: false })}>Not yet</Choice>
            </div>
          </Field>
          <Field label="Licensing notes" hint="Optional — territories, exclusivity…" className="sm:col-span-2">
            <textarea className="kl-input" rows={2} maxLength={LIMITS.longText} value={a.commercialNotes} onChange={(x) => set({ ...a, commercialNotes: x.target.value })} />
          </Field>
        </div>
      </Section>

      <Section title="Business or tax details" hint="Optional. Individual creators don't need a GSTIN.">
        <div className="flex flex-wrap gap-2">
          <Choice active={!a.isRegisteredBusiness} onClick={() => set({ ...a, isRegisteredBusiness: false, gstin: "" })}>I work as an individual</Choice>
          <Choice active={a.isRegisteredBusiness} onClick={() => set({ ...a, isRegisteredBusiness: true })}>I invoice through a registered business</Choice>
        </div>
        {a.isRegisteredBusiness && (
          <Field label="GSTIN" hint="Optional">
            <input className="kl-input font-mono uppercase" maxLength={15} value={a.gstin} onChange={(x) => set({ ...a, gstin: x.target.value.toUpperCase().replace(/\s/g, "") })} />
            <Err e={e} k="gstin" />
            {a.gstin && <div className="mt-2"><GstinCheck gstin={a.gstin} legalName={a.displayName} tradeName="" /></div>}
          </Field>
        )}
      </Section>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Read-only summary                                                   */
/* ------------------------------------------------------------------ */

function Summary({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{k}</dt>
          <dd className="truncate text-strong">{v || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function applicationSummaryRows(role: MemberRole, app: BrandApplication | CreatorApplication): [string, ReactNode][] {
  if (role === "brand") {
    const a = app as BrandApplication;
    return [
      ["Legal name", a.legalName],
      ["Trade name", a.tradeName],
      ["Business type", BUSINESS_TYPES[a.businessType]],
      ["Country", a.country],
      ["Website", a.website],
      ["Contact", a.contactName],
      ["Representative", `${a.representative.name} (${a.representative.designation})`],
      ["Representative email", a.representative.email],
      a.hasGstin ? ["GSTIN", a.gstin] : ["Registration", `${a.altEvidenceType ? ALT_BUSINESS_EVIDENCE[a.altEvidenceType] : ""} · ${a.registrationNumber}`],
    ];
  }
  const a = app as CreatorApplication;
  return [
    ["Display name", a.displayName],
    ["Headline", a.headline],
    ["Specializations", a.specializations.join(", ")],
    ["Formats", a.formats.join(", ")],
    ["AI tools", a.aiTools.join(", ")],
    ["Availability", AVAILABILITY[a.availability]],
    ["Commercial licensing", a.offersCommercialLicense ? "Yes" : "No"],
    ["Portfolio", `${a.portfolioLinks.length} link(s)`],
    ["Business", a.isRegisteredBusiness ? `Registered${a.gstin ? ` · ${a.gstin}` : ""}` : "Individual"],
  ];
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const BRAND_EVIDENCE_KINDS: Record<string, string> = {
  gst_certificate: "GST registration certificate (REG-06)",
  business_pan: "Business PAN card",
  authorisation_letter: "Letter of authorisation",
};

const CREATOR_EVIDENCE_KINDS: Record<string, string> = {
  portfolio_proof: "Project file / work-in-progress proof",
  client_reference: "Client reference or contract (redacted)",
  identity: "Government ID (only if a reviewer asks)",
};

export function VerificationApplicationPage({ role }: { role: MemberRole }) {
  const { user, account } = useAuth();
  const existing = account.verification;
  const editable = isApplicationEditable(account.status);

  const [brand, setBrand] = useState<BrandApplication>(EMPTY_BRAND);
  const [creator, setCreator] = useState<CreatorApplication>(EMPTY_CREATOR);
  const [evidence, setEvidence] = useState<EvidenceRef[]>([]);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "danger" | "info"; text: string } | null>(null);
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);

  // Load from the submitted application, else from this device's draft.
  const hydrateKey = user && account.ready ? `${user.uid}:${existing?.updatedAt ? "doc" : "draft"}` : null;
  // Adjust-state-during-render: runs once per account/source, client-only (needs a user).
  if (user && hydrateKey && hydratedFor !== hydrateKey) {
    let source: { application?: unknown; evidence?: EvidenceRef[] } | null = existing ?? null;
    if (!source) {
      try {
        const raw = localStorage.getItem(draftKey(user.uid, role));
        source = raw ? JSON.parse(raw) : null;
      } catch { /* ignore */ }
    }
    if (source?.application) {
      if (role === "brand") setBrand({ ...EMPTY_BRAND, ...(source.application as BrandApplication) });
      else setCreator({ ...EMPTY_CREATOR, ...(source.application as CreatorApplication) });
    } else if (role === "brand") {
      setBrand((b) => ({ ...b, contactName: b.contactName || user.displayName || "" }));
    } else {
      setCreator((c) => ({ ...c, displayName: c.displayName || user.displayName || "" }));
    }
    setEvidence(source?.evidence ?? []);
    setHydratedFor(hydrateKey);
  }

  const application = useMemo<BrandApplication | CreatorApplication>(
    () =>
      role === "brand"
        ? brand
        : { ...creator, portfolioLinks: cleanLinks(creator.portfolioLinks), sampleWorkLinks: cleanLinks(creator.sampleWorkLinks) },
    [role, brand, creator]
  );

  if (!user || !account.ready) return <AppShell><PortalLoading /></AppShell>;

  function saveDraft() {
    try {
      localStorage.setItem(draftKey(user!.uid, role), JSON.stringify({ application, evidence }));
      setNotice({ tone: "info", text: "Draft saved on this device." });
    } catch { /* ignore */ }
  }

  async function submit() {
    setNotice(null);
    const errs =
      role === "brand"
        ? validateBrandApplication(application as BrandApplication, evidence)
        : validateCreatorApplication(application as CreatorApplication, evidence);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setNotice({ tone: "danger", text: "Please fix the highlighted fields." });
      return;
    }
    if (!consent) {
      setNotice({ tone: "danger", text: "Please confirm the declaration and consent." });
      return;
    }
    setBusy(true);
    try {
      await saveApplication({ uid: user!.uid, role, application, evidence, submit: true, existing });
      try { localStorage.removeItem(draftKey(user!.uid, role)); } catch { /* ignore */ }
      setNotice({ tone: "success", text: "Application submitted. We'll email you when there's a decision." });
    } catch (err) {
      setNotice({ tone: "danger", text: friendlyAuthError(err) });
    } finally {
      setBusy(false);
    }
  }

  const kinds = role === "brand" ? BRAND_EVIDENCE_KINDS : CREATOR_EVIDENCE_KINDS;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-5 px-4 pb-16 pt-6">
        <div className="kl-header p-6">
          <h1 className="text-[22px] font-bold">{role === "brand" ? "Business verification" : "Creator verification"}</h1>
          <p className="mt-1 text-[13px] text-white/65">
            {role === "brand"
              ? "Verified brands can invite creators and start paid engagements. Until then you can draft briefs and explore matches."
              : "Verified creators can accept brand invitations and deliver paid work. Until then your profile stays discoverable."}
          </p>
        </div>

        <AccountStatusPanel
          account={account}
          action={
            account.status === "verified" ? (
              <Link href={role === "brand" ? "/brand" : "/creator"} className="text-[12px] font-semibold text-forest-700 underline">Open portal</Link>
            ) : undefined
          }
        />

        <div className="kl-card space-y-6 p-6 text-strong">
          {editable ? (
            <>
              {role === "brand" ? <BrandFields a={brand} set={setBrand} e={errors} /> : <CreatorFields a={creator} set={setCreator} e={errors} />}
              <Section
                title={role === "brand" ? "Supporting documents" : "Supporting evidence"}
                hint={
                  role === "brand"
                    ? "Optional, but uploading your GST certificate (REG-06) speeds up review."
                    : "Optional. Identity documents are requested only when our verification policy needs them."
                }
              >
                {account.emailVerified ? (
                  <EvidenceUploader uid={user.uid} value={evidence} onChange={setEvidence} kinds={kinds} disabled={busy} />
                ) : (
                  <Notice tone="warn">Verify your email before uploading documents.</Notice>
                )}
                <Err e={errors} k="evidence" />
              </Section>
              <ConsentBox checked={consent} onChange={setConsent} role={role} />
              {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
              <div className="flex flex-wrap justify-end gap-2">
                {!existing && <Button variant="light" onClick={saveDraft} disabled={busy}>Save draft</Button>}
                <Button variant="forest" onClick={submit} disabled={busy || !account.emailVerified}>
                  {busy ? "Submitting…" : account.status === "info_required" ? "Resubmit for review" : "Submit for review"}
                </Button>
              </div>
            </>
          ) : (
            <>
              {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
              <h3 className="text-[14px] font-bold">Your submitted application</h3>
              <Summary rows={applicationSummaryRows(role, existing?.application ?? application)} />
              <p className="text-[11.5px] text-muted">
                {existing?.evidence.length ?? 0} document(s) on file. Applications can&apos;t be edited while under review.
              </p>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
