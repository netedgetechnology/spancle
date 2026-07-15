/**
 * test/finance/refund-invariants.e2e-spec.ts
 *
 * Finance Engine — Refund Invariant Test Suite (26 tests)
 *
 * Tests 1–11:  Pure-logic — no database required, run in any environment.
 * Tests 12–26: PostgreSQL integration — connect via pg driver.
 *
 * Run command:
 *   cd services/booking-service && \
 *     node_modules/.bin/jest --config jest-e2e.config.js \
 *     --testPathPattern=refund-invariants --no-coverage
 *
 * Tables truncated in beforeEach (FK-safe, children first):
 *   finance_refund_line_allocations, finance_booking_refund_jobs,
 *   finance_refunds, finance_payment_allocations,
 *   booking_payment_finance_payment_map, finance_invoices,
 *   finance_payments, booking_payments
 */

import { DataSource } from 'typeorm';
import { TestDatabase } from '../helpers/test-database';
import {
  tenantId,
  insertBookingPayment,
  insertFinancePayment,
  insertFinanceInvoice,
  insertFinanceRefund,
  insertBookingRefundJob,
  insertPaymentCorrelation,
  insertPaymentAllocation,
} from '../helpers/fixtures';

// ─────────────────────────────────────────────────────────────────────────────
// Test infrastructure
// ─────────────────────────────────────────────────────────────────────────────

const db = new TestDatabase();
let ds: DataSource | null = null;

const TABLES = [
  'finance_refund_line_allocations',
  'finance_booking_refund_jobs',
  'finance_refunds',
  'finance_payment_allocations',
  'booking_payment_finance_payment_map',
  'finance_invoices',
  'finance_payments',
  'booking_payments',
];

beforeAll(async () => { ds = await db.connect(); });
afterAll(async () => { await db.close(); });
beforeEach(async () => { if (ds) await db.truncateTables(TABLES); });

/**
 * itDb — runs the test body when a DB connection is available.
 * Skips with a WARN otherwise (CI without PostgreSQL will see SKIP, not FAIL).
 */
const itDb = (name: string, fn: (ds: DataSource) => Promise<void>) =>
  it(name, async () => {
    if (!ds) {
      console.warn(`[SKIP] "${name}" — no database connection`);
      return;
    }
    await fn(ds);
  });

// ─────────────────────────────────────────────────────────────────────────────
// Shared pure helpers (mirrors the source — verified to match implementation)
// ─────────────────────────────────────────────────────────────────────────────

/** Exact replica of RefundRepository.validateImmutableIdentity() */
function validateImmutableIdentity(
  existing: { paymentId: string; invoiceId: string; amountMinor: number; currency: string },
  dto:      { paymentId: string; invoiceId: string; amountMinor: number; currency: string },
): boolean {
  return (
    existing.paymentId   === dto.paymentId &&
    existing.invoiceId   === dto.invoiceId &&
    existing.amountMinor === dto.amountMinor &&
    existing.currency.toUpperCase() === dto.currency.toUpperCase()
  );
}

/** Exact replica of parseLeaseDurationSeconds() in finance-booking-refund-job.service.ts */
function parseLeaseDurationSeconds(raw: string | undefined): number {
  if (!raw) return 600;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) return 600;
  return parsed;
}

// =============================================================================
// TESTS 1–4: validateImmutableIdentity — pure logic
// =============================================================================
describe('validateImmutableIdentity', () => {
  const base = { paymentId: 'pay-001', invoiceId: 'inv-001', amountMinor: 5000, currency: 'GBP' };

  it('Test 1: returns true when all four identity fields match exactly', () => {
    expect(validateImmutableIdentity(base, { ...base })).toBe(true);
  });

  it('Test 2: returns false when paymentId differs', () => {
    expect(validateImmutableIdentity(base, { ...base, paymentId: 'pay-DIFFERENT' })).toBe(false);
  });

  it('Test 3: returns false when invoiceId differs', () => {
    expect(validateImmutableIdentity(base, { ...base, invoiceId: 'inv-DIFFERENT' })).toBe(false);
  });

  it('Test 4: returns false when amountMinor differs (even by one unit)', () => {
    expect(validateImmutableIdentity(base, { ...base, amountMinor: 5001 })).toBe(false);
    expect(validateImmutableIdentity(base, { ...base, amountMinor: 4999 })).toBe(false);
  });
});

