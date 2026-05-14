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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlogPostEntity = void 0;
const typeorm_1 = require("typeorm");
const seo_fields_embed_1 = require("../../seo/embeds/seo-fields.embed");
let BlogPostEntity = class BlogPostEntity {
};
exports.BlogPostEntity = BlogPostEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], BlogPostEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], BlogPostEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: false }),
    __metadata("design:type", String)
], BlogPostEntity.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: false }),
    __metadata("design:type", String)
], BlogPostEntity.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], BlogPostEntity.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], BlogPostEntity.prototype, "excerpt", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['draft', 'published', 'archived', 'scheduled'],
        default: 'draft',
    }),
    __metadata("design:type", String)
], BlogPostEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'published_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], BlogPostEntity.prototype, "publishedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'category_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], BlogPostEntity.prototype, "categoryId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], BlogPostEntity.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reading_time_minutes', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], BlogPostEntity.prototype, "readingTimeMinutes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'featured_image_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], BlogPostEntity.prototype, "featuredImageId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'featured_image_url', type: 'varchar', length: 2048, nullable: true }),
    __metadata("design:type", Object)
], BlogPostEntity.prototype, "featuredImageUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'author_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], BlogPostEntity.prototype, "authorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_edited_by', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], BlogPostEntity.prototype, "lastEditedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'view_count', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], BlogPostEntity.prototype, "viewCount", void 0);
__decorate([
    (0, typeorm_1.Column)(() => seo_fields_embed_1.SeoFieldsEmbed),
    __metadata("design:type", seo_fields_embed_1.SeoFieldsEmbed)
], BlogPostEntity.prototype, "seo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_featured', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], BlogPostEntity.prototype, "isFeatured", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_deleted', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], BlogPostEntity.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], BlogPostEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], BlogPostEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], BlogPostEntity.prototype, "deletedAt", void 0);
exports.BlogPostEntity = BlogPostEntity = __decorate([
    (0, typeorm_1.Entity)('cms_blog_posts'),
    (0, typeorm_1.Index)(['tenantId', 'slug'], { unique: true }),
    (0, typeorm_1.Index)(['tenantId', 'status']),
    (0, typeorm_1.Index)(['tenantId', 'categoryId'])
], BlogPostEntity);
//# sourceMappingURL=blog-post.entity.js.map