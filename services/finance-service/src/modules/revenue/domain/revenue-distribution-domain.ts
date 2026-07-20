/**
 * revenue-distribution-domain.ts
 *
 * Revenue Distribution domain events and DistributionResult.
 * Namespace: spancle.finance.revenue.*
 */
import type { RevenueDistribution } from './revenue-distribution.aggregate';

// ── Event type constants ──────────────────────────────────────────────────────

export const RevenueDistributionEventTypes = {
  DISTRIBUTION_CREATED:    'spancle.finance.revenue.distribution_created',
  DISTRIBUTION_CALCULATED: 'spancle.finance.revenue.distribution_calculated',
  DISTRIBUTION_COMPLETED:  'spancle.finance.revenue.distribution_completed',
  DISTRIBUTION_CANCELLED:  'spancle.finance.revenue.distribution_cancelled',
} as const;

export type RevenueDistributionEventType =
  typeof RevenueDistributionEventTypes[keyof typeof RevenueDistributionEventTypes];

// ── Base event ────────────────────────────────────────────────────────────────

export interface RevenueDistributionDomainEvent {
  readonly eventId:        string;
  readonly eventType:      RevenueDistributionEventType;
  readonly distributionId: string;
  readonly tenantId:       string;
  readonly settlementId:   string;
  readonly occurredAt:     string;
  readonly correlationId:  string | null;
}

// ── Specific events ───────────────────────────────────────────────────────────

export interface DistributionCreatedEvent extends RevenueDistributionDomainEvent {
  readonly eventType:          typeof RevenueDistributionEventTypes.DISTRIBUTION_CREATED;
  readonly sourceAmountMinor:  number;
  readonly currency:           string;
}

export interface DistributionCalculatedEvent extends RevenueDistributionDomainEvent {
  readonly eventType:           typeof RevenueDistributionEventTypes.DISTRIBUTION_CALCULATED;
  readonly totalAllocatedMinor: number;
  readonly allocationCount:     number;
  readonly currency:            string;
  readonly version:             number;
}

export interface DistributionCompletedEvent extends RevenueDistributionDomainEvent {
  readonly eventType:       typeof RevenueDistributionEventTypes.DISTRIBUTION_COMPLETED;
  readonly allocationCount: number;
  readonly currency:        string;
  readonly version:         number;
}

export interface DistributionCancelledEvent extends RevenueDistributionDomainEvent {
  readonly eventType: typeof RevenueDistributionEventTypes.DISTRIBUTION_CANCELLED;
  readonly version:   number;
}

// ── Event factories ───────────────────────────────────────────────────────────

function uid(): string { return crypto.randomUUID(); }

export function distributionCreatedEvent(
  d: RevenueDistribution, correlationId: string | null,
): DistributionCreatedEvent {
  return Object.freeze({
    eventId:           uid(),
    eventType:         RevenueDistributionEventTypes.DISTRIBUTION_CREATED,
    distributionId:    d.distributionId,
    tenantId:          d.tenantId,
    settlementId:      d.settlementId,
    occurredAt:        new Date().toISOString(),
    correlationId,
    sourceAmountMinor: d.sourceAmountMinor,
    currency:          d.currency,
  });
}

export function distributionCalculatedEvent(
  d: RevenueDistribution, correlationId: string | null,
): DistributionCalculatedEvent {
  return Object.freeze({
    eventId:              uid(),
    eventType:            RevenueDistributionEventTypes.DISTRIBUTION_CALCULATED,
    distributionId:       d.distributionId,
    tenantId:             d.tenantId,
    settlementId:         d.settlementId,
    occurredAt:           new Date().toISOString(),
    correlationId,
    totalAllocatedMinor:  d.totalAllocatedMinor,
    allocationCount:      d.allocations.length,
    currency:             d.currency,
    version:              d.version,
  });
}

