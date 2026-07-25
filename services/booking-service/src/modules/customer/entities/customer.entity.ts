import {
  Column, CreateDateColumn, DeleteDateColumn, Entity,
  Index, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';

export type CustomerStatus = 'active' | 'inactive' | 'banned';
export type CustomerGender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export interface EmergencyContact {
  name:         string;
  relationship: string;
  phone:        string;
}

export interface CustomerAddress {
  line1:    string;
  line2?:   string;
  city:     string;
  state?:   string;
  postcode: string;
  country:  string;
}

/**
 * CustomerEntity
 *
 * Canonical customer record. Denormalized customer fields on BookingEntity
 * (customerName, customerEmail, customerPhone) remain for backward
 * compatibility and read performance; customerId FK is added as an
 * optional link.
 *
 * Family accounts: parentCustomerId links child members to a parent.
 * isGuest = true marks auto-created guest customers from the guest booking flow.
 *
 * Wallet: walletBalanceMinor is integer minor units (pence/cents), consistent
 * with all other monetary values in the system.
 */
@Entity('customers')
@Index(['tenantId'])
@Index(['tenantId', 'email'])
@Index(['tenantId', 'phone'])
@Index(['tenantId', 'userId'])
@Index(['tenantId', 'status'])
@Index(['tenantId', 'parentCustomerId'])
export class CustomerEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  /**
   * Optional branch-level assignment.
   * null = customer belongs to the tenant root (all branches).
   */
  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId!: string | null;

  /**
   * Links to the identity-service User record when the customer
   * has a registered account. null = guest or walk-in only.
   */
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  /**
   * Family account: parentCustomerId links a child member to a parent.
   * null = top-level customer (not a family member).
   */
  @Column({ name: 'parent_customer_id', type: 'uuid', nullable: true })
  parentCustomerId!: string | null;

  // ── Name ─────────────────────────────────────────────────────────────────

  @Column({ name: 'first_name', type: 'varchar', length: 100, nullable: false })
  firstName!: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100, nullable: false })
  lastName!: string;

  /**
   * Denormalized full name — kept in sync on save.
   * Enables fast full-text search without CONCAT in every query.
   */
  @Column({ name: 'full_name', type: 'varchar', length: 255, nullable: false })
  fullName!: string;

  // ── Demographics ─────────────────────────────────────────────────────────

  @Column({ type: 'varchar', length: 20, nullable: true })
  gender!: CustomerGender | null;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth!: string | null;

  // ── Contact ──────────────────────────────────────────────────────────────

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 254, nullable: true })
  email!: string | null;

  @Column({ name: 'emergency_contact', type: 'jsonb', nullable: true })
  emergencyContact!: EmergencyContact | null;

  @Column({ type: 'jsonb', nullable: true })
  address!: CustomerAddress | null;

  // ── Profile ───────────────────────────────────────────────────────────────

  @Column({ name: 'profile_photo', type: 'text', nullable: true })
  profilePhoto!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  // ── Status ────────────────────────────────────────────────────────────────

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'active' })
  status!: CustomerStatus;

  /** true = auto-created from guest booking flow. */
  @Column({ name: 'is_guest', type: 'boolean', default: false })
  isGuest!: boolean;

  // ── Wallet ────────────────────────────────────────────────────────────────

  /** Integer minor units (pence/cents). Default 0. */
  @Column({ name: 'wallet_balance_minor', type: 'int', default: 0 })
  walletBalanceMinor!: number;

  // ── Timestamps ────────────────────────────────────────────────────────────

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
