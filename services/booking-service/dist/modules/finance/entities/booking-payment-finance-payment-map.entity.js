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
exports.BookingPaymentFinancePaymentMapEntity = void 0;
const typeorm_1 = require("typeorm");
let BookingPaymentFinancePaymentMapEntity = class BookingPaymentFinancePaymentMapEntity {
};
exports.BookingPaymentFinancePaymentMapEntity = BookingPaymentFinancePaymentMapEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], BookingPaymentFinancePaymentMapEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], BookingPaymentFinancePaymentMapEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'booking_payment_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], BookingPaymentFinancePaymentMapEntity.prototype, "bookingPaymentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'finance_payment_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], BookingPaymentFinancePaymentMapEntity.prototype, "financePaymentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'correlation_source', type: 'varchar', length: 30, nullable: false }),
    __metadata("design:type", String)
], BookingPaymentFinancePaymentMapEntity.prototype, "correlationSource", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'external_reference', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], BookingPaymentFinancePaymentMapEntity.prototype, "externalReference", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'metadata', type: 'jsonb', nullable: false, default: {} }),
    __metadata("design:type", Object)
], BookingPaymentFinancePaymentMapEntity.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], BookingPaymentFinancePaymentMapEntity.prototype, "createdById", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], BookingPaymentFinancePaymentMapEntity.prototype, "createdAt", void 0);
exports.BookingPaymentFinancePaymentMapEntity = BookingPaymentFinancePaymentMapEntity = __decorate([
    (0, typeorm_1.Entity)('booking_payment_finance_payment_map'),
    (0, typeorm_1.Index)(['tenantId', 'bookingPaymentId', 'financePaymentId'], { unique: true }),
    (0, typeorm_1.Index)(['tenantId', 'bookingPaymentId']),
    (0, typeorm_1.Index)(['tenantId', 'financePaymentId'])
], BookingPaymentFinancePaymentMapEntity);
//# sourceMappingURL=booking-payment-finance-payment-map.entity.js.map