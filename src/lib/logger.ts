// src/lib/logger.ts

import pino from "pino";

// pino-pretty is a devDependency that breaks in Next.js App Router
// when imported dynamically via transport. We use a build-time safe pattern instead.

const isDev = process.env.NODE_ENV === "development";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname",
          },
        },
      }
    : {
        // Production: plain JSON — queryable by Datadog / CloudWatch
        formatters: {
          level(label) {
            return { level: label };
          },
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }),
});

// ─── Typed log helpers ────────────────────────────────────────────────────────

export interface RoutingLogEvent {
  parcelWeight: number;
  parcelValue: number;
  department: string;
  requiresInsurance: boolean;
  appliedRule: string;
  source: "single" | "batch_xml" | "batch_json";
  batchId?: string;
  processingMs?: number;
}

export function logRoutingDecision(event: RoutingLogEvent) {
  logger.info({ event: "routing_decision", ...event });
}

export function logRoutingError(error: unknown, context?: object) {
  logger.error({
    event: "routing_error",
    error: error instanceof Error
      ? { message: error.message, stack: error.stack }
      : String(error),
    ...context,
  });
}