/**
 * commercial-decision.interfaces.ts
 *
 * Service contract for the Commercial Decision Framework.
 * All models are plain interfaces — no class-validator decorators here.
 * Validation is applied in DTOs; interfaces are used internally.
 */
import type { CommercialDecisionOutcome, CommercialPipelineStep, TransactionType } from '../enums/commercial.enums';
import type { CommercialDecisionSnapshotEntity } from '../entities/commercial-snapshot-and-package.entity';
import type { PackageVersionEntity } from '../entities/commercial-snapshot-and-package.entity';
import type { CommercialProductEntity } from '../entities/commercial-product-module-pricing.entity';
import type { PaymentOwnershipPolicyEntity } from '../entities/commercial-policy-gateway-flag-audit.entity';
import type { RevenueDistributionPolicyEntity } from '../entities/commercial-policy-gateway-flag-audit.entity';

// ── CommercialDecisionContext ─────────────────────────────────────────────────

/**
 * The input context for a commercial decision evaluation.
 *
 * Passed through every pipeline step unchanged.
 * All monetary amounts are integer minor currency units.
 */
export interface CommercialDecisionContext {
  /** Tenant requesting the decision. Required for tenant-scoped rule resolution. */
  tenantId: string;

  /** Module key that triggered the decision, e.g. 'booking', 'tournaments'. */
  moduleId: string;

  /**
   * Product SKU or UUID being evaluated.
   * The pipeline resolves this to a CommercialProductEntity.
   */
  productId: string;

  /** Type of transaction driving this decision. */
  transactionType: TransactionType;

  /**
   * Transaction amount in minor currency units (INT only).
   * Zero is allowed (e.g. free products, trials).
   */
  amountMinor: number;

  /** ISO 4217 currency code, e.g. 'GBP', 'INR', 'USD'. */
  currency: string;

  /** ISO 3166-1 alpha-2 country code, e.g. 'GB', 'IN'. */
  country: string;

  /**
   * Arbitrary caller-supplied metadata.
   * Pipeline steps may read but MUST NOT mutate this field.
   */
  metadata: Record<string, unknown>;

  /** Actor UUID initiating the request. May be null for system-triggered decisions. */
  actorId: string | null;

  /** Wall-clock timestamp the decision was requested. Set by the service, not the caller. */
  requestedAt: Date;
}

// ── ResolvedPipelineContext ───────────────────────────────────────────────────

/**
 * Internal mutable context built up as the pipeline steps execute.
 * Not exposed outside the service layer.
 */
export interface ResolvedPipelineContext {
  input:                CommercialDecisionContext;
  packageVersion:       PackageVersionEntity | null;
  product:              CommercialProductEntity | null;
  ownershipPolicies:    PaymentOwnershipPolicyEntity[];
  distributionPolicies: RevenueDistributionPolicyEntity[];
  /** Ordered record of which steps have run and whether each passed. */
  stepTrace:            Array<{ step: CommercialPipelineStep; ok: boolean; detail?: string }>;
}

// ── CommercialDecisionResult ──────────────────────────────────────────────────

/**
 * The output of a commercial decision evaluation.
 *
 * Contains the immutable snapshot reference plus a machine-readable summary.
 * Pricing and commission fields are intentionally absent — those are
 * populated by downstream pricing and distribution services.
 */
export interface CommercialDecisionResult {
  /** Unique decision ID — matches CommercialDecisionSnapshotEntity.id. */
  decisionId: string;

  tenantId:       string;
  moduleId:       string;
  productId:      string;
  transactionType: TransactionType;
  outcome:        CommercialDecisionOutcome;

  /** Human-readable summary of the outcome reason. */
  reason: string;

  /**
   * Resolved package version slug and semver used for this decision.
   * Null when no package version could be resolved.
   */
  resolvedPackage: { slug: string; version: string } | null;

  /**
   * Whether the resolved product is active and eligible.
   * False blocks the transaction even when outcome = ALLOWED.
   */
  productEligible: boolean;

  /**
   * Snapshot of the resolved policies applied.
   * No pricing values — policy identifiers only.
   */
  appliedPolicyIds: string[];

  /** The durable immutable audit record. */
  snapshot: CommercialDecisionSnapshotEntity;

  /** Wall-clock time at which the decision was generated. */
  generatedAt: Date;

  /** Pipeline step trace for debugging and observability. */
  stepTrace: Array<{ step: CommercialPipelineStep; ok: boolean; detail?: string }>;
}

// ── ICommercialDecisionService ────────────────────────────────────────────────

/**
 * Service contract for the Commercial Decision Framework.
 *
 * Implementations must:
 *   - Execute the full evaluation pipeline for every request.
 *   - Write an immutable CommercialDecisionSnapshot before returning.
 *   - Emit CommercialEvents.DECISION_GENERATED on success.
 *   - Emit CommercialEvents.DECISION_FAILED on unrecoverable pipeline error.
 *   - Never perform pricing calculations.
 *   - Never call gateway SDKs.
 *   - Never depend on BookingModule or FinanceModule.
 */
export interface ICommercialDecisionService {
  /**
   * Evaluate a commercial decision for the given context.
   *
   * The pipeline steps in order:
   *   1. VALIDATE_REQUEST   — guard against malformed input
   *   2. RESOLVE_PACKAGE    — find active PackageVersion for tenant
   *   3. RESOLVE_PRODUCT    — find CommercialProduct by productId
   *   4. RESOLVE_POLICIES   — load applicable ownership + distribution policies
   *   5. GENERATE_SNAPSHOT  — write immutable audit record, build result
   *
   * Throws UnprocessableEntityException if the pipeline cannot recover.
   */
  evaluate(context: CommercialDecisionContext): Promise<CommercialDecisionResult>;

  /**
   * Retrieve a previously generated decision by its snapshot ID.
   * Returns null when no snapshot exists for the given tenant + id pair.
   */
  findDecision(
    decisionId: string,
    tenantId:   string,
  ): Promise<CommercialDecisionResult | null>;
}

export const COMMERCIAL_DECISION_SERVICE = Symbol('ICommercialDecisionService');
