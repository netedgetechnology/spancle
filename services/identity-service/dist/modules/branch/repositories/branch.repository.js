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
exports.BranchRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const tenant_aware_repository_1 = require("../../../common/repositories/tenant-aware.repository");
const branch_entity_1 = require("../entities/branch.entity");
let BranchRepository = class BranchRepository extends tenant_aware_repository_1.TenantAwareRepository {
    constructor(dataSource) {
        super(branch_entity_1.BranchEntity, dataSource.manager);
    }
    async findBySlug(slug, tenantId) {
        return this.scopedQb('b', tenantId)
            .andWhere('b.slug = :slug', { slug })
            .getOne();
    }
    async findByStatus(status, tenantId) {
        return this.scopedQb('b', tenantId)
            .andWhere('b.status = :status', { status })
            .orderBy('b.sortOrder', 'ASC')
            .addOrderBy('b.name', 'ASC')
            .getMany();
    }
    async findByManager(managerUserId, tenantId) {
        return this.scopedQb('b', tenantId)
            .andWhere('b.managerUserId = :managerUserId', { managerUserId })
            .orderBy('b.sortOrder', 'ASC')
            .getMany();
    }
    async isSlugTaken(slug, tenantId, excludeId) {
        const qb = this.scopedQb('b', tenantId)
            .andWhere('b.slug = :slug', { slug });
        if (excludeId) {
            qb.andWhere('b.id != :excludeId', { excludeId });
        }
        return (await qb.getCount()) > 0;
    }
    async countByStatus(tenantId) {
        const rows = await this.scopedQb('b', tenantId)
            .select('b.status', 'status')
            .addSelect('COUNT(b.id)::int', 'count')
            .groupBy('b.status')
            .getRawMany();
        const initial = {
            active: 0, inactive: 0, suspended: 0, archived: 0,
        };
        return rows.reduce((acc, r) => {
            acc[r.status] = Number(r.count);
            return acc;
        }, initial);
    }
};
exports.BranchRepository = BranchRepository;
exports.BranchRepository = BranchRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], BranchRepository);
//# sourceMappingURL=branch.repository.js.map