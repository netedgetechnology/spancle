import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type SelectQueryBuilder } from 'typeorm';
import { BlackoutEntity } from '../entities/blackout.entity';

@Injectable()
export class BlackoutRepository {
  private readonly logger = new Logger(BlackoutRepository.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  private get repo() {
    return this.dataSource.getRepository(BlackoutEntity);
  }

  private scopedQb(alias: string, tenantId: string): SelectQueryBuilder<BlackoutEntity> {
    return this.repo
      .createQueryBuilder(alias)
      .where(`${alias}.tenantId = :tenantId`, { tenantId })
      .andWhere(`${alias}.isDeleted = false`)
      .andWhere(`${alias}.isActive = true`);
  }

  async create(data: Partial<BlackoutEntity>): Promise<BlackoutEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async findById(id: string, tenantId: string): Promise<BlackoutEntity | null> {
    return this.repo.findOne({ where: { id, tenantId, isDeleted: false } });
  }

  async findByIdOrFail(id: string, tenantId: string): Promise<BlackoutEntity> {
    const b = await this.findById(id, tenantId);
    if (!b) throw new Error(`Blackout ${id} not found`);
    return b;
  }

  async findAll(tenantId: string): Promise<BlackoutEntity[]> {
    return this.repo
      .createQueryBuilder('b')
      .where('b.tenantId = :tenantId', { tenantId })
      .andWhere('b.isDeleted = false')
      .orderBy('b.startAt', 'DESC')
      .getMany();
  }

  /**
   * Checks whether a specific datetime window is blocked by any active blackout
   * that applies to the given court/branch/tenant scope.
   *
   * A blackout blocks the window if:
   *   - blackout.startAt < windowEnd AND blackout.endAt > windowStart (overlap)
   *   - Scope: tenant wildcard OR matching branchId/courtId/sportId
   */
  async isBlocked(params: {
    tenantId:  string;
    courtId:   string;
    branchId:  string;
    sportId?:  string;
    startAt:   Date;
    endAt:     Date;
  }): Promise<boolean> {
    const { tenantId, courtId, branchId, sportId, startAt, endAt } = params;

    const count = await this.scopedQb('b', tenantId)
      // Overlap: blackout starts before window ends AND blackout ends after window starts
      .andWhere('b.startAt < :endAt',   { endAt   })
      .andWhere('b.endAt > :startAt',   { startAt })
      // Scope match
      .andWhere(
        `(
          (b.scope = 'tenant')
          OR (b.scope = 'branch' AND b.branchId = :branchId)
          OR (b.scope = 'court'  AND b.courtId  = :courtId)
          ${sportId ? "OR (b.scope = 'sport' AND b.sportId = :sportId)" : ''}
        )`,
        { branchId, courtId, ...(sportId && { sportId }) },
      )
      .getCount();

    return count > 0;
  }

  /**
   * Returns all active blackouts that overlap with the given window.
   * Used by SlotGeneratorService to pre-fetch all blackouts for a date range.
   */
  async findOverlapping(params: {
    tenantId:  string;
    courtId:   string;
    branchId:  string;
    sportId?:  string;
    startAt:   Date;
    endAt:     Date;
  }): Promise<BlackoutEntity[]> {
    const { tenantId, courtId, branchId, sportId, startAt, endAt } = params;

    return this.scopedQb('b', tenantId)
      .andWhere('b.startAt < :endAt', { endAt })
      .andWhere('b.endAt > :startAt', { startAt })
      .andWhere(
        `(
          (b.scope = 'tenant')
          OR (b.scope = 'branch' AND b.branchId = :branchId)
          OR (b.scope = 'court'  AND b.courtId  = :courtId)
          ${sportId ? "OR (b.scope = 'sport' AND b.sportId = :sportId)" : ''}
        )`,
        { branchId, courtId, ...(sportId && { sportId }) },
      )
      .getMany();
  }

  async updateById(
    id:       string,
    tenantId: string,
    data:     Partial<BlackoutEntity>,
  ): Promise<BlackoutEntity> {
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
