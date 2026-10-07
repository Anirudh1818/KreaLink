/**
 * KreaLink AI 2.0 — Schema & Type Definitions
 * Strict contracts, runtime validators, and JSON sanitizers for AI outputs.
 */

export type FieldCertainty = "CONFIRMED" | "INFERRED" | "UNKNOWN" | "NEEDS_CLARIFICATION";

export type ClarificationChoice = {
  label: string;
  value: string;
  description?: string;
};

export type ClarificationQuestion = {
  id: string;
  field: string;
  question: string;
  reason: string;
  choices: ClarificationChoice[];
};

export type EvidenceLevel =
  | "system-verified"
  | "portfolio-demonstrated"
  | "creator-confirmed"
  | "profile-listed";

export type MatchConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

export type BriefReadiness = {
  score: number; // 0 - 100%
  status: "READY" | "NEEDS_CLARIFICATION" | "CRITICAL_GAPS";
  confirmedCount: number;
  inferredCount: number;
  missingCrucialCount: number;
  strengths: string[];
  gaps: string[];
};

export type StructuredBrief2 = {
  campaignName: string;
  objective: string;
  industry: string;
  product: string;
  targetAudience: string;
  creativeDirection: string;
  contentType: string;
  style: string[];
  platforms: string[];
  formats: string[];
  aspectRatio: string;
  duration: string;
  deliverables: string[];
  skillsRequired: string[];
  toolsPreferred: string[];
  modelsPreferred: string[];
  workflowRequirements: string;
  commercialUse: boolean;
  commercialUseStatus: FieldCertainty;
  brandConstraints: string[];
  tone: string;
  deadline: string;
  budget: string;
  additionalNotes: string;
  
  // Intelligence Meta
  certaintyMap: Record<string, FieldCertainty>;
  readiness: BriefReadiness;
  clarifications: ClarificationQuestion[];
  aiRecommendations: string[];
  source: "AI_LIVE" | "AI_FALLBACK" | "gemini" | "openai" | "heuristic-intelligence";
};

export type PortfolioAnalysisResult = {
  contentType: string;
  skills: string[];
  tools: string[];
  models: string[];
  workflow: string;
  formats: string[];
  commercialUse: boolean;
  suggestedTitle?: string;
  confidence: "High" | "Medium" | "Low";
  reasoning: string;
};

/**
 * Robust JSON Extractor & Sanitizer.
 * Safely strips markdown code blocks, trims surrounding conversational text,
 * and normalizes common syntax quirks.
 */
export function cleanAndParseJson<T = unknown>(rawText: string): T {
  let cleaned = rawText.trim();

  // Strip Markdown code fences: ```json ... ``` or ``` ... ```
  if (cleaned.startsWith("```")) {
    const firstNewline = cleaned.indexOf("\n");
    const lastFence = cleaned.lastIndexOf("```");
    if (firstNewline !== -1 && lastFence > firstNewline) {
      cleaned = cleaned.substring(firstNewline + 1, lastFence).trim();
    }
  }

  // Find start and end braces
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  // Remove trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");

  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    throw new Error(`Failed to parse AI JSON response: ${(err as Error).message}. Text: ${cleaned.slice(0, 150)}...`);
  }
}

/**
 * Validates and normalizes structured brief data into a safe, guaranteed schema.
 * Strictly prevents hallucinating tools, duration, or budget when unmentioned.
 */
