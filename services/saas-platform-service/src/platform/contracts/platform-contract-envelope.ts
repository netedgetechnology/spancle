/**
 * platform-contract-envelope.ts
 *
 * Immutable envelope that wraps any platform contract for cross-service delivery.
 *
 * The envelope carries routing, versioning, idempotency, and delivery metadata
 * separately from the payload. Consumers route on eventType; they validate
 * schemaVersion; they deduplicate on deduplicationKey.
 *
 * No transport dependency. No Finance dependency. No HTTP.
 * This is a pure data structure with no behavior beyond construction.
 *
 * All fields are readonly. Instances are created via PlatformContractEnvelope.create().
 */
import type { PlatformEventType } from '../events/platform-event-types';

// ── DeliveryMetadata ──────────────────────────────────────────────────────────

export type DeliveryMode = 'AT_LEAST_ONCE' | 'AT_MOST_ONCE' | 'EXACTLY_ONCE';
export type EnvelopePriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export interface DeliveryMetadata {
  /** Number of delivery attempts so far. 0 = first attempt. */
  readonly retryCount:       number;
  readonly priority:         EnvelopePriority;
  readonly deliveryMode:     DeliveryMode;
  /**
   * ISO-8601 expiry timestamp. After this time the envelope should be discarded.
   * Null = no expiry.
   */
  readonly expiresAt:        string | null;
  /** SemVer of the producing service at time of emission. */
  readonly producerVersion:  string;
}

// ── IdempotencyMetadata ───────────────────────────────────────────────────────

export interface IdempotencyMetadata {
  /**
   * Stable unique identifier for this contract instance.
   * Format: <eventType>-<uuid>
   * Consumers use this to deduplicate across retries.
   */
  readonly contractId:       string;
  /**
   * Human/business idempotency key. Derived from the payload's natural identity.
   * e.g. "commercial-decision-{tenantId}-{decisionId}"
   */
  readonly deduplicationKey: string;
  /**
   * Correlates related envelopes across a request chain.
   * All envelopes in a single decision flow share the same correlationId.
   */
  readonly correlationId:    string;
  /** Wall-clock ISO-8601 timestamp when the event occurred (business time). */
  readonly occurredAt:       string;
}

// ── PlatformContractEnvelope ──────────────────────────────────────────────────

export interface PlatformContractEnvelopeData<TPayload = unknown> {
  /** Stable unique envelope ID (uuid v4). */
  readonly contractId:       string;
  /** SemVer of the commercial contract schema. e.g. "1.0.0" */
  readonly contractVersion:  string;
  /** SemVer of the platform envelope format itself. */
  readonly schemaVersion:    string;
  /** Canonical event type from PlatformEventTypes. */
  readonly eventType:        PlatformEventType;
  /**
   * Originating service identifier.
   * Format: spancle.<service-name>  e.g. "spancle.saas-platform"
   */
  readonly sourceService:    string;
  /** @see IdempotencyMetadata.correlationId */
  readonly correlationId:    string;
  /**
   * Distributed trace ID for observability tooling (Jaeger, Datadog, etc.).
   * May equal correlationId when no external trace context is available.
   */
  readonly traceId:          string;
  /** @see IdempotencyMetadata.deduplicationKey */
  readonly deduplicationKey: string;
  /** ISO-8601 business time of the event. */
  readonly occurredAt:       string;
  readonly priority:         EnvelopePriority;
  readonly deliveryMode:     DeliveryMode;
  readonly delivery:         Readonly<DeliveryMetadata>;
  readonly idempotency:      Readonly<IdempotencyMetadata>;
  /** The domain contract payload. Immutable. JSON-serializable. */
  readonly payload:          Readonly<TPayload>;
}

// ── Envelope construction ─────────────────────────────────────────────────────

export const PLATFORM_SCHEMA_VERSION = '1.0.0' as const;
export const PLATFORM_SOURCE_SERVICE  = 'spancle.saas-platform' as const;

export interface CreateEnvelopeInput<TPayload> {
  contractId:       string;
  contractVersion:  string;
  eventType:        PlatformEventType;
  correlationId:    string;
  traceId:          string;
  deduplicationKey: string;
  occurredAt:       string;
  priority?:        EnvelopePriority;
  deliveryMode?:    DeliveryMode;
  producerVersion:  string;
  payload:          TPayload;
  expiresAt?:       string | null;
}

/**
 * Creates and freezes a PlatformContractEnvelope.
 * Returns a deeply frozen readonly object safe for cross-service serialization.
 */
export function createEnvelope<TPayload>(
  input: CreateEnvelopeInput<TPayload>,
): Readonly<PlatformContractEnvelopeData<TPayload>> {
  const priority     = input.priority     ?? 'NORMAL';
  const deliveryMode = input.deliveryMode ?? 'AT_LEAST_ONCE';

  const delivery: DeliveryMetadata = Object.freeze({
    retryCount:      0,
    priority,
    deliveryMode,
    expiresAt:       input.expiresAt ?? null,
    producerVersion: input.producerVersion,
  });

  const idempotency: IdempotencyMetadata = Object.freeze({
    contractId:       input.contractId,
    deduplicationKey: input.deduplicationKey,
    correlationId:    input.correlationId,
    occurredAt:       input.occurredAt,
  });

  const envelope: PlatformContractEnvelopeData<TPayload> = {
    contractId:       input.contractId,
    contractVersion:  input.contractVersion,
    schemaVersion:    PLATFORM_SCHEMA_VERSION,
    eventType:        input.eventType,
    sourceService:    PLATFORM_SOURCE_SERVICE,
    correlationId:    input.correlationId,
    traceId:          input.traceId,
    deduplicationKey: input.deduplicationKey,
    occurredAt:       input.occurredAt,
    priority,
    deliveryMode,
    delivery,
    idempotency,
    payload:          Object.freeze(input.payload) as Readonly<TPayload>,
  };

  return Object.freeze(envelope);
}
