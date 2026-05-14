import { DataSource } from 'typeorm';
import { HolidayEntity } from '../entities/holiday.entity';
export declare class HolidayRepository {
    private readonly dataSource;
    private readonly logger;
    constructor(dataSource: DataSource);
    private get repo();
    create(data: Partial<HolidayEntity>): Promise<HolidayEntity>;
    insertMany(data: Partial<HolidayEntity>[]): Promise<void>;
    findById(id: string, tenantId: string): Promise<HolidayEntity | null>;
    findByIdOrFail(id: string, tenantId: string): Promise<HolidayEntity>;
    findAll(tenantId: string): Promise<HolidayEntity[]>;
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
    isHoliday(tenantId: string, date: string): Promise<boolean>;
    /**
     * Returns all holiday dates within a range for pre-fetching by the generator.
     * Returns a Set of YYYY-MM-DD strings for O(1) lookup.
     */
    getHolidayDatesInRange(tenantId: string, startDate: string, endDate: string): Promise<Set<string>>;
    updateById(id: string, tenantId: string, data: Partial<HolidayEntity>): Promise<HolidayEntity>;
    softDelete(id: string, tenantId: string): Promise<void>;
    existsByDate(tenantId: string, date: string, source: string): Promise<boolean>;
}
//# sourceMappingURL=holiday.repository.d.ts.map