// In-memory rate limiter — replace with @upstash/ratelimit in production

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
