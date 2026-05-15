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
exports.SlotEntity = void 0;
const typeorm_1 = require("typeorm");
let SlotEntity = class SlotEntity {
};
exports.SlotEntity = SlotEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SlotEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], SlotEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'court_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], SlotEntity.prototype, "courtId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'branch_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], SlotEntity.prototype, "branchId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sport_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], SlotEntity.prototype, "sportId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'template_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], SlotEntity.prototype, "templateId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'booking_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], SlotEntity.prototype, "bookingId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'start_at', type: 'timestamptz', nullable: false }),
    __metadata("design:type", Date)
], SlotEntity.prototype, "startAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'end_at', type: 'timestamptz', nullable: false }),
    __metadata("design:type", Date)
], SlotEntity.prototype, "endAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'duration_mins', type: 'int', nullable: false }),
    __metadata("design:type", Number)
], SlotEntity.prototype, "durationMins", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['available', 'reserved', 'booked', 'cancelled', 'completed', 'unavailable'],
        default: 'available',
    }),
    __metadata("design:type", String)
], SlotEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reserved_until', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], SlotEntity.prototype, "reservedUntil", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'resolved_price_minor', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], SlotEntity.prototype, "resolvedPriceMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'price_override_minor', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], SlotEntity.prototype, "priceOverrideMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 3, default: 'GBP' }),
    __metadata("design:type", String)
], SlotEntity.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'applied_rule_ids', type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], SlotEntity.prototype, "appliedRuleIds", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], SlotEntity.prototype, "label", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 1000, nullable: true }),
    __metadata("design:type", Object)
], SlotEntity.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_bookings', type: 'int', default: 1 }),
    __metadata("design:type", Number)
], SlotEntity.prototype, "maxBookings", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'current_bookings', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], SlotEntity.prototype, "currentBookings", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_deleted', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], SlotEntity.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], SlotEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], SlotEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], SlotEntity.prototype, "deletedAt", void 0);
exports.SlotEntity = SlotEntity = __decorate([
    (0, typeorm_1.Entity)('slots'),
    (0, typeorm_1.Index)(['tenantId', 'courtId', 'startAt'], { unique: false }),
    (0, typeorm_1.Index)(['tenantId', 'courtId', 'status']),
    (0, typeorm_1.Index)(['tenantId', 'startAt', 'endAt']),
    (0, typeorm_1.Index)(['tenantId', 'branchId']),
    (0, typeorm_1.Index)(['tenantId', 'sportId']),
    (0, typeorm_1.Index)(['tenantId', 'isDeleted'])
], SlotEntity);
//# sourceMappingURL=slot.entity.js.map