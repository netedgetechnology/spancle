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
exports.MembershipEntity = void 0;
const typeorm_1 = require("typeorm");
let MembershipEntity = class MembershipEntity {
};
exports.MembershipEntity = MembershipEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], MembershipEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], MembershipEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'plan_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], MembershipEntity.prototype, "planId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], MembershipEntity.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'membership_type', type: 'varchar', length: 50, nullable: false }),
    __metadata("design:type", String)
], MembershipEntity.prototype, "membershipType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'member_number', type: 'varchar', length: 30, nullable: false }),
    __metadata("design:type", String)
], MembershipEntity.prototype, "memberNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'status', type: 'varchar', length: 30, nullable: false, default: 'pending_payment' }),
    __metadata("design:type", String)
], MembershipEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'benefit_snapshot', type: 'jsonb', nullable: false, default: '[]' }),
    __metadata("design:type", Array)
], MembershipEntity.prototype, "benefitSnapshot", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 3, nullable: false, default: 'GBP' }),
    __metadata("design:type", String)
], MembershipEntity.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'price_minor', type: 'int', nullable: false, default: 0 }),
    __metadata("design:type", Number)
], MembershipEntity.prototype, "priceMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'auto_renew', type: 'boolean', nullable: false, default: true }),
    __metadata("design:type", Boolean)
], MembershipEntity.prototype, "autoRenew", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'enrolled_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], MembershipEntity.prototype, "enrolledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'activated_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], MembershipEntity.prototype, "activatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'trial_ends_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], MembershipEntity.prototype, "trialEndsAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'renews_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], MembershipEntity.prototype, "renewsAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expires_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], MembershipEntity.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cancelled_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], MembershipEntity.prototype, "cancelledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cancellation_reason', type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], MembershipEntity.prototype, "cancellationReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'frozen_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], MembershipEntity.prototype, "frozenAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'frozen_until', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], MembershipEntity.prototype, "frozenUntil", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_freeze_days_used', type: 'int', nullable: false, default: 0 }),
    __metadata("design:type", Number)
], MembershipEntity.prototype, "totalFreezeDaysUsed", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'pending_downgrade_plan_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], MembershipEntity.prototype, "pendingDowngradePlanId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'parent_membership_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], MembershipEntity.prototype, "parentMembershipId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'seat_label', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], MembershipEntity.prototype, "seatLabel", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_deleted', type: 'boolean', nullable: false, default: false }),
    __metadata("design:type", Boolean)
], MembershipEntity.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], MembershipEntity.prototype, "createdById", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'updated_by_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], MembershipEntity.prototype, "updatedById", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], MembershipEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], MembershipEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], MembershipEntity.prototype, "deletedAt", void 0);
exports.MembershipEntity = MembershipEntity = __decorate([
    (0, typeorm_1.Entity)('memberships'),
    (0, typeorm_1.Index)(['tenantId', 'userId']),
    (0, typeorm_1.Index)(['tenantId', 'planId']),
    (0, typeorm_1.Index)(['tenantId', 'status']),
    (0, typeorm_1.Index)(['tenantId', 'memberNumber'], { unique: true, where: '"is_deleted" = false' }),
    (0, typeorm_1.Index)(['tenantId', 'renewsAt'], {
        where: `"status" IN ('active','pending_renewal','payment_failed')`,
    }),
    (0, typeorm_1.Index)(['tenantId', 'expiresAt'], { where: '"expires_at" IS NOT NULL' }),
    (0, typeorm_1.Index)(['tenantId', 'isDeleted'])
], MembershipEntity);
//# sourceMappingURL=membership.entity.js.map