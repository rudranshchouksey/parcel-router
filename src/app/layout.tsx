// src/app/layout.tsx

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// ─── Fonts ────────────────────────────────────────────────────────────────────

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Parcel Routing System",
  description:
    "Internal operator tool for routing parcels to the correct department based on weight, value, and business rules.",
  robots: {
    index: false,   // internal tool — never indexed by search engines
    follow: false,
  },
};

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <body
        className={`
          ${geistSans.variable}
          ${geistMono.variable}
          font-sans antialiased
          bg-gray-50 text-gray-900
          min-h-screen
        `}
      >
        {/* Skip to main content — keyboard accessibility */}
        <a
          href="#main-content"
          className="
            sr-only focus:not-sr-only
            focus:fixed focus:top-4 focus:left-4 focus:z-50
            focus:px-4 focus:py-2
            focus:bg-white focus:text-gray-900
            focus:rounded-md focus:shadow-lg
            focus:text-sm focus:font-medium
            focus:outline-none focus:ring-2 focus:ring-gray-900
          "
        >
          Skip to main content
        </a>

        {/* ── App shell ── */}
        <div className="min-h-screen flex flex-col">

          {/* Header */}
          <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

              {/* Logo + name */}
              <div className="flex items-center gap-2.5">
                {/* SVG logo mark */}
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 28 28"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <rect width="28" height="28" rx="6" fill="#111827" />
                  <path
                    d="M7 9h14M7 14h9M7 19h11"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <circle cx="21" cy="19" r="2.5" fill="#F97316" />
                </svg>

                <div className="flex flex-col leading-none">
                  <span className="text-sm font-bold text-gray-900 tracking-tight">
                    ParcelRouter
                  </span>
                  <span className="text-xs text-gray-400">
                    Internal Operations Tool
                  </span>
                </div>
              </div>

              {/* Environment badge */}
              {process.env.NODE_ENV !== "production" && (
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                  {process.env.NODE_ENV}
                </span>
              )}
            </div>
          </header>

          {/* Main content */}
          <main
            id="main-content"
            className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8"
          >
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t border-gray-200 bg-white mt-auto">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Parcel Routing System · Internal Use Only
              </p>
              <p className="text-xs text-gray-300 tabular-nums">
                v1.0.0
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}