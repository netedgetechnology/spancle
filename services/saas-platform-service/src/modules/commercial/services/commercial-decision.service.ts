import {
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import {
  CommercialDecisionOutcome,
  CommercialPipelineStep,
  TransactionType,
} from '../enums/commercial.enums';
import { CommercialEvents } from '../events/commercial.events';
import type {
  CommercialDecisionContext,
  CommercialDecisionResult,
  ICommercialDecisionService,
  ResolvedPipelineContext,
} from '../interfaces/commercial-decision.interfaces';
import {
  CommercialDecisionSnapshotRepository,
  CommercialProductRepository,
  CommercialRuleRepository,
  PackageDefinitionRepository,
  PackageVersionRepository,
  PaymentOwnershipPolicyRepository,
  RevenueDistributionPolicyRepository,
} from '../commercial.repositories';
import type { CommercialDecisionSnapshotEntity } from '../entities/commercial-snapshot-and-package.entity';

/**
 * CommercialDecisionService
 *
 * Implements the five-step evaluation pipeline:
 *
 *   VALIDATE_REQUEST
 *     → RESOLVE_PACKAGE
 *     → RESOLVE_PRODUCT
 *     → RESOLVE_POLICIES
 *     → GENERATE_SNAPSHOT
 *
 * This batch: pipeline skeleton only.
 * No pricing logic, no commission logic, no gateway calls.
 * No dependency on the Booking or Finance bounded contexts.
 *
 * Immutability guarantee:
 *   The CommercialDecisionSnapshotEntity is written as an INSERT-only
 *   record before this method returns. The snapshot is never updated.
 */
@Injectable()
export class CommercialDecisionService implements ICommercialDecisionService {
  private readonly logger = new Logger(CommercialDecisionService.name);

  constructor(
    private readonly snapshotRepo:      CommercialDecisionSnapshotRepository,
    private readonly packageDefRepo:    PackageDefinitionRepository,
    private readonly packageVersionRepo: PackageVersionRepository,
    private readonly productRepo:       CommercialProductRepository,
    private readonly ruleRepo:          CommercialRuleRepository,
    private readonly ownershipRepo:     PaymentOwnershipPolicyRepository,
    private readonly distributionRepo:  RevenueDistributionPolicyRepository,
    private readonly eventEmitter:      EventEmitter2,
  ) {}

  // ── Public API ───────────────────────────────────────────────────────────

  async evaluate(context: CommercialDecisionContext): Promise<CommercialDecisionResult> {
    this.logger.log(
      `evaluate: tenant=${context.tenantId} module=${context.moduleId} ` +
      `product=${context.productId} tx=${context.transactionType}`,
    );

    await this.eventEmitter.emitAsync(CommercialEvents.DECISION_REQUESTED, {
      tenantId:        context.tenantId,
      moduleId:        context.moduleId,
      productId:       context.productId,
      transactionType: context.transactionType,
      timestamp:       context.requestedAt.toISOString(),
    });

    const resolved: ResolvedPipelineContext = {
      input:                context,
      packageVersion:       null,
      product:              null,
      ownershipPolicies:    [],
      distributionPolicies: [],
      stepTrace:            [],
    };

    try {
      await this.stepValidateRequest(resolved);
      await this.stepResolvePackage(resolved);
      await this.stepResolveProduct(resolved);
      await this.stepResolvePolicies(resolved);
      const result = await this.stepGenerateSnapshot(resolved);

      await this.eventEmitter.emitAsync(CommercialEvents.DECISION_GENERATED, {
        decisionId:      result.decisionId,
        tenantId:        context.tenantId,
        outcome:         result.outcome,
        timestamp:       result.generatedAt.toISOString(),
      });

      return result;
    } catch (err) {
      const msg = (err as Error).message ?? 'unknown error';
      this.logger.error(
        `evaluate: pipeline failed — tenant=${context.tenantId} err=${msg}`,
      );
      await this.eventEmitter.emitAsync(CommercialEvents.DECISION_FAILED, {
        tenantId:        context.tenantId,
        moduleId:        context.moduleId,
        productId:       context.productId,
        error:           msg,
        stepTrace:       resolved.stepTrace,
        timestamp:       new Date().toISOString(),
      });
      throw err;
    }
  }

  async findDecision(
    decisionId: string,
    tenantId:   string,
  ): Promise<CommercialDecisionResult | null> {
    const snapshots = await this.snapshotRepo.findBySubject(
      tenantId, 'decision', decisionId,
    );
    const snapshot = snapshots.find((s) => s.id === decisionId);
    if (!snapshot) return null;

    return this.snapshotToResult(snapshot, snapshot.inputContext as Record<string, unknown>);
  }

  // ── Pipeline Steps ───────────────────────────────────────────────────────

  /**
   * Step 1 — VALIDATE_REQUEST
   *
   * Guards:
   *   - tenantId non-empty
   *   - moduleId non-empty
   *   - productId non-empty
   *   - amountMinor >= 0 and is an integer
   *   - currency is 3 chars
   *   - country is 2 chars
   *   - transactionType is a known value
   *
   * No pricing validation here — amounts are validated only for type-safety.
   */
  private stepValidateRequest(ctx: ResolvedPipelineContext): void {
    const { input } = ctx;
    const errors: string[] = [];

    if (!input.tenantId)   errors.push('tenantId is required');
    if (!input.moduleId)   errors.push('moduleId is required');
    if (!input.productId)  errors.push('productId is required');
    if (!Number.isInteger(input.amountMinor) || input.amountMinor < 0)
      errors.push('amountMinor must be a non-negative integer');
    if (!input.currency || input.currency.length !== 3)
      errors.push('currency must be a 3-character ISO 4217 code');
    if (!input.country || input.country.length !== 2)
      errors.push('country must be a 2-character ISO 3166-1 alpha-2 code');
    if (!Object.values(TransactionType).includes(input.transactionType))
      errors.push(`transactionType "${input.transactionType}" is not recognised`);

    const ok = errors.length === 0;
    ctx.stepTrace.push({
      step:   CommercialPipelineStep.VALIDATE_REQUEST,
      ok,
      detail: ok ? undefined : errors.join('; '),
    });

    if (!ok) {
      throw new UnprocessableEntityException(
        `CommercialDecision validation failed: ${errors.join('; ')}`,
      );
    }
  }

  /**
   * Step 2 — RESOLVE_PACKAGE
   *
   * Loads the active PackageDefinition for the tenant, then finds the
   * latest PackageVersion. The tenant's current package slug is stored
   * in the plan module (PlanEntity.tierKey).
   *
   * This step is non-blocking: a missing package version sets
   * packageVersion = null and continues. Downstream steps may still
   * produce a DENIED outcome.
   *
   * Pricing batch will resolve exact amounts from the package version.
   */
  private async stepResolvePackage(ctx: ResolvedPipelineContext): Promise<void> {
    const { tenantId } = ctx.input;

    try {
      // Resolve package slug via rule or plan — placeholder lookup by tenant rule.
      // In future: PlanService.findForTenant(tenantId) → tierKey → packageDef slug.
      // For now: find all active packages and use the first (scaffold-only).
      const defs = await this.packageDefRepo.findAll();
      const activeDef = defs.find((d) => d.isActive) ?? null;

      if (activeDef) {
        const versions = await this.packageVersionRepo.findByPackage(activeDef.id);
        ctx.packageVersion = versions[0] ?? null;  // latest version (sorted DESC by createdAt)
      }

      ctx.stepTrace.push({
        step:   CommercialPipelineStep.RESOLVE_PACKAGE,
        ok:     true,
        detail: ctx.packageVersion
          ? `resolved package version ${ctx.packageVersion.id}`
          : 'no package version found — continuing',
      });
    } catch (err) {
      ctx.stepTrace.push({
        step:   CommercialPipelineStep.RESOLVE_PACKAGE,
        ok:     false,
        detail: (err as Error).message,
      });
      throw err;
    }
  }

  /**
   * Step 3 — RESOLVE_PRODUCT
   *
   * Finds the CommercialProduct for productId (UUID or SKU).
   * Sets product = null when not found; outcome will be DENIED.
   */
  private async stepResolveProduct(ctx: ResolvedPipelineContext): Promise<void> {
    const { productId } = ctx.input;

    try {
      // Try UUID first; fall back to SKU lookup
      const byId  = await this.productRepo.findById(productId);
      const bySku = byId ? null : await this.productRepo.findBySku(productId);
      ctx.product = byId ?? bySku;

      ctx.stepTrace.push({
        step:   CommercialPipelineStep.RESOLVE_PRODUCT,
        ok:     true,
        detail: ctx.product
          ? `resolved product ${ctx.product.id} (sku=${ctx.product.sku})`
          : `product "${productId}" not found`,
      });
    } catch (err) {
      ctx.stepTrace.push({
        step:   CommercialPipelineStep.RESOLVE_PRODUCT,
        ok:     false,
        detail: (err as Error).message,
      });
      throw err;
    }
  }

  /**
   * Step 4 — RESOLVE_POLICIES
   *
   * Loads PaymentOwnershipPolicy and RevenueDistributionPolicy rows
   * applicable to this tenant (tenant-scoped first, platform fallback).
   * Policy contents are not evaluated here — that is deferred to the
   * commission and distribution services.
   */
  private async stepResolvePolicies(ctx: ResolvedPipelineContext): Promise<void> {
    const { tenantId } = ctx.input;

    try {
      // Load tenant-scoped policies; fall back to platform policies (tenantId=null)
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
        step:   CommercialPipelineStep.RESOLVE_POLICIES,
        ok:     true,
        detail: `ownership=${ctx.ownershipPolicies.length} distribution=${ctx.distributionPolicies.length}`,
      });
    } catch (err) {
      ctx.stepTrace.push({
        step:   CommercialPipelineStep.RESOLVE_POLICIES,
        ok:     false,
        detail: (err as Error).message,
      });
      throw err;
    }
  }

  /**
   * Step 5 — GENERATE_SNAPSHOT
   *
   * Determines the outcome, writes the immutable snapshot, and builds
   * CommercialDecisionResult.
   *
   * Outcome rules (skeleton — no pricing logic):
   *   DENIED   if product not found or not active
   *   ALLOWED  otherwise (rule evaluation deferred to future batch)
   *
   * The snapshot is INSERT-only and is written atomically here.
   * On any snapshot write failure the entire evaluate() throws.
   */
  private async stepGenerateSnapshot(
    ctx: ResolvedPipelineContext,
  ): Promise<CommercialDecisionResult> {
    const { input, product, packageVersion, ownershipPolicies, distributionPolicies } = ctx;

    // Determine outcome — no pricing, no rule evaluation in this batch
    const productEligible = Boolean(product?.isActive);
    const outcome: CommercialDecisionOutcome = productEligible
      ? CommercialDecisionOutcome.ALLOWED
      : CommercialDecisionOutcome.DENIED;

    const reason = productEligible
      ? 'Product is active and eligible; full rule evaluation deferred.'
      : `Product "${input.productId}" is ${product ? 'inactive' : 'not found'}.`;

    const appliedPolicyIds = [
      ...ownershipPolicies.map((p) => p.id),
      ...distributionPolicies.map((p) => p.id),
    ];

    const generatedAt = new Date();

    // Write immutable snapshot (INSERT-only — never updated)
    const snapshot = await this.snapshotRepo.create({
      tenantId:      input.tenantId,
      ruleId:        '00000000-0000-0000-0000-000000000000',  // placeholder — no rule evaluated
      ruleVersion:   '0.0.0',                                  // placeholder
      subjectType:   'decision',
      subjectId:     '00000000-0000-0000-0000-000000000000',  // populated by rule evaluation batch
      outcome,
      inputContext:  {
        tenantId:        input.tenantId,
        moduleId:        input.moduleId,
        productId:       input.productId,
        transactionType: input.transactionType,
        amountMinor:     input.amountMinor,
        currency:        input.currency,
        country:         input.country,
        metadata:        input.metadata,
        requestedAt:     input.requestedAt.toISOString(),
      },
      resultPayload: {
        outcome,
        reason,
        productEligible,
        appliedPolicyIds,
        resolvedPackageId: packageVersion?.id ?? null,
        generatedAt:       generatedAt.toISOString(),
        stepTrace:         ctx.stepTrace,
      },
      evaluatedById: input.actorId,
    });

    ctx.stepTrace.push({
      step:   CommercialPipelineStep.GENERATE_SNAPSHOT,
      ok:     true,
      detail: `snapshot written id=${snapshot.id}`,
    });

    return {
      decisionId:     snapshot.id,
      tenantId:       input.tenantId,
      moduleId:       input.moduleId,
      productId:      input.productId,
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

  // ── Private helpers ───────────────────────────────────────────────────────

  private snapshotToResult(
    snapshot: CommercialDecisionSnapshotEntity,
    input:    Record<string, unknown>,
  ): CommercialDecisionResult {
    const payload = snapshot.resultPayload as Record<string, unknown>;
    return {
      decisionId:      snapshot.id,
      tenantId:        snapshot.tenantId ?? '',
      moduleId:        (input['moduleId'] as string) ?? '',
      productId:       (input['productId'] as string) ?? '',
      transactionType: (input['transactionType'] as TransactionType) ?? TransactionType.BOOKING,
      outcome:         snapshot.outcome,
      reason:          (payload['reason'] as string) ?? '',
      resolvedPackage: (payload['resolvedPackageId'] as string | null)
        ? { slug: 'unknown', version: 'unknown' }
        : null,
      productEligible:  Boolean(payload['productEligible']),
      appliedPolicyIds: (payload['appliedPolicyIds'] as string[]) ?? [],
      snapshot,
      generatedAt:     snapshot.createdAt,
      stepTrace:       (payload['stepTrace'] as CommercialDecisionResult['stepTrace']) ?? [],
    };
  }
}
