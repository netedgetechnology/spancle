/**
 * package-assignment.model.ts
 *
 * Immutable model representing a tenant's resolved package assignment
 * at a specific point in time.
 *
 * Produced by DefaultPolicyResolver via the resolution chain:
 *   PlanService.findForTenant(tenantId)
 *     → PlanEntity { packageId, tierKey }
 *     → PackageService.findOne(packageId)
 *     → PackageEntity { slug, status, features, limits }
 *     → PackageVersionRepository.findByPackageAndVersion(packageId, tierKey)
 *     → PackageVersionEntity | null
 *
 * Stored verbatim in CommercialDecisionSnapshot.resultPayload for replay.
 */
import type { PackageEntity }  from '../../package/entities/package.entity';
import type { PlanEntity }     from '../../plan/entities/plan.entity';
import type { PackageVersionEntity } from '../entities/commercial-snapshot-and-package.entity';

export interface PackageAssignment {
  /** UUID of the tenant's active PlanEntity */
  planId: string;

  /** UUID of PackageEntity (foreign key: PlanEntity.packageId) */
  packageId: string;

  /**
   * Slug of the PackageEntity — e.g. "starter", "pro".
   * Derived from PackageEntity.slug.
   */
  packageSlug: string;

  /**
   * The tier key matching the plan assignment.
   * This is the version identifier used to resolve PackageVersionEntity.
   * Matches PlanEntity.tierKey AND PackageVersionEntity.version.
   * Example: "starter-v1", "pro-v2"
   */
  tierKey: string;

  /**
   * The immutable version record for this assignment.
   * Null only when no PackageVersion exists for this tierKey.
   * When null, the decision is DENIED (no package version to evaluate against).
   */
  packageVersion: Readonly<PackageVersionEntity> | null;

  /**
   * PackageEntity.status at resolution time.
   * 'active' | 'deprecated' | 'draft' | 'archived'
   * Non-active packages produce a DENIED outcome.
   */
  packageStatus: PackageEntity['status'];

  /**
   * Whether the package is eligible for commercial decisions.
   * true  = status is 'active' or 'deprecated' (existing subscribers continue)
   * false = status is 'draft' or 'archived' (blocked)
   */
  isEligible: boolean;

  /**
   * Merged feature flags: PackageEntity.features + PlanEntity.featureOverrides.
   * The same merge PlanService.getEffectiveLimits() performs.
   */
  effectiveFeatures: Record<string, boolean>;

  /**
   * Merged resource limits: PackageEntity.limits + PlanEntity.limitOverrides.
   */
  effectiveLimits: Record<string, number>;

  /** Wall-clock time this assignment was resolved. */
  resolvedAt: Date;
}

/** Serialisable form for embedding in snapshot resultPayload */
export interface PackageAssignmentSnapshot {
  planId:            string;
  packageId:         string;
  packageSlug:       string;
  tierKey:           string;
  packageVersionId:  string | null;
  packageVersion:    string | null;
  packageStatus:     string;
  isEligible:        boolean;
  effectiveFeatures: Record<string, boolean>;
  effectiveLimits:   Record<string, number>;
  resolvedAt:        string;   // ISO-8601
}

export function toPackageAssignmentSnapshot(
  a: PackageAssignment,
): PackageAssignmentSnapshot {
  return {
    planId:            a.planId,
    packageId:         a.packageId,
    packageSlug:       a.packageSlug,
    tierKey:           a.tierKey,
    packageVersionId:  a.packageVersion?.id ?? null,
    packageVersion:    a.packageVersion?.version ?? null,
    packageStatus:     a.packageStatus,
    isEligible:        a.isEligible,
    effectiveFeatures: a.effectiveFeatures,
    effectiveLimits:   a.effectiveLimits,
    resolvedAt:        a.resolvedAt.toISOString(),
  };
}
