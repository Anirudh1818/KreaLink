import { NextRequest, NextResponse } from "next/server";
import { analyzePortfolioItem } from "@/lib/ai/portfolioIntelligence";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const MAX_TITLE_LENGTH = 250;
const MAX_DESCRIPTION_LENGTH = 4000;
const RATE_LIMIT_PER_MINUTE = 35;

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting Protection (35 req/min per IP)
    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit(clientIp, RATE_LIMIT_PER_MINUTE, 60 * 1000);

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: "Rate limit reached for portfolio assist. Please wait a moment before trying again.",
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
    let body: { title?: unknown; description?: unknown; workflow?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request payload." },
        { status: 400 }
      );
    }

    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const description = typeof body?.description === "string" ? body.description.trim() : "";
    const workflow = typeof body?.workflow === "string" ? body.workflow.trim() : "";

    const combinedNarrative = `${description} ${workflow}`.trim();

    if (!title && !combinedNarrative) {
      return NextResponse.json(
        { error: "A title, description, or workflow narrative is required to analyze portfolio project." },
        { status: 400 }
      );
    }

    if (title.length > MAX_TITLE_LENGTH) {
      return NextResponse.json(
        { error: `Project title exceeds maximum length (${MAX_TITLE_LENGTH} chars).` },
        { status: 400 }
      );
    }

    if (combinedNarrative.length > MAX_DESCRIPTION_LENGTH) {
      return NextResponse.json(
        { error: `Project narrative exceeds maximum length (${MAX_DESCRIPTION_LENGTH} chars).` },
        { status: 400 }
      );
    }

    // 3. Execution
    const analysis = await analyzePortfolioItem(title, combinedNarrative);

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("AI Portfolio Analyzer error:", error);
    return NextResponse.json(
      { error: "Failed to analyze portfolio project metadata at this time." },
      { status: 500 }
    );
  }
}
