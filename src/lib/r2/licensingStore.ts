/**
 * KreaLink R2 — Licensing Comparison
 * Brand requirements vs creator offers → mismatch flagging.
 */

import type { LicenseTerm, LicenseMismatch, LicenseComparison } from "./types";

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
