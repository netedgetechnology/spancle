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
var CommercialDecisionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommercialDecisionService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const commercial_enums_1 = require("../enums/commercial.enums");
const commercial_events_1 = require("../events/commercial.events");
const commercial_repositories_1 = require("../commercial.repositories");
let CommercialDecisionService = CommercialDecisionService_1 = class CommercialDecisionService {
    constructor(snapshotRepo, packageDefRepo, packageVersionRepo, productRepo, ruleRepo, ownershipRepo, distributionRepo, eventEmitter) {
        this.snapshotRepo = snapshotRepo;
        this.packageDefRepo = packageDefRepo;
        this.packageVersionRepo = packageVersionRepo;
        this.productRepo = productRepo;
        this.ruleRepo = ruleRepo;
        this.ownershipRepo = ownershipRepo;
        this.distributionRepo = distributionRepo;
        this.eventEmitter = eventEmitter;
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
        const resolved = {
            input: context,
            packageVersion: null,
            product: null,
            ownershipPolicies: [],
            distributionPolicies: [],
            stepTrace: [],
        };
        try {
            await this.stepValidateRequest(resolved);
            await this.stepResolvePackage(resolved);
            await this.stepResolveProduct(resolved);
            await this.stepResolvePolicies(resolved);
            const result = await this.stepGenerateSnapshot(resolved);
            await this.eventEmitter.emitAsync(commercial_events_1.CommercialEvents.DECISION_GENERATED, {
                decisionId: result.decisionId,
                tenantId: context.tenantId,
                outcome: result.outcome,
                timestamp: result.generatedAt.toISOString(),
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
                stepTrace: resolved.stepTrace,
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
        return this.snapshotToResult(snapshot, snapshot.inputContext);
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
    async stepResolvePackage(ctx) {
        const { tenantId } = ctx.input;
        try {
            const defs = await this.packageDefRepo.findAll();
            const activeDef = defs.find((d) => d.isActive) ?? null;
            if (activeDef) {
                const versions = await this.packageVersionRepo.findByPackage(activeDef.id);
                ctx.packageVersion = versions[0] ?? null;
            }
            ctx.stepTrace.push({
                step: commercial_enums_1.CommercialPipelineStep.RESOLVE_PACKAGE,
                ok: true,
                detail: ctx.packageVersion
                    ? `resolved package version ${ctx.packageVersion.id}`
                    : 'no package version found — continuing',
            });
        }
        catch (err) {
            ctx.stepTrace.push({
                step: commercial_enums_1.CommercialPipelineStep.RESOLVE_PACKAGE,
                ok: false,
                detail: err.message,
            });
            throw err;
        }
    }
    async stepResolveProduct(ctx) {
        const { productId } = ctx.input;
        try {
            const byId = await this.productRepo.findById(productId);
            const bySku = byId ? null : await this.productRepo.findBySku(productId);
            ctx.product = byId ?? bySku;
            ctx.stepTrace.push({
                step: commercial_enums_1.CommercialPipelineStep.RESOLVE_PRODUCT,
                ok: true,
                detail: ctx.product
                    ? `resolved product ${ctx.product.id} (sku=${ctx.product.sku})`
                    : `product "${productId}" not found`,
            });
        }
        catch (err) {
            ctx.stepTrace.push({
                step: commercial_enums_1.CommercialPipelineStep.RESOLVE_PRODUCT,
                ok: false,
                detail: err.message,
            });
            throw err;
        }
    }
    async stepResolvePolicies(ctx) {
        const { tenantId } = ctx.input;
        try {
            const [tenantOwnership, platformOwnership] = await Promise.all([
                this.ownershipRepo.findByTenant(tenantId),
                this.ownershipRepo.findByTenant(null),
            ]);
            ctx.ownershipPolicies = tenantOwnership.length ? tenantOwnership : platformOwnership;
            const [tenantDist, platformDist] = await Promise.all([
                this.distributionRepo.findByTenant(tenantId),
                this.distributionRepo.findByTenant(null),
            ]);
            ctx.distributionPolicies = tenantDist.length ? tenantDist : platformDist;
            ctx.stepTrace.push({
                step: commercial_enums_1.CommercialPipelineStep.RESOLVE_POLICIES,
                ok: true,
                detail: `ownership=${ctx.ownershipPolicies.length} distribution=${ctx.distributionPolicies.length}`,
            });
        }
        catch (err) {
            ctx.stepTrace.push({
                step: commercial_enums_1.CommercialPipelineStep.RESOLVE_POLICIES,
                ok: false,
                detail: err.message,
            });
            throw err;
        }
    }
    async stepGenerateSnapshot(ctx) {
        const { input, product, packageVersion, ownershipPolicies, distributionPolicies } = ctx;
        const productEligible = Boolean(product?.isActive);
        const outcome = productEligible
            ? commercial_enums_1.CommercialDecisionOutcome.ALLOWED
            : commercial_enums_1.CommercialDecisionOutcome.DENIED;
        const reason = productEligible
            ? 'Product is active and eligible; full rule evaluation deferred.'
            : `Product "${input.productId}" is ${product ? 'inactive' : 'not found'}.`;
        const appliedPolicyIds = [
            ...ownershipPolicies.map((p) => p.id),
            ...distributionPolicies.map((p) => p.id),
        ];
        const generatedAt = new Date();
        const snapshot = await this.snapshotRepo.create({
            tenantId: input.tenantId,
            ruleId: '00000000-0000-0000-0000-000000000000',
            ruleVersion: '0.0.0',
            subjectType: 'decision',
            subjectId: '00000000-0000-0000-0000-000000000000',
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
                productEligible,
                appliedPolicyIds,
                resolvedPackageId: packageVersion?.id ?? null,
                generatedAt: generatedAt.toISOString(),
                stepTrace: ctx.stepTrace,
            },
            evaluatedById: input.actorId,
        });
        ctx.stepTrace.push({
            step: commercial_enums_1.CommercialPipelineStep.GENERATE_SNAPSHOT,
            ok: true,
            detail: `snapshot written id=${snapshot.id}`,
        });
        return {
            decisionId: snapshot.id,
            tenantId: input.tenantId,
            moduleId: input.moduleId,
            productId: input.productId,
            transactionType: input.transactionType,
            outcome,
            reason,
            resolvedPackage: packageVersion
                ? { slug: 'unknown', version: packageVersion.version }
                : null,
            productEligible,
            appliedPolicyIds,
            snapshot,
            generatedAt,
            stepTrace: ctx.stepTrace,
        };
    }
    snapshotToResult(snapshot, input) {
        const payload = snapshot.resultPayload;
        return {
            decisionId: snapshot.id,
            tenantId: snapshot.tenantId ?? '',
            moduleId: input['moduleId'] ?? '',
            productId: input['productId'] ?? '',
            transactionType: input['transactionType'] ?? commercial_enums_1.TransactionType.BOOKING,
            outcome: snapshot.outcome,
            reason: payload['reason'] ?? '',
            resolvedPackage: payload['resolvedPackageId']
                ? { slug: 'unknown', version: 'unknown' }
                : null,
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
    __metadata("design:paramtypes", [commercial_repositories_1.CommercialDecisionSnapshotRepository,
        commercial_repositories_1.PackageDefinitionRepository,
        commercial_repositories_1.PackageVersionRepository,
        commercial_repositories_1.CommercialProductRepository,
        commercial_repositories_1.CommercialRuleRepository,
        commercial_repositories_1.PaymentOwnershipPolicyRepository,
        commercial_repositories_1.RevenueDistributionPolicyRepository,
        event_emitter_1.EventEmitter2])
], CommercialDecisionService);
//# sourceMappingURL=commercial-decision.service.js.map