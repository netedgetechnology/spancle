"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformContractSerializer = void 0;
class PlatformContractSerializer {
    static serialize(envelope) {
        return JSON.stringify(PlatformContractSerializer.sortKeys(envelope));
    }
    static deserialize(json) {
        try {
            return JSON.parse(json);
        }
        catch (err) {
            throw new Error(`PlatformContractSerializer.deserialize: invalid JSON — ${err.message}`);
        }
    }
    static validate(envelope) {
        const errors = [];
        const required = [
            'contractId', 'contractVersion', 'schemaVersion', 'eventType',
            'sourceService', 'correlationId', 'traceId', 'deduplicationKey',
            'occurredAt', 'priority', 'deliveryMode', 'delivery', 'idempotency', 'payload',
        ];
        for (const field of required) {
            if (envelope[field] === undefined || envelope[field] === null) {
                errors.push(`Required field "${field}" is missing or null`);
            }
        }
        if (envelope.occurredAt && isNaN(Date.parse(envelope.occurredAt))) {
            errors.push(`"occurredAt" is not a valid ISO-8601 string: "${envelope.occurredAt}"`);
        }
        if (envelope.contractVersion && !/^\d+\.\d+\.\d+$/.test(envelope.contractVersion)) {
            errors.push(`"contractVersion" is not a valid semver: "${envelope.contractVersion}"`);
        }
        try {
            JSON.stringify(envelope);
        }
        catch {
            errors.push('Envelope contains non-JSON-serializable values');
        }
        return { valid: errors.length === 0, errors };
    }
    static contentHash(envelope) {
        const serialized = PlatformContractSerializer.serialize(envelope);
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(serialized, 'utf8').digest('base64');
    }
    static sortKeys(value) {
        if (value === null || typeof value !== 'object')
            return value;
        if (Array.isArray(value)) {
            return value.map((item) => PlatformContractSerializer.sortKeys(item));
        }
        const sorted = {};
        for (const key of Object.keys(value).sort()) {
            sorted[key] = PlatformContractSerializer.sortKeys(value[key]);
        }
        return sorted;
    }
}
exports.PlatformContractSerializer = PlatformContractSerializer;
//# sourceMappingURL=platform-contract-serializer.js.map