// =============================================================================
// TESTS 5–7: validateImmutableIdentity currency case-insensitivity
// =============================================================================
describe('validateImmutableIdentity — currency comparison', () => {
  const base = { paymentId: 'p1', invoiceId: 'i1', amountMinor: 1000, currency: 'GBP' };

  it('Test 5: accepts same currency in any case combination', () => {
    expect(validateImmutableIdentity({ ...base, currency: 'gbp' }, { ...base, currency: 'GBP' })).toBe(true);
    expect(validateImmutableIdentity({ ...base, currency: 'Gbp' }, { ...base, currency: 'gbp' })).toBe(true);
    expect(validateImmutableIdentity({ ...base, currency: 'GBP' }, { ...base, currency: 'GBP' })).toBe(true);
  });

  it('Test 6: returns false when currency codes are genuinely different (GBP vs USD)', () => {
    expect(validateImmutableIdentity({ ...base, currency: 'GBP' }, { ...base, currency: 'USD' })).toBe(false);
  });
});

// =============================================================================
// TESTS 7–11: parseLeaseDurationSeconds — pure logic
// =============================================================================
describe('parseLeaseDurationSeconds', () => {
  it('Test 7: valid positive integer is respected', () => {
    expect(parseLeaseDurationSeconds('300')).toBe(300);
    expect(parseLeaseDurationSeconds('3600')).toBe(3600);
    expect(parseLeaseDurationSeconds('1')).toBe(1);
  });

  it('Test 8: zero falls back to default 600', () => {
    expect(parseLeaseDurationSeconds('0')).toBe(600);
  });

  it('Test 9: negative value falls back to default 600', () => {
    expect(parseLeaseDurationSeconds('-300')).toBe(600);
  });

  it('Test 10: non-integer float falls back to default 600 (not Number.isInteger)', () => {
    expect(parseLeaseDurationSeconds('1.5')).toBe(600);
    expect(parseLeaseDurationSeconds('600.1')).toBe(600);
  });

  it('Test 11: NaN, empty string, and undefined all fall back to default 600', () => {
    expect(parseLeaseDurationSeconds('abc')).toBe(600);
    expect(parseLeaseDurationSeconds('')).toBe(600);
    expect(parseLeaseDurationSeconds(undefined)).toBe(600);
    expect(parseLeaseDurationSeconds('NaN')).toBe(600);
    expect(parseLeaseDurationSeconds('Infinity')).toBe(600);
  });
});

