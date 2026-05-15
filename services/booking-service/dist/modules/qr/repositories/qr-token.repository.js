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
var QrTokenRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QrTokenRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const qr_token_entity_1 = require("../entities/qr-token.entity");
const qr_scan_log_entity_1 = require("../entities/qr-scan-log.entity");
let QrTokenRepository = QrTokenRepository_1 = class QrTokenRepository {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(QrTokenRepository_1.name);
    }
    get repo() { return this.dataSource.getRepository(qr_token_entity_1.QrTokenEntity); }
    get scanRepo() { return this.dataSource.getRepository(qr_scan_log_entity_1.QrScanLogEntity); }
    async create(data) {
        return this.repo.save(this.repo.create(data));
    }
    async findById(id, tenantId) {
        return this.repo.findOne({ where: { id, tenantId } });
    }
    async findByIdOrFail(id, tenantId) {
        const t = await this.findById(id, tenantId);
        if (!t)
            throw new Error(`QrToken ${id} not found`);
        return t;
    }
    async findByHash(tokenHash) {
        return this.repo.findOne({ where: { tokenHash } });
    }
    async findByBooking(bookingId, tenantId) {
        return this.repo
            .createQueryBuilder('t')
            .where('t.tenantId = :tenantId', { tenantId })
            .andWhere('t.bookingId = :bookingId', { bookingId })
            .orderBy('t.createdAt', 'DESC')
            .getMany();
    }
    async findActiveForBooking(bookingId, tenantId) {
        return this.repo
            .createQueryBuilder('t')
            .where('t.tenantId = :tenantId', { tenantId })
            .andWhere('t.bookingId = :bookingId', { bookingId })
            .andWhere("t.status = 'active'")
            .andWhere('t.expiresAt > :now', { now: new Date() })
            .orderBy('t.createdAt', 'DESC')
            .getOne();
    }
    async recordUsage(id, tenantId, deviceId, scanIp) {
        const now = new Date();
        await this.repo
            .createQueryBuilder()
            .update(qr_token_entity_1.QrTokenEntity)
            .set({
            useCount: () => '"use_count" + 1',
            firstUsedAt: () => 'COALESCE("first_used_at", NOW())',
            lastUsedAt: now,
            deviceId: deviceId ?? undefined,
            scanIp: scanIp ?? undefined,
            status: () => `CASE WHEN "use_count" + 1 >= "max_uses" THEN 'used'::qr_token_status ELSE 'active'::qr_token_status END`,
        })
            .where('id = :id', { id })
            .andWhere('tenantId = :tenantId', { tenantId })
            .execute();
        return this.repo.findOneOrFail({ where: { id, tenantId } });
    }
    async updateStatus(id, tenantId, status, extra) {
        await this.repo.update({ id, tenantId }, { status, ...extra });
    }
    async bulkExpireStale() {
        const result = await this.repo
            .createQueryBuilder()
            .update(qr_token_entity_1.QrTokenEntity)
            .set({ status: 'expired' })
            .where("status = 'active'")
            .andWhere('expiresAt < :now', { now: new Date() })
            .execute();
        return result.affected ?? 0;
    }
    async logScan(data) {
        await this.scanRepo.save(this.scanRepo.create(data));
    }
    async findScanLogs(tenantId, bookingId) {
        return this.scanRepo
            .createQueryBuilder('sl')
            .where('sl.tenantId = :tenantId', { tenantId })
            .andWhere('sl.bookingId = :bookingId', { bookingId })
            .orderBy('sl.createdAt', 'DESC')
            .getMany();
    }
    async findScanLogsByDevice(tenantId, deviceId, from, to) {
        const qb = this.scanRepo
            .createQueryBuilder('sl')
            .where('sl.tenantId = :tenantId', { tenantId })
            .andWhere('sl.deviceId = :deviceId', { deviceId })
            .orderBy('sl.createdAt', 'DESC');
        if (from)
            qb.andWhere('sl.createdAt >= :from', { from });
        if (to)
            qb.andWhere('sl.createdAt < :to', { to });
        return qb.getMany();
    }
};
exports.QrTokenRepository = QrTokenRepository;
exports.QrTokenRepository = QrTokenRepository = QrTokenRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], QrTokenRepository);
//# sourceMappingURL=qr-token.repository.js.map