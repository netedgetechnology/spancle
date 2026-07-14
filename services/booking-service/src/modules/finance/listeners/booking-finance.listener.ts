import { Injectable, Logger } from '@nestjs/common';
import { OnEvent }            from '@nestjs/event-emitter';
import { InjectDataSource }   from '@nestjs/typeorm';
import { DataSource }         from 'typeorm';
import { InvoiceService }     from '../services/invoice.service';
import { RefundService }      from '../services/refund.service';
import { InvoiceRepository }  from '../repositories/invoice.repository';
import { PaymentRepository }  from '../repositories/payment.repository';

// ── Booking event name constants ──────────────────────────────────────────────
// Duplicated as string literals to avoid importing BookingModule.
// Values match BookingEvents enum exactly.

const BOOKING_CONFIRMED = 'spancle.booking.confirmed';
const BOOKING_CANCELLED = 'spancle.booking.cancelled';
const BOOKING_REFUNDED  = 'spancle.booking.refunded';

// ── Raw booking row shape returned by direct DB query ─────────────────────────

interface BookingRow {
  id:                 string;
  tenant_id:          string;
  reference:          string;
  court_id:           string;
  user_id:            string | null;
  customer_name:      string;
  customer_email:     string;
  currency:           string;
  final_price_minor:  number | null;
  amount_paid_minor:  number;
  amount_refunded_minor: number;
  starts_at:          Date;
  ends_at:            Date;
  status:             string;
}

/**
 * BookingFinanceListener — consumes Booking domain events and drives Finance operations.
 *
 * Domain boundary rules:
 *   - Finance NEVER imports BookingModule or BookingService.
 *   - Booking NEVER imports FinanceModule.
 *   - All communication is through EventEmitter2 (in-process).
 *
 * Booking failures must not be caused by Finance failures:
 *   - All handlers are @OnEvent listeners (called after Booking has committed).
 *   - Errors are logged and swallowed — they never propagate back to BookingService.
 *
 * Idempotency:
 *   - CONFIRMED: InvoiceReference UNIQUE (tenant_id, source_type, source_id) guard.
 *   - CANCELLED: InvoiceService.void() idempotent (returns if already voided).
 *   - REFUNDED: RefundService idempotency key bkref_<bookingRefundId> prevents
 *               duplicate Finance refunds for the same BookingRefundEntity.
 */
@Injectable()
export class BookingFinanceListener {
  private readonly logger = new Logger(BookingFinanceListener.name);

