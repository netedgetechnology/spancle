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
exports.CreatePricingRuleDto = void 0;
const class_validator_1 = require("class-validator");
const RULE_TYPES = [
    'base', 'peak', 'weekend', 'holiday', 'member', 'custom',
    'time_of_day', 'day_of_week', 'seasonal', 'promotion',
    'membership', 'coach', 'tournament', 'coupon',
];
const MOD_TYPES = ['percentage', 'fixed', 'absolute'];
const SCOPES = ['tenant', 'branch', 'venue', 'sport', 'court'];
const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
class CreatePricingRuleDto {
}
exports.CreatePricingRuleDto = CreatePricingRuleDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(150),
    __metadata("design:type", String)
], CreatePricingRuleDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], CreatePricingRuleDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(RULE_TYPES),
    __metadata("design:type", String)
], CreatePricingRuleDto.prototype, "ruleType", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(MOD_TYPES),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreatePricingRuleDto.prototype, "modifierType", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(-1_000_000),
    (0, class_validator_1.Max)(100_000_000),
    __metadata("design:type", Number)
], CreatePricingRuleDto.prototype, "modifierValue", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(SCOPES),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreatePricingRuleDto.prototype, "scope", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.ValidateIf)((o) => o.scope === 'branch'),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePricingRuleDto.prototype, "branchId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.ValidateIf)((o) => o.scope === 'venue'),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePricingRuleDto.prototype, "venueId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.ValidateIf)((o) => o.scope === 'sport'),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePricingRuleDto.prototype, "sportId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.ValidateIf)((o) => o.scope === 'court'),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePricingRuleDto.prototype, "courtId", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePricingRuleDto.prototype, "validFrom", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePricingRuleDto.prototype, "validUntil", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsEnum)(DAYS_OF_WEEK, { each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], CreatePricingRuleDto.prototype, "daysOfWeek", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePricingRuleDto.prototype, "timeStart", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePricingRuleDto.prototype, "timeEnd", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreatePricingRuleDto.prototype, "priority", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(50),
    (0, class_validator_1.ValidateIf)((o) => o.ruleType === 'coupon'),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePricingRuleDto.prototype, "couponCode", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.ValidateIf)((o) => o.ruleType === 'coupon'),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreatePricingRuleDto.prototype, "maxRedemptions", void 0);
//# sourceMappingURL=create-pricing-rule.dto.js.map