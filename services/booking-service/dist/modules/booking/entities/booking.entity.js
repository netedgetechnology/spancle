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
exports.BookingEntity = void 0;
const typeorm_1 = require("typeorm");
let BookingEntity = class BookingEntity {
};
exports.BookingEntity = BookingEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], BookingEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], BookingEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 30, nullable: false }),
    __metadata("design:type", String)
], BookingEntity.prototype, "reference", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'branch_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], BookingEntity.prototype, "branchId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'court_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], BookingEntity.prototype, "courtId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sport_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], BookingEntity.prototype, "sportId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'slot_ids', type: 'jsonb', nullable: false, default: '[]' }),
    __metadata("design:type", Array)
], BookingEntity.prototype, "slotIds", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], BookingEntity.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_name', type: 'varchar', length: 255, nullable: false }),
    __metadata("design:type", String)
], BookingEntity.prototype, "customerName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_email', type: 'varchar', length: 254, nullable: false }),
    __metadata("design:type", String)
], BookingEntity.prototype, "customerEmail", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_phone', type: 'varchar', length: 30, nullable: true }),
    __metadata("design:type", Object)
], BookingEntity.prototype, "customerPhone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_member', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], BookingEntity.prototype, "isMember", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['pending_payment', 'confirmed', 'completed', 'cancelled', 'no_show', 'refunded'],
        default: 'pending_payment',
    }),
    __metadata("design:type", String)
], BookingEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['online', 'admin', 'walk_in', 'api'],
        default: 'online',
    }),
    __metadata("design:type", String)
], BookingEntity.prototype, "channel", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'starts_at', type: 'timestamptz', nullable: false }),
    __metadata("design:type", Date)
], BookingEntity.prototype, "startsAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ends_at', type: 'timestamptz', nullable: false }),
    __metadata("design:type", Date)
], BookingEntity.prototype, "endsAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_duration_mins', type: 'int', nullable: false }),
    __metadata("design:type", Number)
], BookingEntity.prototype, "totalDurationMins", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'final_price_minor', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], BookingEntity.prototype, "finalPriceMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'amount_paid_minor', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], BookingEntity.prototype, "amountPaidMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'amount_refunded_minor', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], BookingEntity.prototype, "amountRefundedMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 3, default: 'GBP' }),
    __metadata("design:type", String)
], BookingEntity.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'participant_count', type: 'int', default: 1 }),
    __metadata("design:type", Number)
], BookingEntity.prototype, "participantCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_notes', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], BookingEntity.prototype, "customerNotes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'internal_notes', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], BookingEntity.prototype, "internalNotes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], BookingEntity.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cancelled_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], BookingEntity.prototype, "cancelledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cancelled_by_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], BookingEntity.prototype, "cancelledById", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cancellation_reason', type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], BookingEntity.prototype, "cancellationReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'completed_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], BookingEntity.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'checked_in_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], BookingEntity.prototype, "checkedInAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], BookingEntity.prototype, "createdById", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'updated_by_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], BookingEntity.prototype, "updatedById", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_deleted', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], BookingEntity.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], BookingEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], BookingEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], BookingEntity.prototype, "deletedAt", void 0);
exports.BookingEntity = BookingEntity = __decorate([
    (0, typeorm_1.Entity)('bookings'),
    (0, typeorm_1.Index)(['tenantId', 'status']),
    (0, typeorm_1.Index)(['tenantId', 'branchId']),
    (0, typeorm_1.Index)(['tenantId', 'courtId']),
    (0, typeorm_1.Index)(['tenantId', 'userId']),
    (0, typeorm_1.Index)(['tenantId', 'createdAt']),
    (0, typeorm_1.Index)(['tenantId', 'reference'], { unique: true }),
    (0, typeorm_1.Index)(['tenantId', 'isDeleted'])
], BookingEntity);
//# sourceMappingURL=booking.entity.js.map