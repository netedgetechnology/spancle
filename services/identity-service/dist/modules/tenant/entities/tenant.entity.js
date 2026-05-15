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
exports.TenantEntity = void 0;
const typeorm_1 = require("typeorm");
let TenantEntity = class TenantEntity {
};
exports.TenantEntity = TenantEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], TenantEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: false }),
    __metadata("design:type", String)
], TenantEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 63, nullable: false, update: false }),
    (0, typeorm_1.Index)({ unique: true }),
    __metadata("design:type", String)
], TenantEntity.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['pending', 'active', 'suspended', 'terminated', 'trial'],
        default: 'trial',
        nullable: false,
    }),
    __metadata("design:type", String)
], TenantEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['free', 'starter', 'growth', 'pro', 'enterprise'],
        default: 'free',
        nullable: false,
    }),
    __metadata("design:type", String)
], TenantEntity.prototype, "tier", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 254, nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], TenantEntity.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 30, nullable: true }),
    __metadata("design:type", Object)
], TenantEntity.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'jsonb',
        nullable: false,
        default: () => `'${JSON.stringify({
            timezone: 'UTC',
            locale: 'en-GB',
            currency: 'GBP',
            dateFormat: 'DD/MM/YYYY',
            allowPublicBookings: false,
            requireMfa: false,
            maxSessionDurationMs: 28800000,
        })}'`,
    }),
    __metadata("design:type", Object)
], TenantEntity.prototype, "settings", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'logo_url', type: 'varchar', length: 2048, nullable: true }),
    __metadata("design:type", Object)
], TenantEntity.prototype, "logoUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_deleted', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], TenantEntity.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], TenantEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], TenantEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], TenantEntity.prototype, "deletedAt", void 0);
exports.TenantEntity = TenantEntity = __decorate([
    (0, typeorm_1.Entity)('tenants'),
    (0, typeorm_1.Index)(['slug'], { unique: true })
], TenantEntity);
//# sourceMappingURL=tenant.entity.js.map