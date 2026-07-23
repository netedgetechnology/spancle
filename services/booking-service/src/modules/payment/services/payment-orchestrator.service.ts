import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService }   from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource }      from 'typeorm';
import { OnEvent }         from '@nestjs/event-emitter';
import { GatewayRegistry }          from './gateway-registry.service';
import { PaymentService }          from '../../finance/services/payment.service';
import { BookingService }          from '../../booking/services/booking.service';
import { RedisEventBusPublisher }  from '../../../common/event-bus/redis-event-bus.publisher';
import {
  PaymentEvents,
  type PaymentCapturedPayload,
} from '../../finance/events/payment.events';
import { BookingEvents, type BookingEventPayload } from '../../booking/events/booking.events';
import { randomUUID }      from 'node:crypto';

/**
 * PaymentOrchestratorService
 *
 * The single entry point that connects Booking to Payment without
 * Booking ever knowing which gateway is active.
 *
 * Design rules:
 *   - BookingService NEVER calls this service.
 *   - This service listens to PaymentEvents.CAPTURED and drives booking confirmation.
 *   - PaymentService.initiate() / capture() / fail() do all gateway calls.
 *   - This service only orchestrates the sequence and maps booking ↔ payment.
 *
 * Idempotency key format: bk_<bookingId>_<uuid>
 *   - bookingId prefix: human-readable, traceable per-booking.
 *   - UUID suffix: unique per attempt — allows legitimate retry after gateway
 *     failure without the idempotency path blocking a new attempt.
 *   - On retry: the idempotency path (pending booking_payments check) fires
 *     first and returns the existing pending payment before key generation
 *     is ever reached.
 *
 * Multi-tenant isolation: every call includes tenantId verified by TenantGuard.
 */
@Injectable()
export class PaymentOrchestratorService {
  private readonly logger = new Logger(PaymentOrchestratorService.name);

  constructor(
    private readonly gatewayRegistry: GatewayRegistry,
    private readonly paymentService:  PaymentService,
    private readonly bookingService:  BookingService,
    private readonly publisher:       RedisEventBusPublisher,
    private readonly config:          ConfigService,
    @InjectDataSource() private readonly ds: DataSource,
  ) {}

  // ── Fix 3: atomic BookingPaymentEntity + PaymentService.initiate() ────────

