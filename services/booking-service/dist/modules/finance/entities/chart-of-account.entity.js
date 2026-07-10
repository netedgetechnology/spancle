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
exports.ChartOfAccountEntity = void 0;
const typeorm_1 = require("typeorm");
let ChartOfAccountEntity = class ChartOfAccountEntity {
};
exports.ChartOfAccountEntity = ChartOfAccountEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ChartOfAccountEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], ChartOfAccountEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10, nullable: false }),
    __metadata("design:type", String)
], ChartOfAccountEntity.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 150, nullable: false }),
    __metadata("design:type", String)
], ChartOfAccountEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], ChartOfAccountEntity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 15, nullable: false }),
    __metadata("design:type", String)
], ChartOfAccountEntity.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'parent_code', type: 'varchar', length: 10, nullable: true }),
    __metadata("design:type", Object)
], ChartOfAccountEntity.prototype, "parentCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_postable', type: 'boolean', nullable: false, default: true }),
    __metadata("design:type", Boolean)
], ChartOfAccountEntity.prototype, "isPostable", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_system', type: 'boolean', nullable: false, default: false }),
    __metadata("design:type", Boolean)
], ChartOfAccountEntity.prototype, "isSystem", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', type: 'boolean', nullable: false, default: true }),
    __metadata("design:type", Boolean)
], ChartOfAccountEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], ChartOfAccountEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], ChartOfAccountEntity.prototype, "updatedAt", void 0);
exports.ChartOfAccountEntity = ChartOfAccountEntity = __decorate([
    (0, typeorm_1.Entity)('finance_accounts'),
    (0, typeorm_1.Index)(['tenantId', 'code'], { unique: true }),
    (0, typeorm_1.Index)(['tenantId', 'type']),
    (0, typeorm_1.Index)(['tenantId', 'parentCode'])
], ChartOfAccountEntity);
//# sourceMappingURL=chart-of-account.entity.js.map