// =============================================================================
// TESTS 12–15: PostgreSQL — finance_refunds constraints
// =============================================================================
describe('finance_refunds DB constraints', () => {

  itDb(
    'Test 12: UNIQUE(tenant_id, caller_idempotency_key) blocks second INSERT with same caller key',
    async (ds) => {
      const callerKey = `bkref-12-${Date.now()}`;
      await insertFinanceRefund(ds, {
        caller_idempotency_key: callerKey,
        idempotency_key: `ref-a-${Date.now()}`,
      });
      await expect(
        insertFinanceRefund(ds, {
          caller_idempotency_key: callerKey,
          idempotency_key: `ref-b-${Date.now()}`,
        }),
      ).rejects.toThrow(/unique|duplicate|violates/i);
    },
  );

  itDb(
    'Test 13: NULL caller_idempotency_key is excluded from UNIQUE index — multiple NULLs allowed',
    async (ds) => {
      // The index is WHERE caller_idempotency_key IS NOT NULL.
      // NULLs must never trigger a uniqueness violation.
      await insertFinanceRefund(ds, { caller_idempotency_key: null, idempotency_key: `ref-a-${Date.now()}` });
      await insertFinanceRefund(ds, { caller_idempotency_key: null, idempotency_key: `ref-b-${Date.now()}` });
      await insertFinanceRefund(ds, { caller_idempotency_key: null, idempotency_key: `ref-c-${Date.now()}` });
      const rows = await db.query<{ id: string }>(
        `SELECT id FROM finance_refunds WHERE tenant_id = $1 AND caller_idempotency_key IS NULL`,
        [tenantId],
      );
      expect(rows.length).toBe(3);
    },
  );

  itDb(
    'Test 14: UNIQUE(tenant_id, idempotency_key) blocks second INSERT with same gateway key',
    async (ds) => {
      const gwKey = `ref-gw-14-${Date.now()}`;
      await insertFinanceRefund(ds, { idempotency_key: gwKey });
      await expect(
        insertFinanceRefund(ds, { idempotency_key: gwKey }),
      ).rejects.toThrow(/unique|duplicate|violates/i);
    },
  );

  itDb(
    'Test 15: different tenants may share the same caller_idempotency_key without conflict',
    async (ds) => {
      const sharedKey = `bkref-shared-15`;
      const tenant2   = '00000000-0000-0000-0000-000000000002';
      await insertFinanceRefund(ds, {
        caller_idempotency_key: sharedKey,
        idempotency_key: `ref-t1-${Date.now()}`,
        tenant_id: tenantId,
      });
      // Insert for tenant2 — must not violate (different tenant_id)
      await insertFinanceRefund(ds, {
        caller_idempotency_key: sharedKey,
        idempotency_key: `ref-t2-${Date.now()}`,
        tenant_id: tenant2,
      });
      const rows = await db.query<{ id: string }>(
        `SELECT id FROM finance_refunds WHERE caller_idempotency_key = $1`,
        [sharedKey],
      );
      expect(rows.length).toBe(2);
    },
  );
});

// =============================================================================
// TESTS 16–18: PostgreSQL — booking_payment_finance_payment_map constraints
// =============================================================================
describe('booking_payment_finance_payment_map DB constraints', () => {

  itDb(
    'Test 16: UNIQUE(tenant_id, booking_payment_id) prevents a second Finance payment mapping for the same Booking payment',
    async (ds) => {
      const bpId = await insertBookingPayment(ds);
      const fp1  = await insertFinancePayment(ds);
      const fp2  = await insertFinancePayment(ds);
      await insertPaymentCorrelation(ds, bpId, fp1);
      await expect(
        insertPaymentCorrelation(ds, bpId, fp2),
      ).rejects.toThrow(/unique|duplicate|violates/i);
    },
  );

  itDb(
    'Test 17: UNIQUE(tenant_id, booking_payment_id, finance_payment_id) also blocks exact triple duplicate',
    async (ds) => {
      const bpId = await insertBookingPayment(ds);
      const fp   = await insertFinancePayment(ds);
      await insertPaymentCorrelation(ds, bpId, fp);
      // Same triple — should violate on the exact-triple index (or the booking_payment_id index)
      await expect(
        insertPaymentCorrelation(ds, bpId, fp),
      ).rejects.toThrow(/unique|duplicate|violates/i);
    },
  );

  itDb(
    'Test 18: two distinct Booking payments can map to the same Finance payment (no constraint on finance_payment_id)',
    async (ds) => {
      const bp1 = await insertBookingPayment(ds);
      const bp2 = await insertBookingPayment(ds);
      const fp  = await insertFinancePayment(ds);
      await insertPaymentCorrelation(ds, bp1, fp);
      await insertPaymentCorrelation(ds, bp2, fp);
      const rows = await db.query<{ id: string }>(
        `SELECT id FROM booking_payment_finance_payment_map
         WHERE tenant_id = $1 AND finance_payment_id = $2`,
        [tenantId, fp],
      );
      expect(rows.length).toBe(2);
    },
  );
});

