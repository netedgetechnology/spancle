export declare const SEO_ROBOTS_OPTIONS: readonly ["index,follow", "noindex,follow", "index,nofollow", "noindex,nofollow"];
export type SeoRobotsOption = typeof SEO_ROBOTS_OPTIONS[number];
/**
 * SeoFieldsDto — embedded DTO for SEO metadata.
 *
 * Used via @ValidateNested() + @Type(() => SeoFieldsDto) inside
 * CreatePageDto, CreateBlogPostDto, CreateBannerDto.
 *
 * All fields are optional — SEO metadata is supplementary, not required.
 */
export declare class SeoFieldsDto {
    title?: string;
    description?: string;
    keywords?: string;
    canonicalUrl?: string;
    robots?: SeoRobotsOption;
    ogTitle?: string;
    ogDescription?: string;
    ogImageUrl?: string;
    ogType?: string;
    twitterCard?: string;
    twitterTitle?: string;
    twitterDescription?: string;
    twitterImageUrl?: string;
    schemaJsonLd?: Record<string, unknown>;
}
//# sourceMappingURL=seo-fields.dto.d.ts.map