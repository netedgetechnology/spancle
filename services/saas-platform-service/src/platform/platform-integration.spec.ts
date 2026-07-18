/**
 * platform-integration.spec.ts
 *
 * Tests for the Platform Integration Boundary:
 * envelope creation, serialization, versioning, idempotency, publisher/receiver contracts.
 */
import {
  createEnvelope,
  PLATFORM_SCHEMA_VERSION,
  PLATFORM_SOURCE_SERVICE,
  PlatformContractSerializer,
  PlatformEventTypes,
  checkPlatformVersionCompatibility,
  isContractVersionCompatible,
  isPlatformVersionCompatible,
  isPlatformVersionDeprecated,
  isPlatformVersionSupported,
  PLATFORM_SCHEMA_CURRENT_VERSION,
} from '../platform';
import type { PlatformContractEnvelopeData, CreateEnvelopeInput } from '../platform';

// ── Helpers ───────────────────────────────────────────────────────────────────

interface MockPayload {
  decisionId: string;
  tenantId:   string;
  outcome:    string;
}

const MOCK_PAYLOAD: MockPayload = Object.freeze({
  decisionId: 'snap-001',
  tenantId:   'tenant-001',
  outcome:    'ALLOWED',
});

function makeInput(overrides: Partial<CreateEnvelopeInput<MockPayload>> = {}): CreateEnvelopeInput<MockPayload> {
  return {
    contractId:       'contract-id-001',
    contractVersion:  '1.0.0',
    eventType:        PlatformEventTypes.COMMERCIAL_DECISION_GENERATED,
    correlationId:    'corr-001',
    traceId:          'trace-001',
    deduplicationKey: 'commercial-decision-tenant-001-snap-001',
    occurredAt:       '2025-06-01T10:00:00.000Z',
    producerVersion:  '1.0.0',
    payload:          MOCK_PAYLOAD,
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('PlatformEventTypes', () => {
  it('COMMERCIAL_DECISION_GENERATED is defined with spancle.platform prefix', () => {
    expect(PlatformEventTypes.COMMERCIAL_DECISION_GENERATED)
      .toBe('spancle.platform.commercial.decision.generated');
  });

  it('all event types start with spancle.platform prefix', () => {
    Object.values(PlatformEventTypes).forEach((type) => {
      expect(type).toMatch(/^spancle\.platform\./);
    });
  });

  it('contains contract lifecycle events', () => {
    expect(PlatformEventTypes.COMMERCIAL_CONTRACT_CREATED).toBeDefined();
    expect(PlatformEventTypes.COMMERCIAL_CONTRACT_PUBLISHED).toBeDefined();
    expect(PlatformEventTypes.COMMERCIAL_CONTRACT_FAILED).toBeDefined();
  });
});

describe('createEnvelope()', () => {
  it('sets schemaVersion to PLATFORM_SCHEMA_VERSION', () => {
    const env = createEnvelope(makeInput());
    expect(env.schemaVersion).toBe(PLATFORM_SCHEMA_VERSION);
  });

  it('sets sourceService to PLATFORM_SOURCE_SERVICE', () => {
    const env = createEnvelope(makeInput());
    expect(env.sourceService).toBe(PLATFORM_SOURCE_SERVICE);
  });

  it('copies all identity fields from input', () => {
    const env = createEnvelope(makeInput());
    expect(env.contractId).toBe('contract-id-001');
    expect(env.contractVersion).toBe('1.0.0');
    expect(env.correlationId).toBe('corr-001');
    expect(env.traceId).toBe('trace-001');
    expect(env.deduplicationKey).toBe('commercial-decision-tenant-001-snap-001');
    expect(env.occurredAt).toBe('2025-06-01T10:00:00.000Z');
  });

  it('defaults priority to NORMAL and deliveryMode to AT_LEAST_ONCE', () => {
    const env = createEnvelope(makeInput());
    expect(env.priority).toBe('NORMAL');
    expect(env.deliveryMode).toBe('AT_LEAST_ONCE');
  });

  it('respects explicit priority and deliveryMode', () => {
    const env = createEnvelope(makeInput({ priority: 'HIGH', deliveryMode: 'EXACTLY_ONCE' }));
    expect(env.priority).toBe('HIGH');
    expect(env.deliveryMode).toBe('EXACTLY_ONCE');
  });

  it('sets delivery.retryCount to 0 (first attempt)', () => {
    const env = createEnvelope(makeInput());
    expect(env.delivery.retryCount).toBe(0);
  });

  it('sets delivery.expiresAt to null when not provided', () => {
    const env = createEnvelope(makeInput());
    expect(env.delivery.expiresAt).toBeNull();
  });

  it('sets delivery.expiresAt when provided', () => {
    const exp = '2025-12-31T23:59:59.000Z';
    const env = createEnvelope(makeInput({ expiresAt: exp }));
    expect(env.delivery.expiresAt).toBe(exp);
  });

  it('populates idempotency block with matching fields', () => {
    const env = createEnvelope(makeInput());
    expect(env.idempotency.contractId).toBe('contract-id-001');
    expect(env.idempotency.deduplicationKey).toBe('commercial-decision-tenant-001-snap-001');
    expect(env.idempotency.correlationId).toBe('corr-001');
    expect(env.idempotency.occurredAt).toBe('2025-06-01T10:00:00.000Z');
  });
});

describe('Envelope immutability', () => {
  it('envelope is frozen', () => {
    const env = createEnvelope(makeInput());
    expect(Object.isFrozen(env)).toBe(true);
  });

  it('payload is frozen', () => {
    const env = createEnvelope(makeInput());
    expect(Object.isFrozen(env.payload)).toBe(true);
  });

  it('delivery metadata is frozen', () => {
    const env = createEnvelope(makeInput());
    expect(Object.isFrozen(env.delivery)).toBe(true);
  });

  it('idempotency metadata is frozen', () => {
    const env = createEnvelope(makeInput());
    expect(Object.isFrozen(env.idempotency)).toBe(true);
  });

  it('attempting to mutate a frozen envelope throws', () => {
    const env = createEnvelope(makeInput());
    expect(() => { (env as any).contractId = 'mutated'; }).toThrow();
  });
});

describe('PlatformContractSerializer', () => {
  it('serialize() produces a valid JSON string', () => {
    const env = createEnvelope(makeInput());
    const json = PlatformContractSerializer.serialize(env);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('serialize() produces deterministic output (same output on repeated calls)', () => {
    const env = createEnvelope(makeInput());
    const a   = PlatformContractSerializer.serialize(env);
    const b   = PlatformContractSerializer.serialize(env);
    expect(a).toBe(b);
  });

  it('serialized keys are sorted alphabetically at the top level', () => {
    const env    = createEnvelope(makeInput());
    const parsed = JSON.parse(PlatformContractSerializer.serialize(env)) as Record<string, unknown>;
    const keys   = Object.keys(parsed);
    expect(keys).toEqual([...keys].sort());
  });

  it('deserialize() round-trips the envelope without data loss', () => {
    const env        = createEnvelope(makeInput());
    const json       = PlatformContractSerializer.serialize(env);
    const deserialized = PlatformContractSerializer.deserialize<MockPayload>(json);
    expect(deserialized.contractId).toBe(env.contractId);
    expect(deserialized.payload.decisionId).toBe(MOCK_PAYLOAD.decisionId);
  });

  it('validate() returns valid=true for a well-formed envelope', () => {
    const env    = createEnvelope(makeInput());
    const result = PlatformContractSerializer.validate(env);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validate() returns errors when required fields are missing', () => {
    const incomplete = { contractId: 'x', payload: {} } as unknown as PlatformContractEnvelopeData;
    const result     = PlatformContractSerializer.validate(incomplete);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('validate() flags invalid occurredAt', () => {
    const env    = createEnvelope(makeInput({ occurredAt: 'not-a-date' }));
    const result = PlatformContractSerializer.validate(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('occurredAt'))).toBe(true);
  });

  it('contentHash() returns a non-empty base64 string', () => {
    const env  = createEnvelope(makeInput());
    const hash = PlatformContractSerializer.contentHash(env);
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('contentHash() is deterministic (same envelope → same hash)', () => {
    const env = createEnvelope(makeInput());
    expect(PlatformContractSerializer.contentHash(env))
      .toBe(PlatformContractSerializer.contentHash(env));
  });

  it('contentHash() differs when payload changes', () => {
    const envA = createEnvelope(makeInput({ payload: { ...MOCK_PAYLOAD, outcome: 'ALLOWED' } }));
    const envB = createEnvelope(makeInput({ payload: { ...MOCK_PAYLOAD, outcome: 'DENIED'  } }));
    expect(PlatformContractSerializer.contentHash(envA))
      .not.toBe(PlatformContractSerializer.contentHash(envB));
  });
});

describe('Version compatibility', () => {
  it('PLATFORM_SCHEMA_CURRENT_VERSION is 1.0.0', () => {
    expect(PLATFORM_SCHEMA_CURRENT_VERSION).toBe('1.0.0');
  });

  it('isPlatformVersionCompatible returns true for same major', () => {
    expect(isPlatformVersionCompatible('1.0.0')).toBe(true);
    expect(isPlatformVersionCompatible('1.5.3')).toBe(true);
  });

  it('isPlatformVersionCompatible returns false for different major', () => {
    expect(isPlatformVersionCompatible('2.0.0')).toBe(false);
    expect(isPlatformVersionCompatible('0.9.0')).toBe(false);
  });

  it('isPlatformVersionSupported returns true only for known versions', () => {
    expect(isPlatformVersionSupported('1.0.0')).toBe(true);
    expect(isPlatformVersionSupported('9.9.9')).toBe(false);
  });

  it('isPlatformVersionDeprecated returns false for current version', () => {
    expect(isPlatformVersionDeprecated('1.0.0')).toBe(false);
  });

  it('checkPlatformVersionCompatibility returns compatible=true for 1.0.0', () => {
    const result = checkPlatformVersionCompatibility('1.0.0');
    expect(result.compatible).toBe(true);
  });

  it('checkPlatformVersionCompatibility returns compatible=false with reason for 2.0.0', () => {
    const result = checkPlatformVersionCompatibility('2.0.0');
    expect(result.compatible).toBe(false);
    if (!result.compatible) expect(result.reason).toContain('major version');
  });

  it('isContractVersionCompatible validates payload schema versions independently', () => {
    expect(isContractVersionCompatible('1.0.0', '1.0.0')).toBe(true);
    expect(isContractVersionCompatible('1.1.0', '1.0.0')).toBe(true);
    expect(isContractVersionCompatible('2.0.0', '1.0.0')).toBe(false);
  });
});

describe('Idempotency metadata', () => {
  it('two envelopes with different contractIds have different content hashes', () => {
    const envA = createEnvelope(makeInput({ contractId: 'id-A' }));
    const envB = createEnvelope(makeInput({ contractId: 'id-B' }));
    expect(PlatformContractSerializer.contentHash(envA))
      .not.toBe(PlatformContractSerializer.contentHash(envB));
  });

  it('two envelopes with same deduplicationKey but different contractIds are distinct', () => {
    const envA = createEnvelope(makeInput({ contractId: 'id-A', deduplicationKey: 'same-key' }));
    const envB = createEnvelope(makeInput({ contractId: 'id-B', deduplicationKey: 'same-key' }));
    expect(envA.contractId).not.toBe(envB.contractId);
    expect(envA.idempotency.deduplicationKey).toBe(envB.idempotency.deduplicationKey);
  });
});

describe('No infrastructure coupling', () => {
  it('platform barrel imports no HTTP, transport, or Finance modules', () => {
    const fs   = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const files = [
      'src/platform/contracts/platform-contract-envelope.ts',
      'src/platform/events/platform-event-types.ts',
      'src/platform/publisher/platform-contract-publisher.interface.ts',
      'src/platform/receiver/platform-contract-receiver.interface.ts',
      'src/platform/versioning/platform-version-compatibility.ts',
      'src/platform/serialization/platform-contract-serializer.ts',
    ];
    files.forEach((file) => {
      const source = fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
      const importLines = source.split('\n').filter((l) => l.trim().startsWith('import '));
      importLines.forEach((line) => {
        expect(line).not.toMatch(/rabbitmq|kafka|nats|grpc|amqp|@nestjs\/microservices/i);
        expect(line).not.toMatch(/FinanceModule|BookingModule|finance-service/i);
        expect(line).not.toMatch(/@nestjs\/axios|http-client|HttpModule/i);
      });
    });
  });
});

describe('Publisher/Receiver interface contracts', () => {
  it('PLATFORM_CONTRACT_PUBLISHER is a Symbol', () => {
    const { PLATFORM_CONTRACT_PUBLISHER } = require('../platform');
    expect(typeof PLATFORM_CONTRACT_PUBLISHER).toBe('symbol');
  });

  it('PLATFORM_CONTRACT_RECEIVER is a Symbol', () => {
    const { PLATFORM_CONTRACT_RECEIVER } = require('../platform');
    expect(typeof PLATFORM_CONTRACT_RECEIVER).toBe('symbol');
  });
});

describe('Backward compatibility', () => {
  it('v1.0.0 envelope fields are all present', () => {
    const env = createEnvelope(makeInput());
    const requiredFields: Array<keyof PlatformContractEnvelopeData> = [
      'contractId', 'contractVersion', 'schemaVersion', 'eventType',
      'sourceService', 'correlationId', 'traceId', 'deduplicationKey',
      'occurredAt', 'priority', 'deliveryMode', 'delivery', 'idempotency', 'payload',
    ];
    requiredFields.forEach((field) => {
      expect(env[field]).toBeDefined();
    });
  });

  it('envelope survives JSON.stringify → JSON.parse without data loss', () => {
    const env        = createEnvelope(makeInput());
    const roundtrip  = JSON.parse(JSON.stringify(env)) as PlatformContractEnvelopeData<MockPayload>;
    expect(roundtrip.contractId).toBe(env.contractId);
    expect(roundtrip.schemaVersion).toBe(env.schemaVersion);
    expect(roundtrip.payload.decisionId).toBe(MOCK_PAYLOAD.decisionId);
  });
});
