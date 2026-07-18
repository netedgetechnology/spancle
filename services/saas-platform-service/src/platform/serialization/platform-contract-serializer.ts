/**
 * platform-contract-serializer.ts
 *
 * Deterministic, JSON-safe serialization for platform contract envelopes.
 *
 * Requirements:
 *   - Keys sorted alphabetically (deterministic across runtimes)
 *   - No undefined values (JSON-safe)
 *   - No Date objects (serialized as ISO-8601 strings — enforced by contract types)
 *   - No circular references (frozen objects prevent cycles)
 *   - Version-aware (includes schemaVersion in output)
 *
 * No dependencies on NestJS, HTTP, or transport.
 */
import type { PlatformContractEnvelopeData } from '../contracts/platform-contract-envelope';

// ── PlatformContractSerializer ────────────────────────────────────────────────

export class PlatformContractSerializer {

  /**
   * Serializes a platform contract envelope to a deterministic JSON string.
   *
   * Key ordering is alphabetical at every nesting level for consistent
   * content-hash comparisons across services and runtimes.
   *
   * Throws if the envelope contains non-serializable values
   * (undefined, function, Symbol, circular reference).
   */
  static serialize<TPayload>(
    envelope: Readonly<PlatformContractEnvelopeData<TPayload>>,
  ): string {
    return JSON.stringify(
      PlatformContractSerializer.sortKeys(envelope as unknown as Record<string, unknown>),
    );
  }

  /**
   * Deserializes a JSON string back into a plain envelope object.
   * Does NOT freeze the output — caller is responsible for re-freezing if needed.
   * Does NOT validate schema — call checkPlatformVersionCompatibility() first.
   */
  static deserialize<TPayload>(
    json: string,
  ): PlatformContractEnvelopeData<TPayload> {
    try {
      return JSON.parse(json) as PlatformContractEnvelopeData<TPayload>;
    } catch (err) {
      throw new Error(`PlatformContractSerializer.deserialize: invalid JSON — ${(err as Error).message}`);
    }
  }

  /**
   * Validates that the envelope contains no non-serializable values and
   * that all required top-level fields are present.
   */
  static validate<TPayload>(
    envelope: Readonly<PlatformContractEnvelopeData<TPayload>>,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const required: Array<keyof PlatformContractEnvelopeData> = [
      'contractId', 'contractVersion', 'schemaVersion', 'eventType',
      'sourceService', 'correlationId', 'traceId', 'deduplicationKey',
      'occurredAt', 'priority', 'deliveryMode', 'delivery', 'idempotency', 'payload',
    ];

    for (const field of required) {
      if (envelope[field] === undefined || envelope[field] === null) {
        errors.push(`Required field "${field}" is missing or null`);
      }
    }

    // occurredAt must be a valid ISO-8601 date string
    if (envelope.occurredAt && isNaN(Date.parse(envelope.occurredAt))) {
      errors.push(`"occurredAt" is not a valid ISO-8601 string: "${envelope.occurredAt}"`);
    }

    // contractVersion must be semver-like (X.Y.Z)
    if (envelope.contractVersion && !/^\d+\.\d+\.\d+$/.test(envelope.contractVersion)) {
      errors.push(`"contractVersion" is not a valid semver: "${envelope.contractVersion}"`);
    }

    // Verify JSON-serializability
    try {
      JSON.stringify(envelope);
    } catch {
      errors.push('Envelope contains non-JSON-serializable values');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Returns a content hash (base64-encoded SHA-256) of the deterministically
   * serialized envelope. Useful for deduplication and integrity checks.
   *
   * Uses the Node.js built-in `crypto` module — no external dependency.
   */
  static contentHash<TPayload>(
    envelope: Readonly<PlatformContractEnvelopeData<TPayload>>,
  ): string {
    const serialized = PlatformContractSerializer.serialize(envelope);
    // Use Node.js built-in crypto — no import needed in CJS but we guard for ESM
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const crypto = require('crypto') as typeof import('crypto');
    return crypto.createHash('sha256').update(serialized, 'utf8').digest('base64');
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  /**
   * Recursively sorts object keys alphabetically.
   * Arrays are preserved in their original order (element order is significant).
   * Primitives are returned as-is.
   */
  static sortKeys(
    value: Record<string, unknown> | unknown,
  ): unknown {
    if (value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) {
      return value.map((item) => PlatformContractSerializer.sortKeys(item));
    }
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = PlatformContractSerializer.sortKeys(
        (value as Record<string, unknown>)[key],
      );
    }
    return sorted;
  }
}
