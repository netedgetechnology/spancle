import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource }       from 'typeorm';
import { BookingRulesRepository } from '../repositories/booking-rules.repository';
import { BookingRulesEntity }     from '../entities/booking-rules.entity';
import type { CreateBookingRulesDto, UpdateBookingRulesDto } from '../dto/booking-rules.dto';
import type { CreateBookingDto }    from '../../booking/dto/create-booking.dto';
import type { CancelBookingDto, RescheduleBookingDto } from '../../booking/dto/update-booking.dto';
import type { BookingEntity }       from '../../booking/entities/booking.entity';

/** Channels that bypass member-only and some cutoff restrictions. */
const ADMIN_CHANNELS = new Set(['admin', 'walk_in']);

@Injectable()
export class BookingRulesService {
  private readonly logger = new Logger(BookingRulesService.name);

  constructor(
    private readonly rulesRepository: BookingRulesRepository,
    @InjectDataSource() private readonly ds: DataSource,
  ) {}

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async create(dto: CreateBookingRulesDto, tenantId: string): Promise<BookingRulesEntity> {
    const scope  = dto.scope ?? 'tenant';
    const entity = await this.rulesRepository.create({
      tenantId,
      scope,
      branchId:               dto.branchId               ?? null,
      sportId:                dto.sportId                ?? null,
      courtId:                dto.courtId                ?? null,
      name:                   dto.name,
      description:            dto.description            ?? null,
      isActive:               dto.isActive               ?? true,
      maxAdvanceBookingMins:  dto.maxAdvanceBookingMins  ?? null,
      minNoticeMins:          dto.minNoticeMins           ?? null,
      minDurationMins:        dto.minDurationMins         ?? null,
      maxDurationMins:        dto.maxDurationMins         ?? null,
      maxBookingsPerDay:      dto.maxBookingsPerDay       ?? null,
      maxBookingsPerWeek:     dto.maxBookingsPerWeek      ?? null,
      maxBookingsPerMonth:    dto.maxBookingsPerMonth     ?? null,
      membersOnly:            dto.membersOnly             ?? false,
      minAgeYears:            dto.minAgeYears             ?? null,
      maxAgeYears:            dto.maxAgeYears             ?? null,
      bufferTimeMins:         dto.bufferTimeMins          ?? null,
      cancellationCutoffMins: dto.cancellationCutoffMins ?? null,
      rescheduleCutoffMins:   dto.rescheduleCutoffMins   ?? null,
      gracePeriodMins:        dto.gracePeriodMins         ?? null,
      blackoutDates:          dto.blackoutDates           ?? [],
    });
    this.logger.log(`BookingRule created — id=${entity.id} scope=${scope} tenant=${tenantId}`);
    return entity;
  }

  async findAll(tenantId: string): Promise<BookingRulesEntity[]> {
    return this.rulesRepository.findByTenant(tenantId);
  }

  async findOne(id: string, tenantId: string): Promise<BookingRulesEntity> {
    const rule = await this.rulesRepository.findById(id, tenantId);
    if (!rule) throw new NotFoundException(`Booking rule ${id} not found`);
    return rule;
  }

  async update(
    id:       string,
    dto:      UpdateBookingRulesDto,
    tenantId: string,
  ): Promise<BookingRulesEntity> {
    await this.findOne(id, tenantId);
    return this.rulesRepository.update(id, tenantId, dto as Partial<BookingRulesEntity>);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findOne(id, tenantId);
    await this.rulesRepository.softDelete(id, tenantId);
    this.logger.log(`BookingRule soft-deleted — id=${id} tenant=${tenantId}`);
  }

  // ── Rule enforcement ──────────────────────────────────────────────────────

