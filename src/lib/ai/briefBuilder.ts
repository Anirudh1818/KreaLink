export type StructuredBriefData = {
  campaignName: string;
  requirements: string;
  contentType: string;
  style: string[];
  platform: string;
  aspectRatio: string;
  targetAudience: string;
  deliverables: string[];
  commercialUse: boolean;
  notes: string;
  source: "ai" | "demo-fallback";
};

/**
 * Deterministic fallback parser for development and offline testing.
 * Intelligent rule-based parsing extracts structured campaign parameters from natural language.
 */
function parseBriefWithRuleEngine(promptText: string): StructuredBriefData {
  const text = promptText.toLowerCase();

  // 1. Campaign Name
  let campaignName = "New AI Campaign";
  if (text.includes("shoe") || text.includes("sneaker") || text.includes("running")) {
    campaignName = "Futuristic Running Shoe Launch";
  } else if (text.includes("fashion") || text.includes("apparel") || text.includes("clothing")) {
    campaignName = "Next-Gen Apparel Brand Showcase";
  } else if (text.includes("perfume") || text.includes("cosmetic") || text.includes("beauty")) {
    campaignName = "Luxury Scent Cinematic Reveal";
  } else if (text.includes("car") || text.includes("auto") || text.includes("vehicle")) {
    campaignName = "Autonomous Vehicle Concept Spot";
  } else if (text.includes("drink") || text.includes("beverage") || text.includes("energy")) {
    campaignName = "Hyper-Energy Beverage Campaign";
  } else {
    // Generate from first 6 words
    const words = promptText.trim().split(/\s+/).slice(0, 5).join(" ");
    campaignName = words.length > 5 ? `${words.charAt(0).toUpperCase() + words.slice(1)} Campaign` : "AI Creative Campaign";
  }

  // 2. Content Type
  let contentType = "Short-form Video (Reels/TikTok)";
  if (text.includes("commercial") || text.includes("ad spot") || text.includes("tv")) {
    contentType = "Brand Commercials";
  } else if (text.includes("trailer") || text.includes("cinematic teaser")) {
    contentType = "Cinematic Trailers";
  } else if (text.includes("music") || text.includes("song")) {
    contentType = "Music Videos";
  } else if (text.includes("product") && !text.includes("reel")) {
    contentType = "Product Visualizations";
  } else if (text.includes("poster") || text.includes("still") || text.includes("concept art")) {
    contentType = "Concept Art & Posters";
  }

  // 3. Platform & Aspect Ratio
  let platform = "Instagram Reels & TikTok";
  let aspectRatio = "9:16 Vertical (Reels/Shorts)";

  if (text.includes("youtube") || text.includes("16:9") || text.includes("landscape") || text.includes("cinema") || text.includes("tv")) {
    platform = "YouTube & Web Video";
    aspectRatio = "16:9 Landscape (YouTube/TV)";
  } else if (text.includes("square") || text.includes("1:1") || text.includes("feed")) {
    platform = "Instagram Feed / Meta";
    aspectRatio = "1:1 Square (Instagram)";
  } else if (text.includes("9:16") || text.includes("reel") || text.includes("tiktok") || text.includes("shorts")) {
    platform = "Instagram Reels & TikTok";
    aspectRatio = "9:16 Vertical (Reels/Shorts)";
  }

  // 4. Style tags
  const style: string[] = [];
  if (text.includes("futuristic") || text.includes("sci-fi") || text.includes("cyber")) style.push("Futuristic");
  if (text.includes("cinematic") || text.includes("film") || text.includes("movie")) style.push("Cinematic");
  if (text.includes("energetic") || text.includes("fast") || text.includes("dynamic") || text.includes("hype")) style.push("High-Energy");
  if (text.includes("luxury") || text.includes("premium") || text.includes("minimal")) style.push("Luxury Aesthetic");
  if (text.includes("dark") || text.includes("moody") || text.includes("neon")) style.push("Cyberpunk / Neon");
  if (text.includes("realistic") || text.includes("photoreal")) style.push("Photorealistic");
  if (style.length === 0) style.push("Modern Cinematic", "Commercial High-Gloss");

  // 5. Target Audience
  let targetAudience = "Gen Z & Young Creators (18-28)";
  if (text.includes("gen z") || text.includes("gen-z") || text.includes("youth")) {
    targetAudience = "Gen Z Trendsetters & Digital Natives (16-24)";
  } else if (text.includes("millennial") || text.includes("professional")) {
    targetAudience = "Urban Professionals & Tech Enthusiasts (25-40)";
  } else if (text.includes("luxury") || text.includes("high-end")) {
    targetAudience = "Affluent Luxury Consumers (25-45)";
  } else if (text.includes("runner") || text.includes("athlete") || text.includes("fitness")) {
    targetAudience = "Active Fitness & Streetwear Community (18-34)";
  }

  // 6. Deliverables
  const deliverables: string[] = [];
  if (text.includes("30-second") || text.includes("30s") || text.includes("30 sec")) {
    deliverables.push("1x 30-Second Hero Video Deliverable");
  } else if (text.includes("15-second") || text.includes("15s")) {
    deliverables.push("1x 15-Second Hook Video");
  } else {
    deliverables.push("1x 30-Second Master Video");
  }
  deliverables.push("3x High-Res Still Keyframes / Posters", "1x Clean Cut for Social Ads (Without text overlays)");

  // 7. Commercial Use
  let commercialUse = true; // default true for marketplace brand briefs
  if (text.includes("non-commercial") || text.includes("personal only")) {
    commercialUse = false;
  }

  // 8. Requirements
  const requirements = `Create a ${style.join(", ")} visual campaign. Must maintain strict character and product consistency, fluid camera motion, sound design sync, and pristine 4K resolution output. Original prompt: "${promptText}"`;

  // 9. Notes
  const notes = "Delivered via KreaLink AI Creator Marketplace. Client brand and selected creator agree on final format revisions and media handoff upon invitation acceptance.";

  return {
    campaignName,
    requirements,
    contentType,
    style,
    platform,
    aspectRatio,
    targetAudience,
    deliverables,
    commercialUse,
    notes,
    source: "demo-fallback",
  };
}

