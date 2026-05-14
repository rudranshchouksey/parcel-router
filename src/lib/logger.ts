import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  // Pretty print in dev, JSON in production (queryable by Datadog/CloudWatch)
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});

// Typed routing event — structured for easy querying
export interface RoutingLogEvent {
  parcelWeight: number;
  parcelValue: number;
  department: string;
  requiresInsurance: boolean;
  appliedRule: string;
  source: 'single' | 'batch_xml' | 'batch_json';
  batchId?: string;
  processingMs?: number;
}

export function logRoutingDecision(event: RoutingLogEvent) {
  logger.info({ event: 'routing_decision', ...event });
}

export function logRoutingError(error: unknown, context?: object) {
  logger.error({ event: 'routing_error', error, ...context });
}
