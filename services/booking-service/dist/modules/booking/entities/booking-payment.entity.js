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
exports.BookingPaymentEntity = void 0;
const typeorm_1 = require("typeorm");
let BookingPaymentEntity = class BookingPaymentEntity {
};
exports.BookingPaymentEntity = BookingPaymentEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], BookingPaymentEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], BookingPaymentEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'branch_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], BookingPaymentEntity.prototype, "branchId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'booking_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], BookingPaymentEntity.prototype, "bookingId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
        default: 'pending',
    }),
    __metadata("design:type", String)
], BookingPaymentEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'payment_method',
        type: 'enum',
        enum: ['card', 'cash', 'bank_transfer', 'voucher', 'free'],
        default: 'card',
    }),
    __metadata("design:type", String)
], BookingPaymentEntity.prototype, "paymentMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'amount_minor', type: 'int', nullable: false }),
    __metadata("design:type", Number)
], BookingPaymentEntity.prototype, "amountMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'amount_refunded_minor', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], BookingPaymentEntity.prototype, "amountRefundedMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 3, default: 'GBP' }),
    __metadata("design:type", String)
], BookingPaymentEntity.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'provider', type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", Object)
], BookingPaymentEntity.prototype, "provider", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'provider_payment_id', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], BookingPaymentEntity.prototype, "providerPaymentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'provider_receipt_url', type: 'varchar', length: 2048, nullable: true }),
    __metadata("design:type", Object)
], BookingPaymentEntity.prototype, "providerReceiptUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'idempotency_key', type: 'varchar', length: 255, nullable: false }),
    __metadata("design:type", String)
], BookingPaymentEntity.prototype, "idempotencyKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'paid_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], BookingPaymentEntity.prototype, "paidAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'failed_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], BookingPaymentEntity.prototype, "failedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'failure_reason', type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], BookingPaymentEntity.prototype, "failureReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], BookingPaymentEntity.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], BookingPaymentEntity.prototype, "createdById", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_deleted', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], BookingPaymentEntity.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], BookingPaymentEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], BookingPaymentEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], BookingPaymentEntity.prototype, "deletedAt", void 0);
exports.BookingPaymentEntity = BookingPaymentEntity = __decorate([
    (0, typeorm_1.Entity)('booking_payments'),
    (0, typeorm_1.Index)(['tenantId', 'bookingId']),
    (0, typeorm_1.Index)(['tenantId', 'status']),
    (0, typeorm_1.Index)(['tenantId', 'providerPaymentId']),
    (0, typeorm_1.Index)(['tenantId', 'idempotencyKey'], { unique: true }),
    (0, typeorm_1.Index)(['tenantId', 'isDeleted'])
], BookingPaymentEntity);
//# sourceMappingURL=booking-payment.entity.js.map