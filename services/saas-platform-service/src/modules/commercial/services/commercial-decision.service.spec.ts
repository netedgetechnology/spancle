/**
 * commercial-decision.service.spec.ts
 *
 * Unit tests for the Commercial Decision Framework pipeline.
 * All external repositories are mocked — no database required.
 */
import { Test, type TestingModule } from '@nestjs/testing';
import { UnprocessableEntityException }      from '@nestjs/common';
import { EventEmitter2 }                     from '@nestjs/event-emitter';
import { CommercialDecisionService }         from './commercial-decision.service';
import {
  CommercialDecisionSnapshotRepository,
  CommercialProductRepository,
  CommercialRuleRepository,
  PackageDefinitionRepository,
  PackageVersionRepository,
  PaymentOwnershipPolicyRepository,
  RevenueDistributionPolicyRepository,
} from '../commercial.repositories';
import { CommercialDecisionOutcome, TransactionType } from '../enums/commercial.enums';
import type { CommercialDecisionContext } from '../interfaces/commercial-decision.interfaces';

// ── Helpers ───────────────────────────────────────────────────────────────────

function baseContext(overrides: Partial<CommercialDecisionContext> = {}): CommercialDecisionContext {
  return {
    tenantId:        'tenant-001',
    moduleId:        'booking',
    productId:       'sku-court-booking',
    transactionType: TransactionType.BOOKING,
    amountMinor:     5000,
    currency:        'GBP',
    country:         'GB',
    metadata:        {},
    actorId:         null,
    requestedAt:     new Date('2025-01-01T10:00:00Z'),
    ...overrides,
  };
}

const activeProduct = {
  id:          'product-001',
  sku:         'sku-court-booking',
  isActive:    true,
  isDeleted:   false,
  name:        'Court Booking',
  productType: 'ONE_TIME',
};

const inactiveProduct = { ...activeProduct, isActive: false };

// ── Mock factories ────────────────────────────────────────────────────────────

function makeMocks() {
  const snapshot = {
    id:            'snap-001',
    tenantId:      'tenant-001',
    ruleId:        '00000000-0000-0000-0000-000000000000',
    ruleVersion:   '0.0.0',
    subjectType:   'decision',
    subjectId:     '00000000-0000-0000-0000-000000000000',
    outcome:       CommercialDecisionOutcome.ALLOWED,
    inputContext:  {},
    resultPayload: {},
    evaluatedById: null,
    createdAt:     new Date(),
  };

  return {
    snapshotRepo: {
      create:         jest.fn().mockResolvedValue(snapshot),
      findBySubject:  jest.fn().mockResolvedValue([]),
    },
    packageDefRepo:    { findAll: jest.fn().mockResolvedValue([]) },
    packageVersionRepo: { findByPackage: jest.fn().mockResolvedValue([]) },
    productRepo: {
      findById:  jest.fn().mockResolvedValue(null),
      findBySku: jest.fn().mockResolvedValue(activeProduct),
    },
    ruleRepo:         { findActiveByTenant: jest.fn().mockResolvedValue([]) },
    ownershipRepo:    { findByTenant: jest.fn().mockResolvedValue([]) },
    distributionRepo: { findByTenant: jest.fn().mockResolvedValue([]) },
    eventEmitter:     { emitAsync: jest.fn().mockResolvedValue(undefined) },
  };
}

async function buildService(mocks: ReturnType<typeof makeMocks>) {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      CommercialDecisionService,
      { provide: CommercialDecisionSnapshotRepository, useValue: mocks.snapshotRepo },
      { provide: PackageDefinitionRepository,         useValue: mocks.packageDefRepo },
      { provide: PackageVersionRepository,            useValue: mocks.packageVersionRepo },
      { provide: CommercialProductRepository,         useValue: mocks.productRepo },
      { provide: CommercialRuleRepository,            useValue: mocks.ruleRepo },
      { provide: PaymentOwnershipPolicyRepository,    useValue: mocks.ownershipRepo },
      { provide: RevenueDistributionPolicyRepository, useValue: mocks.distributionRepo },
      { provide: EventEmitter2,                       useValue: mocks.eventEmitter },
    ],
  }).compile();
  return module.get(CommercialDecisionService);
}

