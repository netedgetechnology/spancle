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
exports.BookingLogEntity = void 0;
const typeorm_1 = require("typeorm");
/**
 * BookingLogEntity — immutable audit log.
 * INSERT only. No UPDATE, no soft-delete, no deletedAt.
 */
let BookingLogEntity = class BookingLogEntity {
};
exports.BookingLogEntity = BookingLogEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], BookingLogEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], BookingLogEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'booking_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], BookingLogEntity.prototype, "bookingId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: [
            'created', 'confirmed', 'cancelled', 'completed',
            'no_show_marked', 'no_show_waived', 'rescheduled', 'refunded',
            'payment_recorded', 'checked_in', 'notes_updated',
            'recurring_generated', 'status_changed',
        ],
    }),
    __metadata("design:type", String)
], BookingLogEntity.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'actor_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], BookingLogEntity.prototype, "actorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'actor_type', type: 'varchar', length: 30, nullable: true }),
    __metadata("design:type", Object)
], BookingLogEntity.prototype, "actorType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'previous_status', type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", Object)
], BookingLogEntity.prototype, "previousStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'new_status', type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", Object)
], BookingLogEntity.prototype, "newStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], BookingLogEntity.prototype, "diff", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], BookingLogEntity.prototype, "note", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ip_address', type: 'varchar', length: 45, nullable: true }),
    __metadata("design:type", Object)
], BookingLogEntity.prototype, "ipAddress", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], BookingLogEntity.prototype, "createdAt", void 0);
exports.BookingLogEntity = BookingLogEntity = __decorate([
    (0, typeorm_1.Entity)('booking_logs'),
    (0, typeorm_1.Index)(['tenantId', 'bookingId']),
    (0, typeorm_1.Index)(['tenantId', 'action']),
    (0, typeorm_1.Index)(['tenantId', 'actorId']),
    (0, typeorm_1.Index)(['tenantId', 'createdAt'])
], BookingLogEntity);
//# sourceMappingURL=booking-log.entity.js.map