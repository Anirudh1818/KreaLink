/**
 * KreaLink Creative Intelligence Taxonomy
 * Normalized, controlled vocabulary for AI-native creator capabilities,
 * campaign requirements, multi-modal formats, and workflow tools.
 */

export const CANONICAL_SPECIALIZATIONS = [
  "AI Film Director & Experimental VFX Pioneer",
  "Sci-Fi AI Worldbuilder & Cinematic Director",
  "AI Cinematographer & Editorial Fashion Visualizer",
  "AI Surrealist & High-Concept VFX Director",
  "AI Storyteller & Spatial Narrative Director",
  "AI Creative Studio & Commercial Innovation Lab",
  "3D Product Visualizer & Motion Designer",
  "Generative Character Designer & Virtual Talent",
  "Luxury Brand Commercial Director",
] as const;

export type CanonicalSpecialization = typeof CANONICAL_SPECIALIZATIONS[number];

export const CANONICAL_CONTENT_TYPES = [
  "Brand Commercials",
  "Short-form Video (Reels/TikTok)",
  "Cinematic Trailers",
  "Fashion Films",
  "Music Videos",
  "Product Visualizations",
  "Experimental Short Films",
  "Narrative Shorts",
  "Concept Art & Keyframes",
] as const;

export type CanonicalContentType = typeof CANONICAL_CONTENT_TYPES[number];

export const CANONICAL_FORMATS = [
  "9:16 Vertical (Reels/Shorts)",
  "16:9 Landscape (YouTube/TV)",
  "1:1 Square (Instagram Post)",
  "21:9 Widescreen Cinema",
  "4:3 Narrative",
  "4K UHD",
  "1080p Full HD",
] as const;

export type CanonicalFormat = typeof CANONICAL_FORMATS[number];

export const CANONICAL_TOOLS = [
  "Runway",
  "Midjourney",
  "OpenAI Sora",
  "Kling AI",
  "Flux",
  "Luma Dream Machine",
  "ComfyUI",
  "Topaz Video AI",
  "Blender",
  "Cinema 4D",
  "After Effects",
  "ElevenLabs",
  "Magnific AI",
  "Claude",
  "Premiere Pro",
  "DaVinci Resolve",
] as const;

export type CanonicalTool = typeof CANONICAL_TOOLS[number];

export const CANONICAL_MODELS = [
  "Runway Gen-3 Alpha",
  "Runway Gen-2",
  "Midjourney v6.1",
  "OpenAI Sora",
  "Kling 1.5",
  "Flux.1 Dev",
  "Flux.1 Schnell",
  "Luma Ray 2",
  "Stable Diffusion XL",
  "Claude 3.5 Sonnet",
  "ElevenLabs Prime Voice",
] as const;

export type CanonicalModel = typeof CANONICAL_MODELS[number];

export const CANONICAL_SKILLS = [
  "Dynamic Camera Trajectories",
  "Multi-shot Character Consistency",
  "Analog Film Emulation",
  "Fluid & Particle FX",
  "Photorealistic Lighting & Shading",
  "Surreal World Design",
  "Architectural Worldbuilding",
  "Prompt Architecture",
  "Spatial Storytelling",
  "Commercial IP Clearance",
  "Physical Motion Tracking",
  "Editorial Storyboarding",
  "Sound Design & Audio Sync",
] as const;

export type CanonicalSkill = typeof CANONICAL_SKILLS[number];

export const CANONICAL_INDUSTRIES = [
  "Athletics & Footwear",
  "Fashion & Luxury Goods",
  "Automotive & Mobility",
  "Beauty & Cosmetics",
  "Entertainment & Gaming",
  "Consumer Electronics & Tech",
  "Beverage & CPG",
  "Music & Cultural Arts",
] as const;

export type CanonicalIndustry = typeof CANONICAL_INDUSTRIES[number];

export const CANONICAL_STYLES = [
  "Cinematic Realism",
  "Analog 35mm Film",
  "Cyberpunk & Neon",
  "Surreal & Dreamlike",
  "High-Gloss Commercial",
  "Minimalist Luxury",
  "High-Energy Streetwear",
  "Dystopian Sci-Fi",
  "Tactile Folklore & Woodcut",
] as const;

