import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService }  from '@nestjs/config';
import { EventEmitter2 }  from '@nestjs/event-emitter';
import Redis              from 'ioredis';
import {
  parseEnvelope,
  EventRegistry,
} from '@spancle/event-contracts';

/**
 * RedisEventBusSubscriber (communication-service)
 *
 * Subscribes to Redis Pub/Sub channels and re-dispatches each event
 * through the local EventEmitter2 bus so that communication-service
 * listeners can use the standard @OnEvent() decorator without knowing
 * whether an event arrived in-process or from Redis.
 *
 * Architecture:
 *   Redis Pub/Sub → parseEnvelope() → EventEmitter2.emit(channel, envelope)
 *   └─ @OnEvent('spancle.booking.confirmed') handlers fire normally
 *
 * Channels subscribed:
 *   spancle.booking.confirmed   (BOOKING_CONFIRMED)
 *   spancle.payment.succeeded   (PAYMENT_SUCCEEDED)
 *   spancle.payment.failed      (PAYMENT_FAILED)
 *
 * Isolation:
 *   - Separate Redis connection from publisher (ioredis requires separate
 *     clients for subscribe mode — a subscribed connection cannot PUBLISH).
 *   - Message parsing errors are logged and dropped; malformed events
 *     never reach application handlers.
 *   - Envelope validation via parseEnvelope() rejects non-conforming messages
 *     (wrong schema, missing tenantId, etc.) before dispatch.
 *
 * Configuration:
 *   REDIS_URL (required)
 */
@Injectable()
export class RedisEventBusSubscriber implements OnModuleInit, OnModuleDestroy {
  private readonly logger  = new Logger(RedisEventBusSubscriber.name);
  private subscriber!: Redis;

  /** Channels this service cares about receiving. */
  private readonly CHANNELS = [
    EventRegistry.BOOKING_CONFIRMED,
    EventRegistry.BOOKING_CANCELLED,
    EventRegistry.BOOKING_RESCHEDULED,
    EventRegistry.BOOKING_EXPIRED,
    EventRegistry.BOOKING_REMINDER_24H,
    EventRegistry.BOOKING_REMINDER_2H,
    EventRegistry.WAITLIST_PROMOTED,
    EventRegistry.PAYMENT_SUCCEEDED,
    EventRegistry.PAYMENT_FAILED,
    EventRegistry.MEMBERSHIP_EXPIRY_REMINDER,
  ] as const;

  constructor(
    private readonly config:       ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.getOrThrow<string>('REDIS_URL');
    this.subscriber = new Redis(url, {
      lazyConnect:           true,
      enableReadyCheck:      true,
      maxRetriesPerRequest:  3,
      retryStrategy: (times) => Math.min(times * 200, 5_000),
    });

    this.subscriber.on('error', (err: Error) =>
      this.logger.error(`RedisEventBusSubscriber connection error: ${err.message}`),
    );
    this.subscriber.on('connect', () =>
      this.logger.log(`RedisEventBusSubscriber connected — subscribing to ${this.CHANNELS.length} channels`),
    );

    this.subscriber.on('message', (channel: string, message: string) => {
      this.handleMessage(channel, message);
    });

    await this.subscriber.connect();
    await this.subscriber.subscribe(...this.CHANNELS);

    this.logger.log(`Subscribed to: [${this.CHANNELS.join(', ')}]`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.subscriber.unsubscribe(...this.CHANNELS);
    await this.subscriber.quit();
  }

  // ── Message handler ───────────────────────────────────────────────────────

  private handleMessage(channel: string, raw: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      this.logger.warn(`Received non-JSON message on channel=${channel} — discarding`);
      return;
    }

    // Validate against EventEnvelope schema — rejects any non-conforming message
    const envelope = parseEnvelope(parsed);
    if (!envelope) {
      this.logger.warn(
        `Invalid EventEnvelope on channel=${channel} — discarding`,
      );
      return;
    }

    // Tenant isolation: ensure tenantId is present in every dispatched event
    if (!envelope.tenantId) {
      this.logger.warn(
        `EventEnvelope missing tenantId on channel=${channel} id=${envelope.id} — discarding`,
      );
      return;
    }

    this.logger.debug(
      `Received — channel=${channel} id=${envelope.id} ` +
      `tenant=${envelope.tenantId} producer=${envelope.producer}`,
    );

    // Re-emit on local EventEmitter2 bus — @OnEvent() handlers pick this up.
    // Pass the full envelope so handlers have access to correlationId, producer, etc.
    this.eventEmitter.emit(channel, envelope);
  }
}
