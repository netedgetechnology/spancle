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
exports.BookingRefundPaymentAllocationEntity = void 0;
const typeorm_1 = require("typeorm");
let BookingRefundPaymentAllocationEntity = class BookingRefundPaymentAllocationEntity {
};
exports.BookingRefundPaymentAllocationEntity = BookingRefundPaymentAllocationEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], BookingRefundPaymentAllocationEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], BookingRefundPaymentAllocationEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'booking_refund_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], BookingRefundPaymentAllocationEntity.prototype, "bookingRefundId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'booking_payment_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], BookingRefundPaymentAllocationEntity.prototype, "bookingPaymentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'amount_minor', type: 'int', nullable: false }),
    __metadata("design:type", Number)
], BookingRefundPaymentAllocationEntity.prototype, "amountMinor", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], BookingRefundPaymentAllocationEntity.prototype, "createdAt", void 0);
exports.BookingRefundPaymentAllocationEntity = BookingRefundPaymentAllocationEntity = __decorate([
    (0, typeorm_1.Entity)('booking_refund_payment_allocations'),
    (0, typeorm_1.Index)(['tenantId', 'bookingRefundId']),
    (0, typeorm_1.Index)(['tenantId', 'bookingPaymentId']),
    (0, typeorm_1.Index)(['tenantId', 'bookingRefundId', 'bookingPaymentId'], { unique: true })
], BookingRefundPaymentAllocationEntity);
//# sourceMappingURL=booking-refund-payment-allocation.entity.js.map