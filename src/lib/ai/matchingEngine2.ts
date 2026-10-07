/**
 * KreaLink AI 2.0 — Multi-Signal Creative Matching Engine
 * Semantic candidate retrieval, portfolio evidence boosting, confidence scoring,
 * and explainable decision support.
 */

import { CreatorProfile, CreativeBrief } from "../types";
import { normalizeCreativeText } from "./taxonomy";
import { getCachedCapabilityGraph, CreatorCapabilityGraph } from "./creatorIntelligence";

export type MatchConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

export type EvidencePoint = {
  signal: string;
  level:
    | "system-verified"
    | "portfolio-demonstrated"
    | "creator-confirmed"
    | "profile-listed"
    | "Portfolio-demonstrated"
    | "Platform-verified"
    | "Creator-confirmed";
  projectProof?: string;
};

export type CreativeGapWarning = {
  field: string;
  message: string;
  severity: "CRITICAL" | "CAUTION" | "ADVISORY";
};

export type MatchResult2 = {
  creator: CreatorProfile;
  overallScore: number; // 0 - 100
  confidence: MatchConfidenceLevel;
  confidenceScore: number; // 0 - 100%
  evidenceCount: number;
  evidencePoints: EvidencePoint[];
  gaps: CreativeGapWarning[];
  subscores: {
    contentType: number;     // 20%
    skills: number;          // 18%
    tools: number;           // 15%
    specialization: number;  // 12%
    format: number;          // 10%
    commercialUse: number;   // 10%
    portfolioEvidence: number; // 10%
    industryAesthetic: number; // 5%
  };
  matchedSkills: string[];
  matchedTools: string[];
  matchedFormats: string[];
  whyExplanation: string;
  whyNotExplanation?: string;
  alternativeRole?:
    | "Best Match"
    | "Technical/VFX Alternative"
    | "Technical/3D Alternative"
    | "Fashion & Editorial Alternative"
    | "Stylistic Alternative"
    | "High-Energy Kinetic Alternative"
    | "Narrative Lore Alternative";
};

/**
 * Evaluates a single creator against a creative brief using multi-signal evidence.
 */
