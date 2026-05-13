import {
  Column, CreateDateColumn, DeleteDateColumn,
  Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';

export type MenuItemTarget = '_self' | '_blank';
export type MenuItemLinkType = 'internal_page' | 'internal_post' | 'external_url' | 'custom';

/**
 * MenuItemEntity — a single navigation item within a Menu.
 *
 * Supports nesting via parentId (max depth enforced at service layer).
 * Items are ordered by sortOrder within their parent level.
 *
 * Link resolution:
 *   - internal_page: references a PageEntity by pageId
 *   - internal_post: references a BlogPostEntity by postId
 *   - external_url:  direct URL in the url field
 *   - custom:        arbitrary URL fragment (anchor, JS action)
 */
@Entity('cms_menu_items')
@Index(['tenantId', 'menuId', 'sortOrder'])
@Index(['tenantId', 'parentId'])
export class MenuItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  @Column({ name: 'menu_id', type: 'uuid', nullable: false })
  @Index()
  menuId!: string;

  /** Nullable for top-level items */
  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: false })
  label!: string;

  @Column({
    name: 'link_type',
    type: 'enum',
    enum: ['internal_page', 'internal_post', 'external_url', 'custom'],
    default: 'external_url',
  })
  linkType!: MenuItemLinkType;

  /** Resolved URL — for external_url and custom types */
  @Column({ type: 'varchar', length: 2048, nullable: true })
  url!: string | null;

  /** For internal_page type */
  @Column({ name: 'page_id', type: 'uuid', nullable: true })
  pageId!: string | null;

  /** For internal_post type */
  @Column({ name: 'post_id', type: 'uuid', nullable: true })
  postId!: string | null;

  @Column({
    type: 'enum',
    enum: ['_self', '_blank'],
    default: '_self',
  })
  target!: MenuItemTarget;

  @Column({ name: 'icon_name', type: 'varchar', length: 100, nullable: true })
  iconName!: string | null;

  @Column({ name: 'css_class', type: 'varchar', length: 100, nullable: true })
  cssClass!: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

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
