import {
  Column, CreateDateColumn,
  Entity, Index, PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * CommercialRuleVersion — immutable snapshot of a rule at a given semver.
 *
 * INSERT-only. Never updated or deleted.
 */
@Entity('commercial_rule_versions')
@Index(['ruleId', 'version'], { unique: true })
@Index(['tenantId', 'ruleId'])
export class CommercialRuleVersionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  @Index()
  tenantId!: string | null;

  /** FK-equivalent → commercial_rules.id (no DB FK) */
  @Column({ name: 'rule_id', type: 'uuid', nullable: false })
  ruleId!: string;

  /** Semver string, e.g. "1.0.0", "2.1.3" */
  @Column({ name: 'version', type: 'varchar', length: 32, nullable: false })
  version!: string;

  /**
   * Full rule definition snapshot at this version.
   * Contains: conditions, actions, effectiveFrom, effectiveTo, etc.
   */
  @Column({ name: 'definition', type: 'jsonb', nullable: false, default: '{}' })
  definition!: Record<string, unknown>;

  @Column({ name: 'changelog', type: 'text', nullable: true })
  changelog!: string | null;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