// =============================================================================
// Tests
// =============================================================================

describe('CommercialDecisionService', () => {

  // ── Pipeline happy path ─────────────────────────────────────────────────

  describe('evaluate() — happy path', () => {
    it('returns ALLOWED outcome when product is active', async () => {
      const mocks = makeMocks();
      const svc   = await buildService(mocks);

      const result = await svc.evaluate(baseContext());

      expect(result.outcome).toBe(CommercialDecisionOutcome.ALLOWED);
      expect(result.productEligible).toBe(true);
      expect(result.decisionId).toBe('snap-001');
    });

    it('writes an immutable snapshot for every evaluation', async () => {
      const mocks = makeMocks();
      const svc   = await buildService(mocks);

      await svc.evaluate(baseContext());

      expect(mocks.snapshotRepo.create).toHaveBeenCalledTimes(1);
      const call = mocks.snapshotRepo.create.mock.calls[0][0];
      expect(call.outcome).toBe(CommercialDecisionOutcome.ALLOWED);
      expect(call.inputContext).toMatchObject({ tenantId: 'tenant-001', moduleId: 'booking' });
    });

    it('emits DECISION_REQUESTED then DECISION_GENERATED', async () => {
      const mocks = makeMocks();
      const svc   = await buildService(mocks);

      await svc.evaluate(baseContext());

      const calls = mocks.eventEmitter.emitAsync.mock.calls.map((c: unknown[]) => c[0]);
      expect(calls).toContain('spancle.commercial.decision.requested');
      expect(calls).toContain('spancle.commercial.decision.generated');
      expect(calls).not.toContain('spancle.commercial.decision.failed');
    });

    it('populates stepTrace with all five steps', async () => {
      const mocks = makeMocks();
      const svc   = await buildService(mocks);

      const result = await svc.evaluate(baseContext());

      const stepNames = result.stepTrace.map((s) => s.step);
      expect(stepNames).toContain('VALIDATE_REQUEST');
      expect(stepNames).toContain('RESOLVE_PACKAGE');
      expect(stepNames).toContain('RESOLVE_PRODUCT');
      expect(stepNames).toContain('RESOLVE_POLICIES');
      expect(stepNames).toContain('GENERATE_SNAPSHOT');
    });

    it('all stepTrace entries are ok=true on happy path', async () => {
      const mocks = makeMocks();
      const svc   = await buildService(mocks);

      const result = await svc.evaluate(baseContext());

      result.stepTrace.forEach((s) => {
        expect(s.ok).toBe(true);
      });
    });
  });

  // ── DENIED outcome ───────────────────────────────────────────────────────

  describe('evaluate() — DENIED outcome', () => {
    it('returns DENIED when product is inactive', async () => {
      const mocks = makeMocks();
      mocks.productRepo.findBySku.mockResolvedValue(inactiveProduct);
      const svc = await buildService(mocks);

      const result = await svc.evaluate(baseContext());

      expect(result.outcome).toBe(CommercialDecisionOutcome.DENIED);
      expect(result.productEligible).toBe(false);
    });

    it('returns DENIED when product is not found', async () => {
      const mocks = makeMocks();
      mocks.productRepo.findById.mockResolvedValue(null);
      mocks.productRepo.findBySku.mockResolvedValue(null);
      const svc = await buildService(mocks);

      const result = await svc.evaluate(baseContext());

      expect(result.outcome).toBe(CommercialDecisionOutcome.DENIED);
      expect(result.productEligible).toBe(false);
    });
  });

  // ── Validation ───────────────────────────────────────────────────────────

  describe('evaluate() — VALIDATE_REQUEST step', () => {
    it('throws UnprocessableEntityException when tenantId is empty', async () => {
      const mocks = makeMocks();
      const svc   = await buildService(mocks);

      await expect(
        svc.evaluate(baseContext({ tenantId: '' })),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws when amountMinor is negative', async () => {
      const mocks = makeMocks();
      const svc   = await buildService(mocks);

      await expect(
        svc.evaluate(baseContext({ amountMinor: -1 })),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws when currency is not exactly 3 chars', async () => {
      const mocks = makeMocks();
      const svc   = await buildService(mocks);

      await expect(
        svc.evaluate(baseContext({ currency: 'GBPP' })),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws when country is not exactly 2 chars', async () => {
      const mocks = makeMocks();
      const svc   = await buildService(mocks);

      await expect(
        svc.evaluate(baseContext({ country: 'GBR' })),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('emits DECISION_FAILED when validation fails', async () => {
      const mocks = makeMocks();
      const svc   = await buildService(mocks);

      try {
        await svc.evaluate(baseContext({ tenantId: '' }));
      } catch { /* expected */ }

      const calls = mocks.eventEmitter.emitAsync.mock.calls.map((c: unknown[]) => c[0]);
      expect(calls).toContain('spancle.commercial.decision.failed');
    });

    it('does not write a snapshot when validation fails', async () => {
      const mocks = makeMocks();
      const svc   = await buildService(mocks);

      try { await svc.evaluate(baseContext({ tenantId: '' })); } catch { /* expected */ }

      expect(mocks.snapshotRepo.create).not.toHaveBeenCalled();
    });
  });

  // ── Snapshot immutability ────────────────────────────────────────────────

  describe('Snapshot immutability', () => {
    it('snapshot is created once and never updated', async () => {
      const mocks = makeMocks();
      const svc   = await buildService(mocks);

      const result = await svc.evaluate(baseContext());

      // create() called exactly once
      expect(mocks.snapshotRepo.create).toHaveBeenCalledTimes(1);
      // The returned snapshot reference is the same object from create()
      expect(result.snapshot.id).toBe('snap-001');
    });

    it('snapshot inputContext captures the exact input fields', async () => {
      const mocks = makeMocks();
      const svc   = await buildService(mocks);

      const ctx = baseContext({ amountMinor: 9999, currency: 'INR', country: 'IN' });
      await svc.evaluate(ctx);

      const savedInput = mocks.snapshotRepo.create.mock.calls[0][0].inputContext;
      expect(savedInput.amountMinor).toBe(9999);
      expect(savedInput.currency).toBe('INR');
      expect(savedInput.country).toBe('IN');
    });
  });

  // ── No Booking/Finance dependency ────────────────────────────────────────

  describe('Module isolation', () => {
    it('does not import BookingModule or FinanceModule', () => {
      // Read the TypeScript source for structural verification
      const fs   = require('fs') as typeof import('fs');
      const path = require('path') as typeof import('path');
      const src  = path.resolve(
        process.cwd(),
        'src/modules/commercial/services/commercial-decision.service.ts',
      );
      const source = fs.readFileSync(src, 'utf8');
      expect(source).not.toMatch(/BookingModule|FinanceModule/);
      expect(source).not.toMatch(/booking\.service|finance\.service/i);
    });

    it('contains no pricing or commission calculations', () => {
      const fs   = require('fs') as typeof import('fs');
      const path = require('path') as typeof import('path');
      const src  = path.resolve(
        process.cwd(),
        'src/modules/commercial/services/commercial-decision.service.ts',
      );
      const source = fs.readFileSync(src, 'utf8');
      expect(source).not.toMatch(/commission.*=.*\*|rate.*amountMinor|\* 0\.\d/);
    });

    it('contains no gateway SDK calls', () => {
      const fs   = require('fs') as typeof import('fs');
      const path = require('path') as typeof import('path');
      const src  = path.resolve(
        process.cwd(),
        'src/modules/commercial/services/commercial-decision.service.ts',
      );
      const source = fs.readFileSync(src, 'utf8');
      expect(source).not.toMatch(/stripe\.|razorpay\.|payu\.|cashfree\./i);
    });
  });

  // ── findDecision ─────────────────────────────────────────────────────────

  describe('findDecision()', () => {
    it('returns null when no snapshot exists for the id', async () => {
      const mocks = makeMocks();
      const svc   = await buildService(mocks);

      const result = await svc.findDecision('nonexistent-id', 'tenant-001');

      expect(result).toBeNull();
    });
  });
});
