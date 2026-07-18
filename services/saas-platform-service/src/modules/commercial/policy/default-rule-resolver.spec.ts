/**
 * default-rule-resolver.spec.ts
 *
 * Unit tests for DefaultRuleResolver — rule ordering, typing, version
 * immutability, evaluation outcomes, missing field handling, and no
 * mutable CommercialRuleEntity dependency.
 */
import { Test, type TestingModule } from '@nestjs/testing';
import { EventEmitter2 }            from '@nestjs/event-emitter';
import { DefaultRuleResolver }      from './default-rule-resolver';
import { RULE_RESOLVER }            from '../interfaces/rule-resolver.interfaces';
import { CommercialRuleType, RuleEvaluationOutcome } from '../enums/commercial.enums';
import type { CommercialRuleVersionEntity } from '../entities/commercial-rule-version.entity';

// ── Helpers ───────────────────────────────────────────────────────────────────

let seq = 0;
function rv(
  ruleType: CommercialRuleType,
  definition: Record<string, unknown>,
  overrides: Partial<CommercialRuleVersionEntity> = {},
): CommercialRuleVersionEntity {
  return {
    id:          `rv-${++seq}-${ruleType.toLowerCase()}`,
    tenantId:    'tenant-001',
    ruleId:      `rule-${ruleType.toLowerCase()}`,
    version:     '1.0.0',
    ruleType,
    definition,
    changelog:   null,
    createdById: null,
    createdAt:   new Date('2025-01-01'),
    ...overrides,
  };
}

async function buildResolver() {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      DefaultRuleResolver,
      { provide: EventEmitter2, useValue: { emitAsync: jest.fn().mockResolvedValue(undefined) } },
    ],
  }).compile();
  return module.get(DefaultRuleResolver);
}

// =============================================================================
// Tests
// =============================================================================

