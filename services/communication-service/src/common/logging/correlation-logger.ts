import { Logger } from '@nestjs/common';

/**
 * Structured logging context carried through the notification delivery pipeline.
 * Every field is optional — include what is known at the call site.
 */
export interface LogContext {
  /** Cross-service trace ID from EventEnvelope.correlationId */
  correlationId?:  string;
  /** Tenant that owns the notification */
  tenantId?:       string;
  /** NotificationEntity.id */
  notificationId?: string;
  /** BullMQ job ID */
  queueJobId?:     string;
  /** Template slug resolved for delivery */
  templateSlug?:   string;
  /** Recipient address (log-safe — not redacted, but avoid full PII) */
  recipientEmail?: string;
}

/**
 * CorrelationLogger
 *
 * Thin wrapper around NestJS Logger that appends a structured context
 * suffix to every log message.  Keeps the existing Logger.log/warn/error
 * API intact while adding machine-parseable key=value pairs.
 *
 * Output format (compatible with most log aggregators):
 *   <message> | correlationId=<id> tenantId=<id> notificationId=<id> ...
 *
 * Usage:
 *   private readonly log = new CorrelationLogger(MyService.name);
 *   this.log.info('Email queued', { tenantId, notificationId });
 *   this.log.warn('Template not found', { tenantId, templateSlug });
 *   this.log.error('Delivery failed', err, { notificationId, queueJobId });
 *
 * Design:
 *   - Never throws. Logging failures must not affect delivery.
 *   - Context fields with undefined/null values are omitted from output.
 *   - The same logger instance can be reused across multiple log calls
 *     with different context objects per call.
 */
export class CorrelationLogger {
  private readonly nest: Logger;

  constructor(context: string) {
    this.nest = new Logger(context);
  }

  info(message: string, ctx: LogContext = {}): void {
    this.nest.log(`${message}${suffix(ctx)}`);
  }

  warn(message: string, ctx: LogContext = {}): void {
    this.nest.warn(`${message}${suffix(ctx)}`);
  }

  error(message: string, err?: unknown, ctx: LogContext = {}): void {
    const errMsg = err instanceof Error ? err.message : (err != null ? String(err) : '');
    const full   = errMsg ? `${message} — ${errMsg}${suffix(ctx)}` : `${message}${suffix(ctx)}`;
    this.nest.error(full);
  }

  debug(message: string, ctx: LogContext = {}): void {
    this.nest.debug(`${message}${suffix(ctx)}`);
  }
}

/**
 * suffix() — builds the structured context string.
 * Only includes keys that have a non-empty value.
 * Output: ' | correlationId=abc tenantId=xyz ...'
 */
function suffix(ctx: LogContext): string {
  const KEYS: (keyof LogContext)[] = [
    'correlationId',
    'tenantId',
    'notificationId',
    'queueJobId',
    'templateSlug',
    'recipientEmail',
  ];

  const pairs = KEYS
    .filter((k) => ctx[k] != null && ctx[k] !== '')
    .map((k) => `${k}=${ctx[k] as string}`);

  return pairs.length ? ` | ${pairs.join(' ')}` : '';
}
