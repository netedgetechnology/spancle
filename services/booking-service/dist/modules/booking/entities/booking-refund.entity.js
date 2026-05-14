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
exports.BookingRefundEntity = void 0;
const typeorm_1 = require("typeorm");
let BookingRefundEntity = class BookingRefundEntity {
};
exports.BookingRefundEntity = BookingRefundEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], BookingRefundEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], BookingRefundEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'branch_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], BookingRefundEntity.prototype, "branchId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'booking_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], BookingRefundEntity.prototype, "bookingId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payment_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], BookingRefundEntity.prototype, "paymentId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['pending', 'processed', 'failed', 'rejected'],
        default: 'pending',
    }),
    __metadata("design:type", String)
], BookingRefundEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'reason',
        type: 'enum',
        enum: ['customer_cancellation', 'admin_cancellation', 'no_show_waiver', 'reschedule', 'system_error', 'other'],
        default: 'other',
    }),
    __metadata("design:type", String)
], BookingRefundEntity.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'amount_minor', type: 'int', nullable: false }),
    __metadata("design:type", Number)
], BookingRefundEntity.prototype, "amountMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 3, default: 'GBP' }),
    __metadata("design:type", String)
], BookingRefundEntity.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reason_notes', type: 'varchar', length: 1000, nullable: true }),
    __metadata("design:type", Object)
], BookingRefundEntity.prototype, "reasonNotes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'provider_refund_id', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], BookingRefundEntity.prototype, "providerRefundId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'processed_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], BookingRefundEntity.prototype, "processedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'failed_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], BookingRefundEntity.prototype, "failedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'failure_reason', type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], BookingRefundEntity.prototype, "failureReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], BookingRefundEntity.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], BookingRefundEntity.prototype, "createdById", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_deleted', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], BookingRefundEntity.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], BookingRefundEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], BookingRefundEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], BookingRefundEntity.prototype, "deletedAt", void 0);
exports.BookingRefundEntity = BookingRefundEntity = __decorate([
    (0, typeorm_1.Entity)('booking_refunds'),
    (0, typeorm_1.Index)(['tenantId', 'bookingId']),
    (0, typeorm_1.Index)(['tenantId', 'paymentId']),
    (0, typeorm_1.Index)(['tenantId', 'status']),
    (0, typeorm_1.Index)(['tenantId', 'isDeleted'])
], BookingRefundEntity);
//# sourceMappingURL=booking-refund.entity.js.map