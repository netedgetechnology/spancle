/**
 * invoice.aggregate.ts
 *
 * Invoice — Finance domain aggregate.
 *
 * This is a pure domain class — no TypeORM decorators.
 * Persistence uses InvoiceEntity (existing, separate file).
 *
 * Status lifecycle:
 *   DRAFT → FINALIZED   (immutable after finalization)
 *   DRAFT → CANCELLED
 *   (FINALIZED and CANCELLED are terminal — no further transitions)
 *
 * "FINALIZED" maps to the existing entity status 'issued'.
 * "CANCELLED" maps to the existing entity status 'cancelled'.
 * This vocabulary bridging is done in the repository layer.
 *
 * Immutability contract:
 *   - DRAFT invoices may have lines added/removed and fields edited.
 *   - FINALIZED invoices are immutable — all mutations throw.
 *   - All mutations return new instances (no in-place modification).
 *   - Totals are always derived (never stored directly on the aggregate
 *     itself — the entity stores them for query performance).
 */
import { InvoiceLine } from './invoice-line.value-object';

// ── InvoiceDomainStatus ───────────────────────────────────────────────────────

export type InvoiceDomainStatus = 'DRAFT' | 'FINALIZED' | 'CANCELLED';

const ALLOWED_TRANSITIONS: Record<InvoiceDomainStatus, InvoiceDomainStatus[]> = {
  DRAFT:     ['FINALIZED', 'CANCELLED'],
  FINALIZED: [],
  CANCELLED: [],
};

// ── CustomerSnapshot ──────────────────────────────────────────────────────────

export interface CustomerSnapshot {
  readonly customerId:    string;
  readonly customerName:  string;
  readonly customerEmail: string;
  readonly customerPhone: string | null;
  /** GSTIN or equivalent tax registration number. */
  readonly taxNumber:     string | null;
}

// ── InvoiceProps ──────────────────────────────────────────────────────────────

export interface InvoiceProps {
  readonly invoiceId:       string;
  readonly tenantId:        string;
  readonly invoiceNumber:   string;
  readonly currency:        string;
  readonly status:          InvoiceDomainStatus;
  readonly customer:        Readonly<CustomerSnapshot>;
  readonly issueDate:       string;    // ISO-8601 date only (YYYY-MM-DD)
  readonly dueDate:         string;    // ISO-8601 date only (YYYY-MM-DD)
  readonly notes:           string | null;
  /** Optimistic concurrency version. Starts at 1, incremented on each mutation. */
  readonly version:         number;
  /** ISO-8601 timestamp of creation. Set at DRAFT and never changed. */
  readonly createdAt:       string;
  /** ISO-8601 timestamp of last mutation. Updated on each returned instance. */
  readonly updatedAt:       string;
}

// ── Invoice aggregate ─────────────────────────────────────────────────────────

export class Invoice {
  private readonly _props: Readonly<InvoiceProps>;
  private readonly _lines: InvoiceLine[];

  private constructor(props: InvoiceProps, lines: InvoiceLine[]) {
    this._props = Object.freeze({ ...props });
    this._lines = lines;
  }

  // ── Factories ──────────────────────────────────────────────────────────────

  static createDraft(
    props: Omit<InvoiceProps, 'status' | 'version' | 'createdAt' | 'updatedAt'>,
    lines: InvoiceLine[] = [],
  ): Invoice {
    const now = new Date().toISOString();
    return new Invoice(
      { ...props, status: 'DRAFT', version: 1, createdAt: now, updatedAt: now },
      lines,
    );
  }

  static reconstitute(props: InvoiceProps, lines: InvoiceLine[]): Invoice {
    return new Invoice(props, lines);
  }

  // ── Property accessors ─────────────────────────────────────────────────────

  get invoiceId():     string               { return this._props.invoiceId; }
  get tenantId():      string               { return this._props.tenantId; }
  get invoiceNumber(): string               { return this._props.invoiceNumber; }
  get currency():      string               { return this._props.currency; }
  get status():        InvoiceDomainStatus  { return this._props.status; }
  get customer():      Readonly<CustomerSnapshot> { return this._props.customer; }
  get issueDate():     string               { return this._props.issueDate; }
  get dueDate():       string               { return this._props.dueDate; }
  get notes():         string | null        { return this._props.notes; }
  get version():       number               { return this._props.version; }
  get createdAt():     string               { return this._props.createdAt; }
  get updatedAt():     string               { return this._props.updatedAt; }
  get lines():         ReadonlyArray<InvoiceLine> { return this._lines; }

  get isDraft():     boolean { return this._props.status === 'DRAFT'; }
  get isFinalized(): boolean { return this._props.status === 'FINALIZED'; }
  get isCancelled(): boolean { return this._props.status === 'CANCELLED'; }

