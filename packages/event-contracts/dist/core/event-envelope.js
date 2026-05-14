"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventEnvelopeSchema = void 0;
exports.createEnvelope = createEnvelope;
exports.parseEnvelope = parseEnvelope;
const zod_1 = require("zod");
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
exports.EventEnvelopeSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    channel: zod_1.z.string().min(1),
    version: zod_1.z.string().default('1'),
    tenantId: zod_1.z.string().min(1),
    occurredAt: zod_1.z.string().datetime(),
    producer: zod_1.z.string().min(1),
    correlationId: zod_1.z.string().uuid().optional(),
    payload: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
});
/**
 * Creates a valid EventEnvelope.
 * Generates ID and timestamp automatically.
 */
function createEnvelope(params) {
    return {
        id: crypto.randomUUID(),
        channel: params.channel,
        version: params.version ?? '1',
        tenantId: params.tenantId,
        occurredAt: new Date().toISOString(),
        producer: params.producer,
        correlationId: params.correlationId,
        payload: params.payload,
    };
}
/**
 * Validates and parses an incoming event envelope.
 * Returns null if invalid — consumers must handle gracefully.
 */
function parseEnvelope(raw) {
    const result = exports.EventEnvelopeSchema.safeParse(raw);
    return result.success ? result.data : null;
}
//# sourceMappingURL=event-envelope.js.map