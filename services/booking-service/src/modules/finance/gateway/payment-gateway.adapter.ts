/**
 * PaymentGatewayAdapter — the boundary that isolates gateway-specific logic
 * from the Finance domain.
 *
 * Rules:
 *   - PaymentService ONLY calls this interface. It never contains
 *     gateway-specific logic.
 *   - All monetary values in and out of adapters are INTEGER minor currency units.
 *   - Adapters are registered by gateway name string in PaymentService.
 *   - New gateways (PayTM, Adyen, Square) are plug-in adapters — no changes
 *     to PaymentService required.
 *
 * Batch 7.2 delivers architecture-only stubs.
 * Real SDK integration is Batch 7.5 (gateway implementation sprint).
 */

// ── Input / Output types ──────────────────────────────────────────────────────

export interface GatewayInitiateInput {
  tenantId:        string;
  amountMinor:     number;
  currency:        string;
  customerId?:     string;
  idempotencyKey:  string;
  metadata?:       Record<string, unknown>;
}

export interface GatewayInitiateResult {
  gatewayPaymentId: string;
  gatewayStatus:    string;
  /** Client-side secret or redirect URL — returned to the calling UI. */
  clientSecret?:    string;
  rawResponse:      Record<string, unknown>;
}

export interface GatewayCaptureInput {
  gatewayPaymentId: string;
  amountMinor:      number;
  currency:         string;
  idempotencyKey:   string;
}

export interface GatewayCaptureResult {
  gatewayPaymentId: string;
  gatewayStatus:    string;
  capturedMinor:    number;
  rawResponse:      Record<string, unknown>;
}

export interface GatewayReconcileInput {
  gatewayPaymentId: string;
}

export interface GatewayReconcileResult {
  gatewayStatus: string;
  capturedMinor: number | null;
  rawResponse:   Record<string, unknown>;
}

// ── Interface ─────────────────────────────────────────────────────────────────

export abstract class PaymentGatewayAdapter {
  /** Gateway identifier matching PaymentEntity.gateway (e.g. 'stripe', 'razorpay'). */
  abstract readonly gatewayName: string;

  /**
   * Creates a payment intent / order on the gateway.
   * Returns a gateway-assigned payment ID and client secret for UI completion.
   */
  abstract initiate(input: GatewayInitiateInput): Promise<GatewayInitiateResult>;

  /**
   * Captures an authorised payment.
   * For gateways that auto-capture (Razorpay orders), this confirms the amount.
   */
  abstract capture(input: GatewayCaptureInput): Promise<GatewayCaptureResult>;

  /**
   * Queries the gateway for the current status of a payment.
   * Used by the reconciliation scheduler.
   */
  abstract reconcile(input: GatewayReconcileInput): Promise<GatewayReconcileResult>;
}

// ── StripeAdapter ─────────────────────────────────────────────────────────────

/**
 * StripeAdapter — architecture stub.
 *
 * Real implementation requires:
 *   npm install stripe
 *   STRIPE_SECRET_KEY environment variable
 *   STRIPE_WEBHOOK_SECRET for webhook verification
 *
 * Batch 7.5: replace stub bodies with real Stripe SDK calls.
 */
export class StripeAdapter extends PaymentGatewayAdapter {
  readonly gatewayName = 'stripe';

  async initiate(input: GatewayInitiateInput): Promise<GatewayInitiateResult> {
    // Stub: Batch 7.5 — new Stripe().paymentIntents.create({ ... })
    return {
      gatewayPaymentId: `pi_stub_${input.idempotencyKey}`,
      gatewayStatus:    'requires_payment_method',
      clientSecret:     `pi_stub_${input.idempotencyKey}_secret`,
      rawResponse:      { stub: true, gateway: 'stripe', input },
    };
  }

  async capture(input: GatewayCaptureInput): Promise<GatewayCaptureResult> {
    // Stub: Batch 7.5 — stripe.paymentIntents.capture(gatewayPaymentId)
    return {
      gatewayPaymentId: input.gatewayPaymentId,
      gatewayStatus:    'succeeded',
      capturedMinor:    input.amountMinor,
      rawResponse:      { stub: true, gateway: 'stripe', input },
    };
  }

  async reconcile(input: GatewayReconcileInput): Promise<GatewayReconcileResult> {
    // Stub: Batch 7.5 — stripe.paymentIntents.retrieve(gatewayPaymentId)
    return {
      gatewayStatus: 'succeeded',
      capturedMinor: null,
      rawResponse:   { stub: true, gateway: 'stripe', input },
    };
  }
}

// ── RazorpayAdapter ───────────────────────────────────────────────────────────

/**
 * RazorpayAdapter — architecture stub.
 *
 * Real implementation requires:
 *   npm install razorpay
 *   RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET environment variables
 *
 * Razorpay uses an order → payment flow (not a PaymentIntent):
 *   1. initiate() → creates a Razorpay Order (returns orderId)
 *   2. Client completes UPI / card payment using the orderId
 *   3. Webhook delivers payment.captured event
 *   4. capture() verifies the payment against the order
 *
 * Batch 7.5: replace stub bodies with real Razorpay SDK calls.
 */
export class RazorpayAdapter extends PaymentGatewayAdapter {
  readonly gatewayName = 'razorpay';

  async initiate(input: GatewayInitiateInput): Promise<GatewayInitiateResult> {
    // Stub: Batch 7.5 — razorpay.orders.create({ amount, currency, receipt })
    return {
      gatewayPaymentId: `order_stub_${input.idempotencyKey}`,
      gatewayStatus:    'created',
      rawResponse:      { stub: true, gateway: 'razorpay', input },
    };
  }

  async capture(input: GatewayCaptureInput): Promise<GatewayCaptureResult> {
    // Stub: Batch 7.5 — razorpay.payments.capture(paymentId, amount)
    return {
      gatewayPaymentId: input.gatewayPaymentId,
      gatewayStatus:    'captured',
      capturedMinor:    input.amountMinor,
      rawResponse:      { stub: true, gateway: 'razorpay', input },
    };
  }

  async reconcile(input: GatewayReconcileInput): Promise<GatewayReconcileResult> {
    // Stub: Batch 7.5 — razorpay.payments.fetch(gatewayPaymentId)
    return {
      gatewayStatus: 'captured',
      capturedMinor: null,
      rawResponse:   { stub: true, gateway: 'razorpay', input },
    };
  }
}
