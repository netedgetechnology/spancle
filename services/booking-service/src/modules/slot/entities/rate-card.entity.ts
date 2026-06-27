import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// ── Weekly price grid ─────────────────────────────────────────────────────────

/**
 * HourlySlot — price for one hour block on one day.
 * `hour` is 0-23 (UTC). `priceMinor` is in the Rate Card's currency minor units.
 */
export interface HourlySlot {
  hour:        number;   // 0–23
  priceMinor:  number;   // e.g. 3000 = £30.00
}

/**
 * DayPriceGrid — all hour-price pairs for one day of the week.
 * Hours not listed use the `defaultPriceMinor` from the Rate Card.
 */
export interface DayPriceGrid {
  hourlySlots: HourlySlot[];
}

/**
 * WeeklyPriceGrid — 7-day pricing schedule.
 * Keys are lowercase day names (monday … sunday).
 * Missing keys fall back to defaultPriceMinor.
 */
export type WeeklyPriceGrid = Partial<Record<
  'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday',
  DayPriceGrid
>>;

// ── Date override ─────────────────────────────────────────────────────────────

/**
 * DateOverride — a price override for a specific calendar date.
 * Takes highest priority over the weekly grid.
 * Used for public holidays, special events, etc.
 *
 * If allDay = true, priceMinor applies to all hours of that date.
 * If hourlySlots is provided, only those hours are overridden.
 */
export interface DateOverride {
  date:         string;           // YYYY-MM-DD
  label?:       string;           // optional display label, e.g. "Christmas Day"
  allDay:       boolean;
  priceMinor?:  number;           // used when allDay = true
  hourlySlots?: HourlySlot[];     // used when allDay = false
}

// ── Entity ────────────────────────────────────────────────────────────────────

/**
 * RateCardEntity — a reusable weekly price schedule.
 *
 * Multiple courts can share one Rate Card.
 * The court stores `rateCardId` (in identity-service); booking-service fetches
 * the Rate Card when resolving slot prices.
 *
 * Price resolution priority (highest to lowest):
 *   1. Date Override (by specific calendar date)
 *   2. Weekly Price Grid (by day-of-week and hour)
 *   3. defaultPriceMinor (flat fallback for the whole card)
 *
 * The existing PricingRule system applies percentage/fixed MODIFIERS on top
 * of the resolved Rate Card base price. Rate Cards replace the old
 * court.hourlyRateMinor flat rate.
 *
 * Table: rate_cards
 */
@Entity('rate_cards')
@Index(['tenantId', 'isActive'])
@Index(['tenantId', 'isDeleted'])
export class RateCardEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  @Column({ type: 'varchar', length: 150, nullable: false })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /** ISO-4217 currency code — e.g. 'GBP', 'USD', 'AED' */
  @Column({ type: 'varchar', length: 3, nullable: false, default: 'GBP' })
  currency!: string;

  /**
   * Flat fallback price per hour in minor currency units.
   * Applied when no specific hour entry exists in weeklyGrid for the slot's hour.
   * Null = no base price (price will be 0 unless a PricingRule provides one).
   */
  @Column({ name: 'default_price_minor', type: 'int', nullable: true })
  defaultPriceMinor!: number | null;

  /**
   * 7-day weekly price grid.
   * JSONB — keys are day names; each entry has hourlySlots[].
   * Hours not present use defaultPriceMinor.
   */
  @Column({ name: 'weekly_grid', type: 'jsonb', nullable: false, default: '{}' })
  weeklyGrid!: WeeklyPriceGrid;

  /**
   * Date-specific overrides — highest priority.
   * Array of { date, label?, allDay, priceMinor?, hourlySlots? }.
   * Validated at service layer (no overlapping dates, valid YYYY-MM-DD).
   */
  @Column({ name: 'date_overrides', type: 'jsonb', nullable: false, default: '[]' })
  dateOverrides!: DateOverride[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
