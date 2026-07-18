"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLATFORM_SOURCE_SERVICE = exports.PLATFORM_SCHEMA_VERSION = void 0;
exports.createEnvelope = createEnvelope;
exports.PLATFORM_SCHEMA_VERSION = '1.0.0';
exports.PLATFORM_SOURCE_SERVICE = 'spancle.saas-platform';
function createEnvelope(input) {
    const priority = input.priority ?? 'NORMAL';
    const deliveryMode = input.deliveryMode ?? 'AT_LEAST_ONCE';
    const delivery = Object.freeze({
        retryCount: 0,
        priority,
        deliveryMode,
        expiresAt: input.expiresAt ?? null,
        producerVersion: input.producerVersion,
    });
    const idempotency = Object.freeze({
        contractId: input.contractId,
        deduplicationKey: input.deduplicationKey,
        correlationId: input.correlationId,
        occurredAt: input.occurredAt,
    });
    const envelope = {
        contractId: input.contractId,
        contractVersion: input.contractVersion,
        schemaVersion: exports.PLATFORM_SCHEMA_VERSION,
        eventType: input.eventType,
        sourceService: exports.PLATFORM_SOURCE_SERVICE,
        correlationId: input.correlationId,
        traceId: input.traceId,
        deduplicationKey: input.deduplicationKey,
        occurredAt: input.occurredAt,
        priority,
        deliveryMode,
        delivery,
        idempotency,
        payload: Object.freeze(input.payload),
    };
    return Object.freeze(envelope);
}
//# sourceMappingURL=platform-contract-envelope.js.map