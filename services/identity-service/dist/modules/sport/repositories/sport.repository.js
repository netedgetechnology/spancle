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
exports.SportRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const tenant_aware_repository_1 = require("../../../common/repositories/tenant-aware.repository");
const sport_entity_1 = require("../entities/sport.entity");
let SportRepository = class SportRepository extends tenant_aware_repository_1.TenantAwareRepository {
    constructor(dataSource) {
        super(sport_entity_1.SportEntity, dataSource.manager);
    }
    async findBySlug(slug, tenantId) {
        return this.scopedQb('s', tenantId)
            .andWhere('s.slug = :slug', { slug })
            .getOne();
    }
    async findByStatus(status, tenantId) {
        return this.scopedQb('s', tenantId)
            .andWhere('s.status = :status', { status })
            .orderBy('s.sortOrder', 'ASC')
            .addOrderBy('s.name', 'ASC')
            .getMany();
    }
    /**
     * Returns all sports assigned to a specific branch (via sport_branches join).
     * Only active sports are returned.
     */
    async findByBranch(branchId, tenantId) {
        return this.scopedQb('s', tenantId)
            .innerJoin('sport_branches', 'sb', 'sb.sport_id = s.id AND sb.branch_id = :branchId AND sb.tenant_id = :tenantId AND sb.is_deleted = false', { branchId, tenantId })
            .andWhere('s.status = :status', { status: 'active' })
            .orderBy('s.sortOrder', 'ASC')
            .getMany();
    }
    async isSlugTaken(slug, tenantId, excludeId) {
        const qb = this.scopedQb('s', tenantId)
            .andWhere('s.slug = :slug', { slug });
        if (excludeId) {
            qb.andWhere('s.id != :excludeId', { excludeId });
        }
        return (await qb.getCount()) > 0;
    }
    async countByStatus(tenantId) {
        const rows = await this.scopedQb('s', tenantId)
            .select('s.status', 'status')
            .addSelect('COUNT(s.id)::int', 'count')
            .groupBy('s.status')
            .getRawMany();
        const counts = { active: 0, inactive: 0 };
        for (const row of rows) {
            counts[row.status] = Number(row.count);
        }
        return counts;
    }
};
exports.SportRepository = SportRepository;
exports.SportRepository = SportRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], SportRepository);
//# sourceMappingURL=sport.repository.js.map