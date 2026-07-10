import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectDataSource }  from '@nestjs/typeorm';
import { DataSource }        from 'typeorm';
import { ChartOfAccountEntity, type AccountType } from '../entities/chart-of-account.entity';

@Injectable()
export class ChartOfAccountRepository {
  private readonly logger = new Logger(ChartOfAccountRepository.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get repo() {
    return this.dataSource.getRepository(ChartOfAccountEntity);
  }

  async findAll(tenantId: string): Promise<ChartOfAccountEntity[]> {
    return this.repo.find({
      where:  { tenantId },
      order:  { code: 'ASC' },
    });
  }

  async findByCode(
    code:     string,
    tenantId: string,
  ): Promise<ChartOfAccountEntity | null> {
    return this.repo.findOne({ where: { code, tenantId } });
  }

  async findByCodeOrFail(
    code:     string,
    tenantId: string,
  ): Promise<ChartOfAccountEntity> {
    const a = await this.findByCode(code, tenantId);
    if (!a) throw new NotFoundException(`Account ${code} not found`);
    return a;
  }

  async findByType(
    type:     AccountType,
    tenantId: string,
  ): Promise<ChartOfAccountEntity[]> {
    return this.repo.find({
      where: { type, tenantId, isActive: true },
      order: { code: 'ASC' },
    });
  }

  async create(data: Partial<ChartOfAccountEntity>): Promise<ChartOfAccountEntity> {
    const existing = await this.findByCode(data.code!, data.tenantId!);
    if (existing) throw new ConflictException(`Account code ${data.code} already exists`);
    return this.repo.save(this.repo.create(data));
  }

  /**
   * Deactivates a non-system account.
   * System accounts cannot be deactivated.
   */
  async deactivate(code: string, tenantId: string): Promise<void> {
    const account = await this.findByCodeOrFail(code, tenantId);
    if (account.isSystem) {
      throw new BadRequestException(`System account ${code} cannot be deactivated`);
    }
    await this.repo.update({ id: account.id }, { isActive: false });
  }

  /**
   * Bulk-insert for system CoA seeding — skips duplicates (idempotent).
   */
  async seedSystemAccounts(
    accounts: Partial<ChartOfAccountEntity>[],
  ): Promise<void> {
    for (const data of accounts) {
      const existing = await this.findByCode(data.code!, data.tenantId!);
      if (!existing) {
        await this.repo.save(this.repo.create(data));
      }
    }
  }
}
