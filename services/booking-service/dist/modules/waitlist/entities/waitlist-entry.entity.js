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
exports.WaitlistEntryEntity = void 0;
const typeorm_1 = require("typeorm");
let WaitlistEntryEntity = class WaitlistEntryEntity {
};
exports.WaitlistEntryEntity = WaitlistEntryEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], WaitlistEntryEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], WaitlistEntryEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'slot_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], WaitlistEntryEntity.prototype, "slotId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'court_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], WaitlistEntryEntity.prototype, "courtId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'branch_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], WaitlistEntryEntity.prototype, "branchId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], WaitlistEntryEntity.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], WaitlistEntryEntity.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_name', type: 'varchar', length: 255, nullable: false }),
    __metadata("design:type", String)
], WaitlistEntryEntity.prototype, "customerName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_email', type: 'varchar', length: 254, nullable: true }),
    __metadata("design:type", Object)
], WaitlistEntryEntity.prototype, "customerEmail", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_phone', type: 'varchar', length: 30, nullable: true }),
    __metadata("design:type", Object)
], WaitlistEntryEntity.prototype, "customerPhone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: false }),
    __metadata("design:type", Number)
], WaitlistEntryEntity.prototype, "position", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, nullable: false, default: 'waiting' }),
    __metadata("design:type", String)
], WaitlistEntryEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'promoted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], WaitlistEntryEntity.prototype, "promotedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'promoted_until', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], WaitlistEntryEntity.prototype, "promotedUntil", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'booking_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], WaitlistEntryEntity.prototype, "bookingId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], WaitlistEntryEntity.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_deleted', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], WaitlistEntryEntity.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], WaitlistEntryEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], WaitlistEntryEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], WaitlistEntryEntity.prototype, "deletedAt", void 0);
exports.WaitlistEntryEntity = WaitlistEntryEntity = __decorate([
    (0, typeorm_1.Entity)('waitlist_entries'),
    (0, typeorm_1.Index)(['tenantId', 'slotId', 'status']),
    (0, typeorm_1.Index)(['tenantId', 'slotId', 'position']),
    (0, typeorm_1.Index)(['tenantId', 'userId']),
    (0, typeorm_1.Index)(['tenantId', 'customerId']),
    (0, typeorm_1.Index)(['tenantId', 'status', 'promotedUntil'])
], WaitlistEntryEntity);
//# sourceMappingURL=waitlist-entry.entity.js.map