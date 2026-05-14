"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CmsModule = void 0;
const common_1 = require("@nestjs/common");
const page_module_1 = require("../page/page.module");
const blog_module_1 = require("../blog/blog.module");
const banner_module_1 = require("../banner/banner.module");
const media_module_1 = require("../media/media.module");
const menu_module_1 = require("../menu/menu.module");
const homepage_module_1 = require("../homepage/homepage.module");
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
let CmsModule = class CmsModule {
};
exports.CmsModule = CmsModule;
exports.CmsModule = CmsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            page_module_1.PageModule,
            blog_module_1.BlogModule,
            banner_module_1.BannerModule,
            media_module_1.MediaModule,
            menu_module_1.MenuModule,
            homepage_module_1.HomepageModule,
        ],
        exports: [
            page_module_1.PageModule,
            blog_module_1.BlogModule,
            banner_module_1.BannerModule,
            media_module_1.MediaModule,
            menu_module_1.MenuModule,
            homepage_module_1.HomepageModule,
        ],
    })
], CmsModule);
//# sourceMappingURL=cms.module.js.map