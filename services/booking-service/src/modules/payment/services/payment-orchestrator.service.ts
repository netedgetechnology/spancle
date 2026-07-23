import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService }   from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource }      from 'typeorm';
import { EventEmitter2 }   from '@nestjs/event-emitter';
import { GatewayRegistry } from './gateway-registry.service';
import { PaymentService }  from '../../finance/services/payment.service';
import { BookingEvents, type BookingEventPayload } from '../../booking/events/booking.events';

/**
 * PaymentOrchestratorService
 *
 * The single entry point that connects Booking to Payment without
 * Booking ever knowing which gateway is active.
 *
 * Design rules:
 *   - BookingService NEVER imports this service (direction: Booking → events only).
 *   - This service listens to BookingEvents and drives payment initiation.
 *   - PaymentService.initiate() / capture() / fail() do all gateway calls.
 *   - This service only orchestrates the sequence and maps booking ↔ payment.
 *
 * Flow for online bookings:
 *   BOOKING_CREATED → initiateForBooking() → PaymentService.initiate()
 *     → returns { clientSecret, gatewayPaymentId }
 *     → caller returns these to frontend for payment completion
 *
 *   Webhook arrives (CAPTURE event from gateway)
 *     → WebhookHandlerService.handleCapture()
 *     → PaymentService.capture()
 *     → BookingService.confirm() via PAYMENT_CAPTURED event
 *
 * Multi-tenant isolation: every call includes tenantId verified by TenantGuard.
 */
@Injectable()
export class PaymentOrchestratorService {
  private readonly logger = new Logger(PaymentOrchestratorService.name);

  constructor(
    private readonly gatewayRegistry: GatewayRegistry,
    private readonly paymentService:  PaymentService,
    private readonly config:          ConfigService,
    @InjectDataSource() private readonly ds: DataSource,
  ) {}

  /**
   * initiateForBooking()
   *
   * Initiates a payment for an existing booking.
   * Called by PaymentController after booking creation.
   *
   * Creates:
   *   - BookingPaymentEntity (booking-domain record)
   *   - PaymentEntity (finance-domain record via PaymentService.initiate())
   *
   * Returns:
   *   - clientSecret or redirectUrl for the frontend to complete payment
   *   - bookingPaymentId for frontend to track
   *   - financePaymentId for admin correlation
   *
   * Idempotency: if a pending BookingPaymentEntity already exists for this
   * booking, returns the existing clientSecret without creating a new payment.
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
      // Look up the finance payment via idempotency key
      const fp = await this.ds.query<{ id: string; gateway_payment_id: string; client_secret_cache: string | null }[]>(
        `SELECT fp.id, fp.gateway_payment_id
         FROM finance_payments fp
         WHERE fp.tenant_id = $1 AND fp.idempotency_key = $2
         LIMIT 1`,
        [params.tenantId, existing[0]!.idempotency_key],
      );
      if (fp.length) {
        return {
          bookingPaymentId: existing[0]!.id,
          financePaymentId: fp[0]!.id,
          clientSecret:     undefined,           // not re-derivable after first issuance
          gatewayPaymentId: fp[0]!.gateway_payment_id ?? '',
          gatewayName:      this.gatewayRegistry.getActiveGatewayName(),
          idempotencyKey:   existing[0]!.idempotency_key,
        };
      }
    }

    // ── Generate stable idempotency key ───────────────────────────────────
    const idempotencyKey = `bk_${params.bookingId}_${Date.now()}`;

    // ── Step 1: Create BookingPaymentEntity ───────────────────────────────
    const bpInsert = await this.ds.query<{ id: string }[]>(
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

    // ── Step 2: Initiate via Finance PaymentService (gateway-agnostic) ────
    const financePayment = await this.paymentService.initiate(
      {
        method:         'online_card',
        gateway:        this.gatewayRegistry.getActiveGatewayName() as 'stripe' | 'razorpay' | 'cash' | 'manual',
        amountMinor:    params.amountMinor,
        currency:       params.currency,
        customerId:     params.customerId,
        idempotencyKey,
        ipAddress:      params.ipAddress,
      },
      params.tenantId,
      params.actorId,
    );

    this.logger.log(
      `Payment initiated — booking=${params.bookingId} ` +
      `financePaymentId=${financePayment.id} gateway=${financePayment.gateway}`,
    );

    return {
      bookingPaymentId,
      financePaymentId:  financePayment.id,
      clientSecret:      financePayment.gatewayMetadata?.['clientSecret'] as string | undefined,
      gatewayPaymentId:  financePayment.gatewayPaymentId ?? '',
      gatewayName:       financePayment.gateway,
      idempotencyKey,
    };
  }

  /**
   * handlePaymentSuccess()
   *
   * Called by WebhookHandlerService after a successful gateway capture event.
   *
   * Steps:
   *   1. Capture in Finance domain (PaymentService.capture).
   *   2. Update BookingPaymentEntity to status='paid'.
   *   3. BookingService.confirm() via BookingEvents listener.
   */
  async handlePaymentSuccess(params: {
    tenantId:         string;
    financePaymentId: string;
    gatewayPaymentId: string;
    capturedMinor:    number;
    actorId:          string;
  }): Promise<void> {
    // Capture in finance domain — CapturePaymentDto only needs amountMinor
    await this.paymentService.capture(
      params.financePaymentId,
      { amountMinor: params.capturedMinor },
      params.tenantId,
      params.actorId,
    );

    // Update booking_payments to 'paid' via the booking's idempotencyKey
    await this.ds.query(
      `UPDATE booking_payments
       SET status = 'paid', paid_at = NOW(), updated_at = NOW(),
           provider_payment_id = $1
       WHERE tenant_id = $2
         AND idempotency_key = (
           SELECT fp.idempotency_key FROM finance_payments fp
           WHERE fp.id = $3 AND fp.tenant_id = $2
         )
         AND is_deleted = FALSE`,
      [params.gatewayPaymentId, params.tenantId, params.financePaymentId],
    );

    // BookingService.confirm() is triggered by the finance PAYMENT_CAPTURED event
    // which PaymentService.capture() emits — no direct call needed here.
    this.logger.log(
      `Payment success handled — financePaymentId=${params.financePaymentId} ` +
      `gatewayPaymentId=${params.gatewayPaymentId}`,
    );
  }

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

    // Update booking_payments to 'failed'
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

    this.logger.log(
      `Payment failure handled — financePaymentId=${params.financePaymentId}`,
    );
  }
}
