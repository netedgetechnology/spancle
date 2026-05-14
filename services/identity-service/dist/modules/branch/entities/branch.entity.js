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
exports.BranchEntity = void 0;
const typeorm_1 = require("typeorm");
// ── Entity ────────────────────────────────────────────────────────────────────
/**
 * BranchEntity — a physical location / branch of a tenant's organisation.
 *
 * Tenant isolation: every row carries tenantId, enforced by repository layer.
 *
 * Geo: latitude + longitude stored as DECIMAL(10,7) — sufficient precision
 * for ~1cm accuracy. Indexed for future geospatial queries.
 *
 * Timings: stored as JSONB WeeklyTimings object — 7-day schedule.
 * Validated at service layer before persist.
 *
 * Manager: optional FK to users.id (same tenant). Validated at service layer.
 *
 * Slug: URL-safe identifier, unique per tenant. Used in public-facing URLs.
 */
let BranchEntity = class BranchEntity {
};
exports.BranchEntity = BranchEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], BranchEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], BranchEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 150, nullable: false }),
    __metadata("design:type", String)
], BranchEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: false }),
    __metadata("design:type", String)
], BranchEntity.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], BranchEntity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'address_line1', type: 'varchar', length: 255, nullable: false }),
    __metadata("design:type", String)
], BranchEntity.prototype, "addressLine1", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'address_line2', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], BranchEntity.prototype, "addressLine2", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: false }),
    __metadata("design:type", String)
], BranchEntity.prototype, "city", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], BranchEntity.prototype, "county", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, nullable: false }),
    __metadata("design:type", String)
], BranchEntity.prototype, "postcode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 2, nullable: false, default: 'GB' }),
    __metadata("design:type", String)
], BranchEntity.prototype, "countryCode", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'decimal',
        precision: 10,
        scale: 7,
        nullable: true,
        transformer: {
            to: (v) => v,
            from: (v) => v !== null ? parseFloat(v) : null,
        },
    }),
    __metadata("design:type", Object)
], BranchEntity.prototype, "latitude", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'decimal',
        precision: 10,
        scale: 7,
        nullable: true,
        transformer: {
            to: (v) => v,
            from: (v) => v !== null ? parseFloat(v) : null,
        },
    }),
    __metadata("design:type", Object)
], BranchEntity.prototype, "longitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'geo_label', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], BranchEntity.prototype, "geoLabel", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 30, nullable: true }),
    __metadata("design:type", Object)
], BranchEntity.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 254, nullable: true }),
    __metadata("design:type", Object)
], BranchEntity.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 2048, nullable: true }),
    __metadata("design:type", Object)
], BranchEntity.prototype, "website", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'manager_user_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], BranchEntity.prototype, "managerUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['active', 'inactive', 'suspended', 'archived'],
        default: 'active',
    }),
    __metadata("design:type", String)
], BranchEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'jsonb',
        nullable: false,
        default: () => `'${JSON.stringify({
            monday: { isClosed: false, openTime: '09:00', closeTime: '17:00' },
            tuesday: { isClosed: false, openTime: '09:00', closeTime: '17:00' },
            wednesday: { isClosed: false, openTime: '09:00', closeTime: '17:00' },
            thursday: { isClosed: false, openTime: '09:00', closeTime: '17:00' },
            friday: { isClosed: false, openTime: '09:00', closeTime: '17:00' },
            saturday: { isClosed: true, openTime: '09:00', closeTime: '17:00' },
            sunday: { isClosed: true, openTime: '09:00', closeTime: '17:00' },
        })}'`,
    }),
    __metadata("design:type", Object)
], BranchEntity.prototype, "timings", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'map_url', type: 'varchar', length: 2048, nullable: true }),
    __metadata("design:type", Object)
], BranchEntity.prototype, "mapUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], BranchEntity.prototype, "facilities", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'image_url', type: 'varchar', length: 2048, nullable: true }),
    __metadata("design:type", Object)
], BranchEntity.prototype, "imageUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sort_order', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], BranchEntity.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_deleted', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], BranchEntity.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], BranchEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], BranchEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], BranchEntity.prototype, "deletedAt", void 0);
exports.BranchEntity = BranchEntity = __decorate([
    (0, typeorm_1.Entity)('branches'),
    (0, typeorm_1.Index)(['tenantId', 'slug'], { unique: true }),
    (0, typeorm_1.Index)(['tenantId', 'status']),
    (0, typeorm_1.Index)(['tenantId', 'isDeleted'])
], BranchEntity);
//# sourceMappingURL=branch.entity.js.map