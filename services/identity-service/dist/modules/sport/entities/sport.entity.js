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
exports.SportEntity = void 0;
const typeorm_1 = require("typeorm");
/**
 * SportEntity — a sport or activity offered by a tenant.
 *
 * Design decisions:
 *   - No hard limit on sports per tenant (requirement: unlimited).
 *     Plan-based limits enforced separately in Sprint 3 via PlanLimitGuard.
 *
 *   - `config` JSONB: sport-specific configuration (e.g. team sizes,
 *     duration presets, scoring rules, equipment checklist).
 *     Intentionally untyped at entity level — validated in service layer.
 *     Sprint 3: add sportType enum + per-type JSON Schema validation.
 *
 *   - `icon`: emoji or icon identifier string (e.g. "⚽", "football",
 *     "mdi:soccer"). Kept as a free-form string for flexibility.
 *
 *   - `color`: hex colour string (e.g. "#3b82f6") for UI differentiation.
 *
 *   - Branch mapping is handled by SportBranchEntity (separate join table).
 *     A sport with no branch mappings is available at all branches (global).
 *     A sport with mappings is available only at those branches.
 *
 * Table: `sports`
 * Unique: (tenant_id, slug)
 */
let SportEntity = class SportEntity {
};
exports.SportEntity = SportEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SportEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], SportEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: false }),
    __metadata("design:type", String)
], SportEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: false }),
    __metadata("design:type", String)
], SportEntity.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], SportEntity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], SportEntity.prototype, "icon", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 7, nullable: true }),
    __metadata("design:type", Object)
], SportEntity.prototype, "color", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: false, default: '{}' }),
    __metadata("design:type", Object)
], SportEntity.prototype, "config", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['active', 'inactive'],
        default: 'active',
    }),
    __metadata("design:type", String)
], SportEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sort_order', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], SportEntity.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_deleted', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], SportEntity.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], SportEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], SportEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], SportEntity.prototype, "deletedAt", void 0);
exports.SportEntity = SportEntity = __decorate([
    (0, typeorm_1.Entity)('sports'),
    (0, typeorm_1.Index)(['tenantId', 'slug'], { unique: true }),
    (0, typeorm_1.Index)(['tenantId', 'status']),
    (0, typeorm_1.Index)(['tenantId', 'isDeleted'])
], SportEntity);
//# sourceMappingURL=sport.entity.js.map