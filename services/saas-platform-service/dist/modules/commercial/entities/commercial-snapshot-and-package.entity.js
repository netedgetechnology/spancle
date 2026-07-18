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
exports.PackageVersionEntity = exports.CommercialDecisionSnapshotEntity = void 0;
const typeorm_1 = require("typeorm");
const commercial_enums_1 = require("../enums/commercial.enums");
let CommercialDecisionSnapshotEntity = class CommercialDecisionSnapshotEntity {
};
exports.CommercialDecisionSnapshotEntity = CommercialDecisionSnapshotEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CommercialDecisionSnapshotEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Object)
], CommercialDecisionSnapshotEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'rule_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], CommercialDecisionSnapshotEntity.prototype, "ruleId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'rule_version', type: 'varchar', length: 32, nullable: true }),
    __metadata("design:type", Object)
], CommercialDecisionSnapshotEntity.prototype, "ruleVersion", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'subject_type', type: 'varchar', length: 64, nullable: false }),
    __metadata("design:type", String)
], CommercialDecisionSnapshotEntity.prototype, "subjectType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'subject_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], CommercialDecisionSnapshotEntity.prototype, "subjectId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'outcome', type: 'varchar', length: 32, nullable: false }),
    __metadata("design:type", String)
], CommercialDecisionSnapshotEntity.prototype, "outcome", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'input_context', type: 'jsonb', nullable: false, default: '{}' }),
    __metadata("design:type", Object)
], CommercialDecisionSnapshotEntity.prototype, "inputContext", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'result_payload', type: 'jsonb', nullable: false, default: '{}' }),
    __metadata("design:type", Object)
], CommercialDecisionSnapshotEntity.prototype, "resultPayload", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'evaluated_rule_ids', type: 'jsonb', nullable: false, default: '[]' }),
    __metadata("design:type", Array)
], CommercialDecisionSnapshotEntity.prototype, "evaluatedRuleIds", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'evaluated_by_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], CommercialDecisionSnapshotEntity.prototype, "evaluatedById", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], CommercialDecisionSnapshotEntity.prototype, "createdAt", void 0);
exports.CommercialDecisionSnapshotEntity = CommercialDecisionSnapshotEntity = __decorate([
    (0, typeorm_1.Entity)('commercial_decision_snapshots'),
    (0, typeorm_1.Index)(['tenantId', 'ruleId']),
    (0, typeorm_1.Index)(['tenantId', 'subjectType', 'subjectId']),
    (0, typeorm_1.Index)(['tenantId', 'createdAt'])
], CommercialDecisionSnapshotEntity);
let PackageVersionEntity = class PackageVersionEntity {
};
exports.PackageVersionEntity = PackageVersionEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PackageVersionEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'package_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], PackageVersionEntity.prototype, "packageId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'version', type: 'varchar', length: 32, nullable: false }),
    __metadata("design:type", String)
], PackageVersionEntity.prototype, "version", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'features', type: 'jsonb', nullable: false, default: '{}' }),
    __metadata("design:type", Object)
], PackageVersionEntity.prototype, "features", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'limits', type: 'jsonb', nullable: false, default: '{}' }),
    __metadata("design:type", Object)
], PackageVersionEntity.prototype, "limits", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'prices', type: 'jsonb', nullable: false, default: '{}' }),
    __metadata("design:type", Object)
], PackageVersionEntity.prototype, "prices", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'changelog', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], PackageVersionEntity.prototype, "changelog", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], PackageVersionEntity.prototype, "createdById", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], PackageVersionEntity.prototype, "createdAt", void 0);
exports.PackageVersionEntity = PackageVersionEntity = __decorate([
    (0, typeorm_1.Entity)('package_versions'),
    (0, typeorm_1.Index)(['packageId', 'version'], { unique: true })
], PackageVersionEntity);
//# sourceMappingURL=commercial-snapshot-and-package.entity.js.map