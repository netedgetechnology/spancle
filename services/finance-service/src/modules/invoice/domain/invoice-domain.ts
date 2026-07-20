/**
 * invoice-domain.ts
 *
 * Finance-layer invoice domain contracts:
 *   - IInvoiceNumberGenerator (interface only)
 *   - Invoice domain events (Finance domain namespace — distinct from InvoiceEvents enum)
 *   - InvoiceResult (typed discriminated union)
 *
 * These exist in the Finance domain layer, separate from the existing
 * InvoiceEvents enum (persistence/application layer) in invoice.events.ts.
 * Naming: FinanceInvoice* prefix to avoid collisions.
 */
import type { Invoice } from './invoice.aggregate';

// ── IInvoiceNumberGenerator ───────────────────────────────────────────────────

/**
 * Generator for human-readable invoice numbers.
 *
 * Infrastructure provides the implementation (sequential DB counter,
 * date-based, UUID-derived, etc.). The Invoice aggregate does not call
 * this directly — the application service calls it before creating a Draft
 * and supplies the number to the aggregate factory.
 *
 * Format examples: INV-2026-00001, T001-0042, 2026/07/001
 */
export interface IInvoiceNumberGenerator {
  /**
   * Generates the next invoice number for a tenant.
   * Must be unique per tenant.
   * Must be monotonically increasing within a tenant (no gaps guaranteed — gaps ok).
   */
  generate(tenantId: string): Promise<string>;
}

export const INVOICE_NUMBER_GENERATOR = Symbol('IInvoiceNumberGenerator');

// ── Finance-layer invoice domain events ───────────────────────────────────────

/** Base fields on every Finance domain invoice event. */
export interface FinanceInvoiceDomainEvent {
  readonly eventId:       string;
  readonly eventType:     FinanceInvoiceEventType;
  readonly invoiceId:     string;
  readonly tenantId:      string;
  readonly occurredAt:    string;    // ISO-8601
  readonly correlationId: string | null;
}

export const FinanceInvoiceEventTypes = {
  INVOICE_CREATED:    'spancle.finance.invoice.created',
  INVOICE_FINALIZED:  'spancle.finance.invoice.finalized',
  INVOICE_CANCELLED:  'spancle.finance.invoice.cancelled',
  INVOICE_LINE_ADDED: 'spancle.finance.invoice.line_added',
} as const;

export type FinanceInvoiceEventType =
  typeof FinanceInvoiceEventTypes[keyof typeof FinanceInvoiceEventTypes];

// ── InvoiceCreated ────────────────────────────────────────────────────────────

export interface FinanceInvoiceCreated extends FinanceInvoiceDomainEvent {
  readonly eventType:    typeof FinanceInvoiceEventTypes.INVOICE_CREATED;
  readonly invoiceNumber: string;
  readonly currency:     string;
  readonly lineCount:    number;
}

// ── InvoiceFinalized ──────────────────────────────────────────────────────────

export interface FinanceInvoiceFinalized extends FinanceInvoiceDomainEvent {
  readonly eventType:       typeof FinanceInvoiceEventTypes.INVOICE_FINALIZED;
  readonly invoiceNumber:   string;
  readonly grandTotalMinor: number;
  readonly currency:        string;
  readonly version:         number;
}

// ── InvoiceCancelled ──────────────────────────────────────────────────────────

export interface FinanceInvoiceCancelled extends FinanceInvoiceDomainEvent {
  readonly eventType:     typeof FinanceInvoiceEventTypes.INVOICE_CANCELLED;
  readonly invoiceNumber: string;
  readonly version:       number;
}

// ── Event factories ───────────────────────────────────────────────────────────

export function invoiceCreatedEvent(
  invoice:       Invoice,
  correlationId: string | null,
): FinanceInvoiceCreated {
  return Object.freeze({
    eventId:       crypto.randomUUID(),
    eventType:     FinanceInvoiceEventTypes.INVOICE_CREATED,
    invoiceId:     invoice.invoiceId,
    tenantId:      invoice.tenantId,
    occurredAt:    new Date().toISOString(),
    correlationId,
    invoiceNumber: invoice.invoiceNumber,
    currency:      invoice.currency,
    lineCount:     invoice.lines.length,
  });
}

