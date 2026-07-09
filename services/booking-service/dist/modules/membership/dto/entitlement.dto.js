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
exports.InitialiseEntitlementDto = exports.ReleaseReservedEntitlementDto = exports.ReserveEntitlementDto = exports.AdjustEntitlementDto = exports.RefundEntitlementDto = exports.ConsumeEntitlementDto = void 0;
const class_validator_1 = require("class-validator");
class ConsumeEntitlementDto {
}
exports.ConsumeEntitlementDto = ConsumeEntitlementDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], ConsumeEntitlementDto.prototype, "benefitType", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(1000),
    __metadata("design:type", Number)
], ConsumeEntitlementDto.prototype, "quantity", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(30),
    __metadata("design:type", String)
], ConsumeEntitlementDto.prototype, "referenceType", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ConsumeEntitlementDto.prototype, "referenceId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], ConsumeEntitlementDto.prototype, "note", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], ConsumeEntitlementDto.prototype, "metadata", void 0);
class RefundEntitlementDto {
}
exports.RefundEntitlementDto = RefundEntitlementDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], RefundEntitlementDto.prototype, "benefitType", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(1000),
    __metadata("design:type", Number)
], RefundEntitlementDto.prototype, "quantity", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], RefundEntitlementDto.prototype, "originalTransactionId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], RefundEntitlementDto.prototype, "note", void 0);
class AdjustEntitlementDto {
}
exports.AdjustEntitlementDto = AdjustEntitlementDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], AdjustEntitlementDto.prototype, "benefitType", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(-10_000),
    (0, class_validator_1.Max)(10_000),
    __metadata("design:type", Number)
], AdjustEntitlementDto.prototype, "delta", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], AdjustEntitlementDto.prototype, "note", void 0);
class ReserveEntitlementDto {
}
exports.ReserveEntitlementDto = ReserveEntitlementDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], ReserveEntitlementDto.prototype, "benefitType", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(1000),
    __metadata("design:type", Number)
], ReserveEntitlementDto.prototype, "quantity", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(30),
    __metadata("design:type", String)
], ReserveEntitlementDto.prototype, "referenceType", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ReserveEntitlementDto.prototype, "referenceId", void 0);
class ReleaseReservedEntitlementDto {
}
exports.ReleaseReservedEntitlementDto = ReleaseReservedEntitlementDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], ReleaseReservedEntitlementDto.prototype, "benefitType", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(1000),
    __metadata("design:type", Number)
], ReleaseReservedEntitlementDto.prototype, "quantity", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(30),
    __metadata("design:type", String)
], ReleaseReservedEntitlementDto.prototype, "referenceType", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ReleaseReservedEntitlementDto.prototype, "referenceId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], ReleaseReservedEntitlementDto.prototype, "note", void 0);
class InitialiseEntitlementDto {
}
exports.InitialiseEntitlementDto = InitialiseEntitlementDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], InitialiseEntitlementDto.prototype, "benefitType", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], InitialiseEntitlementDto.prototype, "units", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], InitialiseEntitlementDto.prototype, "periodType", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], InitialiseEntitlementDto.prototype, "rolloverAllowed", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], InitialiseEntitlementDto.prototype, "maxRolloverUnits", void 0);
//# sourceMappingURL=entitlement.dto.js.map