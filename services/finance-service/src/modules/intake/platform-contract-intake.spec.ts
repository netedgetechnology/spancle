/**
 * platform-contract-intake.spec.ts
 *
 * Tests for the Finance Platform Contract Intake ACL:
 *   PlatformContractValidator, PlatformContractMapper, PlatformContractIntake
 *   intake-result factories, command immutability
 */
import { PlatformContractValidator }  from './platform-contract-validator';
import { PlatformContractMapper }     from './platform-contract-mapper';
import { PlatformContractIntake }     from './platform-contract-intake';
import {
  accepted, rejected, fieldError,
} from './intake-result.model';
import type { CommercialDecisionContract, PlatformContractEnvelope } from '@spancle/types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeSettlementInstruction() {
  return Object.freeze({
    kind:                    'SettlementInstruction' as const,
    contractVersion:         '1.0.0',
    generatedAt:             '2026-07-19T10:00:00.000Z',
    tenantId:                'tenant-001',
    ownershipType:           'PLATFORM',
    platformFeeBps:          0,
    settlementDelaySeconds:  0,
    holdInEscrow:            false,
    currency:                'GBP',
  });
}

function makePaymentInstruction() {
  return Object.freeze({
    kind:                  'PaymentInstruction' as const,
    contractVersion:       '1.0.0',
    generatedAt:           '2026-07-19T10:00:00.000Z',
    tenantId:              'tenant-001',
    amountMinor:           2900,
    currency:              'GBP',
    preferredGatewayType:  'STRIPE',
    billingCycle:          'monthly',
    idempotencyKey:        'commercial-payment-snap-001',
    isTrial:               false,
    trialDays:             null,
    trialPriceMinor:       null,
    discountBps:           0,
    maxDiscountMinor:      -1,
    promotionCode:         null,
    taxCode:               null,
    taxRateBps:            null,
  });
}

function makeInvoiceInstruction() {
  return Object.freeze({
    kind:            'InvoiceInstruction' as const,
    contractVersion: '1.0.0',
    generatedAt:     '2026-07-19T10:00:00.000Z',
    tenantId:        'tenant-001',
    currency:        'GBP',
    sourceType:      'commercial_decision',
    sourceId:        'snap-001',
    lines: [Object.freeze({
      description:    'Starter v1 subscription',
      lineType:       'subscription',
      quantity:       1,
      unitPriceMinor: 2900,
      subtotalMinor:  2900,
      discountMinor:  0,
      taxCode:        null,
    })],
    subtotalMinor:   2900,
    discountMinor:   0,
    taxMinor:        0 as const,
    totalMinor:      2900,
    packageSlug:     'starter',
    packageVersion:  'starter-v1',
    planId:          'plan-001',
    tierKey:         'starter-v1',
    idempotencyKey:  'commercial-invoice-snap-001',
  });
}

function makeRevenueInstruction() {
  return Object.freeze({
    kind:                         'RevenueInstruction' as const,
    contractVersion:              '1.0.0',
    generatedAt:                  '2026-07-19T10:00:00.000Z',
    tenantId:                     'tenant-001',
    distributionType:             'FLAT_PERCENTAGE',
    tiers:                        [Object.freeze({ upToMinor: null, rateBps: 2000 })],
    currency:                     'GBP',
    estimatedPlatformAmountMinor: 580,
    transactionAmountMinor:       2900,
  });
}

