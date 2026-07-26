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
var WaitlistRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaitlistRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("@nestjs/typeorm");
const typeorm_3 = require("typeorm");
const waitlist_entry_entity_1 = require("../entities/waitlist-entry.entity");
let WaitlistRepository = WaitlistRepository_1 = class WaitlistRepository {
    constructor(repo, ds) {
        this.repo = repo;
        this.ds = ds;
        this.logger = new common_1.Logger(WaitlistRepository_1.name);
    }
    async create(data) {
        return this.repo.save(this.repo.create(data));
    }
    async update(id, tenantId, data) {
        await this.repo.update({ id, tenantId }, data);
        return this.repo.findOneOrFail({ where: { id, tenantId } });
    }
    async softDelete(id, tenantId) {
        await this.repo.update({ id, tenantId }, {
            status: 'cancelled',
            isDeleted: true,
            deletedAt: new Date(),
        });
    }
    async findById(id, tenantId) {
        return this.repo.findOne({ where: { id, tenantId, isDeleted: false } });
    }
    async findBySlot(slotId, tenantId) {
        return this.repo.find({
            where: { slotId, tenantId, isDeleted: false },
            order: { position: 'ASC' },
        });
    }
    async findByCustomer(customerId, tenantId) {
        return this.repo.find({
            where: { customerId, tenantId, isDeleted: false },
            order: { createdAt: 'DESC' },
        });
    }
    async findDuplicate(params) {
        const qb = this.repo.createQueryBuilder('w')
            .where('w.slot_id = :slotId', { slotId: params.slotId })
            .andWhere('w.tenant_id = :tenantId', { tenantId: params.tenantId })
            .andWhere("w.status = 'waiting'")
            .andWhere('w.is_deleted = FALSE');
        if (params.userId) {
            qb.andWhere('w.user_id = :userId', { userId: params.userId });
        }
        else if (params.customerId) {
            qb.andWhere('w.customer_id = :customerId', { customerId: params.customerId });
        }
        return qb.getOne();
    }
    async nextPosition(slotId, tenantId) {
        const [{ max }] = await this.ds.query(`SELECT MAX(position) AS max FROM waitlist_entries
       WHERE slot_id = $1 AND tenant_id = $2 AND is_deleted = FALSE`, [slotId, tenantId]);
        return (max ?? 0) + 1;
    }
    async firstWaiting(slotId, tenantId) {
        return this.repo.findOne({
            where: { slotId, tenantId, status: 'waiting', isDeleted: false },
            order: { position: 'ASC' },
        });
    }
    async findExpiredPromotions(batchSize = 50) {
        return this.ds.query(`SELECT * FROM waitlist_entries
       WHERE status = 'promoted' AND promoted_until < NOW()
         AND is_deleted = FALSE
       ORDER BY promoted_until ASC
       LIMIT $1`, [batchSize]);
    }
};
exports.WaitlistRepository = WaitlistRepository;
exports.WaitlistRepository = WaitlistRepository = WaitlistRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(waitlist_entry_entity_1.WaitlistEntryEntity)),
    __param(1, (0, typeorm_2.InjectDataSource)()),
    __metadata("design:paramtypes", [Function, typeorm_3.DataSource])
], WaitlistRepository);
//# sourceMappingURL=waitlist.repository.js.map