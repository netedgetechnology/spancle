export type MenuItemTarget = '_self' | '_blank';
export type MenuItemLinkType = 'internal_page' | 'internal_post' | 'external_url' | 'custom';
/**
 * MenuItemEntity — a single navigation item within a Menu.
 *
 * Supports nesting via parentId (max depth enforced at service layer).
 * Items are ordered by sortOrder within their parent level.
 *
 * Link resolution:
 *   - internal_page: references a PageEntity by pageId
 *   - internal_post: references a BlogPostEntity by postId
 *   - external_url:  direct URL in the url field
 *   - custom:        arbitrary URL fragment (anchor, JS action)
 */
export declare class MenuItemEntity {
    id: string;
    tenantId: string;
    menuId: string;
    /** Nullable for top-level items */
    parentId: string | null;
    label: string;
    linkType: MenuItemLinkType;
    /** Resolved URL — for external_url and custom types */
    url: string | null;
    /** For internal_page type */
    pageId: string | null;
    /** For internal_post type */
    postId: string | null;
    target: MenuItemTarget;
    iconName: string | null;
    cssClass: string | null;
    sortOrder: number;
    isActive: boolean;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
//# sourceMappingURL=menu-item.entity.d.ts.map