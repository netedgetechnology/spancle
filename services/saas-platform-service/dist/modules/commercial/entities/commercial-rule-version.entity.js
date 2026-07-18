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
exports.CommercialRuleVersionEntity = void 0;
const typeorm_1 = require("typeorm");
const commercial_enums_1 = require("../enums/commercial.enums");
let CommercialRuleVersionEntity = class CommercialRuleVersionEntity {
};
exports.CommercialRuleVersionEntity = CommercialRuleVersionEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CommercialRuleVersionEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Object)
], CommercialRuleVersionEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'rule_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], CommercialRuleVersionEntity.prototype, "ruleId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'version', type: 'varchar', length: 32, nullable: false }),
    __metadata("design:type", String)
], CommercialRuleVersionEntity.prototype, "version", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'rule_type', type: 'varchar', length: 64, nullable: false }),
    __metadata("design:type", String)
], CommercialRuleVersionEntity.prototype, "ruleType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'definition', type: 'jsonb', nullable: false, default: '{}' }),
    __metadata("design:type", Object)
], CommercialRuleVersionEntity.prototype, "definition", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'changelog', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], CommercialRuleVersionEntity.prototype, "changelog", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], CommercialRuleVersionEntity.prototype, "createdById", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], CommercialRuleVersionEntity.prototype, "createdAt", void 0);
exports.CommercialRuleVersionEntity = CommercialRuleVersionEntity = __decorate([
    (0, typeorm_1.Entity)('commercial_rule_versions'),
    (0, typeorm_1.Index)(['ruleId', 'version'], { unique: true }),
    (0, typeorm_1.Index)(['tenantId', 'ruleId']),
    (0, typeorm_1.Index)(['tenantId', 'ruleType'])
], CommercialRuleVersionEntity);
//# sourceMappingURL=commercial-rule-version.entity.js.map