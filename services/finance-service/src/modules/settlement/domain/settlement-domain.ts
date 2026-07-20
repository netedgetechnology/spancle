/**
 * settlement-domain.ts
 *
 * Settlement domain events and SettlementResult.
 *
 * Events: spancle.finance.settlement.* namespace (distinct from PaymentEvents).
 * Results: typed discriminated union — no exceptions for business flow.
 */
import type { Settlement } from './settlement.aggregate';

// ── Event type constants ──────────────────────────────────────────────────────

export const SettlementEventTypes = {
  SETTLEMENT_CREATED:   'spancle.finance.settlement.created',
  SETTLEMENT_COMPLETED: 'spancle.finance.settlement.completed',
  SETTLEMENT_CANCELLED: 'spancle.finance.settlement.cancelled',
  SETTLEMENT_REFUNDED:  'spancle.finance.settlement.refunded',
  SETTLEMENT_PARTIAL:   'spancle.finance.settlement.partial',
} as const;

export type SettlementEventType =
  typeof SettlementEventTypes[keyof typeof SettlementEventTypes];

// ── Base event ────────────────────────────────────────────────────────────────

export interface SettlementDomainEvent {
  readonly eventId:        string;
  readonly eventType:      SettlementEventType;
  readonly settlementId:   string;
  readonly tenantId:       string;
  readonly invoiceId:      string;
  readonly occurredAt:     string;    // ISO-8601
  readonly correlationId:  string | null;
}

// ── Specific events ───────────────────────────────────────────────────────────

export interface SettlementCreatedEvent extends SettlementDomainEvent {
  readonly eventType:        typeof SettlementEventTypes.SETTLEMENT_CREATED;
  readonly amountMinor:      number;
  readonly currency:         string;
  readonly paymentMethod:    string;
  readonly paymentReference: string;
}

export interface SettlementCompletedEvent extends SettlementDomainEvent {
  readonly eventType:            typeof SettlementEventTypes.SETTLEMENT_COMPLETED;
  readonly settledAmountMinor:   number;
  readonly currency:             string;
  readonly settledAt:            string;
  readonly version:              number;
}

export interface SettlementCancelledEvent extends SettlementDomainEvent {
  readonly eventType: typeof SettlementEventTypes.SETTLEMENT_CANCELLED;
  readonly version:   number;
}

export interface SettlementRefundedEvent extends SettlementDomainEvent {
  readonly eventType:          typeof SettlementEventTypes.SETTLEMENT_REFUNDED;
  readonly refundedAmountMinor: number;
  readonly remainingMinor:      number;
  readonly currency:            string;
  readonly version:             number;
}

export interface SettlementPartialEvent extends SettlementDomainEvent {
  readonly eventType:            typeof SettlementEventTypes.SETTLEMENT_PARTIAL;
  readonly settledAmountMinor:   number;
  readonly remainingAmountMinor: number;
  readonly currency:             string;
  readonly version:              number;
}

// ── Event factories ───────────────────────────────────────────────────────────

function uuid(): string { return crypto.randomUUID(); }

export function settlementCreatedEvent(
  s: Settlement, correlationId: string | null,
): SettlementCreatedEvent {
  return Object.freeze({
    eventId:          uuid(),
    eventType:        SettlementEventTypes.SETTLEMENT_CREATED,
    settlementId:     s.settlementId,
    tenantId:         s.tenantId,
    invoiceId:        s.invoiceId,
    occurredAt:       new Date().toISOString(),
    correlationId,
    amountMinor:      s.amountMinor,
    currency:         s.currency,
    paymentMethod:    s.paymentMethod,
    paymentReference: s.paymentReference,
  });
}

export function settlementCompletedEvent(
  s: Settlement, correlationId: string | null,
): SettlementCompletedEvent {
  return Object.freeze({
    eventId:          uuid(),
    eventType:        SettlementEventTypes.SETTLEMENT_COMPLETED,
    settlementId:     s.settlementId,
    tenantId:         s.tenantId,
    invoiceId:        s.invoiceId,
    occurredAt:       new Date().toISOString(),
    correlationId,
    settledAmountMinor: s.settledAmountMinor,
    currency:         s.currency,
    settledAt:        s.settledAt ?? new Date().toISOString(),
    version:          s.version,
  });
}

export function settlementCancelledEvent(
  s: Settlement, correlationId: string | null,
): SettlementCancelledEvent {
  return Object.freeze({
    eventId:      uuid(),
    eventType:    SettlementEventTypes.SETTLEMENT_CANCELLED,
    settlementId: s.settlementId,
    tenantId:     s.tenantId,
    invoiceId:    s.invoiceId,
    occurredAt:   new Date().toISOString(),
    correlationId,
    version:      s.version,
  });
}

