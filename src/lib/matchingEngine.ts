import {
  CreatorProfile,
  CreativeBrief,
  CreatorMatchResult,
  MatchFactorScores,
} from "./types";

/**
 * Calculates transparent, weighted match scores between a Creative Brief and a Creator Profile.
 *
 * Weight Distribution:
 * - Content Type:       25%
 * - Skills:             20%
 * - Tools & Models:     15%
 * - Specialization:     15%
 * - Format / Aspect:    10%
 * - Commercial Use:     10%
 * - Portfolio Relevance: 5%
 * Total: 100%
 */
export function calculateMatchScore(
  brief: CreativeBrief,
  creator: CreatorProfile,
  portfolioCount: number = 2
): CreatorMatchResult {
  const briefText = `${brief.campaignName} ${brief.requirements} ${brief.contentType} ${(brief.style || []).join(" ")} ${brief.targetAudience} ${(brief.deliverables || []).join(" ")}`.toLowerCase();

  // 1. Content Type Matching (Weight 25%)
  let contentTypeScore = 20;
  const targetType = brief.contentType.toLowerCase();
  const creatorContentTypes = (creator.contentTypes || []).map((t) => t.toLowerCase());

  const hasDirectContentType = creatorContentTypes.some(
    (t) => t.includes(targetType) || targetType.includes(t)
  );

  if (hasDirectContentType) {
    contentTypeScore = 100;
  } else if (
    (targetType.includes("reel") || targetType.includes("video") || targetType.includes("commercial")) &&
    creatorContentTypes.some((t) => t.includes("video") || t.includes("commercial") || t.includes("trailer"))
  ) {
    contentTypeScore = 85;
  } else if (creatorContentTypes.length > 0) {
    contentTypeScore = 50;
  }

  // 2. Skills Matching (Weight 20%)
  const matchedSkills: string[] = [];
  const creatorSkills = creator.skills || [];

  for (const skill of creatorSkills) {
    const sLower = skill.toLowerCase();
    if (
      briefText.includes(sLower) ||
      (sLower.includes("consistency") && briefText.includes("cinematic")) ||
      (sLower.includes("camera") && (briefText.includes("reel") || briefText.includes("motion") || briefText.includes("dynamic"))) ||
      (sLower.includes("prompt") && briefText.includes("ai")) ||
      (sLower.includes("grading") && briefText.includes("cinematic")) ||
      (sLower.includes("vfx") && (briefText.includes("futuristic") || briefText.includes("shoe") || briefText.includes("commercial")))
    ) {
      matchedSkills.push(skill);
    }
  }

  // Calculate skill score based on matched count
  let skillScore = 40;
  if (matchedSkills.length >= 4) skillScore = 100;
  else if (matchedSkills.length === 3) skillScore = 90;
  else if (matchedSkills.length === 2) skillScore = 80;
  else if (matchedSkills.length === 1) skillScore = 65;

  // 3. AI Tools & Models Matching (Weight 15%)
  const matchedTools: string[] = [];
  const combinedTools = [...(creator.aiTools || []), ...(creator.aiModels || [])];

  for (const tool of combinedTools) {
    const tLower = tool.toLowerCase();
    if (
      briefText.includes(tLower) ||
      (tLower.includes("runway") && (briefText.includes("video") || briefText.includes("reel") || briefText.includes("motion"))) ||
      (tLower.includes("kling") && (briefText.includes("reel") || briefText.includes("commercial"))) ||
      (tLower.includes("midjourney") && (briefText.includes("visual") || briefText.includes("futuristic") || briefText.includes("cinematic"))) ||
      (tLower.includes("flux") && (briefText.includes("product") || briefText.includes("realistic"))) ||
      (tLower.includes("topaz") && (briefText.includes("4k") || briefText.includes("quality") || briefText.includes("resolution")))
    ) {
      if (!matchedTools.includes(tool)) {
        matchedTools.push(tool);
      }
    }
  }

  let toolScore = 40;
  if (matchedTools.length >= 4) toolScore = 100;
  else if (matchedTools.length === 3) toolScore = 92;
  else if (matchedTools.length === 2) toolScore = 82;
  else if (matchedTools.length === 1) toolScore = 70;

  // 4. Specialization Alignment (Weight 15%)
  let specializationScore = 50;
  const specLower = (creator.specialization || "").toLowerCase();

  if (briefText.includes("commercial") && (specLower.includes("commercial") || specLower.includes("director"))) {
    specializationScore = 100;
  } else if (briefText.includes("video") && (specLower.includes("film") || specLower.includes("director") || specLower.includes("video"))) {
    specializationScore = 95;
  } else if (briefText.includes("animation") && specLower.includes("animat")) {
    specializationScore = 100;
  } else if (briefText.includes("product") && (specLower.includes("product") || specLower.includes("vfx") || specLower.includes("visual"))) {
    specializationScore = 95;
  } else if (specLower.includes("creative director") || specLower.includes("filmmaker")) {
    specializationScore = 85;
  }

  // 5. Format & Aspect Ratio Compatibility (Weight 10%)
  const matchedFormats: string[] = [];
  const creatorFormats = creator.formats || [];
  const briefAspect = (brief.aspectRatio || "").toLowerCase();

  for (const fmt of creatorFormats) {
    const fLower = fmt.toLowerCase();
    if (
      (briefAspect.includes("9:16") && fLower.includes("9:16")) ||
      (briefAspect.includes("16:9") && fLower.includes("16:9")) ||
      (briefAspect.includes("1:1") && fLower.includes("1:1")) ||
      fLower.includes("4k")
    ) {
      matchedFormats.push(fmt);
    }
  }

  let formatScore = 30;
  if (matchedFormats.length > 0) {
    formatScore = 100;
  } else if (creatorFormats.length > 0) {
    formatScore = 60; // Flexible formatting capability
  }

  // 6. Commercial Use Requirement (Weight 10%)
  let commercialScore = 100;
  if (brief.commercialUse) {
    commercialScore = creator.commercialUse ? 100 : 0;
  }

  // 7. Portfolio Relevance (Weight 5%)
  let portfolioScore = 50;
  if (creator.verification?.portfolio) {
    portfolioScore = 100;
  } else if (portfolioCount > 0) {
    portfolioScore = 90;
  }

  // Weighted Normalized Total (0 - 100)
  const weightedSum =
    contentTypeScore * 0.25 +
    skillScore * 0.20 +
    toolScore * 0.15 +
    specializationScore * 0.15 +
    formatScore * 0.10 +
    commercialScore * 0.10 +
    portfolioScore * 0.05;

  const overallScore = Math.min(100, Math.round(weightedSum));

  const factorScores: MatchFactorScores = {
    contentType: contentTypeScore,
    skills: skillScore,
    tools: toolScore,
    specialization: specializationScore,
    format: formatScore,
    commercialUse: commercialScore,
    portfolioRelevance: portfolioScore,
  };

  // Compile Reasons
  const reasons: string[] = [];
  if (contentTypeScore >= 85) {
    reasons.push(`Produces ${brief.contentType} deliverables.`);
  }
  if (specializationScore >= 85) {
    reasons.push(`Specializes in ${creator.specialization}.`);
  }
  if (matchedTools.length > 0) {
    reasons.push(`Uses key AI stack: ${matchedTools.slice(0, 3).join(", ")}.`);
  }
  if (matchedFormats.length > 0) {
    reasons.push(`Delivers natively in ${brief.aspectRatio || "requested format"}.`);
  }
  if (creator.commercialUse && brief.commercialUse) {
    reasons.push(`Offers full commercial use rights.`);
  }

  // Construct Natural-Language Match Explanation
  const topTools = matchedTools.slice(0, 2).join(" and ");
  const explanation = `${overallScore >= 90 ? "Strong fit" : "Solid match"} for this campaign because ${creator.name} specializes in ${creator.specialization}${
    matchedFormats.length > 0 ? `, supports ${brief.aspectRatio || "9:16"} delivery` : ""
  }${topTools ? `, leverages ${topTools}` : ""}${
    creator.commercialUse ? ", and has commercial-use availability" : ""
  }.`;

  return {
    creator,
    overallScore,
    factorScores,
    matchedSkills,
    matchedTools,
    matchedFormats,
    reasons,
    explanation,
  };
}

/**
 * Ranks an array of creators for a given brief in descending order of match score.
 */
export function rankCreatorsForBrief(
  brief: CreativeBrief,
  creators: CreatorProfile[]
): CreatorMatchResult[] {
  const scored = creators.map((creator) => calculateMatchScore(brief, creator));
  return scored.sort((a, b) => b.overallScore - a.overallScore);
}
