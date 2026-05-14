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
exports.PlanEntity = void 0;
const typeorm_1 = require("typeorm");
/**
 * PlanEntity — the resolved plan assignment for a specific tenant.
 *
 * Links: Tenant → Package (via tierKey) with optional per-tenant limit overrides.
 *
 * One active plan per tenant. Created automatically when a subscription is activated.
 * Limit overrides allow enterprise-tier custom agreements (e.g. 10,000 users).
 */
let PlanEntity = class PlanEntity {
};
exports.PlanEntity = PlanEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PlanEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], PlanEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'package_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], PlanEntity.prototype, "packageId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tier_key', type: 'varchar', length: 32, nullable: false }),
    __metadata("design:type", String)
], PlanEntity.prototype, "tierKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'feature_overrides', type: 'jsonb', nullable: false, default: '{}' }),
    __metadata("design:type", Object)
], PlanEntity.prototype, "featureOverrides", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'limit_overrides', type: 'jsonb', nullable: false, default: '{}' }),
    __metadata("design:type", Object)
], PlanEntity.prototype, "limitOverrides", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], PlanEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_deleted', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], PlanEntity.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], PlanEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], PlanEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], PlanEntity.prototype, "deletedAt", void 0);
exports.PlanEntity = PlanEntity = __decorate([
    (0, typeorm_1.Entity)('tenant_plans'),
    (0, typeorm_1.Index)(['tenantId'], { unique: true }),
    (0, typeorm_1.Index)(['packageId'])
], PlanEntity);
//# sourceMappingURL=plan.entity.js.map