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
exports.SeoFieldsDto = exports.SEO_ROBOTS_OPTIONS = void 0;
const class_validator_1 = require("class-validator");
exports.SEO_ROBOTS_OPTIONS = [
    'index,follow',
    'noindex,follow',
    'index,nofollow',
    'noindex,nofollow',
];
/**
 * SeoFieldsDto — embedded DTO for SEO metadata.
 *
 * Used via @ValidateNested() + @Type(() => SeoFieldsDto) inside
 * CreatePageDto, CreateBlogPostDto, CreateBannerDto.
 *
 * All fields are optional — SEO metadata is supplementary, not required.
 */
class SeoFieldsDto {
}
exports.SeoFieldsDto = SeoFieldsDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(120, { message: 'SEO title must not exceed 120 characters' }),
    __metadata("design:type", String)
], SeoFieldsDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(320, { message: 'SEO description must not exceed 320 characters' }),
    __metadata("design:type", String)
], SeoFieldsDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], SeoFieldsDto.prototype, "keywords", void 0);
__decorate([
    (0, class_validator_1.IsUrl)({}, { message: 'Canonical URL must be a valid URL' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SeoFieldsDto.prototype, "canonicalUrl", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(exports.SEO_ROBOTS_OPTIONS, {
        message: `robots must be one of: ${exports.SEO_ROBOTS_OPTIONS.join(', ')}`,
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SeoFieldsDto.prototype, "robots", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], SeoFieldsDto.prototype, "ogTitle", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(320),
    __metadata("design:type", String)
], SeoFieldsDto.prototype, "ogDescription", void 0);
__decorate([
    (0, class_validator_1.IsUrl)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SeoFieldsDto.prototype, "ogImageUrl", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(32),
    __metadata("design:type", String)
], SeoFieldsDto.prototype, "ogType", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['summary', 'summary_large_image', 'player', 'app']),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SeoFieldsDto.prototype, "twitterCard", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], SeoFieldsDto.prototype, "twitterTitle", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(320),
    __metadata("design:type", String)
], SeoFieldsDto.prototype, "twitterDescription", void 0);
__decorate([
    (0, class_validator_1.IsUrl)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SeoFieldsDto.prototype, "twitterImageUrl", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], SeoFieldsDto.prototype, "schemaJsonLd", void 0);
//# sourceMappingURL=seo-fields.dto.js.map