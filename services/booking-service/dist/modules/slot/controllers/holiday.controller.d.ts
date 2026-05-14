import { type TenantContext } from '../../../common/decorators/tenant.decorator';
import { HolidayService } from '../services/holiday.service';
import type { HolidayEntity } from '../entities/holiday.entity';
export declare class HolidayController {
    private readonly holidayService;
    constructor(holidayService: HolidayService);
    create(dto: Partial<HolidayEntity>, tenant: TenantContext): Promise<HolidayEntity>;
    seedSystem(tenant: TenantContext): Promise<{
        seeded: number;
        skipped: number;
    }>;
    findAll(tenant: TenantContext): Promise<HolidayEntity[]>;
    checkDate(date: string, tenant: TenantContext): Promise<{
        isHoliday: boolean;
    }>;
    findOne(id: string, tenant: TenantContext): Promise<HolidayEntity>;
    update(id: string, dto: Partial<HolidayEntity>, tenant: TenantContext): Promise<HolidayEntity>;
    remove(id: string, tenant: TenantContext): Promise<void>;
}
//# sourceMappingURL=holiday.controller.d.ts.map