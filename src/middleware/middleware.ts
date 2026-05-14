// src/middleware.ts
//
// WHY MIDDLEWARE:
// Cross-cutting concerns (rate limiting, request IDs, security headers)
// belong in a single place, not duplicated across route handlers.
// Next.js middleware runs on the Edge runtime before any route handler,
// making it the correct interception point for these concerns.

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/security";

// Route-specific rate limit overrides
// Batch uploads are more expensive — tighter limit than single-parcel routing
const ROUTE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  "/api/batch": { max: 10, windowMs: 60_000 },   // 10 batch uploads/min
  "/api/route": { max: 60, windowMs: 60_000 },   // 60 single routes/min
  "/api/audit": { max: 30, windowMs: 60_000 },   // 30 reads/min
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only apply to API routes
  if (!pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const ip = getClientIp(req);
  const routeLimit = ROUTE_LIMITS[pathname];
  const limitKey = `${ip}:${pathname}`;

  const result = checkRateLimit(limitKey, routeLimit);

  if (!result.allowed) {
    return NextResponse.json(
      {
        error: "Too many requests. Please slow down.",
        retryAfterMs: result.retryAfterMs,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)),
          "X-RateLimit-Limit": String(routeLimit?.max ?? 100),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
        },
      }
    );
  }

  // Attach a correlation ID to every request
  // Route handlers read this from the header for structured logging
  const correlationId = crypto.randomUUID();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-correlation-id", correlationId);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // Expose rate limit state to clients (useful for operator tooling)
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("X-RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));
  response.headers.set("X-Correlation-Id", correlationId);

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};