function makeContract(outcome: 'ALLOWED' | 'DENIED' = 'ALLOWED'): CommercialDecisionContract {
  return Object.freeze({
    kind:                     'CommercialDecisionContract' as const,
    contractVersion:          '1.0.0',
    generatedAt:              '2026-07-19T10:00:00.000Z',
    decisionId:               'snap-001',
    tenantId:                 'tenant-001',
    moduleId:                 'booking',
    productId:                'sku-court',
    transactionType:          'BOOKING',
    outcome,
    reason:                   outcome === 'ALLOWED' ? 'Package resolved.' : 'No plan.',
    productEligible:          outcome === 'ALLOWED',
    planId:                   'plan-001',
    packageId:                'pkg-001',
    packageSlug:              'starter',
    packageVersion:           'starter-v1',
    tierKey:                  'starter-v1',
    primaryRuleVersionId:     null,
    primaryRuleVersionSemver: null,
    evaluatedRules:           [],
    appliedPolicyIds:         [],
    preferredGatewayType:     'STRIPE',
    paymentInstruction:       outcome === 'ALLOWED' ? makePaymentInstruction() : null,
    invoiceInstruction:       outcome === 'ALLOWED' ? makeInvoiceInstruction() : null,
    settlementInstruction:    makeSettlementInstruction(),
    revenueInstruction:       outcome === 'ALLOWED' ? makeRevenueInstruction() : null,
    requestedAmountMinor:     2900,
    currency:                 'GBP',
    country:                  'GB',
    requestedAt:              '2026-07-19T10:00:00.000Z',
  }) as unknown as CommercialDecisionContract;
}

function makeEnvelope(
  contract: CommercialDecisionContract = makeContract(),
  overrides: Partial<PlatformContractEnvelope<CommercialDecisionContract>> = {},
): PlatformContractEnvelope<CommercialDecisionContract> {
  return Object.freeze({
    contractId:       'env-001',
    contractVersion:  '1.0.0',
    schemaVersion:    '1.0.0',
    eventType:        'spancle.platform.commercial.decision.generated',
    sourceService:    'spancle.saas-platform',
    correlationId:    'corr-001',
    traceId:          'trace-001',
    deduplicationKey: 'commercial-decision-tenant-001-snap-001',
    occurredAt:       '2026-07-19T10:00:00.000Z',
    priority:         'NORMAL',
    deliveryMode:     'AT_LEAST_ONCE',
    payload:          contract,
    ...overrides,
  }) as PlatformContractEnvelope<CommercialDecisionContract>;
}

// =============================================================================
// Tests
// =============================================================================

// ── PlatformContractValidator ─────────────────────────────────────────────────

describe('PlatformContractValidator', () => {
  describe('validate()', () => {
    it('accepts a well-formed envelope', () => {
      const result = PlatformContractValidator.validate(makeEnvelope());
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects null envelope', () => {
      const result = PlatformContractValidator.validate(null);
      expect(result.valid).toBe(false);
      expect(result.errors[0]!.field).toBe('envelope');
    });

    it('rejects non-object envelope', () => {
      const result = PlatformContractValidator.validate('not-an-object');
      expect(result.valid).toBe(false);
    });

    it('rejects when contractId is missing', () => {
      const env = { ...makeEnvelope(), contractId: '' };
      const result = PlatformContractValidator.validate(env);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'contractId')).toBe(true);
    });

    it('rejects incompatible schema version (major mismatch)', () => {
      const env = { ...makeEnvelope(), schemaVersion: '2.0.0' };
      const result = PlatformContractValidator.validate(env);
      expect(result.valid).toBe(false);
      expect(result.errors[0]!.field).toBe('schemaVersion');
      expect(result.errors[0]!.message).toContain('Unsupported');
    });

    it('accepts schema version with same major but higher minor', () => {
      const env = { ...makeEnvelope(), schemaVersion: '1.5.0' };
      const result = PlatformContractValidator.validate(env);
      expect(result.valid).toBe(true);
    });

    it('rejects unknown event type', () => {
      const env = { ...makeEnvelope(), eventType: 'spancle.unknown.event' };
      const result = PlatformContractValidator.validate(env);
      expect(result.valid).toBe(false);
      expect(result.errors[0]!.field).toBe('eventType');
    });

    it('rejects invalid occurredAt', () => {
      const env = { ...makeEnvelope(), occurredAt: 'not-a-date' };
      const result = PlatformContractValidator.validate(env);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'occurredAt')).toBe(true);
    });

    it('rejects when payload is missing', () => {
      const env = { ...makeEnvelope(), payload: null };
      const result = PlatformContractValidator.validate(env);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'payload')).toBe(true);
    });

    it('rejects when payload.kind is wrong', () => {
      const env = { ...makeEnvelope(), payload: { ...makeContract(), kind: 'WrongKind' } };
      const result = PlatformContractValidator.validate(env);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'payload.kind')).toBe(true);
    });

    it('rejects negative requestedAmountMinor', () => {
      const c = { ...makeContract(), requestedAmountMinor: -1 };
      const env = makeEnvelope(c as unknown as CommercialDecisionContract);
      const result = PlatformContractValidator.validate(env);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'payload.requestedAmountMinor')).toBe(true);
    });

    it('rejects non-3-char currency', () => {
      const c = { ...makeContract(), currency: 'GBPP' };
      const env = makeEnvelope(c as unknown as CommercialDecisionContract);
      const result = PlatformContractValidator.validate(env);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'payload.currency')).toBe(true);
    });

    it('rejects non-2-char country', () => {
      const c = { ...makeContract(), country: 'GBR' };
      const env = makeEnvelope(c as unknown as CommercialDecisionContract);
      const result = PlatformContractValidator.validate(env);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'payload.country')).toBe(true);
    });

    it('rejects when settlementInstruction is missing', () => {
      const c = { ...makeContract(), settlementInstruction: null };
      const env = makeEnvelope(c as unknown as CommercialDecisionContract);
      const result = PlatformContractValidator.validate(env);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateVersion()', () => {
    it('accepts compatible version', () => {
      expect(PlatformContractValidator.validateVersion('1.0.0').valid).toBe(true);
      expect(PlatformContractValidator.validateVersion('1.9.0').valid).toBe(true);
    });

    it('rejects incompatible major version', () => {
      const result = PlatformContractValidator.validateVersion('2.0.0');
      expect(result.valid).toBe(false);
      expect(result.errors[0]!.message).toContain('2.0.0');
    });
  });
});

