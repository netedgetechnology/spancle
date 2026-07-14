-- =============================================================================
-- Migration 017 (booking-service DB) — Finance Refund Durability & Replay
--
-- Batch 7.5G. Three targeted changes:
--
-- PART A: Enforce one-to-one cardinality on booking_payment_finance_payment_map
--   Add UNIQUE (tenant_id, booking_payment_id)
--   Fails clearly if duplicate active mappings already exist.
--
-- PART B: Add caller_idempotency_key to finance_refunds
--   Preserves the upstream business idempotency key (bkref_*) separately
--   from the gateway key (ref_<uuid>) already stored in idempotency_key.
--
-- PART C: Create finance_booking_refund_jobs for durable replay
--
-- No DROP. No WHEN others THEN NULL. ON_ERROR_STOP compatible.
-- =============================================================================

\set ON_ERROR_STOP on

-- ── PART A: One-to-one cardinality on booking_payment_finance_payment_map ─────
--
-- V1 invariant: one BookingPayment maps to exactly one Finance Payment.
-- The current triple unique allows BP1→FP1 and BP1→FP2 to coexist.
--
-- Before adding the constraint, fail clearly if duplicates already exist.
-- DBA MUST resolve any duplicates before running this migration.

DO $$
DECLARE
  dup_count INT;
BEGIN
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT tenant_id, booking_payment_id
    FROM booking_payment_finance_payment_map
    GROUP BY tenant_id, booking_payment_id
    HAVING COUNT(*) > 1
  ) dupes;

  IF dup_count > 0 THEN
    RAISE EXCEPTION
      'Migration 017 BLOCKED: % Booking payment(s) have multiple Finance payment '
      'mappings in booking_payment_finance_payment_map. Resolve duplicates before '
      'adding the unique constraint. Query: SELECT tenant_id, booking_payment_id, '
      'COUNT(*) FROM booking_payment_finance_payment_map GROUP BY 1,2 HAVING COUNT(*) > 1',
      dup_count;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_bpfpm_booking_payment
  ON booking_payment_finance_payment_map (tenant_id, booking_payment_id);

-- ── PART B: caller_idempotency_key on finance_refunds ─────────────────────────
--
-- Preserves the upstream business idempotency key (e.g. bkref_<refundId>_<bkPayId>)
-- separately from the gateway idempotency key stored in idempotency_key (ref_<uuid>).
-- Existing rows have NULL (safe: the WHERE clause excludes NULLs from the index).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE  table_name  = 'finance_refunds'
    AND    column_name = 'caller_idempotency_key'
  ) THEN
    ALTER TABLE finance_refunds
      ADD COLUMN caller_idempotency_key VARCHAR(255);

    COMMENT ON COLUMN finance_refunds.caller_idempotency_key IS
      'Upstream/business idempotency key supplied by the caller, e.g. '
      'bkref_<bookingRefundId>_<bookingPaymentId>. '
      'Separate from idempotency_key (= ref_<refundId>) which is the gateway retry key.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_refunds_caller_idempotency_key
  ON finance_refunds (tenant_id, caller_idempotency_key)
  WHERE caller_idempotency_key IS NOT NULL;

-- ── PART C: finance_booking_refund_jobs ───────────────────────────────────────
--
-- Durable work item for BOOKING_REFUNDED processing.
-- The BOOKING_REFUNDED listener creates a job row; a @Cron scheduler executes it.
-- The job is replay-safe: each allocation uses callerIdempotencyKey for dedup.

CREATE TABLE IF NOT EXISTS finance_booking_refund_jobs (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID          NOT NULL,
  booking_refund_id UUID         NOT NULL,
  booking_id       UUID          NOT NULL,
  amount_minor     INT           NOT NULL,
  currency         VARCHAR(3)    NOT NULL,
  actor_id         UUID,
  status           VARCHAR(20)   NOT NULL DEFAULT 'pending',
  attempt_count    INT           NOT NULL DEFAULT 0,
  last_error       TEXT,
  next_attempt_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_fbrj_amount_positive CHECK (amount_minor > 0),
  CONSTRAINT chk_fbrj_status
    CHECK (status IN ('pending', 'processing', 'retry', 'completed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_booking_refund_jobs_refund
  ON finance_booking_refund_jobs (tenant_id, booking_refund_id);

-- Scheduler sweep: pending/retry jobs due for processing
CREATE INDEX IF NOT EXISTS idx_fbrj_due
  ON finance_booking_refund_jobs (tenant_id, status, next_attempt_at)
  WHERE status IN ('pending', 'retry');

CREATE INDEX IF NOT EXISTS idx_fbrj_booking_refund
  ON finance_booking_refund_jobs (tenant_id, booking_refund_id);
