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
exports.GenerateCourtsDto = exports.MaintenanceDto = exports.CourtStatusDto = exports.UpdateCourtDto = exports.CreateCourtDto = exports.SURFACE_TYPES = exports.COURT_TYPES = exports.COURT_STATUSES = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const create_branch_dto_1 = require("../../branch/dto/create-branch.dto");
exports.COURT_STATUSES = ['available', 'unavailable', 'maintenance', 'retired'];
exports.COURT_TYPES = ['indoor', 'outdoor'];
exports.SURFACE_TYPES = [
    'grass', 'artificial_grass', 'hard_court', 'clay', 'carpet',
    'wood', 'rubber', 'sand', 'water', 'ice', 'other',
];
class CreateCourtDto {
}
exports.CreateCourtDto = CreateCourtDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateCourtDto.prototype, "branchId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCourtDto.prototype, "sportId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateCourtDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], CreateCourtDto.prototype, "code", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], CreateCourtDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(exports.COURT_TYPES, {
        message: `courtType must be one of: ${exports.COURT_TYPES.join(', ')}`,
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateCourtDto.prototype, "courtType", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(exports.SURFACE_TYPES, {
        message: `surfaceType must be one of: ${exports.SURFACE_TYPES.join(', ')}`,
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateCourtDto.prototype, "surfaceType", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateCourtDto.prototype, "capacity", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(10),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateCourtDto.prototype, "maxBookingsConcurrent", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], CreateCourtDto.prototype, "dimensions", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(exports.COURT_STATUSES),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateCourtDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => create_branch_dto_1.WeeklyTimingsDto),
    __metadata("design:type", create_branch_dto_1.WeeklyTimingsDto)
], CreateCourtDto.prototype, "operatingHours", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateCourtDto.prototype, "courtNumber", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateCourtDto.prototype, "sortOrder", void 0);
__decorate([
    (0, class_validator_1.IsUrl)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(2048),
    __metadata("design:type", String)
], CreateCourtDto.prototype, "imageUrl", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], CreateCourtDto.prototype, "amenities", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateCourtDto.prototype, "hourlyRateMinor", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateCourtDto.prototype, "rateCardId", void 0);
class UpdateCourtDto {
}
exports.UpdateCourtDto = UpdateCourtDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateCourtDto.prototype, "sportId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], UpdateCourtDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], UpdateCourtDto.prototype, "code", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], UpdateCourtDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(exports.COURT_TYPES),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateCourtDto.prototype, "courtType", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(exports.SURFACE_TYPES),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateCourtDto.prototype, "surfaceType", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateCourtDto.prototype, "capacity", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(10),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateCourtDto.prototype, "maxBookingsConcurrent", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], UpdateCourtDto.prototype, "dimensions", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(exports.COURT_STATUSES),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateCourtDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => create_branch_dto_1.WeeklyTimingsDto),
    __metadata("design:type", Object)
], UpdateCourtDto.prototype, "operatingHours", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateCourtDto.prototype, "sortOrder", void 0);
__decorate([
    (0, class_validator_1.IsUrl)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(2048),
    __metadata("design:type", String)
], UpdateCourtDto.prototype, "imageUrl", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], UpdateCourtDto.prototype, "amenities", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateCourtDto.prototype, "hourlyRateMinor", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateCourtDto.prototype, "rateCardId", void 0);
class CourtStatusDto {
}
exports.CourtStatusDto = CourtStatusDto;
__decorate([
    (0, class_validator_1.IsEnum)(exports.COURT_STATUSES, {
        message: `status must be one of: ${exports.COURT_STATUSES.join(', ')}`,
    }),
    __metadata("design:type", Object)
], CourtStatusDto.prototype, "status", void 0);
class MaintenanceDto {
}
exports.MaintenanceDto = MaintenanceDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], MaintenanceDto.prototype, "maintenanceNote", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], MaintenanceDto.prototype, "maintenanceExpectedEnd", void 0);
class GenerateCourtsDto {
}
exports.GenerateCourtsDto = GenerateCourtsDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], GenerateCourtsDto.prototype, "branchId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], GenerateCourtsDto.prototype, "sportId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], GenerateCourtsDto.prototype, "namePrefix", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(5),
    __metadata("design:type", String)
], GenerateCourtsDto.prototype, "separator", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], GenerateCourtsDto.prototype, "startNumber", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(50),
    __metadata("design:type", Number)
], GenerateCourtsDto.prototype, "count", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(exports.COURT_TYPES),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], GenerateCourtsDto.prototype, "courtType", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(exports.SURFACE_TYPES),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], GenerateCourtsDto.prototype, "surfaceType", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], GenerateCourtsDto.prototype, "capacity", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => create_branch_dto_1.WeeklyTimingsDto),
    __metadata("design:type", create_branch_dto_1.WeeklyTimingsDto)
], GenerateCourtsDto.prototype, "operatingHours", void 0);
//# sourceMappingURL=create-court.dto.js.map