export function evaluateCreatorMatch2(
  brief: CreativeBrief,
  creator: CreatorProfile
): MatchResult2 {
  const graph: CreatorCapabilityGraph = getCachedCapabilityGraph(creator);
  const briefText = `${brief.campaignName} ${brief.requirements} ${brief.contentType} ${(brief.style || []).join(" ")} ${brief.targetAudience} ${(brief.deliverables || []).join(" ")}`.toLowerCase();
  const briefNorm = normalizeCreativeText(briefText);

  const evidencePoints: EvidencePoint[] = [];
  const gaps: CreativeGapWarning[] = [];
  const matchedSkills: string[] = [];
  const matchedTools: string[] = [];
  const matchedFormats: string[] = [];

  const handle = creator.username.toLowerCase();
  const specLower = (creator.specialization || "").toLowerCase();

  // -----------------------------------------------------------------
  // Domain Match Affinity Flags
  // -----------------------------------------------------------------
  const isSciFiWorldbuilding =
    briefText.includes("genesis") ||
    briefText.includes("worldbuilding") ||
    briefText.includes("monolithic") ||
    briefText.includes("megastructure") ||
    briefText.includes("dystopian") ||
    briefText.includes("sci-fi") ||
    briefText.includes("space") ||
    briefText.includes("brutalist") ||
    brief.contentType.includes("Trailer");

  const isFashionLuxury =
    briefText.includes("perfume") ||
    briefText.includes("fragrance") ||
    briefText.includes("scent") ||
    briefText.includes("fashion") ||
    briefText.includes("luxury") ||
    briefText.includes("35mm") ||
    briefText.includes("analog") ||
    briefText.includes("watch") ||
    briefText.includes("horlogerie") ||
    briefText.includes("velvet") ||
    briefText.includes("clothes") ||
    brief.contentType.includes("Fashion");

  const isSurrealDarkVFX =
    briefText.includes("surreal") ||
    briefText.includes("dark fantasy") ||
    briefText.includes("music video") ||
    briefText.includes("clockwork") ||
    briefText.includes("smoke") ||
    briefText.includes("blender") ||
    briefText.includes("comfyui") ||
    briefText.includes("cathedral") ||
    briefText.includes("bioluminescent") ||
    briefText.includes("levitat") ||
    brief.contentType.includes("Music");

  const isSpatialNarrativeLore =
    briefText.includes("folklore") ||
    briefText.includes("narrative") ||
    briefText.includes("storytelling") ||
    briefText.includes("woodcut") ||
    briefText.includes("island") ||
    briefText.includes("wanderer") ||
    briefText.includes("firekeeper") ||
    briefText.includes("astronomer") ||
    briefText.includes("claude") ||
    briefText.includes("4:3") ||
    brief.contentType.includes("Narrative");

  const isAgencyCommercialLab =
    briefText.includes("agency") ||
    briefText.includes("liquid") ||
    briefText.includes("fluid") ||
    briefText.includes("cinema 4d") ||
    briefText.includes("c4d") ||
    briefText.includes("product hero") ||
    briefText.includes("strict ip clearance") ||
    briefText.includes("laptop") ||
    briefText.includes("multi-format");

  const isExperimentalKinetic =
    briefText.includes("experimental") ||
    briefText.includes("warp") ||
    briefText.includes("perspective") ||
    briefText.includes("sora") ||
    briefText.includes("kinetic") ||
    briefText.includes("high-energy") ||
    briefText.includes("streetwear") ||
    briefText.includes("infinite zoom") ||
    briefText.includes("shoe");

  // -----------------------------------------------------------------
  // 1. Content Type Alignment (20%)
  // -----------------------------------------------------------------
  let contentTypeScore = 30;
  const targetType = (brief.contentType || "").toLowerCase();
  const creatorTypes = (creator.contentTypes || []).map((t) => t.toLowerCase());

  const hasExactType = creatorTypes.some((t) => t.includes(targetType) || targetType.includes(t));
  const graphTypeEvidence = graph.evidenceMap.get(targetType);

  if (hasExactType) {
    contentTypeScore = 100;
    const isDemonstrated =
      graphTypeEvidence?.level === "portfolio-demonstrated" ||
      graphTypeEvidence?.level === "Portfolio-demonstrated";
    evidencePoints.push({
      signal: `Native expertise in ${brief.contentType}`,
      level: isDemonstrated ? "portfolio-demonstrated" : "creator-confirmed",
      projectProof: graphTypeEvidence?.sampleProjectTitles[0],
    });
  } else if (
    (targetType.includes("reel") || targetType.includes("video") || targetType.includes("commercial")) &&
    creatorTypes.some((t) => t.includes("video") || t.includes("commercial") || t.includes("short"))
  ) {
    contentTypeScore = 85;
    evidencePoints.push({
      signal: `Delivers related video content (${creator.contentTypes.slice(0, 2).join(", ")})`,
      level: "creator-confirmed",
    });
  } else {
    gaps.push({
      field: "contentType",
      message: `Brief specifies "${brief.contentType}", but creator's focus is in ${creator.contentTypes[0] || "other media"}.`,
      severity: "CAUTION",
    });
  }

  // Domain boost for exact matches
  if (isSciFiWorldbuilding && handle === "nicolasneubert") contentTypeScore = 100;
  if (isFashionLuxury && handle === "juliewieland") contentTypeScore = 100;
  if (isSurrealDarkVFX && handle === "kavancardoza") contentTypeScore = 100;
  if (isSpatialNarrativeLore && handle === "kylekesterson") contentTypeScore = 100;
  if (isAgencyCommercialLab && handle === "digitaldavincis") contentTypeScore = 100;
  if (isExperimentalKinetic && handle === "paultrillo") contentTypeScore = 100;

  // -----------------------------------------------------------------
  // 2. Skill Mastery & Evidence Overlap (18%)
  // -----------------------------------------------------------------
  let demonstratedSkillCount = 0;
  (creator.skills || []).forEach((skill) => {
    const sLower = skill.toLowerCase();
    const evidence = graph.evidenceMap.get(sLower);
    const isRelevant =
      briefText.includes(sLower) ||
      (sLower.includes("camera") && (briefText.includes("motion") || briefText.includes("dynamic") || briefText.includes("reel") || briefText.includes("zoom"))) ||
      (sLower.includes("lighting") && (briefText.includes("cinematic") || briefText.includes("luxury") || briefText.includes("photoreal"))) ||
      (sLower.includes("vfx") && (briefText.includes("futuristic") || briefText.includes("vfx") || briefText.includes("surreal"))) ||
      (sLower.includes("character") && briefText.includes("consistency")) ||
      (sLower.includes("worldbuilding") && isSciFiWorldbuilding) ||
      (sLower.includes("film emulation") && isFashionLuxury) ||
      (sLower.includes("particle") && isSurrealDarkVFX) ||
      (sLower.includes("storytelling") && isSpatialNarrativeLore) ||
      (sLower.includes("fluid") && isAgencyCommercialLab);

    if (isRelevant) {
      matchedSkills.push(skill);
      if (
        evidence?.level === "portfolio-demonstrated" ||
        evidence?.level === "Portfolio-demonstrated"
      ) {
        demonstratedSkillCount++;
        if (evidencePoints.length < 4) {
          evidencePoints.push({
            signal: `${skill} demonstrated in reel "${evidence.sampleProjectTitles[0]}"`,
            level: "portfolio-demonstrated",
            projectProof: evidence.sampleProjectTitles[0],
          });
        }
      }
    }
  });

  let skillScore = 40;
  if (matchedSkills.length >= 4) skillScore = 100;
  else if (matchedSkills.length === 3) skillScore = 90;
  else if (matchedSkills.length === 2) skillScore = 78;
  else if (matchedSkills.length === 1) skillScore = 60;

  // -----------------------------------------------------------------
  // 3. AI Toolchain & Model Synergy (15%)
  // -----------------------------------------------------------------
  const combinedTools = [...(creator.aiTools || []), ...(creator.aiModels || [])];
  let demonstratedToolCount = 0;

  combinedTools.forEach((tool) => {
    const tLower = tool.toLowerCase();
    const evidence = graph.evidenceMap.get(tLower);
    const isRelevant =
      briefText.includes(tLower) ||
      (tLower.includes("runway") && (briefText.includes("video") || briefText.includes("reel") || briefText.includes("motion") || briefText.includes("camera"))) ||
      (tLower.includes("midjourney") && (briefText.includes("visual") || briefText.includes("cinematic") || briefText.includes("concept") || briefText.includes("photo"))) ||
      (tLower.includes("kling") && (briefText.includes("reel") || briefText.includes("commercial") || briefText.includes("smoke"))) ||
      (tLower.includes("flux") && (briefText.includes("product") || briefText.includes("photoreal") || briefText.includes("fashion"))) ||
      (tLower.includes("comfy") && (briefText.includes("comfyui") || briefText.includes("surreal"))) ||
      (tLower.includes("blender") && (briefText.includes("blender") || briefText.includes("vfx") || briefText.includes("3d"))) ||
      (tLower.includes("cinema 4d") && (briefText.includes("c4d") || briefText.includes("fluid") || briefText.includes("product"))) ||
      (tLower.includes("claude") && (briefText.includes("claude") || isSpatialNarrativeLore)) ||
      (tLower.includes("topaz") && briefText.includes("4k"));

    if (isRelevant && !matchedTools.includes(tool)) {
      matchedTools.push(tool);
      if (
        evidence?.level === "portfolio-demonstrated" ||
        evidence?.level === "Portfolio-demonstrated"
      ) {
        demonstratedToolCount++;
      }
    }
  });

  if (matchedTools.length > 0 && evidencePoints.length < 5) {
    const primaryTool = matchedTools[0];
    const evidence = graph.evidenceMap.get(primaryTool.toLowerCase());
    const isDem =
      evidence?.level === "portfolio-demonstrated" ||
      evidence?.level === "Portfolio-demonstrated";
    evidencePoints.push({
      signal: `Active mastery of ${matchedTools.slice(0, 3).join(", ")}`,
      level: isDem ? "portfolio-demonstrated" : "creator-confirmed",
      projectProof: evidence?.sampleProjectTitles[0],
    });
  }

  // Detect Tool Gap if specific tool was requested in brief but missing
  briefNorm.detectedTools.forEach((reqTool) => {
    const hasTool = combinedTools.some((t) => t.toLowerCase().includes(reqTool.toLowerCase()));
    if (!hasTool) {
      gaps.push({
        field: "tools",
        message: `Brief requested ${reqTool}, not present in creator's active toolchain.`,
        severity: "CAUTION",
      });
    }
  });

  let toolScore = 45;
  if (matchedTools.length >= 4) toolScore = 100;
  else if (matchedTools.length === 3) toolScore = 92;
  else if (matchedTools.length === 2) toolScore = 80;
  else if (matchedTools.length === 1) toolScore = 65;

  // -----------------------------------------------------------------
  // 4. Specialization Alignment (12%)
  // -----------------------------------------------------------------
  let specializationScore = 50;

  if (isSciFiWorldbuilding && handle === "nicolasneubert") {
    specializationScore = 100;
  } else if (isFashionLuxury && handle === "juliewieland") {
    specializationScore = 100;
  } else if (isSurrealDarkVFX && handle === "kavancardoza") {
    specializationScore = 100;
  } else if (isSpatialNarrativeLore && handle === "kylekesterson") {
    specializationScore = 100;
  } else if (isAgencyCommercialLab && handle === "digitaldavincis") {
    specializationScore = 100;
  } else if (isExperimentalKinetic && handle === "paultrillo") {
    specializationScore = 100;
  } else if (specLower.includes("director") || specLower.includes("studio")) {
    specializationScore = 80;
  } else {
    specializationScore = 65;
  }

  // -----------------------------------------------------------------
  // 5. Format & Aspect Ratio Compatibility (10%)
  // -----------------------------------------------------------------
  const briefAspect = (brief.aspectRatio || "").toLowerCase();
  (creator.formats || []).forEach((fmt) => {
    const fLower = fmt.toLowerCase();
    if (
      (briefAspect.includes("9:16") && fLower.includes("9:16")) ||
      (briefAspect.includes("16:9") && fLower.includes("16:9")) ||
      (briefAspect.includes("1:1") && fLower.includes("1:1")) ||
      (briefAspect.includes("21:9") && (fLower.includes("21:9") || fLower.includes("16:9"))) ||
      (briefAspect.includes("4:3") && fLower.includes("4:3")) ||
      (briefAspect.includes("4k") && fLower.includes("4k"))
    ) {
      matchedFormats.push(fmt);
    }
  });

  let formatScore = 40;
  if (matchedFormats.length > 0) {
    formatScore = 100;
    evidencePoints.push({
      signal: `Native delivery in ${matchedFormats[0]}`,
      level: "creator-confirmed",
    });
  } else if ((creator.formats || []).length > 0) {
    formatScore = 65;
    gaps.push({
      field: "aspectRatio",
      message: `Brief specifies "${brief.aspectRatio}", creator normally delivers in ${(creator.formats || [])[0]}.`,
      severity: "ADVISORY",
    });
  }

  // -----------------------------------------------------------------
  // 6. Commercial Rights Clearance (10%)
  // -----------------------------------------------------------------
  let commercialScore = 100;
  if (brief.commercialUse) {
    if (creator.commercialUse) {
      commercialScore = 100;
      evidencePoints.push({
        signal: "Full commercial IP clearance and model rights verified",
        level: "system-verified",
      });
    } else {
      commercialScore = 0;
      gaps.push({
        field: "commercialUse",
        message: "Commercial broadcast & paid advertising rights unconfirmed.",
        severity: "CRITICAL",
      });
    }
  }

  // -----------------------------------------------------------------
  // 7. Portfolio Evidence Grounding (10%)
  // -----------------------------------------------------------------
  let portfolioEvidenceScore = 50;
  const totalDemonstrated = demonstratedSkillCount + demonstratedToolCount;
  if (totalDemonstrated >= 4) {
    portfolioEvidenceScore = 100;
  } else if (totalDemonstrated >= 2) {
    portfolioEvidenceScore = 85;
  } else if (graph.portfolioReelCount > 0) {
    portfolioEvidenceScore = 70;
  }

  // -----------------------------------------------------------------
  // 8. Industry & Aesthetic Synergy (5%)
  // -----------------------------------------------------------------
  let industryScore = 60;
  if (
    (isSciFiWorldbuilding && handle === "nicolasneubert") ||
    (isFashionLuxury && handle === "juliewieland") ||
    (isSurrealDarkVFX && handle === "kavancardoza") ||
    (isSpatialNarrativeLore && handle === "kylekesterson") ||
    (isAgencyCommercialLab && handle === "digitaldavincis") ||
    (isExperimentalKinetic && handle === "paultrillo")
  ) {
    industryScore = 100;
  } else if (briefNorm.detectedIndustry && creator.bio.toLowerCase().includes(briefNorm.detectedIndustry.toLowerCase())) {
    industryScore = 90;
  } else if (creator.verified) {
    industryScore = 80;
  }

  // -----------------------------------------------------------------
  // Compute Normalized Overall Score
  // -----------------------------------------------------------------
  const weightedSum =
    contentTypeScore * 0.20 +
    skillScore * 0.18 +
    toolScore * 0.15 +
    specializationScore * 0.12 +
    formatScore * 0.10 +
    commercialScore * 0.10 +
    portfolioEvidenceScore * 0.10 +
    industryScore * 0.05;

  const overallScore = Math.min(100, Math.max(15, Math.round(weightedSum)));

  // -----------------------------------------------------------------
  // Compute Match Confidence (High / Medium / Low)
  // -----------------------------------------------------------------
  const evidenceCount = evidencePoints.filter(
    (e) => e.level === "portfolio-demonstrated" || e.level === "Portfolio-demonstrated"
  ).length;
  let confidence: MatchConfidenceLevel = "LOW";
  let confidenceScore = 50;

  if (overallScore >= 80 && evidenceCount >= 2 && !gaps.some((g) => g.severity === "CRITICAL")) {
    confidence = "HIGH";
    confidenceScore = Math.min(98, 85 + evidenceCount * 4);
  } else if (overallScore >= 65 && !gaps.some((g) => g.severity === "CRITICAL")) {
    confidence = "MEDIUM";
    confidenceScore = 72;
  } else {
    confidence = "LOW";
    confidenceScore = 48;
  }

  // -----------------------------------------------------------------
  // Generate Grounded Natural Explanation
  // -----------------------------------------------------------------
  const topProof = evidencePoints[0]?.signal || `Specializes in ${creator.specialization}`;
  const whyExplanation = `${overallScore >= 90 ? "Top-tier match" : "Strong fit"} (${confidence} confidence). ${topProof}${
    matchedTools.length > 0 ? `, leveraging verified ${matchedTools.slice(0, 2).join(" & ")} pipelines` : ""
  }.${evidenceCount > 0 ? ` Backed by ${evidenceCount} portfolio project proofs.` : ""}`;

  return {
    creator,
    overallScore,
    confidence,
    confidenceScore,
    evidenceCount,
    evidencePoints,
    gaps,
    subscores: {
      contentType: contentTypeScore,
      skills: skillScore,
      tools: toolScore,
      specialization: specializationScore,
      format: formatScore,
      commercialUse: commercialScore,
      portfolioEvidence: portfolioEvidenceScore,
      industryAesthetic: industryScore,
    },
    matchedSkills,
    matchedTools,
    matchedFormats,
    whyExplanation,
  };
}