export function settlementRefundedEvent(
  s:              Settlement,
  refundedMinor:  number,
  correlationId:  string | null,
): SettlementRefundedEvent {
  return Object.freeze({
    eventId:              uuid(),
    eventType:            SettlementEventTypes.SETTLEMENT_REFUNDED,
    settlementId:         s.settlementId,
    tenantId:             s.tenantId,
    invoiceId:            s.invoiceId,
    occurredAt:           new Date().toISOString(),
    correlationId,
    refundedAmountMinor:  refundedMinor,
    remainingMinor:       s.remainingAmountMinor,
    currency:             s.currency,
    version:              s.version,
  });
}

export function settlementPartialEvent(
  s: Settlement, correlationId: string | null,
): SettlementPartialEvent {
  return Object.freeze({
    eventId:              uuid(),
    eventType:            SettlementEventTypes.SETTLEMENT_PARTIAL,
    settlementId:         s.settlementId,
    tenantId:             s.tenantId,
    invoiceId:            s.invoiceId,
    occurredAt:           new Date().toISOString(),
    correlationId,
    settledAmountMinor:   s.settledAmountMinor,
    remainingAmountMinor: s.remainingAmountMinor,
    currency:             s.currency,
    version:              s.version,
  });
}

// ── SettlementResult ──────────────────────────────────────────────────────────

export type SettlementRejectionReason =
  | 'OVERPAYMENT'              // payment exceeds invoice amount
  | 'INVALID_AMOUNT'           // non-positive or non-integer amount
  | 'ALREADY_CANCELLED'        // operation on a cancelled settlement
  | 'ALREADY_REFUNDED'         // operation on a terminal refunded settlement
  | 'CANNOT_CANCEL_SETTLED'    // settled settlement must be refunded, not cancelled
  | 'REFUND_EXCEEDS_SETTLED'   // refund amount > settled amount
  | 'NOT_SETTLED'              // refund attempted on non-SETTLED settlement
  | 'INVALID_FIELD';           // missing or malformed required field

export interface SettlementError {
  readonly field:   string;
  readonly message: string;
}

// Success variants
export interface SettlementCreatedResult {
  readonly kind:       'SettlementCreated';
  readonly success:    true;
  readonly settlement: Settlement;
}
export interface SettlementUpdatedResult {
  readonly kind:       'SettlementUpdated';
  readonly success:    true;
  readonly settlement: Settlement;
}
export interface SettlementCompletedResult {
  readonly kind:       'SettlementCompleted';
  readonly success:    true;
  readonly settlement: Settlement;
}
export interface SettlementCancelledResult {
  readonly kind:       'SettlementCancelled';
  readonly success:    true;
  readonly settlement: Settlement;
}
export interface SettlementRefundedResult {
  readonly kind:       'SettlementRefunded';
  readonly success:    true;
  readonly settlement: Settlement;
}

// Failure
export interface SettlementRejectedResult {
  readonly kind:    'SettlementRejected';
  readonly success: false;
  readonly reason:  SettlementRejectionReason;
  readonly errors:  ReadonlyArray<SettlementError>;
}

export type SettlementResult =
  | SettlementCreatedResult
  | SettlementUpdatedResult
  | SettlementCompletedResult
  | SettlementCancelledResult
  | SettlementRefundedResult
  | SettlementRejectedResult;

// Factories
export const settlementCreated    = (s: Settlement): SettlementCreatedResult   => Object.freeze({ kind: 'SettlementCreated',   success: true, settlement: s });
export const settlementUpdated    = (s: Settlement): SettlementUpdatedResult   => Object.freeze({ kind: 'SettlementUpdated',   success: true, settlement: s });
export const settlementCompleted  = (s: Settlement): SettlementCompletedResult => Object.freeze({ kind: 'SettlementCompleted', success: true, settlement: s });
export const settlementCancelled  = (s: Settlement): SettlementCancelledResult => Object.freeze({ kind: 'SettlementCancelled', success: true, settlement: s });
export const settlementRefunded   = (s: Settlement): SettlementRefundedResult  => Object.freeze({ kind: 'SettlementRefunded',  success: true, settlement: s });

export function settlementRejected(
  reason: SettlementRejectionReason,
  errors: SettlementError[],
): SettlementRejectedResult {
  return Object.freeze({
    kind:    'SettlementRejected',
    success: false,
    reason,
    errors:  Object.freeze(errors),
  });
}

export function settlementError(field: string, message: string): SettlementError {
  return Object.freeze({ field, message });
}
