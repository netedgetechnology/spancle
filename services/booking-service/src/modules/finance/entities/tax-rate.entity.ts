import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Tax regime — determines resolver behaviour.
 * varchar for forward-compatibility; new regimes added without schema change.
 */
export type TaxRegime = 'gst' | 'vat' | 'sales_tax' | 'custom';

/**
 * TaxRateEntity — a single tax rate applicable to a jurisdiction and product type.
 *
 * Design decisions:
 *   - is_inclusive: when true the line amount already contains the tax;
 *     TaxResolver extracts it using: tax = amount × rate / (100 + rate).
 *     When false (default): tax = amount × rate / 100 (added on top).
 *   - is_compound: tax on tax (e.g. India cess: 4% on the GST amount).
 *   - applies_to: JSONB array of line_type values this rate applies to.
 *     Empty / null = applies to all line types.
 *   - Zero-rated and exempt are explicit rows with rate_pct = 0, not null.
 *
 * Table: finance_tax_rates
 */
@Entity('finance_tax_rates')
@Index(['tenantId', 'code'], { unique: true })
@Index(['tenantId', 'regime'])
@Index(['tenantId', 'jurisdiction'])
@Index(['tenantId', 'isActive'])
export class TaxRateEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  /**
   * Short identifier — unique per tenant.
   * Examples: 'GST_18', 'CGST_9', 'SGST_9', 'IGST_18', 'VAT_20', 'EXEMPT', 'ZERO'
   */
  @Column({ type: 'varchar', length: 30, nullable: false })
  code!: string;

  /** Display name shown on invoices and receipts. */
  @Column({ type: 'varchar', length: 100, nullable: false })
  name!: string;

  @Column({ type: 'varchar', length: 20, nullable: false })
  regime!: TaxRegime;

  /**
   * Rate as a whole-number percentage × 100 to avoid floating point.
   * Stored in basis points: 1800 = 18.00%, 2000 = 20.00%, 0 = exempt.
   * TaxResolver divides by 10000 before computing: tax = amount × (rateBps / 10000).
   */
  @Column({ name: 'rate_bps', type: 'int', nullable: false, default: 0 })
  rateBps!: number;

  /**
   * ISO country + optional state/province — e.g. 'IN-MH', 'IN-DL', 'GB', 'US-CA'.
   * TaxResolver matches by longest prefix: 'IN-MH' before 'IN' before null.
   * null = global fallback rate.
   */
  @Column({ type: 'varchar', length: 10, nullable: true })
  jurisdiction!: string | null;

  /**
   * When true: the line amount already includes tax (price-inclusive).
   * TaxResolver extracts tax: tax = amount × rateBps / (10000 + rateBps).
   *
   * When false (default — price-exclusive):
   * tax = amount × rateBps / 10000.
   *
   * UK VAT is typically inclusive; India GST is exclusive.
   */
  @Column({ name: 'is_inclusive', type: 'boolean', nullable: false, default: false })
  isInclusive!: boolean;

  /**
   * Compound tax: this tax is applied on top of a base tax amount.
   * Example: India Health & Education Cess (4% on IGST amount).
   * When true, TaxResolver applies this rate to the result of the base tax,
   * not to the line amount.
   */
  @Column({ name: 'is_compound', type: 'boolean', nullable: false, default: false })
  isCompound!: boolean;

  /**
   * Applies-to filter — array of line_type strings.
   * Empty array or null = applies to all line types.
   * Example: ['court_booking', 'coaching'] means this rate only fires for those types.
   */
  @Column({ name: 'applies_to', type: 'jsonb', nullable: true })
  appliesTo!: string[] | null;

  /**
   * When true, this is the fallback rate used when no specific rate matches.
   * At most one active rate per tenant should be marked default.
   */
  @Column({ name: 'is_default', type: 'boolean', nullable: false, default: false })
  isDefault!: boolean;

  @Column({ name: 'effective_from', type: 'date', nullable: true })
  effectiveFrom!: string | null;

  @Column({ name: 'effective_to', type: 'date', nullable: true })
  effectiveTo!: string | null;

  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
