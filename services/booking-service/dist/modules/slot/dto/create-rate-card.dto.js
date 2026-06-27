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
exports.UpdateRateCardDto = exports.CreateRateCardDto = exports.DateOverrideDto = exports.DayPriceGridDto = exports.HourlySlotDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const mapped_types_1 = require("@nestjs/mapped-types");
const CURRENCIES = ['GBP', 'USD', 'EUR', 'AED', 'INR', 'AUD', 'CAD', 'SGD'];
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
class HourlySlotDto {
}
exports.HourlySlotDto = HourlySlotDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(23),
    __metadata("design:type", Number)
], HourlySlotDto.prototype, "hour", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], HourlySlotDto.prototype, "priceMinor", void 0);
class DayPriceGridDto {
}
exports.DayPriceGridDto = DayPriceGridDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => HourlySlotDto),
    __metadata("design:type", Array)
], DayPriceGridDto.prototype, "hourlySlots", void 0);
class DateOverrideDto {
}
exports.DateOverrideDto = DateOverrideDto;
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], DateOverrideDto.prototype, "date", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], DateOverrideDto.prototype, "label", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], DateOverrideDto.prototype, "allDay", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => o.allDay === true),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], DateOverrideDto.prototype, "priceMinor", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => o.allDay === false),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => HourlySlotDto),
    __metadata("design:type", Array)
], DateOverrideDto.prototype, "hourlySlots", void 0);
class CreateRateCardDto {
}
exports.CreateRateCardDto = CreateRateCardDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(150),
    __metadata("design:type", String)
], CreateRateCardDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], CreateRateCardDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(CURRENCIES),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateRateCardDto.prototype, "currency", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateRateCardDto.prototype, "defaultPriceMinor", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateRateCardDto.prototype, "weeklyGrid", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => DateOverrideDto),
    __metadata("design:type", Array)
], CreateRateCardDto.prototype, "dateOverrides", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateRateCardDto.prototype, "isActive", void 0);
class UpdateRateCardDto extends (0, mapped_types_1.PartialType)(CreateRateCardDto) {
}
exports.UpdateRateCardDto = UpdateRateCardDto;
//# sourceMappingURL=create-rate-card.dto.js.map