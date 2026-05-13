import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type SelectQueryBuilder } from 'typeorm';
import { PricingRuleEntity, type PricingRuleType } from '../entities/pricing-rule.entity';

@Injectable()
export class PricingRuleRepository {
  private readonly logger = new Logger(PricingRuleRepository.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  private get repo() {
    return this.dataSource.getRepository(PricingRuleEntity);
  }

  private scopedQb(alias: string, tenantId: string): SelectQueryBuilder<PricingRuleEntity> {
    return this.repo
      .createQueryBuilder(alias)
      .where(`${alias}.tenantId = :tenantId`, { tenantId })
      .andWhere(`${alias}.isDeleted = false`)
      .andWhere(`${alias}.isActive = true`);
  }

  async create(data: Partial<PricingRuleEntity>): Promise<PricingRuleEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async findById(id: string, tenantId: string): Promise<PricingRuleEntity | null> {
    return this.repo.findOne({ where: { id, tenantId, isDeleted: false } });
  }

  async findByIdOrFail(id: string, tenantId: string): Promise<PricingRuleEntity> {
    const r = await this.findById(id, tenantId);
    if (!r) throw new Error(`PricingRule ${id} not found`);
    return r;
  }

  async findAll(tenantId: string, includeInactive = false): Promise<PricingRuleEntity[]> {
    const qb = this.repo
      .createQueryBuilder('r')
      .where('r.tenantId = :tenantId', { tenantId })
      .andWhere('r.isDeleted = false');

    if (!includeInactive) qb.andWhere('r.isActive = true');
    return qb.orderBy('r.priority', 'DESC').addOrderBy('r.ruleType', 'ASC').getMany();
  }

  /**
   * Core pricing query — finds all active rules that apply to a slot.
   *
   * Matching criteria:
   *   - Scope matches (tenant wildcard, or specific branch/sport/court)
   *   - Date range contains slotDate (or open-ended)
   *   - Day of week matches (or daysOfWeek is null/empty = all days)
   *   - Time window contains slotStartTime (or time fields are null = all day)
   *
   * Returns rules sorted by priority DESC so the service can apply them
   * in the correct order.
   */
  async findMatchingRules(params: {
    tenantId:   string;
    courtId:    string;
    branchId:   string;
    sportId:    string | null;
    slotDate:   string;       // YYYY-MM-DD
    slotTime:   string;       // HH:MM
    dayOfWeek:  string;       // e.g. 'monday'
  }): Promise<PricingRuleEntity[]> {
    const { tenantId, courtId, branchId, sportId, slotDate, slotTime, dayOfWeek } = params;

    const qb = this.scopedQb('r', tenantId)
      // Scope: tenant wildcard OR specific branch/sport/court
      .andWhere(
        `(
          (r.scope = 'tenant')
          OR (r.scope = 'branch' AND r.branchId = :branchId)
          OR (r.scope = 'court'  AND r.courtId  = :courtId)
          ${sportId ? "OR (r.scope = 'sport' AND r.sportId = :sportId)" : ''}
        )`,
        { branchId, courtId, ...(sportId && { sportId }) },
      )
      // Date range: validFrom <= slotDate <= validUntil (nulls = open-ended)
      .andWhere(
        "(r.validFrom IS NULL OR r.validFrom <= :slotDate)",
        { slotDate },
      )
      .andWhere(
        "(r.validUntil IS NULL OR r.validUntil >= :slotDate)",
      )
      // Day of week: daysOfWeek is null/empty = all days, otherwise must contain dayOfWeek
      .andWhere(
        `(r.daysOfWeek IS NULL OR r.daysOfWeek = '[]'::jsonb OR r.daysOfWeek @> :dayJson::jsonb)`,
        { dayJson: JSON.stringify([dayOfWeek]) },
      )
      // Time window: null = all day, otherwise slotTime must be within window
      .andWhere(
        "(r.timeStart IS NULL OR r.timeStart <= :slotTime)",
        { slotTime },
      )
      .andWhere(
        "(r.timeEnd IS NULL OR r.timeEnd > :slotTime)",
      )
      .orderBy('r.priority', 'DESC')
      .addOrderBy('r.ruleType', 'ASC');

    return qb.getMany();
  }

  async updateById(
    id:       string,
    tenantId: string,
    data:     Partial<PricingRuleEntity>,
  ): Promise<PricingRuleEntity> {
    await this.repo.update({ id, tenantId }, { ...data, updatedAt: new Date() });
    return this.repo.findOneOrFail({ where: { id, tenantId } });
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    await this.repo.update(
      { id, tenantId },
      { isDeleted: true, isActive: false, deletedAt: new Date(), updatedAt: new Date() },
    );
  }
}