  constructor(
    private readonly invoiceService:   InvoiceService,
    private readonly refundService:    RefundService,
    private readonly invoiceRepository: InvoiceRepository,
    private readonly paymentRepository: PaymentRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Fetches the booking row directly from the shared database.
   * Finance reads from `bookings` table without importing BookingModule.
   * Returns null if not found (booking may have been hard-deleted — rare).
   */
  private async fetchBooking(
    bookingId: string,
    tenantId:  string,
  ): Promise<BookingRow | null> {
    const rows = await this.dataSource.query<BookingRow[]>(
      `SELECT id, tenant_id, reference, court_id, user_id,
              customer_name, customer_email, currency,
              final_price_minor, amount_paid_minor, amount_refunded_minor,
              starts_at, ends_at, status
       FROM bookings
       WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE
       LIMIT 1`,
      [bookingId, tenantId],
    );
    return rows[0] ?? null;
  }

  // ── BOOKING_CONFIRMED ─────────────────────────────────────────────────────

  /**
   * Creates and finalises an invoice when a booking is confirmed.
   *
   * Idempotency:
   *   InvoiceReference UNIQUE (tenant_id, 'booking', bookingId) — if an invoice
   *   already exists for this booking, draft() returns the existing record and
   *   no duplicate is created.
   *
   * Free bookings (finalPriceMinor = null or 0):
   *   No invoice is created. Finance only invoices paid bookings.
   */
  @OnEvent(BOOKING_CONFIRMED, { async: true })
  async onBookingConfirmed(payload: {
    tenantId:  string;
    bookingId: string;
    actorId:   string;
    timestamp: string;
  }): Promise<void> {
    const { tenantId, bookingId, actorId } = payload;
    try {
      // Idempotency check first — avoid DB work if invoice already exists
      const existing = await this.invoiceRepository.findReference(
        'booking', bookingId, tenantId,
      );
      if (existing) {
        this.logger.debug(
          `onBookingConfirmed: invoice already exists for booking ${bookingId} (${existing.invoiceNumber ?? existing.invoiceId}) — skip`,
        );
        return;
      }

      const booking = await this.fetchBooking(bookingId, tenantId);
      if (!booking) {
        this.logger.warn(
          `onBookingConfirmed: booking ${bookingId} not found — skip`,
        );
        return;
      }

      // Free bookings do not generate an invoice
      if (!booking.final_price_minor || booking.final_price_minor <= 0) {
        this.logger.debug(
          `onBookingConfirmed: booking ${bookingId} is free (finalPriceMinor=${booking.final_price_minor}) — no invoice`,
        );
        return;
      }

      // Draft invoice
      const { invoice } = await this.invoiceService.draft(
        {
          sourceType:    'booking',
          sourceId:      bookingId,
          customerId:    booking.user_id ?? undefined,
          customerName:  booking.customer_name,
          customerEmail: booking.customer_email,
          currency:      booking.currency,
          lines: [
            {
              description:    `Court booking — ${booking.reference}`,
              lineType:       'court_booking',
              quantity:       1,
              unitPriceMinor: booking.final_price_minor,
            },
          ],
        },
        tenantId,
        actorId,
      );

      // Finalise immediately — booking confirmation is the billing trigger
      await this.invoiceService.finalise(
        invoice.id,
        {},
        tenantId,
        actorId,
      );

      this.logger.log(
        `onBookingConfirmed: invoice created and finalised for booking ${bookingId} ` +
        `(${booking.final_price_minor} ${booking.currency}) — tenant ${tenantId}`,
      );
    } catch (err) {
      this.logger.error(
        `onBookingConfirmed: failed for booking ${bookingId} — ${(err as Error).message}`,
        (err as Error).stack,
      );
      // Do not rethrow — Booking must not fail because Finance fails
    }
  }

  // ── BOOKING_CANCELLED ─────────────────────────────────────────────────────

  /**
   * Voids the invoice when a booking is cancelled.
   *
   * Idempotency:
   *   InvoiceService.void() guards against double-voiding via status check.
   *   If no invoice exists for this booking, exits cleanly.
   */
  @OnEvent(BOOKING_CANCELLED, { async: true })
  async onBookingCancelled(payload: {
    tenantId:  string;
    bookingId: string;
    actorId:   string;
    timestamp: string;
  }): Promise<void> {
    const { tenantId, bookingId, actorId } = payload;
    try {
      const ref = await this.invoiceRepository.findReference(
        'booking', bookingId, tenantId,
      );
      if (!ref) {
        this.logger.debug(
          `onBookingCancelled: no invoice for booking ${bookingId} — skip`,
        );
        return;
      }

      const invoice = await this.invoiceRepository.findById(ref.invoiceId, tenantId);
      if (!invoice) {
        this.logger.warn(
          `onBookingCancelled: InvoiceReference points to missing invoice ${ref.invoiceId} — skip`,
        );
        return;
      }

      // Already in terminal state — idempotent
      if (invoice.status === 'voided' || invoice.status === 'refunded') {
        this.logger.debug(
          `onBookingCancelled: invoice ${ref.invoiceNumber} already ${invoice.status} — skip`,
        );
        return;
      }

      await this.invoiceService.void(
        invoice.id,
        { reason: 'Booking cancelled' },
        tenantId,
        actorId,
      );

      this.logger.log(
        `onBookingCancelled: invoice ${ref.invoiceNumber} voided for booking ${bookingId} — tenant ${tenantId}`,
      );
    } catch (err) {
      this.logger.error(
        `onBookingCancelled: failed for booking ${bookingId} — ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }

  // ── BOOKING_REFUNDED ──────────────────────────────────────────────────────

  /**
   * Creates Finance refunds when a booking refund is recorded.
   *
   * Producer: BookingService.processRefund() — emits after transaction commits.
   *
   * CORRELATION MODEL (Batch 7.5E):
   * ─────────────────────────────────────────────────────────────────────────
   * BookingPaymentEntity.providerPaymentId is the gateway payment ID recorded
   * when a payment is captured externally (Stripe PaymentIntent, Razorpay order, etc).
   * Finance PaymentEntity.gatewayPaymentId is the same gateway payment ID,
   * recorded when PaymentService.capture() completes.
   *
   * Correlation: providerPaymentId → gatewayPaymentId
   *   BookingPayment → Finance Payment is resolved as:
   *     SELECT FROM finance_payments WHERE gatewayPaymentId = booking_payment.providerPaymentId
   *
   * This is explicit, stable, gateway-assigned, and set independently by both domains.
   * No inference by amount, timestamp, allocation order, or customer ID.
   *
   * CASH / NO-GATEWAY PAYMENTS:
   *   If BookingPaymentEntity.providerPaymentId is NULL (cash, voucher, manual),
   *   the correlation cannot be established. This allocation is logged as a
   *   BLOCKING error and NO Finance refund is issued. The Finance refund for
   *   that portion must be handled manually or via a future cash payment correlation.
   *
   * ATOMICITY:
   *   All correlations are resolved BEFORE any RefundService call.
   *   If any correlation fails, NO Finance refund calls are made.
   *   This prevents partial Finance refund execution.
   *
   * IDEMPOTENCY:
   *   Each Finance refund uses key: bkref_<bookingRefundId>_<bookingPaymentId>
   *   UNIQUE (tenant_id, idempotency_key) on finance_refunds prevents duplicates.
   */
  @OnEvent(BOOKING_REFUNDED, { async: true })
  async onBookingRefunded(payload: {
    tenantId:        string;
    bookingId:       string;
    bookingRefundId: string;
    amountMinor:     number;
    currency:        string;
    actorId:         string;
    timestamp:       string;
  }): Promise<void> {
    const { tenantId, bookingId, bookingRefundId, amountMinor, currency, actorId } = payload;
    try {
      // ── Step 1: Resolve Finance invoice ─────────────────────────────
      const ref = await this.invoiceRepository.findReference(
        'booking', bookingId, tenantId,
      );
      if (!ref) {
        this.logger.warn(
          `onBookingRefunded [${bookingRefundId}]: no Finance invoice for ` +
          `booking ${bookingId} — cannot create Finance refund`,
        );
        return;
      }

      // ── Step 2: Load booking refund payment allocations ──────────────
      // Direct SQL — Finance never imports BookingModule.
      const allocRows = await this.dataSource.query<{
        booking_payment_id: string;
        amount_minor:       number;
      }[]>(
        `SELECT booking_payment_id, amount_minor
         FROM booking_refund_payment_allocations
         WHERE tenant_id = $1 AND booking_refund_id = $2
         ORDER BY booking_payment_id ASC`,
        [tenantId, bookingRefundId],
      );

      if (!allocRows.length) {
        this.logger.error(
          `onBookingRefunded [${bookingRefundId}]: no booking_refund_payment_allocations ` +
          `found — cannot create Finance refunds`,
        );
        return;
      }

      // ── Step 3: Verify allocation sum ────────────────────────────────
      const allocSum = allocRows.reduce((s, r) => s + r.amount_minor, 0);
      if (allocSum !== amountMinor) {
        this.logger.error(
          `onBookingRefunded [${bookingRefundId}]: allocation sum ${allocSum} ≠ ` +
          `event amountMinor ${amountMinor} — invariant violation, aborting`,
        );
        return;
      }

      // ── Step 4: Resolve ALL Finance payments before any RefundService call ─
      // Load each booking payment's providerPaymentId, then find Finance payment.
      const correlationPlan: Array<{
        bookingPaymentId:  string;
        financePaymentId:  string;
        allocationMinor:   number;
        idempotencyKey:    string;
      }> = [];

      for (const alloc of allocRows) {
        const bkPaymentId     = alloc.booking_payment_id;
        const allocationMinor = alloc.amount_minor;

        // Read booking payment's gateway ID
        const bkPayRows = await this.dataSource.query<{
          provider_payment_id: string | null;
        }[]>(
          `SELECT provider_payment_id
           FROM booking_payments
           WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE
           LIMIT 1`,
          [bkPaymentId, tenantId],
        );

        const bkPay = bkPayRows[0];
        if (!bkPay) {
          this.logger.error(
            `onBookingRefunded [${bookingRefundId}]: booking_payment ${bkPaymentId} ` +
            `not found — aborting all Finance refunds for this event`,
          );
          return;   // abort entire event — do not partially process
        }

        const providerPaymentId = bkPay.provider_payment_id;
        if (!providerPaymentId) {
          // Cash / voucher / manual — no gateway correlation possible
          this.logger.error(
            `onBookingRefunded [${bookingRefundId}]: booking_payment ${bkPaymentId} ` +
            `has no providerPaymentId (cash/manual). Finance refund for this ` +
            `allocation (${allocationMinor} ${currency}) cannot be automated. ` +
            `Manual Finance refund required. Aborting all Finance refunds for this event.`,
          );
          return;   // abort entire event — do not partially process
        }

        // Resolve Finance payment by gatewayPaymentId
        const financePayment = await this.paymentRepository.findByGatewayPaymentId(
          providerPaymentId, tenantId,
        );
        if (!financePayment) {
          this.logger.error(
            `onBookingRefunded [${bookingRefundId}]: no Finance payment with ` +
            `gatewayPaymentId="${providerPaymentId}" for tenant ${tenantId}. ` +
            `Aborting all Finance refunds for this event. ` +
            `Ensure Finance payment was captured with the same gateway ID.`,
          );
          return;   // abort entire event — do not partially process
        }

        // Invariant: exactly one Finance payment per gateway ID (enforced by index)
        correlationPlan.push({
          bookingPaymentId:  bkPaymentId,
          financePaymentId:  financePayment.id,
          allocationMinor,
          idempotencyKey:    `bkref_${bookingRefundId}_${bkPaymentId}`,
        });
      }

      // ── Step 5: All correlations resolved — now call RefundService ───
      // RefundService.requestRefund() is idempotent per idempotencyKey.
      for (const plan of correlationPlan) {
        await this.refundService.requestRefund(
          {
            paymentId:      plan.financePaymentId,
            invoiceId:      ref.invoiceId,
            amountMinor:    plan.allocationMinor,
            currency,
            idempotencyKey: plan.idempotencyKey,
            sourceType:     'booking',
            sourceId:       bookingId,
          },
          tenantId,
          actorId,
        );

        this.logger.log(
          `onBookingRefunded [${bookingRefundId}]: Finance refund created — ` +
          `financePaymentId=${plan.financePaymentId} ` +
          `bookingPaymentId=${plan.bookingPaymentId} ` +
          `amount=${plan.allocationMinor} ${currency} — tenant ${tenantId}`,
        );
      }

      this.logger.log(
        `onBookingRefunded [${bookingRefundId}]: ${correlationPlan.length} Finance ` +
        `refund(s) created totalling ${amountMinor} ${currency} — tenant ${tenantId}`,
      );

    } catch (err) {
      this.logger.error(
        `onBookingRefunded [${bookingRefundId}]: unexpected error — ${(err as Error).message}`,
        (err as Error).stack,
      );
      // Do not rethrow — Booking must not fail because Finance fails
    }
  }

}