  /**
   * enforceCreateRules()
   *
   * Called by BookingService.create() before slot locking.
   * Resolves the most-specific rule set and validates all applicable rules.
   * Throws BadRequestException with a descriptive message on any violation.
   */
  async enforceCreateRules(params: {
    dto:       CreateBookingDto;
    tenantId:  string;
    startsAt:  Date;
    endsAt:    Date;
    totalMins: number;
    actorId:   string;
  }): Promise<void> {
    const { dto, tenantId, startsAt, endsAt, totalMins } = params;

    const rules = await this.rulesRepository.resolveForBooking({
      tenantId,
      branchId: dto.branchId,
      sportId:  dto.sportId,
      courtId:  dto.courtId,
    });
    if (!rules) return;  // no rules configured for this context

    const now     = new Date();
    const channel = dto.channel ?? 'online';
    const isAdmin = ADMIN_CHANNELS.has(channel);

    // ── Blackout dates ──
    const bookingDate = startsAt.toISOString().slice(0, 10);
    if (rules.blackoutDates?.includes(bookingDate)) {
      throw new BadRequestException(
        `Bookings are not accepted on ${bookingDate} (blackout date)`,
      );
    }

    // ── Advance booking window ──
    if (rules.maxAdvanceBookingMins != null) {
      const minutesUntilStart = (startsAt.getTime() - now.getTime()) / 60_000;
      if (minutesUntilStart > rules.maxAdvanceBookingMins) {
        const days = Math.round(rules.maxAdvanceBookingMins / 1440);
        throw new BadRequestException(
          `Bookings cannot be made more than ${days} day(s) in advance`,
        );
      }
    }

    // ── Minimum notice ──
    if (rules.minNoticeMins != null) {
      const minutesUntilStart = (startsAt.getTime() - now.getTime()) / 60_000;
      if (minutesUntilStart < rules.minNoticeMins) {
        throw new BadRequestException(
          `Bookings must be made at least ${rules.minNoticeMins} minute(s) before the session`,
        );
      }
    }

    // ── Duration ──
    if (rules.minDurationMins != null && totalMins < rules.minDurationMins) {
      throw new BadRequestException(
        `Minimum booking duration is ${rules.minDurationMins} minutes (requested: ${totalMins})`,
      );
    }
    if (rules.maxDurationMins != null && totalMins > rules.maxDurationMins) {
      throw new BadRequestException(
        `Maximum booking duration is ${rules.maxDurationMins} minutes (requested: ${totalMins})`,
      );
    }

    // ── Members only (non-admin channels only) ──
    if (!isAdmin && rules.membersOnly && !dto.customer.isMember) {
      throw new BadRequestException(
        'This court / sport is available to members only',
      );
    }

    // ── Daily / weekly / monthly booking limits ──
    if (dto.customer.userId) {
      await this.enforceBookingLimits({
        userId:   dto.customer.userId,
        tenantId,
        courtId:  dto.courtId,
        branchId: dto.branchId,
        startsAt,
        rules,
      });
    }
  }

  /**
   * enforceRescheduleRules()
   *
   * Called by BookingService.reschedule().
   * Checks: reschedule cutoff relative to the ORIGINAL booking start.
   */
  async enforceRescheduleRules(params: {
    booking:  BookingEntity;
    dto:      RescheduleBookingDto;
    tenantId: string;
    actorId:  string;
  }): Promise<void> {
    const { booking, tenantId } = params;

    const rules = await this.rulesRepository.resolveForBooking({
      tenantId,
      branchId: booking.branchId,
      sportId:  booking.sportId,
      courtId:  booking.courtId,
    });
    if (!rules) return;

    if (rules.rescheduleCutoffMins != null && booking.startsAt) {
      const minsUntilStart = (booking.startsAt.getTime() - Date.now()) / 60_000;
      if (minsUntilStart < rules.rescheduleCutoffMins) {
        throw new BadRequestException(
          `Rescheduling is not allowed within ${rules.rescheduleCutoffMins} minutes of the session start`,
        );
      }
    }
  }

