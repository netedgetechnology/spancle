import { Injectable, Logger } from '@nestjs/common';
import { OnEvent }            from '@nestjs/event-emitter';
import {
  EventRegistry,
  type EventEnvelope,
} from '@spancle/event-contracts';
import { EmailQueueProducer }                from '../queue/email-queue.producer';
import { NotificationPreferenceRepository } from '../repositories/notification-preference.repository';
import { NotificationTypes }                 from '../entities/notification-preference.entity';

/**
 * BookingEventListener (communication-service)
 *
 * Receives EventEnvelope objects dispatched by RedisEventBusSubscriber
 * and enqueues email notifications via EmailQueueProducer.
 *
 * Event → template mapping:
 *   BOOKING_CONFIRMED          → booking_confirmed_email
 *   BOOKING_CANCELLED          → booking_cancelled_email
 *   BOOKING_RESCHEDULED        → booking_rescheduled_email
 *   BOOKING_EXPIRED            → booking_expired_email
 *   BOOKING_REMINDER_24H       → booking_reminder_email
 *   BOOKING_REMINDER_2H        → booking_reminder_email  (same template, different vars)
 *   WAITLIST_PROMOTED          → waitlist_promoted_email
 *   PAYMENT_SUCCEEDED          → payment_received_email
 *   PAYMENT_FAILED             → payment_failed_email
 *   MEMBERSHIP_EXPIRY_REMINDER → membership_expiry_email
 *
 * Waitlist promotion: BookingEvents.CONFIRMED with _waitlistPromotion=true
 * is handled via onBookingConfirmed — routed to waitlist_promoted_email template.
 *
 * Guest booking confirmation: BookingEvents.CONFIRMED with isGuest=true
 * routes to guest_booking_email template.
 *
 * Design:
 *   - Handlers never block the bus (@OnEvent async: true).
 *   - Missing customerEmail: skip + warn, never throw.
 *   - Enqueue errors: catch + log, never propagate.
 *   - Preference check: skip email if user has opted out.
 *   - Deduplication: BullMQ jobId is unique per notification record.
 */
@Injectable()
export class BookingEventListener {
  private readonly logger = new Logger(BookingEventListener.name);

  constructor(
    private readonly emailQueue:  EmailQueueProducer,
    private readonly prefRepo:    NotificationPreferenceRepository,
  ) {}

  // ── Booking confirmed ────────────────────────────────────────────────────

  @OnEvent(EventRegistry.BOOKING_CONFIRMED, { async: true })
  async onBookingConfirmed(envelope: EventEnvelope): Promise<void> {
    const { tenantId, payload } = envelope;

    // Waitlist promotion: route to different template
    if (payload['_waitlistPromotion']) {
      await this.enqueueIfPermitted({
        tenantId,
        recipientEmail: asString(payload['customerEmail']),
        userId:         asString(payload['userId']),
        notifType:      NotificationTypes.WAITLIST_PROMOTED,
        templateSlug:   'waitlist_promoted_email',
        name:           `Waitlist promoted — slot ${asString(payload['slotId'])}`,
        variables:      buildWaitlistPromotedVars(payload),
        logLabel:       'WAITLIST_PROMOTED',
        contextId:      asString(payload['slotId']),
      });
      return;
    }

    // Guest booking confirmation
    if (payload['isGuest'] || !payload['userId']) {
      await this.enqueueIfPermitted({
        tenantId,
        recipientEmail: asString(payload['customerEmail']),
        userId:         null,
        notifType:      NotificationTypes.GUEST_BOOKING,
        templateSlug:   'guest_booking_email',
        name:           `Guest booking confirmed — ${asString(payload['reference'])}`,
        variables:      buildGuestBookingVars(payload),
        logLabel:       'GUEST_BOOKING_CONFIRMED',
        contextId:      asString(payload['bookingId']),
      });
      return;
    }

    await this.enqueueIfPermitted({
      tenantId,
      recipientEmail: asString(payload['customerEmail']),
      userId:         asString(payload['userId']),
      notifType:      NotificationTypes.BOOKING_CONFIRMED,
      templateSlug:   'booking_confirmed_email',
      name:           `Booking confirmed — ${asString(payload['reference']) || asString(payload['bookingId'])}`,
      variables:      buildBookingConfirmedVars(payload),
      logLabel:       'BOOKING_CONFIRMED',
      contextId:      asString(payload['bookingId']),
    });
  }

  // ── Booking cancelled ────────────────────────────────────────────────────

