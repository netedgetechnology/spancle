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
exports.BookingRulesEntity = exports.BOOKING_RULE_SCOPES = void 0;
const typeorm_1 = require("typeorm");
exports.BOOKING_RULE_SCOPES = ['tenant', 'branch', 'sport', 'court'];
let BookingRulesEntity = class BookingRulesEntity {
};
exports.BookingRulesEntity = BookingRulesEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], BookingRulesEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], BookingRulesEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, nullable: false, default: 'tenant' }),
    __metadata("design:type", String)
], BookingRulesEntity.prototype, "scope", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'branch_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], BookingRulesEntity.prototype, "branchId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sport_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], BookingRulesEntity.prototype, "sportId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'court_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], BookingRulesEntity.prototype, "courtId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 150, nullable: false }),
    __metadata("design:type", String)
], BookingRulesEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], BookingRulesEntity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], BookingRulesEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_advance_booking_mins', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], BookingRulesEntity.prototype, "maxAdvanceBookingMins", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'min_notice_mins', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], BookingRulesEntity.prototype, "minNoticeMins", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'min_duration_mins', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], BookingRulesEntity.prototype, "minDurationMins", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_duration_mins', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], BookingRulesEntity.prototype, "maxDurationMins", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_bookings_per_day', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], BookingRulesEntity.prototype, "maxBookingsPerDay", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_bookings_per_week', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], BookingRulesEntity.prototype, "maxBookingsPerWeek", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_bookings_per_month', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], BookingRulesEntity.prototype, "maxBookingsPerMonth", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'members_only', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], BookingRulesEntity.prototype, "membersOnly", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'min_age_years', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], BookingRulesEntity.prototype, "minAgeYears", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_age_years', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], BookingRulesEntity.prototype, "maxAgeYears", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'buffer_time_mins', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], BookingRulesEntity.prototype, "bufferTimeMins", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cancellation_cutoff_mins', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], BookingRulesEntity.prototype, "cancellationCutoffMins", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reschedule_cutoff_mins', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], BookingRulesEntity.prototype, "rescheduleCutoffMins", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'grace_period_mins', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], BookingRulesEntity.prototype, "gracePeriodMins", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'blackout_dates', type: 'jsonb', nullable: true, default: '[]' }),
    __metadata("design:type", Object)
], BookingRulesEntity.prototype, "blackoutDates", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_deleted', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], BookingRulesEntity.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], BookingRulesEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], BookingRulesEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], BookingRulesEntity.prototype, "deletedAt", void 0);
exports.BookingRulesEntity = BookingRulesEntity = __decorate([
    (0, typeorm_1.Entity)('booking_rules'),
    (0, typeorm_1.Index)(['tenantId']),
    (0, typeorm_1.Index)(['tenantId', 'scope']),
    (0, typeorm_1.Index)(['tenantId', 'scope', 'branchId', 'sportId', 'courtId'], { unique: true })
], BookingRulesEntity);
//# sourceMappingURL=booking-rules.entity.js.map