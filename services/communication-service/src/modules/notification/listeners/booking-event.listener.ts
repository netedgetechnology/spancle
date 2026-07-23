import { Injectable, Logger } from '@nestjs/common';
import { OnEvent }            from '@nestjs/event-emitter';
import {
  EventRegistry,
  type EventEnvelope,
} from '@spancle/event-contracts';
import { EmailQueueProducer }  from '../queue/email-queue.producer';

/**
 * BookingEventListener (communication-service)
 *
 * Receives EventEnvelope objects dispatched by RedisEventBusSubscriber
 * and enqueues email notifications via EmailQueueProducer.
 *
 * Event → template mapping:
 *   BOOKING_CONFIRMED  → booking_confirmed_email
 *   BOOKING_CANCELLED  → booking_cancelled_email
 *   PAYMENT_SUCCEEDED  → payment_received_email
 *
 * Design:
 *   - Handlers never block the bus (@OnEvent async: true).
 *   - Missing customerEmail: skip + warn, never throw.
 *   - Enqueue errors: catch + log, never propagate.
 *   - Variable maps built from payload; unknown fields absent (not errors).
 */
@Injectable()
export class BookingEventListener {
  private readonly logger = new Logger(BookingEventListener.name);

  constructor(
    private readonly emailQueue: EmailQueueProducer,
  ) {}

  @OnEvent(EventRegistry.BOOKING_CONFIRMED, { async: true })
  async onBookingConfirmed(envelope: EventEnvelope): Promise<void> {
    const { tenantId, payload } = envelope;
    const customerEmail = asString(payload['customerEmail']);
    if (!customerEmail) {
      this.logger.warn(`[BOOKING_CONFIRMED] No customerEmail — bookingId=${asString(payload['bookingId'])} tenant=${tenantId} — skipping`);
      return;
    }
    try {
      const notifId = await this.emailQueue.enqueue({
        tenantId,
        recipientEmail: customerEmail,
        templateSlug:   'booking_confirmed_email',
        name:           `Booking confirmed — ${asString(payload['reference']) || asString(payload['bookingId'])}`,
        variables:      buildBookingConfirmedVars(payload),
      });
      this.logger.log(`[BOOKING_CONFIRMED] Email queued — notificationId=${notifId} to=${customerEmail}`);
    } catch (err: unknown) {
      this.logger.error(`[BOOKING_CONFIRMED] Failed to enqueue — bookingId=${asString(payload['bookingId'])}: ${toMessage(err)}`);
    }
  }

  @OnEvent(EventRegistry.BOOKING_CANCELLED, { async: true })
  async onBookingCancelled(envelope: EventEnvelope): Promise<void> {
    const { tenantId, payload } = envelope;
    const customerEmail = asString(payload['customerEmail']);
    if (!customerEmail) {
      this.logger.warn(`[BOOKING_CANCELLED] No customerEmail — bookingId=${asString(payload['bookingId'])} tenant=${tenantId} — skipping`);
      return;
    }
    try {
      const notifId = await this.emailQueue.enqueue({
        tenantId,
        recipientEmail: customerEmail,
        templateSlug:   'booking_cancelled_email',
        name:           `Booking cancelled — ${asString(payload['reference']) || asString(payload['bookingId'])}`,
        variables:      buildBookingCancelledVars(payload),
      });
      this.logger.log(`[BOOKING_CANCELLED] Email queued — notificationId=${notifId} to=${customerEmail}`);
    } catch (err: unknown) {
      this.logger.error(`[BOOKING_CANCELLED] Failed to enqueue — bookingId=${asString(payload['bookingId'])}: ${toMessage(err)}`);
    }
  }

  @OnEvent(EventRegistry.PAYMENT_SUCCEEDED, { async: true })
  async onPaymentSucceeded(envelope: EventEnvelope): Promise<void> {
    const { tenantId, payload } = envelope;
    const customerEmail = asString(payload['customerEmail']);
    if (!customerEmail) {
      this.logger.warn(`[PAYMENT_SUCCEEDED] No customerEmail — paymentId=${asString(payload['paymentId'])} tenant=${tenantId} — skipping`);
      return;
    }
    try {
      const notifId = await this.emailQueue.enqueue({
        tenantId,
        recipientEmail: customerEmail,
        templateSlug:   'payment_received_email',
        name:           `Payment received — ${asString(payload['reference']) || asString(payload['paymentId'])}`,
        variables:      buildPaymentReceivedVars(payload),
      });
      this.logger.log(`[PAYMENT_SUCCEEDED] Email queued — notificationId=${notifId} to=${customerEmail}`);
    } catch (err: unknown) {
      this.logger.error(`[PAYMENT_SUCCEEDED] Failed to enqueue — paymentId=${asString(payload['paymentId'])}: ${toMessage(err)}`);
    }
  }

  @OnEvent(EventRegistry.PAYMENT_FAILED, { async: true })
  async onPaymentFailed(envelope: EventEnvelope): Promise<void> {
    const { tenantId, payload } = envelope;
    this.logger.log(`[PAYMENT_FAILED] tenant=${tenantId} paymentId=${asString(payload['paymentId'])} — no email template for failure yet`);
  }
}

// ── Variable builders (exported for testing) ──────────────────────────────────

export function buildBookingConfirmedVars(payload: Record<string, unknown>): Record<string, unknown> {
  const amountMinor = asNumber(payload['finalPriceMinor']);
  const currency    = asString(payload['currency']) || 'GBP';
  return {
    customer: { name: asString(payload['customerName']) || 'Valued customer' },
    booking:  {
      reference:    asString(payload['reference'])    || asString(payload['bookingId']),
      startsAt:     asString(payload['startsAt'])     || '',
      durationMins: asString(payload['durationMins']) || '',
      totalPrice:   amountMinor != null ? formatPrice(amountMinor, currency) : '',
    },
    venue:  { name: asString(payload['venueName'])         || '' },
    court:  { name: asString(payload['courtName'])         || '' },
    tenant: {
      name:         asString(payload['tenantName'])         || '',
      supportEmail: asString(payload['tenantSupportEmail']) || '',
    },
  };
}

export function buildBookingCancelledVars(payload: Record<string, unknown>): Record<string, unknown> {
  return {
    customer: { name: asString(payload['customerName']) || 'Valued customer' },
    booking:  {
      reference: asString(payload['reference']) || asString(payload['bookingId']),
      reason:    asString(payload['reason'])    || 'Not specified',
    },
    venue:  { name: asString(payload['venueName'])  || '' },
    tenant: { name: asString(payload['tenantName']) || '' },
  };
}

export function buildPaymentReceivedVars(payload: Record<string, unknown>): Record<string, unknown> {
  const amountMinor = asNumber(payload['amountMinor']);
  const currency    = asString(payload['currency']) || 'GBP';
  return {
    customer: { name: asString(payload['customerName']) || 'Valued customer' },
    booking:  { reference: asString(payload['reference']) || asString(payload['bookingId']) },
    payment:  {
      id:     asString(payload['paymentId']) || '',
      amount: amountMinor != null ? formatPrice(amountMinor, currency) : '',
      date:   new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    },
    tenant: { name: asString(payload['tenantName']) || '' },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function asString(v: unknown): string { return v != null && v !== '' ? String(v) : ''; }
function asNumber(v: unknown): number | null { const n = Number(v); return isFinite(n) ? n : null; }
function toMessage(err: unknown): string { return err instanceof Error ? err.message : String(err); }

export function formatPrice(amountMinor: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency.toUpperCase(), minimumFractionDigits: 2 }).format(amountMinor / 100);
  } catch {
    return `${(amountMinor / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}
