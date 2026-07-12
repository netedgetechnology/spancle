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
exports.DisputeEntity = void 0;
const typeorm_1 = require("typeorm");
let DisputeEntity = class DisputeEntity {
};
exports.DisputeEntity = DisputeEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], DisputeEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], DisputeEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'dispute_number', type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], DisputeEntity.prototype, "disputeNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payment_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], DisputeEntity.prototype, "paymentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'gateway', type: 'varchar', length: 30, nullable: false }),
    __metadata("design:type", String)
], DisputeEntity.prototype, "gateway", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'gateway_dispute_id', type: 'varchar', length: 100, nullable: false }),
    __metadata("design:type", String)
], DisputeEntity.prototype, "gatewayDisputeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reason', type: 'varchar', length: 60, nullable: false }),
    __metadata("design:type", String)
], DisputeEntity.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'status', type: 'varchar', length: 20, nullable: false, default: 'opened' }),
    __metadata("design:type", String)
], DisputeEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'disputed_amount_minor', type: 'int', nullable: false }),
    __metadata("design:type", Number)
], DisputeEntity.prototype, "disputedAmountMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'fee_amount_minor', type: 'int', nullable: false, default: 0 }),
    __metadata("design:type", Number)
], DisputeEntity.prototype, "feeAmountMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'currency', type: 'varchar', length: 3, nullable: false }),
    __metadata("design:type", String)
], DisputeEntity.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'opened_at', type: 'timestamptz', nullable: false }),
    __metadata("design:type", Date)
], DisputeEntity.prototype, "openedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'evidence_due_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], DisputeEntity.prototype, "evidenceDueAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'resolved_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], DisputeEntity.prototype, "resolvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'resolution', type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], DisputeEntity.prototype, "resolution", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'journal_entry_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], DisputeEntity.prototype, "journalEntryId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'resolution_journal_entry_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], DisputeEntity.prototype, "resolutionJournalEntryId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'metadata', type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], DisputeEntity.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], DisputeEntity.prototype, "createdById", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'updated_by_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], DisputeEntity.prototype, "updatedById", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], DisputeEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], DisputeEntity.prototype, "updatedAt", void 0);
exports.DisputeEntity = DisputeEntity = __decorate([
    (0, typeorm_1.Entity)('finance_disputes'),
    (0, typeorm_1.Index)(['tenantId', 'gateway', 'gatewayDisputeId'], { unique: true }),
    (0, typeorm_1.Index)(['tenantId', 'paymentId']),
    (0, typeorm_1.Index)(['tenantId', 'status'])
], DisputeEntity);
//# sourceMappingURL=dispute.entity.js.map