  @OnEvent(EventRegistry.BOOKING_CANCELLED, { async: true })
  async onBookingCancelled(envelope: EventEnvelope): Promise<void> {
    const { tenantId, payload } = envelope;
    await this.enqueueIfPermitted({
      tenantId,
      recipientEmail: asString(payload['customerEmail']),
      userId:         asString(payload['userId']),
      notifType:      NotificationTypes.BOOKING_CANCELLED,
      templateSlug:   'booking_cancelled_email',
      name:           `Booking cancelled — ${asString(payload['reference']) || asString(payload['bookingId'])}`,
      variables:      buildBookingCancelledVars(payload),
      logLabel:       'BOOKING_CANCELLED',
      contextId:      asString(payload['bookingId']),
    });
  }

  // ── Booking rescheduled ──────────────────────────────────────────────────

  @OnEvent(EventRegistry.BOOKING_RESCHEDULED, { async: true })
  async onBookingRescheduled(envelope: EventEnvelope): Promise<void> {
    const { tenantId, payload } = envelope;
    await this.enqueueIfPermitted({
      tenantId,
      recipientEmail: asString(payload['customerEmail']),
      userId:         asString(payload['userId']),
      notifType:      NotificationTypes.BOOKING_RESCHEDULED,
      templateSlug:   'booking_rescheduled_email',
      name:           `Booking rescheduled — ${asString(payload['reference'])}`,
      variables:      buildBookingRescheduledVars(payload),
      logLabel:       'BOOKING_RESCHEDULED',
      contextId:      asString(payload['bookingId']),
    });
  }

  // ── Booking expired ──────────────────────────────────────────────────────

  @OnEvent(EventRegistry.BOOKING_EXPIRED, { async: true })
  async onBookingExpired(envelope: EventEnvelope): Promise<void> {
    const { tenantId, payload } = envelope;
    // Only notify when customer email is present (guest bookings may not have one in payload)
    if (!asString(payload['customerEmail'])) {
      this.logger.debug(`[BOOKING_EXPIRED] No customerEmail — bookingId=${asString(payload['bookingId'])} — skipping`);
      return;
    }
    await this.enqueueIfPermitted({
      tenantId,
      recipientEmail: asString(payload['customerEmail']),
      userId:         asString(payload['userId']),
      notifType:      NotificationTypes.BOOKING_EXPIRED,
      templateSlug:   'booking_expired_email',
      name:           `Booking reservation expired — ${asString(payload['reference'])}`,
      variables:      buildBookingExpiredVars(payload),
      logLabel:       'BOOKING_EXPIRED',
      contextId:      asString(payload['bookingId']),
    });
  }

  // ── Booking reminder (24h) ───────────────────────────────────────────────

  @OnEvent(EventRegistry.BOOKING_REMINDER_24H, { async: true })
  async onBookingReminder24h(envelope: EventEnvelope): Promise<void> {
    const { tenantId, payload } = envelope;
    await this.enqueueIfPermitted({
      tenantId,
      recipientEmail: asString(payload['customerEmail']),
      userId:         asString(payload['userId']),
      notifType:      NotificationTypes.BOOKING_REMINDER,
      templateSlug:   'booking_reminder_email',
      name:           `Reminder: booking tomorrow — ${asString(payload['reference'])}`,
      variables:      { ...buildBookingReminderVars(payload), hoursUntil: 24 },
      logLabel:       'BOOKING_REMINDER_24H',
      contextId:      asString(payload['bookingId']),
    });
  }

  // ── Booking reminder (2h) ────────────────────────────────────────────────

  @OnEvent(EventRegistry.BOOKING_REMINDER_2H, { async: true })
  async onBookingReminder2h(envelope: EventEnvelope): Promise<void> {
    const { tenantId, payload } = envelope;
    await this.enqueueIfPermitted({
      tenantId,
      recipientEmail: asString(payload['customerEmail']),
      userId:         asString(payload['userId']),
      notifType:      NotificationTypes.BOOKING_REMINDER,
      templateSlug:   'booking_reminder_email',
      name:           `Reminder: booking in 2 hours — ${asString(payload['reference'])}`,
      variables:      { ...buildBookingReminderVars(payload), hoursUntil: 2 },
      logLabel:       'BOOKING_REMINDER_2H',
      contextId:      asString(payload['bookingId']),
    });
  }

  // ── Waitlist promoted (via direct EventEmitter2) ─────────────────────────

