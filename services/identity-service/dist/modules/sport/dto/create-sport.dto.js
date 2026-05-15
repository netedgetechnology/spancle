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
exports.SportStatusDto = exports.AssignBranchesDto = exports.UpdateSportDto = exports.CreateSportDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const SPORT_STATUSES = ['active', 'inactive'];
class CreateSportDto {
}
exports.CreateSportDto = CreateSportDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateSportDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(100),
    (0, class_validator_1.Matches)(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        message: 'Slug must be lowercase alphanumeric with hyphens only (e.g. "five-a-side")',
    }),
    (0, class_transformer_1.Transform)(({ value }) => value?.toLowerCase().trim()),
    __metadata("design:type", String)
], CreateSportDto.prototype, "slug", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], CreateSportDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateSportDto.prototype, "icon", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^#([0-9a-fA-F]{6})$/, {
        message: 'color must be a valid 6-digit hex colour (e.g. "#3b82f6")',
    }),
    __metadata("design:type", String)
], CreateSportDto.prototype, "color", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateSportDto.prototype, "config", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(SPORT_STATUSES, {
        message: `status must be one of: ${SPORT_STATUSES.join(', ')}`,
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateSportDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateSportDto.prototype, "sortOrder", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsUUID)('4', { each: true, message: 'Each branchId must be a valid UUID' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], CreateSportDto.prototype, "branchIds", void 0);
class UpdateSportDto {
}
exports.UpdateSportDto = UpdateSportDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], UpdateSportDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], UpdateSportDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], UpdateSportDto.prototype, "icon", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^#([0-9a-fA-F]{6})$/, {
        message: 'color must be a valid 6-digit hex colour (e.g. "#3b82f6")',
    }),
    __metadata("design:type", String)
], UpdateSportDto.prototype, "color", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateSportDto.prototype, "config", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(SPORT_STATUSES),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateSportDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateSportDto.prototype, "sortOrder", void 0);
class AssignBranchesDto {
}
exports.AssignBranchesDto = AssignBranchesDto;
__decorate([
    (0, class_validator_1.IsArray)({ message: 'branchIds must be an array' }),
    (0, class_validator_1.IsUUID)('4', { each: true, message: 'Each branchId must be a valid UUID' }),
    __metadata("design:type", Array)
], AssignBranchesDto.prototype, "branchIds", void 0);
class SportStatusDto {
}
exports.SportStatusDto = SportStatusDto;
__decorate([
    (0, class_validator_1.IsEnum)(SPORT_STATUSES, {
        message: `status must be one of: ${SPORT_STATUSES.join(', ')}`,
    }),
    __metadata("design:type", Object)
], SportStatusDto.prototype, "status", void 0);
//# sourceMappingURL=create-sport.dto.js.map