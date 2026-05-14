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
export declare const EventEnvelopeSchema: z.ZodObject<{
    id: z.ZodString;
    channel: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    tenantId: z.ZodString;
    occurredAt: z.ZodString;
    producer: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    version: string;
    id: string;
    channel: string;
    tenantId: string;
    occurredAt: string;
    producer: string;
    payload: Record<string, unknown>;
    correlationId?: string | undefined;
}, {
    id: string;
    channel: string;
    tenantId: string;
    occurredAt: string;
    producer: string;
    payload: Record<string, unknown>;
    version?: string | undefined;
    correlationId?: string | undefined;
}>;
export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;
/**
 * Creates a valid EventEnvelope.
 * Generates ID and timestamp automatically.
 */
export declare function createEnvelope<T extends Record<string, unknown>>(params: {
    channel: string;
    tenantId: string;
    producer: string;
    payload: T;
    version?: string;
    correlationId?: string;
}): EventEnvelope;
/**
 * Validates and parses an incoming event envelope.
 * Returns null if invalid — consumers must handle gracefully.
 */
export declare function parseEnvelope(raw: unknown): EventEnvelope | null;
//# sourceMappingURL=event-envelope.d.ts.map