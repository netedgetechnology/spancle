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
exports.SlotTemplateEntity = void 0;
const typeorm_1 = require("typeorm");
/**
 * SlotTemplateEntity — a reusable schedule pattern for a court.
 *
 * A template defines WHEN to generate slots, not the slots themselves.
 * SlotGeneratorService.generateFromTemplate() reads the template and
 * creates SlotEntity rows for the requested date range.
 *
 * One template per court is typical, but a court can have multiple
 * templates for different season schedules (summer/winter hours).
 * Only one template should be active (isActive = true) per court at a time;
 * this is enforced at service layer, not DB level, for flexibility.
 *
 * Template fields:
 *   - courtId:          the court this schedule applies to
 *   - validFrom/Until:  date range the template is in effect
 *   - recurrence:       which days of the week to generate slots
 *   - openTime/closeTime: daily window within which slots are created
 *   - durationMins:     duration of each slot (e.g. 60 = 1-hour slots)
 *   - bufferMins:       gap between slots (e.g. 15 for cleaning time)
 *   - maxAdvanceDays:   how far ahead to pre-generate (default: 30)
 *   - autoPublish:      if true, generated slots start as 'available' immediately
 *
 * Table: slot_templates
 */
let SlotTemplateEntity = class SlotTemplateEntity {
};
exports.SlotTemplateEntity = SlotTemplateEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SlotTemplateEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], SlotTemplateEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'court_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], SlotTemplateEntity.prototype, "courtId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'branch_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], SlotTemplateEntity.prototype, "branchId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 150, nullable: false }),
    __metadata("design:type", String)
], SlotTemplateEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], SlotTemplateEntity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'valid_from', type: 'date', nullable: false }),
    __metadata("design:type", String)
], SlotTemplateEntity.prototype, "validFrom", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'valid_until', type: 'date', nullable: true }),
    __metadata("design:type", Object)
], SlotTemplateEntity.prototype, "validUntil", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: false }),
    __metadata("design:type", Object)
], SlotTemplateEntity.prototype, "recurrence", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'open_time', type: 'varchar', length: 5, nullable: true }),
    __metadata("design:type", Object)
], SlotTemplateEntity.prototype, "openTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'close_time', type: 'varchar', length: 5, nullable: true }),
    __metadata("design:type", Object)
], SlotTemplateEntity.prototype, "closeTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'duration_mins', type: 'int', nullable: false }),
    __metadata("design:type", Number)
], SlotTemplateEntity.prototype, "durationMins", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'buffer_mins', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], SlotTemplateEntity.prototype, "bufferMins", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_advance_days', type: 'int', default: 30 }),
    __metadata("design:type", Number)
], SlotTemplateEntity.prototype, "maxAdvanceDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_bookings', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], SlotTemplateEntity.prototype, "maxBookings", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'auto_publish', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], SlotTemplateEntity.prototype, "autoPublish", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], SlotTemplateEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_deleted', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], SlotTemplateEntity.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], SlotTemplateEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], SlotTemplateEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], SlotTemplateEntity.prototype, "deletedAt", void 0);
exports.SlotTemplateEntity = SlotTemplateEntity = __decorate([
    (0, typeorm_1.Entity)('slot_templates'),
    (0, typeorm_1.Index)(['tenantId', 'courtId']),
    (0, typeorm_1.Index)(['tenantId', 'isActive']),
    (0, typeorm_1.Index)(['tenantId', 'isDeleted'])
], SlotTemplateEntity);
//# sourceMappingURL=slot-template.entity.js.map