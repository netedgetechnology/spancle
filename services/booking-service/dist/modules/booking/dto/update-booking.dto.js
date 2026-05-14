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
exports.PaymentFailedDto = exports.WaiveNoShowDto = exports.MarkNoShowDto = exports.CheckInDto = exports.RescheduleBookingDto = exports.CancelBookingDto = exports.UpdateBookingDto = void 0;
const class_validator_1 = require("class-validator");
const UPDATABLE_STATUSES = [
    'confirmed', 'completed', 'cancelled', 'no_show', 'refunded',
];
class UpdateBookingDto {
}
exports.UpdateBookingDto = UpdateBookingDto;
__decorate([
    (0, class_validator_1.IsEnum)(UPDATABLE_STATUSES),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateBookingDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], UpdateBookingDto.prototype, "customerNotes", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], UpdateBookingDto.prototype, "internalNotes", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateBookingDto.prototype, "participantCount", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateBookingDto.prototype, "updatedById", void 0);
class CancelBookingDto {
}
exports.CancelBookingDto = CancelBookingDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_2.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CancelBookingDto.prototype, "reason", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CancelBookingDto.prototype, "cancelledById", void 0);
class RescheduleBookingDto {
}
exports.RescheduleBookingDto = RescheduleBookingDto;
__decorate([
    (0, class_validator_1.IsUUID)('4', { each: true }),
    __metadata("design:type", Array)
], RescheduleBookingDto.prototype, "newSlotIds", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], RescheduleBookingDto.prototype, "reason", void 0);
class CheckInDto {
}
exports.CheckInDto = CheckInDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CheckInDto.prototype, "checkedInById", void 0);
const class_validator_2 = require("class-validator");
class MarkNoShowDto {
}
exports.MarkNoShowDto = MarkNoShowDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], MarkNoShowDto.prototype, "notes", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], MarkNoShowDto.prototype, "actorId", void 0);
class WaiveNoShowDto {
}
exports.WaiveNoShowDto = WaiveNoShowDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_2.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], WaiveNoShowDto.prototype, "reason", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], WaiveNoShowDto.prototype, "actorId", void 0);
class PaymentFailedDto {
}
exports.PaymentFailedDto = PaymentFailedDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], PaymentFailedDto.prototype, "reason", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], PaymentFailedDto.prototype, "providerErrorCode", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], PaymentFailedDto.prototype, "providerErrorMessage", void 0);
//# sourceMappingURL=update-booking.dto.js.map