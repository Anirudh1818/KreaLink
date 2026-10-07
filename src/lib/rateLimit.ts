/**
 * KreaLink Lightweight In-Memory Rate Limiter
 * ----------------------------------------------------------------------------
 * Protects server-side AI endpoints (/api/ai/*) against uncontrolled rapid abuse
 * and payload flooding without requiring Redis, Kafka, or external infrastructure.
 *
 * Safe for local development, Vercel edge/serverless, and hackathon presentation.
 */

type RateLimitRecord = {
  count: number;
  resetTime: number;
};

// Global in-memory bucket store
const rateLimitMap = new Map<string, RateLimitRecord>();

// Periodic sweep every 5 minutes to prevent memory growth
if (typeof setInterval !== "undefined") {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitMap.entries()) {
      if (now > record.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  // Unref timer in Node environment so it doesn't hold open process exit
  if (typeof cleanupTimer === "object" && cleanupTimer && "unref" in cleanupTimer) {
    (cleanupTimer as { unref: () => void }).unref();
  }
}

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  resetInMs: number;
};

/**
 * Checks if the given identifier has exceeded the maximum allowed requests
 * within the specified time window.
 *
 * @param identifier Client IP or user identifier
 * @param limit Maximum requests per window (default: 30)
 * @param windowMs Time window in milliseconds (default: 60,000ms = 1 minute)
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 30,
  windowMs: number = 60 * 1000
): RateLimitResult {
  const now = Date.now();
  const key = identifier || "unknown-client";
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      resetInMs: windowMs,
    };
  }

  if (record.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      resetInMs: Math.max(0, record.resetTime - now),
    };
  }

  record.count += 1;
  return {
    success: true,
    limit,
    remaining: limit - record.count,
    resetInMs: Math.max(0, record.resetTime - now),
  };
}

/**
 * Extracts a client identifier from incoming NextRequest headers
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}
