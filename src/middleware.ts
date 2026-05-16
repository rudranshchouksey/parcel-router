import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/security";

const ROUTE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  "/api/batch": { max: 10, windowMs: 60_000 },   
  "/api/route": { max: 60, windowMs: 60_000 },   
  "/api/audit": { max: 30, windowMs: 60_000 },   
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/api")) {
    return NextResponse.next();
  }
  const origin = req.headers.get("origin");
const allowedOrigins = [
  process.env.NEXT_PUBLIC_APP_URL,
  "http://localhost:3000",
].filter(Boolean);

if (
  req.method !== "GET" &&
  origin &&
  !allowedOrigins.includes(origin)
) {
  return NextResponse.json(
    { error: "Origin not allowed" },
    { status: 403 }
  );
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

  const correlationId = crypto.randomUUID();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-correlation-id", correlationId);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("X-RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));
  response.headers.set("X-Correlation-Id", correlationId);

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};