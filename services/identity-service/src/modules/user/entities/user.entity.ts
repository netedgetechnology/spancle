import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * SystemRole values for tenant-level users.
 * TENANT_ADMIN is the role assigned to the user created during onboarding.
 */
export type UserRole =
  | 'TENANT_ADMIN'
  | 'TENANT_MANAGER'
  | 'TENANT_STAFF'
  | 'VIEWER'
  | 'COACH'
  | 'PLAYER';

@Entity('users')
@Index(['tenantId'])
@Index(['tenantId', 'email'], { unique: true })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Tenant isolation — enforced by PostgreSQL RLS policy */
  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name!: string;

  /**
   * Email — denormalised from IdentityEntity for user-management queries.
   * Source of truth remains the identity record.
   */
  @Column({ type: 'varchar', length: 254, nullable: false })
  email!: string;

  /**
   * Role — tenant-level system role, enforced by RolesGuard.
   * Set to 'TENANT_ADMIN' for the user created during onboarding.
   */
  @Column({
    type:    'enum',
    enum:    ['TENANT_ADMIN', 'TENANT_MANAGER', 'TENANT_STAFF', 'VIEWER', 'COACH', 'PLAYER'],
    default: 'VIEWER',
  })
  role!: UserRole;

  /** Set when the user's email address has been verified */
  @Column({ name: 'email_verified_at', type: 'timestamptz', nullable: true })
  emailVerifiedAt!: Date | null;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}

