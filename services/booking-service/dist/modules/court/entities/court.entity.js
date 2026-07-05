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
exports.CourtEntity = void 0;
const typeorm_1 = require("typeorm");
let CourtEntity = class CourtEntity {
};
exports.CourtEntity = CourtEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CourtEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], CourtEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'venue_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], CourtEntity.prototype, "venueId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'branch_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], CourtEntity.prototype, "branchId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: false }),
    __metadata("design:type", String)
], CourtEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'court_number', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], CourtEntity.prototype, "courtNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sport_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], CourtEntity.prototype, "sportId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'hourly_price', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], CourtEntity.prototype, "hourlyPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 3, nullable: false, default: 'GBP' }),
    __metadata("design:type", String)
], CourtEntity.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 30,
        nullable: true,
    }),
    __metadata("design:type", Object)
], CourtEntity.prototype, "surface", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'indoor_outdoor',
        type: 'varchar',
        length: 10,
        nullable: false,
        default: 'indoor',
    }),
    __metadata("design:type", String)
], CourtEntity.prototype, "indoorOutdoor", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 6, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], CourtEntity.prototype, "width", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 6, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], CourtEntity.prototype, "length", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], CourtEntity.prototype, "capacity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'slot_duration', type: 'int', nullable: false, default: 60 }),
    __metadata("design:type", Number)
], CourtEntity.prototype, "slotDuration", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'buffer_before', type: 'int', nullable: false, default: 0 }),
    __metadata("design:type", Number)
], CourtEntity.prototype, "bufferBefore", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'buffer_after', type: 'int', nullable: false, default: 0 }),
    __metadata("design:type", Number)
], CourtEntity.prototype, "bufferAfter", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'display_order', type: 'int', nullable: false, default: 0 }),
    __metadata("design:type", Number)
], CourtEntity.prototype, "displayOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_bookable', type: 'boolean', nullable: false, default: true }),
    __metadata("design:type", Boolean)
], CourtEntity.prototype, "isBookable", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', type: 'boolean', nullable: false, default: true }),
    __metadata("design:type", Boolean)
], CourtEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_deleted', type: 'boolean', nullable: false, default: false }),
    __metadata("design:type", Boolean)
], CourtEntity.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], CourtEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], CourtEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], CourtEntity.prototype, "deletedAt", void 0);
exports.CourtEntity = CourtEntity = __decorate([
    (0, typeorm_1.Entity)('courts_booking'),
    (0, typeorm_1.Index)(['tenantId', 'venueId']),
    (0, typeorm_1.Index)(['tenantId', 'venueId', 'courtNumber'], { unique: true, where: '"is_deleted" = false AND "court_number" IS NOT NULL' }),
    (0, typeorm_1.Index)(['tenantId', 'venueId', 'name'], { unique: true, where: '"is_deleted" = false' }),
    (0, typeorm_1.Index)(['tenantId', 'isDeleted']),
    (0, typeorm_1.Index)(['tenantId', 'isBookable'])
], CourtEntity);
//# sourceMappingURL=court.entity.js.map