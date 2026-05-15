"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlogController = void 0;
const common_1 = require("@nestjs/common");
const audit_interceptor_1 = require("../../../common/interceptors/audit.interceptor");
const tenant_decorator_1 = require("../../../common/decorators/tenant.decorator");
const blog_service_1 = require("../services/blog.service");
const create_blog_post_dto_1 = require("../dto/create-blog-post.dto");
let BlogController = class BlogController {
    constructor(blogService) {
        this.blogService = blogService;
    }
    createPost(dto, tenant) {
        return this.blogService.createPost(dto, tenant.tenantId, 'system');
    }
    findAllPosts(tenant, page, limit, status, categoryId, search) {
        return this.blogService.findAllPosts(tenant.tenantId, page ? Number(page) : 1, limit ? Number(limit) : 20, status, categoryId, search);
    }
    findFeaturedPosts(tenant, limit) {
        return this.blogService.findFeaturedPosts(tenant.tenantId, limit ? Number(limit) : 5);
    }
    searchPosts(tenant, q, page, limit) {
        return this.blogService.findAllPosts(tenant.tenantId, page ? Number(page) : 1, limit ? Number(limit) : 20, undefined, undefined, q ?? '');
    }
    findPostBySlug(slug, tenant) {
        return this.blogService.findPostBySlug(slug, tenant.tenantId);
    }
    findOnePost(id, tenant) {
        return this.blogService.findOnePost(id, tenant.tenantId);
    }
    findRelatedPosts(id, tenant, limit) {
        return this.blogService.findRelatedPosts(id, tenant.tenantId, limit ? Number(limit) : 4);
    }
    updatePost(id, dto, tenant) {
        return this.blogService.updatePost(id, dto, tenant.tenantId, 'system');
    }
    bulkUpdateStatus(dto, tenant) {
        return this.blogService
            .bulkUpdateStatus(dto, tenant.tenantId, 'system')
            .then((count) => ({ updated: count }));
    }
    publishScheduled() {
        return this.blogService
            .publishScheduled()
            .then((count) => ({ published: count }));
    }
    removePost(id, tenant) {
        return this.blogService.removePost(id, tenant.tenantId, 'system');
    }
    createCategory(dto, tenant) {
        return this.blogService.createCategory(dto, tenant.tenantId, 'system');
    }
    findAllCategories(tenant) {
        return this.blogService.getCategoriesWithCounts(tenant.tenantId);
    }
    findOneCategory(id, tenant) {
        return this.blogService.findOneCategory(id, tenant.tenantId);
    }
    updateCategory(id, dto, tenant) {
        return this.blogService.updateCategory(id, dto, tenant.tenantId, 'system');
    }
    removeCategory(id, tenant) {
        return this.blogService.removeCategory(id, tenant.tenantId, 'system');
    }
};
exports.BlogController = BlogController;
__decorate([
    (0, common_1.Post)('posts'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_blog_post_dto_1.CreateBlogPostDto, Object]),
    __metadata("design:returntype", void 0)
], BlogController.prototype, "createPost", null);
__decorate([
    (0, common_1.Get)('posts'),
    __param(0, (0, tenant_decorator_1.TenantCtx)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('status')),
    __param(4, (0, common_1.Query)('categoryId')),
    __param(5, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], BlogController.prototype, "findAllPosts", null);
__decorate([
    (0, common_1.Get)('posts/featured'),
    __param(0, (0, tenant_decorator_1.TenantCtx)()),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BlogController.prototype, "findFeaturedPosts", null);
__decorate([
    (0, common_1.Get)('posts/search'),
    __param(0, (0, tenant_decorator_1.TenantCtx)()),
    __param(1, (0, common_1.Query)('q')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], BlogController.prototype, "searchPosts", null);
__decorate([
    (0, common_1.Get)('posts/by-slug/:slug'),
    __param(0, (0, common_1.Param)('slug')),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BlogController.prototype, "findPostBySlug", null);
__decorate([
    (0, common_1.Get)('posts/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BlogController.prototype, "findOnePost", null);
__decorate([
    (0, common_1.Get)('posts/:id/related'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], BlogController.prototype, "findRelatedPosts", null);
__decorate([
    (0, common_1.Patch)('posts/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_blog_post_dto_1.UpdateBlogPostDto, Object]),
    __metadata("design:returntype", void 0)
], BlogController.prototype, "updatePost", null);
__decorate([
    (0, common_1.Post)('posts/bulk-status'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_blog_post_dto_1.BulkUpdateStatusDto, Object]),
    __metadata("design:returntype", void 0)
], BlogController.prototype, "bulkUpdateStatus", null);
__decorate([
    (0, common_1.Post)('posts/publish-scheduled'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BlogController.prototype, "publishScheduled", null);
__decorate([
    (0, common_1.Delete)('posts/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BlogController.prototype, "removePost", null);
__decorate([
    (0, common_1.Post)('categories'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_blog_post_dto_1.CreateCategoryDto, Object]),
    __metadata("design:returntype", void 0)
], BlogController.prototype, "createCategory", null);
__decorate([
    (0, common_1.Get)('categories'),
    __param(0, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BlogController.prototype, "findAllCategories", null);
__decorate([
    (0, common_1.Get)('categories/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BlogController.prototype, "findOneCategory", null);
__decorate([
    (0, common_1.Patch)('categories/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_blog_post_dto_1.UpdateCategoryDto, Object]),
    __metadata("design:returntype", void 0)
], BlogController.prototype, "updateCategory", null);
__decorate([
    (0, common_1.Delete)('categories/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BlogController.prototype, "removeCategory", null);
exports.BlogController = BlogController = __decorate([
    (0, common_1.Controller)('cms/blog'),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [blog_service_1.BlogService])
], BlogController);
//# sourceMappingURL=blog.controller.js.map