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
exports.PaymentAllocationEntity = exports.PaymentEntity = void 0;
const typeorm_1 = require("typeorm");
let PaymentEntity = class PaymentEntity {
};
exports.PaymentEntity = PaymentEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PaymentEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], PaymentEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reference', type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], PaymentEntity.prototype, "reference", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'status', type: 'varchar', length: 20, nullable: false, default: 'initiated' }),
    __metadata("design:type", String)
], PaymentEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'method', type: 'varchar', length: 20, nullable: false }),
    __metadata("design:type", String)
], PaymentEntity.prototype, "method", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'gateway', type: 'varchar', length: 30, nullable: false }),
    __metadata("design:type", String)
], PaymentEntity.prototype, "gateway", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'gateway_payment_id', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], PaymentEntity.prototype, "gatewayPaymentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'gateway_status', type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", Object)
], PaymentEntity.prototype, "gatewayStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'idempotency_key', type: 'varchar', length: 64, nullable: true }),
    __metadata("design:type", Object)
], PaymentEntity.prototype, "idempotencyKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'amount_minor', type: 'int', nullable: false }),
    __metadata("design:type", Number)
], PaymentEntity.prototype, "amountMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'currency', type: 'varchar', length: 3, nullable: false, default: 'GBP' }),
    __metadata("design:type", String)
], PaymentEntity.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'captured_amount_minor', type: 'int', nullable: false, default: 0 }),
    __metadata("design:type", Number)
], PaymentEntity.prototype, "capturedAmountMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'allocated_minor', type: 'int', nullable: false, default: 0 }),
    __metadata("design:type", Number)
], PaymentEntity.prototype, "allocatedMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'unallocated_minor', type: 'int', nullable: false, default: 0 }),
    __metadata("design:type", Number)
], PaymentEntity.prototype, "unallocatedMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], PaymentEntity.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'journal_entry_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], PaymentEntity.prototype, "journalEntryId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'authorized_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], PaymentEntity.prototype, "authorizedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'captured_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], PaymentEntity.prototype, "capturedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'failed_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], PaymentEntity.prototype, "failedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cancelled_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], PaymentEntity.prototype, "cancelledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'failure_reason', type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], PaymentEntity.prototype, "failureReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'gateway_metadata', type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], PaymentEntity.prototype, "gatewayMetadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ip_address', type: 'varchar', length: 45, nullable: true }),
    __metadata("design:type", Object)
], PaymentEntity.prototype, "ipAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'device_id', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], PaymentEntity.prototype, "deviceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], PaymentEntity.prototype, "createdById", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'updated_by_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], PaymentEntity.prototype, "updatedById", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], PaymentEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], PaymentEntity.prototype, "updatedAt", void 0);
exports.PaymentEntity = PaymentEntity = __decorate([
    (0, typeorm_1.Entity)('finance_payments'),
    (0, typeorm_1.Index)(['tenantId', 'status']),
    (0, typeorm_1.Index)(['tenantId', 'customerId']),
    (0, typeorm_1.Index)(['tenantId', 'idempotencyKey'], { unique: true, where: '"idempotency_key" IS NOT NULL' }),
    (0, typeorm_1.Index)(['tenantId', 'gatewayPaymentId'], { where: '"gateway_payment_id" IS NOT NULL' }),
    (0, typeorm_1.Index)(['tenantId', 'capturedAt'], { where: '"captured_at" IS NOT NULL' })
], PaymentEntity);
let PaymentAllocationEntity = class PaymentAllocationEntity {
};
exports.PaymentAllocationEntity = PaymentAllocationEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PaymentAllocationEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], PaymentAllocationEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payment_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], PaymentAllocationEntity.prototype, "paymentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'invoice_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], PaymentAllocationEntity.prototype, "invoiceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'allocated_minor', type: 'int', nullable: false }),
    __metadata("design:type", Number)
], PaymentAllocationEntity.prototype, "allocatedMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'currency', type: 'varchar', length: 3, nullable: false }),
    __metadata("design:type", String)
], PaymentAllocationEntity.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'allocated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], PaymentAllocationEntity.prototype, "allocatedAt", void 0);
exports.PaymentAllocationEntity = PaymentAllocationEntity = __decorate([
    (0, typeorm_1.Entity)('finance_payment_allocations'),
    (0, typeorm_1.Index)(['tenantId', 'paymentId']),
    (0, typeorm_1.Index)(['tenantId', 'invoiceId']),
    (0, typeorm_1.Index)(['tenantId', 'invoiceId', 'paymentId'], { unique: true })
], PaymentAllocationEntity);
//# sourceMappingURL=payment.entity.js.map