  @OnEvent(EventRegistry.WAITLIST_PROMOTED, { async: true })
  async onWaitlistPromoted(envelope: EventEnvelope): Promise<void> {
    const { tenantId, payload } = envelope;
    await this.enqueueIfPermitted({
      tenantId,
      recipientEmail: asString(payload['customerEmail']),
      userId:         asString(payload['userId']),
      notifType:      NotificationTypes.WAITLIST_PROMOTED,
      templateSlug:   'waitlist_promoted_email',
      name:           `Waitlist: slot available — ${asString(payload['slotId'])}`,
      variables:      buildWaitlistPromotedVars(payload),
      logLabel:       'WAITLIST_PROMOTED',
      contextId:      asString(payload['slotId']),
    });
  }

  // ── Payment succeeded ────────────────────────────────────────────────────

  @OnEvent(EventRegistry.PAYMENT_SUCCEEDED, { async: true })
  async onPaymentSucceeded(envelope: EventEnvelope): Promise<void> {
    const { tenantId, payload } = envelope;
    await this.enqueueIfPermitted({
      tenantId,
      recipientEmail: asString(payload['customerEmail']),
      userId:         asString(payload['userId']),
      notifType:      NotificationTypes.PAYMENT_RECEIVED,
      templateSlug:   'payment_received_email',
      name:           `Payment received — ${asString(payload['reference']) || asString(payload['paymentId'])}`,
      variables:      buildPaymentReceivedVars(payload),
      logLabel:       'PAYMENT_SUCCEEDED',
      contextId:      asString(payload['paymentId']),
    });
  }

  // ── Payment failed ────────────────────────────────────────────────────────

  @OnEvent(EventRegistry.PAYMENT_FAILED, { async: true })
  async onPaymentFailed(envelope: EventEnvelope): Promise<void> {
    const { tenantId, payload } = envelope;
    await this.enqueueIfPermitted({
      tenantId,
      recipientEmail: asString(payload['customerEmail']),
      userId:         asString(payload['userId']),
      notifType:      NotificationTypes.PAYMENT_FAILED,
      templateSlug:   'payment_failed_email',
      name:           `Payment failed — booking ${asString(payload['reference'])}`,
      variables:      buildPaymentFailedVars(payload),
      logLabel:       'PAYMENT_FAILED',
      contextId:      asString(payload['paymentId']),
    });
  }

  // ── Membership expiry reminder ────────────────────────────────────────────

  @OnEvent(EventRegistry.MEMBERSHIP_EXPIRY_REMINDER, { async: true })
  async onMembershipExpiryReminder(envelope: EventEnvelope): Promise<void> {
    const { tenantId, payload } = envelope;
    await this.enqueueIfPermitted({
      tenantId,
      recipientEmail: asString(payload['customerEmail']),
      userId:         asString(payload['userId']),
      notifType:      NotificationTypes.MEMBERSHIP_EXPIRY,
      templateSlug:   'membership_expiry_email',
      name:           `Membership expiring soon — ${asString(payload['memberNumber'])}`,
      variables:      buildMembershipExpiryVars(payload),
      logLabel:       'MEMBERSHIP_EXPIRY_REMINDER',
      contextId:      asString(payload['membershipId']),
    });
  }

  // ── Private dispatch helper ────────────────────────────────────────────────

