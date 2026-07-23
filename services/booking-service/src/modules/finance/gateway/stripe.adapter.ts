import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService }                    from '@nestjs/config';
import Stripe                               from 'stripe';
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
 * StripeAdapter — production Stripe SDK implementation.
 *
 * Replaces the Batch 7.2 architecture stub with real API calls.
 *
 * Key design decisions:
 *   - Stripe client is created once in onModuleInit() — not in constructor,
 *     so ConfigService is fully resolved before the API key is read.
 *   - PaymentIntent is created with capture_method='automatic' by default.
 *     Override with STRIPE_CAPTURE_METHOD=manual to support manual capture.
 *   - All monetary values are integer minor units (Stripe native format).
 *   - Idempotency keys are passed to every mutating Stripe call.
 *   - Raw responses stored on PaymentEntity.gatewayMetadata for audit.
 *
 * Environment variables:
 *   STRIPE_SECRET_KEY      (required) — sk_live_... or sk_test_...
 *   STRIPE_CAPTURE_METHOD  (optional, default: 'automatic') — 'automatic' | 'manual'
 *   STRIPE_API_VERSION     (optional, default: '2024-06-20')
 */
@Injectable()
export class StripeAdapter extends PaymentGatewayAdapter implements OnModuleInit {
  readonly gatewayName = 'stripe';

  private readonly logger = new Logger(StripeAdapter.name);
  private stripe!: Stripe;

  constructor(private readonly config: ConfigService) {
    super();
  }

  onModuleInit(): void {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      this.logger.warn(
        'STRIPE_SECRET_KEY is not set — Stripe adapter will throw on first use. ' +
        'Set STRIPE_SECRET_KEY to a valid secret key.',
      );
    }

    const apiVersion = this.config.get<string>(
      'STRIPE_API_VERSION',
      '2024-06-20',
    ) as Stripe.LatestApiVersion;

