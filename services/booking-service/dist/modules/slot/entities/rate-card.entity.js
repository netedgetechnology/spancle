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
exports.RateCardEntity = void 0;
const typeorm_1 = require("typeorm");
let RateCardEntity = class RateCardEntity {
};
exports.RateCardEntity = RateCardEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], RateCardEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], RateCardEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 150, nullable: false }),
    __metadata("design:type", String)
], RateCardEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], RateCardEntity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 3, nullable: false, default: 'GBP' }),
    __metadata("design:type", String)
], RateCardEntity.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'default_price_minor', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], RateCardEntity.prototype, "defaultPriceMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'weekly_grid', type: 'jsonb', nullable: false, default: '{}' }),
    __metadata("design:type", Object)
], RateCardEntity.prototype, "weeklyGrid", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'date_overrides', type: 'jsonb', nullable: false, default: '[]' }),
    __metadata("design:type", Array)
], RateCardEntity.prototype, "dateOverrides", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], RateCardEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_deleted', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], RateCardEntity.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], RateCardEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], RateCardEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], RateCardEntity.prototype, "deletedAt", void 0);
exports.RateCardEntity = RateCardEntity = __decorate([
    (0, typeorm_1.Entity)('rate_cards'),
    (0, typeorm_1.Index)(['tenantId', 'isActive']),
    (0, typeorm_1.Index)(['tenantId', 'isDeleted'])
], RateCardEntity);
//# sourceMappingURL=rate-card.entity.js.map