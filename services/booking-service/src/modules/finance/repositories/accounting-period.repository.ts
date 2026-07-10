import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource }                      from '@nestjs/typeorm';
import { DataSource }                            from 'typeorm';
import {
  AccountingPeriodEntity,
  type AccountingPeriodStatus,
} from '../entities/accounting-period.entity';

@Injectable()
export class AccountingPeriodRepository {
  private readonly logger = new Logger(AccountingPeriodRepository.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get repo() {
    return this.dataSource.getRepository(AccountingPeriodEntity);
  }

  async create(data: Partial<AccountingPeriodEntity>): Promise<AccountingPeriodEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async findByPeriod(
    period:   string,
    tenantId: string,
  ): Promise<AccountingPeriodEntity | null> {
    return this.repo.findOne({ where: { period, tenantId } });
  }

  async findByPeriodOrFail(
    period:   string,
    tenantId: string,
  ): Promise<AccountingPeriodEntity> {
    const p = await this.findByPeriod(period, tenantId);
    if (!p) throw new NotFoundException(`Accounting period ${period} not found`);
    return p;
  }

  /**
   * Returns the single open period for this tenant.
   * There must always be exactly one open period per tenant.
   */
  async findOpen(tenantId: string): Promise<AccountingPeriodEntity | null> {
    return this.repo.findOne({ where: { tenantId, status: 'open' } });
  }

  async findAll(tenantId: string): Promise<AccountingPeriodEntity[]> {
    return this.repo.find({
      where:  { tenantId },
      order:  { period: 'DESC' },
    });
  }

  async updateStatus(
    id:       string,
    status:   AccountingPeriodStatus,
    extra?:   Partial<AccountingPeriodEntity>,
  ): Promise<AccountingPeriodEntity> {
    await this.repo.update({ id }, { status, ...extra });
    return this.repo.findOneOrFail({ where: { id } });
  }
}
