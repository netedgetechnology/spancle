import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * MembershipTransactionEntity — immutable entitlement ledger.
 *
 * Rules:
 *   - INSERT only. No UPDATE. No soft-delete.
 *   - One row per entitlement event (consume, refund, credit, adjustment, reset, forfeit).
 *   - quantity_delta is signed: negative = consumption, positive = credit/refund.
 *   - balance_before and balance_after are the entitlement balance for the specific benefit_type.
 *
 * Used for:
 *   - Auditing member benefit usage
 *   - Reconstructing balance history on dispute
 *   - Analytics (usage patterns, cohort reporting)
 *
 * Table: membership_transactions
 */
@Entity('membership_transactions')
@Index(['tenantId', 'membershipId'])
@Index(['tenantId', 'userId'])
@Index(['tenantId', 'referenceId'], { where: '"reference_id" IS NOT NULL' })
@Index(['tenantId', 'createdAt'])
export class MembershipTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  /** FK → memberships.id (same DB, no constraint — allows transactions on archived memberships). */
  @Column({ name: 'membership_id', type: 'uuid', nullable: false })
  membershipId!: string;

  /** FK → identity-service users.id (cross-service UUID, no DB FK). */
  @Column({ name: 'user_id', type: 'uuid', nullable: false })
  userId!: string;

  /**
   * Transaction type — varchar for forward-compatibility.
   * Values: consume | refund | adjustment | credit | forfeit | reset
   */
  @Column({ name: 'transaction_type', type: 'varchar', length: 30, nullable: false })
  transactionType!: string;

  /**
   * Which benefit this transaction applies to.
   * Must match a benefitType from the membership's benefit_snapshot.
   * null for plan-level transactions (e.g. forfeit on cancellation without a specific benefit).
   */
  @Column({ name: 'benefit_type', type: 'varchar', length: 80, nullable: true })
  benefitType!: string | null;

  /**
   * Signed delta: negative for consumption, positive for credit/refund.
   * e.g. -1 for consuming one guest pass; +4 for a monthly reset credit.
   */
  @Column({ name: 'quantity_delta', type: 'int', nullable: false })
  quantityDelta!: number;

  /** Balance before this transaction (for auditability). */
  @Column({ name: 'balance_before', type: 'int', nullable: true })
  balanceBefore!: number | null;

  /** Balance after this transaction. */
  @Column({ name: 'balance_after', type: 'int', nullable: true })
  balanceAfter!: number | null;

  /**
   * What triggered this transaction — varchar for forward-compatibility.
   * Values: booking | academy | tournament | pos | manual | system
   */
  @Column({ name: 'reference_type', type: 'varchar', length: 30, nullable: true })
  referenceType!: string | null;

  /** UUID of the entity that triggered this transaction (e.g. booking ID). */
  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId!: string | null;

  /** Staff member or system actor who created this transaction. */
  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId!: string | null;

  /** Free-text note for manual adjustments. */
  @Column({ type: 'text', nullable: true })
  note!: string | null;

  /** Additional context (e.g. guest name for guest passes). */
  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  /**
   * Immutable timestamp — the only meaningful date on this entity.
   * No updated_at. No deleted_at.
   */
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
