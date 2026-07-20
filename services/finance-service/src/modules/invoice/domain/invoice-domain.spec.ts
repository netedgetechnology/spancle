/**
 * invoice-domain.spec.ts
 *
 * Tests for the Invoice domain aggregate, InvoiceLine value object,
 * domain events, and InvoiceResult factories.
 */
import { InvoiceLine }         from './invoice-line.value-object';
import { Invoice }             from './invoice.aggregate';
import {
  invoiceCreatedEvent, invoiceFinalizedEvent, invoiceCancelledEvent,
  invoiceCreated, invoiceUpdated, invoiceFinalized, invoiceCancelled, invoiceRejected,
  invoiceError,
  FinanceInvoiceEventTypes,
} from './invoice-domain';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TENANT = 'tenant-001';
const CUR    = 'GBP';

function makeLine(overrides: Partial<Parameters<typeof InvoiceLine.create>[0]> = {}): InvoiceLine {
  return InvoiceLine.create({
    lineId:         'line-001',
    description:    'Court booking',
    quantity:       1,
    unitPriceMinor: 2900,
    discountMinor:  0,
    taxRateBps:     0,
    ...overrides,
  });
}

function makeCustomer() {
  return Object.freeze({
    customerId:    'cust-001',
    customerName:  'Hardik Patel',
    customerEmail: 'hardik@example.com',
    customerPhone: null,
    taxNumber:     null,
  });
}

function makeDraft(lines: InvoiceLine[] = [makeLine()]): Invoice {
  return Invoice.createDraft({
    invoiceId:     'inv-001',
    tenantId:      TENANT,
    invoiceNumber: 'INV-2026-00001',
    currency:      CUR,
    customer:      makeCustomer(),
    issueDate:     '2026-07-19',
    dueDate:       '2026-08-18',
    notes:         null,
  }, lines);
}

// =============================================================================
// Tests
// =============================================================================

// ── InvoiceLine ───────────────────────────────────────────────────────────────

describe('InvoiceLine', () => {
  it('creates with correct properties', () => {
    const line = makeLine({ quantity: 2, unitPriceMinor: 1500, discountMinor: 100 });
    expect(line.quantity).toBe(2);
    expect(line.unitPriceMinor).toBe(1500);
    expect(line.discountMinor).toBe(100);
  });

  it('grossMinor = quantity × unitPriceMinor', () => {
    const line = makeLine({ quantity: 2, unitPriceMinor: 1500 });
    expect(line.grossMinor).toBe(3000);
  });

  it('lineTotal = grossMinor − discountMinor', () => {
    const line = makeLine({ quantity: 2, unitPriceMinor: 1500, discountMinor: 200 });
    expect(line.lineTotal).toBe(2800);
  });

  it('lineTaxMinor computed from taxRateBps (floor division)', () => {
    const line = makeLine({ quantity: 1, unitPriceMinor: 10000, taxRateBps: 1800 }); // 18%
    expect(line.lineTaxMinor).toBe(1800);
  });

  it('0 taxRateBps → 0 tax', () => {
    expect(makeLine({ taxRateBps: 0 }).lineTaxMinor).toBe(0);
  });

  it('throws for fractional quantity', () => {
    expect(() => makeLine({ quantity: 1.5 })).toThrow(/positive integer/);
  });

  it('throws for zero quantity', () => {
    expect(() => makeLine({ quantity: 0 })).toThrow(/positive integer/);
  });

  it('throws for negative unitPriceMinor', () => {
    expect(() => makeLine({ unitPriceMinor: -1 })).toThrow(/non-negative integer/);
  });

  it('throws for negative discountMinor', () => {
    expect(() => makeLine({ discountMinor: -1 })).toThrow(/non-negative integer/);
  });

  it('throws when discountMinor exceeds gross', () => {
    expect(() => makeLine({ quantity: 1, unitPriceMinor: 100, discountMinor: 200 }))
      .toThrow(/exceeds gross/);
  });

  it('throws for taxRateBps > 10000', () => {
    expect(() => makeLine({ taxRateBps: 10001 })).toThrow(/0–10000/);
  });

  it('throws for missing description', () => {
    expect(() => makeLine({ description: '' })).toThrow(/description is required/);
  });

  it('withQuantity returns new instance, original unchanged', () => {
    const original = makeLine({ quantity: 1 });
    const updated  = original.withQuantity(3);
    expect(original.quantity).toBe(1);
    expect(updated.quantity).toBe(3);
  });

  it('withDiscount returns new instance', () => {
    const line    = makeLine({ quantity: 1, unitPriceMinor: 2000 });
    const updated = line.withDiscount(500);
    expect(updated.discountMinor).toBe(500);
    expect(line.discountMinor).toBe(0);
  });
});

