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
exports.CommercialRuleEntity = void 0;
const typeorm_1 = require("typeorm");
const commercial_enums_1 = require("../enums/commercial.enums");
let CommercialRuleEntity = class CommercialRuleEntity {
};
exports.CommercialRuleEntity = CommercialRuleEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CommercialRuleEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Object)
], CommercialRuleEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'name', type: 'varchar', length: 255, nullable: false }),
    __metadata("design:type", String)
], CommercialRuleEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'description', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], CommercialRuleEntity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'rule_type', type: 'varchar', length: 64, nullable: false }),
    __metadata("design:type", String)
], CommercialRuleEntity.prototype, "ruleType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'status', type: 'varchar', length: 32, nullable: false, default: commercial_enums_1.CommercialRuleStatus.DRAFT }),
    __metadata("design:type", String)
], CommercialRuleEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'active_version', type: 'varchar', length: 32, nullable: true }),
    __metadata("design:type", Object)
], CommercialRuleEntity.prototype, "activeVersion", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tags', type: 'jsonb', nullable: false, default: '[]' }),
    __metadata("design:type", Array)
], CommercialRuleEntity.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'metadata', type: 'jsonb', nullable: false, default: '{}' }),
    __metadata("design:type", Object)
], CommercialRuleEntity.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_deleted', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], CommercialRuleEntity.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], CommercialRuleEntity.prototype, "createdById", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'updated_by_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], CommercialRuleEntity.prototype, "updatedById", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], CommercialRuleEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], CommercialRuleEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], CommercialRuleEntity.prototype, "deletedAt", void 0);
exports.CommercialRuleEntity = CommercialRuleEntity = __decorate([
    (0, typeorm_1.Entity)('commercial_rules'),
    (0, typeorm_1.Index)(['tenantId', 'status']),
    (0, typeorm_1.Index)(['tenantId', 'ruleType'])
], CommercialRuleEntity);
//# sourceMappingURL=commercial-rule.entity.js.map