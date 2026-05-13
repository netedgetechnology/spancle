import {
  Column, CreateDateColumn, DeleteDateColumn,
  Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { SeoFieldsEmbed } from '../../seo/embeds/seo-fields.embed';

export type BlogPostStatus = 'draft' | 'published' | 'archived' | 'scheduled';

@Entity('cms_blog_posts')
@Index(['tenantId', 'slug'], { unique: true })
@Index(['tenantId', 'status'])
@Index(['tenantId', 'categoryId'])
export class BlogPostEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  title!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  slug!: string;

  /** Rich content body — JSONB block format */
  @Column({ type: 'jsonb', nullable: true })
  content!: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  excerpt!: string | null;

  @Column({
    type: 'enum',
    enum: ['draft', 'published', 'archived', 'scheduled'],
    default: 'draft',
  })
  status!: BlogPostStatus;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId!: string | null;

  /** Comma-separated tags stored as text — searchable via ILIKE */
  @Column({ type: 'text', nullable: true })
  tags!: string | null;

  /** Estimated reading time in minutes — auto-calculated by service */
  @Column({ name: 'reading_time_minutes', type: 'int', nullable: true })
  readingTimeMinutes!: number | null;

  @Column({ name: 'featured_image_id', type: 'uuid', nullable: true })
  featuredImageId!: string | null;

  @Column({ name: 'featured_image_url', type: 'varchar', length: 2048, nullable: true })
  featuredImageUrl!: string | null;

  @Column({ name: 'author_id', type: 'uuid', nullable: true })
  authorId!: string | null;

  @Column({ name: 'last_edited_by', type: 'uuid', nullable: true })
  lastEditedBy!: string | null;

  /** View counter — incremented by frontend on page load */
  @Column({ name: 'view_count', type: 'int', default: 0 })
  viewCount!: number;

  @Column(() => SeoFieldsEmbed)
  seo!: SeoFieldsEmbed;

  @Column({ name: 'is_featured', type: 'boolean', default: false })
  isFeatured!: boolean;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
