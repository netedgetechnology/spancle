import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 }     from '@nestjs/event-emitter';
import type { PlanService }  from '../../plan/services/plan.service';
import type { PackageService } from '../../package/services/package.service';
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
import { CommercialEvents }  from '../events/commercial.events';
import type { CommercialDecisionContext } from '../interfaces/commercial-decision.interfaces';
import type { IPolicyResolver, ResolvedPolicyBundle } from '../interfaces/policy-resolver.interfaces';
import type { IEntitlementResolver } from '../interfaces/entitlement-resolver.interfaces';
import { ENTITLEMENT_RESOLVER } from '../interfaces/entitlement-resolver.interfaces';
import { Inject } from '@nestjs/common';
import type { PackageAssignment } from './package-assignment.model';

/**
 * DefaultPolicyResolver
 *
 * Implements IPolicyResolver for the production environment.
 *
 * Package resolution chain (deterministic, never "latest"):
 *
 *   1. PlanService.findForTenant(tenantId)
 *        → PlanEntity { id, packageId, tierKey, featureOverrides, limitOverrides }
 *        → Error: DENIED when no plan
 *
 *   2. PackageService.findOne(plan.packageId)
 *        → PackageEntity { slug, status, features, limits }
 *        → Error: DENIED when status ∉ {'active', 'deprecated'}
 *
 *   3. PackageVersionRepository.findByPackageAndVersion(packageId, plan.tierKey)
 *        → PackageVersionEntity pinned by tierKey
 *        → Error: DENIED when no matching version
 *
 * PlanEntity.tierKey is the version pin identifier.
 * The same plan always resolves to the same PackageVersion.
 * No sort-by-date, no findAll(), no versions[0] lookup.
 *
 * Emits PACKAGE_RESOLVED / PACKAGE_RESOLUTION_FAILED after step 3.
 * Emits POLICY_RESOLVED / POLICY_RESOLUTION_FAILED after full bundle assembly.
 */
@Injectable()
export class DefaultPolicyResolver implements IPolicyResolver {
  private readonly logger = new Logger(DefaultPolicyResolver.name);

  constructor(
    @Inject('PlanService')    private readonly planService:    PlanService,
    @Inject('PackageService') private readonly packageService: PackageService,
    private readonly packageVersionRepo: PackageVersionRepository,
    private readonly ruleRepo:           CommercialRuleRepository,
    private readonly ruleVersionRepo:    CommercialRuleVersionRepository,
    private readonly ownershipRepo:      PaymentOwnershipPolicyRepository,
    private readonly distributionRepo:   RevenueDistributionPolicyRepository,
    private readonly pricingModelRepo:   PricingModelRepository,
    private readonly gatewayDefRepo:     GatewayDefinitionRepository,
    private readonly featureFlagRepo:    FeatureFlagRepository,
    @Inject(ENTITLEMENT_RESOLVER)
    private readonly entitlementResolver: IEntitlementResolver,
    private readonly eventEmitter:       EventEmitter2,
  ) {}