export type CanonicalStyle = typeof CANONICAL_STYLES[number];

/**
 * Normalization Dictionary: Maps informal, colloquial, and multilingual (Hinglish/slang)
 * phrases to canonical taxonomy terms.
 */
export const SYNONYM_MAP: Record<string, {
  contentType?: CanonicalContentType;
  format?: CanonicalFormat;
  tools?: CanonicalTool[];
  industry?: CanonicalIndustry;
  styles?: CanonicalStyle[];
}> = {
  // Multi-word specific phrases first
  "cinematic trailer": { contentType: "Cinematic Trailers", styles: ["Cinematic Realism"] },
  "genesis worldbuilding": { contentType: "Cinematic Trailers", styles: ["Dystopian Sci-Fi"] },
  "worldbuilding trailer": { contentType: "Cinematic Trailers", styles: ["Dystopian Sci-Fi"] },
  "space trailer": { contentType: "Cinematic Trailers", styles: ["Dystopian Sci-Fi"] },
  "music video": { contentType: "Music Videos", industry: "Music & Cultural Arts" },
  "music teaser": { contentType: "Music Videos", industry: "Music & Cultural Arts" },
  "fashion film": { contentType: "Fashion Films", industry: "Fashion & Luxury Goods", styles: ["Minimalist Luxury"] },
  "fashion showcase": { contentType: "Fashion Films", industry: "Fashion & Luxury Goods" },
  "luxury perfume": { contentType: "Fashion Films", industry: "Beauty & Cosmetics", styles: ["Minimalist Luxury"] },
  "luxury fragrance": { contentType: "Fashion Films", industry: "Beauty & Cosmetics", styles: ["Minimalist Luxury"] },
  "luxury watch": { contentType: "Fashion Films", industry: "Fashion & Luxury Goods", styles: ["Minimalist Luxury"] },
  "perfume showcase": { contentType: "Fashion Films", industry: "Beauty & Cosmetics" },
  "narrative short": { contentType: "Narrative Shorts", format: "4:3 Narrative" },
  "folklore storybook": { contentType: "Narrative Shorts", format: "4:3 Narrative", styles: ["Tactile Folklore & Woodcut"] },
  "folklore animation": { contentType: "Narrative Shorts", format: "4:3 Narrative", styles: ["Tactile Folklore & Woodcut"] },
  "animated short": { contentType: "Narrative Shorts", format: "4:3 Narrative" },
  "experimental short": { contentType: "Experimental Short Films", styles: ["Surreal & Dreamlike"] },
  "spec concept": { contentType: "Experimental Short Films" },
  "experimental film": { contentType: "Experimental Short Films" },
  "perspective warp": { contentType: "Experimental Short Films", styles: ["Surreal & Dreamlike"] },
  "cathedral": { contentType: "Cinematic Trailers", styles: ["Dystopian Sci-Fi"] },
  "cool for our new shoe": { contentType: "Short-form Video (Reels/TikTok)", format: "9:16 Vertical (Reels/Shorts)" },
  "perfume ka cinematic reel": { contentType: "Short-form Video (Reels/TikTok)", format: "9:16 Vertical (Reels/Shorts)", industry: "Beauty & Cosmetics", styles: ["Minimalist Luxury"] },
  "broadcast television commercial": { contentType: "Brand Commercials", styles: ["High-Gloss Commercial"] },
  "product visualization": { contentType: "Product Visualizations" },
  "product visualizer": { contentType: "Product Visualizations" },
  "product animation": { contentType: "Brand Commercials" },
  "brand commercial": { contentType: "Brand Commercials", styles: ["High-Gloss Commercial"] },
  "commercial spot": { contentType: "Brand Commercials", styles: ["High-Gloss Commercial"] },
  "agency pitch": { contentType: "Brand Commercials", styles: ["High-Gloss Commercial"] },
  "agency commercial": { contentType: "Brand Commercials", styles: ["High-Gloss Commercial"] },
  "running shoe": { contentType: "Short-form Video (Reels/TikTok)", format: "9:16 Vertical (Reels/Shorts)", industry: "Athletics & Footwear", styles: ["High-Energy Streetwear"] },
  "athletic footwear": { contentType: "Brand Commercials", industry: "Athletics & Footwear" },
  "vertical reel": { contentType: "Short-form Video (Reels/TikTok)", format: "9:16 Vertical (Reels/Shorts)" },
  "insta reel": { contentType: "Short-form Video (Reels/TikTok)", format: "9:16 Vertical (Reels/Shorts)" },
  "instagram reel": { contentType: "Short-form Video (Reels/TikTok)", format: "9:16 Vertical (Reels/Shorts)" },
  "ig reel": { contentType: "Short-form Video (Reels/TikTok)", format: "9:16 Vertical (Reels/Shorts)" },
  "tiktok reel": { contentType: "Short-form Video (Reels/TikTok)", format: "9:16 Vertical (Reels/Shorts)" },
  "tiktok video": { contentType: "Short-form Video (Reels/TikTok)", format: "9:16 Vertical (Reels/Shorts)" },
  "yt shorts": { contentType: "Short-form Video (Reels/TikTok)", format: "9:16 Vertical (Reels/Shorts)" },
  "youtube shorts": { contentType: "Short-form Video (Reels/TikTok)", format: "9:16 Vertical (Reels/Shorts)" },

  // Single word intents
  "trailer": { contentType: "Cinematic Trailers", styles: ["Cinematic Realism"] },
  "teaser": { contentType: "Cinematic Trailers" },
  "commercial": { contentType: "Brand Commercials", styles: ["High-Gloss Commercial"] },
  "advertisement": { contentType: "Brand Commercials" },
  "ad": { contentType: "Brand Commercials" },
  "folklore": { contentType: "Narrative Shorts", format: "4:3 Narrative", styles: ["Tactile Folklore & Woodcut"] },
  "storytelling": { contentType: "Narrative Shorts" },
  "reel": { contentType: "Short-form Video (Reels/TikTok)", format: "9:16 Vertical (Reels/Shorts)" },
  "reels": { contentType: "Short-form Video (Reels/TikTok)", format: "9:16 Vertical (Reels/Shorts)" },
  "tiktok": { contentType: "Short-form Video (Reels/TikTok)", format: "9:16 Vertical (Reels/Shorts)" },
  "shorts": { contentType: "Short-form Video (Reels/TikTok)", format: "9:16 Vertical (Reels/Shorts)" },
  "short": { contentType: "Short-form Video (Reels/TikTok)", format: "9:16 Vertical (Reels/Shorts)" },

  // Aspect Ratios & Formats
  "9:16": { format: "9:16 Vertical (Reels/Shorts)" },
  "vertical": { format: "9:16 Vertical (Reels/Shorts)" },
  "16:9": { format: "16:9 Landscape (YouTube/TV)" },
  "horizontal": { format: "16:9 Landscape (YouTube/TV)" },
  "landscape": { format: "16:9 Landscape (YouTube/TV)" },
  "youtube": { format: "16:9 Landscape (YouTube/TV)" },
  "4:3": { format: "4:3 Narrative" },
  "cinema": { format: "21:9 Widescreen Cinema", styles: ["Cinematic Realism"] },
  "widescreen": { format: "21:9 Widescreen Cinema" },
  "21:9": { format: "21:9 Widescreen Cinema" },
  "4k": { format: "4K UHD" },
  "uhd": { format: "4K UHD" },
  "1080p": { format: "1080p Full HD" },

  // Tools & Engines (canonical and abbreviations)
  "runway": { tools: ["Runway"] },
  "runway gen-3": { tools: ["Runway"] },
  "runway gen 3": { tools: ["Runway"] },
  "gen-3": { tools: ["Runway"] },
  "gen 3": { tools: ["Runway"] },
  "gen3": { tools: ["Runway"] },
  "midjourney": { tools: ["Midjourney"] },
  "mj": { tools: ["Midjourney"] },
  "sora": { tools: ["OpenAI Sora"] },
  "openai sora": { tools: ["OpenAI Sora"] },
  "kling": { tools: ["Kling AI"] },
  "kling ai": { tools: ["Kling AI"] },
  "kling 1.5": { tools: ["Kling AI"] },
  "flux": { tools: ["Flux"] },
  "flux.1": { tools: ["Flux"] },
  "luma": { tools: ["Luma Dream Machine"] },
  "dream machine": { tools: ["Luma Dream Machine"] },
  "comfy": { tools: ["ComfyUI"] },
  "comfyui": { tools: ["ComfyUI"] },
  "topaz": { tools: ["Topaz Video AI"] },
  "topaz video": { tools: ["Topaz Video AI"] },
  "blender": { tools: ["Blender"] },
  "c4d": { tools: ["Cinema 4D"] },
  "cinema 4d": { tools: ["Cinema 4D"] },
  "after effects": { tools: ["After Effects"] },
  "ae": { tools: ["After Effects"] },
  "claude": { tools: ["Claude"] },
  "elevenlabs": { tools: ["ElevenLabs"] },
  "davinci": { tools: ["DaVinci Resolve"] },
  "premiere": { tools: ["Premiere Pro"] },

  // Industries & Products
  "shoe": { industry: "Athletics & Footwear", styles: ["High-Energy Streetwear"] },
  "shoes": { industry: "Athletics & Footwear", styles: ["High-Energy Streetwear"] },
  "sneaker": { industry: "Athletics & Footwear", styles: ["High-Energy Streetwear"] },
  "sneakers": { industry: "Athletics & Footwear", styles: ["High-Energy Streetwear"] },
  "footwear": { industry: "Athletics & Footwear" },
  "perfume": { industry: "Beauty & Cosmetics", styles: ["Minimalist Luxury"] },
  "fragrance": { industry: "Beauty & Cosmetics", styles: ["Minimalist Luxury"] },
  "scent": { industry: "Beauty & Cosmetics" },
  "watch": { industry: "Fashion & Luxury Goods", styles: ["Minimalist Luxury"] },
  "timepiece": { industry: "Fashion & Luxury Goods", styles: ["Minimalist Luxury"] },
  "clothes": { contentType: "Fashion Films", industry: "Fashion & Luxury Goods" },
  "apparel": { contentType: "Fashion Films", industry: "Fashion & Luxury Goods" },
  "car": { industry: "Automotive & Mobility", styles: ["Cinematic Realism"] },
  "vehicle": { industry: "Automotive & Mobility" },
  "automobile": { industry: "Automotive & Mobility" },
  "laptop": { industry: "Consumer Electronics & Tech" },
  "computer": { industry: "Consumer Electronics & Tech" },
  "gaming": { industry: "Entertainment & Gaming" },
  "beverage": { industry: "Beverage & CPG" },
  "drink": { industry: "Beverage & CPG" },

  // Styles & Aesthetics
  "cinematic": { styles: ["Cinematic Realism"] },
  "photoreal": { styles: ["Cinematic Realism"] },
  "35mm": { styles: ["Analog 35mm Film"] },
  "analog": { styles: ["Analog 35mm Film"] },
  "film grain": { styles: ["Analog 35mm Film"] },
  "cyberpunk": { styles: ["Cyberpunk & Neon"] },
  "neon": { styles: ["Cyberpunk & Neon"] },
  "futuristic": { styles: ["Cyberpunk & Neon", "Dystopian Sci-Fi"] },
  "sci-fi": { styles: ["Dystopian Sci-Fi"] },
  "dystopian": { styles: ["Dystopian Sci-Fi"] },
  "surreal": { styles: ["Surreal & Dreamlike"] },
  "dreamlike": { styles: ["Surreal & Dreamlike"] },
  "luxury": { styles: ["Minimalist Luxury"] },
  "minimalist": { styles: ["Minimalist Luxury"] },
  "streetwear": { styles: ["High-Energy Streetwear"] },
  "high-energy": { styles: ["High-Energy Streetwear"] },
  "high-octane": { styles: ["High-Energy Streetwear"] },

  // Multilingual / Hinglish Phrases
  "chahiye": { contentType: "Brand Commercials" },
  "bana do": { contentType: "Brand Commercials" },
  "banana hai": { contentType: "Brand Commercials" },
  "mast": { styles: ["High-Energy Streetwear"] },
  "shaandar": { styles: ["Minimalist Luxury"] },
  "accha sa": { styles: ["Cinematic Realism"] },
};