// ── PlatformContractMapper ────────────────────────────────────────────────────

describe('PlatformContractMapper', () => {
  it('produces a FinanceCommandBatch from a valid ALLOWED contract', () => {
    const batch = PlatformContractMapper.map(makeEnvelope());
    expect(batch.transaction.kind).toBe('CreateFinancialTransactionCommand');
    expect(batch.payment?.kind).toBe('CreatePaymentCommand');
    expect(batch.invoice?.kind).toBe('CreateInvoiceCommand');
    expect(batch.settlement.kind).toBe('CreateSettlementCommand');
    expect(batch.revenueDistribution?.kind).toBe('CreateRevenueDistributionCommand');
  });

  it('omits payment and invoice commands when outcome is DENIED', () => {
    const batch = PlatformContractMapper.map(makeEnvelope(makeContract('DENIED')));
    expect(batch.payment).toBeNull();
    expect(batch.invoice).toBeNull();
    // transaction and settlement always present
    expect(batch.transaction).not.toBeNull();
    expect(batch.settlement).not.toBeNull();
  });

  describe('Transaction command', () => {
    it('maps tenantId, currency, amountMinor from contract', () => {
      const batch = PlatformContractMapper.map(makeEnvelope());
      expect(batch.transaction.tenantId).toBe('tenant-001');
      expect(batch.transaction.currency).toBe('GBP');
      expect(batch.transaction.amountMinor).toBe(2900);
    });

    it('idempotencyKey prefixed with finance-tx-', () => {
      const batch = PlatformContractMapper.map(makeEnvelope());
      expect(batch.transaction.idempotencyKey).toMatch(/^finance-tx-/);
    });

    it('sourceType is platform_contract', () => {
      const batch = PlatformContractMapper.map(makeEnvelope());
      expect(batch.transaction.sourceType).toBe('platform_contract');
    });

    it('sourceReference is envelope contractId', () => {
      const batch = PlatformContractMapper.map(makeEnvelope());
      expect(batch.transaction.sourceReference).toBe('env-001');
    });

    it('accountingPeriod derived from requestedAt', () => {
      const batch = PlatformContractMapper.map(makeEnvelope());
      expect(batch.transaction.accountingPeriod).toBe('2026-07');
    });

    it('description mentions decision ID', () => {
      const batch = PlatformContractMapper.map(makeEnvelope());
      expect(batch.transaction.description).toContain('snap-001');
    });
  });

  describe('Payment command', () => {
    it('maps amountMinor and currency', () => {
      const batch = PlatformContractMapper.map(makeEnvelope());
      expect(batch.payment!.amountMinor).toBe(2900);
      expect(batch.payment!.currency).toBe('GBP');
    });

    it('maps preferredGatewayHint from preferredGatewayType', () => {
      const batch = PlatformContractMapper.map(makeEnvelope());
      expect(batch.payment!.preferredGatewayHint).toBe('STRIPE');
    });

    it('idempotencyKey prefixed with finance-pay-', () => {
      const batch = PlatformContractMapper.map(makeEnvelope());
      expect(batch.payment!.idempotencyKey).toMatch(/^finance-pay-/);
    });

    it('isTrial is false for non-trial payment', () => {
      const batch = PlatformContractMapper.map(makeEnvelope());
      expect(batch.payment!.isTrial).toBe(false);
    });
  });

  describe('Invoice command', () => {
    it('maps lines from invoice instruction', () => {
      const batch = PlatformContractMapper.map(makeEnvelope());
      expect(batch.invoice!.lines).toHaveLength(1);
      expect(batch.invoice!.lines[0]!.unitPriceMinor).toBe(2900);
    });

    it('taxMinor is always 0', () => {
      const batch = PlatformContractMapper.map(makeEnvelope());
      expect(batch.invoice!.taxMinor).toBe(0);
    });

    it('packageLabel combines slug and version', () => {
      const batch = PlatformContractMapper.map(makeEnvelope());
      expect(batch.invoice!.packageLabel).toBe('starter@starter-v1');
    });

    it('idempotencyKey prefixed with finance-inv-', () => {
      const batch = PlatformContractMapper.map(makeEnvelope());
      expect(batch.invoice!.idempotencyKey).toMatch(/^finance-inv-/);
    });
  });

  describe('Settlement command', () => {
    it('maps ownershipType and platformFeeBps', () => {
      const batch = PlatformContractMapper.map(makeEnvelope());
      expect(batch.settlement.ownershipType).toBe('PLATFORM');
      expect(batch.settlement.platformFeeBps).toBe(0);
    });

    it('idempotencyKey prefixed with finance-set-', () => {
      const batch = PlatformContractMapper.map(makeEnvelope());
      expect(batch.settlement.idempotencyKey).toMatch(/^finance-set-/);
    });
  });

  describe('Revenue command', () => {
    it('maps tiers from revenue instruction', () => {
      const batch = PlatformContractMapper.map(makeEnvelope());
      expect(batch.revenueDistribution!.tiers).toHaveLength(1);
      expect(batch.revenueDistribution!.tiers[0]!.rateBps).toBe(2000);
    });

    it('estimatedPlatformAmountMinor preserved', () => {
      const batch = PlatformContractMapper.map(makeEnvelope());
      expect(batch.revenueDistribution!.estimatedPlatformAmountMinor).toBe(580);
    });
  });

  describe('Determinism', () => {
    it('same envelope always produces same command batch', () => {
      const env    = makeEnvelope();
      const batchA = PlatformContractMapper.map(env);
      const batchB = PlatformContractMapper.map(env);
      expect(batchA.transaction.idempotencyKey).toBe(batchB.transaction.idempotencyKey);
      expect(batchA.transaction.sourceReference).toBe(batchB.transaction.sourceReference);
      expect(batchA.invoice!.lines[0]!.unitPriceMinor)
        .toBe(batchB.invoice!.lines[0]!.unitPriceMinor);
    });
  });

  describe('Command immutability', () => {
    it('FinanceCommandBatch is frozen', () => {
      const batch = PlatformContractMapper.map(makeEnvelope());
      expect(Object.isFrozen(batch)).toBe(true);
    });

    it('transaction command is frozen', () => {
      const batch = PlatformContractMapper.map(makeEnvelope());
      expect(Object.isFrozen(batch.transaction)).toBe(true);
    });

    it('settlement command is frozen', () => {
      const batch = PlatformContractMapper.map(makeEnvelope());
      expect(Object.isFrozen(batch.settlement)).toBe(true);
    });

    it('attempting to mutate a command throws', () => {
      const batch = PlatformContractMapper.map(makeEnvelope());
      expect(() => { (batch.transaction as any).tenantId = 'mutated'; }).toThrow();
    });
  });
});