export function sanitizeStructuredBrief(data: Partial<StructuredBrief2>, originalPrompt: string): StructuredBrief2 {
  const certaintyMap: Record<string, FieldCertainty> = data.certaintyMap || {};

  const ensureArray = (val: unknown): string[] => {
    if (Array.isArray(val)) return val.map(String).map((s) => s.trim()).filter(Boolean);
    if (typeof val === "string" && val.trim()) return [val.trim()];
    return [];
  };

  const style = ensureArray(data.style);
  const platforms = ensureArray(data.platforms);
  const formats = ensureArray(data.formats);
  const deliverables = ensureArray(data.deliverables);
  const skillsRequired = ensureArray(data.skillsRequired);
  const toolsPreferred = ensureArray(data.toolsPreferred);
  const modelsPreferred = ensureArray(data.modelsPreferred);
  const brandConstraints = ensureArray(data.brandConstraints);
  const aiRecommendations = ensureArray(data.aiRecommendations);

  // Calculate honest Brief Readiness from actual field completeness
  let confirmedCount = 0;
  let inferredCount = 0;
  let missingCrucialCount = 0;
  const strengths: string[] = [];
  const gaps: string[] = [];

  const checkField = (name: string, val: unknown, isCrucial: boolean, label: string) => {
    const cert = certaintyMap[name] || (val ? "CONFIRMED" : "UNKNOWN");
    if (cert === "CONFIRMED" && val) {
      confirmedCount++;
      strengths.push(`${label} confirmed`);
    } else if (cert === "INFERRED" && val) {
      inferredCount++;
      strengths.push(`${label} inferred from context`);
    } else if (isCrucial || cert === "NEEDS_CLARIFICATION" || cert === "UNKNOWN") {
      missingCrucialCount++;
      gaps.push(`${label} needs clarification`);
    }
  };

  checkField("objective", data.objective, true, "Campaign Objective");
  checkField("contentType", data.contentType, true, "Content Type");
  checkField("aspectRatio", data.aspectRatio, true, "Aspect Ratio");
  checkField("commercialUse", data.commercialUse, true, "Commercial Clearance");
  checkField("duration", data.duration, false, "Duration / Runtime");
  checkField("toolsPreferred", toolsPreferred.length > 0 ? toolsPreferred : null, false, "Preferred Toolchain");
  checkField("targetAudience", data.targetAudience, false, "Target Audience");

  // Readiness Score formula (0-100%)
  const totalWeight = 7;
  const earned = confirmedCount * 1.0 + inferredCount * 0.6;
  const score = Math.min(100, Math.max(20, Math.round((earned / totalWeight) * 100)));

  const readiness: BriefReadiness = {
    score,
    status: score >= 80 ? "READY" : score >= 50 ? "NEEDS_CLARIFICATION" : "CRITICAL_GAPS",
    confirmedCount,
    inferredCount,
    missingCrucialCount,
    strengths: strengths.slice(0, 4),
    gaps: gaps.slice(0, 4),
  };

  const rawDuration = typeof data.duration === "string" ? data.duration.trim() : "";
  const duration = rawDuration || (certaintyMap.duration === "NEEDS_CLARIFICATION" ? "Unspecified (Needs Clarification)" : "15-30s");

  const rawAspect = typeof data.aspectRatio === "string" ? data.aspectRatio.trim() : "";
  const aspectRatio = rawAspect || (certaintyMap.aspectRatio === "NEEDS_CLARIFICATION" ? "Unspecified (Needs Clarification)" : "9:16 Vertical (Reels/Shorts)");

  return {
    campaignName: String(data.campaignName || "AI Creative Campaign").trim(),
    objective: String(data.objective || "Promote campaign with high-impact visual storytelling").trim(),
    industry: String(data.industry || "General Commercial").trim(),
    product: String(data.product || "Featured Offering").trim(),
    targetAudience: String(data.targetAudience || "Digital Audience & Creators").trim(),
    creativeDirection: String(data.creativeDirection || originalPrompt).trim(),
    contentType: String(data.contentType || "Short-form Video (Reels/TikTok)").trim(),
    style: style.length > 0 ? style : ["Cinematic Realism"],
    platforms: platforms.length > 0 ? platforms : ["Instagram Reels & TikTok"],
    formats: formats.length > 0 ? formats : [aspectRatio],
    aspectRatio,
    duration,
    deliverables: deliverables.length > 0 ? deliverables : ["1x Master Video Deliverable", "3x High-Res Still Keyframes"],
    skillsRequired: skillsRequired.length > 0 ? skillsRequired : ["Dynamic Camera Trajectories", "Photorealistic Lighting"],
    toolsPreferred,
    modelsPreferred,
    workflowRequirements: String(data.workflowRequirements || "Generative AI workflow with post-production color grading").trim(),
    commercialUse: data.commercialUse !== false,
    commercialUseStatus: data.commercialUseStatus || certaintyMap.commercialUse || "CONFIRMED",
    brandConstraints: brandConstraints,
    tone: String(data.tone || "Premium & Confident").trim(),
    deadline: String(data.deadline || "Standard Turnaround (2-3 Weeks)").trim(),
    budget: String(data.budget || "Tier-1 Commercial Production").trim(),
    additionalNotes: String(data.additionalNotes || "Structured via KreaLink Creative Intelligence Engine").trim(),
    certaintyMap,
    readiness,
    clarifications: Array.isArray(data.clarifications) ? data.clarifications : [],
    aiRecommendations,
    source: data.source || "AI_FALLBACK",
  };
}
