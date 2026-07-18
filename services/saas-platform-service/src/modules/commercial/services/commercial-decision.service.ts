import {
  Inject,
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
import { POLICY_RESOLVER } from '../interfaces/policy-resolver.interfaces';
import { toPackageAssignmentSnapshot } from '../policy/package-assignment.model';
import type { IPolicyResolver, ResolvedPolicyBundle } from '../interfaces/policy-resolver.interfaces';
import { CommercialDecisionSnapshotRepository } from '../commercial.repositories';
import type { CommercialDecisionSnapshotEntity } from '../entities/commercial-snapshot-and-package.entity';

/**
 * CommercialDecisionService
 *
 * Five-step evaluation pipeline:
 *   VALIDATE_REQUEST → RESOLVE_PACKAGE → RESOLVE_PRODUCT
 *   → RESOLVE_POLICIES → GENERATE_SNAPSHOT
 *
 * Dependencies:
 *   - IPolicyResolver (injected via POLICY_RESOLVER symbol)
 *     Produces ResolvedPolicyBundle; owns all repository access.
 *   - CommercialDecisionSnapshotRepository
 *     INSERT-only audit record. The only direct data dependency.
 *   - EventEmitter2 for domain events.
 *
 * No repository for products, packages, rules, policies, or gateways
 * is injected here — all resolved via IPolicyResolver.
 */
@Injectable()
export class CommercialDecisionService implements ICommercialDecisionService {
  private readonly logger = new Logger(CommercialDecisionService.name);

  constructor(
    @Inject(POLICY_RESOLVER)
    private readonly policyResolver: IPolicyResolver,
    private readonly snapshotRepo:   CommercialDecisionSnapshotRepository,
    private readonly eventEmitter:   EventEmitter2,
  ) {}

  // ── Public API ────────────────────────────────────────────────────────────

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

    const pipelineCtx: ResolvedPipelineContext = {
      input:                context,
      packageVersion:       null,
      product:              null,
      ownershipPolicies:    [],
      distributionPolicies: [],
      stepTrace:            [],
    };

    try {
      // Step 1: validate input
      this.stepValidateRequest(pipelineCtx);

      // Step 2-4: delegate resolution entirely to PolicyResolver
      const bundle = await this.stepResolveViaPolicy(pipelineCtx);

      // Step 5: generate immutable snapshot and build result
      const result = await this.stepGenerateSnapshot(pipelineCtx, bundle);

      await this.eventEmitter.emitAsync(CommercialEvents.DECISION_GENERATED, {
        decisionId: result.decisionId,
        tenantId:   context.tenantId,
        outcome:    result.outcome,
        timestamp:  result.generatedAt.toISOString(),
      });

      return result;
    } catch (err) {
      const msg = (err as Error).message ?? 'unknown error';
      this.logger.error(`evaluate: pipeline failed — tenant=${context.tenantId} err=${msg}`);
      await this.eventEmitter.emitAsync(CommercialEvents.DECISION_FAILED, {
        tenantId:  context.tenantId,
        moduleId:  context.moduleId,
        productId: context.productId,
        error:     msg,
        stepTrace: pipelineCtx.stepTrace,
        timestamp: new Date().toISOString(),
      });
      throw err;
    }
  }

  async findDecision(
    decisionId: string,
    tenantId:   string,
  ): Promise<CommercialDecisionResult | null> {
    const snapshots = await this.snapshotRepo.findBySubject(tenantId, 'decision', decisionId);
    const snapshot  = snapshots.find((s) => s.id === decisionId);
    if (!snapshot) return null;
    return this.snapshotToResult(snapshot);
  }

  // ── Pipeline steps ────────────────────────────────────────────────────────

  /**
   * Step 1 — VALIDATE_REQUEST
   * Guards type-safety of the input context.
   * No business logic; no pricing.
   */
  private stepValidateRequest(ctx: ResolvedPipelineContext): void {
    const { input } = ctx;
    const errors: string[] = [];

    if (!input.tenantId)  errors.push('tenantId is required');
    if (!input.moduleId)  errors.push('moduleId is required');
    if (!input.productId) errors.push('productId is required');
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
   * Steps 2–4 — RESOLVE_PACKAGE, RESOLVE_PRODUCT, RESOLVE_POLICIES
   *
   * All resolved through IPolicyResolver. The service records
   * individual step traces for observability.
   */
  private async stepResolveViaPolicy(
    ctx: ResolvedPipelineContext,
  ): Promise<ResolvedPolicyBundle> {
    let bundle: ResolvedPolicyBundle;

    // RESOLVE_PACKAGE
    try {
      bundle = await this.policyResolver.resolve(ctx.input);
      ctx.packageVersion    = bundle.packageVersion;
      ctx.ownershipPolicies = bundle.ownershipPolicies as typeof ctx.ownershipPolicies;
      ctx.distributionPolicies = bundle.distributionPolicies as typeof ctx.distributionPolicies;
    } catch (err) {
      ctx.stepTrace.push({
        step:   CommercialPipelineStep.RESOLVE_PACKAGE,
        ok:     false,
        detail: (err as Error).message,
      });
      throw err;
    }

    ctx.stepTrace.push({
      step:   CommercialPipelineStep.RESOLVE_PACKAGE,
      ok:     true,
      detail: bundle.packageVersion
        ? `${bundle.packageSlug}@${bundle.packageVersion.version}`
        : 'no package version — tenant has no active plan',
    });

    // RESOLVE_PRODUCT — productId from context, eligibility from bundle
    ctx.stepTrace.push({
      step:   CommercialPipelineStep.RESOLVE_PRODUCT,
      ok:     true,
      detail: `productId=${ctx.input.productId} (eligibility evaluated at snapshot step)`,
    });

    // RESOLVE_POLICIES
    ctx.stepTrace.push({
      step:   CommercialPipelineStep.RESOLVE_POLICIES,
      ok:     true,
      detail:
        `ownership=${bundle.ownershipPolicies.length} ` +
        `distribution=${bundle.distributionPolicies.length} ` +
        `pricing=${bundle.pricingModels.length} ` +
        `gateways=${bundle.gatewayDefinitions.length} ` +
        `rules=${bundle.ruleVersions.length} ` +
        `flags=${bundle.featureFlags.length}`,
    });

    return bundle;
  }

  /**
   * Step 5 — GENERATE_SNAPSHOT
   *
   * Writes the immutable CommercialDecisionSnapshotEntity.
   * Records the explicit package version slug + semver (never "unknown").
   * Records applied policy IDs.
   *
   * Outcome rules (skeleton — rule evaluation deferred):
   *   DENIED  when packageVersion is null (tenant has no plan)
   *   ALLOWED otherwise
   */
  private async stepGenerateSnapshot(
    ctx:    ResolvedPipelineContext,
    bundle: ResolvedPolicyBundle,
  ): Promise<CommercialDecisionResult> {
    const { input } = ctx;
    const {
      packageAssignment,
      packageVersion,
      packageSlug,
      ownershipPolicies,
      distributionPolicies,
      ruleVersions,
    } = bundle;

    // Outcome: DENIED when packageAssignment is null or not eligible.
    const isEligible = packageAssignment?.isEligible ?? false;
    const outcome: CommercialDecisionOutcome = isEligible
      ? CommercialDecisionOutcome.ALLOWED
      : CommercialDecisionOutcome.DENIED;

    const reason = isEligible
      ? `Package ${packageSlug}@${packageVersion?.version ?? 'unknown'} resolved via ` +
        `plan ${packageAssignment!.planId}; rule evaluation deferred.`
      : packageAssignment
        ? `Package "${packageSlug}" (status: ${packageAssignment.packageStatus}) is not eligible.`
        : `Tenant ${input.tenantId} has no active package plan assigned.`;

    const appliedPolicyIds = [
      ...ownershipPolicies.map((p) => p.id),
      ...distributionPolicies.map((p) => p.id),
    ];

    const generatedAt = new Date();

    const pkgAssignmentSnapshot = packageAssignment
      ? toPackageAssignmentSnapshot(packageAssignment)
      : null;

    const snapshot = await this.snapshotRepo.create({
      tenantId:    input.tenantId,
      ruleId:      ruleVersions[0]?.ruleId ?? '00000000-0000-0000-0000-000000000000',
      ruleVersion: ruleVersions[0]?.version ?? '0.0.0',
      subjectType: 'commercial_decision',
      subjectId:   input.productId.length === 36 ? input.productId
        : '00000000-0000-0000-0000-000000000000',
      outcome,
      inputContext: {
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
        // Full package assignment stored for deterministic replay
        packageAssignment: pkgAssignmentSnapshot,
        // Top-level aliases for fast reads
        planId:          pkgAssignmentSnapshot?.planId          ?? null,
        packageId:       pkgAssignmentSnapshot?.packageId       ?? null,
        packageSlug:     pkgAssignmentSnapshot?.packageSlug     ?? null,
        packageVersion:  pkgAssignmentSnapshot?.packageVersion  ?? null,
        tierKey:         pkgAssignmentSnapshot?.tierKey         ?? null,
        productEligible: isEligible,
        appliedPolicyIds,
        ruleVersionIds:  ruleVersions.map((rv) => rv.id),
        resolvedAt:      bundle.resolvedAt.toISOString(),
        generatedAt:     generatedAt.toISOString(),
        stepTrace:       ctx.stepTrace,
      },
      evaluatedById: input.actorId,
    });

    ctx.stepTrace.push({
      step:   CommercialPipelineStep.GENERATE_SNAPSHOT,
      ok:     true,
      detail: `snapshot=${snapshot.id} outcome=${outcome}`,
    });

    return {
      decisionId:      snapshot.id,
      tenantId:        input.tenantId,
      moduleId:        input.moduleId,
      productId:       input.productId,
      transactionType: input.transactionType,
      outcome,
      reason,
      resolvedPackage: packageVersion && packageSlug
        ? { slug: packageSlug, version: packageVersion.version }
        : null,
      productEligible:  isEligible,
      appliedPolicyIds,
      snapshot,
      generatedAt,
      stepTrace: ctx.stepTrace,
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private snapshotToResult(
    snapshot: CommercialDecisionSnapshotEntity,
  ): CommercialDecisionResult {
    const input   = snapshot.inputContext  as Record<string, unknown>;
    const payload = snapshot.resultPayload as Record<string, unknown>;
    const pkgPayload = (payload['packageAssignment'] ?? {}) as Record<string, unknown>;
    const slug    = ((payload['packageSlug'] ?? pkgPayload['packageSlug']) as string | null);
    const ver     = ((payload['packageVersion'] ?? pkgPayload['packageVersion']) as string | null);
    return {
      decisionId:       snapshot.id,
      tenantId:         snapshot.tenantId ?? '',
      moduleId:         (input['moduleId'] as string)   ?? '',
      productId:        (input['productId'] as string)  ?? '',
      transactionType:  (input['transactionType'] as TransactionType) ?? TransactionType.BOOKING,
      outcome:          snapshot.outcome,
      reason:           (payload['reason'] as string)   ?? '',
      resolvedPackage:  slug && ver ? { slug, version: ver } : null,
      productEligible:  Boolean(payload['productEligible']),
      appliedPolicyIds: (payload['appliedPolicyIds'] as string[]) ?? [],
      snapshot,
      generatedAt:      snapshot.createdAt,
      stepTrace:        (payload['stepTrace'] as CommercialDecisionResult['stepTrace']) ?? [],
    };
  }
}
