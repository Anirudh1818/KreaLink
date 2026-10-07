/**
 * KreaLink AI 2.0 — Creator Intelligence & Portfolio Evidence Index
 * Builds an evidence-backed capability graph from creator profiles and real reel deliverables.
 */

import { CreatorProfile, PortfolioItem } from "../types";
import { DEMO_CREATORS } from "../demoData";

export type EvidenceLevel =
  | "system-verified"
  | "portfolio-demonstrated"
  | "creator-confirmed"
  | "profile-listed"
  | "Platform-verified"
  | "Portfolio-demonstrated"
  | "Creator-confirmed"
  | "Profile-listed";

export type CapabilityEvidence = {
  capability: string;
  type: "tool" | "skill" | "format" | "contentType" | "commercial";
  level: EvidenceLevel;
  demonstratedCount: number;
  sampleProjectTitles: string[];
};

export type CreatorCapabilityGraph = {
  username: string;
  creator: CreatorProfile;
  portfolioItems: PortfolioItem[];
  evidenceMap: Map<string, CapabilityEvidence>;
  portfolioReelCount: number;
  commercialClearedReels: number;
  verifiedTools: string[];
};

/**
 * Builds a capability evidence graph for a creator by indexing all portfolio items.
 */
export function buildCreatorCapabilityGraph(
  creator: CreatorProfile,
  portfolio?: PortfolioItem[]
): CreatorCapabilityGraph {
  // If portfolio not provided, lookup from DEMO_CREATORS roster
  let items = portfolio;
  if (!items || items.length === 0) {
    const demo = DEMO_CREATORS.find(
      (d) => d.creator.username.toLowerCase() === creator.username.toLowerCase()
    );
    items = demo?.portfolio || [];
  }

  const evidenceMap = new Map<string, CapabilityEvidence>();
  let commercialCount = 0;
  const verifiedToolsSet = new Set<string>();

  // 1. Index Profile Capabilities
  (creator.aiTools || []).forEach((tool) => {
    evidenceMap.set(tool.toLowerCase(), {
      capability: tool,
      type: "tool",
      level: creator.verification?.tools ? "system-verified" : "creator-confirmed",
      demonstratedCount: 0,
      sampleProjectTitles: [],
    });
    if (creator.verification?.tools) verifiedToolsSet.add(tool);
  });

  (creator.skills || []).forEach((skill) => {
    evidenceMap.set(skill.toLowerCase(), {
      capability: skill,
      type: "skill",
      level: creator.verification?.workflow ? "system-verified" : "creator-confirmed",
      demonstratedCount: 0,
      sampleProjectTitles: [],
    });
  });

  (creator.contentTypes || []).forEach((ct) => {
    evidenceMap.set(ct.toLowerCase(), {
      capability: ct,
      type: "contentType",
      level: "creator-confirmed",
      demonstratedCount: 0,
      sampleProjectTitles: [],
    });
  });

  (creator.formats || []).forEach((fmt) => {
    evidenceMap.set(fmt.toLowerCase(), {
      capability: fmt,
      type: "format",
      level: "creator-confirmed",
      demonstratedCount: 0,
      sampleProjectTitles: [],
    });
  });

  // 2. Index Portfolio Items to elevate evidence to "portfolio-demonstrated"
  items.forEach((item) => {
    if (item.commercialUse) commercialCount++;

    // Index Tools
    (item.tools || []).forEach((tool) => {
      const key = tool.toLowerCase();
      const existing = evidenceMap.get(key);
      if (existing) {
        existing.level = "portfolio-demonstrated";
        existing.demonstratedCount++;
        if (existing.sampleProjectTitles.length < 2) existing.sampleProjectTitles.push(item.title);
      } else {
        evidenceMap.set(key, {
          capability: tool,
          type: "tool",
          level: "portfolio-demonstrated",
          demonstratedCount: 1,
          sampleProjectTitles: [item.title],
        });
      }
    });

    // Index Skills
    (item.skills || []).forEach((skill) => {
      const key = skill.toLowerCase();
      const existing = evidenceMap.get(key);
      if (existing) {
        existing.level = "portfolio-demonstrated";
        existing.demonstratedCount++;
        if (existing.sampleProjectTitles.length < 2) existing.sampleProjectTitles.push(item.title);
      } else {
        evidenceMap.set(key, {
          capability: skill,
          type: "skill",
          level: "portfolio-demonstrated",
          demonstratedCount: 1,
          sampleProjectTitles: [item.title],
        });
      }
    });

    // Index Content Types
    if (item.contentType) {
      const key = item.contentType.toLowerCase();
      const existing = evidenceMap.get(key);
      if (existing) {
        existing.level = "portfolio-demonstrated";
        existing.demonstratedCount++;
        if (existing.sampleProjectTitles.length < 2) existing.sampleProjectTitles.push(item.title);
      }
    }

    // Index Formats
    (item.formats || []).forEach((fmt) => {
      const key = fmt.toLowerCase();
      const existing = evidenceMap.get(key);
      if (existing) {
        existing.level = "portfolio-demonstrated";
        existing.demonstratedCount++;
      }
    });
  });

  return {
    username: creator.username,
    creator,
    portfolioItems: items,
    evidenceMap,
    portfolioReelCount: items.length,
    commercialClearedReels: commercialCount,
    verifiedTools: Array.from(verifiedToolsSet),
  };
}

/**
 * Global cache of capability graphs for quick candidate retrieval.
 */
const CAPABILITY_GRAPH_CACHE = new Map<string, CreatorCapabilityGraph>();

export function getCachedCapabilityGraph(creator: CreatorProfile): CreatorCapabilityGraph {
  const key = creator.username.toLowerCase();
  if (!CAPABILITY_GRAPH_CACHE.has(key)) {
    CAPABILITY_GRAPH_CACHE.set(key, buildCreatorCapabilityGraph(creator));
  }
  return CAPABILITY_GRAPH_CACHE.get(key)!;
}
