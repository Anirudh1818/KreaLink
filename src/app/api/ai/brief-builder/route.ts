import { NextRequest, NextResponse } from "next/server";
import { generateBrief2 } from "@/lib/ai/briefIntelligence";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const MAX_PROMPT_LENGTH = 2500;
const RATE_LIMIT_PER_MINUTE = 25;

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting Protection (25 req/min per IP)
    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit(clientIp, RATE_LIMIT_PER_MINUTE, 60 * 1000);

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: "Rate limit reached. Please wait a moment before generating another brief.",
          retryAfterMs: rateLimit.resetInMs,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(rateLimit.resetInMs / 1000)),
          },
        }
      );
    }

    // 2. Request Parsing & Payload Size Guard
    let body: { prompt?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request payload." },
        { status: 400 }
      );
    }

    const rawPrompt = body?.prompt;

    if (!rawPrompt || typeof rawPrompt !== "string" || !rawPrompt.trim()) {
      return NextResponse.json(
        { error: "A natural-language campaign description prompt is required." },
        { status: 400 }
      );
    }

    const prompt = rawPrompt.trim();

    if (prompt.length < 5) {
      return NextResponse.json(
        { error: "Prompt is too short. Please provide at least a brief concept description." },
        { status: 400 }
      );
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        {
          error: `Prompt exceeds maximum allowed length (${MAX_PROMPT_LENGTH} characters). Please condense your creative concept.`,
        },
        { status: 400 }
      );
    }

    // 3. Structured Generation
    const structuredBrief = await generateBrief2(prompt);

    return NextResponse.json({
      success: true,
      brief: structuredBrief,
      readiness: structuredBrief.readiness,
      clarifications: structuredBrief.clarifications,
      recommendations: structuredBrief.aiRecommendations,
      source: structuredBrief.source,
    });
  } catch (error) {
    // Server logs full error details for diagnostics
    console.error("AI Brief Builder route error:", error);

    // Client receives sanitized, safe error message without secrets or stack traces
    return NextResponse.json(
      { error: "Unable to synthesize brief at this time. Creative intelligence fallback is available." },
      { status: 500 }
    );
  }
}
