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
    (0, typeorm_1.Column)({ name: 'branch_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], CourtEntity.prototype, "branchId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sport_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], CourtEntity.prototype, "sportId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: false }),
    __metadata("design:type", String)
], CourtEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], CourtEntity.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], CourtEntity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['indoor', 'outdoor'],
        default: 'indoor',
    }),
    __metadata("design:type", String)
], CourtEntity.prototype, "courtType", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'surface_type',
        type: 'enum',
        enum: ['grass', 'artificial_grass', 'hard_court', 'clay', 'carpet', 'wood', 'rubber', 'sand', 'water', 'ice', 'other'],
        default: 'hard_court',
    }),
    __metadata("design:type", String)
], CourtEntity.prototype, "surfaceType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], CourtEntity.prototype, "capacity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_bookings_concurrent', type: 'int', default: 1 }),
    __metadata("design:type", Number)
], CourtEntity.prototype, "maxBookingsConcurrent", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", Object)
], CourtEntity.prototype, "dimensions", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['available', 'unavailable', 'maintenance', 'retired'],
        default: 'available',
    }),
    __metadata("design:type", String)
], CourtEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'maintenance_note', type: 'varchar', length: 1000, nullable: true }),
    __metadata("design:type", Object)
], CourtEntity.prototype, "maintenanceNote", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'maintenance_started_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], CourtEntity.prototype, "maintenanceStartedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'maintenance_expected_end', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], CourtEntity.prototype, "maintenanceExpectedEnd", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'operating_hours',
        type: 'jsonb',
        nullable: true,
    }),
    __metadata("design:type", Object)
], CourtEntity.prototype, "operatingHours", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'court_number', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], CourtEntity.prototype, "courtNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sort_order', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], CourtEntity.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'image_url', type: 'varchar', length: 2048, nullable: true }),
    __metadata("design:type", Object)
], CourtEntity.prototype, "imageUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], CourtEntity.prototype, "amenities", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'hourly_rate_minor', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], CourtEntity.prototype, "hourlyRateMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'rate_card_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], CourtEntity.prototype, "rateCardId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_deleted', type: 'boolean', default: false }),
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
    (0, typeorm_1.Entity)('courts'),
    (0, typeorm_1.Index)(['tenantId', 'branchId', 'name'], { unique: true }),
    (0, typeorm_1.Index)(['tenantId', 'branchId']),
    (0, typeorm_1.Index)(['tenantId', 'status']),
    (0, typeorm_1.Index)(['tenantId', 'sportId']),
    (0, typeorm_1.Index)(['tenantId', 'isDeleted'])
], CourtEntity);
//# sourceMappingURL=court.entity.js.map