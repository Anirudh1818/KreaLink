import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { verifyCaller } from "@/lib/server/firebaseAdmin";
import { getGstProvider } from "@/lib/server/gstProvider";
import { compareRegistration, validateGstinFormat } from "@/lib/auth/gstin";

/**
 * POST /api/verification/gstin
 * Server-side GSTIN check for a signed-in applicant.
 *
 *  - Always: structural check (pattern, state code, check digit).
 *  - Only if an authorised provider is integrated: registration lookup and
 *    comparison with the submitted business details.
 *
 * The response never claims a GSTIN is verified unless a provider confirmed it.
 * Request bodies are not logged.
 */
export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`gstin-ip-${ip}`, 10, 60_000).success) {
    return NextResponse.json({ error: "Too many requests. Please wait a minute." }, { status: 429 });
  }

  const caller = await verifyCaller(req);
  if (!caller) {
    return NextResponse.json({ error: "Sign in to check a GSTIN." }, { status: 401 });
  }
  if (!checkRateLimit(`gstin-uid-${caller.uid}`, 20, 60 * 60_000).success) {
    return NextResponse.json({ error: "Hourly GSTIN check limit reached." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { gstin, legalName, tradeName } = (body ?? {}) as Record<string, unknown>;
  if (
    typeof gstin !== "string" || gstin.length > 32 ||
    typeof legalName !== "string" || legalName.trim().length < 2 || legalName.length > 120 ||
    (tradeName !== undefined && (typeof tradeName !== "string" || tradeName.length > 120))
  ) {
    return NextResponse.json({ error: "Provide gstin and legalName (tradeName optional)." }, { status: 400 });
  }

  const format = validateGstinFormat(gstin);
  if (!format.valid) {
    return NextResponse.json({ format, provider: { status: "skipped" }, verified: false, mode: "manual_review" });
  }

  const provider = getGstProvider();
  if (!provider) {
    return NextResponse.json({
      format,
      provider: { status: "not_configured" },
      verified: false,
      mode: "manual_review",
      message: "Automated GST registry lookup is not configured. A reviewer will check your registration manually.",
    });
  }

  const result = await provider.lookup(format.normalized).catch(() => ({ kind: "unavailable" as const, reason: "Provider error" }));
  if (result.kind === "unavailable") {
    return NextResponse.json({
      format,
      provider: { status: "unavailable", name: provider.name },
      verified: false,
      mode: "manual_review",
      message: "The GST verification service is temporarily unavailable. Your application will be reviewed manually.",
    });
  }
  if (result.kind === "not_found") {
    return NextResponse.json({
      format,
      provider: { status: "not_found", name: provider.name },
      verified: false,
      mode: "manual_review",
      message: "No GST registration was found for this GSTIN.",
    });
  }

  const mismatches = compareRegistration(
    { legalName, tradeName: typeof tradeName === "string" ? tradeName : undefined, stateCode: format.stateCode },
    result.record
  );
  return NextResponse.json({
    format,
    provider: { status: "found", name: provider.name, registeredStatus: result.record.status },
    mismatches,
    // Still subject to admin approval; this only says the registry agrees.
    verified: mismatches.every((m) => m.severity !== "blocking"),
    mode: "admin_review",
  });
}
