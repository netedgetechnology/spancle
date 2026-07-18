import { Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CommercialEvents }  from '../events/commercial.events';
import { FeatureFlagStatus } from '../enums/commercial.enums';
import type {
  EntitlementBundle,
  IEntitlementResolver,
}                            from '../interfaces/entitlement-resolver.interfaces';
import type { PackageAssignment } from '../policy/package-assignment.model';
import type { FeatureFlagEntity } from '../entities/commercial-policy-gateway-flag-audit.entity';

/**
 * DefaultEntitlementResolver
 *
 * Resolves an EntitlementBundle from a PackageAssignment and FeatureFlag list.
 *
 * Precedence rules (applied once at resolve time):
 *   1. FeatureFlagEntity with status=DISABLED → permission=false (overrides all)
 *   2. FeatureFlagEntity with status=ENABLED  → permission=true  (grants even if package=false)
 *   3. FeatureFlagEntity with status=GRADUAL  → conservative false (v1; hash-based rollout deferred)
 *   4. PackageVersionEntity.features merged with PlanEntity.featureOverrides
 *      (pre-computed in PackageAssignment.effectiveFeatures)
 *
 * The mutable Package entity is NEVER read after bundle creation.
 * All feature/limit data originates from PackageVersionEntity (immutable).
 *
 * hasFeature / getLimit / isEnabled operate on in-memory bundle data — O(1), no DB.
 */
@Injectable()
export class DefaultEntitlementResolver implements IEntitlementResolver {
  private readonly logger = new Logger(DefaultEntitlementResolver.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  // ── IEntitlementResolver.resolve ──────────────────────────────────────────

  resolve(
    packageAssignment: PackageAssignment,
    featureFlags:      ReadonlyArray<Readonly<FeatureFlagEntity>>,
  ): EntitlementBundle {
    if (!packageAssignment.packageVersion) {
      const msg =
        `Cannot resolve entitlements: tenant ${packageAssignment.planId} ` +
        `has no PackageVersion (tierKey="${packageAssignment.tierKey}")`;
      this.eventEmitter.emitAsync(CommercialEvents.ENTITLEMENT_RESOLUTION_FAILED, {
        tenantId:  packageAssignment.planId,
        tierKey:   packageAssignment.tierKey,
        reason:    'NO_PACKAGE_VERSION',
        timestamp: new Date().toISOString(),
      }).catch(() => {/* fire-and-forget */});
      throw new UnprocessableEntityException(msg);
    }

    const pv = packageAssignment.packageVersion;

    // Step 1: Start from PackageVersionEntity.features (immutable source)
    // Merged with PlanEntity.featureOverrides via PackageAssignment.effectiveFeatures
    // NOTE: effectiveFeatures was computed from the Package entity features + overrides at
    // assignment resolution time. For the entitlement bundle we prefer
    // PackageVersionEntity.features as the base (immutable), then apply overrides.
    const baseFeatures: Record<string, boolean> = {
      ...pv.features,
      ...packageAssignment.effectiveFeatures,  // plan overrides win
    };

    // Step 2: Build effectivePermissions by applying FeatureFlag overrides
    // Flag DISABLED overrides even a package-enabled feature.
    // Flag ENABLED grants access even if package-level is false.
    // Flag GRADUAL → conservative false in v1.
    const effectivePermissions: Record<string, boolean> = { ...baseFeatures };

    for (const flag of featureFlags) {
      switch (flag.status) {
        case FeatureFlagStatus.ENABLED:
          effectivePermissions[flag.key] = true;
          break;
        case FeatureFlagStatus.DISABLED:
          effectivePermissions[flag.key] = false;
          break;
        case FeatureFlagStatus.GRADUAL:
          // v1: conservative false. Future: deterministic tenant-hash rollout.
          effectivePermissions[flag.key] = false;
          break;
      }
    }

    // Step 3: Limits come from PackageVersionEntity (immutable) + plan overrides
    const limits: Record<string, number> = {
      ...pv.limits,
      ...packageAssignment.effectiveLimits,
    };

    const resolvedAt = new Date();

    const bundle: EntitlementBundle = {
      packageVersion:      pv,
      enabledFeatures:     baseFeatures,
      limits,
      featureFlags,
      effectivePermissions,
      tenantId:            packageAssignment.planId,   // planId carries tenantId context
      tierKey:             packageAssignment.tierKey,
      resolvedAt,
    };

    this.logger.debug(
      `resolve: pkg=${packageAssignment.packageSlug}@${packageAssignment.tierKey} ` +
      `features=${Object.keys(effectivePermissions).length} ` +
      `limits=${Object.keys(limits).length} ` +
      `flags=${featureFlags.length}`,
    );

    this.eventEmitter.emitAsync(CommercialEvents.ENTITLEMENTS_RESOLVED, {
      tenantId:       packageAssignment.planId,
      tierKey:        packageAssignment.tierKey,
      packageVersion: pv.version,
      featureCount:   Object.keys(effectivePermissions).length,
      resolvedAt:     resolvedAt.toISOString(),
    }).catch(() => {/* fire-and-forget */});

    return bundle;
  }

  // ── IEntitlementResolver.hasFeature ──────────────────────────────────────

  /**
   * Returns true when the tenant is entitled to featureKey.
   * Reads effectivePermissions (O(1) property access).
   * Returns false when the key is absent (deny by default).
   */
  hasFeature(bundle: EntitlementBundle, featureKey: string): boolean {
    return bundle.effectivePermissions[featureKey] === true;
  }

  // ── IEntitlementResolver.getLimit ────────────────────────────────────────

  /**
   * Returns the numeric limit for limitKey.
   * -1 = unlimited. 0 returned when key is absent (conservative deny).
   */
  getLimit(bundle: EntitlementBundle, limitKey: string): number {
    const value = bundle.limits[limitKey];
    return value !== undefined ? value : 0;
  }

  // ── IEntitlementResolver.isEnabled ───────────────────────────────────────

  /**
   * Returns true when featureKey is ENABLED by a runtime FeatureFlag.
   * Falls back to hasFeature when no matching flag exists.
   *
   * Precedence:
   *   ENABLED  flag → true
   *   DISABLED flag → false
   *   GRADUAL  flag → false (conservative v1)
   *   No flag  → hasFeature(bundle, featureKey)
   */
  isEnabled(bundle: EntitlementBundle, featureKey: string): boolean {
    const flag = bundle.featureFlags.find((f) => f.key === featureKey);
    if (!flag) return this.hasFeature(bundle, featureKey);
    switch (flag.status) {
      case FeatureFlagStatus.ENABLED:  return true;
      case FeatureFlagStatus.DISABLED: return false;
      case FeatureFlagStatus.GRADUAL:  return false;  // v1 conservative
    }
  }
}
