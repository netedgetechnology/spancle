import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository }  from 'typeorm';
import { BookingRulesEntity, type BookingRuleScope } from '../entities/booking-rules.entity';

@Injectable()
export class BookingRulesRepository {
  constructor(
    @InjectRepository(BookingRulesEntity)
    private readonly repo: Repository<BookingRulesEntity>,
  ) {}

  async create(data: Partial<BookingRulesEntity>): Promise<BookingRulesEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async findById(id: string, tenantId: string): Promise<BookingRulesEntity | null> {
    return this.repo.findOne({ where: { id, tenantId, isDeleted: false } });
  }

  async findByTenant(tenantId: string): Promise<BookingRulesEntity[]> {
    return this.repo.find({
      where: { tenantId, isDeleted: false },
      order: { scope: 'ASC', createdAt: 'ASC' },
    });
  }

  async update(
    id: string,
    tenantId: string,
    data: Partial<BookingRulesEntity>,
  ): Promise<BookingRulesEntity> {
    await this.repo.update({ id, tenantId }, data as object);
    return this.repo.findOneOrFail({ where: { id, tenantId } });
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    await this.repo.update({ id, tenantId }, { isDeleted: true, deletedAt: new Date() });
  }

  /**
   * resolveForBooking()
   *
   * Returns the most-specific active rule set for a given booking context.
   * Specificity order (highest → lowest):
   *   court > sport > branch > tenant
   *
   * Returns null when no rule set exists for this tenant.
   */
  async resolveForBooking(params: {
    tenantId:  string;
    branchId?: string | null;
    sportId?:  string | null;
    courtId?:  string | null;
  }): Promise<BookingRulesEntity | null> {
    const { tenantId, branchId, sportId, courtId } = params;

    // Try court-level first, then sport, then branch, then tenant-wide
    const candidates: Array<{ scope: BookingRuleScope; value: string | null }> = [
      { scope: 'court',  value: courtId  ?? null },
      { scope: 'sport',  value: sportId  ?? null },
      { scope: 'branch', value: branchId ?? null },
      { scope: 'tenant', value: null              },
    ];

    for (const { scope, value } of candidates) {
      if (scope !== 'tenant' && !value) continue;

      const where: Record<string, unknown> = { tenantId, scope, isActive: true, isDeleted: false };
      if (scope === 'court')  where['courtId']  = value;
      if (scope === 'sport')  where['sportId']  = value;
      if (scope === 'branch') where['branchId'] = value;

      const rule = await this.repo.findOne({ where: where as object });
      if (rule) return rule;
    }

    return null;
  }
}
