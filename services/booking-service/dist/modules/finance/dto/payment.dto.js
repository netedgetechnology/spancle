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
exports.FailPaymentDto = exports.AllocatePaymentDto = exports.CapturePaymentDto = exports.InitiatePaymentDto = void 0;
const class_validator_1 = require("class-validator");
const PAYMENT_METHODS = [
    'online_card', 'card_present', 'cash', 'upi',
    'wallet', 'bank_transfer', 'voucher',
];
const GATEWAYS = ['stripe', 'razorpay', 'cash', 'manual'];
class InitiatePaymentDto {
}
exports.InitiatePaymentDto = InitiatePaymentDto;
__decorate([
    (0, class_validator_1.IsEnum)(PAYMENT_METHODS),
    __metadata("design:type", Object)
], InitiatePaymentDto.prototype, "method", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(GATEWAYS),
    __metadata("design:type", Object)
], InitiatePaymentDto.prototype, "gateway", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], InitiatePaymentDto.prototype, "amountMinor", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(3),
    __metadata("design:type", String)
], InitiatePaymentDto.prototype, "currency", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], InitiatePaymentDto.prototype, "customerId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(64),
    __metadata("design:type", String)
], InitiatePaymentDto.prototype, "idempotencyKey", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(45),
    __metadata("design:type", String)
], InitiatePaymentDto.prototype, "ipAddress", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], InitiatePaymentDto.prototype, "deviceId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(undefined, { each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], InitiatePaymentDto.prototype, "invoiceIds", void 0);
class CapturePaymentDto {
}
exports.CapturePaymentDto = CapturePaymentDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CapturePaymentDto.prototype, "amountMinor", void 0);
class AllocatePaymentDto {
}
exports.AllocatePaymentDto = AllocatePaymentDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], AllocatePaymentDto.prototype, "invoiceId", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], AllocatePaymentDto.prototype, "allocatedMinor", void 0);
class FailPaymentDto {
}
exports.FailPaymentDto = FailPaymentDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], FailPaymentDto.prototype, "reason", void 0);
//# sourceMappingURL=payment.dto.js.map