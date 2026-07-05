import {
  BadRequestException,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 }      from '@nestjs/event-emitter';
import { DataSource }         from 'typeorm';

import { SlotRepository }         from '../repositories/slot.repository';
import { SlotTemplateRepository } from '../repositories/slot-template.repository';
import { BlackoutRepository }     from '../repositories/blackout.repository';
import { HolidayRepository }      from '../repositories/holiday.repository';
import { PricingService }         from './pricing.service';
import { SlotUtils }              from '../utils/slot.utils';
import { CourtRepository }        from '../../court/repositories/court.repository';
import { VenueService }           from '../../venue/services/venue.service';

import { SlotEntity }         from '../entities/slot.entity';
import { SlotTemplateEntity } from '../entities/slot-template.entity';
import type { GenerateSlotsDto } from '../dto/generate-slots.dto';
import { SlotEvents }         from '../events/slot.events';

// ── Internal types ───────────────────────────────────────────────────────────

interface ResolvedDayHours {
  openTime:  string;
  closeTime: string;
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
    private readonly courtRepository:        CourtRepository,
    private readonly venueService:           VenueService,
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
          // Use court defaults when DTO does not supply explicit values.
          // slotDuration on CourtEntity defaults to 60 mins.
          // bufferBefore + bufferAfter on CourtEntity default to 0 each.
          durationMins:  dto.durationMins ?? court.slotDuration,
          bufferMins:    dto.bufferMins   ?? (court.bufferBefore + court.bufferAfter),
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
          venueId:     court.venueId,
          branchId:    court.branchId,
          sportId:     court.sportId,
          startAt:     ts.startAt,
          endAt:       ts.endAt,
          durationMins: config.durationMins,
          status:      config.autoPublish ? 'available' : 'unavailable',
          currency:    'GBP',
          maxBookings: 1,
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
        courtHourlyRateMinor: court.hourlyPrice     ?? null,
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
      venueId:  court.venueId,
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

  /**
   * Loads the CourtEntity from booking-service DB and validates:
   *   - court exists in this tenant
   *   - court belongs to the stated venue
   *   - court is active and bookable
   * Throws before any slots are generated.
   */
  private async fetchCourtOrFail(courtId: string, tenantId: string) {
    const court = await this.courtRepository.findByIdAndTenant(courtId, tenantId);
    if (!court) {
      throw new UnprocessableEntityException(
        `Court ${courtId} not found for this organisation`,
      );
    }
    return court;
  }

  private assertCourtBookable(court: {
    isActive:  boolean;
    isBookable: boolean;
    isDeleted: boolean;
  }): void {
    if (court.isDeleted) {
      throw new BadRequestException('Court has been deleted and cannot accept new slots');
    }
    if (!court.isActive) {
      throw new BadRequestException('Court is inactive and cannot accept new slots');
    }
    if (!court.isBookable) {
      throw new BadRequestException('Court is not bookable and cannot accept new slots');
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
   * Resolves the operating window for a day.
   *
   * Sources (priority order):
   *   1. hoursOverride in the DTO  — explicit window from the caller
   *   2. Default full-day window   — 06:00–23:00 (bookable hours convention)
   *
   * Operating hours (sessions, breaks, maintenance) belong to the branch in
   * identity-service and are not replicated into booking-service.  When the
   * caller needs hour-restricted generation they MUST supply hoursOverride.
   * Full-day default guarantees generation still works without a cross-service
   * call while remaining overridable.
   *
   * Returns null to skip a day (currently unused — all days are open by
   * default; callers can restrict via daysOfWeek in a future DTO extension).
   */
  private resolveHoursForDay(
    _court:        unknown,
    _dayOfWeek:    string,
    hoursOverride: { openTime: string; closeTime: string } | null,
  ): ResolvedDayHours | null {
    if (hoursOverride) {
      return { openTime: hoursOverride.openTime, closeTime: hoursOverride.closeTime };
    }
    // Default: 06:00–23:00 — covers typical sports facility operating hours.
    // Callers that need tighter windows must supply hoursOverride.
    return { openTime: '06:00', closeTime: '23:00' };
  }

  /**
   * Chops a resolved day window into TimeSlots of durationMins with bufferMins gap.
   * Simple mode — no session or maintenance subdivision (those live in identity-service).
   */
  private generateSlotsForDay(
    dateStr:      string,
    hours:        ResolvedDayHours,
    durationMins: number,
    bufferMins:   number,
  ): ReturnType<typeof SlotUtils.chopIntoSlots> {
    return SlotUtils.chopIntoSlots(dateStr, hours.openTime, hours.closeTime, durationMins, bufferMins);
  }
}
