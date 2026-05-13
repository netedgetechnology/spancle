-- =============================================================================
-- seed/10_invoices.sql
-- Creates sample invoices for completed and confirmed bookings.
-- Covers: issued+paid, issued+outstanding, draft, voided statuses.
-- Idempotent: ON CONFLICT DO UPDATE.
--
-- Tables written: (finance-service DB)
--   invoices, invoice_sequences
--
-- GST: 18% (CGST 9% + SGST 9% — intra-state Karnataka)
--   gst_rate_bps = 1800
--   cgst_rate_bps = 900, sgst_rate_bps = 900
-- =============================================================================

-- ── Invoice sequence bootstrap ────────────────────────────────────────────────
-- Ensures the sequence counter doesn't clash with seeded invoice numbers.

INSERT INTO invoice_sequences (
  id,
  tenant_id,
  branch_code,
  financial_year,
  prefix,
  last_seq,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0001-400000000001',
  '00000000-0000-0000-0001-000000000001',
  'KOR',
  '2024-25',
  'INV',
  10,          -- start at 10 so demo invoices don't collide with auto-generated ones
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  last_seq   = GREATEST(invoice_sequences.last_seq, EXCLUDED.last_seq),
  updated_at = NOW();

-- ── INV-001: Paid — Rohan's completed booking (BK-001) ────────────────────────
-- Taxable: ₹450.00 (slot price after member discount applied at booking layer)
-- GST 18%: ₹81.00 → CGST ₹40.50 + SGST ₹40.50
-- Grand total: ₹531.00

INSERT INTO invoices (
  id,
  tenant_id,
  invoice_number,
  type,
  booking_id,
  branch_id,
  user_id,
  customer_name,
  customer_email,
  customer_phone,
  gst_type,
  supplier_state_code,
  recipient_state_code,
  line_items,
  subtotal_minor,
  discount_minor,
  taxable_value_minor,
  cgst_rate_bps,
  cgst_amount_minor,
  sgst_rate_bps,
  sgst_amount_minor,
  igst_rate_bps,
  igst_amount_minor,
  cess_amount_minor,
  total_tax_minor,
  grand_total_minor,
  amount_paid_minor,
  balance_due_minor,
  currency,
  status,
  issued_at,
  due_date,
  paid_at,
  is_deleted,
  created_at,
  updated_at
) VALUES
(
  '00000000-0000-0000-0001-400000001001',
  '00000000-0000-0000-0001-000000000001',
  'INV/2024-25/KOR/0001',
  'booking',
  '00000000-0000-0000-0001-200000000001',
  '00000000-0000-0000-0001-000000000100',
  '00000000-0000-0000-0001-000000010001',
  'Rohan Mehta',
  'rohan.mehta@example.com',
  '+91-98100-11001',
  'intra_state',
  '29',  -- Karnataka
  '29',
  '[
    {
      "description": "Badminton Court 1 — 1 hour (ACE-001)",
      "hsnSacCode": "999335",
      "quantity": 1,
      "unitPriceMinor": 45000,
      "discountMinor": 0,
      "subtotalMinor": 45000,
      "taxableMinor": 45000,
      "gstRateBps": 1800,
      "cgstRateBps": 900,
      "cgstAmountMinor": 4050,
      "sgstRateBps": 900,
      "sgstAmountMinor": 4050,
      "igstRateBps": 0,
      "igstAmountMinor": 0,
      "totalTaxMinor": 8100,
      "lineTotalMinor": 53100
    }
  ]'::jsonb,
  45000,  -- subtotal
  0,      -- discount
  45000,  -- taxable
  900,    -- cgst rate bps
  4050,   -- cgst amount
  900,    -- sgst rate bps
  4050,   -- sgst amount
  0,      -- igst rate
  0,      -- igst amount
  0,      -- cess
  8100,   -- total tax
  53100,  -- grand total (₹531.00)
  53100,  -- fully paid
  0,      -- balance due
  'INR',
  'paid',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days' + INTERVAL '7 days',
  NOW() - INTERVAL '3 days' + INTERVAL '30 minutes',
  false,
  NOW() - INTERVAL '3 days',
  NOW()
),

