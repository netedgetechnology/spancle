import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService }                     from '@nestjs/config';
import type RazorpayTypes                    from 'razorpay';
import {
  PaymentGatewayAdapter,
  type GatewayInitiateInput,
  type GatewayInitiateResult,
  type GatewayCaptureInput,
  type GatewayCaptureResult,
  type GatewayReconcileInput,
  type GatewayReconcileResult,
  type GatewayRefundInput,
  type GatewayRefundResult,
} from './payment-gateway.adapter';

/**
 * RazorpayAdapter — production Razorpay SDK implementation.
 *
 * Replaces the architecture stub with real API calls using the Razorpay SDK.
 *
 * ── Razorpay payment flow ─────────────────────────────────────────────────
 *
 *   1. initiate()  → razorpay.orders.create()
 *                    Creates a Razorpay Order.  The orderId is returned as
 *                    gatewayPaymentId.  The client uses this orderId to open
 *                    the Razorpay Checkout / Standard Checkout popup.
 *
 *   2. Customer completes payment in the Razorpay UI (card / UPI / wallet).
 *
 *   3. Razorpay sends a webhook: payment.captured event.
 *      WebhookHandlerService.routeRazorpay() picks this up and resolves the
 *      financePaymentId via the orderId stored in entity.order_id.
 *
 *   4. capture()   → razorpay.payments.capture()
 *                    Verifies the payment amount matches the order amount.
 *                    Idempotent: status 'captured' is returned as-is.
 *
 *   5. reconcile() → razorpay.payments.fetch()
 *                    Used by the reconciliation job for status checks.
 *
 *   6. refund()    → razorpay.payments.refund()
 *                    Partial or full refund.  idempotencyKey stored in notes.
 *
 * ── Environment variables ──────────────────────────────────────────────────
 *
 *   RAZORPAY_KEY_ID         (required)  — rzp_live_... or rzp_test_...
 *   RAZORPAY_KEY_SECRET     (required)  — partner secret
 *   RAZORPAY_WEBHOOK_SECRET (required)  — for webhook HMAC verification
 *   RAZORPAY_CURRENCY       (optional, default: 'INR')
 *
 * ── Multi-tenant ───────────────────────────────────────────────────────────
 *
 *   Currently uses platform-level credentials from ConfigService.
 *   Per-tenant overrides are resolved by GatewayRegistry.getAdapterForTenant()
 *   once the tenant-credentials table is built (see GatewayRegistry).
 */
@Injectable()
export class RazorpayAdapter extends PaymentGatewayAdapter implements OnModuleInit {
  readonly gatewayName = 'razorpay';

  private readonly logger = new Logger(RazorpayAdapter.name);
  private razorpay!: RazorpayTypes;

  constructor(private readonly config: ConfigService) {
    super();
  }

