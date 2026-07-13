/**
 * Refund domain events — emitted by RefundService only.
 * Follows the existing spancle.finance.* convention.
 */
export enum RefundEvents {
  PENDING    = 'spancle.finance.refund_pending',
  PROCESSING = 'spancle.finance.refund_processing',
  COMPLETED  = 'spancle.finance.refund_completed',
  REJECTED   = 'spancle.finance.refund_rejected',
}

export interface RefundEventBase {
  tenantId:     string;
  refundId:     string;
  refundNumber: string | null;
  paymentId:    string;
  invoiceId:    string;
  amountMinor:  number;
  currency:     string;
  status:       string;
  timestamp:    string;
}

export interface RefundPendingPayload extends RefundEventBase {}

export interface RefundProcessingPayload extends RefundEventBase {
  step1JournalEntryId: string;
}

export interface RefundCompletedPayload extends RefundEventBase {
  step1JournalEntryId: string;
  step2JournalEntryId: string;
}

export interface RefundRejectedPayload extends RefundEventBase {
  rejectionReason: string | null;
}
