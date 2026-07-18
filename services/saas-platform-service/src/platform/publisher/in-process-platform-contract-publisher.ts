/**
 * in-process-platform-contract-publisher.ts
 *
 * In-process adapter for IPlatformContractPublisher.
 *
 * Implements the publisher interface using EventEmitter2 for local
 * (same-process) delivery. This is the initial adapter — it is replaced
 * by a message-broker adapter (RabbitMQ, Kafka, etc.) in production
 * by changing the DI registration in PlatformModule, without touching
 * any Commercial code.
 *
 * Commercial depends only on IPlatformContractPublisher — never on this class.
 */
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 }      from '@nestjs/event-emitter';
import type {
  IPlatformContractPublisher,
  PublishResult,
} from './platform-contract-publisher.interface';
import type { PlatformContractEnvelopeData } from '../contracts/platform-contract-envelope';
import { PlatformContractSerializer }        from '../serialization/platform-contract-serializer';
import { PlatformEventTypes }                from '../events/platform-event-types';

@Injectable()
export class InProcessPlatformContractPublisher implements IPlatformContractPublisher {
  private readonly logger = new Logger(InProcessPlatformContractPublisher.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async publish<TPayload>(
    envelope: Readonly<PlatformContractEnvelopeData<TPayload>>,
  ): Promise<PublishResult> {
    const publishedAt = new Date().toISOString();
    const validation  = this.validate(envelope);

    if (!validation.valid) {
      this.logger.error(
        `publish: invalid envelope ${envelope.contractId} — ${validation.errors.join('; ')}`,
      );
      await this.eventEmitter.emitAsync(PlatformEventTypes.COMMERCIAL_CONTRACT_FAILED, {
        contractId:  envelope.contractId,
        errors:      validation.errors,
        occurredAt:  publishedAt,
      });
      return {
        success:    false,
        contractId: envelope.contractId,
        publishedAt,
        error:      validation.errors.join('; '),
      };
    }

    try {
      await this.eventEmitter.emitAsync(envelope.eventType, envelope);

      await this.eventEmitter.emitAsync(PlatformEventTypes.COMMERCIAL_CONTRACT_PUBLISHED, {
        contractId:       envelope.contractId,
        contractVersion:  envelope.contractVersion,
        eventType:        envelope.eventType,
        deduplicationKey: envelope.deduplicationKey,
        publishedAt,
      });

      this.logger.debug(
        `publish: ${envelope.eventType} contractId=${envelope.contractId} ` +
        `dedup=${envelope.deduplicationKey}`,
      );

      return {
        success:    true,
        contractId: envelope.contractId,
        publishedAt,
      };
    } catch (err) {
      const msg = (err as Error).message ?? 'unknown';
      this.logger.error(`publish: emitAsync failed for ${envelope.contractId} — ${msg}`);
      return {
        success:    false,
        contractId: envelope.contractId,
        publishedAt,
        error:      msg,
      };
    }
  }

  validate<TPayload>(
    envelope: Readonly<PlatformContractEnvelopeData<TPayload>>,
  ): { valid: boolean; errors: string[] } {
    return PlatformContractSerializer.validate(envelope);
  }

  serialize<TPayload>(
    envelope: Readonly<PlatformContractEnvelopeData<TPayload>>,
  ): string {
    return PlatformContractSerializer.serialize(envelope);
  }
}
