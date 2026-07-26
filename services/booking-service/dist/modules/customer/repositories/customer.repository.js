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
var CustomerRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("@nestjs/typeorm");
const typeorm_3 = require("typeorm");
const customer_entity_1 = require("../entities/customer.entity");
let CustomerRepository = CustomerRepository_1 = class CustomerRepository {
    constructor(repo, ds) {
        this.repo = repo;
        this.ds = ds;
        this.logger = new common_1.Logger(CustomerRepository_1.name);
    }
    async create(data) {
        return this.repo.save(this.repo.create(data));
    }
    async findByIdAndTenant(id, tenantId) {
        return this.repo.findOne({ where: { id, tenantId, isDeleted: false } });
    }
    async findByEmailAndTenant(email, tenantId) {
        return this.repo.findOne({
            where: { email: email.toLowerCase().trim(), tenantId, isDeleted: false },
        });
    }
    async findByUserIdAndTenant(userId, tenantId) {
        return this.repo.findOne({ where: { userId, tenantId, isDeleted: false } });
    }
    async update(id, tenantId, data) {
        await this.repo.update({ id, tenantId }, data);
        return this.repo.findOneOrFail({ where: { id, tenantId } });
    }
    async softDelete(id, tenantId) {
        await this.repo.update({ id, tenantId }, { isDeleted: true, deletedAt: new Date() });
    }
    async search(tenantId, query) {
        const limit = query.limit ?? 20;
        const offset = query.offset ?? 0;
        const sortBy = query.sortBy ?? 'fullName';
        const sortOrder = query.sortOrder ?? 'ASC';
        const SORT_COLS = {
            fullName: 'c.full_name',
            createdAt: 'c.created_at',
            email: 'c.email',
        };
        const orderCol = SORT_COLS[sortBy] ?? 'c.full_name';
        const params = [tenantId];
        const wheres = ['c.tenant_id = $1', 'c.is_deleted = FALSE'];
        if (query.q) {
            const like = `%${query.q.trim()}%`;
            params.push(like);
            wheres.push(`(c.full_name ILIKE $${params.length} OR c.email ILIKE $${params.length} OR c.phone ILIKE $${params.length})`);
        }
        if (query.status) {
            params.push(query.status);
            wheres.push(`c.status = $${params.length}`);
        }
        if (query.branchId) {
            params.push(query.branchId);
            wheres.push(`c.branch_id = $${params.length}`);
        }
        if (query.isGuest !== undefined) {
            params.push(query.isGuest);
            wheres.push(`c.is_guest = $${params.length}`);
        }
        const where = wheres.join(' AND ');
        const [countRows, dataRows] = await Promise.all([
            this.ds.query(`SELECT COUNT(*)::int AS count FROM customers c WHERE ${where}`, params),
            this.ds.query(`SELECT c.* FROM customers c WHERE ${where}
         ORDER BY ${orderCol} ${sortOrder === 'DESC' ? 'DESC' : 'ASC'}
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset]),
        ]);
        return {
            data: dataRows,
            total: Number(countRows[0]?.count ?? 0),
        };
    }
    async getProfile(id, tenantId) {
        const customer = await this.findByIdAndTenant(id, tenantId);
        if (!customer)
            return null;
        const [familyMembers, bookingStats, recentBookings, membershipSummary] = await Promise.all([
            this.repo.find({
                where: { parentCustomerId: id, tenantId, isDeleted: false },
                order: { firstName: 'ASC' },
            }),
            this.ds.query(`
        SELECT
          COUNT(*)                                                             AS total,
          COUNT(*) FILTER (WHERE status IN ('reserved','pending_payment','confirmed','checked_in','in_progress','rescheduled')) AS active,
          COUNT(*) FILTER (WHERE status = 'completed')                       AS completed,
          COUNT(*) FILTER (WHERE status IN ('cancelled','refunded'))          AS cancelled,
          COUNT(*) FILTER (WHERE status = 'no_show')                         AS no_shows,
          COALESCE(SUM(amount_paid_minor), 0)                                AS total_spend,
          MAX(currency)                                                       AS currency,
          COUNT(*) FILTER (WHERE membership_id IS NOT NULL)                  AS membership_bookings,
          COALESCE(SUM(discount_minor), 0)                                   AS total_discount,
          COALESCE(SUM(wallet_amount_minor), 0)                              AS total_wallet
        FROM bookings
        WHERE tenant_id = $1
          AND customer_id = $2
          AND is_deleted = FALSE
      `, [tenantId, id]),
            this.ds.query(`
        SELECT id, reference, status, starts_at, court_id, final_price_minor
        FROM bookings
        WHERE tenant_id = $1 AND customer_id = $2 AND is_deleted = FALSE
        ORDER BY starts_at DESC
        LIMIT 10
      `, [tenantId, id]),
            this.ds.query(`
        SELECT id, plan_id, status, starts_at, expires_at
        FROM memberships
        WHERE tenant_id = $1 AND customer_id = $2 AND is_deleted = FALSE
        ORDER BY created_at DESC
        LIMIT 5
      `, [tenantId, id]),
        ]);
        const stats = bookingStats[0];
        return {
            customer,
            familyMembers,
            bookingStats: {
                total: Number(stats.total),
                active: Number(stats.active),
                completed: Number(stats.completed),
                cancelled: Number(stats.cancelled),
                noShows: Number(stats.no_shows),
                totalSpendMinor: Number(stats.total_spend),
                currency: stats.currency,
                membershipBookings: Number(stats.membership_bookings),
                totalDiscountMinor: Number(stats.total_discount),
                totalWalletUsedMinor: Number(stats.total_wallet),
            },
            recentBookings: recentBookings.map((r) => ({
                id: r.id,
                reference: r.reference,
                status: r.status,
                startsAt: r.starts_at,
                courtId: r.court_id,
                finalPriceMinor: r.final_price_minor,
            })),
            membershipSummary: membershipSummary.map((m) => ({
                id: m.id,
                planId: m.plan_id,
                status: m.status,
                startsAt: m.starts_at,
                expiresAt: m.expires_at,
            })),
        };
    }
};
exports.CustomerRepository = CustomerRepository;
exports.CustomerRepository = CustomerRepository = CustomerRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(customer_entity_1.CustomerEntity)),
    __param(1, (0, typeorm_2.InjectDataSource)()),
    __metadata("design:paramtypes", [Function, typeorm_3.DataSource])
], CustomerRepository);
//# sourceMappingURL=customer.repository.js.map