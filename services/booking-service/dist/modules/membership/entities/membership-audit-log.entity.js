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
exports.MembershipAuditLogEntity = void 0;
const typeorm_1 = require("typeorm");
let MembershipAuditLogEntity = class MembershipAuditLogEntity {
};
exports.MembershipAuditLogEntity = MembershipAuditLogEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], MembershipAuditLogEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], MembershipAuditLogEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'membership_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], MembershipAuditLogEntity.prototype, "membershipId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 80, nullable: false }),
    __metadata("design:type", String)
], MembershipAuditLogEntity.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'actor_id', type: 'varchar', length: 36, nullable: true }),
    __metadata("design:type", Object)
], MembershipAuditLogEntity.prototype, "actorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'actor_type', type: 'varchar', length: 20, nullable: false, default: 'user' }),
    __metadata("design:type", String)
], MembershipAuditLogEntity.prototype, "actorType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'previous_status', type: 'varchar', length: 30, nullable: true }),
    __metadata("design:type", Object)
], MembershipAuditLogEntity.prototype, "previousStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'new_status', type: 'varchar', length: 30, nullable: true }),
    __metadata("design:type", Object)
], MembershipAuditLogEntity.prototype, "newStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], MembershipAuditLogEntity.prototype, "note", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], MembershipAuditLogEntity.prototype, "diff", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], MembershipAuditLogEntity.prototype, "createdAt", void 0);
exports.MembershipAuditLogEntity = MembershipAuditLogEntity = __decorate([
    (0, typeorm_1.Entity)('membership_audit_logs'),
    (0, typeorm_1.Index)(['tenantId', 'membershipId']),
    (0, typeorm_1.Index)(['tenantId', 'createdAt'])
], MembershipAuditLogEntity);
//# sourceMappingURL=membership-audit-log.entity.js.map