// ── PlatformContractIntake (ACL) ──────────────────────────────────────────────

describe('PlatformContractIntake', () => {
  describe('process() — happy path', () => {
    it('returns accepted result for valid ALLOWED envelope', () => {
      const result = PlatformContractIntake.process(makeEnvelope());
      expect(result.accepted).toBe(true);
      if (result.accepted) {
        expect(result.commands.transaction.tenantId).toBe('tenant-001');
      }
    });

    it('returns accepted for valid DENIED envelope (no-op transaction)', () => {
      const result = PlatformContractIntake.process(makeEnvelope(makeContract('DENIED')));
      expect(result.accepted).toBe(true);
      if (result.accepted) {
        expect(result.commands.payment).toBeNull();
        expect(result.commands.invoice).toBeNull();
        expect(result.commands.transaction).not.toBeNull();
      }
    });

    it('processedAt is set on accepted result', () => {
      const result = PlatformContractIntake.process(makeEnvelope());
      if (result.accepted) {
        expect(() => new Date(result.processedAt)).not.toThrow();
      }
    });
  });

  describe('process() — rejection', () => {
    it('returns rejected for null input', () => {
      const result = PlatformContractIntake.process(null);
      expect(result.accepted).toBe(false);
    });

    it('returns UNSUPPORTED_VERSION for mismatched schema version', () => {
      const env = { ...makeEnvelope(), schemaVersion: '2.0.0' };
      const result = PlatformContractIntake.process(env);
      expect(result.accepted).toBe(false);
      if (!result.accepted) expect(result.reason).toBe('UNSUPPORTED_VERSION');
    });

    it('returns INVALID_SCHEMA for missing required fields', () => {
      const env = { ...makeEnvelope(), contractId: '' };
      const result = PlatformContractIntake.process(env);
      expect(result.accepted).toBe(false);
    });

    it('rejected result has non-empty errors array', () => {
      const result = PlatformContractIntake.process({ schemaVersion: '99.0.0' });
      expect(result.accepted).toBe(false);
      if (!result.accepted) expect(result.errors.length).toBeGreaterThan(0);
    });

    it('rejected result is frozen', () => {
      const result = PlatformContractIntake.process(null);
      expect(Object.isFrozen(result)).toBe(true);
    });
  });
});

