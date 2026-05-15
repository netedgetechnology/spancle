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
exports.SportBranchRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const tenant_aware_repository_1 = require("../../../common/repositories/tenant-aware.repository");
const sport_branch_entity_1 = require("../entities/sport-branch.entity");
let SportBranchRepository = class SportBranchRepository extends tenant_aware_repository_1.TenantAwareRepository {
    constructor(dataSource) {
        super(sport_branch_entity_1.SportBranchEntity, dataSource.manager);
    }
    async findBySport(sportId, tenantId) {
        return this.scopedQb('sb', tenantId)
            .andWhere('sb.sportId = :sportId', { sportId })
            .orderBy('sb.sortOrder', 'ASC')
            .getMany();
    }
    async findByBranch(branchId, tenantId) {
        return this.scopedQb('sb', tenantId)
            .andWhere('sb.branchId = :branchId', { branchId })
            .orderBy('sb.sortOrder', 'ASC')
            .getMany();
    }
    async getBranchIdsForSport(sportId, tenantId) {
        const rows = await this.scopedQb('sb', tenantId)
            .select('sb.branchId', 'branchId')
            .andWhere('sb.sportId = :sportId', { sportId })
            .getRawMany();
        return rows.map((r) => r.branchId);
    }
    async replaceBranchMappings(sportId, branchIds, tenantId) {
        await this.entityManager
            .createQueryBuilder()
            .update(sport_branch_entity_1.SportBranchEntity)
            .set({
            isDeleted: true,
            deletedAt: new Date(),
            updatedAt: new Date(),
        })
            .where('sportId = :sportId AND tenantId = :tenantId AND isDeleted = false', {
            sportId,
            tenantId,
        })
            .execute();
        if (branchIds.length === 0)
            return;
        const entities = branchIds.map((branchId, i) => this.entityManager.create(sport_branch_entity_1.SportBranchEntity, {
            tenantId,
            sportId,
            branchId,
            sortOrder: i,
            isDeleted: false,
        }));
        await this.entityManager.save(sport_branch_entity_1.SportBranchEntity, entities);
    }
    async deleteAllForSport(sportId, tenantId) {
        await this.entityManager
            .createQueryBuilder()
            .update(sport_branch_entity_1.SportBranchEntity)
            .set({
            isDeleted: true,
            deletedAt: new Date(),
            updatedAt: new Date(),
        })
            .where('sportId = :sportId AND tenantId = :tenantId AND isDeleted = false', {
            sportId,
            tenantId,
        })
            .execute();
    }
    async existsMapping(sportId, branchId, tenantId) {
        return this.scopedQb('sb', tenantId)
            .andWhere('sb.sportId = :sportId AND sb.branchId = :branchId', {
            sportId,
            branchId,
        })
            .getCount()
            .then((c) => c > 0);
    }
};
exports.SportBranchRepository = SportBranchRepository;
exports.SportBranchRepository = SportBranchRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], SportBranchRepository);
//# sourceMappingURL=sport-branch.repository.js.map