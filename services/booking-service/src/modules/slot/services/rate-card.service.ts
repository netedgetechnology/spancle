import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { RateCardRepository }    from '../repositories/rate-card.repository';
import { RateCardEntity }        from '../entities/rate-card.entity';
import type { CreateRateCardDto, UpdateRateCardDto } from '../dto/create-rate-card.dto';
import type { DateOverride, HourlySlot } from '../entities/rate-card.entity';

@Injectable()
export class RateCardService {
  private readonly logger = new Logger(RateCardService.name);

  constructor(private readonly rateCardRepository: RateCardRepository) {}

  async create(dto: CreateRateCardDto, tenantId: string, actorId: string): Promise<RateCardEntity> {
    if (dto.dateOverrides?.length) {
      this.validateDateOverrides(dto.dateOverrides);
    }
    const card = await this.rateCardRepository.insert({
      tenantId,
      name:               dto.name,
      description:        dto.description ?? null,
      currency:           dto.currency    ?? 'GBP',
      defaultPriceMinor:  dto.defaultPriceMinor ?? null,
      weeklyGrid:         dto.weeklyGrid  ?? {},
      dateOverrides:      dto.dateOverrides ?? [],
      isActive:           dto.isActive    ?? true,
    });
    this.logger.log(`Rate card created: ${card.id} tenant=${tenantId} actor=${actorId}`);
    return card;
  }

  async findAll(tenantId: string, opts: { isActive?: boolean; page?: number; limit?: number }): Promise<{
    data: RateCardEntity[]; total: number;
  }> {
    return this.rateCardRepository.findAll(tenantId, {
      isActive: opts.isActive,
      page:     opts.page  ?? 1,
      limit:    opts.limit ?? 25,
    });
  }

  async findById(id: string, tenantId: string): Promise<RateCardEntity> {
    return this.rateCardRepository.findByIdOrFail(id, tenantId);
  }

  async update(id: string, dto: UpdateRateCardDto, tenantId: string, actorId: string): Promise<RateCardEntity> {
    await this.rateCardRepository.findByIdOrFail(id, tenantId);
    if (dto.dateOverrides?.length) {
      this.validateDateOverrides(dto.dateOverrides);
    }
    const updates: Partial<RateCardEntity> = {};
    if (dto.name               !== undefined) updates.name               = dto.name;
    if (dto.description        !== undefined) updates.description        = dto.description ?? null;
    if (dto.currency           !== undefined) updates.currency           = dto.currency;
    if (dto.defaultPriceMinor  !== undefined) updates.defaultPriceMinor  = dto.defaultPriceMinor ?? null;
    if (dto.weeklyGrid         !== undefined) updates.weeklyGrid         = dto.weeklyGrid;
    if (dto.dateOverrides      !== undefined) updates.dateOverrides      = dto.dateOverrides;
    if (dto.isActive           !== undefined) updates.isActive           = dto.isActive;

    const updated = await this.rateCardRepository.update(id, tenantId, updates);
    this.logger.log(`Rate card updated: ${id} tenant=${tenantId} actor=${actorId}`);
    return updated;
  }

  async activate(id: string, tenantId: string, actorId: string): Promise<RateCardEntity> {
    await this.rateCardRepository.findByIdOrFail(id, tenantId);
    const card = await this.rateCardRepository.update(id, tenantId, { isActive: true });
    this.logger.log(`Rate card activated: ${id} actor=${actorId}`);
    return card;
  }

  async deactivate(id: string, tenantId: string, actorId: string): Promise<RateCardEntity> {
    await this.rateCardRepository.findByIdOrFail(id, tenantId);
    const card = await this.rateCardRepository.update(id, tenantId, { isActive: false });
    this.logger.log(`Rate card deactivated: ${id} actor=${actorId}`);
    return card;
  }

  async remove(id: string, tenantId: string, actorId: string): Promise<void> {
    await this.rateCardRepository.findByIdOrFail(id, tenantId);
    await this.rateCardRepository.softDelete(id, tenantId);
    this.logger.log(`Rate card soft-deleted: ${id} actor=${actorId}`);
  }

  // ── Price resolution helpers (called by PricingService) ──────────────────

  /**
   * Resolves the base price per hour for a slot using this Rate Card.
   *
   * Priority (highest first):
   *   1. Date override — specific calendar date → allDay price or per-hour price
   *   2. Weekly grid — day-of-week → per-hour price
   *   3. defaultPriceMinor — flat fallback
   *
   * Returns null when no price can be determined from the card.
   */
  resolveBasePrice(
    card:     RateCardEntity,
    date:     string,       // YYYY-MM-DD
    dayName:  string,       // 'monday' … 'sunday'
    hour:     number,       // 0–23
  ): number | null {
    // 1. Date override — highest priority
    const override = card.dateOverrides.find((o) => o.date === date);
    if (override) {
      if (override.allDay && override.priceMinor !== undefined) {
        return override.priceMinor;
      }
      if (!override.allDay && override.hourlySlots) {
        const slot = override.hourlySlots.find((s) => s.hour === hour);
        if (slot !== undefined) return slot.priceMinor;
      }
    }

    // 2. Weekly grid
    const dayGrid = (card.weeklyGrid as Record<string, { hourlySlots: HourlySlot[] }>)[dayName];
    if (dayGrid?.hourlySlots) {
      const slot = dayGrid.hourlySlots.find((s: HourlySlot) => s.hour === hour);
      if (slot !== undefined) return slot.priceMinor;
    }

    // 3. Default
    return card.defaultPriceMinor ?? null;
  }

  // ── Validation ────────────────────────────────────────────────────────────

  private validateDateOverrides(overrides: DateOverride[]): void {
    const seen = new Set<string>();
    for (const override of overrides) {
      if (seen.has(override.date)) {
        throw new ConflictException(
          `Duplicate date override for ${override.date} — only one override per date is allowed`,
        );
      }
      seen.add(override.date);

      if (override.allDay && override.priceMinor === undefined) {
        throw new BadRequestException(
          `Date override for ${override.date}: priceMinor is required when allDay = true`,
        );
      }
      if (!override.allDay && (!override.hourlySlots || override.hourlySlots.length === 0)) {
        throw new BadRequestException(
          `Date override for ${override.date}: hourlySlots is required when allDay = false`,
        );
      }
      if (override.hourlySlots) {
        const hours = override.hourlySlots.map((s) => s.hour);
        if (new Set(hours).size !== hours.length) {
          throw new BadRequestException(
            `Date override for ${override.date}: duplicate hour entries`,
          );
        }
      }
    }
  }
}
