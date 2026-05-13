import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type SelectQueryBuilder } from 'typeorm';
import { SlotTemplateEntity } from '../entities/slot-template.entity';

@Injectable()
export class SlotTemplateRepository {
  private readonly logger = new Logger(SlotTemplateRepository.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  private get repo() {
    return this.dataSource.getRepository(SlotTemplateEntity);
  }

  private scopedQb(alias: string, tenantId: string): SelectQueryBuilder<SlotTemplateEntity> {
    return this.repo
      .createQueryBuilder(alias)
      .where(`${alias}.tenantId = :tenantId`, { tenantId })
      .andWhere(`${alias}.isDeleted = false`);
  }

  async create(data: Partial<SlotTemplateEntity>): Promise<SlotTemplateEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async findById(id: string, tenantId: string): Promise<SlotTemplateEntity | null> {
    return this.scopedQb('t', tenantId).andWhere('t.id = :id', { id }).getOne();
  }

  async findByIdOrFail(id: string, tenantId: string): Promise<SlotTemplateEntity> {
    const t = await this.findById(id, tenantId);
    if (!t) throw new Error(`SlotTemplate ${id} not found`);
    return t;
  }

  async findByCourt(courtId: string, tenantId: string): Promise<SlotTemplateEntity[]> {
    return this.scopedQb('t', tenantId)
      .andWhere('t.courtId = :courtId', { courtId })
      .orderBy('t.createdAt', 'DESC')
      .getMany();
  }

  async findActiveForCourt(courtId: string, tenantId: string): Promise<SlotTemplateEntity | null> {
    return this.scopedQb('t', tenantId)
      .andWhere('t.courtId = :courtId', { courtId })
      .andWhere('t.isActive = true')
      .andWhere("t.validFrom <= CURRENT_DATE")
      .andWhere("(t.validUntil IS NULL OR t.validUntil >= CURRENT_DATE)")
      .orderBy('t.createdAt', 'DESC')
      .getOne();
  }

  async findAllActive(tenantId: string): Promise<SlotTemplateEntity[]> {
    return this.scopedQb('t', tenantId)
      .andWhere('t.isActive = true')
      .andWhere("t.validFrom <= CURRENT_DATE")
      .andWhere("(t.validUntil IS NULL OR t.validUntil >= CURRENT_DATE)")
      .getMany();
  }

  async findAll(tenantId: string): Promise<SlotTemplateEntity[]> {
    return this.scopedQb('t', tenantId)
      .orderBy('t.courtId', 'ASC')
      .addOrderBy('t.createdAt', 'DESC')
      .getMany();
  }

  async updateById(
    id:       string,
    tenantId: string,
    data:     Partial<SlotTemplateEntity>,
  ): Promise<SlotTemplateEntity> {
    await this.repo.update({ id, tenantId }, { ...data, updatedAt: new Date() });
    return this.repo.findOneOrFail({ where: { id, tenantId } });
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    await this.repo.update(
      { id, tenantId },
      { isDeleted: true, deletedAt: new Date(), updatedAt: new Date() },
    );
  }
}
