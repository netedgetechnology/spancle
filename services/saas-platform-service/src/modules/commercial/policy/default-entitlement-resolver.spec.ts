/**
 * default-entitlement-resolver.spec.ts
 *
 * Unit tests for DefaultEntitlementResolver — feature resolution, limit
 * resolution, flag precedence, version immutability, and no-mutable-entity constraint.
 */
import { Test, type TestingModule } from '@nestjs/testing';
import { UnprocessableEntityException } from '@nestjs/common';
import { EventEmitter2 }                from '@nestjs/event-emitter';
import { DefaultEntitlementResolver }   from './default-entitlement-resolver';
import { FeatureFlagStatus }            from '../enums/commercial.enums';
import { ENTITLEMENT_RESOLVER }         from '../interfaces/entitlement-resolver.interfaces';
import type { PackageAssignment }       from './package-assignment.model';
import type { FeatureFlagEntity }       from '../entities/commercial-policy-gateway-flag-audit.entity';
import type { PackageVersionEntity }    from '../entities/commercial-snapshot-and-package.entity';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PACKAGE_VERSION: PackageVersionEntity = {
  id:          'pkgv-001',
  packageId:   'pkg-001',
  version:     'starter-v1',
  features:    {
    booking:          true,
    advancedAnalytics: false,
    apiAccess:         false,
    customBranding:    false,
  },
  limits: {
    maxCourts:    10,
    maxUsers:     25,
    maxStorageGb: 5,
  },
  prices:      { monthly: 2900 },
  changelog:   null,
  createdById: null,
  createdAt:   new Date('2025-01-01'),
};

const PLAN_ASSIGNMENT: PackageAssignment = {
  planId:           'plan-001',
  packageId:        'pkg-001',
  packageSlug:      'starter',
  tierKey:          'starter-v1',
  packageVersion:   PACKAGE_VERSION,
  packageStatus:    'active',
  isEligible:       true,
  effectiveFeatures: {
    booking:          true,
    advancedAnalytics: false,
    apiAccess:         false,
    customBranding:    true,   // plan override — package has false
  },
  effectiveLimits: {
    maxCourts:    50,           // plan override — package has 10
    maxUsers:     25,
    maxStorageGb: 5,
  },
  resolvedAt: new Date('2025-06-01T10:00:00Z'),
};

function flag(
  key: string,
  status: FeatureFlagStatus,
  tenantId: string | null = null,
): FeatureFlagEntity {
  return {
    id:                `flag-${key}`,
    tenantId,
    key,
    status,
    rolloutPercentage: status === FeatureFlagStatus.GRADUAL ? 50 : 0,
    description:       null,
    metadata:          {},
    updatedById:       null,
    createdAt:         new Date(),
    updatedAt:         new Date(),
  };
}

async function buildResolver() {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      DefaultEntitlementResolver,
      { provide: EventEmitter2, useValue: { emitAsync: jest.fn().mockResolvedValue(undefined) } },
    ],
  }).compile();
  return module.get(DefaultEntitlementResolver);
}

// =============================================================================
// Tests
// =============================================================================

