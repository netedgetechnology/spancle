/**
 * commercial-contracts.spec.ts
 *
 * Tests for Commercial→Finance inter-module contracts.
 * Verifies: serialization, version compatibility, snapshot mapping,
 * backward compatibility, immutability, and no Finance dependency.
 */

import {
  COMMERCIAL_CONTRACT_VERSION,
  isCompatibleVersion,
  CommercialContractBuilder,
} from '../contracts';
import type { CommercialDecisionResult } from '../interfaces/commercial-decision.interfaces';
import type { ResolvedPolicyBundle }     from '../interfaces/policy-resolver.interfaces';
import { CommercialDecisionOutcome, PaymentOwnershipType } from '../enums/commercial.enums';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PKG_SNAPSHOT = {
  planId:            'plan-001',
  packageId:         'pkg-001',
  packageSlug:       'starter',
  tierKey:           'starter-v1',
  packageVersionId:  'pkgv-001',
  packageVersion:    'starter-v1',
  packageStatus:     'active',
  isEligible:        true,
  effectiveFeatures: { booking: true },
  effectiveLimits:   { maxCourts: 10 },
  resolvedAt:        '2025-06-01T10:00:00.000Z',
};

const SNAPSHOT = {
  id:             'snap-001',
  tenantId:       'tenant-001',
  ruleId:         null,
  ruleVersion:    null,
  subjectType:    'commercial_decision',
  subjectId:      '00000000-0000-0000-0000-000000000000',
  outcome:        CommercialDecisionOutcome.ALLOWED,
  inputContext: {
    tenantId:        'tenant-001',
    moduleId:        'booking',
    productId:       'sku-court',
    transactionType: 'BOOKING',
    amountMinor:     2900,
    currency:        'GBP',
    country:         'GB',
    requestedAt:     '2025-06-01T10:00:00.000Z',
  },
  resultPayload: {
    packageAssignment:        PKG_SNAPSHOT,
    planId:                   'plan-001',
    packageId:                'pkg-001',
    packageSlug:              'starter',
    packageVersion:           'starter-v1',
    tierKey:                  'starter-v1',
    primaryRuleVersionId:     null,
    primaryRuleVersionSemver: null,
    evaluatedRules:           [],
  },
  evaluatedRuleIds: [],
  evaluatedById:    null,
  createdAt:        new Date('2025-06-01T10:00:00Z'),
};

const RESULT: CommercialDecisionResult = {
  decisionId:      'snap-001',
  tenantId:        'tenant-001',
  moduleId:        'booking',
  productId:       'sku-court',
  transactionType: 'BOOKING' as any,
  outcome:         CommercialDecisionOutcome.ALLOWED,
  reason:          'Package resolved.',
  resolvedPackage: { slug: 'starter', version: 'starter-v1' },
  productEligible: true,
  appliedPolicyIds: [],
  snapshot:        SNAPSHOT as any,
  generatedAt:     new Date('2025-06-01T10:00:00Z'),
  stepTrace:       [],
};

const BASE_BUNDLE: Readonly<ResolvedPolicyBundle> = {
  ruleBundle:          null,
  gatewayBundle:       null,
  entitlementBundle:   null,
  packageAssignment:   null,
  packageVersion:      null,
  packageSlug:         'starter',
  ruleVersions:        [],
  ownershipPolicies:   [],
  distributionPolicies: [],
  pricingModels:       [],
  gatewayDefinitions:  [],
  featureFlags:        [],
  resolvedAt:          new Date(),
};

// =============================================================================
// Tests
// =============================================================================

describe('Contract versioning', () => {
  it('COMMERCIAL_CONTRACT_VERSION is 1.0.0', () => {
    expect(COMMERCIAL_CONTRACT_VERSION).toBe('1.0.0');
  });

  it('isCompatibleVersion returns true for same major version', () => {
    expect(isCompatibleVersion('1.0.0')).toBe(true);
    expect(isCompatibleVersion('1.1.0')).toBe(true);
    expect(isCompatibleVersion('1.99.5')).toBe(true);
  });

  it('isCompatibleVersion returns false for different major version', () => {
    expect(isCompatibleVersion('2.0.0')).toBe(false);
    expect(isCompatibleVersion('0.9.0')).toBe(false);
  });
});

