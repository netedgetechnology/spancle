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
exports.JournalLineEntity = exports.JournalEntryEntity = void 0;
const typeorm_1 = require("typeorm");
let JournalEntryEntity = class JournalEntryEntity {
};
exports.JournalEntryEntity = JournalEntryEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], JournalEntryEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], JournalEntryEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 30, nullable: false }),
    __metadata("design:type", String)
], JournalEntryEntity.prototype, "reference", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'entry_type', type: 'varchar', length: 30, nullable: false }),
    __metadata("design:type", String)
], JournalEntryEntity.prototype, "entryType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'source_type', type: 'varchar', length: 30, nullable: true }),
    __metadata("design:type", Object)
], JournalEntryEntity.prototype, "sourceType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'source_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], JournalEntryEntity.prototype, "sourceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, nullable: false }),
    __metadata("design:type", String)
], JournalEntryEntity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'posted_at', type: 'timestamptz', nullable: false }),
    __metadata("design:type", Date)
], JournalEntryEntity.prototype, "postedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'accounting_period', type: 'char', length: 7, nullable: false }),
    __metadata("design:type", String)
], JournalEntryEntity.prototype, "accountingPeriod", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reversed_by', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], JournalEntryEntity.prototype, "reversedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reversal_of', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], JournalEntryEntity.prototype, "reversalOf", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], JournalEntryEntity.prototype, "createdAt", void 0);
exports.JournalEntryEntity = JournalEntryEntity = __decorate([
    (0, typeorm_1.Entity)('finance_journal_entries'),
    (0, typeorm_1.Index)(['tenantId', 'sourceId']),
    (0, typeorm_1.Index)(['tenantId', 'accountingPeriod']),
    (0, typeorm_1.Index)(['tenantId', 'entryType']),
    (0, typeorm_1.Index)(['tenantId', 'postedAt'])
], JournalEntryEntity);
let JournalLineEntity = class JournalLineEntity {
};
exports.JournalLineEntity = JournalLineEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], JournalLineEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], JournalLineEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'journal_entry_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], JournalLineEntity.prototype, "journalEntryId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'account_code', type: 'varchar', length: 10, nullable: false }),
    __metadata("design:type", String)
], JournalLineEntity.prototype, "accountCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'debit_minor', type: 'int', nullable: false, default: 0 }),
    __metadata("design:type", Number)
], JournalLineEntity.prototype, "debitMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'credit_minor', type: 'int', nullable: false, default: 0 }),
    __metadata("design:type", Number)
], JournalLineEntity.prototype, "creditMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 3, nullable: false, default: 'GBP' }),
    __metadata("design:type", String)
], JournalLineEntity.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'posted_at', type: 'timestamptz', nullable: false }),
    __metadata("design:type", Date)
], JournalLineEntity.prototype, "postedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], JournalLineEntity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], JournalLineEntity.prototype, "createdAt", void 0);
exports.JournalLineEntity = JournalLineEntity = __decorate([
    (0, typeorm_1.Entity)('finance_journal_lines'),
    (0, typeorm_1.Index)(['tenantId', 'journalEntryId']),
    (0, typeorm_1.Index)(['tenantId', 'accountCode', 'postedAt'])
], JournalLineEntity);
//# sourceMappingURL=journal.entity.js.map