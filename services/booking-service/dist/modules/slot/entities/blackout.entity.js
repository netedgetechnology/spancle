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
exports.BlackoutEntity = void 0;
const typeorm_1 = require("typeorm");
/**
 * BlackoutEntity — a time window that prevents slot generation or booking.
 *
 * Two purposes:
 *   1. Block future slot generation (checked by SlotGeneratorService)
 *   2. Block booking on already-generated slots (checked by BookingService)
 *
 * Examples:
 *   - Christmas closure: scope=tenant, full day, Dec 25
 *   - Court maintenance: scope=court, specific datetime range
 *   - Branch refurbishment: scope=branch, full week
 *   - Tournament reservation: scope=sport, specific courts/dates
 *
 * Cancels existing 'available' slots:
 *   When isActive is set to true, SlotService optionally cancels
 *   all 'available' slots in the window (not 'booked' — those require
 *   manual intervention). Controlled by cancelExistingSlots flag.
 *
 * Table: blackouts
 */
let BlackoutEntity = class BlackoutEntity {
};
exports.BlackoutEntity = BlackoutEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], BlackoutEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], BlackoutEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 150, nullable: false }),
    __metadata("design:type", String)
], BlackoutEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], BlackoutEntity.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['tenant', 'branch', 'court', 'sport'],
        default: 'tenant',
    }),
    __metadata("design:type", String)
], BlackoutEntity.prototype, "scope", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'branch_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], BlackoutEntity.prototype, "branchId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'court_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], BlackoutEntity.prototype, "courtId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sport_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], BlackoutEntity.prototype, "sportId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'start_at', type: 'timestamptz', nullable: false }),
    __metadata("design:type", Date)
], BlackoutEntity.prototype, "startAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'end_at', type: 'timestamptz', nullable: false }),
    __metadata("design:type", Date)
], BlackoutEntity.prototype, "endAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'all_day', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], BlackoutEntity.prototype, "allDay", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cancel_existing_slots', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], BlackoutEntity.prototype, "cancelExistingSlots", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'block_new_bookings', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], BlackoutEntity.prototype, "blockNewBookings", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], BlackoutEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_deleted', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], BlackoutEntity.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], BlackoutEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], BlackoutEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], BlackoutEntity.prototype, "deletedAt", void 0);
exports.BlackoutEntity = BlackoutEntity = __decorate([
    (0, typeorm_1.Entity)('blackouts'),
    (0, typeorm_1.Index)(['tenantId', 'scope']),
    (0, typeorm_1.Index)(['tenantId', 'startAt', 'endAt']),
    (0, typeorm_1.Index)(['tenantId', 'branchId']),
    (0, typeorm_1.Index)(['tenantId', 'courtId']),
    (0, typeorm_1.Index)(['tenantId', 'isActive']),
    (0, typeorm_1.Index)(['tenantId', 'isDeleted'])
], BlackoutEntity);
//# sourceMappingURL=blackout.entity.js.map