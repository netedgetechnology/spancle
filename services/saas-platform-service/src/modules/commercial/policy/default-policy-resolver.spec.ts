/**
 * default-policy-resolver.spec.ts
 *
 * Unit tests for DefaultPolicyResolver package resolution, policy bundle
 * generation, deterministic version resolution, and error paths.
 */
import { Test, type TestingModule } from '@nestjs/testing';
import { UnprocessableEntityException } from '@nestjs/common';
import { EventEmitter2 }               from '@nestjs/event-emitter';
import { DefaultPolicyResolver }       from './default-policy-resolver';
import {
  CommercialRuleRepository,
  CommercialRuleVersionRepository,
  FeatureFlagRepository,
  GatewayDefinitionRepository,
  PackageVersionRepository,
  PaymentOwnershipPolicyRepository,
  PricingModelRepository,
  RevenueDistributionPolicyRepository,
} from '../commercial.repositories';
import { CommercialEvents }            from '../events/commercial.events';
import { TransactionType }             from '../enums/commercial.enums';
import { ENTITLEMENT_RESOLVER }        from '../interfaces/entitlement-resolver.interfaces';
import type { CommercialDecisionContext } from '../interfaces/commercial-decision.interfaces';



// ── Test fixtures ─────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-aaa';

const PLAN = {
  id:               'plan-001',
  tenantId:         TENANT_ID,
  packageId:        'pkg-001',
  tierKey:          'starter-v1',
  featureOverrides: { advancedReports: true },
  limitOverrides:   { maxCourts: 50 },
  isActive:         true,
  isDeleted:        false,
  createdAt:        new Date('2025-01-01'),
  updatedAt:        new Date('2025-01-01'),
  deletedAt:        null,
};

const PACKAGE = {
  id:                    'pkg-001',
  slug:                  'starter',
  tierKey:               'starter',
  status:                'active' as const,
  name:                  'Starter',
  description:           null,
  priceMonthlyMinorUnits: 2900,
  priceAnnualMinorUnits:  29000,
  currency:              'GBP',
  trialDays:             14,
  features:              { booking: true, advancedReports: false },
  limits:                { maxCourts: 10, maxBookings: 500 },
  highlightFeatures:     null,
  badgeText:             null,
  isHighlighted:         false,
  sortOrder:             1,
  metadata:              null,
  publishedAt:           new Date('2025-01-01'),
  deprecatedAt:          null,
  isDeleted:             false,
  createdAt:             new Date('2025-01-01'),
  updatedAt:             new Date('2025-01-01'),
  deletedAt:             null,
};

const PACKAGE_VERSION = {
  id:         'pkgv-001',
  packageId:  'pkg-001',
  version:    'starter-v1',
  features:   { booking: true },
  limits:     { maxCourts: 10 },
  prices:     { monthly: 2900 },
  changelog:  null,
  createdById: null,
  createdAt:  new Date('2025-01-01'),
};

function baseContext(): CommercialDecisionContext {
  return {
    tenantId:        TENANT_ID,
    moduleId:        'booking',
    productId:       'sku-court',
    transactionType: TransactionType.BOOKING,
    amountMinor:     5000,
    currency:        'GBP',
    country:         'GB',
    metadata:        {},
    actorId:         null,
    requestedAt:     new Date('2025-06-01T10:00:00Z'),
  };
}

// ── Mock factories ────────────────────────────────────────────────────────────

function makeMocks() {
  return {
    planService: {
      findForTenant: jest.fn().mockResolvedValue(PLAN),
    },
    packageService: {
      findOne: jest.fn().mockResolvedValue(PACKAGE),
    },
    packageVersionRepo: {
      findByPackageAndVersion: jest.fn().mockResolvedValue(PACKAGE_VERSION),
    },
    ruleRepo:         { findActiveByTenant: jest.fn().mockResolvedValue([]) },
    ruleVersionRepo:  { findByRuleAndVersion: jest.fn().mockResolvedValue(null) },
    ownershipRepo:    { findByTenant: jest.fn().mockResolvedValue([]) },
    distributionRepo: { findByTenant: jest.fn().mockResolvedValue([]) },
    pricingModelRepo: { findByTenant: jest.fn().mockResolvedValue([]) },
    gatewayDefRepo:   { findAll: jest.fn().mockResolvedValue([]) },
    featureFlagRepo:  { findByTenant: jest.fn().mockResolvedValue([]) },
    entitlementResolver: {
      resolve: jest.fn().mockReturnValue({
        packageVersion:      PACKAGE_VERSION,
        enabledFeatures:     PACKAGE_VERSION.features,
        limits:              {},
        featureFlags:        [],
        effectivePermissions: PACKAGE_VERSION.features,
        tenantId:            'plan-001',
        tierKey:             'starter-v1',
        resolvedAt:          new Date(),
      }),
    },
    eventEmitter:     { emitAsync: jest.fn().mockResolvedValue(undefined) },
  };
}

