/**
 * booking-event.listener.spec.ts — Full coverage of all notification handlers.
 */

import {
  BookingEventListener,
  buildBookingConfirmedVars, buildBookingCancelledVars,
  buildBookingRescheduledVars, buildBookingExpiredVars,
  buildBookingReminderVars, buildWaitlistPromotedVars,
  buildGuestBookingVars, buildPaymentReceivedVars,
  buildPaymentFailedVars, buildMembershipExpiryVars,
  formatPrice,
} from '../listeners/booking-event.listener';
import type { EmailQueueProducer }            from '../queue/email-queue.producer';
import type { NotificationPreferenceRepository } from '../repositories/notification-preference.repository';
import type { EventEnvelope }                 from '@spancle/event-contracts';
import { EventRegistry }                      from '@spancle/event-contracts';

const T = 'tenant-aaa-bbb-001';
const BASE: Record<string, unknown> = {
  bookingId: 'bk-001', reference: 'BK-2025-0001',
  customerEmail: 'alice@example.com', customerName: 'Alice Smith',
  userId: 'user-001', startsAt: '2025-06-15T10:00:00Z', durationMins: 60,
  finalPriceMinor: 2000, currency: 'GBP',
  venueName: 'Ace Sports', courtName: 'Court 1',
  tenantName: 'Test Tenant', tenantSupportEmail: 'help@test.com',
};

function env(channel: string, payload: Record<string, unknown> = BASE): EventEnvelope {
  return { id: 'env-001', channel, version: '1', tenantId: T, occurredAt: new Date().toISOString(), producer: 'booking-service', payload };
}

function makeProducer(result: string | Error = 'notif-id-001'): jest.Mocked<Pick<EmailQueueProducer, 'enqueue'>> {
  return { enqueue: jest.fn().mockImplementation(() => result instanceof Error ? Promise.reject(result) : Promise.resolve(result)) };
}

function makePrefRepo(ok = true): jest.Mocked<Pick<NotificationPreferenceRepository, 'isEmailEnabled'>> {
  return { isEmailEnabled: jest.fn().mockResolvedValue(ok) };
}

function make(ok = true, result: string | Error = 'notif-001') {
  const producer = makeProducer(result);
  const prefRepo = makePrefRepo(ok);
  const svc = new BookingEventListener(producer as never, prefRepo as never);
  return { svc, producer, prefRepo };
}

// ── onBookingConfirmed ────────────────────────────────────────────────────────

describe('onBookingConfirmed()', () => {
  it('→ booking_confirmed_email (member)', async () => {
    const { svc, producer } = make();
    await svc.onBookingConfirmed(env(EventRegistry.BOOKING_CONFIRMED));
    expect(producer.enqueue).toHaveBeenCalledWith(expect.objectContaining({ templateSlug: 'booking_confirmed_email' }));
  });
  it('→ waitlist_promoted_email when _waitlistPromotion=true', async () => {
    const { svc, producer } = make();
    await svc.onBookingConfirmed(env(EventRegistry.BOOKING_CONFIRMED, { ...BASE, _waitlistPromotion: true, slotId: 'slot-1' }));
    expect(producer.enqueue).toHaveBeenCalledWith(expect.objectContaining({ templateSlug: 'waitlist_promoted_email' }));
  });
  it('→ guest_booking_email when isGuest=true', async () => {
    const { svc, producer } = make();
    await svc.onBookingConfirmed(env(EventRegistry.BOOKING_CONFIRMED, { ...BASE, isGuest: true, userId: null }));
    expect(producer.enqueue).toHaveBeenCalledWith(expect.objectContaining({ templateSlug: 'guest_booking_email' }));
  });
  it('skips when no customerEmail', async () => {
    const { svc, producer } = make();
    await svc.onBookingConfirmed(env(EventRegistry.BOOKING_CONFIRMED, { ...BASE, customerEmail: '' }));
    expect(producer.enqueue).not.toHaveBeenCalled();
  });
  it('does not throw when enqueue fails', async () => {
    const { svc } = make(true, new Error('Bull down'));
    await expect(svc.onBookingConfirmed(env(EventRegistry.BOOKING_CONFIRMED))).resolves.toBeUndefined();
  });
  it('skips when user opted out', async () => {
    const { svc, producer } = make(false);
    await svc.onBookingConfirmed(env(EventRegistry.BOOKING_CONFIRMED));
    expect(producer.enqueue).not.toHaveBeenCalled();
  });
});

// ── onBookingCancelled ────────────────────────────────────────────────────────

