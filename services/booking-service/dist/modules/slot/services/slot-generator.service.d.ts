import { EventEmitter2 } from '@nestjs/event-emitter';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { SlotRepository } from '../repositories/slot.repository';
import { SlotTemplateRepository } from '../repositories/slot-template.repository';
import { BlackoutRepository } from '../repositories/blackout.repository';
import { HolidayRepository } from '../repositories/holiday.repository';
import { PricingService } from './pricing.service';
import type { GenerateSlotsDto } from '../dto/generate-slots.dto';
export type SkipReason = 'blackout' | 'holiday' | 'court_closed' | 'outside_hours' | 'overlap' | 'court_unavailable';
export interface GenerationResult {
    created: number;
    skipped: number;
    reasons: Partial<Record<SkipReason, number>>;
    slotIds: string[];
}
/**
 * SlotGeneratorService — the core slot generation engine.
 *
 * Algorithm per invocation:
 *
 *   1. Validate: court exists, belongs to tenant, is not maintenance/retired
 *   2. Resolve operating hours: template > dto override > court > branch
 *   3. Pre-fetch blackouts + holidays for the full date range (single queries)
 *   4. Pre-fetch existing slots in range (overlap pre-check — O(N log N) set lookup)
 *   5. For each day in [startDate, endDate]:
 *      a. Skip if day-of-week is closed (per recurrence rule or operating hours)
 *      b. Skip if day is a holiday (when skipHolidays = true)
 *      c. Chop the day into slots of durationMins with bufferMins gap
 *      d. For each time slot:
 *         i.  Skip if overlaps with existing slot (in-memory Set lookup)
 *         ii. Skip if falls within a blackout window
 *         iii.Resolve price via PricingService
 *         iv. Accumulate into batch
 *   6. Insert all valid slots in a single DB transaction
 *   7. Emit BULK_GENERATED event
 *   8. Return { created, skipped, reasons, slotIds }
 */
export declare class SlotGeneratorService {
    private readonly slotRepository;
    private readonly slotTemplateRepository;
    private readonly blackoutRepository;
    private readonly holidayRepository;
    private readonly pricingService;
    private readonly eventEmitter;
    private readonly httpService;
    private readonly config;
    private readonly dataSource;
    private readonly logger;
    constructor(slotRepository: SlotRepository, slotTemplateRepository: SlotTemplateRepository, blackoutRepository: BlackoutRepository, holidayRepository: HolidayRepository, pricingService: PricingService, eventEmitter: EventEmitter2, httpService: HttpService, config: ConfigService, dataSource: DataSource);
    generate(dto: GenerateSlotsDto, tenantId: string, actorId: string): Promise<GenerationResult>;
    private fetchCourtOrFail;
    private assertCourtBookable;
    private resolveFromTemplate;
    private resolveHoursForDay;
}
//# sourceMappingURL=slot-generator.service.d.ts.map