/**
 * test/helpers/fixtures.ts
 *
 * Minimal factory functions for inserting test data directly via SQL.
 * These do NOT go through the application service layer — they build
 * the exact raw schema state that each test needs.
 */
import type { DataSource } from 'typeorm';

let seq = 0;
const id  = () => require('crypto').randomUUID() as string;
const seq_ = () => `${++seq}`.padStart(6, '0');
const tenantId = '00000000-0000-0000-0000-000000000001';

export { tenantId };

// ── booking_payments ─────────────────────────────────────────────────────────

export async function insertBookingPayment(
  ds: DataSource,
  overrides: Partial<{
    id: string;
    tenant_id: string;
    booking_id: string;
    amount_minor: number;
    amount_refunded_minor: number;
    currency: string;
    status: string;
    provider_payment_id: string | null;
    idempotency_key: string;
  }> = {},
): Promise<string> {
  const payId = overrides.id ?? id();
  await ds.query(
    `INSERT INTO booking_payments
       (id, tenant_id, booking_id, branch_id, method, gateway,
        status, amount_minor, amount_refunded_minor, currency,
        idempotency_key, provider_payment_id, created_by_id, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW())`,
    [
      payId,
      overrides.tenant_id ?? tenantId,
      overrides.booking_id ?? id(),
      id(),                                   // branch_id
      'online_card',                          // method
      'stripe',                               // gateway
      overrides.status ?? 'paid',
      overrides.amount_minor ?? 10000,
      overrides.amount_refunded_minor ?? 0,
      overrides.currency ?? 'GBP',
      overrides.idempotency_key ?? `key-${seq_()}`,
      overrides.provider_payment_id ?? null,
      id(),                                   // created_by_id
    ],
  );
  return payId;
}

// ── finance_payments ─────────────────────────────────────────────────────────

export async function insertFinancePayment(
  ds: DataSource,
  overrides: Partial<{
    id: string;
    tenant_id: string;
    amount_minor: number;
    currency: string;
    status: string;
    method: string;
    gateway: string;
    gateway_payment_id: string | null;
    idempotency_key: string;
    captured_amount_minor: number;
    unallocated_minor: number;
  }> = {},
): Promise<string> {
  const payId = overrides.id ?? id();
  await ds.query(
    `INSERT INTO finance_payments
       (id, tenant_id, status, method, gateway, currency,
        amount_minor, captured_amount_minor, unallocated_minor, allocated_minor,
        gateway_payment_id, idempotency_key, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())`,
    [
      payId,
      overrides.tenant_id ?? tenantId,
      overrides.status ?? 'captured',
      overrides.method ?? 'online_card',
      overrides.gateway ?? 'stripe',
      overrides.currency ?? 'GBP',
      overrides.amount_minor ?? 10000,
      overrides.captured_amount_minor ?? overrides.amount_minor ?? 10000,
      overrides.unallocated_minor ?? 0,
      0,                                      // allocated_minor
      overrides.gateway_payment_id ?? null,
      overrides.idempotency_key ?? `fp-${seq_()}`,
    ],
  );
  return payId;
}

// ── finance_invoices ─────────────────────────────────────────────────────────

export async function insertFinanceInvoice(
  ds: DataSource,
  overrides: Partial<{
    id: string;
    tenant_id: string;
    source_type: string;
    source_id: string;
    total_minor: number;
    subtotal_minor: number;
    amount_paid_minor: number;
    amount_refunded_minor: number;
    outstanding_minor: number;
    status: string;
    currency: string;
    customer_name: string;
  }> = {},
): Promise<string> {
  const invId = overrides.id ?? id();
  const total = overrides.total_minor ?? 10000;
  await ds.query(
    `INSERT INTO finance_invoices
       (id, tenant_id, invoice_number, status, source_type, source_id,
        customer_name, customer_email, currency,
        total_minor, subtotal_minor, discount_minor, tax_minor,
        amount_paid_minor, amount_refunded_minor, outstanding_minor,
        created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW(),NOW())`,
    [
      invId,
      overrides.tenant_id ?? tenantId,
      `INV-${seq_()}`,
      overrides.status ?? 'paid',
      overrides.source_type ?? 'booking',
      overrides.source_id ?? id(),
      overrides.customer_name ?? 'Test Customer',
      'test@example.com',
      overrides.currency ?? 'GBP',
      total,
      overrides.subtotal_minor ?? total,
      0,                                      // discount_minor
      0,                                      // tax_minor
      overrides.amount_paid_minor ?? total,
      overrides.amount_refunded_minor ?? 0,
      overrides.outstanding_minor ?? 0,
    ],
  );
  return invId;
}

