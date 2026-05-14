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
exports.HolidayEntity = void 0;
const typeorm_1 = require("typeorm");
/**
 * HolidayEntity — a public holiday or custom closure date.
 *
 * Purpose:
 *   1. Trigger holiday pricing rules in PricingService
 *   2. Optionally skip slot generation on these dates (controlled per template)
 *   3. Surface in the admin calendar as highlighted dates
 *
 * Recurrence:
 *   - isRecurring = true: the holiday repeats every year on the same date
 *     (e.g. Christmas Day — Dec 25). The year in `date` is ignored.
 *   - isRecurring = false: one-off holiday on a specific date with year.
 *
 * System holidays:
 *   Seeded by HolidayService.seedSystemHolidays() for common locales.
 *   Tenants can override a system holiday by creating a tenant-scoped
 *   record with the same date and isActive=false (disables the system one).
 *
 * Table: holidays
 */
let HolidayEntity = class HolidayEntity {
};
exports.HolidayEntity = HolidayEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], HolidayEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], HolidayEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 150, nullable: false }),
    __metadata("design:type", String)
], HolidayEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', nullable: false }),
    __metadata("design:type", String)
], HolidayEntity.prototype, "date", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_recurring', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], HolidayEntity.prototype, "isRecurring", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['system', 'tenant'],
        default: 'tenant',
    }),
    __metadata("design:type", String)
], HolidayEntity.prototype, "source", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'country_code', type: 'varchar', length: 2, nullable: true }),
    __metadata("design:type", Object)
], HolidayEntity.prototype, "countryCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], HolidayEntity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], HolidayEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_deleted', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], HolidayEntity.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], HolidayEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], HolidayEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], HolidayEntity.prototype, "deletedAt", void 0);
exports.HolidayEntity = HolidayEntity = __decorate([
    (0, typeorm_1.Entity)('holidays'),
    (0, typeorm_1.Index)(['tenantId', 'date']),
    (0, typeorm_1.Index)(['tenantId', 'source']),
    (0, typeorm_1.Index)(['tenantId', 'isActive']),
    (0, typeorm_1.Index)(['tenantId', 'isDeleted'])
], HolidayEntity);
//# sourceMappingURL=holiday.entity.js.map