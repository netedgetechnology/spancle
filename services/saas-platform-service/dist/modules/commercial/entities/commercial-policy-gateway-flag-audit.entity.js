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
exports.CommercialAuditEntity = exports.FeatureFlagEntity = exports.GatewayCredentialEntity = exports.GatewayDefinitionEntity = exports.RevenueDistributionPolicyEntity = exports.PaymentOwnershipPolicyEntity = void 0;
const typeorm_1 = require("typeorm");
const commercial_enums_1 = require("../enums/commercial.enums");
let PaymentOwnershipPolicyEntity = class PaymentOwnershipPolicyEntity {
};
exports.PaymentOwnershipPolicyEntity = PaymentOwnershipPolicyEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PaymentOwnershipPolicyEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Object)
], PaymentOwnershipPolicyEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'name', type: 'varchar', length: 255, nullable: false }),
    __metadata("design:type", String)
], PaymentOwnershipPolicyEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ownership_type', type: 'varchar', length: 32, nullable: false }),
    __metadata("design:type", String)
], PaymentOwnershipPolicyEntity.prototype, "ownershipType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'platform_share_bps', type: 'int', nullable: false, default: 0 }),
    __metadata("design:type", Number)
], PaymentOwnershipPolicyEntity.prototype, "platformShareBps", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'config', type: 'jsonb', nullable: false, default: '{}' }),
    __metadata("design:type", Object)
], PaymentOwnershipPolicyEntity.prototype, "config", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], PaymentOwnershipPolicyEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_deleted', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], PaymentOwnershipPolicyEntity.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], PaymentOwnershipPolicyEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], PaymentOwnershipPolicyEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], PaymentOwnershipPolicyEntity.prototype, "deletedAt", void 0);
exports.PaymentOwnershipPolicyEntity = PaymentOwnershipPolicyEntity = __decorate([
    (0, typeorm_1.Entity)('payment_ownership_policies'),
    (0, typeorm_1.Index)(['tenantId', 'ownershipType'])
], PaymentOwnershipPolicyEntity);
let RevenueDistributionPolicyEntity = class RevenueDistributionPolicyEntity {
};
exports.RevenueDistributionPolicyEntity = RevenueDistributionPolicyEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], RevenueDistributionPolicyEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Object)
], RevenueDistributionPolicyEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'name', type: 'varchar', length: 255, nullable: false }),
    __metadata("design:type", String)
], RevenueDistributionPolicyEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'distribution_type', type: 'varchar', length: 64, nullable: false }),
    __metadata("design:type", String)
], RevenueDistributionPolicyEntity.prototype, "distributionType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tiers', type: 'jsonb', nullable: false, default: '[]' }),
    __metadata("design:type", Array)
], RevenueDistributionPolicyEntity.prototype, "tiers", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], RevenueDistributionPolicyEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_deleted', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], RevenueDistributionPolicyEntity.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], RevenueDistributionPolicyEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], RevenueDistributionPolicyEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], RevenueDistributionPolicyEntity.prototype, "deletedAt", void 0);
exports.RevenueDistributionPolicyEntity = RevenueDistributionPolicyEntity = __decorate([
    (0, typeorm_1.Entity)('revenue_distribution_policies'),
    (0, typeorm_1.Index)(['tenantId', 'distributionType'])
], RevenueDistributionPolicyEntity);
let GatewayDefinitionEntity = class GatewayDefinitionEntity {
};
exports.GatewayDefinitionEntity = GatewayDefinitionEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], GatewayDefinitionEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'gateway_type', type: 'varchar', length: 64, nullable: false }),
    __metadata("design:type", String)
], GatewayDefinitionEntity.prototype, "gatewayType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'display_name', type: 'varchar', length: 255, nullable: false }),
    __metadata("design:type", String)
], GatewayDefinitionEntity.prototype, "displayName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'supported_currencies', type: 'jsonb', nullable: false, default: '[]' }),
    __metadata("design:type", Array)
], GatewayDefinitionEntity.prototype, "supportedCurrencies", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'capabilities', type: 'jsonb', nullable: false, default: '{}' }),
    __metadata("design:type", Object)
], GatewayDefinitionEntity.prototype, "capabilities", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], GatewayDefinitionEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'config_schema', type: 'jsonb', nullable: false, default: '{}' }),
    __metadata("design:type", Object)
], GatewayDefinitionEntity.prototype, "configSchema", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], GatewayDefinitionEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], GatewayDefinitionEntity.prototype, "updatedAt", void 0);
exports.GatewayDefinitionEntity = GatewayDefinitionEntity = __decorate([
    (0, typeorm_1.Entity)('gateway_definitions'),
    (0, typeorm_1.Index)(['gatewayType'], { unique: true })
], GatewayDefinitionEntity);
let GatewayCredentialEntity = class GatewayCredentialEntity {
};
exports.GatewayCredentialEntity = GatewayCredentialEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], GatewayCredentialEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Object)
], GatewayCredentialEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'gateway_definition_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], GatewayCredentialEntity.prototype, "gatewayDefinitionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'scope', type: 'varchar', length: 32, nullable: false }),
    __metadata("design:type", String)
], GatewayCredentialEntity.prototype, "scope", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'public_config', type: 'jsonb', nullable: false, default: '{}' }),
    __metadata("design:type", Object)
], GatewayCredentialEntity.prototype, "publicConfig", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'secret_config_encrypted', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], GatewayCredentialEntity.prototype, "secretConfigEncrypted", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], GatewayCredentialEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], GatewayCredentialEntity.prototype, "createdById", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], GatewayCredentialEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], GatewayCredentialEntity.prototype, "updatedAt", void 0);
exports.GatewayCredentialEntity = GatewayCredentialEntity = __decorate([
    (0, typeorm_1.Entity)('gateway_credentials'),
    (0, typeorm_1.Index)(['tenantId', 'gatewayDefinitionId'], { unique: true })
], GatewayCredentialEntity);
let FeatureFlagEntity = class FeatureFlagEntity {
};
exports.FeatureFlagEntity = FeatureFlagEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], FeatureFlagEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Object)
], FeatureFlagEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'key', type: 'varchar', length: 128, nullable: false }),
    __metadata("design:type", String)
], FeatureFlagEntity.prototype, "key", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'status', type: 'varchar', length: 32, nullable: false, default: commercial_enums_1.FeatureFlagStatus.DISABLED }),
    __metadata("design:type", String)
], FeatureFlagEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'rollout_percentage', type: 'int', nullable: false, default: 0 }),
    __metadata("design:type", Number)
], FeatureFlagEntity.prototype, "rolloutPercentage", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'description', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], FeatureFlagEntity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'metadata', type: 'jsonb', nullable: false, default: '{}' }),
    __metadata("design:type", Object)
], FeatureFlagEntity.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'updated_by_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], FeatureFlagEntity.prototype, "updatedById", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], FeatureFlagEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], FeatureFlagEntity.prototype, "updatedAt", void 0);
exports.FeatureFlagEntity = FeatureFlagEntity = __decorate([
    (0, typeorm_1.Entity)('feature_flags'),
    (0, typeorm_1.Index)(['tenantId', 'key'], { unique: true })
], FeatureFlagEntity);
let CommercialAuditEntity = class CommercialAuditEntity {
};
exports.CommercialAuditEntity = CommercialAuditEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CommercialAuditEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Object)
], CommercialAuditEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'action', type: 'varchar', length: 64, nullable: false }),
    __metadata("design:type", String)
], CommercialAuditEntity.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'target_type', type: 'varchar', length: 64, nullable: false }),
    __metadata("design:type", String)
], CommercialAuditEntity.prototype, "targetType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'target_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], CommercialAuditEntity.prototype, "targetId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'before_state', type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], CommercialAuditEntity.prototype, "beforeState", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'after_state', type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], CommercialAuditEntity.prototype, "afterState", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'actor_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], CommercialAuditEntity.prototype, "actorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'actor_role', type: 'varchar', length: 64, nullable: true }),
    __metadata("design:type", Object)
], CommercialAuditEntity.prototype, "actorRole", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ip_address', type: 'varchar', length: 64, nullable: true }),
    __metadata("design:type", Object)
], CommercialAuditEntity.prototype, "ipAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'metadata', type: 'jsonb', nullable: false, default: '{}' }),
    __metadata("design:type", Object)
], CommercialAuditEntity.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], CommercialAuditEntity.prototype, "createdAt", void 0);
exports.CommercialAuditEntity = CommercialAuditEntity = __decorate([
    (0, typeorm_1.Entity)('commercial_audit'),
    (0, typeorm_1.Index)(['tenantId', 'createdAt']),
    (0, typeorm_1.Index)(['tenantId', 'action']),
    (0, typeorm_1.Index)(['tenantId', 'targetId'])
], CommercialAuditEntity);
//# sourceMappingURL=commercial-policy-gateway-flag-audit.entity.js.map