export function distributionCompletedEvent(
  d: RevenueDistribution, correlationId: string | null,
): DistributionCompletedEvent {
  return Object.freeze({
    eventId:          uid(),
    eventType:        RevenueDistributionEventTypes.DISTRIBUTION_COMPLETED,
    distributionId:   d.distributionId,
    tenantId:         d.tenantId,
    settlementId:     d.settlementId,
    occurredAt:       new Date().toISOString(),
    correlationId,
    allocationCount:  d.allocations.length,
    currency:         d.currency,
    version:          d.version,
  });
}

export function distributionCancelledEvent(
  d: RevenueDistribution, correlationId: string | null,
): DistributionCancelledEvent {
  return Object.freeze({
    eventId:        uid(),
    eventType:      RevenueDistributionEventTypes.DISTRIBUTION_CANCELLED,
    distributionId: d.distributionId,
    tenantId:       d.tenantId,
    settlementId:   d.settlementId,
    occurredAt:     new Date().toISOString(),
    correlationId,
    version:        d.version,
  });
}

// ── DistributionResult ────────────────────────────────────────────────────────

export type DistributionRejectionReason =
  | 'OVER_ALLOCATION'          // cumulative total exceeds sourceAmountMinor
  | 'UNBALANCED'               // calculate() called when total ≠ source
  | 'NO_ALLOCATIONS'           // calculate() with empty allocations
  | 'ALREADY_DISTRIBUTED'      // mutation on DISTRIBUTED (terminal)
  | 'ALREADY_CANCELLED'        // mutation on CANCELLED (terminal)
  | 'CURRENCY_MISMATCH'        // allocation currency ≠ distribution currency
  | 'ALLOCATION_NOT_FOUND'     // removeAllocation: ID not found
  | 'NEGATIVE_ALLOCATION'      // amountMinor ≤ 0 in allocation
  | 'INVALID_FIELD';

export interface DistributionError {
  readonly field:   string;
  readonly message: string;
}

export interface DistributionCreatedResult   { readonly kind: 'DistributionCreated';    readonly success: true;  readonly distribution: RevenueDistribution; }
export interface DistributionCalculatedResult{ readonly kind: 'DistributionCalculated'; readonly success: true;  readonly distribution: RevenueDistribution; }
export interface DistributionCompletedResult { readonly kind: 'DistributionCompleted';  readonly success: true;  readonly distribution: RevenueDistribution; }
export interface DistributionCancelledResult { readonly kind: 'DistributionCancelled';  readonly success: true;  readonly distribution: RevenueDistribution; }
export interface DistributionRejectedResult  {
  readonly kind:    'DistributionRejected';
  readonly success: false;
  readonly reason:  DistributionRejectionReason;
  readonly errors:  ReadonlyArray<DistributionError>;
}

export type DistributionResult =
  | DistributionCreatedResult
  | DistributionCalculatedResult
  | DistributionCompletedResult
  | DistributionCancelledResult
  | DistributionRejectedResult;

export const distributionCreated    = (d: RevenueDistribution): DistributionCreatedResult    => Object.freeze({ kind: 'DistributionCreated',    success: true, distribution: d });
export const distributionCalculated = (d: RevenueDistribution): DistributionCalculatedResult => Object.freeze({ kind: 'DistributionCalculated', success: true, distribution: d });
export const distributionCompleted  = (d: RevenueDistribution): DistributionCompletedResult  => Object.freeze({ kind: 'DistributionCompleted',  success: true, distribution: d });
export const distributionCancelled  = (d: RevenueDistribution): DistributionCancelledResult  => Object.freeze({ kind: 'DistributionCancelled',  success: true, distribution: d });

export function distributionRejected(
  reason: DistributionRejectionReason,
  errors: DistributionError[],
): DistributionRejectedResult {
  return Object.freeze({
    kind:    'DistributionRejected',
    success: false,
    reason,
    errors: Object.freeze(errors),
  });
}

export function distributionError(field: string, message: string): DistributionError {
  return Object.freeze({ field, message });
}
