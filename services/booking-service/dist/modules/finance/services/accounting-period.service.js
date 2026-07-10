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
var AccountingPeriodService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountingPeriodService = exports.PeriodClosedException = void 0;
const common_1 = require("@nestjs/common");
const accounting_period_repository_1 = require("../repositories/accounting-period.repository");
class PeriodClosedException extends common_1.BadRequestException {
    constructor(period, status) {
        super(`Accounting period ${period} is ${status}. ` +
            `Journal entries cannot be posted into a ${status} period. ` +
            `Use the current open period.`);
    }
}
exports.PeriodClosedException = PeriodClosedException;
let AccountingPeriodService = AccountingPeriodService_1 = class AccountingPeriodService {
    constructor(periodRepository) {
        this.periodRepository = periodRepository;
        this.logger = new common_1.Logger(AccountingPeriodService_1.name);
    }
    static periodOf(date) {
        return date.toISOString().slice(0, 7);
    }
    async ensureCurrentPeriodOpen(tenantId) {
        const period = AccountingPeriodService_1.periodOf(new Date());
        const existing = await this.periodRepository.findByPeriod(period, tenantId);
        if (existing)
            return existing;
        this.logger.log(`Opening accounting period ${period} for tenant ${tenantId}`);
        return this.periodRepository.create({
            tenantId,
            period,
            status: 'open',
            openedAt: new Date(),
        });
    }
    async assertOpen(tenantId, postedAt) {
        const period = AccountingPeriodService_1.periodOf(postedAt);
        const ap = await this.periodRepository.findByPeriod(period, tenantId);
        if (!ap) {
            const currentPeriod = AccountingPeriodService_1.periodOf(new Date());
            if (period === currentPeriod) {
                return this.ensureCurrentPeriodOpen(tenantId);
            }
            throw new common_1.NotFoundException(`Accounting period ${period} has not been opened for this tenant`);
        }
        if (ap.status === 'closed' || ap.status === 'locked' || ap.status === 'closing') {
            throw new PeriodClosedException(period, ap.status);
        }
        return ap;
    }
    async findAll(tenantId) {
        return this.periodRepository.findAll(tenantId);
    }
    async findOpen(tenantId) {
        return this.periodRepository.findOpen(tenantId);
    }
    async beginClose(period, tenantId, actorId) {
        const ap = await this.periodRepository.findByPeriodOrFail(period, tenantId);
        if (ap.status !== 'open') {
            throw new common_1.BadRequestException(`Period ${period} is already ${ap.status} and cannot be closed again`);
        }
        this.logger.log(`Beginning close of period ${period} — tenant: ${tenantId}`);
        const closing = await this.periodRepository.updateStatus(ap.id, 'closing', {
            closedById: actorId,
        });
        const next = this.nextPeriod(period);
        const alreadyOpen = await this.periodRepository.findByPeriod(next, tenantId);
        if (!alreadyOpen) {
            await this.periodRepository.create({
                tenantId,
                period: next,
                status: 'open',
                openedAt: new Date(),
            });
            this.logger.log(`Opened next accounting period ${next} — tenant: ${tenantId}`);
        }
        return closing;
    }
    async confirmClose(period, tenantId) {
        const ap = await this.periodRepository.findByPeriodOrFail(period, tenantId);
        if (ap.status !== 'closing') {
            throw new common_1.BadRequestException(`Period ${period} is not in 'closing' state`);
        }
        return this.periodRepository.updateStatus(ap.id, 'closed', {
            closedAt: new Date(),
        });
    }
    async lock(period, tenantId, actorId) {
        const ap = await this.periodRepository.findByPeriodOrFail(period, tenantId);
        if (ap.status !== 'closed') {
            throw new common_1.BadRequestException(`Only closed periods can be locked (current: ${ap.status})`);
        }
        this.logger.log(`Locking period ${period} — actor: ${actorId} tenant: ${tenantId}`);
        return this.periodRepository.updateStatus(ap.id, 'locked', {
            lockedAt: new Date(),
            lockedById: actorId,
        });
    }
    async reopen(period, tenantId, actorId, note) {
        if (!note?.trim()) {
            throw new common_1.BadRequestException('A mandatory note is required to reopen a closed period');
        }
        const ap = await this.periodRepository.findByPeriodOrFail(period, tenantId);
        if (ap.status === 'open') {
            throw new common_1.ConflictException(`Period ${period} is already open`);
        }
        if (ap.status === 'locked') {
            throw new common_1.ForbiddenException(`Period ${period} is locked. Only SUPER_ADMIN can unlock — ` +
                `contact Spancle platform support.`);
        }
        this.logger.warn(`PERIOD REOPEN — period: ${period} actor: ${actorId} tenant: ${tenantId} note: ${note}`);
        return this.periodRepository.updateStatus(ap.id, 'open', { notes: note });
    }
    nextPeriod(period) {
        const [year, month] = period.split('-').map(Number);
        const next = month === 12
            ? `${year + 1}-01`
            : `${year}-${String(month + 1).padStart(2, '0')}`;
        return next;
    }
};
exports.AccountingPeriodService = AccountingPeriodService;
exports.AccountingPeriodService = AccountingPeriodService = AccountingPeriodService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [accounting_period_repository_1.AccountingPeriodRepository])
], AccountingPeriodService);
//# sourceMappingURL=accounting-period.service.js.map