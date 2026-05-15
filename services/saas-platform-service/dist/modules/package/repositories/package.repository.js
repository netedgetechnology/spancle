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
exports.PackageRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const package_entity_1 = require("../entities/package.entity");
let PackageRepository = class PackageRepository {
    constructor(repo) {
        this.repo = repo;
    }
    async create(data) {
        const entity = this.repo.create(data);
        return this.repo.save(entity);
    }
    async findAll(includeArchived = false) {
        const qb = this.repo
            .createQueryBuilder('p')
            .where('p.isDeleted = :deleted', { deleted: false });
        if (!includeArchived) {
            qb.andWhere('p.status != :archived', { archived: 'archived' });
        }
        return qb.orderBy('p.sortOrder', 'ASC').getMany();
    }
    async findActive() {
        return this.repo.find({
            where: { status: 'active', isDeleted: false },
            order: { sortOrder: 'ASC' },
        });
    }
    async findById(id) {
        return this.repo.findOne({ where: { id, isDeleted: false } });
    }
    async findBySlug(slug) {
        return this.repo.findOne({ where: { slug, isDeleted: false } });
    }
    async findByTierKey(tierKey) {
        return this.repo.findOne({ where: { tierKey, isDeleted: false } });
    }
    async isSlugTaken(slug, excludeId) {
        const qb = this.repo
            .createQueryBuilder('p')
            .where('p.slug = :slug AND p.isDeleted = false', { slug });
        if (excludeId) {
            qb.andWhere('p.id != :excludeId', { excludeId });
        }
        return (await qb.getCount()) > 0;
    }
    async isTierKeyTaken(tierKey, excludeId) {
        const qb = this.repo
            .createQueryBuilder('p')
            .where('p.tierKey = :tierKey AND p.isDeleted = false', { tierKey });
        if (excludeId) {
            qb.andWhere('p.id != :excludeId', { excludeId });
        }
        return (await qb.getCount()) > 0;
    }
    async update(id, data) {
        const existing = await this.repo.findOneOrFail({ where: { id } });
        const merged = this.repo.merge(existing, data, { updatedAt: new Date() });
        return this.repo.save(merged);
    }
    async updateStatus(id, status) {
        const now = new Date();
        const existing = await this.repo.findOneOrFail({ where: { id } });
        existing.status = status;
        existing.updatedAt = now;
        if (status === 'active' && !existing.publishedAt) {
            existing.publishedAt = now;
        }
        if (status === 'deprecated') {
            existing.deprecatedAt = now;
        }
        await this.repo.save(existing);
    }
    async softDelete(id) {
        await this.repo.update({ id }, { isDeleted: true, deletedAt: new Date() });
    }
    async count(status) {
        if (status) {
            return this.repo.count({ where: { status, isDeleted: false } });
        }
        return this.repo.count({ where: { isDeleted: false } });
    }
};
exports.PackageRepository = PackageRepository;
exports.PackageRepository = PackageRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(package_entity_1.PackageEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], PackageRepository);
//# sourceMappingURL=package.repository.js.map