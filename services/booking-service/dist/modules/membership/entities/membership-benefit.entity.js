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
exports.MembershipBenefitEntity = void 0;
const typeorm_1 = require("typeorm");
let MembershipBenefitEntity = class MembershipBenefitEntity {
};
exports.MembershipBenefitEntity = MembershipBenefitEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], MembershipBenefitEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], MembershipBenefitEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'plan_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], MembershipBenefitEntity.prototype, "planId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'benefit_type', type: 'varchar', length: 80, nullable: false }),
    __metadata("design:type", String)
], MembershipBenefitEntity.prototype, "benefitType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'units_per_period', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], MembershipBenefitEntity.prototype, "unitsPerPeriod", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'period_type', type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], MembershipBenefitEntity.prototype, "periodType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reset_day', type: 'int', nullable: false, default: 1 }),
    __metadata("design:type", Number)
], MembershipBenefitEntity.prototype, "resetDay", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'rollover_allowed', type: 'boolean', nullable: false, default: false }),
    __metadata("design:type", Boolean)
], MembershipBenefitEntity.prototype, "rolloverAllowed", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_rollover_units', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], MembershipBenefitEntity.prototype, "maxRolloverUnits", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'transferable', type: 'boolean', nullable: false, default: false }),
    __metadata("design:type", Boolean)
], MembershipBenefitEntity.prototype, "transferable", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expires_with_membership', type: 'boolean', nullable: false, default: true }),
    __metadata("design:type", Boolean)
], MembershipBenefitEntity.prototype, "expiresWithMembership", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sort_order', type: 'int', nullable: false, default: 0 }),
    __metadata("design:type", Number)
], MembershipBenefitEntity.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_deleted', type: 'boolean', nullable: false, default: false }),
    __metadata("design:type", Boolean)
], MembershipBenefitEntity.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], MembershipBenefitEntity.prototype, "createdAt", void 0);
exports.MembershipBenefitEntity = MembershipBenefitEntity = __decorate([
    (0, typeorm_1.Entity)('membership_plan_benefits'),
    (0, typeorm_1.Index)(['tenantId', 'planId']),
    (0, typeorm_1.Index)(['tenantId', 'planId', 'benefitType'], {
        unique: true,
        where: '"is_deleted" = false',
    })
], MembershipBenefitEntity);
//# sourceMappingURL=membership-benefit.entity.js.map