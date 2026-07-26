import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService }   from '@nestjs/config';
import Redis               from 'ioredis';
import {
  createEnvelope,
  EventRegistry,
  type EventEnvelope,
} from '@spancle/event-contracts';

/**
 * RedisEventBusPublisher
 *
 * Publishes domain events to Redis Pub/Sub channels so that
 * other services (communication-service, reporting-service) can
 * consume them without being in the same process.
 *
 * Design:
 *   - One Redis connection per service instance (publish-only).
 *   - Each event is wrapped in EventEnvelope before publishing.
 *   - Channels match EventRegistry constants exactly — no string literals.
 *   - Publish errors are logged but never thrown — EventEmitter2 in-process
 *     listeners already handle the primary flow; Redis is additive.
 *
 * Configuration:
 *   REDIS_URL (required) — redis://host:port or rediss://... for TLS
 *
 * Producer name embedded in envelope: 'booking-service'
 */
@Injectable()
export class RedisEventBusPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger   = new Logger(RedisEventBusPublisher.name);
  private client!: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const url = this.config.getOrThrow<string>('REDIS_URL');
    this.client = new Redis(url, {
      lazyConnect:           true,
      enableReadyCheck:      true,
      maxRetriesPerRequest:  3,
      retryStrategy: (times) => Math.min(times * 200, 5_000),
    });

    this.client.on('error', (err: Error) =>
      this.logger.error(`RedisEventBusPublisher connection error: ${err.message}`),
    );
    this.client.on('connect', () =>
      this.logger.log('RedisEventBusPublisher connected'),
    );

    void this.client.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  // ── Core publish ──────────────────────────────────────────────────────────

  /**
   * publish() — wraps payload in EventEnvelope and publishes to Redis.
   *
   * @param channel       EventRegistry constant (e.g. EventRegistry.BOOKING_CONFIRMED)
   * @param tenantId      Tenant that owns this event — preserved in envelope
   * @param payload       Domain-specific payload object
   * @param correlationId Optional: trace ID linking related events
   */
  async publish(
    channel:        string,
    tenantId:       string,
    payload:        Record<string, unknown>,
    correlationId?: string,
  ): Promise<void> {
    const envelope: EventEnvelope = createEnvelope({
      channel,
      tenantId,
      producer:      'booking-service',
      payload,
      correlationId,
    });

    try {
      const serialised = JSON.stringify(envelope);
      await this.client.publish(channel, serialised);
      this.logger.debug(
        `Published — channel=${channel} tenant=${tenantId} id=${envelope.id}`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // Non-fatal: log and continue. In-process EventEmitter2 already fired.
      this.logger.error(
        `Publish failed — channel=${channel} tenant=${tenantId}: ${msg}`,
      );
    }
  }

  // ── Typed publish helpers ─────────────────────────────────────────────────

  /**
   * publishBookingConfirmed()
   *
   * Called by PaymentOrchestratorService.onPaymentCaptured() after
   * BookingService.confirm() succeeds. Bridges the in-process confirmation
   * event to the cross-service Redis channel.
   */
  async publishBookingConfirmed(params: {
    tenantId:        string;
    bookingId:       string;
    actorId?:        string;
    customerEmail?:  string;
    customerName?:   string;
    reference?:      string;
    startsAt?:       string;
    courtId?:        string;
    finalPriceMinor?: number;
    currency?:       string;
    correlationId?:  string;
  }): Promise<void> {
    const { correlationId, tenantId, ...rest } = params;
    await this.publish(
      EventRegistry.BOOKING_CONFIRMED,
      tenantId,
      rest as Record<string, unknown>,
      correlationId,
    );
  }

  /**
   * publishPaymentSucceeded()
   *
   * Called after PaymentService.capture() completes. Carries enough context
   * for communication-service to build a receipt email without a DB call.
   */
  async publishPaymentSucceeded(params: {
    tenantId:         string;
    paymentId:        string;
    bookingId?:       string;
    customerEmail?:   string;
    amountMinor:      number;
    currency:         string;
    gatewayPaymentId?: string;
    reference?:       string;
    correlationId?:   string;
  }): Promise<void> {
    const { correlationId, tenantId, ...rest } = params;
    await this.publish(
      EventRegistry.PAYMENT_SUCCEEDED,
      tenantId,
      rest as Record<string, unknown>,
      correlationId,
    );
  }


  /**
   * publishBookingCancelled()
   *
   * Bridges the in-process BOOKING_CANCELLED event to Redis.
   * Called by a @OnEvent(BookingEvents.CANCELLED) listener in the orchestrator.
   * customerEmail is resolved before calling (lookup from DB by bookingId).
   */
  async publishBookingCancelled(params: {
    tenantId:       string;
    bookingId:      string;
    actorId?:       string;
    customerEmail?: string;
    customerName?:  string;
    reference?:     string;
    reason?:        string;
    correlationId?: string;
  }): Promise<void> {
    const { correlationId, tenantId, ...rest } = params;
    await this.publish(
      EventRegistry.BOOKING_CANCELLED,
      tenantId,
      rest as Record<string, unknown>,
      correlationId,
    );
  }

  /**
   * publishPaymentFailed()
   *
   * Called after PaymentService.fail(). Enables communication-service to
   * send a "payment failed" notification prompting the customer to retry.
   */
  async publishPaymentFailed(params: {
    tenantId:       string;
    paymentId:      string;
    bookingId?:     string;
    customerEmail?: string;
    reason?:        string;
    correlationId?: string;
  }): Promise<void> {
    const { correlationId, tenantId, ...rest } = params;
    await this.publish(
      EventRegistry.PAYMENT_FAILED,
      tenantId,
      rest as Record<string, unknown>,
      correlationId,
    );
  }

  // CB-2 FIX: The following publish helpers were missing, causing BOOKING_RESCHEDULED,
  // BOOKING_EXPIRED, WAITLIST_PROMOTED, and reminder events to never reach the
  // communication-service Redis subscriber.

  /**
   * publishBookingRescheduled()
   *
   * Called by BookingService.reschedule() after the transaction commits.
   * Bridges the in-process BOOKING_RESCHEDULED event to the Redis channel
   * so communication-service can send a reschedule confirmation email.
   */
  async publishBookingRescheduled(params: {
    tenantId:        string;
    bookingId:       string;
    actorId?:        string;
    customerEmail?:  string;
    customerName?:   string;
    reference?:      string;
    newStartsAt?:    string;
    durationMins?:   number;
    venueName?:      string;
    courtName?:      string;
    reason?:         string | null;
    correlationId?:  string;
  }): Promise<void> {
    const { correlationId, tenantId, ...rest } = params;
    await this.publish(
      EventRegistry.BOOKING_RESCHEDULED,
      tenantId,
      rest as Record<string, unknown>,
      correlationId,
    );
  }

  /**
   * publishBookingExpired()
   *
   * Called by BookingService.expire() after the transaction commits.
   * Bridges the in-process BOOKING_EXPIRED event to Redis so
   * communication-service can notify the customer their hold lapsed.
   */
  async publishBookingExpired(params: {
    tenantId:       string;
    bookingId:      string;
    customerEmail?: string;
    customerName?:  string;
    reference?:     string;
    startsAt?:      string;
    venueName?:     string;
    correlationId?: string;
  }): Promise<void> {
    const { correlationId, tenantId, ...rest } = params;
    await this.publish(
      EventRegistry.BOOKING_EXPIRED,
      tenantId,
      rest as Record<string, unknown>,
      correlationId,
    );
  }

  /**
   * publishWaitlistPromoted()
   *
   * Called by WaitlistService.promoteNext() after a customer is promoted.
   * Bridges the in-process event to Redis so communication-service can
   * send the "your slot is available" email.
   */
  async publishWaitlistPromoted(params: {
    tenantId:        string;
    waitlistEntryId: string;
    slotId:          string;
    customerEmail?:  string;
    customerName?:   string;
    startsAt?:       string;
    endsAt?:         string;
    courtName?:      string;
    venueName?:      string;
    promotedUntil?:  string;
    correlationId?:  string;
  }): Promise<void> {
    const { correlationId, tenantId, ...rest } = params;
    await this.publish(
      EventRegistry.WAITLIST_PROMOTED,
      tenantId,
      rest as Record<string, unknown>,
      correlationId,
    );
  }

  /**
   * publishBookingReminder()
   *
   * Called by the NotificationSchedulerService (communication-service) via
   * local EventEmitter — but booking-service can also call this from a
   * scheduler if needed in future. Included here for completeness.
   *
   * @param hoursUntil  24 or 2 — determines which EventRegistry channel to use.
   */
  async publishBookingReminder(params: {
    tenantId:       string;
    bookingId:      string;
    customerEmail?: string;
    customerName?:  string;
    reference?:     string;
    startsAt?:      string;
    durationMins?:  number;
    venueName?:     string;
    courtName?:     string;
    hoursUntil:     24 | 2;
    correlationId?: string;
  }): Promise<void> {
    const { correlationId, tenantId, hoursUntil, ...rest } = params;
    const channel = hoursUntil === 2
      ? EventRegistry.BOOKING_REMINDER_2H
      : EventRegistry.BOOKING_REMINDER_24H;
    await this.publish(channel, tenantId, rest as Record<string, unknown>, correlationId);
  }
}
