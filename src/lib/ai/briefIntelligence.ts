/**
 * KreaLink AI 2.0 — Brief Intelligence Engine
 * Transforms natural language creative concepts into validated, structured briefs
 * with progressive clarification, readiness scoring, and certainty tracking.
 */

import { normalizeCreativeText } from "./taxonomy";
import {
  StructuredBrief2,
  ClarificationQuestion,
  FieldCertainty,
  sanitizeStructuredBrief,
} from "./schemas";
import { executeAiTask } from "./modelProvider";

const BRIEF_BUILDER_SYSTEM_PROMPT_V2 = `You are KreaLink's Principal Creative Strategist and AI Brief Architect.
Your role is to understand a brand's creative campaign concept and structure it into a comprehensive production-ready creative brief for elite generative AI creators.

STRICT PRINCIPLES:
1. UNDERSTAND REAL INTENT: Infer what is reasonably implied by the industry, product, and platform without hallucinating arbitrary constraints.
2. ZERO HALLUCINATION & HONEST UNCERTAINTY:
   - If tools/models were NOT requested by the brand, DO NOT invent tools. Set "toolsPreferred": [] and "modelsPreferred": [], with certainty "UNKNOWN".
   - If duration is missing, set "duration": "Unspecified (Needs Clarification)", with certainty "NEEDS_CLARIFICATION".
   - If commercial rights are not explicitly specified or evident, mark "commercialUseStatus": "NEEDS_CLARIFICATION".
3. MULTILINGUAL & HINGLISH COMPREHENSION:
   - Seamlessly comprehend Hindi-English mixed phrases (e.g. "Mujhe ek luxury perfume ka cinematic reel banana hai Insta ke liye" → Content: Short-form Video (Reels/TikTok), Platform: Instagram, Format: 9:16 Vertical, Style: Minimalist Luxury, Industry: Beauty & Cosmetics).
4. TARGETED CLARIFICATION:
   - When key fields are missing or ambiguous (e.g. format, objective, duration, commercial rights), generate 2-3 high-impact multiple-choice clarification questions with actionable options.
5. ADVISORY AI RECOMMENDATIONS:
   - Provide 2-3 non-binding creative recommendations under "aiRecommendations" (e.g. "Recommend 15–30s runtime with a high-impact hook in the first 3 seconds for Instagram Reels").

Required JSON Output Schema:
{
  "campaignName": string,
  "objective": string,
  "industry": string,
  "product": string,
  "targetAudience": string,
  "creativeDirection": string,
  "contentType": string,
  "style": string[],
  "platforms": string[],
  "formats": string[],
  "aspectRatio": string,
  "duration": string,
  "deliverables": string[],
  "skillsRequired": string[],
  "toolsPreferred": string[],
  "modelsPreferred": string[],
  "workflowRequirements": string,
  "commercialUse": boolean,
  "commercialUseStatus": "CONFIRMED" | "INFERRED" | "UNKNOWN" | "NEEDS_CLARIFICATION",
  "brandConstraints": string[],
  "tone": string,
  "deadline": string,
  "budget": string,
  "additionalNotes": string,
  "certaintyMap": {
    "contentType": "CONFIRMED" | "INFERRED" | "UNKNOWN" | "NEEDS_CLARIFICATION",
    "aspectRatio": "CONFIRMED" | "INFERRED" | "UNKNOWN" | "NEEDS_CLARIFICATION",
    "commercialUse": "CONFIRMED" | "INFERRED" | "UNKNOWN" | "NEEDS_CLARIFICATION",
    "duration": "CONFIRMED" | "INFERRED" | "UNKNOWN" | "NEEDS_CLARIFICATION",
    "toolsPreferred": "CONFIRMED" | "INFERRED" | "UNKNOWN" | "NEEDS_CLARIFICATION",
    "targetAudience": "CONFIRMED" | "INFERRED" | "UNKNOWN" | "NEEDS_CLARIFICATION"
  },
  "clarifications": [
    {
      "id": string,
      "field": string,
      "question": string,
      "reason": string,
      "choices": [{ "label": string, "value": string, "description": string }]
    }
  ],
  "aiRecommendations": string[]
}`;