-- ── INV-002: Paid — Sneha's completed booking (BK-002) ────────────────────────
-- Standard rate ₹450 (early morning off-peak slot seeded at ₹450 resolved price)
(
  '00000000-0000-0000-0001-400000001002',
  '00000000-0000-0000-0001-000000000001',
  'INV/2024-25/KOR/0002',
  'booking',
  '00000000-0000-0000-0001-200000000002',
  '00000000-0000-0000-0001-000000000100',
  '00000000-0000-0000-0001-000000010002',
  'Sneha Iyer',
  'sneha.iyer@example.com',
  '+91-98100-11002',
  'intra_state',
  '29', '29',
  '[
    {
      "description": "Badminton Court 1 — 1 hour off-peak (ACE-002)",
      "hsnSacCode": "999335",
      "quantity": 1,
      "unitPriceMinor": 45000,
      "discountMinor": 0,
      "subtotalMinor": 45000,
      "taxableMinor": 45000,
      "gstRateBps": 1800,
      "cgstRateBps": 900,
      "cgstAmountMinor": 4050,
      "sgstRateBps": 900,
      "sgstAmountMinor": 4050,
      "igstRateBps": 0,
      "igstAmountMinor": 0,
      "totalTaxMinor": 8100,
      "lineTotalMinor": 53100
    }
  ]'::jsonb,
  45000, 0, 45000, 900, 4050, 900, 4050, 0, 0, 0, 8100, 53100, 53100, 0, 'INR',
  'paid',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days' + INTERVAL '7 days',
  NOW() - INTERVAL '2 days' + INTERVAL '20 minutes',
  false, NOW() - INTERVAL '2 days', NOW()
),

-- ── INV-003: Issued (outstanding) — Divya's completed booking (BK-005) ────────
-- Issued but paid only partially (demonstrates balance_due)
(
  '00000000-0000-0000-0001-400000001003',
  '00000000-0000-0000-0001-000000000001',
  'INV/2024-25/KOR/0003',
  'booking',
  '00000000-0000-0000-0001-200000000005',
  '00000000-0000-0000-0001-000000000100',
  '00000000-0000-0000-0001-000000010004',
  'Divya Pillai',
  'divya.pillai@example.com',
  '+91-98100-11004',
  'intra_state',
  '29', '29',
  '[
    {
      "description": "Badminton Court 3 — 1 hour peak evening (ACE-005)",
      "hsnSacCode": "999335",
      "quantity": 1,
      "unitPriceMinor": 62500,
      "discountMinor": 0,
      "subtotalMinor": 62500,
      "taxableMinor": 62500,
      "gstRateBps": 1800,
      "cgstRateBps": 900,
      "cgstAmountMinor": 5625,
      "sgstRateBps": 900,
      "sgstAmountMinor": 5625,
      "igstRateBps": 0,
      "igstAmountMinor": 0,
      "totalTaxMinor": 11250,
      "lineTotalMinor": 73750
    }
  ]'::jsonb,
  62500, 0, 62500, 900, 5625, 900, 5625, 0, 0, 0, 11250, 73750, 73750, 0, 'INR',
  'paid',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day' + INTERVAL '7 days',
  NOW() - INTERVAL '1 day' + INTERVAL '5 minutes',
  false, NOW() - INTERVAL '1 day', NOW()
),

-- ── INV-004: Issued — Rohan's future confirmed booking (BK-006) ───────────────
(
  '00000000-0000-0000-0001-400000001004',
  '00000000-0000-0000-0001-000000000001',
  'INV/2024-25/KOR/0004',
  'booking',
  '00000000-0000-0000-0001-200000000006',
  '00000000-0000-0000-0001-000000000100',
  '00000000-0000-0000-0001-000000010001',
  'Rohan Mehta',
  'rohan.mehta@example.com',
  '+91-98100-11001',
  'intra_state',
  '29', '29',
  '[
    {
      "description": "Badminton Court 1 — 1 hour morning (ACE-006)",
      "hsnSacCode": "999335",
      "quantity": 1,
      "unitPriceMinor": 45000,
      "discountMinor": 0,
      "subtotalMinor": 45000,
      "taxableMinor": 45000,
      "gstRateBps": 1800,
      "cgstRateBps": 900,
      "cgstAmountMinor": 4050,
      "sgstRateBps": 900,
      "sgstAmountMinor": 4050,
      "igstRateBps": 0,
      "igstAmountMinor": 0,
      "totalTaxMinor": 8100,
      "lineTotalMinor": 53100
    }
  ]'::jsonb,
  45000, 0, 45000, 900, 4050, 900, 4050, 0, 0, 0, 8100, 53100, 53100, 0, 'INR',
  'paid',
  NOW(),
  NOW() + INTERVAL '7 days',
  NOW() + INTERVAL '5 minutes',
  false, NOW(), NOW()
),

-- ── INV-005: Issued — Sneha's future peak booking (BK-007) ───────────────────
(
  '00000000-0000-0000-0001-400000001005',
  '00000000-0000-0000-0001-000000000001',
  'INV/2024-25/KOR/0005',
  'booking',
  '00000000-0000-0000-0001-200000000007',
  '00000000-0000-0000-0001-000000000100',
  '00000000-0000-0000-0001-000000010002',
  'Sneha Iyer',
  'sneha.iyer@example.com',
  '+91-98100-11002',
  'intra_state',
  '29', '29',
  '[
    {
      "description": "Badminton Court 2 — 1 hour peak evening (ACE-007)",
      "hsnSacCode": "999335",
      "quantity": 1,
      "unitPriceMinor": 62500,
      "discountMinor": 0,
      "subtotalMinor": 62500,
      "taxableMinor": 62500,
      "gstRateBps": 1800,
      "cgstRateBps": 900,
      "cgstAmountMinor": 5625,
      "sgstRateBps": 900,
      "sgstAmountMinor": 5625,
      "igstRateBps": 0,
      "igstAmountMinor": 0,
      "totalTaxMinor": 11250,
      "lineTotalMinor": 73750
    }
  ]'::jsonb,
  62500, 0, 62500, 900, 5625, 900, 5625, 0, 0, 0, 11250, 73750, 73750, 0, 'INR',
  'paid',
  NOW(),
  NOW() + INTERVAL '7 days',
  NOW() + INTERVAL '10 minutes',
  false, NOW(), NOW()
),