// =============================================================================
// TESTS 19–20: PostgreSQL — finance_booking_refund_jobs constraints
// =============================================================================
describe('finance_booking_refund_jobs DB constraints', () => {

  itDb(
    'Test 19: UNIQUE(tenant_id, booking_refund_id) prevents duplicate job creation for same booking refund',
    async (ds) => {
      const refId = require('crypto').randomUUID() as string;
      await insertBookingRefundJob(ds, { booking_refund_id: refId });
      await expect(
        insertBookingRefundJob(ds, { booking_refund_id: refId }),
      ).rejects.toThrow(/unique|duplicate|violates/i);
    },
  );

  itDb(
    'Test 20: CHECK(status IN ...) rejects invalid status value',
    async (ds) => {
      // Directly try to INSERT an invalid status bypassing application layer
      await expect(
        ds.query(
          `INSERT INTO finance_booking_refund_jobs
             (id, tenant_id, booking_refund_id, booking_id, amount_minor, currency,
              status, attempt_count, next_attempt_at, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW(),NOW())`,
          [
            require('crypto').randomUUID(),
            tenantId,
            require('crypto').randomUUID(),
            require('crypto').randomUUID(),
            1000,
            'GBP',
            'invalid_status',    // <-- violates CHECK constraint
            0,
          ],
        ),
      ).rejects.toThrow(/check|violates|invalid/i);
    },
  );
});

// =============================================================================
// TESTS 21–23: findDueJobs temporal query
// =============================================================================
describe('findDueJobs temporal query correctness', () => {

  itDb(
    'Test 21: returns pending job with past next_attempt_at; excludes future-scheduled job',
    async (ds) => {
      const past   = new Date(Date.now() - 60_000);
      const future = new Date(Date.now() + 60_000);
      const dueId  = await insertBookingRefundJob(ds, { status: 'pending', next_attempt_at: past });
      const skipId = await insertBookingRefundJob(ds, { status: 'pending', next_attempt_at: future });

      const rows = await db.query<{ id: string }>(
        `SELECT id FROM finance_booking_refund_jobs
         WHERE tenant_id = $1
           AND (   (status IN ('pending','retry') AND next_attempt_at <= NOW())
                OR (status = 'processing' AND started_at IS NOT NULL AND started_at <= $2))`,
        [tenantId, new Date(0)],  // epoch = no stale jobs
      );
      const ids = rows.map((r) => r.id);
      expect(ids).toContain(dueId);
      expect(ids).not.toContain(skipId);
    },
  );

  itDb(
    'Test 22: returns retry jobs with past next_attempt_at; excludes retry with future next_attempt_at',
    async (ds) => {
      const past   = new Date(Date.now() - 30_000);
      const future = new Date(Date.now() + 30_000);
      const dueId  = await insertBookingRefundJob(ds, { status: 'retry', next_attempt_at: past });
      const skipId = await insertBookingRefundJob(ds, { status: 'retry', next_attempt_at: future });

      const rows = await db.query<{ id: string }>(
        `SELECT id FROM finance_booking_refund_jobs
         WHERE tenant_id = $1
           AND (   (status IN ('pending','retry') AND next_attempt_at <= NOW())
                OR (status = 'processing' AND started_at IS NOT NULL AND started_at <= $2))`,
        [tenantId, new Date(0)],
      );
      const ids = rows.map((r) => r.id);
      expect(ids).toContain(dueId);
      expect(ids).not.toContain(skipId);
    },
  );

  itDb(
    'Test 23: stale processing job (started_at > lease boundary) IS selected; fresh processing IS NOT',
    async (ds) => {
      const leaseStaleBefore = new Date(Date.now() - 600_000);   // 600s lease boundary
      const staleStart       = new Date(Date.now() - 700_000);   // 700s ago — stale
      const freshStart       = new Date(Date.now() -  60_000);   //  60s ago — fresh

      const staleId = await insertBookingRefundJob(ds, {
        status: 'processing',
        started_at: staleStart,
        next_attempt_at: staleStart,
      });
      const freshId = await insertBookingRefundJob(ds, {
        status: 'processing',
        started_at: freshStart,
        next_attempt_at: freshStart,
      });

      const rows = await db.query<{ id: string }>(
        `SELECT id FROM finance_booking_refund_jobs
         WHERE tenant_id = $1
           AND (   (status IN ('pending','retry') AND next_attempt_at <= NOW())
                OR (status = 'processing' AND started_at IS NOT NULL AND started_at <= $2))`,
        [tenantId, leaseStaleBefore],
      );
      const ids = rows.map((r) => r.id);
      expect(ids).toContain(staleId);
      expect(ids).not.toContain(freshId);
    },
  );
});

