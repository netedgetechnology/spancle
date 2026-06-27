import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository }              from '@nestjs/typeorm';
import { Repository }                    from 'typeorm';
import { RateCardEntity }                from '../entities/rate-card.entity';

@Injectable()
export class RateCardRepository {
  constructor(
    @InjectRepository(RateCardEntity)
    private readonly repo: Repository<RateCardEntity>,
  ) {}

  private scopedQb(alias: string, tenantId: string) {
    return this.repo
      .createQueryBuilder(alias)
      .where(`${alias}.tenantId = :tenantId`, { tenantId })
      .andWhere(`${alias}.isDeleted = false`);
  }

  async insert(data: Partial<RateCardEntity>): Promise<RateCardEntity> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async findById(id: string, tenantId: string): Promise<RateCardEntity | null> {
    return this.scopedQb('rc', tenantId)
      .andWhere('rc.id = :id', { id })
      .getOne();
  }

  async findByIdOrFail(id: string, tenantId: string): Promise<RateCardEntity> {
    const entity = await this.findById(id, tenantId);
    if (!entity) throw new NotFoundException(`Rate card ${id} not found`);
    return entity;
  }

  async findAll(tenantId: string, opts: { isActive?: boolean; page: number; limit: number }): Promise<{
    data:  RateCardEntity[];
    total: number;
  }> {
    const qb = this.scopedQb('rc', tenantId).orderBy('rc.name', 'ASC');
    if (opts.isActive !== undefined) {
      qb.andWhere('rc.isActive = :isActive', { isActive: opts.isActive });
    }
    const [data, total] = await qb
      .skip((opts.page - 1) * opts.limit)
      .take(opts.limit)
      .getManyAndCount();
    return { data, total };
  }

  async update(id: string, tenantId: string, data: Partial<RateCardEntity>): Promise<RateCardEntity> {
    await this.repo.update({ id, tenantId }, data);
    return this.findByIdOrFail(id, tenantId);
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    await this.repo.update({ id, tenantId }, { isDeleted: true });
  }
}
