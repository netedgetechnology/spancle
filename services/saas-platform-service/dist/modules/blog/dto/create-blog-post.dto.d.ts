import { SeoFieldsDto } from '../../seo/dto/seo-fields.dto';
declare const STATUSES: readonly ["draft", "published", "archived", "scheduled"];
export declare class CreateBlogPostDto {
    title: string;
    slug: string;
    content?: Record<string, unknown>;
    excerpt?: string;
    status?: (typeof STATUSES)[number];
    publishedAt?: string;
    categoryId?: string;
    tags?: string;
    featuredImageId?: string;
    featuredImageUrl?: string;
    isFeatured?: boolean;
    seo?: SeoFieldsDto;
}
export declare class UpdateBlogPostDto {
    title?: string;
    slug?: string;
    content?: Record<string, unknown>;
    excerpt?: string;
    status?: (typeof STATUSES)[number];
    publishedAt?: string;
    categoryId?: string;
    tags?: string;
    featuredImageId?: string;
    featuredImageUrl?: string;
    isFeatured?: boolean;
    seo?: SeoFieldsDto;
}
export declare class BulkUpdateStatusDto {
    ids: string[];
    status: 'draft' | 'published' | 'archived';
}
export declare class CreateCategoryDto {
    name: string;
    slug: string;
    description?: string;
    sortOrder?: number;
}
export declare class UpdateCategoryDto {
    name?: string;
    slug?: string;
    description?: string;
    sortOrder?: number;
}
export {};
//# sourceMappingURL=create-blog-post.dto.d.ts.map