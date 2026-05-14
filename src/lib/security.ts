/* // In-memory rate limiter — replace with @upstash/ratelimit in production

interface RateLimitStore {
  [key: string]: { count: number; resetAt: number };
}

const store: RateLimitStore = {};
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX ?? '100');
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '60000');

export function checkRateLimit(identifier: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const record = store[identifier];

  if (!record || now > record.resetAt) {
    store[identifier] = { count: 1, resetAt: now + WINDOW_MS };
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetAt: now + WINDOW_MS };
  }

  if (record.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count++;
  return {
    allowed: true,
    remaining: MAX_REQUESTS - record.count,
    resetAt: record.resetAt,
  };
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}
*/

// src/lib/security.ts

import { env } from "./env";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RateLimitWindow {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterMs: number;
}

// ─── In-memory store ──────────────────────────────────────────────────────────
// NOTE: This is per-instance only.
// In a multi-instance production deployment, replace with:
//   @upstash/ratelimit + Redis
// The interface here stays the same — only the store changes.

const store = new Map<string, RateLimitWindow>();

// Periodically purge expired windows to prevent memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, window] of store.entries()) {
    if (now > window.resetAt) store.delete(key);
  }
}, 60_000);

// ─── Core function ────────────────────────────────────────────────────────────

export function checkRateLimit(
  identifier: string,
  options?: { max?: number; windowMs?: number }
): RateLimitResult {
  const max = options?.max ?? env.RATE_LIMIT_MAX;
  const windowMs = options?.windowMs ?? env.RATE_LIMIT_WINDOW_MS;
  const now = Date.now();

  const existing = store.get(identifier);

  if (!existing || now > existing.resetAt) {
    store.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, resetAt: now + windowMs, retryAfterMs: 0 };
  }

  if (existing.count >= max) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterMs: existing.resetAt - now,
    };
  }

  existing.count++;
  return {
    allowed: true,
    remaining: max - existing.count,
    resetAt: existing.resetAt,
    retryAfterMs: 0,
  };
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}