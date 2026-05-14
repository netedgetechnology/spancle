import { SeoFieldsDto } from '../../seo/dto/seo-fields.dto';
declare const PLACEMENTS: readonly ["hero", "sidebar", "inline", "modal", "footer", "notification"];
declare const STATUSES: readonly ["draft", "active", "inactive", "scheduled"];
export declare class CreateBannerDto {
    title: string;
    key?: string;
    subtitle?: string;
    body?: string;
    ctaLabel?: string;
    ctaUrl?: string;
    ctaTargetBlank?: boolean;
    imageId?: string;
    imageUrl?: string;
    imageAlt?: string;
    mobileImageUrl?: string;
    placement?: (typeof PLACEMENTS)[number];
    status?: (typeof STATUSES)[number];
    activeFrom?: string;
    activeTo?: string;
    sortOrder?: number;
    bgColor?: string;
    meta?: Record<string, unknown>;
    seo?: SeoFieldsDto;
}
export declare class UpdateBannerDto {
    title?: string;
    key?: string;
    subtitle?: string;
    body?: string;
    ctaLabel?: string;
    ctaUrl?: string;
    ctaTargetBlank?: boolean;
    imageId?: string;
    imageUrl?: string;
    imageAlt?: string;
    mobileImageUrl?: string;
    placement?: (typeof PLACEMENTS)[number];
    status?: (typeof STATUSES)[number];
    activeFrom?: string;
    activeTo?: string;
    sortOrder?: number;
    bgColor?: string;
    meta?: Record<string, unknown>;
    seo?: SeoFieldsDto;
}
export {};
//# sourceMappingURL=create-banner.dto.d.ts.map