/**
 * booking-event.listener.spec.ts
 *
 * Tests for BookingEventListener and its exported variable builder functions.
 *
 * Strategy:
 *   - EmailQueueProducer is stubbed (no BullMQ, no DB).
 *   - EventEnvelope is constructed inline — no Redis required.
 *   - formatPrice and buildXxxVars are pure functions tested directly.
 *
 * Covers:
 *   ✓ BOOKING_CONFIRMED enqueues booking_confirmed_email
 *   ✓ BOOKING_CONFIRMED skips when customerEmail absent
 *   ✓ BOOKING_CONFIRMED catches and logs enqueue errors (no throw)
 *   ✓ BOOKING_CANCELLED enqueues booking_cancelled_email
 *   ✓ BOOKING_CANCELLED skips when customerEmail absent
 *   ✓ PAYMENT_SUCCEEDED enqueues payment_received_email
 *   ✓ PAYMENT_SUCCEEDED skips when customerEmail absent
 *   ✓ PAYMENT_FAILED logs only (no enqueue)
 *   ✓ buildBookingConfirmedVars — all fields
 *   ✓ buildBookingCancelledVars — all fields
 *   ✓ buildPaymentReceivedVars — all fields, formatPrice
 *   ✓ formatPrice — GBP, USD, fallback
 */

import { BookingEventListener, buildBookingConfirmedVars, buildBookingCancelledVars, buildPaymentReceivedVars, formatPrice } from '../listeners/booking-event.listener';
import type { EmailQueueProducer } from '../queue/email-queue.producer';
import type { EventEnvelope }      from '@spancle/event-contracts';
import { EventRegistry }           from '@spancle/event-contracts';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEnvelope(channel: string, payload: Record<string, unknown>): EventEnvelope {
  return {
    id:          'env-uuid-001',
    channel,
    version:     '1',
    tenantId:    'tenant-aaa-bbb',
    occurredAt:  new Date().toISOString(),
    producer:    'booking-service',
    payload,
  };
}

function makeProducer(enqueueResult: string | Error = 'notif-id-001'): jest.Mocked<Pick<EmailQueueProducer, 'enqueue'>> {
  return {
    enqueue: jest.fn().mockImplementation(() =>
      enqueueResult instanceof Error
        ? Promise.reject(enqueueResult)
        : Promise.resolve(enqueueResult),
    ),
  } as jest.Mocked<Pick<EmailQueueProducer, 'enqueue'>>;
}

// ── BOOKING_CONFIRMED ─────────────────────────────────────────────────────────

describe('BookingEventListener — BOOKING_CONFIRMED', () => {
  it('enqueues booking_confirmed_email when customerEmail is present', async () => {
    const producer  = makeProducer();
    const listener  = new BookingEventListener(producer as never);
    const envelope  = makeEnvelope(EventRegistry.BOOKING_CONFIRMED, {
      bookingId:     'bk-001',
      reference:     'BK-20250101-001',
      customerEmail: 'alice@example.com',
      customerName:  'Alice',
    });

    await listener.onBookingConfirmed(envelope);

    expect(producer.enqueue).toHaveBeenCalledTimes(1);
    expect(producer.enqueue).toHaveBeenCalledWith(expect.objectContaining({
      tenantId:      'tenant-aaa-bbb',
      recipientEmail: 'alice@example.com',
      templateSlug:  'booking_confirmed_email',
    }));
  });

  it('skips (no enqueue) when customerEmail is absent', async () => {
    const producer = makeProducer();
    const listener = new BookingEventListener(producer as never);
    const envelope = makeEnvelope(EventRegistry.BOOKING_CONFIRMED, { bookingId: 'bk-001' });

    await listener.onBookingConfirmed(envelope);

    expect(producer.enqueue).not.toHaveBeenCalled();
  });

  it('catches and logs enqueue errors without throwing', async () => {
    const producer = makeProducer(new Error('Queue unavailable'));
    const listener = new BookingEventListener(producer as never);
    const envelope = makeEnvelope(EventRegistry.BOOKING_CONFIRMED, {
      bookingId: 'bk-001', customerEmail: 'alice@example.com',
    });

    await expect(listener.onBookingConfirmed(envelope)).resolves.toBeUndefined();
  });
});

