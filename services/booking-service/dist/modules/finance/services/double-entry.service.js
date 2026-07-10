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
var DoubleEntryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DoubleEntryService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const journal_repository_1 = require("../repositories/journal.repository");
const accounting_period_service_1 = require("./accounting-period.service");
const chart_of_account_repository_1 = require("../repositories/chart-of-account.repository");
let DoubleEntryService = DoubleEntryService_1 = class DoubleEntryService {
    constructor(journalRepository, periodService, accountRepository, dataSource) {
        this.journalRepository = journalRepository;
        this.periodService = periodService;
        this.accountRepository = accountRepository;
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(DoubleEntryService_1.name);
    }
    assertBalanced(lines) {
        if (lines.length < 2) {
            throw new common_1.BadRequestException('A journal entry must have at least two lines (double-entry requirement)');
        }
        let totalDebit = 0;
        let totalCredit = 0;
        for (const line of lines) {
            if (!Number.isInteger(line.debitMinor) || !Number.isInteger(line.creditMinor)) {
                throw new common_1.BadRequestException('Journal line amounts must be integers (minor currency units — no decimals)');
            }
            if (line.debitMinor < 0 || line.creditMinor < 0) {
                throw new common_1.BadRequestException('Journal line amounts must be non-negative. Use the correct debit/credit column.');
            }
            if ((line.debitMinor === 0) === (line.creditMinor === 0)) {
                throw new common_1.BadRequestException(`Journal line for account ${line.accountCode}: exactly one of debitMinor / creditMinor must be > 0`);
            }
            totalDebit += line.debitMinor;
            totalCredit += line.creditMinor;
        }
        if (totalDebit !== totalCredit) {
            throw new common_1.BadRequestException(`Journal entry is not balanced: debits=${totalDebit} credits=${totalCredit} ` +
                `(difference=${Math.abs(totalDebit - totalCredit)})`);
        }
    }
    async post(dto) {
        this.assertBalanced(dto.lines);
        const period = await this.periodService.assertOpen(dto.tenantId, dto.postedAt);
        const lines = dto.lines.map((l) => ({
            ...l,
            currency: l.currency || dto.currency,
        }));
        return this.dataSource.transaction(async (manager) => {
            const reference = await this.journalRepository.nextReference(period.period, dto.tenantId);
            const input = {
                tenantId: dto.tenantId,
                reference,
                entryType: dto.entryType,
                sourceType: dto.sourceType,
                sourceId: dto.sourceId,
                description: dto.description,
                postedAt: dto.postedAt,
                accountingPeriod: period.period,
                lines,
            };
            const entry = await this.journalRepository.insertEntry(input, manager);
            this.logger.log(`Journal posted: ${reference} type=${dto.entryType} ` +
                `source=${dto.sourceType ?? 'manual'}:${dto.sourceId ?? '-'} ` +
                `period=${period.period} tenant=${dto.tenantId}`);
            return entry;
        });
    }
    async reverse(originalId, tenantId, description, actorId, postedAt) {
        const original = await this.journalRepository.findById(originalId, tenantId);
        if (!original) {
            throw new common_1.BadRequestException(`Journal entry ${originalId} not found`);
        }
        if (original.reversedBy) {
            throw new common_1.BadRequestException(`Journal entry ${originalId} has already been reversed by ${original.reversedBy}`);
        }
        const originalLines = await this.journalRepository.findLinesForEntry(originalId, tenantId);
        if (originalLines.length === 0) {
            throw new common_1.BadRequestException(`Journal entry ${originalId} has no lines to reverse`);
        }
        const reversalDate = postedAt ?? new Date();
        const period = await this.periodService.assertOpen(tenantId, reversalDate);
        const mirroredLines = originalLines.map((l) => ({
            accountCode: l.accountCode,
            debitMinor: l.creditMinor,
            creditMinor: l.debitMinor,
            currency: l.currency,
            description: `Reversal: ${l.description ?? ''}`.trim(),
        }));
        this.assertBalanced(mirroredLines);
        return this.dataSource.transaction(async (manager) => {
            const reference = await this.journalRepository.nextReference(period.period, tenantId);
            const reversalInput = {
                tenantId,
                reference,
                entryType: 'reversal',
                sourceType: original.sourceType ?? undefined,
                sourceId: original.sourceId ?? undefined,
                description,
                postedAt: reversalDate,
                accountingPeriod: period.period,
                reversalOf: originalId,
                lines: mirroredLines,
            };
            const reversingEntry = await this.journalRepository.insertEntry(reversalInput, manager);
            await this.journalRepository.markReversed(originalId, reversingEntry.id, manager);
            this.logger.log(`Journal reversed: ${reference} reverses ${original.reference} ` +
                `actor=${actorId} tenant=${tenantId}`);
            return reversingEntry;
        });
    }
    async findBySource(sourceId, tenantId) {
        return this.journalRepository.findBySource(sourceId, tenantId);
    }
    async findByPeriod(period, tenantId, limit, offset) {
        return this.journalRepository.findByPeriod(period, tenantId, limit, offset);
    }
};
exports.DoubleEntryService = DoubleEntryService;
exports.DoubleEntryService = DoubleEntryService = DoubleEntryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [journal_repository_1.JournalRepository,
        accounting_period_service_1.AccountingPeriodService,
        chart_of_account_repository_1.ChartOfAccountRepository,
        typeorm_2.DataSource])
], DoubleEntryService);
//# sourceMappingURL=double-entry.service.js.map