import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { HolidayEntity } from '../entities/holiday.entity';

@Injectable()
export class HolidayRepository {
  private readonly logger = new Logger(HolidayRepository.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  private get repo() {
    return this.dataSource.getRepository(HolidayEntity);
  }

  async create(data: Partial<HolidayEntity>): Promise<HolidayEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async insertMany(data: Partial<HolidayEntity>[]): Promise<void> {
    await this.repo.save(data.map((d) => this.repo.create(d)));
  }

  async findById(id: string, tenantId: string): Promise<HolidayEntity | null> {
    return this.repo.findOne({ where: { id, tenantId, isDeleted: false } });
  }

  async findByIdOrFail(id: string, tenantId: string): Promise<HolidayEntity> {
    const h = await this.findById(id, tenantId);
    if (!h) throw new Error(`Holiday ${id} not found`);
    return h;
  }

  async findAll(tenantId: string): Promise<HolidayEntity[]> {
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
  async isHoliday(tenantId: string, date: string): Promise<boolean> {
    // date format: YYYY-MM-DD
    const monthDay = date.slice(5); // MM-DD

    const count = await this.repo
      .createQueryBuilder('h')
      .where('h.tenantId = :tenantId', { tenantId })
      .andWhere('h.isDeleted = false')
      .andWhere('h.isActive = true')
      .andWhere(
        // exact date match OR recurring MM-DD match
        "(h.date = :date OR (h.isRecurring = true AND SUBSTRING(h.date::text, 6, 5) = :monthDay))",
        { date, monthDay },
      )
      .getCount();

    return count > 0;
  }

  /**
   * Returns all holiday dates within a range for pre-fetching by the generator.
   * Returns a Set of YYYY-MM-DD strings for O(1) lookup.
   */
  async getHolidayDatesInRange(
    tenantId:  string,
    startDate: string,
    endDate:   string,
  ): Promise<Set<string>> {
    const rows = await this.repo
      .createQueryBuilder('h')
      .select('h.date', 'date')
      .addSelect('h.isRecurring', 'isRecurring')
      .where('h.tenantId = :tenantId', { tenantId })
      .andWhere('h.isDeleted = false')
      .andWhere('h.isActive = true')
      .getRawMany<{ date: string; isRecurring: boolean }>();

    const dates = new Set<string>();
    const start = new Date(startDate);
    const end   = new Date(endDate);

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
      } else {
        const formatted = row.date.slice(0, 10);
        if (formatted >= startDate && formatted <= endDate) {
          dates.add(formatted);
        }
      }
    }

    return dates;
  }

  async updateById(
    id:       string,
    tenantId: string,
    data:     Partial<HolidayEntity>,
  ): Promise<HolidayEntity> {
    await this.repo.update({ id, tenantId }, { ...data, updatedAt: new Date() });
    return this.repo.findOneOrFail({ where: { id, tenantId } });
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    await this.repo.update(
      { id, tenantId },
      { isDeleted: true, isActive: false, deletedAt: new Date(), updatedAt: new Date() },
    );
  }

  async existsByDate(tenantId: string, date: string, source: string): Promise<boolean> {
    const count = await this.repo.count({
      where: { tenantId, date, source: source as HolidayEntity['source'], isDeleted: false },
    });
    return count > 0;
  }
}
