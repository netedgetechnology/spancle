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
exports.MenuItemEntity = void 0;
const typeorm_1 = require("typeorm");
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
let MenuItemEntity = class MenuItemEntity {
};
exports.MenuItemEntity = MenuItemEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], MenuItemEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], MenuItemEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'menu_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], MenuItemEntity.prototype, "menuId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'parent_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], MenuItemEntity.prototype, "parentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: false }),
    __metadata("design:type", String)
], MenuItemEntity.prototype, "label", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'link_type',
        type: 'enum',
        enum: ['internal_page', 'internal_post', 'external_url', 'custom'],
        default: 'external_url',
    }),
    __metadata("design:type", String)
], MenuItemEntity.prototype, "linkType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 2048, nullable: true }),
    __metadata("design:type", Object)
], MenuItemEntity.prototype, "url", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'page_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], MenuItemEntity.prototype, "pageId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'post_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], MenuItemEntity.prototype, "postId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['_self', '_blank'],
        default: '_self',
    }),
    __metadata("design:type", String)
], MenuItemEntity.prototype, "target", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'icon_name', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], MenuItemEntity.prototype, "iconName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'css_class', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], MenuItemEntity.prototype, "cssClass", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sort_order', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], MenuItemEntity.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], MenuItemEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_deleted', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], MenuItemEntity.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], MenuItemEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], MenuItemEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], MenuItemEntity.prototype, "deletedAt", void 0);
exports.MenuItemEntity = MenuItemEntity = __decorate([
    (0, typeorm_1.Entity)('cms_menu_items'),
    (0, typeorm_1.Index)(['tenantId', 'menuId', 'sortOrder']),
    (0, typeorm_1.Index)(['tenantId', 'parentId'])
], MenuItemEntity);
//# sourceMappingURL=menu-item.entity.js.map