export function invoiceFinalizedEvent(
  invoice:       Invoice,
  correlationId: string | null,
): FinanceInvoiceFinalized {
  return Object.freeze({
    eventId:          crypto.randomUUID(),
    eventType:        FinanceInvoiceEventTypes.INVOICE_FINALIZED,
    invoiceId:        invoice.invoiceId,
    tenantId:         invoice.tenantId,
    occurredAt:       new Date().toISOString(),
    correlationId,
    invoiceNumber:    invoice.invoiceNumber,
    grandTotalMinor:  invoice.grandTotalMinor,
    currency:         invoice.currency,
    version:          invoice.version,
  });
}

export function invoiceCancelledEvent(
  invoice:       Invoice,
  correlationId: string | null,
): FinanceInvoiceCancelled {
  return Object.freeze({
    eventId:       crypto.randomUUID(),
    eventType:     FinanceInvoiceEventTypes.INVOICE_CANCELLED,
    invoiceId:     invoice.invoiceId,
    tenantId:      invoice.tenantId,
    occurredAt:    new Date().toISOString(),
    correlationId,
    invoiceNumber: invoice.invoiceNumber,
    version:       invoice.version,
  });
}

// ── InvoiceResult ─────────────────────────────────────────────────────────────

export type InvoiceRejectionReason =
  | 'ALREADY_FINALIZED'    // mutation attempted on a FINALIZED invoice
  | 'ALREADY_CANCELLED'    // mutation attempted on a CANCELLED invoice
  | 'NO_LINES'             // finalize attempted with no lines
  | 'ZERO_TOTAL'           // finalize attempted with zero grandTotal
  | 'INVALID_LINE'         // line validation failed
  | 'DUPLICATE_LINE_ID'    // line with same lineId already exists
  | 'LINE_NOT_FOUND'       // removeLine/replaceLine target not found
  | 'INVALID_FIELD'        // a required field is missing or malformed
  | 'INTERNAL_ERROR';

export interface InvoiceError {
  readonly field:   string;
  readonly message: string;
}

// ── Success variants ──────────────────────────────────────────────────────────

export interface InvoiceCreatedResult {
  readonly kind:    'InvoiceCreated';
  readonly success: true;
  readonly invoice: Invoice;
}

export interface InvoiceUpdatedResult {
  readonly kind:    'InvoiceUpdated';
  readonly success: true;
  readonly invoice: Invoice;
}

export interface InvoiceFinalizedResult {
  readonly kind:    'InvoiceFinalized';
  readonly success: true;
  readonly invoice: Invoice;
}

export interface InvoiceCancelledResult {
  readonly kind:    'InvoiceCancelled';
  readonly success: true;
  readonly invoice: Invoice;
}

// ── Failure variant ───────────────────────────────────────────────────────────

export interface InvoiceRejectedResult {
  readonly kind:    'InvoiceRejected';
  readonly success: false;
  readonly reason:  InvoiceRejectionReason;
  readonly errors:  ReadonlyArray<InvoiceError>;
}

// ── Union ─────────────────────────────────────────────────────────────────────

export type InvoiceResult =
  | InvoiceCreatedResult
  | InvoiceUpdatedResult
  | InvoiceFinalizedResult
  | InvoiceCancelledResult
  | InvoiceRejectedResult;

// ── Factories ─────────────────────────────────────────────────────────────────

export function invoiceCreated(invoice: Invoice): InvoiceCreatedResult {
  return Object.freeze({ kind: 'InvoiceCreated', success: true, invoice });
}

export function invoiceUpdated(invoice: Invoice): InvoiceUpdatedResult {
  return Object.freeze({ kind: 'InvoiceUpdated', success: true, invoice });
}

export function invoiceFinalized(invoice: Invoice): InvoiceFinalizedResult {
  return Object.freeze({ kind: 'InvoiceFinalized', success: true, invoice });
}

export function invoiceCancelled(invoice: Invoice): InvoiceCancelledResult {
  return Object.freeze({ kind: 'InvoiceCancelled', success: true, invoice });
}

export function invoiceRejected(
  reason: InvoiceRejectionReason,
  errors: InvoiceError[],
): InvoiceRejectedResult {
  return Object.freeze({
    kind:   'InvoiceRejected',
    success: false,
    reason,
    errors: Object.freeze(errors),
  });
}

export function invoiceError(field: string, message: string): InvoiceError {
  return Object.freeze({ field, message });
}
