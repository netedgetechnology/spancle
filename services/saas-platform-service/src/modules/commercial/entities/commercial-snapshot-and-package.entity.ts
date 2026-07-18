import {
  Column, CreateDateColumn, DeleteDateColumn,
  Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { CommercialDecisionOutcome } from '../enums/commercial.enums';

// ── CommercialDecisionSnapshot ────────────────────────────────────────────────

/**
 * CommercialDecisionSnapshot — immutable record of a rule evaluation.
 *
 * Written when any commercial rule is evaluated for a subject.
 * INSERT-only for audit/replay purposes.
 */
@Entity('commercial_decision_snapshots')
@Index(['tenantId', 'ruleId'])
@Index(['tenantId', 'subjectType', 'subjectId'])
@Index(['tenantId', 'createdAt'])
export class CommercialDecisionSnapshotEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  @Index()
  tenantId!: string | null;

  /** FK-equivalent → commercial_rule_versions.ruleId.
   *  NULL when no rule has been evaluated for this decision (no sentinel UUID). */
  @Column({ name: 'rule_id', type: 'uuid', nullable: true })
  ruleId!: string | null;

  /** Semver of the primary rule version. NULL when no rule was evaluated. */
  @Column({ name: 'rule_version', type: 'varchar', length: 32, nullable: true })
  ruleVersion!: string | null;

  /** Entity type the rule was evaluated against, e.g. 'booking', 'subscription' */
  @Column({ name: 'subject_type', type: 'varchar', length: 64, nullable: false })
  subjectType!: string;

  @Column({ name: 'subject_id', type: 'uuid', nullable: false })
  subjectId!: string;

  @Column({ name: 'outcome', type: 'varchar', length: 32, nullable: false })
  outcome!: CommercialDecisionOutcome;

  /** Input context snapshot used for the evaluation */
  @Column({ name: 'input_context', type: 'jsonb', nullable: false, default: '{}' })
  inputContext!: Record<string, unknown>;

  /** Result payload produced by the rule */
  @Column({ name: 'result_payload', type: 'jsonb', nullable: false, default: '{}' })
  resultPayload!: Record<string, unknown>;

  /**
   * All CommercialRuleVersion UUIDs evaluated for this decision.
   * Empty array when no rules were evaluated.
   * Stored as JSONB for GIN-index query support.
   */
  @Column({ name: 'evaluated_rule_ids', type: 'jsonb', nullable: false, default: '[]' })
  evaluatedRuleIds!: string[];

  @Column({ name: 'evaluated_by_id', type: 'uuid', nullable: true })
  evaluatedById!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

// ── PackageVersion ────────────────────────────────────────────────────────────

/**
 * PackageVersion — immutable versioned snapshot of a PackageDefinition.
 *
 * INSERT-only. Allows retroactive inspection of what tenants signed up for.
 */
@Entity('package_versions')
@Index(['packageId', 'version'], { unique: true })
export class PackageVersionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** FK-equivalent → PackageEntity.id (package_definitions table — existing package module) */
  @Column({ name: 'package_id', type: 'uuid', nullable: false })
  packageId!: string;

  @Column({ name: 'version', type: 'varchar', length: 32, nullable: false })
  version!: string;

  @Column({ name: 'features', type: 'jsonb', nullable: false, default: '{}' })
  features!: Record<string, boolean>;

  @Column({ name: 'limits', type: 'jsonb', nullable: false, default: '{}' })
  limits!: Record<string, number>;

  /** Prices per billing period in minor currency units (INT only) */
  @Column({ name: 'prices', type: 'jsonb', nullable: false, default: '{}' })
  prices!: Record<string, number>;

  @Column({ name: 'changelog', type: 'text', nullable: true })
  changelog!: string | null;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