// ── Invoice.createDraft ───────────────────────────────────────────────────────

describe('Invoice.createDraft()', () => {
  it('creates in DRAFT status', () => {
    expect(makeDraft().status).toBe('DRAFT');
    expect(makeDraft().isDraft).toBe(true);
  });

  it('version starts at 1', () => {
    expect(makeDraft().version).toBe(1);
  });

  it('accepts initial lines', () => {
    const inv = makeDraft([makeLine(), makeLine({ lineId: 'line-002' })]);
    expect(inv.lines).toHaveLength(2);
  });

  it('createdAt is a valid ISO-8601 string', () => {
    expect(() => new Date(makeDraft().createdAt)).not.toThrow();
  });
});

// ── Invoice.addLine ───────────────────────────────────────────────────────────

describe('Invoice.addLine()', () => {
  it('adds a line and returns new instance', () => {
    const inv     = makeDraft([]);
    const updated = inv.addLine(makeLine());
    expect(inv.lines).toHaveLength(0);
    expect(updated.lines).toHaveLength(1);
  });

  it('increments version', () => {
    const inv = makeDraft([]).addLine(makeLine());
    expect(inv.version).toBe(2);
  });

  it('throws when called on a FINALIZED invoice', () => {
    const finalized = makeDraft([makeLine()]).finalize();
    expect(() => finalized.addLine(makeLine({ lineId: 'new' }))).toThrow(/FINALIZED/);
  });

  it('throws when called on a CANCELLED invoice', () => {
    const cancelled = makeDraft([]).cancel();
    expect(() => cancelled.addLine(makeLine())).toThrow(/CANCELLED/);
  });
});

// ── Invoice.removeLine ────────────────────────────────────────────────────────

describe('Invoice.removeLine()', () => {
  it('removes a line by lineId', () => {
    const inv     = makeDraft([makeLine({ lineId: 'A' }), makeLine({ lineId: 'B' })]);
    const updated = inv.removeLine('A');
    expect(updated.lines).toHaveLength(1);
    expect(updated.lines[0]!.lineId).toBe('B');
  });

  it('throws for non-existent lineId', () => {
    expect(() => makeDraft([makeLine()]).removeLine('nonexistent')).toThrow(/not found/);
  });

  it('throws on FINALIZED invoice', () => {
    const finalized = makeDraft([makeLine()]).finalize();
    expect(() => finalized.removeLine('line-001')).toThrow(/FINALIZED/);
  });
});

// ── Invoice.replaceLine ───────────────────────────────────────────────────────

describe('Invoice.replaceLine()', () => {
  it('replaces a line by lineId', () => {
    const original = makeLine({ lineId: 'line-001', unitPriceMinor: 1000 });
    const replacement = makeLine({ lineId: 'line-001', unitPriceMinor: 2000 });
    const inv     = makeDraft([original]).replaceLine('line-001', replacement);
    expect(inv.lines[0]!.unitPriceMinor).toBe(2000);
  });

  it('throws for non-existent lineId', () => {
    expect(() => makeDraft([makeLine()]).replaceLine('XXXX', makeLine())).toThrow(/not found/);
  });
});

// ── Invoice.updateNotes / updateDueDate ───────────────────────────────────────

describe('Invoice field updates', () => {
  it('updateNotes sets notes on new instance', () => {
    const inv = makeDraft([]).updateNotes('Please pay promptly');
    expect(inv.notes).toBe('Please pay promptly');
  });

  it('updateDueDate sets dueDate on new instance', () => {
    const inv = makeDraft([]).updateDueDate('2026-09-01');
    expect(inv.dueDate).toBe('2026-09-01');
  });

  it('updateNotes throws on FINALIZED invoice', () => {
    const finalized = makeDraft([makeLine()]).finalize();
    expect(() => finalized.updateNotes('foo')).toThrow(/FINALIZED/);
  });
});