  // ── Derived totals ─────────────────────────────────────────────────────────

  /** Sum of all line grossMinor values. */
  get subtotalMinor(): number {
    return this._lines.reduce((sum, l) => sum + l.grossMinor, 0);
  }

  /** Sum of all line discountMinor values. */
  get discountTotalMinor(): number {
    return this._lines.reduce((sum, l) => sum + l.discountMinor, 0);
  }

  /**
   * Informational tax total from stored rates.
   * Authoritative tax is computed by the Finance TaxResolver.
   */
  get taxTotalMinor(): number {
    return this._lines.reduce((sum, l) => sum + l.lineTaxMinor, 0);
  }

  /**
   * grandTotal = subtotalMinor - discountTotalMinor + taxTotalMinor
   * This is the amount the customer owes.
   */
  get grandTotalMinor(): number {
    return this.subtotalMinor - this.discountTotalMinor + this.taxTotalMinor;
  }

  // ── Commands ───────────────────────────────────────────────────────────────

  /** Adds a line to a DRAFT invoice. Returns new instance. */
  addLine(line: InvoiceLine): Invoice {
    this.assertDraft('addLine');
    return this.next({ ...this._props }, [...this._lines, line]);
  }

  /** Removes a line by lineId from a DRAFT invoice. Returns new instance. */
  removeLine(lineId: string): Invoice {
    this.assertDraft('removeLine');
    const filtered = this._lines.filter((l) => l.lineId !== lineId);
    if (filtered.length === this._lines.length) {
      throw new Error(`Invoice.removeLine: line "${lineId}" not found`);
    }
    return this.next({ ...this._props }, filtered);
  }

  /** Replaces a line by lineId. Returns new instance. */
  replaceLine(lineId: string, updated: InvoiceLine): Invoice {
    this.assertDraft('replaceLine');
    const idx = this._lines.findIndex((l) => l.lineId === lineId);
    if (idx === -1) throw new Error(`Invoice.replaceLine: line "${lineId}" not found`);
    const next = [...this._lines];
    next[idx] = updated;
    return this.next({ ...this._props }, next);
  }

  /** Updates notes field. Returns new instance. */
  updateNotes(notes: string | null): Invoice {
    this.assertDraft('updateNotes');
    return this.next({ ...this._props, notes }, [...this._lines]);
  }

  /** Updates dueDate. Returns new instance. */
  updateDueDate(dueDate: string): Invoice {
    this.assertDraft('updateDueDate');
    return this.next({ ...this._props, dueDate }, [...this._lines]);
  }

  /**
   * Finalizes the invoice (DRAFT → FINALIZED).
   * Validates that at least one line exists and grandTotal > 0.
   * Returns new immutable instance.
   */
  finalize(): Invoice {
    this.assertTransition('FINALIZED');
    if (this._lines.length === 0) {
      throw new Error('Invoice.finalize: cannot finalize an invoice with no lines');
    }
    if (this.grandTotalMinor <= 0) {
      throw new Error(
        `Invoice.finalize: grandTotal must be > 0; got ${this.grandTotalMinor}`,
      );
    }
    return this.next({ ...this._props, status: 'FINALIZED' }, [...this._lines]);
  }

  /**
   * Cancels the invoice (DRAFT → CANCELLED).
   * FINALIZED invoices cannot be cancelled via this path.
   */
  cancel(): Invoice {
    this.assertTransition('CANCELLED');
    return this.next({ ...this._props, status: 'CANCELLED' }, [...this._lines]);
  }

  // ── Serialization ─────────────────────────────────────────────────────────

  toJSON() {
    return {
      ...this._props,
      lines:              this._lines.map((l) => l.toJSON()),
      subtotalMinor:      this.subtotalMinor,
      discountTotalMinor: this.discountTotalMinor,
      taxTotalMinor:      this.taxTotalMinor,
      grandTotalMinor:    this.grandTotalMinor,
    };
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private next(props: InvoiceProps, lines: InvoiceLine[]): Invoice {
    return new Invoice(
      { ...props, version: props.version + 1, updatedAt: new Date().toISOString() },
      lines,
    );
  }

  private assertDraft(operation: string): void {
    if (!this.isDraft) {
      throw new Error(
        `Invoice.${operation}: invoice is ${this._props.status} — only DRAFT invoices can be modified`,
      );
    }
  }

  private assertTransition(to: InvoiceDomainStatus): void {
    const allowed = ALLOWED_TRANSITIONS[this._props.status];
    if (!allowed.includes(to)) {
      throw new Error(
        `Invoice: illegal status transition ${this._props.status} → ${to}`,
      );
    }
  }
}
