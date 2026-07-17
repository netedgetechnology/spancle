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
exports.CommercialDecisionResponseDto = exports.CommercialDecisionRequestDto = void 0;
const class_validator_1 = require("class-validator");
const commercial_enums_1 = require("../enums/commercial.enums");
class CommercialDecisionRequestDto {
}
exports.CommercialDecisionRequestDto = CommercialDecisionRequestDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(128),
    __metadata("design:type", String)
], CommercialDecisionRequestDto.prototype, "moduleId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(128),
    __metadata("design:type", String)
], CommercialDecisionRequestDto.prototype, "productId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(commercial_enums_1.TransactionType),
    __metadata("design:type", String)
], CommercialDecisionRequestDto.prototype, "transactionType", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CommercialDecisionRequestDto.prototype, "amountMinor", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(3),
    __metadata("design:type", String)
], CommercialDecisionRequestDto.prototype, "currency", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(2),
    __metadata("design:type", String)
], CommercialDecisionRequestDto.prototype, "country", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CommercialDecisionRequestDto.prototype, "metadata", void 0);
class CommercialDecisionResponseDto {
    static from(result) {
        const dto = new CommercialDecisionResponseDto();
        dto.decisionId = result.decisionId;
        dto.tenantId = result.tenantId;
        dto.moduleId = result.moduleId;
        dto.productId = result.productId;
        dto.transactionType = result.transactionType;
        dto.outcome = result.outcome;
        dto.reason = result.reason;
        dto.resolvedPackage = result.resolvedPackage;
        dto.productEligible = result.productEligible;
        dto.appliedPolicyIds = result.appliedPolicyIds;
        dto.generatedAt = result.generatedAt.toISOString();
        return dto;
    }
}
exports.CommercialDecisionResponseDto = CommercialDecisionResponseDto;
//# sourceMappingURL=commercial-decision.dto.js.map