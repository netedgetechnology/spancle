import { SeoFieldsDto } from '../../seo/dto/seo-fields.dto';
declare const PAGE_STATUSES: readonly ["draft", "published", "archived", "scheduled"];
export declare class CreatePageDto {
    title: string;
    /**
     * URL slug — lowercase alphanumeric + hyphens.
     * Empty string is valid (maps to root '/').
     */
    slug: string;
    content?: Record<string, unknown>;
    excerpt?: string;
    status?: (typeof PAGE_STATUSES)[number];
    publishedAt?: string;
    template?: string;
    sortOrder?: number;
    isHomepage?: boolean;
    featuredImageId?: string;
    featuredImageUrl?: string;
    seo?: SeoFieldsDto;
}
export declare class UpdatePageDto {
    title?: string;
    slug?: string;
    content?: Record<string, unknown>;
    excerpt?: string;
    status?: (typeof PAGE_STATUSES)[number];
    publishedAt?: string;
    template?: string;
    sortOrder?: number;
    isHomepage?: boolean;
    featuredImageId?: string;
    featuredImageUrl?: string;
    seo?: SeoFieldsDto;
}
export {};
//# sourceMappingURL=create-page.dto.d.ts.map