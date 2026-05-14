/**
 * SeoFieldsEmbed — TypeORM embedded column group for SEO metadata.
 *
 * Embedded into any entity that needs SEO fields by declaring:
 *   @Column(() => SeoFieldsEmbed)
 *   seo!: SeoFieldsEmbed;
 *
 * Column names in the parent table are prefixed with 'seo_' by TypeORM
 * (e.g. seo_title, seo_description, seo_keywords).
 *
 * Open Graph and Twitter Card fields are included for social sharing.
 * Schema.org JSON-LD blob stored as JSONB for extensibility.
 */
export declare class SeoFieldsEmbed {
    /** <title> tag — max 60 chars for SERP display */
    title: string | null;
    /** <meta name="description"> — max 160 chars for SERP snippet */
    description: string | null;
    /** <meta name="keywords"> — comma-separated, largely ignored by modern search */
    keywords: string | null;
    /** Canonical URL — prevents duplicate content penalty */
    canonicalUrl: string | null;
    /** robots meta tag: 'index,follow' | 'noindex,follow' | 'noindex,nofollow' */
    robots: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    ogImageUrl: string | null;
    /** og:type — article | website | profile */
    ogType: string | null;
    /** summary | summary_large_image | player | app */
    twitterCard: string | null;
    twitterTitle: string | null;
    twitterDescription: string | null;
    twitterImageUrl: string | null;
    /** JSON-LD structured data blob — stored as JSONB, injected as <script type="application/ld+json"> */
    schemaJsonLd: Record<string, unknown> | null;
}
//# sourceMappingURL=seo-fields.embed.d.ts.map