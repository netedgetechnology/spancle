export enum InvoiceEvents {
  CREATED         = 'spancle.invoice.created',
  UPDATED         = 'spancle.invoice.updated',
  DELETED         = 'spancle.invoice.deleted',
  STATUS_CHANGED  = 'spancle.invoice.status_changed',
  ISSUED          = 'spancle.invoice.issued',
  SENT            = 'spancle.invoice.sent',
  PAID            = 'spancle.invoice.paid',
  VOIDED          = 'spancle.invoice.voided',
  OVERDUE         = 'spancle.invoice.overdue',
  PAYMENT_RECORDED = 'spancle.invoice.payment_recorded',
}

export interface InvoiceEventPayload {
  tenantId:   string;
  invoiceId:  string;
  actorId?:   string | null;
  timestamp:  string;
}

export interface InvoiceStatusChangedPayload extends InvoiceEventPayload {
  previousStatus: string;
  newStatus:      string;
}

export interface InvoiceCreatedPayload extends InvoiceEventPayload {
  invoiceNumber:    string;
  grandTotalMinor:  number;
}

export interface InvoicePaymentRecordedPayload extends InvoiceEventPayload {
  amountMinor: number;
  newStatus:   string;
}
