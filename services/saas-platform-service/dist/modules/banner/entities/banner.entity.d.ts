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
export declare class BannerEntity {
    id: string;
    tenantId: string;
    title: string;
    /** Internal reference key — used by frontend to reference a specific banner slot */
    key: string | null;
    subtitle: string | null;
    body: string | null;
    /** CTA button label */
    ctaLabel: string | null;
    /** CTA target URL */
    ctaUrl: string | null;
    /** Whether the CTA opens in a new tab */
    ctaTargetBlank: boolean;
    imageId: string | null;
    imageUrl: string | null;
    imageAlt: string | null;
    /** Mobile-specific image URL */
    mobileImageUrl: string | null;
    placement: BannerPlacement;
    status: BannerStatus;
    activeFrom: Date | null;
    activeTo: Date | null;
    sortOrder: number;
    /** Background colour hex — for text-only banners */
    bgColor: string | null;
    /** Additional arbitrary metadata — colour overrides, animation flags, etc. */
    meta: Record<string, unknown> | null;
    seo: SeoFieldsEmbed;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
//# sourceMappingURL=banner.entity.d.ts.map