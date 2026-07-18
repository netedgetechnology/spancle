/**
 * commercial-decision.service.spec.ts
 *
 * Unit tests for CommercialDecisionService using a mocked IPolicyResolver.
 * No repository coupling — the service depends only on POLICY_RESOLVER + snapshotRepo.
 */
import { Test, type TestingModule } from '@nestjs/testing';
import { UnprocessableEntityException }      from '@nestjs/common';
import { EventEmitter2 }                     from '@nestjs/event-emitter';
import { CommercialDecisionService }         from './commercial-decision.service';
import { CommercialDecisionSnapshotRepository } from '../commercial.repositories';
import { POLICY_RESOLVER }                   from '../interfaces/policy-resolver.interfaces';
import { PLATFORM_CONTRACT_PUBLISHER }        from '../../../platform';
import {
  CommercialDecisionOutcome,
  CommercialPipelineStep,
  TransactionType,
} from '../enums/commercial.enums';
import type { CommercialDecisionContext }    from '../interfaces/commercial-decision.interfaces';
import type { ResolvedPolicyBundle }         from '../interfaces/policy-resolver.interfaces';
import type { PackageAssignment }            from '../policy/package-assignment.model';

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

const PACKAGE_VERSION = {
  id:        'pkgv-001',
  packageId: 'pkg-001',
  version:   'starter-v1',
  features:  {},
  limits:    {},
  prices:    {},
  changelog: null,
  createdById: null,
  createdAt: new Date(),
};

const PACKAGE_ASSIGNMENT: PackageAssignment = {
  planId:           'plan-001',
  packageId:        'pkg-001',
  packageSlug:      'starter',
  tierKey:          'starter-v1',
  packageVersion:   PACKAGE_VERSION,
  packageStatus:    'active',
  isEligible:       true,
  effectiveFeatures: { booking: true },
  effectiveLimits:  { maxCourts: 10 },
  resolvedAt:       new Date(),
};

function makeBundle(overrides: Partial<ResolvedPolicyBundle> = {}): ResolvedPolicyBundle {
  return {
    ruleBundle:          null,
    gatewayBundle:       null,
    entitlementBundle:   null,
    packageAssignment:   PACKAGE_ASSIGNMENT,
    packageVersion:      PACKAGE_VERSION,
    packageSlug:         'starter',
    ruleVersions:        [],
    ownershipPolicies:   [],
    distributionPolicies: [],
    pricingModels:       [],
    gatewayDefinitions:  [],
    featureFlags:        [],
    resolvedAt:          new Date(),
    ...overrides,
  };
}

const SNAPSHOT = {
  id:            'snap-001',
  tenantId:      'tenant-001',
  ruleId:        '00000000-0000-0000-0000-000000000000',
  ruleVersion:   '0.0.0',
  subjectType:   'commercial_decision',
  subjectId:     '00000000-0000-0000-0000-000000000000',
  outcome:       CommercialDecisionOutcome.ALLOWED,
  inputContext:  {},
  resultPayload: {},
  evaluatedById: null,
  createdAt:     new Date(),
};

function makeMocks(bundleOverride?: Partial<ResolvedPolicyBundle>) {
  return {
    platformPublisher: {
      publish:    jest.fn().mockResolvedValue({ success: true, contractId: 'env-001', publishedAt: new Date().toISOString() }),
      validate:   jest.fn().mockReturnValue({ valid: true, errors: [] }),
      serialize:  jest.fn().mockReturnValue('{}'),
    },
    policyResolver: {
      resolve: jest.fn().mockResolvedValue(makeBundle(bundleOverride)),
    },
    snapshotRepo: {
      create:        jest.fn().mockResolvedValue(SNAPSHOT),
      findBySubject: jest.fn().mockResolvedValue([]),
    },
    eventEmitter: { emitAsync: jest.fn().mockResolvedValue(undefined) },
  };
}

async function buildService(mocks: ReturnType<typeof makeMocks>) {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      CommercialDecisionService,
      { provide: PLATFORM_CONTRACT_PUBLISHER,            useValue: mocks.platformPublisher },
      { provide: POLICY_RESOLVER,                        useValue: mocks.policyResolver },
      { provide: CommercialDecisionSnapshotRepository,   useValue: mocks.snapshotRepo },
      { provide: EventEmitter2,                          useValue: mocks.eventEmitter },
    ],
  }).compile();
  return module.get(CommercialDecisionService);
}

// =============================================================================
// Tests
// =============================================================================