// ── BOOKING_CANCELLED ─────────────────────────────────────────────────────────

describe('BookingEventListener — BOOKING_CANCELLED', () => {
  it('enqueues booking_cancelled_email when customerEmail is present', async () => {
    const producer = makeProducer();
    const listener = new BookingEventListener(producer as never);
    const envelope = makeEnvelope(EventRegistry.BOOKING_CANCELLED, {
      bookingId:     'bk-002',
      reference:     'BK-20250101-002',
      customerEmail: 'bob@example.com',
      customerName:  'Bob',
      reason:        'Changed plans',
    });

    await listener.onBookingCancelled(envelope);

    expect(producer.enqueue).toHaveBeenCalledWith(expect.objectContaining({
      recipientEmail: 'bob@example.com',
      templateSlug:  'booking_cancelled_email',
    }));
  });

  it('skips when customerEmail is absent', async () => {
    const producer = makeProducer();
    const listener = new BookingEventListener(producer as never);
    await listener.onBookingCancelled(makeEnvelope(EventRegistry.BOOKING_CANCELLED, { bookingId: 'bk-002' }));
    expect(producer.enqueue).not.toHaveBeenCalled();
  });

  it('catches enqueue errors without throwing', async () => {
    const producer = makeProducer(new Error('DB down'));
    const listener = new BookingEventListener(producer as never);
    const envelope = makeEnvelope(EventRegistry.BOOKING_CANCELLED, {
      bookingId: 'bk-002', customerEmail: 'bob@example.com',
    });
    await expect(listener.onBookingCancelled(envelope)).resolves.toBeUndefined();
  });
});

// ── PAYMENT_SUCCEEDED ─────────────────────────────────────────────────────────

describe('BookingEventListener — PAYMENT_SUCCEEDED', () => {
  it('enqueues payment_received_email when customerEmail is present', async () => {
    const producer = makeProducer();
    const listener = new BookingEventListener(producer as never);
    const envelope = makeEnvelope(EventRegistry.PAYMENT_SUCCEEDED, {
      paymentId:     'pay-001',
      customerEmail: 'carol@example.com',
      amountMinor:   5000,
      currency:      'GBP',
    });

    await listener.onPaymentSucceeded(envelope);

    expect(producer.enqueue).toHaveBeenCalledWith(expect.objectContaining({
      recipientEmail: 'carol@example.com',
      templateSlug:  'payment_received_email',
    }));
  });

  it('skips when customerEmail is absent', async () => {
    const producer = makeProducer();
    const listener = new BookingEventListener(producer as never);
    await listener.onPaymentSucceeded(makeEnvelope(EventRegistry.PAYMENT_SUCCEEDED, { paymentId: 'pay-001', amountMinor: 5000 }));
    expect(producer.enqueue).not.toHaveBeenCalled();
  });

  it('catches enqueue errors without throwing', async () => {
    const producer = makeProducer(new Error('Queue full'));
    const listener = new BookingEventListener(producer as never);
    const envelope = makeEnvelope(EventRegistry.PAYMENT_SUCCEEDED, {
      paymentId: 'pay-001', customerEmail: 'carol@example.com', amountMinor: 5000,
    });
    await expect(listener.onPaymentSucceeded(envelope)).resolves.toBeUndefined();
  });
});

// ── PAYMENT_FAILED ────────────────────────────────────────────────────────────

describe('BookingEventListener — PAYMENT_FAILED', () => {
  it('logs and does not enqueue (no template for failure yet)', async () => {
    const producer = makeProducer();
    const listener = new BookingEventListener(producer as never);
    const envelope = makeEnvelope(EventRegistry.PAYMENT_FAILED, {
      paymentId: 'pay-002', reason: 'Insufficient funds',
    });
    await listener.onPaymentFailed(envelope);
    expect(producer.enqueue).not.toHaveBeenCalled();
  });
});

