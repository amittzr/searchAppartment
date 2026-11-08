// ============================================================
// Minimal in-memory sliding-window rate limiter.
//
// Used to cap anonymous /demo visitors on endpoints that cost money
// or hit third parties (Gemini, Yad2). It is best-effort: on serverless
// hosting each instance keeps its own counters, so treat the limit as
// a cost guard rather than a hard security boundary.
// ============================================================

import type { NextRequest } from "next/server";

const MAX_TRACKED_KEYS = 5000;
const hits = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the oldest hit leaves the window (only meaningful when blocked). */
  retryAfterSeconds: number;
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= limit) {
    hits.set(key, recent);
    return { allowed: false, retryAfterSeconds: Math.ceil((windowMs - (now - recent[0])) / 1000) };
  }

  recent.push(now);
  hits.set(key, recent);

  // Keep memory bounded: drop expired keys when the map grows large
  if (hits.size > MAX_TRACKED_KEYS) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= windowMs)) hits.delete(k);
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

/** Best-effort client IP from proxy headers (falls back to a shared bucket). */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
