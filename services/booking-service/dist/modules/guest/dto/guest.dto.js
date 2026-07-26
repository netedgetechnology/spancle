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
exports.GuestInitiatePaymentDto = exports.LinkGuestBookingsDto = exports.GuestLookupDto = exports.GuestCreateBookingDto = exports.GuestCustomerDto = exports.GuestSessionDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class GuestSessionDto {
}
exports.GuestSessionDto = GuestSessionDto;
class GuestCustomerDto {
}
exports.GuestCustomerDto = GuestCustomerDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], GuestCustomerDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.MaxLength)(254),
    (0, class_transformer_1.Transform)(({ value }) => value?.toLowerCase().trim()),
    __metadata("design:type", String)
], GuestCustomerDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(30),
    __metadata("design:type", String)
], GuestCustomerDto.prototype, "phone", void 0);
class GuestCreateBookingDto {
}
exports.GuestCreateBookingDto = GuestCreateBookingDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], GuestCreateBookingDto.prototype, "guestSession", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsUUID)('4', { each: true }),
    __metadata("design:type", Array)
], GuestCreateBookingDto.prototype, "slotIds", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], GuestCreateBookingDto.prototype, "branchId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], GuestCreateBookingDto.prototype, "courtId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], GuestCreateBookingDto.prototype, "sportId", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => GuestCustomerDto),
    __metadata("design:type", GuestCustomerDto)
], GuestCreateBookingDto.prototype, "customer", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], GuestCreateBookingDto.prototype, "participantCount", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], GuestCreateBookingDto.prototype, "customerNotes", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], GuestCreateBookingDto.prototype, "metadata", void 0);
class GuestLookupDto {
}
exports.GuestLookupDto = GuestLookupDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], GuestLookupDto.prototype, "token", void 0);
class LinkGuestBookingsDto {
}
exports.LinkGuestBookingsDto = LinkGuestBookingsDto;
__decorate([
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.MaxLength)(254),
    (0, class_transformer_1.Transform)(({ value }) => value?.toLowerCase().trim()),
    __metadata("design:type", String)
], LinkGuestBookingsDto.prototype, "customerEmail", void 0);
class GuestInitiatePaymentDto {
}
exports.GuestInitiatePaymentDto = GuestInitiatePaymentDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], GuestInitiatePaymentDto.prototype, "guestPaymentToken", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], GuestInitiatePaymentDto.prototype, "bookingId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], GuestInitiatePaymentDto.prototype, "branchId", void 0);
//# sourceMappingURL=guest.dto.js.map