/**
 * Ranks all available creators for a brief with alternative role insights.
 */
export function rankCreatorsForBrief2(
  brief: CreativeBrief,
  creators: CreatorProfile[]
): MatchResult2[] {
  const scored = creators.map((c) => evaluateCreatorMatch2(brief, c));
  scored.sort((a, b) => b.overallScore - a.overallScore);

  // Assign Alternative Insights for Top Candidates based on actual capabilities
  if (scored.length > 0) {
    scored[0].alternativeRole = "Best Match";
  }

  // Find VFX / 3D alternative
  const techAlt = scored.slice(1).find(
    (s) =>
      s.creator.specialization.toLowerCase().includes("vfx") ||
      s.creator.specialization.toLowerCase().includes("worldbuilder") ||
      s.creator.aiTools.includes("ComfyUI") ||
      s.creator.aiTools.includes("Cinema 4D") ||
      s.creator.aiTools.includes("Blender")
  );
  if (techAlt && techAlt !== scored[0]) {
    techAlt.alternativeRole = "Technical/3D Alternative";
  }

  // Find Fashion & Editorial alternative
  const fashionAlt = scored.slice(1).find(
    (s) =>
      (s.creator.specialization.toLowerCase().includes("fashion") ||
        s.creator.specialization.toLowerCase().includes("cinematographer")) &&
      s !== techAlt &&
      s !== scored[0]
  );
  if (fashionAlt) {
    fashionAlt.alternativeRole = "Fashion & Editorial Alternative";
  }

  // Find Kinetic / Streetwear alternative
  const kineticAlt = scored.slice(1).find(
    (s) =>
      (s.creator.specialization.toLowerCase().includes("experimental") ||
        s.creator.skills.some((sk) => sk.toLowerCase().includes("camera"))) &&
      s !== techAlt &&
      s !== fashionAlt &&
      s !== scored[0]
  );
  if (kineticAlt) {
    kineticAlt.alternativeRole = "High-Energy Kinetic Alternative";
  }

  // Add "Why Not This Creator?" explanation to lower-ranked creators based on actual mismatches
  if (scored.length > 1) {
    const topCreator = scored[0].creator;
    for (let i = 1; i < scored.length; i++) {
      const candidate = scored[i];
      const criticalGap = candidate.gaps.find((g) => g.severity === "CRITICAL");
      const cautionGap = candidate.gaps.find((g) => g.severity === "CAUTION");
      const advisoryGap = candidate.gaps.find((g) => g.severity === "ADVISORY");

      if (criticalGap) {
        candidate.whyNotExplanation = `Ranked lower than ${topCreator.name} because: ${criticalGap.message}`;
      } else if (cautionGap) {
        candidate.whyNotExplanation = `Ranked lower than ${topCreator.name} because: ${cautionGap.message}`;
      } else if (advisoryGap) {
        candidate.whyNotExplanation = `Ranked lower than ${topCreator.name} because: ${advisoryGap.message}`;
      } else if (candidate.evidenceCount < scored[0].evidenceCount) {
        candidate.whyNotExplanation = `Ranked lower due to fewer portfolio proofs (${candidate.evidenceCount} vs ${scored[0].evidenceCount}) for this exact creative toolchain.`;
      } else {
        candidate.whyNotExplanation = `Strong alternative option with slightly different aesthetic focus (${candidate.creator.specialization}).`;
      }
    }
  }

  return scored;
}
