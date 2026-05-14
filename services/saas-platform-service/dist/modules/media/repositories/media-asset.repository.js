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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaAssetRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const tenant_aware_repository_1 = require("../../../common/repositories/tenant-aware.repository");
const media_asset_entity_1 = require("../entities/media-asset.entity");
let MediaAssetRepository = class MediaAssetRepository extends tenant_aware_repository_1.TenantAwareRepository {
    constructor(dataSource) {
        super(media_asset_entity_1.MediaAssetEntity, dataSource.manager);
    }
    async findByType(assetType, tenantId, page = 1, limit = 20) {
        const [data, total] = await this.scopedQb('m', tenantId)
            .andWhere('m.assetType = :assetType', { assetType })
            .orderBy('m.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();
        return { data, total };
    }
    async findOrphaned(tenantId) {
        return this.scopedQb('m', tenantId)
            .andWhere('m.referenceCount = 0')
            .orderBy('m.createdAt', 'ASC')
            .getMany();
    }
    async adjustReferenceCount(id, tenantId, delta) {
        await this.entityManager
            .createQueryBuilder()
            .update(media_asset_entity_1.MediaAssetEntity)
            .set({ referenceCount: () => `GREATEST(0, "reference_count" + ${delta})` })
            .where('id = :id AND tenantId = :tenantId', { id, tenantId })
            .execute();
    }
    async findByStoredName(storedName, tenantId) {
        return this.scopedQb('m', tenantId)
            .andWhere('m.storedName = :storedName', { storedName })
            .getOne();
    }
    async findPaginated(tenantId, page = 1, limit = 20, alias = 'm') {
        const [data, total] = await this.scopedQb(alias, tenantId)
            .orderBy(`${alias}.createdAt`, 'DESC')
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();
        return { data, total };
    }
};
exports.MediaAssetRepository = MediaAssetRepository;
exports.MediaAssetRepository = MediaAssetRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], MediaAssetRepository);
//# sourceMappingURL=media-asset.repository.js.map