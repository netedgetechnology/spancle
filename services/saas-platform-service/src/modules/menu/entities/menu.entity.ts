import {
  Column, CreateDateColumn, DeleteDateColumn,
  Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';

/**
 * MenuEntity — a named navigation menu container (e.g. 'main-nav', 'footer-links').
 * Menu items are stored separately in MenuItemEntity.
 */
@Entity('cms_menus')
@Index(['tenantId', 'handle'], { unique: true })
export class MenuEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  /** Display name shown in the CMS admin */
  @Column({ type: 'varchar', length: 100, nullable: false })
  name!: string;

  /**
   * Machine handle — used by the frontend to request a specific menu.
   * Example: 'main-navigation', 'footer-links', 'account-menu'
   */
  @Column({ type: 'varchar', length: 100, nullable: false })
  handle!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
