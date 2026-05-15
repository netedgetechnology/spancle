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
exports.CloneSectionDto = exports.ReorderSectionsDto = exports.UpdateHomepageSectionDto = exports.CreateHomepageSectionDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const section_payload_types_1 = require("../types/section-payload.types");
class CreateHomepageSectionDto {
}
exports.CreateHomepageSectionDto = CreateHomepageSectionDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateHomepageSectionDto.prototype, "pageId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(section_payload_types_1.SECTION_TYPES, {
        message: `sectionType must be one of: ${section_payload_types_1.SECTION_TYPES.join(', ')}`,
    }),
    __metadata("design:type", Object)
], CreateHomepageSectionDto.prototype, "sectionType", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateHomepageSectionDto.prototype, "adminLabel", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateHomepageSectionDto.prototype, "payload", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateHomepageSectionDto.prototype, "sortOrder", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['draft', 'published', 'archived']),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateHomepageSectionDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateHomepageSectionDto.prototype, "isVisible", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], CreateHomepageSectionDto.prototype, "abVariant", void 0);
class UpdateHomepageSectionDto {
}
exports.UpdateHomepageSectionDto = UpdateHomepageSectionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], UpdateHomepageSectionDto.prototype, "adminLabel", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateHomepageSectionDto.prototype, "payload", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateHomepageSectionDto.prototype, "sortOrder", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['draft', 'published', 'archived']),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateHomepageSectionDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateHomepageSectionDto.prototype, "isVisible", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], UpdateHomepageSectionDto.prototype, "abVariant", void 0);
class SectionOrderItem {
}
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], SectionOrderItem.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], SectionOrderItem.prototype, "sortOrder", void 0);
class ReorderSectionsDto {
}
exports.ReorderSectionsDto = ReorderSectionsDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ReorderSectionsDto.prototype, "pageId", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => SectionOrderItem),
    __metadata("design:type", Array)
], ReorderSectionsDto.prototype, "sections", void 0);
class CloneSectionDto {
}
exports.CloneSectionDto = CloneSectionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CloneSectionDto.prototype, "adminLabel", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CloneSectionDto.prototype, "targetPageId", void 0);
//# sourceMappingURL=create-homepage-section.dto.js.map