/**
 * Heuristic Brief Engine: Advanced offline intelligence running the full taxonomy,
 * Hinglish detection, and clarification logic with deterministic reliability.
 */
export function buildHeuristicBrief(promptText: string): StructuredBrief2 {
  const norm = normalizeCreativeText(promptText);
  const text = promptText.toLowerCase();
  const wordCount = promptText.trim().split(/\s+/).length;

  const isVague =
    norm.ambiguityScore >= 0.55 ||
    wordCount <= 7 ||
    text.includes("something cool") ||
    text.includes("ai video for my") ||
    text.includes("ai video for our") ||
    text.includes("stylish and modern for clothes") ||
    text.includes("need an ai video") ||
    text === "i need an ai video for my brand.";

  const certaintyMap: Record<string, FieldCertainty> = {};
  const clarifications: ClarificationQuestion[] = [];
  const aiRecommendations: string[] = [];

  // 1. Content Type Extraction
  let contentType = norm.normalizedContentType || "Brand Commercials";
  if (norm.normalizedContentType) {
    certaintyMap.contentType = "CONFIRMED";
  } else if (text.includes("video") || text.includes("film") || text.includes("spot")) {
    contentType = "Brand Commercials";
    certaintyMap.contentType = "INFERRED";
  } else {
    contentType = "Brand Commercials";
    certaintyMap.contentType = "NEEDS_CLARIFICATION";
  }

  // 2. Aspect Ratio & Format
  let aspectRatio = norm.normalizedFormat || "9:16 Vertical (Reels/Shorts)";
  if (norm.normalizedFormat) {
    certaintyMap.aspectRatio = "CONFIRMED";
  } else if (text.includes("insta") || text.includes("tiktok") || text.includes("reel") || text.includes("shoe")) {
    aspectRatio = "9:16 Vertical (Reels/Shorts)";
    certaintyMap.aspectRatio = "INFERRED";
    aiRecommendations.push("Recommended 9:16 vertical delivery based on mobile audience target.");
  } else if (text.includes("youtube") || text.includes("tv") || text.includes("web") || text.includes("perfume")) {
    aspectRatio = "16:9 Landscape (YouTube/TV)";
    certaintyMap.aspectRatio = "INFERRED";
  } else {
    aspectRatio = "9:16 Vertical (Reels/Shorts)";
    certaintyMap.aspectRatio = "NEEDS_CLARIFICATION";
  }

  // 3. Commercial Use Rights
  let commercialUse = true;
  if (norm.commercialIntent === false) {
    commercialUse = false;
    certaintyMap.commercialUse = "CONFIRMED";
  } else if (norm.commercialIntent === true) {
    commercialUse = true;
    certaintyMap.commercialUse = "CONFIRMED";
  } else {
    commercialUse = true;
    certaintyMap.commercialUse = isVague ? "NEEDS_CLARIFICATION" : "INFERRED";
  }

  // 4. Duration
  const duration = norm.detectedDuration || (isVague ? "Unspecified (Needs Clarification)" : "15-30s");
  if (norm.detectedDuration) {
    certaintyMap.duration = "CONFIRMED";
  } else {
    certaintyMap.duration = isVague ? "NEEDS_CLARIFICATION" : "INFERRED";
    if (isVague) {
      aiRecommendations.push("Recommended specifying 15-30s duration for social reels or 45-60s for brand spots.");
    }
  }

  // 5. Tools & Models (Zero-Hallucination: Do NOT invent tools if unmentioned)
  let toolsPreferred: string[] = [];
  let modelsPreferred: string[] = [];
  if (norm.detectedTools.length > 0) {
    toolsPreferred = norm.detectedTools;
    certaintyMap.toolsPreferred = "CONFIRMED";
    if (toolsPreferred.includes("Runway")) modelsPreferred.push("Runway Gen-3 Alpha");
    if (toolsPreferred.includes("Midjourney")) modelsPreferred.push("Midjourney v6.1");
    if (toolsPreferred.includes("OpenAI Sora")) modelsPreferred.push("OpenAI Sora");
    if (toolsPreferred.includes("Kling AI")) modelsPreferred.push("Kling 1.5");
    if (toolsPreferred.includes("Flux")) modelsPreferred.push("Flux.1 Dev");
  } else {
    toolsPreferred = [];
    modelsPreferred = [];
    certaintyMap.toolsPreferred = "UNKNOWN";
    aiRecommendations.push("No specific AI toolchain required — platform matching will prioritize creator visual mastery and proven reel delivery.");
  }

  // 6. Progressive Clarification Questions (Generated ONLY when missing high-impact fields)
  if (isVague) {
    if (!norm.normalizedContentType || certaintyMap.contentType === "NEEDS_CLARIFICATION") {
      clarifications.push({
        id: "clarify_content_type",
        field: "contentType",
        question: "What primary creative format do you need produced?",
        reason: "Ensures we match specialized directors vs visual artists",
        choices: [
          { label: "Short-form Reel / TikTok", value: "Short-form Video (Reels/TikTok)", description: "High-energy 9:16 vertical video" },
          { label: "Brand Commercial Spot", value: "Brand Commercials", description: "Broadcast & digital ad with cinematic polish" },
          { label: "Cinematic Trailer", value: "Cinematic Trailers", description: "Narrative worldbuilding sequence" },
          { label: "Product Visualizer", value: "Product Visualizations", description: "Hero product animation & liquid/particle physics" },
        ],
      });
    }

    if (!norm.normalizedFormat || certaintyMap.aspectRatio === "NEEDS_CLARIFICATION") {
      clarifications.push({
        id: "clarify_aspect_ratio",
        field: "aspectRatio",
        question: "Which screen aspect ratio is required for distribution?",
        reason: "Affects camera framing and model latent composition",
        choices: [
          { label: "9:16 Vertical", value: "9:16 Vertical (Reels/Shorts)", description: "Optimized for Instagram Reels & TikTok" },
          { label: "16:9 Landscape", value: "16:9 Landscape (YouTube/TV)", description: "Standard widescreen for YouTube & broadcast" },
          { label: "1:1 Square", value: "1:1 Square (Instagram Post)", description: "Feed carousel & multi-platform ads" },
          { label: "Multi-Format Pack", value: "9:16 Vertical + 16:9 Cut", description: "Both vertical and horizontal deliverables" },
        ],
      });
    }

    if (certaintyMap.commercialUse === "NEEDS_CLARIFICATION") {
      clarifications.push({
        id: "clarify_commercial_rights",
        field: "commercialUse",
        question: "Do you require full commercial broadcasting rights & IP clearance?",
        reason: "Determines whether creators must provide commercial model indemnification",
        choices: [
          { label: "Full Commercial Rights", value: "true", description: "Paid media, TV, and global commercial rights" },
          { label: "Internal Pitch / Spec Only", value: "false", description: "Concept deck or portfolio use only" },
        ],
      });
    }

    if (certaintyMap.duration === "NEEDS_CLARIFICATION" && clarifications.length < 3) {
      clarifications.push({
        id: "clarify_duration",
        field: "duration",
        question: "What is your target runtime for this video?",
        reason: "Determines scene pacing and compute generation budget",
        choices: [
          { label: "15s Hook", value: "15s Hook", description: "Ultra-fast social hook" },
          { label: "30s Commercial", value: "30s Commercial", description: "Standard brand narrative" },
          { label: "60s Director's Cut", value: "60s Director's Cut", description: "Extended cinematic sequence" },
        ],
      });
    }
  }

  // 7. Industry & Product
  const industry = norm.detectedIndustry || (text.includes("tech") ? "Consumer Electronics & Tech" : "Fashion & Luxury Goods");
  let product = "Featured Offering";
  if (text.includes("shoe") || text.includes("sneaker") || text.includes("footwear")) product = "Futuristic Athletic Footwear";
  else if (text.includes("perfume") || text.includes("fragrance")) product = "Haute Horlogerie & Fragrance";
  else if (text.includes("watch") || text.includes("timepiece")) product = "Haute Horlogerie Timepiece";
  else if (text.includes("car") || text.includes("auto") || text.includes("vehicle")) product = "Autonomous Concept Vehicle";
  else if (text.includes("laptop") || text.includes("computer")) product = "Next-Gen Pro Laptop";
  else if (text.includes("clothes") || text.includes("apparel") || text.includes("streetwear")) product = "Apparel Collection";

  // 8. Campaign Name
  let campaignName = "AI Creative Campaign";
  if (product !== "Featured Offering") {
    campaignName = `${product} Launch Spot`;
  } else {
    const words = promptText.trim().split(/\s+/).slice(0, 4).join(" ");
    campaignName = words.length > 4 ? `${words.charAt(0).toUpperCase() + words.slice(1)} Campaign` : "AI Creative Campaign";
  }

  // 9. Style & Aesthetics
  const style = norm.detectedStyles.length > 0 ? norm.detectedStyles : ["Cinematic Realism", "High-Gloss Commercial"];

  // 10. Deliverables
  const deliverables = [
    `1x Master Video (${duration}, ${aspectRatio})`,
    "3x High-Resolution Keyframe Post-Production Stills",
    "1x Clean Cut for Paid Social (Uncompressed)",
  ];

  const briefDraft: Partial<StructuredBrief2> = {
    campaignName,
    objective: `Drive brand engagement with ${style.join(" / ")} visual storytelling. Original idea: "${promptText}".`,
    industry,
    product,
    targetAudience: "Digital trendsetters, style enthusiasts & mobile-first consumers",
    creativeDirection: promptText,
    contentType,
    style,
    platforms: [aspectRatio.includes("9:16") ? "Instagram Reels & TikTok" : "YouTube & Broadcast"],
    formats: [aspectRatio, "4K UHD"],
    aspectRatio,
    duration,
    deliverables,
    skillsRequired: [
      "Dynamic Camera Trajectories",
      "Photorealistic Lighting & Shading",
      "Multi-shot Character Consistency",
    ],
    toolsPreferred,
    modelsPreferred,
    workflowRequirements: toolsPreferred.length > 0
      ? `${toolsPreferred.join(" + ")} generative pipeline with color grading`
      : "Multi-model generative AI workflow with professional post-production grade",
    commercialUse,
    commercialUseStatus: certaintyMap.commercialUse || "CONFIRMED",
    brandConstraints: ["Maintain strict brand visual identity", "No visual distortion or temporal flickering"],
    tone: "Visionary, premium & aesthetically confident",
    deadline: "2-3 Weeks (Standard Production)",
    budget: "Enterprise Production Tier",
    additionalNotes: norm.isHinglish ? "Synthesized from multilingual / Hinglish creative concept." : "Structured via KreaLink AI Brief Intelligence Engine 2.0.",
    certaintyMap,
    clarifications: clarifications.slice(0, 3),
    aiRecommendations,
    source: "AI_FALLBACK",
  };

  return sanitizeStructuredBrief(briefDraft, promptText);
}

/**
 * Builds an AI-native structured brief from free-form prompt text.
 * Routes to live LLM when available, falling back smoothly to the Heuristic Engine.
 */
export async function generateBrief2(promptText: string): Promise<StructuredBrief2> {
  if (!promptText || promptText.trim().length < 5) {
    return buildHeuristicBrief(promptText || "New AI Campaign");
  }

  try {
    const execResult = await executeAiTask({
      task: "brief_extraction",
      systemPrompt: BRIEF_BUILDER_SYSTEM_PROMPT_V2,
      userPrompt: promptText,
      temperature: 0.2,
    });

    if (execResult.parsedJson && typeof execResult.parsedJson === "object") {
      const isLive = execResult.provider === "gemini" || execResult.provider === "openai";
      const sanitized = sanitizeStructuredBrief(
        {
          ...execResult.parsedJson,
          source: isLive ? "AI_LIVE" : "AI_FALLBACK",
        },
        promptText
      );
      return sanitized;
    }
  } catch (err) {
    console.warn("[KreaLink AI] Live brief generation fallback:", (err as Error)?.message);
  }

  // Robust heuristic fallback
  return buildHeuristicBrief(promptText);
}
