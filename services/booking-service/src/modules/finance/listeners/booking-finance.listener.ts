import { Injectable, Logger } from '@nestjs/common';
import { OnEvent }            from '@nestjs/event-emitter';
import { InjectDataSource }   from '@nestjs/typeorm';
import { DataSource }         from 'typeorm';
import { InvoiceService }     from '../services/invoice.service';
import { InvoiceRepository }  from '../repositories/invoice.repository';
import { FinanceBookingRefundJobService } from '../services/finance-booking-refund-job.service';

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
    private readonly invoiceService:    InvoiceService,
    private readonly invoiceRepository: InvoiceRepository,
    private readonly jobService:        FinanceBookingRefundJobService,
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
   * Creates a durable FinanceBookingRefundJobEntity when a booking refund is recorded.
   * The actual Finance refund execution is handled by the job processor (@Cron).
   *
   * Producer: BookingService.processRefund() — emits after transaction commits.
   *
   * This listener is now an event-to-durable-job bridge only.
   * It does NOT call RefundService.requestRefund() directly.
   * Duplicate BOOKING_REFUNDED events create at most one job
   * (UNIQUE (tenant_id, booking_refund_id) on finance_booking_refund_jobs).
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
      const job = await this.jobService.enqueueBookingRefund({
        tenantId,
        bookingRefundId,
        bookingId,
        amountMinor,
        currency,
        actorId,
      });
      this.logger.log(
        `onBookingRefunded [${bookingRefundId}]: enqueued job ${job.id} ` +
        `status=${job.status} — tenant ${tenantId}`,
      );
    } catch (err) {
      this.logger.error(
        `onBookingRefunded [${bookingRefundId}]: failed to enqueue — ${(err as Error).message}`,
        (err as Error).stack,
      );
      // Do not rethrow — Booking must not fail because Finance fails
    }
  }

}
