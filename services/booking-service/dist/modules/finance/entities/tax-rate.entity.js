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
exports.TaxRateEntity = void 0;
const typeorm_1 = require("typeorm");
let TaxRateEntity = class TaxRateEntity {
};
exports.TaxRateEntity = TaxRateEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], TaxRateEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], TaxRateEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 30, nullable: false }),
    __metadata("design:type", String)
], TaxRateEntity.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: false }),
    __metadata("design:type", String)
], TaxRateEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, nullable: false }),
    __metadata("design:type", String)
], TaxRateEntity.prototype, "regime", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'rate_bps', type: 'int', nullable: false, default: 0 }),
    __metadata("design:type", Number)
], TaxRateEntity.prototype, "rateBps", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10, nullable: true }),
    __metadata("design:type", Object)
], TaxRateEntity.prototype, "jurisdiction", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_inclusive', type: 'boolean', nullable: false, default: false }),
    __metadata("design:type", Boolean)
], TaxRateEntity.prototype, "isInclusive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_compound', type: 'boolean', nullable: false, default: false }),
    __metadata("design:type", Boolean)
], TaxRateEntity.prototype, "isCompound", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'applies_to', type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], TaxRateEntity.prototype, "appliesTo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_default', type: 'boolean', nullable: false, default: false }),
    __metadata("design:type", Boolean)
], TaxRateEntity.prototype, "isDefault", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'effective_from', type: 'date', nullable: true }),
    __metadata("design:type", Object)
], TaxRateEntity.prototype, "effectiveFrom", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'effective_to', type: 'date', nullable: true }),
    __metadata("design:type", Object)
], TaxRateEntity.prototype, "effectiveTo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', type: 'boolean', nullable: false, default: true }),
    __metadata("design:type", Boolean)
], TaxRateEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], TaxRateEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], TaxRateEntity.prototype, "updatedAt", void 0);
exports.TaxRateEntity = TaxRateEntity = __decorate([
    (0, typeorm_1.Entity)('finance_tax_rates'),
    (0, typeorm_1.Index)(['tenantId', 'code'], { unique: true }),
    (0, typeorm_1.Index)(['tenantId', 'regime']),
    (0, typeorm_1.Index)(['tenantId', 'jurisdiction']),
    (0, typeorm_1.Index)(['tenantId', 'isActive'])
], TaxRateEntity);
//# sourceMappingURL=tax-rate.entity.js.map