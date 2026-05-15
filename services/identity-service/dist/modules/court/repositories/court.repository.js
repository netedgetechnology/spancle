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
exports.CourtRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const tenant_aware_repository_1 = require("../../../common/repositories/tenant-aware.repository");
const court_entity_1 = require("../entities/court.entity");
let CourtRepository = class CourtRepository extends tenant_aware_repository_1.TenantAwareRepository {
    constructor(dataSource) {
        super(court_entity_1.CourtEntity, dataSource.manager);
    }
    async findByBranch(branchId, tenantId, status) {
        const qb = this.scopedQb('c', tenantId)
            .andWhere('c.branchId = :branchId', { branchId });
        if (status) {
            qb.andWhere('c.status = :status', { status });
        }
        return qb
            .orderBy('c.courtNumber', 'ASC', 'NULLS LAST')
            .addOrderBy('c.sortOrder', 'ASC')
            .addOrderBy('c.name', 'ASC')
            .getMany();
    }
    async findBySport(sportId, tenantId, branchId) {
        const qb = this.scopedQb('c', tenantId)
            .andWhere('c.sportId = :sportId', { sportId });
        if (branchId) {
            qb.andWhere('c.branchId = :branchId', { branchId });
        }
        return qb
            .orderBy('c.branchId', 'ASC')
            .addOrderBy('c.courtNumber', 'ASC', 'NULLS LAST')
            .getMany();
    }
    async findByStatus(status, tenantId) {
        return this.scopedQb('c', tenantId)
            .andWhere('c.status = :status', { status })
            .orderBy('c.branchId', 'ASC')
            .addOrderBy('c.courtNumber', 'ASC', 'NULLS LAST')
            .getMany();
    }
    async isNameTakenInBranch(name, branchId, tenantId, excludeId) {
        const qb = this.scopedQb('c', tenantId)
            .andWhere('c.branchId = :branchId', { branchId })
            .andWhere('LOWER(c.name) = LOWER(:name)', { name });
        if (excludeId) {
            qb.andWhere('c.id != :excludeId', { excludeId });
        }
        return (await qb.getCount()) > 0;
    }
    async getExistingNamesForBranch(branchId, tenantId) {
        const rows = await this.scopedQb('c', tenantId)
            .select('LOWER(c.name)', 'name')
            .andWhere('c.branchId = :branchId', { branchId })
            .getRawMany();
        return new Set(rows.map((r) => r.name));
    }
    async countByBranch(branchId, tenantId) {
        return this.scopedQb('c', tenantId)
            .andWhere('c.branchId = :branchId', { branchId })
            .getCount();
    }
    async countByStatus(tenantId) {
        const rows = await this.scopedQb('c', tenantId)
            .select('c.status', 'status')
            .addSelect('COUNT(c.id)::int', 'count')
            .groupBy('c.status')
            .getRawMany();
        const counts = {
            available: 0, unavailable: 0, maintenance: 0, retired: 0,
        };
        for (const row of rows) {
            counts[row.status] = Number(row.count);
        }
        return counts;
    }
    async countInMaintenance(tenantId) {
        return this.scopedQb('c', tenantId)
            .andWhere('c.status = :status', { status: 'maintenance' })
            .getCount();
    }
};
exports.CourtRepository = CourtRepository;
exports.CourtRepository = CourtRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], CourtRepository);
//# sourceMappingURL=court.repository.js.map