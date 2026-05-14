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
var HolidayRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HolidayRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const holiday_entity_1 = require("../entities/holiday.entity");
let HolidayRepository = HolidayRepository_1 = class HolidayRepository {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(HolidayRepository_1.name);
    }
    get repo() {
        return this.dataSource.getRepository(holiday_entity_1.HolidayEntity);
    }
    async create(data) {
        return this.repo.save(this.repo.create(data));
    }
    async insertMany(data) {
        await this.repo.save(data.map((d) => this.repo.create(d)));
    }
    async findById(id, tenantId) {
        return this.repo.findOne({ where: { id, tenantId, isDeleted: false } });
    }
    async findByIdOrFail(id, tenantId) {
        const h = await this.findById(id, tenantId);
        if (!h)
            throw new Error(`Holiday ${id} not found`);
        return h;
    }
    async findAll(tenantId) {
        return this.repo
            .createQueryBuilder('h')
            .where('h.tenantId = :tenantId', { tenantId })
            .andWhere('h.isDeleted = false')
            .orderBy('h.date', 'ASC')
            .getMany();
    }
    /**
     * Checks whether a specific date (YYYY-MM-DD) is a holiday.
     *
     * Matching:
     *   - Exact date match (non-recurring, or current year match)
     *   - Recurring match: MM-DD portion matches (year ignored)
     *
     * Both tenant and system holidays are checked.
     * A tenant holiday with isActive=false overrides (disables) a system one.
     */
    async isHoliday(tenantId, date) {
        // date format: YYYY-MM-DD
        const monthDay = date.slice(5); // MM-DD
        const count = await this.repo
            .createQueryBuilder('h')
            .where('h.tenantId = :tenantId', { tenantId })
            .andWhere('h.isDeleted = false')
            .andWhere('h.isActive = true')
            .andWhere(
        // exact date match OR recurring MM-DD match
        "(h.date = :date OR (h.isRecurring = true AND SUBSTRING(h.date::text, 6, 5) = :monthDay))", { date, monthDay })
            .getCount();
        return count > 0;
    }
    /**
     * Returns all holiday dates within a range for pre-fetching by the generator.
     * Returns a Set of YYYY-MM-DD strings for O(1) lookup.
     */
    async getHolidayDatesInRange(tenantId, startDate, endDate) {
        const rows = await this.repo
            .createQueryBuilder('h')
            .select('h.date', 'date')
            .addSelect('h.isRecurring', 'isRecurring')
            .where('h.tenantId = :tenantId', { tenantId })
            .andWhere('h.isDeleted = false')
            .andWhere('h.isActive = true')
            .getRawMany();
        const dates = new Set();
        const start = new Date(startDate);
        const end = new Date(endDate);
        for (const row of rows) {
            const rowDate = new Date(row.date);
            if (row.isRecurring) {
                // Check every year between start and end for this MM-DD
                const mm = row.date.slice(5); // MM-DD
                let year = start.getFullYear();
                while (year <= end.getFullYear()) {
                    const candidate = `${year}-${mm}`;
                    if (candidate >= startDate && candidate <= endDate) {
                        dates.add(candidate);
                    }
                    year++;
                }
            }
            else {
                const formatted = row.date.slice(0, 10);
                if (formatted >= startDate && formatted <= endDate) {
                    dates.add(formatted);
                }
            }
        }
        return dates;
    }
    async updateById(id, tenantId, data) {
        await this.repo.update({ id, tenantId }, { ...data, updatedAt: new Date() });
        return this.repo.findOneOrFail({ where: { id, tenantId } });
    }
    async softDelete(id, tenantId) {
        await this.repo.update({ id, tenantId }, { isDeleted: true, isActive: false, deletedAt: new Date(), updatedAt: new Date() });
    }
    async existsByDate(tenantId, date, source) {
        const count = await this.repo.count({
            where: { tenantId, date, source: source, isDeleted: false },
        });
        return count > 0;
    }
};
exports.HolidayRepository = HolidayRepository;
exports.HolidayRepository = HolidayRepository = HolidayRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], HolidayRepository);
//# sourceMappingURL=holiday.repository.js.map