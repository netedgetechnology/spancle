import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * MembershipAuditLogEntity — immutable lifecycle event log.
 *
 * Records every status transition, plan change, freeze, cancellation,
 * and admin action on a Membership.  INSERT only — no UPDATE, no DELETE.
 *
 * Separate from MembershipTransactionEntity which tracks entitlement usage.
 * This table tracks WHO did WHAT to the membership and WHY.
 *
 * Table: membership_audit_logs
 */
@Entity('membership_audit_logs')
@Index(['tenantId', 'membershipId'])
@Index(['tenantId', 'createdAt'])
export class MembershipAuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  /** FK → memberships.id (same DB, no constraint). */
  @Column({ name: 'membership_id', type: 'uuid', nullable: false })
  membershipId!: string;

  /**
   * Action taken — mirrors membership event names without the namespace prefix.
   * e.g. 'enrolled' | 'activated' | 'frozen' | 'cancelled' | 'status_changed'
   */
  @Column({ type: 'varchar', length: 80, nullable: false })
  action!: string;

  /** FK → identity-service users.id. 'system' literal for automated transitions. */
  @Column({ name: 'actor_id', type: 'varchar', length: 36, nullable: true })
  actorId!: string | null;

  /** user | staff | system */
  @Column({ name: 'actor_type', type: 'varchar', length: 20, nullable: false, default: 'user' })
  actorType!: string;

  @Column({ name: 'previous_status', type: 'varchar', length: 30, nullable: true })
  previousStatus!: string | null;

  @Column({ name: 'new_status', type: 'varchar', length: 30, nullable: true })
  newStatus!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  /** JSON diff of changed fields for PATCH operations. */
  @Column({ type: 'jsonb', nullable: true })
  diff!: Record<string, unknown> | null;

  /** Immutable — no updated_at, no deleted_at. */
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
