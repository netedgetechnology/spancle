/**
 * Payment domain events — emitted by PaymentService only.
 * Follows the existing spancle.finance.* convention.
 */
export enum PaymentEvents {
  INITIATED    = 'spancle.finance.payment_initiated',
  AUTHORIZED   = 'spancle.finance.payment_authorized',
  CAPTURED     = 'spancle.finance.payment_captured',
  FAILED       = 'spancle.finance.payment_failed',
  ALLOCATED    = 'spancle.finance.payment_allocated',
  RECONCILED   = 'spancle.finance.payment_reconciled',
}

// ── Payload interfaces ─────────────────────────────────────────────────────────

export interface PaymentEventPayload {
  tenantId:         string;
  paymentId:        string;
  reference:        string | null;
  amountMinor:      number;
  currency:         string;
  method:           string;
  gateway:          string;
  status:           string;
  customerId:       string | null;
  timestamp:        string;
}

export interface PaymentCapturedPayload extends PaymentEventPayload {
  capturedAmountMinor: number;
  gatewayPaymentId:    string | null;
  journalEntryId:      string;
}

export interface PaymentFailedPayload extends PaymentEventPayload {
  failureReason: string | null;
}

export interface PaymentAllocatedPayload {
  tenantId:         string;
  paymentId:        string;
  invoiceId:        string;
  allocatedMinor:   number;
  currency:         string;
  invoiceStatus:    string;   // the new invoice status after allocation
  timestamp:        string;
}

export interface PaymentReconciledPayload {
  tenantId:         string;
  paymentId:        string;
  gatewayPaymentId: string | null;
  previousStatus:   string;
  newStatus:        string;
  timestamp:        string;
}
