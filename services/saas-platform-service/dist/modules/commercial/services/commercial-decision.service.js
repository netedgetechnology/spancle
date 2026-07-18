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
var CommercialDecisionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommercialDecisionService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const commercial_enums_1 = require("../enums/commercial.enums");
const commercial_events_1 = require("../events/commercial.events");
const policy_resolver_interfaces_1 = require("../interfaces/policy-resolver.interfaces");
const package_assignment_model_1 = require("../policy/package-assignment.model");
const commercial_repositories_1 = require("../commercial.repositories");
const commercial_contract_builder_1 = require("../contracts/commercial-contract.builder");
const platform_1 = require("../../../platform");
const contract_version_1 = require("../contracts/contract-version");
let CommercialDecisionService = CommercialDecisionService_1 = class CommercialDecisionService {
    constructor(policyResolver, snapshotRepo, eventEmitter, platformPublisher) {
        this.policyResolver = policyResolver;
        this.snapshotRepo = snapshotRepo;
        this.eventEmitter = eventEmitter;
        this.platformPublisher = platformPublisher;
        this.logger = new common_1.Logger(CommercialDecisionService_1.name);
    }
    async evaluate(context) {
        this.logger.log(`evaluate: tenant=${context.tenantId} module=${context.moduleId} ` +
            `product=${context.productId} tx=${context.transactionType}`);
        await this.eventEmitter.emitAsync(commercial_events_1.CommercialEvents.DECISION_REQUESTED, {
            tenantId: context.tenantId,
            moduleId: context.moduleId,
            productId: context.productId,
            transactionType: context.transactionType,
            timestamp: context.requestedAt.toISOString(),
        });
        const pipelineCtx = {
            input: context,
            packageVersion: null,
            product: null,
            ownershipPolicies: [],
            distributionPolicies: [],
            stepTrace: [],
        };
        try {
            this.stepValidateRequest(pipelineCtx);
            const bundle = await this.stepResolveViaPolicy(pipelineCtx);
            const result = await this.stepGenerateSnapshot(pipelineCtx, bundle);
            const contract = commercial_contract_builder_1.CommercialContractBuilder.build(result, bundle);
            const envelopeInput = {
                contractId: `${platform_1.PlatformEventTypes.COMMERCIAL_DECISION_GENERATED}-${result.decisionId}`,
                contractVersion: contract_version_1.COMMERCIAL_CONTRACT_VERSION,
                eventType: platform_1.PlatformEventTypes.COMMERCIAL_DECISION_GENERATED,
                correlationId: result.decisionId,
                traceId: result.decisionId,
                deduplicationKey: `commercial-decision-${context.tenantId}-${result.decisionId}`,
                occurredAt: result.generatedAt.toISOString(),
                producerVersion: contract_version_1.COMMERCIAL_CONTRACT_VERSION,
                payload: contract,
            };
            await this.platformPublisher.publish((0, platform_1.createEnvelope)(envelopeInput));
            await this.eventEmitter.emitAsync(commercial_events_1.CommercialEvents.DECISION_GENERATED, {
                decisionId: result.decisionId,
                tenantId: context.tenantId,
                outcome: result.outcome,
                timestamp: result.generatedAt.toISOString(),
                contract,
            });
            return result;
        }
        catch (err) {
            const msg = err.message ?? 'unknown error';
            this.logger.error(`evaluate: pipeline failed — tenant=${context.tenantId} err=${msg}`);
            await this.eventEmitter.emitAsync(commercial_events_1.CommercialEvents.DECISION_FAILED, {
                tenantId: context.tenantId,
                moduleId: context.moduleId,
                productId: context.productId,
                error: msg,
                stepTrace: pipelineCtx.stepTrace,
                timestamp: new Date().toISOString(),
            });
            throw err;
        }
    }
    async findDecision(decisionId, tenantId) {
        const snapshots = await this.snapshotRepo.findBySubject(tenantId, 'decision', decisionId);
        const snapshot = snapshots.find((s) => s.id === decisionId);
        if (!snapshot)
            return null;
        return this.snapshotToResult(snapshot);
    }
    stepValidateRequest(ctx) {
        const { input } = ctx;
        const errors = [];
        if (!input.tenantId)
            errors.push('tenantId is required');
        if (!input.moduleId)
            errors.push('moduleId is required');
        if (!input.productId)
            errors.push('productId is required');
        if (!Number.isInteger(input.amountMinor) || input.amountMinor < 0)
            errors.push('amountMinor must be a non-negative integer');
        if (!input.currency || input.currency.length !== 3)
            errors.push('currency must be a 3-character ISO 4217 code');
        if (!input.country || input.country.length !== 2)
            errors.push('country must be a 2-character ISO 3166-1 alpha-2 code');
        if (!Object.values(commercial_enums_1.TransactionType).includes(input.transactionType))
            errors.push(`transactionType "${input.transactionType}" is not recognised`);
        const ok = errors.length === 0;
        ctx.stepTrace.push({
            step: commercial_enums_1.CommercialPipelineStep.VALIDATE_REQUEST,
            ok,
            detail: ok ? undefined : errors.join('; '),
        });
        if (!ok) {
            throw new common_1.UnprocessableEntityException(`CommercialDecision validation failed: ${errors.join('; ')}`);
        }
    }
    async stepResolveViaPolicy(ctx) {
        let bundle;
        try {
            bundle = await this.policyResolver.resolve(ctx.input);
            ctx.packageVersion = bundle.packageVersion;
            ctx.ownershipPolicies = bundle.ownershipPolicies;
            ctx.distributionPolicies = bundle.distributionPolicies;
        }
        catch (err) {
            ctx.stepTrace.push({
                step: commercial_enums_1.CommercialPipelineStep.RESOLVE_PACKAGE,
                ok: false,
                detail: err.message,
            });
            throw err;
        }
        ctx.stepTrace.push({
            step: commercial_enums_1.CommercialPipelineStep.RESOLVE_PACKAGE,
            ok: true,
            detail: bundle.packageVersion
                ? `${bundle.packageSlug}@${bundle.packageVersion.version}`
                : 'no package version — tenant has no active plan',
        });
        ctx.stepTrace.push({
            step: commercial_enums_1.CommercialPipelineStep.RESOLVE_PRODUCT,
            ok: true,
            detail: `productId=${ctx.input.productId} (eligibility evaluated at snapshot step)`,
        });
        ctx.stepTrace.push({
            step: commercial_enums_1.CommercialPipelineStep.RESOLVE_POLICIES,
            ok: true,
            detail: `ownership=${bundle.ownershipPolicies.length} ` +
                `distribution=${bundle.distributionPolicies.length} ` +
                `pricing=${bundle.pricingModels.length} ` +
                `gateways=${bundle.gatewayDefinitions.length} ` +
                `rules=${bundle.ruleVersions.length} ` +
                `flags=${bundle.featureFlags.length}`,
        });
        return bundle;
    }
    async stepGenerateSnapshot(ctx, bundle) {
        const { input } = ctx;
        const { packageAssignment, packageVersion, packageSlug, ownershipPolicies, distributionPolicies, ruleVersions, ruleBundle, } = bundle;
        const isEligible = packageAssignment?.isEligible ?? false;
        const outcome = isEligible
            ? commercial_enums_1.CommercialDecisionOutcome.ALLOWED
            : commercial_enums_1.CommercialDecisionOutcome.DENIED;
        const reason = isEligible
            ? `Package ${packageSlug}@${packageVersion?.version ?? 'unknown'} resolved via ` +
                `plan ${packageAssignment.planId}; rule evaluation deferred.`
            : packageAssignment
                ? `Package "${packageSlug}" (status: ${packageAssignment.packageStatus}) is not eligible.`
                : `Tenant ${input.tenantId} has no active package plan assigned.`;
        const appliedPolicyIds = [
            ...ownershipPolicies.map((p) => p.id),
            ...distributionPolicies.map((p) => p.id),
        ];
        const generatedAt = new Date();
        const pkgAssignmentSnapshot = packageAssignment
            ? (0, package_assignment_model_1.toPackageAssignmentSnapshot)(packageAssignment)
            : null;
        const primaryRuleVersionId = ruleBundle?.primaryRuleVersionId ?? null;
        const primaryRuleVersionSemver = ruleBundle?.primaryRuleVersionSemver ?? null;
        const snapshot = await this.snapshotRepo.create({
            tenantId: input.tenantId,
            ruleId: primaryRuleVersionId,
            ruleVersion: primaryRuleVersionSemver,
            subjectType: 'commercial_decision',
            subjectId: input.productId.length === 36 ? input.productId : '00000000-0000-0000-0000-000000000000',
            outcome,
            inputContext: {
                tenantId: input.tenantId,
                moduleId: input.moduleId,
                productId: input.productId,
                transactionType: input.transactionType,
                amountMinor: input.amountMinor,
                currency: input.currency,
                country: input.country,
                metadata: input.metadata,
                requestedAt: input.requestedAt.toISOString(),
            },
            resultPayload: {
                outcome,
                reason,
                packageAssignment: pkgAssignmentSnapshot,
                planId: pkgAssignmentSnapshot?.planId ?? null,
                packageId: pkgAssignmentSnapshot?.packageId ?? null,
                packageSlug: pkgAssignmentSnapshot?.packageSlug ?? null,
                packageVersion: pkgAssignmentSnapshot?.packageVersion ?? null,
                tierKey: pkgAssignmentSnapshot?.tierKey ?? null,
                productEligible: isEligible,
                appliedPolicyIds,
                ruleVersionIds: ruleVersions.map((rv) => rv.id),
                primaryRuleVersionId,
                primaryRuleVersionSemver,
                pricingRuleCount: ruleBundle?.pricingRules.length ?? 0,
                discountRuleCount: ruleBundle?.discountRules.length ?? 0,
                promotionRuleCount: ruleBundle?.promotionRules.length ?? 0,
                trialRuleCount: ruleBundle?.trialRules.length ?? 0,
                evaluatedRules: ruleBundle?.evaluatedRules.map((e) => ({
                    ruleVersionId: e.ruleVersion.id,
                    ruleType: e.ruleType,
                    outcome: e.outcome,
                    reason: e.reason,
                })) ?? [],
                resolvedAt: bundle.resolvedAt.toISOString(),
                generatedAt: generatedAt.toISOString(),
                stepTrace: ctx.stepTrace,
            },
            evaluatedById: input.actorId,
            evaluatedRuleIds: ruleVersions.map((rv) => rv.id),
        });
        ctx.stepTrace.push({
            step: commercial_enums_1.CommercialPipelineStep.GENERATE_SNAPSHOT,
            ok: true,
            detail: `snapshot=${snapshot.id} outcome=${outcome}`,
        });
        return {
            decisionId: snapshot.id,
            tenantId: input.tenantId,
            moduleId: input.moduleId,
            productId: input.productId,
            transactionType: input.transactionType,
            outcome,
            reason,
            resolvedPackage: packageVersion && packageSlug
                ? { slug: packageSlug, version: packageVersion.version }
                : null,
            productEligible: isEligible,
            appliedPolicyIds,
            snapshot,
            generatedAt,
            stepTrace: ctx.stepTrace,
        };
    }
    snapshotToResult(snapshot) {
        const input = snapshot.inputContext;
        const payload = snapshot.resultPayload;
        const pkgPayload = (payload['packageAssignment'] ?? {});
        const slug = (payload['packageSlug'] ?? pkgPayload['packageSlug']);
        const ver = (payload['packageVersion'] ?? pkgPayload['packageVersion']);
        return {
            decisionId: snapshot.id,
            tenantId: snapshot.tenantId ?? '',
            moduleId: input['moduleId'] ?? '',
            productId: input['productId'] ?? '',
            transactionType: input['transactionType'] ?? commercial_enums_1.TransactionType.BOOKING,
            outcome: snapshot.outcome,
            reason: payload['reason'] ?? '',
            resolvedPackage: slug && ver ? { slug, version: ver } : null,
            productEligible: Boolean(payload['productEligible']),
            appliedPolicyIds: payload['appliedPolicyIds'] ?? [],
            snapshot,
            generatedAt: snapshot.createdAt,
            stepTrace: payload['stepTrace'] ?? [],
        };
    }
};
exports.CommercialDecisionService = CommercialDecisionService;
exports.CommercialDecisionService = CommercialDecisionService = CommercialDecisionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(policy_resolver_interfaces_1.POLICY_RESOLVER)),
    __param(3, (0, common_1.Inject)(platform_1.PLATFORM_CONTRACT_PUBLISHER)),
    __metadata("design:paramtypes", [Object, commercial_repositories_1.CommercialDecisionSnapshotRepository,
        event_emitter_1.EventEmitter2, Object])
], CommercialDecisionService);
//# sourceMappingURL=commercial-decision.service.js.map