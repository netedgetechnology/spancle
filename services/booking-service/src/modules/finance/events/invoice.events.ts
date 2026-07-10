/**
 * Finance domain events for Invoice lifecycle.
 * Follows the existing spancle.domain.action convention.
 * Emitted by InvoiceService only.
 * Written to finance_outbox (Batch 7.3) before relay; emitted via EventEmitter2 here.
 */
export enum InvoiceEvents {
  CREATED    = 'spancle.finance.invoice_created',
  FINALISED  = 'spancle.finance.invoice_finalised',
  VOIDED     = 'spancle.finance.invoice_voided',
}

// ── Payload interfaces ────────────────────────────────────────────────────────

export interface InvoiceCreatedPayload {
  tenantId:      string;
  invoiceId:     string;
  invoiceNumber: string | null;    // null when still draft
  sourceType:    string;
  sourceId:      string | null;
  customerId:    string | null;
  totalMinor:    number;
  currency:      string;
  status:        string;
  timestamp:     string;
}

export interface InvoiceFinalisedPayload extends InvoiceCreatedPayload {
  invoiceNumber: string;           // always set after finalise()
  issuedAt:      string;
  dueAt:         string | null;
  journalEntryId: string;
}

export interface InvoiceVoidedPayload {
  tenantId:        string;
  invoiceId:       string;
  invoiceNumber:   string | null;
  sourceType:      string;
  sourceId:        string | null;
  voidReason:      string;
  reversingEntryId: string;
  timestamp:       string;
}
