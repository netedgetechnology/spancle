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
exports.UpdateBookingRulesDto = exports.CreateBookingRulesDto = void 0;
const class_validator_1 = require("class-validator");
const booking_rules_entity_1 = require("../entities/booking-rules.entity");
class CreateBookingRulesDto {
}
exports.CreateBookingRulesDto = CreateBookingRulesDto;
__decorate([
    (0, class_validator_1.IsEnum)(booking_rules_entity_1.BOOKING_RULE_SCOPES),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateBookingRulesDto.prototype, "scope", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateBookingRulesDto.prototype, "branchId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateBookingRulesDto.prototype, "sportId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateBookingRulesDto.prototype, "courtId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(150),
    __metadata("design:type", String)
], CreateBookingRulesDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], CreateBookingRulesDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateBookingRulesDto.prototype, "isActive", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(525_600),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateBookingRulesDto.prototype, "maxAdvanceBookingMins", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(10_080),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateBookingRulesDto.prototype, "minNoticeMins", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(15),
    (0, class_validator_1.Max)(1_440),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateBookingRulesDto.prototype, "minDurationMins", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(15),
    (0, class_validator_1.Max)(1_440),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateBookingRulesDto.prototype, "maxDurationMins", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateBookingRulesDto.prototype, "maxBookingsPerDay", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(500),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateBookingRulesDto.prototype, "maxBookingsPerWeek", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(2_000),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateBookingRulesDto.prototype, "maxBookingsPerMonth", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateBookingRulesDto.prototype, "membersOnly", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(120),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateBookingRulesDto.prototype, "minAgeYears", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(120),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateBookingRulesDto.prototype, "maxAgeYears", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(240),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateBookingRulesDto.prototype, "bufferTimeMins", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(44_640),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateBookingRulesDto.prototype, "cancellationCutoffMins", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(44_640),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateBookingRulesDto.prototype, "rescheduleCutoffMins", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(120),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateBookingRulesDto.prototype, "gracePeriodMins", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], CreateBookingRulesDto.prototype, "blackoutDates", void 0);
class UpdateBookingRulesDto {
}
exports.UpdateBookingRulesDto = UpdateBookingRulesDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(150),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateBookingRulesDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], UpdateBookingRulesDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateBookingRulesDto.prototype, "isActive", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(525_600),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateBookingRulesDto.prototype, "maxAdvanceBookingMins", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(10_080),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateBookingRulesDto.prototype, "minNoticeMins", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(15),
    (0, class_validator_1.Max)(1_440),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateBookingRulesDto.prototype, "minDurationMins", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(15),
    (0, class_validator_1.Max)(1_440),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateBookingRulesDto.prototype, "maxDurationMins", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateBookingRulesDto.prototype, "maxBookingsPerDay", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(500),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateBookingRulesDto.prototype, "maxBookingsPerWeek", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(2_000),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateBookingRulesDto.prototype, "maxBookingsPerMonth", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateBookingRulesDto.prototype, "membersOnly", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(120),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateBookingRulesDto.prototype, "minAgeYears", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(120),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateBookingRulesDto.prototype, "maxAgeYears", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(240),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateBookingRulesDto.prototype, "bufferTimeMins", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(44_640),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateBookingRulesDto.prototype, "cancellationCutoffMins", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(44_640),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateBookingRulesDto.prototype, "rescheduleCutoffMins", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(120),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateBookingRulesDto.prototype, "gracePeriodMins", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateBookingRulesDto.prototype, "blackoutDates", void 0);
//# sourceMappingURL=booking-rules.dto.js.map