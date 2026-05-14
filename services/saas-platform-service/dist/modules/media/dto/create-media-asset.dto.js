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
exports.UpdateMediaAssetDto = exports.CreateMediaAssetDto = void 0;
const class_validator_1 = require("class-validator");
const ASSET_TYPES = ['image', 'video', 'document', 'audio', 'other'];
const DRIVERS = ['local', 's3', 'gcs'];
class CreateMediaAssetDto {
}
exports.CreateMediaAssetDto = CreateMediaAssetDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateMediaAssetDto.prototype, "originalName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateMediaAssetDto.prototype, "storedName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateMediaAssetDto.prototype, "mimeType", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(ASSET_TYPES),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateMediaAssetDto.prototype, "assetType", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsPositive)(),
    __metadata("design:type", Number)
], CreateMediaAssetDto.prototype, "sizeBytes", void 0);
__decorate([
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], CreateMediaAssetDto.prototype, "url", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(2048),
    __metadata("design:type", String)
], CreateMediaAssetDto.prototype, "storagePath", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(DRIVERS),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateMediaAssetDto.prototype, "driver", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateMediaAssetDto.prototype, "altText", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CreateMediaAssetDto.prototype, "caption", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateMediaAssetDto.prototype, "widthPx", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateMediaAssetDto.prototype, "heightPx", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateMediaAssetDto.prototype, "blurHash", void 0);
class UpdateMediaAssetDto {
}
exports.UpdateMediaAssetDto = UpdateMediaAssetDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], UpdateMediaAssetDto.prototype, "altText", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], UpdateMediaAssetDto.prototype, "caption", void 0);
//# sourceMappingURL=create-media-asset.dto.js.map