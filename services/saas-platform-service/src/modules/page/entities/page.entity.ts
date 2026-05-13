import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SeoFieldsEmbed } from '../../seo/embeds/seo-fields.embed';

export type PageStatus = 'draft' | 'published' | 'archived' | 'scheduled';

/**
 * PageEntity — a CMS page scoped to a tenant.
 *
 * Features:
 *   - Tenant isolation via tenantId (enforced by repository layer)
 *   - Slug uniqueness per tenant via composite index
 *   - SEO fields as an embedded column group
 *   - Draft/Published/Archived/Scheduled lifecycle
 *   - Full soft-delete (isDeleted + deletedAt)
 *   - Content body stored as JSONB — supports block editors (Lexical, Slate, ProseMirror)
 *   - Template reference for layout selection in the frontend renderer
 */
@Entity('cms_pages')
@Index(['tenantId', 'slug'], { unique: true })
@Index(['tenantId', 'status'])
@Index(['tenantId', 'isDeleted'])
export class PageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Tenant isolation — enforced by RLS and repository layer */
  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  title!: string;

  /**
   * URL slug — unique per tenant.
   * Stored without leading slash: 'about', 'contact', 'terms-of-service'
   * Root page: '' (empty string maps to '/')
   */
  @Column({ type: 'varchar', length: 255, nullable: false })
  slug!: string;

  /**
   * JSONB content body — renderer-agnostic block format.
   * Frontend maps this to Lexical/Slate nodes or renders raw HTML.
   */
  @Column({ type: 'jsonb', nullable: true })
  content!: Record<string, unknown> | null;

  /** Excerpt / summary shown in listings */
  @Column({ type: 'text', nullable: true })
  excerpt!: string | null;

  @Column({
    type: 'enum',
    enum: ['draft', 'published', 'archived', 'scheduled'],
    default: 'draft',
  })
  status!: PageStatus;

  /** When to auto-publish (used when status = 'scheduled') */
  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  /** Layout template key — resolved by the frontend renderer */
  @Column({ type: 'varchar', length: 100, nullable: true, default: 'default' })
  template!: string | null;

  /** Display order for navigation sorting */
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  /** Whether this page is the root/home page for the tenant */
  @Column({ name: 'is_homepage', type: 'boolean', default: false })
  isHomepage!: boolean;

  /** Featured image media asset ID */
  @Column({ name: 'featured_image_id', type: 'uuid', nullable: true })
  featuredImageId!: string | null;

  @Column({ name: 'featured_image_url', type: 'varchar', length: 2048, nullable: true })
  featuredImageUrl!: string | null;

  /** Author user ID — from identity-service */
  @Column({ name: 'author_id', type: 'uuid', nullable: true })
  authorId!: string | null;

  /** Last editor user ID */
  @Column({ name: 'last_edited_by', type: 'uuid', nullable: true })
  lastEditedBy!: string | null;

  // ── SEO ────────────────────────────────────────────────────────────────────
  @Column(() => SeoFieldsEmbed)
  seo!: SeoFieldsEmbed;

  // ── Soft delete ────────────────────────────────────────────────────────────
  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