describe('DefaultEntitlementResolver', () => {

  // ── Happy path ──────────────────────────────────────────────────────────

  describe('resolve() — bundle creation', () => {
    it('produces a bundle with packageVersion set to the immutable entity', async () => {
      const svc    = await buildResolver();
      const bundle = svc.resolve(PLAN_ASSIGNMENT, []);

      expect(bundle.packageVersion).toBe(PACKAGE_VERSION);  // same reference
    });

    it('effectivePermissions includes PackageVersion features', async () => {
      const svc    = await buildResolver();
      const bundle = svc.resolve(PLAN_ASSIGNMENT, []);

      expect(bundle.effectivePermissions['booking']).toBe(true);
      expect(bundle.effectivePermissions['advancedAnalytics']).toBe(false);
    });

    it('plan featureOverrides are applied on top of PackageVersion features', async () => {
      const svc    = await buildResolver();
      const bundle = svc.resolve(PLAN_ASSIGNMENT, []);

      // Package has customBranding=false; plan overrides to true
      expect(bundle.effectivePermissions['customBranding']).toBe(true);
    });

    it('limits include PackageVersion limits merged with plan overrides', async () => {
      const svc    = await buildResolver();
      const bundle = svc.resolve(PLAN_ASSIGNMENT, []);

      expect(bundle.limits['maxCourts']).toBe(50);    // plan override wins
      expect(bundle.limits['maxUsers']).toBe(25);     // same in package + plan
    });
  });

  // ── hasFeature ──────────────────────────────────────────────────────────

  describe('hasFeature()', () => {
    it('returns true for an enabled package feature', async () => {
      const svc    = await buildResolver();
      const bundle = svc.resolve(PLAN_ASSIGNMENT, []);
      expect(svc.hasFeature(bundle, 'booking')).toBe(true);
    });

    it('returns false for a disabled package feature', async () => {
      const svc    = await buildResolver();
      const bundle = svc.resolve(PLAN_ASSIGNMENT, []);
      expect(svc.hasFeature(bundle, 'advancedAnalytics')).toBe(false);
    });

    it('returns false when featureKey is absent from effectivePermissions', async () => {
      const svc    = await buildResolver();
      const bundle = svc.resolve(PLAN_ASSIGNMENT, []);
      expect(svc.hasFeature(bundle, 'nonExistentFeature')).toBe(false);
    });

    it('reflects plan override — customBranding enabled via override', async () => {
      const svc    = await buildResolver();
      const bundle = svc.resolve(PLAN_ASSIGNMENT, []);
      expect(svc.hasFeature(bundle, 'customBranding')).toBe(true);
    });
  });

  // ── getLimit ────────────────────────────────────────────────────────────

  describe('getLimit()', () => {
    it('returns the effective limit value', async () => {
      const svc    = await buildResolver();
      const bundle = svc.resolve(PLAN_ASSIGNMENT, []);
      expect(svc.getLimit(bundle, 'maxCourts')).toBe(50);
    });

    it('returns 0 when limitKey is absent (conservative deny)', async () => {
      const svc    = await buildResolver();
      const bundle = svc.resolve(PLAN_ASSIGNMENT, []);
      expect(svc.getLimit(bundle, 'nonExistentLimit')).toBe(0);
    });

    it('returns -1 for unlimited limits', async () => {
      const unlimitedAssignment: PackageAssignment = {
        ...PLAN_ASSIGNMENT,
        packageVersion: { ...PACKAGE_VERSION, limits: { maxCourts: -1 } },
        effectiveLimits: { maxCourts: -1 },
      };
      const svc    = await buildResolver();
      const bundle = svc.resolve(unlimitedAssignment, []);
      expect(svc.getLimit(bundle, 'maxCourts')).toBe(-1);
    });
  });

  // ── isEnabled / feature flags ────────────────────────────────────────────

  describe('isEnabled() — FeatureFlag precedence', () => {
    it('ENABLED flag grants access even if package feature is false', async () => {
      const svc    = await buildResolver();
      const flags  = [flag('advancedAnalytics', FeatureFlagStatus.ENABLED)];
      const bundle = svc.resolve(PLAN_ASSIGNMENT, flags);

      expect(svc.isEnabled(bundle, 'advancedAnalytics')).toBe(true);
      expect(bundle.effectivePermissions['advancedAnalytics']).toBe(true);
    });

    it('DISABLED flag denies access even if package feature is true', async () => {
      const svc    = await buildResolver();
      const flags  = [flag('booking', FeatureFlagStatus.DISABLED)];
      const bundle = svc.resolve(PLAN_ASSIGNMENT, flags);

      expect(svc.isEnabled(bundle, 'booking')).toBe(false);
      expect(bundle.effectivePermissions['booking']).toBe(false);
    });

    it('GRADUAL flag returns false conservatively (v1)', async () => {
      const svc    = await buildResolver();
      const flags  = [flag('apiAccess', FeatureFlagStatus.GRADUAL)];
      const bundle = svc.resolve(PLAN_ASSIGNMENT, flags);

      expect(svc.isEnabled(bundle, 'apiAccess')).toBe(false);
      expect(bundle.effectivePermissions['apiAccess']).toBe(false);
    });

    it('falls back to hasFeature when no flag matches the key', async () => {
      const svc    = await buildResolver();
      const bundle = svc.resolve(PLAN_ASSIGNMENT, []);

      // booking is true in package, no flag → falls back to package
      expect(svc.isEnabled(bundle, 'booking')).toBe(true);
      // advancedAnalytics is false in package, no flag → false
      expect(svc.isEnabled(bundle, 'advancedAnalytics')).toBe(false);
    });

    it('ENABLED flag for unknown feature creates new permission', async () => {
      const svc    = await buildResolver();
      const flags  = [flag('brandNewFeature', FeatureFlagStatus.ENABLED)];
      const bundle = svc.resolve(PLAN_ASSIGNMENT, flags);

      expect(svc.isEnabled(bundle, 'brandNewFeature')).toBe(true);
      expect(svc.hasFeature(bundle, 'brandNewFeature')).toBe(true);
    });
  });

  // ── Version immutability ─────────────────────────────────────────────────

  describe('Version immutability', () => {
    it('two resolutions with same PackageVersion produce same base permissions', async () => {
      const svc    = await buildResolver();
      const bundleA = svc.resolve(PLAN_ASSIGNMENT, []);
      const bundleB = svc.resolve(PLAN_ASSIGNMENT, []);

      expect(bundleA.effectivePermissions).toEqual(bundleB.effectivePermissions);
      expect(bundleA.packageVersion.id).toBe(bundleB.packageVersion.id);
    });

    it('the bundle packageVersion reference is the same object passed in (no copy)', async () => {
      const svc    = await buildResolver();
      const bundle = svc.resolve(PLAN_ASSIGNMENT, []);
      expect(bundle.packageVersion).toBe(PACKAGE_VERSION);
    });

    it('mutating the original features object after resolve does not affect the bundle', async () => {
      const svc    = await buildResolver();
      const bundle = svc.resolve(PLAN_ASSIGNMENT, []);

      // Verify booking=true before mutation
      expect(bundle.effectivePermissions['booking']).toBe(true);

      // The effectivePermissions is a plain object copy — not a live view of pv.features
      // (It was spread with {...pv.features, ...effectiveFeatures})
      // Mutating pv.features should NOT affect the already-built bundle
      (PACKAGE_VERSION.features as Record<string, boolean>)['booking'] = false;
      expect(bundle.effectivePermissions['booking']).toBe(true);   // bundle unaffected

      // Restore
      (PACKAGE_VERSION.features as Record<string, boolean>)['booking'] = true;
    });

    it('throws UnprocessableEntityException when packageVersion is null', async () => {
      const noVersionAssignment: PackageAssignment = {
        ...PLAN_ASSIGNMENT,
        packageVersion: null,
      };
      const svc = await buildResolver();
      expect(() => svc.resolve(noVersionAssignment, [])).toThrow(UnprocessableEntityException);
    });
  });

  // ── No mutable PackageEntity dependency ──────────────────────────────────

  describe('No mutable PackageEntity dependency', () => {
    it('resolver source file does not import PackageEntity or PackageService', () => {
      const fs   = require('fs') as typeof import('fs');
      const path = require('path') as typeof import('path');
      const src  = path.resolve(
        process.cwd(),
        'src/modules/commercial/policy/default-entitlement-resolver.ts',
      );
      const source = fs.readFileSync(src, 'utf8');
      expect(source).not.toMatch(/PackageEntity(?!Version)/);
      expect(source).not.toMatch(/PackageService/);
      expect(source).not.toMatch(/packageService|packageRepo/);
    });

    it('all feature data comes from PackageVersionEntity fields', async () => {
      // The bundle's enabledFeatures contains PackageVersionEntity.features keys
      const svc    = await buildResolver();
      const bundle = svc.resolve(PLAN_ASSIGNMENT, []);

      // All keys in bundle.enabledFeatures originate from pv.features or effectiveFeatures
      const pvKeys = Object.keys(PACKAGE_VERSION.features);
      pvKeys.forEach((k) => {
        expect(k in bundle.enabledFeatures).toBe(true);
      });
    });
  });
});
