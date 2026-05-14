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
exports.HomepageSectionEntity = void 0;
const typeorm_1 = require("typeorm");
/**
 * HomepageSectionEntity — stores all homepage sections in a single table.
 *
 * Design: polymorphic single-table with typed JSONB payload.
 *
 * Rationale for single table over table-per-section-type:
 *   - Drag-and-drop reordering across types needs a single sorted list
 *   - Adding a new section type requires no schema migration — just a new payload schema
 *   - Section metadata (status, sortOrder, title) is identical across all types
 *
 * Tenant isolation:
 *   - Every section carries tenantId (RLS-ready)
 *   - HomepageSectionRepository extends TenantAwareRepository
 *
 * Page binding:
 *   - pageId links sections to a specific Page (typically the homepage PageEntity)
 *   - Multiple pages can have independent section sets (e.g. landing pages)
 *
 * Payload validation:
 *   - JSONB payload is validated against SECTION_SCHEMAS[sectionType] in HomepageService
 *   - Raw JSONB never written without passing Zod validation
 */
let HomepageSectionEntity = class HomepageSectionEntity {
};
exports.HomepageSectionEntity = HomepageSectionEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], HomepageSectionEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], HomepageSectionEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'page_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], HomepageSectionEntity.prototype, "pageId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'section_type',
        type: 'enum',
        enum: ['hero_banner', 'feature_highlights', 'testimonials', 'pricing_preview', 'faq', 'cta'],
        nullable: false,
    }),
    __metadata("design:type", String)
], HomepageSectionEntity.prototype, "sectionType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'admin_label', type: 'varchar', length: 100, nullable: false }),
    __metadata("design:type", String)
], HomepageSectionEntity.prototype, "adminLabel", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: false }),
    __metadata("design:type", Object)
], HomepageSectionEntity.prototype, "payload", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sort_order', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], HomepageSectionEntity.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['draft', 'published', 'archived'],
        default: 'draft',
    }),
    __metadata("design:type", String)
], HomepageSectionEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_visible', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], HomepageSectionEntity.prototype, "isVisible", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ab_variant', type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", Object)
], HomepageSectionEntity.prototype, "abVariant", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], HomepageSectionEntity.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'updated_by', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], HomepageSectionEntity.prototype, "updatedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_deleted', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], HomepageSectionEntity.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], HomepageSectionEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], HomepageSectionEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], HomepageSectionEntity.prototype, "deletedAt", void 0);
exports.HomepageSectionEntity = HomepageSectionEntity = __decorate([
    (0, typeorm_1.Entity)('cms_homepage_sections'),
    (0, typeorm_1.Index)(['tenantId', 'pageId', 'sortOrder']),
    (0, typeorm_1.Index)(['tenantId', 'sectionType', 'status']),
    (0, typeorm_1.Index)(['tenantId', 'isDeleted'])
], HomepageSectionEntity);
//# sourceMappingURL=homepage-section.entity.js.map