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
var CommercialRuleRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommercialAuditRepository = exports.FeatureFlagRepository = exports.GatewayCredentialRepository = exports.GatewayDefinitionRepository = exports.RevenueDistributionPolicyRepository = exports.PaymentOwnershipPolicyRepository = exports.PricingModelRepository = exports.ModuleRegistryRepository = exports.CommercialProductRepository = exports.PackageVersionRepository = exports.PackageDefinitionRepository = exports.CommercialDecisionSnapshotRepository = exports.CommercialRuleVersionRepository = exports.CommercialRuleRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const commercial_rule_entity_1 = require("./entities/commercial-rule.entity");
const commercial_rule_version_entity_1 = require("./entities/commercial-rule-version.entity");
const commercial_snapshot_and_package_entity_1 = require("./entities/commercial-snapshot-and-package.entity");
const commercial_product_module_pricing_entity_1 = require("./entities/commercial-product-module-pricing.entity");
const commercial_policy_gateway_flag_audit_entity_1 = require("./entities/commercial-policy-gateway-flag-audit.entity");
const commercial_enums_1 = require("./enums/commercial.enums");
let CommercialRuleRepository = CommercialRuleRepository_1 = class CommercialRuleRepository {
    constructor(repo) {
        this.repo = repo;
        this.logger = new common_1.Logger(CommercialRuleRepository_1.name);
    }
    async create(data) {
        return this.repo.save(this.repo.create(data));
    }
    async findById(id) {
        return this.repo.findOne({ where: { id, isDeleted: false } });
    }
    async findByIdOrFail(id) {
        const entity = await this.findById(id);
        if (!entity)
            throw new common_1.NotFoundException(`CommercialRule ${id} not found`);
        return entity;
    }
    async findByTenant(tenantId) {
        return this.repo.find({ where: { tenantId: tenantId ?? (0, typeorm_2.IsNull)(), isDeleted: false } });
    }
    async findActiveByTenant(tenantId) {
        return this.repo.find({
            where: { tenantId: tenantId ?? (0, typeorm_2.IsNull)(), status: commercial_enums_1.CommercialRuleStatus.ACTIVE, isDeleted: false },
        });
    }
    async update(id, data) {
        await this.repo.update({ id }, data);
        return this.findByIdOrFail(id);
    }
    async softDelete(id, actorId) {
        await this.repo.update({ id }, { isDeleted: true, deletedAt: new Date(), updatedById: actorId });
    }
};
exports.CommercialRuleRepository = CommercialRuleRepository;
exports.CommercialRuleRepository = CommercialRuleRepository = CommercialRuleRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(commercial_rule_entity_1.CommercialRuleEntity)),
    __metadata("design:paramtypes", [Function])
], CommercialRuleRepository);
let CommercialRuleVersionRepository = class CommercialRuleVersionRepository {
    constructor(repo) {
        this.repo = repo;
    }
    async create(data) {
        return this.repo.save(this.repo.create(data));
    }
    async findByRule(ruleId) {
        return this.repo.find({ where: { ruleId }, order: { createdAt: 'DESC' } });
    }
    async findByRuleAndVersion(ruleId, version) {
        return this.repo.findOne({ where: { ruleId, version } });
    }
};
exports.CommercialRuleVersionRepository = CommercialRuleVersionRepository;
exports.CommercialRuleVersionRepository = CommercialRuleVersionRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(commercial_rule_version_entity_1.CommercialRuleVersionEntity)),
    __metadata("design:paramtypes", [Function])
], CommercialRuleVersionRepository);
let CommercialDecisionSnapshotRepository = class CommercialDecisionSnapshotRepository {
    constructor(repo) {
        this.repo = repo;
    }
    async create(data) {
        return this.repo.save(this.repo.create(data));
    }
    async findBySubject(tenantId, subjectType, subjectId) {
        return this.repo.find({
            where: { tenantId: tenantId ?? (0, typeorm_2.IsNull)(), subjectType, subjectId },
            order: { createdAt: 'DESC' },
        });
    }
    async findByRule(tenantId, ruleId) {
        return this.repo.find({
            where: { tenantId: tenantId ?? (0, typeorm_2.IsNull)(), ruleId },
            order: { createdAt: 'DESC' },
        });
    }
};
exports.CommercialDecisionSnapshotRepository = CommercialDecisionSnapshotRepository;
exports.CommercialDecisionSnapshotRepository = CommercialDecisionSnapshotRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(commercial_snapshot_and_package_entity_1.CommercialDecisionSnapshotEntity)),
    __metadata("design:paramtypes", [Function])
], CommercialDecisionSnapshotRepository);
let PackageDefinitionRepository = class PackageDefinitionRepository {
    constructor(repo) {
        this.repo = repo;
    }
    async create(data) {
        return this.repo.save(this.repo.create(data));
    }
    async findAll() {
        return this.repo.find({ where: { isDeleted: false }, order: { sortOrder: 'ASC' } });
    }
    async findById(id) {
        return this.repo.findOne({ where: { id, isDeleted: false } });
    }
    async findBySlug(slug) {
        return this.repo.findOne({ where: { slug, isDeleted: false } });
    }
    async update(id, data) {
        await this.repo.update({ id }, data);
        const updated = await this.findById(id);
        if (!updated)
            throw new common_1.NotFoundException(`PackageDefinition ${id} not found`);
        return updated;
    }
};
exports.PackageDefinitionRepository = PackageDefinitionRepository;
exports.PackageDefinitionRepository = PackageDefinitionRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(commercial_snapshot_and_package_entity_1.PackageDefinitionEntity)),
    __metadata("design:paramtypes", [Function])
], PackageDefinitionRepository);
let PackageVersionRepository = class PackageVersionRepository {
    constructor(repo) {
        this.repo = repo;
    }
    async create(data) {
        return this.repo.save(this.repo.create(data));
    }
    async findByPackage(packageDefinitionId) {
        return this.repo.find({ where: { packageDefinitionId }, order: { createdAt: 'DESC' } });
    }
    async findByPackageAndVersion(packageDefinitionId, version) {
        return this.repo.findOne({ where: { packageDefinitionId, version } });
    }
};
exports.PackageVersionRepository = PackageVersionRepository;
exports.PackageVersionRepository = PackageVersionRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(commercial_snapshot_and_package_entity_1.PackageVersionEntity)),
    __metadata("design:paramtypes", [Function])
], PackageVersionRepository);
let CommercialProductRepository = class CommercialProductRepository {
    constructor(repo) {
        this.repo = repo;
    }
    async create(data) {
        return this.repo.save(this.repo.create(data));
    }
    async findAll() {
        return this.repo.find({ where: { isDeleted: false } });
    }
    async findById(id) {
        return this.repo.findOne({ where: { id, isDeleted: false } });
    }
    async findBySku(sku) {
        return this.repo.findOne({ where: { sku, isDeleted: false } });
    }
};
exports.CommercialProductRepository = CommercialProductRepository;
exports.CommercialProductRepository = CommercialProductRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(commercial_product_module_pricing_entity_1.CommercialProductEntity)),
    __metadata("design:paramtypes", [Function])
], CommercialProductRepository);
let ModuleRegistryRepository = class ModuleRegistryRepository {
    constructor(repo) {
        this.repo = repo;
    }
    async findAll() {
        return this.repo.find({ where: { isActive: true } });
    }
    async findByKey(key) {
        return this.repo.findOne({ where: { key } });
    }
    async upsert(data) {
        const existing = data.key ? await this.findByKey(data.key) : null;
        if (existing) {
            await this.repo.update({ id: existing.id }, data);
            return this.repo.findOneOrFail({ where: { id: existing.id } });
        }
        return this.repo.save(this.repo.create(data));
    }
};
exports.ModuleRegistryRepository = ModuleRegistryRepository;
exports.ModuleRegistryRepository = ModuleRegistryRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(commercial_product_module_pricing_entity_1.ModuleRegistryEntity)),
    __metadata("design:paramtypes", [Function])
], ModuleRegistryRepository);
let PricingModelRepository = class PricingModelRepository {
    constructor(repo) {
        this.repo = repo;
    }
    async create(data) {
        return this.repo.save(this.repo.create(data));
    }
    async findById(id) {
        return this.repo.findOne({ where: { id, isDeleted: false } });
    }
    async findByTenant(tenantId) {
        return this.repo.find({ where: { tenantId: tenantId ?? (0, typeorm_2.IsNull)(), isActive: true, isDeleted: false } });
    }
};
exports.PricingModelRepository = PricingModelRepository;
exports.PricingModelRepository = PricingModelRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(commercial_product_module_pricing_entity_1.PricingModelEntity)),
    __metadata("design:paramtypes", [Function])
], PricingModelRepository);
let PaymentOwnershipPolicyRepository = class PaymentOwnershipPolicyRepository {
    constructor(repo) {
        this.repo = repo;
    }
    async create(data) {
        return this.repo.save(this.repo.create(data));
    }
    async findByTenant(tenantId) {
        return this.repo.find({ where: { tenantId: tenantId ?? (0, typeorm_2.IsNull)(), isActive: true, isDeleted: false } });
    }
};
exports.PaymentOwnershipPolicyRepository = PaymentOwnershipPolicyRepository;
exports.PaymentOwnershipPolicyRepository = PaymentOwnershipPolicyRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(commercial_policy_gateway_flag_audit_entity_1.PaymentOwnershipPolicyEntity)),
    __metadata("design:paramtypes", [Function])
], PaymentOwnershipPolicyRepository);
let RevenueDistributionPolicyRepository = class RevenueDistributionPolicyRepository {
    constructor(repo) {
        this.repo = repo;
    }
    async create(data) {
        return this.repo.save(this.repo.create(data));
    }
    async findByTenant(tenantId) {
        return this.repo.find({ where: { tenantId: tenantId ?? (0, typeorm_2.IsNull)(), isActive: true, isDeleted: false } });
    }
};
exports.RevenueDistributionPolicyRepository = RevenueDistributionPolicyRepository;
exports.RevenueDistributionPolicyRepository = RevenueDistributionPolicyRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(commercial_policy_gateway_flag_audit_entity_1.RevenueDistributionPolicyEntity)),
    __metadata("design:paramtypes", [Function])
], RevenueDistributionPolicyRepository);
let GatewayDefinitionRepository = class GatewayDefinitionRepository {
    constructor(repo) {
        this.repo = repo;
    }
    async findAll() {
        return this.repo.find({ where: { isActive: true } });
    }
    async findById(id) {
        return this.repo.findOne({ where: { id } });
    }
};
exports.GatewayDefinitionRepository = GatewayDefinitionRepository;
exports.GatewayDefinitionRepository = GatewayDefinitionRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(commercial_policy_gateway_flag_audit_entity_1.GatewayDefinitionEntity)),
    __metadata("design:paramtypes", [Function])
], GatewayDefinitionRepository);
let GatewayCredentialRepository = class GatewayCredentialRepository {
    constructor(repo) {
        this.repo = repo;
    }
    async upsert(data) {
        const existing = await this.repo.findOne({
            where: { tenantId: data.tenantId ? data.tenantId : (0, typeorm_2.IsNull)(), gatewayDefinitionId: data.gatewayDefinitionId },
        });
        if (existing) {
            await this.repo.update({ id: existing.id }, data);
            return this.repo.findOneOrFail({ where: { id: existing.id } });
        }
        return this.repo.save(this.repo.create(data));
    }
    async findByTenant(tenantId) {
        return this.repo.find({ where: { tenantId: tenantId ? tenantId : (0, typeorm_2.IsNull)(), isActive: true } });
    }
};
exports.GatewayCredentialRepository = GatewayCredentialRepository;
exports.GatewayCredentialRepository = GatewayCredentialRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(commercial_policy_gateway_flag_audit_entity_1.GatewayCredentialEntity)),
    __metadata("design:paramtypes", [Function])
], GatewayCredentialRepository);
let FeatureFlagRepository = class FeatureFlagRepository {
    constructor(repo) {
        this.repo = repo;
    }
    async upsert(data) {
        const existing = await this.repo.findOne({
            where: { tenantId: data.tenantId ? data.tenantId : (0, typeorm_2.IsNull)(), key: data.key },
        });
        if (existing) {
            await this.repo.update({ id: existing.id }, data);
            return this.repo.findOneOrFail({ where: { id: existing.id } });
        }
        return this.repo.save(this.repo.create(data));
    }
    async findByTenant(tenantId) {
        return this.repo.find({ where: { tenantId: tenantId ?? (0, typeorm_2.IsNull)() } });
    }
    async findByKey(tenantId, key) {
        return this.repo.findOne({ where: { tenantId: tenantId ?? (0, typeorm_2.IsNull)(), key } });
    }
};
exports.FeatureFlagRepository = FeatureFlagRepository;
exports.FeatureFlagRepository = FeatureFlagRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(commercial_policy_gateway_flag_audit_entity_1.FeatureFlagEntity)),
    __metadata("design:paramtypes", [Function])
], FeatureFlagRepository);
let CommercialAuditRepository = class CommercialAuditRepository {
    constructor(repo) {
        this.repo = repo;
    }
    async log(data) {
        return this.repo.save(this.repo.create(data));
    }
    async findByTenant(tenantId, limit = 50) {
        return this.repo.find({
            where: { tenantId: tenantId ?? (0, typeorm_2.IsNull)() },
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }
    async findByTarget(targetId, limit = 50) {
        return this.repo.find({
            where: { targetId },
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }
};
exports.CommercialAuditRepository = CommercialAuditRepository;
exports.CommercialAuditRepository = CommercialAuditRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(commercial_policy_gateway_flag_audit_entity_1.CommercialAuditEntity)),
    __metadata("design:paramtypes", [Function])
], CommercialAuditRepository);
//# sourceMappingURL=commercial.repositories.js.map