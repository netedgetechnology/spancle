import {
  BadRequestException,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 }      from '@nestjs/event-emitter';
import { HttpService }        from '@nestjs/axios';
import { ConfigService }      from '@nestjs/config';
import { firstValueFrom }     from 'rxjs';
import { DataSource }         from 'typeorm';

import { SlotRepository }         from '../repositories/slot.repository';
import { SlotTemplateRepository } from '../repositories/slot-template.repository';
import { BlackoutRepository }     from '../repositories/blackout.repository';
import { HolidayRepository }      from '../repositories/holiday.repository';
import { PricingService }         from './pricing.service';
import { SlotUtils }              from '../utils/slot.utils';

import { SlotEntity }         from '../entities/slot.entity';
import { SlotTemplateEntity } from '../entities/slot-template.entity';
import type { GenerateSlotsDto } from '../dto/generate-slots.dto';
import { SlotEvents }         from '../events/slot.events';

// ── Operating hours types (mirrors identity-service DayTiming) ───────────────

interface TimeRange {
  start: string;
  end:   string;
}

interface DaySession {
  start:   string;
  end:     string;
  label?:  string;
  breaks?: TimeRange[];
}

interface MaintenanceBlock {
  start:  string;
  end:    string;
  reason: string;
}

interface DayTiming {
  isClosed:           boolean;
  openTime:           string;
  closeTime:          string;
  sessions?:          DaySession[];
  maintenanceBlocks?: MaintenanceBlock[];
}

type DayTimingMap = Record<string, DayTiming>;

interface ResolvedDayHours {
  openTime:          string;
  closeTime:         string;
  sessions:          DaySession[] | null;
  maintenanceBlocks: MaintenanceBlock[] | null;
}

// ─────────────────────────────────────────────────────────────────────────────

export type SkipReason =
  | 'blackout'
  | 'holiday'
  | 'court_closed'
  | 'outside_hours'
  | 'overlap'
  | 'court_unavailable';

export interface GenerationResult {
  created:  number;
  skipped:  number;
  reasons:  Partial<Record<SkipReason, number>>;
  slotIds:  string[];
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
@Injectable()
export class SlotGeneratorService {
  private readonly logger = new Logger(SlotGeneratorService.name);

  constructor(
    private readonly slotRepository:         SlotRepository,
    private readonly slotTemplateRepository: SlotTemplateRepository,
    private readonly blackoutRepository:     BlackoutRepository,
    private readonly holidayRepository:      HolidayRepository,
    private readonly pricingService:         PricingService,
    private readonly eventEmitter:           EventEmitter2,
    private readonly httpService:            HttpService,
    private readonly config:                 ConfigService,
    private readonly dataSource:             DataSource,
  ) {}

  // ── Public API ─────────────────────────────────────────────────────────────

