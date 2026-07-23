import {
  Column, CreateDateColumn, DeleteDateColumn, Entity,
  Index, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';

/**
 * TemplateEntity
 *
 * Stores email (and future SMS / push) templates scoped to a tenant.
 *
 * Lookup key: (tenantId, slug, channel, locale)
 *   - tenantId = specific tenant's override
 *   - tenantId = 'system' for platform-wide defaults
 *   Fallback chain: tenant+locale → system+locale → system+'en'
 *
 * slug       — stable machine identifier, e.g. 'booking_confirmed_email'
 * channel    — 'email' | 'sms' | 'push' | 'in_app'
 * locale     — BCP-47 language tag, e.g. 'en', 'fr', 'ar'
 * subject    — email subject line (may contain {{variables}})
 * bodyHtml   — HTML email body (may contain {{variables}})
 * bodyText   — plain-text fallback (may contain {{variables}})
 * variables  — jsonb schema for documentation and future validation:
 *              { "customer.name": "string", "booking.reference": "string" }
 *
 * Variable syntax: {{dot.path}} — e.g. {{customer.name}}, {{booking.reference}}
 */
@Entity('templates')
@Index(['tenantId'])
@Index(['tenantId', 'slug', 'channel', 'locale'], { unique: true })
export class TemplateEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Tenant isolation.
   * 'system' is the reserved tenantId for platform-wide default templates.
   * Tenant-specific overrides use the real tenant UUID.
   */
  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: false })
  @Index()
  tenantId!: string;

  /** Human-readable display name — not used for lookup. */
  @Column({ type: 'varchar', length: 255, nullable: false })
  name!: string;

  /** Stable machine identifier — used for lookup. No spaces. Snake_case. */
  @Column({ type: 'varchar', length: 100, nullable: false })
  slug!: string;

  /** Delivery channel — determines which fields are rendered. */
  @Column({ type: 'varchar', length: 20, nullable: false, default: 'email' })
  channel!: 'email' | 'sms' | 'push' | 'in_app';

  /**
   * BCP-47 locale tag.
   * Default: 'en'.
   * Used in the fallback chain: tenant+locale → system+locale → system+'en'
   */
  @Column({ type: 'varchar', length: 10, nullable: false, default: 'en' })
  locale!: string;

  /** Email subject line — may contain {{variable}} placeholders. */
  @Column({ type: 'text', nullable: true })
  subject!: string | null;

  /** HTML email body — may contain {{variable}} placeholders. */
  @Column({ name: 'body_html', type: 'text', nullable: true })
  bodyHtml!: string | null;

  /** Plain-text fallback — may contain {{variable}} placeholders. */
  @Column({ name: 'body_text', type: 'text', nullable: true })
  bodyText!: string | null;

  /**
   * Variable schema — jsonb.
   * Documents the expected variables for this template.
   * Format: { "customer.name": "string", "booking.reference": "string" }
   * Used for documentation; future Sprint may add validation against this schema.
   */
  @Column({ type: 'jsonb', nullable: true, default: {} })
  variables!: Record<string, string> | null;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
