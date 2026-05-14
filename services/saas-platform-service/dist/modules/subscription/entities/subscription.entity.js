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
exports.SubscriptionEntity = void 0;
const typeorm_1 = require("typeorm");
/**
 * SubscriptionEntity — a tenant's subscription to a Package.
 *
 * One active subscription per tenant at any time.
 * Historical subscriptions are kept (is_deleted = false, status = cancelled/expired).
 *
 * Lifecycle:
 *   new tenant → trialing (if trialDays > 0) or active (free tier)
 *   trial ends → active (if payment provided) or expired (no payment)
 *   active     → cancelled (by tenant request)
 *   active     → past_due (payment failure)
 *   past_due   → active (payment recovered) or expired (grace period lapsed)
 */
let SubscriptionEntity = class SubscriptionEntity {
};
exports.SubscriptionEntity = SubscriptionEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SubscriptionEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], SubscriptionEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'package_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], SubscriptionEntity.prototype, "packageId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tier_key', type: 'varchar', length: 32, nullable: false }),
    __metadata("design:type", String)
], SubscriptionEntity.prototype, "tierKey", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['trialing', 'active', 'past_due', 'cancelled', 'expired', 'paused'],
        default: 'trialing',
    }),
    __metadata("design:type", String)
], SubscriptionEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'billing_cycle',
        type: 'enum',
        enum: ['monthly', 'annual', 'one_time', 'custom'],
        default: 'monthly',
    }),
    __metadata("design:type", String)
], SubscriptionEntity.prototype, "billingCycle", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'price_minor_units', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], SubscriptionEntity.prototype, "priceMinorUnits", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 3, default: 'GBP' }),
    __metadata("design:type", String)
], SubscriptionEntity.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'period_start', type: 'timestamptz', nullable: false }),
    __metadata("design:type", Date)
], SubscriptionEntity.prototype, "periodStart", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'period_end', type: 'timestamptz', nullable: false }),
    __metadata("design:type", Date)
], SubscriptionEntity.prototype, "periodEnd", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'trial_end', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], SubscriptionEntity.prototype, "trialEnd", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cancelled_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], SubscriptionEntity.prototype, "cancelledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cancel_reason', type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], SubscriptionEntity.prototype, "cancelReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'features_snapshot', type: 'jsonb', nullable: false, default: '{}' }),
    __metadata("design:type", Object)
], SubscriptionEntity.prototype, "featuresSnapshot", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'limits_snapshot', type: 'jsonb', nullable: false, default: '{}' }),
    __metadata("design:type", Object)
], SubscriptionEntity.prototype, "limitsSnapshot", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'external_sub_id', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], SubscriptionEntity.prototype, "externalSubId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_deleted', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], SubscriptionEntity.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], SubscriptionEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], SubscriptionEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], SubscriptionEntity.prototype, "deletedAt", void 0);
exports.SubscriptionEntity = SubscriptionEntity = __decorate([
    (0, typeorm_1.Entity)('subscriptions'),
    (0, typeorm_1.Index)(['tenantId', 'status']),
    (0, typeorm_1.Index)(['tenantId', 'isDeleted']),
    (0, typeorm_1.Index)(['packageId'])
], SubscriptionEntity);
//# sourceMappingURL=subscription.entity.js.map