// ── intake-result factories ───────────────────────────────────────────────────

describe('Intake result factories', () => {
  it('accepted() produces frozen accepted result', () => {
    const batch = PlatformContractMapper.map(makeEnvelope());
    const result = accepted(batch);
    expect(result.accepted).toBe(true);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('rejected() produces frozen rejected result with reason and errors', () => {
    const result = rejected('UNSUPPORTED_VERSION', [
      fieldError('schemaVersion', 'Major mismatch'),
    ]);
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('UNSUPPORTED_VERSION');
    expect(result.errors).toHaveLength(1);
    expect(Object.isFrozen(result)).toBe(true);
  });
});

// ── No Commercial service dependency ─────────────────────────────────────────

describe('No Commercial service dependency', () => {
  const fs   = require('fs') as typeof import('fs');
  const path = require('path') as typeof import('path');

  const intakeFiles = [
    'src/modules/intake/platform-contract-intake.ts',
    'src/modules/intake/platform-contract-mapper.ts',
    'src/modules/intake/platform-contract-validator.ts',
    'src/modules/intake/intake-result.model.ts',
    'src/modules/intake/commands/finance.commands.ts',
  ];

  intakeFiles.forEach((file) => {
    it(`${path.basename(file)} has no Commercial service or transport imports`, () => {
      const source      = fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
      const importLines = source.split('\n').filter((l) => l.trim().startsWith('import'));
      importLines.forEach((line) => {
        expect(line).not.toMatch(/saas-platform-service|commercial\.service/i);
        expect(line).not.toMatch(/EventEmitter|rabbitmq|kafka|amqp/i);
        expect(line).not.toMatch(/from '\.\.\/\.\.\/\.\.\/modules\/commercial/i);
      });
    });
  });
});