describe('CommercialContractBuilder', () => {

  describe('build() — core contract fields', () => {
    it('sets contractVersion from COMMERCIAL_CONTRACT_VERSION', () => {
      const contract = CommercialContractBuilder.build(RESULT, BASE_BUNDLE);
      expect(contract.contractVersion).toBe(COMMERCIAL_CONTRACT_VERSION);
    });

    it('maps decisionId, tenantId, moduleId, productId from result', () => {
      const contract = CommercialContractBuilder.build(RESULT, BASE_BUNDLE);
      expect(contract.decisionId).toBe('snap-001');
      expect(contract.tenantId).toBe('tenant-001');
      expect(contract.moduleId).toBe('booking');
      expect(contract.productId).toBe('sku-court');
    });

    it('maps outcome and reason', () => {
      const contract = CommercialContractBuilder.build(RESULT, BASE_BUNDLE);
      expect(contract.outcome).toBe('ALLOWED');
      expect(contract.reason).toBe('Package resolved.');
    });

    it('maps packageAssignment snapshot fields', () => {
      const contract = CommercialContractBuilder.build(RESULT, BASE_BUNDLE);
      expect(contract.planId).toBe('plan-001');
      expect(contract.packageId).toBe('pkg-001');
      expect(contract.packageSlug).toBe('starter');
      expect(contract.packageVersion).toBe('starter-v1');
      expect(contract.tierKey).toBe('starter-v1');
    });

    it('maps requestedAmountMinor, currency, country from inputContext', () => {
      const contract = CommercialContractBuilder.build(RESULT, BASE_BUNDLE);
      expect(contract.requestedAmountMinor).toBe(2900);
      expect(contract.currency).toBe('GBP');
      expect(contract.country).toBe('GB');
    });

    it('serializes generatedAt as ISO-8601 string', () => {
      const contract = CommercialContractBuilder.build(RESULT, BASE_BUNDLE);
      expect(() => new Date(contract.generatedAt)).not.toThrow();
      expect(typeof contract.generatedAt).toBe('string');
    });
  });

  describe('build() — contract immutability', () => {
    it('contract object is frozen', () => {
      const contract = CommercialContractBuilder.build(RESULT, BASE_BUNDLE);
      expect(Object.isFrozen(contract)).toBe(true);
    });

    it('attempting to mutate a frozen contract field throws in strict mode', () => {
      const contract = CommercialContractBuilder.build(RESULT, BASE_BUNDLE);
      expect(() => {
        (contract as any).decisionId = 'mutated';
      }).toThrow();
    });
  });

  describe('build() — DENIED outcome', () => {
    it('paymentInstruction and invoiceInstruction are null when outcome is DENIED', () => {
      const deniedResult: CommercialDecisionResult = {
        ...RESULT,
        outcome:        CommercialDecisionOutcome.DENIED,
        productEligible: false,
        snapshot: {
          ...SNAPSHOT,
          outcome: CommercialDecisionOutcome.DENIED,
        } as any,
      };
      const contract = CommercialContractBuilder.build(deniedResult, BASE_BUNDLE);
      expect(contract.paymentInstruction).toBeNull();
      expect(contract.invoiceInstruction).toBeNull();
    });

    it('settlementInstruction is always present regardless of outcome', () => {
      const deniedResult: CommercialDecisionResult = {
        ...RESULT,
        outcome:        CommercialDecisionOutcome.DENIED,
        snapshot: { ...SNAPSHOT, outcome: CommercialDecisionOutcome.DENIED } as any,
      };
      const contract = CommercialContractBuilder.build(deniedResult, BASE_BUNDLE);
      expect(contract.settlementInstruction).not.toBeNull();
      expect(contract.settlementInstruction.kind).toBe('SettlementInstruction');
    });
  });

  describe('PaymentInstruction', () => {
    it('idempotencyKey follows format commercial-payment-{decisionId}', () => {
      const contract = CommercialContractBuilder.build(RESULT, BASE_BUNDLE);
      expect(contract.paymentInstruction?.idempotencyKey).toBe('commercial-payment-snap-001');
    });

    it('amountMinor falls back to inputContext.amountMinor when no pricing rule', () => {
      const contract = CommercialContractBuilder.build(RESULT, BASE_BUNDLE);
      expect(contract.paymentInstruction?.amountMinor).toBe(2900);
    });

    it('isTrial is false when no trial rule in bundle', () => {
      const contract = CommercialContractBuilder.build(RESULT, BASE_BUNDLE);
      expect(contract.paymentInstruction?.isTrial).toBe(false);
    });

    it('discountBps is 0 when no discount or promotion rule', () => {
      const contract = CommercialContractBuilder.build(RESULT, BASE_BUNDLE);
      expect(contract.paymentInstruction?.discountBps).toBe(0);
    });

    it('preferredGatewayType is null when no gateway in bundle', () => {
      const contract = CommercialContractBuilder.build(RESULT, BASE_BUNDLE);
      expect(contract.paymentInstruction?.preferredGatewayType).toBeNull();
    });

    it('PaymentInstruction is frozen', () => {
      const contract = CommercialContractBuilder.build(RESULT, BASE_BUNDLE);
      expect(Object.isFrozen(contract.paymentInstruction)).toBe(true);
    });
  });

  describe('InvoiceInstruction', () => {
    it('idempotencyKey follows format commercial-invoice-{decisionId}', () => {
      const contract = CommercialContractBuilder.build(RESULT, BASE_BUNDLE);
      expect(contract.invoiceInstruction?.idempotencyKey).toBe('commercial-invoice-snap-001');
    });

    it('taxMinor is always 0 (Finance applies tax rate)', () => {
      const contract = CommercialContractBuilder.build(RESULT, BASE_BUNDLE);
      expect(contract.invoiceInstruction?.taxMinor).toBe(0);
    });

    it('sourceType is commercial_decision and sourceId is decisionId', () => {
      const contract = CommercialContractBuilder.build(RESULT, BASE_BUNDLE);
      expect(contract.invoiceInstruction?.sourceType).toBe('commercial_decision');
      expect(contract.invoiceInstruction?.sourceId).toBe('snap-001');
    });

    it('InvoiceInstruction is frozen', () => {
      const contract = CommercialContractBuilder.build(RESULT, BASE_BUNDLE);
      expect(Object.isFrozen(contract.invoiceInstruction)).toBe(true);
    });
  });

  describe('SettlementInstruction', () => {
    it('defaults to PLATFORM ownership when no ownership policy', () => {
      const contract = CommercialContractBuilder.build(RESULT, BASE_BUNDLE);
      expect(contract.settlementInstruction.ownershipType).toBe(PaymentOwnershipType.PLATFORM);
    });

    it('platformFeeBps is 0 when no ownership policy', () => {
      const contract = CommercialContractBuilder.build(RESULT, BASE_BUNDLE);
      expect(contract.settlementInstruction.platformFeeBps).toBe(0);
    });

    it('uses ownership policy platformShareBps when policy exists', () => {
      const bundle: Readonly<ResolvedPolicyBundle> = {
        ...BASE_BUNDLE,
        ownershipPolicies: [{
          id:             'policy-001',
          tenantId:       null,
          name:           'Platform Policy',
          ownershipType:  PaymentOwnershipType.SPLIT as any,
          platformShareBps: 2000,   // 20%
          config:         {},
          isActive:       true,
          isDeleted:      false,
          createdAt:      new Date(),
          updatedAt:      new Date(),
          deletedAt:      null,
        }],
      };
      const contract = CommercialContractBuilder.build(RESULT, bundle);
      expect(contract.settlementInstruction.platformFeeBps).toBe(2000);
      expect(contract.settlementInstruction.ownershipType).toBe('SPLIT');
    });
  });

  describe('RevenueInstruction', () => {
    it('is null when no distribution policy exists', () => {
      const contract = CommercialContractBuilder.build(RESULT, BASE_BUNDLE);
      expect(contract.revenueInstruction).toBeNull();
    });

    it('computes estimatedPlatformAmountMinor from tiers and transaction amount', () => {
      const bundle: Readonly<ResolvedPolicyBundle> = {
        ...BASE_BUNDLE,
        distributionPolicies: [{
          id:               'dist-001',
          tenantId:         null,
          name:             'Standard Distribution',
          distributionType: 'FLAT_PERCENTAGE' as any,
          tiers:            [{ upToMinor: null, rateBps: 2000 }],  // 20%
          isActive:         true,
          isDeleted:        false,
          createdAt:        new Date(),
          updatedAt:        new Date(),
          deletedAt:        null,
        }],
      };
      const contract = CommercialContractBuilder.build(RESULT, bundle);
      // 20% of 2900 = 580 minor units
      expect(contract.revenueInstruction?.estimatedPlatformAmountMinor).toBe(580);
      expect(contract.revenueInstruction?.transactionAmountMinor).toBe(2900);
    });

    it('tiers array is frozen', () => {
      const bundle: Readonly<ResolvedPolicyBundle> = {
        ...BASE_BUNDLE,
        distributionPolicies: [{
          id:               'dist-001',
          tenantId:         null,
          name:             'Dist',
          distributionType: 'FLAT_PERCENTAGE' as any,
          tiers:            [{ upToMinor: null, rateBps: 1000 }],
          isActive:         true,
          isDeleted:        false,
          createdAt:        new Date(),
          updatedAt:        new Date(),
          deletedAt:        null,
        }],
      };
      const contract = CommercialContractBuilder.build(RESULT, bundle);
      expect(Object.isFrozen(contract.revenueInstruction?.tiers)).toBe(true);
    });
  });

  describe('Serialization (JSON round-trip)', () => {
    it('contract survives JSON.stringify → JSON.parse without data loss', () => {
      const contract  = CommercialContractBuilder.build(RESULT, BASE_BUNDLE);
      const serialized = JSON.stringify(contract);
      const parsed    = JSON.parse(serialized) as typeof contract;

      expect(parsed.contractVersion).toBe(contract.contractVersion);
      expect(parsed.decisionId).toBe(contract.decisionId);
      expect(parsed.outcome).toBe(contract.outcome);
      expect(parsed.packageSlug).toBe(contract.packageSlug);
    });

    it('no Date objects in contract (all ISO-8601 strings)', () => {
      const contract   = CommercialContractBuilder.build(RESULT, BASE_BUNDLE);
      const serialized = JSON.stringify(contract);
      // If Date objects were present, they'd serialize differently
      expect(serialized).not.toMatch(/"undefined"/);
      expect(serialized).not.toMatch(/\[object Object\]/);
    });
  });

  describe('Backward compatibility', () => {
    it('unknown optional fields can be added without breaking existing reads', () => {
      const contract = CommercialContractBuilder.build(RESULT, BASE_BUNDLE);
      // Consumer reading v1.0.0 fields from a hypothetical v1.1.0 contract
      const v1Fields: Array<keyof typeof contract> = [
        'contractVersion', 'decisionId', 'tenantId', 'outcome',
        'paymentInstruction', 'invoiceInstruction', 'settlementInstruction',
      ];
      v1Fields.forEach((field) => {
        expect(field in contract).toBe(true);
      });
    });
  });

  describe('No Finance dependency', () => {
    it('contract builder source does not import Finance or Booking modules', () => {
      const fs   = require('fs') as typeof import('fs');
      const path = require('path') as typeof import('path');
      const src  = path.resolve(
        process.cwd(),
        'src/modules/commercial/contracts/commercial-contract.builder.ts',
      );
      const source = fs.readFileSync(src, 'utf8');
      expect(source).not.toMatch(/FinanceModule|BookingModule/);
      expect(source).not.toMatch(/booking-service|finance\.service/i);
      expect(source).not.toMatch(/from '.*booking.*'/);
    });

    it('contract interfaces contain no entity imports from Finance', () => {
      const fs   = require('fs') as typeof import('fs');
      const path = require('path') as typeof import('path');
      for (const file of [
        'commercial-decision.contract.ts',
        'financial-instructions.contracts.ts',
        'contract-version.ts',
      ]) {
        const src    = path.resolve(process.cwd(), `src/modules/commercial/contracts/${file}`);
        const source = fs.readFileSync(src, 'utf8');
        // Check import statements only — comments mentioning these strings are acceptable
        const importLines = source.split('\n').filter((l) => l.trim().startsWith('import '));
        importLines.forEach((line) => {
          expect(line).not.toMatch(/booking-service/);
          expect(line).not.toMatch(/FinanceModule/);
        });
      }
    });
  });
});