describe('onBookingCancelled()', () => {
  it('→ booking_cancelled_email', async () => {
    const { svc, producer } = make();
    await svc.onBookingCancelled(env(EventRegistry.BOOKING_CANCELLED));
    expect(producer.enqueue).toHaveBeenCalledWith(expect.objectContaining({ templateSlug: 'booking_cancelled_email' }));
  });
  it('skips when no customerEmail', async () => {
    const { svc, producer } = make();
    await svc.onBookingCancelled(env(EventRegistry.BOOKING_CANCELLED, { ...BASE, customerEmail: '' }));
    expect(producer.enqueue).not.toHaveBeenCalled();
  });
});

// ── onBookingRescheduled ──────────────────────────────────────────────────────

describe('onBookingRescheduled()', () => {
  it('→ booking_rescheduled_email', async () => {
    const { svc, producer } = make();
    await svc.onBookingRescheduled(env(EventRegistry.BOOKING_RESCHEDULED, { ...BASE, newStartsAt: '2025-07-01T10:00:00Z' }));
    expect(producer.enqueue).toHaveBeenCalledWith(expect.objectContaining({ templateSlug: 'booking_rescheduled_email' }));
  });
});

// ── onBookingExpired ──────────────────────────────────────────────────────────

describe('onBookingExpired()', () => {
  it('→ booking_expired_email', async () => {
    const { svc, producer } = make();
    await svc.onBookingExpired(env(EventRegistry.BOOKING_EXPIRED));
    expect(producer.enqueue).toHaveBeenCalledWith(expect.objectContaining({ templateSlug: 'booking_expired_email' }));
  });
  it('skips when no customerEmail', async () => {
    const { svc, producer } = make();
    await svc.onBookingExpired(env(EventRegistry.BOOKING_EXPIRED, { ...BASE, customerEmail: '' }));
    expect(producer.enqueue).not.toHaveBeenCalled();
  });
});

// ── Reminder handlers ─────────────────────────────────────────────────────────

describe('onBookingReminder24h()', () => {
  it('→ booking_reminder_email hoursUntil=24', async () => {
    const { svc, producer } = make();
    await svc.onBookingReminder24h(env(EventRegistry.BOOKING_REMINDER_24H));
    const call = producer.enqueue.mock.calls[0]?.[0] as { templateSlug: string; variables: Record<string, unknown> };
    expect(call.templateSlug).toBe('booking_reminder_email');
    expect(call.variables['hoursUntil']).toBe(24);
  });
});

describe('onBookingReminder2h()', () => {
  it('→ booking_reminder_email hoursUntil=2', async () => {
    const { svc, producer } = make();
    await svc.onBookingReminder2h(env(EventRegistry.BOOKING_REMINDER_2H));
    const call = producer.enqueue.mock.calls[0]?.[0] as { templateSlug: string; variables: Record<string, unknown> };
    expect(call.variables['hoursUntil']).toBe(2);
  });
});

// ── onWaitlistPromoted ────────────────────────────────────────────────────────

describe('onWaitlistPromoted()', () => {
  it('→ waitlist_promoted_email', async () => {
    const { svc, producer } = make();
    await svc.onWaitlistPromoted(env(EventRegistry.WAITLIST_PROMOTED, { ...BASE, slotId: 'slot-2', promotedUntil: '2025-06-15T11:00:00Z' }));
    expect(producer.enqueue).toHaveBeenCalledWith(expect.objectContaining({ templateSlug: 'waitlist_promoted_email' }));
  });
});

// ── Payment handlers ──────────────────────────────────────────────────────────

describe('onPaymentSucceeded()', () => {
  it('→ payment_received_email', async () => {
    const { svc, producer } = make();
    await svc.onPaymentSucceeded(env(EventRegistry.PAYMENT_SUCCEEDED, { ...BASE, paymentId: 'pi-001', amountMinor: 2000 }));
    expect(producer.enqueue).toHaveBeenCalledWith(expect.objectContaining({ templateSlug: 'payment_received_email' }));
  });
});

describe('onPaymentFailed()', () => {
  it('→ payment_failed_email', async () => {
    const { svc, producer } = make();
    await svc.onPaymentFailed(env(EventRegistry.PAYMENT_FAILED, { ...BASE, paymentId: 'pi-fail', failureReason: 'Insufficient funds' }));
    expect(producer.enqueue).toHaveBeenCalledWith(expect.objectContaining({ templateSlug: 'payment_failed_email' }));
  });
});

// ── onMembershipExpiryReminder ────────────────────────────────────────────────

