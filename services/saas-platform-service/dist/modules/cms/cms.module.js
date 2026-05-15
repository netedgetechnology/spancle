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