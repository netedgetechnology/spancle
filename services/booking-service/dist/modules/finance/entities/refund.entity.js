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
exports.RefundLineAllocationEntity = exports.RefundEntity = void 0;
const typeorm_1 = require("typeorm");
let RefundEntity = class RefundEntity {
};
exports.RefundEntity = RefundEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], RefundEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], RefundEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'refund_number', type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], RefundEntity.prototype, "refundNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payment_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], RefundEntity.prototype, "paymentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'invoice_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], RefundEntity.prototype, "invoiceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'status', type: 'varchar', length: 20, nullable: false, default: 'pending' }),
    __metadata("design:type", String)
], RefundEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'amount_minor', type: 'int', nullable: false }),
    __metadata("design:type", Number)
], RefundEntity.prototype, "amountMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'currency', type: 'varchar', length: 3, nullable: false }),
    __metadata("design:type", String)
], RefundEntity.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'method', type: 'varchar', length: 20, nullable: false }),
    __metadata("design:type", String)
], RefundEntity.prototype, "method", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'idempotency_key', type: 'varchar', length: 64, nullable: false }),
    __metadata("design:type", String)
], RefundEntity.prototype, "idempotencyKey", void 0);
__decorate([
    (0, typeorm_1.Index)({ unique: true, where: '"caller_idempotency_key" IS NOT NULL' }),
    (0, typeorm_1.Column)({ name: 'caller_idempotency_key', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], RefundEntity.prototype, "callerIdempotencyKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'gateway_refund_id', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], RefundEntity.prototype, "gatewayRefundId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'step1_journal_entry_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], RefundEntity.prototype, "step1JournalEntryId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'step2_journal_entry_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], RefundEntity.prototype, "step2JournalEntryId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'pending_at', type: 'timestamptz', nullable: false, default: () => 'NOW()' }),
    __metadata("design:type", Date)
], RefundEntity.prototype, "pendingAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'processing_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], RefundEntity.prototype, "processingAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'completed_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], RefundEntity.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'rejected_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], RefundEntity.prototype, "rejectedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'rejection_reason', type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], RefundEntity.prototype, "rejectionReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'gateway_metadata', type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], RefundEntity.prototype, "gatewayMetadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'source_type', type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], RefundEntity.prototype, "sourceType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'source_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], RefundEntity.prototype, "sourceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], RefundEntity.prototype, "createdById", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'updated_by_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], RefundEntity.prototype, "updatedById", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], RefundEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], RefundEntity.prototype, "updatedAt", void 0);
exports.RefundEntity = RefundEntity = __decorate([
    (0, typeorm_1.Entity)('finance_refunds'),
    (0, typeorm_1.Index)(['tenantId', 'idempotencyKey'], { unique: true }),
    (0, typeorm_1.Index)(['tenantId', 'paymentId']),
    (0, typeorm_1.Index)(['tenantId', 'invoiceId']),
    (0, typeorm_1.Index)(['tenantId', 'status']),
    (0, typeorm_1.Index)(['tenantId', 'gatewayRefundId'], { unique: true, where: '"gateway_refund_id" IS NOT NULL' })
], RefundEntity);
let RefundLineAllocationEntity = class RefundLineAllocationEntity {
};
exports.RefundLineAllocationEntity = RefundLineAllocationEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], RefundLineAllocationEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], RefundLineAllocationEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'refund_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], RefundLineAllocationEntity.prototype, "refundId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'invoice_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], RefundLineAllocationEntity.prototype, "invoiceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'component_type', type: 'varchar', length: 10, nullable: false }),
    __metadata("design:type", String)
], RefundLineAllocationEntity.prototype, "componentType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'invoice_tax_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], RefundLineAllocationEntity.prototype, "invoiceTaxId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'amount_minor', type: 'int', nullable: false }),
    __metadata("design:type", Number)
], RefundLineAllocationEntity.prototype, "amountMinor", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], RefundLineAllocationEntity.prototype, "createdAt", void 0);
exports.RefundLineAllocationEntity = RefundLineAllocationEntity = __decorate([
    (0, typeorm_1.Entity)('finance_refund_line_allocations'),
    (0, typeorm_1.Index)(['tenantId', 'invoiceId']),
    (0, typeorm_1.Index)(['tenantId', 'refundId'])
], RefundLineAllocationEntity);
//# sourceMappingURL=refund.entity.js.map