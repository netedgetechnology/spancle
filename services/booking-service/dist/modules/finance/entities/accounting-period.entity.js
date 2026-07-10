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
exports.AccountingPeriodEntity = void 0;
const typeorm_1 = require("typeorm");
let AccountingPeriodEntity = class AccountingPeriodEntity {
};
exports.AccountingPeriodEntity = AccountingPeriodEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AccountingPeriodEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], AccountingPeriodEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'char', length: 7, nullable: false }),
    __metadata("design:type", String)
], AccountingPeriodEntity.prototype, "period", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 15, nullable: false, default: 'open' }),
    __metadata("design:type", String)
], AccountingPeriodEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'opened_at', type: 'timestamptz', nullable: false }),
    __metadata("design:type", Date)
], AccountingPeriodEntity.prototype, "openedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'closed_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], AccountingPeriodEntity.prototype, "closedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'locked_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], AccountingPeriodEntity.prototype, "lockedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'closed_by_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], AccountingPeriodEntity.prototype, "closedById", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'locked_by_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], AccountingPeriodEntity.prototype, "lockedById", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], AccountingPeriodEntity.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], AccountingPeriodEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], AccountingPeriodEntity.prototype, "updatedAt", void 0);
exports.AccountingPeriodEntity = AccountingPeriodEntity = __decorate([
    (0, typeorm_1.Entity)('finance_accounting_periods'),
    (0, typeorm_1.Index)(['tenantId', 'period'], { unique: true }),
    (0, typeorm_1.Index)(['tenantId', 'status'])
], AccountingPeriodEntity);
//# sourceMappingURL=accounting-period.entity.js.map