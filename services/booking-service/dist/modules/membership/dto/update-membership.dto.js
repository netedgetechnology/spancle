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
exports.UpdateMembershipDto = exports.AssignUserDto = exports.ScheduleDowngradeDto = exports.UpgradeMembershipDto = exports.CancelMembershipDto = exports.FreezeMembershipDto = void 0;
const class_validator_1 = require("class-validator");
class FreezeMembershipDto {
}
exports.FreezeMembershipDto = FreezeMembershipDto;
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], FreezeMembershipDto.prototype, "frozenUntil", void 0);
class CancelMembershipDto {
}
exports.CancelMembershipDto = CancelMembershipDto;
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CancelMembershipDto.prototype, "immediate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CancelMembershipDto.prototype, "reason", void 0);
class UpgradeMembershipDto {
}
exports.UpgradeMembershipDto = UpgradeMembershipDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], UpgradeMembershipDto.prototype, "targetPlanId", void 0);
class ScheduleDowngradeDto {
}
exports.ScheduleDowngradeDto = ScheduleDowngradeDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ScheduleDowngradeDto.prototype, "targetPlanId", void 0);
class AssignUserDto {
}
exports.AssignUserDto = AssignUserDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], AssignUserDto.prototype, "userId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], AssignUserDto.prototype, "seatLabel", void 0);
class UpdateMembershipDto {
}
exports.UpdateMembershipDto = UpdateMembershipDto;
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateMembershipDto.prototype, "autoRenew", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], UpdateMembershipDto.prototype, "seatLabel", void 0);
//# sourceMappingURL=update-membership.dto.js.map