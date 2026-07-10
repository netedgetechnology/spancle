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
var JournalRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JournalRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const journal_entity_1 = require("../entities/journal.entity");
const journal_entity_2 = require("../entities/journal.entity");
let JournalRepository = JournalRepository_1 = class JournalRepository {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(JournalRepository_1.name);
    }
    get entryRepo() {
        return this.dataSource.getRepository(journal_entity_1.JournalEntryEntity);
    }
    get lineRepo() {
        return this.dataSource.getRepository(journal_entity_2.JournalLineEntity);
    }
    async insertEntry(input, manager) {
        const entryRepo = manager.getRepository(journal_entity_1.JournalEntryEntity);
        const lineRepo = manager.getRepository(journal_entity_2.JournalLineEntity);
        const entry = await entryRepo.save(entryRepo.create({
            tenantId: input.tenantId,
            reference: input.reference,
            entryType: input.entryType,
            sourceType: input.sourceType ?? null,
            sourceId: input.sourceId ?? null,
            description: input.description,
            postedAt: input.postedAt,
            accountingPeriod: input.accountingPeriod,
            reversalOf: input.reversalOf ?? null,
            reversedBy: null,
        }));
        await lineRepo.save(input.lines.map((l) => lineRepo.create({
            tenantId: input.tenantId,
            journalEntryId: entry.id,
            accountCode: l.accountCode,
            debitMinor: l.debitMinor,
            creditMinor: l.creditMinor,
            currency: l.currency,
            postedAt: input.postedAt,
            description: l.description ?? null,
        })));
        return entry;
    }
    async markReversed(originalId, reversingId, manager) {
        await manager
            .getRepository(journal_entity_1.JournalEntryEntity)
            .update({ id: originalId }, { reversedBy: reversingId });
    }
    async findById(id, tenantId) {
        return this.entryRepo.findOne({ where: { id, tenantId } });
    }
    async findBySource(sourceId, tenantId) {
        return this.entryRepo.find({
            where: { sourceId, tenantId },
            order: { postedAt: 'ASC' },
        });
    }
    async findLinesForEntry(journalEntryId, tenantId) {
        return this.lineRepo.find({
            where: { journalEntryId, tenantId },
            order: { id: 'ASC' },
        });
    }
    async findByPeriod(period, tenantId, limit = 100, offset = 0) {
        return this.entryRepo.find({
            where: { accountingPeriod: period, tenantId },
            order: { postedAt: 'ASC' },
            take: limit,
            skip: offset,
        });
    }
    async nextReference(period, tenantId) {
        const result = await this.dataSource.query(`SELECT COUNT(*)::int as count
       FROM finance_journal_entries
       WHERE tenant_id = $1 AND accounting_period = $2`, [tenantId, period]);
        const seq = (Number(result[0]?.count ?? 0) + 1).toString().padStart(5, '0');
        return `JNL-${period.replace('-', '')}-${seq}`;
    }
};
exports.JournalRepository = JournalRepository;
exports.JournalRepository = JournalRepository = JournalRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], JournalRepository);
//# sourceMappingURL=journal.repository.js.map