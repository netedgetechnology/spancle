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
 * Production implementations:
 *   - StripeAdapter   — stripe.adapter.ts    (Stripe SDK)
 *   - RazorpayAdapter — razorpay.adapter.ts  (Razorpay SDK)
 */

// ── DI token ─────────────────────────────────────────────────────────────────
/** DI token for the PaymentGatewayAdapter array injected into PaymentService. */
export const PAYMENT_GATEWAY_ADAPTERS = 'PAYMENT_GATEWAY_ADAPTERS' as const;

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

export interface GatewayRefundInput {
  gatewayPaymentId: string;
  amountMinor:      number;
  currency:         string;
  idempotencyKey:   string;   // stable: ref_<refund.id>
}

export interface GatewayRefundResult {
  gatewayRefundId: string;
  gatewayStatus:   string;
  rawResponse:     Record<string, unknown>;
}

export abstract class PaymentGatewayAdapter {
  abstract readonly gatewayName: string;
  abstract initiate(input: GatewayInitiateInput): Promise<GatewayInitiateResult>;
  abstract capture(input: GatewayCaptureInput): Promise<GatewayCaptureResult>;
  abstract reconcile(input: GatewayReconcileInput): Promise<GatewayReconcileResult>;
  /**
   * Issues a refund against an existing captured payment.
   * idempotencyKey is stable (ref_<refund.id>) — safe to retry on timeout.
   */
  abstract refund(input: GatewayRefundInput): Promise<GatewayRefundResult>;
}
