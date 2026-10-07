/**
 * KreaLink Model Layer & Provider Abstraction
 * Configurable multi-provider interface with task-aware routing,
 * prompt isolation, and graceful fallback.
 */

import { cleanAndParseJson } from "./schemas";

export type AiTaskType =
  | "brief_extraction"
  | "creative_reasoning"
  | "match_explanation"
  | "portfolio_enrichment";

export type ModelExecutionOptions = {
  task: AiTaskType;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
};

export type ModelExecutionResult = {
  rawText: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parsedJson?: any;
  provider: "gemini" | "openai" | "heuristic-intelligence";
  modelId: string;
  latencyMs: number;
};

/**
 * Executes a structured AI task using the best available provider with
 * automatic failover: Gemini -> OpenAI -> Heuristic Engine.
 */
export async function executeAiTask(options: ModelExecutionOptions): Promise<ModelExecutionResult> {
  const startTime = Date.now();
  const geminiKey = process.env.GEMINI_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  // 1. Determine Model ID by task
  const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const openAiModel = process.env.OPENAI_MODEL || (options.task === "creative_reasoning" ? "gpt-4o" : "gpt-4o-mini");

  // Prompt injection containment wrapper
  const sanitizedUserPrompt = `<user_input_boundary>\n${options.userPrompt.replace(/<\/user_input_boundary>/gi, "")}\n</user_input_boundary>`;

  // ----------------------------------------------------
  // Primary Provider: Google Gemini
  // ----------------------------------------------------
  if (geminiKey) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`;
      const payload = {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${options.systemPrompt}\n\nTask Specific Context:\n${sanitizedUserPrompt}\n\nIMPORTANT: Output valid RFC 8259 JSON only without markdown code blocks.`,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: options.temperature ?? 0.2,
        },
      };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = cleanAndParseJson(text);
          return {
            rawText: text,
            parsedJson: parsed,
            provider: "gemini",
            modelId: geminiModel,
            latencyMs: Date.now() - startTime,
          };
        }
      }
    } catch (err) {
      console.warn(`[KreaLink AI] Gemini call failed (${geminiModel}):`, (err as Error)?.message);
    }
  }

  // ----------------------------------------------------
  // Secondary Provider: OpenAI
  // ----------------------------------------------------
  if (openAiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: openAiModel,
          response_format: { type: "json_object" },
          temperature: options.temperature ?? 0.2,
          messages: [
            {
              role: "system",
              content: `${options.systemPrompt}\nReturn pure JSON matching the requested schema.`,
            },
            {
              role: "user",
              content: sanitizedUserPrompt,
            },
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = cleanAndParseJson(content);
          return {
            rawText: content,
            parsedJson: parsed,
            provider: "openai",
            modelId: openAiModel,
            latencyMs: Date.now() - startTime,
          };
        }
      }
    } catch (err) {
      console.warn(`[KreaLink AI] OpenAI call failed (${openAiModel}):`, (err as Error)?.message);
    }
  }

  // ----------------------------------------------------
  // Demo / Offline Fallback Provider
  // ----------------------------------------------------
  return {
    rawText: "{}",
    parsedJson: null,
    provider: "heuristic-intelligence",
    modelId: "krealink-native-engine-v2",
    latencyMs: Date.now() - startTime,
  };
}