/**
 * Builds a structured creative brief from a natural-language campaign idea.
 * Supports external LLM providers when configured in environment, with
 * an intelligent deterministic fallback when no external keys are present.
 */
export async function generateStructuredBrief(promptText: string): Promise<StructuredBriefData> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  if (geminiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `You are KreaLink's AI Brief Architect. Convert this brand campaign concept into a strict JSON object without markdown code blocks.
Concept: "${promptText}"

JSON schema required:
{
  "campaignName": string,
  "requirements": string,
  "contentType": string,
  "style": string[],
  "platform": string,
  "aspectRatio": string,
  "targetAudience": string,
  "deliverables": string[],
  "commercialUse": boolean,
  "notes": string
}`,
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.2,
            },
          }),
        }
      );

      if (response.ok) {
        const json = await response.json();
        const rawContent = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawContent) {
          const parsed = JSON.parse(rawContent);
          return {
            ...parsed,
            source: "ai",
          };
        }
      }
    } catch (err) {
      console.warn("External Gemini API call failed, using deterministic fallback:", err);
    }
  }

  if (openAiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You are KreaLink AI Brief Builder. Output a structured JSON brief with keys: campaignName, requirements, contentType, style (array), platform, aspectRatio, targetAudience, deliverables (array), commercialUse (boolean), notes.",
            },
            {
              role: "user",
              content: promptText,
            },
          ],
        }),
      });

      if (response.ok) {
        const json = await response.json();
        const content = json.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          return {
            ...parsed,
            source: "ai",
          };
        }
      }
    } catch (err) {
      console.warn("External OpenAI call failed, using deterministic fallback:", err);
    }
  }

  // Graceful deterministic development / demo fallback
  return parseBriefWithRuleEngine(promptText);
}