describe('onMembershipExpiryReminder()', () => {
  it('→ membership_expiry_email', async () => {
    const { svc, producer } = make();
    await svc.onMembershipExpiryReminder(env(EventRegistry.MEMBERSHIP_EXPIRY_REMINDER, { ...BASE, membershipId: 'm-1', memberNumber: 'MBR-001', expiresAt: '2025-06-22T00:00:00Z', planName: 'Gold', daysRemaining: '7' }));
    expect(producer.enqueue).toHaveBeenCalledWith(expect.objectContaining({ templateSlug: 'membership_expiry_email' }));
  });
});

// ── Variable builders ─────────────────────────────────────────────────────────

describe('buildBookingConfirmedVars()', () => {
  it('maps all fields', () => {
    const v = buildBookingConfirmedVars(BASE);
    expect((v['customer'] as Record<string,string>)['name']).toBe('Alice Smith');
    expect((v['booking'] as Record<string,string>)['totalPrice']).toBe('£20.00');
    expect((v['venue'] as Record<string,string>)['name']).toBe('Ace Sports');
  });
  it('falls back on missing customerName', () => {
    const v = buildBookingConfirmedVars({});
    expect((v['customer'] as Record<string,string>)['name']).toBe('Valued customer');
  });
});

describe('buildBookingCancelledVars()', () => {
  it('falls back reason to Not specified', () => {
    const v = buildBookingCancelledVars(BASE);
    expect((v['booking'] as Record<string,string>)['reason']).toBe('Not specified');
  });
  it('includes provided reason', () => {
    const v = buildBookingCancelledVars({ ...BASE, reason: 'Injured' });
    expect((v['booking'] as Record<string,string>)['reason']).toBe('Injured');
  });
});

describe('buildBookingRescheduledVars()', () => {
  it('includes newStartsAt', () => {
    const v = buildBookingRescheduledVars({ ...BASE, newStartsAt: '2025-07-01T10:00:00Z' });
    expect((v['booking'] as Record<string,string>)['newStartsAt']).toBe('2025-07-01T10:00:00Z');
  });
});

describe('buildBookingExpiredVars()', () => {
  it('includes reference', () => {
    const v = buildBookingExpiredVars(BASE);
    expect((v['booking'] as Record<string,string>)['reference']).toBe('BK-2025-0001');
  });
});

describe('buildBookingReminderVars()', () => {
  it('includes court and venue', () => {
    const v = buildBookingReminderVars(BASE);
    expect((v['court'] as Record<string,string>)['name']).toBe('Court 1');
    expect((v['venue'] as Record<string,string>)['name']).toBe('Ace Sports');
  });
});

describe('buildWaitlistPromotedVars()', () => {
  it('maps slot fields', () => {
    const v = buildWaitlistPromotedVars({ ...BASE, endsAt: '2025-06-15T11:00:00Z', promotedUntil: '2025-06-15T10:30:00Z' });
    expect((v['slot'] as Record<string,string>)['startsAt']).toBe('2025-06-15T10:00:00Z');
  });
});

describe('buildGuestBookingVars()', () => {
  it('includes lookupToken', () => {
    const v = buildGuestBookingVars({ ...BASE, guestLookupToken: 'tok-abc', lookupUrl: 'https://x.com?token=tok-abc' });
    expect((v['booking'] as Record<string,string>)['lookupToken']).toBe('tok-abc');
  });
});

describe('buildPaymentReceivedVars()', () => {
  it('formats amount', () => {
    const v = buildPaymentReceivedVars({ ...BASE, amountMinor: 5000, paymentId: 'pi-1' });
    expect((v['payment'] as Record<string,string>)['amount']).toBe('£50.00');
  });
});

describe('buildPaymentFailedVars()', () => {
  it('includes failureReason', () => {
    const v = buildPaymentFailedVars({ ...BASE, paymentId: 'pi-2', failureReason: 'Declined' });
    expect((v['payment'] as Record<string,string>)['failureReason']).toBe('Declined');
  });
});

describe('buildMembershipExpiryVars()', () => {
  it('maps daysRemaining', () => {
    const v = buildMembershipExpiryVars({ ...BASE, memberNumber: 'MBR-001', expiresAt: '2025-06-22', planName: 'Gold', daysRemaining: '7' });
    expect((v['membership'] as Record<string,string>)['daysRemaining']).toBe('7');
  });
});

// ── formatPrice ───────────────────────────────────────────────────────────────

describe('formatPrice()', () => {
  it('GBP', () => expect(formatPrice(1050, 'GBP')).toBe('£10.50'));
  it('USD', () => expect(formatPrice(2000, 'USD')).toContain('20.00'));
  it('fallback', () => expect(formatPrice(500, 'XYZ')).toContain('5.00'));
});
