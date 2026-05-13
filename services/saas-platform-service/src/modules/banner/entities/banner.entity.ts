import {
  Column, CreateDateColumn, DeleteDateColumn,
  Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { SeoFieldsEmbed } from '../../seo/embeds/seo-fields.embed';

export type BannerStatus = 'draft' | 'active' | 'inactive' | 'scheduled';
export type BannerPlacement = 'hero' | 'sidebar' | 'inline' | 'modal' | 'footer' | 'notification';

/**
 * BannerEntity — a CMS content banner (hero, promotional, or notification block).
 *
 * Banners are tenant-scoped and support:
 *   - Multiple placements (hero, sidebar, inline, modal, footer)
 *   - Scheduling (activeFrom / activeTo date range)
 *   - Target URL for CTA link
 *   - Sort order within placement
 *   - SEO fields for crawlable banners
 */
@Entity('cms_banners')
@Index(['tenantId', 'placement', 'status'])
@Index(['tenantId', 'isDeleted'])
export class BannerEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  title!: string;

  /** Internal reference key — used by frontend to reference a specific banner slot */
  @Column({ type: 'varchar', length: 100, nullable: true })
  key!: string | null;

  @Column({ type: 'text', nullable: true })
  subtitle!: string | null;

  @Column({ type: 'text', nullable: true })
  body!: string | null;

  /** CTA button label */
  @Column({ name: 'cta_label', type: 'varchar', length: 100, nullable: true })
  ctaLabel!: string | null;

  /** CTA target URL */
  @Column({ name: 'cta_url', type: 'varchar', length: 2048, nullable: true })
  ctaUrl!: string | null;

  /** Whether the CTA opens in a new tab */
  @Column({ name: 'cta_target_blank', type: 'boolean', default: false })
  ctaTargetBlank!: boolean;

  @Column({ name: 'image_id', type: 'uuid', nullable: true })
  imageId!: string | null;

  @Column({ name: 'image_url', type: 'varchar', length: 2048, nullable: true })
  imageUrl!: string | null;

  @Column({ name: 'image_alt', type: 'varchar', length: 255, nullable: true })
  imageAlt!: string | null;

  /** Mobile-specific image URL */
  @Column({ name: 'mobile_image_url', type: 'varchar', length: 2048, nullable: true })
  mobileImageUrl!: string | null;

  @Column({
    type: 'enum',
    enum: ['hero', 'sidebar', 'inline', 'modal', 'footer', 'notification'],
    default: 'hero',
  })
  placement!: BannerPlacement;

  @Column({
    type: 'enum',
    enum: ['draft', 'active', 'inactive', 'scheduled'],
    default: 'draft',
  })
  status!: BannerStatus;

  @Column({ name: 'active_from', type: 'timestamptz', nullable: true })
  activeFrom!: Date | null;

  @Column({ name: 'active_to', type: 'timestamptz', nullable: true })
  activeTo!: Date | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  /** Background colour hex — for text-only banners */
  @Column({ name: 'bg_color', type: 'varchar', length: 20, nullable: true })
  bgColor!: string | null;

  /** Additional arbitrary metadata — colour overrides, animation flags, etc. */
  @Column({ name: 'meta', type: 'jsonb', nullable: true })
  meta!: Record<string, unknown> | null;

  @Column(() => SeoFieldsEmbed)
  seo!: SeoFieldsEmbed;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