// ── Computed totals ───────────────────────────────────────────────────────────

describe('Invoice computed totals', () => {
  it('subtotalMinor = sum of line grossMinor', () => {
    const inv = makeDraft([
      makeLine({ quantity: 2, unitPriceMinor: 1500 }),
      makeLine({ lineId: 'line-002', quantity: 1, unitPriceMinor: 1000 }),
    ]);
    expect(inv.subtotalMinor).toBe(4000);
  });

  it('discountTotalMinor = sum of line discountMinor', () => {
    const inv = makeDraft([
      makeLine({ quantity: 1, unitPriceMinor: 3000, discountMinor: 300 }),
      makeLine({ lineId: 'l2', quantity: 1, unitPriceMinor: 1000, discountMinor: 100 }),
    ]);
    expect(inv.discountTotalMinor).toBe(400);
  });

  it('grandTotalMinor = subtotal − discount + tax', () => {
    const line = makeLine({ quantity: 1, unitPriceMinor: 10000, discountMinor: 0, taxRateBps: 1800 });
    const inv  = makeDraft([line]);
    // gross=10000, discount=0, tax=1800 → grand=11800
    expect(inv.grandTotalMinor).toBe(11800);
  });

  it('zero lines → all totals are 0', () => {
    const inv = makeDraft([]);
    expect(inv.subtotalMinor).toBe(0);
    expect(inv.grandTotalMinor).toBe(0);
  });
});

// ── Invoice.finalize ──────────────────────────────────────────────────────────

describe('Invoice.finalize()', () => {
  it('transitions DRAFT → FINALIZED', () => {
    const finalized = makeDraft([makeLine()]).finalize();
    expect(finalized.isFinalized).toBe(true);
    expect(finalized.status).toBe('FINALIZED');
  });

  it('increments version on finalization', () => {
    const finalized = makeDraft([makeLine()]).finalize();
    expect(finalized.version).toBe(2);
  });

  it('returns new instance — original still DRAFT', () => {
    const draft     = makeDraft([makeLine()]);
    const finalized = draft.finalize();
    expect(draft.isDraft).toBe(true);
    expect(finalized.isFinalized).toBe(true);
  });

  it('throws when no lines present', () => {
    expect(() => makeDraft([]).finalize()).toThrow(/no lines/);
  });

  it('throws when grandTotal is 0', () => {
    const zeroLine = makeLine({ unitPriceMinor: 0 });
    expect(() => makeDraft([zeroLine]).finalize()).toThrow(/grandTotal must be > 0/);
  });

  it('throws when called on CANCELLED invoice', () => {
    const cancelled = makeDraft([]).cancel();
    expect(() => cancelled.finalize()).toThrow(/CANCELLED → FINALIZED/);
  });

  it('throws when called on already FINALIZED invoice', () => {
    const finalized = makeDraft([makeLine()]).finalize();
    expect(() => finalized.finalize()).toThrow(/FINALIZED → FINALIZED/);
  });

  it('FINALIZED invoice is immutable — addLine throws', () => {
    const finalized = makeDraft([makeLine()]).finalize();
    expect(() => finalized.addLine(makeLine({ lineId: 'x' }))).toThrow(/FINALIZED/);
  });
});

// ── Invoice.cancel ────────────────────────────────────────────────────────────

describe('Invoice.cancel()', () => {
  it('transitions DRAFT → CANCELLED', () => {
    const cancelled = makeDraft([]).cancel();
    expect(cancelled.isCancelled).toBe(true);
  });

  it('throws when called on FINALIZED invoice', () => {
    const finalized = makeDraft([makeLine()]).finalize();
    expect(() => finalized.cancel()).toThrow(/FINALIZED → CANCELLED/);
  });

  it('throws when called on CANCELLED invoice', () => {
    const cancelled = makeDraft([]).cancel();
    expect(() => cancelled.cancel()).toThrow(/CANCELLED → CANCELLED/);
  });

  it('CANCELLED invoice cannot be finalized', () => {
    const cancelled = makeDraft([]).cancel();
    expect(() => cancelled.finalize()).toThrow(/CANCELLED → FINALIZED/);
  });
});

