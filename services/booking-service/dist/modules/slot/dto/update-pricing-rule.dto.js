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
exports.UpdatePricingRuleDto = exports.DAYS_OF_WEEK = exports.SCOPES = exports.MOD_TYPES = exports.RULE_TYPES = void 0;
const class_validator_1 = require("class-validator");
exports.RULE_TYPES = ['base', 'peak', 'weekend', 'holiday', 'member', 'custom'];
exports.MOD_TYPES = ['percentage', 'fixed', 'absolute'];
exports.SCOPES = ['tenant', 'branch', 'sport', 'court'];
exports.DAYS_OF_WEEK = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];
class UpdatePricingRuleDto {
}
exports.UpdatePricingRuleDto = UpdatePricingRuleDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(150),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdatePricingRuleDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], UpdatePricingRuleDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(exports.RULE_TYPES),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdatePricingRuleDto.prototype, "ruleType", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(exports.MOD_TYPES),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdatePricingRuleDto.prototype, "modifierType", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(-10_000),
    (0, class_validator_1.Max)(2_147_483_647),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdatePricingRuleDto.prototype, "modifierValue", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(exports.SCOPES),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdatePricingRuleDto.prototype, "scope", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.ValidateIf)((o) => o.scope === 'branch'),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdatePricingRuleDto.prototype, "branchId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.ValidateIf)((o) => o.scope === 'sport'),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdatePricingRuleDto.prototype, "sportId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.ValidateIf)((o) => o.scope === 'court'),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdatePricingRuleDto.prototype, "courtId", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdatePricingRuleDto.prototype, "validFrom", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdatePricingRuleDto.prototype, "validUntil", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsEnum)(exports.DAYS_OF_WEEK, { each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdatePricingRuleDto.prototype, "daysOfWeek", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdatePricingRuleDto.prototype, "timeStart", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdatePricingRuleDto.prototype, "timeEnd", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdatePricingRuleDto.prototype, "priority", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdatePricingRuleDto.prototype, "isActive", void 0);
//# sourceMappingURL=update-pricing-rule.dto.js.map