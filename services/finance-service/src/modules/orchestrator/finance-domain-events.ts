/**
 * finance-domain-events.ts
 *
 * Finance domain events emitted by the Financial Transaction Orchestrator.
 *
 * Events are immutable plain objects — no transport metadata,
 * no broker-specific fields, no serialization details.
 * Infrastructure adapters add transport metadata at publication time.
 *
 * Field conventions:
 *   eventId:          Stable UUID identifying this event instance.
 *   aggregateId:      ID of the aggregate this event concerns.
 *   aggregateVersion: Monotonic version (1 = first event on this aggregate).
 *   occurredAt:       ISO-8601 wall clock when the business event occurred.
 *   correlationId:    Traces a request chain across services.
 *   causationId:      The command or event that directly caused this event.
 */

// ── Event type constants ──────────────────────────────────────────────────────

export const OrchestratorEvents = {
  TRANSACTION_POSTED:     'spancle.finance.orchestrator.transaction_posted',
  POSTING_COMPLETED:      'spancle.finance.orchestrator.posting_completed',
  POSTING_FAILED:         'spancle.finance.orchestrator.posting_failed',
  POSTING_REJECTED:       'spancle.finance.orchestrator.posting_rejected',
  RESOLUTION_FAILED:      'spancle.finance.orchestrator.resolution_failed',
  VALIDATION_FAILED:      'spancle.finance.orchestrator.validation_failed',
} as const;

export type OrchestratorEventType =
  typeof OrchestratorEvents[keyof typeof OrchestratorEvents];

// ── Base event ────────────────────────────────────────────────────────────────

export interface FinanceDomainEvent {
  readonly eventId:          string;
  readonly eventType:        OrchestratorEventType;
  readonly aggregateId:      string;
  readonly aggregateVersion: number;
  readonly occurredAt:       string;   // ISO-8601
  readonly correlationId:    string;
  readonly causationId:      string;
}

// ── FinancialTransactionPosted ────────────────────────────────────────────────

export interface FinancialTransactionPosted extends FinanceDomainEvent {
  readonly eventType:        typeof OrchestratorEvents.TRANSACTION_POSTED;
  readonly transactionId:    string;
  readonly tenantId:         string;
  readonly accountingPeriod: string;
  readonly currency:         string;
  readonly totalDebitMinor:  number;
  readonly entryCount:       number;
  readonly sourceReference:  string;
}

// ── LedgerPostingCompleted ────────────────────────────────────────────────────

export interface LedgerPostingCompleted extends FinanceDomainEvent {
  readonly eventType:     typeof OrchestratorEvents.POSTING_COMPLETED;
  readonly transactionId: string;
  readonly tenantId:      string;
  readonly entryIds:      ReadonlyArray<string>;
  readonly postedAt:      string;
}

// ── LedgerPostingFailed ───────────────────────────────────────────────────────

export interface LedgerPostingFailed extends FinanceDomainEvent {
  readonly eventType:  typeof OrchestratorEvents.POSTING_FAILED;
  readonly tenantId:   string;
  readonly reason:     string;
  readonly errorCount: number;
}

// ── PostingRejected ───────────────────────────────────────────────────────────

export interface PostingRejected extends FinanceDomainEvent {
  readonly eventType:   typeof OrchestratorEvents.POSTING_REJECTED;
  readonly tenantId:    string;
  readonly reason:      string;
  readonly commandKind: string;
}

// ── Union ─────────────────────────────────────────────────────────────────────

export type OrchestratorDomainEvent =
  | FinancialTransactionPosted
  | LedgerPostingCompleted
  | LedgerPostingFailed
  | PostingRejected;

// ── IFinanceDomainEventPublisher ──────────────────────────────────────────────

/**
 * Finance domain event publisher interface.
 *
 * Infrastructure provides the implementation (Kafka, RabbitMQ, EventEmitter2, etc.).
 * The orchestrator depends only on this interface — never on a specific transport.
 *
 * MUST NOT be implemented inside this module.
 * Register the implementation in the NestJS module via DI token.
 */
export interface IFinanceDomainEventPublisher {
  /**
   * Publishes a single domain event.
   * Fire-and-forget pattern: orchestrator does not await transport confirmation.
   */
  publish(event: Readonly<OrchestratorDomainEvent>): Promise<void>;

  /**
   * Publishes multiple events in order.
   * All events are published before returning.
   */
  publishMany(events: ReadonlyArray<Readonly<OrchestratorDomainEvent>>): Promise<void>;
}

export const FINANCE_DOMAIN_EVENT_PUBLISHER = Symbol('IFinanceDomainEventPublisher');
