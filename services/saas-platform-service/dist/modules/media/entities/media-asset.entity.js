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
exports.MediaAssetEntity = void 0;
const typeorm_1 = require("typeorm");
let MediaAssetEntity = class MediaAssetEntity {
};
exports.MediaAssetEntity = MediaAssetEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], MediaAssetEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], MediaAssetEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'original_name', type: 'varchar', length: 255, nullable: false }),
    __metadata("design:type", String)
], MediaAssetEntity.prototype, "originalName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'stored_name', type: 'varchar', length: 255, nullable: false }),
    __metadata("design:type", String)
], MediaAssetEntity.prototype, "storedName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'mime_type', type: 'varchar', length: 100, nullable: false }),
    __metadata("design:type", String)
], MediaAssetEntity.prototype, "mimeType", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'asset_type',
        type: 'enum',
        enum: ['image', 'video', 'document', 'audio', 'other'],
        default: 'other',
    }),
    __metadata("design:type", String)
], MediaAssetEntity.prototype, "assetType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'size_bytes', type: 'bigint', nullable: false }),
    __metadata("design:type", Number)
], MediaAssetEntity.prototype, "sizeBytes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 2048, nullable: false }),
    __metadata("design:type", String)
], MediaAssetEntity.prototype, "url", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'storage_path', type: 'varchar', length: 2048, nullable: false }),
    __metadata("design:type", String)
], MediaAssetEntity.prototype, "storagePath", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['local', 's3', 'gcs'],
        default: 'local',
    }),
    __metadata("design:type", String)
], MediaAssetEntity.prototype, "driver", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'alt_text', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], MediaAssetEntity.prototype, "altText", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], MediaAssetEntity.prototype, "caption", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'width_px', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], MediaAssetEntity.prototype, "widthPx", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'height_px', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], MediaAssetEntity.prototype, "heightPx", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'blur_hash', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], MediaAssetEntity.prototype, "blurHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reference_count', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], MediaAssetEntity.prototype, "referenceCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'uploaded_by', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], MediaAssetEntity.prototype, "uploadedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_deleted', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], MediaAssetEntity.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], MediaAssetEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], MediaAssetEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], MediaAssetEntity.prototype, "deletedAt", void 0);
exports.MediaAssetEntity = MediaAssetEntity = __decorate([
    (0, typeorm_1.Entity)('cms_media_assets'),
    (0, typeorm_1.Index)(['tenantId', 'mimeType']),
    (0, typeorm_1.Index)(['tenantId', 'assetType']),
    (0, typeorm_1.Index)(['tenantId', 'isDeleted'])
], MediaAssetEntity);
//# sourceMappingURL=media-asset.entity.js.map