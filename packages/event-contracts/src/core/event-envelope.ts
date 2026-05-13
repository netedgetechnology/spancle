import { z } from 'zod';

/**
 * EventEnvelope — the outer wrapper for ALL Spancle Pub/Sub events.
 *
 * Every event published to Redis must be wrapped in this envelope.
 * Consumers MUST validate against this schema before processing payload.
 *
 * Structure:
 * {
 *   id:         "uuid",                  // Unique event ID for deduplication
 *   channel:    "spancle.tenant.created",
 *   version:    "1",                     // Schema version
 *   tenantId:   "uuid | 'system'",
 *   occurredAt: "ISO-8601",
 *   producer:   "identity-service",
 *   payload:    { ... }                  // Domain-specific payload
 * }
 */

export const EventEnvelopeSchema = z.object({
  id:         z.string().uuid(),
  channel:    z.string().min(1),
  version:    z.string().default('1'),
  tenantId:   z.string().min(1),
  occurredAt: z.string().datetime(),
  producer:   z.string().min(1),
  correlationId: z.string().uuid().optional(),
  payload:    z.record(z.string(), z.unknown()),
});

export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;

/**
 * Creates a valid EventEnvelope.
 * Generates ID and timestamp automatically.
 */
export function createEnvelope<T extends Record<string, unknown>>(params: {
  channel:       string;
  tenantId:      string;
  producer:      string;
  payload:       T;
  version?:      string;
  correlationId?: string;
}): EventEnvelope {
  return {
    id:            crypto.randomUUID(),
    channel:       params.channel,
    version:       params.version ?? '1',
    tenantId:      params.tenantId,
    occurredAt:    new Date().toISOString(),
    producer:      params.producer,
    correlationId: params.correlationId,
    payload:       params.payload,
  };
}

/**
 * Validates and parses an incoming event envelope.
 * Returns null if invalid — consumers must handle gracefully.
 */
export function parseEnvelope(raw: unknown): EventEnvelope | null {
  const result = EventEnvelopeSchema.safeParse(raw);
  return result.success ? result.data : null;
}
