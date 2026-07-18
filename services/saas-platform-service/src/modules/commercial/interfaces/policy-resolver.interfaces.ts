/**
 * policy-resolver.interfaces.ts
 *
 * Contract for the Policy Resolution layer that sits between the
 * Commercial Decision Framework and the data layer.
 *
 * CommercialDecisionService depends only on IPolicyResolver — never
 * on individual repositories.
 */
import type { CommercialRuleVersionEntity }  from '../entities/commercial-rule-version.entity';
import type {
  PackageVersionEntity,
}                                             from '../entities/commercial-snapshot-and-package.entity';
import type {
  PricingModelEntity,
}                                             from '../entities/commercial-product-module-pricing.entity';
import type {
  FeatureFlagEntity,
  GatewayDefinitionEntity,
  PaymentOwnershipPolicyEntity,
  RevenueDistributionPolicyEntity,
}                                             from '../entities/commercial-policy-gateway-flag-audit.entity';
import type { CommercialDecisionContext }     from './commercial-decision.interfaces';
import type { PackageAssignment }            from '../policy/package-assignment.model';
import type { EntitlementBundle }            from './entitlement-resolver.interfaces';
import type { RuleBundle }                   from './rule-resolver.interfaces';

// ── ResolvedPolicyBundle ──────────────────────────────────────────────────────

/**
 * The complete, immutable bundle of resolved policies and references
 * for a single commercial decision context.
 *
 * Immutability contract:
 *   - All version references carry explicit version strings, never "latest".
 *   - The bundle is produced once per evaluation and passed read-only
 *     through the pipeline.
 *   - Callers must not mutate bundle properties.
 *
 * All monetary values referenced via entity fields are INT minor units.
 */
export interface ResolvedPolicyBundle {
  /**
   * The resolved, typed rule bundle — deterministically ordered evaluation results.
   * Null when no active rules exist for this tenant.
   */
  ruleBundle: Readonly<RuleBundle> | null;

  /**
   * The resolved entitlement bundle — pre-computed feature access and limits.
   * Null when packageAssignment is null (tenant has no plan).
   * Use this for hasFeature / getLimit / isEnabled queries.
   */
  entitlementBundle: Readonly<EntitlementBundle> | null;

  /**
   * The complete, validated package assignment for this tenant.
   * Includes planId, packageId, tierKey, and the resolved PackageVersion.
   * Null when the tenant has no active plan.
   */
  packageAssignment: Readonly<PackageAssignment> | null;

  /**
   * The tenant's assigned package version — explicit semver string.
   * Derived from packageAssignment.packageVersion for convenience.
   * Never the "latest" published version.
   */
  packageVersion: Readonly<PackageVersionEntity> | null;

  /**
   * Package definition slug (e.g. "starter", "pro").
   * Preserved for snapshot readback — avoids the "unknown" placeholder.
   */
  packageSlug: string | null;

  /**
   * The active CommercialRule versions applicable to this decision,
   * resolved by type and tenant context.
   * Each entry carries an explicit version string.
   */
  ruleVersions: ReadonlyArray<Readonly<CommercialRuleVersionEntity>>;

  /**
   * Ownership policy: who holds the merchant account.
   * Tenant-scoped first; falls back to platform-default.
   */
  ownershipPolicies: ReadonlyArray<Readonly<PaymentOwnershipPolicyEntity>>;

  /**
   * Revenue distribution policy: how revenue is split.
   * Tenant-scoped first; falls back to platform-default.
   */
  distributionPolicies: ReadonlyArray<Readonly<RevenueDistributionPolicyEntity>>;

  /**
   * Pricing models applicable to this decision.
   * Tenant-scoped first; falls back to platform-default.
   * Contents are not evaluated in this batch.
   */
  pricingModels: ReadonlyArray<Readonly<PricingModelEntity>>;

  /**
   * Gateway definitions available to the tenant (reference only).
   * No SDK calls. No credentials. Structural information only.
   */
  gatewayDefinitions: ReadonlyArray<Readonly<GatewayDefinitionEntity>>;

  /**
   * Feature flags applicable to the tenant at resolution time.
   * Merged: tenant-scoped overrides platform-wide flags.
   */
  featureFlags: ReadonlyArray<Readonly<FeatureFlagEntity>>;

  /**
   * Wall-clock time this bundle was resolved.
   * Recorded in the snapshot for audit.
   */
  resolvedAt: Date;
}

// ── IPolicyResolver ───────────────────────────────────────────────────────────

/**
 * Policy resolution service contract.
 *
 * Implementations:
 *   - DefaultPolicyResolver: production — reads from repositories.
 *   - Can be mocked in tests without any database dependency.
 *
 * Resolution rules:
 *   1. Package version is resolved via the tenant's active plan (tierKey).
 *      Never from a "find latest" query.
 *   2. When no plan is assigned, packageVersion = null.
 *   3. All version references are immutable explicit strings, not pointers
 *      to the current head of a mutable version sequence.
 *   4. Tenant-scoped policies shadow platform-wide policies.
 *   5. Gateway definitions are referenced structurally — no credentials loaded.
 *
 * Emits:
 *   CommercialEvents.POLICY_RESOLVED   — on success
 *   CommercialEvents.POLICY_RESOLUTION_FAILED — on unrecoverable error
 */
export interface IPolicyResolver {
  resolve(context: CommercialDecisionContext): Promise<ResolvedPolicyBundle>;
}

export const POLICY_RESOLVER = Symbol('IPolicyResolver');
