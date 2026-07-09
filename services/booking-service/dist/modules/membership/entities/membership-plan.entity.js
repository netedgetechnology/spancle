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
exports.MembershipPlanEntity = void 0;
const typeorm_1 = require("typeorm");
let MembershipPlanEntity = class MembershipPlanEntity {
};
exports.MembershipPlanEntity = MembershipPlanEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], MembershipPlanEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], MembershipPlanEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 150, nullable: false }),
    __metadata("design:type", String)
], MembershipPlanEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: false }),
    __metadata("design:type", String)
], MembershipPlanEntity.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], MembershipPlanEntity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'membership_type', type: 'varchar', length: 50, nullable: false }),
    __metadata("design:type", String)
], MembershipPlanEntity.prototype, "membershipType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 3, nullable: false, default: 'GBP' }),
    __metadata("design:type", String)
], MembershipPlanEntity.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'billing_cycle',
        type: 'varchar',
        length: 20,
        nullable: false,
        default: 'monthly',
    }),
    __metadata("design:type", String)
], MembershipPlanEntity.prototype, "billingCycle", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'price_minor', type: 'int', nullable: false, default: 0 }),
    __metadata("design:type", Number)
], MembershipPlanEntity.prototype, "priceMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'setup_fee_minor', type: 'int', nullable: false, default: 0 }),
    __metadata("design:type", Number)
], MembershipPlanEntity.prototype, "setupFeeMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'trial_days', type: 'int', nullable: false, default: 0 }),
    __metadata("design:type", Number)
], MembershipPlanEntity.prototype, "trialDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'auto_renew', type: 'boolean', nullable: false, default: true }),
    __metadata("design:type", Boolean)
], MembershipPlanEntity.prototype, "autoRenew", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'grace_period_days', type: 'int', nullable: false, default: 3 }),
    __metadata("design:type", Number)
], MembershipPlanEntity.prototype, "gracePeriodDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_members', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], MembershipPlanEntity.prototype, "maxMembers", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_family_dependants', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], MembershipPlanEntity.prototype, "maxFamilyDependants", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_corporate_seats', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], MembershipPlanEntity.prototype, "maxCorporateSeats", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'refund_on_cancellation', type: 'boolean', nullable: false, default: false }),
    __metadata("design:type", Boolean)
], MembershipPlanEntity.prototype, "refundOnCancellation", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_public', type: 'boolean', nullable: false, default: true }),
    __metadata("design:type", Boolean)
], MembershipPlanEntity.prototype, "isPublic", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sort_order', type: 'int', nullable: false, default: 0 }),
    __metadata("design:type", Number)
], MembershipPlanEntity.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', type: 'boolean', nullable: false, default: true }),
    __metadata("design:type", Boolean)
], MembershipPlanEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_deleted', type: 'boolean', nullable: false, default: false }),
    __metadata("design:type", Boolean)
], MembershipPlanEntity.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], MembershipPlanEntity.prototype, "createdById", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'updated_by_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], MembershipPlanEntity.prototype, "updatedById", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], MembershipPlanEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], MembershipPlanEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], MembershipPlanEntity.prototype, "deletedAt", void 0);
exports.MembershipPlanEntity = MembershipPlanEntity = __decorate([
    (0, typeorm_1.Entity)('membership_plans'),
    (0, typeorm_1.Index)(['tenantId', 'slug'], { unique: true, where: '"is_deleted" = false' }),
    (0, typeorm_1.Index)(['tenantId', 'isActive']),
    (0, typeorm_1.Index)(['tenantId', 'isDeleted'])
], MembershipPlanEntity);
//# sourceMappingURL=membership-plan.entity.js.map