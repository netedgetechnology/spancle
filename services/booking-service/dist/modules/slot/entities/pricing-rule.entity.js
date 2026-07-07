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
exports.PricingRuleEntity = void 0;
const typeorm_1 = require("typeorm");
let PricingRuleEntity = class PricingRuleEntity {
};
exports.PricingRuleEntity = PricingRuleEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PricingRuleEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], PricingRuleEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 150, nullable: false }),
    __metadata("design:type", String)
], PricingRuleEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], PricingRuleEntity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'rule_type',
        type: 'enum',
        enum: [
            'base', 'peak', 'weekend', 'holiday', 'member', 'custom',
            'time_of_day', 'day_of_week', 'seasonal', 'promotion',
            'membership', 'coach', 'tournament', 'coupon',
        ],
    }),
    __metadata("design:type", String)
], PricingRuleEntity.prototype, "ruleType", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'modifier_type',
        type: 'enum',
        enum: ['percentage', 'fixed', 'absolute'],
        default: 'percentage',
    }),
    __metadata("design:type", String)
], PricingRuleEntity.prototype, "modifierType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'modifier_value', type: 'int', nullable: false }),
    __metadata("design:type", Number)
], PricingRuleEntity.prototype, "modifierValue", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['tenant', 'branch', 'venue', 'sport', 'court'],
        default: 'tenant',
    }),
    __metadata("design:type", String)
], PricingRuleEntity.prototype, "scope", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'branch_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], PricingRuleEntity.prototype, "branchId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'venue_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], PricingRuleEntity.prototype, "venueId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sport_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], PricingRuleEntity.prototype, "sportId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'court_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], PricingRuleEntity.prototype, "courtId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'coupon_code', type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", Object)
], PricingRuleEntity.prototype, "couponCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_redemptions', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], PricingRuleEntity.prototype, "maxRedemptions", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'redemption_count', type: 'int', nullable: false, default: 0 }),
    __metadata("design:type", Number)
], PricingRuleEntity.prototype, "redemptionCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'valid_from', type: 'date', nullable: true }),
    __metadata("design:type", Object)
], PricingRuleEntity.prototype, "validFrom", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'valid_until', type: 'date', nullable: true }),
    __metadata("design:type", Object)
], PricingRuleEntity.prototype, "validUntil", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'days_of_week', type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], PricingRuleEntity.prototype, "daysOfWeek", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'time_start', type: 'varchar', length: 5, nullable: true }),
    __metadata("design:type", Object)
], PricingRuleEntity.prototype, "timeStart", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'time_end', type: 'varchar', length: 5, nullable: true }),
    __metadata("design:type", Object)
], PricingRuleEntity.prototype, "timeEnd", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], PricingRuleEntity.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], PricingRuleEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_deleted', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], PricingRuleEntity.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], PricingRuleEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], PricingRuleEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], PricingRuleEntity.prototype, "deletedAt", void 0);
exports.PricingRuleEntity = PricingRuleEntity = __decorate([
    (0, typeorm_1.Entity)('pricing_rules'),
    (0, typeorm_1.Index)(['tenantId', 'ruleType']),
    (0, typeorm_1.Index)(['tenantId', 'isActive']),
    (0, typeorm_1.Index)(['tenantId', 'branchId']),
    (0, typeorm_1.Index)(['tenantId', 'venueId']),
    (0, typeorm_1.Index)(['tenantId', 'courtId']),
    (0, typeorm_1.Index)(['tenantId', 'sportId']),
    (0, typeorm_1.Index)(['tenantId', 'couponCode']),
    (0, typeorm_1.Index)(['tenantId', 'isDeleted'])
], PricingRuleEntity);
//# sourceMappingURL=pricing-rule.entity.js.map