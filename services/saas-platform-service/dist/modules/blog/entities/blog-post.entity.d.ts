import { SeoFieldsEmbed } from '../../seo/embeds/seo-fields.embed';
export type BlogPostStatus = 'draft' | 'published' | 'archived' | 'scheduled';
export declare class BlogPostEntity {
    id: string;
    tenantId: string;
    title: string;
    slug: string;
    /** Rich content body — JSONB block format */
    content: Record<string, unknown> | null;
    excerpt: string | null;
    status: BlogPostStatus;
    publishedAt: Date | null;
    categoryId: string | null;
    /** Comma-separated tags stored as text — searchable via ILIKE */
    tags: string | null;
    /** Estimated reading time in minutes — auto-calculated by service */
    readingTimeMinutes: number | null;
    featuredImageId: string | null;
    featuredImageUrl: string | null;
    authorId: string | null;
    lastEditedBy: string | null;
    /** View counter — incremented by frontend on page load */
    viewCount: number;
    seo: SeoFieldsEmbed;
    isFeatured: boolean;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
//# sourceMappingURL=blog-post.entity.d.ts.map