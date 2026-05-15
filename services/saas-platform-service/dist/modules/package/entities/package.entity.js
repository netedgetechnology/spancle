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
exports.PackageEntity = void 0;
const typeorm_1 = require("typeorm");
let PackageEntity = class PackageEntity {
};
exports.PackageEntity = PackageEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PackageEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 63, nullable: false }),
    __metadata("design:type", String)
], PackageEntity.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: false }),
    __metadata("design:type", String)
], PackageEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], PackageEntity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tier_key', type: 'varchar', length: 32, nullable: false }),
    __metadata("design:type", String)
], PackageEntity.prototype, "tierKey", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['draft', 'active', 'deprecated', 'archived'],
        default: 'draft',
    }),
    __metadata("design:type", String)
], PackageEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'price_monthly_minor', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], PackageEntity.prototype, "priceMonthlyMinorUnits", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'price_annual_minor', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], PackageEntity.prototype, "priceAnnualMinorUnits", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 3, default: 'GBP' }),
    __metadata("design:type", String)
], PackageEntity.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'trial_days', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], PackageEntity.prototype, "trialDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: false, default: '{}' }),
    __metadata("design:type", Object)
], PackageEntity.prototype, "features", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: false, default: '{}' }),
    __metadata("design:type", Object)
], PackageEntity.prototype, "limits", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'highlight_features', type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], PackageEntity.prototype, "highlightFeatures", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'badge_text', type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", Object)
], PackageEntity.prototype, "badgeText", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_highlighted', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], PackageEntity.prototype, "isHighlighted", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sort_order', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], PackageEntity.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], PackageEntity.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'published_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], PackageEntity.prototype, "publishedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'deprecated_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], PackageEntity.prototype, "deprecatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_deleted', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], PackageEntity.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], PackageEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], PackageEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], PackageEntity.prototype, "deletedAt", void 0);
exports.PackageEntity = PackageEntity = __decorate([
    (0, typeorm_1.Entity)('package_definitions'),
    (0, typeorm_1.Index)(['status']),
    (0, typeorm_1.Index)(['tierKey'], { unique: true }),
    (0, typeorm_1.Index)(['slug'], { unique: true })
], PackageEntity);
//# sourceMappingURL=package.entity.js.map