declare const LINK_TYPES: readonly ["internal_page", "internal_post", "external_url", "custom"];
declare const TARGETS: readonly ["_self", "_blank"];
export declare class CreateMenuItemDto {
    parentId?: string;
    label: string;
    linkType?: (typeof LINK_TYPES)[number];
    url?: string;
    pageId?: string;
    postId?: string;
    target?: (typeof TARGETS)[number];
    iconName?: string;
    cssClass?: string;
    sortOrder?: number;
    isActive?: boolean;
}
export declare class CreateMenuDto {
    name: string;
    handle: string;
    description?: string;
    isActive?: boolean;
    items?: CreateMenuItemDto[];
}
export declare class UpdateMenuDto {
    name?: string;
    description?: string;
    isActive?: boolean;
}
export declare class UpdateMenuItemDto {
    label?: string;
    linkType?: (typeof LINK_TYPES)[number];
    url?: string;
    pageId?: string;
    postId?: string;
    parentId?: string;
    target?: (typeof TARGETS)[number];
    iconName?: string;
    sortOrder?: number;
    isActive?: boolean;
}
export {};
//# sourceMappingURL=create-menu.dto.d.ts.map