// ── Domain events ─────────────────────────────────────────────────────────────

describe('Invoice domain events', () => {
  it('invoiceCreatedEvent has correct eventType and required fields', () => {
    const inv   = makeDraft([makeLine()]);
    const event = invoiceCreatedEvent(inv, 'corr-001');
    expect(event.eventType).toBe(FinanceInvoiceEventTypes.INVOICE_CREATED);
    expect(event.invoiceId).toBe('inv-001');
    expect(event.tenantId).toBe(TENANT);
    expect(typeof event.eventId).toBe('string');
    expect(typeof event.occurredAt).toBe('string');
    expect(event.correlationId).toBe('corr-001');
    expect(event.lineCount).toBe(1);
    expect(Object.isFrozen(event)).toBe(true);
  });

  it('invoiceFinalizedEvent includes grandTotal and version', () => {
    const finalized = makeDraft([makeLine()]).finalize();
    const event     = invoiceFinalizedEvent(finalized, null);
    expect(event.eventType).toBe(FinanceInvoiceEventTypes.INVOICE_FINALIZED);
    expect(event.grandTotalMinor).toBe(2900);
    expect(event.version).toBe(2);
    expect(Object.isFrozen(event)).toBe(true);
  });

  it('invoiceCancelledEvent includes invoiceNumber and version', () => {
    const cancelled = makeDraft([]).cancel();
    const event     = invoiceCancelledEvent(cancelled, null);
    expect(event.eventType).toBe(FinanceInvoiceEventTypes.INVOICE_CANCELLED);
    expect(event.invoiceNumber).toBe('INV-2026-00001');
    expect(event.version).toBe(2);
  });

  it('each event has a unique eventId (UUID)', () => {
    const inv  = makeDraft([makeLine()]);
    const e1   = invoiceCreatedEvent(inv, null);
    const e2   = invoiceCreatedEvent(inv, null);
    expect(e1.eventId).not.toBe(e2.eventId);
  });
});

// ── InvoiceResult factories ───────────────────────────────────────────────────

describe('InvoiceResult factories', () => {
  it('invoiceCreated returns frozen success result with kind=InvoiceCreated', () => {
    const r = invoiceCreated(makeDraft([makeLine()]));
    expect(r.success).toBe(true);
    expect(r.kind).toBe('InvoiceCreated');
    expect(Object.isFrozen(r)).toBe(true);
  });

  it('invoiceUpdated returns kind=InvoiceUpdated', () => {
    expect(invoiceUpdated(makeDraft([])).kind).toBe('InvoiceUpdated');
  });

  it('invoiceFinalized returns kind=InvoiceFinalized', () => {
    const fin = makeDraft([makeLine()]).finalize();
    expect(invoiceFinalized(fin).kind).toBe('InvoiceFinalized');
  });

  it('invoiceCancelled returns kind=InvoiceCancelled', () => {
    expect(invoiceCancelled(makeDraft([]).cancel()).kind).toBe('InvoiceCancelled');
  });

  it('invoiceRejected returns frozen failure result', () => {
    const r = invoiceRejected('ALREADY_FINALIZED', [invoiceError('status', 'already finalized')]);
    expect(r.success).toBe(false);
    expect(r.kind).toBe('InvoiceRejected');
    expect(r.reason).toBe('ALREADY_FINALIZED');
    expect(Object.isFrozen(r)).toBe(true);
  });
});

// ── No accounting / ledger dependency ─────────────────────────────────────────

describe('No accounting or ledger dependency', () => {
  const fs   = require('fs') as typeof import('fs');
  const path = require('path') as typeof import('path');
  const files = [
    'src/modules/invoice/domain/invoice.aggregate.ts',
    'src/modules/invoice/domain/invoice-line.value-object.ts',
    'src/modules/invoice/domain/invoice-domain.ts',
  ];
  files.forEach((file) => {
    it(`${path.basename(file)} has no ledger, posting, or accounting imports`, () => {
      const source  = fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
      const imports = source.split('\n').filter((l) => l.trim().startsWith('import'));
      imports.forEach((line) => {
        expect(line).not.toMatch(/ledger|posting|accounting|typeorm/i);
        expect(line).not.toMatch(/EventEmitter|rabbitmq|kafka/i);
      });
    });
  });
});