describe('CommercialDecisionService', () => {

  describe('evaluate() — happy path', () => {
    it('delegates all policy resolution to IPolicyResolver', async () => {
      const mocks = makeMocks();
      const svc   = await buildService(mocks);

      await svc.evaluate(baseContext());

      expect(mocks.policyResolver.resolve).toHaveBeenCalledTimes(1);
      expect(mocks.policyResolver.resolve).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'tenant-001' }),
      );
    });

    it('returns ALLOWED when packageAssignment.isEligible = true', async () => {
      const mocks  = makeMocks();
      const svc    = await buildService(mocks);
      const result = await svc.evaluate(baseContext());

      expect(result.outcome).toBe(CommercialDecisionOutcome.ALLOWED);
      expect(result.productEligible).toBe(true);
    });

    it('returns DENIED when bundle has null packageAssignment', async () => {
      const mocks = makeMocks({ packageAssignment: null, packageVersion: null, packageSlug: null });
      const svc   = await buildService(mocks);
      const result = await svc.evaluate(baseContext());

      expect(result.outcome).toBe(CommercialDecisionOutcome.DENIED);
      expect(result.productEligible).toBe(false);
    });

    it('writes an immutable snapshot for every evaluation', async () => {
      const mocks = makeMocks();
      const svc   = await buildService(mocks);
      await svc.evaluate(baseContext());

      expect(mocks.snapshotRepo.create).toHaveBeenCalledTimes(1);
    });

    it('snapshot resultPayload includes packageAssignment snapshot', async () => {
      const mocks = makeMocks();
      const svc   = await buildService(mocks);
      await svc.evaluate(baseContext());

      const call = mocks.snapshotRepo.create.mock.calls[0][0];
      expect(call.resultPayload).toMatchObject({
        planId:         'plan-001',
        packageId:      'pkg-001',
        packageSlug:    'starter',
        packageVersion: 'starter-v1',
        tierKey:        'starter-v1',
      });
    });

    it('emits DECISION_REQUESTED then DECISION_GENERATED', async () => {
      const mocks = makeMocks();
      const svc   = await buildService(mocks);
      await svc.evaluate(baseContext());

      const events = mocks.eventEmitter.emitAsync.mock.calls.map((c: unknown[]) => c[0]);
      expect(events).toContain('spancle.commercial.decision.requested');
      expect(events).toContain('spancle.commercial.decision.generated');
    });

    it('populates all five stepTrace entries', async () => {
      const mocks  = makeMocks();
      const svc    = await buildService(mocks);
      const result = await svc.evaluate(baseContext());

      const steps = result.stepTrace.map((s) => s.step);
      expect(steps).toContain(CommercialPipelineStep.VALIDATE_REQUEST);
      expect(steps).toContain(CommercialPipelineStep.RESOLVE_PACKAGE);
      expect(steps).toContain(CommercialPipelineStep.RESOLVE_PRODUCT);
      expect(steps).toContain(CommercialPipelineStep.RESOLVE_POLICIES);
      expect(steps).toContain(CommercialPipelineStep.GENERATE_SNAPSHOT);
    });
  });

  describe('evaluate() — VALIDATE_REQUEST step', () => {
    it('throws when tenantId is empty', async () => {
      const mocks = makeMocks();
      const svc   = await buildService(mocks);
      await expect(svc.evaluate(baseContext({ tenantId: '' }))).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws when amountMinor is negative', async () => {
      const mocks = makeMocks();
      const svc   = await buildService(mocks);
      await expect(svc.evaluate(baseContext({ amountMinor: -1 }))).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws when currency is not 3 chars', async () => {
      const mocks = makeMocks();
      const svc   = await buildService(mocks);
      await expect(svc.evaluate(baseContext({ currency: 'GBPP' }))).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws when country is not 2 chars', async () => {
      const mocks = makeMocks();
      const svc   = await buildService(mocks);
      await expect(svc.evaluate(baseContext({ country: 'GBR' }))).rejects.toThrow(UnprocessableEntityException);
    });

    it('does not call policyResolver when validation fails', async () => {
      const mocks = makeMocks();
      const svc   = await buildService(mocks);
      try { await svc.evaluate(baseContext({ tenantId: '' })); } catch { /* expected */ }
      expect(mocks.policyResolver.resolve).not.toHaveBeenCalled();
    });

    it('does not write a snapshot when validation fails', async () => {
      const mocks = makeMocks();
      const svc   = await buildService(mocks);
      try { await svc.evaluate(baseContext({ tenantId: '' })); } catch { /* expected */ }
      expect(mocks.snapshotRepo.create).not.toHaveBeenCalled();
    });

    it('emits DECISION_FAILED when validation fails', async () => {
      const mocks = makeMocks();
      const svc   = await buildService(mocks);
      try { await svc.evaluate(baseContext({ tenantId: '' })); } catch { /* expected */ }
      const events = mocks.eventEmitter.emitAsync.mock.calls.map((c: unknown[]) => c[0]);
      expect(events).toContain('spancle.commercial.decision.failed');
    });
  });

  describe('No repository coupling', () => {
    it('service constructor only takes POLICY_RESOLVER, snapshotRepo, eventEmitter', async () => {
      const source = require('fs').readFileSync(
        require('path').resolve(process.cwd(), 'src/modules/commercial/services/commercial-decision.service.ts'),
        'utf8',
      );
      // Service must not import individual domain repositories
      expect(source).not.toMatch(/PackageVersionRepository|PackageDefinitionRepository/);
      expect(source).not.toMatch(/CommercialProductRepository/);
      expect(source).not.toMatch(/PaymentOwnershipPolicyRepository|RevenueDistributionPolicyRepository/);
      expect(source).not.toMatch(/CommercialRuleRepository(?!.*snapshot)/);
    });

    it('service file references no Booking or Finance modules', async () => {
      const source = require('fs').readFileSync(
        require('path').resolve(process.cwd(), 'src/modules/commercial/services/commercial-decision.service.ts'),
        'utf8',
      );
      expect(source).not.toMatch(/booking\.service|finance\.service/i);
    });
  });

  describe('Snapshot immutability', () => {
    it('snapshot is written exactly once per evaluation', async () => {
      const mocks = makeMocks();
      const svc   = await buildService(mocks);
      await svc.evaluate(baseContext());
      expect(mocks.snapshotRepo.create).toHaveBeenCalledTimes(1);
    });

    it('findDecision returns null when snapshot does not exist', async () => {
      const mocks = makeMocks();
      const svc   = await buildService(mocks);
      const result = await svc.findDecision('nonexistent', 'tenant-001');
      expect(result).toBeNull();
    });
  });
});
