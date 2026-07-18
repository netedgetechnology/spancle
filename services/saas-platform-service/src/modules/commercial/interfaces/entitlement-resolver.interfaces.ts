/**
 * entitlement-resolver.interfaces.ts
 *
 * Contract for the Entitlement Engine that provides immutable runtime
 * feature access based on the tenant's assigned PackageVersion.
 *
 * Principle: runtime entitlement evaluation reads ONLY from the immutable
 * PackageVersionEntity. It never reads from the mutable PackageEntity.
 * Plan feature/limit overrides are applied once at resolution time and
 * stored in the EntitlementBundle — not re-read from the database.
 *
 * Sources of truth (precedence order, highest first):
 *   1. PlanEntity.featureOverrides / limitOverrides  (tenant-specific agreements)
 *   2. PackageVersionEntity.features / limits        (immutable version snapshot)
 *   3. FeatureFlagEntity.status                      (runtime toggles, highest precedence for flags)
 */
import type { PackageVersionEntity } from '../entities/commercial-snapshot-and-package.entity';
import type { FeatureFlagEntity }    from '../entities/commercial-policy-gateway-flag-audit.entity';
import type { PackageAssignment }    from '../policy/package-assignment.model';

// ── EntitlementBundle ─────────────────────────────────────────────────────────

/**
 * Immutable, pre-computed entitlement bundle for a tenant.
 *
 * Produced once per commercial decision evaluation; never mutated after creation.
 * All query methods on this bundle read from its fields — no further DB access.
 */
export interface EntitlementBundle {
  /**
   * The immutable PackageVersion this bundle was derived from.
   * All feature and limit values originate from this record.
   */
  packageVersion: Readonly<PackageVersionEntity>;

  /**
   * Effective feature flags after merging:
   *   PackageVersionEntity.features + PlanEntity.featureOverrides
   *
   * True = feature enabled for this tenant.
   * False = feature disabled.
   * Keys match PlanFeatureFlags from plan-limits.constants.ts.
   */
  enabledFeatures: Readonly<Record<string, boolean>>;

  /**
   * Effective resource limits after merging:
   *   PackageVersionEntity.limits + PlanEntity.limitOverrides
   *
   * -1 = unlimited (Enterprise tier).
   * Keys match PlanResourceLimits from plan-limits.constants.ts.
   */
  limits: Readonly<Record<string, number>>;

  /**
   * Runtime feature flags from FeatureFlagEntity (merged platform + tenant).
   * These are runtime toggles that can override package-level features.
   * A flag with status=ENABLED that is not in enabledFeatures is treated as enabled.
   * A flag with status=DISABLED overrides even a package-enabled feature.
   */
  featureFlags: ReadonlyArray<Readonly<FeatureFlagEntity>>;

  /**
   * Effective permissions: union of package features + active runtime flags.
   * Maps featureKey → boolean. This is the authoritative final answer for
   * whether a given capability is permitted for this tenant.
   *
   * Computed once at bundle creation. Reads are O(1) Map lookups.
   */
  effectivePermissions: Readonly<Record<string, boolean>>;

  /** Tenant this bundle was resolved for. */
  tenantId: string;

  /** Tier key of the plan, e.g. "starter-v1". */
  tierKey: string;

  /** Wall-clock timestamp of resolution. */
  resolvedAt: Date;
}

// ── IEntitlementResolver ──────────────────────────────────────────────────────

/**
 * Service contract for the Entitlement Engine.
 *
 * Produces an EntitlementBundle from a resolved PackageAssignment and
 * the current FeatureFlag state. The bundle exposes query methods
 * (hasFeature, getLimit, isEnabled) that operate purely on in-memory
 * data — no database access after resolution.
 *
 * Emits:
 *   CommercialEvents.ENTITLEMENTS_RESOLVED        on success
 *   CommercialEvents.ENTITLEMENT_RESOLUTION_FAILED on error
 *
 * Constraints:
 *   - MUST NOT read from PackageEntity (mutable) after bundle creation.
 *   - MUST read features/limits exclusively from PackageVersionEntity.
 *   - Plan overrides (featureOverrides, limitOverrides) are applied via
 *     the pre-computed PackageAssignment.effectiveFeatures/.effectiveLimits.
 *   - GRADUAL flags use a conservative false (no runtime hash in v1).
 *   - RuntimeFlag DISABLED overrides package-level true (flag wins).
 *   - RuntimeFlag ENABLED grants access even if package-level false.
 */
export interface IEntitlementResolver {
  /**
   * Resolves an EntitlementBundle for the given package assignment and flags.
   * The bundle is produced once and passed read-only through the pipeline.
   */
  resolve(
    packageAssignment: PackageAssignment,
    featureFlags:      ReadonlyArray<Readonly<FeatureFlagEntity>>,
  ): EntitlementBundle;

  /**
   * Returns true when the tenant is entitled to `featureKey`.
   * Checks effectivePermissions (O(1)).
   */
  hasFeature(bundle: EntitlementBundle, featureKey: string): boolean;

  /**
   * Returns the effective numeric limit for `limitKey`.
   * Returns 0 when the key is absent (conservative — deny by absence).
   * Returns -1 when the limit is explicitly unlimited.
   */
  getLimit(bundle: EntitlementBundle, limitKey: string): number;

  /**
   * Returns true when the feature flag `featureKey` is effectively ENABLED.
   * Precedence:
   *   1. FeatureFlagEntity with matching key and status=ENABLED  → true
   *   2. FeatureFlagEntity with matching key and status=DISABLED → false
   *   3. FeatureFlagEntity with matching key and status=GRADUAL  → false (v1 conservative)
   *   4. No matching flag → falls back to hasFeature(bundle, featureKey)
   */
  isEnabled(bundle: EntitlementBundle, featureKey: string): boolean;
}

export const ENTITLEMENT_RESOLVER = Symbol('IEntitlementResolver');
