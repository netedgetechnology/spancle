import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource }                      from '@nestjs/typeorm';
import { DataSource }                            from 'typeorm';
import { TaxRateEntity }                         from '../entities/tax-rate.entity';

@Injectable()
export class TaxRateRepository {
  private readonly logger = new Logger(TaxRateRepository.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get repo() {
    return this.dataSource.getRepository(TaxRateEntity);
  }

  async findAll(tenantId: string): Promise<TaxRateEntity[]> {
    return this.repo.find({
      where: { tenantId, isActive: true },
      order: { code: 'ASC' },
    });
  }

  async findByCode(code: string, tenantId: string): Promise<TaxRateEntity | null> {
    return this.repo.findOne({ where: { code, tenantId } });
  }

  async findByCodeOrFail(code: string, tenantId: string): Promise<TaxRateEntity> {
    const r = await this.findByCode(code, tenantId);
    if (!r) throw new NotFoundException(`Tax rate ${code} not found`);
    return r;
  }

  async findDefault(tenantId: string): Promise<TaxRateEntity | null> {
    return this.repo.findOne({ where: { tenantId, isDefault: true, isActive: true } });
  }

  /**
   * Finds all active rates matching the jurisdiction (longest-prefix match).
   * Caller (TaxResolver) selects the best match from the result.
   * Returns rates ordered by jurisdiction specificity (most specific first).
   */
  async findForJurisdiction(
    tenantId:     string,
    jurisdiction: string,
    slotDate:     string,   // YYYY-MM-DD
  ): Promise<TaxRateEntity[]> {
    return this.repo
      .createQueryBuilder('t')
      .where('t.tenantId = :tenantId', { tenantId })
      .andWhere('t.isActive = true')
      .andWhere(
        '(t.jurisdiction IS NULL OR :jurisdiction LIKE t.jurisdiction || \'%\')',
        { jurisdiction },
      )
      .andWhere(
        '(t.effectiveFrom IS NULL OR t.effectiveFrom <= :date)',
        { date: slotDate },
      )
      .andWhere(
        '(t.effectiveTo IS NULL OR t.effectiveTo >= :date2)',
        { date2: slotDate },
      )
      .orderBy(
        'COALESCE(LENGTH(t.jurisdiction), 0)',
        'DESC',
      )
      .getMany();
  }

  async create(data: Partial<TaxRateEntity>): Promise<TaxRateEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Partial<TaxRateEntity>): Promise<TaxRateEntity> {
    await this.repo.update({ id }, data);
    return this.repo.findOneOrFail({ where: { id } });
  }

  async seedSystemRates(rates: Partial<TaxRateEntity>[]): Promise<void> {
    for (const data of rates) {
      const existing = await this.findByCode(data.code!, data.tenantId!);
      if (!existing) {
        await this.repo.save(this.repo.create(data));
      }
    }
  }
}
