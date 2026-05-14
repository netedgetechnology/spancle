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
exports.PlanRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const plan_entity_1 = require("../entities/plan.entity");
let PlanRepository = class PlanRepository {
    constructor(repo) {
        this.repo = repo;
    }
    async create(data) {
        const entity = this.repo.create(data);
        return this.repo.save(entity);
    }
    async findByTenant(tenantId) {
        return this.repo.findOne({ where: { tenantId, isActive: true, isDeleted: false } });
    }
    async findById(id) {
        return this.repo.findOne({ where: { id, isDeleted: false } });
    }
    async update(id, data) {
        await this.repo.update({ id }, { ...data, updatedAt: new Date() });
        return this.repo.findOneOrFail({ where: { id } });
    }
    async deactivateByTenant(tenantId) {
        await this.repo.update({ tenantId, isActive: true }, { isActive: false, updatedAt: new Date() });
    }
    async softDelete(id) {
        await this.repo.update({ id }, { isDeleted: true, deletedAt: new Date() });
    }
};
exports.PlanRepository = PlanRepository;
exports.PlanRepository = PlanRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(plan_entity_1.PlanEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], PlanRepository);
//# sourceMappingURL=plan.repository.js.map