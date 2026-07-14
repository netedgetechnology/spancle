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
exports.FinanceBookingRefundJobEntity = void 0;
const typeorm_1 = require("typeorm");
let FinanceBookingRefundJobEntity = class FinanceBookingRefundJobEntity {
};
exports.FinanceBookingRefundJobEntity = FinanceBookingRefundJobEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], FinanceBookingRefundJobEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], FinanceBookingRefundJobEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'booking_refund_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], FinanceBookingRefundJobEntity.prototype, "bookingRefundId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'booking_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], FinanceBookingRefundJobEntity.prototype, "bookingId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'amount_minor', type: 'int', nullable: false }),
    __metadata("design:type", Number)
], FinanceBookingRefundJobEntity.prototype, "amountMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'currency', type: 'varchar', length: 3, nullable: false }),
    __metadata("design:type", String)
], FinanceBookingRefundJobEntity.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'actor_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], FinanceBookingRefundJobEntity.prototype, "actorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'status', type: 'varchar', length: 20, nullable: false, default: 'pending' }),
    __metadata("design:type", String)
], FinanceBookingRefundJobEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'attempt_count', type: 'int', nullable: false, default: 0 }),
    __metadata("design:type", Number)
], FinanceBookingRefundJobEntity.prototype, "attemptCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_error', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], FinanceBookingRefundJobEntity.prototype, "lastError", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'next_attempt_at', type: 'timestamptz', nullable: false, default: () => 'NOW()' }),
    __metadata("design:type", Date)
], FinanceBookingRefundJobEntity.prototype, "nextAttemptAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'started_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], FinanceBookingRefundJobEntity.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'completed_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], FinanceBookingRefundJobEntity.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], FinanceBookingRefundJobEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], FinanceBookingRefundJobEntity.prototype, "updatedAt", void 0);
exports.FinanceBookingRefundJobEntity = FinanceBookingRefundJobEntity = __decorate([
    (0, typeorm_1.Entity)('finance_booking_refund_jobs'),
    (0, typeorm_1.Index)(['tenantId', 'bookingRefundId'], { unique: true }),
    (0, typeorm_1.Index)(['tenantId', 'status', 'nextAttemptAt'])
], FinanceBookingRefundJobEntity);
//# sourceMappingURL=finance-booking-refund-job.entity.js.map