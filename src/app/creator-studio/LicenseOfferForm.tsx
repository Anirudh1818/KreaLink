"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { getCreatorOffer, offerSource, saveCreatorOffer, type LicenseTerm } from "@/lib/r2";

const PLATFORMS = ["Instagram", "TikTok", "YouTube", "Web", "Broadcast"];

/**
 * The creator records the licensing terms they offer. Brands' licence checks
 * (matches, selection, pipeline) compare their brief against these terms.
 */
export function LicenseOfferForm({ creatorUsername, ownerUid }: { creatorUsername: string; ownerUid?: string }) {
  const { user, account } = useAuth();
  const [offer, setOffer] = useState<LicenseTerm>(() => getCreatorOffer(creatorUsername));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const source = offerSource(creatorUsername);
  // Only the owning creator account can publish to the shared profile.
  const canPublish = !!user && account.role === "creator" && !!ownerUid && ownerUid === user.uid;

  function set<K extends keyof LicenseTerm>(k: K, v: LicenseTerm[K]) {
    setOffer((o) => ({ ...o, [k]: v }));
  }

  async function save() {
    if (offer.platforms.length === 0) return setMsg({ ok: false, text: "Pick at least one platform." });
    setBusy(true);
    setMsg(null);
    saveCreatorOffer(creatorUsername, offer);
    try {
      if (canPublish) {
        await updateDoc(doc(db, "creators", creatorUsername), { licenseOffer: offer });
        setMsg({ ok: true, text: "Saved and published — brands now see these terms in every licence check." });
      } else {
        setMsg({ ok: true, text: "Saved on this device. Sign in as this creator to publish the terms to brands." });
      }
    } catch {
      setMsg({ ok: false, text: "Saved locally, but publishing to your profile failed. Try again." });
    } finally {
      setBusy(false);
    }
  }

  const select = "kl-input text-xs";

  return (
    <div className="rounded-3xl bg-white text-slate-900 p-6 md:p-8 shadow-2xl border border-slate-100 space-y-5">
      <div>
        <h3 className="text-base font-bold">Licensing &amp; commercial use you offer</h3>
        <p className="text-xs text-slate-500">
          Brands&apos; briefs are checked against these terms before they select you. Mismatches (e.g. a brief needing worldwide rights
          when you offer regional) are flagged to the brand.
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          Current source: {source === "creator" ? "your published terms" : source === "demo" ? "demo profile terms" : "platform default (not set yet)"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-[11px] font-semibold text-slate-600">Usage type</span>
          <select className={select} value={offer.usageType} onChange={(e) => set("usageType", e.target.value as LicenseTerm["usageType"])}>
            <option value="commercial">Commercial (ads, brand content)</option>
            <option value="editorial">Editorial only</option>
            <option value="internal">Internal use only</option>
            <option value="unlimited">Unlimited</option>
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-semibold text-slate-600">Territory</span>
          <select className={select} value={offer.territory} onChange={(e) => set("territory", e.target.value)}>
            <option value="worldwide">Worldwide</option>
            <option value="regional">Regional (e.g. India only)</option>
            <option value="limited">Limited (specific markets)</option>
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-semibold text-slate-600">Maximum duration</span>
          <select className={select} value={offer.duration} onChange={(e) => set("duration", e.target.value)}>
            <option value="6month">6 months</option>
            <option value="1year">1 year</option>
            <option value="2year">2 years</option>
            <option value="perpetual">Perpetual</option>
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-semibold text-slate-600">Exclusivity</span>
          <select className={select} value={offer.exclusivity} onChange={(e) => set("exclusivity", e.target.value as LicenseTerm["exclusivity"])}>
            <option value="non-exclusive">Non-exclusive</option>
            <option value="category-exclusive">Category-exclusive</option>
            <option value="exclusive">Exclusive</option>
          </select>
        </label>
      </div>

      <div className="space-y-1">
        <span className="text-[11px] font-semibold text-slate-600">Platforms you license for</span>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => {
            const on = offer.platforms.includes(p);
            return (
              <button
                key={p}
                type="button"
                aria-pressed={on}
                onClick={() => set("platforms", on ? offer.platforms.filter((x) => x !== p) : [...offer.platforms, p])}
                className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition ${
                  on ? "bg-emerald-700 text-white" : "bg-white text-slate-700 shadow-[inset_0_0_0_1px_#d5dad8]"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      {msg && <p className={`text-xs font-semibold ${msg.ok ? "text-emerald-700" : "text-rose-600"}`}>{msg.text}</p>}
      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save licence terms"}
      </button>
    </div>
  );
}