async function buildResolver(mocks: ReturnType<typeof makeMocks>) {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      DefaultPolicyResolver,
      { provide: 'PlanService',    useValue: mocks.planService },
      { provide: 'PackageService', useValue: mocks.packageService },
      { provide: PackageVersionRepository,            useValue: mocks.packageVersionRepo },
      { provide: CommercialRuleRepository,            useValue: mocks.ruleRepo },
      { provide: CommercialRuleVersionRepository,     useValue: mocks.ruleVersionRepo },
      { provide: PaymentOwnershipPolicyRepository,    useValue: mocks.ownershipRepo },
      { provide: RevenueDistributionPolicyRepository, useValue: mocks.distributionRepo },
      { provide: PricingModelRepository,              useValue: mocks.pricingModelRepo },
      { provide: GatewayDefinitionRepository,         useValue: mocks.gatewayDefRepo },
      { provide: FeatureFlagRepository,               useValue: mocks.featureFlagRepo },
      { provide: ENTITLEMENT_RESOLVER,                useValue: mocks.entitlementResolver },
      { provide: EventEmitter2,                       useValue: mocks.eventEmitter },
    ],
  }).compile();
  return module.get(DefaultPolicyResolver);
}

// =============================================================================
// Tests
// =============================================================================

describe('DefaultPolicyResolver', () => {

  // ── Happy path ──────────────────────────────────────────────────────────

  describe('resolve() — happy path', () => {
    it('returns a bundle with a resolved packageAssignment', async () => {
      const mocks  = makeMocks();
      const svc    = await buildResolver(mocks);
      const bundle = await svc.resolve(baseContext());

      expect(bundle.packageAssignment).not.toBeNull();
      expect(bundle.packageAssignment!.packageId).toBe('pkg-001');
      expect(bundle.packageAssignment!.tierKey).toBe('starter-v1');
      expect(bundle.packageAssignment!.isEligible).toBe(true);
    });

    it('merges featureOverrides on top of package features', async () => {
      const mocks  = makeMocks();
      const svc    = await buildResolver(mocks);
      const bundle = await svc.resolve(baseContext());

      // Package has advancedReports=false; plan overrides to true
      expect(bundle.packageAssignment!.effectiveFeatures['advancedReports']).toBe(true);
      // Package has booking=true; no override
      expect(bundle.packageAssignment!.effectiveFeatures['booking']).toBe(true);
    });

    it('merges limitOverrides on top of package limits', async () => {
      const mocks  = makeMocks();
      const svc    = await buildResolver(mocks);
      const bundle = await svc.resolve(baseContext());

      // Package has maxCourts=10; plan overrides to 50
      expect(bundle.packageAssignment!.effectiveLimits['maxCourts']).toBe(50);
    });

    it('sets packageVersion and packageSlug convenience aliases', async () => {
      const mocks  = makeMocks();
      const svc    = await buildResolver(mocks);
      const bundle = await svc.resolve(baseContext());

      expect(bundle.packageVersion?.id).toBe('pkgv-001');
      expect(bundle.packageSlug).toBe('starter');
    });

    it('emits PACKAGE_RESOLVED and POLICY_RESOLVED events', async () => {
      const mocks  = makeMocks();
      const svc    = await buildResolver(mocks);
      await svc.resolve(baseContext());

      const events = mocks.eventEmitter.emitAsync.mock.calls.map((c: unknown[]) => c[0]);
      expect(events).toContain(CommercialEvents.PACKAGE_RESOLVED);
      expect(events).toContain(CommercialEvents.POLICY_RESOLVED);
    });

    it('records resolvedAt timestamp in the bundle', async () => {
      const before = new Date();
      const mocks  = makeMocks();
      const svc    = await buildResolver(mocks);
      const bundle = await svc.resolve(baseContext());
      const after  = new Date();

      expect(bundle.resolvedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(bundle.resolvedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  // ── Deterministic version resolution ────────────────────────────────────

  describe('Deterministic version resolution', () => {
    it('looks up version via plan.tierKey — not by sort/latest', async () => {
      const mocks = makeMocks();
      const svc   = await buildResolver(mocks);
      await svc.resolve(baseContext());

      // Must call findByPackageAndVersion with the EXACT tierKey
      expect(mocks.packageVersionRepo.findByPackageAndVersion).toHaveBeenCalledWith(
        'pkg-001',
        'starter-v1',   // plan.tierKey
      );
      // Must NOT call findByPackage (which would be "latest" lookup)
      expect(mocks.packageVersionRepo.findByPackageAndVersion).toHaveBeenCalledTimes(1);
    });

    it('uses PlanService not findAll — deterministic tenant assignment', async () => {
      const mocks = makeMocks();
      const svc   = await buildResolver(mocks);
      await svc.resolve(baseContext());

      expect(mocks.planService.findForTenant).toHaveBeenCalledWith(TENANT_ID);
      expect(mocks.planService.findForTenant).toHaveBeenCalledTimes(1);
    });

    it('resolves the same version on repeated calls (deterministic replay)', async () => {
      const mocks  = makeMocks();
      const svc    = await buildResolver(mocks);
      const bundleA = await svc.resolve(baseContext());
      const bundleB = await svc.resolve(baseContext());

      expect(bundleA.packageVersion?.id).toBe(bundleB.packageVersion?.id);
      expect(bundleA.packageAssignment?.tierKey).toBe(bundleB.packageAssignment?.tierKey);
    });
  });

  // ── Error paths ──────────────────────────────────────────────────────────

  describe('Error paths — no plan', () => {
    it('returns null packageAssignment when tenant has no plan', async () => {
      const mocks = makeMocks();
      mocks.planService.findForTenant.mockResolvedValue(null);
      const svc = await buildResolver(mocks);

      // Resolver returns null assignment but does not throw (outcome → DENIED by caller)
      const bundle = await svc.resolve(baseContext());
      expect(bundle.packageAssignment).toBeNull();
      expect(bundle.packageVersion).toBeNull();
    });

    it('emits PACKAGE_RESOLUTION_FAILED with reason=NO_PLAN', async () => {
      const mocks = makeMocks();
      mocks.planService.findForTenant.mockResolvedValue(null);
      const svc = await buildResolver(mocks);

      await svc.resolve(baseContext());

      const failCall = mocks.eventEmitter.emitAsync.mock.calls.find(
        (c: unknown[]) => c[0] === CommercialEvents.PACKAGE_RESOLUTION_FAILED,
      );
      expect(failCall).toBeDefined();
      expect(failCall![1]).toMatchObject({ reason: 'NO_PLAN' });
    });
  });

  describe('Error paths — inactive package', () => {
    it('throws when package status is "archived"', async () => {
      const mocks = makeMocks();
      mocks.packageService.findOne.mockResolvedValue({ ...PACKAGE, status: 'archived' });
      const svc = await buildResolver(mocks);

      await expect(svc.resolve(baseContext())).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws when package status is "draft"', async () => {
      const mocks = makeMocks();
      mocks.packageService.findOne.mockResolvedValue({ ...PACKAGE, status: 'draft' });
      const svc = await buildResolver(mocks);

      await expect(svc.resolve(baseContext())).rejects.toThrow(UnprocessableEntityException);
    });

    it('allows "deprecated" packages (existing subscribers continue)', async () => {
      const mocks = makeMocks();
      mocks.packageService.findOne.mockResolvedValue({ ...PACKAGE, status: 'deprecated' });
      const svc = await buildResolver(mocks);

      const bundle = await svc.resolve(baseContext());
      expect(bundle.packageAssignment?.isEligible).toBe(true);
      expect(bundle.packageAssignment?.packageStatus).toBe('deprecated');
    });

    it('emits PACKAGE_RESOLUTION_FAILED with reason=PACKAGE_INELIGIBLE on archived', async () => {
      const mocks = makeMocks();
      mocks.packageService.findOne.mockResolvedValue({ ...PACKAGE, status: 'archived' });
      const svc = await buildResolver(mocks);

      try { await svc.resolve(baseContext()); } catch { /* expected */ }

      const failCall = mocks.eventEmitter.emitAsync.mock.calls.find(
        (c: unknown[]) => c[0] === CommercialEvents.PACKAGE_RESOLUTION_FAILED,
      );
      expect(failCall![1]).toMatchObject({ reason: 'PACKAGE_INELIGIBLE' });
    });
  });

  describe('Error paths — missing version', () => {
    it('throws when no PackageVersion exists for the tierKey', async () => {
      const mocks = makeMocks();
      mocks.packageVersionRepo.findByPackageAndVersion.mockResolvedValue(null);
      const svc = await buildResolver(mocks);

      await expect(svc.resolve(baseContext())).rejects.toThrow(UnprocessableEntityException);
    });

    it('emits PACKAGE_RESOLUTION_FAILED with reason=VERSION_MISSING', async () => {
      const mocks = makeMocks();
      mocks.packageVersionRepo.findByPackageAndVersion.mockResolvedValue(null);
      const svc = await buildResolver(mocks);

      try { await svc.resolve(baseContext()); } catch { /* expected */ }

      const failCall = mocks.eventEmitter.emitAsync.mock.calls.find(
        (c: unknown[]) => c[0] === CommercialEvents.PACKAGE_RESOLUTION_FAILED,
      );
      expect(failCall![1]).toMatchObject({ reason: 'VERSION_MISSING' });
    });

    it('does not call findByPackage or any list-version method', async () => {
      const mocks = makeMocks();
      mocks.packageVersionRepo.findByPackageAndVersion.mockResolvedValue(null);
      const svc = await buildResolver(mocks);

      try { await svc.resolve(baseContext()); } catch { /* expected */ }

      // findByPackage is not even called — the resolver uses only findByPackageAndVersion
      const repoKeys = Object.keys(mocks.packageVersionRepo);
      const calledKeys = repoKeys.filter((k) => (mocks.packageVersionRepo as any)[k].mock?.calls?.length > 0);
      expect(calledKeys).toEqual(['findByPackageAndVersion']);
    });
  });

  // ── Policy bundle contents ───────────────────────────────────────────────

  describe('Policy bundle', () => {
    it('falls back to platform policies when no tenant ownership policy exists', async () => {
      const platformPolicy = { id: 'pp-001', tenantId: null, ownershipType: 'PLATFORM' };
      const mocks = makeMocks();
      // First call (tenant) returns []; second call (platform) returns [platformPolicy]
      mocks.ownershipRepo.findByTenant
        .mockResolvedValueOnce([])      // tenant → empty
        .mockResolvedValueOnce([platformPolicy]);  // platform → policy
      const svc = await buildResolver(mocks);
      const bundle = await svc.resolve(baseContext());

      expect(bundle.ownershipPolicies).toHaveLength(1);
      expect(bundle.ownershipPolicies[0]).toMatchObject({ id: 'pp-001' });
    });

    it('merges platform and tenant feature flags (tenant shadows platform)', async () => {
      const platformFlag = { id: 'f1', tenantId: null,   key: 'advancedReports', status: 'DISABLED' };
      const tenantFlag   = { id: 'f2', tenantId: TENANT_ID, key: 'advancedReports', status: 'ENABLED' };
      const otherFlag    = { id: 'f3', tenantId: null,   key: 'tournaments',     status: 'ENABLED' };
      const mocks = makeMocks();
      mocks.featureFlagRepo.findByTenant
        .mockResolvedValueOnce([platformFlag, otherFlag])  // platform
        .mockResolvedValueOnce([tenantFlag]);               // tenant
      const svc = await buildResolver(mocks);
      const bundle = await svc.resolve(baseContext());

      // tenant flag shadows platform flag for same key
      const reports = bundle.featureFlags.find((f) => f.key === 'advancedReports');
      expect(reports?.id).toBe('f2');        // tenant wins
      expect(bundle.featureFlags).toHaveLength(2);   // deduped: advancedReports + tournaments
    });

    it('emits POLICY_RESOLUTION_FAILED when policy resolution throws', async () => {
      const mocks = makeMocks();
      mocks.gatewayDefRepo.findAll.mockRejectedValue(new Error('DB down'));
      const svc = await buildResolver(mocks);

      await expect(svc.resolve(baseContext())).rejects.toThrow('DB down');

      const events = mocks.eventEmitter.emitAsync.mock.calls.map((c: unknown[]) => c[0]);
      expect(events).toContain(CommercialEvents.POLICY_RESOLUTION_FAILED);
    });
  });
});
