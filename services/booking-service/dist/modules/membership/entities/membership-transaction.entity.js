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
exports.MembershipTransactionEntity = void 0;
const typeorm_1 = require("typeorm");
let MembershipTransactionEntity = class MembershipTransactionEntity {
};
exports.MembershipTransactionEntity = MembershipTransactionEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], MembershipTransactionEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], MembershipTransactionEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'membership_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], MembershipTransactionEntity.prototype, "membershipId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], MembershipTransactionEntity.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'transaction_type', type: 'varchar', length: 30, nullable: false }),
    __metadata("design:type", String)
], MembershipTransactionEntity.prototype, "transactionType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'benefit_type', type: 'varchar', length: 80, nullable: true }),
    __metadata("design:type", Object)
], MembershipTransactionEntity.prototype, "benefitType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'quantity_delta', type: 'int', nullable: false }),
    __metadata("design:type", Number)
], MembershipTransactionEntity.prototype, "quantityDelta", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'balance_before', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], MembershipTransactionEntity.prototype, "balanceBefore", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'balance_after', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], MembershipTransactionEntity.prototype, "balanceAfter", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reference_type', type: 'varchar', length: 30, nullable: true }),
    __metadata("design:type", Object)
], MembershipTransactionEntity.prototype, "referenceType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reference_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], MembershipTransactionEntity.prototype, "referenceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'actor_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], MembershipTransactionEntity.prototype, "actorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], MembershipTransactionEntity.prototype, "note", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], MembershipTransactionEntity.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], MembershipTransactionEntity.prototype, "createdAt", void 0);
exports.MembershipTransactionEntity = MembershipTransactionEntity = __decorate([
    (0, typeorm_1.Entity)('membership_transactions'),
    (0, typeorm_1.Index)(['tenantId', 'membershipId']),
    (0, typeorm_1.Index)(['tenantId', 'userId']),
    (0, typeorm_1.Index)(['tenantId', 'referenceId'], { where: '"reference_id" IS NOT NULL' }),
    (0, typeorm_1.Index)(['tenantId', 'createdAt'])
], MembershipTransactionEntity);
//# sourceMappingURL=membership-transaction.entity.js.map