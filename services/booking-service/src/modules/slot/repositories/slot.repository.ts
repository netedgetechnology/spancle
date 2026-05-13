import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { type EntityManager, DataSource, type SelectQueryBuilder } from 'typeorm';
import { SlotEntity, type SlotStatus } from '../entities/slot.entity';

/**
 * SlotRepository — tenant-scoped slot data access.
 *
 * All methods enforce tenantId scoping on every query.
 * Overlap detection uses a range query (startAt < endAt AND endAt > startAt)
 * which correctly handles partial, full, and exact overlaps.
 */
@Injectable()
export class SlotRepository {
  private readonly logger = new Logger(SlotRepository.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  private get repo() {
    return this.dataSource.getRepository(SlotEntity);
  }

  private scopedQb(alias: string, tenantId: string): SelectQueryBuilder<SlotEntity> {
    return this.repo
      .createQueryBuilder(alias)
      .where(`${alias}.tenantId = :tenantId`, { tenantId })
      .andWhere(`${alias}.isDeleted = false`);
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  async create(data: Partial<SlotEntity>): Promise<SlotEntity> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async insertMany(data: Partial<SlotEntity>[]): Promise<SlotEntity[]> {
    const entities = data.map((d) => this.repo.create(d));
    return this.repo.save(entities);
  }

  async findById(id: string, tenantId: string): Promise<SlotEntity | null> {
    return this.scopedQb('s', tenantId)
      .andWhere('s.id = :id', { id })
      .getOne();
  }

  async findByIdOrFail(id: string, tenantId: string): Promise<SlotEntity> {
    const slot = await this.findById(id, tenantId);
    if (!slot) throw new Error(`Slot ${id} not found`);
    return slot;
  }

  async updateById(
    id:       string,
    tenantId: string,
    data:     Partial<SlotEntity>,
  ): Promise<SlotEntity> {
    await this.repo.update({ id, tenantId }, { ...data, updatedAt: new Date() });
    return this.repo.findOneOrFail({ where: { id, tenantId } });
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    await this.repo.update(
      { id, tenantId },
      { isDeleted: true, deletedAt: new Date(), updatedAt: new Date() },
    );
  }

  // ── Query ──────────────────────────────────────────────────────────────────

  async query(params: {
    tenantId:  string;
    courtId?:  string;
    branchId?: string;
    sportId?:  string;
    from?:     Date;
    to?:       Date;
    status?:   SlotStatus;
  }): Promise<SlotEntity[]> {
    const qb = this.scopedQb('s', params.tenantId)
      .orderBy('s.startAt', 'ASC');

    if (params.courtId)  qb.andWhere('s.courtId = :courtId',   { courtId:  params.courtId  });
    if (params.branchId) qb.andWhere('s.branchId = :branchId', { branchId: params.branchId });
    if (params.sportId)  qb.andWhere('s.sportId = :sportId',   { sportId:  params.sportId  });
    if (params.status)   qb.andWhere('s.status = :status',     { status:   params.status   });
    if (params.from)     qb.andWhere('s.startAt >= :from',     { from:     params.from     });
    if (params.to)       qb.andWhere('s.startAt < :to',        { to:       params.to       });

    return qb.getMany();
  }

  // ── Overlap detection ──────────────────────────────────────────────────────

  /**
   * Counts existing non-cancelled slots that overlap with [startAt, endAt).
   * Used as the pre-generation soft check. DB unique index is the hard guard.
   *
   * Overlap condition: existing.startAt < newEndAt AND existing.endAt > newStartAt
   */
  async countOverlapping(params: {
    tenantId: string;
    courtId:  string;
    startAt:  Date;
    endAt:    Date;
    excludeId?: string;
  }): Promise<number> {
    const qb = this.scopedQb('s', params.tenantId)
      .andWhere('s.courtId = :courtId',   { courtId: params.courtId })
      .andWhere("s.status NOT IN ('cancelled')")
      .andWhere('s.startAt < :endAt',     { endAt:   params.endAt   })
      .andWhere('s.endAt > :startAt',     { startAt: params.startAt });

    if (params.excludeId) {
      qb.andWhere('s.id != :excludeId', { excludeId: params.excludeId });
    }

    return qb.getCount();
  }

  /**
   * Returns all non-cancelled slots in the time window for a court.
   * Used by generator to collect existing slot times before inserting.
   */
  async findInRange(params: {
    tenantId: string;
    courtId:  string;
    startAt:  Date;
    endAt:    Date;
  }): Promise<{ startAt: Date; endAt: Date }[]> {
    return this.scopedQb('s', params.tenantId)
      .select(['s.startAt', 's.endAt'])
      .andWhere('s.courtId = :courtId', { courtId: params.courtId })
      .andWhere("s.status NOT IN ('cancelled')")
      .andWhere('s.startAt < :endAt',   { endAt:   params.endAt   })
      .andWhere('s.endAt > :startAt',   { startAt: params.startAt })
      .orderBy('s.startAt', 'ASC')
      .getMany();
  }

  // ── Status operations ──────────────────────────────────────────────────────

  /**
   * Bulk-cancels available slots within a time window for a court/branch.
   * Used when a blackout is activated with cancelExistingSlots = true.
   * Never cancels 'booked' slots — those require explicit admin action.
   */
  async bulkCancelAvailable(params: {
    tenantId:  string;
    startAt:   Date;
    endAt:     Date;
    courtId?:  string;
    branchId?: string;
  }): Promise<number> {
    const qb = this.repo
      .createQueryBuilder()
      .update(SlotEntity)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where('tenantId = :tenantId', { tenantId: params.tenantId })
      .andWhere("status = 'available'")
      .andWhere('isDeleted = false')
      .andWhere('startAt >= :startAt', { startAt: params.startAt })
      .andWhere('endAt <= :endAt',     { endAt:   params.endAt   });

    if (params.courtId)  qb.andWhere('courtId = :courtId',   { courtId:  params.courtId  });
    if (params.branchId) qb.andWhere('branchId = :branchId', { branchId: params.branchId });

    const result = await qb.execute();
    return result.affected ?? 0;
  }

  /**
   * Expires stale 'reserved' slots where reservedUntil has passed.
   * Called by the scheduler every minute.
   */
  async expireStaleReservations(tenantId: string): Promise<number> {
    const result = await this.repo
      .createQueryBuilder()
      .update(SlotEntity)
      .set({ status: 'available', reservedUntil: null, updatedAt: new Date() })
      .where('tenantId = :tenantId', { tenantId })
      .andWhere("status = 'reserved'")
      .andWhere('reservedUntil < :now', { now: new Date() })
      .andWhere('isDeleted = false')
      .execute();

    return result.affected ?? 0;
  }

  // ── Counts ─────────────────────────────────────────────────────────────────

  async countByStatus(tenantId: string): Promise<Record<SlotStatus, number>> {
    const rows = await this.scopedQb('s', tenantId)
      .select('s.status', 'status')
      .addSelect('COUNT(s.id)::int', 'count')
      .groupBy('s.status')
      .getRawMany<{ status: SlotStatus; count: string }>();

    const counts: Record<SlotStatus, number> = {
      available: 0, reserved: 0, booked: 0, cancelled: 0, completed: 0, unavailable: 0,
    };
    for (const r of rows) counts[r.status] = Number(r.count);
    return counts;
  }

  /**
   * Acquires a pessimistic write lock on slots by IDs within a transaction.
   * Returns slot entities if ALL are still in an available/reserved state.
   * Throws ConflictException if any slot has been taken since the outer validation.
   *
   * MUST be called inside a DataSource.transaction() block with the manager's
   * EntityManager — the manager passed here IS the transaction scope.
   */
  async lockAndVerifyAvailable(
    slotIds:  string[],
    tenantId: string,
    manager:  EntityManager,
  ): Promise<SlotEntity[]> {
    const slots = await manager
      .createQueryBuilder(SlotEntity, 's')
      .setLock('pessimistic_write')
      .where('s.id IN (:...ids)',   { ids:      slotIds  })
      .andWhere('s.tenant_id = :tenantId', { tenantId })
      .andWhere('s.is_deleted = false')
      .getMany();

    if (slots.length !== slotIds.length) {
      const foundIds = new Set(slots.map((s) => s.id));
      const missing  = slotIds.filter((id) => !foundIds.has(id));
      throw new ConflictException(
        `Slot(s) no longer exist: ${missing.join(', ')}`,
      );
    }

    const unavailable = slots.filter(
      (s) => s.status !== 'available' && s.status !== 'reserved',
    );
    if (unavailable.length > 0) {
      throw new ConflictException(
        `Slot(s) no longer available: ${unavailable.map((s) => s.id).join(', ')} ` +
        `(status: ${unavailable.map((s) => s.status).join(', ')})`,
      );
    }

    return slots;
  }
}
