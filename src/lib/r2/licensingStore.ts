/**
 * KreaLink R2 — Licensing Comparison
 * Brand requirements vs creator offers → mismatch flagging.
 */

import type { LicenseTerm, LicenseMismatch, LicenseComparison } from "./types";
import type { CreativeBrief } from "@/lib/types";

const KNOWN_PLATFORMS = ["Instagram", "TikTok", "YouTube", "Web", "Broadcast"];

/**
 * Derive what a brief needs licensed from its free-text fields.
 * Defaults (worldwide, 1 year, non-exclusive) apply when the brief is silent.
 */
export function licenseRequirementsForBrief(brief: CreativeBrief): LicenseTerm {
  const text = `${brief.requirements} ${brief.notes ?? ""}`.toLowerCase();

  let territory: LicenseTerm["territory"] = "worldwide";
  if (!/worldwide|global/.test(text) && /\b(india|usa|uk|europe|eu|apac|regional)\b/.test(text)) {
    territory = "regional";
  }

  let duration: LicenseTerm["duration"] = "1year";
  const dm = text.match(/(\d+)\s*(month|year)/);
  if (/perpetual|in perpetuity/.test(text)) duration = "perpetual";
  else if (dm) {
    const n = parseInt(dm[1]!);
    const months = dm[2] === "year" ? n * 12 : n;
    duration = months <= 6 ? "6month" : months <= 12 ? "1year" : months <= 24 ? "2year" : "perpetual";
  }

  const platformText = brief.platform.toLowerCase();
  const platforms = KNOWN_PLATFORMS.filter((p) => platformText.includes(p.toLowerCase()));

  return {
    usageType: brief.commercialUse ? "commercial" : "editorial",
    territory,
    duration,
    platforms: platforms.length > 0 ? platforms : ["Instagram"],
    exclusivity: /non-exclusive/.test(text) ? "non-exclusive" : /exclusive/.test(text) ? "exclusive" : "non-exclusive",
  };
}

/** Compare a creator's offer against a brief in one call. */
export function compareLicensesForBrief(brief: CreativeBrief, creatorId: string): LicenseComparison {
  return compareLicenses(brief.id ?? "brief-draft", creatorId, licenseRequirementsForBrief(brief));
}

/** Hardcoded creator licensing offers (for demo; real data in Firestore). */
export const CREATOR_LICENSE_OFFERS: Record<string, LicenseTerm> = {
  paultrillo: {
    usageType: "commercial",
    territory: "worldwide",
    duration: "perpetual",
    platforms: ["Instagram", "YouTube", "TikTok", "Web"],
    exclusivity: "non-exclusive",
  },
  nicolasneubert: {
    usageType: "commercial",
    territory: "regional",   // ← limited territory (mismatch scenario)
    duration: "1year",
    platforms: ["Instagram", "TikTok"],
    exclusivity: "non-exclusive",
  },
  juliewieland: {
    usageType: "commercial",
    territory: "worldwide",
    duration: "2year",
    platforms: ["Instagram", "YouTube", "TikTok", "Broadcast"],
    exclusivity: "non-exclusive",
  },
  kavancardoza: {
    usageType: "commercial",
    territory: "worldwide",
    duration: "1year",
    platforms: ["Instagram", "YouTube", "TikTok"],
    exclusivity: "non-exclusive",
  },
  kylekesterson: {
    usageType: "commercial",
    territory: "worldwide",
    duration: "perpetual",
    platforms: ["Instagram", "YouTube", "TikTok", "Broadcast", "Web"],
    exclusivity: "exclusive",
  },
  digitaldavincis: {
    usageType: "commercial",
    territory: "worldwide",
    duration: "2year",
    platforms: ["Instagram", "YouTube", "TikTok"],
    exclusivity: "non-exclusive",
  },
};

function compareTerritories(required: string, offered: string): boolean {
  if (required === "worldwide") return offered === "worldwide";
  return true; // regional or limited always satisfies a non-worldwide requirement
}

function compareDurations(required: string, offered: string): boolean {
  const rank: Record<string, number> = {
    "6month": 1,
    "1year": 2,
    "2year": 3,
    perpetual: 4,
  };
  return (rank[offered] ?? 0) >= (rank[required] ?? 0);
}

function comparePlatforms(required: string[], offered: string[]): boolean {
  return required.every((p) =>
    offered.some((o) => o.toLowerCase().includes(p.toLowerCase()))
  );
}

export function compareLicenses(
  briefId: string,
  creatorId: string,
  brandRequires: LicenseTerm
): LicenseComparison {
  const creatorOffers = CREATOR_LICENSE_OFFERS[creatorId] ?? {
    usageType: "commercial",
    territory: "worldwide",
    duration: "1year",
    platforms: ["Instagram"],
    exclusivity: "non-exclusive",
  };

  const mismatches: LicenseMismatch[] = [];

  // Usage type
  if (brandRequires.usageType !== creatorOffers.usageType && creatorOffers.usageType !== "unlimited") {
    mismatches.push({
      field: "usageType",
      brandRequires: brandRequires.usageType,
      creatorOffers: creatorOffers.usageType,
      severity: "blocking",
    });
  }

  // Territory
  if (!compareTerritories(brandRequires.territory, creatorOffers.territory)) {
    mismatches.push({
      field: "territory",
      brandRequires: brandRequires.territory,
      creatorOffers: creatorOffers.territory,
      severity: "blocking",
    });
  }

  // Duration
  if (!compareDurations(brandRequires.duration, creatorOffers.duration)) {
    mismatches.push({
      field: "duration",
      brandRequires: brandRequires.duration,
      creatorOffers: creatorOffers.duration,
      severity: "advisory",
    });
  }

  // Platforms
  if (!comparePlatforms(brandRequires.platforms, creatorOffers.platforms)) {
    const missing = brandRequires.platforms.filter(
      (p) => !creatorOffers.platforms.some((o) => o.toLowerCase().includes(p.toLowerCase()))
    );
    mismatches.push({
      field: "platforms",
      brandRequires: brandRequires.platforms.join(", "),
      creatorOffers: `Missing: ${missing.join(", ")}`,
      severity: "advisory",
    });
  }

  // Exclusivity
  if (brandRequires.exclusivity === "exclusive" && creatorOffers.exclusivity !== "exclusive") {
    mismatches.push({
      field: "exclusivity",
      brandRequires: "exclusive",
      creatorOffers: creatorOffers.exclusivity,
      severity: "advisory",
    });
  }

  const blocking = mismatches.filter((m) => m.severity === "blocking");
  return {
    creatorId,
    briefId,
    brandRequires,
    creatorOffers,
    mismatches,
    compatible: blocking.length === 0,
  };
}
