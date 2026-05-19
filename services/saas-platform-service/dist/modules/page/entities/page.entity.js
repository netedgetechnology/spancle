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
exports.PageEntity = void 0;
const typeorm_1 = require("typeorm");
let PageEntity = class PageEntity {
};
exports.PageEntity = PageEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PageEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], PageEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: false }),
    __metadata("design:type", String)
], PageEntity.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: false }),
    __metadata("design:type", String)
], PageEntity.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], PageEntity.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], PageEntity.prototype, "excerpt", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['draft', 'published', 'archived', 'scheduled'],
        default: 'draft',
    }),
    __metadata("design:type", String)
], PageEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'published_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], PageEntity.prototype, "publishedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true, default: 'default' }),
    __metadata("design:type", Object)
], PageEntity.prototype, "template", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sort_order', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], PageEntity.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_homepage', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], PageEntity.prototype, "isHomepage", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'featured_image_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], PageEntity.prototype, "featuredImageId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'featured_image_url', type: 'varchar', length: 2048, nullable: true }),
    __metadata("design:type", Object)
], PageEntity.prototype, "featuredImageUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'author_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], PageEntity.prototype, "authorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_edited_by', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], PageEntity.prototype, "lastEditedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true, default: {} }),
    __metadata("design:type", Object)
], PageEntity.prototype, "seo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_deleted', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], PageEntity.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], PageEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], PageEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], PageEntity.prototype, "deletedAt", void 0);
exports.PageEntity = PageEntity = __decorate([
    (0, typeorm_1.Entity)('cms_pages'),
    (0, typeorm_1.Index)(['tenantId', 'slug'], { unique: true }),
    (0, typeorm_1.Index)(['tenantId', 'status']),
    (0, typeorm_1.Index)(['tenantId', 'isDeleted'])
], PageEntity);
//# sourceMappingURL=page.entity.js.map