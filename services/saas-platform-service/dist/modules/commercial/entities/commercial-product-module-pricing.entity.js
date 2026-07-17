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
exports.PricingModelEntity = exports.ModuleRegistryEntity = exports.CommercialProductEntity = void 0;
const typeorm_1 = require("typeorm");
const commercial_enums_1 = require("../enums/commercial.enums");
let CommercialProductEntity = class CommercialProductEntity {
};
exports.CommercialProductEntity = CommercialProductEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CommercialProductEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'name', type: 'varchar', length: 255, nullable: false }),
    __metadata("design:type", String)
], CommercialProductEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sku', type: 'varchar', length: 128, nullable: false }),
    __metadata("design:type", String)
], CommercialProductEntity.prototype, "sku", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'description', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], CommercialProductEntity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'product_type', type: 'varchar', length: 64, nullable: false }),
    __metadata("design:type", String)
], CommercialProductEntity.prototype, "productType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], CommercialProductEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'entitlements', type: 'jsonb', nullable: false, default: '{}' }),
    __metadata("design:type", Object)
], CommercialProductEntity.prototype, "entitlements", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'metadata', type: 'jsonb', nullable: false, default: '{}' }),
    __metadata("design:type", Object)
], CommercialProductEntity.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_deleted', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], CommercialProductEntity.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], CommercialProductEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], CommercialProductEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], CommercialProductEntity.prototype, "deletedAt", void 0);
exports.CommercialProductEntity = CommercialProductEntity = __decorate([
    (0, typeorm_1.Entity)('commercial_products'),
    (0, typeorm_1.Index)(['sku'], { unique: true }),
    (0, typeorm_1.Index)(['productType', 'isActive'])
], CommercialProductEntity);
let ModuleRegistryEntity = class ModuleRegistryEntity {
};
exports.ModuleRegistryEntity = ModuleRegistryEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ModuleRegistryEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'key', type: 'varchar', length: 128, nullable: false }),
    __metadata("design:type", String)
], ModuleRegistryEntity.prototype, "key", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'display_name', type: 'varchar', length: 255, nullable: false }),
    __metadata("design:type", String)
], ModuleRegistryEntity.prototype, "displayName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'description', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], ModuleRegistryEntity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'version', type: 'varchar', length: 32, nullable: false, default: '1.0.0' }),
    __metadata("design:type", String)
], ModuleRegistryEntity.prototype, "version", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_core', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], ModuleRegistryEntity.prototype, "isCore", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], ModuleRegistryEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'dependencies', type: 'jsonb', nullable: false, default: '[]' }),
    __metadata("design:type", Array)
], ModuleRegistryEntity.prototype, "dependencies", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'capabilities', type: 'jsonb', nullable: false, default: '{}' }),
    __metadata("design:type", Object)
], ModuleRegistryEntity.prototype, "capabilities", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], ModuleRegistryEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], ModuleRegistryEntity.prototype, "updatedAt", void 0);
exports.ModuleRegistryEntity = ModuleRegistryEntity = __decorate([
    (0, typeorm_1.Entity)('module_registry'),
    (0, typeorm_1.Index)(['key'], { unique: true })
], ModuleRegistryEntity);
let PricingModelEntity = class PricingModelEntity {
};
exports.PricingModelEntity = PricingModelEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PricingModelEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Object)
], PricingModelEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'name', type: 'varchar', length: 255, nullable: false }),
    __metadata("design:type", String)
], PricingModelEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'model_type', type: 'varchar', length: 64, nullable: false }),
    __metadata("design:type", String)
], PricingModelEntity.prototype, "modelType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'currency', type: 'varchar', length: 3, nullable: false, default: 'GBP' }),
    __metadata("design:type", String)
], PricingModelEntity.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'config', type: 'jsonb', nullable: false, default: '{}' }),
    __metadata("design:type", Object)
], PricingModelEntity.prototype, "config", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], PricingModelEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_deleted', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], PricingModelEntity.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], PricingModelEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], PricingModelEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], PricingModelEntity.prototype, "deletedAt", void 0);
exports.PricingModelEntity = PricingModelEntity = __decorate([
    (0, typeorm_1.Entity)('pricing_models'),
    (0, typeorm_1.Index)(['tenantId', 'modelType'])
], PricingModelEntity);
//# sourceMappingURL=commercial-product-module-pricing.entity.js.map