describe('DefaultRuleResolver', () => {

  // ── Deterministic ordering ─────────────────────────────────────────────

  describe('Deterministic evaluation order', () => {
    it('evaluates PRICING before DISCOUNT before PROMOTION before TRIAL', async () => {
      const svc = await buildResolver();
      const versions = [
        rv(CommercialRuleType.TRIAL,    { trialDays: 14, trialPriceMinor: 0, currency: 'GBP', requiresPaymentMethod: false }),
        rv(CommercialRuleType.DISCOUNT, { discountBps: 1000, maxDiscountMinor: 5000 }),
        rv(CommercialRuleType.PROMOTION,{ discountBps: 500 }),
        rv(CommercialRuleType.PRICING,  { basePriceMinor: 2900, currency: 'GBP' }),
      ];

      const bundle = svc.resolve(versions);

      const appliedOrder = bundle.evaluatedRules
        .filter((e) => e.outcome === RuleEvaluationOutcome.APPLIED)
        .map((e) => e.ruleType);

      expect(appliedOrder.indexOf(CommercialRuleType.PRICING))
        .toBeLessThan(appliedOrder.indexOf(CommercialRuleType.DISCOUNT));
      expect(appliedOrder.indexOf(CommercialRuleType.DISCOUNT))
        .toBeLessThan(appliedOrder.indexOf(CommercialRuleType.PROMOTION));
      expect(appliedOrder.indexOf(CommercialRuleType.PROMOTION))
        .toBeLessThan(appliedOrder.indexOf(CommercialRuleType.TRIAL));
    });

    it('TAX appears after TRIAL in evaluation order', async () => {
      const svc = await buildResolver();
      const versions = [
        rv(CommercialRuleType.TAX,     { taxCode: 'GB-VAT', rateBps: 2000, taxType: 'VAT' }),
        rv(CommercialRuleType.TRIAL,   { trialDays: 14, trialPriceMinor: 0, currency: 'GBP', requiresPaymentMethod: false }),
        rv(CommercialRuleType.PRICING, { basePriceMinor: 2900, currency: 'GBP' }),
      ];

      const bundle = svc.resolve(versions);
      const allOrder = bundle.evaluatedRules.map((e) => e.ruleType);

      expect(allOrder.indexOf(CommercialRuleType.PRICING))
        .toBeLessThan(allOrder.indexOf(CommercialRuleType.TRIAL));
      expect(allOrder.indexOf(CommercialRuleType.TRIAL))
        .toBeLessThan(allOrder.indexOf(CommercialRuleType.TAX));
    });
  });

  // ── Typed rule classification ──────────────────────────────────────────

  describe('Rule classification', () => {
    it('classifies a PRICING rule into pricingRules', async () => {
      const svc  = await buildResolver();
      const bundle = svc.resolve([
        rv(CommercialRuleType.PRICING, { basePriceMinor: 2900, currency: 'GBP' }),
      ]);

      expect(bundle.pricingRules).toHaveLength(1);
      expect(bundle.pricingRules[0]!.definition.basePriceMinor).toBe(2900);
      expect(bundle.pricingRules[0]!.definition.currency).toBe('GBP');
    });

    it('classifies a DISCOUNT rule into discountRules', async () => {
      const svc  = await buildResolver();
      const bundle = svc.resolve([
        rv(CommercialRuleType.DISCOUNT, { discountBps: 500, maxDiscountMinor: 200 }),
      ]);

      expect(bundle.discountRules).toHaveLength(1);
      expect(bundle.discountRules[0]!.definition.discountBps).toBe(500);
    });

    it('classifies a PROMOTION rule into promotionRules', async () => {
      const svc  = await buildResolver();
      const bundle = svc.resolve([
        rv(CommercialRuleType.PROMOTION, { discountBps: 2000, promotionCode: 'LAUNCH2025' }),
      ]);

      expect(bundle.promotionRules).toHaveLength(1);
      expect(bundle.promotionRules[0]!.definition.promotionCode).toBe('LAUNCH2025');
    });

    it('classifies a TRIAL rule into trialRules', async () => {
      const svc  = await buildResolver();
      const bundle = svc.resolve([
        rv(CommercialRuleType.TRIAL, { trialDays: 30, trialPriceMinor: 0, currency: 'GBP', requiresPaymentMethod: false }),
      ]);

      expect(bundle.trialRules).toHaveLength(1);
      expect(bundle.trialRules[0]!.definition.trialDays).toBe(30);
    });

    it('classifies a TAX rule into taxRules (SKIPPED outcome)', async () => {
      const svc  = await buildResolver();
      const bundle = svc.resolve([
        rv(CommercialRuleType.TAX, { taxCode: 'IN-GST', rateBps: 1800, taxType: 'GST' }),
      ]);

      expect(bundle.taxRules).toHaveLength(1);
      expect(bundle.taxRules[0]!.definition.rateBps).toBe(1800);

      const taxEval = bundle.evaluatedRules.find((e) => e.ruleType === CommercialRuleType.TAX);
      expect(taxEval?.outcome).toBe(RuleEvaluationOutcome.SKIPPED);
    });
  });

  // ── Version immutability ───────────────────────────────────────────────

  describe('Version immutability', () => {
    it('ruleVersion reference in typed rule is the same object passed in', async () => {
      const svc    = await buildResolver();
      const version = rv(CommercialRuleType.PRICING, { basePriceMinor: 1000, currency: 'GBP' });
      const bundle  = svc.resolve([version]);

      expect(bundle.pricingRules[0]!.ruleVersion).toBe(version);
    });

    it('two resolutions with same input produce identical evaluation order', async () => {
      const svc = await buildResolver();
      const versions = [
        rv(CommercialRuleType.DISCOUNT, { discountBps: 1000, maxDiscountMinor: 5000 }),
        rv(CommercialRuleType.PRICING,  { basePriceMinor: 2900, currency: 'GBP' }),
      ];

      const bundleA = svc.resolve(versions);
      const bundleB = svc.resolve(versions);

      expect(bundleA.evaluatedRules.map((e) => e.ruleType))
        .toEqual(bundleB.evaluatedRules.map((e) => e.ruleType));
    });

    it('source ruleVersions array is not mutated', async () => {
      const svc = await buildResolver();
      const versions = [
        rv(CommercialRuleType.PRICING, { basePriceMinor: 2900, currency: 'GBP' }),
        rv(CommercialRuleType.DISCOUNT, { discountBps: 500, maxDiscountMinor: 1000 }),
      ];
      const originalIds = versions.map((v) => v.id);

      svc.resolve(versions);

      expect(versions.map((v) => v.id)).toEqual(originalIds);
    });
  });

  // ── primaryRuleVersionId ──────────────────────────────────────────────

  describe('primaryRuleVersionId', () => {
    it('is the first PRICING rule when one exists', async () => {
      const svc  = await buildResolver();
      const pr   = rv(CommercialRuleType.PRICING,  { basePriceMinor: 2900, currency: 'GBP' });
      const disc = rv(CommercialRuleType.DISCOUNT, { discountBps: 500, maxDiscountMinor: 200 });
      const bundle = svc.resolve([disc, pr]);   // note: discount listed first

      expect(bundle.primaryRuleVersionId).toBe(pr.id);   // PRICING evaluated first
    });

    it('is null when no rule versions are provided', async () => {
      const svc    = await buildResolver();
      const bundle = svc.resolve([]);

      expect(bundle.primaryRuleVersionId).toBeNull();
      expect(bundle.primaryRuleVersionSemver).toBeNull();
    });

    it('is the first applied rule when no PRICING rule exists', async () => {
      const svc  = await buildResolver();
      const disc = rv(CommercialRuleType.DISCOUNT, { discountBps: 1000, maxDiscountMinor: 5000 });
      const bundle = svc.resolve([disc]);

      expect(bundle.primaryRuleVersionId).toBe(disc.id);
    });
  });

  // ── Missing required fields ───────────────────────────────────────────

  describe('Missing required definition fields', () => {
    it('skips a PRICING rule with missing basePriceMinor and adds no pricingRule', async () => {
      const svc  = await buildResolver();
      const bundle = svc.resolve([
        rv(CommercialRuleType.PRICING, { currency: 'GBP' }),  // missing basePriceMinor
      ]);

      expect(bundle.pricingRules).toHaveLength(0);
    });

    it('skips malformed rule and processes valid rules in the same batch', async () => {
      const svc  = await buildResolver();
      const bundle = svc.resolve([
        rv(CommercialRuleType.PRICING,  { currency: 'GBP' }),               // malformed
        rv(CommercialRuleType.DISCOUNT, { discountBps: 500, maxDiscountMinor: 200 }),  // valid
      ]);

      expect(bundle.pricingRules).toHaveLength(0);
      expect(bundle.discountRules).toHaveLength(1);
    });

    it('does not throw for unknown rule types', async () => {
      const svc = await buildResolver();
      const unknownRv = rv('UNKNOWN_TYPE' as CommercialRuleType, { something: true });
      expect(() => svc.resolve([unknownRv])).not.toThrow();
    });
  });

  // ── Multiple rule evaluation ──────────────────────────────────────────

  describe('Multiple rule evaluation', () => {
    it('evaluates multiple rules of the same type independently', async () => {
      const svc = await buildResolver();
      const bundle = svc.resolve([
        rv(CommercialRuleType.DISCOUNT, { discountBps: 500,  maxDiscountMinor: 200 }),
        rv(CommercialRuleType.DISCOUNT, { discountBps: 1000, maxDiscountMinor: 500 }),
      ]);

      expect(bundle.discountRules).toHaveLength(2);
      expect(bundle.evaluatedRules.filter((e) => e.ruleType === CommercialRuleType.DISCOUNT))
        .toHaveLength(2);
    });
  });

  // ── No mutable rule entity dependency ─────────────────────────────────

  describe('No mutable CommercialRuleEntity dependency', () => {
    it('resolver source does not import CommercialRuleEntity or CommercialRuleRepository', () => {
      const fs   = require('fs') as typeof import('fs');
      const path = require('path') as typeof import('path');
      const src  = path.resolve(
        process.cwd(),
        'src/modules/commercial/policy/default-rule-resolver.ts',
      );
      const source = fs.readFileSync(src, 'utf8');
      expect(source).not.toMatch(/CommercialRuleRepository/);
      expect(source).not.toMatch(/CommercialRuleEntity(?!Version)/);
    });

    it('all evaluated data comes from CommercialRuleVersionEntity.definition', async () => {
      const svc  = await buildResolver();
      const version = rv(CommercialRuleType.PRICING, { basePriceMinor: 9999, currency: 'USD' });
      const bundle  = svc.resolve([version]);

      // The definition in the typed rule must match the original entity definition
      expect(bundle.pricingRules[0]!.definition.basePriceMinor).toBe(9999);
      expect(bundle.pricingRules[0]!.definition.currency).toBe('USD');
    });
  });

  // ── Empty input ───────────────────────────────────────────────────────

  describe('Empty input', () => {
    it('returns empty bundle when no rule versions are provided', async () => {
      const svc  = await buildResolver();
      const bundle = svc.resolve([]);

      expect(bundle.pricingRules).toHaveLength(0);
      expect(bundle.discountRules).toHaveLength(0);
      expect(bundle.promotionRules).toHaveLength(0);
      expect(bundle.trialRules).toHaveLength(0);
      expect(bundle.taxRules).toHaveLength(0);
      expect(bundle.evaluatedRules).toHaveLength(0);
      expect(bundle.primaryRuleVersionId).toBeNull();
    });
  });

  // ── Snapshot integrity ────────────────────────────────────────────────

  describe('Snapshot integrity', () => {
    it('evaluatedRules contains one entry per input rule version', async () => {
      const svc  = await buildResolver();
      const versions = [
        rv(CommercialRuleType.PRICING,  { basePriceMinor: 2900, currency: 'GBP' }),
        rv(CommercialRuleType.DISCOUNT, { discountBps: 500, maxDiscountMinor: 200 }),
        rv(CommercialRuleType.TAX,      { taxCode: 'VAT', rateBps: 2000, taxType: 'VAT' }),
      ];
      const bundle = svc.resolve(versions);

      expect(bundle.evaluatedRules).toHaveLength(3);
    });

    it('each evaluatedRule carries the immutable ruleVersion reference', async () => {
      const svc     = await buildResolver();
      const version = rv(CommercialRuleType.PRICING, { basePriceMinor: 1000, currency: 'GBP' });
      const bundle  = svc.resolve([version]);

      expect(bundle.evaluatedRules[0]!.ruleVersion).toBe(version);
    });
  });
});
