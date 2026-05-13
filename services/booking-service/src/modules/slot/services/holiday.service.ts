import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 }    from '@nestjs/event-emitter';
import { HolidayRepository } from '../repositories/holiday.repository';
import { HolidayEntity }    from '../entities/holiday.entity';

// ── UK Bank Holiday seed data ─────────────────────────────────────────────────
// Recurring: year is ignored in matching (MM-DD match only)

const UK_SYSTEM_HOLIDAYS: Array<Omit<Partial<HolidayEntity>, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>> = [
  { name: "New Year's Day",        date: '2000-01-01', isRecurring: true,  countryCode: 'GB', source: 'system' },
  { name: 'Good Friday',           date: '2000-04-07', isRecurring: false, countryCode: 'GB', source: 'system' },
  { name: 'Easter Monday',         date: '2000-04-10', isRecurring: false, countryCode: 'GB', source: 'system' },
  { name: 'Early May Bank Holiday', date: '2000-05-01', isRecurring: false, countryCode: 'GB', source: 'system' },
  { name: 'Spring Bank Holiday',   date: '2000-05-29', isRecurring: false, countryCode: 'GB', source: 'system' },
  { name: 'Summer Bank Holiday',   date: '2000-08-28', isRecurring: false, countryCode: 'GB', source: 'system' },
  { name: 'Christmas Day',         date: '2000-12-25', isRecurring: true,  countryCode: 'GB', source: 'system' },
  { name: 'Boxing Day',            date: '2000-12-26', isRecurring: true,  countryCode: 'GB', source: 'system' },
];

@Injectable()
export class HolidayService {
  private readonly logger = new Logger(HolidayService.name);

  constructor(
    private readonly holidayRepository: HolidayRepository,
    private readonly eventEmitter:      EventEmitter2,
  ) {}

  // ── CRUD ───────────────────────────────────────────────────────────────────

  async create(
    dto:      Partial<HolidayEntity>,
    tenantId: string,
    actorId:  string,
  ): Promise<HolidayEntity> {
    if (!dto.name?.trim()) throw new BadRequestException('Holiday name is required');
    if (!dto.date)         throw new BadRequestException('Holiday date is required');

    const existing = await this.holidayRepository.existsByDate(
      tenantId, dto.date, 'tenant',
    );
    if (existing) {
      throw new ConflictException(
        `A custom holiday already exists on ${dto.date}. ` +
        'Update the existing record instead.',
      );
    }

    const holiday = await this.holidayRepository.create({
      tenantId,
      name:        dto.name.trim(),
      date:        dto.date,
      isRecurring: dto.isRecurring ?? false,
      source:      'tenant',
      countryCode: dto.countryCode ?? null,
      description: dto.description ?? null,
      isActive:    true,
      isDeleted:   false,
    });

    await this.eventEmitter.emitAsync('spancle.holiday.created', {
      tenantId, holidayId: holiday.id, actorId, timestamp: new Date().toISOString(),
    });

    return holiday;
  }

  async findAll(tenantId: string): Promise<HolidayEntity[]> {
    return this.holidayRepository.findAll(tenantId);
  }

  async findOne(id: string, tenantId: string): Promise<HolidayEntity> {
    const h = await this.holidayRepository.findById(id, tenantId);
    if (!h) throw new NotFoundException(`Holiday ${id} not found`);
    return h;
  }

  async update(
    id:       string,
    dto:      Partial<HolidayEntity>,
    tenantId: string,
    actorId:  string,
  ): Promise<HolidayEntity> {
    const existing = await this.findOne(id, tenantId);

    if (existing.source === 'system') {
      throw new BadRequestException(
        'System holidays cannot be edited. Create a tenant override with the same date.',
      );
    }

    const updated = await this.holidayRepository.updateById(id, tenantId, {
      ...(dto.name        !== undefined && { name:        dto.name }),
      ...(dto.date        !== undefined && { date:        dto.date }),
      ...(dto.isRecurring !== undefined && { isRecurring: dto.isRecurring }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.isActive    !== undefined && { isActive:    dto.isActive }),
    });

    await this.eventEmitter.emitAsync('spancle.holiday.updated', {
      tenantId, holidayId: id, actorId, timestamp: new Date().toISOString(),
    });

    return updated;
  }

  async remove(id: string, tenantId: string, actorId: string): Promise<void> {
    const existing = await this.findOne(id, tenantId);

    if (existing.source === 'system') {
      throw new BadRequestException(
        'System holidays cannot be deleted. Deactivate them with isActive: false instead.',
      );
    }

    await this.holidayRepository.softDelete(id, tenantId);

    await this.eventEmitter.emitAsync('spancle.holiday.deleted', {
      tenantId, holidayId: id, actorId, timestamp: new Date().toISOString(),
    });
  }

  /**
   * Seeds the UK system bank holidays for a tenant.
   * Safe to call multiple times — skips dates that already exist.
   * Returns { seeded, skipped }.
   */
  async seedSystemHolidays(
    tenantId: string,
    actorId:  string,
  ): Promise<{ seeded: number; skipped: number }> {
    let seeded  = 0;
    let skipped = 0;

    for (const holiday of UK_SYSTEM_HOLIDAYS) {
      const exists = await this.holidayRepository.existsByDate(
        tenantId, holiday.date!, 'system',
      );
      if (exists) { skipped++; continue; }

      await this.holidayRepository.create({
        tenantId,
        name:        holiday.name!,
        date:        holiday.date!,
        isRecurring: holiday.isRecurring ?? false,
        source:      'system',
        countryCode: holiday.countryCode ?? 'GB',
        description: null,
        isActive:    true,
        isDeleted:   false,
      });

      seeded++;
    }

    this.logger.log(
      `Holiday seed: seeded=${seeded} skipped=${skipped} tenant=${tenantId}`,
    );

    return { seeded, skipped };
  }

  async isHoliday(tenantId: string, date: string): Promise<{ isHoliday: boolean }> {
    const result = await this.holidayRepository.isHoliday(tenantId, date);
    return { isHoliday: result };
  }
}