  private async enqueueIfPermitted(params: {
    tenantId:       string;
    recipientEmail: string;
    userId:         string | null;
    notifType:      string;
    templateSlug:   string;
    name:           string;
    variables:      Record<string, unknown>;
    logLabel:       string;
    contextId:      string;
  }): Promise<void> {
    const { tenantId, recipientEmail, userId, notifType, templateSlug, name, variables, logLabel, contextId } = params;

    if (!recipientEmail) {
      this.logger.warn(`[${logLabel}] No recipientEmail — contextId=${contextId} tenant=${tenantId} — skipping`);
      return;
    }

    // Check user preference (default = enabled when no row exists)
    if (userId) {
      const allowed = await this.prefRepo.isEmailEnabled(userId, tenantId, notifType);
      if (!allowed) {
        this.logger.debug(`[${logLabel}] User ${userId} has opted out of email for ${notifType} — skipping`);
        return;
      }
    }

    try {
      const notifId = await this.emailQueue.enqueue({
        tenantId,
        recipientEmail,
        templateSlug,
        name,
        variables,
      });
      this.logger.log(`[${logLabel}] Email queued — notificationId=${notifId} to=${recipientEmail}`);
    } catch (err: unknown) {
      this.logger.error(`[${logLabel}] Failed to enqueue — contextId=${contextId}: ${toMessage(err)}`);
    }
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

export function buildBookingRescheduledVars(payload: Record<string, unknown>): Record<string, unknown> {
  const amountMinor = asNumber(payload['finalPriceMinor']);
  const currency    = asString(payload['currency']) || 'GBP';
  return {
    customer: { name: asString(payload['customerName']) || 'Valued customer' },
    booking:  {
      reference:    asString(payload['reference']),
      newStartsAt:  asString(payload['newStartsAt'])  || '',
      durationMins: asString(payload['durationMins']) || '',
      totalPrice:   amountMinor != null ? formatPrice(amountMinor, currency) : '',
      reason:       asString(payload['reason'])       || '',
    },
    venue:  { name: asString(payload['venueName'])  || '' },
    court:  { name: asString(payload['courtName'])  || '' },
    tenant: { name: asString(payload['tenantName']) || '' },
  };
}

export function buildBookingExpiredVars(payload: Record<string, unknown>): Record<string, unknown> {
  return {
    customer: { name: asString(payload['customerName']) || 'Valued customer' },
    booking:  {
      reference: asString(payload['reference']),
      startsAt:  asString(payload['startsAt']) || '',
    },
    venue:  { name: asString(payload['venueName'])  || '' },
    tenant: { name: asString(payload['tenantName']) || '' },
  };
}

export function buildBookingReminderVars(payload: Record<string, unknown>): Record<string, unknown> {
  return {
    customer: { name: asString(payload['customerName']) || 'Valued customer' },
    booking:  {
      reference:    asString(payload['reference']),
      startsAt:     asString(payload['startsAt'])     || '',
      durationMins: asString(payload['durationMins']) || '',
    },
    venue:  { name: asString(payload['venueName'])  || '' },
    court:  { name: asString(payload['courtName'])  || '' },
    tenant: { name: asString(payload['tenantName']) || '' },
  };
}

export function buildWaitlistPromotedVars(payload: Record<string, unknown>): Record<string, unknown> {
  return {
    customer: { name: asString(payload['customerName']) || 'Valued customer' },
    slot:     {
      startsAt:    asString(payload['startsAt'])    || '',
      endsAt:      asString(payload['endsAt'])      || '',
      courtName:   asString(payload['courtName'])   || '',
      reservedFor: asString(payload['promotedUntil']) || '',
    },
    venue:  { name: asString(payload['venueName'])  || '' },
    tenant: { name: asString(payload['tenantName']) || '' },
  };
}

export function buildGuestBookingVars(payload: Record<string, unknown>): Record<string, unknown> {
  const amountMinor = asNumber(payload['finalPriceMinor']);
  const currency    = asString(payload['currency']) || 'GBP';
  return {
    customer: { name: asString(payload['customerName']) || 'Valued customer' },
    booking:  {
      reference:       asString(payload['reference']),
      startsAt:        asString(payload['startsAt'])      || '',
      durationMins:    asString(payload['durationMins'])  || '',
      totalPrice:      amountMinor != null ? formatPrice(amountMinor, currency) : '',
      lookupToken:     asString(payload['guestLookupToken']) || '',
      lookupUrl:       asString(payload['lookupUrl'])     || '',
    },
    venue:  { name: asString(payload['venueName'])  || '' },
    court:  { name: asString(payload['courtName'])  || '' },
    tenant: {
      name:         asString(payload['tenantName'])         || '',
      supportEmail: asString(payload['tenantSupportEmail']) || '',
    },
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

export function buildPaymentFailedVars(payload: Record<string, unknown>): Record<string, unknown> {
  return {
    customer: { name: asString(payload['customerName']) || 'Valued customer' },
    booking:  {
      reference: asString(payload['reference']) || asString(payload['bookingId']),
      startsAt:  asString(payload['startsAt'])  || '',
    },
    payment: {
      id:            asString(payload['paymentId'])      || '',
      failureReason: asString(payload['failureReason'])  || 'Payment was declined',
    },
    tenant: {
      name:         asString(payload['tenantName'])         || '',
      supportEmail: asString(payload['tenantSupportEmail']) || '',
    },
  };
}

export function buildMembershipExpiryVars(payload: Record<string, unknown>): Record<string, unknown> {
  return {
    customer:   { name: asString(payload['customerName']) || 'Valued customer' },
    membership: {
      memberNumber: asString(payload['memberNumber']) || '',
      expiresAt:    asString(payload['expiresAt'])    || '',
      planName:     asString(payload['planName'])     || '',
      daysRemaining: asString(payload['daysRemaining']) || '',
    },
    tenant: {
      name:         asString(payload['tenantName'])         || '',
      supportEmail: asString(payload['tenantSupportEmail']) || '',
    },
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

