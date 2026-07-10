import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

// ── InvoiceLineEntity ─────────────────────────────────────────────────────────

/**
 * InvoiceLineEntity — a single line item on an invoice.
 *
 * Rules:
 *   - INSERT-only once the parent invoice is finalised.
 *   - All monetary fields are INTEGER minor currency units.
 *   - Pricing traceability fields (appliedRuleIds, couponCode, discountSource)
 *     are captured at creation from the enriched event payload and are immutable.
 *
 * Table: finance_invoice_lines
 */
@Entity('finance_invoice_lines')
@Index(['tenantId', 'invoiceId'])
@Index(['tenantId', 'lineSourceId'], { where: '"line_source_id" IS NOT NULL' })
export class InvoiceLineEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  /**
   * FK → finance_invoices.id (no DB-level FK — allows line archiving independently).
   */
  @Column({ name: 'invoice_id', type: 'uuid', nullable: false })
  invoiceId!: string;

  @Column({ type: 'varchar', length: 500, nullable: false })
  description!: string;

  /**
   * Line type — drives GL account selection and tax applies_to filter.
   * Values: court_booking | coaching | membership | academy | tournament |
   *         merchandise | cafe | coaching_fee | late_cancellation_penalty |
   *         no_show_penalty | discount | adjustment
   */
  @Column({ name: 'line_type', type: 'varchar', length: 40, nullable: false })
  lineType!: string;

  @Column({ type: 'int', nullable: false, default: 1 })
  quantity!: number;

  /** Price per unit in minor currency units. */
  @Column({ name: 'unit_price_minor', type: 'int', nullable: false })
  unitPriceMinor!: number;

  /** = quantity × unitPriceMinor, before discount. */
  @Column({ name: 'subtotal_minor', type: 'int', nullable: false })
  subtotalMinor!: number;

  /** Discount applied to this line only. 0 if none. */
  @Column({ name: 'discount_minor', type: 'int', nullable: false, default: 0 })
  discountMinor!: number;

  /** Net amount this line contributes to invoice total = subtotalMinor - discountMinor. */
  @Column({ name: 'net_minor', type: 'int', nullable: false })
  netMinor!: number;

  /** Tax applied to this line (sum of InvoiceTax rows for this line). */
  @Column({ name: 'tax_minor', type: 'int', nullable: false, default: 0 })
  taxMinor!: number;

  // ── Pricing traceability (Architecture v1.0 M5) ───────────────────────────

  /**
   * PricingRule IDs that were applied to produce this line's price.
   * Sourced from the enriched business event payload (PricingService.quote() result).
   * Opaque to Finance — stored for audit and reporting only.
   */
  @Column({ name: 'applied_rule_ids', type: 'jsonb', nullable: true })
  appliedRuleIds!: string[] | null;

  /** Coupon code applied to this line, if any. */
  @Column({ name: 'coupon_code', type: 'varchar', length: 50, nullable: true })
  couponCode!: string | null;

  /**
   * PricingRule.id of the coupon rule (for coupon-revenue-impact reporting).
   */
  @Column({ name: 'coupon_rule_id', type: 'uuid', nullable: true })
  couponRuleId!: string | null;

  /**
   * What generated the discount on this line.
   * Values: promotion | coupon | member | membership_tier | manual
   */
  @Column({ name: 'discount_source', type: 'varchar', length: 30, nullable: true })
  discountSource!: string | null;

  /**
   * UUID of the originating source entity for this line
   * (e.g. slotId, membershipPlanId, tournamentId).
   */
  @Column({ name: 'line_source_id', type: 'uuid', nullable: true })
  lineSourceId!: string | null;

  @Column({ name: 'sort_order', type: 'int', nullable: false, default: 0 })
  sortOrder!: number;

  /** INSERT-only. No updated_at. */
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

// ── InvoiceTaxEntity ──────────────────────────────────────────────────────────

/**
 * InvoiceTaxEntity — a computed tax snapshot for one tax rate on one invoice.
 *
 * Rules:
 *   - One row per TaxRate applied to the invoice.
 *   - INSERT-only once the parent invoice is finalised.
 *   - Computed by TaxResolver at finalise() time; result snapshotted here.
 *   - If TaxRate changes after finalisation, this row is unaffected (immutable).
 *
 * Table: finance_invoice_taxes
 */
@Entity('finance_invoice_taxes')
@Index(['tenantId', 'invoiceId'])
export class InvoiceTaxEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  @Column({ name: 'invoice_id', type: 'uuid', nullable: false })
  invoiceId!: string;

  /**
   * The tax rate code at the time of calculation.
   * Snapshotted — not a live FK. TaxRate can be modified without affecting
   * this historical record.
   */
  @Column({ name: 'tax_code', type: 'varchar', length: 30, nullable: false })
  taxCode!: string;

  @Column({ name: 'tax_name', type: 'varchar', length: 100, nullable: false })
  taxName!: string;

  @Column({ name: 'regime', type: 'varchar', length: 20, nullable: false })
  regime!: string;   // gst | vat | sales_tax | custom

  /**
   * Rate in basis points at the time of calculation.
   * Snapshotted — not live. 1800 = 18.00%.
   */
  @Column({ name: 'rate_bps', type: 'int', nullable: false })
  rateBps!: number;

  /** The amount that tax was computed on (minor units). */
  @Column({ name: 'taxable_minor', type: 'int', nullable: false })
  taxableMinor!: number;

  /** Computed tax in minor units. */
  @Column({ name: 'tax_minor', type: 'int', nullable: false })
  taxMinor!: number;

  @Column({ name: 'is_inclusive', type: 'boolean', nullable: false })
  isInclusive!: boolean;

  @Column({ name: 'is_compound', type: 'boolean', nullable: false })
  isCompound!: boolean;

  /** INSERT-only. No updated_at. */
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

// ── InvoiceReferenceEntity ────────────────────────────────────────────────────

/**
 * InvoiceReferenceEntity — cross-engine invoice back-reference table.
 *
 * Architecture v1.0 M4: Finance owns the reference mapping.
 * Source engines (Booking, Membership, Academy, Tournament, POS) do NOT store
 * invoiceId in their own tables. Instead, Finance writes this lookup table at
 * invoice creation. Source engines call `GET /internal/invoices?sourceType=&sourceId=`
 * which resolves from this table in O(1).
 *
 * This table is also the idempotency gate: UNIQUE (tenant_id, source_type, source_id)
 * prevents duplicate invoices when a business event is re-delivered.
 *
 * Table: finance_invoice_references
 */
@Entity('finance_invoice_references')
@Index(['tenantId', 'sourceType', 'sourceId'], { unique: true })
@Index(['tenantId', 'invoiceId'])
export class InvoiceReferenceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  @Column({ name: 'invoice_id', type: 'uuid', nullable: false })
  invoiceId!: string;

  /**
   * Human-readable invoice number, denormalised for display in source-engine UIs
   * without a join to finance_invoices.
   */
  @Column({ name: 'invoice_number', type: 'varchar', length: 20, nullable: true })
  invoiceNumber!: string | null;

  /** Matches InvoiceEntity.sourceType. */
  @Column({ name: 'source_type', type: 'varchar', length: 20, nullable: false })
  sourceType!: string;

  /** UUID of the source entity (bookingId, membershipId, etc.). */
  @Column({ name: 'source_id', type: 'uuid', nullable: false })
  sourceId!: string;

  /** INSERT-only. */
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