// ── Variable builders ─────────────────────────────────────────────────────────

describe('buildBookingConfirmedVars()', () => {
  it('maps payload fields to nested variable object', () => {
    const vars = buildBookingConfirmedVars({
      customerName:  'Alice',
      reference:     'BK-001',
      startsAt:      '2025-06-01T10:00:00Z',
      durationMins:  60,
      finalPriceMinor: 5000,
      currency:      'GBP',
      venueName:     'Centre Court',
      courtName:     'Court 1',
      tenantName:    'Spancle Wimbledon',
      tenantSupportEmail: 'help@example.com',
    });

    expect((vars['customer'] as Record<string,string>)['name']).toBe('Alice');
    expect((vars['booking'] as Record<string,string>)['reference']).toBe('BK-001');
    expect((vars['booking'] as Record<string,string>)['startsAt']).toBe('2025-06-01T10:00:00Z');
    expect((vars['booking'] as Record<string,string>)['totalPrice']).toBe('£50.00');
    expect((vars['venue'] as Record<string,string>)['name']).toBe('Centre Court');
    expect((vars['court'] as Record<string,string>)['name']).toBe('Court 1');
    expect((vars['tenant'] as Record<string,string>)['name']).toBe('Spancle Wimbledon');
    expect((vars['tenant'] as Record<string,string>)['supportEmail']).toBe('help@example.com');
  });

  it('uses bookingId as reference fallback when reference absent', () => {
    const vars = buildBookingConfirmedVars({ bookingId: 'bk-uuid', customerName: 'X' });
    expect((vars['booking'] as Record<string,string>)['reference']).toBe('bk-uuid');
  });

  it('defaults customerName when absent', () => {
    const vars = buildBookingConfirmedVars({});
    expect((vars['customer'] as Record<string,string>)['name']).toBe('Valued customer');
  });
});

describe('buildBookingCancelledVars()', () => {
  it('maps payload fields', () => {
    const vars = buildBookingCancelledVars({
      customerName: 'Bob', reference: 'BK-002',
      reason: 'Changed plans', venueName: 'Court A', tenantName: 'Spancle',
    });
    expect((vars['customer'] as Record<string,string>)['name']).toBe('Bob');
    expect((vars['booking'] as Record<string,string>)['reference']).toBe('BK-002');
    expect((vars['booking'] as Record<string,string>)['reason']).toBe('Changed plans');
    expect((vars['venue'] as Record<string,string>)['name']).toBe('Court A');
  });

  it('defaults reason to "Not specified" when absent', () => {
    const vars = buildBookingCancelledVars({ reference: 'BK-002' });
    expect((vars['booking'] as Record<string,string>)['reason']).toBe('Not specified');
  });
});

describe('buildPaymentReceivedVars()', () => {
  it('formats amountMinor to display string', () => {
    const vars = buildPaymentReceivedVars({
      customerName: 'Carol', paymentId: 'pay-001',
      amountMinor: 5000, currency: 'GBP',
    });
    expect((vars['payment'] as Record<string,string>)['amount']).toBe('£50.00');
  });

  it('includes payment.date as a non-empty string', () => {
    const vars = buildPaymentReceivedVars({ amountMinor: 1000 });
    expect(typeof (vars['payment'] as Record<string,string>)['date']).toBe('string');
    expect((vars['payment'] as Record<string,string>)['date']).not.toBe('');
  });
});

describe('formatPrice()', () => {
  it('formats GBP minor units', () => {
    expect(formatPrice(5000, 'GBP')).toBe('£50.00');
  });

  it('formats USD minor units (en-GB locale uses US$ prefix)', () => {
    const result = formatPrice(1099, 'USD');
    expect(result).toContain('10.99');
    expect(result).toMatch(/USD|\$/);
  });

  it('falls back gracefully for unknown currency codes', () => {
    const result = formatPrice(5000, 'XYZ');
    expect(result).toContain('50.00');
    expect(result).toContain('XYZ');
  });

  it('handles zero', () => {
    expect(formatPrice(0, 'GBP')).toBe('£0.00');
  });
});
