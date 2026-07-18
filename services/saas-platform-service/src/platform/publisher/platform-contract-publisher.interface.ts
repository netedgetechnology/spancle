/**
 * platform-contract-publisher.interface.ts
 *
 * Transport-agnostic publisher interface for platform contracts.
 *
 * Implementations (RabbitMQ, Kafka, NATS, SQS, in-process EventEmitter2, etc.)
 * are registered in the DI container and injected into CommercialDecisionService.
 * Commercial itself never knows which transport adapter is active.
 *
 * NO transport-specific imports here.
 * NO NestJS HTTP imports.
 * NO message-broker imports.
 * NO Finance imports.
 */
import type { PlatformContractEnvelopeData } from '../contracts/platform-contract-envelope';

// ── PublishResult ─────────────────────────────────────────────────────────────

export interface PublishResult {
  /** Whether the envelope was accepted by the underlying transport. */
  readonly success:           boolean;
  /** The contractId of the published envelope. */
  readonly contractId:        string;
  /** Transport-assigned message ID (undefined when transport has no concept of IDs). */
  readonly transportMessageId?: string;
  /** ISO-8601 timestamp of acceptance by the transport. */
  readonly publishedAt:       string;
  /** Rejection reason when success=false. */
  readonly error?:            string;
}

// ── IPlatformContractPublisher ────────────────────────────────────────────────

/**
 * Contract:
 *   publish()   — emit a frozen envelope to the platform event bus
 *   validate()  — validate the envelope before publishing (separate from publish)
 *   serialize() — produce the canonical wire-format string for this envelope
 *
 * Implementations must:
 *   - Be idempotent within the same contractId (deduplication responsibility)
 *   - Emit COMMERCIAL_CONTRACT_PUBLISHED or COMMERCIAL_CONTRACT_FAILED platform events
 *   - Never modify the envelope
 *   - Never know the Consumer's identity
 */
export interface IPlatformContractPublisher {
  publish<TPayload>(
    envelope: Readonly<PlatformContractEnvelopeData<TPayload>>,
  ): Promise<PublishResult>;

  validate<TPayload>(
    envelope: Readonly<PlatformContractEnvelopeData<TPayload>>,
  ): { valid: boolean; errors: string[] };

  serialize<TPayload>(
    envelope: Readonly<PlatformContractEnvelopeData<TPayload>>,
  ): string;
}

export const PLATFORM_CONTRACT_PUBLISHER = Symbol('IPlatformContractPublisher');
