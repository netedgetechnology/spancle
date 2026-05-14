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
exports.SportBranchEntity = void 0;
const typeorm_1 = require("typeorm");
/**
 * SportBranchEntity — join table linking a sport to the branches where
 * it is offered.
 *
 * Architecture decisions:
 *
 *   1. `tenantId` is on every row — not derived from the sport or branch FKs.
 *      This satisfies the TenantAwareRepository contract and enables
 *      RLS policies to scope queries without joins.
 *
 *   2. This is NOT a standard TypeORM @ManyToMany relation. We avoid
 *      TypeORM's auto-generated join tables because:
 *      a. They cannot carry tenantId (no extra columns on implicit join tables)
 *      b. We need soft-delete (isDeleted) on the mapping itself
 *      c. We need sortOrder for ordered branch display per sport
 *
 *   3. Uniqueness: UNIQUE(tenant_id, sport_id, branch_id) — the DB constraint
 *      prevents duplicate mappings. Service layer uses replace strategy
 *      (delete existing + insert new) to avoid concurrent insert conflicts.
 *
 *   4. No DB-level FK constraints on sport_id or branch_id — multi-tenant
 *      pattern enforces referential integrity at the service layer.
 *
 * Table: `sport_branches`
 */
let SportBranchEntity = class SportBranchEntity {
};
exports.SportBranchEntity = SportBranchEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SportBranchEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], SportBranchEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sport_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], SportBranchEntity.prototype, "sportId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'branch_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], SportBranchEntity.prototype, "branchId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sort_order', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], SportBranchEntity.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_deleted', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], SportBranchEntity.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], SportBranchEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], SportBranchEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], SportBranchEntity.prototype, "deletedAt", void 0);
exports.SportBranchEntity = SportBranchEntity = __decorate([
    (0, typeorm_1.Entity)('sport_branches'),
    (0, typeorm_1.Index)(['tenantId', 'sportId', 'branchId'], { unique: true }),
    (0, typeorm_1.Index)(['tenantId', 'sportId']),
    (0, typeorm_1.Index)(['tenantId', 'branchId']),
    (0, typeorm_1.Index)(['tenantId', 'isDeleted'])
], SportBranchEntity);
//# sourceMappingURL=sport-branch.entity.js.map