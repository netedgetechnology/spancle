/**
 * MenuEntity — a named navigation menu container (e.g. 'main-nav', 'footer-links').
 * Menu items are stored separately in MenuItemEntity.
 */
export declare class MenuEntity {
    id: string;
    tenantId: string;
    /** Display name shown in the CMS admin */
    name: string;
    /**
     * Machine handle — used by the frontend to request a specific menu.
     * Example: 'main-navigation', 'footer-links', 'account-menu'
     */
    handle: string;
    description: string | null;
    isActive: boolean;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
//# sourceMappingURL=menu.entity.d.ts.map