// ── finance_payment_allocations ───────────────────────────────────────────────

export async function insertPaymentAllocation(
  ds: DataSource,
  paymentId: string,
  invoiceId: string,
  overrides: Partial<{ tenant_id: string; allocated_minor: number; currency: string }> = {},
): Promise<void> {
  await ds.query(
    `INSERT INTO finance_payment_allocations
       (id, tenant_id, payment_id, invoice_id, allocated_minor, currency, allocated_at)
     VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
    [
      id(),
      overrides.tenant_id ?? tenantId,
      paymentId,
      invoiceId,
      overrides.allocated_minor ?? 10000,
      overrides.currency ?? 'GBP',
    ],
  );
}

// ── finance_refunds ───────────────────────────────────────────────────────────

export async function insertFinanceRefund(
  ds: DataSource,
  overrides: Partial<{
    id: string;
    tenant_id: string;
    payment_id: string;
    invoice_id: string;
    status: string;
    amount_minor: number;
    currency: string;
    method: string;
    idempotency_key: string;
    caller_idempotency_key: string | null;
  }> = {},
): Promise<string> {
  const refId = overrides.id ?? id();
  await ds.query(
    `INSERT INTO finance_refunds
       (id, tenant_id, refund_number, payment_id, invoice_id,
        status, amount_minor, currency, method,
        idempotency_key, caller_idempotency_key, pending_at, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW(),NOW())`,
    [
      refId,
      overrides.tenant_id ?? tenantId,
      `REF-${seq_()}`,
      overrides.payment_id ?? id(),
      overrides.invoice_id ?? id(),
      overrides.status ?? 'pending',
      overrides.amount_minor ?? 3000,
      overrides.currency ?? 'GBP',
      overrides.method ?? 'online_card',
      overrides.idempotency_key ?? `ref-${seq_()}`,
      overrides.caller_idempotency_key ?? null,
    ],
  );
  return refId;
}

// ── finance_booking_refund_jobs ───────────────────────────────────────────────

export async function insertBookingRefundJob(
  ds: DataSource,
  overrides: Partial<{
    id: string;
    tenant_id: string;
    booking_refund_id: string;
    booking_id: string;
    amount_minor: number;
    currency: string;
    status: string;
    attempt_count: number;
    started_at: Date | null;
    next_attempt_at: Date;
  }> = {},
): Promise<string> {
  const jobId = overrides.id ?? id();
  await ds.query(
    `INSERT INTO finance_booking_refund_jobs
       (id, tenant_id, booking_refund_id, booking_id, amount_minor, currency,
        status, attempt_count, started_at, next_attempt_at, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())`,
    [
      jobId,
      overrides.tenant_id ?? tenantId,
      overrides.booking_refund_id ?? id(),
      overrides.booking_id ?? id(),
      overrides.amount_minor ?? 10000,
      overrides.currency ?? 'GBP',
      overrides.status ?? 'pending',
      overrides.attempt_count ?? 0,
      overrides.started_at ?? null,
      overrides.next_attempt_at ?? new Date(),
    ],
  );
  return jobId;
}

// ── booking_payment_finance_payment_map ───────────────────────────────────────

export async function insertPaymentCorrelation(
  ds: DataSource,
  bookingPaymentId: string,
  financePaymentId: string,
  tenantOverride?: string,
): Promise<string> {
  const mapId = id();
  await ds.query(
    `INSERT INTO booking_payment_finance_payment_map
       (id, tenant_id, booking_payment_id, finance_payment_id,
        correlation_source, metadata, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
    [
      mapId,
      tenantOverride ?? tenantId,
      bookingPaymentId,
      financePaymentId,
      'api',
      '{}',
    ],
  );
  return mapId;
}