export type CreativeTextAnalysis = {
  normalizedContentType: CanonicalContentType | null;
  normalizedFormat: CanonicalFormat | null;
  detectedTools: CanonicalTool[];
  detectedIndustry: CanonicalIndustry | null;
  detectedStyles: CanonicalStyle[];
  detectedDuration: string | null;
  commercialIntent: boolean | null;
  isHinglish: boolean;
  ambiguityScore: number; // 0.0 (very detailed) to 1.0 (extremely vague)
};

/**
 * Normalizes free-form text input into recognized taxonomy dimensions.
 * Evaluates longer, more specific multi-word phrases first.
 */
export function normalizeCreativeText(input: string): CreativeTextAnalysis {
  const lower = input.toLowerCase().replace(/[^a-z0-9:\s-]/g, " ");

  let normalizedContentType: CanonicalContentType | null = null;
  let normalizedFormat: CanonicalFormat | null = null;
  const detectedTools = new Set<CanonicalTool>();
  let detectedIndustry: CanonicalIndustry | null = null;
  const detectedStyles = new Set<CanonicalStyle>();

  // Sort keys by length descending to match multi-word phrases first
  const sortedKeys = Object.keys(SYNONYM_MAP).sort((a, b) => b.length - a.length);

  for (const key of sortedKeys) {
    if (lower.includes(key)) {
      const mapping = SYNONYM_MAP[key];
      if (mapping.contentType && !normalizedContentType) {
        normalizedContentType = mapping.contentType;
      }
      if (mapping.format && !normalizedFormat) {
        normalizedFormat = mapping.format;
      }
      if (mapping.tools) {
        mapping.tools.forEach((t) => detectedTools.add(t));
      }
      if (mapping.industry && !detectedIndustry) {
        detectedIndustry = mapping.industry;
      }
      if (mapping.styles) {
        mapping.styles.forEach((s) => detectedStyles.add(s));
      }
    }
  }

  // Duration Detection
  let detectedDuration: string | null = null;
  const durationMatch = input.match(/\b(\d{1,3})\s*(?:s|sec|second|seconds|min|minute|minutes)\b/i);
  if (durationMatch) {
    detectedDuration = `${durationMatch[1]}s`;
  }

  // Commercial Intent Detection
  let commercialIntent: boolean | null = null;
  if (
    lower.includes("non-commercial") ||
    lower.includes("personal only") ||
    lower.includes("portfolio only") ||
    lower.includes("spec concept") ||
    lower.includes("no commercial")
  ) {
    commercialIntent = false;
  } else if (
    lower.includes("commercial") ||
    lower.includes("broadcast") ||
    lower.includes("ad") ||
    lower.includes("campaign") ||
    lower.includes("brand") ||
    lower.includes("paid media")
  ) {
    commercialIntent = true;
  }

  // Hinglish Detection
  const hinglishKeywords = ["mujhe", "chahiye", "ek", "bana", "banana", "wali", "wala", "ke liye", "mast", "shaandar", "bhai", "accha"];
  const isHinglish = hinglishKeywords.some((w) => lower.split(/\s+/).includes(w));

  // Ambiguity Score (0.0 to 1.0)
  const words = input.trim().split(/\s+/).length;
  let ambiguityScore = 0.0;
  if (words <= 6) ambiguityScore += 0.5;
  else if (words <= 12) ambiguityScore += 0.25;

  if (!normalizedContentType) ambiguityScore += 0.2;
  if (!normalizedFormat) ambiguityScore += 0.15;
  if (detectedTools.size === 0) ambiguityScore += 0.15;
  if (commercialIntent === null) ambiguityScore += 0.1;

  ambiguityScore = Math.min(1.0, Math.max(0.0, ambiguityScore));

  return {
    normalizedContentType,
    normalizedFormat,
    detectedTools: Array.from(detectedTools),
    detectedIndustry,
    detectedStyles: Array.from(detectedStyles),
    detectedDuration,
    commercialIntent,
    isHinglish,
    ambiguityScore,
  };
}