  async generate(
    dto:      GenerateSlotsDto,
    tenantId: string,
    actorId:  string,
  ): Promise<GenerationResult> {
    // 1. Validate + fetch court data
    const court = await this.fetchCourtOrFail(dto.courtId, tenantId);
    this.assertCourtBookable(court);

    // 2. Resolve generation config (template or direct DTO fields)
    const config = dto.templateId
      ? await this.resolveFromTemplate(dto.templateId, tenantId)
      : {
          durationMins:  dto.durationMins ?? 60,
          bufferMins:    dto.bufferMins   ?? 0,
          autoPublish:   dto.autoPublish  ?? true,
          skipHolidays:  dto.skipHolidays ?? false,
          skipBlackouts: dto.skipBlackouts ?? true,
          hoursOverride: dto.hoursOverride ?? null,
        };

    // 3. Date range validation
    const today  = SlotUtils.todayUtc();
    const maxEnd = SlotUtils.addDays(today, 180); // max 180 days forward

    if (dto.startDate < today) {
      throw new BadRequestException('startDate cannot be in the past');
    }
    if (dto.endDate < dto.startDate) {
      throw new BadRequestException('endDate must be on or after startDate');
    }
    if (dto.endDate > maxEnd) {
      throw new BadRequestException('Cannot generate slots more than 180 days in advance');
    }

    const startDateObj = new Date(`${dto.startDate}T00:00:00.000Z`);
    const endDateObj   = new Date(`${dto.endDate}T23:59:59.000Z`);

    // 4. Pre-fetch blackouts + holidays for full range
    const [blackouts, holidayDates] = await Promise.all([
      config.skipBlackouts
        ? this.blackoutRepository.findOverlapping({
            tenantId,
            courtId:  dto.courtId,
            branchId: court.branchId,
            sportId:  court.sportId ?? undefined,
            startAt:  startDateObj,
            endAt:    endDateObj,
          })
        : Promise.resolve([]),
      config.skipHolidays
        ? this.holidayRepository.getHolidayDatesInRange(tenantId, dto.startDate, dto.endDate)
        : Promise.resolve(new Set<string>()),
    ]);

    // 5. Pre-fetch existing slots for overlap detection (in-memory Set)
    const existingSlots = await this.slotRepository.findInRange({
      tenantId,
      courtId: dto.courtId,
      startAt: startDateObj,
      endAt:   endDateObj,
    });

    // Build Set of existing time ranges for O(1) lookup
    const existingRanges = existingSlots.map((s) => ({
      startAt: s.startAt,
      endAt:   s.endAt,
    }));

    // 6. Generate slot candidates
    const toInsert: Partial<SlotEntity>[] = [];
    const skipReasons: Partial<Record<SkipReason, number>> = {};
    let skippedCount = 0;

    const skip = (reason: SkipReason): void => {
      skipReasons[reason] = (skipReasons[reason] ?? 0) + 1;
      skippedCount++;
    };

    for (const dateStr of SlotUtils.iterateDates(dto.startDate, dto.endDate)) {
      const dayOfWeek = SlotUtils.getDayOfWeek(new Date(`${dateStr}T00:00:00.000Z`));

      // Resolve operating hours for this day
      const hours = this.resolveHoursForDay(
        court, dayOfWeek, config.hoursOverride,
      );

      if (!hours) { skip('court_closed'); continue; }

      // Skip holidays
      if (config.skipHolidays && holidayDates.has(dateStr)) {
        skip('holiday');
        continue;
      }

      // Generate slots for this day, honouring sessions, breaks, maintenance
      const timeSlots = this.generateSlotsForDay(
        dateStr,
        hours,
        config.durationMins,
        config.bufferMins,
      );

      for (const ts of timeSlots) {
        // Check blackout overlap (in-memory)
        const isBlackedOut = blackouts.some((b) =>
          SlotUtils.overlaps(ts.startAt, ts.endAt, b.startAt, b.endAt),
        );
        if (isBlackedOut) { skip('blackout'); continue; }

        // Check slot overlap with existing (in-memory)
        const hasOverlap = existingRanges.some((r) =>
          SlotUtils.overlaps(ts.startAt, ts.endAt, r.startAt, r.endAt),
        );
        if (hasOverlap) { skip('overlap'); continue; }

        // Mark this slot as "taken" so later iterations don't overlap with it
        existingRanges.push({ startAt: ts.startAt, endAt: ts.endAt });

        toInsert.push({
          tenantId,
          courtId:     dto.courtId,
          branchId:    court.branchId,
          sportId:     court.sportId,
          startAt:     ts.startAt,
          endAt:       ts.endAt,
          durationMins: config.durationMins,
          status:      config.autoPublish ? 'available' : 'unavailable',
          currency:    'GBP',
          maxBookings: court.maxBookingsConcurrent ?? 1,
          currentBookings: 0,
          label: SlotUtils.buildLabel(court.name, ts.startAt, ts.endAt),
          templateId: dto.templateId ?? null,
        });
      }
    }

    if (toInsert.length === 0) {
      this.logger.log(
        `Slot generation: 0 slots created (${skippedCount} skipped) ` +
        `court=${dto.courtId} tenant=${tenantId}`,
      );
      return { created: 0, skipped: skippedCount, reasons: skipReasons, slotIds: [] };
    }

    // 7. Resolve prices in batch
    const priceResults = await this.pricingService.resolveBatch(
      toInsert.map((s) => ({
        tenantId,
        courtId:              dto.courtId,
        branchId:             court.branchId,
        sportId:              court.sportId ?? null,
        startAt:              s.startAt!,
        durationMins:         config.durationMins,
        courtHourlyRateMinor: court.hourlyRateMinor ?? null,
        // Slot generation always prices at the non-member (public) rate.
        // Member discounts are applied at booking time when the booker
        // identity is known. Generated slots store the public base price.
        isMember:             false,
        currency:             'GBP',
      })),
    );

    // Apply pricing results to slot candidates
    for (let i = 0; i < toInsert.length; i++) {
      const p = priceResults[i]!;
      toInsert[i]!.resolvedPriceMinor = p.resolvedPriceMinor;
      toInsert[i]!.appliedRuleIds     = p.appliedRuleIds;
    }

    // 8. Insert all in a single transaction
    const created = await this.dataSource.transaction(async (manager) => {
      const entities = toInsert.map((d) =>
        manager.create(SlotEntity, d),
      );
      return manager.save(SlotEntity, entities);
    });

    const slotIds = created.map((s) => s.id);

    await this.eventEmitter.emitAsync(SlotEvents.BULK_GENERATED, {
      tenantId,
      courtId:  dto.courtId,
      branchId: court.branchId,
      count:    created.length,
      slotIds,
      actorId,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `Slot generation: created=${created.length} skipped=${skippedCount} ` +
      `court=${dto.courtId} tenant=${tenantId}`,
    );

    return {
      created:  created.length,
      skipped:  skippedCount,
      reasons:  skipReasons,
      slotIds,
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async fetchCourtOrFail(courtId: string, tenantId: string): Promise<{
    id:                   string;
    name:                 string;
    branchId:             string;
    sportId:              string | null;
    status:               string;
    courtType:            string;
    operatingHours:       DayTimingMap | null;
    hourlyRateMinor:      number | null;
    rateCardId:           string | null;
    maxBookingsConcurrent: number;
    branch?: {
      timings: DayTimingMap;
    };
  }> {
    const identityBase = this.config.get<string>('IDENTITY_SERVICE_URL', 'http://localhost:3001');
    try {
      const res = await firstValueFrom(
        this.httpService.get(`${identityBase}/api/v1/courts/${courtId}`, {
          timeout: 5_000,
          headers: { 'x-tenant-id': tenantId, 'x-internal-service': 'booking-service' },
        }),
      );
      return res.data;
    } catch {
      throw new UnprocessableEntityException(
        `Court ${courtId} not found in this organisation`,
      );
    }
  }

  private assertCourtBookable(court: { status: string }): void {
    if (court.status === 'maintenance' || court.status === 'retired') {
      throw new BadRequestException(
        `Court is ${court.status} and cannot be scheduled for new slots`,
      );
    }
  }

  private async resolveFromTemplate(
    templateId: string,
    tenantId:   string,
  ): Promise<{
    durationMins:  number;
    bufferMins:    number;
    autoPublish:   boolean;
    skipHolidays:  boolean;
    skipBlackouts: boolean;
    hoursOverride: { openTime: string; closeTime: string } | null;
  }> {
    const template = await this.slotTemplateRepository.findByIdOrFail(templateId, tenantId);
    return {
      durationMins:  template.durationMins,
      bufferMins:    template.bufferMins,
      autoPublish:   template.autoPublish,
      skipHolidays:  false, // configurable per generation run
      skipBlackouts: true,
      hoursOverride: template.openTime && template.closeTime
        ? { openTime: template.openTime, closeTime: template.closeTime }
        : null,
    };
  }

  /**
   * Resolves the operating hours for a single day.
   * Priority: manual override > court-specific hours > branch hours
   * Returns null when the day is closed (no slots generated).
   * Returns a resolved DayConfig used to generate session-aware slots.
   */
  private resolveHoursForDay(
    court: {
      operatingHours: DayTimingMap | null;
      branch?: { timings: DayTimingMap };
    },
    dayOfWeek: string,
    hoursOverride: { openTime: string; closeTime: string } | null,
  ): ResolvedDayHours | null {
    // Manual override — no session/maintenance support (simple open/close window)
    if (hoursOverride) {
      return {
        openTime:         hoursOverride.openTime,
        closeTime:        hoursOverride.closeTime,
        sessions:         null,
        maintenanceBlocks: null,
      };
    }

    const day = (court.operatingHours?.[dayOfWeek] ?? court.branch?.timings?.[dayOfWeek]) as DayTiming | undefined;
    if (!day || day.isClosed) return null;

    return {
      openTime:          day.openTime,
      closeTime:         day.closeTime,
      sessions:          day.sessions     ?? null,
      maintenanceBlocks: day.maintenanceBlocks ?? null,
    };
  }

  /**
   * Generates TimeSlots for a resolved day, honouring multiple sessions,
   * break periods within sessions, and maintenance blocks.
   *
   * When no sessions are defined, uses the primary openTime/closeTime window
   * as a single session (backward compatible with legacy records).
   */
  private generateSlotsForDay(
    dateStr:      string,
    hours:        ResolvedDayHours,
    durationMins: number,
    bufferMins:   number,
  ): ReturnType<typeof SlotUtils.chopIntoSlots> {
    // No session definitions — use primary window (legacy / simple mode)
    const windows = hours.sessions && hours.sessions.length > 0
      ? hours.sessions.map((s) => ({ start: s.start, end: s.end, breaks: s.breaks ?? [] }))
      : [{ start: hours.openTime, end: hours.closeTime, breaks: [] }];

    const maintenanceBlocks = hours.maintenanceBlocks ?? [];
    const allSlots: ReturnType<typeof SlotUtils.chopIntoSlots> = [];

    for (const window of windows) {
      const rawSlots = SlotUtils.chopIntoSlots(
        dateStr,
        window.start,
        window.end,
        durationMins,
        bufferMins,
      );

      for (const slot of rawSlots) {
        // Exclude slots overlapping any break in this session
        const inBreak = window.breaks.some((br) =>
          SlotUtils.overlaps(
            slot.startAt, slot.endAt,
            SlotUtils.toUtcDate(dateStr, br.start),
            SlotUtils.toUtcDate(dateStr, br.end),
          ),
        );
        if (inBreak) continue;

        // Exclude slots overlapping any maintenance block
        const inMaintenance = maintenanceBlocks.some((mb) =>
          SlotUtils.overlaps(
            slot.startAt, slot.endAt,
            SlotUtils.toUtcDate(dateStr, mb.start),
            SlotUtils.toUtcDate(dateStr, mb.end),
          ),
        );
        if (inMaintenance) continue;

        allSlots.push(slot);
      }
    }

    return allSlots;
  }
}
