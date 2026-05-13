import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { SectionType } from '../types/section-payload.types';

/**
 * HomepageSectionEntity — stores all homepage sections in a single table.
 *
 * Design: polymorphic single-table with typed JSONB payload.
 *
 * Rationale for single table over table-per-section-type:
 *   - Drag-and-drop reordering across types needs a single sorted list
 *   - Adding a new section type requires no schema migration — just a new payload schema
 *   - Section metadata (status, sortOrder, title) is identical across all types
 *
 * Tenant isolation:
 *   - Every section carries tenantId (RLS-ready)
 *   - HomepageSectionRepository extends TenantAwareRepository
 *
 * Page binding:
 *   - pageId links sections to a specific Page (typically the homepage PageEntity)
 *   - Multiple pages can have independent section sets (e.g. landing pages)
 *
 * Payload validation:
 *   - JSONB payload is validated against SECTION_SCHEMAS[sectionType] in HomepageService
 *   - Raw JSONB never written without passing Zod validation
 */
@Entity('cms_homepage_sections')
@Index(['tenantId', 'pageId', 'sortOrder'])
@Index(['tenantId', 'sectionType', 'status'])
@Index(['tenantId', 'isDeleted'])
export class HomepageSectionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Tenant isolation */
  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  /**
   * Which page this section belongs to.
   * Typically the tenant's homepage PageEntity.id, but supports landing pages.
   */
  @Column({ name: 'page_id', type: 'uuid', nullable: false })
  @Index()
  pageId!: string;

  /**
   * Discriminator — determines which Zod schema and React component to use.
   * One of: hero_banner | feature_highlights | testimonials | pricing_preview | faq | cta
   */
  @Column({
    name: 'section_type',
    type: 'enum',
    enum: ['hero_banner', 'feature_highlights', 'testimonials', 'pricing_preview', 'faq', 'cta'],
    nullable: false,
  })
  sectionType!: SectionType;

  /**
   * Internal admin label — not rendered publicly.
   * Allows admins to distinguish multiple sections of the same type.
   * Example: "Hero - Summer Campaign", "CTA - Book Now"
   */
  @Column({ name: 'admin_label', type: 'varchar', length: 100, nullable: false })
  adminLabel!: string;

  /**
   * Typed JSONB payload — validated against SECTION_SCHEMAS[sectionType].
   * Shape is defined in section-payload.types.ts per sectionType.
   */
  @Column({ type: 'jsonb', nullable: false })
  payload!: Record<string, unknown>;

  /** Display position within the page — lower numbers appear first */
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({
    type: 'enum',
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
  })
  status!: 'draft' | 'published' | 'archived';

  /** Whether section is visible on the live page (published sections only) */
  @Column({ name: 'is_visible', type: 'boolean', default: true })
  isVisible!: boolean;

  /**
   * A/B test variant identifier — sections can be tagged for experiments.
   * null = not part of an experiment
   * 'control' | 'variant_a' | 'variant_b' etc.
   */
  @Column({ name: 'ab_variant', type: 'varchar', length: 50, nullable: true })
  abVariant!: string | null;

  /** User who created the section */
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  /** User who last modified the section */
  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