  /**
   * initiateForBooking()
   *
   * Creates a BookingPaymentEntity and a Finance PaymentEntity atomically.
   *
   * Idempotency path:
   *   If a pending booking_payments row already exists for this booking, the
   *   finance payment record is looked up via idempotency_key and returned.
   *   No new row is created.
   *
   * Transaction boundary:
   *   The booking_payments INSERT and PaymentService.initiate() run inside a
   *   single DataSource transaction. If initiate() throws, the booking_payments
   *   row is rolled back — no orphaned pending record.
   *
   * Fix 5 — idempotency key:
   *   Format: bk_<bookingId>_<uuid>
   *   The UUID suffix distinguishes retry attempts so a failed first attempt
   *   does not block a legitimate second attempt with a different key.
   */
  async initiateForBooking(params: {
    tenantId:       string;
    bookingId:      string;
    branchId:       string;
    amountMinor:    number;
    currency:       string;
    customerId?:    string;
    customerEmail:  string;
    actorId:        string;
    ipAddress?:     string;
  }): Promise<{
    bookingPaymentId:  string;
    financePaymentId:  string;
    clientSecret:      string | undefined;
    gatewayPaymentId:  string;
    gatewayName:       string;
    idempotencyKey:    string;
  }> {
    // ── Idempotency: check for existing pending booking payment ───────────
    // Runs OUTSIDE the transaction — read-only, safe to retry.
    const existing = await this.ds.query<{ id: string; idempotency_key: string }[]>(
      `SELECT id, idempotency_key FROM booking_payments
       WHERE booking_id = $1 AND tenant_id = $2 AND status = 'pending' AND is_deleted = FALSE
       LIMIT 1`,
      [params.bookingId, params.tenantId],
    );

    if (existing.length) {
      this.logger.log(
        `Idempotent: returning existing pending payment for booking=${params.bookingId}`,
      );
      const fp = await this.ds.query<{ id: string; gateway_payment_id: string }[]>(
        `SELECT id, gateway_payment_id
         FROM finance_payments
         WHERE tenant_id = $1 AND idempotency_key = $2
         LIMIT 1`,
        [params.tenantId, existing[0]!.idempotency_key],
      );
      if (fp.length) {
        return {
          bookingPaymentId: existing[0]!.id,
          financePaymentId: fp[0]!.id,
          clientSecret:     undefined,   // not re-derivable after first issuance
          gatewayPaymentId: fp[0]!.gateway_payment_id ?? '',
          gatewayName:      this.gatewayRegistry.getActiveGatewayName(),
          idempotencyKey:   existing[0]!.idempotency_key,
        };
      }
    }

    // ── Fix 5: race-safe idempotency key ──────────────────────────────────
    // UUID suffix ensures two concurrent requests for the same booking each
    // get a unique key and do not collide on the unique index.
    const idempotencyKey = `bk_${params.bookingId}_${randomUUID()}`;

    // ── Fix 3: atomic transaction ─────────────────────────────────────────
    // booking_payments INSERT and PaymentService.initiate() run together.
    // If initiate() throws, the entire transaction rolls back — no orphaned
    // pending booking_payments row.
    const result = await this.ds.transaction(async (manager) => {
      // Step 1 — Insert booking_payments row inside the transaction
      const bpInsert = await manager.query<{ id: string }[]>(
        `INSERT INTO booking_payments
           (id, tenant_id, branch_id, booking_id, status, payment_method,
            amount_minor, currency, provider, idempotency_key, created_by_id,
            is_deleted, amount_refunded_minor, created_at, updated_at)
         VALUES
           (gen_random_uuid(), $1, $2, $3, 'pending', 'card', $4, $5, $6, $7, $8,
            FALSE, 0, NOW(), NOW())
         RETURNING id`,
        [
          params.tenantId, params.branchId, params.bookingId,
          params.amountMinor, params.currency,
          this.gatewayRegistry.getActiveGatewayName(),
          idempotencyKey, params.actorId,
        ],
      );
      const bookingPaymentId = bpInsert[0]!.id;

      // Step 2 — Initiate via Finance PaymentService (gateway-agnostic)
      // PaymentService.initiate() calls the gateway adapter and persists a
      // finance_payments row. If this throws, the transaction rolls back and
      // the booking_payments INSERT above is undone.
      const financePayment = await this.paymentService.initiate(
        {
          method:         'online_card',
          gateway:        this.gatewayRegistry.getActiveGatewayName() as
                            'stripe' | 'razorpay' | 'cash' | 'manual',
          amountMinor:    params.amountMinor,
          currency:       params.currency,
          customerId:     params.customerId,
          idempotencyKey,
          ipAddress:      params.ipAddress,
        },
        params.tenantId,
        params.actorId,
      );

      return { bookingPaymentId, financePayment };
    });

    this.logger.log(
      `Payment initiated — booking=${params.bookingId} ` +
      `financePaymentId=${result.financePayment.id} ` +
      `gateway=${result.financePayment.gateway}`,
    );

    return {
      bookingPaymentId:  result.bookingPaymentId,
      financePaymentId:  result.financePayment.id,
      clientSecret:      result.financePayment.gatewayMetadata?.['clientSecret'] as
                           string | undefined,
      gatewayPaymentId:  result.financePayment.gatewayPaymentId ?? '',
      gatewayName:       result.financePayment.gateway,
      idempotencyKey,
    };
  }

  // ── Fix 1: PAYMENT_CAPTURED → BookingService.confirm() ───────────────────

