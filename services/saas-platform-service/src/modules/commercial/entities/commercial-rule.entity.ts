import {
  Column, CreateDateColumn, DeleteDateColumn,
  Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { CommercialRuleStatus, CommercialRuleType } from '../enums/commercial.enums';

/**
 * CommercialRule — the versioned business rule aggregate root.
 *
 * Each rule has a type, a set of conditions, and a set of actions.
 * Versions are tracked in CommercialRuleVersion.
 * Tenant-scoped: a NULL tenantId indicates a platform-wide rule.
 */
@Entity('commercial_rules')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'ruleType'])
export class CommercialRuleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** NULL = platform-wide rule; NOT NULL = tenant-scoped rule */
  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  @Index()
  tenantId!: string | null;

  @Column({ name: 'name', type: 'varchar', length: 255, nullable: false })
  name!: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'rule_type', type: 'varchar', length: 64, nullable: false })
  ruleType!: CommercialRuleType;

  @Column({ name: 'status', type: 'varchar', length: 32, nullable: false, default: CommercialRuleStatus.DRAFT })
  status!: CommercialRuleStatus;

  /** Semver of the currently active version, e.g. "1.0.0" */
  @Column({ name: 'active_version', type: 'varchar', length: 32, nullable: true })
  activeVersion!: string | null;

  /** Arbitrary tags for filtering/grouping rules */
  @Column({ name: 'tags', type: 'jsonb', nullable: false, default: '[]' })
  tags!: string[];

  @Column({ name: 'metadata', type: 'jsonb', nullable: false, default: '{}' })
  metadata!: Record<string, unknown>;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted!: boolean;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById!: string | null;

  @Column({ name: 'updated_by_id', type: 'uuid', nullable: true })
  updatedById!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
