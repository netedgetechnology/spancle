import {{
  Column, CreateDateColumn, DeleteDateColumn,
  Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn,
}} from 'typeorm';

/**
 * PlanEntity — the resolved plan assignment for a specific tenant.
 *
 * Links: Tenant → Package (via tierKey) with optional per-tenant limit overrides.
 *
 * One active plan per tenant. Created automatically when a subscription is activated.
 * Limit overrides allow enterprise-tier custom agreements (e.g. 10,000 users).
 */
@Entity('tenant_plans')
@Index(['tenantId'], {{ unique: true }})
@Index(['packageId'])
export class PlanEntity {{
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({{ name: 'tenant_id', type: 'uuid', nullable: false }})
  tenantId!: string;

  @Column({{ name: 'package_id', type: 'uuid', nullable: false }})
  packageId!: string;

  @Column({{ name: 'tier_key', type: 'varchar', length: 32, nullable: false }})
  tierKey!: string;

  /**
   * Per-tenant feature flag overrides — merged ON TOP of package features.
   * Empty object = use package defaults exactly.
   */
  @Column({{ name: 'feature_overrides', type: 'jsonb', nullable: false, default: '{{}}'  }})
  featureOverrides!: Record<string, boolean>;

  /**
   * Per-tenant resource limit overrides — merged ON TOP of package limits.
   * Allows enterprise tenants to have custom limits (e.g. 10,000 users).
   * -1 = unlimited override.
   */
  @Column({{ name: 'limit_overrides', type: 'jsonb', nullable: false, default: '{{}}'  }})
  limitOverrides!: Record<string, number>;

  @Column({{ name: 'is_active', type: 'boolean', default: true }})
  isActive!: boolean;

  @Column({{ name: 'is_deleted', type: 'boolean', default: false }})
  isDeleted!: boolean;

  @CreateDateColumn({{ name: 'created_at', type: 'timestamptz' }})
  createdAt!: Date;

  @UpdateDateColumn({{ name: 'updated_at', type: 'timestamptz' }})
  updatedAt!: Date;

  @DeleteDateColumn({{ name: 'deleted_at', type: 'timestamptz', nullable: true }})
  deletedAt!: Date | null;
}}
