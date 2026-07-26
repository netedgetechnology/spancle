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
exports.CustomerEntity = void 0;
const typeorm_1 = require("typeorm");
let CustomerEntity = class CustomerEntity {
};
exports.CustomerEntity = CustomerEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CustomerEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], CustomerEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'branch_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], CustomerEntity.prototype, "branchId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], CustomerEntity.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'parent_customer_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], CustomerEntity.prototype, "parentCustomerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'first_name', type: 'varchar', length: 100, nullable: false }),
    __metadata("design:type", String)
], CustomerEntity.prototype, "firstName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_name', type: 'varchar', length: 100, nullable: false }),
    __metadata("design:type", String)
], CustomerEntity.prototype, "lastName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'full_name', type: 'varchar', length: 255, nullable: false }),
    __metadata("design:type", String)
], CustomerEntity.prototype, "fullName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], CustomerEntity.prototype, "gender", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'date_of_birth', type: 'date', nullable: true }),
    __metadata("design:type", Object)
], CustomerEntity.prototype, "dateOfBirth", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 30, nullable: true }),
    __metadata("design:type", Object)
], CustomerEntity.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 254, nullable: true }),
    __metadata("design:type", Object)
], CustomerEntity.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'emergency_contact', type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], CustomerEntity.prototype, "emergencyContact", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], CustomerEntity.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'profile_photo', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], CustomerEntity.prototype, "profilePhoto", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], CustomerEntity.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, nullable: false, default: 'active' }),
    __metadata("design:type", String)
], CustomerEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_guest', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], CustomerEntity.prototype, "isGuest", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'wallet_balance_minor', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], CustomerEntity.prototype, "walletBalanceMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_deleted', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], CustomerEntity.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], CustomerEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], CustomerEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], CustomerEntity.prototype, "deletedAt", void 0);
exports.CustomerEntity = CustomerEntity = __decorate([
    (0, typeorm_1.Entity)('customers'),
    (0, typeorm_1.Index)(['tenantId']),
    (0, typeorm_1.Index)(['tenantId', 'email']),
    (0, typeorm_1.Index)(['tenantId', 'phone']),
    (0, typeorm_1.Index)(['tenantId', 'userId']),
    (0, typeorm_1.Index)(['tenantId', 'status']),
    (0, typeorm_1.Index)(['tenantId', 'parentCustomerId'])
], CustomerEntity);
//# sourceMappingURL=customer.entity.js.map