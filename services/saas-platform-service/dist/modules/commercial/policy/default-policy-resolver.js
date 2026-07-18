"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DefaultPolicyResolver_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultPolicyResolver = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const commercial_repositories_1 = require("../commercial.repositories");
const commercial_events_1 = require("../events/commercial.events");
const entitlement_resolver_interfaces_1 = require("../interfaces/entitlement-resolver.interfaces");
const rule_resolver_interfaces_1 = require("../interfaces/rule-resolver.interfaces");
const gateway_registry_interfaces_1 = require("../interfaces/gateway-registry.interfaces");
const commercial_enums_1 = require("../enums/commercial.enums");
const common_2 = require("@nestjs/common");
let DefaultPolicyResolver = DefaultPolicyResolver_1 = class DefaultPolicyResolver {
    constructor(planService, packageService, packageVersionRepo, ruleRepo, ruleVersionRepo, ownershipRepo, distributionRepo, pricingModelRepo, gatewayDefRepo, featureFlagRepo, entitlementResolver, ruleResolver, gatewayRegistry, gatewayCredentialRepo, eventEmitter) {
        this.planService = planService;
        this.packageService = packageService;
        this.packageVersionRepo = packageVersionRepo;
        this.ruleRepo = ruleRepo;
        this.ruleVersionRepo = ruleVersionRepo;
        this.ownershipRepo = ownershipRepo;
        this.distributionRepo = distributionRepo;
        this.pricingModelRepo = pricingModelRepo;
        this.gatewayDefRepo = gatewayDefRepo;
        this.featureFlagRepo = featureFlagRepo;
        this.entitlementResolver = entitlementResolver;
        this.ruleResolver = ruleResolver;
        this.gatewayRegistry = gatewayRegistry;
        this.gatewayCredentialRepo = gatewayCredentialRepo;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(DefaultPolicyResolver_1.name);
    }
    async resolve(context) {
        const { tenantId } = context;
        const resolvedAt = new Date();
        try {
            const packageAssignment = await this.resolvePackageAssignment(tenantId, resolvedAt);
            const [ruleVersions, ownershipPolicies, distributionPolicies, pricingModels, gatewayDefinitions, featureFlags, tenantCredentials, platformCredentials,] = await Promise.all([
                this.resolveRuleVersions(tenantId),
                this.resolveWithFallback(() => this.ownershipRepo.findByTenant(tenantId), () => this.ownershipRepo.findByTenant(null)),
                this.resolveWithFallback(() => this.distributionRepo.findByTenant(tenantId), () => this.distributionRepo.findByTenant(null)),
                this.resolveWithFallback(() => this.pricingModelRepo.findByTenant(tenantId), () => this.pricingModelRepo.findByTenant(null)),
                this.gatewayDefRepo.findAll(),
                this.resolveFeatureFlags(tenantId),
                this.gatewayCredentialRepo.findByTenant(tenantId),
                this.gatewayCredentialRepo.findByTenant(null),
            ]);
            const allCredentials = [...platformCredentials, ...tenantCredentials];
            const ownershipType = ownershipPolicies[0]?.ownershipType ?? commercial_enums_1.PaymentOwnershipType.PLATFORM;
            const gatewayCtx = {
                tenantId,
                currency: context.currency,
                country: context.country,
                tenantOwned: ownershipType === commercial_enums_1.PaymentOwnershipType.TENANT ||
                    ownershipType === commercial_enums_1.PaymentOwnershipType.SPLIT,
            };
            const gatewayBundle = gatewayDefinitions.length
                ? this.gatewayRegistry.resolve(gatewayDefinitions, allCredentials, ownershipType, gatewayCtx)
                : null;
            const ruleBundle = ruleVersions.length
                ? this.ruleResolver.resolve(ruleVersions)
                : null;
            const bundle = {
                ruleBundle,
                gatewayBundle,
                entitlementBundle: packageAssignment && packageAssignment.packageVersion
                    ? this.entitlementResolver.resolve(packageAssignment, featureFlags)
                    : null,
                packageAssignment,
                packageVersion: packageAssignment?.packageVersion ?? null,
                packageSlug: packageAssignment?.packageSlug ?? null,
                ruleVersions,
                ownershipPolicies,
                distributionPolicies,
                pricingModels,
                gatewayDefinitions,
                featureFlags,
                resolvedAt,
            };
            this.logger.log(`resolve: tenant=${tenantId} ` +
                `pkg=${packageAssignment?.packageSlug ?? 'none'}` +
                `@${packageAssignment?.tierKey ?? 'none'} ` +
                `eligible=${packageAssignment?.isEligible ?? false} ` +
                `rules=${ruleVersions.length} flags=${featureFlags.length}`);
            await this.eventEmitter.emitAsync(commercial_events_1.CommercialEvents.POLICY_RESOLVED, {
                tenantId,
                packageSlug: packageAssignment?.packageSlug ?? null,
                packageVersion: packageAssignment?.packageVersion?.version ?? null,
                ruleCount: ruleVersions.length,
                resolvedAt: resolvedAt.toISOString(),
            });
            return bundle;
        }
        catch (err) {
            const msg = err.message ?? 'unknown error';
            this.logger.error(`resolve: failed for tenant=${tenantId} — ${msg}`);
            await this.eventEmitter.emitAsync(commercial_events_1.CommercialEvents.POLICY_RESOLUTION_FAILED, {
                tenantId,
                error: msg,
                timestamp: new Date().toISOString(),
            });
            throw err;
        }
    }
    async resolvePackageAssignment(tenantId, resolvedAt) {
        const plan = await this.planService.findForTenant(tenantId);
        if (!plan) {
            this.logger.debug(`resolvePackageAssignment: no active plan for tenant ${tenantId}`);
            await this.eventEmitter.emitAsync(commercial_events_1.CommercialEvents.PACKAGE_RESOLUTION_FAILED, {
                tenantId,
                reason: 'NO_PLAN',
                timestamp: resolvedAt.toISOString(),
            });
            return null;
        }
        let pkg;
        try {
            pkg = await this.packageService.findOne(plan.packageId);
        }
        catch (err) {
            const msg = err instanceof common_1.NotFoundException
                ? `Plan ${plan.id} references missing package ${plan.packageId}`
                : err.message;
            await this.eventEmitter.emitAsync(commercial_events_1.CommercialEvents.PACKAGE_RESOLUTION_FAILED, {
                tenantId, planId: plan.id, reason: 'PACKAGE_NOT_FOUND', detail: msg,
                timestamp: resolvedAt.toISOString(),
            });
            throw new common_1.UnprocessableEntityException(`Package resolution failed for tenant ${tenantId}: ${msg}`);
        }
        const eligibleStatuses = ['active', 'deprecated'];
        const isEligible = eligibleStatuses.includes(pkg.status);
        if (!isEligible) {
            const msg = `Package "${pkg.slug}" has status "${pkg.status}" — not eligible for commercial decisions`;
            this.logger.warn(`resolvePackageAssignment: tenant=${tenantId} ${msg}`);
            await this.eventEmitter.emitAsync(commercial_events_1.CommercialEvents.PACKAGE_RESOLUTION_FAILED, {
                tenantId, planId: plan.id, packageId: pkg.id,
                reason: 'PACKAGE_INELIGIBLE', detail: msg,
                timestamp: resolvedAt.toISOString(),
            });
            throw new common_1.UnprocessableEntityException(msg);
        }
        const packageVersion = await this.packageVersionRepo.findByPackageAndVersion(plan.packageId, plan.tierKey);
        if (!packageVersion) {
            const msg = `No PackageVersion found for packageId=${plan.packageId} tierKey="${plan.tierKey}". ` +
                `Ensure a PackageVersion with version="${plan.tierKey}" exists.`;
            this.logger.warn(`resolvePackageAssignment: tenant=${tenantId} — ${msg}`);
            await this.eventEmitter.emitAsync(commercial_events_1.CommercialEvents.PACKAGE_RESOLUTION_FAILED, {
                tenantId, planId: plan.id, packageId: pkg.id,
                reason: 'VERSION_MISSING', tierKey: plan.tierKey,
                timestamp: resolvedAt.toISOString(),
            });
            throw new common_1.UnprocessableEntityException(msg);
        }
        const assignment = {
            planId: plan.id,
            packageId: pkg.id,
            packageSlug: pkg.slug,
            tierKey: plan.tierKey,
            packageVersion,
            packageStatus: pkg.status,
            isEligible,
            effectiveFeatures: { ...packageVersion.features, ...plan.featureOverrides },
            effectiveLimits: { ...packageVersion.limits, ...plan.limitOverrides },
            resolvedAt,
        };
        await this.eventEmitter.emitAsync(commercial_events_1.CommercialEvents.PACKAGE_RESOLVED, {
            tenantId,
            planId: plan.id,
            packageId: pkg.id,
            packageSlug: pkg.slug,
            tierKey: plan.tierKey,
            packageVersion: packageVersion.version,
            resolvedAt: resolvedAt.toISOString(),
        });
        return assignment;
    }
    async resolveRuleVersions(tenantId) {
        const [tenantRules, platformRules] = await Promise.all([
            this.ruleRepo.findActiveByTenant(tenantId),
            this.ruleRepo.findActiveByTenant(null),
        ]);
        const allRules = [...tenantRules, ...platformRules];
        if (!allRules.length)
            return [];
        const versionResults = await Promise.all(allRules
            .filter((r) => r.activeVersion !== null)
            .map((r) => this.ruleVersionRepo.findByRuleAndVersion(r.id, r.activeVersion)));
        return versionResults.filter((v) => v !== null);
    }
    async resolveFeatureFlags(tenantId) {
        const [platformFlags, tenantFlags] = await Promise.all([
            this.featureFlagRepo.findByTenant(null),
            this.featureFlagRepo.findByTenant(tenantId),
        ]);
        const flagMap = new Map(platformFlags.map((f) => [f.key, f]));
        for (const f of tenantFlags)
            flagMap.set(f.key, f);
        return Array.from(flagMap.values());
    }
    async resolveWithFallback(tenantFn, platformFn) {
        const tenantResult = await tenantFn();
        return tenantResult.length ? tenantResult : platformFn();
    }
};
exports.DefaultPolicyResolver = DefaultPolicyResolver;
exports.DefaultPolicyResolver = DefaultPolicyResolver = DefaultPolicyResolver_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)('PlanService')),
    __param(1, (0, common_2.Inject)('PackageService')),
    __param(10, (0, common_2.Inject)(entitlement_resolver_interfaces_1.ENTITLEMENT_RESOLVER)),
    __param(11, (0, common_2.Inject)(rule_resolver_interfaces_1.RULE_RESOLVER)),
    __param(12, (0, common_2.Inject)(gateway_registry_interfaces_1.GATEWAY_REGISTRY)),
    __metadata("design:paramtypes", [Function, Function, commercial_repositories_1.PackageVersionRepository,
        commercial_repositories_1.CommercialRuleRepository,
        commercial_repositories_1.CommercialRuleVersionRepository,
        commercial_repositories_1.PaymentOwnershipPolicyRepository,
        commercial_repositories_1.RevenueDistributionPolicyRepository,
        commercial_repositories_1.PricingModelRepository,
        commercial_repositories_1.GatewayDefinitionRepository,
        commercial_repositories_1.FeatureFlagRepository, Object, Object, Object, commercial_repositories_1.GatewayCredentialRepository,
        event_emitter_1.EventEmitter2])
], DefaultPolicyResolver);
//# sourceMappingURL=default-policy-resolver.js.map