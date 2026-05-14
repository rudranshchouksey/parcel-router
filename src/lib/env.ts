// src/lib/env.ts

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `[env] Missing required environment variable: ${key}\n` +
        `      Copy .env.example to .env and fill in the value.`
    );
  }
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true";

export const env = {
  DATABASE_URL: isTest ? "postgresql://localhost:5432/test" : requireEnv("DATABASE_URL"),
  NODE_ENV: optionalEnv("NODE_ENV", "development"),
  LOG_LEVEL: optionalEnv("LOG_LEVEL", "info"),
  RATE_LIMIT_MAX: parseInt(optionalEnv("RATE_LIMIT_MAX", "100")),
  RATE_LIMIT_WINDOW_MS: parseInt(optionalEnv("RATE_LIMIT_WINDOW_MS", "60000")),
  RATE_LIMIT_BATCH_MAX: parseInt(optionalEnv("RATE_LIMIT_BATCH_MAX", "10")),
  MAX_BATCH_FILE_SIZE_MB: parseInt(optionalEnv("MAX_BATCH_FILE_SIZE_MB", "10")),
  MAX_BATCH_PARCEL_COUNT: parseInt(optionalEnv("MAX_BATCH_PARCEL_COUNT", "500")),
} as const;

export type Env = typeof env;