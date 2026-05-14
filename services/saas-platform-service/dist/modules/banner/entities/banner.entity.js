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
exports.BannerEntity = void 0;
const typeorm_1 = require("typeorm");
const seo_fields_embed_1 = require("../../seo/embeds/seo-fields.embed");
/**
 * BannerEntity — a CMS content banner (hero, promotional, or notification block).
 *
 * Banners are tenant-scoped and support:
 *   - Multiple placements (hero, sidebar, inline, modal, footer)
 *   - Scheduling (activeFrom / activeTo date range)
 *   - Target URL for CTA link
 *   - Sort order within placement
 *   - SEO fields for crawlable banners
 */
let BannerEntity = class BannerEntity {
};
exports.BannerEntity = BannerEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], BannerEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], BannerEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: false }),
    __metadata("design:type", String)
], BannerEntity.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], BannerEntity.prototype, "key", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], BannerEntity.prototype, "subtitle", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], BannerEntity.prototype, "body", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cta_label', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], BannerEntity.prototype, "ctaLabel", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cta_url', type: 'varchar', length: 2048, nullable: true }),
    __metadata("design:type", Object)
], BannerEntity.prototype, "ctaUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cta_target_blank', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], BannerEntity.prototype, "ctaTargetBlank", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'image_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], BannerEntity.prototype, "imageId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'image_url', type: 'varchar', length: 2048, nullable: true }),
    __metadata("design:type", Object)
], BannerEntity.prototype, "imageUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'image_alt', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], BannerEntity.prototype, "imageAlt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'mobile_image_url', type: 'varchar', length: 2048, nullable: true }),
    __metadata("design:type", Object)
], BannerEntity.prototype, "mobileImageUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['hero', 'sidebar', 'inline', 'modal', 'footer', 'notification'],
        default: 'hero',
    }),
    __metadata("design:type", String)
], BannerEntity.prototype, "placement", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['draft', 'active', 'inactive', 'scheduled'],
        default: 'draft',
    }),
    __metadata("design:type", String)
], BannerEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'active_from', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], BannerEntity.prototype, "activeFrom", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'active_to', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], BannerEntity.prototype, "activeTo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sort_order', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], BannerEntity.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'bg_color', type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], BannerEntity.prototype, "bgColor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'meta', type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], BannerEntity.prototype, "meta", void 0);
__decorate([
    (0, typeorm_1.Column)(() => seo_fields_embed_1.SeoFieldsEmbed),
    __metadata("design:type", seo_fields_embed_1.SeoFieldsEmbed)
], BannerEntity.prototype, "seo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_deleted', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], BannerEntity.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], BannerEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], BannerEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], BannerEntity.prototype, "deletedAt", void 0);
exports.BannerEntity = BannerEntity = __decorate([
    (0, typeorm_1.Entity)('cms_banners'),
    (0, typeorm_1.Index)(['tenantId', 'placement', 'status']),
    (0, typeorm_1.Index)(['tenantId', 'isDeleted'])
], BannerEntity);
//# sourceMappingURL=banner.entity.js.map