  /**
   * onPaymentCaptured()
   *
   * Listens to PaymentEvents.CAPTURED emitted by PaymentService.capture().
   * Resolves the bookingId from booking_payments via the shared idempotency_key,
   * then calls BookingService.confirm() to complete the booking lifecycle.
   *
   * This is the missing link: without this listener a payment could succeed
   * but the booking would remain in pending_payment status indefinitely.
   *
   * Idempotent: BookingService.confirm() is a no-op if already confirmed.
   */
  @OnEvent(PaymentEvents.CAPTURED, { async: true })
  async onPaymentCaptured(payload: PaymentCapturedPayload): Promise<void> {
    const { tenantId, paymentId } = payload;

    // Resolve bookingId: booking_payments.idempotency_key = finance_payments.idempotency_key
    const rows = await this.ds.query<{ booking_id: string; id: string }[]>(
      `SELECT bp.booking_id, bp.id
       FROM booking_payments bp
       JOIN finance_payments fp
         ON fp.idempotency_key = bp.idempotency_key
         AND fp.tenant_id = bp.tenant_id
       WHERE fp.id = $1
         AND fp.tenant_id = $2
         AND bp.is_deleted = FALSE
       LIMIT 1`,
      [paymentId, tenantId],
    );

    if (!rows.length) {
      this.logger.warn(
        `onPaymentCaptured: no booking_payments row found for ` +
        `financePaymentId=${paymentId} tenant=${tenantId} — skipping confirm`,
      );
      return;
    }

    const { booking_id: bookingId, id: bookingPaymentId } = rows[0]!;

    // Mark booking_payments row as paid
    await this.ds.query(
      `UPDATE booking_payments
       SET status = 'paid', paid_at = NOW(), updated_at = NOW(),
           provider_payment_id = $1
       WHERE id = $2 AND tenant_id = $3 AND is_deleted = FALSE`,
      [payload.gatewayPaymentId ?? '', bookingPaymentId, tenantId],
    );

    // Publish PAYMENT_SUCCEEDED to Redis for communication-service
    await this.publisher.publishPaymentSucceeded({
      tenantId,
      paymentId,
      bookingId,
      amountMinor:      payload.amountMinor,
      currency:         payload.currency,
      gatewayPaymentId: payload.gatewayPaymentId ?? undefined,
    });

    // Confirm the booking — idempotent if already confirmed
    try {
      await this.bookingService.confirm(bookingId, tenantId, 'system:payment');
      this.logger.log(
        `Booking confirmed after payment capture — ` +
        `bookingId=${bookingId} financePaymentId=${paymentId}`,
      );
      // Publish BOOKING_CONFIRMED to Redis for communication-service
      await this.publisher.publishBookingConfirmed({
        tenantId,
        bookingId,
        actorId: 'system:payment',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // Log but do not re-throw — an already-confirmed booking is acceptable
      this.logger.warn(
        `onPaymentCaptured: BookingService.confirm failed for bookingId=${bookingId}: ${msg}`,
      );
    }
  }


  // ── Fix: bridge BOOKING_CANCELLED to Redis ───────────────────────────────

  /**
   * onBookingCancelled()
   *
   * Listens to the in-process BOOKING_CANCELLED event and publishes it to
   * the Redis event bus so communication-service can send cancellation emails.
   *
   * BookingService.cancel() is NOT modified — this is a pure additive bridge.
   * customerEmail is enriched here by a direct DB query on booking_payments
   * (already available via this.ds) to avoid importing BookingService.
   */
  @OnEvent(BookingEvents.CANCELLED, { async: true })
  async onBookingCancelled(payload: BookingEventPayload): Promise<void> {
    const { tenantId, bookingId, actorId } = payload;

    // Resolve customerEmail from bookings table
    const rows = await this.ds.query<{
      customer_email: string;
      customer_name:  string;
      reference:      string;
    }[]>(
      `SELECT customer_email, customer_name, reference
       FROM bookings
       WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE
       LIMIT 1`,
      [bookingId, tenantId],
    );

    const customerEmail = rows[0]?.customer_email;
    const customerName  = rows[0]?.customer_name;
    const reference     = rows[0]?.reference;

    if (!customerEmail) {
      this.logger.warn(
        `onBookingCancelled: no customerEmail found for bookingId=${bookingId} — skipping Redis publish`,
      );
      return;
    }

    await this.publisher.publishBookingCancelled({
      tenantId,
      bookingId,
      actorId: actorId ?? undefined,
      customerEmail,
      customerName,
      reference,
    });
  }

  // ── handlePaymentSuccess() ────────────────────────────────────────────────

  /**
   * handlePaymentSuccess()
   *
   * Called by WebhookHandlerService after a successful gateway capture event.
   * Delegates to PaymentService.capture(), which emits PAYMENT_CAPTURED,
   * which triggers onPaymentCaptured() above to confirm the booking.
   */
  async handlePaymentSuccess(params: {
    tenantId:         string;
    financePaymentId: string;
    gatewayPaymentId: string;
    capturedMinor:    number;
    actorId:          string;
  }): Promise<void> {
    await this.paymentService.capture(
      params.financePaymentId,
      { amountMinor: params.capturedMinor },
      params.tenantId,
      params.actorId,
    );
    // booking_payments update + BookingService.confirm() handled by onPaymentCaptured()
    this.logger.log(
      `Payment success handled — financePaymentId=${params.financePaymentId}`,
    );
  }

  // ── handlePaymentFailure() ────────────────────────────────────────────────

  /**
   * handlePaymentFailure()
   *
   * Called by WebhookHandlerService on payment_intent.payment_failed or equivalent.
   */
  async handlePaymentFailure(params: {
    tenantId:         string;
    financePaymentId: string;
    reason:           string;
    actorId:          string;
  }): Promise<void> {
    await this.paymentService.fail(
      params.financePaymentId,
      { reason: params.reason },
      params.tenantId,
      params.actorId,
    );

    await this.ds.query(
      `UPDATE booking_payments
       SET status = 'failed', failed_at = NOW(), failure_reason = $1, updated_at = NOW()
       WHERE tenant_id = $2
         AND idempotency_key = (
           SELECT fp.idempotency_key FROM finance_payments fp
           WHERE fp.id = $3 AND fp.tenant_id = $2
         )
         AND is_deleted = FALSE`,
      [params.reason, params.tenantId, params.financePaymentId],
    );

    // Publish PAYMENT_FAILED to Redis for communication-service
    await this.publisher.publishPaymentFailed({
      tenantId:   params.tenantId,
      paymentId:  params.financePaymentId,
      reason:     params.reason,
    });

    this.logger.log(
      `Payment failure handled — financePaymentId=${params.financePaymentId}`,
    );
  }
}