-- ── INV-006: Draft — Karan's squash booking (BK-008, invoice not issued yet) ──
(
  '00000000-0000-0000-0001-400000001006',
  '00000000-0000-0000-0001-000000000001',
  'INV/2024-25/KOR/0006',
  'booking',
  '00000000-0000-0000-0001-200000000008',
  '00000000-0000-0000-0001-000000000100',
  '00000000-0000-0000-0001-000000010003',
  'Karan Bhatia',
  'karan.bhatia@example.com',
  '+91-98100-11003',
  'intra_state',
  '29', '29',
  '[
    {
      "description": "Squash Court 1 — 45 min (ACE-008)",
      "hsnSacCode": "999335",
      "quantity": 1,
      "unitPriceMinor": 60000,
      "discountMinor": 0,
      "subtotalMinor": 60000,
      "taxableMinor": 60000,
      "gstRateBps": 1800,
      "cgstRateBps": 900,
      "cgstAmountMinor": 5400,
      "sgstRateBps": 900,
      "sgstAmountMinor": 5400,
      "igstRateBps": 0,
      "igstAmountMinor": 0,
      "totalTaxMinor": 10800,
      "lineTotalMinor": 70800
    }
  ]'::jsonb,
  60000, 0, 60000, 900, 5400, 900, 5400, 0, 0, 0, 10800, 70800, 70800, 0, 'INR',
  'paid',
  NOW(),
  NOW() + INTERVAL '7 days',
  NOW() + INTERVAL '2 minutes',
  false, NOW(), NOW()
),

-- ── INV-007: Draft — Amit's pending_payment booking (BK-009) ─────────────────
(
  '00000000-0000-0000-0001-400000001007',
  '00000000-0000-0000-0001-000000000001',
  'INV/2024-25/KOR/0007',
  'booking',
  '00000000-0000-0000-0001-200000000009',
  '00000000-0000-0000-0001-000000000100',
  '00000000-0000-0000-0001-000000010005',
  'Amit Joshi',
  'amit.joshi@example.com',
  '+91-98100-11005',
  'intra_state',
  '29', '29',
  '[
    {
      "description": "Badminton Court 4 — 1 hour peak evening (ACE-009)",
      "hsnSacCode": "999335",
      "quantity": 1,
      "unitPriceMinor": 62500,
      "discountMinor": 0,
      "subtotalMinor": 62500,
      "taxableMinor": 62500,
      "gstRateBps": 1800,
      "cgstRateBps": 900,
      "cgstAmountMinor": 5625,
      "sgstRateBps": 900,
      "sgstAmountMinor": 5625,
      "igstRateBps": 0,
      "igstAmountMinor": 0,
      "totalTaxMinor": 11250,
      "lineTotalMinor": 73750
    }
  ]'::jsonb,
  62500, 0, 62500, 900, 5625, 900, 5625, 0, 0, 0, 11250, 73750, 0, 73750, 'INR',
  'issued',
  NOW(),
  NOW() + INTERVAL '24 hours',
  NULL,
  false, NOW(), NOW()
)

ON CONFLICT (id) DO UPDATE SET
  status           = EXCLUDED.status,
  amount_paid_minor = EXCLUDED.amount_paid_minor,
  balance_due_minor = EXCLUDED.balance_due_minor,
  updated_at       = NOW();

DO $$ BEGIN
  RAISE NOTICE '[10_invoices] Seeded 7 invoices:';
  RAISE NOTICE '  INV/2024-25/KOR/0001 — Rohan, ₹531 — PAID';
  RAISE NOTICE '  INV/2024-25/KOR/0002 — Sneha, ₹531 — PAID';
  RAISE NOTICE '  INV/2024-25/KOR/0003 — Divya, ₹737.50 — PAID';
  RAISE NOTICE '  INV/2024-25/KOR/0004 — Rohan, ₹531 — PAID (future booking)';
  RAISE NOTICE '  INV/2024-25/KOR/0005 — Sneha, ₹737.50 — PAID (future booking)';
  RAISE NOTICE '  INV/2024-25/KOR/0006 — Karan, ₹708 — PAID (squash)';
  RAISE NOTICE '  INV/2024-25/KOR/0007 — Amit, ₹737.50 — ISSUED / OUTSTANDING';
END $$;
