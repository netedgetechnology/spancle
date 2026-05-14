/**
 * CmsModule — aggregates all 5 CMS feature modules.
 *
 * Import CmsModule into AppModule to enable all CMS endpoints:
 *
 *   POST   /api/v1/cms/pages
 *   GET    /api/v1/cms/pages
 *   GET    /api/v1/cms/pages/by-slug/:slug
 *   GET    /api/v1/cms/pages/:id
 *   PATCH  /api/v1/cms/pages/:id
 *   DELETE /api/v1/cms/pages/:id
 *
 *   POST   /api/v1/cms/blog/posts
 *   GET    /api/v1/cms/blog/posts
 *   GET    /api/v1/cms/blog/posts/by-slug/:slug
 *   GET    /api/v1/cms/blog/posts/:id
 *   PATCH  /api/v1/cms/blog/posts/:id
 *   DELETE /api/v1/cms/blog/posts/:id
 *   POST   /api/v1/cms/blog/categories
 *   GET    /api/v1/cms/blog/categories
 *   DELETE /api/v1/cms/blog/categories/:id
 *
 *   POST   /api/v1/cms/banners
 *   GET    /api/v1/cms/banners
 *   GET    /api/v1/cms/banners/by-key/:key
 *   GET    /api/v1/cms/banners/:id
 *   PATCH  /api/v1/cms/banners/:id
 *   DELETE /api/v1/cms/banners/:id
 *
 *   POST   /api/v1/cms/media/register
 *   GET    /api/v1/cms/media
 *   GET    /api/v1/cms/media/:id
 *   PATCH  /api/v1/cms/media/:id
 *   DELETE /api/v1/cms/media/:id
 *
 *   POST   /api/v1/cms/menus
 *   GET    /api/v1/cms/menus
 *   GET    /api/v1/cms/menus/by-handle/:handle
 *   GET    /api/v1/cms/menus/:id
 *   PATCH  /api/v1/cms/menus/:id
 *   DELETE /api/v1/cms/menus/:id
 *   GET    /api/v1/cms/menus/:id/items
 *   POST   /api/v1/cms/menus/:id/items
 *   PATCH  /api/v1/cms/menus/:id/items/:itemId
 *   DELETE /api/v1/cms/menus/:id/items/:itemId
 */
export declare class CmsModule {
}
//# sourceMappingURL=cms.module.d.ts.map