  async resolve(context: CommercialDecisionContext): Promise<ResolvedPolicyBundle> {
    const { tenantId } = context;
    const resolvedAt = new Date();

    try {
      // Step A: Resolve package assignment (must succeed before other policies)
      const packageAssignment = await this.resolvePackageAssignment(tenantId, resolvedAt);

      // Steps B-F: Resolve remaining policies concurrently
      const [
        ruleVersions,
        ownershipPolicies,
        distributionPolicies,
        pricingModels,
        gatewayDefinitions,
        featureFlags,
      ] = await Promise.all([
        this.resolveRuleVersions(tenantId),
        this.resolveWithFallback(
          () => this.ownershipRepo.findByTenant(tenantId),
          () => this.ownershipRepo.findByTenant(null),
        ),
        this.resolveWithFallback(
          () => this.distributionRepo.findByTenant(tenantId),
          () => this.distributionRepo.findByTenant(null),
        ),
        this.resolveWithFallback(
          () => this.pricingModelRepo.findByTenant(tenantId),
          () => this.pricingModelRepo.findByTenant(null),
        ),
        this.gatewayDefRepo.findAll(),
        this.resolveFeatureFlags(tenantId),
      ]);

      const bundle: ResolvedPolicyBundle = {
        entitlementBundle: packageAssignment && packageAssignment.packageVersion
          ? this.entitlementResolver.resolve(packageAssignment, featureFlags)
          : null,
        packageAssignment,
        packageVersion:      packageAssignment?.packageVersion ?? null,
        packageSlug:         packageAssignment?.packageSlug    ?? null,
        ruleVersions,
        ownershipPolicies,
        distributionPolicies,
        pricingModels,
        gatewayDefinitions,
        featureFlags,
        resolvedAt,
      };

      this.logger.log(
        `resolve: tenant=${tenantId} ` +
        `pkg=${packageAssignment?.packageSlug ?? 'none'}` +
        `@${packageAssignment?.tierKey ?? 'none'} ` +
        `eligible=${packageAssignment?.isEligible ?? false} ` +
        `rules=${ruleVersions.length} flags=${featureFlags.length}`,
      );

      await this.eventEmitter.emitAsync(CommercialEvents.POLICY_RESOLVED, {
        tenantId,
        packageSlug:    packageAssignment?.packageSlug ?? null,
        packageVersion: packageAssignment?.packageVersion?.version ?? null,
        ruleCount:      ruleVersions.length,
        resolvedAt:     resolvedAt.toISOString(),
      });

      return bundle;
    } catch (err) {
      const msg = (err as Error).message ?? 'unknown error';
      this.logger.error(`resolve: failed for tenant=${tenantId} — ${msg}`);
      await this.eventEmitter.emitAsync(CommercialEvents.POLICY_RESOLUTION_FAILED, {
        tenantId,
        error:     msg,
        timestamp: new Date().toISOString(),
      });
      throw err;
    }
  }

  // ── Package resolution ────────────────────────────────────────────────────

  /**
   * Resolves the tenant's package assignment via the deterministic chain:
   *   PlanService → PackageService → PackageVersionRepository
   *
   * Returns null (not throws) when no plan exists — caller decides outcome.
   * Throws domain errors for invalid/inactive package state.
   *
   * Emits PACKAGE_RESOLVED or PACKAGE_RESOLUTION_FAILED.
   */
  private async resolvePackageAssignment(
    tenantId:   string,
    resolvedAt: Date,
  ): Promise<PackageAssignment | null> {
    // 1. Load active plan
    const plan = await this.planService.findForTenant(tenantId);
    if (!plan) {
      this.logger.debug(`resolvePackageAssignment: no active plan for tenant ${tenantId}`);
      await this.eventEmitter.emitAsync(CommercialEvents.PACKAGE_RESOLUTION_FAILED, {
        tenantId,
        reason:    'NO_PLAN',
        timestamp: resolvedAt.toISOString(),
      });
      return null;
    }

    // 2. Load the package (PackageEntity — existing system)
    let pkg;
    try {
      pkg = await this.packageService.findOne(plan.packageId);
    } catch (err) {
      const msg = err instanceof NotFoundException
        ? `Plan ${plan.id} references missing package ${plan.packageId}`
        : (err as Error).message;
      await this.eventEmitter.emitAsync(CommercialEvents.PACKAGE_RESOLUTION_FAILED, {
        tenantId, planId: plan.id, reason: 'PACKAGE_NOT_FOUND', detail: msg,
        timestamp: resolvedAt.toISOString(),
      });
      throw new UnprocessableEntityException(
        `Package resolution failed for tenant ${tenantId}: ${msg}`,
      );
    }

    // 3. Validate package status
    const eligibleStatuses: Array<typeof pkg.status> = ['active', 'deprecated'];
    const isEligible = eligibleStatuses.includes(pkg.status);
    if (!isEligible) {
      const msg = `Package "${pkg.slug}" has status "${pkg.status}" — not eligible for commercial decisions`;
      this.logger.warn(`resolvePackageAssignment: tenant=${tenantId} ${msg}`);
      await this.eventEmitter.emitAsync(CommercialEvents.PACKAGE_RESOLUTION_FAILED, {
        tenantId, planId: plan.id, packageId: pkg.id,
        reason: 'PACKAGE_INELIGIBLE', detail: msg,
        timestamp: resolvedAt.toISOString(),
      });
      throw new UnprocessableEntityException(msg);
    }

    // 4. Resolve the pinned PackageVersion via tierKey
    // PlanEntity.tierKey IS the version identifier — deterministic, no sort.
    const packageVersion = await this.packageVersionRepo.findByPackageAndVersion(
      plan.packageId,
      plan.tierKey,
    );

    if (!packageVersion) {
      const msg =
        `No PackageVersion found for packageId=${plan.packageId} tierKey="${plan.tierKey}". ` +
        `Ensure a PackageVersion with version="${plan.tierKey}" exists.`;
      this.logger.warn(`resolvePackageAssignment: tenant=${tenantId} — ${msg}`);
      await this.eventEmitter.emitAsync(CommercialEvents.PACKAGE_RESOLUTION_FAILED, {
        tenantId, planId: plan.id, packageId: pkg.id,
        reason: 'VERSION_MISSING', tierKey: plan.tierKey,
        timestamp: resolvedAt.toISOString(),
      });
      throw new UnprocessableEntityException(msg);
    }

    // 5. Build the immutable assignment
    const assignment: PackageAssignment = {
      planId:           plan.id,
      packageId:        pkg.id,
      packageSlug:      pkg.slug,
      tierKey:          plan.tierKey,
      packageVersion,
      packageStatus:    pkg.status,
      isEligible,
      effectiveFeatures: { ...pkg.features, ...plan.featureOverrides },
      effectiveLimits:   { ...pkg.limits,   ...plan.limitOverrides },
      resolvedAt,
    };

    await this.eventEmitter.emitAsync(CommercialEvents.PACKAGE_RESOLVED, {
      tenantId,
      planId:         plan.id,
      packageId:      pkg.id,
      packageSlug:    pkg.slug,
      tierKey:        plan.tierKey,
      packageVersion: packageVersion.version,
      resolvedAt:     resolvedAt.toISOString(),
    });

    return assignment;
  }