  onModuleInit(): void {
    const keyId     = this.config.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET');

    if (!keyId || !keySecret) {
      this.logger.warn(
        'RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not set — ' +
        'Razorpay adapter will throw on first use.',
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const RazorpayClass = require('razorpay') as typeof RazorpayTypes;
    this.razorpay = new RazorpayClass({
      key_id:     keyId    ?? '',
      key_secret: keySecret ?? '',
    });

    this.logger.log('RazorpayAdapter initialised');
  }

  // ── initiate() — create Razorpay Order ────────────────────────────────────

  /**
   * Creates a Razorpay Order.
   *
   * The returned gatewayPaymentId is the Razorpay orderId (order_xxxx).
   * The client passes this orderId to the Razorpay Checkout popup.
   *
   * Amount: Razorpay accepts minor units (paise for INR) — same as our domain.
   * Receipt: idempotencyKey truncated to 40 chars (Razorpay limit).
   */
  async initiate(input: GatewayInitiateInput): Promise<GatewayInitiateResult> {
    const currency = this.config.get<string>('RAZORPAY_CURRENCY', 'INR');

    const orderParams = {
      amount:          input.amountMinor,
      currency:        input.currency || currency,
      receipt:         input.idempotencyKey.slice(0, 40),
      notes: {
        idempotency_key: input.idempotencyKey,
        tenant_id:       input.tenantId,
        ...(input.metadata ? this.flattenNotes(input.metadata) : {}),
      },
    };

    const order = await this.razorpay.orders.create(orderParams);

    this.logger.debug(
      `Razorpay order created — id=${order.id} ` +
      `status=${order.status} amount=${order.amount}`,
    );

    return {
      gatewayPaymentId: order.id,
      gatewayStatus:    order.status ?? 'created',
      // No clientSecret for Razorpay — the orderId is passed directly to checkout
      rawResponse:      order as unknown as Record<string, unknown>,
    };
  }

  // ── capture() — capture a Razorpay payment ────────────────────────────────

  /**
   * Captures a Razorpay payment.
   *
   * The gatewayPaymentId here is the Razorpay paymentId (pay_xxxx) resolved
   * from the webhook payload — NOT the orderId.
   *
   * Idempotent: if status is already 'captured', returns the current state.
   *
   * Razorpay auto-capture: if the Razorpay dashboard is set to auto-capture,
   * this call is a no-op that retrieves the existing captured state.
   */
  async capture(input: GatewayCaptureInput): Promise<GatewayCaptureResult> {
    // Fetch the payment first to check current status
    const payment = await this.razorpay.payments.fetch(input.gatewayPaymentId);

    if ((payment as unknown as Record<string, unknown>)['status'] === 'captured') {
      this.logger.debug(
        `Razorpay payment ${input.gatewayPaymentId} already captured — skipping`,
      );
      return {
        gatewayPaymentId: payment.id,
        gatewayStatus:    'captured',
        capturedMinor:    Number((payment as unknown as Record<string, unknown>)['amount'] ?? 0),
        rawResponse:      payment as unknown as Record<string, unknown>,
      };
    }

    const captured = await this.razorpay.payments.capture(
      input.gatewayPaymentId,
      input.amountMinor,
      input.currency || this.config.get<string>('RAZORPAY_CURRENCY', 'INR'),
    );

    this.logger.debug(
      `Razorpay payment captured — id=${captured.id} ` +
      `amount=${(captured as unknown as Record<string, unknown>)['amount']}`,
    );

    return {
      gatewayPaymentId: captured.id,
      gatewayStatus:    (captured as unknown as Record<string, unknown>)['status'] as string ?? 'captured',
      capturedMinor:    Number((captured as unknown as Record<string, unknown>)['amount'] ?? input.amountMinor),
      rawResponse:      captured as unknown as Record<string, unknown>,
    };
  }

  // ── reconcile() — fetch Razorpay payment status ───────────────────────────

  /**
   * Fetches the current state of a Razorpay payment for reconciliation.
   * gatewayPaymentId is either paymentId (pay_xxxx) or orderId (order_xxxx).
   * If it's an orderId, fetches order.fetchPayments() to get the payment state.
   */
  async reconcile(input: GatewayReconcileInput): Promise<GatewayReconcileResult> {
    if (input.gatewayPaymentId.startsWith('order_')) {
      // Fetch payments for the order
      const result = await this.razorpay.orders.fetchPayments(input.gatewayPaymentId);
      const items  = (result as Record<string, unknown>)['items'] as Array<Record<string, unknown>> | undefined;
      const payment = items?.[0];

      return {
        gatewayStatus: (payment?.['status'] as string | undefined) ?? 'created',
        capturedMinor: payment?.['status'] === 'captured'
          ? Number(payment?.['amount'] ?? 0)
          : null,
        rawResponse: result as unknown as Record<string, unknown>,
      };
    }

    const payment = await this.razorpay.payments.fetch(input.gatewayPaymentId);
    const status  = (payment as unknown as Record<string, unknown>)['status'] as string | undefined;

    return {
      gatewayStatus: status ?? 'unknown',
      capturedMinor: status === 'captured'
        ? Number((payment as unknown as Record<string, unknown>)['amount'] ?? 0)
        : null,
      rawResponse: payment as unknown as Record<string, unknown>,
    };
  }

  // ── refund() — issue a Razorpay refund ────────────────────────────────────

  /**
   * Issues a refund for a captured Razorpay payment.
   *
   * gatewayPaymentId must be a paymentId (pay_xxxx).
   * idempotencyKey stored in notes.idempotency_key for deduplication.
   *
   * Partial refund: amountMinor < original payment amount.
   * Full refund:    amountMinor == original payment amount.
   *
   * Razorpay does not have a native idempotency header for refunds, so we
   * pass the key in notes and check for existing refunds with the same key
   * before issuing a new one. This is best-effort deduplication — the true
   * idempotency guard is the database-level RefundEntity unique constraint.
   */
  async refund(input: GatewayRefundInput): Promise<GatewayRefundResult> {
    // Check for an existing refund with the same idempotencyKey (best-effort dedup)
    const existingRefund = await this.findExistingRefundByKey(
      input.gatewayPaymentId,
      input.idempotencyKey,
    );

    if (existingRefund) {
      this.logger.warn(
        `Razorpay refund with key=${input.idempotencyKey} already exists ` +
        `— returning existing refund ${existingRefund.id}`,
      );
      return {
        gatewayRefundId: existingRefund.id as string,
        gatewayStatus:   (existingRefund['status'] as string | undefined) ?? 'processed',
        rawResponse:     existingRefund as Record<string, unknown>,
      };
    }

    const refund = await this.razorpay.payments.refund(
      input.gatewayPaymentId,
      {
        amount: input.amountMinor,
        notes:  { idempotency_key: input.idempotencyKey },
      },
    );

    this.logger.debug(
      `Razorpay refund issued — id=${refund.id} ` +
      `amount=${(refund as unknown as Record<string, unknown>)['amount']}`,
    );

    return {
      gatewayRefundId: refund.id,
      gatewayStatus:   (refund as unknown as Record<string, unknown>)['status'] as string ?? 'processed',
      rawResponse:     refund as unknown as Record<string, unknown>,
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Searches paginated refunds for the given payment to find one with a
   * matching idempotency_key in notes.
   */
  private async findExistingRefundByKey(
    paymentId:       string,
    idempotencyKey:  string,
  ): Promise<Record<string, unknown> | null> {
    try {
      const result = await this.razorpay.payments.fetchMultipleRefund(paymentId, { count: 25 });
      const items  = (result as Record<string, unknown>)['items'] as Array<Record<string, unknown>> | undefined;
      if (!items) return null;

      return items.find((r) => {
        const notes = r['notes'] as Record<string, string> | undefined;
        return notes?.['idempotency_key'] === idempotencyKey;
      }) ?? null;
    } catch {
      return null; // If fetch fails, proceed with refund (gateway will catch actual duplicates)
    }
  }

  /**
   * Razorpay notes values must be strings, max 15 key-value pairs.
   */
  private flattenNotes(meta: Record<string, unknown>): Record<string, string> {
    const out: Record<string, string> = {};
    let count = 0;
    for (const [k, v] of Object.entries(meta)) {
      if (count >= 13) break;          // leave 2 slots for idempotency_key + tenant_id
      if (v != null) { out[k] = String(v); count++; }
    }
    return out;
  }
}