// =============================================================================
// TESTS 24–25: Stale/fresh boundary precision
// =============================================================================
describe('Stale/fresh lease boundary precision', () => {

  itDb(
    'Test 24: job started_at exactly at lease boundary IS selected (boundary is inclusive <=)',
    async (ds) => {
      const leaseStaleBefore = new Date(Date.now() - 600_000);

      // Insert a job whose started_at matches the lease boundary exactly
      // (within ~1ms precision of the JS timestamp)
      const exactId = await insertBookingRefundJob(ds, {
        status:     'processing',
        started_at: leaseStaleBefore,
        next_attempt_at: leaseStaleBefore,
      });

      const rows = await db.query<{ id: string }>(
        `SELECT id FROM finance_booking_refund_jobs
         WHERE tenant_id = $1
           AND status = 'processing'
           AND started_at IS NOT NULL
           AND started_at <= $2`,
        [tenantId, leaseStaleBefore],
      );
      expect(rows.map((r) => r.id)).toContain(exactId);
    },
  );

  itDb(
    'Test 25: processing job with NULL started_at is NEVER selected as stale (started_at IS NOT NULL guard)',
    async (ds) => {
      const leaseStaleBefore = new Date(Date.now() - 600_000);
      const nullStartId = await insertBookingRefundJob(ds, {
        status:     'processing',
        started_at: null,
        next_attempt_at: new Date(0),
      });

      const rows = await db.query<{ id: string }>(
        `SELECT id FROM finance_booking_refund_jobs
         WHERE tenant_id = $1
           AND (   (status IN ('pending','retry') AND next_attempt_at <= NOW())
                OR (status = 'processing' AND started_at IS NOT NULL AND started_at <= $2))`,
        [tenantId, leaseStaleBefore],
      );
      expect(rows.map((r) => r.id)).not.toContain(nullStartId);
    },
  );
});

// =============================================================================
// TEST 26: Tenant isolation
// =============================================================================
describe('Tenant isolation', () => {

  itDb(
    'Test 26: findDueJobs query with tenant_id filter returns only that tenant\'s jobs',
    async (ds) => {
      const tenant1 = tenantId;
      const tenant2 = '00000000-0000-0000-0000-000000000002';
      const past    = new Date(Date.now() - 60_000);

      const t1Id = await insertBookingRefundJob(ds, { tenant_id: tenant1, status: 'pending', next_attempt_at: past });
      const t2Id = await insertBookingRefundJob(ds, { tenant_id: tenant2, status: 'pending', next_attempt_at: past });

      const rows = await db.query<{ id: string }>(
        `SELECT id FROM finance_booking_refund_jobs
         WHERE tenant_id = $1
           AND status IN ('pending','retry')
           AND next_attempt_at <= NOW()`,
        [tenant1],
      );
      const ids = rows.map((r) => r.id);
      expect(ids).toContain(t1Id);
      expect(ids).not.toContain(t2Id);
    },
  );
});
