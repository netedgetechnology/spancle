import { Injectable, Logger } from '@nestjs/common';
import { OnEvent }            from '@nestjs/event-emitter';
import {
  EventRegistry,
  type EventEnvelope,
} from '@spancle/event-contracts';

/**
 * BookingEventListener (communication-service)
 *
 * Handles cross-service events dispatched by RedisEventBusSubscriber.
 * Receives EventEnvelope objects — tenant context and correlationId are
 * always available on the envelope; channel-specific payload is in envelope.payload.
 *
 * Current handlers — foundation only (Sprint 1):
 *   BOOKING_CONFIRMED   → log + placeholder for email queue enqueue
 *   PAYMENT_SUCCEEDED   → log + placeholder for receipt email
 *   PAYMENT_FAILED      → log + placeholder for retry-prompt email
 *
 * Sprint 2 will replace the placeholder log lines with EmailQueueProducer calls.
 * This listener does NOT change when email delivery is added.
 */
@Injectable()
export class BookingEventListener {
  private readonly logger = new Logger(BookingEventListener.name);

  /**
   * onBookingConfirmed
   *
   * Triggered when a booking transitions to 'confirmed' status, either
   * via payment capture (webhook) or admin confirmation.
   *
   * Expected payload fields (booking-service publishes):
   *   bookingId, actorId, customerEmail?, customerName?, reference?,
   *   startsAt?, courtId?, finalPriceMinor?, currency?
   */
  @OnEvent(EventRegistry.BOOKING_CONFIRMED, { async: true })
  async onBookingConfirmed(envelope: EventEnvelope): Promise<void> {
    const { tenantId, id, correlationId, payload } = envelope;

    this.logger.log(
      `[BOOKING_CONFIRMED] tenant=${tenantId} ` +
      `bookingId=${String(payload['bookingId'] ?? 'unknown')} ` +
      `envelopeId=${id} correlationId=${correlationId ?? 'none'} ` +
      `— email delivery pending Sprint 2`,
    );

    // Sprint 2: await this.emailQueue.enqueue('booking_confirmed', tenantId, payload);
  }

  /**
   * onPaymentSucceeded
   *
   * Triggered after a payment is captured by the gateway.
   *
   * Expected payload fields:
   *   paymentId, bookingId?, customerEmail?, amountMinor, currency,
   *   gatewayPaymentId?, reference?
   */
  @OnEvent(EventRegistry.PAYMENT_SUCCEEDED, { async: true })
  async onPaymentSucceeded(envelope: EventEnvelope): Promise<void> {
    const { tenantId, id, correlationId, payload } = envelope;

    this.logger.log(
      `[PAYMENT_SUCCEEDED] tenant=${tenantId} ` +
      `paymentId=${String(payload['paymentId'] ?? 'unknown')} ` +
      `amount=${String(payload['amountMinor'] ?? '?')} ${String(payload['currency'] ?? '')} ` +
      `envelopeId=${id} correlationId=${correlationId ?? 'none'} ` +
      `— receipt email pending Sprint 2`,
    );

    // Sprint 2: await this.emailQueue.enqueue('payment_receipt', tenantId, payload);
  }

  /**
   * onPaymentFailed
   *
   * Triggered after a payment fails at the gateway level.
   *
   * Expected payload fields:
   *   paymentId, bookingId?, customerEmail?, reason?
   */
  @OnEvent(EventRegistry.PAYMENT_FAILED, { async: true })
  async onPaymentFailed(envelope: EventEnvelope): Promise<void> {
    const { tenantId, id, correlationId, payload } = envelope;

    this.logger.log(
      `[PAYMENT_FAILED] tenant=${tenantId} ` +
      `paymentId=${String(payload['paymentId'] ?? 'unknown')} ` +
      `reason=${String(payload['reason'] ?? 'unknown')} ` +
      `envelopeId=${id} correlationId=${correlationId ?? 'none'} ` +
      `— failure notification pending Sprint 2`,
    );

    // Sprint 2: await this.emailQueue.enqueue('payment_failed', tenantId, payload);
  }
}