  // ── Rule versions ─────────────────────────────────────────────────────────

  /**
   * Resolves active CommercialRule versions using the pinned activeVersion string.
   * NEVER sorts by createdAt or uses versions[0].
   */
  private async resolveRuleVersions(
    tenantId: string,
  ): Promise<import('../entities/commercial-rule-version.entity').CommercialRuleVersionEntity[]> {
    const [tenantRules, platformRules] = await Promise.all([
      this.ruleRepo.findActiveByTenant(tenantId),
      this.ruleRepo.findActiveByTenant(null),
    ]);

    const allRules = [...tenantRules, ...platformRules];
    if (!allRules.length) return [];

    const versionResults = await Promise.all(
      allRules
        .filter((r) => r.activeVersion !== null)
        .map((r) => this.ruleVersionRepo.findByRuleAndVersion(r.id, r.activeVersion!)),
    );

    return versionResults.filter((v): v is NonNullable<typeof v> => v !== null);
  }

  // ── Feature flags ─────────────────────────────────────────────────────────

  /**
   * Merges platform + tenant feature flags.
   * Tenant flags shadow platform flags on the same key.
   */
  private async resolveFeatureFlags(
    tenantId: string,
  ): Promise<import('../entities/commercial-policy-gateway-flag-audit.entity').FeatureFlagEntity[]> {
    const [platformFlags, tenantFlags] = await Promise.all([
      this.featureFlagRepo.findByTenant(null),
      this.featureFlagRepo.findByTenant(tenantId),
    ]);
    const flagMap = new Map(platformFlags.map((f) => [f.key, f]));
    for (const f of tenantFlags) flagMap.set(f.key, f);
    return Array.from(flagMap.values());
  }

  // ── Generic tenant-scoped with platform fallback ──────────────────────────

  private async resolveWithFallback<T>(
    tenantFn:   () => Promise<T[]>,
    platformFn: () => Promise<T[]>,
  ): Promise<T[]> {
    const tenantResult = await tenantFn();
    return tenantResult.length ? tenantResult : platformFn();
  }
}
