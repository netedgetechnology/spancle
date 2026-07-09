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
exports.EntitlementBalanceEntity = void 0;
const typeorm_1 = require("typeorm");
let EntitlementBalanceEntity = class EntitlementBalanceEntity {
};
exports.EntitlementBalanceEntity = EntitlementBalanceEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], EntitlementBalanceEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], EntitlementBalanceEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'membership_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], EntitlementBalanceEntity.prototype, "membershipId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'benefit_type', type: 'varchar', length: 80, nullable: false }),
    __metadata("design:type", String)
], EntitlementBalanceEntity.prototype, "benefitType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'balance', type: 'int', nullable: false, default: 0 }),
    __metadata("design:type", Number)
], EntitlementBalanceEntity.prototype, "balance", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reserved_units', type: 'int', nullable: false, default: 0 }),
    __metadata("design:type", Number)
], EntitlementBalanceEntity.prototype, "reservedUnits", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'base_units', type: 'int', nullable: false, default: 0 }),
    __metadata("design:type", Number)
], EntitlementBalanceEntity.prototype, "baseUnits", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'period_type', type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], EntitlementBalanceEntity.prototype, "periodType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'next_reset_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], EntitlementBalanceEntity.prototype, "nextResetAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_reset_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], EntitlementBalanceEntity.prototype, "lastResetAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'rollover_allowed', type: 'boolean', nullable: false, default: false }),
    __metadata("design:type", Boolean)
], EntitlementBalanceEntity.prototype, "rolloverAllowed", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_rollover_units', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], EntitlementBalanceEntity.prototype, "maxRolloverUnits", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_consumed_lifetime', type: 'int', nullable: false, default: 0 }),
    __metadata("design:type", Number)
], EntitlementBalanceEntity.prototype, "totalConsumedLifetime", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', type: 'boolean', nullable: false, default: true }),
    __metadata("design:type", Boolean)
], EntitlementBalanceEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], EntitlementBalanceEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], EntitlementBalanceEntity.prototype, "updatedAt", void 0);
exports.EntitlementBalanceEntity = EntitlementBalanceEntity = __decorate([
    (0, typeorm_1.Entity)('membership_entitlement_balances'),
    (0, typeorm_1.Index)(['tenantId', 'membershipId']),
    (0, typeorm_1.Index)(['tenantId', 'membershipId', 'benefitType'], { unique: true }),
    (0, typeorm_1.Index)(['tenantId', 'nextResetAt'], { where: '"next_reset_at" IS NOT NULL' })
], EntitlementBalanceEntity);
//# sourceMappingURL=entitlement-balance.entity.js.map