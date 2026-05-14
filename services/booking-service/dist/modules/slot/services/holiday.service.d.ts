import { EventEmitter2 } from '@nestjs/event-emitter';
import { HolidayRepository } from '../repositories/holiday.repository';
import { HolidayEntity } from '../entities/holiday.entity';
export declare class HolidayService {
    private readonly holidayRepository;
    private readonly eventEmitter;
    private readonly logger;
    constructor(holidayRepository: HolidayRepository, eventEmitter: EventEmitter2);
    create(dto: Partial<HolidayEntity>, tenantId: string, actorId: string): Promise<HolidayEntity>;
    findAll(tenantId: string): Promise<HolidayEntity[]>;
    findOne(id: string, tenantId: string): Promise<HolidayEntity>;
    update(id: string, dto: Partial<HolidayEntity>, tenantId: string, actorId: string): Promise<HolidayEntity>;
    remove(id: string, tenantId: string, actorId: string): Promise<void>;
    /**
     * Seeds the UK system bank holidays for a tenant.
     * Safe to call multiple times — skips dates that already exist.
     * Returns { seeded, skipped }.
     */
    seedSystemHolidays(tenantId: string, actorId: string): Promise<{
        seeded: number;
        skipped: number;
    }>;
    isHoliday(tenantId: string, date: string): Promise<{
        isHoliday: boolean;
    }>;
}
//# sourceMappingURL=holiday.service.d.ts.map