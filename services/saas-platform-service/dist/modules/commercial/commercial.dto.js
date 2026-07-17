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
exports.UpsertFeatureFlagDto = exports.UpsertGatewayCredentialDto = exports.CreateRevenueDistributionPolicyDto = exports.CreatePaymentOwnershipPolicyDto = exports.CreatePricingModelDto = exports.CreateCommercialProductDto = exports.UpdatePackageDefinitionDto = exports.CreatePackageDefinitionDto = exports.CreateCommercialRuleVersionDto = exports.UpdateCommercialRuleDto = exports.CreateCommercialRuleDto = void 0;
const class_validator_1 = require("class-validator");
const commercial_enums_1 = require("./enums/commercial.enums");
class CreateCommercialRuleDto {
}
exports.CreateCommercialRuleDto = CreateCommercialRuleDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCommercialRuleDto.prototype, "tenantId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateCommercialRuleDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], CreateCommercialRuleDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(commercial_enums_1.CommercialRuleType),
    __metadata("design:type", String)
], CreateCommercialRuleDto.prototype, "ruleType", void 0);
class UpdateCommercialRuleDto {
}
exports.UpdateCommercialRuleDto = UpdateCommercialRuleDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], UpdateCommercialRuleDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], UpdateCommercialRuleDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(commercial_enums_1.CommercialRuleStatus),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateCommercialRuleDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(32),
    __metadata("design:type", String)
], UpdateCommercialRuleDto.prototype, "activeVersion", void 0);
class CreateCommercialRuleVersionDto {
}
exports.CreateCommercialRuleVersionDto = CreateCommercialRuleVersionDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateCommercialRuleVersionDto.prototype, "ruleId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(32),
    __metadata("design:type", String)
], CreateCommercialRuleVersionDto.prototype, "version", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCommercialRuleVersionDto.prototype, "changelog", void 0);
class CreatePackageDefinitionDto {
}
exports.CreatePackageDefinitionDto = CreatePackageDefinitionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreatePackageDefinitionDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(64),
    __metadata("design:type", String)
], CreatePackageDefinitionDto.prototype, "slug", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePackageDefinitionDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreatePackageDefinitionDto.prototype, "sortOrder", void 0);
class UpdatePackageDefinitionDto {
}
exports.UpdatePackageDefinitionDto = UpdatePackageDefinitionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], UpdatePackageDefinitionDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdatePackageDefinitionDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdatePackageDefinitionDto.prototype, "sortOrder", void 0);
class CreateCommercialProductDto {
}
exports.CreateCommercialProductDto = CreateCommercialProductDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateCommercialProductDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(128),
    __metadata("design:type", String)
], CreateCommercialProductDto.prototype, "sku", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCommercialProductDto.prototype, "description", void 0);
class CreatePricingModelDto {
}
exports.CreatePricingModelDto = CreatePricingModelDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePricingModelDto.prototype, "tenantId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreatePricingModelDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(commercial_enums_1.PricingModelType),
    __metadata("design:type", String)
], CreatePricingModelDto.prototype, "modelType", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(3),
    __metadata("design:type", String)
], CreatePricingModelDto.prototype, "currency", void 0);
class CreatePaymentOwnershipPolicyDto {
}
exports.CreatePaymentOwnershipPolicyDto = CreatePaymentOwnershipPolicyDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePaymentOwnershipPolicyDto.prototype, "tenantId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreatePaymentOwnershipPolicyDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(commercial_enums_1.PaymentOwnershipType),
    __metadata("design:type", String)
], CreatePaymentOwnershipPolicyDto.prototype, "ownershipType", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(10000),
    __metadata("design:type", Number)
], CreatePaymentOwnershipPolicyDto.prototype, "platformShareBps", void 0);
class CreateRevenueDistributionPolicyDto {
}
exports.CreateRevenueDistributionPolicyDto = CreateRevenueDistributionPolicyDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateRevenueDistributionPolicyDto.prototype, "tenantId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateRevenueDistributionPolicyDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(commercial_enums_1.RevenueDistributionType),
    __metadata("design:type", String)
], CreateRevenueDistributionPolicyDto.prototype, "distributionType", void 0);
class UpsertGatewayCredentialDto {
}
exports.UpsertGatewayCredentialDto = UpsertGatewayCredentialDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpsertGatewayCredentialDto.prototype, "tenantId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], UpsertGatewayCredentialDto.prototype, "gatewayDefinitionId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(commercial_enums_1.GatewayScope),
    __metadata("design:type", String)
], UpsertGatewayCredentialDto.prototype, "scope", void 0);
class UpsertFeatureFlagDto {
}
exports.UpsertFeatureFlagDto = UpsertFeatureFlagDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpsertFeatureFlagDto.prototype, "tenantId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(128),
    __metadata("design:type", String)
], UpsertFeatureFlagDto.prototype, "key", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(commercial_enums_1.FeatureFlagStatus),
    __metadata("design:type", String)
], UpsertFeatureFlagDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpsertFeatureFlagDto.prototype, "rolloutPercentage", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpsertFeatureFlagDto.prototype, "description", void 0);
//# sourceMappingURL=commercial.dto.js.map