  /**
   * enforceCancellationRules()
   *
   * Called by BookingService.cancel().
   * Admin actors bypass the cancellation cutoff.
   */
  async enforceCancellationRules(params: {
    booking:   BookingEntity;
    dto:       CancelBookingDto;
    tenantId:  string;
    actorRole: string;
  }): Promise<void> {
    const { booking, tenantId, actorRole } = params;

    // Admins can always cancel
    if (['TENANT_ADMIN'].includes(actorRole)) return;

    const rules = await this.rulesRepository.resolveForBooking({
      tenantId,
      branchId: booking.branchId,
      sportId:  booking.sportId,
      courtId:  booking.courtId,
    });
    if (!rules) return;

    if (rules.cancellationCutoffMins != null && booking.startsAt) {
      const minsUntilStart = (booking.startsAt.getTime() - Date.now()) / 60_000;
      if (minsUntilStart < rules.cancellationCutoffMins) {
        throw new BadRequestException(
          `Cancellations are not allowed within ${rules.cancellationCutoffMins} minutes of the session start`,
        );
      }
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async enforceBookingLimits(params: {
    userId:   string;
    tenantId: string;
    courtId:  string;
    branchId: string;
    startsAt: Date;
    rules:    BookingRulesEntity;
  }): Promise<void> {
    const { userId, tenantId, startsAt, rules } = params;

    const startOfDay   = new Date(startsAt); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay     = new Date(startsAt); endOfDay.setHours(23, 59, 59, 999);

    // ISO week: Monday to Sunday
    const dayOfWeek    = startsAt.getDay();
    const monday       = new Date(startsAt);
    monday.setDate(startsAt.getDate() - ((dayOfWeek + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const sunday       = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const startOfMonth = new Date(startsAt.getFullYear(), startsAt.getMonth(), 1);
    const endOfMonth   = new Date(startsAt.getFullYear(), startsAt.getMonth() + 1, 0, 23, 59, 59, 999);

    // Active bookings = not cancelled/expired/refunded
    const ACTIVE = `('reserved','pending_payment','confirmed','checked_in','in_progress','rescheduled')`;

    if (rules.maxBookingsPerDay != null) {
      const [{ count }] = await this.ds.query<[{ count: string }]>(`
        SELECT COUNT(*)::int AS count FROM bookings
        WHERE tenant_id = $1 AND user_id = $2
          AND starts_at BETWEEN $3 AND $4
          AND status IN ${ACTIVE} AND is_deleted = FALSE
      `, [tenantId, userId, startOfDay, endOfDay]);
      if (Number(count) >= rules.maxBookingsPerDay) {
        throw new BadRequestException(
          `You may not have more than ${rules.maxBookingsPerDay} booking(s) on the same day`,
        );
      }
    }

    if (rules.maxBookingsPerWeek != null) {
      const [{ count }] = await this.ds.query<[{ count: string }]>(`
        SELECT COUNT(*)::int AS count FROM bookings
        WHERE tenant_id = $1 AND user_id = $2
          AND starts_at BETWEEN $3 AND $4
          AND status IN ${ACTIVE} AND is_deleted = FALSE
      `, [tenantId, userId, monday, sunday]);
      if (Number(count) >= rules.maxBookingsPerWeek) {
        throw new BadRequestException(
          `You may not have more than ${rules.maxBookingsPerWeek} booking(s) in the same week`,
        );
      }
    }

    if (rules.maxBookingsPerMonth != null) {
      const [{ count }] = await this.ds.query<[{ count: string }]>(`
        SELECT COUNT(*)::int AS count FROM bookings
        WHERE tenant_id = $1 AND user_id = $2
          AND starts_at BETWEEN $3 AND $4
          AND status IN ${ACTIVE} AND is_deleted = FALSE
      `, [tenantId, userId, startOfMonth, endOfMonth]);
      if (Number(count) >= rules.maxBookingsPerMonth) {
        throw new BadRequestException(
          `You may not have more than ${rules.maxBookingsPerMonth} booking(s) in the same month`,
        );
      }
    }
  }
}
