/**
 * KreaLink AI 2.0 — Portfolio Intelligence Engine
 * Automatically analyzes portfolio reel descriptions to propose structured
 * metadata tags (tools, models, skills, workflow, commercial use) for creator confirmation.
 */

import { normalizeCreativeText } from "./taxonomy";
import { PortfolioAnalysisResult } from "./schemas";
import { executeAiTask } from "./modelProvider";

const PORTFOLIO_ANALYZER_SYSTEM_PROMPT_V2 = `You are KreaLink's Portfolio Intelligence Specialist.
Analyze an AI creator's project description to propose accurate, structured production metadata.

STRICT PRINCIPLES:
1. NO FABRICATION: Only detect tools, skills, and workflows directly mentioned or undeniably evident from the visual technique described.
2. REQUIRE CONFIRMATION: The creator will review and approve these suggestions.
3. STRUCTURED TAXONOMY: Align tools and skills with industry terms (Runway Gen-3, Midjourney v6.1, Flux.1, Kling 1.5, ComfyUI).

Return JSON schema:
{
  "contentType": string,
  "skills": string[],
  "tools": string[],
  "models": string[],
  "workflow": string,
  "formats": string[],
  "commercialUse": boolean,
  "confidence": "High" | "Medium" | "Low",
  "reasoning": string
}`;

export function analyzePortfolioItemHeuristic(
  title: string,
  description: string
): PortfolioAnalysisResult {
  const text = `${title} ${description}`.toLowerCase();
  const norm = normalizeCreativeText(text);

  const tools: string[] = norm.detectedTools.length > 0 ? norm.detectedTools : ["Runway", "Midjourney"];
  const models: string[] = [];
  if (tools.includes("Runway")) models.push("Runway Gen-3 Alpha");
  if (tools.includes("Midjourney")) models.push("Midjourney v6.1");
  if (tools.includes("Flux")) models.push("Flux.1 Dev");
  if (tools.includes("Kling AI")) models.push("Kling 1.5");
  if (models.length === 0) models.push("Runway Gen-3 Alpha");

  const skills: string[] = [];
  if (text.includes("camera") || text.includes("motion") || text.includes("trajectory") || text.includes("speed")) {
    skills.push("Dynamic Camera Trajectories");
  }
  if (text.includes("light") || text.includes("shadow") || text.includes("glow") || text.includes("photoreal")) {
    skills.push("Photorealistic Lighting & Shading");
  }
  if (text.includes("35mm") || text.includes("film") || text.includes("grain") || text.includes("analog")) {
    skills.push("Analog Film Emulation");
  }
  if (text.includes("particle") || text.includes("smoke") || text.includes("fluid") || text.includes("water")) {
    skills.push("Fluid & Particle FX");
  }
  if (text.includes("character") || text.includes("person") || text.includes("face")) {
    skills.push("Multi-shot Character Consistency");
  }
  if (skills.length === 0) {
    skills.push("Dynamic Camera Trajectories", "Prompt Architecture");
  }

  const contentType = norm.normalizedContentType || "Short-form Video (Reels/TikTok)";
  const format = norm.normalizedFormat || "9:16 Vertical (Reels/Shorts)";
  const commercialUse = !text.includes("personal") && !text.includes("concept only");

  const primaryTool = tools[0] || "Generative Diffusion";
  const primaryModel = models[0] || "Gen-3";
  const workflow = `${primaryTool} concept generation → ${primaryModel} temporal camera motion pass → High-bitrate post-production grade.`;

  return {
    contentType,
    skills,
    tools,
    models,
    workflow,
    formats: [format, "4K UHD"],
    commercialUse,
    confidence: norm.detectedTools.length > 0 ? "High" : "Medium",
    reasoning: `Extracted ${tools.length} active AI tools and ${skills.length} demonstrated creative techniques from project narrative.`,
  };
}

export async function analyzePortfolioItem(
  title: string,
  description: string
): Promise<PortfolioAnalysisResult> {
  if (!description || description.trim().length < 10) {
    return analyzePortfolioItemHeuristic(title, description);
  }

  try {
    const result = await executeAiTask({
      task: "portfolio_enrichment",
      systemPrompt: PORTFOLIO_ANALYZER_SYSTEM_PROMPT_V2,
      userPrompt: `Project Title: "${title}"\nProject Description: "${description}"`,
      temperature: 0.1,
    });

    if (result.parsedJson && typeof result.parsedJson === "object") {
      const p = result.parsedJson;
      return {
        contentType: String(p.contentType || "Short-form Video (Reels/TikTok)"),
        skills: Array.isArray(p.skills) ? p.skills.map(String) : ["Dynamic Camera Trajectories"],
        tools: Array.isArray(p.tools) ? p.tools.map(String) : ["Runway"],
        models: Array.isArray(p.models) ? p.models.map(String) : ["Runway Gen-3 Alpha"],
        workflow: String(p.workflow || "Generative pipeline"),
        formats: Array.isArray(p.formats) ? p.formats.map(String) : ["9:16 Vertical (Reels/Shorts)"],
        commercialUse: Boolean(p.commercialUse ?? true),
        confidence: p.confidence === "High" || p.confidence === "Low" ? p.confidence : "Medium",
        reasoning: String(p.reasoning || "Derived via AI capability analysis."),
      };
    }
  } catch (err) {
    console.warn("[KreaLink AI] Portfolio enrichment fallback:", (err as Error)?.message);
  }

  return analyzePortfolioItemHeuristic(title, description);
}
