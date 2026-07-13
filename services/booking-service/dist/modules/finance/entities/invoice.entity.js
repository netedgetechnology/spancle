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
exports.InvoiceEntity = void 0;
const typeorm_1 = require("typeorm");
let InvoiceEntity = class InvoiceEntity {
};
exports.InvoiceEntity = InvoiceEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], InvoiceEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], InvoiceEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'invoice_number', type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], InvoiceEntity.prototype, "invoiceNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'status', type: 'varchar', length: 20, nullable: false, default: 'draft' }),
    __metadata("design:type", String)
], InvoiceEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'source_type', type: 'varchar', length: 20, nullable: false }),
    __metadata("design:type", String)
], InvoiceEntity.prototype, "sourceType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'source_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], InvoiceEntity.prototype, "sourceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], InvoiceEntity.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_name', type: 'varchar', length: 200, nullable: false }),
    __metadata("design:type", String)
], InvoiceEntity.prototype, "customerName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_email', type: 'varchar', length: 250, nullable: true }),
    __metadata("design:type", Object)
], InvoiceEntity.prototype, "customerEmail", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'currency', type: 'varchar', length: 3, nullable: false, default: 'GBP' }),
    __metadata("design:type", String)
], InvoiceEntity.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'subtotal_minor', type: 'int', nullable: false, default: 0 }),
    __metadata("design:type", Number)
], InvoiceEntity.prototype, "subtotalMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'discount_minor', type: 'int', nullable: false, default: 0 }),
    __metadata("design:type", Number)
], InvoiceEntity.prototype, "discountMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tax_minor', type: 'int', nullable: false, default: 0 }),
    __metadata("design:type", Number)
], InvoiceEntity.prototype, "taxMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_minor', type: 'int', nullable: false, default: 0 }),
    __metadata("design:type", Number)
], InvoiceEntity.prototype, "totalMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'amount_paid_minor', type: 'int', nullable: false, default: 0 }),
    __metadata("design:type", Number)
], InvoiceEntity.prototype, "amountPaidMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'amount_refunded_minor', type: 'int', nullable: false, default: 0 }),
    __metadata("design:type", Number)
], InvoiceEntity.prototype, "amountRefundedMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'outstanding_minor', type: 'int', nullable: false, default: 0 }),
    __metadata("design:type", Number)
], InvoiceEntity.prototype, "outstandingMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'issued_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], InvoiceEntity.prototype, "issuedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'due_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], InvoiceEntity.prototype, "dueAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'paid_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], InvoiceEntity.prototype, "paidAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'voided_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], InvoiceEntity.prototype, "voidedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'void_reason', type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], InvoiceEntity.prototype, "voidReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'period_start', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], InvoiceEntity.prototype, "periodStart", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'period_end', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], InvoiceEntity.prototype, "periodEnd", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'journal_entry_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], InvoiceEntity.prototype, "journalEntryId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'coupon_code', type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", Object)
], InvoiceEntity.prototype, "couponCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_deleted', type: 'boolean', nullable: false, default: false }),
    __metadata("design:type", Boolean)
], InvoiceEntity.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], InvoiceEntity.prototype, "createdById", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'updated_by_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], InvoiceEntity.prototype, "updatedById", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], InvoiceEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], InvoiceEntity.prototype, "updatedAt", void 0);
exports.InvoiceEntity = InvoiceEntity = __decorate([
    (0, typeorm_1.Entity)('finance_invoices'),
    (0, typeorm_1.Index)(['tenantId', 'invoiceNumber'], { unique: true }),
    (0, typeorm_1.Index)(['tenantId', 'status']),
    (0, typeorm_1.Index)(['tenantId', 'customerId']),
    (0, typeorm_1.Index)(['tenantId', 'issuedAt']),
    (0, typeorm_1.Index)(['tenantId', 'dueAt'], { where: '"due_at" IS NOT NULL' }),
    (0, typeorm_1.Index)(['tenantId', 'isDeleted'])
], InvoiceEntity);
//# sourceMappingURL=invoice.entity.js.map