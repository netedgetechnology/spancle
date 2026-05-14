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
export declare class HomepageSectionEntity {
    id: string;
    /** Tenant isolation */
    tenantId: string;
    /**
     * Which page this section belongs to.
     * Typically the tenant's homepage PageEntity.id, but supports landing pages.
     */
    pageId: string;
    /**
     * Discriminator — determines which Zod schema and React component to use.
     * One of: hero_banner | feature_highlights | testimonials | pricing_preview | faq | cta
     */
    sectionType: SectionType;
    /**
     * Internal admin label — not rendered publicly.
     * Allows admins to distinguish multiple sections of the same type.
     * Example: "Hero - Summer Campaign", "CTA - Book Now"
     */
    adminLabel: string;
    /**
     * Typed JSONB payload — validated against SECTION_SCHEMAS[sectionType].
     * Shape is defined in section-payload.types.ts per sectionType.
     */
    payload: Record<string, unknown>;
    /** Display position within the page — lower numbers appear first */
    sortOrder: number;
    status: 'draft' | 'published' | 'archived';
    /** Whether section is visible on the live page (published sections only) */
    isVisible: boolean;
    /**
     * A/B test variant identifier — sections can be tagged for experiments.
     * null = not part of an experiment
     * 'control' | 'variant_a' | 'variant_b' etc.
     */
    abVariant: string | null;
    /** User who created the section */
    createdBy: string | null;
    /** User who last modified the section */
    updatedBy: string | null;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
//# sourceMappingURL=homepage-section.entity.d.ts.map