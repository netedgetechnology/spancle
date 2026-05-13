import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { TenantSettings, TenantStatus, TenantTier } from '@spancle/types';

/**
 * TenantEntity — the root aggregate for multi-tenancy.
 *
 * Note on RLS: PostgreSQL Row-Level Security policies reference the
 * `tenant_id` column. The policy is created in the migration:
 *
 *   CREATE POLICY tenant_isolation ON <table>
 *     USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
 *
 * This entity is NOT itself RLS-protected (it IS the tenant registry).
 * All other entities reference this via their tenantId FK.
 *
 * `slug` is the URL-safe subdomain identifier (immutable after creation).
 * `settings` is JSONB — allows per-tenant configuration without schema migration.
 */
@Entity('tenants')
@Index(['slug'], { unique: true })
export class TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  name!: string;

  /**
   * Immutable URL-safe identifier: 'acme-sports' → acme-sports.app.spancle.io
   * Lowercase alphanumeric + hyphens only. Validated at creation, never updated.
   */
  @Column({ type: 'varchar', length: 63, nullable: false, update: false })
  @Index({ unique: true })
  slug!: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'active', 'suspended', 'terminated', 'trial'],
    default: 'trial',
    nullable: false,
  })
  status!: TenantStatus;

  @Column({
    type: 'enum',
    enum: ['free', 'starter', 'growth', 'pro', 'enterprise'],
    default: 'free',
    nullable: false,
  })
  tier!: TenantTier;

  @Column({ type: 'varchar', length: 254, nullable: false })
  @Index()
  email!: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone!: string | null;

  /**
   * JSONB settings column — per-tenant configuration.
   * Defaults applied in TenantService.create() from TenantSettingsSchema defaults.
   */
  @Column({
    type: 'jsonb',
    nullable: false,
    default: () => `'${JSON.stringify({
      timezone:            'UTC',
      locale:              'en-GB',
      currency:            'GBP',
      dateFormat:          'DD/MM/YYYY',
      allowPublicBookings: false,
      requireMfa:          false,
      maxSessionDurationMs: 28800000,
    })}'`,
  })
  settings!: TenantSettings;

  @Column({ name: 'logo_url', type: 'varchar', length: 2048, nullable: true })
  logoUrl!: string | null;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
