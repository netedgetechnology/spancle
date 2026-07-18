/**
 * platform-contract-receiver.interface.ts
 *
 * Transport-agnostic receiver interface for platform contracts.
 *
 * Implementations handle receipt from RabbitMQ, Kafka, SQS, HTTP webhooks,
 * or in-process EventEmitter2 without the receiver knowing which transport
 * delivered the envelope.
 *
 * NO transport-specific imports.
 * NO NestJS HTTP imports.
 * NO Finance imports.
 */
import type { PlatformContractEnvelopeData } from '../contracts/platform-contract-envelope';

// ── ReceiveResult ─────────────────────────────────────────────────────────────

export type ReceiveOutcome = 'PROCESSED' | 'DUPLICATE' | 'INCOMPATIBLE_VERSION' | 'REJECTED';

export interface ReceiveResult {
  readonly outcome:       ReceiveOutcome;
  readonly contractId:    string;
  readonly processedAt?:  string;
  readonly reason?:       string;
}

// ── IPlatformContractReceiver ─────────────────────────────────────────────────

/**
 * Contract:
 *   receive()     — process a deserialized envelope from any transport
 *   validate()    — validate before processing (version, schema, required fields)
 *   acknowledge() — signal to the transport that the envelope was handled
 *
 * Implementations must:
 *   - Check schemaVersion via isPlatformVersionCompatible() before processing
 *   - Check deduplicationKey against an idempotency store before processing
 *   - Return DUPLICATE when already processed
 *   - Return INCOMPATIBLE_VERSION when version check fails (dead-letter)
 *   - Never call Commercial services directly — envelopes are data-only
 */
export interface IPlatformContractReceiver<TPayload = unknown> {
  receive(
    envelope: Readonly<PlatformContractEnvelopeData<TPayload>>,
  ): Promise<ReceiveResult>;

  validate(
    envelope: Readonly<PlatformContractEnvelopeData<TPayload>>,
  ): { valid: boolean; errors: string[] };

  /**
   * Acknowledges or negatively acknowledges the transport delivery.
   * @param contractId — the envelope to ack/nack
   * @param success    — true = ack (processed), false = nack (retry/dlq)
   */
  acknowledge(contractId: string, success: boolean): Promise<void>;
}

export const PLATFORM_CONTRACT_RECEIVER = Symbol('IPlatformContractReceiver');
