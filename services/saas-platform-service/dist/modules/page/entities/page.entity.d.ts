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
export declare class PageEntity {
    id: string;
    /** Tenant isolation — enforced by RLS and repository layer */
    tenantId: string;
    title: string;
    /**
     * URL slug — unique per tenant.
     * Stored without leading slash: 'about', 'contact', 'terms-of-service'
     * Root page: '' (empty string maps to '/')
     */
    slug: string;
    /**
     * JSONB content body — renderer-agnostic block format.
     * Frontend maps this to Lexical/Slate nodes or renders raw HTML.
     */
    content: Record<string, unknown> | null;
    /** Excerpt / summary shown in listings */
    excerpt: string | null;
    status: PageStatus;
    /** When to auto-publish (used when status = 'scheduled') */
    publishedAt: Date | null;
    /** Layout template key — resolved by the frontend renderer */
    template: string | null;
    /** Display order for navigation sorting */
    sortOrder: number;
    /** Whether this page is the root/home page for the tenant */
    isHomepage: boolean;
    /** Featured image media asset ID */
    featuredImageId: string | null;
    featuredImageUrl: string | null;
    /** Author user ID — from identity-service */
    authorId: string | null;
    /** Last editor user ID */
    lastEditedBy: string | null;
    seo: SeoFieldsEmbed;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
//# sourceMappingURL=page.entity.d.ts.map