    this.stripe = new Stripe(secretKey ?? '', { apiVersion });
    this.logger.log(`StripeAdapter initialised — apiVersion=${apiVersion}`);
  }

  // ── initiate() — create PaymentIntent ────────────────────────────────────

  /**
   * Creates a Stripe PaymentIntent.
   *
   * Returns:
   *   gatewayPaymentId: pi_xxxx  (PaymentIntent id)
   *   clientSecret:     pi_xxxx_secret_yyyy  (passed to Stripe.js / Elements)
   *   gatewayStatus:    Stripe PaymentIntent status string
   *
   * capture_method:
   *   'automatic' (default) — Stripe captures immediately on confirmation.
   *   'manual'              — requires explicit capture() call after auth.
   */
  async initiate(input: GatewayInitiateInput): Promise<GatewayInitiateResult> {
    const captureMethod = this.config.get<string>(
      'STRIPE_CAPTURE_METHOD', 'automatic',
    ) as 'automatic' | 'manual';

    const params: Stripe.PaymentIntentCreateParams = {
      amount:           input.amountMinor,
      currency:         input.currency.toLowerCase(),
      capture_method:   captureMethod,
      metadata: {
        idempotency_key: input.idempotencyKey,
        tenant_id:       input.tenantId,
        ...(input.metadata ? this.flattenMetadata(input.metadata) : {}),
      },
      ...(input.customerId ? { customer: input.customerId } : {}),
    };

    const intent = await this.stripe.paymentIntents.create(params, {
      idempotencyKey: input.idempotencyKey,
    });

    this.logger.debug(
      `PaymentIntent created — id=${intent.id} status=${intent.status} ` +
      `amount=${intent.amount} currency=${intent.currency}`,
    );

    return {
      gatewayPaymentId: intent.id,
      gatewayStatus:    intent.status,
      clientSecret:     intent.client_secret ?? undefined,
      rawResponse:      intent as unknown as Record<string, unknown>,
    };
  }

  // ── capture() — capture a manually-authorised PaymentIntent ──────────────

  /**
   * Captures an authorised PaymentIntent.
   *
   * Only applicable when capture_method='manual'. When capture_method='automatic'
   * Stripe captures at confirmation — this method is a no-op that retrieves
   * the current status.
   *
   * Idempotent: if the PaymentIntent is already in status 'succeeded',
   * returns the existing state without calling capture again.
   */
  async capture(input: GatewayCaptureInput): Promise<GatewayCaptureResult> {
    // Retrieve current status first — capture is not idempotent on already-captured PIs
    const existing = await this.stripe.paymentIntents.retrieve(input.gatewayPaymentId);

    if (existing.status === 'succeeded') {
      this.logger.debug(
        `PaymentIntent ${input.gatewayPaymentId} already succeeded — skipping capture`,
      );
      return {
        gatewayPaymentId: existing.id,
        gatewayStatus:    existing.status,
        capturedMinor:    existing.amount_received,
        rawResponse:      existing as unknown as Record<string, unknown>,
      };
    }

    if (existing.status !== 'requires_capture') {
      this.logger.warn(
        `PaymentIntent ${input.gatewayPaymentId} in unexpected status ` +
        `'${existing.status}' for capture — returning as-is`,
      );
      return {
        gatewayPaymentId: existing.id,
        gatewayStatus:    existing.status,
        capturedMinor:    existing.amount_received,
        rawResponse:      existing as unknown as Record<string, unknown>,
      };
    }

    const captured = await this.stripe.paymentIntents.capture(
      input.gatewayPaymentId,
      { amount_to_capture: input.amountMinor },
      { idempotencyKey: input.idempotencyKey },
    );

    this.logger.debug(
      `PaymentIntent captured — id=${captured.id} ` +
      `amount_received=${captured.amount_received}`,
    );

    return {
      gatewayPaymentId: captured.id,
      gatewayStatus:    captured.status,
      capturedMinor:    captured.amount_received,
      rawResponse:      captured as unknown as Record<string, unknown>,
    };
  }

  // ── reconcile() — retrieve PaymentIntent status ───────────────────────────

  /**
   * Retrieves the current state of a PaymentIntent for status reconciliation.
   * Used by the reconciliation job and admin dispute resolution.
   */
  async reconcile(input: GatewayReconcileInput): Promise<GatewayReconcileResult> {
    const intent = await this.stripe.paymentIntents.retrieve(input.gatewayPaymentId);

    return {
      gatewayStatus: intent.status,
      capturedMinor: intent.amount_received > 0 ? intent.amount_received : null,
      rawResponse:   intent as unknown as Record<string, unknown>,
    };
  }

  // ── refund() — issue a Stripe refund ─────────────────────────────────────

  /**
   * Issues a Stripe Refund against a captured PaymentIntent.
   *
   * Idempotency: idempotencyKey is stable (ref_<refund.id>) — safe to retry
   * on network timeout without creating duplicate refunds.
   *
   * Partial refunds: amountMinor < original → partial refund.
   * Full refunds:    amountMinor == original → full refund.
   */
  async refund(input: GatewayRefundInput): Promise<GatewayRefundResult> {
    const refund = await this.stripe.refunds.create(
      {
        payment_intent: input.gatewayPaymentId,
        amount:         input.amountMinor,
        metadata: {
          idempotency_key: input.idempotencyKey,
        },
      },
      { idempotencyKey: input.idempotencyKey },
    );

    this.logger.debug(
      `Stripe refund issued — id=${refund.id} ` +
      `amount=${refund.amount} status=${refund.status}`,
    );

    return {
      gatewayRefundId: refund.id,
      gatewayStatus:   refund.status ?? 'pending',
      rawResponse:     refund as unknown as Record<string, unknown>,
    };
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  /**
   * Stripe metadata values must be strings. Flatten one level.
   */
  private flattenMetadata(
    meta: Record<string, unknown>,
  ): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(meta)) {
      if (v != null) out[k] = String(v);
    }
    return out;
  }
}
