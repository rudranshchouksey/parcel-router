// next.config.ts

import type { NextConfig } from "next";

// ─── Security Headers ─────────────────────────────────────────────────────────

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

// ─── Next.js Config ───────────────────────────────────────────────────────────

const nextConfig: NextConfig = {

  // Prevent pino and pino-pretty from being bundled by webpack.
  // They must run as native Node.js modules in API routes.
  serverExternalPackages: ["pino", "pino-pretty"],

  // Security headers on every route
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  // Increase body size limit for batch file uploads (default is 4mb)
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },

  // Strict mode for catching React issues early
  reactStrictMode: true,

  // Disable x-powered-by header (security: don't reveal Next.js)
  poweredByHeader: false,
};

export default nextConfig;