import { NextRequest, NextResponse } from "next/server";
import { generateStructuredBrief } from "@/lib/ai/briefBuilder";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = body?.prompt;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "A natural-language campaign description prompt is required." },
        { status: 400 }
      );
    }

    const structuredBrief = await generateStructuredBrief(prompt.trim());

    return NextResponse.json({
      success: true,
      brief: structuredBrief,
    });
  } catch (error) {
    console.error("AI Brief Builder route error:", error);
    return NextResponse.json(
      { error: "Failed to generate structured brief from idea." },
      { status: 500 }
    );
  }
}
